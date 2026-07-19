import { ScoutedPlayer, Position, Footedness } from '../types';
import { Users, Calendar, Award, Compass } from 'lucide-react';

interface StatsGridProps {
  players: ScoutedPlayer[];
}

export default function StatsGrid({ players }: StatsGridProps) {
  const currentYear = 2026; // Determined from environment metadata
  const total = players.length;

  // Calculat average age
  const averageAge = total > 0 
    ? (players.reduce((sum, p) => sum + (currentYear - p.anoNacimiento), 0) / total).toFixed(1)
    : '0';

  // Count footedness
  const feetDistribution = players.reduce((acc, p) => {
    acc[p.lateralidad] = (acc[p.lateralidad] || 0) + 1;
    return acc;
  }, { Diestro: 0, Zurdo: 0, Ambidiestro: 0 } as Record<Footedness, number>);

  // Count positions
  const positionMap = players.reduce((acc, p) => {
    acc[p.posicion] = (acc[p.posicion] || 0) + 1;
    return acc;
  }, {} as Record<Position, number>);

  // Find most scouted position
  let topPosition: string = 'N/A';
  let topPositionCount = 0;
  Object.entries(positionMap).forEach(([pos, count]) => {
    if (count > topPositionCount) {
      topPosition = pos;
      topPositionCount = count;
    }
  });

  // Calculate percentage of Left/Right foot
  const leftPct = total > 0 ? Math.round((feetDistribution.Zurdo / total) * 100) : 0;
  const rightPct = total > 0 ? Math.round((feetDistribution.Diestro / total) * 100) : 0;
  const ambiPct = total > 0 ? Math.round((feetDistribution.Ambidiestro / total) * 100) : 0;

  return (
    <div id="stats-dashboard-grid" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Stat 1: Total Players */}
      <div id="stat-card-total" className="bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1 italic">
            Total Jugadores
          </span>
          <span className="text-2xl font-bold font-mono text-white">{total}</span>
          <span className="text-[11px] text-green-400 font-medium block mt-1">
            ✓ Base de datos activa
          </span>
        </div>
        <div className="bg-slate-800 text-blue-400 p-2.5 rounded">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Stat 2: Average Age */}
      <div id="stat-card-age" className="bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1 italic">
            Edad Promedio
          </span>
          <span className="text-2xl font-bold font-mono text-white">{averageAge} <span className="text-xs font-normal text-slate-400">años</span></span>
          <span className="text-[11px] text-slate-400 block mt-1">
            Media de plantilla scout
          </span>
        </div>
        <div className="bg-slate-800 text-blue-400 p-2.5 rounded">
          <Calendar className="w-5 h-5" />
        </div>
      </div>

      {/* Stat 3: Footedness Breakdown */}
      <div id="stat-card-foot" className="bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block italic">
            Distribución de Pie
          </span>
          <Award className="w-4 h-4 text-amber-500" />
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex justify-between text-[11px] text-slate-300 font-mono">
            <span>D: {rightPct}%</span>
            <span>A: {ambiPct}%</span>
            <span>Z: {leftPct}%</span>
          </div>
          {/* Visual bar split */}
          <div className="h-1.5 w-full bg-slate-800 rounded flex overflow-hidden">
            <div 
              style={{ width: `${rightPct}%` }} 
              className="bg-blue-600 transition-all duration-500" 
              title={`Diestros: ${rightPct}%`}
            />
            <div 
              style={{ width: `${ambiPct}%` }} 
              className="bg-amber-500 transition-all duration-500" 
              title={`Ambidiestros: ${ambiPct}%`}
            />
            <div 
              style={{ width: `${leftPct}%` }} 
              className="bg-emerald-500 transition-all duration-500" 
              title={`Zurdos: ${leftPct}%`}
            />
          </div>
          <div className="text-[9px] text-slate-500 flex justify-between pr-1 mt-0.5 font-mono">
            <span>Blue: Der.</span>
            <span>Amber: Ambi.</span>
            <span>Green: Izq.</span>
          </div>
        </div>
      </div>

      {/* Stat 4: Top Scouted Position */}
      <div id="stat-card-top-position" className="bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1 italic">
            Posición Principal
          </span>
          <span className="text-[14px] font-bold text-white line-clamp-1" title={topPosition}>
            {topPosition}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
             {topPositionCount} jugador{topPositionCount !== 1 ? 'es' : ''} registrado{topPositionCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="bg-slate-800 text-blue-400 p-2.5 rounded flex-shrink-0">
          <Compass className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
