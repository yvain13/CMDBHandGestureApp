import { GlideRecord } from "@servicenow/glide";
import { RelEdge } from "./traversal.ts";
import { IncidentSummary } from "./health.ts";

const SYS_ID_PATTERN = /^[0-9a-f]{32}$/i;

export function resolveRootId(rootParam: string): string {
  if (SYS_ID_PATTERN.test(rootParam)) {
    return rootParam;
  }
  const gr = new GlideRecord("cmdb_ci");
  gr.addQuery("name", rootParam);
  gr.setLimit(1);
  gr.query();
  if (gr.next()) {
    return String(gr.getValue("sys_id"));
  }
  return "";
}

// Fallback when the configured default root CI doesn't exist on this instance:
// any CI that participates in a relationship makes a workable default root.
export function findAnyRelatedRootId(): string {
  const gr = new GlideRecord("cmdb_rel_ci");
  gr.setLimit(1);
  gr.query();
  if (gr.next()) {
    return String(gr.getValue("parent"));
  }
  return "";
}

export function fetchEdgesForFrontier(frontierIds: string[]): RelEdge[] {
  const edges: RelEdge[] = [];
  if (frontierIds.length === 0) return edges;

  const gr = new GlideRecord("cmdb_rel_ci");
  const qc = gr.addQuery("parent", "IN", frontierIds.join(","));
  qc.addOrCondition("child", "IN", frontierIds.join(","));
  gr.query();
  while (gr.next()) {
    edges.push({
      parentId: String(gr.getValue("parent")),
      childId: String(gr.getValue("child")),
      typeName: String(gr.getDisplayValue("type")),
    });
  }
  return edges;
}

export interface CIRecord {
  id: string;
  name: string;
  className: string;
  operationalStatus: string;
  installStatus: string;
}

export function fetchCIRecords(ids: string[]): CIRecord[] {
  const records: CIRecord[] = [];
  if (ids.length === 0) return records;

  const gr = new GlideRecord("cmdb_ci");
  gr.addQuery("sys_id", "IN", ids.join(","));
  gr.query();
  while (gr.next()) {
    records.push({
      id: String(gr.getValue("sys_id")),
      name: String(gr.getValue("name")),
      className: String(gr.getValue("sys_class_name")),
      operationalStatus: String(gr.getValue("operational_status")),
      installStatus: String(gr.getValue("install_status")),
    });
  }
  return records;
}

export function fetchIncidentsForCIs(ids: string[]): IncidentSummary[] {
  const incidents: IncidentSummary[] = [];
  if (ids.length === 0) return incidents;

  const gr = new GlideRecord("incident");
  gr.addQuery("cmdb_ci", "IN", ids.join(","));
  gr.addActiveQuery();
  gr.query();
  while (gr.next()) {
    incidents.push({
      number: String(gr.getValue("number")),
      priority: String(gr.getValue("priority")),
      ciId: String(gr.getValue("cmdb_ci")),
    });
  }
  return incidents;
}
