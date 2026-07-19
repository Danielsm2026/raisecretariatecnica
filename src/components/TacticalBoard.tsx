import React, { useState, useEffect } from 'react';
import { ScoutedPlayer } from '../types';
import { Shield, Trash2, SwitchCamera, UserPlus, Users, Search, HelpCircle, UserCheck, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface TacticalBoardProps {
  players: ScoutedPlayer[];
  showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onUpdatePlayer?: (player: ScoutedPlayer) => void;
}

interface AssignedPositions {
  [positionId: string]: string | null; // maps positionId -> playerId
}

interface PitchPosition {
  id: string;
  label: string;
  category: 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero';
  x: number; // percentage width
  y: number; // percentage height
  allowedRoles: string[];
}

export default function TacticalBoard({ players, showNotification, onUpdatePlayer }: TacticalBoardProps) {
  const [formation, setFormation] = useState<'4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-4-1' | '4-1-4-1'>('4-4-2');
  const [assignments, setAssignments] = useState<AssignedPositions>({});
  const [monthlyView, setMonthlyView] = useState<boolean>(false);
  const [monthlyAssignments, setMonthlyAssignments] = useState<{ [positionId: string]: string[] }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [draggingSourcePos, setDraggingSourcePos] = useState<string | null>(null);
  const [valuationFilter, setValuationFilter] = useState<string>('All');
  const [positionFilter, setPositionFilter] = useState<string>('All');

  // Get all unique positions from the players list dynamically
  const uniquePositions = Array.from(
    new Set(players.map(p => p.posicion).filter(Boolean))
  ).sort();

  // Position definitions for 4-4-2
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

  // Position definitions for 4-3-3
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

  // Position definitions for 4-2-3-1
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

  // Position definitions for 3-5-2
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

  // Position definitions for 5-4-1
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

  // Position definitions for 4-1-4-1
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
    formation === '4-4-2' ? positions442 :
    formation === '4-3-3' ? positions433 :
    formation === '4-2-3-1' ? positions4231 :
    formation === '3-5-2' ? positions352 :
    formation === '5-4-1' ? positions541 :
    positions4141;

  // Load assignments from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`tactical_lineup_${formation}`);
    if (saved) {
      try {
        setAssignments(JSON.parse(saved));
      } catch (err) {
        setAssignments({});
      }
    } else {
      setAssignments({});
    }
  }, [formation]);

  // Load monthly assignments from localStorage
  useEffect(() => {
    const savedMonthly = localStorage.getItem(`tactical_monthly_${formation}`);
    if (savedMonthly) {
      try {
        setMonthlyAssignments(JSON.parse(savedMonthly));
      } catch (err) {
        setMonthlyAssignments({});
      }
    } else {
      setMonthlyAssignments({});
    }
  }, [formation]);

  // Save assignments
  const updateAssignments = (newAssignments: AssignedPositions) => {
    setAssignments(newAssignments);
    localStorage.setItem(`tactical_lineup_${formation}`, JSON.stringify(newAssignments));
  };

  // Save monthly assignments
  const updateMonthlyAssignments = (newAssignments: { [positionId: string]: string[] }) => {
    setMonthlyAssignments(newAssignments);
    localStorage.setItem(`tactical_monthly_${formation}`, JSON.stringify(newAssignments));
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
      // Unassign
      const updated = { ...assignments };
      delete updated[slotId];
      updateAssignments(updated);
      showNotification('Jugador removido de la posición', 'info');
      return;
    }

    // Check if player is already assigned somewhere on this pitch, if so, move them
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

  // Clear entire pitch using state-based confirmation instead of modal windows
  const handleClearPitch = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      // Auto cancel after 4 seconds of inactivity
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

  // Export tactical board and lineup detail to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      if (monthlyView) {
        // --- MONTHLY VIEW SPECIFIC PDF REPORT ---
        doc.setFillColor(37, 99, 235); // Blue-600
        doc.rect(15, 15, 3, 16, 'F');

        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('CAMPOGRAMA TÁCTICO MENSUAL DE CARTERA', 22, 21);

        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`PLANIFICACIÓN MENSUAL DE DEMANDA POSICIONAL: ${formation.toUpperCase()}`, 22, 27);

        const localTimeStr = new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`Fecha: ${localTimeStr}`, 195, 21, { align: 'right' });
        doc.text(`Software: Pizarra Táctica Profesional v1.5 API`, 195, 26, { align: 'right' });

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.line(15, 36, 195, 36);

        // Grid coordinates for A4 (Dimensions 210 x 297 mm)
        // Let's render 11 positions as cards in A4 layout!
        let baseStartX = 15;
        let baseStartY = 43;
        
        currentPositions.forEach((pos, index) => {
          const colIndex = index % 2;
          const rowIndex = Math.floor(index / 2);
          const x = baseStartX + colIndex * 93;
          const y = baseStartY + rowIndex * 38;

          // Box container
          doc.setFillColor(248, 250, 252); // slate-50
          doc.setDrawColor(203, 213, 225); // slate-300
          doc.setLineWidth(0.25);
          doc.rect(x, y, 88, 34, 'FD');

          // Header strip inside box
          doc.setFillColor(30, 41, 59); // slate-800
          doc.rect(x, y, 88, 6.5, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(`${pos.label} — ${pos.category.toUpperCase()}`, x + 3.5, y + 4.5);

          // Render player list
          const assignedIds = monthlyAssignments[pos.id] || [];
          let lineY = y + 12;

          if (assignedIds.length === 0) {
            doc.setTextColor(148, 163, 184); // slate-400
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.text('Sin jugadores asignados (Vacante)', x + 5, y + 18);
          } else {
            assignedIds.forEach((pid, pIdx) => {
              const p = players.find(player => player.id === pid);
              if (p) {
                doc.setTextColor(15, 23, 42); // slate-900
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

        // Main Footer Box and stats
        doc.setTextColor(148, 163, 184);
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.text('Página 1 de 1 | Campograma táctico de cartera posicional | Generado automáticamente con AI Studio.', 15, 282);

        doc.save(`Campograma_Mensual_Tactico_${formation.replace('-', '_')}.pdf`);
        showNotification('¡Campograma mensual de cartera exportado exitosamente en PDF!', 'success');
        return;
      }
      
      // Left Accent bar on Header
      doc.setFillColor(37, 99, 235); // Blue-600
      doc.rect(15, 15, 3, 16, 'F');

      // Title
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('INFORME TÁCTICO DE ALINEACIÓN', 22, 21);

      // Subtitle
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`ESQUEMA TÁCTICO: ${formation.toUpperCase()} STANDARD | REGISTRO DIGITAL DE SCOUTING`, 22, 27);

      // Metadata card on top-right
      const localTimeStr = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Fecha: ${localTimeStr}`, 195, 21, { align: 'right' });
      doc.text(`Software: Pizarra Táctica v1.0 AI Studio`, 195, 26, { align: 'right' });

      // Solid dividing line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 36, 195, 36);

      // Pitch dimensions and coordinates
      const PitchX = 20;
      const PitchY = 44;
      const PitchWidth = 170;
      const PitchHeight = 220;

      // Draw Background Field
      doc.setFillColor(6, 78, 59); // deep emerald base
      doc.rect(PitchX, PitchY, PitchWidth, PitchHeight, 'F');

      // Draw horizontal grass stripes for styling
      doc.setFillColor(5, 46, 22); // darker green stripes
      const numStripes = 6;
      const stripeHeight = PitchHeight / numStripes;
      for (let i = 0; i < numStripes; i += 2) {
        doc.rect(PitchX, PitchY + (i * stripeHeight), PitchWidth, stripeHeight, 'F');
      }

      // Draw Field Markings in clean white lines
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      
      // Outer border
      doc.rect(PitchX, PitchY, PitchWidth, PitchHeight, 'S');

      // Half-field line
      doc.line(PitchX, PitchY + (PitchHeight / 2), PitchX + PitchWidth, PitchY + (PitchHeight / 2));
      
      // Center circle
      doc.circle(PitchX + (PitchWidth / 2), PitchY + (PitchHeight / 2), 18, 'S');
      
      // Center spot
      doc.setFillColor(255, 255, 255);
      doc.circle(PitchX + (PitchWidth / 2), PitchY + (PitchHeight / 2), 1, 'FD');

      // Top Goal Area
      doc.rect(PitchX + (PitchWidth * 0.35), PitchY, PitchWidth * 0.30, PitchHeight * 0.12, 'S');
      doc.rect(PitchX + (PitchWidth * 0.42), PitchY, PitchWidth * 0.16, PitchHeight * 0.04, 'S');
      doc.circle(PitchX + (PitchWidth / 2), PitchY + (PitchHeight * 0.09), 0.6, 'FD');

      // Bottom Goal Area
      doc.rect(PitchX + (PitchWidth * 0.35), PitchY + (PitchHeight * 0.88), PitchWidth * 0.30, PitchHeight * 0.12, 'S');
      doc.rect(PitchX + (PitchWidth * 0.42), PitchY + (PitchHeight * 0.96), PitchWidth * 0.16, PitchHeight * 0.04, 'S');
      doc.circle(PitchX + (PitchWidth / 2), PitchY + (PitchHeight * 0.91), 0.6, 'FD');

      // Loop through all active positions on field and render tactical nodes
      currentPositions.forEach((pos) => {
        const assignedPlayerId = assignments[pos.id];
        const player = assignedPlayerId ? players.find(p => p.id === assignedPlayerId) : null;
        
        // Calculate coordinate in mm
        const nodeX = PitchX + (pos.x / 100) * PitchWidth;
        const nodeY = PitchY + (pos.y / 100) * PitchHeight;

        if (player) {
          // Circle Background (dark navy/slate circle)
          doc.setFillColor(15, 23, 42); // `#0f172a`
          doc.setDrawColor(37, 99, 235); // `#2563eb` - solid blue border
          doc.setLineWidth(0.8);
          doc.circle(nodeX, nodeY, 8, 'FD');

          // Position flag label
          doc.setFillColor(37, 99, 235);
          doc.rect(nodeX + 3.5, nodeY - 8, 8, 3.8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.text(pos.label, nodeX + 7.5, nodeY - 5.2, { align: 'center' });

          // Player initials inside circle
          const initials = player.nombre ? player.nombre.slice(0, 2).toUpperCase() : pos.label;
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(initials, nodeX, nodeY + 1.2, { align: 'center' });

          // Draw name callout background
          const displayName = player.nombre.split(' ').slice(0, 2).join(' ');
          doc.setFillColor(30, 41, 59); // `#1e293b`
          doc.setDrawColor(71, 85, 105); // `#475569`
          doc.setLineWidth(0.2);
          doc.rect(nodeX - 15, nodeY + 11, 30, 5, 'FD');
          
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.text(displayName, nodeX, nodeY + 14.5, { align: 'center' });

          // Specific recommendation label under the box
          if (player.recomendacion) {
            let recClr = [148, 163, 184]; // gray
            let labelText = player.recomendacion.toUpperCase();
            if (labelText === 'FIRMAR' || labelText === 'CONTRATAR') recClr = [16, 185, 129]; // emerald green
            else if (labelText === 'SEGUIR' || labelText === 'SEGUIMIENTO') recClr = [59, 130, 246]; // blue
            else if (labelText === 'INTERESANTE' || labelText === 'EVALUAR') recClr = [245, 158, 11]; // amber
            else if (labelText === 'DESCARTAR') recClr = [239, 68, 68]; // red
            
            doc.setFillColor(15, 23, 42); // background behind label
            doc.rect(nodeX - 11, nodeY + 16.5, 22, 3.5, 'F');

            doc.setTextColor(recClr[0], recClr[1], recClr[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.text(labelText, nodeX, nodeY + 19.2, { align: 'center' });
          }
        } else {
          // --- RENDER UNASSIGNED VACANT FLAG ---
          doc.setFillColor(5, 46, 22); // deep green
          doc.setDrawColor(16, 185, 129); // emerald green
          doc.setLineWidth(0.4);
          doc.circle(nodeX, nodeY, 6.5, 'FD');

          doc.setTextColor(167, 243, 208); // emerald-200
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(pos.label, nodeX, nodeY + 1, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(4.5);
          doc.setTextColor(110, 231, 183); // emerald-300
          doc.text('VACÍO', nodeX, nodeY + 4, { align: 'center' });
        }
      });

      // Page footer reference
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text('Página 1 de 2 | Informe de scouting generado digitalmente. Confidencial y de uso táctico.', 15, 280);

      // --- PAGE 2: DETAILED TABLE OF PLAYERS ---
      doc.addPage();

      // Left Accent bar on Header (Page 2)
      doc.setFillColor(37, 99, 235); // Blue-600
      doc.rect(15, 15, 3, 16, 'F');

      // Title
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('REGISTRO DETALLADO DEL ONCE TÁCTICO', 22, 21);

      // Subtitle
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`ANÁLISIS DE RENDIMIENTO, VALORACIONES Y DATOS CONTRACTUALES`, 22, 27);

      // Solid dividing line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 34, 195, 34);

      // Render the tabular records of the tactical layout
      let curY = 46;

      // Table Header Row Background
      doc.setFillColor(15, 23, 42); // slate-900 background
      doc.rect(15, curY, 180, 8, 'F');

      // Headers text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('POS', 18, curY + 5.5);
      doc.text('FUTBOLISTA / NOMBRE', 35, curY + 5.5);
      doc.text('EQUIPO ORIGEN', 85, curY + 5.5);
      doc.text('NAC.', 130, curY + 5.5);
      doc.text('PIE', 145, curY + 5.5);
      doc.text('VALORACIÓN / DECISIÓN', 160, curY + 5.5);

      curY += 8;

      // Draw rows
      currentPositions.forEach((pos) => {
        const assignedPlayerId = assignments[pos.id];
        const player = assignedPlayerId ? players.find(p => p.id === assignedPlayerId) : null;

        // Draw row backgrounds
        doc.setFillColor(player ? 250 : 241, player ? 250 : 245, player ? 250 : 249);
        doc.rect(15, curY, 180, 10, 'F');

        // Draw thin bottom grey line
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.line(15, curY + 10, 195, curY + 10);

        // Position cell
        doc.setTextColor(37, 99, 235); // blue
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(pos.label, 18, curY + 6.5);

        if (player) {
          // Assigned player fields
          doc.setTextColor(15, 23, 42); // dark slate
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(player.nombre, 35, curY + 6.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105); // slate-600
          doc.text(player.equipo || 'Sin Equipo', 85, curY + 6.5);
          doc.text(player.anoNacimiento ? String(player.anoNacimiento) : '-', 130, curY + 6.5);
          doc.text(player.lateralidad ? player.lateralidad.slice(0, 3).toUpperCase() : '-', 145, curY + 6.5);

          // Valuation recommendation status with text styling
          if (player.recomendacion) {
            let labelText = player.recomendacion.toUpperCase();
            if (labelText === 'FIRMAR' || labelText === 'CONTRATAR') {
              doc.setTextColor(16, 185, 129); // Green
              doc.setFont('helvetica', 'bold');
              doc.text('★ FIRMAR', 160, curY + 6.5);
            } 
            else if (labelText === 'SEGUIR' || labelText === 'SEGUIMIENTO') {
              doc.setTextColor(59, 130, 246); // Blue
              doc.setFont('helvetica', 'bold');
              doc.text('★ SEGUIR', 160, curY + 6.5);
            }
            else if (labelText === 'INTERESANTE' || labelText === 'EVALUAR') {
              doc.setTextColor(245, 158, 11); // Amber
              doc.setFont('helvetica', 'bold');
              doc.text('★ INTERESANTE', 160, curY + 6.5);
            }
            else if (labelText === 'DESCARTAR') {
              doc.setTextColor(239, 68, 68); // Red
              doc.setFont('helvetica', 'bold');
              doc.text('✕ DESCARTAR', 160, curY + 6.5);
            } else {
              doc.setTextColor(71, 85, 105);
              doc.text(player.recomendacion, 160, curY + 6.5);
            }
          } else {
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text('Sin Valorar', 160, curY + 6.5);
          }
        } else {
          // Empty position fields
          doc.setTextColor(148, 163, 184); // muted slate
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.text('Posición vacante', 35, curY + 6.5);
          doc.text('-', 85, curY + 6.5);
          doc.text('-', 130, curY + 6.5);
          doc.text('-', 145, curY + 6.5);
          doc.text('-', 160, curY + 6.5);
        }

        curY += 10;
      });

      // Visual Summary Box of Placed VS Unassigned positions on page 2
      const assignedCount = Object.keys(assignments).length;
      curY += 12;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, curY, 180, 24, 'F');
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.rect(15, curY, 180, 24, 'S');

      // Title in box
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('MÉTRICAS DEL DEPARTAMENTO TÁCTICO DE SCOUTING', 20, curY + 6);

      // Quantities
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Jugadores alineados en pizarra: ${assignedCount} / 11`, 20, curY + 14);
      doc.text(`Fichas vacantes / por evaluar: ${11 - assignedCount} / 11`, 110, curY + 14);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Nota: Recuerda mantener el seguimiento periódico sobre los futbolistas con estatus de recomendación SEGUIR.', 20, curY + 20);

      // Page 2 footer reference
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text('Página 2 de 2 | Generado con Pizarra Táctica Profesional - AI Studio.', 15, 280);

      // Save document!
      doc.save(`Informe_Tactico_Alineacion_${formation.replace('-', '_')}.pdf`);
      showNotification('¡Informe táctico exportado exitosamente en PDF!', 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      showNotification('Error al exportar en PDF', 'error');
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData('text/plain', playerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePitchDragStart = (e: React.DragEvent, playerId: string, slotId: string) => {
    e.dataTransfer.setData('text/plain', playerId);
    e.dataTransfer.setData('source-pos', slotId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingSourcePos(slotId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingSourcePos(null);
    const sourcePos = e.dataTransfer.getData('source-pos');
    if (sourcePos) {
      handleAssignPlayer(sourcePos, null);
    }
  };

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDraggingSourcePos(null);
    const playerId = e.dataTransfer.getData('text/plain');
    const player = players.find(p => p.id === playerId);
    if (player) {
      handleAssignPlayer(slotId, player);
    }
  };

  // Filter players for list representation
  const filteredPlayers = players.filter(p => {
    // Search query match
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || 
      p.nombre.toLowerCase().includes(query) ||
      p.equipo.toLowerCase().includes(query) ||
      p.posicion.toLowerCase().includes(query);

    // Valuation filter match
    const recValue = p.recomendacion ? p.recomendacion.trim().toUpperCase() : '';
    let normRec = '';
    if (recValue === 'FIRMAR' || recValue === 'CONTRATAR') normRec = 'FIRMAR';
    else if (recValue === 'SEGUIR' || recValue === 'SEGUIMIENTO') normRec = 'SEGUIR';
    else if (recValue === 'INTERESANTE' || recValue === 'EVALUAR') normRec = 'INTERESANTE';
    else if (recValue === 'DESCARTAR') normRec = 'DESCARTAR';

    const matchesValuation = valuationFilter === 'All' ||
      (valuationFilter === 'SIN_VALORAR' && !normRec) ||
      (valuationFilter !== 'SIN_VALORAR' && normRec === valuationFilter);

    // Position filter match
    const matchesPosition = positionFilter === 'All' || p.posicion === positionFilter;

    return matchesQuery && matchesValuation && matchesPosition;
  });

  // Get recommendations styling
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

  return (
    <div id="tactical-board-section" className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-full">
      {/* LEFT SIDEBAR: Available Players for Dragging or clicking */}
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
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                Valoración
              </span>
              <select
                value={valuationFilter}
                onChange={(e) => setValuationFilter(e.target.value)}
                className="w-full text-[10px] px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-700 transition-colors"
              >
                <option value="All">Todas</option>
                <option value="SIN_VALORAR">Sin valorar</option>
                <option value="SEGUIR">Seguir</option>
                <option value="INTERESANTE">Interesante</option>
                <option value="FIRMAR">Firmar</option>
                <option value="DESCARTAR">Descartar</option>
              </select>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                Posición
              </span>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full text-[10px] px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-700 transition-colors"
              >
                <option value="All">Todas</option>
                {uniquePositions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DRAGGABLE LIST / REMOVE DROPZONE */}
        {draggingSourcePos ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleRemoveDrop}
            className="flex-1 border-2 border-dashed border-red-500/40 bg-red-950/20 rounded-lg flex flex-col items-center justify-center p-6 text-center animate-pulse gap-3.5 z-10"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
              <Trash2 className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-extrabold font-mono text-red-200 uppercase tracking-widest leading-none">
                SUELTE AQUÍ PARA QUITAR
              </p>
              <p className="text-[10px] text-slate-400 mt-2 font-sans max-w-[200px] mx-auto leading-normal">
                El jugador será desasignado del campo y volverá a la cartera.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredPlayers.map((player) => {
              // Find if already placed based on view mode
              const isAssigned = monthlyView
                ? (selectedSlot ? (monthlyAssignments[selectedSlot] || []).includes(player.id) : false)
                : Object.values(assignments).includes(player.id);
              
              const isAssignedAnywhereInMonthly = monthlyView
                ? (Object.values(monthlyAssignments) as string[][]).some(list => list.includes(player.id))
                : false;

              return (
                <div
                  key={player.id}
                  draggable={!isAssigned}
                  onDragStart={(e) => handleDragStart(e, player.id)}
                  onClick={() => {
                    if (monthlyView) {
                      if (selectedSlot) {
                        appendPlayerToMonthly(selectedSlot, player);
                      } else {
                        showNotification('Pulsa sobre una posición blanca del campo para seleccionarla, luego pulsa en el jugador para añadirlo', 'info');
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
                        // find slot and remove
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
                        <span className="text-[8px] font-mono font-extrabold px-1 py-0.2 bg-slate-900 border border-slate-800 text-blue-400 rounded-xs uppercase">
                          {player.lateralidad.slice(0, 3)}
                        </span>
                        {player.anoNacimiento && (
                          <span className="text-[8px] font-mono text-slate-400 bg-slate-900 px-1 py-0.2 rounded-xs border border-slate-800">
                            {player.anoNacimiento}
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
                        <UserCheck className="w-2.5 h-2.5" /> {monthlyView ? "EN PUESTO" : "COLOCADO"}
                      </span>
                    ) : isAssignedAnywhereInMonthly ? (
                      <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                        ALINEADO
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-300">
                        :::
                      </span>
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
        )}
        
        <div className="pt-3 border-t border-slate-850 mt-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>PIZARRA VIRTUAL DE ALTO RENDIMIENTO</span>
          <span>11 / POSICIÓN</span>
        </div>
      </div>

      {/* RIGHT WORKSPACE: The Real Soccer Pitch (Campograma) */}
      <div className="lg:col-span-8 bg-slate-900 border border-slate-850 rounded-lg p-5 flex flex-col h-[880px] min-h-[800px] shadow-lg justify-between relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-emerald-650/4 rounded-full blur-3xl pointer-events-none z-0"></div>

        {/* Board Header Actions */}
        <div className="flex flex-col xl:flex-row items-center justify-between border-b border-slate-800 pb-3 gap-2.5 z-10">
          <div>
            <h2 className="text-sm font-black font-display text-white tracking-widest uppercase flex items-center gap-2">
              <span className="text-blue-500">⚙️</span> {monthlyView ? "CAMPOGRAMA MENSUAL POSICIONAL" : "CAMPOGRAMA COMPLETO DE ALINEACIÓN"}
            </h2>
            <p className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">
              {monthlyView ? "PLANIFICACIÓN DE CARTERA: HASTA 5 NOMBRE POR CADA PUESTO" : "Configura, simula o define el esquema táctico referencial"}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto">
            {/* Toggle Monthly View Button */}
            <button
              type="button"
              onClick={() => {
                setMonthlyView(!monthlyView);
                setSelectedSlot(null);
                showNotification(
                  !monthlyView 
                    ? "Activado Campograma Mensual. Ahora puedes añadir hasta 5 jugadores por posición elegida." 
                    : "Activado Campograma de Alineación 11 standard.", 
                  "info"
                );
              }}
              className={`px-3 py-1.5 border text-[10px] font-mono font-black rounded-lg flex items-center space-x-1.5 transition-all outline-none ${
                monthlyView 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 font-bold' 
                  : 'bg-slate-950 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-blue-400 font-extrabold'
              }`}
              title="Cambiar al Campograma Mensual para añadir 5 nombres por posición"
            >
              <span>📅 CAMPOGRAMA MENSUAL</span>
            </button>

            {/* System select dropdown */}
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-850 flex items-center text-xs font-mono">
              <span className="text-slate-500 px-1.5 font-bold uppercase text-[8.5px]">SISTEMA:</span>
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 text-blue-400 font-extrabold uppercase py-0.5 px-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 tracking-wider cursor-pointer text-[10px]"
              >
                <option value="4-4-2">4-4-2 STANDARD</option>
                <option value="4-3-3">4-3-3 ATTACK</option>
                <option value="4-2-3-1">4-2-3-1 MODERN</option>
                <option value="3-5-2">3-5-2 FLANK DENSITY</option>
                <option value="5-4-1">5-4-1 SOLID BLOCK</option>
                <option value="4-1-4-1">4-1-4-1 POSSESSION</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-blue-400 hover:text-blue-300 text-[11px] font-mono font-black rounded-lg flex items-center space-x-1.5 transition-all outline-none"
              title="Exportar campograma y alineación en PDF"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>EXPORTAR PDF</span>
            </button>

            <button
              type="button"
              onClick={handleClearPitch}
              className={`px-3 py-2 border text-[11px] font-mono font-black rounded-lg flex items-center space-x-1.5 transition-all outline-none ${
                showClearConfirm 
                  ? 'bg-red-950/90 hover:bg-red-900 text-red-200 border-red-500 animate-pulse'
                  : 'bg-slate-950 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-red-400 hover:text-red-300'
              }`}
              title={showClearConfirm ? "Haz clic de nuevo para vaciar todo el campograma" : "Borrar todos los jugadores en el campo"}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{showClearConfirm ? '¿CONFIRMAR?' : 'LIMPIAR'}</span>
            </button>
          </div>
        </div>

        {/* FIELD CANVAS (CAMPOGRAMA VISUAL) */}
        <div className="flex-1 relative bg-gradient-to-b from-emerald-800 to-emerald-950 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.035)_50%,transparent_50%)] bg-[size:100%_16.6%] border border-emerald-700/60 rounded-lg overflow-hidden m-1 mt-4 shadow-inner z-10 flex items-center justify-center">
          {/* Tactical Soccer Pitch Markings (SVG rendering) */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.55] pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Outer border & lines */}
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            
            {/* Half field line */}
            <line x1="2" y1="50" x2="98" y2="50" stroke="#ffffff" strokeWidth="0.8" />
            
            {/* Center circle */}
            <circle cx="50" cy="50" r="12" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            {/* Center spot */}
            <circle cx="50" cy="50" r="1.2" fill="#ffffff" />

            {/* Top goal box area */}
            <rect x="35" y="2" width="30" height="15" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            <rect x="42" y="2" width="16" height="5" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="50" cy="11" r="0.8" fill="#ffffff" />
            <path d="M 40,17 A 10,10 0 0,0 60,17" fill="none" stroke="#ffffff" strokeWidth="0.8" />

            {/* Bottom goal box area */}
            <rect x="35" y="83" width="30" height="15" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            <rect x="42" y="93" width="16" height="5" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="50" cy="89" r="0.8" fill="#ffffff" />
            <path d="M 40,83 A 10,10 0 0,1 60,83" fill="none" stroke="#ffffff" strokeWidth="0.8" />

            {/* Corner spots */}
            <path d="M 2,5 A 3,3 0 0,0 5,2" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 98,5 A 3,3 0 0,1 95,2" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 2,95 A 3,3 0 0,1 5,98" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 98,95 A 3,3 0 0,0 95,98" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          </svg>

          {/* Render Position Nodes */}
          {currentPositions.map((pos) => {
            const assignedPlayerId = assignments[pos.id];
            const player = assignedPlayerId ? players.find(p => p.id === assignedPlayerId) : null;
            const isSelected = selectedSlot === pos.id;

            if (monthlyView) {
              const assignedIds = monthlyAssignments[pos.id] || [];
              return (
                <div
                  key={`monthly-${pos.id}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, pos.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSlot(isSelected ? null : pos.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="z-20 transition-all"
                >
                  {/* High Contrast White Card exactly like soccer campogram screenshot */}
                  <div 
                    className={`w-[145px] sm:w-[155px] md:w-[165px] bg-white rounded-lg shadow-2xl border flex flex-col p-1.5 text-left relative transition-all ${
                      isSelected 
                        ? 'border-blue-600 ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900 scale-105 z-30' 
                        : 'border-slate-200/90 hover:scale-[1.02] hover:shadow-2xl'
                    }`}
                  >
                    {/* Header: Position Tag */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1 text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest px-1 select-none">
                      <span className="text-slate-800">{pos.label}</span>
                      <span className="text-blue-600 bg-blue-50 px-1 py-0.2 rounded-xs">
                        ({pos.category.slice(0, 3).toUpperCase()})
                      </span>
                    </div>

                    {/* Players Stack */}
                    <div className="space-y-1">
                      {assignedIds.map((pid, idx) => {
                        const p = players.find(player => player.id === pid);
                        if (!p) return null;
                        
                        return (
                          <div 
                            key={p.id} 
                            className="group/item flex items-center justify-between py-1 px-1 border-b border-slate-50 last:border-b-0 text-left relative"
                          >
                            <div className="flex items-center min-w-0 flex-1">
                              {p.fotoUrl ? (
                                <img 
                                  src={p.fotoUrl} 
                                  alt={p.nombre} 
                                  referrerPolicy="no-referrer" 
                                  className="w-5.5 h-5.5 rounded-full object-cover border border-slate-100 shrink-0" 
                                />
                              ) : (
                                <div className="w-5.5 h-5.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[8px] flex items-center justify-center shrink-0 uppercase">
                                  {p.nombre.slice(0, 2)}
                                </div>
                              )}
                              
                              <div className="ml-1.5 min-w-0 flex-1 leading-tight">
                                <p className="text-[9px] font-bold text-slate-900 truncate flex items-center">
                                  <span className="text-slate-400 text-[8px] mr-1 font-mono">#{idx+1}</span>
                                  {p.nombre.split(' ').slice(0, 2).join(' ')}
                                  {p.anoNacimiento && (
                                    <span className="text-slate-400 font-normal text-[7.5px] ml-0.5">
                                      '{String(p.anoNacimiento).slice(-2)}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[7.5px] text-slate-500 font-mono truncate uppercase font-semibold">
                                  {p.equipo || 'OJEADO'}
                                  {p.recomendacion && ` • ${p.recomendacion.slice(0,6)}`}
                                </p>
                              </div>
                            </div>

                            {/* Small deletion cross */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePlayerFromMonthly(pos.id, p.id);
                              }}
                              className="w-4 h-4 rounded-full text-slate-300 hover:text-red-650 hover:bg-slate-100 flex items-center justify-center text-[8px] transition-all shrink-0 ml-0.5"
                              title="Quitar jugador de la lista"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}

                      {assignedIds.length === 0 && (
                        <div className="py-3 px-1 text-center text-slate-400 text-[8.5px] font-extrabold font-mono flex flex-col items-center justify-center gap-1 border border-dashed border-slate-200 rounded bg-slate-50 select-none">
                          <span className="text-blue-500 text-[9px] font-black">+ AÑADIR</span>
                          <span className="text-[7px] text-slate-400 font-normal">Arrastra o pulsa</span>
                        </div>
                      )}
                    </div>

                    {/* Small slot capacity counter */}
                    {assignedIds.length > 0 && (
                      <div className="mt-1 text-right text-[7px] font-mono text-slate-400 px-0.5 select-none uppercase">
                        {assignedIds.length} / 5 jugadores
                      </div>
                    )}
                  </div>

                  {/* QUICK CHOOSE POPDOWN SEARCH POPUP FOR MONTHLY VIEW */}
                  {isSelected && (
                    <div 
                      className="absolute bottom-[105%] left-1/2 -translate-x-1/2 w-48 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl p-1.5 z-40 animate-fade-in block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-1 border-b border-slate-900 flex justify-between items-center bg-slate-900/30 rounded">
                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase">
                          Búsqueda rápida {pos.label}
                        </span>
                        <button
                          onClick={() => setSelectedSlot(null)}
                          className="text-[8px] text-red-400 hover:text-white font-extrabold shrink-0"
                        >
                          CERRAR
                        </button>
                      </div>

                      <div className="max-h-32 overflow-y-auto mt-1 space-y-1 custom-scrollbar text-left scroll-smooth">
                        {players
                          .filter(p => !assignedIds.includes(p.id))
                          .map(p => {
                            const isSmartMatch = pos.allowedRoles.includes(p.posicion);
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  appendPlayerToMonthly(pos.id, p);
                                  setSelectedSlot(null);
                                }}
                                className={`w-full p-1 rounded hover:bg-slate-900 text-[10px] flex items-center justify-between group transition-all text-left ${
                                  isSmartMatch ? 'border-l-2 border-emerald-500 pl-1.5' : 'pl-1 opacity-75'
                                }`}
                              >
                                <span className="font-bold text-slate-200 truncate group-hover:text-blue-400">
                                  {p.nombre}
                                </span>
                                <span className="text-[7.5px] text-slate-400 font-mono shrink-0 italic">
                                  {p.posicion.slice(0, 10)}
                                </span>
                              </button>
                            );
                          })}

                        {players.filter(p => !assignedIds.includes(p.id)).length === 0 && (
                          <p className="text-[8px] text-slate-500 p-2 italic text-center">
                            No quedan futbolistas
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={pos.id}
                draggable={!!player}
                onDragStart={(e) => {
                  if (player) {
                    handlePitchDragStart(e, player.id, pos.id);
                  }
                }}
                onDragEnd={() => setDraggingSourcePos(null)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, pos.id)}
                onClick={() => setSelectedSlot(isSelected ? null : pos.id)}
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`group cursor-pointer select-none transition-all flex flex-col items-center justify-center z-20 ${
                  player ? 'w-[72px] active:scale-95 active:cursor-grabbing' : 'w-[56px]'
                }`}
              >
                {/* Visual Circle Target */}
                <div
                  className={`w-12 h-12 rounded-full flex flex-col items-center justify-center relative transition-all shadow-lg ${
                    player 
                      ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-blue-500/80 hover:scale-105'
                      : isSelected
                      ? 'bg-emerald-900/60 border-2 border-dashed border-white animate-pulse scale-105 shadow-white/10'
                      : 'bg-emerald-950/60 border-2 border-dashed border-emerald-600/40 hover:border-white/65 hover:bg-emerald-950/90 hover:scale-105'
                  }`}
                >
                  {player ? (
                    <>
                      {/* Player Circular photo or initials */}
                      <span className="hidden">.</span>
                      {player.fotoUrl ? (
                        <img 
                          src={player.fotoUrl} 
                          alt={player.nombre} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full rounded-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center font-black font-display text-white text-xs uppercase text-center">
                          {player.nombre.slice(0, 2)}
                        </div>
                      )}
                      
                      {/* Positional badge */}
                      <span className="absolute -top-1.5 -right-1 px-1 bg-blue-600 text-white text-[8px] font-mono rounded font-black border border-slate-900">
                        {pos.label}
                      </span>

                      {/* Small Crest Icon overlay */}
                      {player.escudoUrl && (
                        <img
                          src={player.escudoUrl}
                          alt="escudo"
                          referrerPolicy="no-referrer"
                          className="w-4.5 h-4.5 rounded-full object-contain absolute -bottom-1 -left-1 bg-slate-950 p-[1px] border border-slate-850"
                        />
                      )}

                      {/* One click removal button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignPlayer(pos.id, null);
                        }}
                        className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-red-650 hover:bg-red-500 text-white hover:scale-110 flex items-center justify-center font-extrabold text-[8px] border border-slate-900 shadow transition-all duration-150 shrink-0"
                        title="Quitar jugador"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Unassigned design */}
                      <span className="text-[11px] font-extrabold text-emerald-100 font-mono tracking-tight select-none">
                        {pos.label}
                      </span>
                      <span className="text-[8px] text-emerald-350/85 font-mono mt-0.5 block scale-90">
                        Pulsar
                      </span>
                    </>
                  )}
                </div>

                {/* Player Metadata Labels under the target */}
                {player ? (
                  <div className="mt-1 flex flex-col items-center text-center w-full min-w-[75px]">
                    <span 
                      className="text-[9px] font-bold text-slate-100 truncate w-full tracking-tight bg-slate-950/90 px-1 py-0.2 rounded border border-slate-850 shadow-xs block" 
                      title={player.nombre}
                    >
                      {player.nombre.split(' ').slice(0, 2).join(' ')}
                    </span>
                    
                    {/* Specific recommendation / evaluation text indicator */}
                    {player.recomendacion && (
                      <span className={`text-[7px] font-extrabold px-1 rounded-xs mt-0.5 border scale-95 opacity-90 ${getRecTag(player.recomendacion)?.bg || 'bg-slate-950/40 text-slate-400 border-slate-850'}`}>
                        {getRecTag(player.recomendacion)?.text}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[8px] text-emerald-300/60 font-mono tracking-wider mt-0.5 uppercase">
                    Vacío
                  </span>
                )}

                {/* POPULAR QUICK DROPDOWN CHOOSE POPUP */}
                {isSelected && (
                  <div 
                    className="absolute bottom-14 left-1/2 -translate-x-1/2 w-48 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl p-1.5 z-40 animate-fade-in block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-1 border-b border-slate-900 flex justify-between items-center bg-slate-900/30 rounded">
                      <span className="text-[8px] font-mono font-bold text-slate-400 uppercase">
                        Buscar {pos.label} ({pos.category})
                      </span>
                      <button
                        onClick={() => setSelectedSlot(null)}
                        className="text-[8px] text-red-400 hover:text-white font-extrabold shrink-0"
                      >
                        CERRAR
                      </button>
                    </div>

                    <div className="max-h-32 overflow-y-auto mt-1 space-y-1 custom-scrollbar text-left scroll-smooth">
                      {players
                        .filter(p => !Object.values(assignments).includes(p.id))
                        .map(p => {
                          const isSmartMatch = pos.allowedRoles.includes(p.posicion);
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                handleAssignPlayer(pos.id, p);
                                setSelectedSlot(null);
                              }}
                              className={`w-full p-1 rounded hover:bg-slate-900 text-[10px] flex items-center justify-between group transition-all text-left ${
                                isSmartMatch ? 'border-l-2 border-emerald-500 pl-1.5' : 'pl-1 opacity-75'
                              }`}
                            >
                              <span className="font-bold text-slate-200 truncate group-hover:text-blue-400">
                                {p.nombre}
                              </span>
                              <span className="text-[7px] text-slate-400 font-mono shrink-0 italic">
                                {p.posicion.slice(0, 10)}
                              </span>
                            </button>
                          );
                        })}

                      {players.filter(p => !Object.values(assignments).includes(p.id)).length === 0 && (
                        <p className="text-[8px] text-slate-500 p-2 italic text-center">
                          No quedan futbolistas disponibles
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
