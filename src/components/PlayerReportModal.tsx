import React, { useState, useEffect } from 'react';
import { ScoutedPlayer } from '../types';
import { 
  X, 
  Check, 
  User, 
  FileText, 
  Edit3, 
  Globe, 
  Award, 
  Calendar, 
  Flag,
  Sparkles,
  Download
} from 'lucide-react';
import { ensureReportFields } from '../utils/reportDefaults';
import { getPlayerEscudoUrl, getCategoryEscudoUrl } from '../utils/escudoHelper';
import ImageUploadInput from './ImageUploadInput';
import { exportPlayerReportPDF } from '../utils/exportPlayerReportPDF';

interface PlayerReportModalProps {
  isOpen: boolean;
  player: ScoutedPlayer | null;
  onClose: () => void;
  onSaveReport: (updatedPlayer: ScoutedPlayer) => void;
}

// Interactive Mini-Soccer Pitch for report positioning
function SoccerPitch({ 
  x, 
  y, 
  onChange 
}: { 
  x: number; 
  y: number; 
  onChange?: (coords: { x: number; y: number }) => void 
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    const boundedX = Math.max(5, Math.min(95, clickX));
    const boundedY = Math.max(5, Math.min(95, clickY));
    onChange({ x: boundedX, y: boundedY });
  };

  return (
    <div 
      className={`relative w-full h-36 bg-[#f5fbf7] rounded-lg border-2 border-emerald-600 overflow-hidden shadow-inner ${
        onChange ? 'cursor-crosshair hover:bg-[#ebf8f1] active:scale-[0.99] transition-all' : ''
      }`}
      onClick={handleClick}
      title={onChange ? "Haz clic en el campo para reposicionar el marcador táctico" : "Ubicación táctica del futbolista"}
    >
      {/* Outer yard line */}
      <div className="absolute inset-1.5 border border-emerald-600/35 rounded-sm" />
      
      {/* Midfield line */}
      <div className="absolute inset-y-1.5 left-1/2 -translate-x-1/2 border-l border-emerald-600/35" />
      
      {/* Center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border border-emerald-600/35 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-600/40 rounded-full" />

      {/* Left Penalty Area */}
      <div className="absolute top-1/5 bottom-1/5 left-1.5 w-7 border-y border-r border-emerald-600/35" />
      {/* Left Goal box */}
      <div className="absolute top-[35%] bottom-[35%] left-1.5 w-2.5 border-y border-r border-emerald-600/40" />

      {/* Right Penalty Area */}
      <div className="absolute top-1/5 bottom-1/5 right-1.5 w-7 border-y border-l border-emerald-600/35" />
      {/* Right Goal box */}
      <div className="absolute top-[35%] bottom-[35%] right-1.5 w-2.5 border-y border-l border-emerald-600/40" />
      
      {/* Coordinate Marker - Amber dot with black ring matching user screenshot */}
      <div 
        className="absolute w-4 h-4 -ml-2 -mt-2 bg-amber-400 border-2 border-slate-900 rounded-full shadow-lg shadow-amber-500/50 flex items-center justify-center transition-all duration-300 z-10"
        style={{ left: `${x}%`, top: `${y}%` }}
      >
        <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
      </div>

      {onChange && (
        <span className="absolute bottom-1 right-2 text-[8px] text-emerald-800/60 font-mono font-semibold">
          REPOSICIONAR (X:{x}, Y:{y})
        </span>
      )}
    </div>
  );
}

