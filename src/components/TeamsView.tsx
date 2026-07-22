import React, { useState, useMemo } from 'react';
import { ScoutedPlayer, Position } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  Search, 
  User, 
  ArrowLeft, 
  Calendar, 
  Shield, 
  FileText, 
  Edit, 
  Trash2,
  Trophy,
  ExternalLink,
  ChevronLeft,
  LayoutGrid,
  List
} from 'lucide-react';
import { getPlayerEscudoUrl } from '../utils/escudoHelper';

// Helper to map any position string to one of the 5 position codes
export function getPositionCode(posicion: string): 'POR' | 'DF' | 'MED' | 'EXT' | 'DEL' {
  const pos = (posicion || '').toLowerCase();
  if (pos.includes('port')) return 'POR';
  if (pos.includes('extrem')) return 'EXT';
  if (pos.includes('delant') || pos.includes('punta')) return 'DEL';
  if (pos.includes('defens') || pos.includes('later') || pos.includes('carril') || pos.includes('liber')) return 'DF';
  return 'MED';
}

// Position Badge component matching the attached screenshot style and icons
export function PositionBadge({ code, size = 'md' }: { code: 'POR' | 'DF' | 'MED' | 'EXT' | 'DEL'; size?: 'sm' | 'md' | 'lg'; key?: string }) {
  const configs = {
    POR: {
      label: 'POR',
      borderColor: 'border-emerald-600',
      bgColor: 'bg-[#061e14]',
      textColor: 'text-emerald-400',
      shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.25)]',
      icon: (s: string) => (
        <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-1a2 2 0 0 1 2-2h1" />
        </svg>
      )
    },
    DF: {
      label: 'DF',
      borderColor: 'border-sky-500',
      bgColor: 'bg-[#051829]',
      textColor: 'text-sky-400',
      shadow: 'shadow-[0_0_8px_rgba(56,189,248,0.25)]',
      icon: (s: string) => (
        <svg className={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
        </svg>
      )
    },
    MED: {
      label: 'MED',
      borderColor: 'border-amber-500',
      bgColor: 'bg-[#291f05]',
      textColor: 'text-amber-400',
      shadow: 'shadow-[0_0_8px_rgba(245,158,11,0.25)]',
      icon: (s: string) => (
        <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    },
    EXT: {
      label: 'EXT',
      borderColor: 'border-orange-500',
      bgColor: 'bg-[#291205]',
      textColor: 'text-orange-400',
      shadow: 'shadow-[0_0_8px_rgba(249,115,22,0.25)]',
      icon: (s: string) => (
        <svg className={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h7v8l10-12h-7V2z" />
        </svg>
      )
    },
    DEL: {
      label: 'DEL',
      borderColor: 'border-red-600',
      bgColor: 'bg-[#290505]',
      textColor: 'text-red-500',
      shadow: 'shadow-[0_0_8px_rgba(239,68,68,0.25)]',
      icon: (s: string) => (
        <svg className={s} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
          <polygon points="12,7 14.5,9 13.5,12 10.5,12 9.5,9" fill="#0f172a" />
          <line x1="12" y1="7" x2="12" y2="2" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="14.5" y1="9" x2="19" y2="7.5" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="13.5" y1="12" x2="17.5" y2="16" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="10.5" y1="12" x2="6.5" y2="16" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="9.5" y1="9" x2="5" y2="7.5" stroke="#0f172a" strokeWidth="1.2" />
        </svg>
      )
    }
  };

  const cfg = configs[code] || configs.MED;

  if (size === 'sm') {
    return (
      <div className={`w-[30px] h-[36px] border ${cfg.borderColor} ${cfg.bgColor} ${cfg.shadow} rounded p-0.5 flex flex-col items-center justify-between shrink-0 select-none`}>
        <span className={`text-[7.5px] font-mono font-black ${cfg.textColor} leading-none tracking-tight pt-0.5`}>
          {cfg.label}
        </span>
        <div className={`mb-0.5 ${cfg.textColor}`}>
          {cfg.icon("w-3 h-3")}
        </div>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className={`w-12 h-16 border-2 ${cfg.borderColor} ${cfg.bgColor} ${cfg.shadow} rounded-lg p-1 flex flex-col items-center justify-between shrink-0 select-none`}>
        <span className={`text-[11px] font-mono font-black ${cfg.textColor} leading-none tracking-wider pt-0.5`}>
          {cfg.label}
        </span>
        <div className={`mb-1 ${cfg.textColor}`}>
          {cfg.icon("w-5.5 h-5.5")}
        </div>
      </div>
    );
  }

  // Default 'md' - exact proportions from attached screenshot
  return (
    <div className={`w-10 h-13 border ${cfg.borderColor} ${cfg.bgColor} ${cfg.shadow} rounded-md p-1 flex flex-col items-center justify-between shrink-0 select-none`}>
      <span className={`text-[9.5px] font-mono font-black ${cfg.textColor} leading-none tracking-wider pt-0.5`}>
        {cfg.label}
      </span>
      <div className={`mb-0.5 ${cfg.textColor}`}>
        {cfg.icon("w-4 h-4")}
      </div>
    </div>
  );
}

export function PositionLegendBar() {
  const codes: ('POR' | 'DF' | 'MED' | 'EXT' | 'DEL')[] = ['POR', 'DF', 'MED', 'EXT', 'DEL'];
  return (
    <div className="bg-[#050e17]/90 border border-slate-800/90 rounded-xl p-2.5 flex flex-col items-center shadow-xl shrink-0">
      <span className="text-[9px] font-mono font-black text-slate-300 uppercase tracking-widest mb-1.5">
        POSICIÓN
      </span>
      <div className="flex items-center gap-2">
        {codes.map((code) => (
          <PositionBadge key={code} code={code} size="md" />
        ))}
      </div>
    </div>
  );
}

// Helper to get a realistic 2-digit dorsal number from a player ID or name
function getPlayerDorsal(player: ScoutedPlayer): string {
  const matches = player.id.match(/\d+/);
  if (matches) {
    const num = parseInt(matches[0], 10);
    return num.toString().padStart(2, '0');
  }
  let hash = 0;
  for (let i = 0; i < player.nombre.length; i++) {
    hash = player.nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const num = Math.abs(hash % 99) + 1;
  return num.toString().padStart(2, '0');
}

// Helper to format player names so they fit neatly in tactical boxes
function formatPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (name.length > 15 && parts.length >= 2) {
    return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
  }
  return name;
}

function TeamLogo({ logoUrl, teamName, className = "max-w-full max-h-full object-contain duration-300" }: { logoUrl?: string; teamName: string; className?: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !logoUrl || logoUrl.trim().length === 0) {
    const initials = teamName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();

    return (
      <div className="w-full h-full rounded bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-bold font-mono select-none uppercase tracking-tight text-center p-0.5">
        <Shield className="w-4 h-4 text-slate-600 mb-0.5" />
        <span className="text-[8px] text-slate-400 scale-90">{initials || 'FC'}</span>
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={teamName}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

interface PositionBoxProps {
  key?: React.Key;
  title: string;
  colorClass: string;
  players: ScoutedPlayer[];
  onSelectPlayer: (player: ScoutedPlayer) => void;
  onRemovePlayer?: (playerId: string) => void;
  onDropPlayer?: (playerId: string) => void;
  candidates?: ScoutedPlayer[];
}

const getPositionLabelPlural = (title: string) => {
  switch (title) {
    case 'DELANTERO':
      return 'Delanteros';
    case 'EXTREMO IZQUIERDO':
    case 'EXTREMO DERECHO':
      return 'Extremos';
    case 'INTERIOR IZQUIERDO':
    case 'INTERIOR DERECHO':
    case 'MEDIOCENTRO':
      return 'Centrocampistas';
    case 'LATERAL IZQUIERDO':
    case 'LATERAL DERECHO':
      return 'Laterales';
    case 'CENTRAL IZQUIERDO':
    case 'CENTRAL DERECHO':
      return 'Centrales';
    case 'PORTERO':
      return 'Porteros';
    default:
      return 'Jugadores';
  }
};

const getCandidatesForPosition = (title: string, allPlayers: ScoutedPlayer[]) => {
  switch (title) {
    case 'PORTERO':
      return allPlayers.filter(p => p.posicion === 'Portero');
    case 'LATERAL IZQUIERDO':
      return allPlayers.filter(p => p.posicion === 'Lateral Izquierdo');
    case 'LATERAL DERECHO':
      return allPlayers.filter(p => p.posicion === 'Lateral Derecho');
    case 'CENTRAL IZQUIERDO':
    case 'CENTRAL DERECHO':
      return allPlayers.filter(p => p.posicion === 'Defensa Central');
    case 'MEDIOCENTRO':
      return allPlayers.filter(p => p.posicion === 'Mediocentro Defensivo' || p.posicion === 'Mediocentro');
    case 'INTERIOR IZQUIERDO':
    case 'INTERIOR DERECHO':
      return allPlayers.filter(p => p.posicion === 'Mediocentro' || p.posicion === 'Mediapunta');
    case 'EXTREMO IZQUIERDO':
      return allPlayers.filter(p => p.posicion === 'Extremo Izquierdo');
    case 'EXTREMO DERECHO':
      return allPlayers.filter(p => p.posicion === 'Extremo Derecho');
    case 'DELANTERO':
      return allPlayers.filter(p => p.posicion === 'Delantero Centro');
    default:
      return [];
  }
};

interface PitchRow {
  justifyClass: string;
  gridColsClass?: string;
  positions: {
    key: string;
    positionId: string;
    title: string;
    colorClass: string;
  }[];
}

const systemsLayouts: Record<string, PitchRow[]> = {
  '4-3-3': [
    {
      justifyClass: 'justify-center',
      positions: [
        { key: 'delanteroBoxPlayers', positionId: 'DELANTERO', title: 'DELANTERO', colorClass: 'bg-red-500' }
      ]
    },
    {
      justifyClass: 'justify-between px-14',
      positions: [
        { key: 'extremoIzquierdoBoxPlayers', positionId: 'EXTREMO IZQUIERDO', title: 'EXTREMO IZQUIERDO', colorClass: 'bg-red-500' },
        { key: 'extremoDerechoBoxPlayers', positionId: 'EXTREMO DERECHO', title: 'EXTREMO DERECHO', colorClass: 'bg-red-500' }
      ]
    },
    {
      justifyClass: 'justify-around px-20',
      positions: [
        { key: 'interiorIzquierdoBoxPlayers', positionId: 'INTERIOR IZQUIERDO', title: 'INTERIOR IZQUIERDO', colorClass: 'bg-sky-400' },
        { key: 'interiorDerechoBoxPlayers', positionId: 'INTERIOR DERECHO', title: 'INTERIOR DERECHO', colorClass: 'bg-sky-400' }
      ]
    },
    {
      justifyClass: 'justify-center',
      positions: [
        { key: 'mediocentroBoxPlayers', positionId: 'MEDIOCENTRO', title: 'MEDIOCENTRO', colorClass: 'bg-sky-400' }
      ]
    },
    {
      justifyClass: '',
      gridColsClass: 'grid grid-cols-4 gap-4 px-2',
      positions: [
        { key: 'lateralIzquierdoBoxPlayers', positionId: 'LATERAL IZQUIERDO', title: 'LATERAL IZQUIERDO', colorClass: 'bg-emerald-500' },
        { key: 'centralIzquierdoBoxPlayers', positionId: 'CENTRAL IZQUIERDO', title: 'CENTRAL IZQUIERDO', colorClass: 'bg-emerald-500' },
        { key: 'centralDerechoBoxPlayers', positionId: 'CENTRAL DERECHO', title: 'CENTRAL DERECHO', colorClass: 'bg-emerald-500' },
        { key: 'lateralDerechoBoxPlayers', positionId: 'LATERAL DERECHO', title: 'LATERAL DERECHO', colorClass: 'bg-emerald-500' }
      ]
    },
    {
      justifyClass: 'justify-center',
      positions: [
        { key: 'porteroBoxPlayers', positionId: 'PORTERO', title: 'PORTERO', colorClass: 'bg-amber-500' }
      ]
    }
  ],
  '4-4-2': [
    {
      justifyClass: 'justify-around px-28',
      positions: [
        { key: 'extremoIzquierdoBoxPlayers', positionId: 'EXTREMO IZQUIERDO', title: 'DELANTERO IZQ', colorClass: 'bg-red-500' },
        { key: 'extremoDerechoBoxPlayers', positionId: 'EXTREMO DERECHO', title: 'DELANTERO DER', colorClass: 'bg-red-500' }
      ]
    },
    {
      justifyClass: 'justify-between px-10',
      positions: [
        { key: 'interiorIzquierdoBoxPlayers', positionId: 'INTERIOR IZQUIERDO', title: 'VOLANTE IZQ', colorClass: 'bg-sky-400' },
        { key: 'interiorDerechoBoxPlayers', positionId: 'INTERIOR DERECHO', title: 'VOLANTE DER', colorClass: 'bg-sky-400' }
      ]
    },
    {
      justifyClass: 'justify-around px-28',
      positions: [
        { key: 'mediocentroBoxPlayers', positionId: 'MEDIOCENTRO', title: 'MEDIOCENTRO IZQ', colorClass: 'bg-sky-400' },
        { key: 'delanteroBoxPlayers', positionId: 'DELANTERO', title: 'MEDIOCENTRO DER', colorClass: 'bg-sky-400' }
      ]
    },
    {
      justifyClass: '',
      gridColsClass: 'grid grid-cols-4 gap-4 px-2',
      positions: [
        { key: 'lateralIzquierdoBoxPlayers', positionId: 'LATERAL IZQUIERDO', title: 'LATERAL IZQUIERDO', colorClass: 'bg-emerald-500' },
        { key: 'centralIzquierdoBoxPlayers', positionId: 'CENTRAL IZQUIERDO', title: 'CENTRAL IZQUIERDO', colorClass: 'bg-emerald-500' },
        { key: 'centralDerechoBoxPlayers', positionId: 'CENTRAL DERECHO', title: 'CENTRAL DERECHO', colorClass: 'bg-emerald-500' },
        { key: 'lateralDerechoBoxPlayers', positionId: 'LATERAL DERECHO', title: 'LATERAL DERECHO', colorClass: 'bg-emerald-500' }
      ]
    },
    {
      justifyClass: 'justify-center',
      positions: [
        { key: 'porteroBoxPlayers', positionId: 'PORTERO', title: 'PORTERO', colorClass: 'bg-amber-500' }
      ]
    }
  ],
  '3-5-2': [
    {
      justifyClass: 'justify-around px-28',
      positions: [
        { key: 'extremoIzquierdoBoxPlayers', positionId: 'EXTREMO IZQUIERDO', title: 'DELANTERO IZQ', colorClass: 'bg-red-500' },
        { key: 'extremoDerechoBoxPlayers', positionId: 'EXTREMO DERECHO', title: 'DELANTERO DER', colorClass: 'bg-red-500' }
      ]
    },
    {
      justifyClass: 'justify-around px-16',
      positions: [
        { key: 'interiorIzquierdoBoxPlayers', positionId: 'INTERIOR IZQUIERDO', title: 'INTERIOR IZQ', colorClass: 'bg-sky-400' },
        { key: 'mediocentroBoxPlayers', positionId: 'MEDIOCENTRO', title: 'MEDIOCENTRO', colorClass: 'bg-sky-400' },
        { key: 'interiorDerechoBoxPlayers', positionId: 'INTERIOR DERECHO', title: 'INTERIOR DER', colorClass: 'bg-sky-400' }
      ]
    },
    {
      justifyClass: 'justify-between px-10',
      positions: [
        { key: 'lateralIzquierdoBoxPlayers', positionId: 'LATERAL IZQUIERDO', title: 'CARRILERO IZQ', colorClass: 'bg-emerald-500' },
        { key: 'lateralDerechoBoxPlayers', positionId: 'LATERAL DERECHO', title: 'CARRILERO DER', colorClass: 'bg-emerald-500' }
      ]
    },
    {
      justifyClass: 'justify-around px-20',
      positions: [
        { key: 'centralIzquierdoBoxPlayers', positionId: 'CENTRAL IZQUIERDO', title: 'CENTRAL IZQ', colorClass: 'bg-emerald-500' },
        { key: 'delanteroBoxPlayers', positionId: 'DELANTERO', title: 'CENTRAL LÍBERO', colorClass: 'bg-emerald-500' },
        { key: 'centralDerechoBoxPlayers', positionId: 'CENTRAL DERECHO', title: 'CENTRAL DER', colorClass: 'bg-emerald-500' }
      ]
    },
    {
      justifyClass: 'justify-center',
      positions: [
        { key: 'porteroBoxPlayers', positionId: 'PORTERO', title: 'PORTERO', colorClass: 'bg-amber-500' }
      ]
    }
  ],
  '4-2-3-1': [
    {
      justifyClass: 'justify-center',
      positions: [
        { key: 'delanteroBoxPlayers', positionId: 'DELANTERO', title: 'DELANTERO', colorClass: 'bg-red-500' }
      ]
    },
    {
      justifyClass: 'justify-around px-8',
      positions: [
        { key: 'extremoIzquierdoBoxPlayers', positionId: 'EXTREMO IZQUIERDO', title: 'MEDIA IZQ', colorClass: 'bg-sky-400' },
        { key: 'interiorIzquierdoBoxPlayers', positionId: 'INTERIOR IZQUIERDO', title: 'MEDIAPUNTA', colorClass: 'bg-sky-400' },
        { key: 'extremoDerechoBoxPlayers', positionId: 'EXTREMO DERECHO', title: 'MEDIA DER', colorClass: 'bg-sky-400' }
      ]
    },
    {
      justifyClass: 'justify-around px-28',
      positions: [
        { key: 'mediocentroBoxPlayers', positionId: 'MEDIOCENTRO', title: 'PIVOTE IZQ', colorClass: 'bg-sky-400' },
        { key: 'interiorDerechoBoxPlayers', positionId: 'INTERIOR DERECHO', title: 'PIVOTE DER', colorClass: 'bg-sky-400' }
      ]
    },
    {
      justifyClass: '',
      gridColsClass: 'grid grid-cols-4 gap-4 px-2',
      positions: [
        { key: 'lateralIzquierdoBoxPlayers', positionId: 'LATERAL IZQUIERDO', title: 'LATERAL IZQUIERDO', colorClass: 'bg-emerald-500' },
        { key: 'centralIzquierdoBoxPlayers', positionId: 'CENTRAL IZQUIERDO', title: 'CENTRAL IZQUIERDO', colorClass: 'bg-emerald-500' },
        { key: 'centralDerechoBoxPlayers', positionId: 'CENTRAL DERECHO', title: 'CENTRAL DERECHO', colorClass: 'bg-emerald-500' },
        { key: 'lateralDerechoBoxPlayers', positionId: 'LATERAL DERECHO', title: 'LATERAL DERECHO', colorClass: 'bg-emerald-500' }
      ]
    },
    {
      justifyClass: 'justify-center',
      positions: [
        { key: 'porteroBoxPlayers', positionId: 'PORTERO', title: 'PORTERO', colorClass: 'bg-amber-500' }
      ]
    }
  ],
  '5-3-2': [
    {
      justifyClass: 'justify-around px-28',
      positions: [
        { key: 'extremoIzquierdoBoxPlayers', positionId: 'EXTREMO IZQUIERDO', title: 'DELANTERO IZQ', colorClass: 'bg-red-500' },
        { key: 'extremoDerechoBoxPlayers', positionId: 'EXTREMO DERECHO', title: 'DELANTERO DER', colorClass: 'bg-red-500' }
      ]
    },
    {
      justifyClass: 'justify-around px-16',
      positions: [
        { key: 'interiorIzquierdoBoxPlayers', positionId: 'INTERIOR IZQUIERDO', title: 'INTERIOR IZQ', colorClass: 'bg-sky-400' },
        { key: 'mediocentroBoxPlayers', positionId: 'MEDIOCENTRO', title: 'MEDIOCENTRO', colorClass: 'bg-sky-400' },
        { key: 'interiorDerechoBoxPlayers', positionId: 'INTERIOR DERECHO', title: 'INTERIOR DER', colorClass: 'bg-sky-400' }
      ]
    },
    {
      justifyClass: '',
      gridColsClass: 'grid grid-cols-5 gap-2 px-1',
      positions: [
        { key: 'lateralIzquierdoBoxPlayers', positionId: 'LATERAL IZQUIERDO', title: 'CARRILERO IZQ', colorClass: 'bg-emerald-500' },
        { key: 'centralIzquierdoBoxPlayers', positionId: 'CENTRAL IZQUIERDO', title: 'CENTRAL IZQ', colorClass: 'bg-emerald-500' },
        { key: 'delanteroBoxPlayers', positionId: 'DELANTERO', title: 'CENTRAL LÍBERO', colorClass: 'bg-emerald-500' },
        { key: 'centralDerechoBoxPlayers', positionId: 'CENTRAL DERECHO', title: 'CENTRAL DER', colorClass: 'bg-emerald-500' },
        { key: 'lateralDerechoBoxPlayers', positionId: 'LATERAL DERECHO', title: 'CARRILERO DER', colorClass: 'bg-emerald-500' }
      ]
    },
    {
      justifyClass: 'justify-center',
      positions: [
        { key: 'porteroBoxPlayers', positionId: 'PORTERO', title: 'PORTERO', colorClass: 'bg-amber-500' }
      ]
    }
  ]
};

function PositionBox({ title, colorClass, players, onSelectPlayer, onRemovePlayer, onDropPlayer, candidates }: PositionBoxProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const playerId = e.dataTransfer.getData('text/plain');
    if (playerId && onDropPlayer) {
      onDropPlayer(playerId);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-[140px] bg-slate-900/95 border rounded-xl p-2 shadow-lg hover:shadow-xl transition-all flex flex-col justify-start min-h-[80px] backdrop-blur-md select-none relative group/box ${
        isOver 
          ? 'border-blue-500 bg-slate-850 scale-[1.02] ring-1 ring-blue-500/30' 
          : 'border-slate-800/80 hover:border-slate-700/60'
      }`}
    >
      {/* Title */}
      <div className="text-center pb-1">
        <span className="text-[8.5px] font-mono font-bold tracking-wider text-slate-300 uppercase block">
          {title}
        </span>
        <div className={`h-[1.5px] w-full mt-0.5 rounded-full ${colorClass}`} />
      </div>

      {/* Players List */}
      <div className="flex-1 flex flex-col justify-start space-y-0.5 overflow-y-auto max-h-[64px] pr-0.5 scrollbar-thin">
        {players.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-1">
            <span className="text-[7.5px] font-mono text-slate-600 uppercase tracking-wider italic">Sin efectivos</span>
          </div>
        ) : (
          players.map((player) => {
            const dorsal = getPlayerDorsal(player);
            const formattedName = formatPlayerName(player.nombre);
            const edad = new Date().getFullYear() - player.anoNacimiento;

            return (
              <div 
                key={player.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', player.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className="flex items-center justify-between text-[10px] font-mono py-0.5 border-b border-dotted border-slate-850/80 last:border-0 hover:bg-slate-800/40 px-1.5 rounded cursor-grab active:cursor-grabbing transition-all group/row"
                title={`Ver detalles o arrastra para cambiar`}
              >
                <div 
                  className="flex items-center space-x-1 min-w-0 flex-1 cursor-pointer"
                  onClick={() => onSelectPlayer(player)}
                >
                  <span className="text-slate-200 group-hover/row:text-blue-400 transition-colors truncate font-semibold">
                    {formattedName}
                  </span>
                  <span className="text-slate-400 font-medium shrink-0 text-[8.5px]">
                    ({String(player.anoNacimiento).slice(-2)})
                  </span>
                </div>
                
                {onRemovePlayer ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePlayer(player.id);
                    }}
                    className="text-slate-500 hover:text-red-400 px-0.5 shrink-0 transition-colors cursor-pointer text-[11px] leading-none font-bold"
                    title="Quitar jugador de esta posición"
                  >
                    ×
                  </button>
                ) : (
                  <span className="text-slate-400 font-bold shrink-0 pl-1 text-[8.5px]">{edad}</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dropdown Selector */}
      {onDropPlayer && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 shrink-0">
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                onDropPlayer(val);
              }
            }}
            className="w-full bg-slate-950/80 hover:bg-slate-950 text-[9px] text-slate-300 font-mono py-0.5 px-1 rounded border border-slate-800 focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
            disabled={!candidates || candidates.length === 0}
          >
            <option value="" disabled className="text-slate-500">
              {candidates && candidates.length > 0 
                ? `+ Seleccionar...` 
                : `Sin ${getPositionLabelPlural(title)}`
              }
            </option>
            {candidates?.map((cand) => {
              const assigned = players.some(p => p.id === cand.id);
              return (
                <option 
                  key={cand.id} 
                  value={cand.id}
                  disabled={assigned}
                  className="bg-slate-900 text-slate-200"
                >
                  {assigned ? '✓ ' : ''}{cand.nombre} ({cand.calificacion ? `★${cand.calificacion}` : 'Sin calif.'})
                </option>
              );
            })}
          </select>
        </div>
      )}
    </div>
  );
}

interface TeamsViewProps {
  players: ScoutedPlayer[];
  onSelectPlayer: (player: ScoutedPlayer) => void;
  onEditPlayer: (player: ScoutedPlayer) => void;
  onEditReport: (player: ScoutedPlayer) => void;
  onDeletePlayer: (id: string) => void;
}

export default function TeamsView({
  players,
  onSelectPlayer,
  onEditPlayer,
  onEditReport,
  onDeletePlayer
}: TeamsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'campograma'>('campograma');
  const [playerToDelete, setPlayerToDelete] = useState<ScoutedPlayer | null>(null);
  
  // Custom interactive lineups stored by team name
  const [customLineups, setCustomLineups] = useState<Record<string, Record<string, string[]>>>({});
  
  // Custom tactical systems per team
  const [teamSystems, setTeamSystems] = useState<Record<string, string>>({});

  // Group players by team dynamically
  const teamsData = useMemo(() => {
    const groups: Record<string, { squad: ScoutedPlayer[]; logoUrl: string }> = {};
    
    players.forEach(player => {
      const teamName = player.equipo ? player.equipo.trim() : 'Sin Equipo/Agente Libre';
      if (!groups[teamName]) {
        groups[teamName] = { 
          squad: [],
          logoUrl: getPlayerEscudoUrl(player)
        };
      }
      groups[teamName].squad.push(player);
    });

    return Object.entries(groups).map(([name, data]) => ({
      name,
      players: data.squad,
      logoUrl: data.logoUrl
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  // Filter teams based on search term
  const filteredTeams = useMemo(() => {
    if (!searchTerm.trim()) return teamsData;
    const term = searchTerm.toLowerCase();
    return teamsData.filter(t => 
      t.name.toLowerCase().includes(term) || 
      t.players.some(p => p.nombre.toLowerCase().includes(term))
    );
  }, [teamsData, searchTerm]);

  // Roster categorical divisions for currently opened team folder
  const currentTeamRoster = useMemo(() => {
    if (!selectedTeam) return null;
    const teamObj = teamsData.find(t => t.name === selectedTeam);
    if (!teamObj) return null;

    const roster = teamObj.players;
    
    // Categorize by 5 position codes matching the position logos
    const porteros = roster.filter(p => getPositionCode(p.posicion) === 'POR');
    const defensas = roster.filter(p => getPositionCode(p.posicion) === 'DF');
    const medios = roster.filter(p => getPositionCode(p.posicion) === 'MED');
    const extremos = roster.filter(p => getPositionCode(p.posicion) === 'EXT');
    const delanteros = roster.filter(p => getPositionCode(p.posicion) === 'DEL');

    return {
      name: teamObj.name,
      logoUrl: teamObj.logoUrl,
      allPlayers: roster,
      sections: [
        { code: 'POR' as const, title: 'Porteros', players: porteros },
        { code: 'DF' as const, title: 'Defensas', players: defensas },
        { code: 'MED' as const, title: 'Centrocampistas', players: medios },
        { code: 'EXT' as const, title: 'Extremos', players: extremos },
        { code: 'DEL' as const, title: 'Delanteros', players: delanteros }
      ].filter(s => s.players.length > 0)
    };
  }, [selectedTeam, teamsData]);

  // Detailed tactical boxes for Campograma
  const campogramaData = useMemo(() => {
    if (!selectedTeam) return null;
    const teamObj = teamsData.find(t => t.name === selectedTeam);
    if (!teamObj) return null;

    const roster = teamObj.players;

    const porteroBoxPlayers = roster.filter(p => p.posicion === 'Portero');
    const lateralIzquierdoBoxPlayers = roster.filter(p => p.posicion === 'Lateral Izquierdo');
    const lateralDerechoBoxPlayers = roster.filter(p => p.posicion === 'Lateral Derecho');
    
    const centralDefenders = roster.filter(p => p.posicion === 'Defensa Central');
    const centralIzquierdoBoxPlayers = centralDefenders.filter((p, i) => p.lateralidad === 'Zurdo' || (p.lateralidad !== 'Zurdo' && i % 2 === 0));
    const centralDerechoBoxPlayers = centralDefenders.filter((p, i) => !centralIzquierdoBoxPlayers.includes(p));

    const mDefensivos = roster.filter(p => p.posicion === 'Mediocentro Defensivo');
    const mCentros = roster.filter(p => p.posicion === 'Mediocentro');
    const mPuntas = roster.filter(p => p.posicion === 'Mediapunta');

    let mediocentroBoxPlayers: ScoutedPlayer[] = [...mDefensivos];
    let remainingMids = [...mCentros, ...mPuntas];

    if (mediocentroBoxPlayers.length === 0 && remainingMids.length > 0) {
      mediocentroBoxPlayers.push(remainingMids[0]);
      remainingMids = remainingMids.slice(1);
    }

    const interiorIzquierdoBoxPlayers: ScoutedPlayer[] = [];
    const interiorDerechoBoxPlayers: ScoutedPlayer[] = [];

    remainingMids.forEach((p, idx) => {
      if (p.lateralidad === 'Zurdo') {
        interiorIzquierdoBoxPlayers.push(p);
      } else if (p.lateralidad === 'Diestro') {
        interiorDerechoBoxPlayers.push(p);
      } else {
        if (idx % 2 === 0) {
          interiorIzquierdoBoxPlayers.push(p);
        } else {
          interiorDerechoBoxPlayers.push(p);
        }
      }
    });

    const extremoIzquierdoBoxPlayers = roster.filter(p => p.posicion === 'Extremo Izquierdo');
    const extremoDerechoBoxPlayers = roster.filter(p => p.posicion === 'Extremo Derecho');
    const delanteroBoxPlayers = roster.filter(p => p.posicion === 'Delantero Centro');

    return {
      porteroBoxPlayers,
      lateralIzquierdoBoxPlayers,
      lateralDerechoBoxPlayers,
      centralIzquierdoBoxPlayers,
      centralDerechoBoxPlayers,
      mediocentroBoxPlayers,
      interiorIzquierdoBoxPlayers,
      interiorDerechoBoxPlayers,
      extremoIzquierdoBoxPlayers,
      extremoDerechoBoxPlayers,
      delanteroBoxPlayers
    };
  }, [selectedTeam, teamsData]);

  // Selected tactical system for the current team
  const activeSystem = useMemo(() => {
    if (!selectedTeam) return '4-3-3';
    return teamSystems[selectedTeam] || '4-3-3';
  }, [selectedTeam, teamSystems]);

  // Active resolved lineup (uses customized positions if modified, otherwise falls back to natural/automatic)
  const activeLineup = useMemo(() => {
    if (!selectedTeam || !campogramaData) return null;

    const teamCustom = customLineups[selectedTeam];
    if (!teamCustom) return campogramaData;

    const teamObj = teamsData.find(t => t.name === selectedTeam);
    const roster = teamObj?.players || [];
    const getPlayersByIds = (ids: string[]) => ids.map(id => roster.find(p => p.id === id)).filter(Boolean) as ScoutedPlayer[];

    return {
      porteroBoxPlayers: getPlayersByIds(teamCustom['PORTERO'] || []),
      lateralIzquierdoBoxPlayers: getPlayersByIds(teamCustom['LATERAL IZQUIERDO'] || []),
      lateralDerechoBoxPlayers: getPlayersByIds(teamCustom['LATERAL DERECHO'] || []),
      centralIzquierdoBoxPlayers: getPlayersByIds(teamCustom['CENTRAL IZQUIERDO'] || []),
      centralDerechoBoxPlayers: getPlayersByIds(teamCustom['CENTRAL DERECHO'] || []),
      mediocentroBoxPlayers: getPlayersByIds(teamCustom['MEDIOCENTRO'] || []),
      interiorIzquierdoBoxPlayers: getPlayersByIds(teamCustom['INTERIOR IZQUIERDO'] || []),
      interiorDerechoBoxPlayers: getPlayersByIds(teamCustom['INTERIOR DERECHO'] || []),
      extremoIzquierdoBoxPlayers: getPlayersByIds(teamCustom['EXTREMO IZQUIERDO'] || []),
      extremoDerechoBoxPlayers: getPlayersByIds(teamCustom['EXTREMO DERECHO'] || []),
      delanteroBoxPlayers: getPlayersByIds(teamCustom['DELANTERO'] || []),
    };
  }, [selectedTeam, campogramaData, customLineups, teamsData]);

  // Handle assigning player to position
  const assignPlayerToPosition = (playerId: string, targetPosition: string) => {
    if (!selectedTeam) return;

    setCustomLineups(prev => {
      // Build starting position lists from default if they don't exist yet for this team
      const currentTeamCustom = prev[selectedTeam] || {
        'PORTERO': campogramaData?.porteroBoxPlayers.map(p => p.id) || [],
        'LATERAL IZQUIERDO': campogramaData?.lateralIzquierdoBoxPlayers.map(p => p.id) || [],
        'LATERAL DERECHO': campogramaData?.lateralDerechoBoxPlayers.map(p => p.id) || [],
        'CENTRAL IZQUIERDO': campogramaData?.centralIzquierdoBoxPlayers.map(p => p.id) || [],
        'CENTRAL DERECHO': campogramaData?.centralDerechoBoxPlayers.map(p => p.id) || [],
        'MEDIOCENTRO': campogramaData?.mediocentroBoxPlayers.map(p => p.id) || [],
        'INTERIOR IZQUIERDO': campogramaData?.interiorIzquierdoBoxPlayers.map(p => p.id) || [],
        'INTERIOR DERECHO': campogramaData?.interiorDerechoBoxPlayers.map(p => p.id) || [],
        'EXTREMO IZQUIERDO': campogramaData?.extremoIzquierdoBoxPlayers.map(p => p.id) || [],
        'EXTREMO DERECHO': campogramaData?.extremoDerechoBoxPlayers.map(p => p.id) || [],
        'DELANTERO': campogramaData?.delanteroBoxPlayers.map(p => p.id) || [],
      };

      // 1. Remove the player from ANY position they are currently in to avoid duplicates
      const updated: Record<string, string[]> = {};
      Object.entries(currentTeamCustom).forEach(([pos, ids]) => {
        updated[pos] = (ids as string[]).filter(id => id !== playerId);
      });

      // 2. Add the player to the target position
      if (!updated[targetPosition]) {
        updated[targetPosition] = [];
      }
      if (!updated[targetPosition].includes(playerId)) {
        updated[targetPosition].push(playerId);
      }

      return {
        ...prev,
        [selectedTeam]: updated
      };
    });
  };

  // Handle removing a player from a position
  const removePlayerFromPosition = (playerId: string, positionName: string) => {
    if (!selectedTeam) return;

    setCustomLineups(prev => {
      const currentTeamCustom = prev[selectedTeam] || {
        'PORTERO': campogramaData?.porteroBoxPlayers.map(p => p.id) || [],
        'LATERAL IZQUIERDO': campogramaData?.lateralIzquierdoBoxPlayers.map(p => p.id) || [],
        'LATERAL DERECHO': campogramaData?.lateralDerechoBoxPlayers.map(p => p.id) || [],
        'CENTRAL IZQUIERDO': campogramaData?.centralIzquierdoBoxPlayers.map(p => p.id) || [],
        'CENTRAL DERECHO': campogramaData?.centralDerechoBoxPlayers.map(p => p.id) || [],
        'MEDIOCENTRO': campogramaData?.mediocentroBoxPlayers.map(p => p.id) || [],
        'INTERIOR IZQUIERDO': campogramaData?.interiorIzquierdoBoxPlayers.map(p => p.id) || [],
        'INTERIOR DERECHO': campogramaData?.interiorDerechoBoxPlayers.map(p => p.id) || [],
        'EXTREMO IZQUIERDO': campogramaData?.extremoIzquierdoBoxPlayers.map(p => p.id) || [],
        'EXTREMO DERECHO': campogramaData?.extremoDerechoBoxPlayers.map(p => p.id) || [],
        'DELANTERO': campogramaData?.delanteroBoxPlayers.map(p => p.id) || [],
      };

      const updated = {
        ...currentTeamCustom,
        [positionName]: (currentTeamCustom[positionName] || []).filter(id => id !== playerId)
      };

      return {
        ...prev,
        [selectedTeam]: updated
      };
    });
  };

  // Reset the custom lineup back to defaults
  const resetLineup = () => {
    if (!selectedTeam) return;
    setCustomLineups(prev => {
      const copy = { ...prev };
      delete copy[selectedTeam];
      return copy;
    });
  };

  // Get position abbreviation if player is assigned
  const getAssignedPosition = (playerId: string) => {
    if (!activeLineup) return null;
    const mapping: Record<string, string> = {
      porteroBoxPlayers: 'POR',
      lateralIzquierdoBoxPlayers: 'LI',
      lateralDerechoBoxPlayers: 'LD',
      centralIzquierdoBoxPlayers: 'CI',
      centralDerechoBoxPlayers: 'CD',
      mediocentroBoxPlayers: 'MC',
      interiorIzquierdoBoxPlayers: 'II',
      interiorDerechoBoxPlayers: 'ID',
      extremoIzquierdoBoxPlayers: 'EI',
      extremoDerechoBoxPlayers: 'ED',
      delanteroBoxPlayers: 'DEL'
    };

    for (const [posName, playersList] of Object.entries(activeLineup as Record<string, ScoutedPlayer[]>)) {
      if ((playersList as ScoutedPlayer[]).some(p => p.id === playerId)) {
        return mapping[posName] || 'Sí';
      }
    }
    return null;
  };

  return (
    <>
      <ConfirmationModal
        isOpen={!!playerToDelete}
        onClose={() => setPlayerToDelete(null)}
        onConfirm={() => {
          if (playerToDelete) {
            onDeletePlayer(playerToDelete.id);
          }
        }}
        title="Eliminar Prospecto"
        message={`¿Estás seguro de que deseas eliminar de forma permanente al jugador "${playerToDelete?.nombre}"? Esta acción se eliminará de todas las listas de cantera.`}
        confirmText="Eliminar"
      />

      <div className="space-y-6">
      
      {/* Intro Context Bar inside view */}
      <div className="bg-slate-900 border border-slate-850 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div>
          <h3 className="text-sm font-bold font-display text-white tracking-widest uppercase flex items-center space-x-2">
            <span>🛡️ Archivo de Carpetas por Equipo</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
            Vista unificada de la cantera por entidades deportivas y clubes agrupados
          </p>
        </div>
        
        {/* Teams search box (when in main directory list) */}
        {!selectedTeam && (
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-500" />
            </span>
            <input
              type="text"
              placeholder="Buscar equipo/jugador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
        )}
      </div>

      {/* Roster detail view (when a folder/team is opened) */}
      {selectedTeam && currentTeamRoster ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Breadcrumb navigation / Back bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-850">
            <button
              onClick={() => setSelectedTeam(null)}
              className="inline-flex items-center space-x-2 text-xs font-mono font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase bg-slate-900/50 hover:bg-slate-900 border border-slate-800 py-1.5 px-3 rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>📁 Volver a Carpetas de Equipos</span>
            </button>

            {/* Path indicator & View Toggle */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center space-x-1.5">
                <span>Equipos</span>
                <ChevronRight className="w-3 h-3 text-slate-700" />
                <span className="text-slate-300">{currentTeamRoster.name}</span>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800">
                <button
                  onClick={() => setViewMode('campograma')}
                  className={`p-1.5 rounded transition-all flex items-center space-x-1 text-xs ${
                    viewMode === 'campograma'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Vista Campograma Táctico"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span className="text-[9px] uppercase font-mono hidden md:inline px-1">Campograma</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-all flex items-center space-x-1 text-xs ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Vista Cuadrícula de Tarjetas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="text-[9px] uppercase font-mono hidden md:inline px-1">Tarjetas</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all flex items-center space-x-1 text-xs ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Vista Formato Lista"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="text-[9px] uppercase font-mono hidden md:inline px-1">Lista</span>
                </button>
              </div>
            </div>
          </div>

          {/* Team Profile Banner */}
          <div className="bg-slate-900 border border-slate-850 rounded-lg p-5 flex flex-col lg:flex-row items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-600/10 to-transparent pointer-events-none"></div>
            
            <div className="flex items-center gap-5">
              {/* Team Crest */}
              <div className="w-16 h-16 shrink-0 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-center shadow-inner">
                <TeamLogo logoUrl={currentTeamRoster.logoUrl} teamName={currentTeamRoster.name} />
              </div>

              {/* Team Identity Info */}
              <div className="text-center md:text-left flex-initial space-y-1">
                <h2 className="text-xl font-bold text-white tracking-wide font-sans">{currentTeamRoster.name}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-mono text-slate-400 uppercase">
                  <div>
                    <span className="text-slate-500">Futbolistas scoutados:</span>{' '}
                    <span className="text-blue-400 font-bold">{currentTeamRoster.allPlayers.length}</span>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-slate-500">|</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Edad Media:</span>{' '}
                    <span className="text-indigo-400 font-bold">
                      {(currentTeamRoster.allPlayers.reduce((sum, p) => sum + (new Date().getFullYear() - p.anoNacimiento), 0) / currentTeamRoster.allPlayers.length).toFixed(1)} años
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Categorized squad listings or Campograma view */}
          {/* Categorized squad listings or Campograma view */}
          {viewMode === 'campograma' && activeLineup ? (
            <div className="flex flex-col lg:flex-row gap-4">
              
              {/* Left Column: Player Roster / Plantilla */}
              <div className="w-full lg:w-[260px] shrink-0 bg-slate-900/60 border border-slate-850 rounded-xl p-3 flex flex-col h-[740px] backdrop-blur-md">
                <div className="pb-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider">
                    Plantilla ({currentTeamRoster.allPlayers.length})
                  </span>
                  <button
                    type="button"
                    onClick={resetLineup}
                    className="text-[9px] font-mono bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-800 transition-all font-bold cursor-pointer"
                    title="Restablecer alineación original basada en posiciones naturales"
                  >
                    Restablecer
                  </button>
                </div>

                {/* Instructions */}
                <p className="text-[8.5px] font-mono text-slate-500 py-1.5 border-b border-slate-850/60 leading-tight">
                  💡 Arrastra jugadores del listado a las posiciones del campo para colocarlos. Haz clic en × para quitarlos.
                </p>

                {/* Squad list scrollable */}
                <div className="flex-1 overflow-y-auto mt-2 space-y-1 pr-1 scrollbar-thin">
                  {currentTeamRoster.allPlayers.map((player) => {
                    const assignedPos = getAssignedPosition(player.id);
                    return (
                      <div
                        key={player.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', player.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className={`flex items-center justify-between p-1.5 rounded border transition-all cursor-grab active:cursor-grabbing select-none group/player ${
                          assignedPos 
                            ? 'bg-blue-950/20 border-blue-900/40 opacity-80 hover:opacity-100 hover:border-blue-700/60' 
                            : 'bg-slate-950/60 border-slate-850/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-1.5">
                          <div 
                            className="w-6 h-6 rounded bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer"
                            onClick={() => onSelectPlayer(player)}
                            title={`Ver ficha técnica de ${player.nombre}`}
                          >
                            {player.fotoUrl ? (
                              <img 
                                src={player.fotoUrl} 
                                alt={player.nombre} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User className="w-2.5 h-2.5 text-slate-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 
                              className="font-bold text-[10px] text-slate-200 truncate group-hover/player:text-blue-400 cursor-pointer"
                              onClick={() => onSelectPlayer(player)}
                            >
                              {player.nombre}
                            </h5>
                            <p className="text-[8px] font-mono text-slate-500 truncate">
                              {player.posicion} • {player.lateralidad}
                            </p>
                          </div>
                        </div>

                        {/* Assigned state badge or rating */}
                        <div className="shrink-0 flex items-center gap-1">
                          {assignedPos ? (
                            <span className="text-[7.5px] font-mono bg-blue-900/50 text-blue-400 font-bold px-1 py-0.2 rounded border border-blue-800/30">
                              {assignedPos}
                            </span>
                          ) : (
                            <span className="text-[8.5px] font-mono text-amber-500 font-bold px-0.5">
                              ★{player.calificacion}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Tactical Pitch / Campograma View */}
              <div className="flex-1 overflow-x-auto pb-2 scrollbar-thin flex flex-col gap-3">
                {/* Tactical System Selector Bar */}
                <div className="min-w-[760px] max-w-[820px] mx-auto w-full flex items-center justify-between bg-slate-900/60 border border-slate-850 rounded-xl p-3 backdrop-blur-md shrink-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold uppercase text-slate-300">
                      Sistema Táctico:
                    </span>
                    <div className="flex gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                      {['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'].map((sys) => (
                        <button
                          key={sys}
                          type="button"
                          onClick={() => setTeamSystems(prev => ({ ...prev, [selectedTeam!]: sys }))}
                          className={`px-2 py-1 rounded font-mono text-[10px] font-bold transition-all cursor-pointer ${
                            activeSystem === sys
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          {sys}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Formación: <span className="font-bold text-emerald-400">{activeSystem}</span>
                  </div>
                </div>

                {/* Soccer Field Card with Green Background and Grass Cut Stripes */}
                <div className="min-w-[760px] max-w-[820px] mx-auto relative h-[740px] bg-gradient-to-b from-emerald-900 via-emerald-950 to-emerald-900 border border-emerald-800/40 rounded-xl overflow-hidden p-4 shadow-2xl shrink-0">
                  
                  {/* Grass cut horizontal stripes overlay */}
                  <div className="absolute inset-0 flex flex-col pointer-events-none opacity-15">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black/20' : 'bg-transparent'}`} />
                    ))}
                  </div>

                  {/* Soccer Field markings */}
                  <div className="absolute inset-4 border border-emerald-100/15 rounded-lg pointer-events-none">
                    {/* Penalty area (top) */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-28 border-b border-x border-emerald-100/15"></div>
                    {/* Goal area (top) */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[20%] h-10 border-b border-x border-emerald-100/15"></div>
                    {/* Penalty arc (top) */}
                    <div className="absolute top-28 left-1/2 -translate-x-1/2 w-20 h-8 rounded-b-full border-b border-x border-emerald-100/15 border-t-0"></div>

                    {/* Center Line */}
                    <div className="absolute top-1/2 left-0 right-0 border-t border-emerald-100/15 -translate-y-1/2"></div>
                    {/* Center Circle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-emerald-100/15"></div>
                    {/* Center Spot */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-100/25"></div>

                    {/* Penalty area (bottom) */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40%] h-28 border-t border-x border-emerald-100/15"></div>
                    {/* Goal area (bottom) */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[20%] h-10 border-t border-x border-emerald-100/15"></div>
                    {/* Penalty arc (bottom) */}
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-20 h-8 rounded-t-full border-t border-x border-emerald-100/15 border-b-0"></div>
                  </div>

                  {/* Tactical Positions Grid overlay dynamically generated by system */}
                  <div className="relative z-10 h-full flex flex-col justify-between py-4 select-none">
                    {(systemsLayouts[activeSystem] || systemsLayouts['4-3-3']).map((row, rIdx) => (
                      <div 
                        key={rIdx} 
                        className={row.gridColsClass ? row.gridColsClass : `flex ${row.justifyClass}`}
                      >
                        {row.positions.map((pos) => (
                          <PositionBox 
                            key={pos.positionId}
                            title={pos.title} 
                            colorClass={pos.colorClass} 
                            players={(activeLineup as any)[pos.key] || []} 
                            onSelectPlayer={onSelectPlayer}
                            onRemovePlayer={(playerId) => removePlayerFromPosition(playerId, pos.positionId)}
                            onDropPlayer={(playerId) => assignPlayerToPosition(playerId, pos.positionId)}
                            candidates={getCandidatesForPosition(pos.positionId, currentTeamRoster?.allPlayers || [])}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-8">
              {currentTeamRoster.sections.map((section, idx) => (
                <div key={idx} className="space-y-3">
                  
                  {/* Sector Header */}
                  <div className="flex items-center space-x-3 border-b border-slate-850/80 pb-2">
                    <PositionBadge code={section.code} size="sm" />
                    <span className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider">
                      {section.title}
                    </span>
                    <span className="px-1.5 py-0.2 bg-slate-950 text-[10px] text-slate-500 font-mono rounded border border-slate-850">
                      {section.players.length}
                    </span>
                  </div>

                  {/* Roster list content dependent on chosen viewMode */}
                  {viewMode === 'list' ? (
                    <div className="space-y-2">
                      {section.players.map((player) => {
                        const edad = new Date().getFullYear() - player.anoNacimiento;
                        const posCode = getPositionCode(player.posicion);
                        return (
                          <div 
                            key={player.id}
                            className="bg-slate-900 border border-slate-850/80 rounded-lg p-3 hover:border-slate-700/60 hover:bg-slate-900/80 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Position Badge Icon */}
                              <PositionBadge code={posCode} size="sm" />

                              {/* Avatar */}
                              <div 
                                className="w-10 h-10 rounded bg-slate-950/60 border border-slate-850 overflow-hidden shrink-0 flex items-center justify-center p-0.5 cursor-pointer"
                                onClick={() => onSelectPlayer(player)}
                              >
                                {player.fotoUrl ? (
                                  <img 
                                    src={player.fotoUrl} 
                                    alt={player.nombre} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-slate-600 group-hover:text-blue-500 transition-colors" />
                                )}
                              </div>

                              {/* Main information */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 
                                    className="font-bold text-xs text-white truncate hover:text-blue-400 cursor-pointer" 
                                    onClick={() => onSelectPlayer(player)}
                                  >
                                    {player.nombre}
                                  </h4>
                                  <span className="text-[9px] font-mono text-indigo-400 font-bold bg-indigo-950/30 px-1.5 py-0.2 rounded border border-indigo-900/20">
                                    {player.posicion}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                  {edad} años ({player.anoNacimiento}) • {player.lateralidad} • {player.altura || 'N/D'}
                                </div>
                              </div>
                            </div>

                            {/* Attributes cluster row format */}
                            <div className="flex items-center gap-3 bg-slate-950/40 px-3 py-1.5 rounded border border-slate-850/50 font-mono text-[11px] shrink-0">
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-500 text-[9px] font-bold">FÍS</span>
                                <span className="font-bold text-emerald-400">{player.atributos?.fisico ?? '0'}</span>
                              </div>
                              <div className="text-slate-800">|</div>
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-500 text-[9px] font-bold">TÉC</span>
                                <span className="font-bold text-blue-400">{player.atributos?.tecnica ?? '0'}</span>
                              </div>
                              <div className="text-slate-800">|</div>
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-500 text-[9px] font-bold">TÁC</span>
                                <span className="font-bold text-amber-500">{player.atributos?.tactica ?? '0'}</span>
                              </div>
                              <div className="text-slate-800">|</div>
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-500 text-[9px] font-bold">MEN</span>
                                <span className="font-bold text-purple-400">{player.atributos?.mental ?? '0'}</span>
                              </div>
                            </div>

                            {/* Rating stars level */}
                            <div className="text-amber-500 text-[10px] shrink-0 font-mono font-bold bg-slate-950/60 px-2 py-1 rounded border border-slate-850 flex items-center">
                              {'★'.repeat(player.calificacion)}
                            </div>

                            {/* Action Recommendation */}
                            <div className="shrink-0">
                              {player.recomendacion ? (
                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border ${
                                  (player.recomendacion === 'FIRMAR' || player.recomendacion === 'CONTRATAR') ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' :
                                  (player.recomendacion === 'SEGUIR' || player.recomendacion === 'SEGUIMIENTO') ? 'bg-blue-950/20 text-blue-400 border-blue-900/30' :
                                  (player.recomendacion === 'INTERESANTE' || player.recomendacion === 'EVALUAR') ? 'bg-amber-950/20 text-amber-400 border-amber-900/30' :
                                  player.recomendacion === 'DESCARTAR' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                                  'bg-slate-950 text-slate-400 border-slate-800'
                                }`}>
                                  {player.recomendacion}
                                </span>
                              ) : (
                                <span className="text-slate-600 italic text-[10px] font-mono">Sin acción</span>
                              )}
                            </div>

                            {/* Grouped Actions buttons info */}
                            <div className="flex items-center space-x-1 justify-end shrink-0 w-full lg:w-auto pt-2 lg:pt-0 border-t border-slate-850 lg:border-t-0">
                              <button
                                onClick={() => {
                                  onSelectPlayer(player);
                                  onEditReport(player);
                                }}
                                className="p-1 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded hover:text-white transition-all flex items-center space-x-1 text-[10px] font-mono font-bold"
                                title="Generar e imprimir informe de scouting"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-400" />
                                <span>Informe</span>
                              </button>

                              <button
                                onClick={() => onEditPlayer(player)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded hover:text-white transition-all"
                                title="Editar Perfil"
                              >
                                <Edit className="w-3.5 h-3.5 text-indigo-400" />
                              </button>

                              <button
                                onClick={() => setPlayerToDelete(player)}
                                className="p-1.5 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded transition-all"
                                title="Eliminar candidato"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Grid of Mini Player Cards inside team */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {section.players.map((player) => {
                        const edad = new Date().getFullYear() - player.anoNacimiento;
                        const posCode = getPositionCode(player.posicion);
                        return (
                          <div 
                            key={player.id}
                            className="bg-slate-900 border border-slate-850/80 rounded-lg p-4 hover:border-slate-700/60 hover:bg-slate-900/80 transition-all group flex flex-col justify-between space-y-4"
                          >
                            
                            <div className="flex items-start gap-3">
                              {/* Position Badge Icon */}
                              <PositionBadge code={posCode} size="sm" />

                              {/* Face image or avatar placeholder */}
                              <div className="w-11 h-11 rounded bg-slate-950/60 border border-slate-850 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                                {player.fotoUrl ? (
                                  <img 
                                    src={player.fotoUrl} 
                                    alt={player.nombre} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <User className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" />
                                )}
                              </div>

                              {/* Basic Player Stats */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <h4 className="font-bold text-xs text-white truncate hover:text-blue-400 cursor-pointer" onClick={() => onSelectPlayer(player)}>
                                  {player.nombre}
                                </h4>
                                <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                                  <div>{player.posicion}</div>
                                  <div className="text-slate-500">
                                    {player.anoNacimiento} ({edad} años) • {player.lateralidad}
                                  </div>
                                </div>
                              </div>

                              {/* Quick Stars Badge on top right */}
                              <div className="text-amber-500 text-xs tracking-tighter shrink-0 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850 font-mono flex items-center">
                                {'★'.repeat(player.calificacion)}
                              </div>
                            </div>

                            {/* Bottom action panel */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[10px] font-mono">
                              
                              {/* Recomendación status text */}
                              <div className="text-slate-400">
                                {player.recomendacion ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                                    (player.recomendacion === 'FIRMAR' || player.recomendacion === 'CONTRATAR') ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' :
                                    (player.recomendacion === 'SEGUIR' || player.recomendacion === 'SEGUIMIENTO') ? 'bg-blue-950/20 text-blue-400 border-blue-900/30' :
                                    (player.recomendacion === 'INTERESANTE' || player.recomendacion === 'EVALUAR') ? 'bg-amber-950/20 text-amber-400 border-amber-900/30' :
                                    player.recomendacion === 'DESCARTAR' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                                    'bg-slate-950 text-slate-400 border-slate-800'
                                  }`}>
                                    {player.recomendacion}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 italic">Sin recomendación</span>
                                )}
                              </div>

                              {/* Grouped Actions */}
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    onSelectPlayer(player);
                                    onEditReport(player);
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded hover:text-white transition-all flex items-center space-x-1"
                                  title="Generar e imprimir informe de scouting"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                                  <span className="text-[9px] font-bold hidden xl:inline">Informe</span>
                                </button>

                                <button
                                  onClick={() => onEditPlayer(player)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded hover:text-white transition-all"
                                  title="Editar Perfil"
                                >
                                  <Edit className="w-3.5 h-3.5 text-indigo-400" />
                                </button>

                                <button
                                  onClick={() => setPlayerToDelete(player)}
                                  className="p-1.5 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded transition-all"
                                  title="Eliminar candidato"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}

        </div>
      ) : (
        /* Team directories explorer (Main grid) */
        <div className="space-y-4">
          {filteredTeams.length === 0 ? (
            <div className="bg-slate-900 border border-slate-850 rounded-lg p-12 text-center text-slate-500 italic max-w-lg mx-auto">
              No se encontraron carpetas de equipo coincidentes con tu búsqueda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTeams.map((team) => {
                const count = team.players.length;

                return (
                  <div
                    key={team.name}
                    onClick={() => setSelectedTeam(team.name)}
                    className="group cursor-pointer bg-slate-900/50 hover:bg-slate-900 border border-slate-850/80 hover:border-slate-700 rounded-xl p-4 transition-all duration-300 shadow-md hover:shadow-lg flex items-center space-x-4 h-22 relative overflow-hidden"
                  >
                    {/* Visual subtle glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Team Crest Container - rounded square with dark border & shadow */}
                    <div className="w-14 h-14 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-center shrink-0 shadow-inner p-2 relative z-10">
                      <TeamLogo logoUrl={team.logoUrl} teamName={team.name} />
                    </div>

                    {/* Team Name - uppercase, bold, tracking wider */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <h4 className="font-extrabold text-xs sm:text-sm text-white tracking-wider uppercase truncate group-hover:text-blue-400 transition-colors">
                        {team.name}
                      </h4>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase mt-0.5 block">
                        {count === 1 ? '1 JUGADOR' : `${count} JUGADORES`}
                      </span>
                    </div>

                    {/* Simple chevron indicator on right */}
                    <div className="text-slate-500 group-hover:text-blue-400 transition-colors shrink-0 relative z-10 pr-1">
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  </>
);
}
