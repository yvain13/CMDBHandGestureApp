import { expandFrontier, EdgeRecord } from "./traversal";
import { deriveHealth } from "./health";
import {
  resolveRootId,
  fetchEdgesForFrontier,
  fetchCIRecords,
  fetchIncidentsForCIs,
} from "./cmdb-data";
import { getConfigValue } from "../config/config-service";

function getQueryParam(request: any, name: string): string {
  const val = request.queryParams[name];
  if (Array.isArray(val)) return val[0] || "";
  return val || "";
}

export function process(request: any, response: any) {
  const rootParam = getQueryParam(request, "root") || getConfigValue("default_root_ci");
  const rootId = resolveRootId(rootParam);

  if (!rootId) {
    response.setStatus(404);
    response.setBody({ result: null, error: { message: "Root CI not found: " + rootParam } });
    return;
  }

  const maxDepthConfig = Number(getConfigValue("max_depth")) || 2;
  const requestedDepth = Number(getQueryParam(request, "depth")) || maxDepthConfig;
  const depth = Math.min(requestedDepth, maxDepthConfig);
  const maxNodes = Number(getConfigValue("max_nodes")) || 250;

  const visited = new Set<string>([rootId]);
  const nodeDepths = new Map<string, number>([[rootId, 0]]);
  let frontier = [rootId];
  const allEdges: EdgeRecord[] = [];
  let truncated = false;

  for (let hop = 0; hop < depth; hop++) {
    const batchEdges = fetchEdgesForFrontier(frontier);
    const result = expandFrontier(frontier, visited, batchEdges, maxNodes);
    allEdges.push(...result.edges);
    result.newNodeIds.forEach((id) => {
      visited.add(id);
      nodeDepths.set(id, hop + 1);
    });
    if (result.truncated) {
      truncated = true;
      break;
    }
    frontier = result.nextFrontier;
    if (frontier.length === 0) break;
  }

  const nodeIds = [...visited];
  const ciRecords = fetchCIRecords(nodeIds);
  const incidents = fetchIncidentsForCIs(nodeIds);

  const nodes = ciRecords.map((ci) => {
    const ciIncidents = incidents.filter((i) => i.ciId === ci.id);
    const healthResult = deriveHealth(ciIncidents);
    return {
      id: ci.id,
      name: ci.name,
      class: ci.className,
      operational_status: ci.operationalStatus,
      health: healthResult.health,
      incident_count: healthResult.incidentCount,
      top_incident: healthResult.topIncident,
      depth: nodeDepths.get(ci.id) ?? depth,
    };
  });

  // Drop dangling edges (far endpoint skipped by the maxNodes budget) and dedupe:
  // fetchEdgesForFrontier matches parent OR child, so edges reappear on the next hop.
  const nodeIdSet = new Set(nodeIds);
  const dedupedEdges = new Map<string, EdgeRecord>();
  allEdges.forEach((edge) => {
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) return;
    const key = `${edge.source}|${edge.target}|${edge.type}`;
    dedupedEdges.set(key, edge);
  });
  const edges = [...dedupedEdges.values()];

  response.setBody({ result: { root: rootId, nodes, edges, truncated } });
}
