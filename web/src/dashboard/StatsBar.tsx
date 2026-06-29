import { AlertCircle, CheckCircle2, Users, Flame } from 'lucide-react';

interface Stats {
  totalRequests: number;
  totalMatched: number;
  peopleHelped: number;
  circuitsRestored: number;
}

interface StatsBarProps {
  stats: Stats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const cards = [
    {
      label: 'ACTIVE REQUESTS',
      value: stats.totalRequests,
      icon: <AlertCircle className="w-5 h-5 text-red-400" />,
      glow: 'shadow-red-500/5',
      borderColor: 'border-red-500/10'
    },
    {
      label: 'MATCHED NEEDS',
      value: stats.totalMatched,
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      glow: 'shadow-green-500/5',
      borderColor: 'border-green-500/10'
    },
    {
      label: 'CITIZENS HELPED',
      value: stats.peopleHelped,
      icon: <Users className="w-5 h-5 text-blue-400" />,
      glow: 'shadow-blue-500/5',
      borderColor: 'border-blue-500/10'
    },
    {
      label: 'CIRCUITS RESTORED',
      value: stats.circuitsRestored,
      icon: <Flame className="w-5 h-5 text-yellow-400" />,
      glow: 'shadow-yellow-500/5',
      borderColor: 'border-yellow-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`glass-panel p-5 rounded-2xl border ${card.borderColor} shadow-lg ${card.glow} flex items-center justify-between transition-all duration-300 hover:scale-[1.01]`}
        >
          <div>
            <span className="text-[10px] font-bold text-gray-500 tracking-widest block mb-1">
              {card.label}
            </span>
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {card.value}
            </span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
