# Touchless War Room — Gesture-Controlled CMDB Impact Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP of a ServiceNow scoped app (`x_tusm_gcmdb`) that renders a live CMDB dependency graph in 3D and lets an operator navigate it with three hand gestures (select/expand/reset) captured via webcam, using MediaPipe + Three.js inside a ServiceNow UiPage.

**Architecture:** Fluent SDK project with a Scripted REST API (`/graph`, `/ci/{sys_id}`) backed by GlideRecord BFS traversal of `cmdb_rel_ci`, and a React UiPage client that renders the graph with Three.js/d3-force-3d and drives it with a MediaPipe GestureRecognizer + a hand-rolled debounce state machine. Pure logic (graph frontier expansion, health derivation, gesture state transitions) is isolated into dependency-free modules with real unit tests; GlideRecord glue, Three.js rendering, and MediaPipe wiring are verified manually against the live PDI since they can't be unit tested outside an instance/browser.

**Tech Stack:** `@servicenow/sdk` (Fluent DSL), TypeScript, React 18.2.0, `@servicenow/react-components`, `@mediapipe/tasks-vision`, `three`, `d3-force-3d`. Unit tests run via Node's built-in `node --test` against `.ts` files directly (Node 23 native type stripping) — no test framework dependency added.

## Global Constraints

