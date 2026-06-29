import { pool } from '../config';
import { io } from '../index';
import { extractIntent } from './extractor';
import { isDuplicate } from './deduplicator';
import { matchRequest } from './matcher';
import { findNearestVolunteer, createMatch } from './dispatcher';
import { sendMessage } from '../twilio/sender';
import { MESSAGES, NEED_LABELS } from './messenger';
import { handleKeywordReply } from './replyHandler';
import { ExtractedIntent } from '../types/intent';

export async function processMessage(
  rawMessage: string,
  senderPhone: string,
  channel: string
): Promise<void> {
  console.log(`📥 Processing inbound message from ${senderPhone} (${channel}): "${rawMessage}"`);

  // Keyword check first - instant reply for simple state transitions
  const upperMsg = rawMessage.trim().toUpperCase();
  const keywords = ['YES', 'NO', 'CANCEL', 'GO', 'ACCEPT', 'DECLINE', 'ARRIVED', 'DONE', 'STOP', 'URGENT', 'HELP'];

  if (keywords.some(k => upperMsg.startsWith(k))) {
    await handleKeywordReply(upperMsg, senderPhone, channel);
    return;
  }

  // Extract intent (combining local keywords and Claude API)
  const intent = await extractIntent(rawMessage);

  // Find or create user
  const user = await findOrCreateUser(senderPhone, intent);

  // Deduplication check
  if (await isDuplicate(intent, user.id)) {
    await sendMessage(
      senderPhone,
      channel,
      "We already have your request and are working on it. We'll update you shortly."
    );
    return;
  }

  // Store inbound message
  const msgRecord = await storeMessage({
    userId: user.id,
    body: rawMessage,
    direction: 'inbound',
    channel
  });

  // Emit to web dashboard
  io.emit('new_message', {
    intent,
    user: { name: user.name, role: user.role, phone: senderPhone },
    channel,
    body: rawMessage,
    timestamp: new Date()
  });

  if (intent.signal_type === 'need_request') {
    // Emergency acknowledgment
    if (intent.is_emergency) {
      await sendMessage(
        senderPhone,
        channel,
        'URGENT received. Finding help RIGHT NOW. Stay where you are.'
      );
    } else {
      const needText = intent.needs.slice(0, 2).map(n => NEED_LABELS[n] || n).join(' and ');
      await sendMessage(
        senderPhone,
        channel,
        `Got it. We're finding the best help for ${needText || 'help'} near you now...`
      );
    }

    const request = await createRequest(intent, user.id, rawMessage, channel);
    // Link request ID to message record
    await pool.query('UPDATE messages SET request_id = $1 WHERE id = $2', [request.id, msgRecord.id]);

    // Perform matching for all needs
    const matches = await matchRequest(request);

    if (matches.length === 0) {
      await sendMessage(
        senderPhone,
        channel,
        `Registered. No helpers available right now but we're watching. You'll hear from us the moment someone can help. Reply URGENT if this becomes life-threatening.`
      );
      return;
    }

    // Process and dispatch matches
    const summaries: string[] = [];
    for (const match of matches) {
      const volunteer = await findNearestVolunteer(request);
      const matchRecord = await createMatch(request, match, volunteer);

      summaries.push(MESSAGES.matchSummary(match.need, match.helper.name, match.distKm));

      // Notify helper
      await sendMessage(
        match.helper.phone,
        match.helper.channel_preference || 'sms',
        MESSAGES.helperNotification(match.need, intent.description, intent.address || '')
      );

      // Notify volunteer if assigned
      if (volunteer) {
        await sendMessage(
          volunteer.phone,
          'sms',
          MESSAGES.volunteerDispatch(
            match.helper.address || 'Helper pickup',
            request.address || 'Citizen delivery location',
            '45 mins'
          )
        );
      }
    }

    // Send single chained confirmation to requester
    await sendMessage(senderPhone, channel, MESSAGES.chained(summaries));

  } else if (intent.signal_type === 'help_offer') {
    const offer = await createOffer(intent, user.id, rawMessage, channel);

    const label = NEED_LABELS[intent.help_type || ''] || intent.help_type || 'general';
    await sendMessage(
      senderPhone,
      channel,
      `Thank you! Logged your offer of ${label}. We'll reach out when someone nearby needs this. If unclaimed in 24 hours, we'll donate it to the nearest charity automatically.`
    );

    // Socket notification
    io.emit('offer_created', { offer, timestamp: new Date() });

    // Attempt to match with existing open requests
    await tryMatchExistingRequests(offer);

  } else if (intent.signal_type === 'road_report') {
    const report = await createCrowdReport(intent, user.id, channel);
    await sendMessage(
      senderPhone,
      channel,
      'Road condition logged. Routing will update for everyone near that area. Thank you.'
    );

    io.emit('road_report', { report, timestamp: new Date() });
  }
}

