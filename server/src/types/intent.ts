export interface ExtractedIntent {
  signal_type: 'need_request' | 'help_offer' | 'volunteer_available' | 'confirmation' | 'cancellation' | 'status_check' | 'road_report' | 'unknown';
  needs: string[];
  primary_need: string | null;
  help_type: string | null;
  description: string;
  quantity_description: string | null;
  address: string | null;
  urgency: number; // 1-5
  is_emergency: boolean;
  medical_priority: boolean;
  hazard_type: 'ice' | 'debris' | 'blocked' | 'crash' | 'flooding' | 'power_line' | 'other' | null;
  dietary_tags: string[];
  confidence: number;
  reply_needed: boolean;
}
