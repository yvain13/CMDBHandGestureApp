// src/client/scene/layout.ts
import { forceSimulation, forceLink, forceManyBody, forceCenter } from "d3-force-3d";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

export function computeLayout(
  nodeIds: string[],
  edges: LayoutEdge[],
  ticks: number = 300
): Map<string, LayoutNode> {
  const nodes = nodeIds.map((id) => ({ id, x: 0, y: 0, z: 0 }));
  const simulation = forceSimulation(nodes, 3)
    .force(
      "link",
      forceLink(edges)
        .id((d: any) => d.id)
        .distance(40)
    )
    .force("charge", forceManyBody().strength(-60))
    .force("center", forceCenter(0, 0, 0))
    .stop();

  for (let i = 0; i < ticks; i++) {
    simulation.tick();
  }

  const positions = new Map<string, LayoutNode>();
  nodes.forEach((n: any) => positions.set(n.id, { id: n.id, x: n.x, y: n.y, z: n.z }));
  return positions;
}
