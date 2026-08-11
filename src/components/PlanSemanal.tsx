import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  FileText, 
  Users, 
  RotateCcw,
  ArrowLeft,
  Search,
  Clock,
  ChevronRight,
  Sparkles,
  Database,
  Cloud,
  RefreshCw,
  UploadCloud,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

import { 
  isSupabaseConfigured, 
  dbFetchPlanSemanalWeeksWithStatus, 
  dbSavePlanSemanalWeeksWithStatus,
  getSQLInstructions
} from '../utils/supabaseClient';

export interface PlanSemanalMatch {
  id: string;
  diaSemana: 'LUNES' | 'MARTES' | 'MIÉRCOLES' | 'JUEVES' | 'VIERNES' | 'SÁBADO' | 'DOMINGO';
  fechaStr: string; // e.g. '08/06/2026'
  partido: string; // e.g. 'ZAMORA C.F. VS C.E. SABADELL'
  hora: string; // e.g. '21:00'
  grupo: string; // e.g. 'PLAYOFF ASCENSO'
  scout: string; // e.g. 'MIGUEL/ANTONIO'
  modalidad: 'DIRECTO' | 'VÍDEO' | 'TELEVISIÓN';
  acreditaciones: 'CONFIRMADA' | 'PENDIENTE' | 'SOLICITADA' | 'NO REQUERIDA' | 'DENEGADA';
}

export interface SemanaPlan {
  id: string;
  nombre: string; // e.g. "Semana_01"
  fechaInicio: string; // e.g. "25-08-25"
  fechaFin: string; // e.g. "31-08-25"
  filename: string; // e.g. "Semana_01 del 25-08-25 al 31-08-25.docx"
  partidos: PlanSemanalMatch[];
}

const INITIAL_SAMPLE_MATCHES: PlanSemanalMatch[] = [
  {
    id: 'plan_1',
    diaSemana: 'LUNES',
    fechaStr: '08/06/2026',
    partido: 'PONTEVEDRA CF VS OURENSE CF',
    hora: '18:00',
    grupo: 'SEGUNDA RFEF',
    scout: 'ANTONIO',
    modalidad: 'VÍDEO',
    acreditaciones: 'NO REQUERIDA'
  },
  {
    id: 'plan_3',
    diaSemana: 'MIÉRCOLES',
    fechaStr: '10/06/2026',
    partido: 'REAL AVILÉS INDUSTRIAL VS C.F. TALAVERA',
    hora: '19:30',
    grupo: 'PRIMERA RFEF',
    scout: 'MIGUEL',
    modalidad: 'DIRECTO',
    acreditaciones: 'CONFIRMADA'
  },
  {
    id: 'plan_5',
    diaSemana: 'VIERNES',
    fechaStr: '12/06/2026',
    partido: 'C.P. CACEREÑO VS U.D. MELILLA',
    hora: '20:00',
    grupo: 'SEGUNDA RFEF',
    scout: 'MIGUEL/ANTONIO',
    modalidad: 'VÍDEO',
    acreditaciones: 'SOLICITADA'
  },
  {
    id: 'plan_6',
    diaSemana: 'SÁBADO',
    fechaStr: '13/06/2026',
    partido: 'ZAMORA C.F. VS C.E. SABADELL',
    hora: '21:00',
    grupo: 'PLAYOFF ASCENSO',
    scout: 'MIGUEL/ANTONIO',
    modalidad: 'DIRECTO',
    acreditaciones: 'CONFIRMADA'
  },
  {
    id: 'plan_7',
    diaSemana: 'DOMINGO',
    fechaStr: '14/06/2026',
    partido: 'GIMNÀSTIC DE TARRAGONA VS MALAGA C.F.',
    hora: '18:00',
    grupo: 'PLAYOFF ASCENSO',
    scout: 'ANTONIO',
    modalidad: 'DIRECTO',
    acreditaciones: 'PENDIENTE'
  }
];

