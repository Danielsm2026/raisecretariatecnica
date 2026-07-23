import React, { useState, useEffect } from 'react';
import { ScoutedPlayer, Position, Footedness } from '../types';
import { X, Award, Info, Trash2 } from 'lucide-react';
import ImageUploadInput from './ImageUploadInput';

interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (player: Omit<ScoutedPlayer, 'id' | 'fechaRegistro'> & { id?: string }) => void;
  onDeletePlayer?: (id: string) => void;
  playerToEdit?: ScoutedPlayer | null;
}

const POSITIONS: Position[] = [
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

const FOOTEDNESS_OPTIONS: Footedness[] = [
  'Diestro',
  'Zurdo',
  'Ambidiestro'
];

export default function PlayerFormModal({ isOpen, onClose, onSave, onDeletePlayer, playerToEdit }: PlayerFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [equipo, setEquipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [posicion, setPosicion] = useState<Position>('Mediocentro');
  const [anoNacimiento, setAnoNacimiento] = useState<number>(2003);
  const [lateralidad, setLateralidad] = useState<Footedness>('Diestro');
  const [valorMercado, setValorMercado] = useState<number>(10000000); // 10M Default
  const [calificacion, setCalificacion] = useState<number>(4);
  const [notas, setNotas] = useState('');
  const [elo, setElo] = useState<number | undefined>(undefined);
  const [altura, setAltura] = useState<string>('');
  const [escudoUrl, setEscudoUrl] = useState<string>('');
  const [fotoUrl, setFotoUrl] = useState<string>('');
  
  // Attributes
  const [fisico, setFisico] = useState<number>(8);
  const [tecnica, setTecnica] = useState<number>(8);
  const [tactica, setTactica] = useState<number>(8);
  const [mental, setMental] = useState<number>(8);

  const [valoracionFisica, setValoracionFisica] = useState<Record<string, number>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Populate form if editing
  useEffect(() => {
    setShowConfirmDelete(false);
    if (playerToEdit) {
      setNombre(playerToEdit.nombre);
      setEquipo(playerToEdit.equipo);
      setCategoria(playerToEdit.categoria || '');
      setPosicion(playerToEdit.posicion);
      setAnoNacimiento(playerToEdit.anoNacimiento);
      setLateralidad(playerToEdit.lateralidad);
      setValorMercado(playerToEdit.valorMercado || 0);
      setCalificacion(playerToEdit.calificacion);
      setNotas(playerToEdit.notas);
      setFisico(playerToEdit.atributos.fisico);
      setTecnica(playerToEdit.atributos.tecnica);
      setTactica(playerToEdit.atributos.tactica);
      setMental(playerToEdit.atributos.mental);
      setElo(playerToEdit.elo);
      setAltura(playerToEdit.altura || '');
      setEscudoUrl(playerToEdit.escudoUrl || '');
      setFotoUrl(playerToEdit.fotoUrl || '');
      setValoracionFisica(playerToEdit.valoracionFisica || {});
    } else {
      // Clear for new player
      setNombre('');
      setEquipo('');
      setCategoria('');
      setPosicion('Mediocentro');
      setAnoNacimiento(2004);
      setLateralidad('Diestro');
      setValorMercado(5000000); // 5M Base
      setCalificacion(3);
      setNotas('');
      setFisico(7);
      setTecnica(7);
      setTactica(7);
      setMental(7);
      setElo(undefined);
      setAltura('');
      setEscudoUrl('');
      setFotoUrl('');
      setValoracionFisica({});
    }
    setErrors({});
  }, [playerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nombre.trim()) newErrors.nombre = 'El nombre es obligatorio.';
    if (!equipo.trim()) newErrors.equipo = 'El equipo es obligatorio.';
    if (anoNacimiento < 1980 || anoNacimiento > 2018) {
      newErrors.anoNacimiento = 'El año de nacimiento debe estar entre 1980 y 2018.';
    }
    if (valorMercado < 0) newErrors.valorMercado = 'El valor no puede ser negativo.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to top of modal if long
      return;
    }

    onSave({
      id: playerToEdit?.id,
      nombre: nombre.trim(),
      equipo: equipo.trim(),
      categoria: categoria.trim(),
      posicion,
      anoNacimiento,
      lateralidad,
      valorMercado: valorMercado || undefined,
      calificacion,
      notas: notas.trim(),
      atributos: {
        fisico,
        tecnica,
        tactica,
        mental
      },
      elo: elo || undefined,
      altura: altura.trim() || undefined,
      escudoUrl: escudoUrl.trim() || undefined,
      fotoUrl: fotoUrl.trim() || undefined,
      valoracionFisica
    });

    onClose();
  };

  return (
    <div id="player-form-modal-backdrop" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="player-form-modal-content"
        className="bg-slate-900 rounded-lg max-w-2xl w-full shadow-2xl border border-slate-800 overflow-hidden my-8 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-slate-850">
          <div>
            <h3 className="text-base font-bold font-display uppercase tracking-wider">
              {playerToEdit ? 'Editar Ficha de Scout' : 'Añadir Nuevo Futbolista'}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {playerToEdit ? `REGISTRO_ID: ${playerToEdit.id}` : 'Ingrese los parámetros de scouting para almacenar en el archivo deportivo'}
            </p>
          </div>
          <button 
            id="btn-close-scout-modal"
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Required Metadata columns */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center italic">
              <Info className="w-4 h-4 text-blue-500 mr-1.5" /> DATOS PRINCIPALES (OBLIGATORIOS)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Nombre */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Nombre Completo *</label>
                <input
                  id="input-player-nombre"
                  type="text"
                  placeholder="Ej: Lamine Yamal"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={`w-full text-xs px-3 py-2 bg-slate-850 text-white rounded border focus:outline-none focus:ring-1 ${
                    errors.nombre ? 'border-red-500 focus:ring-red-200' : 'border-slate-750 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.nombre && <p className="text-red-500 text-[10px] mt-1 font-mono">{errors.nombre}</p>}
              </div>

              {/* Equipo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Equipo / Club *</label>
                <input
                  id="input-player-equipo"
                  type="text"
                  placeholder="Ej: FC Barcelona"
                  value={equipo}
                  onChange={(e) => setEquipo(e.target.value)}
                  className={`w-full text-xs px-3 py-2 bg-slate-850 text-white rounded border focus:outline-none focus:ring-1 ${
                    errors.equipo ? 'border-red-500 focus:ring-red-200' : 'border-slate-755 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.equipo && <p className="text-red-500 text-[10px] mt-1 font-mono">{errors.equipo}</p>}
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Categoría / Liga</label>
                <div className="space-y-1.5">
                  <input
                    id="input-player-categoria"
                    type="text"
                    placeholder="Ej: Segunda RFEF, Primera RFEF"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-850 text-white rounded border border-slate-750 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex flex-wrap gap-1">
                    {['Primera RFEF', 'Segunda RFEF', 'Segunda División'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoria(cat)}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all active:scale-95 ${
                          categoria === cat 
                            ? 'bg-blue-600/30 border border-blue-500 text-blue-300 font-semibold' 
                            : 'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-750 text-slate-450'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Posicion */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Posición de Juego</label>
                <select
                  id="select-player-posicion"
                  value={posicion}
                  onChange={(e) => setPosicion(e.target.value as Position)}
                  className="w-full text-xs px-3 py-2 bg-slate-850 text-white border border-slate-750 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos} className="bg-slate-900">{pos}</option>
                  ))}
                </select>
              </div>

              {/* Año nacimiento */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Año de Nacimiento *</label>
                <input
                  id="input-player-anoNacimiento"
                  type="number"
                  min="1980"
                  max="2018"
                  placeholder="Ej: 2004"
                  value={anoNacimiento}
                  onChange={(e) => setAnoNacimiento(parseInt(e.target.value) || 2004)}
                  className={`w-full text-xs px-3 py-2 bg-slate-850 text-white rounded border focus:outline-none focus:ring-1 ${
                    errors.anoNacimiento ? 'border-red-500 focus:ring-red-200' : 'border-slate-750 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.anoNacimiento && <p className="text-red-500 text-[10px] mt-1 font-mono">{errors.anoNacimiento}</p>}
              </div>

              {/* Lateralidad */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Lateralidad (Pie Hábil)</label>
                <div id="radio-group-lateralidad" className="flex gap-2">
                  {FOOTEDNESS_OPTIONS.map((opt) => (
                    <button
                      id={`btn-lat-opt-${opt}`}
                      key={opt}
                      type="button"
                      onClick={() => setLateralidad(opt)}
                      className={`flex-1 py-1.5 text-2xs font-bold border rounded transition-all ${
                        lateralidad === opt 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                          : 'border-slate-700 hover:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor de mercado */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Valor de Mercado (€)</label>
                <div className="relative">
                  <input
                    id="input-player-valorMercado"
                    type="number"
                    step="500000"
                    placeholder="5000000"
                    value={valorMercado || ''}
                    onChange={(e) => setValorMercado(parseInt(e.target.value) || 0)}
                    className="w-full text-xs pl-3 pr-12 py-2 bg-slate-850 text-white border border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono font-bold">EUR</div>
                </div>
              </div>

              {/* Altura */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Altura (Ej: 1.84 m)</label>
                <input
                  id="input-player-altura"
                  type="text"
                  placeholder="Ej: 1.84 m"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-850 text-white border border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* ELO Rating */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Puntuación ELO</label>
                <input
                  id="input-player-elo"
                  type="number"
                  placeholder="Ej: 58"
                  value={elo || ''}
                  onChange={(e) => setElo(parseInt(e.target.value) || undefined)}
                  className="w-full text-xs px-3 py-2 bg-slate-850 text-white border border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Escudo URL */}
              <ImageUploadInput
                id="input-player-escudoUrl"
                label="Escudo del Club (Supabase / URL)"
                value={escudoUrl}
                onChange={setEscudoUrl}
                folderName="team_crests"
                placeholder="Ej: https://upload.wikimedia.org/.../logo.png"
              />

              {/* Foto URL */}
              <ImageUploadInput
                id="input-player-fotoUrl"
                label="Foto del Jugador (Supabase / URL)"
                value={fotoUrl}
                onChange={setFotoUrl}
                folderName="player_photos"
                placeholder="Ej: https://images.unsplash.com/... o url"
              />

            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Section 2: Attributes matrix */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center italic">
              <Award className="w-4 h-4 text-blue-500 mr-1.5" /> ATRIBUTOS CLAVE (1 AL 10)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* Fisico */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400 mb-1 font-mono">
                  <span>Físico</span>
                  <span className="text-blue-400 font-bold text-xs">{fisico}</span>
                </div>
                <input
                  id="slider-attribute-fisico"
                  type="range"
                  min="1"
                  max="10"
                  value={fisico}
                  onChange={(e) => setFisico(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Tecnica */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400 mb-1 font-mono">
                  <span>Técnica</span>
                  <span className="text-blue-400 font-bold text-xs">{tecnica}</span>
                </div>
                <input
                  id="slider-attribute-tecnica"
                  type="range"
                  min="1"
                  max="10"
                  value={tecnica}
                  onChange={(e) => setTecnica(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Tactica */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400 mb-1 font-mono">
                  <span>Táctica</span>
                  <span className="text-blue-400 font-bold text-xs">{tactica}</span>
                </div>
                <input
                  id="slider-attribute-tactica"
                  type="range"
                  min="1"
                  max="10"
                  value={tactica}
                  onChange={(e) => setTactica(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Mental */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400 mb-1 font-mono">
                  <span>Mental</span>
                  <span className="text-blue-400 font-bold text-xs">{mental}</span>
                </div>
                <input
                  id="slider-attribute-mental"
                  type="range"
                  min="1"
                  max="10"
                  value={mental}
                  onChange={(e) => setMental(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Overall & Comments */}
          <div className="space-y-4">
            {/* Calificacion global */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic">Calificación Global de Ojeador *</label>
              <div id="star-rating-selector" className="flex items-center space-x-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    id={`btn-star-rating-${i + 1}`}
                    key={i}
                    type="button"
                    onClick={() => setCalificacion(i + 1)}
                    className="focus:outline-none p-1 hover:scale-110 transition-transform"
                    title={`${i + 1} de 5 Estrellas`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-6 h-6 stroke-amber-400 stroke-[1.5] ${
                        i < calificacion ? 'fill-amber-400 text-amber-400' : 'fill-none text-slate-700'
                      }`}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
                <span className="text-[11px] font-mono font-bold text-slate-400 ml-2">
                  {calificacion === 5 ? 'Elite Mundial' :
                   calificacion === 4 ? 'Excelente prospecto' :
                   calificacion === 3 ? 'Rol titular potencial' :
                   calificacion === 2 ? 'Jugador de rotación' : 'A prueba'}
                </span>
              </div>
            </div>

            {/* Notas / Informe */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider italic font-sans">Informe Técnico / Observaciones complementarias</label>
              <textarea
                id="textarea-player-notas"
                rows={3}
                placeholder="Redacta puntos clave: velocidad de decisión, polivalencia táctica, fortaleza mental..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-850 text-white border border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans placeholder-slate-500"
              />
            </div>
          </div>

          {/* Buttons footer inside form */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div>
              {playerToEdit && onDeletePlayer && (
                !showConfirmDelete ? (
                  <button
                    id="btn-delete-scout-player"
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Borrar</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 bg-red-950/80 border border-red-500/60 px-3 py-1 rounded-lg">
                    <span className="text-[11px] font-bold text-red-200">¿Borrar jugador?</span>
                    <button
                      id="btn-confirm-delete-player"
                      type="button"
                      onClick={() => {
                        if (playerToEdit && onDeletePlayer) {
                          onDeletePlayer(playerToEdit.id);
                          onClose();
                        }
                      }}
                      className="px-2.5 py-1 text-2xs bg-red-600 hover:bg-red-500 text-white font-bold rounded transition-colors"
                    >
                      Sí, eliminar
                    </button>
                    <button
                      id="btn-cancel-delete-player"
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-2 py-1 text-2xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded transition-colors"
                    >
                      No
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                id="btn-cancel-modal-form"
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs text-slate-350 font-bold hover:bg-slate-800 border border-slate-750 bg-slate-850 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                id="btn-submit-modal-form"
                type="submit"
                className="px-5 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors shadow-sm uppercase tracking-widest"
              >
                Archivar Jugador
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
