import React, { useState, useEffect } from 'react';
import { ScoutedPlayer } from '../types';
import { 
  Shield, Trash2, SwitchCamera, UserPlus, Users, Search, HelpCircle, 
  UserCheck, Download, Folder, FolderPlus, Calendar, Snowflake, Sun, 
  ChevronRight, ArrowLeft, Edit3, Plus, Layout, FileText, Check, Copy, Sparkles, X 
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface TacticalBoardProps {
  players: ScoutedPlayer[];
  showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onUpdatePlayer?: (player: ScoutedPlayer) => void;
}

export type CampogramaFolderId = 'mensuales' | 'invierno' | 'verano';
export type CampogramaSubFolderId = '1rfef' | '2rfef';

export interface CampogramaItem {
  id: string;
  folderId: CampogramaFolderId;
  subFolderId?: CampogramaSubFolderId;
  nombre: string;
  descripcion?: string;
  fechaModificacion: string;
  formation: '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-4-1' | '4-1-4-1';
  monthlyView: boolean;
  assignments: { [positionId: string]: string | null };
  monthlyAssignments: { [positionId: string]: string[] };
  notes?: string;
}

interface AssignedPositions {
  [positionId: string]: string | null;
}

interface PitchPosition {
  id: string;
  label: string;
  category: 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero';
  x: number; // percentage width
  y: number; // percentage height
  allowedRoles: string[];
}

const FOLDERS = [
  {
    id: 'mensuales' as const,
    title: 'Campogramas Mensuales',
    shortTitle: 'Mensuales',
    subtitle: 'Seguimiento mensual de plantilla y demanda posicional',
    icon: Calendar,
    gradient: 'from-blue-600/20 via-indigo-600/10 to-slate-900',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-950/60 text-blue-300 border-blue-800/40',
    description: 'Campogramas posicionales actualizados mes a mes para evaluar el progreso y evolución de la cartera.',
  },
  {
    id: 'invierno' as const,
    title: 'Campograma Invierno',
    shortTitle: 'Invierno',
    subtitle: 'Planificación para el mercado de fichajes de invierno',
    icon: Snowflake,
    gradient: 'from-cyan-600/20 via-sky-600/10 to-slate-900',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40',
    description: 'Alineaciones objetivo y refuerzos prioritarios para la ventana de traspasos invernal.',
  },
  {
    id: 'verano' as const,
    title: 'Campograma Verano',
    shortTitle: 'Verano',
    subtitle: 'Planificación para el mercado de fichajes de verano',
    icon: Sun,
    gradient: 'from-amber-600/20 via-orange-600/10 to-slate-900',
    borderColor: 'border-amber-500/30 hover:border-amber-500/60',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-800/40',
    description: 'Proyección de plantilla, altas, bajas y sustituciones de cara al mercado estival.',
  }
];

const SUBFOLDERS_MENSUALES = [
  {
    id: '1rfef' as const,
    title: 'Campograma Primera RFEF',
    shortTitle: '1ª RFEF',
    subtitle: 'Seguimiento y campogramas posicionales de Primera RFEF',
    icon: Shield,
    gradient: 'from-blue-600/20 via-indigo-600/10 to-slate-900',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-950/60 text-blue-300 border-blue-800/40',
    description: 'Campogramas posicionales, cartera y demanda de plantilla para Primera RFEF.',
  },
  {
    id: '2rfef' as const,
    title: 'Campograma Segunda RFEF',
    shortTitle: '2ª RFEF',
    subtitle: 'Seguimiento y campogramas posicionales de Segunda RFEF',
    icon: Shield,
    gradient: 'from-emerald-600/20 via-teal-600/10 to-slate-900',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40',
    description: 'Campogramas posicionales, cartera y promesas monitorizadas en Segunda RFEF.',
  }
];

const DEFAULT_CAMPOGRAMAS: CampogramaItem[] = [
  {
    id: 'c_mensual_principal',
    folderId: 'mensuales',
    subFolderId: '1rfef',
    nombre: 'Campograma Mensual 1ª RFEF',
    descripcion: 'Evaluación posicional de los mejores perfiles monitorizados en 1ª RFEF',
    fechaModificacion: '23/07/2026',
    formation: '4-4-2',
    monthlyView: true,
    assignments: {},
    monthlyAssignments: {
      'mc_d': ['p_mangel_prendes', 'p_samu_mayo'],
      'mc_i': ['p_isi_gomez'],
      'dc_d': ['p_julian_mahicas'],
      'dc_i': ['p_brais_abelenda'],
      'mi': ['p_inigo_munoz'],
      'lti': ['p16']
    },
    notes: 'Seguimiento prioritario para reforzar el centro del campo y carril izquierdo.'
  },
  {
    id: 'c_mensual_enero',
    folderId: 'mensuales',
    subFolderId: '1rfef',
    nombre: 'Campograma Enero 2026 - 1ª RFEF',
    descripcion: 'Mapa posicional mensual de inicio de año',
    fechaModificacion: '15/01/2026',
    formation: '4-3-3',
    monthlyView: true,
    assignments: {},
    monthlyAssignments: {
      'mcd': ['p_mangel_prendes'],
      'mc_d': ['p_samu_mayo'],
      'mc_i': ['p_isi_gomez'],
      'dc': ['p_julian_mahicas'],
      'ed': ['p_inigo_munoz'],
      'ei': ['p_brais_abelenda']
    },
    notes: ''
  },
  {
    id: 'c_mensual_2rfef_principal',
    folderId: 'mensuales',
    subFolderId: '2rfef',
    nombre: 'Campograma Mensual 2ª RFEF',
    descripcion: 'Evaluación posicional de perfiles monitorizados en Segunda RFEF',
    fechaModificacion: '23/07/2026',
    formation: '4-4-2',
    monthlyView: true,
    assignments: {},
    monthlyAssignments: {
      'mc_d': ['p_mangel_prendes'],
      'dc_d': ['p_julian_mahicas']
    },
    notes: 'Seguimiento de promesas y oportunidades de mercado en Segunda RFEF.'
  },
  {
    id: 'c_invierno_principal',
    folderId: 'invierno',
    nombre: 'Campograma Mercado de Invierno',
    descripcion: 'Alineación de referencia para la ventana de invierno',
    fechaModificacion: '20/01/2026',
    formation: '4-2-3-1',
    monthlyView: false,
    assignments: {
      'mcd_d': 'p_mangel_prendes',
      'mcd_i': 'p_isi_gomez',
      'mco': 'p_samu_mayo',
      'mco_i': 'p_brais_abelenda',
      'mco_d': 'p_inigo_munoz',
      'dc': 'p_julian_mahicas',
      'lti': 'p16'
    },
    monthlyAssignments: {},
    notes: 'Prioridad incorporar pivote defensivo de refresco e interior zurdo.'
  },
  {
    id: 'c_invierno_refuerzos',
    folderId: 'invierno',
    nombre: 'Refuerzos Prioritarios Invierno',
    descripcion: 'Candidatos posicionales para el mercado invernal',
    fechaModificacion: '18/01/2026',
    formation: '4-3-3',
    monthlyView: true,
    assignments: {},
    monthlyAssignments: {
      'mcd': ['p_mangel_prendes', 'p_samu_mayo'],
      'dc': ['p_julian_mahicas']
    },
    notes: ''
  },
  {
    id: 'c_verano_principal',
    folderId: 'verano',
    nombre: 'Campograma Mercado de Verano',
    descripcion: 'Esquema y plantilla objetivo para la próxima temporada',
    fechaModificacion: '22/07/2026',
    formation: '4-3-3',
    monthlyView: false,
    assignments: {
      'mcd': 'p_mangel_prendes',
      'mc_d': 'p_samu_mayo',
      'mc_i': 'p_isi_gomez',
      'dc': 'p_julian_mahicas',
      'ed': 'p_inigo_munoz',
      'ei': 'p_brais_abelenda'
    },
    monthlyAssignments: {},
    notes: 'Planificación estival para afianzar el bloque competitivo.'
  },
  {
    id: 'c_verano_plantilla',
    folderId: 'verano',
    nombre: 'Proyección Plantilla Verano',
    descripcion: 'Evaluación posicional de hasta 5 candidatos por puesto',
    fechaModificacion: '23/07/2026',
    formation: '4-4-2',
    monthlyView: true,
    assignments: {},
    monthlyAssignments: {
      'mc_d': ['p_mangel_prendes', 'p_samu_mayo'],
      'mc_i': ['p_isi_gomez'],
      'dc_d': ['p_julian_mahicas'],
      'dc_i': ['p_brais_abelenda']
    },
    notes: ''
  }
];

export default function TacticalBoard({ players, showNotification, onUpdatePlayer }: TacticalBoardProps) {
  // Folder Navigation State
  const [currentFolder, setCurrentFolder] = useState<CampogramaFolderId | null>(null);
  const [currentSubFolder, setCurrentSubFolder] = useState<CampogramaSubFolderId | null>(null);
  const [activeCampogramaId, setActiveCampogramaId] = useState<string | null>(null);
  const [campogramas, setCampogramas] = useState<CampogramaItem[]>(() => {
    try {
      const saved = localStorage.getItem('DEPARTAMENTO_SCOUTING_CAMPOGRAMAS_V2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading saved campogramas:', e);
    }
    return DEFAULT_CAMPOGRAMAS;
  });

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFormation, setNewFormation] = useState<'4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-4-1' | '4-1-4-1'>('4-4-2');
  const [newMonthlyView, setNewMonthlyView] = useState(true);
  const [newSubFolder, setNewSubFolder] = useState<CampogramaSubFolderId>('1rfef');

  const [editingCampograma, setEditingCampograma] = useState<CampogramaItem | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  // Save campogramas to localStorage on change
  useEffect(() => {
    localStorage.setItem('DEPARTAMENTO_SCOUTING_CAMPOGRAMAS_V2', JSON.stringify(campogramas));
  }, [campogramas]);

  // Active Campograma helper
  const activeCamp = campogramas.find(c => c.id === activeCampogramaId) || null;

  // Pitch Editor States synchronized with activeCamp
  const [formation, setFormation] = useState<'4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-4-1' | '4-1-4-1'>('4-4-2');
  const [monthlyView, setMonthlyView] = useState<boolean>(true);
  const [assignments, setAssignments] = useState<AssignedPositions>({});
  const [monthlyAssignments, setMonthlyAssignments] = useState<{ [positionId: string]: string[] }>({});
  const [notes, setNotes] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [draggingSourcePos, setDraggingSourcePos] = useState<string | null>(null);
  const [valuationFilter, setValuationFilter] = useState<string>('All');
  const [positionFilter, setPositionFilter] = useState<string>('All');

  // When activeCamp changes, load its data into Pitch Editor state
  useEffect(() => {
    if (activeCamp) {
      setFormation(activeCamp.formation || '4-4-2');
      setMonthlyView(activeCamp.monthlyView ?? true);
      setAssignments(activeCamp.assignments || {});
      setMonthlyAssignments(activeCamp.monthlyAssignments || {});
      setNotes(activeCamp.notes || '');
      setSelectedSlot(null);
    }
  }, [activeCampogramaId]);

  // Helper to save edits back into activeCampograma
  const saveActiveCampData = (updatedFields: Partial<CampogramaItem>) => {
    if (!activeCampogramaId) return;
    setCampogramas(prev => prev.map(item => {
      if (item.id === activeCampogramaId) {
        return {
          ...item,
          ...updatedFields,
          fechaModificacion: new Date().toLocaleDateString('es-ES')
        };
      }
      return item;
    }));
  };

  // Update assignments & persist
  const updateAssignments = (newAssignments: AssignedPositions) => {
    setAssignments(newAssignments);
    saveActiveCampData({ assignments: newAssignments });
  };

  const updateMonthlyAssignments = (newMonthly: { [positionId: string]: string[] }) => {
    setMonthlyAssignments(newMonthly);
    saveActiveCampData({ monthlyAssignments: newMonthly });
  };

  const handleFormationChange = (newForm: '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-4-1' | '4-1-4-1') => {
    setFormation(newForm);
    saveActiveCampData({ formation: newForm });
  };

  const handleMonthlyViewToggle = (val: boolean) => {
    setMonthlyView(val);
    saveActiveCampData({ monthlyView: val });
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    saveActiveCampData({ notes: val });
  };

  // Position definitions
  const positions442: PitchPosition[] = [
    { id: 'por', label: 'POR', category: 'Portero', x: 50, y: 88, allowedRoles: ['Portero'] },
    { id: 'ltd', label: 'LTD', category: 'Defensa', x: 15, y: 70, allowedRoles: ['Lateral Derecho', 'Defensa Central'] },
    { id: 'dfc_d', label: 'DFC', category: 'Defensa', x: 38, y: 72, allowedRoles: ['Defensa Central'] },
    { id: 'dfc_i', label: 'DFC', category: 'Defensa', x: 62, y: 72, allowedRoles: ['Defensa Central'] },
    { id: 'lti', label: 'LTI', category: 'Defensa', x: 85, y: 70, allowedRoles: ['Lateral Izquierdo', 'Defensa Central'] },
    { id: 'md', label: 'MD', category: 'Centrocampista', x: 15, y: 44, allowedRoles: ['Extremo Derecho', 'Mediocentro'] },
    { id: 'mc_d', label: 'MC', category: 'Centrocampista', x: 38, y: 46, allowedRoles: ['Mediocentro', 'Mediocentro Defensivo', 'Mediapunta'] },
    { id: 'mc_i', label: 'MC', category: 'Centrocampista', x: 62, y: 46, allowedRoles: ['Mediocentro', 'Mediocentro Defensivo', 'Mediapunta'] },
    { id: 'mi', label: 'MI', category: 'Centrocampista', x: 85, y: 44, allowedRoles: ['Extremo Izquierdo', 'Mediocentro'] },
    { id: 'dc_d', label: 'DC', category: 'Delantero', x: 38, y: 18, allowedRoles: ['Delantero Centro', 'Mediapunta'] },
    { id: 'dc_i', label: 'DC', category: 'Delantero', x: 62, y: 18, allowedRoles: ['Delantero Centro', 'Mediapunta'] },
  ];

  const positions433: PitchPosition[] = [
    { id: 'por', label: 'POR', category: 'Portero', x: 50, y: 88, allowedRoles: ['Portero'] },
    { id: 'ltd', label: 'LTD', category: 'Defensa', x: 15, y: 70, allowedRoles: ['Lateral Derecho', 'Defensa Central'] },
    { id: 'dfc_d', label: 'DFC', category: 'Defensa', x: 38, y: 72, allowedRoles: ['Defensa Central'] },
    { id: 'dfc_i', label: 'DFC', category: 'Defensa', x: 62, y: 72, allowedRoles: ['Defensa Central'] },
    { id: 'lti', label: 'LTI', category: 'Defensa', x: 85, y: 70, allowedRoles: ['Lateral Izquierdo', 'Defensa Central'] },
    { id: 'mcd', label: 'MCD', category: 'Centrocampista', x: 50, y: 56, allowedRoles: ['Mediocentro Defensivo', 'Mediocentro'] },
    { id: 'mc_d', label: 'MC', category: 'Centrocampista', x: 30, y: 40, allowedRoles: ['Mediocentro', 'Mediapunta'] },
    { id: 'mc_i', label: 'MC', category: 'Centrocampista', x: 70, y: 40, allowedRoles: ['Mediocentro', 'Mediapunta'] },
    { id: 'ed', label: 'ED', category: 'Delantero', x: 18, y: 18, allowedRoles: ['Extremo Derecho', 'Delantero Centro'] },
    { id: 'ei', label: 'EI', category: 'Delantero', x: 82, y: 18, allowedRoles: ['Extremo Izquierdo', 'Delantero Centro'] },
    { id: 'dc', label: 'DC', category: 'Delantero', x: 50, y: 15, allowedRoles: ['Delantero Centro', 'Mediapunta'] },
  ];

  const positions4231: PitchPosition[] = [
    { id: 'por', label: 'POR', category: 'Portero', x: 50, y: 88, allowedRoles: ['Portero'] },
    { id: 'ltd', label: 'LTD', category: 'Defensa', x: 15, y: 74, allowedRoles: ['Lateral Derecho', 'Defensa Central'] },
    { id: 'dfc_d', label: 'DFC', category: 'Defensa', x: 36, y: 76, allowedRoles: ['Defensa Central'] },
    { id: 'dfc_i', label: 'DFC', category: 'Defensa', x: 64, y: 76, allowedRoles: ['Defensa Central'] },
    { id: 'lti', label: 'LTI', category: 'Defensa', x: 85, y: 74, allowedRoles: ['Lateral Izquierdo', 'Defensa Central'] },
    { id: 'mcd_d', label: 'MCD', category: 'Centrocampista', x: 35, y: 56, allowedRoles: ['Mediocentro Defensivo', 'Mediocentro'] },
    { id: 'mcd_i', label: 'MCD', category: 'Centrocampista', x: 65, y: 56, allowedRoles: ['Mediocentro Defensivo', 'Mediocentro'] },
    { id: 'mco_d', label: 'MCO/ED', category: 'Centrocampista', x: 18, y: 36, allowedRoles: ['Extremo Derecho', 'Mediocentro', 'Mediapunta'] },
    { id: 'mco', label: 'MCO', category: 'Centrocampista', x: 50, y: 34, allowedRoles: ['Mediapunta', 'Mediocentro'] },
    { id: 'mco_i', label: 'MCO/EI', category: 'Centrocampista', x: 82, y: 36, allowedRoles: ['Extremo Izquierdo', 'Mediocentro', 'Mediapunta'] },
    { id: 'dc', label: 'DC', category: 'Delantero', x: 50, y: 16, allowedRoles: ['Delantero Centro'] },
  ];

  const positions352: PitchPosition[] = [
    { id: 'por', label: 'POR', category: 'Portero', x: 50, y: 88, allowedRoles: ['Portero'] },
    { id: 'dfc_d', label: 'DFC', category: 'Defensa', x: 30, y: 74, allowedRoles: ['Defensa Central'] },
    { id: 'dfc_c', label: 'DFC', category: 'Defensa', x: 50, y: 76, allowedRoles: ['Defensa Central'] },
    { id: 'dfc_i', label: 'DFC', category: 'Defensa', x: 70, y: 74, allowedRoles: ['Defensa Central'] },
    { id: 'car_d', label: 'CAD', category: 'Centrocampista', x: 14, y: 48, allowedRoles: ['Lateral Derecho', 'Extremo Derecho', 'Mediocentro'] },
    { id: 'mc_d', label: 'MC', category: 'Centrocampista', x: 34, y: 46, allowedRoles: ['Mediocentro', 'Mediapunta'] },
    { id: 'mcd', label: 'MCD', category: 'Centrocampista', x: 50, y: 58, allowedRoles: ['Mediocentro Defensivo', 'Mediocentro'] },
    { id: 'mc_i', label: 'MC', category: 'Centrocampista', x: 66, y: 46, allowedRoles: ['Mediocentro', 'Mediapunta'] },
    { id: 'car_i', label: 'CAI', category: 'Centrocampista', x: 86, y: 48, allowedRoles: ['Lateral Izquierdo', 'Extremo Izquierdo', 'Mediocentro'] },
    { id: 'dc_d', label: 'DC', category: 'Delantero', x: 38, y: 20, allowedRoles: ['Delantero Centro', 'Mediapunta'] },
    { id: 'dc_i', label: 'DC', category: 'Delantero', x: 62, y: 20, allowedRoles: ['Delantero Centro', 'Mediapunta'] },
  ];

  const positions541: PitchPosition[] = [
    { id: 'por', label: 'POR', category: 'Portero', x: 50, y: 88, allowedRoles: ['Portero'] },
    { id: 'ltd', label: 'LTD', category: 'Defensa', x: 15, y: 73, allowedRoles: ['Lateral Derecho', 'Defensa Central'] },
    { id: 'dfc_d', label: 'DFC', category: 'Defensa', x: 33, y: 75, allowedRoles: ['Defensa Central'] },
    { id: 'dfc_c', label: 'DFC', category: 'Defensa', x: 50, y: 77, allowedRoles: ['Defensa Central'] },
    { id: 'dfc_i', label: 'DFC', category: 'Defensa', x: 67, y: 75, allowedRoles: ['Defensa Central'] },
    { id: 'lti', label: 'LTI', category: 'Defensa', x: 85, y: 73, allowedRoles: ['Lateral Izquierdo', 'Defensa Central'] },
    { id: 'md', label: 'MD', category: 'Centrocampista', x: 18, y: 46, allowedRoles: ['Extremo Derecho', 'Mediocentro'] },
    { id: 'mc_d', label: 'MC', category: 'Centrocampista', x: 38, y: 48, allowedRoles: ['Mediocentro', 'Mediocentro Defensivo'] },
    { id: 'mc_i', label: 'MC', category: 'Centrocampista', x: 62, y: 48, allowedRoles: ['Mediocentro', 'Mediocentro Defensivo'] },
    { id: 'mi', label: 'MI', category: 'Centrocampista', x: 82, y: 46, allowedRoles: ['Extremo Izquierdo', 'Mediocentro'] },
    { id: 'dc', label: 'DC', category: 'Delantero', x: 50, y: 18, allowedRoles: ['Delantero Centro'] },
  ];

  const positions4141: PitchPosition[] = [
    { id: 'por', label: 'POR', category: 'Portero', x: 50, y: 88, allowedRoles: ['Portero'] },
    { id: 'ltd', label: 'LTD', category: 'Defensa', x: 15, y: 73, allowedRoles: ['Lateral Derecho', 'Defensa Central'] },
    { id: 'dfc_d', label: 'DFC', category: 'Defensa', x: 38, y: 75, allowedRoles: ['Defensa Central'] },
    { id: 'dfc_i', label: 'DFC', category: 'Defensa', x: 62, y: 75, allowedRoles: ['Defensa Central'] },
    { id: 'lti', label: 'LTI', category: 'Defensa', x: 85, y: 73, allowedRoles: ['Lateral Izquierdo', 'Defensa Central'] },
    { id: 'mcd', label: 'MCD', category: 'Centrocampista', x: 50, y: 58, allowedRoles: ['Mediocentro Defensivo', 'Mediocentro'] },
    { id: 'md', label: 'MD', category: 'Centrocampista', x: 18, y: 38, allowedRoles: ['Extremo Derecho', 'Mediocentro'] },
    { id: 'mc_d', label: 'MC', category: 'Centrocampista', x: 36, y: 36, allowedRoles: ['Mediocentro', 'Mediapunta'] },
    { id: 'mc_i', label: 'MC', category: 'Centrocampista', x: 64, y: 36, allowedRoles: ['Mediocentro', 'Mediapunta'] },
    { id: 'mi', label: 'MI', category: 'Centrocampista', x: 82, y: 38, allowedRoles: ['Extremo Izquierdo', 'Mediocentro'] },
    { id: 'dc', label: 'DC', category: 'Delantero', x: 50, y: 16, allowedRoles: ['Delantero Centro'] },
  ];

  const currentPositions = 
    formation === '4-3-3' ? positions433 :
    formation === '4-2-3-1' ? positions4231 :
    formation === '3-5-2' ? positions352 :
    formation === '5-4-1' ? positions541 :
    formation === '4-1-4-1' ? positions4141 :
    positions442;

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData('playerId', playerId);
    setDraggingSourcePos(null);
  };

  const handlePitchPositionDragStart = (e: React.DragEvent, sourcePosId: string, playerId: string) => {
    e.dataTransfer.setData('playerId', playerId);
    e.dataTransfer.setData('sourcePosId', sourcePosId);
    setDraggingSourcePos(sourcePosId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnPosition = (e: React.DragEvent, targetPosId: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    const sourcePosId = e.dataTransfer.getData('sourcePosId');
    setDraggingSourcePos(null);

    if (!playerId) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    if (monthlyView) {
      appendPlayerToMonthly(targetPosId, player);
      return;
    }

    if (sourcePosId && sourcePosId !== targetPosId) {
      const updated = { ...assignments };
      const existingInTarget = updated[targetPosId];
      updated[targetPosId] = playerId;
      if (existingInTarget) {
        updated[sourcePosId] = existingInTarget;
      } else {
        delete updated[sourcePosId];
      }
      updateAssignments(updated);
      showNotification(`Posición intercambiada en el campograma`, 'success');
      return;
    }

    handleAssignPlayer(targetPosId, player);
  };

  const handleRemoveDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourcePosId = e.dataTransfer.getData('sourcePosId');
    setDraggingSourcePos(null);

    if (sourcePosId && !monthlyView) {
      handleAssignPlayer(sourcePosId, null);
    }
  };

  const appendPlayerToMonthly = (slotId: string, player: ScoutedPlayer) => {
    const currentList = monthlyAssignments[slotId] || [];
    if (currentList.includes(player.id)) {
      showNotification(`${player.nombre} ya está en este puesto`, 'info');
      return;
    }
    if (currentList.length >= 5) {
      showNotification('Límite de 5 jugadores por posición alcanzado', 'error');
      return;
    }
    const updated = {
      ...monthlyAssignments,
      [slotId]: [...currentList, player.id]
    };
    updateMonthlyAssignments(updated);
    showNotification(`${player.nombre} añadido a ${slotId.toUpperCase()}`, 'success');
  };

  const removePlayerFromMonthly = (slotId: string, playerId: string) => {
    const currentList = monthlyAssignments[slotId] || [];
    const updatedList = currentList.filter(id => id !== playerId);
    const updated = {
      ...monthlyAssignments,
      [slotId]: updatedList
    };
    updateMonthlyAssignments(updated);
    showNotification('Jugador eliminado de la posición mensual', 'info');
  };

  const handleAssignPlayer = (slotId: string, player: ScoutedPlayer | null) => {
    if (!player) {
      const updated = { ...assignments };
      delete updated[slotId];
      updateAssignments(updated);
      showNotification('Jugador removido de la posición', 'info');
      return;
    }

    const updated = { ...assignments };
    Object.keys(updated).forEach(key => {
      if (updated[key] === player.id) {
        delete updated[key];
      }
    });

    updated[slotId] = player.id;
    updateAssignments(updated);
    showNotification(`${player.nombre} asignado a posición de ${slotId.toUpperCase()}`, 'success');
  };

  const handleClearPitch = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 4500);
      return;
    }
    if (monthlyView) {
      updateMonthlyAssignments({});
    } else {
      updateAssignments({});
    }
    setShowClearConfirm(false);
    showNotification('Pizarra táctica limpia', 'info');
  };

  // Export PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const currentFolderName = FOLDERS.find(f => f.id === activeCamp?.folderId)?.title || 'Campogramas';
      const campName = activeCamp?.nombre || 'Campograma Táctico';

      doc.setFillColor(37, 99, 235); // Blue-600
      doc.rect(15, 15, 3, 16, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(`DEPARTAMENTO SCOUTING — ${campName.toUpperCase()}`, 22, 21);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`CARPETA: ${currentFolderName.toUpperCase()} | SISTEMA: ${formation.toUpperCase()} | ${monthlyView ? 'MODO POSICIONAL (5xPUESTO)' : 'ALINEACIÓN 11'}`, 22, 27);

      const localTimeStr = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Fecha: ${localTimeStr}`, 195, 21, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 32, 195, 32);

      if (monthlyView) {
        let baseStartX = 15;
        let baseStartY = 38;
        
        currentPositions.forEach((pos, index) => {
          const colIndex = index % 2;
          const rowIndex = Math.floor(index / 2);
          const x = baseStartX + colIndex * 93;
          const y = baseStartY + rowIndex * 38;

          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.25);
          doc.rect(x, y, 88, 34, 'FD');

          doc.setFillColor(30, 41, 59);
          doc.rect(x, y, 88, 6.5, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(`${pos.label} — ${pos.category.toUpperCase()}`, x + 3.5, y + 4.5);

          const assignedIds = monthlyAssignments[pos.id] || [];
          let lineY = y + 12;

          if (assignedIds.length === 0) {
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.text('Sin jugadores asignados (Vacante)', x + 5, y + 18);
          } else {
            assignedIds.forEach((pid, pIdx) => {
              const p = players.find(player => player.id === pid);
              if (p) {
                doc.setTextColor(15, 23, 42);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                const showName = p.nombre.length > 25 ? p.nombre.slice(0, 23) + '..' : p.nombre;
                doc.text(`${pIdx + 1}. ${showName}`, x + 4, lineY);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                const detailText = `${p.anoNacimiento ? `'${String(p.anoNacimiento).slice(-2)}` : ''} | ${p.equipo || 'Sin club'} | ${p.recomendacion || 'Sin evaluar'}`;
                doc.text(detailText, x + 4, lineY + 3.2);

                lineY += 5.2;
              }
            });
          }
        });
      } else {
        // Standard 11 lineup PDF list
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('TITULARES Y POSICIONES ASIGNADAS', 15, 42);

        let curY = 50;
        currentPositions.forEach((pos, idx) => {
          const playerId = assignments[pos.id];
          const player = players.find(p => p.id === playerId);

          doc.setFillColor(241, 245, 249);
          doc.rect(15, curY, 180, 14, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.rect(15, curY, 180, 14, 'D');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text(`${idx + 1}. [${pos.label}] ${pos.category}`, 20, curY + 9);

          if (player) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(2, 132, 199);
            doc.text(player.nombre, 80, curY + 9);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`${player.equipo || 'Sin equipo'} | Val: ${player.recomendacion || 'S/E'}`, 140, curY + 9);
          } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8.5);
            doc.setTextColor(148, 163, 184);
            doc.text('Sin asignar', 80, curY + 9);
          }

          curY += 17;
        });
      }

      if (notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text('NOTAS Y OBSERVACIONES TÁCTICAS:', 15, 260);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(notes.slice(0, 180), 15, 266);
      }

      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text(`Página 1 de 1 | Departamento Scouting — ${campName} | Generado automáticamente.`, 15, 282);

      doc.save(`Campograma_${campName.replace(/\s+/g, '_')}.pdf`);
      showNotification(`Campograma '${campName}' exportado exitosamente en PDF`, 'success');
    } catch (err) {
      console.error(err);
      showNotification('Error al exportar PDF del campograma', 'error');
    }
  };

  // Filtered player list
  const filteredPlayers = players.filter(p => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q ||
      p.nombre.toLowerCase().includes(q) ||
      p.posicion.toLowerCase().includes(q) ||
      p.equipo.toLowerCase().includes(q);

    const recValue = p.recomendacion ? p.recomendacion.trim().toUpperCase() : '';
    let normRec = '';
    if (recValue === 'FIRMAR' || recValue === 'CONTRATAR') normRec = 'FIRMAR';
    else if (recValue === 'SEGUIR' || recValue === 'SEGUIMIENTO') normRec = 'SEGUIR';
    else if (recValue === 'INTERESANTE' || recValue === 'EVALUAR') normRec = 'INTERESANTE';
    else if (recValue === 'DESCARTAR') normRec = 'DESCARTAR';

    const matchesValuation = valuationFilter === 'All' ||
      (valuationFilter === 'SIN_VALORAR' && !normRec) ||
      (valuationFilter !== 'SIN_VALORAR' && normRec === valuationFilter);

    const matchesPosition = positionFilter === 'All' || p.posicion === positionFilter;

    return matchesQuery && matchesValuation && matchesPosition;
  });

  const getRecTag = (recName?: string) => {
    if (!recName) return null;
    const cleanRec = recName.toUpperCase();
    if (cleanRec === 'FIRMAR' || cleanRec === 'CONTRATAR') {
      return { text: 'FIRMAR', bg: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30' };
    }
    if (cleanRec === 'SEGUIR' || cleanRec === 'SEGUIMIENTO') {
      return { text: 'SEGUIR', bg: 'bg-blue-950/40 text-blue-400 border-blue-900/30' };
    }
    if (cleanRec === 'INTERESANTE' || cleanRec === 'EVALUAR') {
      return { text: 'EVALUAR', bg: 'bg-amber-950/40 text-amber-400 border-amber-900/30' };
    }
    return { text: 'DESCARTAR', bg: 'bg-red-950/40 text-red-400 border-red-900/30' };
  };

  // Action: Create New Campograma
  const handleCreateNewCampograma = () => {
    if (!currentFolder) return;
    const title = newTitle.trim() || `Nuevo Campograma ${new Date().toLocaleDateString('es-ES')}`;
    const assignedSubFolder = currentFolder === 'mensuales' ? (newSubFolder || currentSubFolder || '1rfef') : undefined;
    const newCamp: CampogramaItem = {
      id: `c_${Date.now()}`,
      folderId: currentFolder,
      subFolderId: assignedSubFolder,
      nombre: title,
      fechaModificacion: new Date().toLocaleDateString('es-ES'),
      formation: newFormation,
      monthlyView: newMonthlyView,
      assignments: {},
      monthlyAssignments: {},
      notes: ''
    };
    setCampogramas(prev => [newCamp, ...prev]);
    setShowCreateModal(false);
    setNewTitle('');
    setActiveCampogramaId(newCamp.id);
    showNotification(`¡Campograma "${title}" creado exitosamente!`, 'success');
  };

  // Action: Duplicate Campograma
  const handleDuplicateCampograma = (e: React.MouseEvent, item: CampogramaItem) => {
    e.stopPropagation();
    const dup: CampogramaItem = {
      ...item,
      id: `c_${Date.now()}`,
      nombre: `${item.nombre} (Copia)`,
      fechaModificacion: new Date().toLocaleDateString('es-ES')
    };
    setCampogramas(prev => [dup, ...prev]);
    showNotification(`Campograma duplicado: ${dup.nombre}`, 'info');
  };

  // Action: Delete Campograma
  const handleDeleteCampograma = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`¿Estás seguro de que deseas eliminar el campograma "${name}"?`)) {
      setCampogramas(prev => prev.filter(c => c.id !== id));
      if (activeCampogramaId === id) setActiveCampogramaId(null);
      showNotification(`Campograma "${name}" eliminado`, 'info');
    }
  };

  // Action: Rename Campograma
  const handleSaveRename = () => {
    if (!editingCampograma) return;
    const cleanTitle = editTitleInput.trim() || editingCampograma.nombre;
    setCampogramas(prev => prev.map(item => {
      if (item.id === editingCampograma.id) {
        return {
          ...item,
          nombre: cleanTitle,
          fechaModificacion: new Date().toLocaleDateString('es-ES')
        };
      }
      return item;
    }));
    setEditingCampograma(null);
    showNotification('Nombre del campograma actualizado', 'success');
  };

  // ==================== RENDER LEVEL 1: CARPETAS DASHBOARD ====================
  if (currentFolder === null) {
    return (
      <div className="space-y-6">
        {/* Top Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-blue-400 uppercase tracking-widest mb-1">
                <Folder className="w-4 h-4" />
                <span>DEPARTAMENTO SCOUTING • MÓDULO CAMPOGRAMA</span>
              </div>
              <h1 className="text-2xl font-black font-display text-white tracking-wide uppercase">
                Carpetas de Campogramas Tácticos
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Selecciona una carpeta para consultar, organizar y diseñar los campogramas posicionales, alineaciones de mercado e informes tácticos.
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Total Campogramas</span>
                <span className="text-lg font-bold font-mono text-blue-400">{campogramas.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Folders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FOLDERS.map((f) => {
            const Icon = f.icon;
            const itemsInFolder = campogramas.filter(c => c.folderId === f.id);
            return (
              <div
                key={f.id}
                onClick={() => setCurrentFolder(f.id)}
                className={`bg-gradient-to-b ${f.gradient} border ${f.borderColor} rounded-xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center ${f.accentColor} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${f.badgeBg}`}>
                      {itemsInFolder.length} {itemsInFolder.length === 1 ? 'Campograma' : 'Campogramas'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold font-display text-white group-hover:text-blue-300 transition-colors uppercase tracking-wide">
                    {f.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {f.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono font-bold">
                  <span className={`${f.accentColor} flex items-center space-x-1`}>
                    <span>Entrar a carpeta</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 ${f.accentColor} group-hover:translate-x-1 transition-transform`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Summary list of recent campogramas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Últimos Campogramas Editados</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {campogramas.slice(0, 3).map(c => {
              const folderObj = FOLDERS.find(f => f.id === c.folderId);
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setCurrentFolder(c.folderId);
                    setActiveCampogramaId(c.id);
                  }}
                  className="bg-slate-950 hover:bg-slate-850/80 border border-slate-800 hover:border-slate-700 p-3.5 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[9px] font-mono font-bold text-blue-400 uppercase bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/30">
                      {folderObj?.shortTitle || 'Campograma'}
                    </span>
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-300 truncate mt-1">
                      {c.nombre}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Sistema {c.formation} • {c.monthlyView ? 'Posicional' : 'Alineación 11'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER LEVEL 2: INSIDE A FOLDER (CAMPOGRAMAS LIST / SUBFOLDERS) ====================
  const folderInfo = FOLDERS.find(f => f.id === currentFolder)!;

  // Level 1.5: If in 'mensuales' folder and no subfolder is selected yet
  if (currentFolder === 'mensuales' && currentSubFolder === null && activeCampogramaId === null) {
    const Icon = folderInfo.icon;
    return (
      <div className="space-y-6">
        {/* Header Breadcrumbs & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setCurrentFolder(null);
                setCurrentSubFolder(null);
              }}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 hover:text-white transition-all flex items-center space-x-1 text-xs font-mono"
              title="Volver a todas las carpetas"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Carpetas</span>
            </button>

            <div>
              <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 uppercase">
                <span>Carpetas</span>
                <span>/</span>
                <span className={folderInfo.accentColor}>{folderInfo.title}</span>
              </div>
              <h1 className="text-xl font-black font-display text-white uppercase tracking-wider flex items-center gap-2 mt-0.5">
                <Icon className={`w-5 h-5 ${folderInfo.accentColor}`} />
                <span>{folderInfo.title}</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Subfolders Grid for Mensuales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SUBFOLDERS_MENSUALES.map((sf) => {
            const SfIcon = sf.icon;
            const itemsInSubFolder = campogramas.filter(c => c.folderId === 'mensuales' && (c.subFolderId || '1rfef') === sf.id);
            return (
              <div
                key={sf.id}
                onClick={() => {
                  setCurrentSubFolder(sf.id);
                  setNewSubFolder(sf.id);
                }}
                className={`bg-gradient-to-b ${sf.gradient} border ${sf.borderColor} rounded-xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center ${sf.accentColor} group-hover:scale-110 transition-transform`}>
                      <SfIcon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${sf.badgeBg}`}>
                      {itemsInSubFolder.length} {itemsInSubFolder.length === 1 ? 'Campograma' : 'Campogramas'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-display text-white group-hover:text-blue-300 transition-colors uppercase tracking-wide">
                    {sf.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {sf.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono font-bold">
                  <span className={`${sf.accentColor} flex items-center space-x-1`}>
                    <span>Entrar en {sf.shortTitle}</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 ${sf.accentColor} group-hover:translate-x-1 transition-transform`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Level 2: List of Campogramas inside current folder or subfolder
  const currentSubFolderObj = currentFolder === 'mensuales' 
    ? SUBFOLDERS_MENSUALES.find(s => s.id === (currentSubFolder || '1rfef'))
    : null;

  const folderItems = campogramas.filter(c => {
    if (c.folderId !== currentFolder) return false;
    if (currentFolder === 'mensuales') {
      return (c.subFolderId || '1rfef') === (currentSubFolder || '1rfef');
    }
    return true;
  });

  if (activeCampogramaId === null) {
    const Icon = folderInfo.icon;
    return (
      <div className="space-y-6">
        {/* Header Breadcrumbs & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (currentFolder === 'mensuales') {
                  setCurrentSubFolder(null);
                } else {
                  setCurrentFolder(null);
                }
              }}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 hover:text-white transition-all flex items-center space-x-1 text-xs font-mono"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{currentFolder === 'mensuales' ? 'Volver a Categorías Mensuales' : 'Volver a Carpetas'}</span>
            </button>

            <div>
              <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 uppercase">
                <span>Carpetas</span>
                <span>/</span>
                <span>{folderInfo.title}</span>
                {currentSubFolderObj && (
                  <>
                    <span>/</span>
                    <span className={currentSubFolderObj.accentColor}>{currentSubFolderObj.title}</span>
                  </>
                )}
              </div>
              <h1 className="text-xl font-black font-display text-white uppercase tracking-wider flex items-center gap-2 mt-0.5">
                {currentSubFolderObj ? (
                  <>
                    <Shield className={`w-5 h-5 ${currentSubFolderObj.accentColor}`} />
                    <span>{currentSubFolderObj.title}</span>
                  </>
                ) : (
                  <>
                    <Icon className={`w-5 h-5 ${folderInfo.accentColor}`} />
                    <span>{folderInfo.title}</span>
                  </>
                )}
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              const defaultPrefix = currentSubFolderObj ? currentSubFolderObj.shortTitle : folderInfo.shortTitle;
              setNewTitle(`${defaultPrefix} - ${new Date().toLocaleDateString('es-ES')}`);
              if (currentSubFolder) setNewSubFolder(currentSubFolder);
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-mono font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Campograma</span>
          </button>
        </div>

        {/* Campogramas Grid inside this Folder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {folderItems.map(item => {
            const placedCount = item.monthlyView 
              ? Object.values(item.monthlyAssignments || {}).reduce<number>((acc, curr) => acc + ((curr as string[])?.length || 0), 0)
              : Object.values(item.assignments || {}).filter(Boolean).length;

            return (
              <div
                key={item.id}
                onClick={() => setActiveCampogramaId(item.id)}
                className="bg-slate-900 border border-slate-850 hover:border-blue-500/50 rounded-xl p-5 shadow-lg hover:shadow-2xl transition-all duration-200 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[9px] font-mono font-extrabold uppercase bg-blue-950/60 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded">
                      SISTEMA {item.formation}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {item.fechaModificacion}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                    {item.nombre}
                  </h3>
                  {item.descripcion && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.descripcion}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      item.monthlyView ? 'bg-indigo-950/40 text-indigo-300 border-indigo-900/40' : 'bg-emerald-950/40 text-emerald-300 border-emerald-900/40'
                    }`}>
                      {item.monthlyView ? '📅 Posicional (5xPuesto)' : '⚽ Alineación Standard 11'}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">
                      {placedCount} {placedCount === 1 ? 'jugador' : 'jugadores'}
                    </span>
                  </div>
                </div>

                {/* Actions bottom */}
                <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400 group-hover:text-blue-300 flex items-center space-x-1">
                    <span>Abrir / Editar</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => handleDuplicateCampograma(e, item)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                      title="Duplicar campograma"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCampograma(item);
                        setEditTitleInput(item.nombre);
                      }}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                      title="Cambiar nombre"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCampograma(e, item.id, item.nombre)}
                      className="p-1.5 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded transition-colors"
                      title="Eliminar campograma"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {folderItems.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-900 border border-slate-850 rounded-xl p-8">
              <Folder className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-300 uppercase">No hay campogramas en esta carpeta</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Crea tu primer campograma para empezar la planificación táctica.</p>
              <button
                onClick={() => {
                  const defaultPrefix = currentSubFolderObj ? currentSubFolderObj.shortTitle : folderInfo.shortTitle;
                  setNewTitle(`${defaultPrefix} - ${new Date().toLocaleDateString('es-ES')}`);
                  if (currentSubFolder) setNewSubFolder(currentSubFolder);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-mono font-bold text-xs uppercase"
              >
                Crear Primer Campograma
              </button>
            </div>
          )}
        </div>

        {/* Modal: Create New Campograma */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold font-display uppercase tracking-wide text-white">
                  Crear Nuevo Campograma
                </h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {currentFolder === 'mensuales' && (
                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase block mb-1">
                    Carpeta / Categoría
                  </label>
                  <select
                    value={newSubFolder}
                    onChange={(e) => setNewSubFolder(e.target.value as CampogramaSubFolderId)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-blue-400 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="1rfef">CAMPOGRAMA PRIMERA RFEF</option>
                    <option value="2rfef">CAMPOGRAMA SEGUNDA RFEF</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-mono font-bold text-slate-300 uppercase block mb-1">
                  Nombre del Campograma
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Campograma Febrero 2026"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-slate-300 uppercase block mb-1">
                  Sistema Táctico Inicial
                </label>
                <select
                  value={newFormation}
                  onChange={(e) => setNewFormation(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-blue-400 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="4-4-2">4-4-2 STANDARD</option>
                  <option value="4-3-3">4-3-3 ATTACK</option>
                  <option value="4-2-3-1">4-2-3-1 MODERN</option>
                  <option value="3-5-2">3-5-2 POSITIONAL</option>
                  <option value="5-4-1">5-4-1 DEFENSIVE</option>
                  <option value="4-1-4-1">4-1-4-1 CONTROL</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-slate-300 uppercase block mb-1">
                  Modo de Campograma
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewMonthlyView(true)}
                    className={`p-2.5 rounded-lg border text-left font-mono text-xs transition-all ${
                      newMonthlyView ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="block font-bold">📅 Posicional</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">Hasta 5 por posición</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMonthlyView(false)}
                    className={`p-2.5 rounded-lg border text-left font-mono text-xs transition-all ${
                      !newMonthlyView ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="block font-bold">⚽ Alineación 11</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">Un jugador por puesto</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewCampograma}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-mono font-bold text-xs uppercase"
                >
                  Crear y Editar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Rename Campograma */}
        {editingCampograma && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold font-display uppercase tracking-wide text-white border-b border-slate-800 pb-2">
                Cambiar Nombre del Campograma
              </h3>
              <input
                type="text"
                value={editTitleInput}
                onChange={(e) => setEditTitleInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setEditingCampograma(null)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveRename}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-mono font-bold uppercase"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== RENDER LEVEL 3: EDITING CAMPOGRAMA ON SOCCER PITCH ====================
  return (
    <div className="space-y-4">
      {/* Top Header Navigation bar */}
      <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveCampogramaId(null)}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 text-xs font-mono font-bold shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a {currentSubFolderObj ? currentSubFolderObj.shortTitle : folderInfo.shortTitle}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400 uppercase truncate">
              <span>{folderInfo.title}</span>
              {currentSubFolderObj && (
                <>
                  <span>/</span>
                  <span>{currentSubFolderObj.shortTitle}</span>
                </>
              )}
              <span>/</span>
              <span className="text-blue-400 font-bold">{activeCamp?.nombre}</span>
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold font-display text-white uppercase tracking-wider truncate">
                {activeCamp?.nombre}
              </h1>
              <button
                onClick={() => {
                  if (activeCamp) {
                    setEditingCampograma(activeCamp);
                    setEditTitleInput(activeCamp.nombre);
                  }
                }}
                className="text-slate-500 hover:text-blue-400 p-1"
                title="Renombrar campograma"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded flex items-center gap-1">
            <Check className="w-3 h-3" /> Guardado
          </span>
        </div>
      </div>

      {/* Main Pitch Workspace */}
      <div id="tactical-board-section" className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-full">
        {/* LEFT SIDEBAR: Available Players */}
        <div 
          className={`lg:col-span-4 bg-slate-900 border rounded-lg p-4 flex flex-col h-[880px] min-h-[800px] shadow-lg relative transition-all duration-300 ${
            draggingSourcePos ? 'border-red-500/45 ring-1 ring-red-550/15' : 'border-slate-850'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleRemoveDrop}
        >
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-sm font-bold font-display tracking-wider text-slate-200 uppercase flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Plantilla Ojeada</span>
              </h3>
              <span className="text-[10px] bg-slate-950 px-2 py-0.5 border border-slate-800 rounded-full font-mono text-slate-400">
                {players.length} Total
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mb-3">
              Arrastra un jugador hacia un círculo del campo o pulsa el círculo para elegirlo directamente.
            </p>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar en cartera..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 rounded border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder-slate-500 transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <select
                value={valuationFilter}
                onChange={(e) => setValuationFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              >
                <option value="All">Todas Valoraciones</option>
                <option value="FIRMAR">⭐ FIRMAR / CONTRATAR</option>
                <option value="SEGUIR">👀 SEGUIR</option>
                <option value="INTERESANTE">💡 EVALUAR / INTERESANTE</option>
                <option value="DESCARTAR">❌ DESCARTAR</option>
                <option value="SIN_VALORAR">❓ SIN VALORAR</option>
              </select>

              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              >
                <option value="All">Todas Posiciones</option>
                {Array.from(new Set(players.map(p => p.posicion).filter(Boolean))).sort().map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Player List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredPlayers.map((player) => {
              const isAssigned = Object.values(assignments).includes(player.id);
              const isAssignedAnywhereInMonthly = Object.values(monthlyAssignments).some(list => (list as string[])?.includes(player.id));

              return (
                <div
                  key={player.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, player.id)}
                  onClick={() => {
                    if (monthlyView) {
                      if (selectedSlot) {
                        appendPlayerToMonthly(selectedSlot, player);
                        setSelectedSlot(null);
                      } else {
                        showNotification('Pulsa en una posición del campo para añadir este jugador', 'info');
                      }
                    } else {
                      if (!isAssigned) {
                        if (selectedSlot) {
                          handleAssignPlayer(selectedSlot, player);
                          setSelectedSlot(null);
                        } else {
                          showNotification('Pulsa en una posición vacía del campo para colocar a este jugador', 'info');
                        }
                      } else {
                        const foundSlot = Object.keys(assignments).find(k => assignments[k] === player.id);
                        if (foundSlot) {
                          handleAssignPlayer(foundSlot, null);
                        }
                      }
                    }
                  }}
                  className={`p-2.5 rounded border text-left flex items-center justify-between transition-all select-none cursor-pointer ${
                    isAssigned
                      ? 'bg-blue-950/20 border-blue-900/60 shadow-inner'
                      : 'bg-slate-950 hover:bg-slate-850/70 border-slate-800 hover:border-slate-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="relative shrink-0">
                      {player.fotoUrl ? (
                        <img src={player.fotoUrl} alt={player.nombre} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-slate-750" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold font-mono text-[11px] text-blue-400 uppercase">
                          {player.nombre.slice(0, 2)}
                        </div>
                      )}
                      {player.escudoUrl && (
                        <img 
                          src={player.escudoUrl} 
                          alt="Escudo" 
                          referrerPolicy="no-referrer" 
                          className="w-4 h-4 rounded-full object-contain absolute -bottom-1 -right-1 bg-slate-950 p-[1px] border border-slate-800" 
                        />
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-100 truncate leading-tight">{player.nombre}</p>
                      <p className="text-[9px] font-mono text-slate-400 mt-0.5 truncate uppercase">
                        {player.posicion} • {player.equipo || 'Sin Equipo'}
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1">
                        {player.lateralidad && (
                          <span className="text-[8px] font-mono font-extrabold px-1 py-0.2 bg-slate-900 border border-slate-800 text-blue-400 rounded-xs uppercase">
                            {player.lateralidad.slice(0, 3)}
                          </span>
                        )}
                        {player.recomendacion && (
                          <span className={`text-[8px] font-mono font-bold px-1 rounded-xs border ${getRecTag(player.recomendacion)?.bg || 'bg-slate-900/40 text-slate-400 border-slate-800'}`}>
                            {getRecTag(player.recomendacion)?.text || player.recomendacion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end space-y-1 pl-2 font-mono">
                    {isAssigned ? (
                      <span className="text-[8px] uppercase tracking-wider text-blue-400 font-bold bg-blue-950/40 border border-blue-900/40 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <UserCheck className="w-2.5 h-2.5" /> COLOCADO
                      </span>
                    ) : isAssignedAnywhereInMonthly ? (
                      <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                        ALINEADO
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300">:::</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredPlayers.length === 0 && (
              <div className="py-12 text-center text-slate-500 italic text-xs font-mono">
                Ningún jugador coincide en cartera.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT WORKSPACE: Soccer Pitch Canvas */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-850 rounded-lg p-5 flex flex-col h-[880px] min-h-[800px] shadow-lg justify-between relative overflow-hidden">
          {/* Header Actions */}
          <div className="flex flex-col xl:flex-row items-center justify-between border-b border-slate-800 pb-3 gap-2.5 z-10">
            <div>
              <h2 className="text-sm font-black font-display text-white tracking-widest uppercase flex items-center gap-2">
                <span className="text-blue-500">⚙️</span> {monthlyView ? "CAMPOGRAMA POSICIONAL (HASTA 5 POR PUESTO)" : "CAMPOGRAMA COMPLETO DE ALINEACIÓN 11"}
              </h2>
              <p className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">
                {monthlyView ? "AÑADE Y ORGANIZA CANDIDATOS POR CADA PUESTO TÁCTICO" : "Configura el 11 titular y esquema en el terreno de juego"}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto">
              {/* Toggle Monthly Mode */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !monthlyView;
                  handleMonthlyViewToggle(nextVal);
                  setSelectedSlot(null);
                  showNotification(
                    nextVal 
                      ? "Activado Campograma Posicional. Hasta 5 nombres por puesto." 
                      : "Activado Campograma de Alineación 11 standard.", 
                    "info"
                  );
                }}
                className={`px-3 py-1.5 border text-[10px] font-mono font-black rounded-lg flex items-center space-x-1.5 transition-all outline-none cursor-pointer ${
                  monthlyView 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 font-bold' 
                    : 'bg-slate-950 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-blue-400 font-extrabold'
                }`}
              >
                <span>📅 MODO POSICIONAL (5xPUESTO)</span>
              </button>

              {/* System Dropdown */}
              <div className="bg-slate-950 p-1 rounded-lg border border-slate-850 flex items-center text-xs font-mono">
                <span className="text-slate-500 px-1.5 font-bold uppercase text-[8.5px]">SISTEMA:</span>
                <select
                  value={formation}
                  onChange={(e) => handleFormationChange(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-blue-400 font-extrabold uppercase py-0.5 px-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 tracking-wider cursor-pointer text-[10px]"
                >
                  <option value="4-4-2">4-4-2 STANDARD</option>
                  <option value="4-3-3">4-3-3 ATTACK</option>
                  <option value="4-2-3-1">4-2-3-1 MODERN</option>
                  <option value="3-5-2">3-5-2 POSITIONAL</option>
                  <option value="5-4-1">5-4-1 DEFENSIVE</option>
                  <option value="4-1-4-1">4-1-4-1 CONTROL</option>
                </select>
              </div>

              {/* Export PDF */}
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-400 text-[10px] font-mono font-bold rounded-lg flex items-center space-x-1 transition-all"
                title="Exportar en PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={handleClearPitch}
                className={`px-2.5 py-1.5 border text-[10px] font-mono font-bold rounded-lg flex items-center space-x-1 transition-all ${
                  showClearConfirm
                    ? 'bg-red-600 text-white border-red-500 font-extrabold animate-pulse'
                    : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-red-400'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{showClearConfirm ? "¿CONFIRMAR VACIAR?" : "VACIAR"}</span>
              </button>
            </div>
          </div>

          {/* FIELD CANVAS */}
          <div className="flex-1 my-3 bg-gradient-to-b from-emerald-950/90 via-emerald-900/80 to-emerald-950/90 border-2 border-emerald-800/60 rounded-xl relative overflow-hidden shadow-2xl flex items-center justify-center select-none">
            {/* Pitch Markings */}
            <div className="absolute inset-2 border border-emerald-500/25 pointer-events-none"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-500/25 -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-emerald-500/25 rounded-full pointer-events-none"></div>
            
            {/* Top Penalty Area */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[45%] h-[18%] border-b border-x border-emerald-500/25 pointer-events-none"></div>
            {/* Bottom Penalty Area */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[45%] h-[18%] border-t border-x border-emerald-500/25 pointer-events-none"></div>

            {/* Positions overlay */}
            <div className="absolute inset-0 z-20">
              {currentPositions.map((pos) => {
                const isSelected = selectedSlot === pos.id;

                if (monthlyView) {
                  const assignedPlayerIds = monthlyAssignments[pos.id] || [];
                  return (
                    <div
                      key={pos.id}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      onClick={() => setSelectedSlot(isSelected ? null : pos.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnPosition(e, pos.id)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-200 z-30 cursor-pointer group ${
                        isSelected ? 'scale-105 ring-2 ring-blue-400 rounded-lg p-1 bg-slate-950/90' : ''
                      }`}
                    >
                      <div className="bg-slate-950/90 border border-slate-750/90 rounded-lg p-2 min-w-[130px] max-w-[155px] shadow-2xl backdrop-blur-md">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 mb-1">
                          <span className="text-[9px] font-mono font-black text-blue-400 uppercase tracking-widest">
                            {pos.label}
                          </span>
                          <span className="text-[8px] font-mono text-slate-400">
                            ({assignedPlayerIds.length}/5)
                          </span>
                        </div>

                        <div className="space-y-1 min-h-[40px]">
                          {assignedPlayerIds.map((pid, idx) => {
                            const p = players.find(player => player.id === pid);
                            if (!p) return null;
                            return (
                              <div
                                key={pid}
                                className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] font-bold text-white group/item hover:border-blue-500/50"
                              >
                                <span className="truncate pr-1">
                                  {idx + 1}. {p.nombre.split(' ')[0]}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removePlayerFromMonthly(pos.id, pid);
                                  }}
                                  className="text-slate-500 hover:text-red-400 font-extrabold text-[8px] shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}

                          {assignedPlayerIds.length === 0 && (
                            <div className="text-[8px] text-slate-500 font-mono italic text-center py-2">
                              Vacante (+ Añadir)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Standard 11 Lineup Mode
                const assignedPlayerId = assignments[pos.id];
                const player = players.find(p => p.id === assignedPlayerId);

                return (
                  <div
                    key={pos.id}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    onClick={() => setSelectedSlot(isSelected ? null : pos.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnPosition(e, pos.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-200 z-30 cursor-pointer group"
                  >
                    <div
                      draggable={!!player}
                      onDragStart={(e) => player && handlePitchPositionDragStart(e, pos.id, player.id)}
                      className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-200 shadow-xl relative ${
                        isSelected
                          ? 'border-blue-400 bg-blue-950 scale-110 ring-4 ring-blue-500/30'
                          : player
                          ? 'border-blue-500 bg-slate-900 hover:scale-105'
                          : 'border-emerald-400/80 bg-emerald-950/80 hover:bg-emerald-900 hover:border-emerald-300'
                      }`}
                    >
                      {player ? (
                        <>
                          {player.fotoUrl ? (
                            <img src={player.fotoUrl} alt={player.nombre} referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold font-mono text-blue-400 uppercase">
                              {player.nombre.slice(0, 2)}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignPlayer(pos.id, null);
                            }}
                            className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-bold"
                            title="Quitar jugador"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] font-extrabold text-emerald-100 font-mono tracking-tight">
                            {pos.label}
                          </span>
                        </>
                      )}
                    </div>

                    {player ? (
                      <div className="mt-1 flex flex-col items-center text-center">
                        <span className="text-[9px] font-bold text-white bg-slate-950/90 px-1.5 py-0.5 rounded border border-slate-800 shadow truncate max-w-[90px]">
                          {player.nombre.split(' ')[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[8px] text-emerald-300/60 font-mono uppercase mt-0.5">Vacío</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes / Observations Box */}
          <div className="pt-2 border-t border-slate-800 mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-400" />
                <span>Notas Tácticas y Observaciones de Mercado</span>
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Escribe aquí anotaciones específicas sobre prioridades de fichaje, acuerdos o variaciones tácticas para este campograma..."
              className="w-full h-14 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none custom-scrollbar"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