const DEFAULT_WEEKS: SemanaPlan[] = [
  {
    id: 'sem_04',
    nombre: 'Semana_04',
    fechaInicio: '15-09-25',
    fechaFin: '21-09-25',
    filename: 'Semana_04 del 15-09-25 al 21-09-25.docx',
    partidos: [
      {
        id: 'sem04_1',
        diaSemana: 'SÁBADO',
        fechaStr: '20/09/2025',
        partido: 'REAL AVILÉS INDUSTRIAL VS C.D. ARENTEIRO',
        hora: '18:00',
        grupo: 'PRIMERA RFEF',
        scout: 'MIGUEL',
        modalidad: 'DIRECTO',
        acreditaciones: 'CONFIRMADA'
      }
    ]
  },
  {
    id: 'sem_03',
    nombre: 'Semana_03',
    fechaInicio: '08-09-25',
    fechaFin: '14-09-25',
    filename: 'Semana_03 del 08-09-25 al 14-09-25.docx',
    partidos: [
      {
        id: 'sem03_1',
        diaSemana: 'DOMINGO',
        fechaStr: '14/09/2025',
        partido: 'PONTEVEDRA CF VS REAL AVILÉS INDUSTRIAL',
        hora: '17:00',
        grupo: 'PRIMERA RFEF',
        scout: 'ANTONIO',
        modalidad: 'DIRECTO',
        acreditaciones: 'CONFIRMADA'
      }
    ]
  },
  {
    id: 'sem_02',
    nombre: 'Semana_02',
    fechaInicio: '01-09-25',
    fechaFin: '07-09-25',
    filename: 'Semana_02 del 01-09-25 al 07-09-25.docx',
    partidos: []
  },
  {
    id: 'sem_01',
    nombre: 'Semana_01',
    fechaInicio: '25-08-25',
    fechaFin: '31-08-25',
    filename: 'Semana_01 del 25-08-25 al 31-08-25.docx',
    partidos: []
  },
  {
    id: 'sem_41',
    nombre: 'Semana_41',
    fechaInicio: '08-06-26',
    fechaFin: '14-06-26',
    filename: 'Semana_41 del 08-06-26 al 14-06-26.docx',
    partidos: INITIAL_SAMPLE_MATCHES
  }
];

function getDatesForWeek(fechaInicioStr: string): { key: PlanSemanalMatch['diaSemana']; fechaDefault: string }[] {
  let startDate = new Date();
  const cleanStr = fechaInicioStr.replace(/\//g, '-').trim();
  const parts = cleanStr.split('-');
  
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      startDate = new Date(year, month, day);
    }
  }

  const diasKeys: PlanSemanalMatch['diaSemana'][] = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
  
  return diasKeys.map((key, index) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + index);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yearStr = d.getFullYear();
    return {
      key,
      fechaDefault: `${dayStr}/${monthStr}/${yearStr}`
    };
  });
}

