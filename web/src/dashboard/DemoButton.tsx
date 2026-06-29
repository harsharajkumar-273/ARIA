import { useState } from 'react';
import { Play, RotateCcw, AlertTriangle } from 'lucide-react';

export function DemoButton() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const startDemo = async () => {
    setRunning(true);
    setStatus('Initializing stories...');
    try {
      const res = await fetch('http://localhost:3000/api/demo/run', {
        method: 'POST'
      });
      if (res.ok) {
        setStatus('Scenario running...');
      } else {
        setStatus('Demo failed to start');
      }
    } catch (error) {
      console.error('Error starting demo:', error);
      setStatus('Connection error');
    }
  };

  const resetDemo = async () => {
    setStatus('Resetting database...');
    try {
      const res = await fetch('http://localhost:3000/api/demo/reset', {
        method: 'POST'
      });
      if (res.ok) {
        setStatus('Demo environment reset successfully');
        window.location.reload();
      } else {
        setStatus('Reset failed');
      }
    } catch (error) {
      console.error('Error resetting demo:', error);
      setStatus('Connection error');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={startDemo}
          disabled={running}
          className="flex-1 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-xl py-3 px-4 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-600/10"
        >
          <Play className="w-4 h-4 fill-white" />
          {running ? 'DEMO RUNNING...' : 'RUN CRISIS DEMO SCENARIO'}
        </button>

        <button
          onClick={resetDemo}
          title="Reset Database to Seed State"
          className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl py-3 px-4 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 border border-white/10"
        >
          <RotateCcw className="w-4 h-4" />
          RESET
        </button>
      </div>

      {status && (
        <p className="text-[10px] text-gray-500 font-semibold text-center flex items-center justify-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          {status}
        </p>
      )}
    </div>
  );
}
