import { pool } from '../config';
import { io } from '../index';

export async function runGhostModeScan(): Promise<void> {
  console.log('👻 [GHOST MODE] Starting welfare scan for passive vulnerability signals...');

  try {
    // 1. Scan for silent phones: Citizens in Nashville area whose last_active is > 2 hours ago
    const silentPhones = await pool.query(
      `
      SELECT id, name, phone, address, latitude, longitude
      FROM users
      WHERE role = 'citizen'
      AND last_active < NOW() - INTERVAL '2 hours'
      AND is_available = true
      AND id NOT IN (
        SELECT requester_id FROM requests WHERE status IN ('open', 'partially_matched')
      )
      LIMIT 10
      `
    );

    for (const user of silentPhones.rows) {
      // Check if detection already exists
      const existing = await pool.query(
        `
        SELECT id FROM vulnerability_detections
        WHERE detection_type = 'phone_silent'
        AND resolved = false
        AND ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) < 0.001
        `,
        [user.longitude, user.latitude]
      );

      if (existing.rows.length === 0) {
        // Create detection
        const insertRes = await pool.query(
          `
          INSERT INTO vulnerability_detections (detection_type, latitude, longitude, location, address, confidence, raw_signal)
          VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4, $5, $6)
          RETURNING *
          `,
          [
            'phone_silent',
            user.latitude,
            user.longitude,
            user.address || 'Nashville Area',
            0.85,
            `Passive phone silence detected: no outgoing signals from registered user ${user.name} (${user.phone}) for over 2 hours.`
          ]
        );

        const detection = insertRes.rows[0];
        console.log(`👻 [GHOST MODE] Silent phone vulnerability flagged for ${user.name}`);

        // Emit dashboard event
        io.emit('new_welfare_check', {
          id: detection.id,
          type: 'phone_silent',
          address: detection.address,
          description: detection.raw_signal,
          timestamp: new Date()
        });

        // Insert into activity log
        await pool.query(
          `
          INSERT INTO activity_log (event_type, title, description, latitude, longitude, urgency)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            'welfare_check_dispatched',
            'Ghost Mode Welfare Check',
            `Passive vulnerability flag raised for ${user.name}. Silence detected > 2 hrs.`,
            user.latitude,
            user.longitude,
            3
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error during Ghost Mode welfare scan:', error);
  }
}
