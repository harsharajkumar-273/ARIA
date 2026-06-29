/**
 * Computes the time-decayed weight of a road segment.
 * w(e,t) = base + (icePenalty + debrisPenalty) * e^(-1.5 * ageHours)
 *
 * @param baseWeight base weight (typically 1.0)
 * @param lastReportTime when the hazard was reported
 * @param icePenalty ice weight penalty
 * @param debrisPenalty debris weight penalty
 * @param currentTime active comparison time
 * @returns decayed weight
 */
export function computeEdgeWeight(
  baseWeight: number,
  lastReportTime: Date | null,
  icePenalty: number,
  debrisPenalty: number,
  currentTime: Date = new Date()
): number {
  const base = baseWeight || 1.0;

  if (!lastReportTime) {
    return base;
  }

  const ageHours = (currentTime.getTime() - new Date(lastReportTime).getTime()) / 3600000;
  
  // Lambda = 1.5, giving a half-life of ~28 minutes: ln(2) / 1.5 = 0.462 hours
  const decayFactor = Math.exp(-1.5 * ageHours);

  const activeIcePenalty = (icePenalty || 0.0) * decayFactor;
  const activeDebrisPenalty = (debrisPenalty || 0.0) * decayFactor;

  return base + activeIcePenalty + activeDebrisPenalty;
}
