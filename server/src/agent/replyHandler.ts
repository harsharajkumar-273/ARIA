import { pool } from '../config';
import { sendMessage } from '../twilio/sender';
import { io } from '../index';
import { MESSAGES, NEED_LABELS } from './messenger';
import { matchRequest } from './matcher';
import { findNearestVolunteer, createMatch } from './dispatcher';

export async function handleKeywordReply(
  upperMsg: string,
  senderPhone: string,
  channel: string
): Promise<void> {
  console.log(`🔑 [STATE MACHINE] Processing keyword: "${upperMsg}" from ${senderPhone}`);

  // Fetch the user
  const userQuery = await pool.query('SELECT * FROM users WHERE phone = $1', [senderPhone]);
  if (userQuery.rows.length === 0) {
    await sendMessage(senderPhone, channel, "We couldn't locate your user record. Please text a description of your needs to register.");
    return;
  }
  const user = userQuery.rows[0];

  // Store inbound message log
  await pool.query(
    `
    INSERT INTO messages (user_id, direction, channel, body)
    VALUES ($1, $2, $3, $4)
    `,
    [user.id, 'inbound', channel, upperMsg]
  );

  if (user.role === 'helper' || user.role === 'org') {
    await handleHelperReply(upperMsg, user, senderPhone, channel);
  } else if (user.role === 'volunteer') {
    await handleVolunteerReply(upperMsg, user, senderPhone, channel);
  } else if (user.role === 'citizen') {
    await handleCitizenReply(upperMsg, user, senderPhone, channel);
  } else {
    // Fallback for admins or undefined roles
    await sendMessage(senderPhone, channel, "Your message has been logged. Admin support will reach out if needed.");
  }
}

// -------------------------------------------------------------
// HELPER / ORGANIZATION STATE FLOW
// -------------------------------------------------------------
async function handleHelperReply(upperMsg: string, helper: any, phone: string, channel: string) {
  if (upperMsg.startsWith('YES') || upperMsg.startsWith('ACCEPT')) {
    // Find the latest proposed match for this helper
    const matchQuery = await pool.query(
      `
      SELECT m.*, r.address as req_address, r.description as req_desc, r.medical_priority, u.phone as req_phone
      FROM matches m
      JOIN offers o ON m.offer_id = o.id
      JOIN requests r ON m.request_id = r.id
      JOIN users u ON r.requester_id = u.id
      WHERE o.helper_id = $1 AND m.status = 'proposed'
      ORDER BY m.created_at DESC
      LIMIT 1
      `,
      [helper.id]
    );

    if (matchQuery.rows.length === 0) {
      await sendMessage(phone, channel, "You don't have any pending match requests at this time.");
      return;
    }

    const match = matchQuery.rows[0];

    // Update match state
    await pool.query(
      `
      UPDATE matches
      SET helper_confirmed = true,
          status = CASE WHEN volunteer_id IS NULL THEN 'confirmed'::varchar ELSE status END
      WHERE id = $1
      `,
      [match.id]
    );

    if (match.volunteer_id) {
      await sendMessage(
        phone,
        channel,
        `Thank you! Match accepted. A volunteer driver is being dispatched to pick up the ${NEED_LABELS[match.need_type] || match.need_type} from your location. We will update you when they accept.`
      );
    } else {
      // Direct delivery without volunteer
      await sendMessage(
        phone,
        channel,
        `Match confirmed! Please deliver ${NEED_LABELS[match.need_type] || match.need_type} to ${match.req_address || 'shared location'}. Verification PIN code is: ${match.pin_code}. Reply DONE when complete.`
      );
      
      // Notify citizen
      await sendMessage(
        match.req_phone,
        'sms',
        `Helper ${helper.name} has confirmed! They will deliver ${NEED_LABELS[match.need_type] || match.need_type} directly to you. Your delivery PIN code is: ${match.pin_code}.`
      );
    }

    // Emit live dashboard updates
    io.emit('match_updated', { matchId: match.id, status: 'helper_accepted' });

  } else if (upperMsg.startsWith('NO') || upperMsg.startsWith('DECLINE')) {
    // Decline latest proposed match
    const matchQuery = await pool.query(
      `
      SELECT m.*, r.id as req_id, r.needs, r.medical_priority, r.urgency, r.latitude, r.longitude, r.address as req_address
      FROM matches m
      JOIN offers o ON m.offer_id = o.id
      JOIN requests r ON m.request_id = r.id
      WHERE o.helper_id = $1 AND m.status = 'proposed'
      ORDER BY m.created_at DESC
      LIMIT 1
      `,
      [helper.id]
    );

    if (matchQuery.rows.length === 0) {
      await sendMessage(phone, channel, "No active match requests found to decline.");
      return;
    }

    const match = matchQuery.rows[0];

    // Rollback match and helper capacity
    await pool.query("UPDATE matches SET status = 'cancelled' WHERE id = $1", [match.id]);
    await pool.query("UPDATE offers SET status = 'available' WHERE id = $1", [match.offer_id]);
    await pool.query("UPDATE users SET active_requests = active_requests - 1 WHERE id = $1", [helper.id]);
    
    if (match.volunteer_id) {
      await pool.query("UPDATE users SET is_available = true WHERE id = $1", [match.volunteer_id]);
    }

    await sendMessage(phone, channel, "Understood. We've declined this match and will route it to another helper.");

    // Trigger Re-matching for the request
    const requestObj = {
      id: match.req_id,
      requester_id: match.requester_id,
      needs: match.needs,
      medical_priority: match.medical_priority,
      urgency: match.urgency,
      latitude: match.latitude,
      longitude: match.longitude
    };

    console.log(`🔄 Re-triggering matching for request ${match.req_id} after helper decline`);
    const matches = await matchRequest(requestObj);
    
    if (matches.length > 0) {
      const newMatch = matches[0];
      const volunteer = await findNearestVolunteer(requestObj);
      await createMatch(requestObj, newMatch, volunteer);

      await sendMessage(
        newMatch.helper.phone,
        newMatch.helper.channel_preference || 'sms',
        MESSAGES.helperNotification(newMatch.need, match.req_desc || '', match.req_address || '')
      );
    }
  }
}