- Scope: `x_tusm_gcmdb`. Target instance: PDI `dev422303.service-now.com`.
- MVP only — no v2 features (no second hand, no orbit, no custom-trained gestures, no incident cycling, no write-backs, no root picker). Design doc §1.
- `now-sdk auth` and `now-sdk install` against the PDI only run when the user explicitly confirms — every task before the final install task works entirely offline against the local build (`npx @servicenow/sdk build`).
- CV assets (MediaPipe WASM + `gesture_recognizer.task`) load from CDN (jsdelivr + Google model storage) at runtime — not bundled, not self-hosted. Design doc §3.
- Files stay under ~100 lines per SDK convention (design doc §8) — split further if a task's file would exceed that.
- Never use `Now.include()`, Jelly, `g:script`, CSS Modules, or hand-written webpack/vite/babel config — the SDK build system is not to be touched. `ui-page-patterns-guide` topic, "Build System Constraints."
- All Table API / fetch calls from the client include `X-UserToken: window.g_ck` and `sysparm_display_value=all` per `ui-page-guide`.
- `x_tusm_gcmdb_config` values: `default_root_ci=CAROL3-GATEWAY` (a CI **name**, resolved server-side — design doc §4), `max_depth=2`, `max_nodes=250`, `gesture_confidence_threshold=0.7`.
- Root CI for MVP: **CAROL3-GATEWAY**.
- `@servicenow/react-components` prop APIs can't be verified against live docs in this
  environment (the `package_docs` lookup the SDK guides assume isn't available here), and this
  app's custom surfaces (webcam canvas, 3D scene, arming ring) have no record-bound equivalent
  in that library anyway. Deliberate deviation: all custom UI in this plan uses plain semantic
  HTML styled with Horizon Design System CSS variables (`var(--now-color-*)`, documented
  directly in `ui-page-patterns-guide` with concrete examples) rather than guessed component
  props that could silently break at runtime.

---

## Task Index

1. Scaffold the SDK project and verify the build
2. Config table (`x_tusm_gcmdb_config`)
3. Seed config records + ACLs
4. Pure graph traversal module (`traversal.ts`)
5. Pure health derivation module (`health.ts`)
6. GlideRecord CMDB data glue (`cmdb-data.ts`, `config-service.ts`)
7. `/graph` Scripted REST route
8. `/ci/{sys_id}` Scripted REST route
9. Pure gesture state machine reducer (`stateMachine.ts`)
10. Gesture hooks (`useGestureStateMachine`, `useGestureRecognizer`)
11. `CameraPreview` and `ArmingIndicator` components
12. Scene helpers (`layout.ts`, `nodes.ts`)
13. `GraphScene.ts` — Three.js render loop + raycast selection
14. `useGraphData` hook + `DetailCard` component
15. App shell (`app.tsx`, `index.html`, `main.tsx`, `fields.ts`) + UiPage + App Menu
16. Install to PDI and end-to-end verification (gated on explicit user confirmation)

---

## File Structure

```
now.config.json
package.json
src/
  fluent/
    tables/config.now.ts
    records/seed-config.now.ts
    acls/index.now.ts
    rest/graph-api.now.ts
    ui-pages/gesture-cmdb-page.now.ts
    menu/app-menu.now.ts
  server/
    graph/
      traversal.ts            pure: frontier expansion + dedup + truncation
      traversal.test.ts
      health.ts                pure: incident list -> health/count/top_incident
      health.test.ts
      cmdb-data.ts              GlideRecord glue: resolveRootId, fetchEdgesForFrontier,
                                 fetchCIRecords, fetchIncidentsForCIs
      graph-handler.ts          /graph route handler, wires traversal.ts + health.ts + cmdb-data.ts
      ci-handler.ts             /ci/{sys_id} route handler
    config/
      config-service.ts         GlideRecord glue: getConfigValue(name)
  client/
    index.html
    main.tsx
    app.tsx
    app.css
    utils/fields.ts
    gesture/
      stateMachine.ts           pure: (state, event) -> nextState reducer
      stateMachine.test.ts
      useGestureStateMachine.ts hook wrapping the reducer with a ticking clock
      useGestureRecognizer.ts   MediaPipe wiring: webcam stream, VIDEO-mode recognition loop
    data/
      useGraphData.ts           fetch /graph and /ci/{id}, holds selection state
    scene/
      layout.ts                 d3-force-3d wrapper: positions nodes, freezes after warmup
      nodes.ts                  color mapping + instanced mesh construction
      GraphScene.ts              Three.js scene/camera/renderer lifecycle + raycast selection
    components/
      DetailCard.tsx
      CameraPreview.tsx
      ArmingIndicator.tsx
```

---

### Task 1: Scaffold the SDK project and verify the build

**Files:**
- Create: `now.config.json`, `package.json`, `src/fluent/index.now.ts` (generated by `init`)

**Interfaces:**
- Produces: a working `npx @servicenow/sdk build` command every later task relies on to validate its own changes.

- [ ] **Step 1: Scaffold non-interactively**

```bash
cd /Users/aparajitayadav/Desktop/CMDBHandGestureApp
npx @servicenow/sdk init --appName "Touchless War Room" --packageName "gesture-cmdb" --scopeName "x_tusm_gcmdb" --template base
```

If it prompts for a company code (no maint access), stop and ask the user for the value of
`glide.appcreator.company.code` on the PDI, or their explicit OK to use a generated scope name.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify the scaffold builds clean**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds with no errors (the generated `example.now.ts` template is fine as-is
for this step — it gets removed in Task 2).

- [ ] **Step 4: Remove the generated example fluent file**

The `init` template scaffolds `src/fluent/example.now.ts` (or similar) with a placeholder
table/record. Delete it — Task 2 replaces it with the real config table.

```bash
rm -f src/fluent/example.now.ts
npx @servicenow/sdk build
```

Expected: build still succeeds with the example file gone.

- [ ] **Step 5: Commit**

```bash
git add now.config.json package.json package-lock.json src/fluent
git commit -m "Scaffold ServiceNow SDK project for x_tusm_gcmdb"
```

---

### Task 2: Config table (`x_tusm_gcmdb_config`)

**Files:**
- Create: `src/fluent/tables/config.now.ts`

**Interfaces:**
- Produces: table `x_tusm_gcmdb_config` with columns `x_tusm_gcmdb_setting_name` (String),
  `x_tusm_gcmdb_setting_value` (String), `x_tusm_gcmdb_active` (Boolean) — Task 3's seed
  records and Task 6's `config-service.ts` both depend on these exact column names.

- [ ] **Step 1: Write the table definition**

```typescript
// src/fluent/tables/config.now.ts
import "@servicenow/sdk/global";
import { Table, StringColumn, BooleanColumn } from "@servicenow/sdk/core";

export const x_tusm_gcmdb_config = Table({
  name: "x_tusm_gcmdb_config",
  label: "Gesture CMDB Config",
  schema: {
    x_tusm_gcmdb_setting_name: StringColumn({
      label: "Setting Name",
      maxLength: 100,
      mandatory: true,
    }),
    x_tusm_gcmdb_setting_value: StringColumn({
      label: "Setting Value",
      maxLength: 255,
    }),
    x_tusm_gcmdb_active: BooleanColumn({
      label: "Active",
      default: true,
    }),
  },
  accessibleFrom: "package_private",
});
```

- [ ] **Step 2: Build to validate the table compiles**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds; no diagnostics about the new table file.

- [ ] **Step 3: Commit**

```bash
git add src/fluent/tables/config.now.ts
git commit -m "Add x_tusm_gcmdb_config table"
```

---

### Task 3: Seed config records + ACLs

**Files:**
- Create: `src/fluent/records/seed-config.now.ts`
- Create: `src/fluent/acls/index.now.ts`

**Interfaces:**
- Consumes: `x_tusm_gcmdb_config` table from Task 2.
- Produces: four seeded config rows (`default_root_ci`, `max_depth`, `max_nodes`,
  `gesture_confidence_threshold`) that Task 6's `config-service.ts` and Task 7/8's REST
  handlers read by name. Read ACL on the config table for `itil`/`admin`, write for `admin`,
  execute ACL on the REST API for `itil`.

- [ ] **Step 1: Write the seed records**

```typescript
// src/fluent/records/seed-config.now.ts
import "@servicenow/sdk/global";
import { Record } from "@servicenow/sdk/core";

const settings: Array<[string, string, string]> = [
  ["default-root-ci", "default_root_ci", "CAROL3-GATEWAY"],
  ["max-depth", "max_depth", "2"],
  ["max-nodes", "max_nodes", "250"],
  ["gesture-confidence-threshold", "gesture_confidence_threshold", "0.7"],
];

settings.forEach(([key, name, value]) => {
  Record({
    $id: Now.ID[`gcmdb-config-${key}`],
    table: "x_tusm_gcmdb_config",
    data: {
      x_tusm_gcmdb_setting_name: name,
      x_tusm_gcmdb_setting_value: value,
      x_tusm_gcmdb_active: true,
    },
  });
});
```

- [ ] **Step 2: Write the ACLs**

```typescript
// src/fluent/acls/index.now.ts
import "@servicenow/sdk/global";
import { Acl } from "@servicenow/sdk/core";

export const configRead = Acl({
  $id: Now.ID["gcmdb-config-read"],
  type: "record",
  table: "x_tusm_gcmdb_config",
  operation: "read",
  roles: ["itil", "admin"],
});

export const configWrite = Acl({
  $id: Now.ID["gcmdb-config-write"],
  type: "record",
  table: "x_tusm_gcmdb_config",
  operation: "write",
  roles: ["admin"],
});

export const restExecute = Acl({
  $id: Now.ID["gcmdb-rest-execute"],
  type: "rest_endpoint",
  name: "gesture_cmdb",
  operation: "execute",
  roles: ["itil"],
});
```

Note: `restExecute` is defined here and wired into the `RestApi`'s `enforceAcl` in Task 7 —
Fluent ACL records must exist before the REST API definition references them, which is why
this task comes before Task 7.

- [ ] **Step 3: Build to validate**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/fluent/records/seed-config.now.ts src/fluent/acls/index.now.ts
git commit -m "Seed config records and add read/write/execute ACLs"
```

---

### Task 4: Pure graph traversal module (`traversal.ts`)

**Files:**
- Create: `src/server/graph/traversal.ts`
- Test: `src/server/graph/traversal.test.ts`

**Interfaces:**
- Produces: `RelEdge { parentId: string; childId: string; typeName: string }`,
  `EdgeRecord { source: string; target: string; type: string }`,
  `expandFrontier(frontierIds: string[], visited: Set<string>, batchEdges: RelEdge[], maxNodes: number): { nextFrontier: string[]; newNodeIds: string[]; edges: EdgeRecord[]; truncated: boolean }`.
  Task 6's `fetchEdgesForFrontier` returns `RelEdge[]` in this shape; Task 7's `/graph`
  handler drives the hop-by-hop BFS loop by calling `expandFrontier` once per hop.

This function takes one hop's worth of already-fetched edges (the handler is responsible for
querying `cmdb_rel_ci` per hop — see Task 6/7) and computes which nodes are newly discovered,
which edges to record, and whether the `maxNodes` budget has been exceeded. Kept dependency-free
(no GlideRecord) so it can be unit tested directly.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/server/graph/traversal.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { expandFrontier, RelEdge } from "./traversal";

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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node --test src/server/graph/traversal.test.ts
```

Expected: FAIL — `Cannot find module './traversal'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```typescript
// src/server/graph/traversal.ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node --test src/server/graph/traversal.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/server/graph/traversal.ts src/server/graph/traversal.test.ts
git commit -m "Add pure graph frontier-expansion logic with unit tests"
```

---

### Task 5: Pure health derivation module (`health.ts`)

**Files:**
- Create: `src/server/graph/health.ts`
- Test: `src/server/graph/health.test.ts`

**Interfaces:**
- Produces: `IncidentSummary { number: string; priority: string; ciId: string }`,
  `Health = 'critical' | 'warning' | 'healthy'`,
  `deriveHealth(incidents: IncidentSummary[]): { health: Health; incidentCount: number; topIncident: { number: string; priority: string } | null }`.
  Task 7's `/graph` handler and Task 8's `/ci/{sys_id}` handler both call this once per CI
  with that CI's open incidents.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/server/graph/health.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveHealth } from "./health";

test("no open incidents is healthy", () => {
  const result = deriveHealth([]);
  assert.equal(result.health, "healthy");
  assert.equal(result.incidentCount, 0);
  assert.equal(result.topIncident, null);
});

test("priority 1 or 2 is critical", () => {
  const result = deriveHealth([
    { number: "INC0001", priority: "2", ciId: "x" },
    { number: "INC0002", priority: "4", ciId: "x" },
  ]);
  assert.equal(result.health, "critical");
  assert.equal(result.incidentCount, 2);
  assert.deepEqual(result.topIncident, { number: "INC0001", priority: "2" });
});

test("priority 3 with nothing higher is warning", () => {
  const result = deriveHealth([{ number: "INC0003", priority: "3", ciId: "x" }]);
  assert.equal(result.health, "warning");
  assert.deepEqual(result.topIncident, { number: "INC0003", priority: "3" });
});

test("only priority 4/5 open incidents is healthy but still counted", () => {
  const result = deriveHealth([{ number: "INC0004", priority: "5", ciId: "x" }]);
  assert.equal(result.health, "healthy");
  assert.equal(result.incidentCount, 1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node --test src/server/graph/health.test.ts
```

Expected: FAIL — `Cannot find module './health'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/server/graph/health.ts
export interface IncidentSummary {
  number: string;
  priority: string;
  ciId: string;
}

export type Health = "critical" | "warning" | "healthy";

export interface HealthResult {
  health: Health;
  incidentCount: number;
  topIncident: { number: string; priority: string } | null;
}

export function deriveHealth(incidents: IncidentSummary[]): HealthResult {
  if (incidents.length === 0) {
    return { health: "healthy", incidentCount: 0, topIncident: null };
  }

  const top = [...incidents].sort((a, b) => Number(a.priority) - Number(b.priority))[0];
  const topPriority = Number(top.priority);
  const health: Health = topPriority <= 2 ? "critical" : topPriority === 3 ? "warning" : "healthy";

  return {
    health,
    incidentCount: incidents.length,
    topIncident: { number: top.number, priority: top.priority },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node --test src/server/graph/health.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/server/graph/health.ts src/server/graph/health.test.ts
git commit -m "Add pure health-derivation logic with unit tests"
```

---

### Task 6: GlideRecord CMDB data glue (`cmdb-data.ts`, `config-service.ts`)

**Files:**
- Create: `src/server/graph/cmdb-data.ts`
- Create: `src/server/config/config-service.ts`

**Interfaces:**
- Consumes: `RelEdge` type from Task 4 (`./traversal`).
- Produces: `resolveRootId(rootParam: string): string`,
  `fetchEdgesForFrontier(frontierIds: string[]): RelEdge[]`,
  `fetchCIRecords(ids: string[]): CIRecord[]` where
  `CIRecord { id: string; name: string; className: string; operationalStatus: string; installStatus: string }`,
  `fetchIncidentsForCIs(ids: string[]): IncidentSummary[]` (using the `IncidentSummary` type
  from Task 5), and `getConfigValue(settingName: string): string`. Tasks 7 and 8 call these
  directly — no test file here, this module touches live GlideRecord APIs that only run on
  an installed instance and can't be exercised in a local Node process. Correctness is
  verified in Task 16 via REST API Explorer.

- [ ] **Step 1: Write the config service**

```typescript
// src/server/config/config-service.ts
import { GlideRecord } from "@servicenow/glide";

export function getConfigValue(settingName: string): string {
  const gr = new GlideRecord("x_tusm_gcmdb_config");
  gr.addQuery("x_tusm_gcmdb_setting_name", settingName);
  gr.addQuery("x_tusm_gcmdb_active", true);
  gr.setLimit(1);
  gr.query();
  if (gr.next()) {
    return String(gr.getValue("x_tusm_gcmdb_setting_value") || "");
  }
  return "";
}
```

- [ ] **Step 2: Write the CMDB data glue**

```typescript
// src/server/graph/cmdb-data.ts
import { GlideRecord } from "@servicenow/glide";
import { RelEdge } from "./traversal";
import { IncidentSummary } from "./health";

const SYS_ID_PATTERN = /^[0-9a-f]{32}$/i;

export function resolveRootId(rootParam: string): string {
  if (SYS_ID_PATTERN.test(rootParam)) {
    return rootParam;
  }
  const gr = new GlideRecord("cmdb_ci");
  gr.addQuery("name", rootParam);
  gr.setLimit(1);
  gr.query();
  if (gr.next()) {
    return String(gr.getValue("sys_id"));
  }
  return "";
}

export function fetchEdgesForFrontier(frontierIds: string[]): RelEdge[] {
  const edges: RelEdge[] = [];
  if (frontierIds.length === 0) return edges;

  const gr = new GlideRecord("cmdb_rel_ci");
  gr.addQuery("parent", "IN", frontierIds.join(","));
  gr.addOrCondition("child", "IN", frontierIds.join(","));
  gr.query();
  while (gr.next()) {
    edges.push({
      parentId: String(gr.getValue("parent")),
      childId: String(gr.getValue("child")),
      typeName: String(gr.getDisplayValue("type")),
    });
  }
  return edges;
}

export interface CIRecord {
  id: string;
  name: string;
  className: string;
  operationalStatus: string;
  installStatus: string;
}

export function fetchCIRecords(ids: string[]): CIRecord[] {
  const records: CIRecord[] = [];
  if (ids.length === 0) return records;

  const gr = new GlideRecord("cmdb_ci");
  gr.addQuery("sys_id", "IN", ids.join(","));
  gr.query();
  while (gr.next()) {
    records.push({
      id: String(gr.getValue("sys_id")),
      name: String(gr.getValue("name")),
      className: String(gr.getValue("sys_class_name")),
      operationalStatus: String(gr.getValue("operational_status")),
      installStatus: String(gr.getValue("install_status")),
    });
  }
  return records;
}

export function fetchIncidentsForCIs(ids: string[]): IncidentSummary[] {
  const incidents: IncidentSummary[] = [];
  if (ids.length === 0) return incidents;

  const gr = new GlideRecord("incident");
  gr.addQuery("cmdb_ci", "IN", ids.join(","));
  gr.addActiveQuery();
  gr.query();
  while (gr.next()) {
    incidents.push({
      number: String(gr.getValue("number")),
      priority: String(gr.getValue("priority")),
      ciId: String(gr.getValue("cmdb_ci")),
    });
  }
  return incidents;
}
```

- [ ] **Step 3: Build to validate types compile**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds. (`GlideRecord` types come from `@servicenow/glide`, resolvable
without a live instance since they ship as local type declarations in `node_modules`.)

- [ ] **Step 4: Commit**

```bash
git add src/server/graph/cmdb-data.ts src/server/config/config-service.ts
git commit -m "Add GlideRecord glue for CMDB data and config lookups"
```

---

### Task 7: `/graph` Scripted REST route

**Files:**
- Create: `src/server/graph/graph-handler.ts`
- Create: `src/fluent/rest/graph-api.now.ts`

**Interfaces:**
- Consumes: `expandFrontier` (Task 4), `deriveHealth` (Task 5), `resolveRootId`,
  `fetchEdgesForFrontier`, `fetchCIRecords`, `fetchIncidentsForCIs` (Task 6),
  `getConfigValue` (Task 6), `restExecute` ACL (Task 3).
- Produces: `GET /api/x_tusm_gcmdb/gesture_cmdb/graph?root=<sys_id_or_name>&depth=<n>` returning
  `{ result: { root, nodes, edges, truncated } }` per design doc §5. (URI includes the
  `serviceId` segment per the SDK's URI construction rule — `/api/{scope}/{serviceId}/{path}` —
  so it's one segment longer than the idealized `/api/x_tusm_gcmdb/graph` in the design doc.
  Task 14's client fetch calls use this exact path.)

- [ ] **Step 1: Write the route handler**

```typescript
// src/server/graph/graph-handler.ts
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

  response.setBody({ result: { root: rootId, nodes, edges: allEdges, truncated } });
}
```

- [ ] **Step 2: Write the Fluent REST API definition**

```typescript
// src/fluent/rest/graph-api.now.ts
import "@servicenow/sdk/global";
import { RestApi } from "@servicenow/sdk/core";
import { process as processGraph } from "../../server/graph/graph-handler";
import { restExecute } from "../acls/index";

export const gcmdbApi = RestApi({
  $id: Now.ID["gcmdb-rest-api"],
  name: "Gesture CMDB API",
  serviceId: "gesture_cmdb",
  consumes: "application/json",
  produces: "application/json",
  enforceAcl: [restExecute],
  routes: [
    {
      $id: Now.ID["gcmdb-route-graph"],
      name: "graph",
      path: "/graph",
      method: "GET",
      script: processGraph,
      parameters: [
        { $id: Now.ID["gcmdb-param-root"], name: "root" },
        { $id: Now.ID["gcmdb-param-depth"], name: "depth" },
      ],
    },
  ],
});
```

- [ ] **Step 3: Build to validate**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds, `sys_ws_definition`/`sys_ws_operation` metadata generated for the
`/graph` route.

- [ ] **Step 4: Commit**

```bash
git add src/server/graph/graph-handler.ts src/fluent/rest/graph-api.now.ts
git commit -m "Add /graph Scripted REST route with BFS traversal"
```

---

### Task 8: `/ci/{sys_id}` Scripted REST route

**Files:**
- Create: `src/server/graph/ci-handler.ts`
- Modify: `src/fluent/rest/graph-api.now.ts` (add the `ci` route)

**Interfaces:**
- Consumes: `deriveHealth` (Task 5), `fetchIncidentsForCIs` (Task 6).
- Produces: `GET /api/x_tusm_gcmdb/ci/{sys_id}` returning
  `{ result: { id, name, class, operational_status, install_status, health, incident_count, open_incidents } }`.

- [ ] **Step 1: Write the route handler**

```typescript
// src/server/graph/ci-handler.ts
import { GlideRecord } from "@servicenow/glide";
import { deriveHealth } from "./health";
import { fetchIncidentsForCIs } from "./cmdb-data";

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
```

- [ ] **Step 2: Add the route to the REST API definition**

```typescript
// src/fluent/rest/graph-api.now.ts
// Add this import alongside the existing processGraph import:
import { process as processCi } from "../../server/graph/ci-handler";

// Add this route object to the `routes` array, after the "graph" route:
    {
      $id: Now.ID["gcmdb-route-ci"],
      name: "ci",
      path: "/ci/{sys_id}",
      method: "GET",
      script: processCi,
    },
```

- [ ] **Step 3: Build to validate**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds, both `/graph` and `/ci/{sys_id}` routes present in generated metadata.

- [ ] **Step 4: Commit**

```bash
git add src/server/graph/ci-handler.ts src/fluent/rest/graph-api.now.ts
git commit -m "Add /ci/{sys_id} Scripted REST route"
```

---

### Task 9: Pure gesture state machine reducer (`stateMachine.ts`)

**Files:**
- Create: `src/client/gesture/stateMachine.ts`
- Test: `src/client/gesture/stateMachine.test.ts`

**Interfaces:**
- Produces: `GestureFrame { category: string; score: number; timestampMs: number }`,
  `Command = 'SELECT' | 'EXPAND' | 'RESET'`, `MachinePhase = 'IDLE' | 'CANDIDATE' | 'FIRING' | 'COOLDOWN'`,
  `MachineState { phase: MachinePhase; candidateGesture: string | null; candidateFrames: number; cooldownStartedAt: number | null }`,
  `MachineConfig { confidenceThreshold: number; holdFrames: number; cooldownMs: number }`,
  `INITIAL_STATE: MachineState`,
  `reduceGestureState(state: MachineState, frame: GestureFrame, config: MachineConfig): { state: MachineState; command: Command | null }`.
  Task 10's `useGestureStateMachine` hook calls `reduceGestureState` once per MediaPipe result
  frame and holds the returned `state`/`command` in React state.

Implements the state machine from design doc §6 exactly: `IDLE → CANDIDATE` on a
confidence-gated gesture, `CANDIDATE → FIRING` after `holdFrames` (6) consecutive identical
frames (dispatching the command on that transition), `FIRING → COOLDOWN` on the next tick,
`COOLDOWN → IDLE` once `cooldownMs` (600) has elapsed **and** the gesture has returned to
`'None'`. Any confidence or gesture-identity break during `CANDIDATE` resets straight to
`IDLE`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/client/gesture/stateMachine.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { reduceGestureState, INITIAL_STATE, MachineConfig } from "./stateMachine";

const config: MachineConfig = { confidenceThreshold: 0.7, holdFrames: 6, cooldownMs: 600 };
const frame = (category: string, score: number, t: number) => ({ category, score, timestampMs: t });

test("IDLE ignores low-confidence gestures", () => {
  const { state, command } = reduceGestureState(INITIAL_STATE, frame("Open_Palm", 0.5, 0), config);
  assert.equal(state.phase, "IDLE");
  assert.equal(command, null);
});

test("IDLE moves to CANDIDATE on a confident recognized gesture", () => {
  const { state } = reduceGestureState(INITIAL_STATE, frame("Open_Palm", 0.9, 0), config);
  assert.equal(state.phase, "CANDIDATE");
  assert.equal(state.candidateGesture, "Open_Palm");
  assert.equal(state.candidateFrames, 1);
});

test("CANDIDATE fires after holdFrames consecutive matching frames", () => {
  let state = INITIAL_STATE;
  let command = null;
  for (let i = 0; i < 6; i++) {
    ({ state, command } = reduceGestureState(state, frame("Open_Palm", 0.9, i * 33), config));
  }
  assert.equal(state.phase, "FIRING");
  assert.equal(command, "EXPAND");
});

test("CANDIDATE resets to IDLE if the gesture changes before firing", () => {
  let state = reduceGestureState(INITIAL_STATE, frame("Open_Palm", 0.9, 0), config).state;
  state = reduceGestureState(state, frame("Closed_Fist", 0.9, 33), config).state;
  assert.equal(state.phase, "IDLE");
});

test("CANDIDATE resets to IDLE if confidence drops below threshold", () => {
  let state = reduceGestureState(INITIAL_STATE, frame("Open_Palm", 0.9, 0), config).state;
  state = reduceGestureState(state, frame("Open_Palm", 0.4, 33), config).state;
  assert.equal(state.phase, "IDLE");
});

test("FIRING moves to COOLDOWN on the next tick with no command", () => {
  let state = INITIAL_STATE;
  for (let i = 0; i < 6; i++) {
    state = reduceGestureState(state, frame("Pointing_Up", 0.9, i * 33), config).state;
  }
  const { state: afterFiring, command } = reduceGestureState(state, frame("Pointing_Up", 0.9, 198), config);
  assert.equal(afterFiring.phase, "COOLDOWN");
  assert.equal(command, null);
});

test("COOLDOWN blocks re-firing until cooldownMs elapses AND gesture returns to None", () => {
  let state = INITIAL_STATE;
  for (let i = 0; i < 6; i++) {
    state = reduceGestureState(state, frame("Closed_Fist", 0.9, i * 33), config).state;
  }
  state = reduceGestureState(state, frame("Closed_Fist", 0.9, 198), config).state; // -> COOLDOWN, t=198
  // Still holding the gesture, well past cooldownMs: should NOT return to IDLE yet.
  state = reduceGestureState(state, frame("Closed_Fist", 0.9, 900), config).state;
  assert.equal(state.phase, "COOLDOWN");
  // Gesture drops to None after cooldownMs has elapsed: now it returns to IDLE.
  state = reduceGestureState(state, frame("None", 0, 900), config).state;
  assert.equal(state.phase, "IDLE");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node --test src/client/gesture/stateMachine.test.ts
```

Expected: FAIL — `Cannot find module './stateMachine'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/client/gesture/stateMachine.ts
export type Command = "SELECT" | "EXPAND" | "RESET";
export type MachinePhase = "IDLE" | "CANDIDATE" | "FIRING" | "COOLDOWN";

export interface GestureFrame {
  category: string;
  score: number;
  timestampMs: number;
}

export interface MachineState {
  phase: MachinePhase;
  candidateGesture: string | null;
  candidateFrames: number;
  cooldownStartedAt: number | null;
}

export interface MachineConfig {
  confidenceThreshold: number;
  holdFrames: number;
  cooldownMs: number;
}

export const COMMAND_MAP: Record<string, Command> = {
  Pointing_Up: "SELECT",
  Open_Palm: "EXPAND",
  Closed_Fist: "RESET",
};

export const INITIAL_STATE: MachineState = {
  phase: "IDLE",
  candidateGesture: null,
  candidateFrames: 0,
  cooldownStartedAt: null,
};

export interface ReduceResult {
  state: MachineState;
  command: Command | null;
}

function recognize(frame: GestureFrame, config: MachineConfig): string {
  if (frame.score < config.confidenceThreshold) return "None";
  return COMMAND_MAP[frame.category] ? frame.category : "None";
}

export function reduceGestureState(
  state: MachineState,
  frame: GestureFrame,
  config: MachineConfig
): ReduceResult {
  const recognized = recognize(frame, config);

  switch (state.phase) {
    case "IDLE": {
      if (recognized === "None") return { state, command: null };
      return {
        state: { phase: "CANDIDATE", candidateGesture: recognized, candidateFrames: 1, cooldownStartedAt: null },
        command: null,
      };
    }

    case "CANDIDATE": {
      if (recognized !== state.candidateGesture) {
        return { state: INITIAL_STATE, command: null };
      }
      const candidateFrames = state.candidateFrames + 1;
      if (candidateFrames >= config.holdFrames) {
        return {
          state: { phase: "FIRING", candidateGesture: recognized, candidateFrames, cooldownStartedAt: null },
          command: COMMAND_MAP[recognized],
        };
      }
      return { state: { ...state, candidateFrames }, command: null };
    }

    case "FIRING": {
      return {
        state: { phase: "COOLDOWN", candidateGesture: null, candidateFrames: 0, cooldownStartedAt: frame.timestampMs },
        command: null,
      };
    }

    case "COOLDOWN": {
      const elapsed = state.cooldownStartedAt === null ? 0 : frame.timestampMs - state.cooldownStartedAt;
      if (elapsed >= config.cooldownMs && recognized === "None") {
        return { state: INITIAL_STATE, command: null };
      }
      return { state, command: null };
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node --test src/client/gesture/stateMachine.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/client/gesture/stateMachine.ts src/client/gesture/stateMachine.test.ts
git commit -m "Add pure gesture debounce state machine with unit tests"
```

---

### Task 10: Gesture hooks (`useGestureStateMachine`, `useGestureRecognizer`)

**Files:**
- Create: `src/client/gesture/useGestureStateMachine.ts`
- Create: `src/client/gesture/useGestureRecognizer.ts`
- Modify: `package.json` (add `@mediapipe/tasks-vision` dependency)

**Interfaces:**
- Consumes: `reduceGestureState`, `INITIAL_STATE`, `MachineState`, `MachineConfig`, `Command`,
  `GestureFrame` from Task 9's `./stateMachine`.
- Produces: `useGestureStateMachine(config: MachineConfig): { state: MachineState; dispatchFrame: (frame: GestureFrame) => Command | null }`
  and `useGestureRecognizer(videoRef: React.RefObject<HTMLVideoElement>, onFrame: (frame: RecognizedFrame) => void, active: boolean): { ready: boolean; error: string | null }`
  where `RecognizedFrame { category: string; score: number; timestampMs: number; landmarks: { x: number; y: number; z: number }[] | null }`.
  Task 11's `CameraPreview` renders `ready`/`error`; Task 15's `app.tsx` wires
  `useGestureRecognizer`'s `onFrame` into `dispatchFrame` and dispatches the returned
  `Command` to selection/expand/reset logic.

These are React hooks wrapping browser-only APIs (`getUserMedia`, MediaPipe WASM, RAF loop) —
no unit test here; correctness is verified visually in Task 16 (console logging gesture
categories/scores, confirming CDN assets load).

- [ ] **Step 1: Add the dependency**

```bash
npm install @mediapipe/tasks-vision@0.10.14
```

Note the exact installed version — the CDN WASM base URL in Step 3 must be pinned to the
**same** version string, since the JS API and the WASM binary must match. If `npm install`
resolves a different version than 0.10.14, use that resolved version in both places.

- [ ] **Step 2: Write the state machine hook**

```typescript
// src/client/gesture/useGestureStateMachine.ts
import { useCallback, useRef, useState } from "react";
import {
  reduceGestureState,
  INITIAL_STATE,
  MachineState,
  MachineConfig,
  Command,
  GestureFrame,
} from "./stateMachine";

export function useGestureStateMachine(config: MachineConfig) {
  const [state, setState] = useState<MachineState>(INITIAL_STATE);
  const stateRef = useRef<MachineState>(INITIAL_STATE);

  const dispatchFrame = useCallback(
    (frame: GestureFrame): Command | null => {
      const result = reduceGestureState(stateRef.current, frame, config);
      stateRef.current = result.state;
      setState(result.state);
      return result.command;
    },
    [config]
  );

  return { state, dispatchFrame };
}
```

- [ ] **Step 3: Write the MediaPipe recognizer hook**

```typescript
// src/client/gesture/useGestureRecognizer.ts
import { useEffect, useRef, useState } from "react";
import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";

// Must match the installed @mediapipe/tasks-vision version exactly (package.json) —
// the WASM binary and the JS API are versioned together.
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task";

export interface RecognizedFrame {
  category: string;
  score: number;
  timestampMs: number;
  landmarks: { x: number; y: number; z: number }[] | null;
}

export function useGestureRecognizer(
  videoRef: React.RefObject<HTMLVideoElement>,
  onFrame: (frame: RecognizedFrame) => void,
  active: boolean
) {
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numHands: 1,
        });
        if (!cancelled) {
          recognizerRef.current = recognizer;
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
      recognizerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!ready || !active) return;
    let rafId: number;
    const loop = () => {
      const video = videoRef.current;
      const recognizer = recognizerRef.current;
      if (video && recognizer && video.readyState >= 2) {
        const timestampMs = performance.now();
        const result = recognizer.recognizeForVideo(video, timestampMs);
        const top = result.gestures[0]?.[0];
        onFrame({
          category: top?.categoryName || "None",
          score: top?.score || 0,
          timestampMs,
          landmarks: result.landmarks[0] || null,
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [ready, active, videoRef, onFrame]);

  return { ready, error };
}
```

- [ ] **Step 4: Build to validate types compile**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/client/gesture/useGestureStateMachine.ts src/client/gesture/useGestureRecognizer.ts
git commit -m "Add gesture state machine and MediaPipe recognizer hooks"
```

---

### Task 11: `CameraPreview` and `ArmingIndicator` components

**Files:**
- Create: `src/client/components/CameraPreview.tsx`
- Create: `src/client/components/ArmingIndicator.tsx`
- Create: `src/client/components/CameraPreview.css`
- Create: `src/client/components/ArmingIndicator.css`

**Interfaces:**
- Produces: `CameraPreview({ videoRef: React.RefObject<HTMLVideoElement>; landmarks: { x: number; y: number; z: number }[] | null; onStarted: () => void })`
  and `ArmingIndicator({ phase: MachinePhase; progress: number; gestureLabel: string | null })`
  (using `MachinePhase` from Task 9). Task 15's `app.tsx` renders both, passing the `videoRef`
  it creates and the live `landmarks`/`phase` from the gesture hooks.

`CameraPreview` requests `getUserMedia` only on an explicit button click (never on mount) per
design doc §9 NFR, mirrors the video feed, and draws the current hand landmarks on an overlay
canvas so the operator can see what the model sees — this stays visible at all times per
design doc §11, since hiding it makes a bad gesture read look like the app is broken.

- [ ] **Step 1: Write `CameraPreview`**

```tsx
// src/client/components/CameraPreview.tsx
import React, { useEffect, useRef, useState } from "react";
import "./CameraPreview.css";

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: { x: number; y: number; z: number }[] | null;
  onStarted: () => void;
}

export default function CameraPreview({ videoRef, landmarks, onStarted }: CameraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStarted(true);
      onStarted();
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;
    ctx.fillStyle = "#00D4FF";
    landmarks.forEach((point) => {
      const x = (1 - point.x) * canvas.width;
      const y = point.y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [landmarks, videoRef]);

  return (
    <div className="camera-preview">
      {!started && (
        <button className="camera-preview__start" onClick={startCamera}>
          Enable Camera
        </button>
      )}
      {error && <div className="camera-preview__error">{error}</div>}
      <video ref={videoRef} className="camera-preview__video" muted playsInline />
      <canvas ref={canvasRef} className="camera-preview__overlay" />
    </div>
  );
}
```

- [ ] **Step 2: Write `CameraPreview.css`**

```css
/* src/client/components/CameraPreview.css */
.camera-preview {
  position: relative;
  width: 240px;
  height: 180px;
  border-radius: var(--now-border-radius-md);
  overflow: hidden;
  background: var(--now-color-background-secondary);
}

.camera-preview__video,
.camera-preview__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: scaleX(-1);
}

.camera-preview__start {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: var(--now-spacing-sm) var(--now-spacing-md);
  border-radius: var(--now-border-radius-sm);
  border: none;
  background: var(--now-color-interactive-primary);
  color: var(--now-color-text-inverse);
  cursor: pointer;
}

.camera-preview__error {
  position: absolute;
  z-index: 2;
  bottom: 4px;
  left: 4px;
  right: 4px;
  color: var(--now-color-text-negative);
  font-size: 11px;
}
```

- [ ] **Step 3: Write `ArmingIndicator`**

```tsx
// src/client/components/ArmingIndicator.tsx
import React from "react";
import "./ArmingIndicator.css";
import { MachinePhase } from "../gesture/stateMachine";

interface ArmingIndicatorProps {
  phase: MachinePhase;
  progress: number;
  gestureLabel: string | null;
}

const COMMAND_LABELS: Record<string, string> = {
  Pointing_Up: "SELECT",
  Open_Palm: "EXPAND",
  Closed_Fist: "RESET",
};

export default function ArmingIndicator({ phase, progress, gestureLabel }: ArmingIndicatorProps) {
  if (phase === "IDLE" || phase === "COOLDOWN") return null;

  const label = gestureLabel ? COMMAND_LABELS[gestureLabel] || gestureLabel : "";
  const circumference = 2 * Math.PI * 18;
  const offset = circumference * (1 - (phase === "FIRING" ? 1 : progress));

  return (
    <div className="arming-indicator">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="18" className="arming-indicator__track" />
        <circle
          cx="24"
          cy="24"
          r="18"
          className={
            phase === "FIRING" ? "arming-indicator__ring arming-indicator__ring--fired" : "arming-indicator__ring"
          }
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="arming-indicator__label">{phase === "FIRING" ? `${label} fired` : `arming: ${label}`}</span>
    </div>
  );
}
```

- [ ] **Step 4: Write `ArmingIndicator.css`**

```css
/* src/client/components/ArmingIndicator.css */
.arming-indicator {
  display: flex;
  align-items: center;
  gap: var(--now-spacing-sm);
  color: var(--now-color-text-primary);
}

.arming-indicator__track {
  fill: none;
  stroke: var(--now-color-border-primary);
  stroke-width: 4;
}

.arming-indicator__ring {
  fill: none;
  stroke: #00d4ff;
  stroke-width: 4;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 33ms linear;
}

.arming-indicator__ring--fired {
  stroke: #4a5568;
}

.arming-indicator__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

- [ ] **Step 5: Build to validate**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/client/components/CameraPreview.tsx src/client/components/CameraPreview.css src/client/components/ArmingIndicator.tsx src/client/components/ArmingIndicator.css
git commit -m "Add CameraPreview and ArmingIndicator components"
```

---

### Task 12: Scene helpers (`layout.ts`, `nodes.ts`)

**Files:**
- Create: `src/client/scene/layout.ts`
- Create: `src/client/scene/nodes.ts`
- Modify: `package.json` (add `three` and `d3-force-3d` dependencies)

**Interfaces:**
- Produces: `LayoutNode { id: string; x: number; y: number; z: number }`,
  `LayoutEdge { source: string; target: string }`,
  `computeLayout(nodeIds: string[], edges: LayoutEdge[], ticks?: number): Map<string, LayoutNode>`;
  `Health = 'critical' | 'warning' | 'healthy'`, `GraphNode { id: string; health: Health; incidentCount: number }`,
  `GraphEdgeInput { source: string; target: string }`, `healthColor(health: Health): number`,
  `nodeRadius(incidentCount: number): number`, `createNodeMesh(count: number): THREE.InstancedMesh`.
  Task 13's `buildGraphObjects.ts` and `GraphScene.ts` consume all of these to turn a graph
  response into instanced meshes.

`computeLayout` runs the `d3-force-3d` simulation synchronously for `ticks` iterations (300 by
default, per design doc §7 "300 warmup ticks then freeze") and returns final positions —
no ongoing simulation loop, matching the MVP's static-layout requirement (no orbit/physics at
runtime).

- [ ] **Step 1: Add the dependencies**

```bash
npm install three d3-force-3d
npm install --save-dev @types/three
```

- [ ] **Step 2: Write `layout.ts`**

```typescript
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
```

- [ ] **Step 3: Write `nodes.ts`**

```typescript
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
  const material = new THREE.MeshStandardMaterial({ vertexColors: true });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  return mesh;
}
```

- [ ] **Step 4: Build to validate**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/client/scene/layout.ts src/client/scene/nodes.ts
git commit -m "Add force-layout and instanced-node scene helpers"
```

---

### Task 13: `GraphScene.ts` — Three.js render loop + raycast selection

**Files:**
- Create: `src/client/scene/buildGraphObjects.ts`
- Create: `src/client/scene/GraphScene.ts`

**Interfaces:**
- Consumes: `computeLayout`, `LayoutNode` (Task 12 `./layout`); `createNodeMesh`, `healthColor`,
  `nodeRadius`, `GraphNode`, `GraphEdgeInput`, `SELECTED_COLOR` (Task 12 `./nodes`).
- Produces: `buildGraphObjects(nodes: GraphNode[], edges: GraphEdgeInput[], positions: Map<string, LayoutNode>): { mesh: THREE.InstancedMesh; edgeLines: THREE.LineSegments; nodeOrder: string[] }`
  and class `GraphScene` with `constructor(container: HTMLElement)`,
  `setGraph(nodes: GraphNode[], edges: GraphEdgeInput[]): void`,
  `setSelected(nodeId: string | null): void`,
  `raycastFromNdc(ndcX: number, ndcY: number): string | null`, `dispose(): void`.
  Task 15's `app.tsx` instantiates one `GraphScene` on mount, calls `setGraph` whenever
  `useGraphData` (Task 14) returns new data, and calls `raycastFromNdc` on a SELECT command
  using NDC coordinates derived from the mirrored fingertip mapping in design doc §9.4.

Split into two files because `GraphScene` alone (lifecycle + graph-building + camera fitting)
would exceed the ~100-line file guideline — `buildGraphObjects` isolates the pure
mesh/line-assembly step so `GraphScene` only owns lifecycle, camera, and selection.

- [ ] **Step 1: Write `buildGraphObjects.ts`**

```typescript
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
    new THREE.LineBasicMaterial({ color: 0x4a5568, transparent: true, opacity: 0.25 })
  );

  return { mesh, edgeLines, nodeOrder };
}
```

- [ ] **Step 2: Write `GraphScene.ts`**

```typescript
// src/client/scene/GraphScene.ts
import * as THREE from "three";
import { computeLayout, LayoutNode } from "./layout";
import { buildGraphObjects } from "./buildGraphObjects";
import { GraphNode, GraphEdgeInput, SELECTED_COLOR } from "./nodes";

export class GraphScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private mesh: THREE.InstancedMesh | null = null;
  private edgeLines: THREE.LineSegments | null = null;
  private selectionRing: THREE.Mesh;
  private nodeOrder: string[] = [];
  private positions = new Map<string, LayoutNode>();
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 50, 50);
    this.scene.add(dirLight);

    this.selectionRing = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.1, 8, 24),
      new THREE.MeshBasicMaterial({ color: SELECTED_COLOR })
    );
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    window.addEventListener("resize", this.handleResize);
    this.renderLoop();
  }

  private handleResize = () => {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  };

  private renderLoop = () => {
    this.selectionRing.lookAt(this.camera.position);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.renderLoop);
  };

  setGraph(nodes: GraphNode[], edges: GraphEdgeInput[]) {
    if (this.mesh) this.scene.remove(this.mesh);
    if (this.edgeLines) this.scene.remove(this.edgeLines);

    this.positions = computeLayout(nodes.map((n) => n.id), edges, 300);
    const objects = buildGraphObjects(nodes, edges, this.positions);
    this.mesh = objects.mesh;
    this.edgeLines = objects.edgeLines;
    this.nodeOrder = objects.nodeOrder;
    this.scene.add(this.mesh);
    this.scene.add(this.edgeLines);

    this.fitCameraToNodes();
  }

  private fitCameraToNodes() {
    const points = [...this.positions.values()];
    if (points.length === 0) return;
    const box = new THREE.Box3();
    points.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z)));
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const distance = sphere.radius / Math.sin((this.camera.fov * Math.PI) / 360) + sphere.radius;
    this.camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + distance);
    this.camera.lookAt(sphere.center);
  }

  setSelected(nodeId: string | null) {
    if (!nodeId) {
      this.selectionRing.visible = false;
      return;
    }
    const pos = this.positions.get(nodeId);
    if (!pos) return;
    this.selectionRing.position.set(pos.x, pos.y, pos.z);
    this.selectionRing.visible = true;
  }

  raycastFromNdc(ndcX: number, ndcY: number): string | null {
    if (!this.mesh) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = raycaster.intersectObject(this.mesh);
    if (hits.length === 0 || hits[0].instanceId === undefined) return null;
    return this.nodeOrder[hits[0].instanceId];
  }

  dispose() {
    window.removeEventListener("resize", this.handleResize);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
```

- [ ] **Step 3: Build to validate**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/client/scene/buildGraphObjects.ts src/client/scene/GraphScene.ts
git commit -m "Add Three.js scene lifecycle with raycast selection"
```

---

### Task 14: `useGraphData` hook + `DetailCard` component

**Files:**
- Create: `src/client/data/useGraphData.ts`
- Create: `src/client/components/DetailCard.tsx`
- Create: `src/client/components/DetailCard.css`

**Interfaces:**
- Produces: `GraphNodeData { id, name, class, operational_status, health, incident_count, top_incident, depth }`,
  `GraphEdgeData { source, target, type }`, `GraphResponse { root, nodes, edges, truncated }`,
  `CIDetail { id, name, class, operational_status, install_status, health, incident_count, open_incidents }`,
  and `useGraphData(): { graph: GraphResponse | null; selectedCI: CIDetail | null; loadGraph: (root?: string, depth?: number) => Promise<GraphResponse>; selectCI: (sysId: string) => Promise<void>; clearSelection: () => void; reset: () => void }`.
  Task 15's `app.tsx` calls `loadGraph()` once on mount (no `root` arg — server falls back to
  the config default per Task 7), feeds `graph.nodes`/`graph.edges` into `GraphScene.setGraph`,
  calls `selectCI` on a SELECT command, and calls `reset` on a RESET command. `DetailCard`
  gets an `onExpand` callback so Task 15 can wire the mouse-fallback Expand button to the same
  `loadGraph(selectedCI.id, 2)` call the gesture EXPAND command uses — design doc §9 NFR
  requires full mouse control when the camera is denied/unavailable, and this plan satisfies
  it with click-to-select on the canvas (Task 15) plus Reset/Expand buttons, rather than a
  parallel mouse-driven UI.

