import { createClient } from '@supabase/supabase-js';
import { ScoutedPlayer, MatchReport, SistemaJuego, PosicionSistema } from '../types';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY as string) || '';

// Helper to safely clear invalid or stale auth tokens from browser storage
export function clearStaleSupabaseAuthStorage() {
  try {
    if (typeof window !== 'undefined') {
      const isSbKey = (key: string | null) => 
        Boolean(key && (key.startsWith('sb-') || key.includes('supabase.auth') || key.includes('supabase-auth')));

      if (window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (isSbKey(key)) {
            keysToRemove.push(key!);
          }
        }
        keysToRemove.forEach((k) => {
          try { window.localStorage.removeItem(k); } catch { /* Ignore */ }
        });
      }

      if (window.sessionStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (isSbKey(key)) {
            keysToRemove.push(key!);
          }
        }
        keysToRemove.forEach((k) => {
          try { window.sessionStorage.removeItem(k); } catch { /* Ignore */ }
        });
      }
    }
  } catch {
    // Ignore storage access errors
  }
}

// Global safety net for unhandled Supabase auth refresh token errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = (
      typeof reason === 'string'
        ? reason
        : (reason?.message || reason?.error_description || reason?.error || '')
    ).toLowerCase();

    if (
      msg.includes('refresh token') ||
      msg.includes('invalid refresh') ||
      msg.includes('refresh_token_not_found') ||
      msg.includes('token not found')
    ) {
      console.warn('Gracefully handled stale/invalid Supabase refresh token unhandled rejection.');
      event.preventDefault();
      clearStaleSupabaseAuthStorage();
      if (supabase) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    }
  });

  window.addEventListener('error', (event) => {
    const msg = (event.message || '').toLowerCase();
    if (
      msg.includes('refresh token') ||
      msg.includes('invalid refresh') ||
      msg.includes('refresh_token_not_found') ||
      msg.includes('token not found')
    ) {
      console.warn('Gracefully handled stale/invalid Supabase refresh token window error.');
      event.preventDefault();
      clearStaleSupabaseAuthStorage();
      if (supabase) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    }
  });
}

// Create the client only if keys are present
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }) 
  : null;

let isSupabaseOffline = false;
let lastSupabaseOfflineTime = 0;
const SUPABASE_OFFLINE_COOLDOWN_MS = 30000; // 30 seconds cooldown on network failure

export function markSupabaseOffline(): void {
  isSupabaseOffline = true;
  lastSupabaseOfflineTime = Date.now();
}

export function isSupabaseNetworkAvailable(): boolean {
  if (!supabase) return false;
  if (isSupabaseOffline) {
    if (Date.now() - lastSupabaseOfflineTime > SUPABASE_OFFLINE_COOLDOWN_MS) {
      // Cooldown elapsed, allow retry
      isSupabaseOffline = false;
      return true;
    }
    return false;
  }
  return true;
}

export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

/**
 * Supabase Auth helper functions with automatic invalid refresh token recovery
 */
export async function getSupabaseSession() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      const msg = error.message || '';
      if (
        msg.toLowerCase().includes('refresh token') || 
        msg.toLowerCase().includes('not found') || 
        msg.toLowerCase().includes('invalid refresh') ||
        (error as any).status === 400
      ) {
        console.warn('Stale/Invalid refresh token detected. Resetting local auth session:', msg);
        clearStaleSupabaseAuthStorage();
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Ignore local signOut error
        }
      } else {
        console.error('Error fetching Supabase session:', error);
      }
      return null;
    }
    return data?.session || null;
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.toLowerCase().includes('refresh token') || msg.toLowerCase().includes('not found')) {
      console.warn('Caught invalid refresh token exception. Resetting local auth session:', msg);
      clearStaleSupabaseAuthStorage();
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignore
      }
    } else {
      console.error('Unexpected error in getSupabaseSession:', err);
    }
    return null;
  }
}

export async function getSupabaseUser() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const msg = error.message || '';
      if (
        msg.toLowerCase().includes('refresh token') || 
        msg.toLowerCase().includes('not found') || 
        msg.toLowerCase().includes('invalid refresh') ||
        (error as any).status === 400
      ) {
        console.warn('Stale/Invalid refresh token in getUser. Resetting local auth session:', msg);
        clearStaleSupabaseAuthStorage();
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Ignore
        }
      } else {
        console.error('Error fetching Supabase user:', error);
      }
      return null;
    }
    return data?.user || null;
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.toLowerCase().includes('refresh token') || msg.toLowerCase().includes('not found')) {
      console.warn('Caught invalid refresh token exception in getUser:', msg);
      clearStaleSupabaseAuthStorage();
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignore
      }
    } else {
      console.error('Unexpected error in getSupabaseUser:', err);
    }
    return null;
  }
}

export function onSupabaseAuthStateChange(callback: (event: string, session: any) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event as string) === 'TOKEN_REFRESH_FAILED') {
      if (!session) {
        clearStaleSupabaseAuthStorage();
      }
    }
    callback(event, session);
  });
}

export async function supabaseSignIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase no está configurado');
  clearStaleSupabaseAuthStorage();
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function supabaseSignOut() {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Error during supabase.auth.signOut:', err);
  } finally {
    clearStaleSupabaseAuthStorage();
  }
}

export interface SupabaseSyncResult {
  success: boolean;
  message: string;
  error?: any;
}

/**
 * Fetch players from Supabase.
 */
export async function dbFetchPlayers(): Promise<ScoutedPlayer[]> {
  if (!supabase) {
    throw new Error('Supabase URL or Anon Key is missing in environment variables.');
  }

  let { data, error } = await supabase
    .from('scouting_players')
    .select('*')
    .order('fechaRegistro', { ascending: false });

  if (error) {
    // Fallback 1: Try ordering by snake_case fecha_registro
    const res2 = await supabase
      .from('scouting_players')
      .select('*')
      .order('fecha_registro', { ascending: false });

    if (!res2.error) {
      data = res2.data;
      error = null;
    } else {
      // Fallback 2: Select without ordering if order column does not exist
      const res3 = await supabase
        .from('scouting_players')
        .select('*');

      if (!res3.error) {
        data = res3.data;
        error = null;
      }
    }
  }

  if (error) {
    console.warn('Error fetching players from Supabase:', error.message || error);
    throw new Error(error.message || 'Error al obtener jugadores de Supabase. Revisa que la tabla "scouting_players" exista.');
  }

  // Format incoming database rows back to ScoutedPlayer structure (specifically the JSON fields if needed)
  return (data || []).map((row: any) => {
    let rawAtributos: any = { fisico: 5, tecnica: 5, tactica: 5, mental: 5 };
    if (typeof row.atributos === 'string') {
      try {
        rawAtributos = JSON.parse(row.atributos);
      } catch (e) {
        // Safe fallback
      }
    } else if (row.atributos && typeof row.atributos === 'object') {
      rawAtributos = row.atributos;
    }

    const { valoracionFisica: nestedFisica, ...cleanAtributos } = rawAtributos || {};
    return {
      id: row.id,
      nombre: row.nombre || 'Sin nombre',
      equipo: row.equipo || '',
      posicion: row.posicion || 'Portero',
      anoNacimiento: row.ano_nacimiento || row.anoNacimiento || 2000,
      lateralidad: row.lateralidad || 'Diestro',
      dorsal: row.dorsal !== undefined && row.dorsal !== null 
        ? Number(row.dorsal) 
        : (rawAtributos.dorsal !== undefined && rawAtributos.dorsal !== null ? Number(rawAtributos.dorsal) : undefined),
      valorMercado: row.valor_mercado !== undefined ? row.valor_mercado : (row.valorMercado || 0),
      calificacion: row.calificacion || 3,
      notas: row.notas || '',
      atributos: cleanAtributos.fisico !== undefined ? cleanAtributos : (rawAtributos || { fisico: 5, tecnica: 5, tactica: 5, mental: 5 }),
      fechaRegistro: row.fecha_registro || row.fechaRegistro || new Date().toISOString().split('T')[0],
      categoria: row.categoria || '',
      altura: row.altura,
      recomendacion: row.recomendacion || row.valoracion,
      recomendacionComentario: row.recomendacion_comentario || row.recomendacionComentario,
      descripcionGeneral: row.descripcion_general || row.descripcionGeneral,
      fortalezas: row.fortalezas,
      debilidades: row.debilidades,
      enSuEquipo: row.en_su_equipo || row.enSuEquipo,
      enPocasPalabras: row.en_pocas_palabras || row.enPocasPalabras,
      tieneValorPor: row.tiene_valor_por || row.tieneValorPor,
      pitchX: row.pitch_x !== undefined ? row.pitch_x : (row.pitchX !== undefined ? row.pitchX : 50),
      pitchY: row.pitch_y !== undefined ? row.pitch_y : (row.pitchY !== undefined ? row.pitchY : 50),
      elo: row.elo !== undefined ? row.elo : undefined,
      escudoUrl: row.escudoUrl || row.escudo_url || undefined,
      fotoUrl: row.fotoUrl || row.foto_url || undefined,
      besoccerUrl: row.besoccer_url || row.besoccerUrl || rawAtributos.besoccerUrl || undefined,
      valoracionFisica: row.valoracion_fisica || row.valoracionFisica || nestedFisica || undefined,
      fichajeFecha: row.fichaje_fecha || row.fichajeFecha || rawAtributos.fichajeFecha || undefined,
      fichajeDetalles: row.fichaje_detalles || row.fichajeDetalles || rawAtributos.fichajeDetalles || undefined,
      fichajeOrigen: row.fichaje_origen || row.fichajeOrigen || rawAtributos.fichajeOrigen || undefined,
      esFichajeVerano2026: row.es_fichaje_verano_2026 !== undefined ? row.es_fichaje_verano_2026 : (row.esFichajeVerano2026 !== undefined ? row.esFichajeVerano2026 : (rawAtributos.esFichajeVerano2026 !== undefined ? rawAtributos.esFichajeVerano2026 : undefined))
    };
  });
}

function isDateTimeOverflowError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = [error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase();
  return (
    code === '22008' ||
    code === '22007' ||
    code === '42804' ||
    msg.includes('datestyle') ||
    msg.includes('date/time') ||
    msg.includes('datetime') ||
    msg.includes('out of range for type') ||
    msg.includes('invalid input syntax for type timestamp') ||
    msg.includes('invalid input syntax for type date')
  );
}

/**
 * Saves a single player to Supabase (upsert pattern).
 */
function extractMissingColumnFromError(error: any): string | null {
  if (!error) return null;
  const errorMsg = [error.message, error.details, error.hint].filter(Boolean).join(' ');
  if (!errorMsg) return null;

  const match = errorMsg.match(/Could not find the ['"]([^'"]+)['"] column/i) ||
                errorMsg.match(/column ['"]([^'"]+)['"] of/i) ||
                errorMsg.match(/column ([a-zA-Z0-9__]+) of/i) ||
                errorMsg.match(/find the column ['"]([^'"]+)['"]/i) ||
                errorMsg.match(/has no column named ['"]([^'"]+)['"]/i) ||
                errorMsg.match(/column ['"]([^'"]+)['"] does not exist/i) ||
                errorMsg.match(/column ([a-zA-Z0-9__]+) does not exist/i) ||
                errorMsg.match(/column ['"]([^'"]+)['"] is of type/i);

  return match && match[1] ? match[1] : null;
}

/**
 * Helper to perform an upsert on Supabase while automatically stripping out columns that don't exist in the database schema.
 */
async function safeUpsert(table: string, payload: any, onConflict: string): Promise<any> {
  if (!isSupabaseNetworkAvailable()) {
    return { offline: true };
  }

  let currentPayload = { ...payload };
  let retryCount = 0;
  let dateConversionAttempted = false;
  let dateStrippedAttempted = false;

  while (true) {
    let error: any = null;
    try {
      const res = await supabase!
        .from(table)
        .upsert(currentPayload, { onConflict });
      error = res.error;
    } catch (fetchErr: any) {
      const msg = fetchErr?.message || String(fetchErr);
      if ((msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) && retryCount < 1) {
        retryCount++;
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      markSupabaseOffline();
      return { offline: true };
    }
    
    if (!error) return { success: true };

    const errorMsg = error.message || '';
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('Load failed')) {
      markSupabaseOffline();
      return { offline: true };
    }

    // Check if error is due to date/time format or numeric timestamp in timestamp column
    if (isDateTimeOverflowError(error)) {
      if (!dateConversionAttempted) {
        dateConversionAttempted = true;
        let converted = false;
        for (const k of ['updated_at', 'updatedAt', 'created_at', 'createdAt']) {
          if (k in currentPayload && typeof currentPayload[k] === 'number') {
            try {
              currentPayload[k] = new Date(currentPayload[k]).toISOString();
              converted = true;
            } catch {
              delete currentPayload[k];
            }
          }
        }
        if (converted) continue;
      }

      if (!dateStrippedAttempted) {
        dateStrippedAttempted = true;
        for (const k of ['updated_at', 'updatedAt', 'created_at', 'createdAt', 'fecha_modificacion', 'fechaModificacion']) {
          delete currentPayload[k];
        }
        continue;
      }
    }

    const colName = extractMissingColumnFromError(error);

    if (colName) {
      delete currentPayload[colName];
      if (colName.includes('_')) {
        const camel = colName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        delete currentPayload[camel];
      } else {
        const snake = colName.replace(/([A-Z])/g, "_$1").toLowerCase();
        delete currentPayload[snake];
      }
      
      if (Object.keys(currentPayload).length <= 1) {
        throw error;
      }
      continue;
    }

    throw error;
  }
}

/**
 * Helper to perform a bulk upsert on Supabase while automatically stripping out columns that don't exist in the database schema.
 */
async function safeBulkUpsert(table: string, payloads: any[], onConflict: string): Promise<any> {
  if (!isSupabaseNetworkAvailable() || payloads.length === 0) {
    return { offline: true };
  }

  let currentPayloads = payloads.map(p => ({ ...p }));
  let retryCount = 0;
  let dateConversionAttempted = false;
  let dateStrippedAttempted = false;

  while (true) {
    let error: any = null;
    try {
      const res = await supabase!
        .from(table)
        .upsert(currentPayloads, { onConflict });
      error = res.error;
    } catch (fetchErr: any) {
      const msg = fetchErr?.message || String(fetchErr);
      if ((msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) && retryCount < 1) {
        retryCount++;
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      markSupabaseOffline();
      return { offline: true };
    }
    
    if (!error) return { success: true };

    const errorMsg = error.message || '';
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('Load failed')) {
      markSupabaseOffline();
      return { offline: true };
    }

    // Check if error is due to date/time format or numeric timestamp in timestamp column
    if (isDateTimeOverflowError(error)) {
      if (!dateConversionAttempted) {
        dateConversionAttempted = true;
        let converted = false;
        currentPayloads = currentPayloads.map(payload => {
          const next = { ...payload };
          for (const k of ['updated_at', 'updatedAt', 'created_at', 'createdAt']) {
            if (k in next && typeof next[k] === 'number') {
              try {
                next[k] = new Date(next[k]).toISOString();
                converted = true;
              } catch {
                delete next[k];
              }
            }
          }
          return next;
        });
        if (converted) continue;
      }

      if (!dateStrippedAttempted) {
        dateStrippedAttempted = true;
        currentPayloads = currentPayloads.map(payload => {
          const next = { ...payload };
          for (const k of ['updated_at', 'updatedAt', 'created_at', 'createdAt', 'fecha_modificacion', 'fechaModificacion']) {
            delete next[k];
          }
          return next;
        });
        continue;
      }
    }

    const colName = extractMissingColumnFromError(error);

    if (colName) {
      currentPayloads = currentPayloads.map(payload => {
        const nextPayload = { ...payload };
        delete nextPayload[colName];
        if (colName.includes('_')) {
          const camel = colName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          delete nextPayload[camel];
        } else {
          const snake = colName.replace(/([A-Z])/g, "_$1").toLowerCase();
          delete nextPayload[snake];
        }
        return nextPayload;
      });

      if (currentPayloads.length === 0 || Object.keys(currentPayloads[0]).length <= 1) {
        throw error;
      }
      continue;
    }

    throw error;
  }
}

/**
 * Saves a single player to Supabase (upsert pattern).
 */
export async function dbSavePlayer(player: ScoutedPlayer): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const payload = {
    id: player.id,
    nombre: player.nombre,
    equipo: player.equipo,
    categoria: player.categoria || '',
    posicion: player.posicion,
    ano_nacimiento: player.anoNacimiento,
    anoNacimiento: player.anoNacimiento,
    lateralidad: player.lateralidad,
    dorsal: player.dorsal,
    valor_mercado: player.valorMercado,
    valorMercado: player.valorMercado,
    calificacion: Math.round(player.calificacion),
    notas: player.notas,
    atributos: {
      ...player.atributos,
      dorsal: player.dorsal,
      valoracionFisica: player.valoracionFisica,
      fichajeFecha: player.fichajeFecha,
      fichajeDetalles: player.fichajeDetalles,
      fichajeOrigen: player.fichajeOrigen,
      esFichajeVerano2026: player.esFichajeVerano2026,
      besoccerUrl: player.besoccerUrl
    },
    fecha_registro: player.fechaRegistro,
    fechaRegistro: player.fechaRegistro,
    altura: player.altura,
    recomendacion: player.recomendacion,
    valoracion: player.recomendacion,
    recomendacion_comentario: player.recomendacionComentario,
    recomendacionComentario: player.recomendacionComentario,
    descripcion_general: player.descripcionGeneral,
    descripcionGeneral: player.descripcionGeneral,
    fortalezas: player.fortalezas,
    debilidades: player.debilidades,
    en_su_equipo: player.enSuEquipo,
    enSuEquipo: player.enSuEquipo,
    en_pocas_palabras: player.enPocasPalabras,
    enPocasPalabras: player.enPocasPalabras,
    tiene_valor_por: player.tieneValorPor,
    tieneValorPor: player.tieneValorPor,
    pitch_x: player.pitchX,
    pitchX: player.pitchX,
    pitch_y: player.pitchY,
    pitchY: player.pitchY,
    elo: player.elo,
    escudo_url: player.escudoUrl,
    escudoUrl: player.escudoUrl,
    foto_url: player.fotoUrl,
    fotoUrl: player.fotoUrl,
    besoccer_url: player.besoccerUrl,
    besoccerUrl: player.besoccerUrl,
    valoracion_fisica: player.valoracionFisica,
    valoracionFisica: player.valoracionFisica,
    fichaje_fecha: player.fichajeFecha,
    fichajeFecha: player.fichajeFecha,
    fichaje_detalles: player.fichajeDetalles,
    fichajeDetalles: player.fichajeDetalles,
    fichaje_origen: player.fichajeOrigen,
    fichajeOrigen: player.fichajeOrigen,
    es_fichaje_verano_2026: player.esFichajeVerano2026,
    esFichajeVerano2026: player.esFichajeVerano2026,
  };

  try {
    await safeUpsert('scouting_players', payload, 'id');
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      console.warn('[Supabase] No se pudo guardar el jugador por falta de conexión:', msg);
    } else {
      console.error('Error saving player to Supabase:', error);
    }
    throw error;
  }
}

/**
 * Deletes a single player from Supabase.
 */
export async function dbDeletePlayer(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  try {
    const { error } = await supabase
      .from('scouting_players')
      .delete()
      .eq('id', id);

    if (error) {
      const msg = error.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        console.warn(`[Supabase] No se pudo eliminar jugador ${id} por problema de conexión:`, msg);
      } else {
        console.error('Error deleting player from Supabase:', error);
      }
      throw error;
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      console.warn(`[Supabase] Error de red al eliminar jugador ${id}:`, msg);
    } else {
      console.error('Error deleting player from Supabase:', err);
    }
    throw err;
  }
}

/**
 * Bulk upload players to Supabase (e.g. for reset or import).
 */
