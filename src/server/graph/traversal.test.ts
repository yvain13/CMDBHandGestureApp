// src/server/graph/traversal.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { expandFrontier } from "./traversal.ts";
import type { RelEdge } from "./traversal.ts";

test("discovers new nodes on the far side of frontier edges", () => {
  const edges: RelEdge[] = [
    { parentId: "root", childId: "childA", typeName: "Depends on::Used by" },
    { parentId: "childB", childId: "root", typeName: "Depends on::Used by" },
  ];
  const result = expandFrontier(["root"], new Set(["root"]), edges, 250);
  assert.deepEqual(result.newNodeIds.sort(), ["childA", "childB"].sort());
  assert.deepEqual(result.nextFrontier.sort(), ["childA", "childB"].sort());
  assert.equal(result.edges.length, 2);
  assert.equal(result.truncated, false);
});

test("does not rediscover already-visited nodes", () => {
  const edges: RelEdge[] = [
    { parentId: "root", childId: "known", typeName: "Depends on::Used by" },
  ];
  const result = expandFrontier(["root"], new Set(["root", "known"]), edges, 250);
  assert.deepEqual(result.newNodeIds, []);
  assert.deepEqual(result.nextFrontier, []);
  assert.equal(result.edges.length, 1, "edge is still recorded even if both ends are known");
});

test("dedupes an edge touching the same new node twice", () => {
  const edges: RelEdge[] = [
    { parentId: "root", childId: "dup", typeName: "Depends on::Used by" },
    { parentId: "dup", childId: "root", typeName: "Depends on::Used by" },
  ];
  const result = expandFrontier(["root"], new Set(["root"]), edges, 250);
  assert.deepEqual(result.newNodeIds, ["dup"]);
});

test("truncates once maxNodes is reached and reports it", () => {
  const edges: RelEdge[] = [
    { parentId: "root", childId: "a", typeName: "t" },
    { parentId: "root", childId: "b", typeName: "t" },
    { parentId: "root", childId: "c", typeName: "t" },
  ];
  const result = expandFrontier(["root"], new Set(["root"]), edges, 2);
  assert.equal(result.newNodeIds.length, 1, "visited already has 1 (root), budget is 2 total");
  assert.equal(result.truncated, true);
});