- [ ] **Step 1: Write `useGraphData.ts`**

```typescript
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
    if (rootId) loadGraph(rootId);
  }, [rootId, loadGraph, clearSelection]);

  return { graph, selectedCI, loadGraph, selectCI, clearSelection, reset };
}
```

- [ ] **Step 2: Write `DetailCard.tsx`**

```tsx
// src/client/components/DetailCard.tsx
import React from "react";
import "./DetailCard.css";
import { CIDetail } from "../data/useGraphData";

interface DetailCardProps {
  ci: CIDetail | null;
  onExpand: () => void;
}

export default function DetailCard({ ci, onExpand }: DetailCardProps) {
  if (!ci) return null;
  return (
    <div className="detail-card">
      <div className="detail-card__name">{ci.name}</div>
      <div className="detail-card__row">
        <span className="detail-card__label">Class</span>
        <span>{ci.class}</span>
      </div>
      <div className="detail-card__row">
        <span className="detail-card__label">Operational status</span>
        <span>{ci.operational_status}</span>
      </div>
      <div className="detail-card__row">
        <span className="detail-card__label">Open incidents</span>
        <span>{ci.incident_count}</span>
      </div>
      {ci.open_incidents.slice(0, 3).map((inc) => (
        <div key={inc.number} className="detail-card__incident">
          {inc.number} · P{inc.priority}
        </div>
      ))}
      <button className="detail-card__expand" onClick={onExpand}>
        Expand (mouse fallback for Open_Palm)
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write `DetailCard.css`**

```css
/* src/client/components/DetailCard.css */
.detail-card {
  width: 220px;
  padding: var(--now-spacing-md);
  border-radius: var(--now-border-radius-md);
  background: var(--now-color-background-primary);
  border: 1px solid var(--now-color-border-primary);
  color: var(--now-color-text-primary);
}