export async function dbBulkUpsert(players: ScoutedPlayer[]): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const payloads = players.map(player => ({
    id: player.id,
    nombre: player.nombre,
    equipo: player.equipo,
    categoria: player.categoria || '',
    posicion: player.posicion,
    ano_nacimiento: player.anoNacimiento,
    anoNacimiento: player.anoNacimiento,
    lateralidad: player.lateralidad,
    dorsal: player.dorsal,
    valor_mercado: player.valorMercado,
    valorMercado: player.valorMercado,
    calificacion: Math.round(player.calificacion),
    notas: player.notas,
    atributos: {
      ...player.atributos,
      dorsal: player.dorsal,
      valoracionFisica: player.valoracionFisica,
      fichajeFecha: player.fichajeFecha,
      fichajeDetalles: player.fichajeDetalles,
      fichajeOrigen: player.fichajeOrigen,
      esFichajeVerano2026: player.esFichajeVerano2026,
      besoccerUrl: player.besoccerUrl
    },
    fecha_registro: player.fechaRegistro,
    fechaRegistro: player.fechaRegistro,
    altura: player.altura,
    recomendacion: player.recomendacion,
    valoracion: player.recomendacion,
    recomendacion_comentario: player.recomendacionComentario,
    recomendacionComentario: player.recomendacionComentario,
    descripcion_general: player.descripcionGeneral,
    descripcionGeneral: player.descripcionGeneral,
    fortalezas: player.fortalezas,
    debilidades: player.debilidades,
    en_su_equipo: player.enSuEquipo,
    enSuEquipo: player.enSuEquipo,
    en_pocas_palabras: player.enPocasPalabras,
    enPocasPalabras: player.enPocasPalabras,
    tiene_valor_por: player.tieneValorPor,
    tieneValorPor: player.tieneValorPor,
    pitch_x: player.pitchX,
    pitchX: player.pitchX,
    pitch_y: player.pitchY,
    pitchY: player.pitchY,
    elo: player.elo,
    escudo_url: player.escudoUrl,
    escudoUrl: player.escudoUrl,
    foto_url: player.fotoUrl,
    fotoUrl: player.fotoUrl,
    besoccer_url: player.besoccerUrl,
    besoccerUrl: player.besoccerUrl,
    valoracion_fisica: player.valoracionFisica,
    valoracionFisica: player.valoracionFisica,
    fichaje_fecha: player.fichajeFecha,
    fichajeFecha: player.fichajeFecha,
    fichaje_detalles: player.fichajeDetalles,
    fichajeDetalles: player.fichajeDetalles,
    fichaje_origen: player.fichajeOrigen,
    fichajeOrigen: player.fichajeOrigen,
    es_fichaje_verano_2026: player.esFichajeVerano2026,
    esFichajeVerano2026: player.esFichajeVerano2026,
  }));

  try {
    await safeBulkUpsert('scouting_players', payloads, 'id');
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      console.warn('[Supabase] Error de red en dbBulkUpsert:', msg);
    } else {
      console.error('Error bulk upserting to Supabase:', error);
    }
    throw error;
  }
}

/**
 * Fetch match reports from Supabase.
 */
export async function dbFetchMatchReports(): Promise<MatchReport[]> {
  if (!supabase) {
    throw new Error('Supabase URL or Anon Key is missing in environment variables.');
  }

  let data: any = null;
  let error: any = null;

  try {
    const res = await supabase
      .from('scouting_match_reports')
      .select('*')
      .order('fecha', { ascending: false });
    data = res.data;
    error = res.error;
  } catch (fetchErr: any) {
    const msg = fetchErr?.message || String(fetchErr);
    console.warn('[Supabase] Error de red al obtener informes de partidos:', msg);
    throw fetchErr;
  }

  if (error) {
    const msg = error.message || '';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      console.warn('[Supabase] Error al obtener informes de partidos por red:', msg);
    } else {
      console.error('Error fetching match reports from Supabase:', error);
    }
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    fecha: row.fecha,
    partido: row.partido,
    competicion: row.competicion,
    categoria: row.categoria || '',
    autor: row.autor,
    equipoLocal: row.equipoLocal || row.equipo_local || '',
    equipoVisitante: row.equipoVisitante || row.equipo_visitante || '',
    escudoLocal: row.escudoLocal || row.escudo_local || undefined,
    escudoVisitante: row.escudoVisitante || row.escudo_visitante || undefined,
    golesLocal: row.golesLocal !== undefined ? row.golesLocal : (row.goles_local !== undefined ? row.goles_local : 0),
    golesVisitante: row.golesVisitante !== undefined ? row.golesVisitante : (row.goles_visitante !== undefined ? row.goles_visitante : 0),
    fechaHoraDetallada: row.fechaHoraDetallada || row.fecha_hora_detallada || undefined,
    comentariosLocal: row.comentariosLocal || row.comentarios_local || '',
    comentariosVisitante: row.comentariosVisitante || row.comentarios_visitante || '',
    jugadoresLocal: typeof row.jugadoresLocal === 'string' ? JSON.parse(row.jugadoresLocal) : (row.jugadoresLocal || (typeof row.jugadores_local === 'string' ? JSON.parse(row.jugadores_local) : (row.jugadores_local || []))),
    jugadoresVisitante: typeof row.jugadoresVisitante === 'string' ? JSON.parse(row.jugadoresVisitante) : (row.jugadoresVisitante || (typeof row.jugadores_visitante === 'string' ? JSON.parse(row.jugadores_visitante) : (row.jugadores_visitante || [])))
  }));
}

/**
 * Saves a single match report to Supabase (upsert pattern).
 */
export async function dbSaveMatchReport(report: MatchReport): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const payload = {
    id: report.id,
    fecha: report.fecha,
    partido: report.partido,
    competicion: report.competicion,
    categoria: report.categoria || '',
    autor: report.autor,
    equipo_local: report.equipoLocal,
    equipoLocal: report.equipoLocal,
    equipo_visitante: report.equipoVisitante,
    equipoVisitante: report.equipoVisitante,
    escudo_local: report.escudoLocal,
    escudoLocal: report.escudoLocal,
    escudo_visitante: report.escudoVisitante,
    escudoVisitante: report.escudoVisitante,
    goles_local: report.golesLocal,
    golesLocal: report.golesLocal,
    goles_visitante: report.golesVisitante,
    golesVisitante: report.golesVisitante,
    fecha_hora_detallada: report.fechaHoraDetallada,
    fechaHoraDetallada: report.fechaHoraDetallada,
    comentarios_local: report.comentariosLocal,
    comentariosLocal: report.comentariosLocal,
    comentarios_visitante: report.comentariosVisitante,
    comentariosVisitante: report.comentariosVisitante,
    jugadores_local: report.jugadoresLocal,
    jugadoresLocal: report.jugadoresLocal,
    jugadores_visitante: report.jugadoresVisitante,
    jugadoresVisitante: report.jugadoresVisitante
  };

  try {
    const { error } = await supabase
      .from('scouting_match_reports')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      if (error.message && error.message.includes('categoria')) {
        const { categoria, ...payloadWithoutCategory } = payload;
        const { error: retryError } = await supabase
          .from('scouting_match_reports')
          .upsert(payloadWithoutCategory, { onConflict: 'id' });
        if (!retryError) {
          console.warn('Informe guardado con éxito pero omitiendo el campo "categoria" ya que no existe en tu base de datos Supabase.');
          return;
        }
      }
      const msg = error.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        console.warn('[Supabase] Error de red al guardar informe:', msg);
      } else {
        console.error('Error saving match report to Supabase:', error);
      }
      throw error;
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      console.warn('[Supabase] Error de red al guardar informe:', msg);
    } else {
      console.error('Error saving match report to Supabase:', err);
    }
    throw err;
  }
}

/**
 * Deletes a single match report from Supabase.
 */
export async function dbDeleteMatchReport(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { error } = await supabase
    .from('scouting_match_reports')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting match report from Supabase:', error);
    throw error;
  }
}

/**
 * Bulk upload match reports to Supabase.
 */
export async function dbBulkUpsertMatchReports(reports: MatchReport[]): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const payloads = reports.map(report => ({
    id: report.id,
    fecha: report.fecha,
    partido: report.partido,
    competicion: report.competicion,
    categoria: report.categoria || '',
    autor: report.autor,
    equipo_local: report.equipoLocal,
    equipoLocal: report.equipoLocal,
    equipo_visitante: report.equipoVisitante,
    equipoVisitante: report.equipoVisitante,
    escudo_local: report.escudoLocal,
    escudoLocal: report.escudoLocal,
    escudo_visitante: report.escudoVisitante,
    escudoVisitante: report.escudoVisitante,
    goles_local: report.golesLocal,
    golesLocal: report.golesLocal,
    goles_visitante: report.golesVisitante,
    golesVisitante: report.golesVisitante,
    fecha_hora_detallada: report.fechaHoraDetallada,
    fechaHoraDetallada: report.fechaHoraDetallada,
    comentarios_local: report.comentariosLocal,
    comentariosLocal: report.comentariosLocal,
    comentarios_visitante: report.comentariosVisitante,
    comentariosVisitante: report.comentariosVisitante,
    jugadores_local: report.jugadoresLocal,
    jugadoresLocal: report.jugadoresLocal,
    jugadores_visitante: report.jugadoresVisitante,
    jugadoresVisitante: report.jugadoresVisitante
  }));

  const { error } = await supabase
    .from('scouting_match_reports')
    .upsert(payloads, { onConflict: 'id' });

  if (error) {
    if (error.message && error.message.includes('categoria')) {
      const retryPayloads = payloads.map(({ categoria, ...rest }) => rest);
      const { error: retryError } = await supabase
        .from('scouting_match_reports')
        .upsert(retryPayloads, { onConflict: 'id' });
      if (!retryError) {
        console.warn('Informes guardados en lote con éxito pero omitiendo el campo "categoria" ya que no existe en tu base de datos Supabase.');
        return;
      }
    }
    console.error('Error bulk upserting match reports to Supabase:', error);
    throw error;
  }
}

/**
 * Generic setting retriever for cloud syncing across Vercel deployments and devices.
 */
export async function dbFetchSetting<T>(key: string, defaultValue: T): Promise<T> {
  if (!supabase) return defaultValue;
  try {
    const { data, error } = await supabase
      .from('scouting_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) return defaultValue;
    return (data.value !== undefined && data.value !== null) ? (data.value as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Generic setting saver for cloud syncing across Vercel deployments and devices.
 */
export async function dbSaveSetting(key: string, value: any): Promise<void> {
  if (!supabase) return;
  try {
    const payload = {
      key,
      value,
      updated_at: new Date().toISOString()
    };
    await safeUpsert('scouting_settings', payload, 'key');
  } catch {
    // Silent fail if scouting_settings table is missing in Supabase. Local storage remains active.
  }
}

/**
 * Generic setting retriever with detailed status response.
 */
export async function dbFetchSettingWithStatus<T>(key: string, defaultValue: T): Promise<{ success: boolean; data: T; error?: string }> {
  if (!supabase) {
    return { success: false, data: defaultValue, error: 'Supabase no está configurado en las variables de entorno (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' };
  }
  try {
    const { data, error } = await supabase
      .from('scouting_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      return { success: false, data: defaultValue, error: error.message || 'Error al consultar la tabla scouting_settings' };
    }
    if (!data) {
      return { success: true, data: defaultValue };
    }
    return { 
      success: true, 
      data: (data.value !== undefined && data.value !== null) ? (data.value as T) : defaultValue 
    };
  } catch (err: any) {
    return { success: false, data: defaultValue, error: err?.message || 'Error de conexión con Supabase.' };
  }
}

/**
 * Generic setting saver with detailed status response.
 */
export async function dbSaveSettingWithStatus(key: string, value: any): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado en las variables de entorno.' };
  }
  try {
    const payload = {
      key,
      value,
      updated_at: new Date().toISOString()
    };
    await safeUpsert('scouting_settings', payload, 'key');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving setting to Supabase:', err);
    return { 
      success: false, 
      error: err?.message || 'Error al guardar. Revisa que la tabla "scouting_settings" exista en Supabase.' 
    };
  }
}

/**
 * Fetch Plan Semanal weeks from Supabase dedicated table scouting_plan_semanal with fallback to settings storage.
 */
export async function dbFetchPlanSemanalWeeks<T = any>(defaultWeeks: T): Promise<T> {
  const res = await dbFetchPlanSemanalWeeksWithStatus<T>(defaultWeeks);
  return res.data;
}

export async function dbFetchPlanSemanalWeeksWithStatus<T = any>(defaultWeeks: T): Promise<{ success: boolean; data: T; error?: string }> {
  if (!supabase) {
    return { success: false, data: defaultWeeks, error: 'Supabase no está configurado.' };
  }

  try {
    const { data, error } = await supabase
      .from('scouting_plan_semanal')
      .select('*');

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data.map((row: any) => ({
        id: row.id,
        nombre: row.nombre || '',
        fechaInicio: row.fecha_inicio || row.fechaInicio || '',
        fechaFin: row.fecha_fin || row.fechaFin || '',
        filename: row.filename || `${row.nombre || ''} del ${row.fecha_inicio || row.fechaInicio || ''} al ${row.fecha_fin || row.fechaFin || ''}`.trim(),
        partidos: typeof row.partidos === 'string' ? JSON.parse(row.partidos) : (row.partidos || [])
      }));
      return { success: true, data: mapped as unknown as T };
    }
  } catch (e) {
    console.warn('Error reading from scouting_plan_semanal, falling back to settings:', e);
  }

  return dbFetchSettingWithStatus<T>('plan_semanal_weeks_v2', defaultWeeks);
}

/**
 * Fetch campogramas from Supabase table scouting_campogramas with fallback to settings storage.
 */
export async function dbFetchCampogramas(): Promise<any[]> {
  if (!supabase || !isSupabaseNetworkAvailable()) {
    return dbFetchSetting<any[]>('campogramas', []);
  }

  try {
    let { data, error } = await supabase
      .from('scouting_campogramas')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      // Fallback 1: try without ordering if updated_at column or order fails
      const res2 = await supabase
        .from('scouting_campogramas')
        .select('*');
      if (!res2.error) {
        data = res2.data;
        error = null;
      }
    }

    if (error) {
      return dbFetchSetting<any[]>('campogramas', []);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      folderId: row.folder_id || row.folderId || 'mensuales',
      subFolderId: row.sub_folder_id || row.subFolderId || undefined,
      monthFolderId: row.month_folder_id || row.monthFolderId || undefined,
      nombre: row.nombre || 'Campograma sin nombre',
      descripcion: row.descripcion || '',
      fechaModificacion: row.fecha_modificacion || row.fechaModificacion || new Date().toLocaleDateString('es-ES'),
      updatedAt: row.updated_at !== undefined ? Number(row.updated_at) : (row.updatedAt !== undefined ? Number(row.updatedAt) : Date.now()),
      formation: row.formation || '4-4-2',
      monthlyView: row.monthly_view !== undefined ? row.monthly_view : (row.monthlyView !== undefined ? row.monthlyView : true),
      assignments: typeof row.assignments === 'string' ? JSON.parse(row.assignments) : (row.assignments || {}),
      monthlyAssignments: typeof row.monthly_assignments === 'string' ? JSON.parse(row.monthly_assignments) : (row.monthlyAssignments ? (typeof row.monthlyAssignments === 'string' ? JSON.parse(row.monthlyAssignments) : row.monthlyAssignments) : {}),
      notes: row.notes || ''
    }));
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      markSupabaseOffline();
    }
    return dbFetchSetting<any[]>('campogramas', []);
  }
}

/**
 * Default tactical formations and system definitions
 */
export const DEFAULT_SISTEMAS_JUEGO: SistemaJuego[] = [
  {
    id: 'sys_4_4_2',
    codigo: '4-4-2',
    nombre: '4-4-2 Standard',
    descripcion: 'Sistema clásico de dos líneas de 4 con 2 delanteros centros o punta y mediapunta.',
    defensas: 4,
    centrocampistas: 4,
    delanteros: 2,
    activo: true,
    posicionesDefecto: [
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
      { id: 'dc_i', label: 'DC', category: 'Delantero', x: 62, y: 18, allowedRoles: ['Delantero Centro', 'Mediapunta'] }
    ]
  },
  {
    id: 'sys_4_3_3',
    codigo: '4-3-3',
    nombre: '4-3-3 Ofensivo',
    descripcion: 'Sistema posicional con pivote defensivo, dos interiores y extremos abiertos.',
    defensas: 4,
    centrocampistas: 3,
    delanteros: 3,
    activo: true,
    posicionesDefecto: [
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
      { id: 'dc', label: 'DC', category: 'Delantero', x: 50, y: 15, allowedRoles: ['Delantero Centro', 'Mediapunta'] }
    ]
  },
  {
    id: 'sys_4_2_3_1',
    codigo: '4-2-3-1',
    nombre: '4-2-3-1 Doble Pivote',
    descripcion: 'Equilibrio defensivo con doble pivote y libertad creativa para mediapunta y bandas.',
    defensas: 4,
    centrocampistas: 5,
    delanteros: 1,
    activo: true,
    posicionesDefecto: [
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
      { id: 'dc', label: 'DC', category: 'Delantero', x: 50, y: 16, allowedRoles: ['Delantero Centro'] }
    ]
  },
  {
    id: 'sys_3_5_2',
    codigo: '3-5-2',
    nombre: '3-5-2 Carrileros',
    descripcion: 'Línea de 3 centrales con dos carrileros de amplio recorrido y doble delantero.',
    defensas: 3,
    centrocampistas: 5,
    delanteros: 2,
    activo: true,
    posicionesDefecto: [
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
      { id: 'dc_i', label: 'DC', category: 'Delantero', x: 62, y: 20, allowedRoles: ['Delantero Centro', 'Mediapunta'] }
    ]
  },
  {
    id: 'sys_5_4_1',
    codigo: '5-4-1',
    nombre: '5-4-1 Bloque Bajo',
    descripcion: 'Estructura defensiva sólida con 5 defensas, 4 centrocampistas y 1 punta.',
    defensas: 5,
    centrocampistas: 4,
    delanteros: 1,
    activo: true,
    posicionesDefecto: [
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
      { id: 'dc', label: 'DC', category: 'Delantero', x: 50, y: 18, allowedRoles: ['Delantero Centro'] }
    ]
  },
  {
    id: 'sys_4_1_4_1',
    codigo: '4-1-4-1',
    nombre: '4-1-4-1 Presión Media',
    descripcion: 'Pivote por delante de la defensa, línea de 4 centrocampistas ofensivos y delantero centro.',
    defensas: 4,
    centrocampistas: 5,
    delanteros: 1,
    activo: true,
    posicionesDefecto: [
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
      { id: 'dc', label: 'DC', category: 'Delantero', x: 50, y: 16, allowedRoles: ['Delantero Centro'] }
    ]
  }
];

/**
 * Helper to get default pitch positions for a tactical system code (e.g. '4-4-2', '4-3-3')
 */
export function getPosicionesDefectoPorSistema(codigo: string): any[] {
  const found = DEFAULT_SISTEMAS_JUEGO.find(s => s.codigo === codigo || s.id === codigo);
  return found?.posicionesDefecto || DEFAULT_SISTEMAS_JUEGO[0].posicionesDefecto || [];
}

/**
 * Saves a single campograma to Supabase (table scouting_campogramas)
 * and automatically synchronizes position records into scouting_posiciones_sistema.
 */
export async function dbSaveCampograma(campograma: any): Promise<void> {
  if (!supabase) return;

  const payload = {
    id: campograma.id,
    folder_id: campograma.folderId,
    folderId: campograma.folderId,
    sub_folder_id: campograma.subFolderId || null,
    subFolderId: campograma.subFolderId || null,
    month_folder_id: campograma.monthFolderId || null,
    monthFolderId: campograma.monthFolderId || null,
    nombre: campograma.nombre,
    descripcion: campograma.descripcion || '',
    fecha_modificacion: campograma.fechaModificacion || new Date().toLocaleDateString('es-ES'),
    fechaModificacion: campograma.fechaModificacion || new Date().toLocaleDateString('es-ES'),
    updated_at: campograma.updatedAt || Date.now(),
    updatedAt: campograma.updatedAt || Date.now(),
    formation: campograma.formation || '4-4-2',
    monthly_view: campograma.monthlyView ?? true,
    monthlyView: campograma.monthlyView ?? true,
    assignments: campograma.assignments || {},
    monthly_assignments: campograma.monthlyAssignments || {},
    monthlyAssignments: campograma.monthlyAssignments || {},
    notes: campograma.notes || ''
  };

  try {
    await safeUpsert('scouting_campogramas', payload, 'id');
  } catch (err) {
    console.debug('Upsert to scouting_campogramas handled locally:', err);
  }

  // Non-blocking sync of position rows into scouting_posiciones_sistema
  if (isSupabaseNetworkAvailable()) {
    syncCampogramaWithPosicionesTable(campograma).catch(() => {});
  }
}

/**
 * Deletes a single campograma from Supabase table scouting_campogramas and its linked positions.
 */
export async function dbDeleteCampograma(id: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('scouting_campogramas')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Error deleting from scouting_campogramas:', error.message || error);
    }
    // Also delete linked positions
    await supabase
      .from('scouting_posiciones_sistema')
      .delete()
      .eq('campograma_id', id);
  } catch (err) {
    console.warn('Error in dbDeleteCampograma:', err);
  }
}

/**
 * Bulk upserts campogramas into Supabase table scouting_campogramas and synchronizes positions.
 */
