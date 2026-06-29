import { useState, useEffect } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { useSocket } from './hooks/useSocket';
import { StatsBar } from './dashboard/StatsBar';
import { LiveMap } from './dashboard/LiveMap';
import { ActivityFeed } from './dashboard/ActivityFeed';
import type { Activity as ActivityType } from './dashboard/ActivityFeed';
import { SubmitForm } from './dashboard/SubmitForm';
import { DemoButton } from './dashboard/DemoButton';

export default function App() {
  const { socket, connected } = useSocket();

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

  // Fetch initial data from server
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
        urls.map((url) => fetch(url).then((r) => (r.ok ? r.json() : null)))
      );

      if (statsRes) setStats(statsRes);
      if (resRes) setResources(resRes);
      if (reqRes) setRequests(reqRes);
      if (crewRes) setCrews(crewRes);
      if (circRes) setCircuits(circRes);
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
        title: `Message: ${data.user.name}`,
        description: data.body,
        urgency: data.intent.urgency || 1,
        channel: data.channel,
        created_at: new Date().toISOString()
      };

      setActivities((prev) => [newActivity, ...prev]);

      // If it is a need request, add to requests array
      if (data.intent.signal_type === 'need_request') {
        fetchInitialData(); // Re-fetch to ensure synced database state
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
        description: `Helper offered ${data.offer.help_type}: "${data.offer.description}"`,
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
        description: `${data.report.hazard_type.toUpperCase()} reported: "${data.report.report_text}"`,
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
      // Mock ML XGBoost failure zone outputs
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

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col p-4 md:p-6 gap-6">
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
        <div className="flex items-center gap-4">
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
            <span className="text-[10px] font-bold text-gray-400 tracking-wider">
              {connected ? 'SYSTEM ONLINE' : 'CONNECTION OFFLINE'}
            </span>
          </div>
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
            <SubmitForm />
          </div>

          {/* Quick story runners */}
          <div className="glass-panel p-4 rounded-2xl border border-red-500/10 bg-red-950/5">
            <DemoButton />
          </div>
        </section>
      </main>
    </div>
  );
}
