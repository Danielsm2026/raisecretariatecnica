import { ScoutedPlayer } from '../types';
import { Users } from 'lucide-react';

interface StatsGridProps {
  players: ScoutedPlayer[];
}

export default function StatsGrid({ players }: StatsGridProps) {
  const total = players.length;

  return (
    <div id="stats-dashboard-grid" className="mb-5 flex flex-wrap gap-4 items-center">
      {/* Stat 1: Total Players */}
      <div id="stat-card-total" className="bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-sm flex items-center justify-between min-w-[220px]">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1 italic">
            Total Jugadores
          </span>
          <span className="text-2xl font-bold font-mono text-white">{total}</span>
          <span className="text-[11px] text-green-400 font-medium block mt-1">
            ✓ Base de datos activa
          </span>
        </div>
        <div className="bg-slate-800 text-blue-400 p-2.5 rounded ml-4">
          <Users className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

