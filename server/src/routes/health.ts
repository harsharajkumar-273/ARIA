import { Router } from 'express';
import { pool } from '../config';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Test the database connection
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date()
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      db: 'disconnected',
      error: error.message
    });
  }
});

export default router;
