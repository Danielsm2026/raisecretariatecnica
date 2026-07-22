import React, { useState, useEffect } from 'react';
import { ScoutedPlayer, Position, Footedness } from '../types';
import { 
  Star, 
  ShieldAlert, 
  Edit, 
  Trash2, 
  Calendar, 
  Target, 
  Award, 
  Briefcase, 
  FileText, 
  Check, 
  X, 
  Sparkles, 
  Compass, 
  User 
} from 'lucide-react';
import { ensureReportFields } from '../utils/reportDefaults';
import { getPlayerEscudoUrl } from '../utils/escudoHelper';
import ImageUploadInput from './ImageUploadInput';

interface PlayerDetailsProps {
  player: ScoutedPlayer | null;
  onEdit: (player: ScoutedPlayer) => void;
  onDelete: (id: string) => void;
  onSaveReport?: (player: ScoutedPlayer) => void;
}

// Interactive Mini-Soccer Pitch
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
    // Boundary checks
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

export default function PlayerDetails({ 
  player, 
  onEdit, 
  onDelete, 
  onSaveReport 
}: PlayerDetailsProps) {
  const [activeTab, setActiveTab] = useState<'radar' | 'document'>('document');
  const [isEditingReport, setIsEditingReport] = useState(false);
  
  // Local edit states mirroring the document fields
  const [nombre, setNombre] = useState('');
  const [equipo, setEquipo] = useState('');
  const [escudoUrl, setEscudoUrl] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [altura, setAltura] = useState('1.78 m');
  const [recomendacion, setRecomendacion] = useState('FIRMAR');
  const [recomendacionComentario, setRecomendacionComentario] = useState('');
  const [descripcionGeneral, setDescripcionGeneral] = useState('');
  const [fortalezas, setFortalezas] = useState('');
  const [debilidades, setDebilidades] = useState('');
  const [enSuEquipo, setEnSuEquipo] = useState('');
  const [enPocasPalabras, setEnPocasPalabras] = useState('');
  const [tieneValorPor, setTieneValorPor] = useState('');
  const [pitchX, setPitchX] = useState(50);
  const [pitchY, setPitchY] = useState(50);

  // Sync state with incoming player selection
  useEffect(() => {
    if (player) {
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
    }
    setIsEditingReport(false);
  }, [player]);

  if (!player) {
    return (
      <div id="player-details-empty" className="bg-slate-900 rounded-lg border border-slate-800 shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[450px] text-slate-300">
        <div className="bg-slate-800 text-slate-500 p-4 rounded-full mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold font-display text-white mb-1">Ningún Jugador Seleccionado</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Selecciona un jugador de la tabla para ver su ficha técnica detallada, su radar de rendimiento y redactar notas.
        </p>
      </div>
    );
  }

  const currentYear = 2026;
  const edad = currentYear - player.anoNacimiento;

  // Render yellow stars based on rating
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`w-3.5 h-3.5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-750'}`} 
      />
    ));
  };

  // SVG Radar coordinates
  const fVal = player.atributos.fisico;
  const tVal = player.atributos.tecnica;
  const tacVal = player.atributos.tactica;
  const mVal = player.atributos.mental;

  const pFisico = { x: 50, y: 50 - (40 * fVal) / 10 };
  const pTecnica = { x: 50 + (40 * tVal) / 10, y: 50 };
  const pTactica = { x: 50, y: 50 + (40 * tacVal) / 10 };
  const pMental = { x: 50 - (40 * mVal) / 10, y: 50 };

  const polygonPoints = `${pFisico.x},${pFisico.y} ${pTecnica.x},${pTecnica.y} ${pTactica.x},${pTactica.y} ${pMental.x},${pMental.y}`;

  // Format market value helper
  const formatVal = (val?: number) => {
    if (!val) return 'No declarado';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M €`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K €`;
    return `${val} €`;
  };

  // Handles updating the player's core document
  const handleSaveReportEdits = () => {
    if (!onSaveReport) return;

    // Package the new values back to the parent state
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
    setIsEditingReport(false);
  };

  // Format single multiline text into visual list elements
  const renderStringBullets = (text: string) => {
    if (!text.trim()) return <li className="text-slate-500 italic">Ningún punto documentado</li>;
    return text.split('\n').map((line, idx) => {
      const cleaned = line.trim().replace(/^[\s·•\-*\d+.)]+/, ''); // strip existing bullet points
      if (!cleaned) return null;
      return (
        <li key={idx} className="flex items-start gap-2 text-slate-700 leading-snug">
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-1.5 flex-shrink-0" />
          <span>{cleaned}</span>
        </li>
      );
    });
  };

  const renderRedStringBullets = (text: string) => {
    if (!text.trim()) return <li className="text-slate-500 italic">Ningún punto documentado</li>;
    return text.split('\n').map((line, idx) => {
      const cleaned = line.trim().replace(/^[\s·•\-*\d+.)]+/, '');
      if (!cleaned) return null;
      return (
        <li key={idx} className="flex items-start gap-2 text-slate-800 leading-snug font-medium">
          <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0" />
          <span>{cleaned}</span>
        </li>
      );
    });
  };

  return (
    <div id={`player-details-card-${player.id}`} className="bg-slate-900 rounded-lg border border-slate-800 shadow-sm overflow-hidden sticky top-6 text-slate-200">
      
      {/* Selecting toolbar removed as requested to keep the document view clean and uncluttered */}

      {/* RENDER TAB 1: TRADITIONAL RADAR & METRICS VIEW */}
      {activeTab === 'radar' && (
        <div className="p-6 space-y-5">
          <div className="bg-slate-950/40 p-4 rounded border border-slate-850">
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold border border-blue-500/20 inline-block mb-2 uppercase tracking-widest font-mono">
              {player.posicion}
            </span>
            <h2 className="text-lg font-bold font-display text-white leading-tight">{player.nombre}</h2>
            <p className="text-slate-400 text-xs font-mono">{player.equipo}</p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/75 p-3 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1 italic">Nacimiento</span>
              <div className="flex items-center text-slate-300 font-medium text-xs font-mono">
                <Calendar className="w-4 h-4 text-slate-500 mr-2" />
                <span>{player.anoNacimiento} ({edad} años)</span>
              </div>
            </div>
            <div className="bg-slate-950/75 p-3 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1 italic">Lateralidad</span>
              <div className="flex items-center text-slate-300 font-medium text-xs font-mono">
                <Target className="w-4 h-4 text-slate-500 mr-2" />
                <span className={`px-2 py-0.25 rounded text-[10px] font-bold border ${
                  player.lateralidad === 'Zurdo' ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/40' :
                  player.lateralidad === 'Diestro' ? 'bg-teal-950/40 text-teal-400 border-teal-900/40' : 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                }`}>{player.lateralidad}</span>
              </div>
            </div>
            <div className="bg-slate-950/75 p-3 rounded border border-slate-800/80 col-span-2">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1 italic">Estatus Financiero y Calificación</span>
              <div className="flex items-center justify-between text-white font-mono font-bold text-sm">
                <div className="flex items-center">
                  <Briefcase className="w-4 h-4 text-slate-500 mr-1.5" />
                  <span>{formatVal(player.valorMercado)}</span>
                </div>
                <div className="flex items-center space-x-0.5 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-750">
                  {renderStars(player.calificacion)}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Radar Matrix */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center italic">
              <Award className="w-4 h-4 text-blue-500 mr-1.5" /> MATRIZ DE RENDIMIENTO RADAR
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950/40 p-4 rounded border border-slate-850">
              {/* Radar Drawing */}
              <div className="flex justify-center">
                <svg viewBox="0 0 100 100" className="w-28 h-28 text-slate-600">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,2" />
                  <circle cx="50" cy="50" r="28" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,2" />
                  <circle cx="50" cy="50" r="16" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="50" y1="10" x2="50" y2="90" stroke="#1e293b" strokeWidth="0.5" />
                  <line x1="10" y1="50" x2="90" y2="50" stroke="#1e293b" strokeWidth="0.5" />
                  
                  <text x="50" y="8" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#64748b" fontFamily="monospace">FÍS</text>
                  <text x="94" y="52" textAnchor="end" fontSize="6.5" fontWeight="bold" fill="#64748b" fontFamily="monospace">TÉC</text>
                  <text x="50" y="97" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#64748b" fontFamily="monospace">TAC</text>
                  <text x="6" y="52" textAnchor="start" fontSize="6.5" fontWeight="bold" fill="#64748b" fontFamily="monospace">MEN</text>

                  <polygon points={polygonPoints} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="1.5" />
                  <circle cx={pFisico.x} cy={pFisico.y} r="1.5" fill="#3b82f6" />
                  <circle cx={pTecnica.x} cy={pTecnica.y} r="1.5" fill="#3b82f6" />
                  <circle cx={pTactica.x} cy={pTactica.y} r="1.5" fill="#3b82f6" />
                  <circle cx={pMental.x} cy={pMental.y} r="1.5" fill="#3b82f6" />
                </svg>
              </div>

              {/* Slider Bars */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-0.5 font-mono">
                    <span>Físico</span>
                    <span className="text-white font-bold">{fVal}/10</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${fVal * 10}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-0.5 font-mono">
                    <span>Técnica</span>
                    <span className="text-white font-bold">{tVal}/10</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${tVal * 10}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-0.5 font-mono">
                    <span>Táctica</span>
                    <span className="text-white font-bold">{tacVal}/10</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${tacVal * 10}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-0.5 font-mono">
                    <span>Mental</span>
                    <span className="text-white font-bold">{mVal}/10</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${mVal * 10}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 italic">Notas básicas de observador</h4>
            <blockquote className="bg-slate-950/50 p-3 rounded text-[11px] text-slate-400 font-sans italic border-l-2 border-slate-700">
              "{player.notas || 'No se han registrado anotaciones para este prospecto escolar.'}"
            </blockquote>
          </div>
          
          <div className="text-[9px] text-slate-500 text-right font-mono">
            ID: {player.id} | EDITADO: {player.fechaRegistro}
          </div>
        </div>
      )}

      {/* RENDER TAB 2: RICH DOCUMENTARY "INFORME DESCRIPTIVO" (FC CARTAGENA PDF STYLE) */}
      {activeTab === 'document' && (
        <div className="p-4 bg-slate-100 text-slate-900 font-sans border border-slate-350 shadow-inner max-h-[82vh] overflow-y-auto rounded-b">
          
          {/* Mock PDF Document Box Sheet container */}
          <div className="bg-white p-5 border border-slate-300 rounded shadow-md class-pdf-layout relative select-text">
            
            {/* Header Plate border line */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3">
              <span className="bg-slate-950 text-white font-mono font-bold text-[9px] px-2 py-1 tracking-widest uppercase">
                DEPARTAMENTO DE SCOUTING
              </span>
              <div className="text-right">
                <span className="text-xs font-bold font-sans tracking-wide text-slate-700">
                  FC CARTAGENA SAD
                </span>
              </div>
            </div>

            {/* Document Title bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 my-4">
              <div className="flex items-center space-x-2">
                {/* Visual Circle instead of broken image banner */}
                <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-50 flex items-center justify-center font-bold text-slate-800 text-xs shadow-inner">
                  LFP
                </div>
                <div className="leading-none">
                  <p className="text-[8px] font-sans text-slate-500 font-semibold tracking-wider">LaLiga</p>
                  <p className="text-[7px] font-mono text-slate-400">SmartBank</p>
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="font-extrabold text-[15px] font-sans text-slate-850 tracking-wider uppercase border-b border-slate-300 pb-0.5 inline-block">
                  INFORME DESCRIPTIVO
                </h3>
              </div>

              {/* Black recommendation badge "FIRMAR" block */}
              <div className="flex justify-end">
                {isEditingReport ? (
                  <div className="w-full max-w-[150px] bg-slate-900 text-white p-2 rounded border border-slate-800 text-left">
                    <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-1">Recomendación</label>
                    <select
                      value={recomendacion}
                      onChange={(e) => setRecomendacion(e.target.value)}
                      className="w-full text-2xs bg-slate-800 text-white border border-slate-700 rounded px-1 py-0.5 focus:outline-none"
                    >
                      <option value="FIRMAR">FIRMAR</option>
                      <option value="SEGUIR">SEGUIR</option>
                      <option value="INTERESANTE">INTERESANTE</option>
                      <option value="EVALUAR">EVALUAR</option>
                      <option value="DESCARTAR">DESCARTAR</option>
                    </select>
                    <input
                      type="text"
                      value={recomendacionComentario}
                      onChange={(e) => setRecomendacionComentario(e.target.value)}
                      placeholder="Comentarios de recomendación"
                      className="w-full text-[9px] bg-slate-800 text-white border border-slate-700 rounded px-1 py-0.5 mt-1 focus:outline-none placeholder-slate-500"
                    />
                  </div>
                ) : (
                  <div className="bg-slate-950 text-white px-3 py-2 rounded text-right max-w-[180px] border border-slate-850">
                    <p className={`text-center font-extrabold text-xs tracking-widest uppercase transition-colors ${
                      (recomendacion === 'FIRMAR' || recomendacion === 'CONTRATAR') ? 'text-green-400' :
                      (recomendacion === 'SEGUIR' || recomendacion === 'SEGUIMIENTO') ? 'text-blue-400' :
                      (recomendacion === 'EVALUAR' || recomendacion === 'INTERESANTE') ? 'text-amber-400' : 'text-red-500'
                    }`}>
                      ★ {recomendacion}
                    </p>
                    <p className="text-[8px] font-sans text-slate-300 leading-tight mt-0.5 text-center truncate" title={recomendacionComentario}>
                      {recomendacionComentario || 'Con nivel y experiencia en la categoría.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Row 1: Player Name header and info table */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch my-3">
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

                {isEditingReport ? (
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full text-center text-xs font-bold border border-slate-300 rounded px-1 py-0.5 mt-1 focus:outline-none"
                    placeholder="Nombre Completo"
                  />
                ) : (
                  <h4 className="text-center font-extrabold text-xs text-red-700 tracking-tight leading-tight mt-1 truncate max-w-full uppercase">
                    {nombre}
                  </h4>
                )}
                <p className="text-[8px] font-semibold text-slate-400 font-mono mt-0.5">{player.posicion.toUpperCase()}</p>
              </div>

              {/* Middle Column: Metadata Table */}
              <div className="md:col-span-5 flex flex-col justify-between">
                <table className="w-full text-[10px] border-collapse bg-white border border-slate-355 rounded overflow-hidden h-full">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-2.5 py-2 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 w-1/3 text-center align-middle">
                        Fecha / Edad:
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-900 font-mono font-medium text-center align-middle">
                        <div className="text-center w-full">{player.anoNacimiento} ({edad} años)</div>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-2.5 py-2 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 text-center align-middle">
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
                          {isEditingReport ? (
                            <input
                              type="text"
                              value={equipo}
                              onChange={(e) => setEquipo(e.target.value)}
                              className="w-full bg-slate-50 text-[10px] border border-slate-300 rounded px-1 py-0.5 focus:outline-none text-center"
                              placeholder="Nombre del Club"
                            />
                          ) : (
                            <span>{equipo}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isEditingReport && (
                      <tr className="border-b border-slate-200">
                        <td className="px-2.5 py-2 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 text-center align-middle">
                          Escudo del Club:
                        </td>
                        <td className="px-2.5 py-2 text-slate-900 font-mono text-[10px] text-center align-middle">
                          <div className="max-w-md bg-slate-50 p-2 rounded border border-slate-200 text-slate-900 mx-auto">
                            <ImageUploadInput
                              id="details-escudoUrl"
                              label="Escudo del Club"
                              value={escudoUrl}
                              onChange={setEscudoUrl}
                              folderName="team_crests"
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                    {isEditingReport && (
                      <tr className="border-b border-slate-200">
                        <td className="px-2.5 py-2 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 text-center align-middle">
                          Foto del Jugador:
                        </td>
                        <td className="px-2.5 py-2 text-slate-900 font-mono text-[10px] text-center align-middle">
                          <div className="max-w-md bg-slate-50 p-2 rounded border border-slate-200 text-slate-900 mx-auto">
                            <ImageUploadInput
                              id="details-fotoUrl"
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
                      <td className="px-2.5 py-2 font-bold bg-slate-100 text-slate-700 border-r border-slate-200 text-center align-middle">
                        Pie / Altura:
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-900 font-mono text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5 w-full mx-auto">
                          <span className="font-bold text-slate-700">{player.lateralidad}</span>
                          <span>/</span>
                          {isEditingReport ? (
                            <input
                              type="text"
                              value={altura}
                              onChange={(e) => setAltura(e.target.value)}
                              className="w-16 bg-slate-50 text-[10px] border border-slate-300 rounded px-1 py-0.5 focus:outline-none text-center"
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

              {/* Right Column: Posicion pitch with Click-to-Coordinate indicator */}
              <div className="md:col-span-4 p-2 bg-slate-50 border border-slate-220 rounded flex flex-col justify-between">
                <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest text-center block mb-1 font-mono">
                  POSICION
                </span>
                
                {/* Soccer field coordinates box */}
                <SoccerPitch 
                  x={pitchX} 
                  y={pitchY} 
                  onChange={isEditingReport ? ({ x, y }) => {
                    setPitchX(x);
                    setPitchY(y);
                  } : undefined}
                />
              </div>
            </div>

            {/* Block 2: DESCRIPCIÓN GENERAL (LaLiga SmartBank style black header) */}
            <div className="my-3">
              <div className="bg-slate-950 font-bold text-white text-[9.5px] py-1 px-3 uppercase tracking-wider text-center">
                DESCRIPCIÓN GENERAL
              </div>
              <div className="bg-slate-100/70 p-3 text-[11px] text-slate-700 border-x border-b border-slate-250 leading-relaxed font-sans text-justify">
                {isEditingReport ? (
                  <textarea
                    rows={3}
                    value={descripcionGeneral}
                    onChange={(e) => setDescripcionGeneral(e.target.value)}
                    className="w-full text-xs bg-white text-slate-900 border border-slate-300 rounded p-1.5 focus:outline-none leading-relaxed font-sans"
                    placeholder="Redacte la síntesis analítica general de las características..."
                  />
                ) : (
                  descripcionGeneral || 'No hay descripción general redactada.'
                )}
              </div>
            </div>

            {/* Block 3: FORTALEZAS (Gray header plate) */}
            <div className="my-3">
              <div className="bg-slate-500 font-bold text-white text-[9.5px] py-1 px-3 uppercase tracking-wider text-center">
                FORTALEZAS
              </div>
              <div className="bg-slate-100/70 p-3 border-x border-b border-slate-250">
                {isEditingReport ? (
                  <div>
                    <span className="text-[9px] text-slate-500 italic mb-1 block">Ingrese una fortaleza por línea (sin viñetas):</span>
                    <textarea
                      rows={3}
                      value={fortalezas}
                      onChange={(e) => setFortalezas(e.target.value)}
                      className="w-full text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded p-1.5 focus:outline-none"
                      placeholder="Ej: Técnicamente muy bueno en portería."
                    />
                  </div>
                ) : (
                  <ul className="space-y-1.5 text-[11px]">
                    {renderStringBullets(fortalezas)}
                  </ul>
                )}
              </div>
            </div>

            {/* Block 4: DEBILIDADES (Crimson red header plate) */}
            <div className="my-3">
              <div className="bg-red-800 font-bold text-white text-[9.5px] py-1 px-3 uppercase tracking-wider text-center">
                DEBILIDADES
              </div>
              <div className="bg-slate-100/70 p-3 border-x border-b border-slate-250">
                {isEditingReport ? (
                  <div>
                    <span className="text-[9px] text-slate-500 italic mb-1 block">Ingrese una debilidad por línea (sin viñetas):</span>
                    <textarea
                      rows={2.5}
                      value={debilidades}
                      onChange={(e) => setDebilidades(e.target.value)}
                      className="w-full text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded p-1.5 focus:outline-none"
                      placeholder="Ej: Le falta algo de altura."
                    />
                  </div>
                ) : (
                  <ul className="space-y-1.5 text-[11px]">
                    {renderRedStringBullets(debilidades)}
                  </ul>
                )}
              </div>
            </div>

            {/* Block 5: EN SU EQUIPO */}
            <div className="my-3">
              <div className="bg-slate-700 font-bold text-white text-[9.5px] py-1 px-3 uppercase tracking-wider text-center">
                EN SU EQUIPO
              </div>
              <div className="bg-slate-100/70 p-3 text-[11px] text-slate-700 border-x border-b border-slate-250 leading-relaxed font-sans text-justify">
                {isEditingReport ? (
                  <textarea
                    rows={2}
                    value={enSuEquipo}
                    onChange={(e) => setEnSuEquipo(e.target.value)}
                    className="w-full text-xs bg-white text-slate-900 border border-slate-300 rounded p-1.5 focus:outline-none leading-relaxed font-sans"
                    placeholder="Redacte su situación de minutos/rol actual..."
                  />
                ) : (
                  enSuEquipo || 'No hay rol del equipo especificado.'
                )}
              </div>
            </div>

            {/* Block 6: Side-by-side grids (EN POCAS PALABRAS vs TIENE VALOR POR) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
              
              {/* Column 1 */}
              <div>
                <div className="bg-emerald-800 font-bold text-white text-[9.5px] py-1 px-3 uppercase tracking-wider text-center">
                  EN POCAS PALABRAS
                </div>
                <div className="bg-slate-100/70 p-3 border-x border-b border-slate-250 h-36 overflow-y-auto">
                  {isEditingReport ? (
                    <textarea
                      rows={4}
                      value={enPocasPalabras}
                      onChange={(e) => setEnPocasPalabras(e.target.value)}
                      className="w-full text-[10px] font-mono bg-white text-slate-900 border border-slate-300 rounded p-1.5 focus:outline-none h-full"
                      placeholder="Puntos rápidos por línea..."
                    />
                  ) : (
                    <ul className="space-y-1.5 text-[10.5px]">
                      {renderStringBullets(enPocasPalabras)}
                    </ul>
                  )}
                </div>
              </div>

              {/* Column 2 */}
              <div>
                <div className="bg-emerald-800 font-bold text-white text-[9.5px] py-1 px-3 uppercase tracking-wider text-center">
                  TIENE VALOR POR
                </div>
                <div className="bg-slate-100/70 p-3 border-x border-b border-slate-250 h-36 overflow-y-auto">
                  {isEditingReport ? (
                    <textarea
                      rows={4}
                      value={tieneValorPor}
                      onChange={(e) => setTieneValorPor(e.target.value)}
                      className="w-full text-[10px] font-mono bg-white text-slate-900 border border-slate-300 rounded p-1.5 focus:outline-none h-full"
                      placeholder="Atributos de valor por línea..."
                    />
                  ) : (
                    <ul className="space-y-1.5 text-[10.5px]">
                      {renderStringBullets(tieneValorPor)}
                    </ul>
                  )}
                </div>
              </div>

            </div>

            {/* Document Footer seal decoration stamp */}
            <div className="flex items-center justify-between text-[7px] text-slate-400 font-mono mt-5 pt-3 border-t border-slate-200">
              <span>DOCUMENT_REF: ID-{player.id}</span>
              <span>LFP OFICIAL DEPARTAMENTO SCOUTING REGLAMENTO DEPORTIVO</span>
              <span>FIRMADO ELECTRÓNICAMENTE</span>
            </div>

          </div>
          
          {/* Paper shadow overlay tips */}
          <p className="text-[10px] text-center text-slate-500 font-sans italic mt-2.5">
            💡 Consejo: Haz clic en "Editar Documento" para registrar los datos. Puedes hacer clic en la pestaña "Radar y Atributos" para ver diagramas de rendimiento.
          </p>

        </div>
      )}
    </div>
  );
}
