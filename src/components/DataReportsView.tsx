import React, { useState, useMemo } from 'react';
import { ScoutedPlayer, MatchReport, getPhysicalCapacitiesByPosition, Position, Footedness } from '../types';
import { 
  BarChart4, 
  Users, 
  Award, 
  Calendar, 
  FileText, 
  Download, 
  Search, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Sliders, 
  UserCheck, 
  Dribbble, 
  Compass,
  Trophy,
  Filter,
  RefreshCw,
  Star,
  X,
  ChevronRight,
  Folder,
  FolderOpen,
  ArrowLeft,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { MEDIAPUNTA_ADVANCED_DATA, MediapuntaData } from '../data/mediapuntaAdvancedData';

interface PositionFolderConfig {
  id: string;
  name: string;
  code: string;
  matchPositions: string[];
  description: string;
  iconBg: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  isAdvanced?: boolean;
}

const POSITION_FOLDERS: PositionFolderConfig[] = [
  {
    id: 'Portero',
    name: 'Portero',
    code: 'POR',
    matchPositions: ['Portero'],
    description: 'Guardametas, blocajes, juego aéreo, reflejos y distribución con el pie.',
    iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    borderColor: 'hover:border-amber-500/50',
    textColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    id: 'Lateral Derecho',
    name: 'Lateral Derecho',
    code: 'LD',
    matchPositions: ['Lateral Derecho'],
    description: 'Carrileros diestros, profundidad ofensiva, centros y recorrido de banda.',
    iconBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    borderColor: 'hover:border-blue-500/50',
    textColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    id: 'Lateral Izquierdo',
    name: 'Lateral Izquierdo',
    code: 'LI',
    matchPositions: ['Lateral Izquierdo'],
    description: 'Carrileros zurdos, repliegue defensivo, pases al área y velocidad.',
    iconBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    borderColor: 'hover:border-cyan-500/50',
    textColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  {
    id: 'Defensa Central',
    name: 'Defensa Central',
    code: 'DFC',
    matchPositions: ['Defensa Central'],
    description: 'Centrales, contundencia en duelos, juego aéreo y salida de balón.',
    iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColor: 'hover:border-emerald-500/50',
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    id: 'Mediocentro',
    name: 'Mediocentro',
    code: 'MC',
    matchPositions: ['Mediocentro', 'Mediocentro Defensivo'],
    description: 'Pivotes defensivos, mediocentros organizadores y box-to-box.',
    iconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    borderColor: 'hover:border-purple-500/50',
    textColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  {
    id: 'Extremo',
    name: 'Extremo',
    code: 'EXT',
    matchPositions: ['Extremo Derecho', 'Extremo Izquierdo', 'Extremo'],
    description: 'Extremos a banda cambiada, desborde 1v1, centros y finalización.',
    iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    borderColor: 'hover:border-rose-500/50',
    textColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  {
    id: 'Mediapunta',
    name: 'Mediapunta',
    code: 'MCO',
    matchPositions: ['Mediapunta'],
    description: 'Creadores de juego, visión, xG/xA, pases clave y métricas avanzadas.',
    iconBg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    borderColor: 'hover:border-yellow-500/50',
    textColor: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    isAdvanced: true
  },
  {
    id: 'Delantero',
    name: 'Delantero',
    code: 'DC',
    matchPositions: ['Delantero Centro', 'Delantero'],
    description: 'Nueves de área, rematadores, xG, desmarques y presión arriba.',
    iconBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    borderColor: 'hover:border-indigo-500/50',
    textColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  }
];

const PERCENTILE_METRICS: Array<keyof MediapuntaData> = [
  'xG',
  'tiros',
  'toquesArea',
  'regatesZonaPeligrosa',
  'pctRegatesExito',
  'xA',
  'pasesClave',
  'pasesAcabanTiro',
  'pasesArea',
  'pctPasesAreaExito',
  'progresionesBalon',
  'pctProgresionesExito',
  'recuperacionesCampoRival'
];

interface DataReportsViewProps {
  players: ScoutedPlayer[];
  matchReports: MatchReport[];
}

type ReportSubTab = 'positional_advanced';

export default function DataReportsView({ players, matchReports }: DataReportsViewProps) {
  const [subTab, setSubTab] = useState<ReportSubTab>('positional_advanced');

  // Filters for Custom Report Generator (Explorer)
  const [filterPosition, setFilterPosition] = useState<string>('All');
  const [filterFoot, setFilterFoot] = useState<string>('All');
  const [filterRecommendation, setFilterRecommendation] = useState<string>('All');
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // States for Positional Advanced Tab
  const [posSearchQuery, setPosSearchQuery] = useState<string>('');
  const [posSortField, setPosSortField] = useState<keyof MediapuntaData | 'ranking'>('ranking');
  const [posSortAsc, setPosSortAsc] = useState<boolean>(false);
  const [posFilterTeam, setPosFilterTeam] = useState<string>('All');
  const [posFilterFoot, setPosFilterFoot] = useState<string>('All');
  const [selectedMediapunta, setSelectedMediapunta] = useState<MediapuntaData>(MEDIAPUNTA_ADVANCED_DATA[0]);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [scatterXAxis, setScatterXAxis] = useState<keyof MediapuntaData>('xG');
  const [scatterYAxis, setScatterYAxis] = useState<keyof MediapuntaData>('xA');
  const [hoveredScatterPoint, setHoveredScatterPoint] = useState<MediapuntaData | null>(null);

  // States and helper logic for Position Folders View
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const getFolderPlayerCount = (folder: PositionFolderConfig) => {
    if (folder.isAdvanced) {
      return MEDIAPUNTA_ADVANCED_DATA.length;
    }
    return players.filter(p => folder.matchPositions.some(pos => p.posicion === pos || p.posicion.includes(folder.id))).length;
  };

  // 1. CALCULATED GLOBAL METRICS
  const metrics = useMemo(() => {
    const totalPlayers = players.length;
    
    // Average overall rating (calificacion)
    const avgRating = totalPlayers > 0
      ? (players.reduce((sum, p) => sum + p.calificacion, 0) / totalPlayers).toFixed(1)
      : '0.0';

    // Market Value Sum
    const totalValue = players.reduce((sum, p) => sum + (p.valorMercado || 0), 0);

    // Filter Recommended to Sign (FIRMAR)
    const recommendedToSign = players.filter(p => p.recomendacion === 'FIRMAR').length;

    // Average Birth Year
    const avgBirthYear = totalPlayers > 0
      ? Math.round(players.reduce((sum, p) => sum + p.anoNacimiento, 0) / totalPlayers)
      : 2000;

    // Evaluated performance instances across all match reports
    let totalPerformances = 0;
    matchReports.forEach(report => {
      totalPerformances += (report.jugadoresLocal?.length || 0) + (report.jugadoresVisitante?.length || 0);
    });

    return {
      totalPlayers,
      avgRating,
      totalValue,
      recommendedToSign,
      avgBirthYear,
      totalPerformances,
      totalMatches: matchReports.length
    };
  }, [players, matchReports]);

  // 2. FILTERED PLAYERS (Explorer Sub-tab)
  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesPosition = filterPosition === 'All' || p.posicion === filterPosition;
      const matchesFoot = filterFoot === 'All' || p.lateralidad === filterFoot;
      const matchesRec = filterRecommendation === 'All' || p.recomendacion === filterRecommendation;
      const matchesRating = p.calificacion >= filterMinRating;
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = query === '' || 
        p.nombre.toLowerCase().includes(query) || 
        p.equipo.toLowerCase().includes(query) || 
        (p.notas && p.notas.toLowerCase().includes(query));

      return matchesPosition && matchesFoot && matchesRec && matchesRating && matchesSearch;
    });
  }, [players, filterPosition, filterFoot, filterRecommendation, filterMinRating, searchQuery]);

  // 3. STATS: AGE DEMOGRAPHICS
  const demographicsData = useMemo(() => {
    const years = players.map(p => p.anoNacimiento);
    const uniqueYears = Array.from(new Set(years)).sort((a,b) => a - b);
    
    return uniqueYears.map(year => {
      const count = players.filter(p => p.anoNacimiento === year).length;
      const avgScore = count > 0 
        ? (players.filter(p => p.anoNacimiento === year).reduce((sum, p) => sum + p.calificacion, 0) / count).toFixed(1)
        : '0.0';
      return { year, count, avgScore };
    });
  }, [players]);

  // 4. STATS: PHYSICAL CAPACITY STANDOUTS
  const physicalStandouts = useMemo(() => {
    const standouts: { player: ScoutedPlayer; capacities: string[]; avgRating: number }[] = [];

    players.forEach(p => {
      const matchPhys = getPhysicalCapacitiesByPosition(p.posicion);
      if (!matchPhys || !p.valoracionFisica) return;

      const caps = matchPhys.capacities;
      const topRatingsForPlayer: string[] = [];
      let totalStars = 0;
      let ratedCapsCount = 0;

      caps.forEach(cap => {
        const rating = p.valoracionFisica?.[cap];
        if (rating !== undefined) {
          totalStars += rating;
          ratedCapsCount++;
          if (rating >= 3) {
            topRatingsForPlayer.push(`${cap} (${rating}⭐)`);
          }
        }
      });

      if (ratedCapsCount > 0) {
        const avg = totalStars / ratedCapsCount;
        if (avg >= 2.5 || topRatingsForPlayer.length > 0) {
          standouts.push({
            player: p,
            capacities: topRatingsForPlayer,
            avgRating: parseFloat(avg.toFixed(1))
          });
        }
      }
    });

    return standouts.sort((a, b) => b.avgRating - a.avgRating);
  }, [players]);

  // 5. STATS: PHYSICAL CAPACITIES BY POSITION CATEGORY
  const physicalByPositionGroup = useMemo(() => {
    const categories = ['Portero', 'Defensa Central', 'Lateral', 'Mediocentro', 'Extremo', 'Delantero Centro'];
    const results: Record<string, { count: number; capacitiesSum: Record<string, number>; capacitiesCount: Record<string, number> }> = {};

    categories.forEach(cat => {
      results[cat] = { count: 0, capacitiesSum: {}, capacitiesCount: {} };
    });

    players.forEach(p => {
      const matchPhys = getPhysicalCapacitiesByPosition(p.posicion);
      if (!matchPhys || !p.valoracionFisica) return;

      const cat = matchPhys.category;
      if (!results[cat]) {
        results[cat] = { count: 0, capacitiesSum: {}, capacitiesCount: {} };
      }
      
      results[cat].count++;
      matchPhys.capacities.forEach(cap => {
        const val = p.valoracionFisica?.[cap];
        if (val !== undefined) {
          results[cat].capacitiesSum[cap] = (results[cat].capacitiesSum[cap] || 0) + val;
          results[cat].capacitiesCount[cap] = (results[cat].capacitiesCount[cap] || 0) + 1;
        }
      });
    });

    return Object.entries(results).map(([category, stats]) => {
      const averages = Object.entries(stats.capacitiesSum).map(([cap, sum]) => {
        const count = stats.capacitiesCount[cap];
        const avg = count > 0 ? (sum / count).toFixed(1) : '2.0';
        return { name: cap, avg: parseFloat(avg) };
      });
      return { category, count: stats.count, averages };
    }).filter(g => g.count > 0);
  }, [players]);

  // 6. STATS: TEAM REPRESENTATION
  const teamsStats = useMemo(() => {
    const counts: Record<string, { total: number; avgRating: number; players: ScoutedPlayer[] }> = {};
    players.forEach(p => {
      const originalTeam = p.equipo || 'Sin Equipo';
      const team = originalTeam.trim();
      if (!counts[team]) {
        counts[team] = { total: 0, avgRating: 0, players: [] };
      }
      counts[team].total++;
      counts[team].players.push(p);
    });

    return Object.entries(counts).map(([teamName, data]) => {
      const totalRating = data.players.reduce((sum, p) => sum + p.calificacion, 0);
      const avgRating = parseFloat((totalRating / data.total).toFixed(1));
      return { teamName, total: data.total, avgRating, players: data.players };
    }).sort((a,b) => b.total - a.total);
  }, [players]);

  // 7. STATS: COMPETITIONS FROM MATCH REPORTS
  const competitionsStats = useMemo(() => {
    const comptCounts: Record<string, { total: number; avgGoals: number; matches: MatchReport[] }> = {};
    matchReports.forEach(r => {
      const comp = r.competicion || 'Liga';
      if (!comptCounts[comp]) {
        comptCounts[comp] = { total: 0, avgGoals: 0, matches: [] };
      }
      comptCounts[comp].total++;
      comptCounts[comp].matches.push(r);
    });

    return Object.entries(comptCounts).map(([compName, data]) => {
      const totalGoals = data.matches.reduce((sum, m) => sum + (m.golesLocal + m.golesVisitante), 0);
      const avgGoals = parseFloat((totalGoals / data.total).toFixed(1));
      return { compName, total: data.total, avgGoals };
    }).sort((a,b) => b.total - a.total);
  }, [matchReports]);

  // 8. POSITIONAL ADVANCED DATA CALCULATIONS
  const posUniqueTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    MEDIAPUNTA_ADVANCED_DATA.forEach(p => {
      if (p.equipo) teamsSet.add(p.equipo.trim());
    });
    return Array.from(teamsSet).sort();
  }, []);

  // Percentiles Calculation and Row Rendering
  const calculatePercentile = (field: keyof MediapuntaData, value: number) => {
    const allValues = MEDIAPUNTA_ADVANCED_DATA.map(p => p[field]).filter((v): v is number => typeof v === 'number');
    if (allValues.length === 0) return 0;
    const sorted = [...allValues].sort((a, b) => a - b);
    const countAtOrBelow = sorted.filter(v => v <= value).length;
    return Math.round((countAtOrBelow / sorted.length) * 100);
  };

  // Precalculated player overall rankings (sum of percentiles of all percentile metrics)
  const playerRankings = useMemo(() => {
    const rankings: Record<string, number> = {};
    MEDIAPUNTA_ADVANCED_DATA.forEach(p => {
      let sum = 0;
      PERCENTILE_METRICS.forEach(field => {
        const value = p[field];
        if (typeof value === 'number') {
          sum += calculatePercentile(field, value);
        }
      });
      rankings[p.jugador] = sum;
    });
    return rankings;
  }, []);

  const filteredAndSortedMediapunta = useMemo(() => {
    let result = [...MEDIAPUNTA_ADVANCED_DATA];

    if (posSearchQuery.trim()) {
      const q = posSearchQuery.toLowerCase();
      result = result.filter(p => 
        p.jugador.toLowerCase().includes(q) || 
        p.equipo.toLowerCase().includes(q)
      );
    }

    if (posFilterTeam !== 'All') {
      result = result.filter(p => p.equipo === posFilterTeam);
    }

    if (posFilterFoot !== 'All') {
      result = result.filter(p => p.pieDominante === posFilterFoot);
    }

    // Sort
    result.sort((a, b) => {
      if (posSortField === 'ranking') {
        const aVal = playerRankings[a.jugador] || 0;
        const bVal = playerRankings[b.jugador] || 0;
        return posSortAsc ? aVal - bVal : bVal - aVal;
      }

      const aVal = a[posSortField];
      const bVal = b[posSortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return posSortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return posSortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [posSearchQuery, posFilterTeam, posFilterFoot, posSortField, posSortAsc, playerRankings]);

  const mediapuntaStatsSum = useMemo(() => {
    const count = filteredAndSortedMediapunta.length;
    if (count === 0) return { avgAge: 0, avgMin: 0, avgXG: 0, avgXA: 0, avgKeys: 0 };

    const totalAge = filteredAndSortedMediapunta.reduce((s, p) => s + p.edad, 0);
    const totalMin = filteredAndSortedMediapunta.reduce((s, p) => s + p.minutos, 0);
    const totalXG = filteredAndSortedMediapunta.reduce((s, p) => s + p.xG, 0);
    const totalXA = filteredAndSortedMediapunta.reduce((s, p) => s + p.xA, 0);
    const totalKeys = filteredAndSortedMediapunta.reduce((s, p) => s + p.pasesClave, 0);

    return {
      avgAge: parseFloat((totalAge / count).toFixed(1)),
      avgMin: Math.round(totalMin / count),
      avgXG: parseFloat((totalXG / count).toFixed(2)),
      avgXA: parseFloat((totalXA / count).toFixed(2)),
      avgKeys: parseFloat((totalKeys / count).toFixed(2))
    };
  }, [filteredAndSortedMediapunta]);

  const renderPercentileRow = (
    label: string, 
    field: keyof MediapuntaData, 
    value: number, 
    key: string,
    suffix: string = ''
  ) => {
    const pctl = calculatePercentile(field, value);
    
    let barColor = 'bg-slate-700';
    let textColor = 'text-slate-400';
    if (pctl >= 75) {
      barColor = 'bg-emerald-500';
      textColor = 'text-emerald-400 font-bold';
    }

    return (
      <div key={key} className="space-y-1">
        <div className="flex justify-between items-end text-[10.5px]">
          <span className="text-slate-400 font-sans">{label}</span>
          <div className="space-x-1.5 flex items-center">
            <span className="text-slate-200 font-mono font-medium">
              {typeof value === 'number' ? value.toFixed(2).replace(/\.00$/, '') : value}{suffix}
            </span>
            <span className={`${textColor} font-mono text-[10px]`}>P{pctl}</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-850/50">
          <div 
            className={`h-full ${barColor} transition-all duration-500`} 
            style={{ width: `${Math.max(2, pctl)}%` }}
          />
        </div>
      </div>
    );
  };



  const renderTableCell = (p: MediapuntaData, field: keyof MediapuntaData, isPercentage: boolean = false) => {
    const value = p[field] as number;
    const pctl = calculatePercentile(field, value);
    
    let colorClass = 'text-slate-300';
    if (pctl >= 75) {
      colorClass = 'bg-emerald-500/10 text-emerald-400 font-semibold';
    }

    const formattedValue = isPercentage ? `${value}%` : value.toFixed(2);

    return (
      <td className={`p-3 text-right font-mono border-r border-slate-850/40 transition-colors ${colorClass}`} title={`Percentil ${pctl}`}>
        <div className="flex items-center justify-between space-x-1 pl-1">
          <span className="text-[9px] opacity-70 font-semibold font-sans tracking-tight text-slate-400">P{pctl}</span>
          <span>{formattedValue}</span>
        </div>
      </td>
    );
  };

  const handleExportPositionalCSV = () => {
    const headers = [
      'Jugador', 'Ranking', 'Edad', 'Equipo', 'Pie dominante', 'Altura (cm)', 'Mins jugados',
      'Regates/90', '% Regates éxito', 'Pases clave/90', 'Recuperaciones campo rival/90',
      'Pases al área/90', '% Pases área éxito', 'Progresiones balón/90', '% Progresiones éxito',
      'Pases acaban tiro/90', 'Tiros/90', 'Toques área/90', 'xA/90', 'xG/90'
    ];

    const rows = filteredAndSortedMediapunta.map(p => [
      `"${p.jugador}"`, playerRankings[p.jugador] || 0, p.edad, `"${p.equipo}"`, `"${p.pieDominante}"`, p.altura, p.minutos,
      p.regatesZonaPeligrosa, p.pctRegatesExito, p.pasesClave, p.recuperacionesCampoRival,
      p.pasesArea, p.pctPasesAreaExito, p.progresionesBalon, p.pctProgresionesExito,
      p.pasesAcabanTiro, p.tiros, p.toquesArea, p.xA, p.xG
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `informe_mediapuntas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPositionalXLSX = () => {
    if (filteredAndSortedMediapunta.length === 0 && players.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const wb = XLSX.utils.book_new();

    if (filteredAndSortedMediapunta.length > 0) {
      const headers = [
        'Jugador', 'Ranking General', 'Edad', 'Equipo', 'Pie Dominante', 'Altura (cm)', 'Mins Jugados',
        'Regates/90', 'Percentil Regates', '% Regates Éxito', 'Percentil % Reg.Éxito',
        'Pases Clave/90', 'Percentil Pases Clave', 'Recuperaciones Campo Rival/90', 'Percentil Recup.Campo',
        'Pases al Área/90', 'Percentil Pases Área', '% Pases Área Éxito', 'Percentil % P.ÁreaÉxito',
        'Progresiones Balón/90', 'Percentil Prog.Balón', '% Progresiones Éxito', 'Percentil % Prog.Éxito',
        'Pases Acaban Tiro/90', 'Percentil P.Acab.Tiro', 'Tiros/90', 'Percentil Tiros',
        'Toques Área/90', 'Percentil Toques Área', 'xA/90', 'Percentil xA', 'xG/90', 'Percentil xG'
      ];

      const rows = filteredAndSortedMediapunta.map(p => [
        p.jugador,
        playerRankings[p.jugador] || 0,
        p.edad,
        p.equipo,
        p.pieDominante,
        p.altura,
        p.minutos,
        p.regatesZonaPeligrosa,
        calculatePercentile('regatesZonaPeligrosa', p.regatesZonaPeligrosa),
        p.pctRegatesExito,
        calculatePercentile('pctRegatesExito', p.pctRegatesExito),
        p.pasesClave,
        calculatePercentile('pasesClave', p.pasesClave),
        p.recuperacionesCampoRival,
        calculatePercentile('recuperacionesCampoRival', p.recuperacionesCampoRival),
        p.pasesArea,
        calculatePercentile('pasesArea', p.pasesArea),
        p.pctPasesAreaExito,
        calculatePercentile('pctPasesAreaExito', p.pctPasesAreaExito),
        p.progresionesBalon,
        calculatePercentile('progresionesBalon', p.progresionesBalon),
        p.pctProgresionesExito,
        calculatePercentile('pctProgresionesExito', p.pctProgresionesExito),
        p.pasesAcabanTiro,
        calculatePercentile('pasesAcabanTiro', p.pasesAcabanTiro),
        p.tiros,
        calculatePercentile('tiros', p.tiros),
        p.toquesArea,
        calculatePercentile('toquesArea', p.toquesArea),
        p.xA,
        calculatePercentile('xA', p.xA),
        p.xG,
        calculatePercentile('xG', p.xG)
      ]);

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      const maxCols = headers.map((h, i) => {
        const lengths = [h.length, ...rows.map(r => String(r[i] ?? '').length)];
        return { wch: Math.max(...lengths) + 2 };
      });
      ws['!cols'] = maxCols;

      // Inmovilizar la primera fila y las primeras siete columnas
      (ws as any)['!views'] = [
        {
          state: 'frozen',
          xSplit: 7,
          ySplit: 1,
          topLeftCell: 'H2',
          activePane: 'bottomRight'
        }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Mediapuntas (MCO)");
    }

    if (players.length > 0) {
      const headersGeneral = [
        'Nombre', 'Equipo', 'Categoría', 'Posición', 'Año Nacimiento', 'Lateralidad',
        'Valoración (1-5)', 'Valor de Mercado (€)', 'Recomendación', 'Notas'
      ];

      const rowsGeneral = players.map(p => [
        p.nombre,
        p.equipo,
        p.categoria || 'N/A',
        p.posicion,
        p.anoNacimiento,
        p.lateralidad,
        p.calificacion,
        p.valorMercado || 0,
        p.recomendacion || 'SEGUIMIENTO',
        p.notas || ''
      ]);

      const wsGeneralData = [headersGeneral, ...rowsGeneral];
      const wsGeneral = XLSX.utils.aoa_to_sheet(wsGeneralData);
      
      const maxColsGeneral = headersGeneral.map((h, i) => {
        const lengths = [h.length, ...rowsGeneral.map(r => String(r[i] ?? '').length)];
        return { wch: Math.max(...lengths) + 2 };
      });
      wsGeneral['!cols'] = maxColsGeneral;

      // Inmovilizar la primera fila y las primeras siete columnas
      (wsGeneral as any)['!views'] = [
        {
          state: 'frozen',
          xSplit: 7,
          ySplit: 1,
          topLeftCell: 'H2',
          activePane: 'bottomRight'
        }
      ];

      XLSX.utils.book_append_sheet(wb, wsGeneral, "Cartera General");
    }

    XLSX.writeFile(wb, `scouting_informe_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Helper formatting for currency
  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M €`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)}K €`;
    }
    return `${val} €`;
  };

  // EXPORT CURRENT FILTERED TABLE TO PDF
  const handleExportPDF = () => {
    if (filteredPlayers.length === 0) {
      alert('No hay futbolistas filtrados para exportar.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    // Add primary headers
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('INFORME DE DATOS - CARTERA DE SCOUTING', 14, 15);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    const subtitle = `Filtros activos: Posición=${filterPosition}, Pie=${filterFoot}, Rec=${filterRecommendation}, Valoración Min=${filterMinRating} ⭐. Total Jugadores: ${filteredPlayers.length}`;
    doc.text(subtitle, 14, 21);
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-ES')} | Generado por ScoutingRealAvilésCF`, 14, 25);

    const tableHeaders = [
      'Nombre', 
      'Equipo', 
      'Categoría', 
      'Posición', 
      'Nacimiento', 
      'Lateralidad', 
      'Valoración', 
      'Valor Mercado', 
      'Recomendación'
    ];

    const tableRows = filteredPlayers.map(p => [
      p.nombre,
      p.equipo,
      p.categoria || 'N/A',
      p.posicion,
      p.anoNacimiento.toString(),
      p.lateralidad,
      `${p.calificacion} / 5`,
      p.valorMercado ? formatCurrency(p.valorMercado) : 'N/A',
      p.recomendacion || 'SEGUIMIENTO'
    ]);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 30,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42], // Slate-900
        textColor: [255, 255, 255],
        fontSize: 9,
        font: 'helvetica',
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8.5,
        font: 'helvetica'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate-50
      },
      columnStyles: {
        6: { halign: 'center' },
        7: { halign: 'right' },
        8: { halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    // Save document
    const filename = `Informe_Scouting_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  // Preset quick-filters
  const handleResetFilters = () => {
    setFilterPosition('All');
    setFilterFoot('All');
    setFilterRecommendation('All');
    setFilterMinRating(0);
    setSearchQuery('');
  };

  return (
    <div id="data-reports-panel" className="space-y-6">
      {/* 1. TOP TITLE BANNER */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg">
              <Folder className="w-5 h-5 text-blue-400" />
            </span>
            <div>
              <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider">
                Módulo de Informes de Datos por Posición
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Carpetas de demarcación, base de datos segmentada y análisis de rendimiento de futbolistas.
              </p>
            </div>
          </div>
        </div>

        {selectedFolder && (
          <button
            onClick={() => setSelectedFolder(null)}
            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-mono font-bold transition-all border border-slate-700 shadow shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Volver a Carpetas</span>
          </button>
        )}
      </div>

      {/* 2. FOLDER DIRECTORY SCREEN (When selectedFolder === null) */}
      {selectedFolder === null ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Selecciona una Carpeta de Posición
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              8 Demarcaciones Disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {POSITION_FOLDERS.map((folder) => {
              const count = getFolderPlayerCount(folder);
              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`bg-slate-900/70 border border-slate-800/90 ${folder.borderColor} hover:bg-slate-850/90 rounded-xl p-5 transition-all duration-200 cursor-pointer group shadow-md hover:shadow-xl flex flex-col justify-between relative overflow-hidden`}
                >
                  {folder.isAdvanced && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-500 text-slate-950 text-[9px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-bl-lg shadow">
                      Módulo Avanzado
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className={`p-3 rounded-lg border ${folder.iconBg} group-hover:scale-105 transition-transform`}>
                        <Folder className="w-6 h-6" />
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${folder.badgeBg}`}>
                        {folder.code}
                      </span>
                    </div>

                    <h3 className={`text-base font-bold ${folder.textColor} group-hover:text-white transition-colors`}>
                      {folder.name}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {folder.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-slate-300">
                      {folder.isAdvanced ? `${count} Informes Avanzados` : `${count} ${count === 1 ? 'Futbolista' : 'Futbolistas'}`}
                    </span>
                    <div className="flex items-center space-x-1 text-xs font-mono text-blue-400 group-hover:text-blue-300">
                      <span>Abrir</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 3. OPENED FOLDER CONTENT VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-850 p-3 rounded-lg">
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-slate-400">Informes de Datos</span>
              <span className="text-slate-600">/</span>
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-bold uppercase">Carpeta: {selectedFolder}</span>
            </div>
            <button
              onClick={() => setSelectedFolder(null)}
              className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center space-x-1"
            >
              <span>← Cambiar Carpeta</span>
            </button>
          </div>

          {selectedFolder === 'Mediapunta' ? (
            <>
              {/* MEDIAPUNTA ADVANCED REPORT VIEW */}
            <div className="space-y-4">
              {/* Header controls box */}
              <div className="bg-slate-900/30 border border-slate-850/80 p-4 rounded-lg space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-850 pb-3 gap-2">
                  <div>
                    <span className="text-[11px] font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center">
                      <Sparkles className="w-4 h-4 text-amber-500 mr-2" />
                      Métricas Avanzadas por Posición
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-1">
                      Base de Datos de Mediapuntas (MCO) - Tercera RFEF y Canteras Elite
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleExportPositionalCSV}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center space-x-1.5 transition"
                    title="Exportar base completa a CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>

                  <button
                    onClick={handleExportPositionalXLSX}
                    className="bg-slate-900 hover:bg-slate-850 border border-emerald-800/80 text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center space-x-1.5 transition"
                    title="Exportar base completa a Excel (XLSX)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Excel (XLSX)</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setPosSearchQuery('');
                      setPosFilterTeam('All');
                      setPosFilterFoot('All');
                      setPosSortField('xG');
                      setPosSortAsc(false);
                    }}
                    className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center space-x-1 px-2 py-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resetear Filtros</span>
                  </button>
                </div>
              </div>

              {/* Filters control row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Search query input */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono text-slate-400 uppercase">Buscar Jugador / Club</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej. Álvaro Leiva, Castilla..."
                      value={posSearchQuery}
                      onChange={(e) => setPosSearchQuery(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-sans focus:outline-none focus:border-blue-500"
                    />
                    <Search className="w-3 h-3 text-slate-500 absolute right-2.5 top-2.5" />
                  </div>
                </div>

                {/* Team selector filter */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono text-slate-400 uppercase">Filtrar por Equipo</label>
                  <select
                    value={posFilterTeam}
                    onChange={(e) => setPosFilterTeam(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">Todos ({posUniqueTeams.length} Clubes)</option>
                    {posUniqueTeams.map((team) => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                {/* Foot filter */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-mono text-slate-400 uppercase">Pie Dominante</label>
                  <select
                    value={posFilterFoot}
                    onChange={(e) => setPosFilterFoot(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">Cualquier Pie</option>
                    <option value="Derecha">Derecha</option>
                    <option value="Izquierda">Izquierda</option>
                    <option value="Ambidiestro">Ambidiestro</option>
                  </select>
                </div>

                {/* Summary helper text */}
                <div className="bg-slate-950/40 border border-slate-850 p-2.5 rounded flex items-center justify-between text-xs text-slate-400">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-mono text-slate-500 block">Registros Filtrados</span>
                    <span className="font-mono font-bold text-white text-sm">{filteredAndSortedMediapunta.length}</span>
                    <span className="text-[10px] text-slate-400"> de 60 mediapuntas</span>
                  </div>
                  <div className="p-1.5 bg-blue-500/10 rounded border border-blue-500/20 text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Micro Dashboard Cards for the Filtered Mediapuntas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg">
                <span className="text-[8.5px] font-mono text-slate-500 uppercase block">Edad Promedio</span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">{mediapuntaStatsSum.avgAge} <span className="text-xs text-slate-400">años</span></span>
              </div>
              <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg">
                <span className="text-[8.5px] font-mono text-slate-500 uppercase block">Minutos promedio</span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">{mediapuntaStatsSum.avgMin} <span className="text-xs text-slate-400">min</span></span>
              </div>
              <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg">
                <span className="text-[8.5px] font-mono text-slate-500 uppercase block">Promedio xG /90</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">{mediapuntaStatsSum.avgXG}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg">
                <span className="text-[8.5px] font-mono text-slate-500 uppercase block">Promedio xA /90</span>
                <span className="text-lg font-bold font-mono text-sky-400 mt-0.5 block">{mediapuntaStatsSum.avgXA}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg col-span-2 md:col-span-1">
                <span className="text-[8.5px] font-mono text-slate-500 uppercase block">Pases Clave /90</span>
                <span className="text-lg font-bold font-mono text-amber-500 mt-0.5 block">{mediapuntaStatsSum.avgKeys}</span>
              </div>
            </div>



            {/* Color Legend for Percentile Tranches */}
            <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  Escala de Percentiles de Rendimiento
                </span>
                <p className="text-xs text-slate-450">
                  Las estadísticas están normalizadas, destacando en verde el rango excelente (75% - 100%) y mostrando de forma neutra y sin color los demás percentiles:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <div className="bg-slate-800/20 border border-slate-800/40 px-3 py-1.5 rounded flex items-center space-x-2 text-xs font-mono">
                  <span className="w-2.5 h-2.5 rounded bg-slate-600 shrink-0"></span>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-sans font-semibold text-[11px] leading-tight">Bajo</span>
                    <span className="text-slate-500 text-[10px]">0% - 25%</span>
                  </div>
                </div>
                <div className="bg-slate-800/20 border border-slate-800/40 px-3 py-1.5 rounded flex items-center space-x-2 text-xs font-mono">
                  <span className="w-2.5 h-2.5 rounded bg-slate-500 shrink-0"></span>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-sans font-semibold text-[11px] leading-tight">Medio-Bajo</span>
                    <span className="text-slate-500 text-[10px]">25% - 50%</span>
                  </div>
                </div>
                <div className="bg-slate-800/20 border border-slate-800/40 px-3 py-1.5 rounded flex items-center space-x-2 text-xs font-mono">
                  <span className="w-2.5 h-2.5 rounded bg-slate-450 shrink-0"></span>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-sans font-semibold text-[11px] leading-tight">Medio-Alto</span>
                    <span className="text-slate-500 text-[10px]">50% - 75%</span>
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded flex items-center space-x-2 text-xs font-mono">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0"></span>
                  <div className="flex flex-col">
                    <span className="text-slate-300 font-sans font-semibold text-[11px] leading-tight">Excelente</span>
                    <span className="text-emerald-400 text-[10px]">75% - 100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Big scrollable data table */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850 text-[10px] font-mono text-slate-400 uppercase">
                      <th className="p-3 font-semibold sticky left-0 bg-slate-950 z-10 min-w-[150px] border-r border-slate-850">
                        <button 
                          onClick={() => {
                            if (posSortField === 'jugador') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('jugador');
                              setPosSortAsc(true);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1"
                        >
                          <span>Jugador</span>
                          {posSortField === 'jugador' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[95px] text-amber-500" title="Suma de los percentiles de todas las métricas tácticas">
                        <button 
                          onClick={() => {
                            if (posSortField === 'ranking') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('ranking');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto font-sans font-bold text-amber-500 hover:text-amber-400"
                        >
                          <span>Ranking ★</span>
                          {posSortField === 'ranking' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right">
                        <button 
                          onClick={() => {
                            if (posSortField === 'edad') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('edad');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>Edad</span>
                          {posSortField === 'edad' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold min-w-[120px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'equipo') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('equipo');
                              setPosSortAsc(true);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1"
                        >
                          <span>Equipo</span>
                          {posSortField === 'equipo' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold">
                        <button 
                          onClick={() => {
                            if (posSortField === 'pieDominante') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('pieDominante');
                              setPosSortAsc(true);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1"
                        >
                          <span>Pie</span>
                          {posSortField === 'pieDominante' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right">
                        <button 
                          onClick={() => {
                            if (posSortField === 'altura') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('altura');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>Alt (cm)</span>
                          {posSortField === 'altura' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[80px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'minutos') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('minutos');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>Mins</span>
                          {posSortField === 'minutos' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[100px]" title="Regates en zona peligrosa por 90">
                        <button 
                          onClick={() => {
                            if (posSortField === 'regatesZonaPeligrosa') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('regatesZonaPeligrosa');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>Reg. Pel/90</span>
                          {posSortField === 'regatesZonaPeligrosa' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[105px]" title="% Regates en zona peligrosa con éxito">
                        <button 
                          onClick={() => {
                            if (posSortField === 'pctRegatesExito') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('pctRegatesExito');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>% Reg.Éxito</span>
                          {posSortField === 'pctRegatesExito' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[105px]" title="Pases Clave por 90">
                        <button 
                          onClick={() => {
                            if (posSortField === 'pasesClave') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('pasesClave');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>P.Clave/90</span>
                          {posSortField === 'pasesClave' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[110px]" title="Recuperaciones de balón en campo rival por 90">
                        <button 
                          onClick={() => {
                            if (posSortField === 'recuperacionesCampoRival') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('recuperacionesCampoRival');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>Recup.Campo/90</span>
                          {posSortField === 'recuperacionesCampoRival' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[105px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'pasesArea') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('pasesArea');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>PasesÁrea/90</span>
                          {posSortField === 'pasesArea' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[95px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'pctPasesAreaExito') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('pctPasesAreaExito');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>% P.ÁreaÉxito</span>
                          {posSortField === 'pctPasesAreaExito' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[95px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'progresionesBalon') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('progresionesBalon');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>Prog.Balón/90</span>
                          {posSortField === 'progresionesBalon' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[90px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'pctProgresionesExito') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('pctProgresionesExito');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>% Prog.Éxito</span>
                          {posSortField === 'pctProgresionesExito' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[95px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'pasesAcabanTiro') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('pasesAcabanTiro');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>P.Acab.Tiro/90</span>
                          {posSortField === 'pasesAcabanTiro' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[85px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'tiros') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('tiros');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>Tiros/90</span>
                          {posSortField === 'tiros' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[95px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'toquesArea') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('toquesArea');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>ToquesÁrea/90</span>
                          {posSortField === 'toquesArea' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[75px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'xA') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('xA');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>xA/90</span>
                          {posSortField === 'xA' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-right min-w-[75px]">
                        <button 
                          onClick={() => {
                            if (posSortField === 'xG') {
                              setPosSortAsc(!posSortAsc);
                            } else {
                              setPosSortField('xG');
                              setPosSortAsc(false);
                            }
                          }}
                          className="hover:text-white flex items-center space-x-1 ml-auto"
                        >
                          <span>xG/90</span>
                          {posSortField === 'xG' && (posSortAsc ? ' ▲' : ' ▼')}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedMediapunta.map((p, idx) => {
                      const isHighXG = p.xG >= 0.25;
                      const isHighXA = p.xA >= 0.15;
                      const isHighKeys = p.pasesClave >= 0.50;
                      const isSelected = selectedMediapunta.jugador === p.jugador;
                      return (
                        <tr 
                          key={`${p.jugador}-${idx}`} 
                          onClick={() => {
                            setSelectedMediapunta(p);
                            setIsAnalysisModalOpen(true);
                          }}
                          className={`border-b border-slate-850/60 hover:bg-slate-900/40 text-xs font-sans transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-500/10' : ''
                          }`}
                        >
                          <td className={`p-3 sticky left-0 font-semibold text-white border-r border-slate-850/80 transition-colors ${
                            isSelected ? 'bg-slate-900' : 'bg-slate-950'
                          }`}>
                            <span className="text-[10px] text-slate-500 font-mono mr-1.5">{(idx+1).toString().padStart(2, '0')}</span>
                            {p.jugador}
                          </td>
                          <td className="p-3 text-right border-r border-slate-850/30">
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold text-xs" title="Suma acumulada de percentiles de rendimiento en las 13 métricas">
                              {playerRankings[p.jugador] || 0}
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-300 font-mono">{p.edad}</td>
                          <td className="p-3 text-slate-300 font-sans">{p.equipo}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              p.pieDominante === 'Derecha' ? 'bg-blue-500/10 text-blue-400' :
                              p.pieDominante === 'Izquierda' ? 'bg-purple-500/10 text-purple-400' :
                              'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {p.pieDominante}
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-300 font-mono">{p.altura}</td>
                          <td className="p-3 text-right text-slate-400 font-mono">{p.minutos}</td>
                          {renderTableCell(p, 'regatesZonaPeligrosa')}
                          {renderTableCell(p, 'pctRegatesExito', true)}
                          {renderTableCell(p, 'pasesClave')}
                          {renderTableCell(p, 'recuperacionesCampoRival')}
                          {renderTableCell(p, 'pasesArea')}
                          {renderTableCell(p, 'pctPasesAreaExito', true)}
                          {renderTableCell(p, 'progresionesBalon')}
                          {renderTableCell(p, 'pctProgresionesExito', true)}
                          {renderTableCell(p, 'pasesAcabanTiro')}
                          {renderTableCell(p, 'tiros')}
                          {renderTableCell(p, 'toquesArea')}
                          {renderTableCell(p, 'xA')}
                          {renderTableCell(p, 'xG')}
                        </tr>
                      );
                    })}

                    {filteredAndSortedMediapunta.length === 0 && (
                      <tr>
                        <td colSpan={20} className="p-8 text-center text-slate-500 font-mono font-bold text-slate-400">
                          No se encontraron mediapuntas que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed bg-slate-900/20 border border-slate-850 p-3 rounded">
              💡 <strong>Instrucciones de Análisis:</strong> Los datos superiores corresponden a promedios normalizados por 90 minutos de juego (excepto minutos totales, edad y altura). Puedes ordenar por cualquiera de las métricas clave haciendo clic directamente sobre el título de su columna. Las celdas estadísticas están coloreadas automáticamente en cuatro gamas exactas por percentil de rendimiento: <span className="text-red-400">Rojo (0-25%)</span>, <span className="text-orange-400">Naranja (25-50%)</span>, <span className="text-blue-400">Azul (50-75%)</span> y <span className="text-emerald-400 font-bold">Verde (75-100%)</span>.
            </p>
          </div>
        </div>

      {/* MODAL DE ANÁLISIS DE DISPERSIÓN Y VALOR POR 90 */}
      {isAnalysisModalOpen && selectedMediapunta && (() => {
        // Calculations for Scatter Plot
        const xField = scatterXAxis;
        const yField = scatterYAxis;
        const xVals = MEDIAPUNTA_ADVANCED_DATA.map(p => p[xField] as number);
        const yVals = MEDIAPUNTA_ADVANCED_DATA.map(p => p[yField] as number);
        const minXVal = Math.min(...xVals);
        const maxXVal = Math.max(...xVals);
        const minYVal = Math.min(...yVals);
        const maxYVal = Math.max(...yVals);
        
        const padX = (maxXVal - minXVal) * 0.1 || 0.1;
        const padY = (maxYVal - minYVal) * 0.1 || 0.1;
        const xMin = Math.max(0, minXVal - padX);
        const xMax = maxXVal + padX;
        const yMin = Math.max(0, minYVal - padY);
        const yMax = maxYVal + padY;

        const getXCoord = (val: number) => {
          const range = xMax - xMin;
          if (range === 0) return 45 + 435 / 2;
          return 45 + ((val - xMin) / range) * 435;
        };
        const getYCoord = (val: number) => {
          const range = yMax - yMin;
          if (range === 0) return 20 + 260 / 2;
          return 20 + 260 - ((val - yMin) / range) * 260;
        };

        const sortedX = [...xVals].sort((a,b) => a-b);
        const sortedY = [...yVals].sort((a,b) => a-b);
        const medianX = sortedX[Math.floor(sortedX.length / 2)] || 0;
        const medianY = sortedY[Math.floor(sortedY.length / 2)] || 0;
        
        const midXCoord = getXCoord(medianX);
        const midYCoord = getYCoord(medianY);

        const currentXVal = selectedMediapunta[xField] as number;
        const currentYVal = selectedMediapunta[yField] as number;
        const currentXPctl = calculatePercentile(xField, currentXVal);
        const currentYPctl = calculatePercentile(yField, currentYVal);

        const scatterMetrics: { key: keyof MediapuntaData; label: string }[] = [
          { key: 'xG', label: 'Goles Esperados (xG/90)' },
          { key: 'tiros', label: 'Tiros (Tiros/90)' },
          { key: 'toquesArea', label: 'Toques en Área (ToquesÁrea/90)' },
          { key: 'regatesZonaPeligrosa', label: 'Regates en Zona Peligrosa (Reg. Pel/90)' },
          { key: 'pctRegatesExito', label: '% Regates con Éxito (% Reg.Éxito)' },
          { key: 'xA', label: 'Asistencias Esperadas (xA/90)' },
          { key: 'pasesClave', label: 'Pases Clave (P.Clave/90)' },
          { key: 'pasesAcabanTiro', label: 'Pases que Acaban en Tiro (P.Acab.Tiro/90)' },
          { key: 'pasesArea', label: 'Pases al Área (PasesÁrea/90)' },
          { key: 'pctPasesAreaExito', label: '% Pases al Área con Éxito (% P.ÁreaÉxito)' },
          { key: 'progresionesBalon', label: 'Progresiones con Balón (Prog.Balón/90)' },
          { key: 'pctProgresionesExito', label: '% Progresiones con Éxito (% Prog.Éxito)' },
          { key: 'recuperacionesCampoRival', label: 'Recuperaciones Campo Rival (Recup.Campo/90)' },
        ];

        // Custom metrics mapping for the "VALOR POR 90'" card
        const barMetrics = [
          { label: 'Goles Esperados (xG/90)', value: selectedMediapunta.xG, key: 'xG' },
          { label: 'Tiros (Tiros/90)', value: selectedMediapunta.tiros, key: 'tiros' },
          { label: 'Toques en Área Rival (ToquesÁrea/90)', value: selectedMediapunta.toquesArea, key: 'toquesArea' },
          { label: 'Regates en Zona Peligrosa (Reg. Pel/90)', value: selectedMediapunta.regatesZonaPeligrosa, key: 'regatesZonaPeligrosa' },
          { label: '% Regates con Éxito (% Reg.Éxito)', value: selectedMediapunta.pctRegatesExito, key: 'pctRegatesExito', isPercentage: true },
          { label: 'Asistencias Esperadas (xA/90)', value: selectedMediapunta.xA, key: 'xA' },
          { label: 'Pases Clave (P.Clave/90)', value: selectedMediapunta.pasesClave, key: 'pasesClave' },
          { label: 'Pases que Acaban en Tiro (P.Acab.Tiro/90)', value: selectedMediapunta.pasesAcabanTiro, key: 'pasesAcabanTiro' },
          { label: 'Pases al Área (PasesÁrea/90)', value: selectedMediapunta.pasesArea, key: 'pasesArea' },
          { label: '% Pases al Área con Éxito (% P.ÁreaÉxito)', value: selectedMediapunta.pctPasesAreaExito, key: 'pctPasesAreaExito', isPercentage: true },
          { label: 'Progresiones con Balón (Prog.Balón/90)', value: selectedMediapunta.progresionesBalon, key: 'progresionesBalon' },
          { label: '% Progresiones con Éxito (% Prog.Éxito)', value: selectedMediapunta.pctProgresionesExito, key: 'pctProgresionesExito', isPercentage: true },
          { label: 'Recuperaciones Campo Rival (Recup.Campo/90)', value: selectedMediapunta.recuperacionesCampoRival, key: 'recuperacionesCampoRival' },
        ];

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-6xl w-full p-6 relative shadow-2xl space-y-6 text-white overflow-hidden my-8">
              {/* Top Title Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded bg-blue-550/10 border border-blue-500/25 flex items-center justify-center text-blue-400 font-mono font-bold">
                    {selectedMediapunta.equipo.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      {selectedMediapunta.jugador}
                      <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-mono">
                        {selectedMediapunta.edad} años
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Ficha Analítica e Inteligencia Posicional • {selectedMediapunta.equipo}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAnalysisModalOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Content: Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column (Span 5): VALOR POR 90' (Bar Chart) */}
                <div className="lg:col-span-5 bg-slate-950/80 border border-slate-850 p-5 rounded-xl space-y-4 relative overflow-hidden flex flex-col justify-between">
                  {/* Grid Lines in background */}
                  <div className="absolute inset-0 flex justify-between pointer-events-none px-6">
                    <div className="w-px h-full border-l border-dashed border-slate-900" />
                    <div className="w-px h-full border-l border-dashed border-slate-900" />
                    <div className="w-px h-full border-l border-dashed border-slate-900" />
                    <div className="w-px h-full border-l border-dashed border-slate-900" />
                    <div className="w-px h-full border-l border-dashed border-slate-900" />
                  </div>

                  <div className="relative z-10 space-y-1">
                    <span className="text-[10px] font-bold font-mono text-amber-500 uppercase tracking-widest block">
                      ⚡ MÉTRICAS POR 90 MINUTOS
                    </span>
                    <h3 className="text-sm font-extrabold uppercase text-white tracking-tight flex items-center gap-1.5">
                      VALOR POR 90' ({barMetrics.length} métricas)
                    </h3>
                  </div>

                  {/* Scrollable metrics container */}
                  <div className="relative z-10 space-y-4 py-2 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-800">
                    {barMetrics.map((m, i) => {
                      const pctl = calculatePercentile(m.key as keyof MediapuntaData, m.value);
                      const isExcellent = pctl >= 75;
                      return (
                        <div key={m.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-300 font-sans text-[11px]">{m.label}</span>
                            <div className="font-mono text-[11px] text-slate-400 flex items-center space-x-1">
                              <span className="text-emerald-400 font-bold">{m.value}{'isPercentage' in m && m.isPercentage ? '%' : ''}</span>
                              <span className="text-[10px] text-slate-500">•</span>
                              <span className="text-amber-400 font-semibold">Pctl {pctl}%</span>
                            </div>
                          </div>
                          
                          <div className="bg-slate-900/90 rounded-sm h-3.5 overflow-hidden border border-slate-850/80 relative flex items-center">
                            <div 
                              className={`h-full rounded-sm transition-all duration-500 ${
                                isExcellent 
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                  : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              }`}
                              style={{ width: `${Math.max(4, pctl)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative z-10 bg-slate-900/50 border border-slate-850/50 p-3 rounded-lg text-[10.5px] text-slate-400 leading-relaxed font-sans">
                    💡 Las barras horizontales se autocalibran en tiempo real usando el percentil del jugador frente a los otros 60 mediapuntas de la liga. Las marcas en <span className="text-emerald-400 font-bold">Verde</span> indican habilidades en rango excelente (top 25%).
                  </div>
                </div>

                {/* Right Column (Span 7): Scatter Plot */}
                <div className="lg:col-span-7 bg-slate-950/80 border border-slate-850 p-5 rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest block">
                        📊 MAPA DE DISPERSIÓN COMPLETO
                      </span>
                      <h3 className="text-sm font-semibold text-white mt-0.5">
                        Posicionamiento frente al Grupo de Mediapuntas
                      </h3>
                    </div>
                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col">
                        <span className="text-[8.5px] font-mono text-slate-500 uppercase">Eje X</span>
                        <select
                          value={scatterXAxis}
                          onChange={(e) => setScatterXAxis(e.target.value as keyof MediapuntaData)}
                          className="bg-slate-900 border border-slate-800 text-[10px] font-mono rounded px-1.5 py-1 text-slate-300 focus:outline-none focus:border-blue-500"
                        >
                          {scatterMetrics.map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8.5px] font-mono text-slate-500 uppercase">Eje Y</span>
                        <select
                          value={scatterYAxis}
                          onChange={(e) => setScatterYAxis(e.target.value as keyof MediapuntaData)}
                          className="bg-slate-900 border border-slate-800 text-[10px] font-mono rounded px-1.5 py-1 text-slate-300 focus:outline-none focus:border-blue-500"
                        >
                          {scatterMetrics.map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SVG scatter plot */}
                  <div className="relative bg-slate-900/50 rounded-lg p-3 border border-slate-850/60 overflow-hidden">
                    <svg viewBox="0 0 500 320" className="w-full h-auto">
                      {/* background coordinates or grids */}
                      <rect x="45" y="20" width="435" height="260" fill="rgba(15, 23, 42, 0.4)" />
                      
                      {/* Dashed grid dividing quadrants */}
                      <line x1={midXCoord} y1="20" x2={midXCoord} y2="280" stroke="rgba(255, 255, 255, 0.12)" strokeDasharray="4" />
                      <line x1="45" y1={midYCoord} x2="480" y2={midYCoord} stroke="rgba(255, 255, 255, 0.12)" strokeDasharray="4" />

                      {/* Quadrant Text Labels */}
                      <text x="470" y="32" textAnchor="end" className="text-[8px] font-mono fill-emerald-500/60 font-bold uppercase">Elite / Completo</text>
                      <text x="55" y="32" textAnchor="start" className="text-[8px] font-mono fill-sky-400/50 uppercase">Creador Puro</text>
                      <text x="470" y="272" textAnchor="end" className="text-[8px] font-mono fill-amber-500/50 uppercase">Finalizador Puro</text>
                      <text x="55" y="272" textAnchor="start" className="text-[8px] font-mono fill-slate-500/50 uppercase">Bajo Impacto</text>

                      {/* Tick Labels */}
                      {/* X ticks (bottom) */}
                      <text x="45" y="295" textAnchor="middle" className="text-[8px] font-mono fill-slate-500">{xMin.toFixed(1)}</text>
                      <text x={midXCoord} y="295" textAnchor="middle" className="text-[8px] font-mono fill-slate-400 font-bold">{medianX.toFixed(2)} (Mediana)</text>
                      <text x="480" y="295" textAnchor="middle" className="text-[8px] font-mono fill-slate-500">{xMax.toFixed(1)}</text>

                      {/* Y ticks (left) */}
                      <text x="38" y="280" textAnchor="end" className="text-[8px] font-mono fill-slate-500">{yMin.toFixed(2)}</text>
                      <text x="38" y={midYCoord + 3} textAnchor="end" className="text-[8px] font-mono fill-slate-400 font-bold">{medianY.toFixed(2)}</text>
                      <text x="38" y="25" textAnchor="end" className="text-[8px] font-mono fill-slate-500">{yMax.toFixed(2)}</text>

                      {/* Axis Titles */}
                      <text x="260" y="312" textAnchor="middle" className="text-[9.5px] font-mono font-bold fill-slate-300 uppercase tracking-wide">
                        {scatterMetrics.find(m => m.key === xField)?.label}
                      </text>
                      <text x="12" y="150" textAnchor="middle" transform="rotate(-90 12 150)" className="text-[9.5px] font-mono font-bold fill-slate-300 uppercase tracking-wide">
                        {scatterMetrics.find(m => m.key === yField)?.label}
                      </text>

                      {/* Plot points */}
                      {MEDIAPUNTA_ADVANCED_DATA.map((pt, idx) => {
                        const pxVal = pt[xField] as number;
                        const pyVal = pt[yField] as number;
                        const cx = getXCoord(pxVal);
                        const cy = getYCoord(pyVal);
                        const isSelected = pt.jugador === selectedMediapunta.jugador;
                        const isHovered = hoveredScatterPoint && hoveredScatterPoint.jugador === pt.jugador;
                        
                        return (
                          <g key={`${pt.jugador}-${idx}`}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected ? 6.5 : isHovered ? 5.5 : 3.5}
                              className={`transition-all duration-150 cursor-pointer ${
                                isSelected 
                                  ? 'fill-amber-400 stroke-white stroke-2' 
                                  : isHovered
                                  ? 'fill-sky-400 stroke-white stroke-[0.5]'
                                  : 'fill-blue-500/40 stroke-slate-950 stroke-[0.5] hover:fill-blue-400'
                              }`}
                              onClick={() => setSelectedMediapunta(pt)}
                              onMouseEnter={() => setHoveredScatterPoint(pt)}
                              onMouseLeave={() => setHoveredScatterPoint(null)}
                            />
                            {isSelected && (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={11}
                                className="fill-none stroke-amber-400 stroke-[1.5] animate-ping pointer-events-none"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Float Overlay tooltip for hovered/selected point */}
                    {hoveredScatterPoint && (
                      <div className="absolute top-2 right-2 bg-slate-950/95 border border-slate-800 p-2 rounded text-[10px] font-mono text-slate-200 shadow-xl space-y-0.5 z-10">
                        <div className="font-bold text-white text-[11px]">{hoveredScatterPoint.jugador}</div>
                        <div>Equipo: {hoveredScatterPoint.equipo}</div>
                        <div>{scatterMetrics.find(m => m.key === xField)?.label}: <span className="text-amber-400">{hoveredScatterPoint[xField]}</span></div>
                        <div>{scatterMetrics.find(m => m.key === yField)?.label}: <span className="text-sky-400">{hoveredScatterPoint[yField]}</span></div>
                      </div>
                    )}
                  </div>

                  {/* Info Row of Selected Player */}
                  <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        Punto Seleccionado: {selectedMediapunta.jugador}
                      </div>
                      <div className="text-[10.5px] text-slate-400 mt-1 flex flex-wrap gap-x-3">
                        <span>{selectedMediapunta.equipo}</span>
                        <span>•</span>
                        <span>Pie: {selectedMediapunta.pieDominante}</span>
                        <span>•</span>
                        <span>Minutos: {selectedMediapunta.minutos}m</span>
                      </div>
                    </div>
                    <div className="font-mono text-right shrink-0">
                      <div className="text-[11px] text-slate-300">
                        {scatterMetrics.find(m => m.key === xField)?.label.split('(')[0].trim()}: <span className="font-bold text-amber-400">{currentXVal}</span> (Pctl {currentXPctl}%)
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {scatterMetrics.find(m => m.key === yField)?.label.split('(')[0].trim()}: <span className="font-bold text-sky-400">{currentYVal}</span> (Pctl {currentYPctl}%)
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Instructions or Actions */}
              <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
                <span>
                  💡 Puedes hacer clic directamente en cualquier punto del gráfico de dispersión para cambiar el jugador analizado en ambas pantallas.
                </span>
                <button
                  onClick={() => setIsAnalysisModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded transition-colors"
                >
                  Cerrar Análisis
                </button>
              </div>

            </div>
          </div>
        );
      })()}
            </>
          ) : (
            (() => {
              const currentFolderConfig = POSITION_FOLDERS.find(f => f.id === selectedFolder);
              return (
                <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-xl text-center space-y-4 max-w-xl mx-auto my-8 shadow-lg">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold font-mono text-white">
                      Carpeta: {currentFolderConfig?.name || selectedFolder}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      El módulo de informes de datos avanzados para esta posición se encuentra en fase de integración.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center space-x-3">
                    <button
                      onClick={() => setSelectedFolder('Mediapunta')}
                      className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded text-xs font-mono font-bold transition flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ver Módulo Avanzado (Mediapunta)</span>
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