export default function PlayerReportModal({ 
  isOpen, 
  player, 
  onClose, 
  onSaveReport 
}: PlayerReportModalProps) {
  
  // Local edit states mirroring the document fields
  const [isEditing, setIsEditing] = useState(true); // Default to editing mode for easy changes!
  const [nombre, setNombre] = useState('');
  const [equipo, setEquipo] = useState('');
  const [escudoUrl, setEscudoUrl] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [altura, setAltura] = useState('');
  const [recomendacion, setRecomendacion] = useState('FIRMAR');
  const [recomendacionComentario, setRecomendacionComentario] = useState('');
  const [descripcionGeneral, setDescripcionGeneral] = useState('');
  const [fortalezas, setFortalezas] = useState('');
  const [debilidades, setDebilidades] = useState('');
  const [enSuEquipo, setEnSuEquipo] = useState('');
  const [enPocasPalabras, setEnPocasPalabras] = useState('');
  const [tieneValorPor, setTieneValorPor] = useState('');
  const [pitchX, setPitchX] = useState(50);
  const [pitchY, setPitchY] = useState(45);

  // Sync state with incoming player selection
  useEffect(() => {
    if (player && isOpen) {
      const fullReport = ensureReportFields(player);
      setNombre(fullReport.nombre);
      setEquipo(fullReport.equipo);
      setAltura(fullReport.altura);
      setRecomendacion(fullReport.recomendacion);
      setRecomendacionComentario(fullReport.recomendacionComentario);
      setDescripcionGeneral(fullReport.descripcionGeneral);
      setFortalezas(fullReport.fortalezas);
      setDebilidades(fullReport.debilidades);
      setEnSuEquipo(fullReport.enSuEquipo);
      setEnPocasPalabras(fullReport.enPocasPalabras);
      setTieneValorPor(fullReport.tieneValorPor);
      setPitchX(fullReport.pitchX);
      setPitchY(fullReport.pitchY);
      setEscudoUrl(player.escudoUrl || '');
      setFotoUrl(player.fotoUrl || '');
      setIsEditing(true); // Open directly with fields enabled or switchable
    }
  }, [player, isOpen]);

  if (!isOpen || !player) return null;

  const currentYear = 2026;
  const edad = currentYear - player.anoNacimiento;

  // Save edits back to parent state
  const handleSave = () => {
    const updatedPlayer: ScoutedPlayer = {
      ...player,
      nombre: nombre.trim(),
      equipo: equipo.trim(),
      altura,
      recomendacion,
      recomendacionComentario: recomendacionComentario.trim(),
      descripcionGeneral: descripcionGeneral.trim(),
      fortalezas: fortalezas.trim(),
      debilidades: debilidades.trim(),
      enSuEquipo: enSuEquipo.trim(),
      enPocasPalabras: enPocasPalabras.trim(),
      tieneValorPor: tieneValorPor.trim(),
      pitchX,
      pitchY,
      escudoUrl: escudoUrl.trim() || undefined,
      fotoUrl: fotoUrl.trim() || undefined
    };

    onSaveReport(updatedPlayer);
    onClose();
  };

  const handleDownloadPDF = async () => {
    if (!player) return;
    await exportPlayerReportPDF(player, {
      equipo,
      altura,
      fotoUrl,
      escudoUrl: escudoUrl || getPlayerEscudoUrl(player),
      recomendacion,
      recomendacionComentario,
      descripcionGeneral,
      fortalezas,
      debilidades,
      enSuEquipo,
      enPocasPalabras,
      tieneValorPor
    });
  };

  // Helper lists renderer for Bullets
  const renderStringBullets = (text: string) => {
    if (!text.trim()) return <li className="text-slate-400 italic text-[11px]">Ningún punto documentado</li>;
    return text.split('\n').map((line, idx) => {
      const cleaned = line.trim().replace(/^[\s·•\-*\d+.)]+/, '');
      if (!cleaned) return null;
      return (
        <li key={idx} className="flex items-start gap-2 text-slate-700 leading-snug">
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-1.5 flex-shrink-0" />
          <span className="text-[11px] font-medium">{cleaned}</span>
        </li>
      );
    });
  };

  const renderRedStringBullets = (text: string) => {
    if (!text.trim()) return <li className="text-slate-400 italic text-[11px]">Ningún punto documentado</li>;
    return text.split('\n').map((line, idx) => {
      const cleaned = line.trim().replace(/^[\s·•\-*\d+.)]+/, '');
      if (!cleaned) return null;
      return (
        <li key={idx} className="flex items-start gap-2 text-slate-800 leading-snug font-medium">
          <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0" />
          <span className="text-[11px] font-semibold">{cleaned}</span>
        </li>
      );
    });
  };

  return (
    <div 
      id="player-report-modal-backdrop" 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        id="player-report-modal-content"
        className="bg-slate-900 rounded-lg max-w-4xl w-full shadow-2xl border border-slate-800 overflow-hidden my-4 text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head Bar */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/15">
              <FileText className="w-5 h-5 flex-shrink-0" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display uppercase tracking-widest text-white">
                Editor de Documento Oficial de Scouting
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                REAL AVILÉS INDUSTRIAL CLUB DE FÚTBOL • EXPEDIENTE DEPORTIVO • ID: <span className="text-blue-400 font-bold">{player.id}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1 text-2xs rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                isEditing 
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30' 
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750 border border-slate-700'
              }`}
              title="Alternar entre modo de vista y modo de edición directa de las secciones"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditing ? 'Editar' : 'Previsualizar'}</span>
            </button>


            <button 
              onClick={onClose}
              className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-750 rounded transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container Body Panel */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/40">
          <div className="bg-white p-5 md:p-7 text-slate-900 rounded-md border border-slate-300 shadow-2xl relative select-text">
            
            {/* Header Plate block */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5 mb-4">
              <span className="bg-slate-950 text-white font-mono font-bold text-[9px] px-2.5 py-1 tracking-widest uppercase rounded-sm">
                DEPARTAMENTO DE SCOUTING
              </span>
              <div className="text-right">
                <span className="text-[13px] font-extrabold font-sans tracking-wide text-slate-850">
                  REAL AVILÉS INDUSTRIAL CLUB DE FÚTBOL
                </span>
              </div>
            </div>

            {/* Document Title bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 my-4">
              <div className="flex items-center space-x-2">
                <div className="h-14 sm:h-16 w-auto max-w-[200px] flex items-center justify-start py-1">
                  <img
                    src={getCategoryEscudoUrl(player.categoria)}
                    alt={player.categoria || 'Categoría'}
                    className="h-12 sm:h-14 max-h-14 w-auto object-contain drop-shadow-md"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="font-extrabold text-[16px] font-sans text-slate-900 tracking-wider uppercase border-b-2 border-slate-900 pb-0.5 inline-block">
                  INFORME DESCRIPTIVO
                </h3>
              </div>

              {/* Black recommendation badge */}
              <div className="flex items-center justify-end">
                {isEditing ? (
                  <div className="w-full max-w-[190px] bg-slate-950 text-white p-1.5 rounded border border-slate-800 text-left">
                    <label className="block text-[7px] uppercase tracking-wider text-slate-300 font-bold mb-0.5">ESTRATEGIA RECOMENDADA</label>
                    <select
                      value={recomendacion}
                      onChange={(e) => setRecomendacion(e.target.value)}
                      className="w-full text-3xs font-mono font-bold bg-slate-900 text-white border border-slate-750 rounded px-1 py-0.5 focus:outline-none"
                    >
                      <option value="FIRMAR">★ FIRMAR</option>
                      <option value="SEGUIR">★ SEGUIR</option>
                      <option value="INTERESANTE">★ INTERESANTE</option>
                      <option value="EVALUAR">★ EVALUAR</option>
                      <option value="DESCARTAR">★ DESCARTAR</option>
                    </select>
                    <input
                      type="text"
                      value={recomendacionComentario}
                      onChange={(e) => setRecomendacionComentario(e.target.value)}
                      placeholder="Ej: Nivel contrastado en Segunda."
                      className="w-full text-[9px] bg-slate-900 text-white border border-slate-750 font-sans rounded px-1 py-0.5 mt-1 focus:outline-none placeholder-slate-600"
                    />
                  </div>
                ) : (
                  <div className="bg-slate-950 text-white px-3 py-2 rounded text-right w-full max-w-[190px] border border-slate-850 shadow-sm">
                    <p className={`text-center font-extrabold text-xs tracking-widest uppercase transition-colors ${
                      (recomendacion === 'FIRMAR' || recomendacion === 'CONTRATAR') ? 'text-green-400' :
                      (recomendacion === 'SEGUIR' || recomendacion === 'SEGUIMIENTO') ? 'text-blue-400' :
                      (recomendacion === 'EVALUAR' || recomendacion === 'INTERESANTE') ? 'text-amber-400' : 'text-red-500'
                    }`}>
                      ★ {recomendacion}
                    </p>
                    <p className="text-[8px] font-sans text-slate-300 leading-tight mt-0.5 text-center truncate" title={recomendacionComentario}>
                      {recomendacionComentario || 'Monitoreo de rendimiento constante.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Row 1: Player Name header and info table */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch my-3.5">
              {/* Left Column: Avatar & Name */}
              <div className="md:col-span-3 flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block text-center mb-1 font-mono">
                  FICHA JUGADOR
                </span>
                
                {/* Profile Photo - Larger & fitted to frame */}
                <div className="w-28 h-28 md:w-32 md:h-32 bg-slate-200 rounded-full border-2 border-slate-300 flex items-center justify-center my-2 overflow-hidden text-slate-500 shadow-md relative shrink-0">
                  {player.fotoUrl ? (
                    <img 
                      src={player.fotoUrl} 
                      alt={player.nombre} 
                      className="w-full h-full object-cover object-top"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="w-14 h-14 text-slate-400" />
                  )}
                  <span className="absolute bottom-0 inset-x-0 text-[9px] bg-slate-900/80 text-white py-0.5 text-center font-mono font-bold tracking-wider">PRO</span>
                </div>

                {isEditing ? (
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full text-center text-xs font-bold border border-slate-300 rounded px-1 py-0.5 mt-1 focus:outline-none focus:border-red-500 text-slate-900 bg-white"
                    placeholder="Nombre Completo"
                  />
                ) : (
                  <h4 className="text-center font-extrabold text-xs text-red-700 tracking-tight leading-tight mt-1 truncate max-w-full uppercase">
                    {nombre}
                  </h4>
                )}
                <p className="text-[8.5px] font-bold text-slate-500 font-mono mt-0.5">{player.posicion.toUpperCase()}</p>
              </div>

              {/* Middle Column: Metadata Table */}
              <div className="md:col-span-5 flex flex-col justify-between">
                <table className="w-full text-[10px] border-collapse bg-white border border-slate-300 rounded overflow-hidden h-full">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-2.5 py-1.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 w-1/3 text-center align-middle">
                        Fecha / Edad:
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-900 font-mono font-medium text-center align-middle">
                        <div className="text-center w-full">{player.anoNacimiento} ({edad} años)</div>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-2.5 py-1.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 text-center align-middle">
                        Equipo:
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-900 font-semibold text-[11px] text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5 w-full mx-auto">
                          <img 
                            src={getPlayerEscudoUrl(player)} 
                            alt="Escudo" 
                            className="w-5 h-5 object-contain shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(player.equipo || 'FC')}&radius=10&backgroundColor=1e293b&fontSize=45`;
                            }}
                          />
                          {isEditing ? (
                            <input
                              type="text"
                              value={equipo}
                              onChange={(e) => setEquipo(e.target.value)}
                              className="w-full bg-white text-[10px] border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 text-slate-900 text-center"
                              placeholder="Nombre del Club"
                            />
                          ) : (
                            <span>{equipo}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="border-b border-slate-200">
                        <td className="px-2.5 py-1.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 text-center align-middle">
                          Escudo (URL):
                        </td>
                        <td className="px-2.5 py-1 text-slate-900 font-mono text-[9px] text-center align-middle">
                          <div className="max-w-md bg-white p-2 rounded border border-slate-200 text-slate-900 font-sans mx-auto">
                            <ImageUploadInput
                              id="report-escudoUrl"
                              label="Escudo del Club"
                              value={escudoUrl}
                              onChange={setEscudoUrl}
                              folderName="team_crests"
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                    {isEditing && (
                      <tr className="border-b border-slate-200">
                        <td className="px-2.5 py-1.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 text-center align-middle">
                          Foto (URL):
                        </td>
                        <td className="px-2.5 py-1 text-slate-900 font-mono text-[9px] text-center align-middle">
                          <div className="max-w-md bg-white p-2 rounded border border-slate-200 text-slate-900 font-sans mx-auto">
                            <ImageUploadInput
                              id="report-fotoUrl"
                              label="Foto del Jugador"
                              value={fotoUrl}
                              onChange={setFotoUrl}
                              folderName="player_photos"
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-slate-200">
                      <td className="px-2.5 py-1.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 text-center align-middle">
                        Pie / Altura:
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-900 font-mono text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5 w-full mx-auto">
                          <span className="font-bold text-slate-700">{player.lateralidad}</span>
                          <span>/</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={altura}
                              onChange={(e) => setAltura(e.target.value)}
                              className="w-20 bg-white text-[10px] border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 text-slate-900 text-center"
                              placeholder="1.84 m"
                            />
                          ) : (
                            <span className="text-slate-600">{altura}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Column: Posicion with Interactive Soccer Pitch */}
              <div className="md:col-span-4 p-2.5 bg-slate-50 border border-slate-200 rounded flex flex-col justify-between">
                <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest text-center block mb-1 font-mono">
                  POSICION (TÁCTICA)
                </span>
                
                <SoccerPitch 
                  x={pitchX} 
                  y={pitchY} 
                  onChange={isEditing ? ({ x, y }) => {
                    setPitchX(x);
                    setPitchY(y);
                  } : undefined}
                />
              </div>
            </div>

            {/* Block 2: DESCRIPCIÓN GENERAL (SmartBank Black Title Bar) */}
            <div className="my-3.5">
              <div className="bg-slate-950 font-bold text-white text-[10px] py-1 px-3 uppercase tracking-wider text-center rounded-t-sm">
                DESCRIPCIÓN GENERAL
              </div>
              <div className="bg-slate-50 p-3.5 text-[11px] text-slate-750 border-x border-b border-slate-250 leading-relaxed font-sans text-justify">
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={descripcionGeneral}
                    onChange={(e) => setDescripcionGeneral(e.target.value)}
                    className="w-full text-xs bg-white text-slate-900 border border-slate-300 rounded p-2 focus:outline-none focus:border-blue-500 leading-relaxed font-sans shadow-inner"
                    placeholder="Escriba aquí la síntesis general de las habilidades y rol del jugador..."
                  />
                ) : (
                  descripcionGeneral || 'No hay descripción general redactada.'
                )}
              </div>
            </div>

            {/* Block 3: FORTALEZAS (Gray bar style) */}
            <div className="my-3.5">
              <div className="bg-slate-500 font-bold text-white text-[10px] py-1 px-3 uppercase tracking-wider text-center rounded-t-sm">
                FORTALEZAS
              </div>
              <div className="bg-slate-50 p-3.5 border-x border-b border-slate-250">
                {isEditing ? (
                  <div>
                    <span className="text-[9px] text-slate-500 italic mb-1 block">Escriba una fortaleza por línea (sin viñetas):</span>
                    <textarea
                      rows={3}
                      value={fortalezas}
                      onChange={(e) => setFortalezas(e.target.value)}
                      className="w-full text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded p-2 focus:outline-none focus:border-slate-500 shadow-inner"
                      placeholder="Ej: Dominio absoluto del pase largo en juego directo."
                    />
                  </div>
                ) : (
                  <ul className="space-y-1.5 list-none">
                    {renderStringBullets(fortalezas)}
                  </ul>
                )}
              </div>
            </div>

            {/* Block 4: DEBILIDADES (Crimson red bar style) */}
            <div className="my-3.5">
              <div className="bg-red-800 font-bold text-white text-[10px] py-1 px-3 uppercase tracking-wider text-center rounded-t-sm">
                DEBILIDADES
              </div>
              <div className="bg-red-50/15 p-3.5 border-x border-b border-slate-250">
                {isEditing ? (
                  <div>
                    <span className="text-[9px] text-slate-500 italic mb-1 block">Escriba una debilidad por línea (sin viñetas):</span>
                    <textarea
                      rows={3}
                      value={debilidades}
                      onChange={(e) => setDebilidades(e.target.value)}
                      className="w-full text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded p-2 focus:outline-none focus:border-red-400 shadow-inner"
                      placeholder="Ej: Sufre en la marca corporal frente a delanteros corpulentos."
                    />
                  </div>
                ) : (
                  <ul className="space-y-1.5 list-none">
                    {renderRedStringBullets(debilidades)}
                  </ul>
                )}
              </div>
            </div>

            {/* Block 5: EN SU EQUIPO */}
            <div className="my-3.5">
              <div className="bg-slate-750 font-bold text-white text-[10px] py-1 px-3 uppercase tracking-wider text-center rounded-t-sm">
                EN SU EQUIPO
              </div>
              <div className="bg-slate-50 p-3.5 text-[11px] text-slate-750 border-x border-b border-slate-250 leading-relaxed font-sans text-justify">
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={enSuEquipo}
                    onChange={(e) => setEnSuEquipo(e.target.value)}
                    className="w-full text-xs bg-white text-slate-900 border border-slate-300 rounded p-2 focus:outline-none focus:border-slate-600 leading-relaxed font-sans shadow-inner"
                    placeholder="Escriba su rol táctico e importancia del jugador en el club actual..."
                  />
                ) : (
                  enSuEquipo || 'No hay rol del equipo especificado.'
                )}
              </div>
            </div>

            {/* Block 6: Side-by-side grids (EN POCAS PALABRAS vs TIENE VALOR POR) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              
              {/* Box 1 */}
              <div>
                <div className="bg-emerald-800 font-bold text-white text-[10px] py-1 px-3 uppercase tracking-wider text-center rounded-t-sm">
                  EN POCAS PALABRAS
                </div>
                <div className="bg-slate-50 p-3 border-x border-b border-slate-250 min-h-36 max-h-48 overflow-y-auto">
                  {isEditing ? (
                    <textarea
                      rows={4}
                      value={enPocasPalabras}
                      onChange={(e) => setEnPocasPalabras(e.target.value)}
                      className="w-full text-[10px] font-mono bg-white text-slate-900 border border-slate-300 rounded p-1.5 focus:outline-none focus:border-emerald-600 h-full"
                      placeholder="Palabras clave en línea..."
                    />
                  ) : (
                    <ul className="space-y-1.5">
                      {renderStringBullets(enPocasPalabras)}
                    </ul>
                  )}
                </div>
              </div>

              {/* Box 2 */}
              <div>
                <div className="bg-emerald-800 font-bold text-white text-[10px] py-1 px-3 uppercase tracking-wider text-center rounded-t-sm">
                  TIENE VALOR POR
                </div>
                <div className="bg-slate-50 p-3 border-x border-b border-slate-250 min-h-36 max-h-48 overflow-y-auto">
                  {isEditing ? (
                    <textarea
                      rows={4}
                      value={tieneValorPor}
                      onChange={(e) => setTieneValorPor(e.target.value)}
                      className="w-full text-[10px] font-mono bg-white text-slate-900 border border-slate-300 rounded p-1.5 focus:outline-none focus:border-emerald-600 h-full"
                      placeholder="Atributos clave que le confieren valor comercial..."
                    />
                  ) : (
                    <ul className="space-y-1.5">
                      {renderStringBullets(tieneValorPor)}
                    </ul>
                  )}
                </div>
              </div>

            </div>

            {/* Document Seal Footer */}
            <div className="flex items-center justify-between text-[7.5px] text-slate-400 font-mono mt-6 pt-3.5 border-t border-slate-200">
              <span>DOCUMENTO OFICIAL REF: REAL_AVILES_OJEADOS_{player.id}</span>
              <span>LFP OFICIAL DEPARTAMENTO SCOUTING REGLAMENTO DEPORTIVO</span>
              <span>FIRMADO ELECTRÓNICAMENTE</span>
            </div>

          </div>
        </div>

        {/* Modal Action Save Buttons */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-t border-slate-800">
          <div>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-red-600 hover:bg-red-550 text-white rounded font-bold shadow-md transition-all hover:scale-[1.02] active:scale-95"
              title="Exportar documento oficial a PDF"
            >
              <Download className="w-4 h-4 text-red-100" />
              <span>Exportar PDF</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-white rounded border border-slate-700 font-bold transition-all hover:scale-102 active:scale-95"
            >
              Cancelar
            </button>
            
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-550 text-white rounded font-bold shadow-md transition-all hover:scale-[1.02] active:scale-95"
            >
              <Check className="w-4 h-4 text-emerald-100" />
              <span>Guardar Informe Oficial</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
