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
  Video,
  Database,
  Upload,
  Copy,
  Check,
  Loader2,
  FileVideo,
  RefreshCw,
  Code2,
  ArrowLeft
} from 'lucide-react';
import { 
  dbFetchVideos, 
  dbSaveVideo, 
  dbDeleteVideo, 
  dbUploadVideoFile, 
  isSupabaseConfigured, 
  GET_SUPABASE_VIDEOS_SQL 
} from '../utils/supabaseClient';

interface VideoLibraryProps {
  players: ScoutedPlayer[];
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  onBack?: () => void;
}

// Initial demo videos fallback
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

export default function VideoLibrary({ players, showNotification, onBack }: VideoLibraryProps) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string>('all');
  
  // Active Video for the modal player
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null);
  
  // Loading & Sync States
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isTableMissing, setIsTableMissing] = useState(false);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formCategoria, setFormCategoria] = useState('Análisis Individual');
  const [formJugadorId, setFormJugadorId] = useState('');
  const [sourceType, setSourceType] = useState<'youtube' | 'file'>('youtube');
  const [isUploading, setIsUploading] = useState(false);

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

  // Fetch videos from Supabase or localStorage on mount
  const loadVideosFromSource = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured()) {
      try {
        const { videos: dbData, tableMissing } = await dbFetchVideos();
        if (tableMissing) {
          setIsTableMissing(true);
          const savedVideos = localStorage.getItem('scouting_videoteca_db');
          setVideos(savedVideos ? JSON.parse(savedVideos) : INITIAL_VIDEOS);
        } else {
          setIsTableMissing(false);
          if (dbData && dbData.length > 0) {
            setVideos(dbData);
            localStorage.setItem('scouting_videoteca_db', JSON.stringify(dbData));
          } else {
            // If database table is empty, seed with initial demo videos in Supabase
            const savedLocal = localStorage.getItem('scouting_videoteca_db');
            const initial = savedLocal ? JSON.parse(savedLocal) : INITIAL_VIDEOS;
            setVideos(initial);
            for (const v of initial) {
              try { await dbSaveVideo(v); } catch (e) { /* silent seed fallback */ }
            }
          }
        }
      } catch (err: any) {
        const savedVideos = localStorage.getItem('scouting_videoteca_db');
        if (savedVideos) {
          try { setVideos(JSON.parse(savedVideos)); } catch (e) { setVideos(INITIAL_VIDEOS); }
        } else {
          setVideos(INITIAL_VIDEOS);
        }
      }
    } else {
      const savedVideos = localStorage.getItem('scouting_videoteca_db');
      if (savedVideos) {
        try { setVideos(JSON.parse(savedVideos)); } catch (e) { setVideos(INITIAL_VIDEOS); }
      } else {
        setVideos(INITIAL_VIDEOS);
        localStorage.setItem('scouting_videoteca_db', JSON.stringify(INITIAL_VIDEOS));
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadVideosFromSource();
  }, []);

  // Sync state & localStorage
  const saveVideosToDb = (updatedVideos: VideoItem[]) => {
    setVideos(updatedVideos);
    localStorage.setItem('scouting_videoteca_db', JSON.stringify(updatedVideos));
  };

  // Extract YouTube ID
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getThumbnailUrl = (url: string): string => {
    const id = getYouTubeId(url);
    if (id) {
      return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=60';
  };

  const handleOpenAddForm = () => {
    setEditingVideo(null);
    setFormTitulo('');
    setFormUrl('');
    setFormDescripcion('');
    setFormCategoria('Análisis Individual');
    setFormJugadorId('');
    setSourceType('youtube');
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
    setSourceType(getYouTubeId(video.url) ? 'youtube' : 'file');
    setIsFormOpen(true);
  };

  // Upload direct video file to Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupabaseConfigured()) {
      showNotification('Para subir archivos de vídeo directamente, configura las claves de Supabase en .env', 'error');
      return;
    }

    try {
      setIsUploading(true);
      showNotification('Subiendo archivo de vídeo a Supabase Storage...', 'info');
      const publicUrl = await dbUploadVideoFile(file);
      setFormUrl(publicUrl);
      showNotification('Vídeo subido con éxito a Supabase Storage.', 'success');
    } catch (error: any) {
      console.error(error);
      showNotification(error.message || 'Error al subir el vídeo a Supabase Storage', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Save video to Local & Supabase
  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitulo.trim()) {
      showNotification('Por favor, indica un título descriptivo.', 'error');
      return;
    }

    if (!formUrl.trim()) {
      showNotification('Por favor, introduce una URL de YouTube o sube un archivo de vídeo.', 'error');
      return;
    }

    const newVideoItem: VideoItem = {
      id: editingVideo ? editingVideo.id : 'vid_' + Date.now(),
      titulo: formTitulo.trim(),
      url: formUrl.trim(),
      descripcion: formDescripcion.trim(),
      categoria: formCategoria,
      jugadorId: formJugadorId || undefined,
      fechaRegistro: editingVideo ? editingVideo.fechaRegistro : new Date().toISOString().split('T')[0]
    };

    // Update local state first
    if (editingVideo) {
      const updated = videos.map(v => v.id === editingVideo.id ? newVideoItem : v);
      saveVideosToDb(updated);
    } else {
      saveVideosToDb([newVideoItem, ...videos]);
    }

    // Save to Supabase table
    if (isSupabaseConfigured()) {
      try {
        await dbSaveVideo(newVideoItem);
        showNotification('Vídeo guardado y vinculado correctamente en Supabase.', 'success');
      } catch (err: any) {
        console.error('Error saving video to Supabase:', err);
        showNotification('Guardado en almacenamiento local. Supabase error: ' + (err.message || 'Comprueba la tabla scouting_videos'), 'error');
      }
    } else {
      showNotification(editingVideo ? 'Vídeo actualizado.' : 'Vídeo añadido a la Videoteca.', 'success');
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

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    const targetId = videoToDelete.id;
    const filtered = videos.filter(v => v.id !== targetId);
    saveVideosToDb(filtered);

    if (isSupabaseConfigured()) {
      try {
        await dbDeleteVideo(targetId);
        showNotification('Vídeo eliminado de Supabase.', 'info');
      } catch (err: any) {
        console.warn('Error borrando de Supabase:', err);
      }
    } else {
      showNotification('Vídeo eliminado de la Videoteca.', 'info');
    }

    if (activeVideo?.id === targetId) {
      setActiveVideo(null);
    }
    setVideoToDelete(null);
  };

  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    await loadVideosFromSource();
    showNotification('Videoteca sincronizada con Supabase.', 'success');
    setIsSyncing(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(GET_SUPABASE_VIDEOS_SQL());
    setCopiedSql(true);
    showNotification('Código SQL copiado al portapapeles.', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
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
      {/* MISSING TABLE WARNING BANNER */}
      {isTableMissing && isSupabaseConfigured() && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-start space-x-3">
            <Database className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold font-mono">Tabla 'scouting_videos' pendiente de crear en Supabase</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5 font-sans">
                La aplicación está guardando localmente. Para guardar tus vídeos directamente en la nube de Supabase, ejecuta el script SQL en el Editor SQL de tu proyecto Supabase.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-mono font-bold rounded-lg transition shadow flex items-center space-x-1.5 shrink-0"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Ver y Copiar SQL</span>
          </button>
        </div>
      )}

      {/* HEADER SECTION METRICS & SUPABASE STATUS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full border border-slate-700/80 bg-slate-950 hover:bg-slate-900 text-blue-400 hover:text-blue-300 transition-all flex items-center justify-center shrink-0 shadow-md ring-1 ring-blue-500/20 hover:ring-blue-500/50 group active:scale-95 cursor-pointer mt-0.5"
              title="Volver a la Página Inicial"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5] text-blue-400 group-hover:text-blue-300 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-bold font-sans text-slate-150 flex items-center space-x-2">
                <span className="p-1.5 bg-red-600/10 text-red-500 rounded-lg">
                  <Film className="w-5 h-5" />
                </span>
                <span>Videoteca & Análisis Multimedia</span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sube o enlaza vídeos analíticos a Supabase, organizados por categoría y vinculados a futbolistas.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={handleOpenAddForm}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs font-mono uppercase tracking-wider rounded-lg shadow-md hover:shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center space-x-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Añadir vídeo</span>
          </button>
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
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-slate-400 text-xs font-mono font-bold">Cargando vídeos desde Supabase...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((video) => {
            const linkedPlayer = players.find(p => p.id === video.jugadorId);
            const isYouTube = !!getYouTubeId(video.url);

            return (
              <div 
                key={video.id}
                onClick={() => setActiveVideo(video)}
                className="group bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-red-500/30 rounded-xl overflow-hidden shadow-md transition-all duration-300 cursor-pointer flex flex-col"
              >
                {/* Thumbnail Area with hover play icon */}
                <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
                  <img 
                    src={getThumbnailUrl(video.url)}
                    alt={video.titulo}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                  />
                  
                  {/* Visual badges/overlays */}
                  <span className="absolute top-2.5 left-2.5 bg-black/80 border border-slate-800 text-slate-300 font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1">
                    {isYouTube ? <Video className="w-2.5 h-2.5 text-red-500" /> : <FileVideo className="w-2.5 h-2.5 text-blue-400" />}
                    <span>{video.categoria || 'Análisis'}</span>
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
                      {video.descripcion || 'Sin descripción o anotación técnica.'}
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
                Ajusta los términos de búsqueda o añade un nuevo vídeo de YouTube o archivo MP4 presionando "Añadir vídeo".
              </p>
            </div>
          )}
        </div>
      )}

      {/* ADD/EDIT FORM OVERLAY MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-850 bg-slate-950 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Video className="w-4 h-4 text-red-500" />
                <span>{editingVideo ? '📝 Modificar Vídeo' : '📹 Añadir Clip / Vídeo Analítico'}</span>
              </span>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source Type Selector Tabs */}
            <div className="flex border-b border-slate-850 bg-slate-950/50">
              <button
                type="button"
                onClick={() => setSourceType('youtube')}
                className={`flex-1 py-2.5 text-xs font-mono font-bold border-b-2 transition flex items-center justify-center space-x-1.5 ${
                  sourceType === 'youtube'
                    ? 'border-red-500 text-red-400 bg-red-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Enlace YouTube</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('file')}
                className={`flex-1 py-2.5 text-xs font-mono font-bold border-b-2 transition flex items-center justify-center space-x-1.5 ${
                  sourceType === 'file'
                    ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Archivo MP4/Vídeo</span>
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

              {sourceType === 'youtube' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Enlace de YouTube *
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="url"
                      required={sourceType === 'youtube'}
                      placeholder="Ej. https://www.youtube.com/watch?v=... o https://youtu.be/..."
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 italic font-sans">
                    Soporta enlaces clásicos de YouTube, URLs recortadas o de móviles.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Subir Vídeo a Supabase Storage (MP4 / WebM / MOV)
                  </label>

                  <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950 p-4 rounded-lg text-center transition">
                    {isUploading ? (
                      <div className="flex flex-col items-center py-2 space-y-2">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                        <p className="text-xs text-blue-300 font-mono">Subiendo vídeo a Supabase Storage...</p>
                      </div>
                    ) : formUrl && !getYouTubeId(formUrl) ? (
                      <div className="space-y-2">
                        <p className="text-xs text-emerald-400 font-mono font-bold flex items-center justify-center space-x-1">
                          <Check className="w-4 h-4" />
                          <span>Vídeo alojado en Supabase</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-full bg-slate-900 p-1.5 rounded border border-slate-800">
                          {formUrl}
                        </p>
                        <label className="inline-block px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono font-bold rounded cursor-pointer transition">
                          Cambiar archivo
                          <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-300 font-bold">Haz clic o arrastra aquí tu clip de vídeo</p>
                        <p className="text-[10px] text-slate-500">Formatos compatibles: MP4, WebM, MOV, OGG</p>
                        <label className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded cursor-pointer transition shadow-md">
                          Seleccionar vídeo local
                          <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  disabled={isUploading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-mono font-bold rounded uppercase tracking-wider transition shadow-md flex items-center space-x-1"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar en Supabase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMBEDDED PLAYER MODAL (YouTube or Native MP4/Video) */}
      {activeVideo && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Player Head */}
            <div className="p-4 border-b border-slate-850 bg-slate-950/90 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-mono font-bold text-rose-500 uppercase tracking-widest flex items-center space-x-1.5">
                  <Video className="w-3 h-3" />
                  <span>Reproducción Analítica: {activeVideo.categoria || 'Generales'}</span>
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
                  title="Abrir en enlace externo"
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

            {/* Video Canvas Aspect-Video */}
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
                <video
                  src={activeVideo.url}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[70vh] bg-black object-contain"
                />
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

      {/* SQL SCHEMA MODAL */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-850 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  Script SQL para tabla "scouting_videos" en Supabase
                </span>
              </div>
              <button 
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto font-mono text-xs">
              <p className="text-slate-400 text-[11px]">
                Ejecuta estas sentencias en el <strong className="text-slate-200">SQL Editor</strong> de tu proyecto Supabase para habilitar la tabla de la videoteca y los permisos de subida de archivos:
              </p>

              <div className="relative bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre">
                {GET_SUPABASE_VIDEOS_SQL()}
              </div>
            </div>

            <div className="p-4 border-t border-slate-850 bg-slate-950 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">Tabla: scouting_videos & Bucket: scouting_assets</span>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-lg transition flex items-center space-x-1.5 shadow"
              >
                {copiedSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'Copiado' : 'Copiar SQL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  </>
  );
}
