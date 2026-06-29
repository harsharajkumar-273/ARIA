import { Router, Request, Response } from 'express';
import { findRoute } from '../engines/router';

const router = Router();

// POST /api/route - Citizen safe routing request
router.post('/route', async (req: Request, res: Response) => {
  const { origin, needs } = req.body;

  if (!origin || !Array.isArray(origin) || origin.length !== 2) {
    res.status(400).json({ error: 'Missing or invalid origin coordinate. Expected [lat, lon]' });
    return;
  }

  try {
    const routes = await findRoute(origin as [number, number], needs || []);
    res.json(routes);
  } catch (error: any) {
    console.error('Error finding route:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
