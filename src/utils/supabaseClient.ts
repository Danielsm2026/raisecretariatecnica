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

  const { data, error } = await supabase
    .from('scouting_players')
    .select('*')
    .order('fechaRegistro', { ascending: false });

  if (error) {
    console.error('Error fetching players from Supabase:', error);
    throw error;
  }

  // Format incoming database rows back to ScoutedPlayer structure (specifically the JSON fields if needed)
  return (data || []).map((row: any) => {
    const rawAtributos = typeof row.atributos === 'string' ? JSON.parse(row.atributos) : (row.atributos || { fisico: 5, tecnica: 5, tactica: 5, mental: 5 });
    // Safe extraction of nested physical evaluation
    const { valoracionFisica: nestedFisica, ...cleanAtributos } = rawAtributos;
    return {
      id: row.id,
      nombre: row.nombre,
      equipo: row.equipo,
      posicion: row.posicion,
      anoNacimiento: row.ano_nacimiento || row.anoNacimiento || 2000,
      lateralidad: row.lateralidad,
      valorMercado: row.valor_mercado !== undefined ? row.valor_mercado : (row.valorMercado || 0),
      calificacion: row.calificacion || 3,
      notas: row.notas || '',
      atributos: cleanAtributos.fisico !== undefined ? cleanAtributos : rawAtributos,
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
      esFichajeVerano2026: player.esFichajeVerano2026
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
      esFichajeVerano2026: player.esFichajeVerano2026
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
 * Returns a SQL code snippet that the user can run in the Supabase SQL editor to bootstrap
 * their table automatically.
 */
export function getSQLInstructions(): string {
  return `-- Opción A: Si ya tienes las tablas creadas y quieres habilitar las valoraciones físicas y otras columnas (incluyendo fichajes 2026), ejecuta esto en el SQL Editor de Supabase:
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
ALTER TABLE scouting_match_reports ADD COLUMN IF NOT EXISTS categoria TEXT;

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

-- NUEVA TABLA PARA INFORMES DE PARTIDOS (ACTAS DE ALINEACIÓN TÁCTICA)
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
