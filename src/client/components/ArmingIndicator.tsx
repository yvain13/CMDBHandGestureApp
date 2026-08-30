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

// Always rendered at a fixed size — mounting/unmounting per phase made the
// panel blink. The ring fills while arming and the label reflects the phase.
export default function ArmingIndicator({ phase, progress, gestureLabel }: ArmingIndicatorProps) {
  const label = gestureLabel ? COMMAND_LABELS[gestureLabel] || gestureLabel : "";
  const circumference = 2 * Math.PI * 18;
  const fill = phase === "FIRING" ? 1 : phase === "CANDIDATE" ? Math.min(progress, 1) : 0;
  const offset = circumference * (1 - fill);

  const text =
    phase === "FIRING"
      ? `${label} fired!`
      : phase === "CANDIDATE"
        ? `arming: ${label}`
        : phase === "COOLDOWN"
          ? "cooldown…"
          : "waiting for gesture";

  return (
    <div className={phase === "IDLE" ? "arming-indicator arming-indicator--idle" : "arming-indicator"}>
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
      <span className="arming-indicator__label">{text}</span>
    </div>
  );
}
