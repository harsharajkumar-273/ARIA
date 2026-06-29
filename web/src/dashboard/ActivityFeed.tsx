import { MessageSquare, ShieldAlert, Award, Truck, Activity as ActivityIcon } from 'lucide-react';

export interface Activity {
  id: string;
  event_type: string;
  title: string;
  description: string;
  urgency: number;
  channel?: string;
  created_at: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities = [] }: ActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'new_message':
      case 'message_received':
        return <MessageSquare className="w-5 h-5 text-blue-400" />;
      case 'match_created':
      case 'match_proposed':
        return <Truck className="w-5 h-5 text-green-400" />;
      case 'demo_complete':
      case 'donor_impact':
        return <Award className="w-5 h-5 text-yellow-400" />;
      case 'road_report':
      case 'outage_reported':
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
      default:
        return <ActivityIcon className="w-5 h-5 text-purple-400" />;
    }
  };

  const formatChannel = (channel: string) => {
    if (!channel) return '';
    return channel.toUpperCase();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <h3 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Live Coordination Feed</h3>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 text-gray-500">
            <ActivityIcon className="w-8 h-8 opacity-20 mb-2 animate-pulse" />
            <p className="text-xs">Waiting for live coordination signals...</p>
          </div>
        ) : (
          activities.map((act) => (
            <div
              key={act.id}
              className={`p-3.5 rounded-xl border flex gap-3 transition-all duration-300 ${
                act.urgency >= 5
                  ? 'bg-red-950/20 border-red-500/30'
                  : act.urgency >= 4
                  ? 'bg-amber-950/10 border-amber-500/20'
                  : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">{getIcon(act.event_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-semibold text-white truncate">{act.title}</h4>
                  <span className="text-[9px] text-gray-500 flex-shrink-0">
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">{act.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  {act.channel && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-400 tracking-wider">
                      {formatChannel(act.channel)}
                    </span>
                  )}
                  {act.urgency >= 4 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 tracking-wider">
                      URGENT
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
