-- Resource nodes
INSERT INTO resource_nodes (name, address, latitude, longitude, location, type, has_power, has_food, has_heat, has_water, capacity, is_verified, is_open) VALUES
('City Emergency Shelter', '500 Main St', 36.1289, -86.7740, ST_SetSRID(ST_MakePoint(-86.7740, 36.1289), 4326), 'shelter', true, true, true, true, 200, true, true),
('Community Food Bank', '331 Oak Ave', 36.1889, -86.8142, ST_SetSRID(ST_MakePoint(-86.8142, 36.1889), 4326), 'food_bank', true, true, false, true, 0, true, true),
('Community Health Clinic', '120 Health Blvd', 36.1671, -86.7784, ST_SetSRID(ST_MakePoint(-86.7784, 36.1671), 4326), 'hospital', true, false, true, true, 50, true, true),
('Faith Community Center', '1012 Church St', 36.1631, -86.7929, ST_SetSRID(ST_MakePoint(-86.7929, 36.1631), 4326), 'church', true, true, true, true, 100, true, true),
('Central Pharmacy', '2414 Market St', 36.2011, -86.7540, ST_SetSRID(ST_MakePoint(-86.7540, 36.2011), 4326), 'pharmacy', true, false, false, false, 0, true, true),
('Charging Station Hub', '340 Power Ave', 36.1750, -86.7600, ST_SetSRID(ST_MakePoint(-86.7600, 36.1750), 4326), 'charging_station', true, false, true, false, 0, true, true);

-- Helper organizations
INSERT INTO users (name, phone, role, organization, latitude, longitude, location, help_categories, capacity, trust_tier, is_id_verified) VALUES
('City Food Bank', '+15551001001', 'org', 'City Food Bank', 36.1889, -86.8142, ST_SetSRID(ST_MakePoint(-86.8142, 36.1889), 4326), ARRAY['food','water'], 50, 4, true),
('Community Shelter', '+15551001002', 'org', 'Community Shelter', 36.1138, -86.7740, ST_SetSRID(ST_MakePoint(-86.7740, 36.1138), 4326), ARRAY['shelter','warmth','food'], 30, 4, true),
('Community Health Van', '+15551001003', 'org', 'Community Health Van', 36.1671, -86.7784, ST_SetSRID(ST_MakePoint(-86.7784, 36.1671), 4326), ARRAY['medical','medicine'], 10, 4, true),
('Mutual Aid Network', '+15551001004', 'org', 'Mutual Aid Network', 36.1500, -86.7800, ST_SetSRID(ST_MakePoint(-86.7800, 36.1500), 4326), ARRAY['food','clothing','transport'], 20, 3, true),
('Faith Community Center', '+15551001005', 'org', 'Faith Community Center', 36.1631, -86.7929, ST_SetSRID(ST_MakePoint(-86.7929, 36.1631), 4326), ARRAY['shelter','food','warmth','clothing'], 40, 4, true);

-- Individual helpers
INSERT INTO users (name, phone, role, latitude, longitude, location, help_categories, capacity, trust_tier) VALUES
('Maria K.', '+15551002001', 'helper', 36.1935, -86.7367, ST_SetSRID(ST_MakePoint(-86.7367, 36.1935), 4326), ARRAY['food','transport'], 3, 2),
('David L.', '+15551002002', 'helper', 36.1785, -86.7557, ST_SetSRID(ST_MakePoint(-86.7557, 36.1785), 4326), ARRAY['medicine','medical'], 2, 2),
('Sarah J.', '+15551002003', 'helper', 36.1450, -86.8027, ST_SetSRID(ST_MakePoint(-86.8027, 36.1450), 4326), ARRAY['transport','childcare'], 4, 2);

-- Volunteer drivers
INSERT INTO users (name, phone, role, latitude, longitude, location, is_available, trust_tier) VALUES
('James T.', '+15551003001', 'volunteer', 36.1500, -86.7800, ST_SetSRID(ST_MakePoint(-86.7800, 36.1500), 4326), true, 3),
('Priya M.', '+15551003002', 'volunteer', 36.1600, -86.7600, ST_SetSRID(ST_MakePoint(-86.7600, 36.1600), 4326), true, 2),
('Carlos R.', '+15551003003', 'volunteer', 36.1700, -86.7900, ST_SetSRID(ST_MakePoint(-86.7900, 36.1700), 4326), true, 2);

-- Crew units
INSERT INTO crew_units (name, type, latitude, longitude, location, status) VALUES
('Tree Crew Alpha', 'tree', 36.1600, -86.7700, ST_SetSRID(ST_MakePoint(-86.7700, 36.1600), 4326), 'available'),
('Tree Crew Beta', 'tree', 36.1700, -86.7600, ST_SetSRID(ST_MakePoint(-86.7600, 36.1700), 4326), 'available'),
('NES Electrical 1', 'electrical', 36.1500, -86.7800, ST_SetSRID(ST_MakePoint(-86.7800, 36.1500), 4326), 'available'),
('NES Electrical 2', 'electrical', 36.1800, -86.7500, ST_SetSRID(ST_MakePoint(-86.7500, 36.1800), 4326), 'available'),
('Emergency Medical 1', 'medical', 36.1650, -86.7750, ST_SetSRID(ST_MakePoint(-86.7750, 36.1650), 4326), 'available');