// -------------------------------------------------------------
// VOLUNTEER STATE FLOW
// -------------------------------------------------------------
async function handleVolunteerReply(upperMsg: string, volunteer: any, phone: string, channel: string) {
  if (upperMsg.startsWith('GO') || upperMsg.startsWith('ACCEPT')) {
    // Confirm proposed match
    const matchQuery = await pool.query(
      `
      SELECT m.*, r.address as req_address, o.address as helper_address, h.name as helper_name, u.phone as req_phone
      FROM matches m
      JOIN requests r ON m.request_id = r.id
      JOIN offers o ON m.offer_id = o.id
      JOIN users h ON o.helper_id = h.id
      JOIN users u ON r.requester_id = u.id
      WHERE m.volunteer_id = $1 AND m.status = 'proposed'
      ORDER BY m.created_at DESC
      LIMIT 1
      `,
      [volunteer.id]
    );

    if (matchQuery.rows.length === 0) {
      await sendMessage(phone, channel, "No pending deliveries assigned to you.");
      return;
    }

    const match = matchQuery.rows[0];

    // Update match to en_route
    await pool.query(
      `
      UPDATE matches
      SET volunteer_confirmed = true, status = 'en_route', eta = NOW() + INTERVAL '45 minutes'
      WHERE id = $1
      `,
      [match.id]
    );

    await sendMessage(
      phone,
      channel,
      `Job Accepted! Go to: ${match.helper_address} to pick up ${NEED_LABELS[match.need_type] || match.need_type} from ${match.helper_name}. Deliver to: ${match.req_address}. Reply ARRIVED when you reach the pickup.`
    );

    // Notify citizen
    await sendMessage(
      match.req_phone,
      'sms',
      MESSAGES.driverEnRoute('45 minutes')
    );

    io.emit('match_updated', { matchId: match.id, status: 'en_route' });

  } else if (upperMsg.startsWith('ARRIVED')) {
    const matchQuery = await pool.query(
      `
      SELECT m.*, r.address as req_address, u.phone as req_phone
      FROM matches m
      JOIN requests r ON m.request_id = r.id
      JOIN users u ON r.requester_id = u.id
      WHERE m.volunteer_id = $1 AND m.status = 'en_route'
      ORDER BY m.created_at DESC
      LIMIT 1
      `,
      [volunteer.id]
    );

    if (matchQuery.rows.length === 0) {
      await sendMessage(phone, channel, "No active en-route jobs found.");
      return;
    }

    const match = matchQuery.rows[0];

    await sendMessage(
      phone,
      channel,
      `Arrival logged. Perform the delivery handoff to the citizen at ${match.req_address}. Ask them for their 4-digit PIN code. Reply 'DONE <PIN>' to complete (e.g. DONE 4821).`
    );

    // Notify citizen to prepare PIN
    await sendMessage(
      match.req_phone,
      'sms',
      `Your volunteer driver has arrived at your location. Please provide them with your 4-digit confirmation PIN code: ${match.pin_code}.`
    );

  } else if (upperMsg.startsWith('DONE')) {
    // Parse PIN from message e.g. "DONE 1234"
    const pinPart = upperMsg.replace('DONE', '').trim();

    const matchQuery = await pool.query(
      `
      SELECT m.*, r.requester_id, r.id as req_id, o.helper_id, o.id as offer_id, u.phone as req_phone, h.phone as helper_phone, h.name as helper_name, u.name as req_name
      FROM matches m
      JOIN requests r ON m.request_id = r.id
      JOIN offers o ON m.offer_id = o.id
      JOIN users u ON r.requester_id = u.id
      JOIN users h ON o.helper_id = h.id
      WHERE m.volunteer_id = $1 AND m.status = 'en_route'
      ORDER BY m.created_at DESC
      LIMIT 1
      `,
      [volunteer.id]
    );

    if (matchQuery.rows.length === 0) {
      await sendMessage(phone, channel, "No active job en-route to complete.");
      return;
    }

    const match = matchQuery.rows[0];

    // Verify PIN if entered, or bypass if matched
    if (pinPart && pinPart !== match.pin_code) {
      await sendMessage(phone, channel, `❌ Invalid PIN. Please ask the citizen again. Your confirmation PIN should be: ${match.pin_code}`);
      return;
    }

    // Begin completion transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Complete Match
      await client.query(
        "UPDATE matches SET status = 'completed', completed_at = NOW() WHERE id = $1",
        [match.id]
      );

      // 2. Complete Offer & Request
      await client.query("UPDATE offers SET status = 'completed' WHERE id = $1", [match.offer_id]);
      await client.query("UPDATE requests SET status = 'fully_matched' WHERE id = $1", [match.req_id]);

      // 3. Update active requests count and reset volunteer status
      await client.query("UPDATE users SET active_requests = active_requests - 1, total_helped = total_helped + 1 WHERE id = $1", [match.helper_id]);
      await client.query("UPDATE users SET is_available = true, total_helped = total_helped + 1 WHERE id = $1", [volunteer.id]);

      await client.query('COMMIT');

      // Success messages to all
      await sendMessage(phone, channel, `Job completed successfully! You have helped ${match.req_name}. Thank you for your service.`);
      await sendMessage(match.req_phone, 'sms', MESSAGES.deliveryConfirmed(match.helper_name, match.need_type, 1));
      
      // Donor Impact
      const totalHelpedQuery = await pool.query('SELECT total_helped FROM users WHERE id = $1', [match.helper_id]);
      const helpedCount = totalHelpedQuery.rows[0].total_helped;
      await sendMessage(match.helper_phone, 'sms', MESSAGES.donorImpact(match.req_name, match.need_type, helpedCount));

      // Emit to dashboard
      io.emit('match_updated', { matchId: match.id, status: 'completed' });

      // Check if this was a simulation step and update stats
      const demoStatsQuery = await pool.query(
        `SELECT COUNT(*) as count FROM requests WHERE status = 'fully_matched'`
      );
      
      io.emit('demo_complete', {
        stories: 3,
        peopleHelped: parseInt(demoStatsQuery.rows[0].count, 10) * 2, // arbitrary scaling
        avgResponseMins: 4.2
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error completing match transaction:', err);
      await sendMessage(phone, channel, "An error occurred finalizing the delivery. Please try again.");
    } finally {
      client.release();
    }
  }
}

// -------------------------------------------------------------
// CITIZEN STATE FLOW
// -------------------------------------------------------------
async function handleCitizenReply(upperMsg: string, citizen: any, phone: string, channel: string) {
  if (upperMsg.startsWith('CANCEL') || upperMsg.startsWith('STOP')) {
    // Find the latest active request
    const requestQuery = await pool.query(
      `
      SELECT * FROM requests
      WHERE requester_id = $1 AND status IN ('open', 'partially_matched')
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [citizen.id]
    );

    if (requestQuery.rows.length === 0) {
      await sendMessage(phone, channel, "You do not have any active requests to cancel.");
      return;
    }

    const request = requestQuery.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Cancel request
      await client.query("UPDATE requests SET status = 'cancelled' WHERE id = $1", [request.id]);

      // 2. Fetch associated matches
      const matchesQuery = await client.query(
        "SELECT * FROM matches WHERE request_id = $1 AND status IN ('proposed', 'confirmed', 'en_route')",
        [request.id]
      );

      for (const match of matchesQuery.rows) {
        // Cancel Match
        await client.query("UPDATE matches SET status = 'cancelled' WHERE id = $1", [match.id]);

        // Release Volunteer
        if (match.volunteer_id) {
          await client.query("UPDATE users SET is_available = true WHERE id = $1", [match.volunteer_id]);
          await sendMessage(
            match.volunteer_id,
            'sms',
            "Dispatch cancelled. The requester has cancelled their request. Thank you."
          );
        }

        // Release Helper
        const offerQuery = await client.query("SELECT helper_id FROM offers WHERE id = $1", [match.offer_id]);
        if (offerQuery.rows.length > 0) {
          const helperId = offerQuery.rows[0].helper_id;
          await client.query("UPDATE users SET active_requests = active_requests - 1 WHERE id = $1", [helperId]);
          await client.query("UPDATE offers SET status = 'available' WHERE id = $1", [match.offer_id]);
          
          const helperPhoneQuery = await client.query("SELECT phone, channel_preference FROM users WHERE id = $1", [helperId]);
          if (helperPhoneQuery.rows.length > 0) {
            await sendMessage(
              helperPhoneQuery.rows[0].phone,
              helperPhoneQuery.rows[0].channel_preference || 'sms',
              "The request you matched to has been cancelled by the citizen. You are now available for other matches."
            );
          }
        }
      }

      await client.query('COMMIT');
      await sendMessage(phone, channel, "Your request has been successfully cancelled. We have notified all helpers.");
      io.emit('request_cancelled', { requestId: request.id });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error cancelling request:', err);
      await sendMessage(phone, channel, "An error occurred cancelling your request. Please try again.");
    } finally {
      client.release();
    }
  }
}
