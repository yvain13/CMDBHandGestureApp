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
