// src/client/data/useGraphData.ts
import { useCallback, useState } from "react";

export interface GraphNodeData {
  id: string;
  name: string;
  class: string;
  operational_status: string;
  health: "critical" | "warning" | "healthy";
  incident_count: number;
  top_incident: { number: string; priority: string } | null;
  depth: number;
}

export interface GraphEdgeData {
  source: string;
  target: string;
  type: string;
}

export interface GraphResponse {
  root: string;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  truncated: boolean;
}

export interface CIDetail {
  id: string;
  name: string;
  class: string;
  operational_status: string;
  install_status: string;
  health: string;
  incident_count: number;
  open_incidents: { number: string; priority: string }[];
}

const API_BASE = "/api/x_tusm_gcmdb/gesture_cmdb";

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(API_BASE + path, {
    headers: { Accept: "application/json", "X-UserToken": (window as any).g_ck },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "Request failed");
  return body.result as T;
}

export function useGraphData() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [selectedCI, setSelectedCI] = useState<CIDetail | null>(null);
  const [rootId, setRootId] = useState<string | null>(null);

  const loadGraph = useCallback(async (root?: string, depth?: number) => {
    const params = new URLSearchParams();
    if (root) params.set("root", root);
    if (depth) params.set("depth", String(depth));
    const result = await apiGet<GraphResponse>(`/graph?${params.toString()}`);
    setGraph(result);
    setRootId(result.root);
    return result;
  }, []);

  const selectCI = useCallback(async (sysId: string) => {
    const result = await apiGet<CIDetail>(`/ci/${sysId}`);
    setSelectedCI(result);
  }, []);

  const clearSelection = useCallback(() => setSelectedCI(null), []);

  const reset = useCallback(() => {
    clearSelection();
    if (rootId) {
      loadGraph(rootId).catch((error) => {
        console.error("Failed to reset graph:", error);
      });
    }
  }, [rootId, loadGraph, clearSelection]);

  return { graph, selectedCI, loadGraph, selectCI, clearSelection, reset };
}