.detail-card__name {
  font-weight: 600;
  margin-bottom: var(--now-spacing-sm);
}

.detail-card__row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--now-color-text-secondary);
  margin-bottom: 4px;
}

.detail-card__incident {
  font-size: 12px;
  color: #e5484d;
  margin-top: 4px;
}

.detail-card__expand {
  margin-top: var(--now-spacing-sm);
  width: 100%;
  padding: var(--now-spacing-xs) var(--now-spacing-sm);
  border-radius: var(--now-border-radius-sm);
  border: 1px solid var(--now-color-border-primary);
  background: transparent;
  color: var(--now-color-text-primary);
  cursor: pointer;
  font-size: 11px;
}
```

- [ ] **Step 4: Build to validate**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/client/data/useGraphData.ts src/client/components/DetailCard.tsx src/client/components/DetailCard.css
git commit -m "Add graph data hook and CI detail card"
```

---

### Task 15: App shell (`app.tsx`, `index.html`, `main.tsx`, `fields.ts`) + UiPage + App Menu

**Files:**
- Create: `src/client/utils/fields.ts`
- Create: `src/client/index.html`
- Create: `src/client/main.tsx`
- Create: `src/client/app.tsx`
- Create: `src/client/app.css`
- Create: `src/client/tsconfig.json`
- Create: `src/fluent/ui-pages/gesture-cmdb-page.now.ts`
- Create: `src/fluent/menu/app-menu.now.ts`

