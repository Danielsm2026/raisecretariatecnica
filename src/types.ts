export type Position = 
  | 'Portero'
  | 'Defensa Central'
  | 'Lateral Derecho'
  | 'Lateral Izquierdo'
  | 'Mediocentro Defensivo'
  | 'Mediocentro'
  | 'Mediapunta'
  | 'Extremo Derecho'
  | 'Extremo Izquierdo'
  | 'Delantero Centro';

export type Footedness = 'Diestro' | 'Zurdo' | 'Ambidiestro';

export interface PlayerAttributes {
  fisico: number;    // 1-10
  tecnica: number;    // 1-10
  tactica: number;    // 1-10
  mental: number;     // 1-10
}

export interface ScoutedPlayer {
  id: string;
  nombre: string;
  equipo: string;
  categoria?: string; // e.g. "Primera RFEF", "Segunda RFEF", "Segunda División"
  posicion: Position;
  anoNacimiento: number;
  lateralidad: Footedness;
  valorMercado?: number; // in EUR, e.g. 5000000 for 5M
  calificacion: number; // 1-5 stars
  notas: string;
  atributos: PlayerAttributes;
  fechaRegistro: string; // ISO date
  // New detailed scouting report fields (LaLiga paper style)
  altura?: string;
  recomendacion?: string; // e.g. "FIRMAR"
  recomendacionComentario?: string; // e.g. "Con nivel y experiencia en la categoría."
  descripcionGeneral?: string;
  fortalezas?: string; // newline-separated list
  debilidades?: string; // newline-separated list
  enSuEquipo?: string;
  enPocasPalabras?: string; // newline-separated list
  tieneValorPor?: string; // newline-separated list
  pitchX?: number; // 0-100 position
  pitchY?: number; // 0-100 position
  elo?: number; // ELO rating
  escudoUrl?: string; // URL to team crest/shield
  fotoUrl?: string; // URL to player's picture
  valoracionFisica?: Record<string, number>; // ratings by position (1-10)
  fichajeFecha?: string; // e.g. '2026-07-01'
  fichajeDetalles?: string; // e.g. 'Fichaje gratis.'
  fichajeOrigen?: string; // e.g. 'Bilbao Ath.'
  esFichajeVerano2026?: boolean;
}

export interface ScoutingStats {
  totalPlayers: number;
  averageAge: number;
  footednessCount: Record<Footedness, number>;
  positionCount: Record<Position, number>;
}

export interface MatchPlayer {
  id: string;
  dorsal: string;
  nombre: string;
  anoNacimiento: number | string;
  posicion: string; // e.g., "GK", "CB", "LB", "CM", "ST"
  pie: 'D' | 'Z' | 'A'; // Diestro, Zurdo, Ambidiestro
  pts: string; // Match points/rating or empty
  comentarios?: string;
  isTitular: boolean; // True for starting line-up, False for substitution bench
  pitchX: number; // 0 to 100 percentage position on the tactical pitch view
  pitchY: number; // 0 to 100 percentage position on the tactical pitch view
  fotoUrl?: string; // Player photo URL
  valoracionFisica?: Record<string, number>; // ratings 1-4
}

export interface MatchReport {
  id: string;
  fecha: string;
  partido: string; // e.g. "Getafe B vs UD Logroñés"
  competicion: string; // e.g. "Segunda Federación - Playoffs"
  categoria?: string; // e.g. "Sénior", "Juvenil", "Cadete", "Infantil"
  autor: string; // e.g. "ScoutingRealAvilésCF"
  equipoLocal: string;
  equipoVisitante: string;
  escudoLocal?: string; // Logo/shield url
  escudoVisitante?: string; // Logo/shield url
  golesLocal: number;
  golesVisitante: number;
  fechaHoraDetallada?: string; // e.g. "Domingo, 10 de Mayo - 11:30"
  comentariosLocal?: string;
  comentariosVisitante?: string;
  jugadoresLocal: MatchPlayer[];
  jugadoresVisitante: MatchPlayer[];
}

export interface VideoItem {
  id: string;
  titulo: string;
  url: string; // YouTube video URL
  descripcion?: string;
  jugadorId?: string; // Linked player (optional)
  categoria?: string; // Category, e.g. "Análisis Individual", "Táctica", "Goles", "Jugadas a Balón Parado"
  fechaRegistro: string; // ISO format date
}

export function getPhysicalCapacitiesByPosition(pos: string): { category: string; capacities: string[] } | null {
  const normalized = (pos || '').toUpperCase().trim();
  
  // Portero / Goalkeeper
  if (normalized === 'GK' || normalized.includes('PORT') || normalized === 'PO' || normalized.includes('ARQ')) {
    return {
      category: 'Portero',
      capacities: ['Explosividad', 'Agilidad', 'Potencia de salto', 'Velocidad en distancias cortas']
    };
  }
  
  // Defensa Central
  if (normalized === 'CB' || normalized.includes('CENTRAL') || normalized === 'DFC' || normalized === 'DF') {
    return {
      category: 'Defensa Central',
      capacities: ['Fuerza en duelos', 'Potencia aérea', 'Velocidad al espacio', 'Resistencia']
    };
  }
  
  // Lateral (Right / Left back)
  if (normalized === 'RB' || normalized === 'LB' || normalized === 'RWB' || normalized === 'LWB' || normalized.includes('LATERAL') || normalized === 'LI' || normalized === 'LD' || normalized === 'LTD' || normalized === 'LTI') {
    return {
      category: 'Lateral',
      capacities: ['Velocidad máxima', 'Aceleración', 'Resistencia de alta intensidad', 'Fuerza en duelos']
    };
  }
  
  // Mediocentro / Midfield
  if (normalized === 'CM' || normalized === 'DM' || normalized === 'AM' || normalized.includes('MEDIO') || normalized === 'MC' || normalized === 'MCD' || normalized === 'MCO' || normalized === 'VOL') {
    return {
      category: 'Mediocentro',
      capacities: ['Resistencia', 'Capacidad de repetición de esfuerzos', 'Fuerza funcional', 'Agilidad']
    };
  }
  
  // Extremo
  if (normalized === 'RW' || normalized === 'LW' || normalized === 'RM' || normalized === 'LM' || normalized.includes('EXTREMO') || normalized === 'ED' || normalized === 'EI' || normalized === 'EX' || normalized.includes('VOLANTE')) {
    return {
      category: 'Extremo',
      capacities: ['Aceleración', 'Velocidad máxima', 'Agilidad', 'Resistencia']
    };
  }
  
  // Delantero / Striker
  if (normalized === 'ST' || normalized === 'CF' || normalized.includes('DELANTERO') || normalized === 'DC' || normalized === 'SP' || normalized === 'DEL' || normalized.includes('PUNTA')) {
    return {
      category: 'Delantero Centro',
      capacities: ['Potencia', 'Velocidad de ruptura', 'Capacidad de salto', 'Resistencia']
    };
  }
  
  return null;
}


