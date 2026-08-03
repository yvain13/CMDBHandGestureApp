import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveHealth } from "./health.ts";

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