**Interfaces:**
- Consumes: `useGraphData` (Task 14), `useGestureStateMachine` (Task 10), `useGestureRecognizer`
  + `RecognizedFrame` (Task 10), `GraphScene` (Task 13), `CameraPreview`, `ArmingIndicator`
  (Task 11), `DetailCard` (Task 14).
- Produces: the mounted app at `x_tusm_gcmdb_page.do`, plus a navigator entry. This is the
  final composition task — nothing downstream depends on it.

EXPAND is implemented as "re-root the graph at the currently selected CI at depth 2" rather
than incrementally merging one hop into the existing rendered graph — the simplest reading of
design doc §9.2 ("fetch one additional hop from the selected node") that reuses `loadGraph`
as-is instead of adding graph-merging logic.

- [ ] **Step 1: Write `fields.ts`**

```typescript
// src/client/utils/fields.ts
export const display = (field: any): string => {
  if (typeof field === "string") return field;
  return field?.display_value || "";
};

export const value = (field: any): string => {
  if (typeof field === "string") return field;
  return field?.value || "";
};
```

Required by SDK convention even though this app's REST API returns plain JSON rather than
Table-API dot-walked fields — kept for consistency with the standard UiPage file layout.

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "es2022",
    "target": "es2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "preserve"
  }
}
```

- [ ] **Step 3: Write `index.html`**

```html
<html class="-polaris">
  <head>
    <title>Touchless War Room</title>
    <sdk:now-ux-globals></sdk:now-ux-globals>
    <script type="text/javascript">
      //<![CDATA[
      (function () {
        var testWorks = (function () {
          try {
            var result = Array.from(new Set([1, 2]));
            return Array.isArray(result) && result.length === 2 && result[0] === 1;
          } catch (e) {
            return false;
          }
        })();
        if (testWorks) return;
        var originalArrayFrom = Array.from;
        function specArrayFrom(arrayLike, mapFn, thisArg) {
          if (arrayLike == null) throw new TypeError("Array.from requires an array-like or iterable object");
          var C = this;
          if (typeof C !== "function" || C === Window || C === Object) C = Array;
          var mapping = typeof mapFn === "function";
          var iterFn = arrayLike[Symbol.iterator];
          if (typeof iterFn === "function") {
            var result = [];
            var i = 0;
            var iterator = iterFn.call(arrayLike);
            var step;
            while (!(step = iterator.next()).done) {
              result[i] = mapping ? mapFn.call(thisArg, step.value, i) : step.value;
              i++;
            }
            result.length = i;
            return result;
          }
          var items = Object(arrayLike);
          var len = Math.min(Math.max(Number(items.length) || 0, 0), Number.MAX_SAFE_INTEGER);
          var result = new C(len);
          for (var k = 0; k < len; k++) result[k] = mapping ? mapFn.call(thisArg, items[k], k) : items[k];
          result.length = len;
          return result;
        }
        Array.from = function (arrayLike, mapFn, thisArg) {
          if (arrayLike != null && typeof arrayLike[Symbol.iterator] === "function") {
            try {
              return specArrayFrom.call(this, arrayLike, mapFn, thisArg);
            } catch (e) {
              console.error("Array.from failed with error:", e);
              return originalArrayFrom.call(this, arrayLike, mapFn, thisArg);
            }
          }
          return originalArrayFrom.call(this, arrayLike, mapFn, thisArg);
        };
      })();
      //]]>
    </script>
    <script src="main.tsx?uxpcb=$[UxFrameworkScriptables.getFlushTimestamp()]" type="module"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

