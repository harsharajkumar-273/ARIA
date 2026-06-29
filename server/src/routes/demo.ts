import { Router, Request, Response } from 'express';
import { pool } from '../config';
import { io } from '../index';
import { processMessage } from '../agent/orchestrator';

const router = Router();

// POST /api/demo/run - Trigger demo simulation scenario
router.post('/demo/run', async (req: Request, res: Response) => {
  res.json({ status: 'running', message: 'Demo scenario started' });
  
  // Run asynchronously
  runDemoScenario().catch((err) => {
    console.error('❌ Demo scenario error:', err);
  });
});

// POST /api/demo/reset - Reset database state
router.post('/demo/reset', async (req: Request, res: Response) => {
  try {
    await resetDemo();
    res.json({ status: 'success', message: 'Database reset successfully' });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    res.status(500).json({ error: error.message });
  }
});

export async function resetDemo() {
  console.log('🔄 Resetting demo database transactions...');
  await pool.query('TRUNCATE matches, requests, offers, messages, crowd_reports, vulnerability_detections, activity_log CASCADE');
  await pool.query('UPDATE users SET active_requests = 0, is_available = true');
}

async function simulateInbound(phone: string, message: string, channel: string) {
  io.emit('demo_step', {
    phone: phone.slice(-4),
    message,
    channel,
    timestamp: new Date()
  });
  await processMessage(message, phone, channel);
}

export async function runDemoScenario() {
  await resetDemo();
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Story 1: Elderly woman — multiple needs, emergency
  await simulateInbound('+15559990001', 'I am 78 years old no food since yesterday no heat I cannot leave my apartment I am very scared', 'sms');
  await delay(3000);

  // Story 2: Volunteer offers help
  await simulateInbound('+15559990002', 'I am near downtown and free to help with anything tonight', 'whatsapp');
  await delay(3000);

  // Story 3: Dining hall surplus
  await simulateInbound('+15559990003', 'University dining has 45 portions grilled chicken and 20 pasta available until 9pm', 'sms');
  await delay(3000);

  // Match fires for Story 1 automatically during processing
  await delay(2000);

  // Volunteer accepts
  await simulateInbound('+15559990002', 'GO', 'whatsapp');
  await delay(2000);

  // Story 4: Family needs food and childcare
  await simulateInbound('+15559990004', 'Single dad 3 kids need food and someone to watch kids 2 hours so I can go to job interview tomorrow morning', 'web');
  await delay(3000);

  // Food bank confirms
  await simulateInbound('+15551001001', 'YES', 'sms');
  await delay(2000);

  // Delivery complete
  await simulateInbound('+15559990002', 'ARRIVED', 'whatsapp');
  await delay(1000);

  // Elderly woman confirms
  await simulateInbound('+15559990001', 'YES', 'sms');
  await delay(1000);

  // Update total helped count in the database to reflect impact
  await pool.query('UPDATE users SET total_helped = total_helped + 6 WHERE role = \'volunteer\' OR role = \'org\'');

  // Emit final completion stats
  io.emit('demo_complete', {
    stories: 3,
    peopleHelped: 6,
    avgResponseMins: 4.2
  });
}

export default router;
