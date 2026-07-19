import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScoutedPlayer, Position, Footedness } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Upload, 
  RotateCcw, 
  Plus, 
  SlidersHorizontal, 
  Edit,
  CheckSquare,
  FileSpreadsheet,
  Copy,
  FileCode,
  X,
  FileText,
  Trash2,
  FileDown,
  Activity
} from 'lucide-react';
import { getPlayerEscudoUrl } from '../utils/escudoHelper';
import PlayerSeguimientoModal from './PlayerSeguimientoModal';
import { MatchReport } from '../types';

interface PlayerTableProps {
  players: ScoutedPlayer[];
  selectedPlayerId: string | null;
  onSelectPlayer: (player: ScoutedPlayer) => void;
  onAddPlayer: () => void;
  onImportData: (importString: string) => void;
  onResetData: () => void;
  onEditPlayer?: (player: ScoutedPlayer) => void;
  onEditReport?: (player: ScoutedPlayer) => void;
  onDeletePlayer?: (id: string) => void;
  onUpdatePlayer?: (player: ScoutedPlayer) => void;
  matchReports?: MatchReport[];
  onUpdateMatchReport?: (report: MatchReport) => void;
}

type SortField = 'nombre' | 'equipo' | 'categoria' | 'posicion' | 'anoNacimiento' | 'lateralidad' | 'valorMercado' | 'notas';
type SortOrder = 'asc' | 'desc';

