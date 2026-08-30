import React from "react";
import "./GestureLegend.css";

interface GestureLegendProps {
  activeGesture: string | null;
}

const GESTURES = [
  { key: "Pointing_Up", icon: "☝️", name: "Point up", action: "Select the node under the blue cursor" },
  { key: "Open_Palm", icon: "✋", name: "Open palm", action: "Expand from the selected node" },
  { key: "Closed_Fist", icon: "✊", name: "Closed fist", action: "Reset the view" },
];

export default function GestureLegend({ activeGesture }: GestureLegendProps) {
  return (
    <div className="gesture-legend">
      <div className="gesture-legend__title">Gestures — hold steady ~½ second</div>
      {GESTURES.map((g) => (
        <div
          key={g.key}
          className={
            activeGesture === g.key
              ? "gesture-legend__row gesture-legend__row--active"
              : "gesture-legend__row"
          }
        >
          <span className="gesture-legend__icon">{g.icon}</span>
          <span className="gesture-legend__name">{g.name}</span>
          <span className="gesture-legend__action">{g.action}</span>
        </div>
      ))}
    </div>
  );
}
