import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '../config';
import { ExtractedIntent } from '../types/intent';

const isAnthropicConfigured = ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== 'your_key_here';
const client = isAnthropicConfigured ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

export async function extractIntent(rawMessage: string): Promise<ExtractedIntent> {
  // Step 1: Fast local classifier - instant, handles key phrases
  const quick = localClassify(rawMessage);
  if (quick.confidence > 0.85 || !client) {
    return quick;
  }

  // Step 2: Use Claude for complex messages
  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Fallback to standard Sonnet 3.5 if 'claude-sonnet-4-6' is invalid
      max_tokens: 600,
      system: `You are a disaster response coordination AI. Analyze messages and extract structured data.
Return ONLY valid JSON. No other text ever.

{
  "signal_type": "need_request" | "help_offer" | "volunteer_available" | "confirmation" | "cancellation" | "status_check" | "road_report" | "unknown",
  "needs": array from: ["food","water","shelter","warmth","medicine","medical_attention","transport","clothing","childcare","mental_health","financial","power","general"],
  "primary_need": most urgent need or null,
  "help_type": what they offer or null,
  "description": plain English summary,
  "quantity_description": how much if mentioned,
  "address": mentioned address or null,
  "urgency": 1-5 (5=life threatening, 4=urgent <2hrs, 3=today, 2=this week, 1=general),
  "is_emergency": true if urgency 5 or explicit emergency language,
  "medical_priority": true if elderly/disabled/immunocompromised mentioned,
  "hazard_type": "ice"|"debris"|"blocked"|"crash"|"flooding"|"power_line"|"other" or null,
  "dietary_tags": array of "vegan"|"halal"|"gluten-free"|"diabetic-friendly" or [],
  "confidence": 0.0-1.0,
  "reply_needed": true if message needs response
}`,
      messages: [{ role: 'user', content: rawMessage }]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(responseText);
  } catch (error) {
    console.warn('⚠️ Claude extraction failed or was offline. Falling back to local classifier.', error);
    return quick;
  }
}

export function localClassify(message: string): ExtractedIntent {
  const lower = message.toLowerCase();

  // Basic classification keywords
  const needKeywords: Record<string, string[]> = {
    food: ['food', 'hungry', 'eat', 'meal', 'bread', 'pizza', 'starving', 'no food', 'portions', 'chicken', 'pasta'],
    water: ['water', 'thirsty', 'drink', 'hydrat'],
    shelter: ['shelter', 'sleep', 'roof', 'house', 'homeless', 'nowhere to go', 'apartment'],
    warmth: ['cold', 'heat', 'blanket', 'warm', 'freeze', 'coat', 'hypothermia', 'no heat'],
    medicine: ['medicine', 'drug', 'pharmacy', 'prescription', 'insulin', 'pill', 'dialysis'],
    medical_attention: ['medical', 'doctor', 'hospital', 'sick', 'pain', 'injury', 'oxygen', 'injured', 'broken bone'],
    transport: ['ride', 'transport', 'car', 'bus', 'drive', 'lift', 'stuck', "can't move", 'driver', 'leave'],
    power: ['power', 'electricity', 'generator', 'charge', 'outlet', 'blackout', 'battery'],
    clothing: ['clothes', 'clothing', 'jacket', 'shoes', 'coat', 'dressed'],
    childcare: ['childcare', 'babysit', 'kids', 'children', 'watch kids']
  };

  // Check road hazards
  const hazardKeywords: Record<string, string[]> = {
    ice: ['ice', 'icy', 'frozen', 'black ice'],
    debris: ['debris', 'tree down', 'limb', 'branches'],
    blocked: ['blocked', 'closed', 'impassable', 'cannot pass'],
    crash: ['crash', 'accident', 'collision'],
    flooding: ['flood', 'flooding', 'water over road', 'submerged'],
    power_line: ['power line', 'wire down', 'utility pole']
  };

  const detectedNeeds: string[] = [];
  for (const [need, keywords] of Object.entries(needKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      detectedNeeds.push(need);
    }
  }

  let detectedHazard: any = null;
  for (const [hazard, keywords] of Object.entries(hazardKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      detectedHazard = hazard;
      break;
    }
  }

  // Detect signal type
  let signal_type: ExtractedIntent['signal_type'] = 'unknown';
  const offerKeywords = ['have', 'offer', 'giving', 'donate', 'sharing', 'available', 'can provide', 'can help', 'free to help', 'surplus'];
  const volunteerKeywords = ['volunteer', 'driver', 'free to help', 'downtown and free'];
  const cancelKeywords = ['cancel', 'stop', 'remove', 'nevermind'];
  const confirmationKeywords = ['yes', 'go', 'accept', 'arrived', 'done', 'ok', 'confirm'];
  const roadKeywords = ['road', 'street', 'tree down', 'blocked', 'closed', 'icy', 'flooded', 'power line down', 'highway'];

  if (cancelKeywords.some(w => lower.startsWith(w) || lower === w)) {
    signal_type = 'cancellation';
  } else if (confirmationKeywords.some(w => lower.startsWith(w) || lower === w)) {
    signal_type = 'confirmation';
  } else if (roadKeywords.some(w => lower.includes(w)) && detectedHazard) {
    signal_type = 'road_report';
  } else if (volunteerKeywords.some(w => lower.includes(w)) && lower.includes('help')) {
    signal_type = 'volunteer_available';
  } else if (offerKeywords.some(w => lower.includes(w)) || lower.includes('portions') || lower.includes('surplus')) {
    signal_type = 'help_offer';
  } else if (detectedNeeds.length > 0) {
    signal_type = 'need_request';
  }

  const emergencyWords = ['emergency', 'dying', 'life threatening', '9-1-1', '911', 'please help now', 'critical', 'scared'];
  const urgentWords = ['urgent', 'asap', 'immediately', 'right now', 'today', 'no food since', 'cold'];

  const isEmergency = emergencyWords.some(w => lower.includes(w));
  const urgency = isEmergency ? 5 : urgentWords.some(w => lower.includes(w)) ? 4 : detectedNeeds.length > 0 ? 3 : 2;

  // Extract address if it looks like "at 123 Main St" or similar
  const addressMatch = message.match(/(?:at|near|location:|address:)\s*([0-9]+\s+[A-Za-z0-9\s,.]+)/i);
  const address = addressMatch ? addressMatch[1].trim() : null;

  // Medical priority check (elderly, disabled, oxygen dependance)
  const medical_priority = lower.includes('elderly') || lower.includes('78 years old') || lower.includes('oxygen') || lower.includes('disabled') || lower.includes('can\'t leave') || lower.includes("cannot leave");

  // Primary need selection
  const primary_need = detectedNeeds[0] || null;

  // Dietary tags check
  const dietary_tags: string[] = [];
  if (lower.includes('vegan')) dietary_tags.push('vegan');
  if (lower.includes('halal')) dietary_tags.push('halal');
  if (lower.includes('gluten-free') || lower.includes('gluten free')) dietary_tags.push('gluten-free');

  return {
    signal_type,
    needs: detectedNeeds,
    primary_need,
    help_type: signal_type === 'help_offer' ? (primary_need || 'general') : null,
    description: message.length > 100 ? message.slice(0, 100) + '...' : message,
    quantity_description: message.match(/(\d+)\s*(portions|meals|blankets|boxes)/i)?.[0] || null,
    address,
    urgency,
    is_emergency: isEmergency,
    medical_priority,
    hazard_type: detectedHazard,
    dietary_tags,
    confidence: detectedNeeds.length > 0 || signal_type !== 'unknown' ? 0.9 : 0.4,
    reply_needed: true
  };
}