export default function PlayerTable({
  players,
  selectedPlayerId,
  onSelectPlayer,
  onAddPlayer,
  onImportData,
  onResetData,
  onEditPlayer,
  onEditReport,
  onDeletePlayer,
  onUpdatePlayer,
  matchReports = [],
  onUpdateMatchReport = () => {}
}: PlayerTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>('All');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [selectedFootFilter, setSelectedFootFilter] = useState<string>('All');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('All');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Custom delete confirmation state
  const [playerToDelete, setPlayerToDelete] = useState<ScoutedPlayer | null>(null);
  
  // Selection state for PDF export
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);

  // State to control Player Seguimiento Modal
  const [selectedSeguimientoPlayer, setSelectedSeguimientoPlayer] = useState<ScoutedPlayer | null>(null);

  // Helper for recommendation select value
  const getSelectValue = (recomendacion?: string) => {
    if (!recomendacion) return '';
    const rec = recomendacion.toUpperCase();
    if (rec === 'SEGUIR' || rec === 'SEGUIMIENTO') return 'SEGUIR';
    if (rec === 'INTERESANTE' || rec === 'EVALUAR') return 'INTERESANTE';
    if (rec === 'FIRMAR' || rec === 'CONTRATAR') return 'FIRMAR';
    if (rec === 'DESCARTAR') return 'DESCARTAR';
    return rec;
  };

  // Helper for recommendation styling
  const getRecomendacionStyleClass = (val: string) => {
    const normalized = val?.toUpperCase();
    if (normalized === 'SEGUIR' || normalized === 'SEGUIMIENTO') {
      return 'bg-blue-950/40 text-blue-400 border-blue-800/40 hover:border-blue-700';
    }
    if (normalized === 'INTERESANTE' || normalized === 'EVALUAR') {
      return 'bg-amber-950/20 text-amber-400 border-amber-850/40 hover:border-amber-700';
    }
    if (normalized === 'FIRMAR' || normalized === 'CONTRATAR') {
      return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:border-emerald-700';
    }
    if (normalized === 'DESCARTAR') {
      return 'bg-red-950/40 text-red-400 border-red-800/40 hover:border-red-750';
    }
    return 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600';
  };

  // PDF Generation function (Landscape A4 with high-end corporate styling)
  const handleExportPDF = () => {
    const selectedPlayers = players.filter((p) => selectedExportIds.includes(p.id));
    const playersToExport = selectedPlayers.length > 0 ? selectedPlayers : filteredPlayers;
    
    if (playersToExport.length === 0) {
      alert("No hay prospectos deportivos para exportar.");
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Dark luxury modern header bar
    doc.setFillColor(15, 23, 42); // slate-900 (#0f172a)
    doc.rect(0, 0, 297, 26, 'F');

    // Title text inside bar
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("REGISTRO DE SCOUTING TÉCNICO - INFORME OFICIAL", 15, 11);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("SISTEMA DE GESTIÓN DE PROSPECTOS DEPORTIVOS Y ANÁLISIS DE RENDIMIENTO", 15, 17);

    // Metadata on the right of the header bar
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225); // slate-300
    const todayStr = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Fecha: ${todayStr}`, 282, 11, { align: 'right' });
    doc.text(`Registros Exportados: ${playersToExport.length} jugadores`, 282, 17, { align: 'right' });

    // Document Subtitle below bar
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(
      selectedPlayers.length > 0 
        ? "LISTADO DE FUTBOLISTAS PRESELECCIONADOS (SELECCIÓN ACTIVA)" 
        : "LISTADO COMPLETO DE FUTBOLISTAS CONFIGURADOS (FILTRADOS)", 
      15, 36
    );
    
    doc.setDrawColor(226, 232, 240); // slate-200 line
    doc.setLineWidth(0.5);
    doc.line(15, 39, 282, 39);

    // Map table row content
    const tableData = playersToExport.map((p, index) => {
      const edad = new Date().getFullYear() - p.anoNacimiento;
      const ratingStars = '★'.repeat(p.calificacion) + '☆'.repeat(5 - p.calificacion);
      const valorStr = p.valorMercado 
        ? p.valorMercado >= 1000000 
          ? `${(p.valorMercado / 1000000).toFixed(1)}M €` 
          : `${(p.valorMercado / 1000).toFixed(0)}K €`
        : 'N/D';

      return [
        index + 1,
        p.nombre.toUpperCase(),
        p.equipo || 'Agente Libre',
        p.posicion,
        `${p.anoNacimiento} (${edad} años)`,
        p.lateralidad,
        p.elo !== undefined ? `${p.elo}` : 'N/D',
        `${p.atributos?.fisico ?? 0}/10`,
        `${p.atributos?.tecnica ?? 0}/10`,
        `${p.atributos?.tactica ?? 0}/10`,
        `${p.atributos?.mental ?? 0}/10`,
        ratingStars,
        valorStr
      ];
    });

    const tableHeaders = [[
      '#',
      'Nombre de Jugador',
      'Club Actual',
      'Posición',
      'Año (Edad)',
      'Pie',
      'ELO',
      'FÍS',
      'TÉC',
      'TÁC',
      'MEN',
      'Calificación',
      'Valor de Mercado'
    ]];

    autoTable(doc, {
      startY: 43,
      head: tableHeaders,
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        font: 'helvetica',
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { fontStyle: 'bold', cellWidth: 40 },
        2: { cellWidth: 32 },
        3: { cellWidth: 35 },
        4: { halign: 'center', cellWidth: 23 },
        5: { halign: 'center', cellWidth: 22 },
        6: { halign: 'center', cellWidth: 12 },
        7: { halign: 'center', cellWidth: 11 },
        8: { halign: 'center', cellWidth: 11 },
        9: { halign: 'center', cellWidth: 11 },
        10: { halign: 'center', cellWidth: 11 },
        11: { halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6], cellWidth: 22 }, // Amber color
        12: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74], cellWidth: 29 } // Green color
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate 50 tint
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        
        // Footer labels
        doc.text("CONFIDENCIAL - INFORME OFICIAL DE DIRECCIÓN DEPORTIVA", 15, 203);
        doc.text(`Página ${data.pageNumber} de ${pageCount}`, 282, 203, { align: 'right' });
      }
    });

    // Save report file
    doc.save(`reporte_scouting_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  


  // List of positions present in types
  const positionsList = [
    'Portero',
    'Defensa Central',
    'Lateral Derecho',
    'Lateral Izquierdo',
    'Mediocentro Defensivo',
    'Mediocentro',
    'Mediapunta',
    'Extremo Derecho',
    'Extremo Izquierdo',
    'Delantero Centro'
  ];

  // Dynamic list of unique teams
  const teamList = useMemo(() => {
    const teams = new Set<string>();
    players.forEach((p) => {
      if (p.equipo) {
        teams.add(p.equipo);
      }
    });
    return Array.from(teams).sort();
  }, [players]);

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter & Search logic
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchSearch = 
        player.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.equipo.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchPos = selectedPosFilter === 'All' || player.posicion === selectedPosFilter;
      const matchFoot = selectedFootFilter === 'All' || player.lateralidad === selectedFootFilter;
      const matchTeam = selectedTeamFilter === 'All' || player.equipo === selectedTeamFilter;
      
      const categoryValue = player.categoria || 'Segunda RFEF';
      const matchCategory = selectedCategoryFilter === 'All' || 
        categoryValue.trim().toLowerCase() === selectedCategoryFilter.trim().toLowerCase();
      
      const recValue = getSelectValue(player.recomendacion);
      const matchRating = selectedRatingFilter === 'All' || 
        (selectedRatingFilter === 'SIN_VALORAR' && recValue === '') ||
        (selectedRatingFilter !== 'SIN_VALORAR' && recValue === selectedRatingFilter);

      return matchSearch && matchPos && matchFoot && matchTeam && matchCategory && matchRating;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle undefined values
      if (valA === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (valB === undefined) return sortOrder === 'asc' ? -1 : 1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });
  }, [players, searchTerm, selectedPosFilter, selectedCategoryFilter, selectedFootFilter, selectedTeamFilter, selectedRatingFilter, sortField, sortOrder]);

  // Export scouted DB to JSON
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(players, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `scouting_futbol_export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON trigger
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        if (event.target?.result) {
          onImportData(event.target.result as string);
        }
      };
    }
  };

  // Render sorting chevron
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 ml-1 inline text-emerald-600" />
      : <ChevronDown className="w-3.5 h-3.5 ml-1 inline text-emerald-600" />;
  };

  return (
    <>
      <ConfirmationModal
        isOpen={!!playerToDelete}
        onClose={() => setPlayerToDelete(null)}
        onConfirm={() => {
          if (playerToDelete && onDeletePlayer) {
            onDeletePlayer(playerToDelete.id);
          }
        }}
        title="Eliminar Prospecto"
        message={`¿Estás seguro de que deseas eliminar de forma permanente al jugador "${playerToDelete?.nombre}"? Esta acción no se puede deshacer y se borrará de tus listas de ojeadores.`}
        confirmText="Eliminar"
      />

      <div id="player-table-container" className="bg-slate-900 rounded-lg border border-slate-800 shadow-sm overflow-hidden flex flex-col h-full text-slate-200">
      {/* Search and filter box */}
      <div className="p-5 border-b border-slate-800 space-y-4 bg-slate-950/20">
        
        {/* Row 1: Add or export */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              id="search-player-input"
              type="text"
              placeholder="Buscar por Nombre / Club..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-550 placeholder-slate-500"
            />
          </div>

          <div id="actions-scouting-group" className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="btn-export-pdf-list"
              onClick={handleExportPDF}
              title="Descargar listado PDF con todos los jugadores actuales filtrados"
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-red-900/30 bg-red-950/30 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded text-xs font-semibold transition-all hover:scale-105 active:scale-95 duration-200"
            >
              <FileDown className="w-3.5 h-3.5 text-red-500" />
              <span>Exportar PDF</span>
            </button>

            {/* Add */}
            <button
              id="btn-add-scouting-record"
              onClick={onAddPlayer}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-xs transition-colors ml-auto sm:ml-0 uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Jugador</span>
            </button>
          </div>
        </div>

        {/* Row 2: Advanced Filters */}
        <div id="filter-selection-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1 border-t border-dashed border-slate-850">
          
          {/* Team Filter */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 italic">
              Filtrar por Equipo
            </span>
            <select
              id="filter-select-team"
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="w-full text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-600 transition-colors"
            >
              <option value="All">Todos los equipos</option>
              {teamList.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* Categoría Filter */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 italic">
              Filtrar por Categoría
            </span>
            <select
              id="filter-select-category"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-600 transition-colors"
            >
              <option value="All">Todas las categorías</option>
              <option value="Primera RFEF">Primera RFEF</option>
              <option value="Segunda RFEF">Segunda RFEF</option>
              <option value="Segunda División">Segunda División</option>
            </select>
          </div>

          {/* Pos filter */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 italic">
              Filtrar por Posición
            </span>
            <select
              id="filter-select-position"
              value={selectedPosFilter}
              onChange={(e) => setSelectedPosFilter(e.target.value)}
              className="w-full text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-600 transition-colors"
            >
              <option value="All">Todas las posiciones</option>
              {positionsList.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* Foot filter */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 italic">
              Filtrar por Lateralidad
            </span>
            <select
              id="filter-select-foot"
              value={selectedFootFilter}
              onChange={(e) => setSelectedFootFilter(e.target.value)}
              className="w-full text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-600 transition-colors"
            >
              <option value="All">Todas las lateralidades</option>
              <option value="Diestro">Diestro / Pie derecho</option>
              <option value="Zurdo">Zurdo / Pie izquierdo</option>
              <option value="Ambidiestro">Ambidiestro</option>
            </select>
          </div>

          {/* Rating filter */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 italic">
              Filtrar por Valoración
            </span>
            <select
              id="filter-select-rating"
              value={selectedRatingFilter}
              onChange={(e) => setSelectedRatingFilter(e.target.value)}
              className="w-full text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-600 transition-colors"
            >
              <option value="All">Todas las valoraciones</option>
              <option value="SIN_VALORAR">Sin valorar</option>
              <option value="SEGUIR">Seguir</option>
              <option value="INTERESANTE">Interesante</option>
              <option value="FIRMAR">Firmar</option>
              <option value="DESCARTAR">Descartar</option>
            </select>
          </div>

        </div>
      </div>

      {/* Actual Players Table */}
      <div className="overflow-x-auto flex-1">
        <table id="players-database-table" className="w-full border-collapse text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 sticky top-0 border-b border-slate-700 z-10 text-slate-400 uppercase text-[10px] tracking-widest font-bold">
            <tr>
              <th 
                onClick={() => handleSort('nombre')}
                className="px-3 py-2 cursor-pointer hover:bg-slate-800 select-none transition-colors italic"
              >
                Nombre / Prospecto {renderSortIndicator('nombre')}
              </th>
              <th 
                onClick={() => handleSort('equipo')}
                className="px-3 py-2 cursor-pointer hover:bg-slate-800 select-none transition-colors italic"
              >
                Club / Equipo {renderSortIndicator('equipo')}
              </th>
              <th 
                onClick={() => handleSort('categoria')}
                className="px-2 py-2 cursor-pointer hover:bg-slate-800 select-none transition-colors italic text-center"
              >
                Categoría {renderSortIndicator('categoria')}
              </th>
              <th 
                onClick={() => handleSort('posicion')}
                className="px-2 py-2 cursor-pointer hover:bg-slate-800 select-none transition-colors italic"
              >
                Posición {renderSortIndicator('posicion')}
              </th>
              <th 
                onClick={() => handleSort('anoNacimiento')}
                className="px-2 py-2 cursor-pointer hover:bg-slate-800 select-none text-center transition-colors italic"
              >
                Año {renderSortIndicator('anoNacimiento')}
              </th>
              <th 
                onClick={() => handleSort('lateralidad')}
                className="px-2 py-2 cursor-pointer hover:bg-slate-800 select-none text-center transition-colors italic"
              >
                Pie {renderSortIndicator('lateralidad')}
              </th>
              <th className="px-2 py-2 text-center italic">
                Informe
              </th>
              <th className="px-2 py-2 text-center italic">
                Seguimiento
              </th>
              <th className="px-2 py-2 text-center italic">
                Valoración
              </th>
              <th className="px-2 py-2 text-center italic text-red-400/90">
                Eliminar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 bg-slate-900">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <tr
                  id={`table-row-${player.id}`}
                  key={player.id}
                  onClick={() => onSelectPlayer(player)}
                  className={`cursor-pointer border-b border-slate-800/30 transition-colors ${
                    selectedPlayerId === player.id 
                      ? 'bg-blue-950/45 hover:bg-blue-950/60 text-white font-medium' 
                      : 'hover:bg-blue-900/10 text-slate-300 odd:bg-slate-950/20'
                  }`}
                >
                  {/* Name field (with Photo inside) - Clicking this column opens the edit sheet */}
                  <td 
                    className="px-3 py-2 group/name hover:bg-blue-950/40 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid triggering full row selection only
                      onSelectPlayer(player); // Select in background to sync details
                      onEditPlayer && onEditPlayer(player); // Open edit modal
                    }}
                    title="Haga clic para editar la ficha del jugador"
                  >
                    <div className="flex items-center gap-2.5">
                      {player.fotoUrl ? (
                        <div className="relative group shrink-0">
                          <img 
                            src={player.fotoUrl} 
                            alt={`Foto de ${player.nombre}`}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 object-cover rounded-full border border-slate-700 bg-slate-800/45 group-hover/name:scale-105 group-hover/name:border-blue-500 transition-all"
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-[10px] text-blue-400 group-hover/name:text-blue-300 group-hover/name:border-blue-500 font-bold transition-all"
                        >
                          📷
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white text-[12.5px] leading-snug group-hover/name:text-blue-400 transition-colors flex items-center gap-1">
                          {player.nombre}
                          <Edit className="w-2.5 h-2.5 opacity-0 group-hover/name:opacity-100 text-blue-400 transition-opacity" />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">Rating: {player.calificacion} ★</div>
                      </div>
                    </div>
                  </td>

                  {/* Club field (with Escudo inside) */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src={getPlayerEscudoUrl(player)} 
                        alt={`Escudo de ${player.equipo}`}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 object-contain shrink-0 bg-slate-800/40 rounded p-0.5 border border-slate-700/50"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(player.equipo || 'FC')}&radius=10&backgroundColor=1e293b&fontSize=45`;
                        }}
                      />
                      <span className="text-slate-400 text-[12px] font-medium leading-none">{player.equipo}</span>
                    </div>
                  </td>

                  {/* Categoría Column */}
                  <td className="px-2 py-2 text-center">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border bg-slate-800/40 border-slate-700/50 text-slate-400">
                      {player.categoria || 'Segunda RFEF'}
                    </span>
                  </td>

                  {/* Position Badge */}
                  <td className="px-2 py-2">
                    <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-[10.5px] font-bold border border-blue-500/10">
                      {player.posicion}
                    </span>
                  </td>

                  {/* Born Year */}
                  <td className="px-2 py-2 text-center text-slate-400 font-mono text-[12.5px]">
                    {player.anoNacimiento}
                  </td>

                  {/* Footedness Badge */}
                  <td className="px-2 py-2 text-center">
                    <span className="inline-block text-[10.5px] font-bold px-1.5 py-0.5 rounded border bg-slate-800/40 text-slate-400 border-slate-700/50">
                      {player.lateralidad[0]} - {player.lateralidad}
                    </span>
                  </td>



                  {/* Informe Column: launches official report editor document */}
                  <td className="px-2 py-2 text-center">
                    {onEditReport && (
                      <button
                        type="button"
                        id={`btn-edit-official-report-${player.id}`}
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering full row select click only
                          onSelectPlayer(player); // Select row so other components track it
                          onEditReport(player); // Open report modal
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-bold text-amber-500 bg-amber-550/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-md transition-all hover:scale-105 active:scale-95"
                        title="Ver / Editar el documento oficial 'Informe Descriptivo'"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Informe 📄</span>
                      </button>
                    )}
                  </td>

                  {/* Seguimiento Column: opens tracking menu */}
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      id={`btn-seguimiento-${player.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlayer(player);
                        setSelectedSeguimientoPlayer(player);
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-bold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-md transition-all hover:scale-105 active:scale-95"
                      title="Ver informes de seguimiento de partido (Historial/Calificaciones de Actas)"
                    >
                      <Activity className="w-3 h-3" />
                      <span>Seguimiento 📋</span>
                    </button>
                  </td>

                  {/* Valoración Column: custom stylish state select dropdown */}
                  <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <select
                      id={`select-recommendacion-${player.id}`}
                      value={getSelectValue(player.recomendacion)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (onUpdatePlayer) {
                          onUpdatePlayer({
                            ...player,
                            recomendacion: val || undefined
                          });
                        }
                      }}
                      className={`text-[10.5px] font-bold px-1.5 py-1 rounded border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${getRecomendacionStyleClass(getSelectValue(player.recomendacion))}`}
                    >
                      <option value="" className="bg-slate-900 text-slate-400">Sin valorar</option>
                      <option value="SEGUIR" className="bg-slate-900 text-slate-100">Seguir</option>
                      <option value="INTERESANTE" className="bg-slate-900 text-slate-100">Interesante</option>
                      <option value="FIRMAR" className="bg-slate-900 text-slate-100">Firmar</option>
                      <option value="DESCARTAR" className="bg-slate-900 text-slate-100">Descartar</option>
                    </select>
                  </td>

                  {/* Eliminar Column */}
                  <td className="px-2 py-2 text-center">
                    {onDeletePlayer && (
                      <button
                        type="button"
                        id={`btn-delete-${player.id}`}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row selection
                          setPlayerToDelete(player);
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-all hover:scale-105 active:scale-95"
                        title={`Eliminar de la lista a ${player.nombre}`}
                      >
                        <Trash2 className="w-3" />
                        <span>Borrar</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-slate-500 bg-slate-900/40">
                  Ningún prospecto deportivo coincide con los filtros de búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Row counter info */}
      <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <div>
          Mostrando <span className="text-slate-300">{filteredPlayers.length}</span> de <span className="text-slate-300">{players.length}</span> resultados
        </div>
        <div className="hidden sm:block font-mono text-slate-550">
          * Clic en fila para informe técnico
        </div>
      </div>
    </div>

    {/* Player Seguimiento Modal */}
    <PlayerSeguimientoModal
      isOpen={selectedSeguimientoPlayer !== null}
      player={selectedSeguimientoPlayer}
      matchReports={matchReports}
      onClose={() => setSelectedSeguimientoPlayer(null)}
      onUpdateMatchReport={onUpdateMatchReport}
    />
  </>
);
}
