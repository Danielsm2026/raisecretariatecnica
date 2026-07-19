import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Code, 
  Copy, 
  Check, 
  ExternalLink,
  CloudOff,
  Server,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { isSupabaseConfigured, getSQLInstructions } from '../utils/supabaseClient';

interface SupabaseSyncBannerProps {
  status: 'connected' | 'error' | 'not_configured' | 'loading';
  errorMessage?: string;
  onRefresh: () => Promise<void>;
  onForceSyncDemo?: () => void;
  playerCount: number;
  matchReportCount?: number;
}

export default function SupabaseSyncBanner({
  status,
  errorMessage,
  onRefresh,
  onForceSyncDemo,
  playerCount,
  matchReportCount = 0
}: SupabaseSyncBannerProps) {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);

  const configured = isSupabaseConfigured();

  const handleCopySql = () => {
    navigator.clipboard.writeText(getSQLInstructions());
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyPatch = () => {
    const patchSql = `ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS valoracion_fisica JSONB;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS "valoracionFisica" JSONB;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS fichaje_fecha TEXT;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS "fichajeFecha" TEXT;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS fichaje_detalles TEXT;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS "fichajeDetalles" TEXT;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS fichaje_origen TEXT;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS "fichajeOrigen" TEXT;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS es_fichaje_verano_2026 BOOLEAN;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS "esFichajeVerano2026" BOOLEAN;
ALTER TABLE scouting_match_reports ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Forzar la recarga del esquema en Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';`;
    navigator.clipboard.writeText(patchSql);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 3000);
  };

  const isCategoryError = errorMessage && (
    errorMessage.toLowerCase().includes('categoria') ||
    errorMessage.toLowerCase().includes('fichaje') ||
    errorMessage.toLowerCase().includes('es_fichaje_verano_2026') ||
    errorMessage.toLowerCase().includes('valoracion_fisica')
  );

  return (
    <div id="supabase-sync-banner-wrapper" className="bg-slate-900 border border-slate-800/80 rounded-lg overflow-hidden relative shadow-sm">
      <div className="absolute top-0 right-0 p-4 w-32 h-32 bg-slate-950/20 rounded-full blur-xl pointer-events-none" />
      
      {/* Top Banner Row */}
      <div className="p-1.5 sm:p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 z-10 relative">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded flex items-center justify-center shrink-0 ${
            status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
            status === 'loading' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10 animate-spin' :
            status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
            'bg-slate-800/60 text-slate-400 border border-slate-750'
          }`}>
            {status === 'loading' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : status === 'connected' ? (
              <Zap className="w-3 h-3 text-emerald-400" />
            ) : status === 'error' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Database className="w-3 h-3 text-slate-400" />
            )}
          </div>
 
          <div className="flex flex-col md:flex-row md:items-center gap-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[9.5px] font-bold font-mono uppercase tracking-widest text-slate-300">
                Sincronización Supabase
              </h3>
              
              {/* Dynamic Status Badges */}
              {status === 'connected' && (
                <span className="text-[7.5px] font-bold font-mono px-1 py-0.2 rounded bg-emerald-950/45 text-emerald-400 border border-emerald-900/30">
                  ● EN LÍNEA
                </span>
              )}
              {status === 'loading' && (
                <span className="text-[7.5px] font-bold font-mono px-1 py-0.2 rounded bg-blue-950/45 text-blue-400 border border-blue-900/30 animate-pulse">
                  SINCRONIZANDO
                </span>
              )}
              {status === 'error' && (
                <span className="text-[7.5px] font-bold font-mono px-1 py-0.2 rounded bg-red-950/45 text-red-400 border border-red-900/30">
                  ⚠️ ERROR TABLA
                </span>
              )}
              {status === 'not_configured' && (
                <span className="text-[7.5px] font-bold font-mono px-1 py-0.2 rounded bg-slate-950/60 text-slate-400 border border-slate-800">
                  LOCAL
                </span>
              )}
            </div>
 
            <p className="text-slate-450 text-[9px] leading-tight font-sans">
              {status === 'connected' && `Sincronizado (${playerCount} prospectos, ${matchReportCount} actas).`}
              {status === 'loading' && 'Recuperando informes y actas desde Supabase...'}
              {status === 'error' && `Error: ${errorMessage || 'No se puede conectar'}.`}
              {status === 'not_configured' && 'Guardando en LocalStorage (Offline). Si estás en Vercel, añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tus variables de entorno para sincronizar.'}
            </p>
          </div>
        </div>
 
        {/* Sync Controls buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          {configured && (
            <button
              onClick={() => onRefresh()}
              disabled={status === 'loading'}
              className="px-2 py-0.5 bg-slate-850 hover:bg-slate-850/80 text-slate-300 hover:text-white rounded text-[8.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-all border border-slate-800 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
          )}

          {configured && onForceSyncDemo && (
            <button
              onClick={onForceSyncDemo}
              disabled={status === 'loading'}
              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[8.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-all border border-blue-550 disabled:opacity-50 cursor-pointer"
              title="Sincronizar y subir de forma masiva todos los jugadores locales a Supabase"
            >
              <Database className="w-2.5 h-2.5" />
              <span>Forzar Subida Masiva</span>
            </button>
          )}
 
          <button
            onClick={() => setShowSql(!showSql)}
            className={`px-2 py-0.5 rounded text-[8.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-all border cursor-pointer ${
              showSql 
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
                : 'bg-slate-950/60 hover:bg-slate-900 text-slate-450 hover:text-slate-300 border-slate-850'
            }`}
          >
            <Code className="w-2.5 h-2.5" />
            <span>SQL</span>
          </button>
        </div>
      </div>

      {/* Inline Schema Auto-Recovery Alert for 'categoria' */}
      {isCategoryError && (
        <div className="mx-2 mb-2 p-3 bg-red-950/20 border border-red-900/40 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs z-10 relative">
          <div className="space-y-1">
            <p className="font-bold text-red-400 font-sans text-[11px] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              ¡Falta la columna "categoria" en tu base de datos!
            </p>
            <p className="text-slate-400 text-[10px] leading-relaxed font-sans max-w-xl">
              Tu base de datos de Supabase fue creada de forma anterior y no dispone de esta nueva columna de filtro. 
              Para solucionarlo de forma permanente, ejecuta este parche en el <b>SQL Editor</b> de tu panel de Supabase. Hemos habilitado un guardado resiliente automático para que tus cambios sigan sincronizándose en segundo plano.
            </p>
          </div>
          <button
            onClick={handleCopyPatch}
            className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            {copiedPatch ? (
              <>
                <Check className="w-3 h-3 text-red-300" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-red-400" />
                <span>Copiar Parche SQL</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* SQL Setup Instructions with Expandable Pane */}
      {showSql && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-t border-slate-850 bg-slate-950/80 p-4 sm:p-5 text-xs font-mono space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded border border-slate-850">
            <div className="text-slate-400 text-2xs leading-normal">
              <p className="font-bold text-slate-200 flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                ¿Cómo enlazar tu proyecto con Supabase?
              </p>
              <ol className="list-decimal pl-4 mt-1.5 space-y-1">
                <li>Crea un proyecto en <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300 inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a></li>
                <li>Ve al panel de <b>SQL Editor</b>, copia y ejecuta el script proporcionado a la derecha.</li>
                <li>Añade las variables de entorno secretas: <b>VITE_SUPABASE_URL</b> y <b>VITE_SUPABASE_ANON_KEY</b> en tus Ajustes del editor.</li>
              </ol>
            </div>

            <button
              onClick={handleCopySql}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-2xs font-bold tracking-wider uppercase flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Código SQL
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <div className="absolute top-2 right-2 text-[10px] text-slate-600 select-none">
              SQL EDITOR SCRIPT
            </div>
            <pre className="p-4 bg-slate-950 rounded border border-slate-900 text-[10.5px] leading-relaxed text-slate-300 overflow-x-auto max-h-56 scrollbar-thin select-text font-mono">
              {getSQLInstructions()}
            </pre>
          </div>
        </motion.div>
      )}
    </div>
  );
}