export async function dbBulkUpsertCampogramas(campogramas: any[]): Promise<void> {
  if (!isSupabaseNetworkAvailable() || campogramas.length === 0) {
    await dbSaveSetting('campogramas', campogramas);
    return;
  }

  const payloads = campogramas.map(campograma => ({
    id: campograma.id,
    folder_id: campograma.folderId,
    folderId: campograma.folderId,
    sub_folder_id: campograma.subFolderId || null,
    subFolderId: campograma.subFolderId || null,
    month_folder_id: campograma.monthFolderId || null,
    monthFolderId: campograma.monthFolderId || null,
    nombre: campograma.nombre,
    descripcion: campograma.descripcion || '',
    fecha_modificacion: campograma.fechaModificacion || new Date().toLocaleDateString('es-ES'),
    fechaModificacion: campograma.fechaModificacion || new Date().toLocaleDateString('es-ES'),
    updated_at: campograma.updatedAt || Date.now(),
    updatedAt: campograma.updatedAt || Date.now(),
    formation: campograma.formation || '4-4-2',
    monthly_view: campograma.monthlyView ?? true,
    monthlyView: campograma.monthlyView ?? true,
    assignments: campograma.assignments || {},
    monthly_assignments: campograma.monthlyAssignments || {},
    monthlyAssignments: campograma.monthlyAssignments || {},
    notes: campograma.notes || ''
  }));

  try {
    await safeBulkUpsert('scouting_campogramas', payloads, 'id');
  } catch (err) {
    console.debug('Bulk upsert to scouting_campogramas handled locally:', err);
    await dbSaveSetting('campogramas', campogramas);
  }

  // Synchronize positions in background for each campograma
  if (isSupabaseNetworkAvailable()) {
    for (const c of campogramas) {
      syncCampogramaWithPosicionesTable(c).catch(() => {});
    }
  }
}

/**
 * Fetches tactical systems (sistemas de juego) from Supabase table scouting_sistemas_juego.
 */
export async function dbFetchSistemasJuego(): Promise<SistemaJuego[]> {
  if (!supabase) {
    return DEFAULT_SISTEMAS_JUEGO;
  }

  try {
    const { data, error } = await supabase
      .from('scouting_sistemas_juego')
      .select('*')
      .order('codigo', { ascending: true });

    if (error || !data || data.length === 0) {
      // Try fetching fallback from settings
      const settingsFallback = await dbFetchSetting<SistemaJuego[]>('sistemas_juego', []);
      if (settingsFallback && settingsFallback.length > 0) {
        return settingsFallback;
      }
      // Seed default tactical systems into Supabase in background
      dbBulkUpsertSistemasJuego(DEFAULT_SISTEMAS_JUEGO).catch(() => {});
      return DEFAULT_SISTEMAS_JUEGO;
    }

    return data.map((row: any) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion || '',
      defensas: Number(row.defensas ?? 4),
      centrocampistas: Number(row.centrocampistas ?? 4),
      delanteros: Number(row.delanteros ?? 2),
      activo: row.activo ?? true,
      posicionesDefecto: typeof row.posiciones_defecto === 'string'
        ? JSON.parse(row.posiciones_defecto)
        : (row.posiciones_defecto || row.posicionesDefecto || getPosicionesDefectoPorSistema(row.codigo)),
      updatedAt: row.updated_at ? Number(row.updated_at) : Date.now()
    }));
  } catch (err) {
    console.warn('Error fetching scouting_sistemas_juego:', err);
    return DEFAULT_SISTEMAS_JUEGO;
  }
}

/**
 * Saves a single tactical system to Supabase (scouting_sistemas_juego).
 */
export async function dbSaveSistemaJuego(sistema: SistemaJuego): Promise<void> {
  if (!supabase) return;
  const payload = {
    id: sistema.id,
    codigo: sistema.codigo,
    nombre: sistema.nombre,
    descripcion: sistema.descripcion || '',
    defensas: sistema.defensas,
    centrocampistas: sistema.centrocampistas,
    delanteros: sistema.delanteros,
    posiciones_defecto: sistema.posicionesDefecto || getPosicionesDefectoPorSistema(sistema.codigo),
    activo: sistema.activo ?? true,
    updated_at: sistema.updatedAt || Date.now()
  };

  try {
    await safeUpsert('scouting_sistemas_juego', payload, 'id');
  } catch (err) {
    console.debug('Failed saving to scouting_sistemas_juego, fallback to local settings:', err);
  }
}

/**
 * Bulk upserts tactical systems into Supabase table scouting_sistemas_juego.
 */
export async function dbBulkUpsertSistemasJuego(sistemas: SistemaJuego[]): Promise<void> {
  if (!isSupabaseNetworkAvailable() || sistemas.length === 0) {
    await dbSaveSetting('sistemas_juego', sistemas);
    return;
  }
  const payloads = sistemas.map(s => ({
    id: s.id,
    codigo: s.codigo,
    nombre: s.nombre,
    descripcion: s.descripcion || '',
    defensas: s.defensas,
    centrocampistas: s.centrocampistas,
    delanteros: s.delanteros,
    posiciones_defecto: s.posicionesDefecto || getPosicionesDefectoPorSistema(s.codigo),
    activo: s.activo ?? true,
    updated_at: s.updatedAt || Date.now()
  }));

  try {
    await safeBulkUpsert('scouting_sistemas_juego', payloads, 'id');
  } catch (err) {
    console.debug('Failed bulk upsert to scouting_sistemas_juego, fallback to local settings:', err);
    await dbSaveSetting('sistemas_juego', sistemas);
  }
}

/**
 * Fetches player pitch positions linked to a tactical system and campograma from scouting_posiciones_sistema.
 */
export async function dbFetchPosicionesSistema(campogramaId?: string, sistemaId?: string): Promise<PosicionSistema[]> {
  if (!supabase) return [];
  try {
    let query = supabase.from('scouting_posiciones_sistema').select('*');
    if (campogramaId) {
      query = query.eq('campograma_id', campogramaId);
    }
    if (sistemaId) {
      query = query.eq('sistema_id', sistemaId);
    }
    const { data, error } = await query.order('orden', { ascending: true });
    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      sistemaId: row.sistema_id || row.sistemaId,
      campogramaId: row.campograma_id || row.campogramaId,
      posicionId: row.posicion_id || row.posicionId,
      posicionLabel: row.posicion_label || row.posicionLabel || '',
      categoriaPosicion: row.categoria_posicion || row.categoriaPosicion || 'Defensa',
      coordX: Number(row.coord_x ?? row.coordX ?? 50),
      coordY: Number(row.coord_y ?? row.coordY ?? 50),
      allowedRoles: typeof row.allowed_roles === 'string'
        ? JSON.parse(row.allowed_roles)
        : (row.allowed_roles || row.allowedRoles || []),
      jugadorId: row.jugador_id || row.jugadorId || null,
      jugadoresMensualesIds: typeof row.jugadores_mensuales_ids === 'string'
        ? JSON.parse(row.jugadores_mensuales_ids)
        : (row.jugadores_mensuales_ids || row.jugadoresMensualesIds || []),
      orden: Number(row.orden ?? 0),
      notas: row.notas || '',
      updatedAt: row.updated_at ? Number(row.updated_at) : Date.now()
    }));
  } catch (err) {
    console.warn('Error in dbFetchPosicionesSistema:', err);
    return [];
  }
}

/**
 * Saves a single position record linked to a system into scouting_posiciones_sistema.
 */
export async function dbSavePosicionSistema(pos: PosicionSistema): Promise<void> {
  if (!isSupabaseNetworkAvailable()) return;
  const payload = {
    id: pos.id,
    sistema_id: pos.sistemaId,
    campograma_id: pos.campogramaId,
    posicion_id: pos.posicionId,
    posicion_label: pos.posicionLabel,
    categoria_posicion: pos.categoriaPosicion,
    coord_x: pos.coordX,
    coord_y: pos.coordY,
    allowed_roles: pos.allowedRoles || [],
    jugador_id: pos.jugadorId || null,
    jugadores_mensuales_ids: pos.jugadoresMensualesIds || [],
    orden: pos.orden ?? 0,
    notas: pos.notas || ''
  };

  try {
    await safeUpsert('scouting_posiciones_sistema', payload, 'id');
  } catch (err) {
    // Non-blocking position sync handled locally
  }
}

/**
 * Bulk upserts position records into scouting_posiciones_sistema.
 */
export async function dbBulkUpsertPosicionesSistema(posiciones: PosicionSistema[]): Promise<void> {
  if (!isSupabaseNetworkAvailable() || posiciones.length === 0) return;
  const payloads = posiciones.map(pos => ({
    id: pos.id,
    sistema_id: pos.sistemaId,
    campograma_id: pos.campogramaId,
    posicion_id: pos.posicionId,
    posicion_label: pos.posicionLabel,
    categoria_posicion: pos.categoriaPosicion,
    coord_x: pos.coordX,
    coord_y: pos.coordY,
    allowed_roles: pos.allowedRoles || [],
    jugador_id: pos.jugadorId || null,
    jugadores_mensuales_ids: pos.jugadoresMensualesIds || [],
    orden: pos.orden ?? 0,
    notas: pos.notas || ''
  }));

  try {
    await safeBulkUpsert('scouting_posiciones_sistema', payloads, 'id');
  } catch (err) {
    // Graceful fallback handled locally without logging uncaught warnings
  }
}

/**
 * Synchronizes campograma positions (titulares y mensuales) into scouting_posiciones_sistema table.
 */
export async function syncCampogramaWithPosicionesTable(
  campograma: any,
  tacticalPositions?: any[]
): Promise<void> {
  if (!isSupabaseNetworkAvailable() || !campograma || !campograma.id) return;
  try {
    const formationCode = campograma.formation || '4-4-2';
    const positionsList = tacticalPositions && tacticalPositions.length > 0
      ? tacticalPositions
      : getPosicionesDefectoPorSistema(formationCode);

    const assignments = campograma.assignments || {};
    const monthlyAssignments = campograma.monthlyAssignments || campograma.monthly_assignments || {};

    const positionRecords: PosicionSistema[] = positionsList.map((pos: any, index: number) => {
      const posId = pos.id;
      const recordId = `pos_${campograma.id}_${posId}`;
      const titularPlayerId = assignments[posId] || null;
      const monthlyList = Array.isArray(monthlyAssignments[posId]) ? monthlyAssignments[posId] : [];

      return {
        id: recordId,
        sistemaId: formationCode,
        campogramaId: campograma.id,
        posicionId: posId,
        posicionLabel: pos.label || posId.toUpperCase(),
        categoriaPosicion: pos.category || 'Centrocampista',
        coordX: pos.x ?? 50,
        coordY: pos.y ?? 50,
        allowedRoles: pos.allowedRoles || [],
        jugadorId: titularPlayerId,
        jugadoresMensualesIds: monthlyList,
        orden: index,
        notas: campograma.notes || '',
        updatedAt: Date.now()
      };
    });

    await dbBulkUpsertPosicionesSistema(positionRecords);
  } catch (err) {
    // Non-blocking position sync fallback
  }
}


/**
 * Deletes a week from Supabase scouting_plan_semanal table and settings backup.
 */
export async function dbDeletePlanSemanalWeek(id: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  let tableError: string | undefined;
  try {
    const { error } = await supabase
      .from('scouting_plan_semanal')
      .delete()
      .eq('id', id);
    if (error) {
      tableError = error.message;
    }
  } catch (err: any) {
    tableError = err?.message || String(err);
  }

  try {
    const { data } = await supabase
      .from('scouting_settings')
      .select('value')
      .eq('key', 'plan_semanal_weeks_v2')
      .maybeSingle();

    if (data && Array.isArray(data.value)) {
      const updated = data.value.filter((w: any) => w.id !== id);
      await dbSaveSettingWithStatus('plan_semanal_weeks_v2', updated);
    }
  } catch (e) {
    // Non-blocking fallback
  }

  return { success: !tableError, error: tableError };
}

/**
 * Save Plan Semanal weeks to Supabase settings storage.
 */
export async function dbSavePlanSemanalWeeks(weeks: any): Promise<void> {
  await dbSavePlanSemanalWeeksWithStatus(weeks);
}