// Helper: Find or create user record
export async function findOrCreateUser(phone: string, intent: ExtractedIntent): Promise<any> {
  const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Guess role
  let role = 'citizen';
  if (intent.signal_type === 'volunteer_available') role = 'volunteer';
  else if (intent.signal_type === 'help_offer') role = 'helper';

  // Use a default coordinate for Nashville
  const lat = 36.1627;
  const lon = -86.7816;

  const insertResult = await pool.query(
    `
    INSERT INTO users (name, phone, role, latitude, longitude, location, is_available)
    VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326), true)
    RETURNING *
    `,
    [`User (${phone.slice(-4)})`, phone, role, lat, lon]
  );
  return insertResult.rows[0];
}

// Helper: Store message logs
export async function storeMessage(msg: {
  userId: string;
  body: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  requestId?: string;
  matchId?: string;
}): Promise<any> {
  const res = await pool.query(
    `
    INSERT INTO messages (user_id, direction, channel, body, request_id, match_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [msg.userId, msg.direction, msg.channel, msg.body, msg.requestId || null, msg.matchId || null]
  );
  return res.rows[0];
}

// Helper: Create request record
async function createRequest(intent: ExtractedIntent, userId: string, rawMessage: string, channel: string): Promise<any> {
  const lat = 36.1627;
  const lon = -86.7816;

  const res = await pool.query(
    `
    INSERT INTO requests (requester_id, source_channel, raw_message, needs, primary_need, description, address, latitude, longitude, location, urgency, is_emergency, medical_priority, quantity_description, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($9, $8), 4326), $10, $11, $12, $13, 'open')
    RETURNING *
    `,
    [
      userId,
      channel,
      rawMessage,
      intent.needs,
      intent.primary_need,
      intent.description,
      intent.address || 'Nashville Area',
      lat,
      lon,
      intent.urgency,
      intent.is_emergency,
      intent.medical_priority,
      intent.quantity_description
    ]
  );
  return res.rows[0];
}

// Helper: Create offer record
async function createOffer(intent: ExtractedIntent, userId: string, rawMessage: string, channel: string): Promise<any> {
  const lat = 36.1627;
  const lon = -86.7816;

  const res = await pool.query(
    `
    INSERT INTO offers (helper_id, source_channel, raw_message, help_type, description, quantity_description, address, latitude, longitude, location, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($9, $8), 4326), 'available')
    RETURNING *
    `,
    [
      userId,
      channel,
      rawMessage,
      intent.help_type || 'general',
      intent.description,
      intent.quantity_description,
      intent.address || 'Nashville Area',
      lat,
      lon
    ]
  );
  return res.rows[0];
}

// Helper: Create crowd report record
async function createCrowdReport(intent: ExtractedIntent, userId: string, channel: string): Promise<any> {
  const lat = 36.1627;
  const lon = -86.7816;

  const res = await pool.query(
    `
    INSERT INTO crowd_reports (reporter_id, latitude, longitude, location, report_text, urgency_level, hazard_type, channel)
    VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4, $5, $6, $7)
    RETURNING *
    `,
    [
      userId,
      lat,
      lon,
      intent.description,
      intent.urgency,
      intent.hazard_type,
      channel
    ]
  );
  return res.rows[0];
}

// Helper: Attempt to match helper offer against open requests
async function tryMatchExistingRequests(offer: any): Promise<void> {
  try {
    // Find open requests that have a need matching the offer's help_type
    const matchingRequests = await pool.query(
      `
      SELECT * FROM requests
      WHERE status = 'open'
      AND $1 = ANY(needs)
      ORDER BY urgency DESC, created_at ASC
      LIMIT 1
      `,
      [offer.help_type]
    );

    if (matchingRequests.rows.length > 0) {
      const request = matchingRequests.rows[0];
      const volunteer = await findNearestVolunteer(request);

      // Create a match
      const insertMatchResult = await pool.query(
        `
        INSERT INTO matches (request_id, offer_id, volunteer_id, need_type, match_score, distance_km, status, pin_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
          request.id,
          offer.id,
          volunteer ? volunteer.id : null,
          offer.help_type,
          0.95, // Direct match score
          1.0,
          'proposed',
          Math.floor(1000 + Math.random() * 9000).toString()
        ]
      );

      const match = insertMatchResult.rows[0];

      // Update helper requests count
      await pool.query('UPDATE users SET active_requests = active_requests + 1 WHERE id = $1', [offer.helper_id]);
      if (volunteer) {
        await pool.query('UPDATE users SET is_available = false WHERE id = $1', [volunteer.id]);
      }
      await pool.query("UPDATE requests SET status = 'partially_matched' WHERE id = $1", [request.id]);
      await pool.query("UPDATE offers SET status = 'matched' WHERE id = $1", [offer.id]);

      // Notify requester
      await sendMessage(
        request.requester_id,
        'sms',
        `A helper has offered ${NEED_LABELS[offer.help_type] || offer.help_type} for you! Reply CANCEL to stop.`
      );
    }
  } catch (error) {
    console.error('Error matching existing request to new offer:', error);
  }
}
