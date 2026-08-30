import { GlideRecord } from "@servicenow/glide";

const MAX_CIS = 200;
const MAX_REL_ROWS = 2000;

interface CIListEntry {
  id: string;
  name: string;
  class: string;
}

function readNamedCIs(query: (gr: GlideRecord) => void): CIListEntry[] {
  const gr = new GlideRecord("cmdb_ci");
  query(gr);
  gr.addNotNullQuery("name");
  gr.orderBy("name");
  gr.query();

  const cis: CIListEntry[] = [];
  while (gr.next() && cis.length < MAX_CIS) {
    cis.push({
      id: String(gr.getValue("sys_id")),
      name: String(gr.getValue("name")),
      class: String(gr.getValue("sys_class_name")),
    });
  }
  return cis;
}

// GET /cis — CIs for the root-selector dropdown. Prefer CIs that actually
// participate in a cmdb_rel_ci relationship: a CI with no relationships builds
// a single-node map, which is useless as a root (most of a stock PDI's
// alphabetically-first computers are exactly that).
export function process(request: any, response: any) {
  const relatedIds: string[] = [];
  const seen: { [id: string]: boolean } = {};

  const rel = new GlideRecord("cmdb_rel_ci");
  rel.setLimit(MAX_REL_ROWS);
  rel.query();
  while (rel.next()) {
    const parent = String(rel.getValue("parent"));
    const child = String(rel.getValue("child"));
    if (parent && !seen[parent]) {
      seen[parent] = true;
      relatedIds.push(parent);
    }
    if (child && !seen[child]) {
      seen[child] = true;
      relatedIds.push(child);
    }
  }

  const cis =
    relatedIds.length > 0
      ? readNamedCIs((gr) => gr.addQuery("sys_id", "IN", relatedIds.join(",")))
      : // No relationships on this instance at all — fall back to any named CI
        // so the dropdown still offers something.
        readNamedCIs(() => {});

  response.setBody({ result: cis });
}