- [ ] **Step 4: Write `main.tsx`**

```tsx
// src/client/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 5: Write `app.tsx`**

```tsx
// src/client/app.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGraphData } from "./data/useGraphData";
import { useGestureStateMachine } from "./gesture/useGestureStateMachine";
import { useGestureRecognizer, RecognizedFrame } from "./gesture/useGestureRecognizer";
import { GraphScene } from "./scene/GraphScene";
import { Command } from "./gesture/stateMachine";
import CameraPreview from "./components/CameraPreview";
import ArmingIndicator from "./components/ArmingIndicator";
import DetailCard from "./components/DetailCard";
import "./app.css";

const GESTURE_CONFIG = { confidenceThreshold: 0.7, holdFrames: 6, cooldownMs: 600 };

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<GraphScene | null>(null);
  const [landmarks, setLandmarks] = useState<RecognizedFrame["landmarks"]>(null);
  const { graph, selectedCI, loadGraph, selectCI, reset } = useGraphData();
  const { state, dispatchFrame } = useGestureStateMachine(GESTURE_CONFIG);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    sceneRef.current = new GraphScene(canvasContainerRef.current);
    loadGraph();
    return () => sceneRef.current?.dispose();
  }, [loadGraph]);

  useEffect(() => {
    if (!graph) return;
    // GraphScene's GraphNode uses camelCase incidentCount; the API returns snake_case.
    const sceneNodes = graph.nodes.map((n) => ({ id: n.id, health: n.health, incidentCount: n.incident_count }));
    sceneRef.current?.setGraph(sceneNodes, graph.edges);
  }, [graph]);

  useEffect(() => {
    sceneRef.current?.setSelected(selectedCI?.id || null);
  }, [selectedCI]);

  const handleCommand = useCallback(
    (command: Command, frameLandmarks: RecognizedFrame["landmarks"]) => {
      if (command === "SELECT" && frameLandmarks && sceneRef.current) {
        const tip = frameLandmarks[8];
        const ndcX = (1 - tip.x) * 2 - 1;
        const ndcY = -(tip.y * 2 - 1);
        const nodeId = sceneRef.current.raycastFromNdc(ndcX, ndcY);
        if (nodeId) selectCI(nodeId);
      } else if (command === "EXPAND" && selectedCI) {
        loadGraph(selectedCI.id, 2);
      } else if (command === "RESET") {
        reset();
      }
    },
    [selectCI, selectedCI, loadGraph, reset]
  );

  const handleFrame = useCallback(
    (frame: RecognizedFrame) => {
      setLandmarks(frame.landmarks);
      const command = dispatchFrame({ category: frame.category, score: frame.score, timestampMs: frame.timestampMs });
      if (command) handleCommand(command, frame.landmarks);
    },
    [dispatchFrame, handleCommand]
  );

  const { ready } = useGestureRecognizer(videoRef, handleFrame, true);
  const rootNode = graph?.nodes.find((n) => n.id === graph.root);

  // Mouse fallback (design doc §9 NFR: full mouse control if camera is denied/unavailable).
  // Click-to-select mirrors the SELECT gesture; Reset/Expand buttons mirror RESET/EXPAND.
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!sceneRef.current || !canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const nodeId = sceneRef.current.raycastFromNdc(ndcX, ndcY);
      if (nodeId) selectCI(nodeId);
    },
    [selectCI]
  );
  const handleExpandClick = useCallback(() => {
    if (selectedCI) loadGraph(selectedCI.id, 2);
  }, [selectedCI, loadGraph]);

  return (
    <div className="app">
      <div className="app__header">
        <span>{rootNode ? rootNode.name : "Loading..."}</span>
        <span>depth: 2</span>
        <span>{ready ? "● recognizer ready" : "○ loading recognizer"}</span>
        <button className="app__reset" onClick={reset}>
          Reset (mouse fallback for Closed_Fist)
        </button>
      </div>
      <div ref={canvasContainerRef} className="app__canvas" onClick={handleCanvasClick} />
      <div className="app__detail">
        <DetailCard ci={selectedCI} onExpand={handleExpandClick} />
      </div>
      <div className="app__webcam">
        <CameraPreview videoRef={videoRef} landmarks={landmarks} onStarted={() => {}} />
        <ArmingIndicator
          phase={state.phase}
          progress={state.candidateFrames / GESTURE_CONFIG.holdFrames}
          gestureLabel={state.candidateGesture}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `app.css`**

```css
/* src/client/app.css */
.app {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: var(--now-color-background-secondary);
  color: var(--now-color-text-primary);
  overflow: hidden;
}

.app__header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--now-spacing-sm) var(--now-spacing-md);
  font-size: 13px;
  z-index: 2;
}

.app__reset {
  padding: var(--now-spacing-xs) var(--now-spacing-sm);
  border-radius: var(--now-border-radius-sm);
  border: 1px solid var(--now-color-border-primary);
  background: transparent;
  color: var(--now-color-text-primary);
  cursor: pointer;
  font-size: 11px;
}

.app__canvas {
  position: absolute;
  inset: 0;
}

.app__detail {
  position: absolute;
  bottom: var(--now-spacing-lg);
  left: var(--now-spacing-lg);
  z-index: 2;
}

.app__webcam {
  position: absolute;
  bottom: var(--now-spacing-lg);
  right: var(--now-spacing-lg);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--now-spacing-sm);
  z-index: 2;
}
```

- [ ] **Step 7: Write the UiPage definition**

```typescript
// src/fluent/ui-pages/gesture-cmdb-page.now.ts
import "@servicenow/sdk/global";
import { UiPage } from "@servicenow/sdk/core";
import page from "../../client/index.html";

export const gestureCmdbPage = UiPage({
  $id: Now.ID["gesture-cmdb-page"],
  endpoint: "x_tusm_gcmdb_page.do",
  html: page,
  direct: true,
});
```

- [ ] **Step 8: Write the Application Menu + Module**

```typescript
// src/fluent/menu/app-menu.now.ts
import "@servicenow/sdk/global";
import { ApplicationMenu, Record } from "@servicenow/sdk/core";

export const gcmdbMenu = ApplicationMenu({
  $id: Now.ID["gcmdb-app-menu"],
  title: "Touchless War Room",
  hint: "Gesture-controlled CMDB impact map",
  description: "Gesture-controlled CMDB impact map",
  roles: ["itil"],
  active: true,
});

export const gcmdbPageModule = Record({
  $id: Now.ID["gcmdb-page-module"],
  table: "sys_app_module",
  data: {
    title: "Gesture CMDB Map",
    application: gcmdbMenu.$id,
    link_type: "DIRECT",
    query: "x_tusm_gcmdb_page.do",
    hint: "Camera features require opening this in its own browser tab, not this nav panel",
    roles: "itil",
    active: true,
    order: 100,
  },
});
```

- [ ] **Step 9: Build to validate the full app**

```bash
npx @servicenow/sdk build
```

Expected: build succeeds with no errors across all fluent and client files.

- [ ] **Step 10: Commit**

```bash
git add src/client src/fluent/ui-pages src/fluent/menu
git commit -m "Wire up app shell, UiPage endpoint, and navigator entry"
```

---

### Task 16: Install to PDI and end-to-end verification

**Files:** none — this task runs commands and performs manual verification, no new source files.

**Interfaces:** none — terminal task.

**STOP before Step 1:** every prior task in this plan works entirely offline against the local
build. This is the one task that touches the live PDI (`dev422303.service-now.com`). Do not run
any step in this task without the user explicitly confirming they want the install to proceed
right now — this was an explicit standing decision made during design (design doc §11).

- [ ] **Step 1: Authenticate against the PDI**

```bash
npx @servicenow/sdk auth --add https://dev422303.service-now.com --type basic
```

This prompts interactively for alias/username/password — enter them at the prompt, don't pass
the password as a command-line argument or write it into any file (credentials are stored by
the SDK under `.now-sdk/`, which is gitignored by the scaffold from Task 1).

- [ ] **Step 2: Install to the instance**

```bash
npx @servicenow/sdk install
```

Expected: install completes, reporting the table, ACL, REST API, UiPage, and menu records
created in scope `x_tusm_gcmdb`.

- [ ] **Step 3: Verify the config seed and root CI resolve correctly**

In the instance, open **System Web Services > REST API Explorer**, find "Gesture CMDB API",
and call `GET /graph` with no query params.

Expected: `200 OK`, `result.root` is CAROL3-GATEWAY's sys_id, `result.nodes` includes an entry
named `CAROL3-GATEWAY` at `depth: 0`, `result.truncated` is `false` (unless CAROL3-GATEWAY
genuinely has 250+ relationships within 2 hops on this PDI).

If `root` comes back null/404: check that a CI literally named `CAROL3-GATEWAY` exists on this
PDI (`System > CI > cmdb_ci` list, filter `name=CAROL3-GATEWAY`) — the demo data name may
differ slightly from what's assumed in this plan.

- [ ] **Step 4: Verify the `/ci/{sys_id}` route**

Using the `root` sys_id from Step 3, call `GET /ci/{sys_id}` in REST API Explorer.

Expected: `200 OK`, `result.name` matches, `result.open_incidents` is an array (possibly empty).

- [ ] **Step 5: Camera permission smoke test**

Navigate directly to `https://dev422303.service-now.com/x_tusm_gcmdb_page.do` (not through the
Application Navigator — design doc §11 flags the nav iframe as a permissions-policy risk).

Expected: page loads, header shows the root CI name, 3D graph renders with colour-coded
instanced spheres. Click "Enable Camera" — the browser's native camera permission prompt
appears (not blocked/silently failing), and after granting, the mirrored video feed appears
in the preview panel.

If the permission prompt never appears: confirm you're on the direct `.do` URL, not a URL
opened from inside the platform nav (`window.top !== window.self` would indicate an iframe).

- [ ] **Step 6: Gesture recognizer load smoke test**

Open the browser console. Watch for the "○ loading recognizer" → "● recognizer ready" header
text change, and confirm no CSP violation errors for `cdn.jsdelivr.net` or
`storage.googleapis.com` appear in the console.

If CSP blocks these hosts: this is the fallback trigger noted in design doc §3 — check
**System Security > Content Security Policy** on the instance and add jsdelivr's and Google's
model storage hosts as allowed `connect-src`/`script-src` origins for the `x_tusm_gcmdb` scope
CSP rule, or revisit the sys_attachment self-hosting alternative documented in the design doc
if CSP can't be relaxed.

- [ ] **Step 7: Gesture command smoke test**

With the recognizer ready, hold up an open palm to the camera, centered in frame.

Expected: the hand skeleton overlay appears on the webcam preview; the arming indicator ring
appears and fills over roughly 200ms; after the ring completes, the graph re-roots at the
selected CI (if a node was selected first) or nothing happens (if EXPAND fired with no
selection — expected no-op per the `handleCommand` guard in Task 15).

Repeat pointing at a node (`Pointing_Up`) — the detail card should appear with that CI's name,
class, operational status, and open incident count. Repeat a closed fist (`Closed_Fist`) — the
graph should collapse back to the root and the detail card should disappear.

- [ ] **Step 8: Record the outcome**

No commit needed for this task (nothing changed in source). If any verification step failed,
open a plain-text note in `docs/superpowers/plans/` describing what broke and why, so the next
session doesn't have to rediscover it — but only if something is actually broken and unresolved
by the end of this session.

---
