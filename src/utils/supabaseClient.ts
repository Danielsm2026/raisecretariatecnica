import { createClient } from '@supabase/supabase-js';
import { ScoutedPlayer, MatchReport } from '../types';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY as string) || '';

// Create the client only if keys are present
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

/**
 * Supabase Auth helper functions
 */
export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error fetching Supabase session:', error);
    return null;
  }
  return session;
}

export async function getSupabaseUser() {
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error fetching Supabase user:', error);
    return null;
  }
  return user;
}

export function onSupabaseAuthStateChange(callback: (event: string, session: any) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

export async function supabaseSignIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase no está configurado');
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function supabaseSignOut() {
  if (!supabase) return;
  return await supabase.auth.signOut();
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

/**
 * Saves a single player to Supabase (upsert pattern).
 */
/**
 * Helper to perform an upsert on Supabase while automatically stripping out columns that don't exist in the database schema.
 */
async function safeUpsert(table: string, payload: any, onConflict: string): Promise<any> {
  let currentPayload = { ...payload };
  while (true) {
    const { error } = await supabase!
      .from(table)
      .upsert(currentPayload, { onConflict });
    
    if (!error) return;

    const errorMsg = error.message || '';
    const match = errorMsg.match(/column "([^"]+)"/i) || 
                  errorMsg.match(/column ([a-zA-Z0-9__]+) of/i) ||
                  errorMsg.match(/find the column "([^"]+)"/i) ||
                  errorMsg.match(/has no column named "([^"]+)"/i) ||
                  errorMsg.match(/column "([^"]+)" does not exist/i);

    if (match && match[1]) {
      const colName = match[1];
      console.warn(`Column '${colName}' does not exist on table '${table}'. Retrying without it.`);
      
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
    } else {
      throw error;
    }
  }
}

/**
 * Helper to perform a bulk upsert on Supabase while automatically stripping out columns that don't exist in the database schema.
 */
async function safeBulkUpsert(table: string, payloads: any[], onConflict: string): Promise<any> {
  let currentPayloads = payloads.map(p => ({ ...p }));
  while (true) {
    const { error } = await supabase!
      .from(table)
      .upsert(currentPayloads, { onConflict });
    
    if (!error) return;

    const errorMsg = error.message || '';
    const match = errorMsg.match(/column "([^"]+)"/i) || 
                  errorMsg.match(/column ([a-zA-Z0-9__]+) of/i) ||
                  errorMsg.match(/find the column "([^"]+)"/i) ||
                  errorMsg.match(/has no column named "([^"]+)"/i) ||
                  errorMsg.match(/column "([^"]+)" does not exist/i);

    if (match && match[1]) {
      const colName = match[1];
      console.warn(`Column '${colName}' does not exist on table '${table}'. Retrying bulk upsert without it.`);
      
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
    } else {
      throw error;
    }
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
    valor_mercado: player.valorMercado,
    valorMercado: player.valorMercado,
    calificacion: Math.round(player.calificacion),
    notas: player.notas,
    atributos: {
      ...player.atributos,
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
  } catch (error) {
    console.error('Error saving player to Supabase:', error);
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

  const { error } = await supabase
    .from('scouting_players')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting player from Supabase:', error);
    throw error;
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
    valor_mercado: player.valorMercado,
    valorMercado: player.valorMercado,
    calificacion: Math.round(player.calificacion),
    notas: player.notas,
    atributos: {
      ...player.atributos,
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
  } catch (error) {
    console.error('Error bulk upserting to Supabase:', error);
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

  const { data, error } = await supabase
    .from('scouting_match_reports')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching match reports from Supabase:', error);
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
    console.error('Error saving match report to Supabase:', error);
    throw error;
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
 * Fetch Plan Semanal weeks from Supabase settings storage.
 */
export async function dbFetchPlanSemanalWeeks<T = any>(defaultWeeks: T): Promise<T> {
  const res = await dbFetchSettingWithStatus<T>('plan_semanal_weeks_v2', defaultWeeks);
  return res.data;
}

export async function dbFetchPlanSemanalWeeksWithStatus<T = any>(defaultWeeks: T): Promise<{ success: boolean; data: T; error?: string }> {
  return dbFetchSettingWithStatus<T>('plan_semanal_weeks_v2', defaultWeeks);
}

/**
 * Fetch campogramas from Supabase table scouting_campogramas with fallback to settings storage.
 */
export async function dbFetchCampogramas(): Promise<any[]> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

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
    console.warn('Error fetching campogramas from scouting_campogramas table, using fallback:', error.message || error);
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
}

/**
 * Saves a single campograma to Supabase (table scouting_campogramas).
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
    console.warn('Upsert to scouting_campogramas failed, storing backup in settings:', err);
  }
}

/**
 * Deletes a single campograma from Supabase table scouting_campogramas.
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
  } catch (err) {
    console.warn('Error in dbDeleteCampograma:', err);
  }
}

/**
 * Bulk upserts campogramas into Supabase table scouting_campogramas.
 */
export async function dbBulkUpsertCampogramas(campogramas: any[]): Promise<void> {
  if (!supabase) return;

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
    console.warn('Bulk upsert to scouting_campogramas failed:', err);
    await dbSaveSetting('campogramas', campogramas);
  }
}

/**
 * Save Plan Semanal weeks to Supabase settings storage.
 */
export async function dbSavePlanSemanalWeeks(weeks: any): Promise<void> {
  await dbSaveSettingWithStatus('plan_semanal_weeks_v2', weeks);
}

export async function dbSavePlanSemanalWeeksWithStatus(weeks: any): Promise<{ success: boolean; error?: string }> {
  return dbSaveSettingWithStatus('plan_semanal_weeks_v2', weeks);
}

/**
 * Returns a SQL code snippet that the user can run in the Supabase SQL editor to bootstrap
 * their table automatically.
 */
export function getSQLInstructions(): string {
  return `-- Opción A: Si ya tienes las tablas creadas y quieres habilitar las valoraciones físicas, fichajes 2026 y sincronización de campogramas, ejecuta esto en el SQL Editor de Supabase:
ALTER TABLE scouting_players ADD COLUMN IF NOT EXISTS categoria TEXT;
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
DROP POLICY IF EXISTS "Permitir todo en campogramas" ON scouting_campogramas;
CREATE POLICY "Permitir todo en campogramas" ON scouting_campogramas FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS scouting_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE scouting_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en settings" ON scouting_settings;
CREATE POLICY "Permitir todo en settings" ON scouting_settings FOR ALL USING (true) WITH CHECK (true);

-- La tabla 'scouting_settings' guarda la agenda del Plan Semanal (key: 'plan_semanal_weeks_v2'), alineaciones tácticas y preferencias de la app.

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

-- CONFIGURACIÓN DE STORAGE EN SUPABASE (EJECUTA ESTO EN EL SQL EDITOR):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('scouting_assets', 'scouting_assets', true) ON CONFLICT (id) DO NOTHING;
-- CREATE POLICY "Acceso publico lectura" ON storage.objects FOR SELECT USING (bucket_id = 'scouting_assets');
-- CREATE POLICY "Acceso publico insercion" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scouting_assets');
-- CREATE POLICY "Acceso publico actualizacion" ON storage.objects FOR UPDATE USING (bucket_id = 'scouting_assets') WITH CHECK (bucket_id = 'scouting_assets');
-- CREATE POLICY "Acceso publico borrado" ON storage.objects FOR DELETE USING (bucket_id = 'scouting_assets');
`;
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

