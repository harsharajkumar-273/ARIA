import React, { useState } from 'react';
import { Send, Phone, MessageSquare } from 'lucide-react';

export function SubmitForm() {
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('+15559990001');
  const [channel, setChannel] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('http://localhost:3000/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: message,
          phone,
          channel
        })
      });

      if (response.ok) {
        setStatus('success');
        setMessage('');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error submitting signal:', error);
      setStatus('error');
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <MessageSquare className="w-5 h-5 text-purple-400" />
        <h3 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Simulate Signal Injection</h3>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-gray-500 font-bold block mb-1">PHONE NUMBER</label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
              placeholder="+15550000000"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 font-bold block mb-1">CHANNEL</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="facebook">Messenger</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <label className="text-[10px] text-gray-500 font-bold block mb-1">MESSAGE BODY</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full flex-1 min-h-[90px] bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
          placeholder="e.g. Elderly woman no food no heat at 500 Main St, Nashville"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl py-2.5 px-4 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/10"
      >
        <Send className="w-3.5 h-3.5" />
        {loading ? 'Injecting...' : 'Inject Message Signal'}
      </button>

      {status === 'success' && (
        <p className="text-[10px] text-green-400 font-semibold text-center mt-1 animate-pulse">
          ✅ Message injected and processed by ARIA orchestrator.
        </p>
      )}
      {status === 'error' && (
        <p className="text-[10px] text-red-400 font-semibold text-center mt-1">
          ❌ Failed to inject message. Check server status.
        </p>
      )}
    </form>
  );
}
