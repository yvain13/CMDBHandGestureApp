export interface IncidentSummary {
  number: string;
  priority: string;
  ciId: string;
}

export type Health = "critical" | "warning" | "healthy";

export interface HealthResult {
  health: Health;
  incidentCount: number;
  topIncident: { number: string; priority: string } | null;
}

export function deriveHealth(incidents: IncidentSummary[]): HealthResult {
  if (incidents.length === 0) {
    return { health: "healthy", incidentCount: 0, topIncident: null };
  }

  const top = [...incidents].sort((a, b) => Number(a.priority) - Number(b.priority))[0];
  const topPriority = Number(top.priority);
  const health: Health = topPriority <= 2 ? "critical" : topPriority === 3 ? "warning" : "healthy";

  return {
    health,
    incidentCount: incidents.length,
    topIncident: { number: top.number, priority: top.priority },
  };
}
