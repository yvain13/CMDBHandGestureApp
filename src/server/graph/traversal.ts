export interface RelEdge {
  parentId: string;
  childId: string;
  typeName: string;
}

export interface EdgeRecord {
  source: string;
  target: string;
  type: string;
}

export interface FrontierResult {
  nextFrontier: string[];
  newNodeIds: string[];
  edges: EdgeRecord[];
  truncated: boolean;
}

export function expandFrontier(
  frontierIds: string[],
  visited: Set<string>,
  batchEdges: RelEdge[],
  maxNodes: number
): FrontierResult {
  const edges: EdgeRecord[] = [];
  const newNodeIds: string[] = [];
  const nextFrontierSet = new Set<string>();
  let truncated = false;
  const frontierSet = new Set(frontierIds);

  for (const edge of batchEdges) {
    const other = frontierSet.has(edge.parentId) ? edge.childId : edge.parentId;
    edges.push({ source: edge.parentId, target: edge.childId, type: edge.typeName });

    if (visited.has(other) || newNodeIds.includes(other)) {
      continue;
    }
    if (visited.size + newNodeIds.length >= maxNodes) {
      truncated = true;
      continue;
    }
    newNodeIds.push(other);
    nextFrontierSet.add(other);
  }

  return { nextFrontier: [...nextFrontierSet], newNodeIds, edges, truncated };
}
