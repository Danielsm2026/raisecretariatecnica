import React, { useState } from 'react';
import { ScoutedPlayer, MatchReport } from '../types';
import { 
  Users, 
  Shield, 
  FileText, 
  Layout, 
  Video, 
  BarChart3, 
  Sparkles, 
  ChevronRight, 
  ArrowRight, 
  Trophy, 
  Star, 
  Activity,
  Plus,
  Edit2,
  Check,
  RotateCcw,
  Link2
} from 'lucide-react';

interface HomeViewProps {
  players: ScoutedPlayer[];
  matchReports: MatchReport[];
  setActiveTab: (tab: 'players' | 'matchReports' | 'teams' | 'tactical' | 'videoteca' | 'data_reports') => void;
  onAddPlayer: () => void;
}

export default function HomeView({ players, matchReports, setActiveTab, onAddPlayer }: HomeViewProps) {
  const [logoUrl, setLogoUrl] = useState(() => {
    return localStorage.getItem('real_aviles_logo_url') || 'https://cdn.resfu.com/img_data/equipos/2096.png?size=120x&lossy=1';
  });
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [tempUrl, setTempUrl] = useState(logoUrl);

  const handleSaveLogo = () => {
    const trimmed = tempUrl.trim();
    if (trimmed) {
      setLogoUrl(trimmed);
      localStorage.setItem('real_aviles_logo_url', trimmed);
    }
    setIsEditingLogo(false);
  };

  const handleResetLogo = () => {
    const defaultUrl = 'https://cdn.resfu.com/img_data/equipos/2096.png?size=120x&lossy=1';
    setLogoUrl(defaultUrl);
    setTempUrl(defaultUrl);
    localStorage.setItem('real_aviles_logo_url', defaultUrl);
    setIsEditingLogo(false);
  };

  // Extract statistics
  const totalPlayers = players.length;
  const totalTeams = new Set(players.filter(p => p.equipo).map(p => p.equipo.trim())).size;
  const totalReports = matchReports.length;
  const totalFichajes = players.filter(p => p.esFichajeVerano2026).length;
  
  // Calculate average rating of players
  const avgRating = totalPlayers > 0
    ? (players.reduce((sum, p) => sum + p.calificacion, 0) / totalPlayers).toFixed(1)
    : '0.0';

  // Card items config for the 7 sections
  const sections = [
    {
      id: 'players' as const,
      title: 'Base de datos de jugadores',
      subtitle: 'PLAYER PORTFOLIO',
      badge: `${totalPlayers} jugadores`,
      description: 'Gestión integral, filtrado avanzado por demarcación y pie, calificación de 1 a 5 estrellas, y fichas de seguimiento técnico detalladas con notas de campo.',
      icon: Users,
      color: 'from-blue-500/20 to-indigo-500/10',
      borderColor: 'border-blue-500/30 hover:border-blue-400',
      iconColor: 'text-blue-400',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      id: 'teams' as const,
      title: 'Equipos',
      subtitle: 'SQUAD ANALYSIS',
      badge: `${totalTeams} equipos`,
      description: 'Vista agrupada por clubes competidores. Análisis de distribución táctica, segmentación por plantilla y consulta directa de futbolistas por entidad deportiva.',
      icon: Shield,
      color: 'from-emerald-500/20 to-teal-500/10',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400',
      iconColor: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'matchReports' as const,
      title: 'Informes de Partidos',
      subtitle: 'MATCH SCOUTING',
      badge: `${totalReports} actas`,
      description: 'Registro técnico de actas de partidos. Evaluaciones de rendimiento colectivo, esquemas iniciales, notas de desarrollo y calificaciones personalizadas.',
      icon: FileText,
      color: 'from-amber-500/20 to-orange-500/10',
      borderColor: 'border-amber-500/30 hover:border-amber-400',
      iconColor: 'text-amber-400',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      id: 'tactical' as const,
      title: 'Campograma Táctico',
      subtitle: 'TACTICAL BOARD',
      badge: 'Pizarra interactiva',
      description: 'Herramienta de diseño estratégico. Configura alineaciones en tiempo real, ensaya movimientos, arrastra fichas y personaliza anotaciones visuales.',
      icon: Layout,
      color: 'from-purple-500/20 to-pink-500/10',
      borderColor: 'border-purple-500/30 hover:border-purple-400',
      iconColor: 'text-purple-400',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      id: 'videoteca' as const,
      title: 'Videoteca Técnica',
      subtitle: 'VIDEO ANALYSIS ROOM',
      badge: 'Clips técnicos',
      description: 'Análisis de video individual. Filtra jugadas por categorías (pases clave, regates, recuperaciones), reproduce cortes tácticos y asocia evidencia visual.',
      icon: Video,
      color: 'from-cyan-500/20 to-blue-500/10',
      borderColor: 'border-cyan-500/30 hover:border-cyan-400',
      iconColor: 'text-cyan-400',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    {
      id: 'data_reports' as const,
      title: 'Informes de Datos',
      subtitle: 'ADVANCED METRICS & METADATA',
      badge: 'Motor de Percentiles',
      description: 'Análisis estadístico avanzado. Compara mediapuntas creativos con percentiles de rendimiento por 90 minutos, gráficos de dispersión interactivos y exportación XLSX/CSV.',
      icon: BarChart3,
      color: 'from-rose-500/20 to-red-500/10',
      borderColor: 'border-rose-500/30 hover:border-rose-400',
      iconColor: 'text-rose-400',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }
  ];

  return (
    <div id="home-view-container" className="space-y-8 animate-fade-in pt-4">
      
      {/* Centered Crest and Title Header */}
      <div className="flex flex-col items-center justify-center text-center py-4 pb-2 space-y-4">
        <div className="relative group flex flex-col items-center">
          <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all duration-500 pointer-events-none" />
          <img 
            src={logoUrl}
            alt="Escudo Real Avilés Industrial CF"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain relative z-10 drop-shadow-2xl transition-transform duration-300 hover:scale-105 cursor-pointer"
            referrerPolicy="no-referrer"
            onClick={() => {
              setTempUrl(logoUrl);
              setIsEditingLogo(!isEditingLogo);
            }}
            onError={(e) => {
              e.currentTarget.src = "https://cdn.resfu.com/img_data/equipos/2096.png?size=120x&lossy=1";
            }}
          />
          <button
            onClick={() => {
              setTempUrl(logoUrl);
              setIsEditingLogo(!isEditingLogo);
            }}
            className="absolute -bottom-1 -right-1 z-20 p-1.5 bg-slate-900/90 border border-slate-800 hover:border-blue-500 rounded-full text-slate-400 hover:text-white transition shadow-lg hover:scale-110"
            title="Cambiar URL del Escudo"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {isEditingLogo && (
          <div className="relative z-30 max-w-sm w-full bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl space-y-2.5 animate-fade-in">
            <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
              <Link2 className="w-3.5 h-3.5 text-blue-400" />
              <span>URL del Escudo Oficial:</span>
            </div>
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="Introduce la URL del escudo..."
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={handleResetLogo}
                className="px-2 py-1 text-[9px] font-mono font-bold text-slate-500 hover:text-red-400 flex items-center space-x-1 border border-transparent hover:border-red-500/10 rounded transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar</span>
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsEditingLogo(false)}
                  className="px-2.5 py-1 text-[9px] font-mono font-bold text-slate-400 hover:text-white border border-slate-800 rounded transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveLogo}
                  className="px-2.5 py-1 text-[9px] font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center space-x-1 transition"
                >
                  <Check className="w-3 h-3" />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-widest text-white font-sans">
            SECRETARÍA TÉCNICA
          </h1>
          <p className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
            REAL AVILÉS INDUSTRIAL C.F.
          </p>
        </div>
      </div>

      {/* 2. Main Content Grid - Sections Cards */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-extrabold uppercase text-white tracking-widest flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Módulos y Apartados Operativos</span>
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">SISTEMA COMPLETO</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.id}
                onClick={() => setActiveTab(sec.id)}
                className={`group relative bg-gradient-to-br ${sec.color} border ${sec.borderColor} p-6 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/40 cursor-pointer flex items-center space-x-4`}
              >
                <div className={`p-3 bg-slate-900 border border-slate-800 rounded-lg group-hover:scale-110 transition-transform duration-300 ${sec.iconColor} shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-white group-hover:text-blue-400 transition-colors tracking-tight">
                    {sec.title}
                  </h3>
                </div>

                <div className="text-slate-500 group-hover:text-white transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
