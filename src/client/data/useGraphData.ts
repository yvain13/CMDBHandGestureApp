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
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      message = body.error?.message || message;
    } catch {
      // response body wasn't JSON (e.g. an HTML error/login page)
    }
    throw new Error(message);
  }
  const body = await response.json();
  return body.result as T;
}

export function useGraphData() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [selectedCI, setSelectedCI] = useState<CIDetail | null>(null);
  const [rootId, setRootId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGraph = useCallback(async (root?: string, depth?: number) => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (root) params.set("root", root);
      if (depth) params.set("depth", String(depth));
      const result = await apiGet<GraphResponse>(`/graph?${params.toString()}`);
      setGraph(result);
      setRootId(result.root);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  const selectCI = useCallback(async (sysId: string) => {
    try {
      setError(null);
      const result = await apiGet<CIDetail>(`/ci/${sysId}`);
      setSelectedCI(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const clearSelection = useCallback(() => setSelectedCI(null), []);

  const reset = useCallback(() => {
    clearSelection();
    if (rootId) loadGraph(rootId);
  }, [rootId, loadGraph, clearSelection]);

  return { graph, selectedCI, error, loadGraph, selectCI, clearSelection, reset };
}
