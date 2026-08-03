# Touchless War Room — Gesture-Controlled CMDB Impact Map (MVP)

Design doc adapted from the user-provided v1.0 technical specification, scoped to MVP only
(spec §5.1) and corrected against actual ServiceNow SDK (`@servicenow/sdk`) build constraints.

Target: PDI `dev422303`, scope `x_tusm_gcmdb`. POC — simplest viable path, no self-hosting
of CV assets, no privacy hardening beyond what's already free (webcam frames never leave
the client regardless of where the WASM/model files load from).

## 1. Scope

MVP only, per the original spec's own instruction to ship this before touching v2:

- Single hand tracking
- Three gestures: `Pointing_Up` (select), `Open_Palm` (expand one hop), `Closed_Fist` (reset)
- Fixed traversal depth of 2 hops
- One seeded root CI: **CAROL3-GATEWAY** (resolved by name server-side, not baked in as a sys_id —
  see §4)
- Node colouring: red if the CI has an open P1/P2, grey otherwise
- Static force-directed layout, no orbit control
- Detail card on select: CI name, class, operational status, open incident count

Everything in spec §5.2 (v2) is explicitly out of scope for this build.

## 2. Architecture

```
Browser
├── React 18.2.0 (SDK-mandated version)
├── @servicenow/react-components  → Card/Button/Badge for chrome; NOT used for the
│                                     canvas/video surfaces, which aren't record UI
├── @mediapipe/tasks-vision       → GestureRecognizer; WASM + gesture_recognizer.task
│                                     loaded from jsdelivr CDN + Google model storage
│                                     at runtime (not bundled — see §3)
├── three                         → 3D scene on a raw <canvas>
├── d3-force-3d                   → force layout, ~300-tick warmup then freeze
└── Gesture State Machine         → IDLE → CANDIDATE → FIRING → COOLDOWN
        │ fetch + X-UserToken: window.g_ck, sysparm_display_value=all
        ▼
ServiceNow PDI, scope x_tusm_gcmdb
├── UiPage → x_tusm_gcmdb_page.do (direct: true)
├── Scripted REST API (x_tusm_gcmdb)
│   ├── GET /graph?root=<sys_id|name>&depth=<n>
│   └── GET /ci/{sys_id}
├── ACLs — read-only; itil to execute REST API; admin to write config
└── x_tusm_gcmdb_config table
```

### Why UiPage, not SPWidget

Unchanged from original spec §6.1: Service Portal widget client scripts run in an AngularJS
controller, not an ES module context. MediaPipe's `tasks-vision` and Three.js both expect
ESM/bundler support, which the UiPage React path provides via `<script type="module">`.
Trade-off accepted: the app lives at its own `.do` URL rather than as an embeddable widget.

## 3. CV asset hosting — CDN, by design decision

The UI Page build pipeline does not support bundling WASM/binary assets as client files
(confirmed against SDK docs — this ruled out the original spec's "copy node_modules wasm
into the bundle" plan). Two self-hosted alternatives (`sys_attachment` upload as a
post-install step, or base64-inlining into a `sys_ui_script` record) were considered and
rejected for this POC in favor of simplicity:

```ts
const fileset = {
  wasmLoaderPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision_wasm_internal.js",
  wasmBinaryPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision_wasm_internal.wasm",
};
const recognizer = await GestureRecognizer.createFromOptions(fileset, {
  baseOptions: {
    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task",
  },
  runningMode: "VIDEO",
  numHands: 1,
});
```

Risk: PDI CSP may block `connect-src`/`script-src` to these hosts. If so during Milestone 4,
fall back to the `sys_attachment` approach (documented as the rejected alternative above,
not re-derived here) rather than fighting CSP policy.

The in-app privacy note is adjusted accordingly: "Webcam video is processed on-device and
never transmitted anywhere. The gesture-recognition engine and model file are fetched from
Google's CDN on first load." This is weaker than full self-hosting but accurate — no video
frame or CMDB data ever leaves the client.

## 4. Data model

