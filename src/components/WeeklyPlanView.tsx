import React, { useState, useEffect, useMemo } from 'react';
import { ScoutedPlayer, MatchReport } from '../types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Target, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Download, 
  Shield, 
  Eye, 
  Filter, 
  Search, 
  CheckSquare, 
  Sparkles,
  Award,
  ListTodo
} from 'lucide-react';
import { dbFetchSetting, dbSaveSetting } from '../utils/supabaseClient';

export interface WeeklyMatchAssignment {
  id: string;
  diaSemana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  fecha: string; // YYYY-MM-DD
  hora: string;
  partido: string;
  equipoLocal: string;
  equipoVisitante: string;
  competicion: string;
  acreditacion: 'Solicitar' | 'Solicitado' | 'Confirmado';
  modalidad?: string;
  ubicacion: string;
  ojeadorAsignado: string;
  jugadoresObjetivo: string; // Nombres o notas de futbolistas a vigilar
  estado: 'Pendiente' | 'En Progreso' | 'Completado';
  notasAdicionales?: string;
}

export interface WeeklyObjective {
  id: string;
  titulo: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  completado: boolean;
  categoria?: string;
}

export interface WeeklyPlanData {
  semanaNombre: string;
  fechaInicio: string;
  fechaFin: string;
  assignments: WeeklyMatchAssignment[];
  objectives: WeeklyObjective[];
}

interface WeeklyPlanViewProps {
  players: ScoutedPlayer[];
  matchReports: MatchReport[];
  setActiveTab?: (tab: 'inicio' | 'players' | 'matchReports' | 'teams' | 'tactical' | 'videoteca' | 'data_reports' | 'plan_semanal') => void;
  showNotification?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
const SCOUT_OPTIONS = ['Miguel Linares', 'Antonio Cruz', 'Daniel Saugar', 'Carlos', 'Nico'] as const;
const ACREDITACION_OPTIONS = ['Solicitar', 'Solicitado', 'Confirmado'] as const;

const DEFAULT_OBJECTIVES: WeeklyObjective[] = [
  { id: 'obj-1', titulo: 'Cobertura presencial partido Segunda RFEF Grupo I (Real Avilés)', prioridad: 'Alta', completado: true, categoria: 'Scouting Presencial' },
  { id: 'obj-2', titulo: 'Completar evaluación táctica de mediocentros zurdos sub-23', prioridad: 'Alta', completado: false, categoria: 'Informes Técnicos' },
  { id: 'obj-3', titulo: 'Revisión en videoteca de laterales en fin de contrato 2026', prioridad: 'Media', completado: false, categoria: 'Videoteca' },
  { id: 'obj-4', titulo: 'Sincronizar actas de partidos del fin de semana con la nube', prioridad: 'Alta', completado: true, categoria: 'Base de Datos' },
  { id: 'obj-5', titulo: 'Actualizar notas de seguimiento del Grupo II Segunda RFEF', prioridad: 'Media', completado: false, categoria: 'Seguimiento' }
];

const DEFAULT_ASSIGNMENTS: WeeklyMatchAssignment[] = [
  {
    id: 'assign-1',
    diaSemana: 'Sábado',
    fecha: '2026-08-08',
    hora: '18:00',
    partido: 'Real Avilés Industrial vs UP Langreo',
    equipoLocal: 'Real Avilés Industrial',
    equipoVisitante: 'UP Langreo',
    competicion: 'Primera RFEF / Pretemporada',
    acreditacion: 'Confirmado',
    ubicacion: 'Estadio Román Suárez Puerta (Avilés)',
    ojeadorAsignado: 'Daniel Saugar',
    jugadoresObjetivo: 'Osky Menéndez (DEF), Nando (MED), Álvaro (DEL)',
    estado: 'Pendiente',
    notasAdicionales: 'Prioridad máxima: analizar transición defensiva y posicionamiento en balones parados.'
  },
  {
    id: 'assign-2',
    diaSemana: 'Domingo',
    fecha: '2026-08-09',
    hora: '12:00',
    partido: 'Bilbao Athletic vs Zamora CF',
    equipoLocal: 'Bilbao Athletic',
    equipoVisitante: 'Zamora CF',
    competicion: 'Primera RFEF',
    acreditacion: 'Solicitado',
    ubicacion: 'Instalaciones de Lezama / FEF TV',
    ojeadorAsignado: 'Miguel Linares',
    jugadoresObjetivo: 'Extremos y centrales sub-21 con opción de cesión',
    estado: 'Pendiente',
    notasAdicionales: 'Hacer seguimiento especial al lateral diestro titular.'
  },
  {
    id: 'assign-3',
    diaSemana: 'Viernes',
    fecha: '2026-08-07',
    hora: '19:30',
    partido: 'Marino de Luanco vs CD Lealtad',
    equipoLocal: 'Marino de Luanco',
    equipoVisitante: 'CD Lealtad',
    competicion: 'Segunda RFEF Grupo I',
    acreditacion: 'Confirmado',
    ubicacion: 'Estadio Miramar (Luanco)',
    ojeadorAsignado: 'Antonio Cruz',
    jugadoresObjetivo: 'Mediocentro distribuidor #6',
    estado: 'En Progreso',
    notasAdicionales: 'Verificar estado físico tras molestias leves.'
  },
  {
    id: 'assign-4',
    diaSemana: 'Miércoles',
    fecha: '2026-08-05',
    hora: '17:00',
    partido: 'Sesión de análisis de vídeo: Rivales Grupo I',
    equipoLocal: 'Secretaría Técnica',
    equipoVisitante: 'Gefeste',
    competicion: 'Sesión Interna',
    acreditacion: 'Solicitar',
    ubicacion: 'Oficina de Scouting',
    ojeadorAsignado: 'Carlos',
    jugadoresObjetivo: 'Revisión de 10 perfiles destacados',
    estado: 'Completado',
    notasAdicionales: 'Corte de vídeo exportado a la videoteca.'
  }
];

export default function WeeklyPlanView({
  players,
  matchReports,
  setActiveTab,
  showNotification
}: WeeklyPlanViewProps) {
  // Current Week State
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);
  const [assignments, setAssignments] = useState<WeeklyMatchAssignment[]>(DEFAULT_ASSIGNMENTS);
  const [objectives, setObjectives] = useState<WeeklyObjective[]>(DEFAULT_OBJECTIVES);
  