export default function PlanSemanal() {
  const [weeks, setWeeks] = useState<SemanaPlan[]>(() => {
    const saved = localStorage.getItem('plan_semanal_weeks_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading weeks:', e);
      }
    }
    return DEFAULT_WEEKS;
  });

  const [supabaseConnected] = useState<boolean>(isSupabaseConfigured());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isCloudInitializedRef = useRef<boolean>(false);

  // Modals state
  const [isNewWeekModalOpen, setIsNewWeekModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<SemanaPlan | null>(null);
  const [formNombreSemana, setFormNombreSemana] = useState('Semana_05');
  const [formFechaInicio, setFormFechaInicio] = useState('22-09-25');
  const [formFechaFin, setFormFechaFin] = useState('28-09-25');

  // Match Modal state inside Week Detail
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<PlanSemanalMatch | null>(null);
  const [formDia, setFormDia] = useState<PlanSemanalMatch['diaSemana']>('SÁBADO');
  const [formFecha, setFormFecha] = useState('13/06/2026');
  const [formPartido, setFormPartido] = useState('');
  const [formHora, setFormHora] = useState('20:00');
  const [formGrupo, setFormGrupo] = useState('1ª RFEF');
  const [formScout, setFormScout] = useState('MIGUEL/ANTONIO');
  const [formModalidad, setFormModalidad] = useState<PlanSemanalMatch['modalidad']>('DIRECTO');
  const [formAcreditaciones, setFormAcreditaciones] = useState<PlanSemanalMatch['acreditaciones']>('CONFIRMADA');

  // Manual Pull from Supabase
  const handlePullFromCloud = async () => {
    if (!supabaseConnected) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMsg(null);
    const res = await dbFetchPlanSemanalWeeksWithStatus<SemanaPlan[]>(DEFAULT_WEEKS);
    setIsSyncing(false);
    if (res.success) {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setWeeks(res.data);
        localStorage.setItem('plan_semanal_weeks_v2', JSON.stringify(res.data));
        setSyncSuccessMsg('¡Datos cargados correctamente desde Supabase Nube!');
      } else {
        setSyncSuccessMsg('Conectado a Supabase (no hay semanas en la nube aún).');
      }
    } else {
      setSyncError(res.error || 'Error al conectar con Supabase.');
    }
  };

  // Manual Push to Supabase
  const handlePushToCloud = async () => {
    if (!supabaseConnected) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMsg(null);
    const res = await dbSavePlanSemanalWeeksWithStatus(weeks);
    setIsSyncing(false);
    if (res.success) {
      setSyncSuccessMsg('¡Plan Semanal guardado y sincronizado con éxito en Supabase!');
    } else {
      setSyncError(res.error || 'Error al guardar en Supabase.');
    }
  };

  // Fetch initial data from Supabase on mount
  useEffect(() => {
    if (!supabaseConnected) {
      isCloudInitializedRef.current = true;
      return;
    }

    let isMounted = true;
    const initCloud = async () => {
      setIsSyncing(true);
      const res = await dbFetchPlanSemanalWeeksWithStatus<SemanaPlan[]>(DEFAULT_WEEKS);
      if (!isMounted) return;
      setIsSyncing(false);

      if (res.success) {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setWeeks(res.data);
          localStorage.setItem('plan_semanal_weeks_v2', JSON.stringify(res.data));
          setSyncSuccessMsg('Sincronizado con Supabase');
        }
      } else {
        setSyncError(res.error || 'Error de conexión con Supabase');
      }
      isCloudInitializedRef.current = true;
    };

    initCloud();
    return () => { isMounted = false; };
  }, [supabaseConnected]);

  // Persist local and Supabase when weeks change (after initial mount)
  useEffect(() => {
    localStorage.setItem('plan_semanal_weeks_v2', JSON.stringify(weeks));

    if (supabaseConnected && isCloudInitializedRef.current) {
      setIsSyncing(true);
      dbSavePlanSemanalWeeksWithStatus(weeks).then(res => {
        setIsSyncing(false);
        if (res.success) {
          setSyncError(null);
          setSyncSuccessMsg('Sincronizado con Supabase');
        } else {
          setSyncError(res.error || 'Error al guardar en Supabase');
        }
      });
    }
  }, [weeks, supabaseConnected]);

  const selectedWeek = weeks.find(w => w.id === selectedWeekId) || null;

  // Week CRUD
  const handleOpenAddWeek = () => {
    setEditingWeek(null);
    const nextNum = weeks.length + 1;
    const numStr = String(nextNum).padStart(2, '0');
    setFormNombreSemana(`Semana_${numStr}`);
    setFormFechaInicio('22-09-25');
    setFormFechaFin('28-09-25');
    setIsNewWeekModalOpen(true);
  };

  const handleOpenEditWeek = (sem: SemanaPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWeek(sem);
    setFormNombreSemana(sem.nombre);
    setFormFechaInicio(sem.fechaInicio);
    setFormFechaFin(sem.fechaFin);
    setIsNewWeekModalOpen(true);
  };

  const handleDeleteWeek = (semId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que deseas eliminar esta semana del plan?')) {
      setWeeks(prev => prev.filter(w => w.id !== semId));
      if (selectedWeekId === semId) setSelectedWeekId(null);
    }
  };

  const handleSaveWeek = (e: React.FormEvent) => {
    e.preventDefault();
    const nombreClean = formNombreSemana.trim() || 'Semana_Nueva';
    const inicioClean = formFechaInicio.trim() || '01-01-26';
    const finClean = formFechaFin.trim() || '07-01-26';
    const filenameClean = `${nombreClean} del ${inicioClean} al ${finClean}.docx`;

    if (editingWeek) {
      setWeeks(prev => prev.map(w => w.id === editingWeek.id ? {
        ...w,
        nombre: nombreClean,
        fechaInicio: inicioClean,
        fechaFin: finClean,
        filename: filenameClean
      } : w));
    } else {
      const newSem: SemanaPlan = {
        id: 'sem_' + Date.now(),
        nombre: nombreClean,
        fechaInicio: inicioClean,
        fechaFin: finClean,
        filename: filenameClean,
        partidos: []
      };
      setWeeks(prev => [newSem, ...prev]);
      setSelectedWeekId(newSem.id);
    }

    setIsNewWeekModalOpen(false);
  };

  const handleReset = () => {
    if (window.confirm('¿Deseas restaurar el registro de semanas al estado inicial?')) {
      setWeeks(DEFAULT_WEEKS);
      localStorage.setItem('plan_semanal_weeks_v2', JSON.stringify(DEFAULT_WEEKS));
      setSelectedWeekId(null);
    }
  };

  // Matches CRUD for selected week
  const handleOpenAddMatch = (diaKey?: PlanSemanalMatch['diaSemana'], fechaStr?: string) => {
    if (!selectedWeek) return;
    setEditingMatch(null);
    const diasInfo = getDatesForWeek(selectedWeek.fechaInicio);
    const dayObj = diasInfo.find(d => d.key === diaKey) || diasInfo[5]; // Default Sabado
    
    setFormDia(dayObj.key);
    setFormFecha(fechaStr || dayObj.fechaDefault);
    setFormPartido('');
    setFormHora('20:00');
    setFormGrupo('PRIMERA RFEF');
    setFormScout('MIGUEL/ANTONIO');
    setFormModalidad('DIRECTO');
    setFormAcreditaciones('CONFIRMADA');
    setIsMatchModalOpen(true);
  };

  const handleOpenEditMatch = (m: PlanSemanalMatch) => {
    setEditingMatch(m);
    setFormDia(m.diaSemana);
    setFormFecha(m.fechaStr);
    setFormPartido(m.partido);
    setFormHora(m.hora);
    setFormGrupo(m.grupo);
    setFormScout(m.scout);
    setFormModalidad(m.modalidad);
    setFormAcreditaciones(m.acreditaciones);
    setIsMatchModalOpen(true);
  };

  const handleDeleteMatch = (matchId: string) => {
    if (!selectedWeekId) return;
    setWeeks(prev => prev.map(w => {
      if (w.id === selectedWeekId) {
        return {
          ...w,
          partidos: w.partidos.filter(p => p.id !== matchId)
        };
      }
      return w;
    }));
  };

  const handleSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeekId || !formPartido.trim()) return;

    if (editingMatch) {
      setWeeks(prev => prev.map(w => {
        if (w.id === selectedWeekId) {
          return {
            ...w,
            partidos: w.partidos.map(p => p.id === editingMatch.id ? {
              ...p,
              diaSemana: formDia,
              fechaStr: formFecha,
              partido: formPartido.trim().toUpperCase(),
              hora: formHora.trim(),
              grupo: formGrupo.trim().toUpperCase(),
              scout: formScout.trim().toUpperCase(),
              modalidad: formModalidad,
              acreditaciones: formAcreditaciones
            } : p)
          };
        }
        return w;
      }));
    } else {
      const newMatch: PlanSemanalMatch = {
        id: 'plan_' + Date.now(),
        diaSemana: formDia,
        fechaStr: formFecha,
        partido: formPartido.trim().toUpperCase(),
        hora: formHora.trim(),
        grupo: formGrupo.trim().toUpperCase(),
        scout: formScout.trim().toUpperCase(),
        modalidad: formModalidad,
        acreditaciones: formAcreditaciones
      };

      setWeeks(prev => prev.map(w => {
        if (w.id === selectedWeekId) {
          return {
            ...w,
            partidos: [...w.partidos, newMatch]
          };
        }
        return w;
      }));
    }

    setIsMatchModalOpen(false);
  };

  const getAcreditacionBadge = (status: PlanSemanalMatch['acreditaciones']) => {
    switch (status) {
      case 'CONFIRMADA':
        return (
          <span className="inline-block bg-[#00e600] text-slate-950 font-black px-2.5 py-0.5 text-[11px] sm:text-xs rounded-xs uppercase tracking-wider shadow-sm">
            CONFIRMADA
          </span>
        );
      case 'PENDIENTE':
        return (
          <span className="inline-block bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 text-[11px] sm:text-xs rounded-xs uppercase tracking-wider shadow-sm">
            PENDIENTE
          </span>
        );
      case 'SOLICITADA':
        return (
          <span className="inline-block bg-sky-400 text-slate-950 font-black px-2.5 py-0.5 text-[11px] sm:text-xs rounded-xs uppercase tracking-wider shadow-sm">
            SOLICITADA
          </span>
        );
      case 'DENEGADA':
        return (
          <span className="inline-block bg-rose-600 text-white font-black px-2.5 py-0.5 text-[11px] sm:text-xs rounded-xs uppercase tracking-wider shadow-sm">
            DENEGADA
          </span>
        );
      default:
        return (
          <span className="inline-block bg-slate-700 text-slate-200 font-bold px-2 py-0.5 text-[10px] sm:text-[11px] rounded-xs uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  const filteredWeeks = weeks.filter(w => 
    w.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 mb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 shadow-inner">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Plan Semanal
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold rounded-md uppercase">
                Scouting Agenda
              </span>
              {supabaseConnected ? (
                syncError ? (
                  <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold rounded-md uppercase flex items-center space-x-1" title={syncError}>
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Error Supabase</span>
                  </span>
                ) : isSyncing ? (
                  <span className="px-2.5 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono font-bold rounded-md uppercase flex items-center space-x-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                    <span>Sincronizando...</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold rounded-md uppercase flex items-center space-x-1" title="Sincronizado automáticamente en la nube con Supabase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Supabase Nube</span>
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold rounded-md uppercase flex items-center space-x-1">
                  <Info className="w-3 h-3 text-amber-400" />
                  <span>Sin Supabase (Solo Local)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {selectedWeek 
                ? `Mostrando detalles de la agenda: ${selectedWeek.filename}`
                : 'Registro general de archivos y semanas de seguimiento técnico'}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
          {supabaseConnected && (
            <>
              <button
                onClick={handlePullFromCloud}
                disabled={isSyncing}
                className="px-3 py-2 text-xs font-mono font-bold text-sky-300 hover:text-white bg-sky-950/50 hover:bg-sky-900/60 border border-sky-800/60 rounded-xl flex items-center space-x-1.5 transition disabled:opacity-50"
                title="Cargar última versión guardada en Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Cargar de Nube</span>
              </button>

              <button
                onClick={handlePushToCloud}
                disabled={isSyncing}
                className="px-3 py-2 text-xs font-mono font-bold text-emerald-300 hover:text-white bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-xl flex items-center space-x-1.5 transition disabled:opacity-50"
                title="Guardar Plan Semanal actual en Supabase Nube"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guardar en Nube</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="px-3 py-2 text-xs font-mono font-bold text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 rounded-xl flex items-center space-x-1.5 transition"
            title="Ver o copiar el código SQL para Supabase"
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">SQL Supabase</span>
          </button>

          {selectedWeek && (
            <button
              onClick={() => setSelectedWeekId(null)}
              className="px-3.5 py-2 text-xs font-mono font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center space-x-2 transition shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="px-3 py-2 text-xs font-mono font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center space-x-1.5 transition"
            title="Restaurar semanas predeterminadas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          {!selectedWeek ? (
            <button
              onClick={handleOpenAddWeek}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-950/40 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Semana</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenAddMatch()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-950/40 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Partido</span>
            </button>
          )}
        </div>
      </div>

      {/* Supabase Banner Warning / Info */}
      {(!supabaseConnected || syncError) && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 text-xs text-amber-200/90 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-amber-400 uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Sincronización con Vercel y Supabase</span>
          </div>
          <p className="leading-relaxed">
            {!supabaseConnected ? (
              <>
                <strong>Supabase no está configurado en las variables de entorno.</strong> Los cambios registrados aquí se guardan de forma local en tu navegador. Para que los datos registrados en AI Studio aparezcan automáticamente en Vercel (y entre diferentes dispositivos), asegúrate de:
              </>
            ) : (
              <>
                <strong>Hubo un problema al guardar en Supabase:</strong> <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-300 font-mono">{syncError}</code>.
              </>
            )}
          </p>
          <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-amber-300/80">
            <li>Añadir <span className="text-amber-200 font-bold">VITE_SUPABASE_URL</span> y <span className="text-amber-200 font-bold">VITE_SUPABASE_ANON_KEY</span> en las variables de entorno de tu proyecto en Vercel.</li>
            <li>Asegurarte de haber creado la tabla <span className="text-amber-200 font-bold">scouting_settings</span> en el Editor SQL de Supabase.</li>
          </ul>
          <div className="pt-1 flex items-center space-x-3">
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-mono font-bold transition flex items-center space-x-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Ver y Copiar Código SQL para Supabase</span>
            </button>
          </div>
        </div>
      )}

      {syncSuccessMsg && supabaseConnected && !syncError && (
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
          <button onClick={() => setSyncSuccessMsg(null)} className="text-emerald-400/60 hover:text-emerald-200 text-xs font-mono">
            Cerrar
          </button>
        </div>
      )}

      {/* VIEW 1: LIST OF WEEKS (Format requested from screenshot) */}
      {!selectedWeek ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar semana..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-sans"
              />
            </div>
            <div className="text-xs font-mono text-slate-400 self-end sm:self-center">
              Total semanales: <span className="text-blue-400 font-bold">{weeks.length}</span>
            </div>
          </div>

          {/* List Container matching Word document row design from image */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl divide-y divide-slate-800/60">
            {filteredWeeks.length > 0 ? (
              filteredWeeks.map((sem) => (
                <div
                  key={sem.id}
                  onClick={() => setSelectedWeekId(sem.id)}
                  className="p-4 sm:p-4.5 bg-slate-900 hover:bg-slate-800/90 transition duration-150 cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Word Document Icon Style matching screenshot */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition shadow-sm">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-200 group-hover:text-white font-sans truncate tracking-tight">
                        {sem.filename}
                      </h3>
                      <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400 mt-0.5">
                        <span className="text-blue-400 font-bold">{sem.nombre}</span>
                        <span>•</span>
                        <span>{sem.fechaInicio} al {sem.fechaFin}</span>
                        <span>•</span>
                        <span className="text-slate-400">
                          {sem.partidos.length === 1 
                            ? '1 partido registrado' 
                            : `${sem.partidos.length} partidos registrados`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Shared icon matching screenshot */}
                    <div className="text-slate-500 group-hover:text-slate-400 transition" title="Compartido">
                      <Users className="w-4 h-4" />
                    </div>

                    {/* Action buttons */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition">
                      <button
                        onClick={(e) => handleOpenEditWeek(sem, e)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700/60 rounded-lg transition"
                        title="Editar nombre/fechas"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteWeek(sem.id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-lg transition"
                        title="Eliminar semana"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No se encontraron semanas guardadas. haz clic en "Nueva Semana" para registrar una.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: WEEK DETAIL SCHEDULE TABLE */
        <div className="space-y-4 animate-fade-in">
          {/* Week Info Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide font-sans">
                  {selectedWeek.filename}
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Semana del <span className="text-blue-400">{selectedWeek.fechaInicio}</span> al <span className="text-blue-400">{selectedWeek.fechaFin}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-center">
              <button
                onClick={(e) => handleOpenEditWeek(selectedWeek, e)}
                className="px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center space-x-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Fechas</span>
              </button>
            </div>
          </div>

          {/* Table Matching Screenshot Format */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-2xl bg-slate-950">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-[#0078bf] text-white text-xs sm:text-sm font-black tracking-wider uppercase">
                  <th className="py-3 px-4 border-r border-sky-400/30 w-[35%]">PARTIDO</th>
                  <th className="py-3 px-3 border-r border-sky-400/30 text-center w-[10%]">HORA</th>
                  <th className="py-3 px-3 border-r border-sky-400/30 text-center w-[18%]">GRUPO</th>
                  <th className="py-3 px-3 border-r border-sky-400/30 text-center w-[17%]">SCOUT</th>
                  <th className="py-3 px-3 border-r border-sky-400/30 text-center w-[10%]">MODALIDAD</th>
                  <th className="py-3 px-4 text-center w-[10%]">ACREDITACIONES</th>
                </tr>
              </thead>

              <tbody>
                {getDatesForWeek(selectedWeek.fechaInicio).map((diaObj) => {
                  const dayMatches = selectedWeek.partidos.filter(m => m.diaSemana === diaObj.key);

                  return (
                    <React.Fragment key={diaObj.key}>
                      {/* Day Banner Row */}
                      <tr className="bg-slate-300 border-t border-b border-slate-400">
                        <td 
                          colSpan={6} 
                          className="py-2 px-4 text-center text-slate-900 font-extrabold text-xs sm:text-sm tracking-wider uppercase font-sans select-none"
                        >
                          {diaObj.key} {diaObj.fechaDefault}
                        </td>
                      </tr>

                      {/* Day Matches */}
                      {dayMatches.length > 0 && dayMatches.some(m => m.partido.trim() !== '') ? (
                        dayMatches.filter(m => m.partido.trim() !== '').map((m) => (
                          <tr 
                            key={m.id} 
                            className="border-b border-slate-800/80 hover:bg-slate-900/90 transition group text-slate-200 text-xs sm:text-sm font-medium"
                          >
                            {/* PARTIDO */}
                            <td className="py-3 px-4 border-r border-slate-800 font-bold tracking-tight text-white flex items-center justify-between">
                              <span>{m.partido}</span>
                              <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 ml-2 transition shrink-0">
                                <button
                                  onClick={() => handleOpenEditMatch(m)}
                                  className="p-1 hover:text-blue-400 text-slate-400 transition"
                                  title="Editar partido"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMatch(m.id)}
                                  className="p-1 hover:text-red-400 text-slate-400 transition"
                                  title="Eliminar partido"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* HORA */}
                            <td className="py-3 px-3 border-r border-slate-800 text-center font-mono font-bold text-slate-300">
                              {m.hora || '-'}
                            </td>

                            {/* GRUPO */}
                            <td className="py-3 px-3 border-r border-slate-800 text-center font-extrabold tracking-wide uppercase text-slate-300">
                              {m.grupo || '-'}
                            </td>

                            {/* SCOUT */}
                            <td className="py-3 px-3 border-r border-slate-800 text-center font-extrabold tracking-wide uppercase text-slate-300">
                              {m.scout || '-'}
                            </td>

                            {/* MODALIDAD */}
                            <td className="py-3 px-3 border-r border-slate-800 text-center font-bold tracking-wider uppercase text-slate-300">
                              {m.modalidad || '-'}
                            </td>

                            {/* ACREDITACIONES */}
                            <td className="py-3 px-4 text-center">
                              {getAcreditacionBadge(m.acreditaciones)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="border-b border-slate-800/50 text-xs text-slate-600">
                          <td className="py-2.5 px-4 border-r border-slate-800/50 italic text-slate-600">
                            Sin partidos programados
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-800/50 text-center"></td>
                          <td className="py-2.5 px-3 border-r border-slate-800/50 text-center"></td>
                          <td className="py-2.5 px-3 border-r border-slate-800/50 text-center"></td>
                          <td className="py-2.5 px-3 border-r border-slate-800/50 text-center"></td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleOpenAddMatch(diaObj.key, diaObj.fechaDefault)}
                              className="text-[10px] font-mono text-slate-500 hover:text-blue-400 flex items-center space-x-1 mx-auto transition"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Añadir</span>
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT WEEK */}
      {isNewWeekModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>{editingWeek ? 'Editar Registro de Semana' : 'Registrar Nueva Semana'}</span>
              </h3>
              <button
                onClick={() => setIsNewWeekModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWeek} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-400 font-mono font-bold mb-1">Nombre / Identificador de Semana</label>
                <input
                  type="text"
                  value={formNombreSemana}
                  onChange={(e) => setFormNombreSemana(e.target.value)}
                  placeholder="Semana_05"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono font-bold mb-1">Fecha Inicio (DD-MM-YY)</label>
                  <input
                    type="text"
                    value={formFechaInicio}
                    onChange={(e) => setFormFechaInicio(e.target.value)}
                    placeholder="22-09-25"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono font-bold mb-1">Fecha Fin (DD-MM-YY)</label>
                  <input
                    type="text"
                    value={formFechaFin}
                    onChange={(e) => setFormFechaFin(e.target.value)}
                    placeholder="28-09-25"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400">
                <span className="text-blue-400 font-bold block mb-1">Formato de archivo generado:</span>
                {`${formNombreSemana.trim() || 'Semana_XX'} del ${formFechaInicio.trim() || 'DD-MM-YY'} al ${formFechaFin.trim() || 'DD-MM-YY'}.docx`}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewWeekModalOpen(false)}
                  className="px-4 py-2 font-mono text-slate-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-md shadow-blue-900/40"
                >
                  {editingWeek ? 'Guardar Cambios' : 'Crear Semana'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT MATCH */}
      {isMatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span>{editingMatch ? 'Editar Partido' : 'Añadir Partido a Plan Semanal'}</span>
              </h3>
              <button
                onClick={() => setIsMatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono font-bold mb-1">Día de la Semana</label>
                  <select
                    value={formDia}
                    onChange={(e) => {
                      const dKey = e.target.value as PlanSemanalMatch['diaSemana'];
                      setFormDia(dKey);
                      if (selectedWeek) {
                        const matched = getDatesForWeek(selectedWeek.fechaInicio).find(d => d.key === dKey);
                        if (matched) setFormFecha(matched.fechaDefault);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 uppercase font-mono"
                  >
                    {['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono font-bold mb-1">Fecha (DD/MM/AAAA)</label>
                  <input
                    type="text"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    placeholder="13/06/2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono font-bold mb-1">Partido (Ej. ZAMORA C.F. VS C.E. SABADELL)</label>
                <input
                  type="text"
                  value={formPartido}
                  onChange={(e) => setFormPartido(e.target.value)}
                  placeholder="ZAMORA C.F. VS C.E. SABADELL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono font-bold uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono font-bold mb-1">Hora (Ej. 21:00)</label>
                  <input
                    type="text"
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    placeholder="21:00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono font-bold mb-1">Grupo / Competición</label>
                  <input
                    type="text"
                    value={formGrupo}
                    onChange={(e) => setFormGrupo(e.target.value)}
                    placeholder="PRIMERA RFEF"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono font-bold mb-1">Scout(s)</label>
                  <input
                    type="text"
                    value={formScout}
                    onChange={(e) => setFormScout(e.target.value)}
                    placeholder="MIGUEL/ANTONIO"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono font-bold mb-1">Modalidad</label>
                  <select
                    value={formModalidad}
                    onChange={(e) => setFormModalidad(e.target.value as PlanSemanalMatch['modalidad'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 uppercase font-mono"
                  >
                    <option value="DIRECTO">DIRECTO</option>
                    <option value="VÍDEO">VÍDEO</option>
                    <option value="TELEVISIÓN">TELEVISIÓN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono font-bold mb-1">Acreditación</label>
                  <select
                    value={formAcreditaciones}
                    onChange={(e) => setFormAcreditaciones(e.target.value as PlanSemanalMatch['acreditaciones'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 uppercase font-mono font-bold text-blue-400"
                  >
                    <option value="CONFIRMADA">CONFIRMADA</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="SOLICITADA">SOLICITADA</option>
                    <option value="NO REQUERIDA">NO REQUERIDA</option>
                    <option value="DENEGADA">DENEGADA</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMatchModalOpen(false)}
                  className="px-4 py-2 font-mono text-slate-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-md shadow-blue-900/40"
                >
                  {editingMatch ? 'Guardar Cambios' : 'Añadir Partido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL Instructions Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Sentencia SQL para Supabase</h3>
                  <p className="text-xs text-slate-400 font-mono">Copia este código y ejecútalo en el Editor SQL de tu proyecto en Supabase</p>
                </div>
              </div>
              <button
                onClick={() => { setIsSqlModalOpen(false); setCopiedSql(false); }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta sentencia crea la tabla <code className="text-purple-300 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">scouting_settings</code> y configura sus políticas de acceso público para que la agenda del Plan Semanal y las configuraciones de la app se sincronicen en la nube entre AI Studio y Vercel:
            </p>

            <div className="relative bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto flex-1 max-h-[300px]">
              <pre>{`CREATE TABLE IF NOT EXISTS scouting_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE scouting_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en settings" ON scouting_settings;
CREATE POLICY "Permitir todo en settings" ON scouting_settings FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';`}</pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400 font-mono">
                Pasos: Supabase Dashboard &rarr; SQL Editor &rarr; New Query &rarr; Paste &rarr; Run
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const sql = `CREATE TABLE IF NOT EXISTS scouting_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE scouting_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en settings" ON scouting_settings;
CREATE POLICY "Permitir todo en settings" ON scouting_settings FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';`;
                    navigator.clipboard.writeText(sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 3000);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-lg shadow-purple-950/40"
                >
                  {copiedSql ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>¡Copiado al Portapapeles!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Código SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