No new CI tables — reads existing `cmdb_ci`, `cmdb_rel_ci`, `cmdb_rel_type`, `incident` per
original spec §7.1, unchanged.

### `x_tusm_gcmdb_config`

| Column | Type | Notes |
|---|---|---|
| `x_tusm_gcmdb_setting_name` | String(100) | Mandatory, unique |
| `x_tusm_gcmdb_setting_value` | String(255) | |
| `x_tusm_gcmdb_active` | Boolean | Default `true` |

Seed records (MVP subset — `max_nodes`/`gesture_confidence_threshold` unchanged from spec):

| Setting | Value | Purpose |
|---|---|---|
| `default_root_ci` | `CAROL3-GATEWAY` | **CI name, not sys_id** — see below |
| `max_depth` | `2` | MVP is fixed at 2 hops, not the spec's configurable 3 |
| `max_nodes` | `250` | Render budget |
| `gesture_confidence_threshold` | `0.7` | Minimum MediaPipe score to accept a gesture |

**Deviation from original spec:** the spec assumed `default_root_ci` stores a sys_id, which
would require resolving CAROL3-GATEWAY's sys_id before writing the seed record (i.e.
authenticating against the PDI during the build phase, before any code is reviewed or
installed). Instead, `/graph` resolves root by name if the value isn't a 32-char sys_id:
a `GlideRecord` query against `cmdb_ci` on `name=<value>` when no `root` query param is
supplied. This keeps the whole build phase offline until the user explicitly approves
`now-sdk install`.

## 5. API contract

Unchanged from original spec §8, with the root-resolution note from §4 above.

### `GET /api/x_tusm_gcmdb/graph?root=<sys_id_or_name>&depth=<n>`

```json
{
  "result": {
    "root": "abc123",
    "nodes": [
      {
        "id": "abc123", "name": "CAROL3-GATEWAY", "class": "cmdb_ci_linux_server",
        "operational_status": "1", "health": "critical", "incident_count": 2,
        "top_incident": { "number": "INC0010234", "priority": "1" }, "depth": 0
      }
    ],
    "edges": [{ "source": "abc123", "target": "def456", "type": "Depends on::Used by" }],
    "truncated": false
  }
}
```

`health`: `critical` (open P1/P2), `warning` (open P3), `healthy` (otherwise) — derived
server-side to avoid N+1 client calls, per original spec.

Traversal: breadth-first, bidirectional across `cmdb_rel_ci` (CI can be parent or child),
visited-set to prevent cycles, hard stop at `max_nodes` with `truncated: true`. Uses
`GlideRecord` with `while (gr.next())` and `addAggregate('COUNT')`, not `addAggregateQuery`,
per scoped-app restrictions (unchanged from spec §8.3).

### `GET /api/x_tusm_gcmdb/ci/{sys_id}`

Full CI field set plus open incident list — unchanged from spec §8.2.

## 6. Gesture interaction spec

Unchanged from original spec §9 in full: `GestureRecognizer` in `VIDEO` mode, `numHands: 1`.

| Gesture | Command | Behaviour |
|---|---|---|
| `Pointing_Up` | SELECT | Raycast from projected fingertip to nearest node, show detail card |
| `Open_Palm` | EXPAND | Fetch one additional hop from selected node |
| `Closed_Fist` | RESET | Collapse to root, clear selection |

State machine (verbatim from spec §9.3):

```
IDLE ──(score ≥ threshold)──► CANDIDATE
CANDIDATE ──(same gesture held 6 consecutive frames)──► FIRING
CANDIDATE ──(gesture changes/drops below threshold)──► IDLE
FIRING ──(dispatch command)──► COOLDOWN
COOLDOWN ──(600ms elapsed AND gesture returns to None)──► IDLE
```

Coordinate mapping (mirrored webcam, per spec §9.4):
`screenX = (1 - landmark.x) * canvasWidth`, `screenY = landmark.y * canvasHeight`.

## 7. 3D rendering spec

Unchanged from original spec §10, MVP subset (no orbit control):

