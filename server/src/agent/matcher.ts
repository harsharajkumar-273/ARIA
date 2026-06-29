import { pool } from '../config';
import { haversineDistance } from '../utils/haversine';

export interface MatchRequestParams {
  id: string;
  requester_id: string;
  needs: string[];
  medical_priority: boolean;
  urgency: number;
  latitude: number;
  longitude: number;
}

export interface MatchResult {
  need: string;
  helper: any;
  score: number;
  distKm: number;
}

export async function matchRequest(request: MatchRequestParams): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  for (const need of request.needs) {
    // Query users that are helpers or organizations, available, and have capacity
    const helpersQuery = await pool.query(
      `
      SELECT * FROM users
      WHERE (role = 'helper' OR role = 'org')
      AND is_available = true
      AND $1 = ANY(help_categories)
      AND active_requests < capacity
      AND (
        trust_tier >= 2
        OR ($2 = false AND $3 < 4)
      )
      ORDER BY trust_tier DESC, total_helped DESC
      `,
      [need, request.medical_priority, request.urgency]
    );

    let bestScore = 0;
    let bestHelper = null;
    let bestDistKm = 0;

    for (const helper of helpersQuery.rows) {
      // Calculate Haversine distance
      const distKm = haversineDistance(
        [request.latitude, request.longitude],
        [helper.latitude, helper.longitude]
      );

      // Medical priority restriction - only trust tier 2+ for vulnerable persons
      if (request.medical_priority && helper.trust_tier < 2) {
        continue;
      }

      // Proximity score
      const distScore = distKm < 0.5 ? 1.0 :
                        distKm < 1 ? 0.9 :
                        distKm < 3 ? 0.7 :
                        distKm < 8 ? 0.4 :
                        distKm < 20 ? 0.2 : 0.05;

      const trustScore = helper.trust_tier / 4;
      const capacityScore = (helper.capacity - helper.active_requests) / helper.capacity;
      const reliabilityScore = (helper.show_up_rate * 0.5) + (helper.confirmation_rate * 0.5);
      const urgencyMatch = request.urgency >= 4 ? (helper.role === 'org' ? 1.0 : 0.6) : 1.0;

      // Scoring formula matching requirements
      const totalScore = (
        (distScore * 0.35) +
        (trustScore * 0.25) +
        (reliabilityScore * 0.20) +
        (capacityScore * 0.12) +
        (urgencyMatch * 0.08)
      );

      if (totalScore > bestScore && totalScore > 0.2) {
        bestScore = totalScore;
        bestHelper = helper;
        bestDistKm = distKm;
      }
    }

    if (bestHelper) {
      results.push({
        need,
        helper: bestHelper,
        score: bestScore,
        distKm: bestDistKm
      });
    }
  }

  return results;
}
