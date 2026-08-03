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
