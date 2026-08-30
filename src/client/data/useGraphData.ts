// src/client/data/useGraphData.ts
import { useCallback, useRef, useState } from "react";
import { SAMPLE_GRAPH, sampleCIDetail, sampleCIList, sampleSubgraph } from "./sampleData";

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

export interface CIListEntry {
  id: string;
  name: string;
  class: string;
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

const API_BASE = "/api/x_1433234_gcmdb/gesture_cmdb";

async function apiGet<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  // Session-cookie REST calls need the CSRF token, but only send it when the
  // page actually provides one — a literal "undefined" header gets rejected
  // even on requests that would otherwise pass.
  const sessionToken = (window as any).g_ck;
  if (sessionToken) headers["X-UserToken"] = sessionToken;

  const response = await fetch(API_BASE + path, { headers });
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      message = body.result?.error?.message || body.error?.message || message;
    } catch {
      // response body wasn't JSON (e.g. an HTML error/login page)
    }
    console.error(`[TouchlessWarRoom] GET ${API_BASE + path} -> ${response.status}: ${message}`);
    throw new Error(message);
  }
  const body = await response.json();
  // ServiceNow wraps the handler's body in a top-level `result`, and our
  // handlers set { result: ... } themselves — so payloads arrive double-wrapped:
  // { result: { result: <payload> } }.
  const outer = body?.result;
  const payload =
    outer && typeof outer === "object" && !Array.isArray(outer) && "result" in outer
      ? outer.result
      : outer;
  return payload as T;
}

export function useGraphData() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [selectedCI, setSelectedCI] = useState<CIDetail | null>(null);
  const [rootId, setRootId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Once the live API fails we stay in sample mode (ref, not state: the
  // gesture-command callbacks capture loadGraph/selectCI on mount).
  const sampleModeRef = useRef(false);
  const [usingSampleData, setUsingSampleData] = useState(false);

  const loadGraph = useCallback(async (root?: string, depth?: number) => {
    if (sampleModeRef.current) {
      const result = (root && sampleSubgraph(root, depth ?? 2)) || SAMPLE_GRAPH;
      setGraph(result);
      setRootId(result.root);
      return result;
    }
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
      // /cis succeeded (we're in live mode), so a graph failure is a real,
      // reportable error for that CI — not a reason to switch to sample data.
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  const [ciList, setCIList] = useState<CIListEntry[]>([]);

  // Entry point: fetch the CI list first. The graph is only fetched once the
  // user picks a root CI. If the list itself fails, the whole app switches to
  // the built-in sample dataset.
  const loadCIList = useCallback(async () => {
    if (sampleModeRef.current) {
      setCIList(sampleCIList());
      return;
    }
    try {
      const list = await apiGet<CIListEntry[]>("/cis");
      if (!Array.isArray(list)) throw new Error("Unexpected /cis response shape");
      setCIList(list);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      sampleModeRef.current = true;
      setUsingSampleData(true);
      setError(`Live CMDB unavailable (${message}) — showing sample data`);
      setCIList(sampleCIList());
      setGraph(SAMPLE_GRAPH);
      setRootId(SAMPLE_GRAPH.root);
    }
  }, []);

  const selectCI = useCallback(async (sysId: string) => {
    if (sampleModeRef.current) {
      const detail = sampleCIDetail(sysId);
      if (detail) setSelectedCI(detail);
      return;
    }
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

  return {
    graph,
    selectedCI,
    error,
    usingSampleData,
    ciList,
    loadCIList,
    loadGraph,
    selectCI,
    clearSelection,
    reset,
  };
}
