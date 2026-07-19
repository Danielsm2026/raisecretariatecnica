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
  const currentYear = 2026;
  const edad = currentYear - player.anoNacimiento;
  
  // Tactical position coordinates on a 100x100 pitch representation
  const getPitchCoords = (pos: string) => {
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
  const px = player.pitchX !== undefined ? player.pitchX : coords.x;
  const py = player.pitchY !== undefined ? player.pitchY : coords.y;

  // Default recommendations based on quality
  const getRec = (calif: number) => {
    if (calif >= 5) return { rec: "FIRMAR", sub: "Con nivel y experiencia excelsos en la categoría." };
    if (calif >= 4) return { rec: "SEGUIR", sub: "Monitorear su progresión de forma regular." };
    if (calif >= 3) return { rec: "EVALUAR", sub: "Jugador útil para complementar fondo de armario." };
    return { rec: "DESCARTAR", sub: "No cumple los requerimientos actuales del club." };
  };
  
  const recInfo = getRec(player.calificacion);

  // Fallback height:
  const fallbackAltura = player.altura || (player.posicion === 'Portero' || player.posicion === 'Defensa Central' ? "1.89 m" : "1.78 m");

  // Default general description text:
  const descDefault = player.descripcionGeneral || player.notas || 
    `${player.nombre} es un futbolista con muy buen presente en ${player.equipo}. Destaca técnicamente con un ${player.atributos.tecnica}/10 en nuestra escala, adaptándose eficazmente al ritmo de juego asumiendo protagonismo. Perfil equilibrado con notable lectura de juego y desborde.`;

  // Default strengths:
  const getStrengths = () => {
    if (player.fortalezas) return player.fortalezas;
    const list = [
      `Técnicamente muy competente en su rol de ${player.posicion}.`,
      `Gran criterio en la toma de decisiones rápidos en zona de definición.`,
      `Buenas transiciones ofensivas ofensivas bajo control del esférico.`,
      `Notable inteligencia táctica, buscando siempre líneas de pase limpias.`
    ];
    if (player.atributos.fisico >= 9) list.push("Portentoso despliegue aeróbico y potencia muscular en duelos directos.");
    if (player.atributos.tecnica >= 9) list.push("Extraordinaria calidad en gestos técnicos complejos y controles orientados.");
    if (player.atributos.tactica >= 9) list.push("Lectura espacial superior para la interceptación y anticipación táctica.");
    return list.join('\n');
  };

  // Default weaknesses:
  const getWeaknesses = () => {
    if (player.debilidades) return player.debilidades;
    const list = [
      "Margen de mejora en la contundencia de acciones a campo abierto.",
      "Necesidad de perfeccionar el juego de perfil menos hábil para salir de presiones asfixiantes."
    ];
    if (player.atributos.fisico < 8) list.push("Le falta algo de envergadura o masa muscular para choques aéreos.");
    if (player.atributos.mental < 8) list.push("Necesita mayor constancia mental durante lapsos desfavorables de partido.");
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
    altura: fallbackAltura,
    recomendacion: player.recomendacion || recInfo.rec,
    recomendacionComentario: player.recomendacionComentario || recInfo.sub,
    descripcionGeneral: descDefault,
    fortalezas: getStrengths(),
    debilidades: getWeaknesses(),
    enSuEquipo: getEnSuEquipo(),
    enPocasPalabras: getEnPocasPalabras(),
    tieneValorPor: getTieneValorPor(),
    pitchX: px,
    pitchY: py
  };
}
