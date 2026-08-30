# Touchless War Room

A gesture-controlled 3D CMDB dependency graph viewer for ServiceNow. Point at your screen to explore infrastructure dependencies during an incident war room — no keyboard, no mouse, no touching anything.

Built as a scoped app (`x_1433234_gcmdb`) with the [ServiceNow Fluent SDK](https://developer.servicenow.com/dev.do#!/reference/next-experience/sdk), React, Three.js, and MediaPipe hand-gesture recognition.

## What it does

- Renders your CMDB dependency graph as a slowly rotating 3D constellation: nodes are CIs (colored by incident health), edges are `cmdb_rel_ci` relationships.
- Tracks your hand through the webcam using MediaPipe's GestureRecognizer, entirely on-device. A glowing cursor follows your index fingertip.
- Health at a glance: **green** = healthy, **amber** = warning, **red** = critical (sized by open incident count). Selecting a CI shows its detail card with open incidents.

## Gestures

Hold a gesture steady for about half a second to trigger it (an arming ring below the webcam shows progress):

| Gesture | Command | Effect |
|---|---|---|
| ☝️ Point up | SELECT | Select the node under the blue cursor |
| ✋ Open palm | EXPAND | Re-root the graph on the selected node |
| ✊ Closed fist | RESET | Reset back to the default root view |

Full mouse fallback: click a node to select it, and use the Reset / Expand buttons.

## Architecture

```
src/
├── fluent/            ServiceNow metadata (Fluent DSL)
│   ├── tables/        x_1433234_gcmdb_config settings table
│   ├── records/       Seeded config (root CI, max depth/nodes, confidence)
│   ├── acls/          Read/write/execute ACLs
│   ├── rest/          Scripted REST API: /graph and /ci/{sys_id}
│   ├── ui-pages/      The UiPage hosting the React app
│   └── menu/          Application menu entry
├── server/            Server-side TypeScript (runs on the instance)
│   ├── graph/         BFS traversal over cmdb_rel_ci, health derivation,
│   │                  GlideRecord data access, REST route handlers
│   └── config/        Config table reader
└── client/            React app (bundled by the SDK)
    ├── gesture/       MediaPipe recognizer hook + arming state machine
    ├── scene/         Three.js scene: force layout (d3-force-3d),
    │                  instanced node mesh, raycasting, particle field
    ├── data/          REST client hook + built-in sample dataset
    └── components/    Camera preview, detail card, gesture legend, etc.
```

- **Graph API**: `GET /api/x_1433234_gcmdb/gesture_cmdb/graph?root=<name|sys_id>&depth=<n>` does a breadth-first expansion over `cmdb_rel_ci` (capped by `max_depth` / `max_nodes` config), joins open incidents against `cmdb_ci`, and returns `{root, nodes, edges, truncated}`.
- **Sample-data fallback**: if the live API is unreachable, the client automatically switches to a built-in 16-node sample topology (amber banner shows why) so the visualization and gestures remain fully demoable.
- **Privacy**: webcam video is processed on-device and never transmitted. The MediaPipe WASM runtime and gesture model are fetched from Google's CDN on first load.

## Setup

Prerequisites: Node 22+, a ServiceNow instance (PDI works) with the app scope registered.

```bash
npm install
npx now-sdk auth --add <alias>     # interactive; point it at your instance
npx now-sdk build
npx now-sdk install --auth <alias>
```

Then open the **Touchless War Room** module from the application navigator (or `/x_1433234_gcmdb_page.do`), allow camera access, and point.

Configuration lives in the `x_1433234_gcmdb_config` table: `default_root_ci`, `max_depth`, `max_nodes`, `gesture_confidence_threshold`.

## Development notes (hard-won)

- **Server-side relative imports must include the `.ts` extension** (`import ... from "./traversal.ts"`). The instance registers each file as a `sys_module` with the extension in its path and resolves imports by exact string match — extensionless imports build fine locally but throw `ModuleResolutionException` at request time.
- **Fluent files are statically analyzed, not executed.** A `forEach` emitting `Record()` calls collapses to a single record; unroll to explicit top-level calls with literal `$id`s.
- **Cross-`.now.ts` imports need the literal `.now` segment** in the specifier (`"../acls/index.now"`).
- The app needs cross-scope privileges (read `cmdb_ci`, execute `RESTAPIRequest` / `ScriptableServiceResultBuilder`) — they're tracked in `src/fluent/generated/other/sys-scope-privilege/`.
- Run unit tests with `node --test src/server/graph/*.test.ts src/client/gesture/*.test.ts` (Node's native type-stripping).
