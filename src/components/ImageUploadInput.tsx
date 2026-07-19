import React, { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, Image, Link, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured, dbUploadFile } from '../utils/supabaseClient';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  folderName: 'player_photos' | 'team_crests';
  placeholder?: string;
  label: string;
  id: string;
}

export default function ImageUploadInput({
  value,
  onChange,
  folderName,
  placeholder = 'Ej: https://upload.wikimedia.org/.../logo.png',
  label,
  id
}: ImageUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const hasSupabase = isSupabaseConfigured();

  const handleFileChange = async (file: File) => {
    if (!file) return;
    
    // Simple mime validation
    if (!file.type.startsWith('image/')) {
      setError('El archivo seleccionado no es una imagen.');
      return;
    }

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es demasiado grande (Máx. 10MB)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const publicUrl = await dbUploadFile(file, folderName);
      onChange(publicUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al subir el archivo a Supabase Storage. Revisa que el bucket "scouting_assets" esté creado.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (hasSupabase) setIsDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (!hasSupabase) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider italic font-sans">
        {label}
      </label>

      {/* Upload Zone / Drop Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative border border-dashed rounded-lg p-3 text-center transition-all flex flex-col items-center justify-center min-h-[110px] ${
          isDragActive 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id={`${id}-file`}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileChange(e.target.files[0]);
            }
          }}
          disabled={!hasSupabase || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-2 py-2">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="text-[10px] font-mono text-slate-400">Subiendo a Supabase Storage...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1.5 w-full">
            {value ? (
              <div className="relative group w-12 h-12 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center p-1">
                <img src={value} alt="Preview" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileSelect();
                  }}
                  title="Cambiar imagen"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-950/80 border border-slate-850 flex items-center justify-center text-slate-500">
                <Image className="w-5 h-5" />
              </div>
            )}

            <div className="text-center">
              {hasSupabase ? (
                <>
                  <button
                    type="button"
                    onClick={triggerFileSelect}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold underline focus:outline-none"
                  >
                    Selecciona un archivo
                  </button>
                  <span className="text-[10px] text-slate-500 font-normal"> o arrástralo aquí</span>
                </>
              ) : (
                <span className="text-[10px] text-amber-500/90 font-medium">
                  Supabase no configurado. Introduce URL abajo.
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-500 uppercase font-mono">PNG, JPG, WEBP, SVG (MÁX. 10MB)</span>
          </div>
        )}
      </div>

      {/* Manual URL Input / Current URL */}
      <div className="space-y-1">
        <div className="relative">
          <span className="absolute left-3 top-2.5">
            <Link className="w-3.5 h-3.5 text-slate-500" />
          </span>
          <input
            id={id}
            type="url"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setError(null); // Clear error on manual change
            }}
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-850 text-white border border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-300"
          />
        </div>
        {value && (
          <div className="flex items-center text-[9px] text-emerald-400 font-semibold uppercase tracking-wider pl-1 gap-1">
            <CheckCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">Imagen vinculada: {value}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-red-950/40 border border-red-900/60 rounded text-[10px] text-red-400 flex items-start gap-1.5 leading-normal">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
