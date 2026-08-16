import { ScoutedPlayer } from '../types';

export function ensureReportFields(player: ScoutedPlayer): ScoutedPlayer & {
  altura: string;
  recomendacion: string;
  recomendacionComentario: string;
  descripcionGeneral: string;
  fortalezas: string;
  debilidades: string;
  enSuEquipo: string;
  enPocasPalabras: string;
  tieneValorPor: string;
  pitchX: number;
  pitchY: number;
} {
  if (!player) {
    return {
      id: '',
      nombre: '',
      equipo: '',
      posicion: 'Mediocentro',
      anoNacimiento: 2004,
      lateralidad: 'Diestro',
      valorMercado: 0,
      calificacion: 3,
      notas: '',
      atributos: { fisico: 7, tecnica: 7, tactica: 7, mental: 7 },
      fechaRegistro: new Date().toISOString(),
      altura: '1.78 m',
      recomendacion: 'SIN VALORAR',
      recomendacionComentario: 'Pendiente de evaluación por el departamento.',
      descripcionGeneral: '',
      fortalezas: '',
      debilidades: '',
      enSuEquipo: '',
      enPocasPalabras: '',
      tieneValorPor: '',
      pitchX: 50,
      pitchY: 50
    };
  }

  const attrs = player.atributos || { fisico: 7, tecnica: 7, tactica: 7, mental: 7 };
  const fisicoVal = attrs.fisico ?? 7;
  const tecnicaVal = attrs.tecnica ?? 7;
  const tacticaVal = attrs.tactica ?? 7;
  const mentalVal = attrs.mental ?? 7;
  
  // Tactical position coordinates on a 100x100 pitch representation
  const getPitchCoords = (pos?: string) => {
    switch (pos) {
      case 'Portero': return { x: 50, y: 88 };
      case 'Defensa Central': return { x: 50, y: 72 };
      case 'Lateral Derecho': return { x: 80, y: 68 };
      case 'Lateral Izquierdo': return { x: 20, y: 68 };
      case 'Mediocentro Defensivo': return { x: 50, y: 54 };
      case 'Mediocentro': return { x: 50, y: 44 };
      case 'Mediapunta': return { x: 50, y: 30 };
      case 'Extremo Derecho': return { x: 82, y: 22 };
      case 'Extremo Izquierdo': return { x: 18, y: 22 };
      case 'Delantero Centro': return { x: 50, y: 12 };
      default: return { x: 50, y: 50 };
    }
  };

  const coords = getPitchCoords(player.posicion);
  const px = player.pitchX !== undefined && player.pitchX !== null ? player.pitchX : coords.x;
  const py = player.pitchY !== undefined && player.pitchY !== null ? player.pitchY : coords.y;

  // Fallback height:
  const fallbackAltura = player.altura || (player.posicion === 'Portero' || player.posicion === 'Defensa Central' ? "1.89 m" : "1.78 m");

  // Default general description text:
  const descDefault = player.descripcionGeneral || player.notas || 
    `${player.nombre || 'El jugador'} es un futbolista con muy buen presente en ${player.equipo || 'su equipo'}. Destaca técnicamente con un ${tecnicaVal}/10 en nuestra escala, adaptándose eficazmente al ritmo de juego asumiendo protagonismo. Perfil equilibrado con notable lectura de juego y desborde.`;

  // Default strengths:
  const getStrengths = () => {
    if (player.fortalezas) return player.fortalezas;
    const list = [
      `Técnicamente muy competente en su rol de ${player.posicion || 'jugador'}.`,
      `Gran criterio en la toma de decisiones rápidos en zona de definición.`,
      `Buenas transiciones ofensivas bajo control del esférico.`,
      `Notable inteligencia táctica, buscando siempre líneas de pase limpias.`
    ];
    if (fisicoVal >= 9) list.push("Portentoso despliegue aeróbico y potencia muscular en duelos directos.");
    if (tecnicaVal >= 9) list.push("Extraordinaria calidad en gestos técnicos complejos y controles orientados.");
    if (tacticaVal >= 9) list.push("Lectura espacial superior para la interceptación y anticipación táctica.");
    return list.join('\n');
  };

  // Default weaknesses:
  const getWeaknesses = () => {
    if (player.debilidades) return player.debilidades;
    const list = [
      "Margen de mejora en la contundencia de acciones a campo abierto.",
      "Necesidad de perfeccionar el juego de perfil menos hábil para salir de presiones asfixiantes."
    ];
    if (fisicoVal < 8) list.push("Le falta algo de envergadura o masa muscular para choques aéreos.");
    if (mentalVal < 8) list.push("Necesita mayor constancia mental durante lapsos desfavorables de partido.");
    return list.join('\n');
  };

  // Default team role:
  const getEnSuEquipo = () => {
    if (player.enSuEquipo) return player.enSuEquipo;
    return `No siempre es el titular, pero cuando entra es capaz de tomar la iniciativa, marcar el tempo y decidir con valentía.`;
  };

  // En pocas palabras (short caps bullets):
  const getEnPocasPalabras = () => {
    if (player.enPocasPalabras) return player.enPocasPalabras;
    return [
      "TALENTO INDUDABLE.",
      "JUEGO INTELIGENTE.",
      "EXPERIENCIA CONTRASTADA.",
      "OPORTUNIDAD DE MERCADO.",
      "COMPROMISO EN ENTRENAMIENTO."
    ].join('\n');
  };

  // Tiene valor por:
  const getTieneValorPor = () => {
    if (player.tieneValorPor) return player.tieneValorPor;
    return [
      "JUEGO DE PIES.",
      "JUVENTUD Y PROYECCIÓN.",
      "OPORTUNIDAD FINANCIERA.",
      "ALTÍSIMA CALIDAD TÉCNICA.",
      "INTENSIDAD COMPETITIVA."
    ].join('\n');
  };

  return {
    ...player,
    nombre: player.nombre || '',
    equipo: player.equipo || '',
    altura: fallbackAltura || '',
    recomendacion: player.recomendacion || 'SIN VALORAR',
    recomendacionComentario: player.recomendacionComentario !== undefined && player.recomendacionComentario !== null 
      ? player.recomendacionComentario 
      : (player.recomendacion && player.recomendacion !== 'SIN VALORAR' ? '' : 'Pendiente de evaluación por el departamento.'),
    descripcionGeneral: descDefault || '',
    fortalezas: getStrengths() || '',
    debilidades: getWeaknesses() || '',
    enSuEquipo: getEnSuEquipo() || '',
    enPocasPalabras: getEnPocasPalabras() || '',
    tieneValorPor: getTieneValorPor() || '',
    pitchX: px,
    pitchY: py
  };
}
