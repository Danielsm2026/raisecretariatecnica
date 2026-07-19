import React, { useState, useEffect } from 'react';
import { VideoItem, ScoutedPlayer } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { 
  Play, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Link, 
  User, 
  Film, 
  Tag, 
  X, 
  Eye, 
  ExternalLink,
  PlusCircle,
  Video
} from 'lucide-react';

interface VideoLibraryProps {
  players: ScoutedPlayer[];
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

// Initial demo videos
const INITIAL_VIDEOS: VideoItem[] = [
  {
    id: 'v1',
    titulo: 'Análisis Táctico: Salida de Balón en 4-3-3',
    url: 'https://www.youtube.com/watch?v=sc_K1Qj72qQ',
    descripcion: 'Análisis minucioso sobre cómo romper líneas de presión alta utilizando el tercer hombre y la proyección de los laterales en un esquema ofensivo 4-3-3.',
    categoria: 'Táctica',
    fechaRegistro: '2026-05-10'
  },
  {
    id: 'v2',
    titulo: 'Defensa de Bloque Bajo y Transición',
    url: 'https://www.youtube.com/watch?v=F0O5U4eBvzo',
    descripcion: 'Ejemplos prácticos de basculaciones defensivas coordinadas, temporizaciones y velocidad en transiciones rápidas defensa-ataque tras robo en campo propio.',
    categoria: 'Defensa',
    fechaRegistro: '2026-05-18'
  },
  {
    id: 'v3',
    titulo: 'Movimientos de Desmarque - Delantero Centro',
    url: 'https://www.youtube.com/watch?v=Vl0zO5y82X0',
    descripcion: 'Vídeo técnico sobre desmarques de ruptura y de apoyo para habilitar segundas líneas o definir al primer toque en zona de finalización.',
    categoria: 'Análisis Individual',
    fechaRegistro: '2026-06-01'
  }
];

export default function VideoLibrary({ players, showNotification }: VideoLibraryProps) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string>('all');
  
