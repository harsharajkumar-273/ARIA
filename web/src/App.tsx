import { useState, useEffect } from 'react';
import { Shield, Sparkles, LogOut, Key, UserCheck } from 'lucide-react';
import { useSocket } from './hooks/useSocket';
import { StatsBar } from './dashboard/StatsBar';
import { LiveMap } from './dashboard/LiveMap';
import { ActivityFeed } from './dashboard/ActivityFeed';
import type { Activity as ActivityType } from './dashboard/ActivityFeed';
import { SubmitForm } from './dashboard/SubmitForm';
import { DemoButton } from './dashboard/DemoButton';

export default function App() {
  const { socket, connected } = useSocket();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [badgeId, setBadgeId] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('dispatcher');
  const [loginError, setLoginError] = useState('');

  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [crews, setCrews] = useState<any[]>([]);
  const [circuits, setCircuits] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);

  // Toggles for Map Layers
  const [showCrewIQ, setShowCrewIQ] = useState(true);
  const [showMLHeatmap, setShowMLHeatmap] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalMatched: 0,
    peopleHelped: 0,
    circuitsRestored: 0
  });

  // Handle Login Validation
  const handleLogin = () => {
    if (!badgeId.trim()) {
      setLoginError('Please enter a valid Badge ID.');
      return;
    }
    if (pin === '9999' || pin === '1111' || pin === '0000') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid Access PIN. Use a Demo Auto-Fill below for instant login.');
    }
  };

  // Local Mock Signal Inbound Injector
  const handleLocalInject = (body: string, phone: string, channel: string) => {
    // 1. Add to activity feed
    const mockActivity: ActivityType = {
      id: Math.random().toString(),
      event_type: 'new_message',
      title: `Mock Message: ${phone}`,
      description: body,
      urgency: body.toLowerCase().includes('scared') || body.toLowerCase().includes('emergency') ? 4 : 2,
      channel: channel,
      created_at: new Date().toISOString()
    };
    setActivities((prev) => [mockActivity, ...prev]);

    // 2. Add to active requests
    const newReq = {
      id: 'req-' + Math.random().toString(36).substr(2, 5),
      raw_message: body,
      medical_priority: body.toLowerCase().includes('scared') || body.toLowerCase().includes('medicine'),
      source_channel: channel,
      latitude: 36.1627 + (Math.random() - 0.5) * 0.05,
      longitude: -86.7816 + (Math.random() - 0.5) * 0.05
    };
    setRequests((prev) => [newReq, ...prev]);

    // 3. Update stats
    setStats((prev) => ({
      ...prev,
      totalRequests: prev.totalRequests + 1
    }));
  };

  // Local Demo Scenario Simulator
  const handleLocalDemoRun = () => {
    // Clear previous requests
    setRequests([]);

    // Step 1: Citizen SOS
    const sms = "I am 78 years old no food since yesterday no heat I cannot leave my apartment I am very scared";
    handleLocalInject(sms, "+15559990001", "sms");

    // Step 2: Matches Dispatch (after 3 seconds)
    setTimeout(() => {
      const matchActivity: ActivityType = {
        id: Math.random().toString(),
        event_type: 'match_created',
        title: 'Need Matched (Local Sim)',
        description: 'Matched food, shelter, and warmth with Faith Community Center.',
        urgency: 3,
        created_at: new Date().toISOString()
      };
      setActivities((prev) => [matchActivity, ...prev]);

      const volunteerMsg: ActivityType = {
        id: Math.random().toString(),
        event_type: 'new_message',
        title: '[MOCK SMS] to +15551003003',
        description: 'New job: deliver food to Nashville Area. Reply GO to accept.',
        urgency: 2,
        channel: 'sms',
        created_at: new Date().toISOString()
      };
      setActivities((prev) => [volunteerMsg, ...prev]);

      setStats((prev) => ({
        ...prev,
        totalMatched: prev.totalMatched + 3,
        totalRequests: 0
      }));
    }, 3000);

    // Step 3: Delivery Confirmation (after 6 seconds)
    setTimeout(() => {
      const deliveryActivity: ActivityType = {
        id: Math.random().toString(),
        event_type: 'demo_complete',
        title: 'Crisis Cleared (Local Sim)',
        description: 'Citizen +15559990001 safe. 3 matches resolved. Trust tier upgraded to 4.',
        urgency: 5,
        created_at: new Date().toISOString()
      };
      setActivities((prev) => [deliveryActivity, ...prev]);

      // Update crews
      setCrews([
        { id: 1, name: 'NES Tree Crew A', type: 'tree', status: 'completed', latitude: 36.1724, longitude: -86.7621 },
        { id: 2, name: 'NES Electrical Team 3', type: 'electrical', status: 'idle', latitude: 36.1502, longitude: -86.7854 }
      ]);

      // Update circuits
      setCircuits([
        { id: 1, circuit_name: 'Circ 4A - Downtown', is_outage: false, priority_score: 0.0, failure_probability: 0.05, path: [[36.1627, -86.7816], [36.1502, -86.7854]] },
        { id: 2, circuit_name: 'Circ 8 - East Nashville', is_outage: false, priority_score: 1.5, failure_probability: 0.12, path: [[36.1889, -86.7442], [36.1754, -86.7588]] }
      ]);

      setStats((prev) => ({
        ...prev,
        peopleHelped: prev.peopleHelped + 1,
        circuitsRestored: prev.circuitsRestored + 1
      }));
    }, 6000);
  };

  // Local Demo Reset
  const handleLocalDemoReset = () => {
    setRequests([]);
    setActivities([]);
    setCrews([
      { id: 1, name: 'NES Tree Crew A', type: 'tree', status: 'en_route', latitude: 36.1724, longitude: -86.7621 },
      { id: 2, name: 'NES Electrical Team 3', type: 'electrical', status: 'idle', latitude: 36.1502, longitude: -86.7854 }
    ]);
    setCircuits([
      { id: 1, circuit_name: 'Circ 4A - Downtown', is_outage: true, priority_score: 9.2, failure_probability: 0.88, path: [[36.1627, -86.7816], [36.1502, -86.7854]] },
      { id: 2, circuit_name: 'Circ 8 - East Nashville', is_outage: false, priority_score: 1.5, failure_probability: 0.12, path: [[36.1889, -86.7442], [36.1754, -86.7588]] }
    ]);
    setStats({
      totalRequests: 2,
      totalMatched: 4,
      peopleHelped: 54,
      circuitsRestored: 2
    });
  };

  // Fetch initial data from server (with robust mock fallbacks for live GitHub Pages)
  const fetchInitialData = async () => {
    try {
      const urls = [
        'http://localhost:3000/api/stats',
        'http://localhost:3000/api/resources',
        'http://localhost:3000/api/requests',
        'http://localhost:3000/api/crews',
        'http://localhost:3000/api/circuits'
      ];

      const [statsRes, resRes, reqRes, crewRes, circRes] = await Promise.all(
        urls.map((url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null))
      );

      if (statsRes) {
        setStats(statsRes);
      } else {
        setStats({
          totalRequests: 2,
          totalMatched: 4,
          peopleHelped: 54,
          circuitsRestored: 2
        });
      }

      if (resRes) {
        setResources(resRes);
      } else {
        setResources([
          { id: 1, name: 'Vanderbilt Medical Center', type: 'hospital', latitude: 36.1432, longitude: -86.8005, has_power: true, has_food: true, has_water: true },
          { id: 2, name: 'East Nashville Shelter', type: 'shelter', latitude: 36.1889, longitude: -86.7442, has_power: false, has_food: true, has_water: true },
          { id: 3, name: 'Nashville Food Bank', type: 'food_bank', latitude: 36.1555, longitude: -86.7725, has_power: true, has_food: true, has_water: false }
        ]);
      }

      if (reqRes && reqRes.length > 0) {
        setRequests(reqRes);
      } else {
        setRequests([
          { id: 'req-1', raw_message: 'Elderly resident needs medicine delivery near Edgehill', medical_priority: true, source_channel: 'sms', latitude: 36.1382, longitude: -86.7905 },
          { id: 'req-2', raw_message: 'Large tree limbs blocking road on Main St', medical_priority: false, source_channel: 'whatsapp', latitude: 36.1754, longitude: -86.7588 }
        ]);
      }

      if (crewRes && crewRes.length > 0) {
        setCrews(crewRes);
      } else {
        setCrews([
          { id: 1, name: 'NES Tree Crew A', type: 'tree', status: 'en_route', latitude: 36.1724, longitude: -86.7621 },
          { id: 2, name: 'NES Electrical Team 3', type: 'electrical', status: 'idle', latitude: 36.1502, longitude: -86.7854 }
        ]);
      }

      if (circRes && circRes.length > 0) {
        setCircuits(circRes);
      } else {
        setCircuits([
          { id: 1, circuit_name: 'Circ 4A - Downtown', is_outage: true, priority_score: 9.2, failure_probability: 0.88, path: [[36.1627, -86.7816], [36.1502, -86.7854]] },
          { id: 2, circuit_name: 'Circ 8 - East Nashville', is_outage: false, priority_score: 1.5, failure_probability: 0.12, path: [[36.1889, -86.7442], [36.1754, -86.7588]] }
        ]);
      }
    } catch (err) {
      console.error('Error fetching initial dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // Handle inbound messages
    socket.on('new_message', (data: any) => {
      console.log('Socket message:', data);
      const newActivity: ActivityType = {
        id: Math.random().toString(),
        event_type: 'new_message',
        title: `Message: ${data.user?.name || 'Inbound'}`,
        description: data.body,
        urgency: data.intent?.urgency || 1,
        channel: data.channel,
        created_at: new Date().toISOString()
      };

      setActivities((prev) => [newActivity, ...prev]);

      if (data.intent?.signal_type === 'need_request') {
        fetchInitialData();
      }
    });

    // Handle match creation
    socket.on('match_created', (data: any) => {
      const newActivity: ActivityType = {
        id: Math.random().toString(),
        event_type: 'match_created',
        title: 'Need Matched',
        description: `Matched ${data.needType} for request. Volunteer dispatched.`,
        urgency: 3,
        created_at: new Date().toISOString()
      };
      setActivities((prev) => [newActivity, ...prev]);
      fetchInitialData();
    });

    // Handle offers
    socket.on('offer_created', (data: any) => {
      const newActivity: ActivityType = {
        id: Math.random().toString(),
        event_type: 'offer_created',
        title: 'New Aid Offer',
        description: `Helper offered ${data.offer?.help_type}: "${data.offer?.description}"`,
        urgency: 2,
        created_at: new Date().toISOString()
      };
      setActivities((prev) => [newActivity, ...prev]);
      fetchInitialData();
    });

    // Handle road hazard reports
    socket.on('road_report', (data: any) => {
      const newActivity: ActivityType = {
        id: Math.random().toString(),
        event_type: 'road_report',
        title: 'Road Hazard Reported',
        description: `${data.report?.hazard_type.toUpperCase()} reported: "${data.report?.report_text}"`,
        urgency: 4,
        created_at: new Date().toISOString()
      };
      setActivities((prev) => [newActivity, ...prev]);
      fetchInitialData();
    });

    // Handle simulation demo steps
    socket.on('demo_step', (data: any) => {
      const newActivity: ActivityType = {
        id: Math.random().toString(),
        event_type: 'demo_step',
        title: `Demo: Signal Injected`,
        description: `[Phone: *${data.phone}] "${data.message}"`,
        urgency: 3,
        channel: data.channel,
        created_at: new Date().toISOString()
      };
      setActivities((prev) => [newActivity, ...prev]);
    });

    // Handle demo completion
    socket.on('demo_complete', (data: any) => {
      const newActivity: ActivityType = {
        id: Math.random().toString(),
        event_type: 'demo_complete',
        title: 'Demo Scenario Complete',
        description: `Simulated ${data.stories} stories. Resolved needs for ${data.peopleHelped} people.`,
        urgency: 5,
        created_at: new Date().toISOString()
      };
      setActivities((prev) => [newActivity, ...prev]);
      fetchInitialData();
    });

    return () => {
      socket.off('new_message');
      socket.off('match_created');
      socket.off('offer_created');
      socket.off('road_report');
      socket.off('demo_step');
      socket.off('demo_complete');
    };
  }, [socket]);

  // Generate synthetic ML predictions for map when toggled
  useEffect(() => {
    if (showMLHeatmap) {
      const mockPredictions = [
        { circuit_name: 'Circ 4A - Downtown', latitude: 36.1627, longitude: -86.7816, probability: 0.88 },
        { circuit_name: 'Circ 12 - Oak Hill', latitude: 36.1138, longitude: -86.7740, probability: 0.65 },
        { circuit_name: 'Circ 8 - East Nashville', latitude: 36.1889, longitude: -86.8142, probability: 0.42 }
      ];
      setPredictions(mockPredictions);
    } else {
      setPredictions([]);
    }
  }, [showMLHeatmap]);

  // Render Login portal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060814] text-gray-100 flex items-center justify-center p-4 overflow-hidden relative font-sans">
        {/* Decorative ambient gradient blobs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none"></div>

        {/* Tech grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo Brand Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-gradient-to-tr from-red-600 to-amber-500 rounded-3xl shadow-xl shadow-red-500/20 border border-white/10 mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-red-400 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              ARIA COMMAND
            </h1>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase mt-1.5 font-bold">
              Crisis Coordination Dashboard
            </p>
          </div>

          {/* Login Card Container */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-base font-bold mb-6 text-center text-gray-300 tracking-wide uppercase flex items-center justify-center gap-2">
              <Key className="w-4 h-4 text-amber-400" /> Operator Authorization
            </h2>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl mb-4 text-center">
                ⚠️ {loginError}
              </div>
            )}

            <div className="space-y-5">
              {/* Role SELECTOR */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-2 uppercase tracking-wider">Operator Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dispatcher', label: 'Admin' },
                    { id: 'responder', label: 'Crew Lead' },
                    { id: 'volunteer', label: 'Volunteer' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`py-2.5 rounded-xl border text-[11px] font-bold transition duration-200 ${
                        role === r.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badge ID Input */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-2 uppercase tracking-wider">Badge ID / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. ADMIN-NASH"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white placeholder-gray-600 transition"
                />
              </div>

              {/* Access PIN Input */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-2 uppercase tracking-wider">Access PIN</label>
                <input
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white placeholder-gray-600 text-center tracking-widest transition"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleLogin}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-xs font-black rounded-xl shadow-lg shadow-red-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0 tracking-wider uppercase"
              >
                Initialize Command Session
              </button>
            </div>

            {/* Quick Demo Credentials */}
            <div className="mt-8 border-t border-white/5 pt-6">
              <p className="text-[9px] font-bold text-gray-500 tracking-widest uppercase text-center mb-3 flex items-center justify-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-500/70" /> Demo Credentials Quick Auto-Fill
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { name: 'City Coordinator (Admin)', badge: 'ADMIN-NASH', pin: '9999', role: 'dispatcher' },
                  { name: 'NES Field Crew (Responder)', badge: 'CREW-DISP', pin: '1111', role: 'responder' }
                ].map((demo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setBadgeId(demo.badge);
                      setPin(demo.pin);
                      setRole(demo.role);
                      setLoginError('');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition text-left"
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-300">{demo.name}</div>
                      <div className="text-[10px] text-gray-500">Badge: {demo.badge} | PIN: {demo.pin}</div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col p-4 md:p-6 gap-6 font-sans">
      {/* Top Navigation / Brand */}
      <header className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/20 border border-purple-400/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider text-white">ARIA</h1>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-0.5">
                <Sparkles className="w-2 h-2 fill-purple-400" /> COORDINATION LAYER
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase">
              Automated Response &amp; Intelligence Agent
            </p>
          </div>
        </div>

        {/* Filters / Toggles */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
            <input
              type="checkbox"
              id="crewIQTog"
              checked={showCrewIQ}
              onChange={(e) => setShowCrewIQ(e.target.checked)}
              className="accent-purple-500 rounded border-white/10"
            />
            <label htmlFor="crewIQTog" className="text-xs font-semibold text-gray-300 cursor-pointer">
              CrewIQ Grid Layer
            </label>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
            <input
              type="checkbox"
              id="mlHeatTog"
              checked={showMLHeatmap}
              onChange={(e) => setShowMLHeatmap(e.target.checked)}
              className="accent-purple-500 rounded border-white/10"
            />
            <label htmlFor="mlHeatTog" className="text-xs font-semibold text-gray-300 cursor-pointer">
              ML Outage Heatmap
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} inline-block`}></span>
            <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
              {connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setBadgeId('');
              setPin('');
            }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Stats counters */}
      <StatsBar stats={stats} />

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-10 gap-6 min-h-[500px]">
        {/* Leaflet Live Map */}
        <section className="lg:col-span-7 h-[600px] lg:h-auto">
          <LiveMap
            requests={requests}
            resources={resources}
            crews={crews}
            circuits={circuits}
            predictions={predictions}
            showCrewIQ={showCrewIQ}
            showMLHeatmap={showMLHeatmap}
          />
        </section>

        {/* Feeds / Submissions */}
        <section className="lg:col-span-3 flex flex-col gap-6">
          {/* Live incidents log */}
          <div className="glass-panel p-5 rounded-2xl flex-1 max-h-[350px] overflow-hidden">
            <ActivityFeed activities={activities} />
          </div>

          {/* Simulate inbound requests manually */}
          <div className="glass-panel p-5 rounded-2xl">
            <SubmitForm onLocalInject={handleLocalInject} />
          </div>

          {/* Quick story runners */}
          <div className="glass-panel p-4 rounded-2xl border border-red-500/10 bg-red-950/5">
            <DemoButton onLocalRun={handleLocalDemoRun} onLocalReset={handleLocalDemoReset} />
          </div>
        </section>
      </main>
    </div>
  );
}
