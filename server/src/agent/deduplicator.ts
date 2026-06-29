import { pool } from '../config';
import { ExtractedIntent } from '../types/intent';

/**
 * Checks if an incoming intent is a duplicate of a request submitted by the same user recently.
 *
 * @param intent the extracted intent from the message
 * @param userId the UUID of the sender
 * @returns true if it is a duplicate, false otherwise
 */
export async function isDuplicate(intent: ExtractedIntent, userId: string): Promise<boolean> {
  if (intent.signal_type !== 'need_request' || !intent.needs || intent.needs.length === 0) {
    return false;
  }

  try {
    // Check if there is an active/open request from this user created in the last 5 minutes
    const result = await pool.query(
      `
      SELECT id, needs FROM requests
      WHERE requester_id = $1
      AND status = 'open'
      AND created_at > NOW() - INTERVAL '5 minutes'
      LIMIT 5
      `,
      [userId]
    );

    for (const row of result.rows) {
      // Check if there's overlap in the needs array
      const existingNeeds = row.needs as string[];
      const hasOverlap = intent.needs.some(need => existingNeeds.includes(need));
      if (hasOverlap) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error in deduplication check:', error);
    return false;
  }
}
