import { Router, Request, Response } from 'express';
import { pool } from '../config';
import { io } from '../index';
import { computeCircuitPriority } from '../agent/scorer';

const router = Router();

// GET /api/jobs - List all crew dispatch jobs
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `
      SELECT j.*, c.circuit_name, c.population_affected, c.tree_cleared, c.electrical_restored
      FROM jobs j
      JOIN circuit_segments c ON j.circuit_segment_id = c.id
      ORDER BY j.priority_score DESC
      `
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/jobs/create - Generate sequenced jobs for a circuit outage
router.post('/jobs/create', async (req: Request, res: Response) => {
  const { circuitId } = req.body;
  if (!circuitId) {
    res.status(400).json({ error: 'Missing circuitId' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch circuit details
    const circQuery = await client.query('SELECT * FROM circuit_segments WHERE id = $1', [circuitId]);
    if (circQuery.rows.length === 0) {
      res.status(404).json({ error: 'Circuit segment not found' });
      client.release();
      return;
    }
    const circuit = circQuery.rows[0];

    // Compute priority
    const priority = computeCircuitPriority(circuit);

    let treeJobId: string | null = null;

    // 2. If tree canopy is dense and not cleared, insert a tree clearing job
    if (!circuit.tree_cleared && circuit.tree_canopy_density > 0.3) {
      const treeJobInsert = await client.query(
        `
        INSERT INTO jobs (circuit_segment_id, priority_score, required_crew_type, status)
        VALUES ($1, $2, 'tree', 'pending')
        RETURNING id
        `,
        [circuitId, priority]
      );
      treeJobId = treeJobInsert.rows[0].id;
    }

    // 3. Insert electrical restoration job (sequenced behind tree job if it exists)
    const electricalJobInsert = await client.query(
      `
      INSERT INTO jobs (circuit_segment_id, priority_score, required_crew_type, status, blocking_job_id)
      VALUES ($1, $2, 'electrical', $3, $4)
      RETURNING id
      `,
      [
        circuitId,
        priority,
        treeJobId ? 'blocked' : 'pending',
        treeJobId
      ]
    );

    await client.query('COMMIT');
    res.json({
      message: 'Sequenced jobs created successfully',
      treeJobId,
      electricalJobId: electricalJobInsert.rows[0].id
    });

    // Notify dashboard
    io.emit('jobs_updated');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating jobs:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// POST /api/jobs/complete - Complete a job and unblock dependent tasks
router.post('/jobs/complete', async (req: Request, res: Response) => {
  const { jobId } = req.body;
  if (!jobId) {
    res.status(400).json({ error: 'Missing jobId' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current job
    const jobQuery = await client.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (jobQuery.rows.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      client.release();
      return;
    }
    const job = jobQuery.rows[0];

    // 2. Mark job as complete
    await client.query("UPDATE jobs SET status = 'complete', updated_at = NOW() WHERE id = $1", [jobId]);

    // 3. Update associated circuit segment status
    if (job.required_crew_type === 'tree') {
      await client.query(
        "UPDATE circuit_segments SET tree_cleared = true, updated_at = NOW() WHERE id = $1",
        [job.circuit_segment_id]
      );

      // Unblock any dependent jobs
      const unblockQuery = await client.query(
        `
        UPDATE jobs
        SET status = 'pending'
        WHERE blocking_job_id = $1 AND status = 'blocked'
        RETURNING id
        `,
        [jobId]
      );
      
      console.log(`🔓 Unblocked ${unblockQuery.rows.length} dependent jobs.`);
    } else if (job.required_crew_type === 'electrical') {
      await client.query(
        `
        UPDATE circuit_segments
        SET electrical_restored = true, is_outage = false, outage_start_time = null, updated_at = NOW()
        WHERE id = $1
        `,
        [job.circuit_segment_id]
      );
    }

    // 4. Release assigned crew status back to available
    if (job.assigned_crew_id) {
      await client.query(
        "UPDATE crew_units SET status = 'available', current_job_id = null, updated_at = NOW() WHERE id = $1",
        [job.assigned_crew_id]
      );
    }

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Job completed successfully' });

    // Emit live socket updates
    io.emit('jobs_updated');
    io.emit('circuits_updated');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error completing job:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// POST /api/crews/dispatch - Dispatch a crew to a job
router.post('/crews/dispatch', async (req: Request, res: Response) => {
  const { crewId, jobId } = req.body;
  if (!crewId || !jobId) {
    res.status(400).json({ error: 'Missing crewId or jobId' });
    return;
  }

  try {
    await pool.query('BEGIN');

    // Update crew status to en_route
    await pool.query(
      "UPDATE crew_units SET status = 'en_route', current_job_id = $1, updated_at = NOW() WHERE id = $2",
      [jobId, crewId]
    );

    // Update job status to in_progress
    await pool.query(
      "UPDATE jobs SET status = 'in_progress', assigned_crew_id = $1, updated_at = NOW() WHERE id = $2",
      [crewId, jobId]
    );

    await pool.query('COMMIT');
    res.json({ status: 'success', message: 'Crew dispatched successfully' });

    io.emit('crews_updated');
    io.emit('jobs_updated');
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Error dispatching crew:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
