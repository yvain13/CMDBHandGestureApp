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
