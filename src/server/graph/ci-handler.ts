import { GlideRecord } from "@servicenow/glide";
import { deriveHealth } from "./health.ts";
import { fetchIncidentsForCIs } from "./cmdb-data.ts";

function getPathParam(request: any, name: string): string {
  return request.pathParams[name] || "";
}

export function process(request: any, response: any) {
  const sysId = getPathParam(request, "sys_id");
  const gr = new GlideRecord("cmdb_ci");

  if (!gr.get(sysId)) {
    response.setStatus(404);
    response.setBody({ result: null, error: { message: "CI not found: " + sysId } });
    return;
  }

  const incidents = fetchIncidentsForCIs([sysId]);
  const healthResult = deriveHealth(incidents);

  response.setBody({
    result: {
      id: String(gr.getValue("sys_id")),
      name: String(gr.getValue("name")),
      class: String(gr.getValue("sys_class_name")),
      operational_status: String(gr.getValue("operational_status")),
      install_status: String(gr.getValue("install_status")),
      health: healthResult.health,
      incident_count: healthResult.incidentCount,
      open_incidents: incidents.map((i) => ({ number: i.number, priority: i.priority })),
    },
  });
}
