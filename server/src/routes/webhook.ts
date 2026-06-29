import { Router, Request, Response } from 'express';
import express from 'express';
import { processMessage } from '../agent/orchestrator';

const router = Router();

// Handle Twilio webhook POST requests (both SMS and WhatsApp)
router.post(
  '/webhook/twilio',
  express.urlencoded({ extended: false }),
  async (req: Request, res: Response) => {
    const { Body, From } = req.body;

    if (!Body || !From) {
      res.status(400).send('Missing Body or From');
      return;
    }

    let channel = 'sms';
    let cleanPhone = From;

    if (From.startsWith('whatsapp:')) {
      channel = 'whatsapp';
      cleanPhone = From.replace('whatsapp:', '');
    } else if (From.startsWith('messenger:')) {
      channel = 'facebook';
      cleanPhone = From.replace('messenger:', '');
    }

    // Always respond immediately with empty TwiML — Twilio needs response in < 5s
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');

    // Process the message asynchronously
    processMessage(Body, cleanPhone, channel).catch((err) => {
      console.error('❌ Agent orchestrator processing error:', err);
    });
  }
);

export default router;