  // Filter States
  const [selectedDay, setSelectedDay] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [selectedAccreditationFilter, setSelectedAccreditationFilter] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedScoutFilter, setSelectedScoutFilter] = useState<string>('Todos');

  // Modal Form States
  const [isMatchModalOpen, setIsMatchModalOpen] = useState<boolean>(false);
  const [editingAssignment, setEditingAssignment] = useState<WeeklyMatchAssignment | null>(null);

  const [isObjModalOpen, setIsObjModalOpen] = useState<boolean>(false);
  const [newObjTitle, setNewObjTitle] = useState<string>('');
  const [newObjPrioridad, setNewObjPrioridad] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [newObjCategoria, setNewObjCategoria] = useState<string>('General');

  // Form Fields for Match Assignment
  const [formData, setFormData] = useState<Partial<WeeklyMatchAssignment>>({
    diaSemana: 'Sábado',
    fecha: new Date().toISOString().split('T')[0],
    hora: '18:00',
    partido: '',
    equipoLocal: '',
    equipoVisitante: '',
    competicion: 'Primera RFEF',
    acreditacion: 'Solicitar',
    ubicacion: '',
    ojeadorAsignado: 'Daniel Saugar',
    jugadoresObjetivo: '',
    estado: 'Pendiente',
    notasAdicionales: ''
  });

  // Calculate current week date range
  const weekInfo = useMemo(() => {
    const today = new Date();
    // Move today by week offset
    today.setDate(today.getDate() + (currentWeekOffset * 7));

    // Get Monday of this week
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatShort = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const formatFull = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    return {
      monday,
      sunday,
      label: `Semana del ${formatShort(monday)} al ${formatFull(sunday)}`,
      shortLabel: `${monday.getDate()}/${monday.getMonth() + 1} - ${sunday.getDate()}/${sunday.getMonth() + 1}`
    };
  }, [currentWeekOffset]);

  // Load plan from Cloud (Supabase) and LocalStorage on Mount
  useEffect(() => {
    try {
      const savedLocal = localStorage.getItem('DEPARTAMENTO_SCOUTING_WEEKLY_PLAN_V1');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (parsed.assignments) setAssignments(parsed.assignments);
        if (parsed.objectives) setObjectives(parsed.objectives);
      }
    } catch (e) {
      console.error('Error loading weekly plan from localStorage:', e);
    }

    // Sync with Cloud Supabase
    dbFetchSetting<WeeklyPlanData>('weekly_plan_data', {
      semanaNombre: weekInfo.label,
      fechaInicio: weekInfo.monday.toISOString(),
      fechaFin: weekInfo.sunday.toISOString(),
      assignments: DEFAULT_ASSIGNMENTS,
      objectives: DEFAULT_OBJECTIVES
    }).then((remote) => {
      if (remote && Array.isArray(remote.assignments) && remote.assignments.length > 0) {
        setAssignments(remote.assignments);
      }
      if (remote && Array.isArray(remote.objectives) && remote.objectives.length > 0) {
        setObjectives(remote.objectives);
      }
    });
  }, []);

  // Sync to Cloud and LocalStorage whenever assignments or objectives change
  useEffect(() => {
    const planData: WeeklyPlanData = {
      semanaNombre: weekInfo.label,
      fechaInicio: weekInfo.monday.toISOString(),
      fechaFin: weekInfo.sunday.toISOString(),
      assignments,
      objectives
    };

    try {
      localStorage.setItem('DEPARTAMENTO_SCOUTING_WEEKLY_PLAN_V1', JSON.stringify(planData));
    } catch (e) {
      console.error('Error saving weekly plan to localStorage:', e);
    }

    // Save to Cloud Supabase for Vercel cross-device persistence
    dbSaveSetting('weekly_plan_data', planData);
  }, [assignments, objectives, weekInfo]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (selectedDay !== 'Todos' && a.diaSemana !== selectedDay) return false;
      if (selectedStatus !== 'Todos' && a.estado !== selectedStatus) return false;
      if (selectedAccreditationFilter !== 'Todas' && (a.acreditacion || a.modalidad) !== selectedAccreditationFilter) return false;
      if (selectedScoutFilter !== 'Todos' && !a.ojeadorAsignado.toLowerCase().includes(selectedScoutFilter.toLowerCase())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          a.partido.toLowerCase().includes(q) ||
          a.equipoLocal.toLowerCase().includes(q) ||
          a.equipoVisitante.toLowerCase().includes(q) ||
          a.competicion.toLowerCase().includes(q) ||
          a.ojeadorAsignado.toLowerCase().includes(q) ||
          a.jugadoresObjetivo.toLowerCase().includes(q) ||
          a.ubicacion.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [assignments, selectedDay, selectedStatus, selectedAccreditationFilter, selectedScoutFilter, searchQuery]);

  // Unique list of scouts for filter dropdown
  const uniqueScouts = useMemo(() => {
    const set = new Set<string>(SCOUT_OPTIONS);
    assignments.forEach(a => {
      if (a.ojeadorAsignado && a.ojeadorAsignado.trim()) {
        set.add(a.ojeadorAsignado.trim());
      }
    });
    return Array.from(set);
  }, [assignments]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = assignments.length;
    const completados = assignments.filter(a => a.estado === 'Completado').length;
    const enProgreso = assignments.filter(a => a.estado === 'En Progreso').length;
    const pendientes = assignments.filter(a => a.estado === 'Pendiente').length;
    const confirmados = assignments.filter(a => a.acreditacion === 'Confirmado').length;

    const totalObj = objectives.length;
    const completedObj = objectives.filter(o => o.completado).length;
    const objPercentage = totalObj > 0 ? Math.round((completedObj / totalObj) * 100) : 0;

    return { total, completados, enProgreso, pendientes, presenciales: confirmados, confirmados, totalObj, completedObj, objPercentage };
  }, [assignments, objectives]);

  // Handle Objective Checkbox Toggle
  const handleToggleObjective = (id: string) => {
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, completado: !o.completado } : o));
    if (showNotification) showNotification('Estado del objetivo actualizado', 'info');
  };

  const handleDeleteObjective = (id: string) => {
    setObjectives(prev => prev.filter(o => o.id !== id));
    if (showNotification) showNotification('Objetivo eliminado', 'info');
  };

  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjTitle.trim()) return;
    const newObj: WeeklyObjective = {
      id: `obj-${Date.now()}`,
      titulo: newObjTitle.trim(),
      prioridad: newObjPrioridad,
      completado: false,
      categoria: newObjCategoria.trim() || 'General'
    };
    setObjectives(prev => [newObj, ...prev]);
    setNewObjTitle('');
    setIsObjModalOpen(false);
    if (showNotification) showNotification('Objetivo semanal añadido', 'success');
  };

  // Open Modal for New Assignment
  const handleOpenNewAssignment = (defaultDay?: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo') => {
    setEditingAssignment(null);
    setFormData({
      diaSemana: defaultDay || 'Sábado',
      fecha: new Date().toISOString().split('T')[0],
      hora: '18:00',
      partido: '',
      equipoLocal: '',
      equipoVisitante: '',
      competicion: 'Primera RFEF',
      acreditacion: 'Solicitar',
      ubicacion: '',
      ojeadorAsignado: 'Daniel Saugar',
      jugadoresObjetivo: '',
      estado: 'Pendiente',
      notasAdicionales: ''
    });
    setIsMatchModalOpen(true);
  };

  // Open Modal for Editing Assignment
  const handleOpenEditAssignment = (assignment: WeeklyMatchAssignment) => {
    setEditingAssignment(assignment);
    setFormData({ ...assignment });
    setIsMatchModalOpen(true);
  };

  // Delete Assignment
  const handleDeleteAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
    if (showNotification) showNotification('Partido/Asignación eliminada del plan semanal', 'info');
  };

  // Toggle Status directly from card
  const handleCycleStatus = (id: string, current: 'Pendiente' | 'En Progreso' | 'Completado') => {
    const nextMap: Record<string, 'Pendiente' | 'En Progreso' | 'Completado'> = {
      'Pendiente': 'En Progreso',
      'En Progreso': 'Completado',
      'Completado': 'Pendiente'
    };
    const nextStatus = nextMap[current];
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, estado: nextStatus } : a));
    if (showNotification) showNotification(`Estado cambiado a ${nextStatus}`, 'success');
  };

  // Save Assignment Form
  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const partidoName = formData.partido?.trim() || `${formData.equipoLocal || 'Equipo A'} vs ${formData.equipoVisitante || 'Equipo B'}`;

    if (editingAssignment) {
      setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? {
        ...a,
        ...formData,
        partido: partidoName
      } as WeeklyMatchAssignment : a));
      if (showNotification) showNotification('Asignación actualizada correctamente', 'success');
    } else {
      const newAssign: WeeklyMatchAssignment = {
        id: `assign-${Date.now()}`,
        diaSemana: formData.diaSemana || 'Sábado',
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        hora: formData.hora || '18:00',
        partido: partidoName,
        equipoLocal: formData.equipoLocal || '',
        equipoVisitante: formData.equipoVisitante || '',
        competicion: formData.competicion || 'Primera RFEF',
        acreditacion: (formData.acreditacion as any) || 'Solicitar',
        ubicacion: formData.ubicacion || '',
        ojeadorAsignado: formData.ojeadorAsignado || 'Daniel Saugar',
        jugadoresObjetivo: formData.jugadoresObjetivo || '',
        estado: formData.estado || 'Pendiente',
        notasAdicionales: formData.notasAdicionales || ''
      };
      setAssignments(prev => [newAssign, ...prev]);
      if (showNotification) showNotification('Nuevo partido añadido al Plan Semanal', 'success');
    }
    setIsMatchModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg shadow-sm">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display text-white tracking-widest uppercase flex items-center gap-2">
                  <span>PLAN SEMANAL DE SCOUTING</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded-full font-semibold">
                    SYNC NUBE ACTIVE
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Planificación operativa de partidos, asignaciones de técnicos, videoteca y seguimiento semanal
                </p>
              </div>
            </div>
          </div>

          {/* Week Selector Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1 text-xs font-mono font-bold text-blue-300 bg-slate-900 rounded border border-slate-800 text-center min-w-[220px]">
              {weekInfo.label}
            </div>

            <button
              onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {currentWeekOffset !== 0 && (
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className="px-2.5 py-1 text-[10px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors uppercase font-bold"
              >
                Semana Actual
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Partidos</div>
            <div className="text-xl font-bold font-display text-white mt-0.5 flex items-baseline justify-between">
              <span>{stats.total}</span>
              <span className="text-[10px] font-mono text-slate-500 font-normal">{stats.confirmados} acreditados</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Pendientes</span>
            </div>
            <div className="text-xl font-bold font-display text-amber-300 mt-0.5">{stats.pendientes}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono font-bold uppercase text-blue-400 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>En Progreso</span>
            </div>
            <div className="text-xl font-bold font-display text-blue-300 mt-0.5">{stats.enProgreso}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Completados</span>
            </div>
            <div className="text-xl font-bold font-display text-emerald-300 mt-0.5">{stats.completados}</div>
          </div>
        </div>
      </div>

      {/* Main Container: Weekly Schedule & Match Assignments */}
      <div className="w-full space-y-5">
        {/* Action Bar & Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold font-display text-white tracking-widest uppercase flex items-center gap-2">
                  <span>AGENDA DE PARTIDOS Y COBERTURAS</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Filtrar partidos por día, estado o miembros del cuerpo técnico
                </p>
              </div>

              <button
                onClick={() => handleOpenNewAssignment()}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-550 text-white rounded-lg text-xs font-bold tracking-wider font-mono active:scale-95 transition-all shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>AÑADIR PARTIDO / TAREA</span>
              </button>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar equipo, ojeador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 pl-8 pr-2.5 py-1.5 text-xs rounded focus:border-blue-500 focus:outline-none font-sans"
                />
              </div>

              {/* Day Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase shrink-0">Día:</span>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 px-2 py-1.5 text-xs rounded focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="Todos">Todos los días</option>
                  {DIAS_SEMANA.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Accreditation Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase shrink-0">Acred:</span>
                <select
                  value={selectedAccreditationFilter}
                  onChange={(e) => setSelectedAccreditationFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 px-2 py-1.5 text-xs rounded focus:border-blue-500 focus:outline-none cursor-pointer truncate"
                >
                  <option value="Todas">Acreditaciones (Todas)</option>
                  <option value="Solicitar">Solicitar</option>
                  <option value="Solicitado">Solicitado</option>
                  <option value="Confirmado">Confirmado</option>
                </select>
              </div>

              {/* Scout Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase shrink-0">Scout:</span>
                <select
                  value={selectedScoutFilter}
                  onChange={(e) => setSelectedScoutFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 px-2 py-1.5 text-xs rounded focus:border-blue-500 focus:outline-none cursor-pointer truncate"
                >
                  <option value="Todos">Todos los ojeadores</option>
                  {uniqueScouts.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Day by Day Schedule View */}
          <div className="space-y-4">
            {DIAS_SEMANA.map(dia => {
              if (selectedDay !== 'Todos' && selectedDay !== dia) return null;

              const dayAssignments = filteredAssignments.filter(a => a.diaSemana === dia);

              return (
                <div key={dia} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                  {/* Day Header */}
                  <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                        {dia}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500">
                        ({dayAssignments.length} {dayAssignments.length === 1 ? 'partido' : 'partidos'})
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenNewAssignment(dia)}
                      className="text-[10px] font-mono text-blue-400 hover:text-blue-300 flex items-center space-x-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Añadir partido</span>
                    </button>
                  </div>

                  {/* Assignments for this Day */}
                  <div className="p-3 divide-y divide-slate-850">
                    {dayAssignments.length > 0 ? (
                      dayAssignments.map(item => (
                        <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                          
                          {/* Info Column */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Match Time */}
                              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/40 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{item.hora || 'Por determinar'}</span>
                              </span>

                              {/* Competition */}
                              <span className="text-[10px] font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-semibold">
                                {item.competicion}
                              </span>

                              {/* Accreditation Badge */}
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                                (item.acreditacion || item.modalidad) === 'Confirmado' 
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' 
                                  : (item.acreditacion || item.modalidad) === 'Solicitado'
                                  ? 'bg-blue-950/60 text-blue-300 border-blue-800/80'
                                  : 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                              }`}>
                                <span>🎟️ Acreditación: {item.acreditacion || item.modalidad || 'Solicitar'}</span>
                              </span>
                            </div>

                            {/* Match Title */}
                            <h5 className="text-sm font-bold font-display text-white tracking-wide">
                              {item.partido}
                            </h5>

                            {/* Location & Scout */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              {item.ubicacion && (
                                <span className="flex items-center space-x-1">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span>{item.ubicacion}</span>
                                </span>
                              )}
                              <span className="flex items-center space-x-1 font-mono text-[11px] text-blue-300">
                                <User className="w-3 h-3 text-blue-400" />
                                <span>Scout: {item.ojeadorAsignado}</span>
                              </span>
                            </div>

                            {/* Target Players */}
                            {item.jugadoresObjetivo && (
                              <div className="text-[11px] text-slate-300 font-mono bg-slate-950/80 p-2 rounded border border-slate-850 mt-1">
                                <span className="text-amber-400 font-bold">🎯 Seguimiento a:</span> {item.jugadoresObjetivo}
                              </div>
                            )}

                            {/* Additional Notes */}
                            {item.notasAdicionales && (
                              <p className="text-[11px] text-slate-400 italic">
                                "{item.notasAdicionales}"
                              </p>
                            )}
                          </div>

                          {/* Action & Status Column */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                            {/* Cycle Status Button */}
                            <button
                              onClick={() => handleCycleStatus(item.id, item.estado)}
                              className={`px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase border transition-all flex items-center space-x-1.5 ${
                                item.estado === 'Completado'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                                  : item.estado === 'En Progreso'
                                  ? 'bg-blue-950/60 text-blue-300 border-blue-800/80 hover:bg-blue-900/60 animate-pulse'
                                  : 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:bg-amber-900/60'
                              }`}
                              title="Haz clic para cambiar estado"
                            >
                              {item.estado === 'Completado' && <CheckCircle2 className="w-3 h-3" />}
                              {item.estado === 'En Progreso' && <Eye className="w-3 h-3" />}
                              {item.estado === 'Pendiente' && <Clock className="w-3 h-3" />}
                              <span>{item.estado}</span>
                            </button>

                            {/* Action Buttons */}
                            <div className="flex items-center space-x-1">
                              {setActiveTab && (
                                <button
                                  onClick={() => setActiveTab('matchReports')}
                                  className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-750 text-[10px] font-mono flex items-center space-x-1"
                                  title="Ir a Informes de Partidos"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                                  <span className="hidden sm:inline">Informe</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditAssignment(item)}
                                className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-750"
                                title="Editar asignación"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteAssignment(item.id)}
                                className="p-1.5 bg-slate-850 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded border border-slate-750 transition-colors"
                                title="Eliminar asignación"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-xs font-mono text-slate-500 italic">
                        No hay partidos agendados para el {dia}.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Modal: New / Edit Match Assignment */}
      {isMatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold font-display text-white tracking-widest uppercase flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>{editingAssignment ? 'EDITAR PARTIDO EN PLAN SEMANAL' : 'AÑADIR PARTIDO AL PLAN SEMANAL'}</span>
              </h3>
              <button
                onClick={() => setIsMatchModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Día de la Semana</label>
                  <select
                    value={formData.diaSemana}
                    onChange={(e) => setFormData(prev => ({ ...prev, diaSemana: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded px-3 py-2 focus:border-blue-500 focus:outline-none font-sans"
                    required
                  >
                    {DIAS_SEMANA.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Hora del Partido</label>
                  <input
                    type="text"
                    placeholder="Ej: 18:00"
                    value={formData.hora}
                    onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded px-3 py-2 focus:border-blue-500 focus:outline-none font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nombre del Partido / Encuentro</label>
                <input
                  type="text"
                  placeholder="Ej: Real Avilés Industrial vs UP Langreo"
                  value={formData.partido}
                  onChange={(e) => setFormData(prev => ({ ...prev, partido: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded px-3 py-2 focus:border-blue-500 focus:outline-none font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Competición</label>
                  <input
                    type="text"
                    placeholder="Ej: Primera RFEF"
                    value={formData.competicion}
                    onChange={(e) => setFormData(prev => ({ ...prev, competicion: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded px-3 py-2 focus:border-blue-500 focus:outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Acreditaciones</label>
                  <select
                    value={formData.acreditacion || 'Solicitar'}
                    onChange={(e) => setFormData(prev => ({ ...prev, acreditacion: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded px-3 py-2 focus:border-blue-500 focus:outline-none font-sans cursor-pointer"
                  >
                    {ACREDITACION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Ojeador / Técnico Asignado</label>
                <select
                  value={formData.ojeadorAsignado || 'Daniel Saugar'}
                  onChange={(e) => setFormData(prev => ({ ...prev, ojeadorAsignado: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded px-3 py-2 focus:border-blue-500 focus:outline-none font-sans cursor-pointer"
                  required
                >
                  {SCOUT_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {formData.ojeadorAsignado && !SCOUT_OPTIONS.includes(formData.ojeadorAsignado as any) && (
                    <option value={formData.ojeadorAsignado}>{formData.ojeadorAsignado}</option>
                  )}
                </select>
              </div>



              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs font-bold"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-550 text-white rounded font-mono text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  {editingAssignment ? 'GUARDAR CAMBIOS' : 'AÑADIR PARTIDO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
