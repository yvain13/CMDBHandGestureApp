// src/client/scene/nodes.ts
import * as THREE from "three";

export type Health = "critical" | "warning" | "healthy";

export interface GraphNode {
  id: string;
  health: Health;
  incidentCount: number;
}

export interface GraphEdgeInput {
  source: string;
  target: string;
}

const HEALTH_COLORS: Record<Health, number> = {
  critical: 0xe5484d,
  warning: 0xffb224,
  healthy: 0x4a5568,
};

export const SELECTED_COLOR = 0x00d4ff;

export function healthColor(health: Health): number {
  return HEALTH_COLORS[health] ?? HEALTH_COLORS.healthy;
}

export function nodeRadius(incidentCount: number): number {
  return Math.min(0.6 + incidentCount * 0.15, 1.6);
}

export function createNodeMesh(count: number): THREE.InstancedMesh {
  const geometry = new THREE.SphereGeometry(1, 16, 16);
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  return mesh;
}