export async function dbSavePlanSemanalWeeksWithStatus(weeks: any[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  let tableSuccess = false;
  let tableErrorMsg: string | undefined;

  try {
    const payloads = (weeks || []).map((w: any) => ({
      id: w.id,
      nombre: w.nombre,
      fecha_inicio: w.fechaInicio || w.fecha_inicio || '',
      fechaInicio: w.fechaInicio || w.fecha_inicio || '',
      fecha_fin: w.fechaFin || w.fecha_fin || '',
      fechaFin: w.fechaFin || w.fecha_fin || '',
      filename: w.filename || `${w.nombre} del ${w.fechaInicio || ''} al ${w.fechaFin || ''}`,
      partidos: w.partidos || [],
      updated_at: Date.now(),
      updatedAt: Date.now()
    }));

    if (payloads.length > 0) {
      await safeBulkUpsert('scouting_plan_semanal', payloads, 'id');
      tableSuccess = true;
    }

    // Clean up any deleted weeks from the table that are no longer in the list
    const currentIds = (weeks || []).map((w: any) => w.id).filter(Boolean);
    try {
      const { data: existingRows } = await supabase
        .from('scouting_plan_semanal')
        .select('id');
      
      if (Array.isArray(existingRows)) {
        const toDeleteIds = existingRows
          .map(r => r.id)
          .filter(id => id && !currentIds.includes(id));

        if (toDeleteIds.length > 0) {
          await supabase
            .from('scouting_plan_semanal')
            .delete()
            .in('id', toDeleteIds);
        }
      }
    } catch (cleanErr) {
      console.warn('Non-blocking error cleaning deleted weeks in scouting_plan_semanal:', cleanErr);
    }
  } catch (err: any) {
    console.warn('Upsert to scouting_plan_semanal failed, saving to settings fallback:', err);
    tableErrorMsg = err?.message || String(err);
  }

  // Also save to settings table as resilient backup
  const settingsRes = await dbSaveSettingWithStatus('plan_semanal_weeks_v2', weeks);

  if (tableSuccess || settingsRes.success) {
    return { success: true };
  }

  return { success: false, error: tableErrorMsg || settingsRes.error || 'Error al guardar el plan semanal en Supabase.' };
}

/**
 * Returns a SQL code snippet that the user can run in the Supabase SQL editor to bootstrap
 * their table automatically.
 */
export function getSQLInstructions(): string {
  return `-- Opción A: Si ya tienes las tablas creadas y quieres habilitar las valoraciones físicas, fichajes 2026, campogramas y plan semanal, ejecuta esto en el SQL Editor de Supabase:
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS dorsal INTEGER;
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
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS besoccer_url TEXT;
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS "besoccerUrl" TEXT;
ALTER TABLE scouting_match_reports ADD COLUMN IF NOT EXISTS categoria TEXT;

-- TABLA DEDICADA PARA EL PLAN SEMANAL (AGENDA DE SCOUTING)
CREATE TABLE IF NOT EXISTS scouting_plan_semanal (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha_inicio TEXT,
  "fechaInicio" TEXT,
  fecha_fin TEXT,
  "fechaFin" TEXT,
  filename TEXT,
  partidos JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_plan_semanal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en plan semanal" ON scouting_plan_semanal;
CREATE POLICY "Permitir todo en plan semanal" ON scouting_plan_semanal FOR ALL USING (true) WITH CHECK (true);

-- TABLA DEDICADA PARA CAMPOGRAMAS
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  "folderId" TEXT,
  sub_folder_id TEXT,
  "subFolderId" TEXT,
  month_folder_id TEXT,
  "monthFolderId" TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT true,
  "monthlyView" BOOLEAN DEFAULT true,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT DEFAULT '2rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT DEFAULT '2rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;
DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas FOR ALL USING (true) WITH CHECK (true);

-- TABLA DEDICADA PARA SISTEMAS DE JUEGO / FORMACIONES TÁCTICAS
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS formacion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS defensas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS centrocampistas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS delanteros INTEGER DEFAULT 2;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS posiciones_defecto JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "posicionesDefecto" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- TABLA DEDICADA PARA POSICIONES DE JUGADORES VINCULADAS A SISTEMAS Y CAMPOGRAMAS
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS sistema_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "sistemaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS campograma_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "campogramaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_label TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionLabel" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS categoria_posicion TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "categoriaPosicion" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_x NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordX" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_y NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordY" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS allowed_roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "allowedRoles" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugador_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadorId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS scouting_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE scouting_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en settings" ON scouting_settings;
CREATE POLICY "Permitir todo en settings" ON scouting_settings FOR ALL USING (true) WITH CHECK (true);

-- Forzar recarga de cache del esquema en Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';

-- Opción B: Copia y pega esta sentencia para inicializar tus tablas desde cero en el SQL Editor de Supabase:

CREATE TABLE IF NOT EXISTS scouting_players (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  equipo TEXT NOT NULL,
  categoria TEXT,
  posicion TEXT NOT NULL,
  ano_nacimiento INTEGER,
  "anoNacimiento" INTEGER,
  lateralidad TEXT NOT NULL,
  dorsal INTEGER,
  valor_mercado BIGINT,
  "valorMercado" BIGINT,
  calificacion INTEGER,
  notas TEXT,
  atributos JSONB,
  fecha_registro TEXT,
  "fechaRegistro" TEXT,
  altura TEXT,
  recomendacion TEXT,
  valoracion TEXT,
  recomendacion_comentario TEXT,
  "recomendacionComentario" TEXT,
  descripcion_general TEXT,
  "descripcionGeneral" TEXT,
  fortalezas TEXT,
  debilidades TEXT,
  en_su_equipo TEXT,
  "enSuEquipo" TEXT,
  en_pocas_palabras TEXT,
  "enPocasPalabras" TEXT,
  tiene_valor_por TEXT,
  "tieneValorPor" TEXT,
  pitch_x REAL,
  "pitchX" REAL,
  pitch_y REAL,
  "pitchY" REAL,
  elo INTEGER,
  escudo_url TEXT,
  "escudoUrl" TEXT,
  foto_url TEXT,
  "fotoUrl" TEXT,
  besoccer_url TEXT,
  "besoccerUrl" TEXT,
  valoracion_fisica JSONB,
  "valoracionFisica" JSONB,
  fichaje_fecha TEXT,
  "fichajeFecha" TEXT,
  fichaje_detalles TEXT,
  "fichajeDetalles" TEXT,
  fichaje_origen TEXT,
  "fichajeOrigen" TEXT,
  es_fichaje_verano_2026 BOOLEAN,
  "esFichajeVerano2026" BOOLEAN
);

-- Habilitar el acceso anónimo de lectura, escritura y borrado en jugadores
ALTER TABLE scouting_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo a usuarios anónimos" ON scouting_players;
CREATE POLICY "Permitir todo a usuarios anónimos" ON scouting_players
  FOR ALL USING (true) WITH CHECK (true);

-- TABLA PARA INFORMES DE PARTIDOS (ACTAS DE ALINEACIÓN TÁCTICA)
CREATE TABLE IF NOT EXISTS scouting_match_reports (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  partido TEXT NOT NULL,
  competicion TEXT NOT NULL,
  categoria TEXT,
  autor TEXT NOT NULL,
  equipo_local TEXT NOT NULL,
  "equipoLocal" TEXT,
  equipo_visitante TEXT NOT NULL,
  "equipoVisitante" TEXT,
  escudo_local TEXT,
  "escudoLocal" TEXT,
  escudo_visitante TEXT,
  "escudoVisitante" TEXT,
  goles_local INTEGER NOT NULL DEFAULT 0,
  "golesLocal" INTEGER,
  goles_visitante INTEGER NOT NULL DEFAULT 0,
  "golesVisitante" INTEGER,
  fecha_hora_detallada TEXT,
  "fechaHoraDetallada" TEXT,
  comentarios_local TEXT,
  "comentariosLocal" TEXT,
  comentarios_visitante TEXT,
  "comentariosVisitante" TEXT,
  jugadores_local JSONB NOT NULL DEFAULT '[]'::jsonb,
  "jugadoresLocal" JSONB,
  jugadores_visitante JSONB NOT NULL DEFAULT '[]'::jsonb,
  "jugadoresVisitante" JSONB
);

-- Habilitar el acceso anónimo de lectura, escritura y borrado en informes de partidos
ALTER TABLE scouting_match_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en informes de partidos" ON scouting_match_reports;
CREATE POLICY "Permitir todo en informes de partidos" ON scouting_match_reports
  FOR ALL USING (true) WITH CHECK (true);

-- TABLA DEDICADA PARA EL PLAN SEMANAL (AGENDA DE SCOUTING)
CREATE TABLE IF NOT EXISTS scouting_plan_semanal (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha_inicio TEXT,
  "fechaInicio" TEXT,
  fecha_fin TEXT,
  "fechaFin" TEXT,
  filename TEXT,
  partidos JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_plan_semanal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en plan semanal" ON scouting_plan_semanal;
CREATE POLICY "Permitir todo en plan semanal" ON scouting_plan_semanal
  FOR ALL USING (true) WITH CHECK (true);

-- TABLA DEDICADA PARA CAMPOGRAMAS Y PIZARRAS TÁCTICAS
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  "folderId" TEXT,
  sub_folder_id TEXT,
  "subFolderId" TEXT,
  month_folder_id TEXT,
  "monthFolderId" TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT true,
  "monthlyView" BOOLEAN DEFAULT true,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Asegurar purga de campogramas eliminados antiguos
DELETE FROM scouting_campogramas WHERE id IN ('c_agosto_2026_1rfef_g1', 'c_agosto_2026_1rfef_g2');

-- Forzar recarga de cache del esquema en Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Returns the exact SQL script to create and initialize the table and all campogramas for Octubre (Primera RFEF Grupo I y Grupo II) in Supabase.
 */
export function getCampogramaOctubreSQL(): string {
  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CARPETA OCTUBRE (PRIMERA RFEF GRUPO I Y GRUPO II) EN SUPABASE
-- ==============================================================================

-- 1. Crear la tabla de campogramas tácticos si no existe
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'mensuales',
  "folderId" TEXT DEFAULT 'mensuales',
  sub_folder_id TEXT DEFAULT '1rfef',
  "subFolderId" TEXT DEFAULT '1rfef',
  month_folder_id TEXT DEFAULT 'octubre',
  "monthFolderId" TEXT DEFAULT 'octubre',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- 2. Habilitar seguridad RLS y políticas de acceso
ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT DEFAULT '1rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT DEFAULT '1rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT DEFAULT 'octubre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT DEFAULT 'octubre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;

DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas 
  FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE SISTEMAS DE JUEGO (FORMACIONES TÁCTICAS)
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 4. TABLA DE POSICIONES DE LOS JUGADORES VINCULADAS AL SISTEMA Y CAMPOGRAMA
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 5. Insertar o actualizar los Campogramas de la Carpeta OCTUBRE (1ª RFEF Grupo I y Grupo II)
INSERT INTO scouting_campogramas (
  id,
  folder_id,
  "folderId",
  sub_folder_id,
  "subFolderId",
  month_folder_id,
  "monthFolderId",
  nombre,
  descripcion,
  fecha_modificacion,
  "fechaModificacion",
  updated_at,
  "updatedAt",
  formation,
  monthly_view,
  "monthlyView",
  assignments,
  monthly_assignments,
  "monthlyAssignments",
  notes
) VALUES 
(
  'c_octubre_2026_1rfef_g1',
  'mensuales',
  'mensuales',
  '1rfef',
  '1rfef',
  'octubre',
  'octubre',
  'PRIMERA RFEF GRUPO I - OCTUBRE 2026',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo I (Octubre 2026)',
  '01/10/2026',
  '01/10/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo I en Octubre 2026 vinculado a Supabase.'
),
(
  'c_octubre_2026_1rfef_g2',
  'mensuales',
  'mensuales',
  '1rfef',
  '1rfef',
  'octubre',
  'octubre',
  'PRIMERA RFEF GRUPO II - OCTUBRE 2026',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo II (Octubre 2026)',
  '01/10/2026',
  '01/10/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo II en Octubre 2026 vinculado a Supabase.'
)
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

-- 6. Insertar las 11 posiciones para Primera RFEF Grupo I (Octubre 2026)
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
) VALUES
  ('pos_c_octubre_2026_1rfef_g1_por', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'por', 'por', 'POR', 'POR', 'Portero', 'Portero', 50, 50, 88, 88, '["Portero"]'::jsonb, '["Portero"]'::jsonb, 0, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_ltd', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'ltd', 'ltd', 'LTD', 'LTD', 'Defensa', 'Defensa', 15, 15, 70, 70, '["Lateral Derecho", "Defensa Central"]'::jsonb, '["Lateral Derecho", "Defensa Central"]'::jsonb, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_dfc_d', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'dfc_d', 'dfc_d', 'DFC', 'DFC', 'Defensa', 'Defensa', 38, 38, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_dfc_i', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'dfc_i', 'dfc_i', 'DFC', 'DFC', 'Defensa', 'Defensa', 62, 62, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_lti', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'lti', 'lti', 'LTI', 'LTI', 'Defensa', 'Defensa', 85, 85, 70, 70, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, 4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_md', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'md', 'md', 'MD', 'MD', 'Centrocampista', 'Centrocampista', 15, 15, 44, 44, '["Extremo Derecho", "Mediocentro"]'::jsonb, '["Extremo Derecho", "Mediocentro"]'::jsonb, 5, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_mc_d', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'mc_d', 'mc_d', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 38, 38, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 6, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_mc_i', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'mc_i', 'mc_i', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 62, 62, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 7, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_mi', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'mi', 'mi', 'MI', 'MI', 'Centrocampista', 'Centrocampista', 85, 85, 44, 44, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, 8, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_dc_d', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'dc_d', 'dc_d', 'DC', 'DC', 'Delantero', 'Delantero', 38, 38, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 9, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g1_dc_i', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g1', 'c_octubre_2026_1rfef_g1', 'dc_i', 'dc_i', 'DC', 'DC', 'Delantero', 'Delantero', 62, 62, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 10, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 7. Insertar las 11 posiciones para Primera RFEF Grupo II (Octubre 2026)
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
) VALUES
  ('pos_c_octubre_2026_1rfef_g2_por', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'por', 'por', 'POR', 'POR', 'Portero', 'Portero', 50, 50, 88, 88, '["Portero"]'::jsonb, '["Portero"]'::jsonb, 0, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_ltd', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'ltd', 'ltd', 'LTD', 'LTD', 'Defensa', 'Defensa', 15, 15, 70, 70, '["Lateral Derecho", "Defensa Central"]'::jsonb, '["Lateral Derecho", "Defensa Central"]'::jsonb, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_dfc_d', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'dfc_d', 'dfc_d', 'DFC', 'DFC', 'Defensa', 'Defensa', 38, 38, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_dfc_i', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'dfc_i', 'dfc_i', 'DFC', 'DFC', 'Defensa', 'Defensa', 62, 62, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_lti', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'lti', 'lti', 'LTI', 'LTI', 'Defensa', 'Defensa', 85, 85, 70, 70, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, 4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_md', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'md', 'md', 'MD', 'MD', 'Centrocampista', 'Centrocampista', 15, 15, 44, 44, '["Extremo Derecho", "Mediocentro"]'::jsonb, '["Extremo Derecho", "Mediocentro"]'::jsonb, 5, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_mc_d', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'mc_d', 'mc_d', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 38, 38, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 6, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_mc_i', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'mc_i', 'mc_i', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 62, 62, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 7, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_mi', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'mi', 'mi', 'MI', 'MI', 'Centrocampista', 'Centrocampista', 85, 85, 44, 44, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, 8, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_dc_d', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'dc_d', 'dc_d', 'DC', 'DC', 'Delantero', 'Delantero', 38, 38, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 9, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_octubre_2026_1rfef_g2_dc_i', '4-4-2', '4-4-2', 'c_octubre_2026_1rfef_g2', 'c_octubre_2026_1rfef_g2', 'dc_i', 'dc_i', 'DC', 'DC', 'Delantero', 'Delantero', 62, 62, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 10, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 8. Notificar a PostgREST para recargar el esquema de tablas en tiempo real
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Helper to build SQL initialization for any specific month in 2027 or 2026.
 */
export function generateMonthCampogramasSQL(monthKey: string, monthNameUpper: string, year: number = 2027): string {
  const dateStr = `01/${monthKey === 'enero' ? '01' : monthKey === 'febrero' ? '02' : monthKey === 'marzo' ? '03' : monthKey === 'abril' ? '04' : monthKey === 'mayo' ? '05' : monthKey === 'septiembre' ? '09' : monthKey === 'octubre' ? '10' : monthKey === 'noviembre' ? '11' : '12'}/${year}`;
  
  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CARPETA ${monthNameUpper} ${year} (1ª RFEF G1-G2 Y 2ª RFEF G1-G5) EN SUPABASE
-- ==============================================================================

-- 1. Crear la tabla de campogramas tácticos si no existe
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'mensuales',
  "folderId" TEXT DEFAULT 'mensuales',
  sub_folder_id TEXT,
  "subFolderId" TEXT,
  month_folder_id TEXT DEFAULT '${monthKey}',
  "monthFolderId" TEXT DEFAULT '${monthKey}',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- 2. Habilitar seguridad RLS y políticas de acceso
ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT DEFAULT '${monthKey}';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT DEFAULT '${monthKey}';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;

DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas 
  FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE SISTEMAS DE JUEGO (FORMACIONES TÁCTICAS)
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 4. TABLA DE POSICIONES DE LOS JUGADORES VINCULADAS AL SISTEMA Y CAMPOGRAMA
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 5. Insertar o actualizar los 7 Campogramas de la Carpeta ${monthNameUpper} ${year}
INSERT INTO scouting_campogramas (
  id, folder_id, "folderId", sub_folder_id, "subFolderId", month_folder_id, "monthFolderId",
  nombre, descripcion, fecha_modificacion, "fechaModificacion", updated_at, "updatedAt",
  formation, monthly_view, "monthlyView", assignments, monthly_assignments, "monthlyAssignments", notes
) VALUES 
-- PRIMERA RFEF - ${monthNameUpper} ${year}
(
  'c_${monthKey}_${year}_1rfef_g1',
  'mensuales', 'mensuales', '1rfef', '1rfef', '${monthKey}', '${monthKey}',
  'PRIMERA RFEF GRUPO I - ${monthNameUpper} ${year}',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo I (${monthNameUpper} ${year})',
  '${dateStr}', '${dateStr}',
  EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo I en ${monthNameUpper} ${year}.'
),
(
  'c_${monthKey}_${year}_1rfef_g2',
  'mensuales', 'mensuales', '1rfef', '1rfef', '${monthKey}', '${monthKey}',
  'PRIMERA RFEF GRUPO II - ${monthNameUpper} ${year}',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo II (${monthNameUpper} ${year})',
  '${dateStr}', '${dateStr}',
  EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo II en ${monthNameUpper} ${year}.'
),
-- SEGUNDA RFEF - ${monthNameUpper} ${year} (GRUPOS I AL V)
(
  'c_${monthKey}_${year}_2rfef_g1',
  'mensuales', 'mensuales', '2rfef', '2rfef', '${monthKey}', '${monthKey}',
  'SEGUNDA RFEF GRUPO I - ${monthNameUpper} ${year}',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo I (${monthNameUpper} ${year})',
  '${dateStr}', '${dateStr}',
  EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo I en ${monthNameUpper} ${year}.'
),
(
  'c_${monthKey}_${year}_2rfef_g2',
  'mensuales', 'mensuales', '2rfef', '2rfef', '${monthKey}', '${monthKey}',
  'SEGUNDA RFEF GRUPO II - ${monthNameUpper} ${year}',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo II (${monthNameUpper} ${year})',
  '${dateStr}', '${dateStr}',
  EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo II en ${monthNameUpper} ${year}.'
),
(
  'c_${monthKey}_${year}_2rfef_g3',
  'mensuales', 'mensuales', '2rfef', '2rfef', '${monthKey}', '${monthKey}',
  'SEGUNDA RFEF GRUPO III - ${monthNameUpper} ${year}',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo III (${monthNameUpper} ${year})',
  '${dateStr}', '${dateStr}',
  EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo III en ${monthNameUpper} ${year}.'
),
(
  'c_${monthKey}_${year}_2rfef_g4',
  'mensuales', 'mensuales', '2rfef', '2rfef', '${monthKey}', '${monthKey}',
  'SEGUNDA RFEF GRUPO IV - ${monthNameUpper} ${year}',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo IV (${monthNameUpper} ${year})',
  '${dateStr}', '${dateStr}',
  EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo IV en ${monthNameUpper} ${year}.'
),
(
  'c_${monthKey}_${year}_2rfef_g5',
  'mensuales', 'mensuales', '2rfef', '2rfef', '${monthKey}', '${monthKey}',
  'SEGUNDA RFEF GRUPO V - ${monthNameUpper} ${year}',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo V (${monthNameUpper} ${year})',
  '${dateStr}', '${dateStr}',
  EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo V en ${monthNameUpper} ${year}.'
)
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

-- 6. Insertar posiciones para cada uno de los 7 campogramas de ${monthNameUpper} ${year}
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
)
SELECT 
  'pos_' || c.id || '_' || p.pos_id as id,
  '4-4-2' as sistema_id,
  '4-4-2' as "sistemaId",
  c.id as campograma_id,
  c.id as "campogramaId",
  p.pos_id as posicion_id,
  p.pos_id as "posicionId",
  p.label as posicion_label,
  p.label as "posicionLabel",
  p.cat as categoria_posicion,
  p.cat as "categoriaPosicion",
  p.cx as coord_x,
  p.cx as "coordX",
  p.cy as coord_y,
  p.cy as "coordY",
  p.roles::jsonb as allowed_roles,
  p.roles::jsonb as "allowedRoles",
  p.ord as orden,
  EXTRACT(EPOCH FROM NOW()) * 1000 as updated_at,
  EXTRACT(EPOCH FROM NOW()) * 1000 as "updatedAt"
FROM (
  VALUES 
    ('c_${monthKey}_${year}_1rfef_g1'),
    ('c_${monthKey}_${year}_1rfef_g2'),
    ('c_${monthKey}_${year}_2rfef_g1'),
    ('c_${monthKey}_${year}_2rfef_g2'),
    ('c_${monthKey}_${year}_2rfef_g3'),
    ('c_${monthKey}_${year}_2rfef_g4'),
    ('c_${monthKey}_${year}_2rfef_g5')
) as c(id)
CROSS JOIN (
  VALUES 
    ('por', 'POR', 'Portero', 50, 88, '["Portero"]', 0),
    ('ltd', 'LTD', 'Defensa', 15, 70, '["Lateral Derecho", "Defensa Central"]', 1),
    ('dfc_d', 'DFC', 'Defensa', 38, 72, '["Defensa Central"]', 2),
    ('dfc_i', 'DFC', 'Defensa', 62, 72, '["Defensa Central"]', 3),
    ('lti', 'LTI', 'Defensa', 85, 70, '["Lateral Izquierdo", "Defensa Central"]', 4),
    ('md', 'MD', 'Centrocampista', 15, 44, '["Extremo Derecho", "Mediocentro"]', 5),
    ('mc_d', 'MC', 'Centrocampista', 38, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]', 6),
    ('mc_i', 'MC', 'Centrocampista', 62, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]', 7),
    ('mi', 'MI', 'Centrocampista', 85, 44, '["Extremo Izquierdo", "Mediocentro"]', 8),
    ('dc_d', 'DC', 'Delantero', 38, 18, '["Delantero Centro", "Mediapunta"]', 9),
    ('dc_i', 'DC', 'Delantero', 62, 18, '["Delantero Centro", "Mediapunta"]', 10)
) as p(pos_id, label, cat, cx, cy, roles, ord)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 7. Notificar a PostgREST para recargar el esquema de tablas en tiempo real
NOTIFY pgrst, 'reload schema';
`;
}

export function getCampogramaEnero2027SQL(): string {
  return generateMonthCampogramasSQL('enero', 'ENERO', 2027);
}

export function getCampogramaFebrero2027SQL(): string {
  return generateMonthCampogramasSQL('febrero', 'FEBRERO', 2027);
}

export function getCampogramaMarzo2027SQL(): string {
  return generateMonthCampogramasSQL('marzo', 'MARZO', 2027);
}

export function getCampogramaAbril2027SQL(): string {
  return generateMonthCampogramasSQL('abril', 'ABRIL', 2027);
}

export function getCampogramaMayo2027SQL(): string {
  return generateMonthCampogramasSQL('mayo', 'MAYO', 2027);
}

/**
 * Returns complete SQL initialization for ALL 2027 months (Enero, Febrero, Marzo, Abril, Mayo) with 35 campogramas in total.
 */
export function getCampogramas2027CompletoSQL(): string {
  return `-- ==============================================================================
-- SQL: VINCULACIÓN COMPLETA AÑO 2027 (ENERO, FEBRERO, MARZO, ABRIL, MAYO) EN SUPABASE
-- 35 CAMPOGRAMAS: 1ª RFEF G1-G2 Y 2ª RFEF G1-G5 POR CADA MES
-- ==============================================================================

-- 1. Crear tabla scouting_campogramas
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'mensuales',
  "folderId" TEXT DEFAULT 'mensuales',
  sub_folder_id TEXT,
  "subFolderId" TEXT,
  month_folder_id TEXT,
  "monthFolderId" TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;

DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas 
  FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA DE SISTEMAS DE JUEGO
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE POSICIONES DE LOS JUGADORES
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 4. INSERTAR LOS 35 CAMPOGRAMAS DEL AÑO 2027
INSERT INTO scouting_campogramas (
  id, folder_id, "folderId", sub_folder_id, "subFolderId", month_folder_id, "monthFolderId",
  nombre, descripcion, fecha_modificacion, "fechaModificacion", updated_at, "updatedAt",
  formation, monthly_view, "monthlyView", assignments, monthly_assignments, "monthlyAssignments", notes
) VALUES
-- ENERO 2027
('c_enero_2027_1rfef_g1', 'mensuales', 'mensuales', '1rfef', '1rfef', 'enero', 'enero', 'PRIMERA RFEF GRUPO I - ENERO 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo I (Enero 2027)', '01/01/2027', '01/01/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo I en Enero 2027.'),
('c_enero_2027_1rfef_g2', 'mensuales', 'mensuales', '1rfef', '1rfef', 'enero', 'enero', 'PRIMERA RFEF GRUPO II - ENERO 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo II (Enero 2027)', '01/01/2027', '01/01/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo II en Enero 2027.'),
('c_enero_2027_2rfef_g1', 'mensuales', 'mensuales', '2rfef', '2rfef', 'enero', 'enero', 'SEGUNDA RFEF GRUPO I - ENERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo I (Enero 2027)', '01/01/2027', '01/01/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo I en Enero 2027.'),
('c_enero_2027_2rfef_g2', 'mensuales', 'mensuales', '2rfef', '2rfef', 'enero', 'enero', 'SEGUNDA RFEF GRUPO II - ENERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo II (Enero 2027)', '01/01/2027', '01/01/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo II en Enero 2027.'),
('c_enero_2027_2rfef_g3', 'mensuales', 'mensuales', '2rfef', '2rfef', 'enero', 'enero', 'SEGUNDA RFEF GRUPO III - ENERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo III (Enero 2027)', '01/01/2027', '01/01/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo III en Enero 2027.'),
('c_enero_2027_2rfef_g4', 'mensuales', 'mensuales', '2rfef', '2rfef', 'enero', 'enero', 'SEGUNDA RFEF GRUPO IV - ENERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo IV (Enero 2027)', '01/01/2027', '01/01/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo IV en Enero 2027.'),
('c_enero_2027_2rfef_g5', 'mensuales', 'mensuales', '2rfef', '2rfef', 'enero', 'enero', 'SEGUNDA RFEF GRUPO V - ENERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo V (Enero 2027)', '01/01/2027', '01/01/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo V en Enero 2027.'),

-- FEBRERO 2027
('c_febrero_2027_1rfef_g1', 'mensuales', 'mensuales', '1rfef', '1rfef', 'febrero', 'febrero', 'PRIMERA RFEF GRUPO I - FEBRERO 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo I (Febrero 2027)', '01/02/2027', '01/02/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo I en Febrero 2027.'),
('c_febrero_2027_1rfef_g2', 'mensuales', 'mensuales', '1rfef', '1rfef', 'febrero', 'febrero', 'PRIMERA RFEF GRUPO II - FEBRERO 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo II (Febrero 2027)', '01/02/2027', '01/02/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo II en Febrero 2027.'),
('c_febrero_2027_2rfef_g1', 'mensuales', 'mensuales', '2rfef', '2rfef', 'febrero', 'febrero', 'SEGUNDA RFEF GRUPO I - FEBRERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo I (Febrero 2027)', '01/02/2027', '01/02/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo I en Febrero 2027.'),
('c_febrero_2027_2rfef_g2', 'mensuales', 'mensuales', '2rfef', '2rfef', 'febrero', 'febrero', 'SEGUNDA RFEF GRUPO II - FEBRERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo II (Febrero 2027)', '01/02/2027', '01/02/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo II en Febrero 2027.'),
('c_febrero_2027_2rfef_g3', 'mensuales', 'mensuales', '2rfef', '2rfef', 'febrero', 'febrero', 'SEGUNDA RFEF GRUPO III - FEBRERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo III (Febrero 2027)', '01/02/2027', '01/02/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo III en Febrero 2027.'),
('c_febrero_2027_2rfef_g4', 'mensuales', 'mensuales', '2rfef', '2rfef', 'febrero', 'febrero', 'SEGUNDA RFEF GRUPO IV - FEBRERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo IV (Febrero 2027)', '01/02/2027', '01/02/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo IV en Febrero 2027.'),
('c_febrero_2027_2rfef_g5', 'mensuales', 'mensuales', '2rfef', '2rfef', 'febrero', 'febrero', 'SEGUNDA RFEF GRUPO V - FEBRERO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo V (Febrero 2027)', '01/02/2027', '01/02/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo V en Febrero 2027.'),

-- MARZO 2027
('c_marzo_2027_1rfef_g1', 'mensuales', 'mensuales', '1rfef', '1rfef', 'marzo', 'marzo', 'PRIMERA RFEF GRUPO I - MARZO 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo I (Marzo 2027)', '01/03/2027', '01/03/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo I en Marzo 2027.'),
('c_marzo_2027_1rfef_g2', 'mensuales', 'mensuales', '1rfef', '1rfef', 'marzo', 'marzo', 'PRIMERA RFEF GRUPO II - MARZO 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo II (Marzo 2027)', '01/03/2027', '01/03/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo II en Marzo 2027.'),
('c_marzo_2027_2rfef_g1', 'mensuales', 'mensuales', '2rfef', '2rfef', 'marzo', 'marzo', 'SEGUNDA RFEF GRUPO I - MARZO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo I (Marzo 2027)', '01/03/2027', '01/03/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo I en Marzo 2027.'),
('c_marzo_2027_2rfef_g2', 'mensuales', 'mensuales', '2rfef', '2rfef', 'marzo', 'marzo', 'SEGUNDA RFEF GRUPO II - MARZO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo II (Marzo 2027)', '01/03/2027', '01/03/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo II en Marzo 2027.'),
('c_marzo_2027_2rfef_g3', 'mensuales', 'mensuales', '2rfef', '2rfef', 'marzo', 'marzo', 'SEGUNDA RFEF GRUPO III - MARZO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo III (Marzo 2027)', '01/03/2027', '01/03/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo III en Marzo 2027.'),
('c_marzo_2027_2rfef_g4', 'mensuales', 'mensuales', '2rfef', '2rfef', 'marzo', 'marzo', 'SEGUNDA RFEF GRUPO IV - MARZO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo IV (Marzo 2027)', '01/03/2027', '01/03/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo IV en Marzo 2027.'),
('c_marzo_2027_2rfef_g5', 'mensuales', 'mensuales', '2rfef', '2rfef', 'marzo', 'marzo', 'SEGUNDA RFEF GRUPO V - MARZO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo V (Marzo 2027)', '01/03/2027', '01/03/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo V en Marzo 2027.'),

-- ABRIL 2027
('c_abril_2027_1rfef_g1', 'mensuales', 'mensuales', '1rfef', '1rfef', 'abril', 'abril', 'PRIMERA RFEF GRUPO I - ABRIL 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo I (Abril 2027)', '01/04/2027', '01/04/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo I en Abril 2027.'),
('c_abril_2027_1rfef_g2', 'mensuales', 'mensuales', '1rfef', '1rfef', 'abril', 'abril', 'PRIMERA RFEF GRUPO II - ABRIL 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo II (Abril 2027)', '01/04/2027', '01/04/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo II en Abril 2027.'),
('c_abril_2027_2rfef_g1', 'mensuales', 'mensuales', '2rfef', '2rfef', 'abril', 'abril', 'SEGUNDA RFEF GRUPO I - ABRIL 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo I (Abril 2027)', '01/04/2027', '01/04/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo I en Abril 2027.'),
('c_abril_2027_2rfef_g2', 'mensuales', 'mensuales', '2rfef', '2rfef', 'abril', 'abril', 'SEGUNDA RFEF GRUPO II - ABRIL 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo II (Abril 2027)', '01/04/2027', '01/04/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo II en Abril 2027.'),
('c_abril_2027_2rfef_g3', 'mensuales', 'mensuales', '2rfef', '2rfef', 'abril', 'abril', 'SEGUNDA RFEF GRUPO III - ABRIL 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo III (Abril 2027)', '01/04/2027', '01/04/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo III en Abril 2027.'),
('c_abril_2027_2rfef_g4', 'mensuales', 'mensuales', '2rfef', '2rfef', 'abril', 'abril', 'SEGUNDA RFEF GRUPO IV - ABRIL 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo IV (Abril 2027)', '01/04/2027', '01/04/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo IV en Abril 2027.'),
('c_abril_2027_2rfef_g5', 'mensuales', 'mensuales', '2rfef', '2rfef', 'abril', 'abril', 'SEGUNDA RFEF GRUPO V - ABRIL 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo V (Abril 2027)', '01/04/2027', '01/04/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo V en Abril 2027.'),

-- MAYO 2027
('c_mayo_2027_1rfef_g1', 'mensuales', 'mensuales', '1rfef', '1rfef', 'mayo', 'mayo', 'PRIMERA RFEF GRUPO I - MAYO 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo I (Mayo 2027)', '01/05/2027', '01/05/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo I en Mayo 2027.'),
('c_mayo_2027_1rfef_g2', 'mensuales', 'mensuales', '1rfef', '1rfef', 'mayo', 'mayo', 'PRIMERA RFEF GRUPO II - MAYO 2027', 'Campograma mensual y alineación táctica para Primera RFEF Grupo II (Mayo 2027)', '01/05/2027', '01/05/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Primera RFEF Grupo II en Mayo 2027.'),
('c_mayo_2027_2rfef_g1', 'mensuales', 'mensuales', '2rfef', '2rfef', 'mayo', 'mayo', 'SEGUNDA RFEF GRUPO I - MAYO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo I (Mayo 2027)', '01/05/2027', '01/05/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo I en Mayo 2027.'),
('c_mayo_2027_2rfef_g2', 'mensuales', 'mensuales', '2rfef', '2rfef', 'mayo', 'mayo', 'SEGUNDA RFEF GRUPO II - MAYO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo II (Mayo 2027)', '01/05/2027', '01/05/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo II en Mayo 2027.'),
('c_mayo_2027_2rfef_g3', 'mensuales', 'mensuales', '2rfef', '2rfef', 'mayo', 'mayo', 'SEGUNDA RFEF GRUPO III - MAYO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo III (Mayo 2027)', '01/05/2027', '01/05/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo III en Mayo 2027.'),
('c_mayo_2027_2rfef_g4', 'mensuales', 'mensuales', '2rfef', '2rfef', 'mayo', 'mayo', 'SEGUNDA RFEF GRUPO IV - MAYO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo IV (Mayo 2027)', '01/05/2027', '01/05/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo IV en Mayo 2027.'),
('c_mayo_2027_2rfef_g5', 'mensuales', 'mensuales', '2rfef', '2rfef', 'mayo', 'mayo', 'SEGUNDA RFEF GRUPO V - MAYO 2027', 'Campograma mensual y alineación táctica para Segunda RFEF Grupo V (Mayo 2027)', '01/05/2027', '01/05/2027', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento para Segunda RFEF Grupo V en Mayo 2027.')
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

-- 5. INSERTAR LAS 11 POSICIONES POR CADA UNO DE LOS 35 CAMPOGRAMAS DE 2027
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
)
SELECT 
  'pos_' || c.id || '_' || p.pos_id as id,
  '4-4-2' as sistema_id,
  '4-4-2' as "sistemaId",
  c.id as campograma_id,
  c.id as "campogramaId",
  p.pos_id as posicion_id,
  p.pos_id as "posicionId",
  p.label as posicion_label,
  p.label as "posicionLabel",
  p.cat as categoria_posicion,
  p.cat as "categoriaPosicion",
  p.cx as coord_x,
  p.cx as "coordX",
  p.cy as coord_y,
  p.cy as "coordY",
  p.roles::jsonb as allowed_roles,
  p.roles::jsonb as "allowedRoles",
  p.ord as orden,
  EXTRACT(EPOCH FROM NOW()) * 1000 as updated_at,
  EXTRACT(EPOCH FROM NOW()) * 1000 as "updatedAt"
FROM (
  VALUES 
    -- Enero 2027
    ('c_enero_2027_1rfef_g1'), ('c_enero_2027_1rfef_g2'),
    ('c_enero_2027_2rfef_g1'), ('c_enero_2027_2rfef_g2'), ('c_enero_2027_2rfef_g3'), ('c_enero_2027_2rfef_g4'), ('c_enero_2027_2rfef_g5'),
    -- Febrero 2027
    ('c_febrero_2027_1rfef_g1'), ('c_febrero_2027_1rfef_g2'),
    ('c_febrero_2027_2rfef_g1'), ('c_febrero_2027_2rfef_g2'), ('c_febrero_2027_2rfef_g3'), ('c_febrero_2027_2rfef_g4'), ('c_febrero_2027_2rfef_g5'),
    -- Marzo 2027
    ('c_marzo_2027_1rfef_g1'), ('c_marzo_2027_1rfef_g2'),
    ('c_marzo_2027_2rfef_g1'), ('c_marzo_2027_2rfef_g2'), ('c_marzo_2027_2rfef_g3'), ('c_marzo_2027_2rfef_g4'), ('c_marzo_2027_2rfef_g5'),
    -- Abril 2027
    ('c_abril_2027_1rfef_g1'), ('c_abril_2027_1rfef_g2'),
    ('c_abril_2027_2rfef_g1'), ('c_abril_2027_2rfef_g2'), ('c_abril_2027_2rfef_g3'), ('c_abril_2027_2rfef_g4'), ('c_abril_2027_2rfef_g5'),
    -- Mayo 2027
    ('c_mayo_2027_1rfef_g1'), ('c_mayo_2027_1rfef_g2'),
    ('c_mayo_2027_2rfef_g1'), ('c_mayo_2027_2rfef_g2'), ('c_mayo_2027_2rfef_g3'), ('c_mayo_2027_2rfef_g4'), ('c_mayo_2027_2rfef_g5')
) as c(id)
CROSS JOIN (
  VALUES 
    ('por', 'POR', 'Portero', 50, 88, '["Portero"]', 0),
    ('ltd', 'LTD', 'Defensa', 15, 70, '["Lateral Derecho", "Defensa Central"]', 1),
    ('dfc_d', 'DFC', 'Defensa', 38, 72, '["Defensa Central"]', 2),
    ('dfc_i', 'DFC', 'Defensa', 62, 72, '["Defensa Central"]', 3),
    ('lti', 'LTI', 'Defensa', 85, 70, '["Lateral Izquierdo", "Defensa Central"]', 4),
    ('md', 'MD', 'Centrocampista', 15, 44, '["Extremo Derecho", "Mediocentro"]', 5),
    ('mc_d', 'MC', 'Centrocampista', 38, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]', 6),
    ('mc_i', 'MC', 'Centrocampista', 62, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]', 7),
    ('mi', 'MI', 'Centrocampista', 85, 44, '["Extremo Izquierdo", "Mediocentro"]', 8),
    ('dc_d', 'DC', 'Delantero', 38, 18, '["Delantero Centro", "Mediapunta"]', 9),
    ('dc_i', 'DC', 'Delantero', 62, 18, '["Delantero Centro", "Mediapunta"]', 10)
) as p(pos_id, label, cat, cx, cy, roles, ord)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 6. Recargar esquema en PostgREST
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Returns the exact SQL script to create and initialize the table and all campogramas for Diciembre (1ª RFEF Grupo I & II, 2ª RFEF Grupos I al V) in Supabase.
 */
export function getCampogramaDiciembreSQL(): string {
  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CARPETA DICIEMBRE (1ª RFEF G1-G2 Y 2ª RFEF G1-G5) EN SUPABASE
-- ==============================================================================

-- 1. Crear la tabla de campogramas tácticos si no existe
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'mensuales',
  "folderId" TEXT DEFAULT 'mensuales',
  sub_folder_id TEXT,
  "subFolderId" TEXT,
  month_folder_id TEXT DEFAULT 'diciembre',
  "monthFolderId" TEXT DEFAULT 'diciembre',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- 2. Habilitar seguridad RLS y políticas de acceso
ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT DEFAULT 'diciembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT DEFAULT 'diciembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;

DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas 
  FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE SISTEMAS DE JUEGO (FORMACIONES TÁCTICAS)
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 4. TABLA DE POSICIONES DE LOS JUGADORES VINCULADAS AL SISTEMA Y CAMPOGRAMA
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 5. Insertar o actualizar los 7 Campogramas de la Carpeta DICIEMBRE (1ª RFEF G1-G2 y 2ª RFEF G1-G5)
INSERT INTO scouting_campogramas (
  id,
  folder_id,
  "folderId",
  sub_folder_id,
  "subFolderId",
  month_folder_id,
  "monthFolderId",
  nombre,
  descripcion,
  fecha_modificacion,
  "fechaModificacion",
  updated_at,
  "updatedAt",
  formation,
  monthly_view,
  "monthlyView",
  assignments,
  monthly_assignments,
  "monthlyAssignments",
  notes
) VALUES 
-- PRIMERA RFEF - DICIEMBRE 2026
(
  'c_diciembre_2026_1rfef_g1',
  'mensuales',
  'mensuales',
  '1rfef',
  '1rfef',
  'diciembre',
  'diciembre',
  'PRIMERA RFEF GRUPO I - DICIEMBRE 2026',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo I (Diciembre 2026)',
  '01/12/2026',
  '01/12/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo I en Diciembre 2026.'
),
(
  'c_diciembre_2026_1rfef_g2',
  'mensuales',
  'mensuales',
  '1rfef',
  '1rfef',
  'diciembre',
  'diciembre',
  'PRIMERA RFEF GRUPO II - DICIEMBRE 2026',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo II (Diciembre 2026)',
  '01/12/2026',
  '01/12/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo II en Diciembre 2026.'
),
-- SEGUNDA RFEF - DICIEMBRE 2026 (GRUPOS I AL V)
(
  'c_diciembre_2026_2rfef_g1',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'diciembre',
  'diciembre',
  'SEGUNDA RFEF GRUPO I - DICIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo I (Diciembre 2026)',
  '01/12/2026',
  '01/12/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo I en Diciembre 2026.'
),
(
  'c_diciembre_2026_2rfef_g2',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'diciembre',
  'diciembre',
  'SEGUNDA RFEF GRUPO II - DICIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo II (Diciembre 2026)',
  '01/12/2026',
  '01/12/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo II en Diciembre 2026.'
),
(
  'c_diciembre_2026_2rfef_g3',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'diciembre',
  'diciembre',
  'SEGUNDA RFEF GRUPO III - DICIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo III (Diciembre 2026)',
  '01/12/2026',
  '01/12/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo III en Diciembre 2026.'
),
(
  'c_diciembre_2026_2rfef_g4',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'diciembre',
  'diciembre',
  'SEGUNDA RFEF GRUPO IV - DICIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo IV (Diciembre 2026)',
  '01/12/2026',
  '01/12/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo IV en Diciembre 2026.'
),
(
  'c_diciembre_2026_2rfef_g5',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'diciembre',
  'diciembre',
  'SEGUNDA RFEF GRUPO V - DICIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo V (Diciembre 2026)',
  '01/12/2026',
  '01/12/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo V en Diciembre 2026.'
)
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

-- 6. Insertar posiciones para cada uno de los 7 campogramas de Diciembre
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
)
SELECT 
  'pos_' || c.id || '_' || p.pos_id as id,
  '4-4-2' as sistema_id,
  '4-4-2' as "sistemaId",
  c.id as campograma_id,
  c.id as "campogramaId",
  p.pos_id as posicion_id,
  p.pos_id as "posicionId",
  p.label as posicion_label,
  p.label as "posicionLabel",
  p.cat as categoria_posicion,
  p.cat as "categoriaPosicion",
  p.cx as coord_x,
  p.cx as "coordX",
  p.cy as coord_y,
  p.cy as "coordY",
  p.roles::jsonb as allowed_roles,
  p.roles::jsonb as "allowedRoles",
  p.ord as orden,
  EXTRACT(EPOCH FROM NOW()) * 1000 as updated_at,
  EXTRACT(EPOCH FROM NOW()) * 1000 as "updatedAt"
FROM (
  VALUES 
    ('c_diciembre_2026_1rfef_g1'),
    ('c_diciembre_2026_1rfef_g2'),
    ('c_diciembre_2026_2rfef_g1'),
    ('c_diciembre_2026_2rfef_g2'),
    ('c_diciembre_2026_2rfef_g3'),
    ('c_diciembre_2026_2rfef_g4'),
    ('c_diciembre_2026_2rfef_g5')
) as c(id)
CROSS JOIN (
  VALUES 
    ('por', 'POR', 'Portero', 50, 88, '["Portero"]', 0),
    ('ltd', 'LTD', 'Defensa', 15, 70, '["Lateral Derecho", "Defensa Central"]', 1),
    ('dfc_d', 'DFC', 'Defensa', 38, 72, '["Defensa Central"]', 2),
    ('dfc_i', 'DFC', 'Defensa', 62, 72, '["Defensa Central"]', 3),
    ('lti', 'LTI', 'Defensa', 85, 70, '["Lateral Izquierdo", "Defensa Central"]', 4),
    ('md', 'MD', 'Centrocampista', 15, 44, '["Extremo Derecho", "Mediocentro"]', 5),
    ('mc_d', 'MC', 'Centrocampista', 38, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]', 6),
    ('mc_i', 'MC', 'Centrocampista', 62, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]', 7),
    ('mi', 'MI', 'Centrocampista', 85, 44, '["Extremo Izquierdo", "Mediocentro"]', 8),
    ('dc_d', 'DC', 'Delantero', 38, 18, '["Delantero Centro", "Mediapunta"]', 9),
    ('dc_i', 'DC', 'Delantero', 62, 18, '["Delantero Centro", "Mediapunta"]', 10)
) as p(pos_id, label, cat, cx, cy, roles, ord)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 7. Notificar a PostgREST para recargar el esquema de tablas en tiempo real
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Returns the exact SQL script to create and initialize the table and all campogramas for Noviembre (Primera RFEF Grupo I y Grupo II) in Supabase.
 */
export function getCampogramaNoviembreSQL(): string {
  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CARPETA NOVIEMBRE (PRIMERA RFEF GRUPO I Y GRUPO II) EN SUPABASE
-- ==============================================================================

-- 1. Crear la tabla de campogramas tácticos si no existe
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'mensuales',
  "folderId" TEXT DEFAULT 'mensuales',
  sub_folder_id TEXT DEFAULT '1rfef',
  "subFolderId" TEXT DEFAULT '1rfef',
  month_folder_id TEXT DEFAULT 'noviembre',
  "monthFolderId" TEXT DEFAULT 'noviembre',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- 2. Habilitar seguridad RLS y políticas de acceso
ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT DEFAULT '1rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT DEFAULT '1rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT DEFAULT 'noviembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT DEFAULT 'noviembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;

DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas 
  FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE SISTEMAS DE JUEGO (FORMACIONES TÁCTICAS)
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 4. TABLA DE POSICIONES DE LOS JUGADORES VINCULADAS AL SISTEMA Y CAMPOGRAMA
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 5. Insertar o actualizar los Campogramas de la Carpeta NOVIEMBRE (1ª RFEF Grupo I y Grupo II)
INSERT INTO scouting_campogramas (
  id,
  folder_id,
  "folderId",
  sub_folder_id,
  "subFolderId",
  month_folder_id,
  "monthFolderId",
  nombre,
  descripcion,
  fecha_modificacion,
  "fechaModificacion",
  updated_at,
  "updatedAt",
  formation,
  monthly_view,
  "monthlyView",
  assignments,
  monthly_assignments,
  "monthlyAssignments",
  notes
) VALUES 
(
  'c_noviembre_2026_1rfef_g1',
  'mensuales',
  'mensuales',
  '1rfef',
  '1rfef',
  'noviembre',
  'noviembre',
  'PRIMERA RFEF GRUPO I - NOVIEMBRE 2026',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo I (Noviembre 2026)',
  '01/11/2026',
  '01/11/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo I en Noviembre 2026 vinculado a Supabase.'
),
(
  'c_noviembre_2026_1rfef_g2',
  'mensuales',
  'mensuales',
  '1rfef',
  '1rfef',
  'noviembre',
  'noviembre',
  'PRIMERA RFEF GRUPO II - NOVIEMBRE 2026',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo II (Noviembre 2026)',
  '01/11/2026',
  '01/11/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo II en Noviembre 2026 vinculado a Supabase.'
)
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

-- 6. Insertar las 11 posiciones para Primera RFEF Grupo I (Noviembre 2026)
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
) VALUES
  ('pos_c_noviembre_2026_1rfef_g1_por', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'por', 'por', 'POR', 'POR', 'Portero', 'Portero', 50, 50, 88, 88, '["Portero"]'::jsonb, '["Portero"]'::jsonb, 0, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_ltd', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'ltd', 'ltd', 'LTD', 'LTD', 'Defensa', 'Defensa', 15, 15, 70, 70, '["Lateral Derecho", "Defensa Central"]'::jsonb, '["Lateral Derecho", "Defensa Central"]'::jsonb, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_dfc_d', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'dfc_d', 'dfc_d', 'DFC', 'DFC', 'Defensa', 'Defensa', 38, 38, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_dfc_i', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'dfc_i', 'dfc_i', 'DFC', 'DFC', 'Defensa', 'Defensa', 62, 62, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_lti', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'lti', 'lti', 'LTI', 'LTI', 'Defensa', 'Defensa', 85, 85, 70, 70, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, 4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_md', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'md', 'md', 'MD', 'MD', 'Centrocampista', 'Centrocampista', 15, 15, 44, 44, '["Extremo Derecho", "Mediocentro"]'::jsonb, '["Extremo Derecho", "Mediocentro"]'::jsonb, 5, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_mc_d', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'mc_d', 'mc_d', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 38, 38, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 6, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_mc_i', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'mc_i', 'mc_i', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 62, 62, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 7, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_mi', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'mi', 'mi', 'MI', 'MI', 'Centrocampista', 'Centrocampista', 85, 85, 44, 44, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, 8, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_dc_d', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'dc_d', 'dc_d', 'DC', 'DC', 'Delantero', 'Delantero', 38, 38, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 9, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g1_dc_i', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g1', 'c_noviembre_2026_1rfef_g1', 'dc_i', 'dc_i', 'DC', 'DC', 'Delantero', 'Delantero', 62, 62, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 10, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 7. Insertar las 11 posiciones para Primera RFEF Grupo II (Noviembre 2026)
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
) VALUES
  ('pos_c_noviembre_2026_1rfef_g2_por', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'por', 'por', 'POR', 'POR', 'Portero', 'Portero', 50, 50, 88, 88, '["Portero"]'::jsonb, '["Portero"]'::jsonb, 0, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_ltd', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'ltd', 'ltd', 'LTD', 'LTD', 'Defensa', 'Defensa', 15, 15, 70, 70, '["Lateral Derecho", "Defensa Central"]'::jsonb, '["Lateral Derecho", "Defensa Central"]'::jsonb, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_dfc_d', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'dfc_d', 'dfc_d', 'DFC', 'DFC', 'Defensa', 'Defensa', 38, 38, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_dfc_i', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'dfc_i', 'dfc_i', 'DFC', 'DFC', 'Defensa', 'Defensa', 62, 62, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_lti', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'lti', 'lti', 'LTI', 'LTI', 'Defensa', 'Defensa', 85, 85, 70, 70, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, 4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_md', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'md', 'md', 'MD', 'MD', 'Centrocampista', 'Centrocampista', 15, 15, 44, 44, '["Extremo Derecho", "Mediocentro"]'::jsonb, '["Extremo Derecho", "Mediocentro"]'::jsonb, 5, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_mc_d', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'mc_d', 'mc_d', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 38, 38, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 6, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_mc_i', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'mc_i', 'mc_i', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 62, 62, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 7, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_mi', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'mi', 'mi', 'MI', 'MI', 'Centrocampista', 'Centrocampista', 85, 85, 44, 44, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, 8, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_dc_d', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'dc_d', 'dc_d', 'DC', 'DC', 'Delantero', 'Delantero', 38, 38, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 9, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_noviembre_2026_1rfef_g2_dc_i', '4-4-2', '4-4-2', 'c_noviembre_2026_1rfef_g2', 'c_noviembre_2026_1rfef_g2', 'dc_i', 'dc_i', 'DC', 'DC', 'Delantero', 'Delantero', 62, 62, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 10, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 8. Notificar a PostgREST para recargar el esquema de tablas en tiempo real
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Returns the exact SQL script to create and initialize the table and all campogramas for Septiembre (1ª RFEF Grupo I & II, 2ª RFEF Grupos I al V) in Supabase.
 */
export function getCampogramaSeptiembreSQL(): string {
  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CARPETA SEPTIEMBRE (1ª RFEF G1-G2 Y 2ª RFEF G1-G5) EN SUPABASE
-- ==============================================================================

-- 1. Crear la tabla de campogramas tácticos si no existe
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'mensuales',
  "folderId" TEXT DEFAULT 'mensuales',
  sub_folder_id TEXT,
  "subFolderId" TEXT,
  month_folder_id TEXT DEFAULT 'septiembre',
  "monthFolderId" TEXT DEFAULT 'septiembre',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- 2. Habilitar seguridad RLS y políticas de acceso
ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;

DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas 
  FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE SISTEMAS DE JUEGO (FORMACIONES TÁCTICAS)
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 4. TABLA DE POSICIONES DE LOS JUGADORES VINCULADAS AL SISTEMA Y CAMPOGRAMA
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 5. Insertar o actualizar los 7 Campogramas de la Carpeta SEPTIEMBRE (1ª RFEF G1-G2 y 2ª RFEF G1-G5)
INSERT INTO scouting_campogramas (
  id,
  folder_id,
  "folderId",
  sub_folder_id,
  "subFolderId",
  month_folder_id,
  "monthFolderId",
  nombre,
  descripcion,
  fecha_modificacion,
  "fechaModificacion",
  updated_at,
  "updatedAt",
  formation,
  monthly_view,
  "monthlyView",
  assignments,
  monthly_assignments,
  "monthlyAssignments",
  notes
) VALUES 
-- PRIMERA RFEF - SEPTIEMBRE 2026
(
  'c_septiembre_2026_1rfef_g1',
  'mensuales',
  'mensuales',
  '1rfef',
  '1rfef',
  'septiembre',
  'septiembre',
  'PRIMERA RFEF GRUPO I - SEPTIEMBRE 2026',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo I (Septiembre 2026)',
  '01/09/2026',
  '01/09/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo I en Septiembre 2026.'
),
(
  'c_septiembre_2026_1rfef_g2',
  'mensuales',
  'mensuales',
  '1rfef',
  '1rfef',
  'septiembre',
  'septiembre',
  'PRIMERA RFEF GRUPO II - SEPTIEMBRE 2026',
  'Campograma mensual y alineación táctica para Primera RFEF Grupo II (Septiembre 2026)',
  '01/09/2026',
  '01/09/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Primera RFEF Grupo II en Septiembre 2026.'
),
-- SEGUNDA RFEF - SEPTIEMBRE 2026 (GRUPOS I AL V)
(
  'c_septiembre_2026_2rfef_g1',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'septiembre',
  'septiembre',
  'SEGUNDA RFEF GRUPO I - SEPTIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo I (Septiembre 2026)',
  '01/09/2026',
  '01/09/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo I en Septiembre 2026.'
),
(
  'c_septiembre_2026_2rfef_g2',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'septiembre',
  'septiembre',
  'SEGUNDA RFEF GRUPO II - SEPTIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo II (Septiembre 2026)',
  '01/09/2026',
  '01/09/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo II en Septiembre 2026.'
),
(
  'c_septiembre_2026_2rfef_g3',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'septiembre',
  'septiembre',
  'SEGUNDA RFEF GRUPO III - SEPTIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo III (Septiembre 2026)',
  '01/09/2026',
  '01/09/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo III en Septiembre 2026.'
),
(
  'c_septiembre_2026_2rfef_g4',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'septiembre',
  'septiembre',
  'SEGUNDA RFEF GRUPO IV - SEPTIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo IV (Septiembre 2026)',
  '01/09/2026',
  '01/09/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo IV en Septiembre 2026.'
),
(
  'c_septiembre_2026_2rfef_g5',
  'mensuales',
  'mensuales',
  '2rfef',
  '2rfef',
  'septiembre',
  'septiembre',
  'SEGUNDA RFEF GRUPO V - SEPTIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo V (Septiembre 2026)',
  '01/09/2026',
  '01/09/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2',
  false,
  false,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo V en Septiembre 2026.'
)
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

-- 6. Insertar posiciones para cada uno de los 7 campogramas
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
)
SELECT 
  'pos_' || c.id || '_' || p.pos_id as id,
  '4-4-2' as sistema_id,
  '4-4-2' as "sistemaId",
  c.id as campograma_id,
  c.id as "campogramaId",
  p.pos_id as posicion_id,
  p.pos_id as "posicionId",
  p.label as posicion_label,
  p.label as "posicionLabel",
  p.cat as categoria_posicion,
  p.cat as "categoriaPosicion",
  p.cx as coord_x,
  p.cx as "coordX",
  p.cy as coord_y,
  p.cy as "coordY",
  p.roles::jsonb as allowed_roles,
  p.roles::jsonb as "allowedRoles",
  p.ord as orden,
  EXTRACT(EPOCH FROM NOW()) * 1000 as updated_at,
  EXTRACT(EPOCH FROM NOW()) * 1000 as "updatedAt"
FROM (
  VALUES 
    ('c_septiembre_2026_1rfef_g1'),
    ('c_septiembre_2026_1rfef_g2'),
    ('c_septiembre_2026_2rfef_g1'),
    ('c_septiembre_2026_2rfef_g2'),
    ('c_septiembre_2026_2rfef_g3'),
    ('c_septiembre_2026_2rfef_g4'),
    ('c_septiembre_2026_2rfef_g5')
) as c(id)
CROSS JOIN (
  VALUES 
    ('por', 'POR', 'Portero', 50, 88, '["Portero"]', 0),
    ('ltd', 'LTD', 'Defensa', 15, 70, '["Lateral Derecho", "Defensa Central"]', 1),
    ('dfc_d', 'DFC', 'Defensa', 38, 72, '["Defensa Central"]', 2),
    ('dfc_i', 'DFC', 'Defensa', 62, 72, '["Defensa Central"]', 3),
    ('lti', 'LTI', 'Defensa', 85, 70, '["Lateral Izquierdo", "Defensa Central"]', 4),
    ('md', 'MD', 'Centrocampista', 15, 44, '["Extremo Derecho", "Mediocentro"]', 5),
    ('mc_d', 'MC', 'Centrocampista', 38, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]', 6),
    ('mc_i', 'MC', 'Centrocampista', 62, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]', 7),
    ('mi', 'MI', 'Centrocampista', 85, 44, '["Extremo Izquierdo", "Mediocentro"]', 8),
    ('dc_d', 'DC', 'Delantero', 38, 18, '["Delantero Centro", "Mediapunta"]', 9),
    ('dc_i', 'DC', 'Delantero', 62, 18, '["Delantero Centro", "Mediapunta"]', 10)
) as p(pos_id, label, cat, cx, cy, roles, ord)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 7. Notificar a PostgREST para recargar el esquema de tablas en tiempo real
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Generates SQL to insert/update the exact current list of campogramas in Supabase.
 */
export function generateLiveCampogramasSQL(campogramas: any[]): string {
  if (!campogramas || campogramas.length === 0) {
    return getCampogramaSeptiembreSQL();
  }

  const valueRows = campogramas.map(c => {
    const assignmentsJson = JSON.stringify(c.assignments || {}).replace(/'/g, "''");
    const monthlyAssignmentsJson = JSON.stringify(c.monthlyAssignments || {}).replace(/'/g, "''");
    const safeName = (c.nombre || 'Campograma').replace(/'/g, "''");
    const safeDesc = (c.descripcion || '').replace(/'/g, "''");
    const safeNotes = (c.notes || '').replace(/'/g, "''");
    const safeFecha = (c.fechaModificacion || new Date().toLocaleDateString('es-ES')).replace(/'/g, "''");
    const subFolder = c.subFolderId ? `'${c.subFolderId}'` : 'NULL';
    const monthFolder = c.monthFolderId ? `'${c.monthFolderId}'` : 'NULL';
    const updatedAt = c.updatedAt || Date.now();

    return `(
  '${c.id}',
  '${c.folderId || 'mensuales'}',
  '${c.folderId || 'mensuales'}',
  ${subFolder},
  ${subFolder},
  ${monthFolder},
  ${monthFolder},
  '${safeName}',
  '${safeDesc}',
  '${safeFecha}',
  '${safeFecha}',
  ${updatedAt},
  ${updatedAt},
  '${c.formation || '4-4-2'}',
  ${c.monthlyView ? 'true' : 'false'},
  ${c.monthlyView ? 'true' : 'false'},
  '${assignmentsJson}'::jsonb,
  '${monthlyAssignmentsJson}'::jsonb,
  '${monthlyAssignmentsJson}'::jsonb,
  '${safeNotes}'
)`;
  }).join(',\n');

  return `-- ==============================================================================
-- SQL DINÁMICO: VINCULACIÓN COMPLETA DE CAMPOGRAMAS EN SUPABASE (${campogramas.length} REGISTROS)
-- ==============================================================================

-- 1. Asegurar la tabla de campogramas tácticos
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  "folderId" TEXT,
  sub_folder_id TEXT,
  "subFolderId" TEXT,
  month_folder_id TEXT,
  "monthFolderId" TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- 2. Habilitar seguridad RLS
ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas FOR ALL USING (true) WITH CHECK (true);

-- 3. Upsert de todos los campogramas actuales
INSERT INTO scouting_campogramas (
  id,
  folder_id,
  "folderId",
  sub_folder_id,
  "subFolderId",
  month_folder_id,
  "monthFolderId",
  nombre,
  descripcion,
  fecha_modificacion,
  "fechaModificacion",
  updated_at,
  "updatedAt",
  formation,
  monthly_view,
  "monthlyView",
  assignments,
  monthly_assignments,
  "monthlyAssignments",
  notes
) VALUES 
${valueRows}
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Returns the exact SQL script to create tables for campogramas, sistemas de juego y posiciones vinculadas,
 * and link "SEGUNDA RFEF GRUPO I - SEPTIEMBRE 2026" with full tactical systems in Supabase.
 */
export function getCampogramaSegundaRFEFGrupo1SeptiembreSQL(): string {
  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CAMPOGRAMA "SEGUNDA RFEF GRUPO I - SEPTIEMBRE 2026"
-- CON SISTEMAS DE JUEGO Y TABLA DE POSICIONES EN SUPABASE
-- ==============================================================================

-- 1. TABLA DE CAMPOGRAMAS
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'mensuales',
  "folderId" TEXT DEFAULT 'mensuales',
  sub_folder_id TEXT DEFAULT '2rfef',
  "subFolderId" TEXT DEFAULT '2rfef',
  month_folder_id TEXT DEFAULT 'septiembre',
  "monthFolderId" TEXT DEFAULT 'septiembre',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT DEFAULT '2rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT DEFAULT '2rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;
DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA DE SISTEMAS DE JUEGO (FORMACIONES TÁCTICAS)
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS formacion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS defensas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS centrocampistas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS delanteros INTEGER DEFAULT 2;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS posiciones_defecto JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "posicionesDefecto" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE POSICIONES DE LOS JUGADORES VINCULADAS AL SISTEMA Y CAMPOGRAMA
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS sistema_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "sistemaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS campograma_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "campogramaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_label TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionLabel" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS categoria_posicion TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "categoriaPosicion" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_x NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordX" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_y NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordY" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS allowed_roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "allowedRoles" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugador_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadorId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 4. POBLAR SISTEMAS DE JUEGO BASE
INSERT INTO scouting_sistemas_juego (id, codigo, nombre, descripcion, defensas, centrocampistas, delanteros, activo, updated_at)
VALUES 
  ('sys_4_4_2', '4-4-2', '4-4-2 Standard', 'Sistema clásico con 4 defensas, 4 centrocampistas y 2 delanteros.', 4, 4, 2, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_3_3', '4-3-3', '4-3-3 Ofensivo', 'Sistema posicional con pivote defensivo, 2 interiores y extremos abiertos.', 4, 3, 3, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_2_3_1', '4-2-3-1', '4-2-3-1 Doble Pivote', 'Equilibrio defensivo con doble pivote y libertad creativa para mediapunta.', 4, 5, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_3_5_2', '3-5-2', '3-5-2 Carrileros', 'Línea de 3 centrales con dos carrileros y doble delantero centro.', 3, 5, 2, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_5_4_1', '5-4-1', '5-4-1 Bloque Bajo', 'Estructura defensiva con 5 defensas, 4 centrocampistas y 1 punta.', 5, 4, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_1_4_1', '4-1-4-1', '4-1-4-1 Presión Media', 'Pivote por delante de la defensa, línea de 4 centrocampistas y 1 punta.', 4, 5, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  defensas = EXCLUDED.defensas,
  centrocampistas = EXCLUDED.centrocampistas,
  delanteros = EXCLUDED.delanteros,
  activo = EXCLUDED.activo,
  updated_at = EXCLUDED.updated_at;

-- 5. INSERTAR O ACTUALIZAR EL CAMPOGRAMA DE SEGUNDA RFEF GRUPO I (SEPTIEMBRE 2026)
INSERT INTO scouting_campogramas (
  id, folder_id, "folderId", sub_folder_id, "subFolderId", month_folder_id, "monthFolderId",
  nombre, descripcion, fecha_modificacion, "fechaModificacion", updated_at, "updatedAt",
  formation, monthly_view, "monthlyView", assignments, monthly_assignments, "monthlyAssignments", notes
) VALUES (
  'c_septiembre_2026_2rfef_g1',
  'mensuales', 'mensuales',
  '2rfef', '2rfef',
  'septiembre', 'septiembre',
  'SEGUNDA RFEF GRUPO I - SEPTIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo I',
  '01/09/2026', '01/09/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2', false, false,
  '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo I en Septiembre 2026 vinculado a Supabase.'
)
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

-- 6. INSERTAR LAS 11 POSICIONES DEL SISTEMA 4-4-2 PARA EL CAMPOGRAMA DE SEGUNDA RFEF GRUPO I
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
) VALUES
  ('pos_c_septiembre_2026_2rfef_g1_por', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'por', 'por', 'POR', 'POR', 'Portero', 'Portero', 50, 50, 88, 88, '["Portero"]'::jsonb, '["Portero"]'::jsonb, 0, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_ltd', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'ltd', 'ltd', 'LTD', 'LTD', 'Defensa', 'Defensa', 15, 15, 70, 70, '["Lateral Derecho", "Defensa Central"]'::jsonb, '["Lateral Derecho", "Defensa Central"]'::jsonb, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_dfc_d', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'dfc_d', 'dfc_d', 'DFC', 'DFC', 'Defensa', 'Defensa', 38, 38, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_dfc_i', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'dfc_i', 'dfc_i', 'DFC', 'DFC', 'Defensa', 'Defensa', 62, 62, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_lti', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'lti', 'lti', 'LTI', 'LTI', 'Defensa', 'Defensa', 85, 85, 70, 70, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, 4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_md', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'md', 'md', 'MD', 'MD', 'Centrocampista', 'Centrocampista', 15, 15, 44, 44, '["Extremo Derecho", "Mediocentro"]'::jsonb, '["Extremo Derecho", "Mediocentro"]'::jsonb, 5, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_mc_d', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'mc_d', 'mc_d', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 38, 38, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 6, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_mc_i', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'mc_i', 'mc_i', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 62, 62, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 7, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_mi', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'mi', 'mi', 'MI', 'MI', 'Centrocampista', 'Centrocampista', 85, 85, 44, 44, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, 8, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_dc_d', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'dc_d', 'dc_d', 'DC', 'DC', 'Delantero', 'Delantero', 38, 38, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 9, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g1_dc_i', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g1', 'c_septiembre_2026_2rfef_g1', 'dc_i', 'dc_i', 'DC', 'DC', 'Delantero', 'Delantero', 62, 62, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 10, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 7. Notificar a PostgREST para recargar el esquema de tablas
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Returns the exact SQL script to create tables for campogramas, sistemas de juego y posiciones vinculadas,
 * and link "SEGUNDA RFEF GRUPO II - SEPTIEMBRE 2026" with full tactical systems in Supabase.
 */
export function getCampogramaSegundaRFEFGrupo2SeptiembreSQL(): string {
  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CAMPOGRAMA "SEGUNDA RFEF GRUPO II - SEPTIEMBRE 2026"
-- CON SISTEMAS DE JUEGO Y TABLA DE POSICIONES EN SUPABASE
-- ==============================================================================

-- 1. TABLA DE CAMPOGRAMAS
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'mensuales',
  "folderId" TEXT DEFAULT 'mensuales',
  sub_folder_id TEXT DEFAULT '2rfef',
  "subFolderId" TEXT DEFAULT '2rfef',
  month_folder_id TEXT DEFAULT 'septiembre',
  "monthFolderId" TEXT DEFAULT 'septiembre',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT DEFAULT '2rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT DEFAULT '2rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;
DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA DE SISTEMAS DE JUEGO (FORMACIONES TÁCTICAS)
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS formacion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS defensas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS centrocampistas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS delanteros INTEGER DEFAULT 2;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS posiciones_defecto JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "posicionesDefecto" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE POSICIONES VINCULADAS AL SISTEMA Y CAMPOGRAMA
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS sistema_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "sistemaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS campograma_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "campogramaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_label TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionLabel" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS categoria_posicion TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "categoriaPosicion" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_x NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordX" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_y NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordY" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS allowed_roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "allowedRoles" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugador_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadorId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 4. POBLAR SISTEMAS DE JUEGO BASE
INSERT INTO scouting_sistemas_juego (id, codigo, nombre, descripcion, defensas, centrocampistas, delanteros, activo, updated_at)
VALUES 
  ('sys_4_4_2', '4-4-2', '4-4-2 Standard', 'Sistema clásico con 4 defensas, 4 centrocampistas y 2 delanteros.', 4, 4, 2, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_3_3', '4-3-3', '4-3-3 Ofensivo', 'Sistema posicional con pivote defensivo, 2 interiores y extremos abiertos.', 4, 3, 3, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_2_3_1', '4-2-3-1', '4-2-3-1 Doble Pivote', 'Equilibrio defensivo con doble pivote y libertad creativa para mediapunta.', 4, 5, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_3_5_2', '3-5-2', '3-5-2 Carrileros', 'Línea de 3 centrales con dos carrileros y doble delantero centro.', 3, 5, 2, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_5_4_1', '5-4-1', '5-4-1 Bloque Bajo', 'Estructura defensiva con 5 defensas, 4 centrocampistas y 1 punta.', 5, 4, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_1_4_1', '4-1-4-1', '4-1-4-1 Presión Media', 'Pivote por delante de la defensa, línea de 4 centrocampistas y 1 punta.', 4, 5, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  defensas = EXCLUDED.defensas,
  centrocampistas = EXCLUDED.centrocampistas,
  delanteros = EXCLUDED.delanteros,
  activo = EXCLUDED.activo,
  updated_at = EXCLUDED.updated_at;

-- 5. INSERTAR O ACTUALIZAR EL CAMPOGRAMA DE SEGUNDA RFEF GRUPO II (SEPTIEMBRE 2026)
INSERT INTO scouting_campogramas (
  id, folder_id, "folderId", sub_folder_id, "subFolderId", month_folder_id, "monthFolderId",
  nombre, descripcion, fecha_modificacion, "fechaModificacion", updated_at, "updatedAt",
  formation, monthly_view, "monthlyView", assignments, monthly_assignments, "monthlyAssignments", notes
) VALUES (
  'c_septiembre_2026_2rfef_g2',
  'mensuales', 'mensuales',
  '2rfef', '2rfef',
  'septiembre', 'septiembre',
  'SEGUNDA RFEF GRUPO II - SEPTIEMBRE 2026',
  'Campograma mensual y alineación táctica para Segunda RFEF Grupo II',
  '01/09/2026', '01/09/2026',
  EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000,
  '4-4-2', false, false,
  '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  'Campograma de seguimiento para Segunda RFEF Grupo II en Septiembre 2026 vinculado a Supabase.'
)
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

-- 6. INSERTAR LAS 11 POSICIONES DEL SISTEMA 4-4-2 PARA EL CAMPOGRAMA DE SEGUNDA RFEF GRUPO II
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", orden, updated_at, "updatedAt"
) VALUES
  ('pos_c_septiembre_2026_2rfef_g2_por', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'por', 'por', 'POR', 'POR', 'Portero', 'Portero', 50, 50, 88, 88, '["Portero"]'::jsonb, '["Portero"]'::jsonb, 0, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_ltd', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'ltd', 'ltd', 'LTD', 'LTD', 'Defensa', 'Defensa', 15, 15, 70, 70, '["Lateral Derecho", "Defensa Central"]'::jsonb, '["Lateral Derecho", "Defensa Central"]'::jsonb, 1, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_dfc_d', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'dfc_d', 'dfc_d', 'DFC', 'DFC', 'Defensa', 'Defensa', 38, 38, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_dfc_i', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'dfc_i', 'dfc_i', 'DFC', 'DFC', 'Defensa', 'Defensa', 62, 62, 72, 72, '["Defensa Central"]'::jsonb, '["Defensa Central"]'::jsonb, 3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_lti', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'lti', 'lti', 'LTI', 'LTI', 'Defensa', 'Defensa', 85, 85, 70, 70, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, '["Lateral Izquierdo", "Defensa Central"]'::jsonb, 4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_md', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'md', 'md', 'MD', 'MD', 'Centrocampista', 'Centrocampista', 15, 15, 44, 44, '["Extremo Derecho", "Mediocentro"]'::jsonb, '["Extremo Derecho", "Mediocentro"]'::jsonb, 5, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_mc_d', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'mc_d', 'mc_d', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 38, 38, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 6, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_mc_i', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'mc_i', 'mc_i', 'MC', 'MC', 'Centrocampista', 'Centrocampista', 62, 62, 46, 46, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, '["Mediocentro", "Mediocentro Defensivo", "Mediapunta"]'::jsonb, 7, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_mi', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'mi', 'mi', 'MI', 'MI', 'Centrocampista', 'Centrocampista', 85, 85, 44, 44, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, '["Extremo Izquierdo", "Mediocentro"]'::jsonb, 8, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_dc_d', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'dc_d', 'dc_d', 'DC', 'DC', 'Delantero', 'Delantero', 38, 38, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 9, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('pos_c_septiembre_2026_2rfef_g2_dc_i', '4-4-2', '4-4-2', 'c_septiembre_2026_2rfef_g2', 'c_septiembre_2026_2rfef_g2', 'dc_i', 'dc_i', 'DC', 'DC', 'Delantero', 'Delantero', 62, 62, 18, 18, '["Delantero Centro", "Mediapunta"]'::jsonb, '["Delantero Centro", "Mediapunta"]'::jsonb, 10, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 7. Notificar a PostgREST para recargar el esquema de tablas
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Returns comprehensive SQL to create and populate tables for Sistemas de Juego and Posiciones de Jugadores vinculadas.
 */
export function getSistemasYPosicionesSQL(campogramas?: any[]): string {
  const targetCampogramas = campogramas && campogramas.length > 0 
    ? campogramas 
    : [
        {
          id: 'c_septiembre_2026_2rfef_g1',
          nombre: 'SEGUNDA RFEF GRUPO I - SEPTIEMBRE 2026',
          formation: '4-4-2'
        }
      ];

  const posRowsSql: string[] = [];

  targetCampogramas.forEach(c => {
    const formation = c.formation || '4-4-2';
    const defPositions = getPosicionesDefectoPorSistema(formation);
    const assignments = c.assignments || {};
    const monthly = c.monthlyAssignments || c.monthly_assignments || {};

    defPositions.forEach((pos: any, idx: number) => {
      const recId = `pos_${c.id}_${pos.id}`;
      const titular = assignments[pos.id] ? `'${assignments[pos.id]}'` : 'NULL';
      const monthlyArray = Array.isArray(monthly[pos.id]) ? JSON.stringify(monthly[pos.id]) : '[]';
      const rolesJson = JSON.stringify(pos.allowedRoles || []).replace(/'/g, "''");

      posRowsSql.push(`  ('${recId}', '${formation}', '${formation}', '${c.id}', '${c.id}', '${pos.id}', '${pos.id}', '${pos.label}', '${pos.label}', '${pos.category}', '${pos.category}', ${pos.x}, ${pos.x}, ${pos.y}, ${pos.y}, '${rolesJson}'::jsonb, '${rolesJson}'::jsonb, ${titular}, ${titular}, '${monthlyArray}'::jsonb, '${monthlyArray}'::jsonb, ${idx}, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`);
    });
  });

  return `-- ==============================================================================
-- SQL DEDICADO: SISTEMAS DE JUEGO Y POSICIONES DE JUGADORES (SUPABASE)
-- ==============================================================================

-- 1. TABLA: SISTEMAS DE JUEGO / FORMACIONES TÁCTICAS
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS formacion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS defensas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS centrocampistas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS delanteros INTEGER DEFAULT 2;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS posiciones_defecto JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "posicionesDefecto" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA: POSICIONES DE JUGADORES VINCULADAS AL SISTEMA Y CAMPOGRAMA
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS sistema_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "sistemaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS campograma_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "campogramaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_label TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionLabel" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS categoria_posicion TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "categoriaPosicion" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_x NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordX" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_y NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordY" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS allowed_roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "allowedRoles" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugador_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadorId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 3. POBLAR LOS 6 SISTEMAS DE JUEGO PRINCIPALES
INSERT INTO scouting_sistemas_juego (id, codigo, nombre, descripcion, defensas, centrocampistas, delanteros, activo, updated_at, "updatedAt")
VALUES 
  ('sys_4_4_2', '4-4-2', '4-4-2 Standard', 'Sistema clásico de dos líneas de 4 con 2 puntas.', 4, 4, 2, true, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_3_3', '4-3-3', '4-3-3 Ofensivo', 'Pivote defensivo, 2 interiores con llegada y 2 extremos abiertos.', 4, 3, 3, true, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_2_3_1', '4-2-3-1', '4-2-3-1 Doble Pivote', 'Doble pivote de contención y creación con mediapunta.', 4, 5, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_3_5_2', '3-5-2', '3-5-2 Carrileros', '3 centrales, 2 carrileros de banda y 2 delanteros.', 3, 5, 2, true, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_5_4_1', '5-4-1', '5-4-1 Bloque Bajo', 'Línea de 5 defensas, 4 medios y 1 referencia en ataque.', 5, 4, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_1_4_1', '4-1-4-1', '4-1-4-1 Presión Media', 'Pivote único, 4 medios adelantados y 1 delantero centro.', 4, 5, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  defensas = EXCLUDED.defensas,
  centrocampistas = EXCLUDED.centrocampistas,
  delanteros = EXCLUDED.delanteros,
  activo = EXCLUDED.activo,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";

-- 4. POBLAR POSICIONES VINCULADAS A SISTEMAS Y CAMPOGRAMAS
${posRowsSql.length > 0 ? `INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", jugador_id, "jugadorId",
  jugadores_mensuales_ids, "jugadoresMensualesIds", orden, updated_at, "updatedAt"
) VALUES
${posRowsSql.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  jugador_id = EXCLUDED.jugador_id,
  "jugadorId" = EXCLUDED."jugadorId",
  jugadores_mensuales_ids = EXCLUDED.jugadores_mensuales_ids,
  "jugadoresMensualesIds" = EXCLUDED."jugadoresMensualesIds",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";` : '-- (No hay posiciones pendientes de registrar)'}

-- 5. NOTIFICAR RECARGA DE ESQUEMA EN POSTGREST
NOTIFY pgrst, 'reload schema';
`;
}


/**
 * Generates SQL to create the table and insert/update a single specified campograma item in Supabase,
 * including its linked tactical systems and 11 pitch positions.
 */
export function getCampogramaSingleSQL(c: any): string {
  if (!c || !c.id) {
    return getCampogramaSegundaRFEFGrupo2SeptiembreSQL();
  }

  const assignmentsJson = JSON.stringify(c.assignments || {}).replace(/'/g, "''");
  const monthlyAssignmentsJson = JSON.stringify(c.monthlyAssignments || c.monthly_assignments || {}).replace(/'/g, "''");
  const safeName = (c.nombre || 'Campograma').replace(/'/g, "''");
  const safeDesc = (c.descripcion || '').replace(/'/g, "''");
  const safeNotes = (c.notes || '').replace(/'/g, "''");
  const safeFecha = (c.fechaModificacion || c.fecha_modificacion || new Date().toLocaleDateString('es-ES')).replace(/'/g, "''");
  const subFolder = (c.subFolderId || c.sub_folder_id) ? `'${c.subFolderId || c.sub_folder_id}'` : 'NULL';
  const monthFolder = (c.monthFolderId || c.month_folder_id) ? `'${c.monthFolderId || c.month_folder_id}'` : 'NULL';
  const folderId = c.folderId || c.folder_id || 'mensuales';
  const updatedAt = c.updatedAt || c.updated_at || Date.now();
  const formation = c.formation || '4-4-2';

  const defPositions = getPosicionesDefectoPorSistema(formation);
  const assignments = c.assignments || {};
  const monthly = c.monthlyAssignments || c.monthly_assignments || {};

  const posRows = defPositions.map((pos: any, idx: number) => {
    const recId = `pos_${c.id}_${pos.id}`;
    const titular = assignments[pos.id] ? `'${assignments[pos.id]}'` : 'NULL';
    const monthlyArray = Array.isArray(monthly[pos.id]) ? JSON.stringify(monthly[pos.id]) : '[]';
    const rolesJson = JSON.stringify(pos.allowedRoles || []).replace(/'/g, "''");

    return `  ('${recId}', '${formation}', '${formation}', '${c.id}', '${c.id}', '${pos.id}', '${pos.id}', '${pos.label}', '${pos.label}', '${pos.category}', '${pos.category}', ${pos.x}, ${pos.x}, ${pos.y}, ${pos.y}, '${rolesJson}'::jsonb, '${rolesJson}'::jsonb, ${titular}, ${titular}, '${monthlyArray}'::jsonb, '${monthlyArray}'::jsonb, ${idx}, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`;
  });

  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CAMPOGRAMA "${safeName.toUpperCase()}"
-- CON SISTEMAS DE JUEGO Y TABLA DE POSICIONES EN SUPABASE
-- ==============================================================================

-- 1. TABLA DE CAMPOGRAMAS
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'mensuales',
  "folderId" TEXT DEFAULT 'mensuales',
  sub_folder_id TEXT DEFAULT '2rfef',
  "subFolderId" TEXT DEFAULT '2rfef',
  month_folder_id TEXT DEFAULT 'septiembre',
  "monthFolderId" TEXT DEFAULT 'septiembre',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'mensuales';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT DEFAULT '2rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT DEFAULT '2rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT DEFAULT 'septiembre';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;
DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA DE SISTEMAS DE JUEGO (FORMACIONES TÁCTICAS)
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  defensas INTEGER DEFAULT 4,
  centrocampistas INTEGER DEFAULT 4,
  delanteros INTEGER DEFAULT 2,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS formacion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS defensas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS centrocampistas INTEGER DEFAULT 4;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS delanteros INTEGER DEFAULT 2;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS posiciones_defecto JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "posicionesDefecto" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_sistemas_juego ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en sistemas juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en sistemas juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE POSICIONES VINCULADAS AL SISTEMA Y CAMPOGRAMA
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_id TEXT,
  "posicionId" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria_posicion TEXT,
  "categoriaPosicion" TEXT,
  coord_x NUMERIC DEFAULT 50,
  "coordX" NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  "coordY" NUMERIC DEFAULT 50,
  allowed_roles JSONB DEFAULT '[]'::jsonb,
  "allowedRoles" JSONB DEFAULT '[]'::jsonb,
  jugador_id TEXT,
  "jugadorId" TEXT,
  jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb,
  "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  notas TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS sistema_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "sistemaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS campograma_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "campogramaId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS posicion_label TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "posicionLabel" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS categoria_posicion TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "categoriaPosicion" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_x NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordX" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS coord_y NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "coordY" NUMERIC DEFAULT 50;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS allowed_roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "allowedRoles" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugador_id TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadorId" TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS jugadores_mensuales_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "jugadoresMensualesIds" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_posiciones_sistema ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
DROP POLICY IF EXISTS "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en posiciones sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 4. POBLAR SISTEMAS DE JUEGO BASE
INSERT INTO scouting_sistemas_juego (id, codigo, nombre, descripcion, defensas, centrocampistas, delanteros, activo, updated_at)
VALUES 
  ('sys_4_4_2', '4-4-2', '4-4-2 Standard', 'Sistema clásico con 4 defensas, 4 centrocampistas y 2 delanteros.', 4, 4, 2, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_3_3', '4-3-3', '4-3-3 Ofensivo', 'Sistema posicional con pivote defensivo, 2 interiores y extremos abiertos.', 4, 3, 3, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_2_3_1', '4-2-3-1', '4-2-3-1 Doble Pivote', 'Equilibrio defensivo con doble pivote y libertad creativa para mediapunta.', 4, 5, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_3_5_2', '3-5-2', '3-5-2 Carrileros', 'Línea de 3 centrales con dos carrileros y doble delantero centro.', 3, 5, 2, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_5_4_1', '5-4-1', '5-4-1 Bloque Bajo', 'Estructura defensiva con 5 defensas, 4 centrocampistas y 1 punta.', 5, 4, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sys_4_1_4_1', '4-1-4-1', '4-1-4-1 Presión Media', 'Pivote por delante de la defensa, línea de 4 centrocampistas y 1 punta.', 4, 5, 1, true, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  defensas = EXCLUDED.defensas,
  centrocampistas = EXCLUDED.centrocampistas,
  delanteros = EXCLUDED.delanteros,
  activo = EXCLUDED.activo,
  updated_at = EXCLUDED.updated_at;

-- 5. INSERTAR O ACTUALIZAR EL CAMPOGRAMA
INSERT INTO scouting_campogramas (
  id,
  folder_id,
  "folderId",
  sub_folder_id,
  "subFolderId",
  month_folder_id,
  "monthFolderId",
  nombre,
  descripcion,
  fecha_modificacion,
  "fechaModificacion",
  updated_at,
  "updatedAt",
  formation,
  monthly_view,
  "monthlyView",
  assignments,
  monthly_assignments,
  "monthlyAssignments",
  notes
) VALUES (
  '${c.id}',
  '${folderId}',
  '${folderId}',
  ${subFolder},
  ${subFolder},
  ${monthFolder},
  ${monthFolder},
  '${safeName}',
  '${safeDesc}',
  '${safeFecha}',
  '${safeFecha}',
  ${updatedAt},
  ${updatedAt},
  '${formation}',
  ${c.monthlyView ? 'true' : 'false'},
  ${c.monthlyView ? 'true' : 'false'},
  '${assignmentsJson}'::jsonb,
  '${monthlyAssignmentsJson}'::jsonb,
  '${monthlyAssignmentsJson}'::jsonb,
  '${safeNotes}'
)
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  monthly_view = EXCLUDED.monthly_view,
  "monthlyView" = EXCLUDED."monthlyView",
  assignments = EXCLUDED.assignments,
  monthly_assignments = EXCLUDED.monthly_assignments,
  "monthlyAssignments" = EXCLUDED."monthlyAssignments",
  notes = EXCLUDED.notes;

-- 6. INSERTAR LAS POSICIONES DEL SISTEMA (${formation}) PARA ESTE CAMPOGRAMA
${posRows.length > 0 ? `INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId",
  posicion_id, "posicionId", posicion_label, "posicionLabel",
  categoria_posicion, "categoriaPosicion", coord_x, "coordX", coord_y, "coordY",
  allowed_roles, "allowedRoles", jugador_id, "jugadorId",
  jugadores_mensuales_ids, "jugadoresMensualesIds", orden, updated_at, "updatedAt"
) VALUES
${posRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_id = EXCLUDED.posicion_id,
  "posicionId" = EXCLUDED."posicionId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria_posicion = EXCLUDED.categoria_posicion,
  "categoriaPosicion" = EXCLUDED."categoriaPosicion",
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  allowed_roles = EXCLUDED.allowed_roles,
  "allowedRoles" = EXCLUDED."allowedRoles",
  jugador_id = EXCLUDED.jugador_id,
  "jugadorId" = EXCLUDED."jugadorId",
  jugadores_mensuales_ids = EXCLUDED.jugadores_mensuales_ids,
  "jugadoresMensualesIds" = EXCLUDED."jugadoresMensualesIds",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt";` : '-- (No hay posiciones)'}

-- 7. Notificar a PostgREST para recargar el esquema de tablas
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Backward compatibility alias for getCampogramaSeptiembreSQL
 */
export function getCampogramaAgostoSQL(): string {
  return getCampogramaSeptiembreSQL();
}

/**
 * Uploads a file (photo or team logo) directly to the Supabase Storage bucket 'scouting_assets'.
 * Automatically ensures unique names and organizes into subfolders.
 */
export async function dbUploadFile(file: File, folderName: 'player_photos' | 'team_crests'): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized or configured in .env.');
  }

  const fileExt = file.name.split('.').pop() || 'png';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 100000)}_${cleanFileName}.${fileExt}`;
  const filePath = `${folderName}/${uniqueName}`;

  // Try creating the bucket in case it doesn't exist
  try {
    await supabase.storage.createBucket('scouting_assets', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    });
  } catch (err) {
    // Bucket might already exist or RLS doesn't allow creation, proceed to upload anyway
  }

  const { data, error } = await supabase.storage
    .from('scouting_assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Error uploading file to Supabase Storage:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('scouting_assets')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Fetch all video clips from Supabase table 'scouting_videos'.
 */
export async function dbFetchVideos(): Promise<{ videos: any[]; tableMissing?: boolean }> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('scouting_videos')
    .select('*');

  if (error) {
    const isMissing = error.message?.includes('schema cache') || 
                      error.message?.includes('does not exist') || 
                      error.code === '42P01' || 
                      error.code === 'PGRST301';
    
    if (isMissing) {
      return { videos: [], tableMissing: true };
    }
    throw new Error(error.message || 'Error al conectar con la tabla scouting_videos en Supabase');
  }

  const sortedData = (data || []).sort((a: any, b: any) => {
    const dateA = a.fecha_registro || a.fechaRegistro || '';
    const dateB = b.fecha_registro || b.fechaRegistro || '';
    return dateB.localeCompare(dateA);
  });

  const videos = sortedData.map((row: any) => ({
    id: row.id,
    titulo: row.titulo || 'Sin título',
    url: row.url || '',
    descripcion: row.descripcion || '',
    jugadorId: row.jugador_id || row.jugadorId || undefined,
    categoria: row.categoria || 'Análisis Individual',
    fechaRegistro: row.fecha_registro || row.fechaRegistro || new Date().toISOString().split('T')[0]
  }));

  return { videos, tableMissing: false };
}

/**
 * Saves or updates a single video clip in Supabase table 'scouting_videos'.
 */
export async function dbSaveVideo(video: any): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const payload = {
    id: video.id,
    titulo: video.titulo,
    url: video.url,
    descripcion: video.descripcion || '',
    jugador_id: video.jugadorId || null,
    jugadorId: video.jugadorId || null,
    categoria: video.categoria || 'Análisis Individual',
    fecha_registro: video.fechaRegistro || new Date().toISOString().split('T')[0],
    fechaRegistro: video.fechaRegistro || new Date().toISOString().split('T')[0]
  };

  try {
    await safeUpsert('scouting_videos', payload, 'id');
  } catch (error) {
    console.error('Error saving video to Supabase:', error);
    throw error;
  }
}

/**
 * Deletes a video clip from Supabase table 'scouting_videos'.
 */
export async function dbDeleteVideo(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { error } = await supabase
    .from('scouting_videos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting video from Supabase:', error);
    throw error;
  }
}

/**
 * Uploads a local video clip file (mp4, webm, mov, etc.) directly to Supabase Storage bucket 'scouting_assets'.
 */
export async function dbUploadVideoFile(file: File): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized or configured in .env.');
  }

  const fileExt = file.name.split('.').pop() || 'mp4';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const uniqueName = `video_${Date.now()}_${Math.floor(Math.random() * 100000)}.${fileExt}`;
  const filePath = `videos/${uniqueName}`;

  try {
    await supabase.storage.createBucket('scouting_assets', {
      public: true,
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'image/jpeg', 'image/png']
    });
  } catch (err) {
    // Bucket might already exist or RLS issue
  }

  const { data, error } = await supabase.storage
    .from('scouting_assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Error uploading video to Supabase Storage:', error);
    throw new Error(`Error al subir vídeo a Supabase Storage: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('scouting_assets')
    .getPublicUrl(filePath);

  return publicUrl;
}

export function getCampogramaInviernoSQL(): string {
  const campogramasInvierno = [
    { id: 'c_invierno_1rfef_g1', subFolder: '1rfef', name: 'PRIMERA RFEF GRUPO I - INVIERNO', desc: 'Campograma y planificación de mercado invernal para Primera RFEF Grupo I' },
    { id: 'c_invierno_1rfef_g2', subFolder: '1rfef', name: 'PRIMERA RFEF GRUPO II - INVIERNO', desc: 'Campograma y planificación de mercado invernal para Primera RFEF Grupo II' },
    { id: 'c_invierno_2rfef_g1', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO I - INVIERNO', desc: 'Campograma y planificación de mercado invernal para Segunda RFEF Grupo I' },
    { id: 'c_invierno_2rfef_g2', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO II - INVIERNO', desc: 'Campograma y planificación de mercado invernal para Segunda RFEF Grupo II' },
    { id: 'c_invierno_2rfef_g3', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO III - INVIERNO', desc: 'Campograma y planificación de mercado invernal para Segunda RFEF Grupo III' },
    { id: 'c_invierno_2rfef_g4', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO IV - INVIERNO', desc: 'Campograma y planificación de mercado invernal para Segunda RFEF Grupo IV' },
    { id: 'c_invierno_2rfef_g5', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO V - INVIERNO', desc: 'Campograma y planificación de mercado invernal para Segunda RFEF Grupo V' }
  ];

  const defaultPositions442 = getPosicionesDefectoPorSistema('4-4-2');

  const campogramasInserts = campogramasInvierno.map(c => `  ('${c.id}', 'invierno', 'invierno', '${c.subFolder}', '${c.subFolder}', NULL, NULL, '${c.name}', '${c.desc}', '20/01/2026', '20/01/2026', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento y fichajes de invierno para ${c.name} vinculado a Supabase.')`).join(',\n');

  const posicionesInserts = campogramasInvierno.flatMap(c => {
    return defaultPositions442.map((pos: any, idx: number) => {
      const recId = `pos_${c.id}_${pos.id}`;
      const rolesJson = JSON.stringify(pos.allowedRoles || []).replace(/'/g, "''");
      return `  ('${recId}', '4-4-2', '4-4-2', '${c.id}', '${c.id}', '${pos.id}', '${pos.id}', '${pos.label}', '${pos.label}', '${pos.category}', '${pos.category}', ${pos.x}, ${pos.x}, ${pos.y}, ${pos.y}, '${rolesJson}'::jsonb, '${rolesJson}'::jsonb, NULL, NULL, '[]'::jsonb, '[]'::jsonb, ${idx}, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`;
    });
  }).join(',\n');

  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CAMPOGRAMAS DE INVIERNO (1ª RFEF G1-G2 + 2ª RFEF G1-G5)
-- ==============================================================================

-- 1. TABLA PRINCIPAL DE CAMPOGRAMAS
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'invierno',
  "folderId" TEXT DEFAULT 'invierno',
  sub_folder_id TEXT DEFAULT '1rfef',
  "subFolderId" TEXT DEFAULT '1rfef',
  month_folder_id TEXT,
  "monthFolderId" TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'invierno';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'invierno';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT DEFAULT '1rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT DEFAULT '1rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;

DROP POLICY IF EXISTS "Permitir todo en scouting_campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en scouting_campogramas" ON scouting_campogramas FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA DE SISTEMAS DE JUEGO TÁCTICOS
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  categoria_base TEXT DEFAULT '4 Defensas',
  descripcion TEXT,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  es_sistema_club BOOLEAN DEFAULT true,
  "esSistemaClub" BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 1
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en scouting_sistemas_juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en scouting_sistemas_juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE POSICIONES DE SISTEMA (11 POSICIONES POR CAMPOGRAMA)
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_codigo TEXT,
  "posicionCodigo" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria TEXT,
  coord_x NUMERIC(5,2),
  "coordX" NUMERIC(5,2),
  coord_y NUMERIC(5,2),
  "coordY" NUMERIC(5,2),
  roles_permitidos JSONB DEFAULT '[]'::jsonb,
  "rolesPermitidos" JSONB DEFAULT '[]'::jsonb,
  jugador_titular_id TEXT,
  "jugadorTitularId" TEXT,
  candidatos_ids JSONB DEFAULT '[]'::jsonb,
  "candidatosIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  created_at BIGINT,
  updated_at BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en scouting_posiciones_sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en scouting_posiciones_sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 4. INSERTAR LOS 7 CAMPOGRAMAS DE INVIERNO (1ª RFEF G1-G2 Y 2ª RFEF G1-G5)
INSERT INTO scouting_campogramas (
  id, folder_id, "folderId", sub_folder_id, "subFolderId", month_folder_id, "monthFolderId", nombre, descripcion, fecha_modificacion, "fechaModificacion", updated_at, "updatedAt", formation, monthly_view, "monthlyView", assignments, monthly_assignments, "monthlyAssignments", notes
)
VALUES
${campogramasInserts}
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  notes = EXCLUDED.notes;

-- 5. INSERTAR O ACTUALIZAR LAS 77 POSICIONES TÁCTICAS DE INVIERNO
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId", posicion_codigo, "posicionCodigo", posicion_label, "posicionLabel", categoria, "categoria", coord_x, "coordX", coord_y, "coordY", roles_permitidos, "rolesPermitidos", jugador_titular_id, "jugadorTitularId", candidatos_ids, "candidatosIds", orden, created_at, updated_at
)
VALUES
${posicionesInserts}
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria = EXCLUDED.categoria,
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  roles_permitidos = EXCLUDED.roles_permitidos,
  "rolesPermitidos" = EXCLUDED."rolesPermitidos",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at;
`;
}

export function getCampogramaVeranoSQL(): string {
  const campogramasVerano = [
    { id: 'c_verano_1rfef_g1', subFolder: '1rfef', name: 'PRIMERA RFEF GRUPO I - VERANO', desc: 'Campograma y planificación de mercado estival para Primera RFEF Grupo I' },
    { id: 'c_verano_1rfef_g2', subFolder: '1rfef', name: 'PRIMERA RFEF GRUPO II - VERANO', desc: 'Campograma y planificación de mercado estival para Primera RFEF Grupo II' },
    { id: 'c_verano_2rfef_g1', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO I - VERANO', desc: 'Campograma y planificación de mercado estival para Segunda RFEF Grupo I' },
    { id: 'c_verano_2rfef_g2', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO II - VERANO', desc: 'Campograma y planificación de mercado estival para Segunda RFEF Grupo II' },
    { id: 'c_verano_2rfef_g3', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO III - VERANO', desc: 'Campograma y planificación de mercado estival para Segunda RFEF Grupo III' },
    { id: 'c_verano_2rfef_g4', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO IV - VERANO', desc: 'Campograma y planificación de mercado estival para Segunda RFEF Grupo IV' },
    { id: 'c_verano_2rfef_g5', subFolder: '2rfef', name: 'SEGUNDA RFEF GRUPO V - VERANO', desc: 'Campograma y planificación de mercado estival para Segunda RFEF Grupo V' }
  ];

  const defaultPositions442 = getPosicionesDefectoPorSistema('4-4-2');

  const campogramasInserts = campogramasVerano.map(c => `  ('${c.id}', 'verano', 'verano', '${c.subFolder}', '${c.subFolder}', NULL, NULL, '${c.name}', '${c.desc}', '22/07/2026', '22/07/2026', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, '4-4-2', false, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Campograma de seguimiento y fichajes de verano para ${c.name} vinculado a Supabase.')`).join(',\n');

  const posicionesInserts = campogramasVerano.flatMap(c => {
    return defaultPositions442.map((pos: any, idx: number) => {
      const recId = `pos_${c.id}_${pos.id}`;
      const rolesJson = JSON.stringify(pos.allowedRoles || []).replace(/'/g, "''");
      return `  ('${recId}', '4-4-2', '4-4-2', '${c.id}', '${c.id}', '${pos.id}', '${pos.id}', '${pos.label}', '${pos.label}', '${pos.category}', '${pos.category}', ${pos.x}, ${pos.x}, ${pos.y}, ${pos.y}, '${rolesJson}'::jsonb, '${rolesJson}'::jsonb, NULL, NULL, '[]'::jsonb, '[]'::jsonb, ${idx}, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`;
    });
  }).join(',\n');

  return `-- ==============================================================================
-- SQL: VINCULACIÓN DE CAMPOGRAMAS DE VERANO (1ª RFEF G1-G2 + 2ª RFEF G1-G5)
-- ==============================================================================

-- 1. TABLA PRINCIPAL DE CAMPOGRAMAS
CREATE TABLE IF NOT EXISTS scouting_campogramas (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL DEFAULT 'verano',
  "folderId" TEXT DEFAULT 'verano',
  sub_folder_id TEXT DEFAULT '1rfef',
  "subFolderId" TEXT DEFAULT '1rfef',
  month_folder_id TEXT,
  "monthFolderId" TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_modificacion TEXT,
  "fechaModificacion" TEXT,
  updated_at BIGINT,
  "updatedAt" BIGINT,
  formation TEXT NOT NULL DEFAULT '4-4-2',
  monthly_view BOOLEAN DEFAULT false,
  "monthlyView" BOOLEAN DEFAULT false,
  assignments JSONB DEFAULT '{}'::jsonb,
  monthly_assignments JSONB DEFAULT '{}'::jsonb,
  "monthlyAssignments" JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

ALTER TABLE scouting_campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'verano';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "folderId" TEXT DEFAULT 'verano';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS sub_folder_id TEXT DEFAULT '1rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "subFolderId" TEXT DEFAULT '1rfef';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS month_folder_id TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthFolderId" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS fecha_modificacion TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "fechaModificacion" TEXT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "updatedAt" BIGINT;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_view BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyView" BOOLEAN DEFAULT false;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS monthly_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS "monthlyAssignments" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scouting_campogramas ADD COLUMN IF NOT EXISTS notes TEXT;

DROP POLICY IF EXISTS "Permitir todo en scouting_campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en scouting_campogramas" ON scouting_campogramas FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA DE SISTEMAS DE JUEGO TÁCTICOS
CREATE TABLE IF NOT EXISTS scouting_sistemas_juego (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  categoria_base TEXT DEFAULT '4 Defensas',
  descripcion TEXT,
  posiciones_defecto JSONB DEFAULT '[]'::jsonb,
  "posicionesDefecto" JSONB DEFAULT '[]'::jsonb,
  es_sistema_club BOOLEAN DEFAULT true,
  "esSistemaClub" BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 1
);

ALTER TABLE scouting_sistemas_juego ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en scouting_sistemas_juego" ON scouting_sistemas_juego;
CREATE POLICY "Permitir todo en scouting_sistemas_juego" ON scouting_sistemas_juego FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA DE POSICIONES DE SISTEMA (11 POSICIONES POR CAMPOGRAMA)
CREATE TABLE IF NOT EXISTS scouting_posiciones_sistema (
  id TEXT PRIMARY KEY,
  sistema_id TEXT,
  "sistemaId" TEXT,
  campograma_id TEXT,
  "campogramaId" TEXT,
  posicion_codigo TEXT,
  "posicionCodigo" TEXT,
  posicion_label TEXT,
  "posicionLabel" TEXT,
  categoria TEXT,
  coord_x NUMERIC(5,2),
  "coordX" NUMERIC(5,2),
  coord_y NUMERIC(5,2),
  "coordY" NUMERIC(5,2),
  roles_permitidos JSONB DEFAULT '[]'::jsonb,
  "rolesPermitidos" JSONB DEFAULT '[]'::jsonb,
  jugador_titular_id TEXT,
  "jugadorTitularId" TEXT,
  candidatos_ids JSONB DEFAULT '[]'::jsonb,
  "candidatosIds" JSONB DEFAULT '[]'::jsonb,
  orden INTEGER DEFAULT 0,
  created_at BIGINT,
  updated_at BIGINT
);

ALTER TABLE scouting_posiciones_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en scouting_posiciones_sistema" ON scouting_posiciones_sistema;
CREATE POLICY "Permitir todo en scouting_posiciones_sistema" ON scouting_posiciones_sistema FOR ALL USING (true) WITH CHECK (true);

-- 4. INSERTAR LOS 7 CAMPOGRAMAS DE VERANO (1ª RFEF G1-G2 Y 2ª RFEF G1-G5)
INSERT INTO scouting_campogramas (
  id, folder_id, "folderId", sub_folder_id, "subFolderId", month_folder_id, "monthFolderId", nombre, descripcion, fecha_modificacion, "fechaModificacion", updated_at, "updatedAt", formation, monthly_view, "monthlyView", assignments, monthly_assignments, "monthlyAssignments", notes
)
VALUES
${campogramasInserts}
ON CONFLICT (id) DO UPDATE SET
  folder_id = EXCLUDED.folder_id,
  "folderId" = EXCLUDED."folderId",
  sub_folder_id = EXCLUDED.sub_folder_id,
  "subFolderId" = EXCLUDED."subFolderId",
  month_folder_id = EXCLUDED.month_folder_id,
  "monthFolderId" = EXCLUDED."monthFolderId",
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = EXCLUDED.fecha_modificacion,
  "fechaModificacion" = EXCLUDED."fechaModificacion",
  updated_at = EXCLUDED.updated_at,
  "updatedAt" = EXCLUDED."updatedAt",
  formation = EXCLUDED.formation,
  notes = EXCLUDED.notes;

-- 5. INSERTAR O ACTUALIZAR LAS 77 POSICIONES TÁCTICAS DE VERANO
INSERT INTO scouting_posiciones_sistema (
  id, sistema_id, "sistemaId", campograma_id, "campogramaId", posicion_codigo, "posicionCodigo", posicion_label, "posicionLabel", categoria, "categoria", coord_x, "coordX", coord_y, "coordY", roles_permitidos, "rolesPermitidos", jugador_titular_id, "jugadorTitularId", candidatos_ids, "candidatosIds", orden, created_at, updated_at
)
VALUES
${posicionesInserts}
ON CONFLICT (id) DO UPDATE SET
  sistema_id = EXCLUDED.sistema_id,
  "sistemaId" = EXCLUDED."sistemaId",
  campograma_id = EXCLUDED.campograma_id,
  "campogramaId" = EXCLUDED."campogramaId",
  posicion_label = EXCLUDED.posicion_label,
  "posicionLabel" = EXCLUDED."posicionLabel",
  categoria = EXCLUDED.categoria,
  coord_x = EXCLUDED.coord_x,
  "coordX" = EXCLUDED."coordX",
  coord_y = EXCLUDED.coord_y,
  "coordY" = EXCLUDED."coordY",
  roles_permitidos = EXCLUDED.roles_permitidos,
  "rolesPermitidos" = EXCLUDED."rolesPermitidos",
  orden = EXCLUDED.orden,
  updated_at = EXCLUDED.updated_at;
`;
}

export function getCampogramasMercadosCompletoSQL(): string {
  return `-- ==============================================================================
-- SQL: VINCULACIÓN COMPLETA MERCADOS INVIERNO + VERANO (14 CAMPOGRAMAS)
-- (1ª RFEF G1-G2 + 2ª RFEF G1-G5 EN AMBOS MERCADOS)
-- ==============================================================================

${getCampogramaInviernoSQL()}

${getCampogramaVeranoSQL()}
`;
}

/**
 * SQL Generator script specifically for Video Library & Storage
 */
export function GET_SUPABASE_VIDEOS_SQL(): string {
  return `-- TABLA DEDICADA PARA LA VIDEOTECA Y ANÁLISIS MULTIMEDIA
CREATE TABLE IF NOT EXISTS scouting_videos (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  descripcion TEXT,
  jugador_id TEXT,
  "jugadorId" TEXT,
  categoria TEXT DEFAULT 'Análisis Individual',
  fecha_registro TEXT NOT NULL,
  "fechaRegistro" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar el acceso RLS para la videoteca
ALTER TABLE scouting_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en videoteca" ON scouting_videos;
CREATE POLICY "Permitir todo en videoteca" ON scouting_videos
  FOR ALL USING (true) WITH CHECK (true);

-- BUCKET Y PERMISOS DE STORAGE PARA SUBIR VÍDEOS MP4/WEBM DIRECTOS Y MOCKUPS:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('scouting_assets', 'scouting_assets', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Acceso publico lectura" ON storage.objects;
CREATE POLICY "Acceso publico lectura" ON storage.objects FOR SELECT USING (bucket_id = 'scouting_assets');

DROP POLICY IF EXISTS "Acceso publico insercion" ON storage.objects;
CREATE POLICY "Acceso publico insercion" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scouting_assets');

DROP POLICY IF EXISTS "Acceso publico actualizacion" ON storage.objects;
CREATE POLICY "Acceso publico actualizacion" ON storage.objects FOR UPDATE USING (bucket_id = 'scouting_assets') WITH CHECK (bucket_id = 'scouting_assets');

DROP POLICY IF EXISTS "Acceso publico borrado" ON storage.objects;
CREATE POLICY "Acceso publico borrado" ON storage.objects FOR DELETE USING (bucket_id = 'scouting_assets');
`;
}

