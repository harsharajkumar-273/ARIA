export interface CircuitSegment {
  is_outage: boolean;
  outage_start_time: Date | null;
  population_affected: number;
  vulnerability_score: number;
  tree_canopy_density: number;
  repair_complexity: number;
}

/**
 * Computes the priority score (0.0 to 1.0) of a circuit segment for dispatch queue ordering.
 */
export function computeCircuitPriority(circuit: CircuitSegment): number {
  if (!circuit.is_outage) return 0;

  const hoursWithout = circuit.outage_start_time
    ? (Date.now() - new Date(circuit.outage_start_time).getTime()) / 3600000
    : 0;

  const populationScore = Math.min(circuit.population_affected / 1000, 1.0);
  const vulnerabilityScore = circuit.vulnerability_score;
  const timeScore = Math.min(hoursWithout / 24, 1.0);
  const reOutageRisk = circuit.tree_canopy_density;

  const priority = (
    (populationScore * 0.35) +
    (vulnerabilityScore * 0.30) +
    (timeScore * 0.20) +
    (reOutageRisk * 0.15)
  ) / Math.max(circuit.repair_complexity, 0.1);

  return Math.min(Math.max(priority, 0), 1.0);
}
