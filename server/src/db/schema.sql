CREATE EXTENSION IF NOT EXISTS postgis;

-- Core users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('citizen','responder','helper','volunteer','org','admin')),
  organization VARCHAR(100),
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,
  location GEOMETRY(Point, 4326),
  help_categories TEXT[],
  capacity INT DEFAULT 1,
  active_requests INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_id_verified BOOLEAN DEFAULT false,
  is_face_verified BOOLEAN DEFAULT false,
  trust_tier INT DEFAULT 0 CHECK (trust_tier BETWEEN 0 AND 4),
  show_up_rate FLOAT DEFAULT 1.0,
  confirmation_rate FLOAT DEFAULT 1.0,
  response_speed_mins FLOAT DEFAULT 30.0,
  total_helped INT DEFAULT 0,
  medical_priority BOOLEAN DEFAULT false,
  special_notes TEXT,
  push_token TEXT,
  channel_preference VARCHAR(20) DEFAULT 'sms',
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW()
);

-- Every need request
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id),
  source_channel VARCHAR(20) NOT NULL,
  raw_message TEXT NOT NULL,
  needs TEXT[] NOT NULL,
  primary_need VARCHAR(50),
  description TEXT,
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,
  location GEOMETRY(Point, 4326),
  urgency INT CHECK (urgency BETWEEN 1 AND 5),
  is_emergency BOOLEAN DEFAULT false,
  medical_priority BOOLEAN DEFAULT false,
  quantity_description TEXT,
  time_sensitive BOOLEAN DEFAULT false,
  needed_by TIMESTAMP,
  disaster_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'open' CHECK (
    status IN ('open','partially_matched','fully_matched','resolved','cancelled','expired')
  ),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
);

-- Every help offer
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id UUID REFERENCES users(id),
  source_channel VARCHAR(20) NOT NULL,
  raw_message TEXT NOT NULL,
  help_type VARCHAR(50) NOT NULL,
  description TEXT,
  quantity_description TEXT,
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,
  location GEOMETRY(Point, 4326),
  available_from TIMESTAMP DEFAULT NOW(),
  available_until TIMESTAMP,
  dietary_tags TEXT[],
  auto_route_to_charity BOOLEAN DEFAULT true,
  charity_routed_at TIMESTAMP,
  special_conditions TEXT,
  status VARCHAR(20) DEFAULT 'available' CHECK (
    status IN ('available','matched','completed','auto_routed','expired')
  ),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Every match between request and offer
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id),
  offer_id UUID REFERENCES offers(id),
  volunteer_id UUID REFERENCES users(id),
  need_type VARCHAR(50) NOT NULL,
  match_score FLOAT NOT NULL,
  safety_score FLOAT DEFAULT 1.0,
  distance_km FLOAT,
  status VARCHAR(20) DEFAULT 'proposed' CHECK (
    status IN ('proposed','confirmed','en_route','completed','failed','cancelled')
  ),
  requester_confirmed BOOLEAN DEFAULT false,
  helper_confirmed BOOLEAN DEFAULT false,
  volunteer_confirmed BOOLEAN DEFAULT false,
  eta TIMESTAMP,
  completed_at TIMESTAMP,
  pin_code VARCHAR(4),
  address_stage INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Road segments with condition data
CREATE TABLE IF NOT EXISTS road_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id BIGINT,
  geometry GEOMETRY(LineString, 4326),
  name TEXT,
  base_weight FLOAT DEFAULT 1.0,
  ice_penalty FLOAT DEFAULT 0.0,
  debris_penalty FLOAT DEFAULT 0.0,
  last_report_time TIMESTAMP,
  report_count INT DEFAULT 0,
  condition VARCHAR(20) DEFAULT 'passable' CHECK (
    condition IN ('passable','icy','debris','blocked','unknown')
  ),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Resource nodes (shelters, food banks, etc)
