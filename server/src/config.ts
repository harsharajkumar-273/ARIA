import dotenv from 'dotenv';
import { Pool } from 'pg';
import twilio from 'twilio';

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const JWT_SECRET = process.env.JWT_SECRET || 'aria_secret_2026';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
export const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
export const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Database Pool Configuration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false // Use false for local development
});

// Twilio Client with Mock Support for Local Demos
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

interface TwilioClientMock {
  messages: {
    create: (options: { body: string; to: string; from: string }) => Promise<{ sid: string }>;
  };
}

let twilioClientInstance: twilio.Twilio | TwilioClientMock;

const isTwilioConfigured =
  twilioSid &&
  twilioToken &&
  twilioSid !== 'your_sid_here' &&
  twilioToken !== 'your_key_here' &&
  twilioToken !== 'your_token_here';

if (isTwilioConfigured) {
  twilioClientInstance = twilio(twilioSid, twilioToken);
} else {
  console.log('⚠️ Twilio keys not configured. Falling back to Mock Twilio Client.');
  twilioClientInstance = {
    messages: {
      create: async (options: { body: string; to: string; from: string }) => {
        const mockSid = `SM${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        console.log(`[MOCK SMS] to: ${options.to} | body: ${options.body}`);
        return { sid: mockSid };
      }
    }
  };
}

export const twilioClient = twilioClientInstance;