  // Active Video for the modal player
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formCategoria, setFormCategoria] = useState('Análisis Individual');
  const [formJugadorId, setFormJugadorId] = useState('');

  // Categories list
  const CATEGORIES = [
    'Análisis Individual',
    'Táctica',
    'Defensa',
    'Ataque',
    'Físico',
    'Jugadas a Balón Parado',
    'Otros'
  ];

  // Load from localStorage on mount
  useEffect(() => {
    const savedVideos = localStorage.getItem('scouting_videoteca_db');
    if (savedVideos) {
      try {
        setVideos(JSON.parse(savedVideos));
      } catch (err) {
        setVideos(INITIAL_VIDEOS);
      }
    } else {
      setVideos(INITIAL_VIDEOS);
      localStorage.setItem('scouting_videoteca_db', JSON.stringify(INITIAL_VIDEOS));
    }
  }, []);

  // Save to localStorage
  const saveVideosToDb = (updatedVideos: VideoItem[]) => {
    setVideos(updatedVideos);
    localStorage.setItem('scouting_videoteca_db', JSON.stringify(updatedVideos));
  };

  // Extract YouTube ID
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getThumbnailUrl = (url: string): string => {
    const id = getYouTubeId(url);
    if (id) {
      return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    // Return a soccer-related placeholder image fallback
    return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=60';
  };

  const handleOpenAddForm = () => {
    setEditingVideo(null);
    setFormTitulo('');
    setFormUrl('');
    setFormDescripcion('');
    setFormCategoria('Análisis Individual');
    setFormJugadorId('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (video: VideoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVideo(video);
    setFormTitulo(video.titulo);
    setFormUrl(video.url);
    setFormDescripcion(video.descripcion || '');
    setFormCategoria(video.categoria || 'Análisis Individual');
    setFormJugadorId(video.jugadorId || '');
    setIsFormOpen(true);
  };

  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitulo.trim()) {
      showNotification('Por favor, indica un título descriptivo.', 'error');
      return;
    }

    if (!formUrl.trim()) {
      showNotification('Por favor, introduce el enlace del vídeo de YouTube.', 'error');
      return;
    }

    const videoId = getYouTubeId(formUrl);
    if (!videoId) {
      showNotification('El enlace introducido no parece ser un vídeo de YouTube válido.', 'error');
      return;
    }

    if (editingVideo) {
      // Edit mode
      const updated = videos.map(v => v.id === editingVideo.id ? {
        ...v,
        titulo: formTitulo.trim(),
        url: formUrl.trim(),
        descripcion: formDescripcion.trim(),
        categoria: formCategoria,
        jugadorId: formJugadorId || undefined,
      } : v);
      saveVideosToDb(updated);
      showNotification('Vídeo actualizado correctamente.', 'success');
    } else {
      // Create mode
      const newVideo: VideoItem = {
        id: 'vid_' + Date.now(),
        titulo: formTitulo.trim(),
        url: formUrl.trim(),
        descripcion: formDescripcion.trim(),
        categoria: formCategoria,
        jugadorId: formJugadorId || undefined,
        fechaRegistro: new Date().toISOString().split('T')[0]
      };
      saveVideosToDb([newVideo, ...videos]);
      showNotification('Vídeo añadido a la Videoteca.', 'success');
    }

    setIsFormOpen(false);
  };

  const handleDeleteVideo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videos.find(v => v.id === id);
    if (video) {
      setVideoToDelete(video);
    }
  };

  const confirmDeleteVideo = () => {
    if (!videoToDelete) return;
    const filtered = videos.filter(v => v.id !== videoToDelete.id);
    saveVideosToDb(filtered);
    showNotification('Vídeo eliminado de la Videoteca.', 'info');
    if (activeVideo?.id === videoToDelete.id) {
      setActiveVideo(null);
    }
    setVideoToDelete(null);
  };

  // Filter conditions
  const filteredVideos = videos.filter(v => {
    const matchesSearch = v.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (v.descripcion || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || v.categoria === selectedCategory;
    const matchesPlayer = selectedPlayerFilter === 'all' || v.jugadorId === selectedPlayerFilter;

    return matchesSearch && matchesCategory && matchesPlayer;
  });

  return (
    <>
      <ConfirmationModal
        isOpen={!!videoToDelete}
        onClose={() => setVideoToDelete(null)}
        onConfirm={confirmDeleteVideo}
        title="Eliminar Vídeo"
        message={`¿Estás seguro de que deseas eliminar permanentemente el vídeo "${videoToDelete?.titulo}" de la Videoteca?`}
        confirmText="Eliminar"
      />

      <div className="space-y-6">
      {/* HEADER SECTION METRICS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold font-sans text-slate-150 flex items-center space-x-2">
            <span className="p-1.5 bg-red-600/10 text-red-500 rounded-lg">
              <Film className="w-5 h-5" />
            </span>
            <span>Videoteca de Scouting</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualiza, organiza y asocia clips analíticos de YouTube directamente con tu cartera de futbolistas y pizarras tácticas.
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs font-mono uppercase tracking-wider rounded-lg shadow-md hover:shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center space-x-2 shrink-0 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Añadir vídeo analítico</span>
        </button>
      </div>

      {/* QUICK STATUS STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
          <p className="text-slate-500 font-bold uppercase text-[9px] font-mono tracking-wider">Total de Clips</p>
          <p className="text-white font-extrabold text-lg mt-1 font-mono">{videos.length}</p>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
          <p className="text-slate-500 font-bold uppercase text-[9px] font-mono tracking-wider">Metraje de Análisis</p>
          <p className="text-rose-400 font-extrabold text-lg mt-1 font-mono">
            {videos.filter(v => v.categoria === 'Táctica').length} Tácticos
          </p>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
          <p className="text-slate-500 font-bold uppercase text-[9px] font-mono tracking-wider">Asociados a Jugador</p>
          <p className="text-emerald-400 font-extrabold text-lg mt-1 font-mono">
            {videos.filter(v => v.jugadorId).length} Clips
          </p>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
          <p className="text-slate-500 font-bold uppercase text-[9px] font-mono tracking-wider">Última Adición</p>
          <p className="text-blue-400 font-extrabold text-xs mt-1.5 font-mono">
            {videos.length > 0 ? videos[0].fechaRegistro : 'N/A'}
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 flex flex-col md:flex-row gap-3">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por título, palabras clave..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer w-full"
            >
              <option value="all">📁 Todas las Categorías</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Linked Player filter */}
          <div className="relative">
            <select
              value={selectedPlayerFilter}
              onChange={(e) => setSelectedPlayerFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer w-full"
            >
              <option value="all">🏃‍♂️ Todos los Jugadores</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.equipo})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIDEOS GRID VIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVideos.map((video) => {
          const linkedPlayer = players.find(p => p.id === video.jugadorId);
          const ytId = getYouTubeId(video.url);

          return (
            <div 
              key={video.id}
              onClick={() => ytId && setActiveVideo(video)}
              className="group bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-red-500/30 rounded-xl overflow-hidden shadow-md transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* Thumbnail Area with hover play icon */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <img 
                  src={getThumbnailUrl(video.url)}
                  alt={video.titulo}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                />
                
                {/* Visual badges/overlays */}
                <span className="absolute top-2.5 left-2.5 bg-black/75 border border-slate-800 text-slate-300 font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                  {video.categoria || 'Análisis'}
                </span>

                <span className="absolute bottom-2.5 right-2.5 bg-black/85 text-slate-400 font-mono text-[9px] px-1.5 py-0.5 rounded">
                  {video.fechaRegistro}
                </span>

                {/* Overlaid Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 bg-red-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-200 line-clamp-1 group-hover:text-red-400 transition-colors">
                    {video.titulo}
                  </h3>
                  
                  <p className="text-xs text-slate-400 line-clamp-2 h-8">
                    {video.descripcion || 'Sin descripción descriptiva.'}
                  </p>
                </div>

                {/* Card Sub-actions / Tags */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {linkedPlayer ? (
                      <span className="inline-flex items-center space-x-1 max-w-full bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] text-emerald-400 font-mono tracking-tight font-semibold">
                        <User className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{linkedPlayer.nombre}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 bg-slate-950/40 text-[9px] px-1.5 py-0.5 rounded text-slate-550 font-mono">
                        <Video className="w-2.5 h-2.5" />
                        <span>Clasificación general</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditForm(video, e)}
                      className="p-1 hover:bg-slate-800 text-slate-450 hover:text-white rounded transition"
                      title="Editar metadatos"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteVideo(video.id, e)}
                      className="p-1 hover:bg-red-950/30 text-slate-500 hover:text-red-400 rounded transition"
                      title="Eliminar vídeo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredVideos.length === 0 && (
          <div className="col-span-full bg-slate-900/20 border-2 border-dashed border-slate-850 px-4 py-16 text-center rounded-2xl flex flex-col items-center justify-center">
            <Film className="w-10 h-10 text-slate-600 mb-3 animate-pulse" />
            <p className="text-sm font-bold text-slate-400">Ningún clip coincide con el filtro</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Ajusta los términos de búsqueda o añade un nuevo vídeo de YouTube presionando "Añadir vídeo analítico".
            </p>
          </div>
        )}
      </div>

      {/* DETAILED PLAYER & ADDING MODAL FORM OVERLAY */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-850 bg-slate-950 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                {editingVideo ? '📝 Modificar Vídeo' : '📹 Añadir Clip de YouTube'}
              </span>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveVideo} className="p-5 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  Título del Clip *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Álvaro - Regates y pases filtrados en profundidad"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-855 rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  Enlace de YouTube *
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="url"
                    required
                    placeholder="Ej. https://www.youtube.com/watch?v=... o https://youtu.be/..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[9px] text-slate-500 italic font-sans">
                  Soporta enlaces clásicos de YouTube, URLs con IDs rápidos y formatos recortados para móviles.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block font-sans">
                    Categoría Analítica
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block font-sans">
                    Vincular Futbolista (Opcional)
                  </label>
                  <select
                    value={formJugadorId}
                    onChange={(e) => setFormJugadorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-emerald-400"
                  >
                    <option value="" className="text-slate-450">-- Sin vincular --</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id} className="text-slate-200">
                        {p.nombre} ({p.equipo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  Descripción / Apuntes de Scouting (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Añade tus notas técnicas, minutos clave del vídeo, áreas de mejora detectadas..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-855 rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              {/* Form buttons */}
              <div className="pt-3 border-t border-slate-850 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-350 text-xs font-mono font-bold rounded uppercase tracking-wider transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-mono font-bold rounded uppercase tracking-wider transition shadow-md"
                >
                  Guardar Clip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMBEDDED INTUITIVE IFRAME PLAYER MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Player Head */}
            <div className="p-4 border-b border-slate-850 bg-slate-950/90 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-mono font-bold text-rose-500 uppercase tracking-widest">
                  Reproducción Analítica: {activeVideo.categoria || 'Generales'}
                </p>
                <h3 className="text-sm font-bold text-white truncate max-w-lg mt-0.5">
                  {activeVideo.titulo}
                </h3>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
                  title="Abrir en YouTube externo"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-lg transition"
                  title="Cerrar reproducción"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Canvas Sandbox Aspect-Video */}
            <div className="bg-black relative aspect-video flex items-center justify-center">
              {getYouTubeId(activeVideo.url) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(activeVideo.url)}?autoplay=1&rel=0&modestbranding=1`}
                  title={activeVideo.titulo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="text-center p-8 space-y-2">
                  <Video className="w-12 h-12 text-slate-500 mx-auto animate-bounce" />
                  <p className="text-slate-300 text-sm font-bold">No se puede reproducir este formato</p>
                  <p className="text-slate-500 text-xs">Asegúrate de que es un enlace de YouTube válido.</p>
                </div>
              )}
            </div>

            {/* Player Foot notes stats */}
            <div className="p-4 bg-slate-950/50 border-t border-slate-850/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              <div className="md:col-span-8 space-y-1">
                <p className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Descripción del analista:</p>
                <p className="text-slate-300 text-xs leading-relaxed font-sans mt-0.5 whitespace-pre-wrap">
                  {activeVideo.descripcion || 'Sin descripción o anotaciones técnicas registradas para este fragmento.'}
                </p>
              </div>

              <div className="md:col-span-4 flex flex-col space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-850/60 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha Registro:</span>
                  <span className="text-slate-300 font-bold">{activeVideo.fechaRegistro}</span>
                </div>
                
                {activeVideo.jugadorId && (
                  <div className="flex flex-col pt-2 border-t border-slate-850">
                    <span className="text-slate-500">Jugador Vinculado:</span>
                    <span className="text-emerald-400 font-bold mt-0.5 flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{players.find(p => p.id === activeVideo.jugadorId)?.nombre || 'Desconocido'}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  </>
);
}
