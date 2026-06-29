import { Router, Request, Response } from 'express';
import { processMessage } from '../agent/orchestrator';

const router = Router();

// POST /api/submit - Signal injection endpoint
router.post('/submit', async (req: Request, res: Response) => {
  const { body, phone, channel } = req.body;

  if (!body || !phone) {
    res.status(400).json({ error: 'Missing body or phone' });
    return;
  }

  try {
    // Process message asynchronously
    processMessage(body, phone, channel || 'sms').catch((err) => {
      console.error('❌ Error processing injected message:', err);
    });

    res.json({
      status: 'queued',
      message: 'Signal injected successfully'
    });
  } catch (error: any) {
    console.error('Error in signal injection:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