CREATE TABLE IF NOT EXISTS resource_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,
  location GEOMETRY(Point, 4326),
  type VARCHAR(30) CHECK (type IN ('shelter','food_bank','hospital','pharmacy','church','charging_station','water_point','general')),
  has_power BOOLEAN DEFAULT false,
  has_food BOOLEAN DEFAULT false,
  has_heat BOOLEAN DEFAULT false,
  has_water BOOLEAN DEFAULT false,
  has_medical BOOLEAN DEFAULT false,
  capacity INT,
  current_occupancy INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_open BOOLEAN DEFAULT true,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Power grid circuits (for CrewIQ)
CREATE TABLE IF NOT EXISTS circuit_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_name TEXT,
  geometry GEOMETRY(LineString, 4326),
  is_outage BOOLEAN DEFAULT false,
  outage_start_time TIMESTAMP,
  population_affected INT DEFAULT 0,
  vulnerability_score FLOAT DEFAULT 0.0,
  failure_probability FLOAT DEFAULT 0.0,
  tree_cleared BOOLEAN DEFAULT false,
  electrical_restored BOOLEAN DEFAULT false,
  priority_score FLOAT DEFAULT 0.0,
  repair_complexity FLOAT DEFAULT 1.0,
  tree_canopy_density FLOAT DEFAULT 0.0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crew units for responder dispatch
CREATE TABLE IF NOT EXISTS crew_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  type VARCHAR(20) CHECK (type IN ('tree','electrical','emergency','medical','transport')),
  latitude FLOAT,
  longitude FLOAT,
  location GEOMETRY(Point, 4326),
  status VARCHAR(20) DEFAULT 'available' CHECK (
    status IN ('available','en_route','on_site','done','offline')
  ),
  current_job_id UUID,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Jobs for crew dispatch
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_segment_id UUID REFERENCES circuit_segments(id),
  priority_score FLOAT NOT NULL,
  required_crew_type VARCHAR(20),
  assigned_crew_id UUID REFERENCES crew_units(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending','in_progress','blocked','complete','cancelled')
  ),
  blocking_job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- All messages in and out
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  direction VARCHAR(10) CHECK (direction IN ('inbound','outbound')),
  channel VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  twilio_sid VARCHAR(50),
  request_id UUID REFERENCES requests(id),
  match_id UUID REFERENCES matches(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crowd reports from citizens
CREATE TABLE IF NOT EXISTS crowd_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id),
  latitude FLOAT,
  longitude FLOAT,
  location GEOMETRY(Point, 4326),
  report_text TEXT,
  urgency_level INT CHECK (urgency_level BETWEEN 1 AND 5),
  hazard_type VARCHAR(30) CHECK (
    hazard_type IN ('ice','debris','blocked','crash','flooding','power_line','medical','other')
  ),
  confidence FLOAT DEFAULT 0.8,
  road_segment_id UUID REFERENCES road_segments(id),
  confirmation_count INT DEFAULT 0,
  channel VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '2 hours'
);

-- Ghost mode detections
CREATE TABLE IF NOT EXISTS vulnerability_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detection_type VARCHAR(30) CHECK (
    detection_type IN ('phone_silent','social_concern','utility_anomaly','neighbor_report')
  ),
  latitude FLOAT,
  longitude FLOAT,
  location GEOMETRY(Point, 4326),
  address TEXT,
  confidence FLOAT,
  raw_signal TEXT,
  welfare_check_dispatched BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Impact and stats
CREATE TABLE IF NOT EXISTS impact_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE DEFAULT CURRENT_DATE,
  city VARCHAR(100),
  disaster_type VARCHAR(50),
  total_requests INT DEFAULT 0,
  total_matched INT DEFAULT 0,
  total_resolved INT DEFAULT 0,
  people_helped INT DEFAULT 0,
  avg_response_time_mins FLOAT,
  meals_rescued INT DEFAULT 0,
  circuits_restored INT DEFAULT 0,
  welfare_checks_dispatched INT DEFAULT 0
);

-- Activity log for dashboard feed
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  title TEXT,
  description TEXT,
  metadata JSONB,
  latitude FLOAT,
  longitude FLOAT,
  urgency INT DEFAULT 1,
  channel VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
