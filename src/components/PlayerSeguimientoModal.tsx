import React, { useState, useEffect } from 'react';
import { ScoutedPlayer, MatchReport, MatchPlayer, getPhysicalCapacitiesByPosition } from '../types';
import { X, ChevronDown, Plus, Check, Info, Loader2, Save, Star, Activity } from 'lucide-react';

interface PlayerSeguimientoModalProps {
  isOpen: boolean;
  player: ScoutedPlayer | null;
  matchReports: MatchReport[];
  onClose: () => void;
  onUpdateMatchReport: (report: MatchReport) => void;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function PlayerSeguimientoModal({
  isOpen,
  player,
  matchReports,
  onClose,
  onUpdateMatchReport,
}: PlayerSeguimientoModalProps) {
  const [localReports, setLocalReports] = useState<MatchReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<'titular' | 'suplente'>('titular');
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  // Deep clone of matchReports on open
  useEffect(() => {
    if (isOpen && matchReports) {
      setLocalReports(JSON.parse(JSON.stringify(matchReports)));
      setSaveComplete(false);
    }
  }, [isOpen, matchReports]);

  if (!isOpen || !player) return null;

  // Find which reports have actually changed
  const getChangedReports = () => {
    const changed: MatchReport[] = [];
    localReports.forEach((localRep) => {
      const originalRep = matchReports.find((r) => r.id === localRep.id);
      if (!originalRep) return;

      const originalLocalStr = JSON.stringify(originalRep.jugadoresLocal);
      const originalVisitanteStr = JSON.stringify(originalRep.jugadoresVisitante);
      const localLocalStr = JSON.stringify(localRep.jugadoresLocal);
      const localVisitanteStr = JSON.stringify(localRep.jugadoresVisitante);

      if (originalLocalStr !== localLocalStr || originalVisitanteStr !== localVisitanteStr) {
        changed.push(localRep);
      }
    });
    return changed;
  };

  const changedReports = getChangedReports();
  const hasUnsavedChanges = changedReports.length > 0;

  // Save changes block
  const handleSaveAll = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const toSave = getChangedReports();
      for (const report of toSave) {
        await onUpdateMatchReport(report);
      }
      setSaveComplete(true);
      setTimeout(() => setSaveComplete(false), 2500);
    } catch (err) {
      console.error("Error saving tracked match reports to Supabase:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Safe autoSave and close
  const handleClose = async () => {
    if (hasUnsavedChanges) {
      setIsSaving(true);
      try {
        const toSave = getChangedReports();
        for (const report of toSave) {
          await onUpdateMatchReport(report);
        }
      } catch (err) {
        console.error("Auto-saving before closing failed:", err);
      } finally {
        setIsSaving(false);
      }
    }
    onClose();
  };

  // Find all match player entries where the name matches this player
  const getMatchedEntries = () => {
    const entries: {
      report: MatchReport;
      playerEntry: MatchPlayer;
      isLocal: boolean;
    }[] = [];

    localReports.forEach((report) => {
      // Look in Local
      const localEntry = report.jugadoresLocal.find(
        (p) => p.nombre.toLowerCase().trim() === player.nombre.toLowerCase().trim()
      );
      if (localEntry) {
        entries.push({ report, playerEntry: localEntry, isLocal: true });
        return; // Avoid duplicates from same match if somehow they exist
      }

      // Look in Visitante
      const visitanteEntry = report.jugadoresVisitante.find(
        (p) => p.nombre.toLowerCase().trim() === player.nombre.toLowerCase().trim()
      );
      if (visitanteEntry) {
        entries.push({ report, playerEntry: visitanteEntry, isLocal: false });
      }
    });

    // Sort by report date descending
    return entries.sort((a, b) => b.report.fecha.localeCompare(a.report.fecha));
  };

  const matchedEntries = getMatchedEntries();

  // Find other match reports where the player is NOT present
  const getAvailableReportsForAdding = () => {
    return localReports.filter((report) => {
      const isAlreadyInLocal = report.jugadoresLocal.some(
        (p) => p.nombre.toLowerCase().trim() === player.nombre.toLowerCase().trim()
      );
      const isAlreadyInVisitante = report.jugadoresVisitante.some(
        (p) => p.nombre.toLowerCase().trim() === player.nombre.toLowerCase().trim()
      );
      return !isAlreadyInLocal && !isAlreadyInVisitante;
    });
  };

  const availableReports = getAvailableReportsForAdding();

  const handleAddPlayerToMatch = () => {
    if (!selectedReportId) return;

    const reportToUpdate = localReports.find((r) => r.id === selectedReportId);
    if (!reportToUpdate) return;

    // Check if the player belongs to local or visitante team, otherwise check report teams
    const playerTeamNorm = player.equipo.toLowerCase().trim();
    const localTeamNorm = reportToUpdate.equipoLocal.toLowerCase().trim();
    const visitanteTeamNorm = reportToUpdate.equipoVisitante.toLowerCase().trim();

    // Determine if we should add him to local or visitante array
    let isLocal = true;
    if (playerTeamNorm && (localTeamNorm.includes(playerTeamNorm) || playerTeamNorm.includes(localTeamNorm))) {
      isLocal = true;
    } else if (playerTeamNorm && (visitanteTeamNorm.includes(playerTeamNorm) || playerTeamNorm.includes(visitanteTeamNorm))) {
      isLocal = false;
    } else {
      isLocal = true;
    }

    // Default short position conversion
    let shortPos = 'CM';
    const posLower = player.posicion.toLowerCase();
    if (posLower.includes('portero')) shortPos = 'GK';
    else if (posLower.includes('central')) shortPos = 'CB';
    else if (posLower.includes('lateral derecho')) shortPos = 'RB';
    else if (posLower.includes('lateral izquierdo')) shortPos = 'LB';
    else if (posLower.includes('defensivo')) shortPos = 'DM';
    else if (posLower.includes('mediapunta')) shortPos = 'AM';
    else if (posLower.includes('extremo derecho')) shortPos = 'RW';
    else if (posLower.includes('extremo izquierdo')) shortPos = 'LW';
    else if (posLower.includes('delantero')) shortPos = 'ST';

    // Generate a unique ID for the match player entry
    const newId = `p-match-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newMatchPlayer: MatchPlayer = {
      id: newId,
      dorsal: '10', // Default dorsal
      nombre: player.nombre,
      anoNacimiento: player.anoNacimiento,
      posicion: shortPos,
      pie: player.lateralidad === 'Zurdo' ? 'Z' : player.lateralidad === 'Diestro' ? 'D' : 'A',
      pts: '-', // default unrated
      comentarios: '', // keeping empty for manual entry
      isTitular: newPlayerRole === 'titular',
      pitchX: 50,
      pitchY: isLocal ? 35 : 65,
      fotoUrl: player.fotoUrl || undefined,
    };

    const updatedReports = localReports.map((r) => {
      if (r.id === selectedReportId) {
        const updated = { ...r };
        if (isLocal) {
          updated.jugadoresLocal = [...updated.jugadoresLocal, newMatchPlayer];
        } else {
          updated.jugadoresVisitante = [...updated.jugadoresVisitante, newMatchPlayer];
        }
        return updated;
      }
      return r;
    });

    setLocalReports(updatedReports);
    setSelectedReportId('');
    setShowAddSuccess(true);
    setTimeout(() => setShowAddSuccess(false), 3000);
  };

  // Function to rewrite helper title
  const getMatchHeader = (report: MatchReport) => {
    const comp = report.competicion.toUpperCase();
    let jornada = '';
    const matchJornada = comp.match(/JORNADA\s*(\d+)/i) || comp.match(/\bJ\s*(\d+)\b/i);
    if (matchJornada) {
      jornada = `J${matchJornada[1]} `;
    } else {
      const matchPartJornada = report.partido.match(/\bJ(\d+)\b/i);
      if (matchPartJornada) {
        jornada = `J${matchPartJornada[1]} `;
      }
    }

    const local = report.equipoLocal.toUpperCase();
    const visitante = report.equipoVisitante.toUpperCase();
    const score = `${report.golesLocal}-${report.golesVisitante}`;

    return `${jornada}${local} ${score} ${visitante}`;
  };

  // Inline updater for local rating/comentarios
  const handleUpdateEntry = (
    reportId: string,
    playerEntryId: string,
    isLocal: boolean,
    field: 'pts' | 'comentarios',
    value: string
  ) => {
    const updatedReports = localReports.map((r) => {
      if (r.id === reportId) {
        const updated = { ...r };
        if (isLocal) {
          updated.jugadoresLocal = updated.jugadoresLocal.map((p) => {
            if (p.id === playerEntryId) {
              return { ...p, [field]: value };
            }
            return p;
          });
        } else {
          updated.jugadoresVisitante = updated.jugadoresVisitante.map((p) => {
            if (p.id === playerEntryId) {
              return { ...p, [field]: value };
            }
            return p;
          });
        }
        return updated;
      }
      return r;
    });

    setLocalReports(updatedReports);
  };

  const handleUpdateFisicaEntry = (
    reportId: string,
    playerEntryId: string,
    isLocal: boolean,
    capacityName: string,
    ratingValue: number
  ) => {
    const updatedReports = localReports.map((r) => {
      if (r.id === reportId) {
        const updated = { ...r };
        if (isLocal) {
          updated.jugadoresLocal = updated.jugadoresLocal.map((p) => {
            if (p.id === playerEntryId) {
              const currentFisica = p.valoracionFisica || {};
              return {
                ...p,
                valoracionFisica: {
                  ...currentFisica,
                  [capacityName]: ratingValue
                }
              };
            }
            return p;
          });
        } else {
          updated.jugadoresVisitante = updated.jugadoresVisitante.map((p) => {
            if (p.id === playerEntryId) {
              const currentFisica = p.valoracionFisica || {};
              return {
                ...p,
                valoracionFisica: {
                  ...currentFisica,
                  [capacityName]: ratingValue
                }
              };
            }
            return p;
          });
        }
        return updated;
      }
      return r;
    });

    setLocalReports(updatedReports);
  };


  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative text-slate-100">
        
        {/* Header */}
         <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold font-display text-white tracking-widest uppercase flex items-center gap-2">
              📊 Informe de Seguimiento de Partido
              {hasUnsavedChanges && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/25 text-blue-400 border border-blue-500/30 animate-pulse normal-case font-mono font-medium">
                  Cambios pendientes de guardado
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
              Historial de actuaciones de <span className="text-emerald-400 font-bold">{player.nombre}</span> ({player.equipo})
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0 bg-slate-900/60">
          
          {/* Quick instructions / Info banner */}
          <div className="bg-blue-950/30 border border-blue-900/40 p-3 rounded flex items-start gap-2.5 text-xs text-blue-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>
                Este apartado recopila las fichas de rendimiento de este de futbolista redactadas en cada una de las actas de partido. Puedes editar la calificación (Pts) y el informe escrito directamente desde este panel de control. Los cambios se sincronizan inline en tu estado y se guardan de forma masiva en <b>Supabase</b> para máxima eficiencia.
              </p>
            </div>
          </div>

          {/* List of Match Entries styled EXACTLY like the user's photo */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold font-mono text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span>📋 REGISTRO DE ACTUACIONES DE SEGUIMIENTO</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                {matchedEntries.length} partidos encontrados
              </span>
            </h4>

            {matchedEntries.length > 0 ? (
              <div className="space-y-6">
                {matchedEntries.map(({ report, playerEntry, isLocal }) => {
                  const headerTitle = getMatchHeader(report);
                  return (
                    <div 
                      key={`${report.id}-${playerEntry.id}`} 
                      className="flex flex-col rounded overflow-hidden shadow-md"
                    >
                      {/* 1. Header Band matching the custom dark blue pattern */}
                      <div className="bg-[#003b70] text-white font-sans text-[11px] py-1.5 px-3 select-none flex flex-wrap items-center justify-between gap-1.5 border-b border-[#002f5a]">
                        <div className="flex flex-wrap items-center gap-2 text-left">
                          <span className="font-bold uppercase tracking-wider">{headerTitle}</span>
                          {/* Categoría / Competición badge */}
                          <span className="text-[9px] text-[#86bcff] font-semibold bg-[#002f5c] px-1.5 py-0.5 rounded leading-none">
                            {report.categoria || report.competicion || 'LIGA'}
                          </span>
                          {report.categoria && report.competicion && report.categoria.toLowerCase() !== report.competicion.toLowerCase() && (
                            <span className="text-[9px] text-[#86bcff] font-semibold bg-[#002f5c] px-1.5 py-0.5 rounded leading-none">
                              {report.competicion}
                            </span>
                          )}
                          {/* Fecha badge */}
                          <span className="text-[9.5px] text-slate-200 font-mono opacity-90 flex items-center gap-1 ml-1 shrink-0">
                            <span>📅</span> 
                            <span>{formatDate(report.fecha)}</span>
                          </span>
                        </div>
                        <span className="text-[8px] font-mono font-bold text-slate-200 uppercase bg-black/25 px-1.5 py-0.5 rounded-sm shrink-0">
                          {isLocal ? 'Local' : 'Visitante'}
                        </span>
                      </div>

                      {/* 2. Side-by-Side Flex Layout containing the comments and the score dropdown */}
                      <div className="grid grid-cols-[1fr_80px] min-h-[90px] border border-slate-350 bg-white">
                        {/* Left: Interactive/Editable Comments Column */}
                        <div className="relative group">
                          <textarea
                            className="w-full h-full min-h-[90px] p-3 pt-4 text-slate-800 font-sans text-[11px] leading-relaxed bg-white border-none outline-none resize-none focus:bg-slate-50 transition-colors placeholder:italic placeholder:text-slate-400 select-text leading-relaxed"
                            value={playerEntry.comentarios || ''}
                            onChange={(e) =>
                              handleUpdateEntry(report.id, playerEntry.id, isLocal, 'comentarios', e.target.value)
                            }
                            placeholder="Introduce aquí el análisis individual o informe técnico del futbolista para este partido..."
                          />
                          <div className="absolute top-1 right-2 text-[8px] font-mono text-slate-400 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                            ✏️ Edición instantánea
                          </div>
                        </div>

                        {/* Right: Vertical Score Cell exactly like photo */}
                        <div className="relative flex items-center justify-center bg-white border-l border-slate-350 select-none overflow-hidden hover:bg-slate-50 transition-all">
                          <select
                            value={playerEntry.pts || '-'}
                            onChange={(e) =>
                              handleUpdateEntry(report.id, playerEntry.id, isLocal, 'pts', e.target.value)
                            }
                            className="w-full h-full text-center font-sans font-bold text-slate-900 border-none outline-none appearance-none cursor-pointer focus:ring-0 text-[18px] pl-2 pt-1.5"
                          >
                            <option value="-">-</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                            <option value="7">7</option>
                            <option value="8">8</option>
                            <option value="9">9</option>
                            <option value="10">10</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* 3. Valuation of Physical Capacities by Position (1 to 4 Stars) */}
                      {(() => {
                        const matchPhys = getPhysicalCapacitiesByPosition(playerEntry.posicion || player.posicion);
                        if (!matchPhys) return null;
                        return (
                          <div className="bg-slate-950/60 border-x border-b border-slate-350 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold font-mono text-amber-500 uppercase tracking-widest flex items-center">
                                <Activity className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-400" />
                                Valoración de Capacidades Físicas ({matchPhys.category})
                              </span>
                              <span className="text-[8.5px] text-slate-400">Escala de 1 a 4 estrellas</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {matchPhys.capacities.map((cap) => {
                                const rating = playerEntry.valoracionFisica?.[cap] || 2; // Default to 2
                                return (
                                  <div key={cap} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 px-3 py-1.5 rounded">
                                    <span className="text-[10.5px] text-slate-300 font-medium">{cap}</span>
                                    <div className="flex items-center space-x-0.5">
                                      {[1, 2, 3, 4].map((starNum) => {
                                        const isActive = starNum <= rating;
                                        return (
                                          <button
                                            type="button"
                                            key={starNum}
                                            onClick={() => {
                                              handleUpdateFisicaEntry(report.id, playerEntry.id, isLocal, cap, starNum);
                                            }}
                                            className="p-1 focus:outline-none transition hover:scale-110"
                                          >
                                            <Star
                                              className={`w-3.5 h-3.5 ${
                                                isActive
                                                  ? "fill-amber-400 text-amber-400"
                                                  : "text-slate-600 hover:text-amber-300"
                                              }`}
                                            />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-950/20 rounded border border-dashed border-slate-800 space-y-2">
                <p className="text-xs text-slate-500 italic">
                  Este futbolista no ha sido inscrito todavía en ninguna de las actas de partidos registradas.
                </p>
                <p className="text-[10px] text-slate-600 uppercase font-mono">
                  * Puedes añadirlo a un acta abajo para iniciar su seguimiento.
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions: Add to existing match report */}
          {availableReports.length > 0 && (
            <div className="bg-slate-950/30 border border-slate-800/80 p-4 rounded-md space-y-3">
              <h5 className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>⚡ REGISTRAR NUEVA ACTUACIÓN DE SEGUIMIENTO</span>
              </h5>
              <p className="text-[10px] text-slate-400 leading-normal">
                Si este prospecto ha disputado un encuentro cargado en el sistema, selecciónalo a continuación para añadirlo de inmediato a la alineación táctica de ese partido y poder redactar su reporte de seguimiento:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                {/* Selector */}
                <div className="sm:col-span-6">
                  <select
                    value={selectedReportId}
                    onChange={(e) => setSelectedReportId(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Selecciona un acta de partido --</option>
                    {availableReports.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.partido} ({r.competicion})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role (Titular / Suplente) */}
                <div className="sm:col-span-3">
                  <select
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value as 'titular' | 'suplente')}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="titular">Alinear Titular</option>
                    <option value="suplente">Alinear Suplente</option>
                  </select>
                </div>

                {/* Confirm button */}
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddPlayerToMatch}
                    disabled={!selectedReportId}
                    className="w-full h-full flex items-center justify-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-555 text-white disabled:bg-slate-800 disabled:text-slate-500 rounded text-xs font-bold font-mono transition-colors active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>AÑADIR A ACTA</span>
                  </button>
                </div>
              </div>

              {showAddSuccess && (
                <div className="text-[10px] text-emerald-400 font-medium font-mono pt-1 animate-pulse">
                  ✓ Jugador añadido con éxito. Ya puedes calificar y redactar sus comentarios arriba de la lista.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/20 rounded-b-lg">
          
          {/* Status indicators */}
          <div className="text-[11px] font-mono text-slate-450 uppercase flex items-center gap-1.5">
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                <span className="text-blue-400">Sincronizando con Supabase...</span>
              </>
            ) : saveComplete ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">¡Cambios guardados con éxito!</span>
              </>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-400 text-2xs animate-pulse">⚠️ Tienes {changedReports.length} actas modificadas sin guardar</span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">✓ Todos los informes sincronizados</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Save All button */}
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 hover:shadow-md hover:shadow-blue-500/10 text-white disabled:bg-slate-800 disabled:text-slate-500 rounded text-xs font-bold font-mono transition-colors active:scale-95"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>GUARDAR CAMBIOS ({changedReports.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-slate-800 hover:bg-slate-705 text-slate-200 hover:text-white rounded text-xs font-bold font-mono transition-colors active:scale-95 border border-slate-755 disabled:opacity-50"
            >
              {hasUnsavedChanges ? 'SINC. Y CERRAR' : 'CERRAR HISTORIAL'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
