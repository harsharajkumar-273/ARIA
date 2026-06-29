import { pool } from '../config';
import { io } from '../index';
import { MatchResult } from './matcher';

export async function findNearestVolunteer(request: { latitude: number; longitude: number }): Promise<any | null> {
  try {
    const result = await pool.query(
      `
      SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS distance
      FROM users
      WHERE role = 'volunteer'
      AND is_available = true
      ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT 1
      `,
      [request.longitude, request.latitude]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding nearest volunteer:', error);
    return null;
  }
}

export async function createMatch(request: any, matchResult: MatchResult, volunteer: any): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create a corresponding helper offer record in 'offers' table
    const offerInsert = await client.query(
      `
      INSERT INTO offers (helper_id, source_channel, raw_message, help_type, description, address, latitude, longitude, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'matched')
      RETURNING id
      `,
      [
        matchResult.helper.id,
        matchResult.helper.channel_preference || 'sms',
        `Auto-generated offer to help with ${matchResult.need}`,
        matchResult.need,
        `Helper ${matchResult.helper.name} matched to request ${request.id}`,
        matchResult.helper.address || 'Shared location',
        matchResult.helper.latitude,
        matchResult.helper.longitude
      ]
    );
    const offerId = offerInsert.rows[0].id;

    // 2. Create match record in DB
    const insertMatchResult = await client.query(
      `
      INSERT INTO matches (request_id, offer_id, volunteer_id, need_type, match_score, distance_km, status, pin_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        request.id,
        offerId,
        volunteer ? volunteer.id : null,
        matchResult.need,
        matchResult.score,
        matchResult.distKm,
        'proposed',
        Math.floor(1000 + Math.random() * 9000).toString() // 4-digit PIN code
      ]
    );

    const match = insertMatchResult.rows[0];

    // Increment active requests for the helper
    await client.query(
      `
      UPDATE users 
      SET active_requests = active_requests + 1
      WHERE id = $1
      `,
      [matchResult.helper.id]
    );

    // If volunteer assigned, mark volunteer unavailable
    if (volunteer) {
      await client.query(
        `
        UPDATE users 
        SET is_available = false 
        WHERE id = $1
        `,
        [volunteer.id]
      );
    }

    // Update request status to 'partially_matched'
    await client.query(
      `
      UPDATE requests
      SET status = 'partially_matched'
      WHERE id = $1 AND status = 'open'
      `,
      [request.id]
    );

    await client.query('COMMIT');

    // Emit event via Socket.io
    io.emit('match_created', {
      matchId: match.id,
      requestId: request.id,
      helperId: matchResult.helper.id,
      volunteerId: volunteer ? volunteer.id : null,
      needType: matchResult.need,
      timestamp: new Date()
    });

    // Create activity log
    await pool.query(
      `
      INSERT INTO activity_log (event_type, title, description, latitude, longitude, urgency)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        'match_proposed',
        `Match Proposed: ${matchResult.need}`,
        `Matched ${matchResult.helper.name} to help with ${matchResult.need} for request near ${request.address || 'Unspecified address'}`,
        request.latitude,
        request.longitude,
        request.urgency
      ]
    );

    return match;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating match:', error);
    throw error;
  } finally {
    client.release();
  }
}
