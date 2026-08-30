import { GlideRecord } from "@servicenow/glide";

// GET /cis — CIs for the root-selector dropdown. Only CIs that participate in
// at least one cmdb_rel_ci relationship make useful roots, but joining that in
// GlideRecord is awkward, so we return named CIs ordered by name and let the
// graph endpoint handle single-node results.
export function process(request: any, response: any) {
  const gr = new GlideRecord("cmdb_ci");
  gr.addNotNullQuery("name");
  gr.orderBy("name");
  gr.setLimit(200);
  gr.query();

  const cis: { id: string; name: string; class: string }[] = [];
  while (gr.next()) {
    cis.push({
      id: String(gr.getValue("sys_id")),
      name: String(gr.getValue("name")),
      class: String(gr.getValue("sys_class_name")),
    });
  }

  response.setBody({ result: cis });
}
