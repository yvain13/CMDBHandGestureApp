// src/client/scene/buildGraphObjects.ts
import * as THREE from "three";
import { LayoutNode } from "./layout";
import { createNodeMesh, healthColor, nodeRadius, GraphNode, GraphEdgeInput } from "./nodes";

export interface GraphObjects {
  mesh: THREE.InstancedMesh;
  edgeLines: THREE.LineSegments;
  nodeOrder: string[];
}

export function buildGraphObjects(
  nodes: GraphNode[],
  edges: GraphEdgeInput[],
  positions: Map<string, LayoutNode>
): GraphObjects {
  const nodeOrder = nodes.map((n) => n.id);
  const mesh = createNodeMesh(nodes.length);
  const dummy = new THREE.Object3D();

  nodes.forEach((node, i) => {
    const pos = positions.get(node.id);
    if (!pos) return;
    dummy.position.set(pos.x, pos.y, pos.z);
    dummy.scale.setScalar(nodeRadius(node.incidentCount));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, new THREE.Color(healthColor(node.health)));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const linePositions: number[] = [];
  edges.forEach((edge) => {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    if (!source || !target) return;
    linePositions.push(source.x, source.y, source.z, target.x, target.y, target.z);
  });
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const edgeLines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({ color: 0x4a5568, transparent: true, opacity: 0.55 })
  );

  return { mesh, edgeLines, nodeOrder };
}
