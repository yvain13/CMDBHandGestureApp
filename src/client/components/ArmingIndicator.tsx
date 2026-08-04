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
