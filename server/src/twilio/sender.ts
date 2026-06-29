import { twilioClient, TWILIO_PHONE_NUMBER } from '../config';

/**
 * Sends a message to a user on their preferred channel.
 *
 * @param to recipient phone number or handle
 * @param channel 'sms' | 'whatsapp' | 'facebook' | 'web'
 * @param body message body content
 */
export async function sendMessage(
  to: string,
  channel: string,
  body: string
): Promise<string> {
  let formattedTo = to;
  let formattedFrom = TWILIO_PHONE_NUMBER;

  if (channel === 'whatsapp') {
    if (!to.startsWith('whatsapp:')) {
      formattedTo = `whatsapp:${to}`;
    }
    formattedFrom = `whatsapp:${TWILIO_PHONE_NUMBER}`;
  } else if (channel === 'facebook') {
    if (!to.startsWith('messenger:')) {
      formattedTo = `messenger:${to}`;
    }
    formattedFrom = `messenger:${TWILIO_PHONE_NUMBER}`;
  } else if (channel === 'web') {
    console.log(`[WEB NOTIFICATION] to: ${to} | body: ${body}`);
    return 'WEB_MSG_SENT';
  }

  try {
    const result = await twilioClient.messages.create({
      body,
      to: formattedTo,
      from: formattedFrom
    });
    return result.sid;
  } catch (error) {
    console.error(`❌ Failed to send message via Twilio to ${to}:`, error);
    // Return mock SID so execution doesn't block
    return `ERR_SM_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
}
