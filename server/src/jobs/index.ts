import cron from 'node-cron';
import { pool, ML_SERVICE_URL } from '../config';
import { runGhostModeScan } from '../agent/ghostMode';
import { computeCircuitPriority } from '../agent/scorer';
import { io } from '../index';

export function startBackgroundJobs() {
  console.log('⏰ [CRON] Starting background job workers...');

  // 1. Decay worker - every 10 minutes
  // Decays road penalties towards 0
  cron.schedule('*/10 * * * *', async () => {
    console.log('⏰ [CRON] Running road segment decay worker...');
    try {
      const res = await pool.query(
        `SELECT id, last_report_time, ice_penalty, debris_penalty FROM road_segments 
         WHERE ice_penalty > 0 OR debris_penalty > 0`
      );

      for (const segment of res.rows) {
        const ageHours = (Date.now() - new Date(segment.last_report_time).getTime()) / 3600000;
        const decayFactor = Math.exp(-1.5 * ageHours);
        
        const newIce = segment.ice_penalty * decayFactor < 0.1 ? 0 : segment.ice_penalty * decayFactor;
        const newDebris = segment.debris_penalty * decayFactor < 0.1 ? 0 : segment.debris_penalty * decayFactor;
        
        const newCondition = newIce === 0 && newDebris === 0 ? 'passable' : 'unknown';

        await pool.query(
          `UPDATE road_segments 
           SET ice_penalty = $1, debris_penalty = $2, condition = $3 
           WHERE id = $4`,
          [newIce, newDebris, newCondition, segment.id]
        );
      }
      io.emit('road_report_decayed');
    } catch (err) {
      console.error('Error in road decay job:', err);
    }
  });

  // 2. Scoring worker - every 5 minutes
  // Recomputes priority scores for active outages
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ [CRON] Running circuit priority scoring worker...');
    try {
      const res = await pool.query('SELECT * FROM circuit_segments WHERE is_outage = true');
      for (const circuit of res.rows) {
        const priority = computeCircuitPriority(circuit);
        await pool.query(
          'UPDATE circuit_segments SET priority_score = $1, updated_at = NOW() WHERE id = $2',
          [priority, circuit.id]
        );
      }
      io.emit('circuits_updated');
    } catch (err) {
      console.error('Error in circuit priority scoring job:', err);
    }
  });

  // 3. Expiry & Auto-Route worker - every 30 minutes
  // Auto-routes unclaimed offers older than 24 hours to local charity nodes
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ [CRON] Running food/aid offer expiry auto-router...');
    try {
      const res = await pool.query(
        `SELECT o.*, u.name as helper_name FROM offers o
         JOIN users u ON o.helper_id = u.id
         WHERE o.status = 'available'
         AND o.created_at < NOW() - INTERVAL '24 hours'`
      );

      for (const offer of res.rows) {
        // Find nearest shelter or food bank charity node
        const charityQuery = await pool.query(
          `SELECT * FROM resource_nodes
           WHERE type IN ('shelter', 'food_bank')
           AND is_open = true
           ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
           LIMIT 1`,
          [offer.longitude, offer.latitude]
        );

        if (charityQuery.rows.length > 0) {
          const charity = charityQuery.rows[0];
          await pool.query(
            `UPDATE offers
             SET status = 'auto_routed', charity_routed_at = NOW()
             WHERE id = $1`,
            [offer.id]
          );

          // Log event
          await pool.query(
            `INSERT INTO activity_log (event_type, title, description, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              'auto_routed',
              'Aid Auto-routed',
              `Expired ${offer.help_type} offer from ${offer.helper_name} auto-routed to ${charity.name} to avoid waste.`,
              offer.latitude,
              offer.longitude
            ]
          );

          console.log(`🚚 [CRON] Auto-routed expired offer ${offer.id} to charity node ${charity.name}`);
        }
      }
      io.emit('offers_updated');
    } catch (err) {
      console.error('Error in offer expiry job:', err);
    }
  });

  // 4. ML Prediction Worker - every 60 minutes
  // Polls ML FastAPI microservice for failure probabilities and updates circuits
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ [CRON] Running ML prediction poller...');
    try {
      const response = await fetch(`${ML_SERVICE_URL}/predict`);
      if (response.ok) {
        const data = await response.json();
        for (const pred of data.predictions) {
          await pool.query(
            `UPDATE circuit_segments
             SET failure_probability = $1, updated_at = NOW()
             WHERE circuit_name = $2`,
            [pred.probability, pred.circuit_name]
          );
        }
        console.log('🔮 [CRON] Successfully updated ML failure predictions from FastAPI service.');
        io.emit('circuits_updated');
      }
    } catch (err) {
      console.warn('🔮 [CRON] ML prediction microservice offline or unreachable. Skipping poll.');
    }
  });

  // 5. Ghost Mode Welfare Worker - every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    await runGhostModeScan();
  });
}
