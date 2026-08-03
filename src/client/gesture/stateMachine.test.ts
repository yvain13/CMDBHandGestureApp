import { test } from "node:test";
import assert from "node:assert/strict";
import { reduceGestureState, INITIAL_STATE } from "./stateMachine.ts";
import type { MachineConfig } from "./stateMachine.ts";

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
