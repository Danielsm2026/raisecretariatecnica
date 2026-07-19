import { MatchReport } from '../types';

export const INITIAL_MATCH_REPORTS: MatchReport[] = [
  {
    id: 'rep-playoffs-01',
    fecha: '2026-05-10',
    partido: 'Getafe B vs UD Logroñés',
    competicion: 'SEGUNDA FEDERACIÓN - PLAYOFFS ASCENSO - JORNADA 1',
    categoria: 'Sénior',
    autor: 'ScoutingRealAvilésCF',
    equipoLocal: 'Getafe B',
    equipoVisitante: 'UD Logroñés',
    escudoLocal: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=80&h=80&fit=crop&q=65',
    escudoVisitante: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=80&h=80&fit=crop&q=65',
    golesLocal: 0,
    golesVisitante: 2,
    fechaHoraDetallada: 'Domingo, 10 de Mayo de 2026 - 11:30',
    comentariosLocal: 'Bloque joven con muy buenos esfuerzos defensivos, tanto en repliegue como en PTP. Calidad para salir con balón jugado dando continuidad al juego. Intenso. Técnicamente notable.',
    comentariosVisitante: 'Equipo veterano y consolidado. Capacidad para transitar, montar contraataque y replegar rápidamente. Defensivamente muy concentrado y bien colocado para saltar, anticipar e interceptar balones clave.',
    jugadoresLocal: [
      { id: 'l1', dorsal: '13', nombre: 'Jorge Benito', anoNacimiento: 2006, posicion: 'GK', pie: 'D', pts: '7', isTitular: true, pitchX: 50, pitchY: 88, comentarios: 'Bien por alto, seguro.' },
      { id: 'l2', dorsal: '2', nombre: 'Ismael Bekhoucha', anoNacimiento: 2004, posicion: 'RB', pie: 'D', pts: '6', isTitular: true, pitchX: 82, pitchY: 66, comentarios: 'Rápido al corte.' },
      { id: 'l3', dorsal: '5', nombre: 'L. Lana', anoNacimiento: 2003, posicion: 'CB', pie: 'D', pts: '7', isTitular: true, pitchX: 62, pitchY: 76, comentarios: 'Fuerte en balones por aire.' },
      { id: 'l4', dorsal: '23', nombre: 'M. Vilaplana', anoNacimiento: 2003, posicion: 'CB', pie: 'D', pts: '7', isTitular: true, pitchX: 38, pitchY: 76, comentarios: 'Veloz en el repliegue.' },
      { id: 'l5', dorsal: '3', nombre: 'Gorka', anoNacimiento: 2004, posicion: 'LB', pie: 'Z', pts: '7', isTitular: true, pitchX: 18, pitchY: 66, comentarios: 'P3-5 defensivo. Contundente en acciones de 1x1 y despejes. En ataque le cuesta. Juego sencillo.' },
      { id: 'l6', dorsal: '8', nombre: 'H. Solozábal', anoNacimiento: 2003, posicion: 'DM', pie: 'D', pts: '6', isTitular: true, pitchX: 50, pitchY: 52, comentarios: 'Buen equilibrio táctico.' },
      { id: 'l7', dorsal: '16', nombre: 'A. Riquelme', anoNacimiento: 2006, posicion: 'CM', pie: 'D', pts: '8', isTitular: true, pitchX: 70, pitchY: 42, comentarios: 'Calidad notable en salida.' },
      { id: 'l8', dorsal: '15', nombre: 'A. Medina', anoNacimiento: 2004, posicion: 'CM', pie: 'D', pts: '6', isTitular: true, pitchX: 30, pitchY: 42, comentarios: 'Mucho recorrido.' },
      { id: 'l9', dorsal: '22', nombre: 'Keita', anoNacimiento: 2003, posicion: 'RW', pie: 'D', pts: '6', isTitular: true, pitchX: 85, pitchY: 22, comentarios: 'Veloz intentando el 1x1.' },
      { id: 'l10', dorsal: '17', nombre: 'Jorge Monjas', anoNacimiento: 2004, posicion: 'LW', pie: 'Z', pts: '7', isTitular: true, pitchX: 15, pitchY: 22, comentarios: 'Desborde interesante.' },
      { id: 'l11', dorsal: '9', nombre: 'J. Solís', anoNacimiento: 2002, posicion: 'ST', pie: 'D', pts: '6', isTitular: true, pitchX: 50, pitchY: 12, comentarios: 'Caza-goles batallador.' },
      // Suplentes local
      { id: 'l12', dorsal: '1', nombre: 'Alberto', anoNacimiento: 2005, posicion: 'GK', pie: 'D', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 },
      { id: 'l13', dorsal: '11', nombre: 'J. Guerrero', anoNacimiento: 2004, posicion: 'ST', pie: 'D', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 },
      { id: 'l14', dorsal: '14', nombre: 'M. Conesa', anoNacimiento: 2005, posicion: 'LW', pie: 'Z', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 },
      { id: 'l15', dorsal: '10', nombre: 'Yerom', anoNacimiento: 2004, posicion: 'CM', pie: 'D', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 },
      { id: 'l16', dorsal: '4', nombre: 'Carlos León', anoNacimiento: 2005, posicion: 'RW', pie: 'D', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 }
    ],
    jugadoresVisitante: [
      { id: 'v1', dorsal: '13', nombre: 'Taliby', anoNacimiento: 1997, posicion: 'GK', pie: 'D', pts: '8', isTitular: true, pitchX: 50, pitchY: 88, comentarios: 'Seguridad absoluta.' },
      { id: 'v2', dorsal: '2', nombre: 'J. Val', anoNacimiento: 1999, posicion: 'RB', pie: 'D', pts: '7', isTitular: true, pitchX: 82, pitchY: 66, comentarios: 'Gran profundidad.' },
      { id: 'v3', dorsal: '4', nombre: 'Edu Cabetas', anoNacimiento: 1995, posicion: 'CB', pie: 'Z', pts: '8', isTitular: true, pitchX: 62, pitchY: 76, comentarios: 'Líder en vestuario y campo.' },
      { id: 'v4', dorsal: '5', nombre: 'A. Muguruza', anoNacimiento: 2001, posicion: 'CB', pie: 'D', pts: '7', isTitular: true, pitchX: 38, pitchY: 76, comentarios: 'Muy expeditivo.' },
      { id: 'v5', dorsal: '3', nombre: 'S. Camacho', anoNacimiento: 2002, posicion: 'LB', pie: 'Z', pts: '9', isTitular: true, pitchX: 18, pitchY: 66, comentarios: 'P3, zurdo. Talla baja. Capacidad para transitar, montar contraataques y replegar. Técnicamente notable. Defensivamente concentrado. Defiende bien 1x1. Se incorpora de manera inteligente.' },
      { id: 'v6', dorsal: '10', nombre: 'Carlos Doncel', anoNacimiento: 1996, posicion: 'DM', pie: 'Z', pts: '7', isTitular: true, pitchX: 50, pitchY: 52, comentarios: 'Gran desgaste físico.' },
      { id: 'v7', dorsal: '16', nombre: 'Miquel Marí', anoNacimiento: 1997, posicion: 'CM', pie: 'D', pts: '7', isTitular: true, pitchX: 70, pitchY: 42, comentarios: 'Distribución precisa.' },
      { id: 'v8', dorsal: '23', nombre: 'Quique Rivero', anoNacimiento: 1992, posicion: 'CM', pie: 'D', pts: '7', isTitular: true, pitchX: 30, pitchY: 42, comentarios: 'Experto en balón parado.' },
      { id: 'v9', dorsal: '22', nombre: 'Ismael Santana', anoNacimiento: 2000, posicion: 'RW', pie: 'D', pts: '8', isTitular: true, pitchX: 85, pitchY: 22, comentarios: 'Asistente del primer gol.' },
      { id: 'v10', dorsal: '17', nombre: 'J. Morales', anoNacimiento: 1999, posicion: 'LW', pie: 'Z', pts: '7', isTitular: true, pitchX: 15, pitchY: 22, comentarios: 'Generador continuo.' },
      { id: 'v11', dorsal: '9', nombre: 'Darío Goti', anoNacimiento: 1998, posicion: 'ST', pie: 'D', pts: '8', isTitular: true, pitchX: 50, pitchY: 12, comentarios: 'Anotador de doblete decisivo.' },
      // Suplentes visitante
      { id: 'v12', dorsal: '1', nombre: 'Royo', anoNacimiento: 1991, posicion: 'GK', pie: 'D', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 },
      { id: 'v13', dorsal: '11', nombre: 'Ariel Arias', anoNacimiento: 1998, posicion: 'ST', pie: 'D', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 },
      { id: 'v14', dorsal: '14', nombre: 'Miki', anoNacimiento: 1995, posicion: 'LW', pie: 'Z', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 },
      { id: 'v15', dorsal: '15', nombre: 'G. Lizarralde', anoNacimiento: 1999, posicion: 'CM', pie: 'D', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 },
      { id: 'v16', dorsal: '8', nombre: 'Aitor Pascal', anoNacimiento: 1994, posicion: 'RB', pie: 'D', pts: '-', isTitular: false, pitchX: 0, pitchY: 0 }
    ]
  }
];