| Element | Treatment |
|---|---|
| Node | Instanced sphere, radius scaled by `incident_count` (clamped) |
| Node colour | critical `#E5484D`, warning `#FFB224`, healthy `#4A5568`, selected `#00D4FF` |
| Edge | Line segments, opacity 0.25, colour inherited from source node health |
| Layout | `d3-force-3d`, link + charge + centering force, ~300 warmup ticks then freeze |
| Selection | Emissive boost + billboarded ring |
| Camera | Perspective, fov 60, fit to graph bounding sphere on load |

Instanced meshes only — draw call count is the constraint, not polygon count.

## 8. Project structure (per actual SDK conventions)

```
now.config.json                 scope: x_tusm_gcmdb
package.json
src/
  fluent/
    tables/config.now.ts
    records/seed-config.now.ts
    acls/index.now.ts
    rest/graph-api.now.ts        imports handlers from src/server/
    ui-pages/gesture-cmdb-page.now.ts
  server/
    graph-handler.ts             GlideRecord traversal; imports gs/GlideRecord from @servicenow/glide
    ci-handler.ts
  client/
    index.html                   Array.from polyfill + sdk:now-ux-globals + main.tsx module script
    main.tsx
    app.tsx                      single view — no URLSearchParams routing needed for MVP
    utils/fields.ts
    hooks/
      useGestureRecognizer.ts
      useGestureStateMachine.ts
      useGraphData.ts
    scene/
      GraphScene.ts
      nodes.ts
      layout.ts
    components/
      DetailCard.tsx
      CameraPreview.tsx
      ArmingIndicator.tsx
    *.css                        BEM naming, ESM-imported, no CSS modules
```

Files kept under ~100 lines per SDK convention; larger spec files (e.g. `GraphScene.ts`)
split into 2-3 focused files with the same responsibilities described in §7.

## 9. Non-functional requirements

Unchanged from original spec §12: <200ms perceived gesture latency, <2s graph load at
250 nodes/depth 2, ≥45fps sustained, Chrome/Edge only, camera requested on explicit user
action (never on page load), full mouse fallback if camera denied/unavailable.

## 10. Security

- ACLs: read-only. `x_tusm_gcmdb_config` read → `itil`/`admin`, write → `admin`. Scripted
  REST API execute → `itil`.
- REST API runs in caller context (not elevated) — a user without CMDB read rights sees an
  empty graph, not a data leak, per original spec §13.
- No write operations to CMDB or incident tables anywhere in MVP.

## 11. Deployment

Build and iterate locally first. `now-sdk auth` and `now-sdk install` against the PDI only
run once the user explicitly confirms — not automatically as part of any milestone.

```bash
npx @servicenow/sdk init --appName "Touchless War Room" --packageName "gesture-cmdb" \
  --scopeName "x_tusm_gcmdb" --template base
npm install
npx @servicenow/sdk build
npx @servicenow/sdk auth --add https://dev422303.service-now.com --type basic
npx @servicenow/sdk install
```

Access at `https://dev422303.service-now.com/x_tusm_gcmdb_page.do`. Camera features require
the direct `.do` URL, not the Application Navigator (platform-controlled iframe may not grant
`allow="camera"` — see §12).

## 12. Milestones

| # | Deliverable | Definition of done |
|---|---|---|
| 1 | SDK scaffold + UiPage renders "hello" + camera permission smoke test | Page loads at `.do` endpoint; `getUserMedia()` succeeds when accessed via direct URL |
| 2 | Scripted REST returns real graph JSON | Verified against CAROL3-GATEWAY in REST API Explorer |
| 3 | Three.js renders static graph | 250 nodes, colour-coded, no interaction |
| 4 | MediaPipe recognizer running, logging gestures | Console shows categories with scores; CDN assets load (watch for CSP blocks) |
| 5 | State machine + 3 commands wired | Point/palm/fist all fire correctly with arming indicator |
| 6 | Detail card + polish | MVP complete, recordable |

Milestone 1 folds in the camera-permission validation ahead of the original spec's ordering,
since it's a foundational risk (§6.1/§9's premise breaks if `getUserMedia()` doesn't work in
this hosting context) — cheaper to find out now than after Milestone 3.
