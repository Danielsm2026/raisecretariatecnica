import React, { useState, useEffect } from "react";
import { MatchReport, MatchPlayer, ScoutedPlayer, getPhysicalCapacitiesByPosition } from "../types";
import {
  X,
  Save,
  Plus,
  Trash2,
  Printer,
  Edit2,
  Shield,
  User,
  Check,
  RefreshCw,
  Maximize2,
  Minimize2,
  Star,
  Activity,
} from "lucide-react";
import { ConfirmationModal } from "./ConfirmationModal";
import { getPlayerEscudoUrl } from "../utils/escudoHelper";

interface MatchReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MatchReport | null;
  onSave: (report: MatchReport) => void;
  players?: ScoutedPlayer[];
}

export default function MatchReportModal({
  isOpen,
  onClose,
  report,
  onSave,
  players = [],
}: MatchReportModalProps) {
  // Core report states
  const [competicion, setCompeticion] = useState("");
  const [fecha, setFecha] = useState("");
  const [partido, setPartido] = useState("");
  const [fechaHoraDetallada, setFechaHoraDetallada] = useState("");
  const [autor, setAutor] = useState("");
  const [equipoLocal, setEquipoLocal] = useState("");
  const [equipoVisitante, setEquipoVisitante] = useState("");
  const [golesLocal, setGolesLocal] = useState(0);
  const [golesVisitante, setGolesVisitante] = useState(0);
  const [escudoLocal, setEscudoLocal] = useState("");
  const [escudoVisitante, setEscudoVisitante] = useState("");
  const [comentariosLocal, setComentariosLocal] = useState("");
  const [comentariosVisitante, setComentariosVisitante] = useState("");

  const [jugadoresLocal, setJugadoresLocal] = useState<MatchPlayer[]>([]);
  const [jugadoresVisitante, setJugadoresVisitante] = useState<MatchPlayer[]>(
    [],
  );

  // Editing state for a single match player
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerTeam, setEditingPlayerTeam] = useState<
    "local" | "visitante" | null
  >(null);
  const [editDorsal, setEditDorsal] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [editPosicion, setEditPosicion] = useState("");
  const [editAno, setEditAno] = useState<number | string>(2000);
  const [editPie, setEditPie] = useState<"D" | "Z" | "A">("D");
  const [editPts, setEditPts] = useState("");
  const [editIsTitular, setEditIsTitular] = useState(true);
  const [editPitchX, setEditPitchX] = useState(50);
  const [editPitchY, setEditPitchY] = useState(50);
  const [editComentarios, setEditComentarios] = useState("");
  const [editFotoUrl, setEditFotoUrl] = useState("");
  const [editValoracionFisica, setEditValoracionFisica] = useState<Record<string, number>>({});

  // Scouting player catalog lookup
  const [catalogFilterTeam, setCatalogFilterTeam] = useState("");
  const [catalogFilterPosition, setCatalogFilterPosition] = useState("");
  const [catalogSelectedPlayerId, setCatalogSelectedPlayerId] = useState("");

  // active tab on mobile/preview screens for side-by-side pitch layouts
  const [visualTab, setVisualTab] = useState<"ambos" | "local" | "visitante">(
    "ambos",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Custom confirmation modal state for deleting player from report
  const [playerToDeleteInfo, setPlayerToDeleteInfo] = useState<{
    id: string;
    team: "local" | "visitante";
    nombre: string;
  } | null>(null);

  useEffect(() => {
    if (report) {
      setCompeticion(report.competicion || "");
      setFecha(report.fecha || "");
      setPartido(report.partido || "");
      setFechaHoraDetallada(report.fechaHoraDetallada || "");
      setAutor(report.autor || "ScoutingRealAvilésCF");
      setEquipoLocal(report.equipoLocal || "");
      setEquipoVisitante(report.equipoVisitante || "");
      setGolesLocal(report.golesLocal !== undefined ? report.golesLocal : 0);
      setGolesVisitante(
        report.golesVisitante !== undefined ? report.golesVisitante : 0,
      );
      setEscudoLocal(report.escudoLocal || "");
      setEscudoVisitante(report.escudoVisitante || "");
      setComentariosLocal(report.comentariosLocal || "");
      setComentariosVisitante(report.comentariosVisitante || "");
      setJugadoresLocal(report.jugadoresLocal || []);
      setJugadoresVisitante(report.jugadoresVisitante || []);
      setEditingPlayerId(null);
      setEditingPlayerTeam(null);
      setIsFullscreen(false);
    } else {
      // Setup a blank new report template
      setCompeticion("");
      setFecha(new Date().toISOString().split("T")[0]);
      setPartido("Equipo Local vs Equipo Visitante");
      setFechaHoraDetallada("Domingo, 10 de Mayo de 2026 - 11:30");
      setAutor("ScoutingRealAvilésCF");
      setEquipoLocal("Getafe B");
      setEquipoVisitante("UD Logroñés");
      setGolesLocal(0);
      setGolesVisitante(0);
      setEscudoLocal("");
      setEscudoVisitante("");
      setComentariosLocal("");
      setComentariosOrganizadoOption();
      setComentariosVisitante("");
      setJugadoresLocal([]);
      setJugadoresVisitante([]);
      setEditingPlayerId(null);
      setEditingPlayerTeam(null);
      setIsFullscreen(false);
    }
  }, [report, isOpen]);

  // Dynamic Drag & Drop / Team selector states
  const [draggingSourceTeamLocal, setDraggingSourceTeamLocal] = useState("");
  const [draggingSourceTeamVisitante, setDraggingSourceTeamVisitante] =
    useState("");
  const [isDragOverLocal, setIsDragOverLocal] = useState(false);
  const [isDragOverVisitante, setIsDragOverVisitante] = useState(false);

  // Position sorting priority mapping (GK -> DEF -> MID -> ATK)
  const positionOrderScore: Record<string, number> = {
    Portero: 1,
    "Defensa Central": 2,
    "Lateral Derecho": 3,
    "Lateral Izquierdo": 4,
    "Mediocentro Defensivo": 5,
    Mediocentro: 6,
    Mediapunta: 7,
    "Extremo Derecho": 8,
    "Extremo Izquierdo": 9,
    "Delantero Centro": 10,
  };

  const getPositionPriorityValue = (pos: string) => {
    return positionOrderScore[pos] || 99;
  };

  // Derive unique team names from the scouting register (players)
  const allScoutingTeams = Array.from(
    new Set(players.map((p) => p.equipo).filter(Boolean)),
  ).sort();

  // Auto-set the dragging source team filter to match the report's local/visitante teams initially if they exist!
  useEffect(() => {
    if (equipoLocal) {
      const match = allScoutingTeams.find(
        (t) => t.toLowerCase() === equipoLocal.toLowerCase(),
      );
      if (match) {
        setDraggingSourceTeamLocal(match);
      }
    }
  }, [equipoLocal, players]);

  useEffect(() => {
    if (equipoVisitante) {
      const match = allScoutingTeams.find(
        (t) => t.toLowerCase() === equipoVisitante.toLowerCase(),
      );
      if (match) {
        setDraggingSourceTeamVisitante(match);
      }
    }
  }, [equipoVisitante, players]);

  // Synchronize team shield (escudo) URLs from footballer portfolio automatically
  useEffect(() => {
    if (equipoLocal && players && players.length > 0) {
      const targetTeam = equipoLocal.trim().toLowerCase();
      // First try to find a player from this team who has a custom escudoUrl set
      const playerWithCustomEscudo = players.find(
        (p) => p.equipo && p.equipo.trim().toLowerCase() === targetTeam && p.escudoUrl && p.escudoUrl.trim()
      );
      if (playerWithCustomEscudo && playerWithCustomEscudo.escudoUrl) {
        setEscudoLocal(playerWithCustomEscudo.escudoUrl.trim());
      } else {
        // Fallback to getPlayerEscudoUrl for any player of this team
        const anyPlayerFromTeam = players.find(
          (p) => p.equipo && p.equipo.trim().toLowerCase() === targetTeam
        );
        if (anyPlayerFromTeam) {
          const defaultEscudo = getPlayerEscudoUrl(anyPlayerFromTeam);
          if (defaultEscudo) {
            setEscudoLocal(defaultEscudo);
          }
        }
      }
    }
  }, [equipoLocal, players]);

  useEffect(() => {
    if (equipoVisitante && players && players.length > 0) {
      const targetTeam = equipoVisitante.trim().toLowerCase();
      // First try to find a player from this team who has a custom escudoUrl set
      const playerWithCustomEscudo = players.find(
        (p) => p.equipo && p.equipo.trim().toLowerCase() === targetTeam && p.escudoUrl && p.escudoUrl.trim()
      );
      if (playerWithCustomEscudo && playerWithCustomEscudo.escudoUrl) {
        setEscudoVisitante(playerWithCustomEscudo.escudoUrl.trim());
      } else {
        // Fallback to getPlayerEscudoUrl for any player of this team
        const anyPlayerFromTeam = players.find(
          (p) => p.equipo && p.equipo.trim().toLowerCase() === targetTeam
        );
        if (anyPlayerFromTeam) {
          const defaultEscudo = getPlayerEscudoUrl(anyPlayerFromTeam);
          if (defaultEscudo) {
            setEscudoVisitante(defaultEscudo);
          }
        }
      }
    }
  }, [equipoVisitante, players]);

  // Drop handler on the pitch diagram (both local and visitante)
  const handleDropOnPitch = (
    e: React.DragEvent<HTMLDivElement>,
    team: "local" | "visitante",
  ) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp values between 5% and 95%
    const pitchX = Math.round(Math.min(Math.max(x, 5), 95));
    const pitchY = Math.round(Math.min(Math.max(y, 5), 95));

    try {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.source === "catalog") {
        const p: ScoutedPlayer = data.player;

        // Translate descriptive positions to code position labels
        const shortPos = (() => {
          const raw = (p.posicion || "").toUpperCase();
          if (
            raw.includes("PORT") ||
            raw.includes("GK") ||
            raw.includes("ARQ") ||
            raw.includes("PT")
          )
            return "POR";
          if (raw.includes("CENT") || raw.includes("CB") || raw.includes("CT"))
            return "CT";
          if (
            raw.includes("LATERAL D") ||
            raw.includes("RB") ||
            raw.includes("LD")
          )
            return "LD";
          if (
            raw.includes("LATERAL I") ||
            raw.includes("LB") ||
            raw.includes("LI")
          )
            return "LI";
          if (
            raw.includes("DEFEN") ||
            raw.includes("MCD") ||
            raw.includes("DM") ||
            raw.includes("PIV")
          )
            return "MCD";
          if (
            raw.includes("INTERIOR D") ||
            raw.includes("RM") ||
            raw.includes("MD")
          )
            return "MD";
          if (
            raw.includes("INTERIOR I") ||
            raw.includes("LM") ||
            raw.includes("MI")
          )
            return "MI";
          if (
            raw.includes("PUNTA") ||
            raw.includes("AM") ||
            raw.includes("MCO")
          )
            return "MCO";
          if (
            raw.includes("EXTREMO D") ||
            raw.includes("RW") ||
            raw.includes("ED")
          )
            return "ED";
          if (
            raw.includes("EXTREMO I") ||
            raw.includes("LW") ||
            raw.includes("EI")
          )
            return "EI";
          if (
            raw.includes("CENTRO") ||
            raw.includes("ST") ||
            raw.includes("DC") ||
            raw.includes("DELAN")
          )
            return "DC";
          return "MC";
        })();

        // Find standard free dorsal
        const targetList =
          team === "local" ? jugadoresLocal : jugadoresVisitante;
        const takenDorsales = new Set(targetList.map((item) => item.dorsal));
        const getFreeDorsal = () => {
          for (let num = 1; num <= 99; num++) {
            if (!takenDorsales.has(String(num))) return String(num);
          }
          return "10";
        };

        const newMatchPlayer: MatchPlayer = {
          id: `p-scout-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          dorsal: getFreeDorsal(),
          nombre: p.nombre,
          anoNacimiento: p.anoNacimiento || 2004,
          posicion: shortPos,
          pie:
            p.lateralidad === "Zurdo"
              ? "Z"
              : p.lateralidad === "Diestro"
                ? "D"
                : "A",
          pts: "7",
          isTitular: true,
          pitchX,
          pitchY,
          comentarios:
            p.enPocasPalabras || (p.notas ? p.notas.substring(0, 100) : ""),
        };

        if (team === "local") {
          setJugadoresLocal((prev) => [...prev, newMatchPlayer]);
        } else {
          setJugadoresVisitante((prev) => [...prev, newMatchPlayer]);
        }
      } else if (data.source === "pitch") {
        const playerId = data.id;
        const sourceTeam = data.team;

        if (sourceTeam === team) {
          // Repositioning player on same pitch
          if (team === "local") {
            setJugadoresLocal((prev) =>
              prev.map((item) =>
                item.id === playerId ? { ...item, pitchX, pitchY } : item,
              ),
            );
          } else {
            setJugadoresVisitante((prev) =>
              prev.map((item) =>
                item.id === playerId ? { ...item, pitchX, pitchY } : item,
              ),
            );
          }
        } else {
          // Moving players between local <-> visitante pitches
          let playerToMove: MatchPlayer | undefined;
          if (sourceTeam === "local") {
            playerToMove = jugadoresLocal.find((item) => item.id === playerId);
            if (playerToMove) {
              setJugadoresLocal((prev) =>
                prev.filter((item) => item.id !== playerId),
              );
              setJugadoresVisitante((prev) => [
                ...prev,
                { ...playerToMove!, pitchX, pitchY },
              ]);
            }
          } else {
            playerToMove = jugadoresVisitante.find(
              (item) => item.id === playerId,
            );
            if (playerToMove) {
              setJugadoresVisitante((prev) =>
                prev.filter((item) => item.id !== playerId),
              );
              setJugadoresLocal((prev) => [
                ...prev,
                { ...playerToMove!, pitchX, pitchY },
              ]);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const setComentariosOrganizadoOption = () => {
    // Fill brief placeholder
  };

  if (!isOpen) return null;

  // Add dummy starters to populate pitches if empty
  const handleLoadTemplatePlayers = () => {
    const defaultLocal: MatchPlayer[] = [
      {
        id: "l-t1",
        dorsal: "13",
        nombre: "Jorge Benito",
        anoNacimiento: 2006,
        posicion: "GK",
        pie: "D",
        pts: "7",
        isTitular: true,
        pitchX: 50,
        pitchY: 88,
        comentarios: "Seguro por alto.",
      },
      {
        id: "l-t2",
        dorsal: "2",
        nombre: "Ismael Bekhoucha",
        anoNacimiento: 2004,
        posicion: "RB",
        pie: "D",
        pts: "6",
        isTitular: true,
        pitchX: 80,
        pitchY: 70,
      },
      {
        id: "l-t3",
        dorsal: "5",
        nombre: "L. Lana",
        anoNacimiento: 2003,
        posicion: "CB",
        pie: "D",
        pts: "7",
        isTitular: true,
        pitchX: 62,
        pitchY: 76,
      },
      {
        id: "l-t4",
        dorsal: "23",
        nombre: "M. Vilaplana",
        anoNacimiento: 2003,
        posicion: "CB",
        pie: "D",
        pts: "7",
        isTitular: true,
        pitchX: 38,
        pitchY: 76,
      },
      {
        id: "l-t5",
        dorsal: "3",
        nombre: "Gorka",
        anoNacimiento: 2004,
        posicion: "LB",
        pie: "Z",
        pts: "7",
        isTitular: true,
        pitchX: 20,
        pitchY: 70,
        comentarios: "P3-5 defensivo.",
      },
      {
        id: "l-t6",
        dorsal: "8",
        nombre: "H. Solozábal",
        anoNacimiento: 2003,
        posicion: "DM",
        pie: "D",
        pts: "6",
        isTitular: true,
        pitchX: 50,
        pitchY: 55,
      },
      {
        id: "l-t7",
        dorsal: "16",
        nombre: "A. Riquelme",
        anoNacimiento: 2006,
        posicion: "CM",
        pie: "D",
        pts: "8",
        isTitular: true,
        pitchX: 70,
        pitchY: 42,
      },
      {
        id: "l-t8",
        dorsal: "15",
        nombre: "A. Medina",
        anoNacimiento: 2004,
        posicion: "CM",
        pie: "D",
        pts: "6",
        isTitular: true,
        pitchX: 30,
        pitchY: 42,
      },
      {
        id: "l-t9",
        dorsal: "22",
        nombre: "Keita",
        anoNacimiento: 2003,
        posicion: "RW",
        pie: "D",
        pts: "6",
        isTitular: true,
        pitchX: 82,
        pitchY: 22,
      },
      {
        id: "l-t10",
        dorsal: "17",
        nombre: "Jorge Monjas",
        anoNacimiento: 2004,
        posicion: "LW",
        pie: "Z",
        pts: "7",
        isTitular: true,
        pitchX: 18,
        pitchY: 22,
      },
      {
        id: "l-t11",
        dorsal: "9",
        nombre: "J. Solís",
        anoNacimiento: 2002,
        posicion: "ST",
        pie: "D",
        pts: "6",
        isTitular: true,
        pitchX: 50,
        pitchY: 12,
      },
      // Suplentes
      {
        id: "l-s1",
        dorsal: "1",
        nombre: "Alberto",
        anoNacimiento: 2005,
        posicion: "GK",
        pie: "D",
        pts: "-",
        isTitular: false,
        pitchX: 0,
        pitchY: 0,
      },
      {
        id: "l-s2",
        dorsal: "11",
        nombre: "J. Guerrero",
        anoNacimiento: 2004,
        posicion: "ST",
        pie: "D",
        pts: "-",
        isTitular: false,
        pitchX: 0,
        pitchY: 0,
      },
    ];

    const defaultVisitante: MatchPlayer[] = [
      {
        id: "v-t1",
        dorsal: "13",
        nombre: "Taliby",
        anoNacimiento: 1997,
        posicion: "GK",
        pie: "D",
        pts: "8",
        isTitular: true,
        pitchX: 50,
        pitchY: 88,
        comentarios: "Garantía.",
      },
      {
        id: "v-t2",
        dorsal: "2",
        nombre: "J. Val",
        anoNacimiento: 1999,
        posicion: "RB",
        pie: "D",
        pts: "7",
        isTitular: true,
        pitchX: 80,
        pitchY: 70,
      },
      {
        id: "v-t3",
        dorsal: "4",
        nombre: "Edu Cabetas",
        anoNacimiento: 1995,
        posicion: "CB",
        pie: "Z",
        pts: "8",
        isTitular: true,
        pitchX: 62,
        pitchY: 76,
      },
      {
        id: "v-t4",
        dorsal: "5",
        nombre: "A. Muguruza",
        anoNacimiento: 2001,
        posicion: "CB",
        pie: "D",
        pts: "7",
        isTitular: true,
        pitchX: 38,
        pitchY: 76,
      },
      {
        id: "v-t5",
        dorsal: "3",
        nombre: "S. Camacho",
        anoNacimiento: 2002,
        posicion: "LB",
        pie: "Z",
        pts: "9",
        isTitular: true,
        pitchX: 20,
        pitchY: 70,
        comentarios: "P3, zurdo. Talla baja. Muy completo.",
      },
      {
        id: "v-t6",
        dorsal: "10",
        nombre: "Carlos Doncel",
        anoNacimiento: 1996,
        posicion: "DM",
        pie: "Z",
        pts: "7",
        isTitular: true,
        pitchX: 50,
        pitchY: 55,
      },
      {
        id: "v-t7",
        dorsal: "16",
        nombre: "Miquel Marí",
        anoNacimiento: 1997,
        posicion: "CM",
        pie: "D",
        pts: "7",
        isTitular: true,
        pitchX: 70,
        pitchY: 42,
      },
      {
        id: "v-t8",
        dorsal: "23",
        nombre: "Quique Rivero",
        anoNacimiento: 1992,
        posicion: "CM",
        pie: "D",
        pts: "7",
        isTitular: true,
        pitchX: 30,
        pitchY: 42,
      },
      {
        id: "v-t9",
        dorsal: "22",
        nombre: "Ismael Santana",
        anoNacimiento: 2000,
        posicion: "RW",
        pie: "D",
        pts: "8",
        isTitular: true,
        pitchX: 82,
        pitchY: 22,
      },
      {
        id: "v-t10",
        dorsal: "17",
        nombre: "J. Morales",
        anoNacimiento: 1999,
        posicion: "LW",
        pie: "Z",
        pts: "7",
        isTitular: true,
        pitchX: 18,
        pitchY: 22,
      },
      {
        id: "v-t11",
        dorsal: "9",
        nombre: "Darío Goti",
        anoNacimiento: 1998,
        posicion: "ST",
        pie: "D",
        pts: "8",
        isTitular: true,
        pitchX: 50,
        pitchY: 12,
      },
      // Suplentes
      {
        id: "v-s1",
        dorsal: "1",
        nombre: "Royo",
        anoNacimiento: 1991,
        posicion: "GK",
        pie: "D",
        pts: "-",
        isTitular: false,
        pitchX: 0,
        pitchY: 0,
      },
      {
        id: "v-s2",
        dorsal: "11",
        nombre: "Ariel Arias",
        anoNacimiento: 1998,
        posicion: "ST",
        pie: "D",
        pts: "-",
        isTitular: false,
        pitchX: 0,
        pitchY: 0,
      },
    ];

    setJugadoresLocal(defaultLocal);
    setJugadoresVisitante(defaultVisitante);
    setComentariosLocal(
      "Bloque joven con muy buenos esfuerzos defensivos, tanto en repliegue como en PTP. Calidad para salir con balón jugado dando continuidad al juego. Intenso. Técnicamente notable.",
    );
    setComentariosVisitante(
      "Equipo veterano y consolidado. Capacidad para transitar, montar contraataque y replegar rápidamente. Defensivamente muy concentrado y bien colocado para saltar y robar.",
    );
  };

  const handleSaveReport = () => {
    const updatedReport: MatchReport = {
      id: report?.id || `rep-${Date.now()}`,
      fecha,
      partido: `${equipoLocal} vs ${equipoVisitante}`.trim(),
      competicion: competicion.trim() || "Amistoso",
      autor: autor.trim() || "ScoutingRealAvilésCF",
      equipoLocal: equipoLocal.trim() || "Local",
      equipoVisitante: equipoVisitante.trim() || "Visitante",
      golesLocal,
      golesVisitante,
      escudoLocal: escudoLocal.trim() || undefined,
      escudoVisitante: escudoVisitante.trim() || undefined,
      fechaHoraDetallada: fechaHoraDetallada.trim(),
      comentariosLocal: comentariosLocal.trim(),
      comentariosVisitante: comentariosVisitante.trim(),
      jugadoresLocal,
      jugadoresVisitante,
    };
    onSave(updatedReport);
    onClose();
  };

  const startEditPlayer = (p: MatchPlayer, team: "local" | "visitante") => {
    setEditingPlayerId(p.id);
    setEditingPlayerTeam(team);
    setEditDorsal(p.dorsal);
    setEditNombre(p.nombre);
    setEditPosicion(p.posicion);
    setEditAno(p.anoNacimiento);
    setEditPie(p.pie);
    setEditPts(p.pts);
    setEditIsTitular(p.isTitular);
    setEditPitchX(p.pitchX !== undefined ? p.pitchX : 50);
    setEditPitchY(p.pitchY !== undefined ? p.pitchY : 50);
    setEditComentarios(p.comentarios || "");
    setEditFotoUrl(p.fotoUrl || "");
    setEditValoracionFisica(p.valoracionFisica || {});

    // Auto-setup catalog team filter matching the player's team in the match report
    const teamName =
      team === "local" ? equipoLocal || "" : equipoVisitante || "";
    setCatalogFilterTeam(teamName);
    setCatalogFilterPosition("");
    setCatalogSelectedPlayerId("");
  };

  const cancelEditPlayer = () => {
    setEditingPlayerId(null);
    setEditingPlayerTeam(null);
  };

  const savePlayerEdit = () => {
    const freshPlayer: MatchPlayer = {
      id: editingPlayerId!,
      dorsal: editDorsal || "-",
      nombre: editNombre || "Jugador",
      anoNacimiento: Number(editAno) || editAno,
      posicion: editPosicion || "ST",
      pie: editPie,
      pts: editPts || "-",
      isTitular: editIsTitular,
      pitchX: editPitchX,
      pitchY: editPitchY,
      comentarios: editComentarios,
      fotoUrl: editFotoUrl.trim() || undefined,
      valoracionFisica: editValoracionFisica,
    };

    if (editingPlayerTeam === "local") {
      setJugadoresLocal((prev) =>
        prev.map((p) => (p.id === editingPlayerId ? freshPlayer : p)),
      );
    } else {
      setJugadoresVisitante((prev) =>
        prev.map((p) => (p.id === editingPlayerId ? freshPlayer : p)),
      );
    }

    setEditingPlayerId(null);
    setEditingPlayerTeam(null);
  };

  const addNewPlayer = (team: "local" | "visitante") => {
    const newP: MatchPlayer = {
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dorsal: "10",
      nombre: "Nuevo Jugador",
      anoNacimiento: 2004,
      posicion: "CM",
      pie: "D",
      pts: "7",
      isTitular: true,
      pitchX: 50,
      pitchY: 50,
      comentarios: "",
      fotoUrl: "",
    };

    if (team === "local") {
      setJugadoresLocal((prev) => [...prev, newP]);
      startEditPlayer(newP, "local");
    } else {
      setJugadoresVisitante((prev) => [...prev, newP]);
      startEditPlayer(newP, "visitante");
    }
  };

  const deletePlayer = (id: string, team: "local" | "visitante") => {
    const playerNombre =
      (team === "local" ? jugadoresLocal : jugadoresVisitante).find(
        (p) => p.id === id,
      )?.nombre || "este jugador";
    setPlayerToDeleteInfo({ id, team, nombre: playerNombre });
  };

  const confirmDeletePlayer = () => {
    if (!playerToDeleteInfo) return;
    const { id, team } = playerToDeleteInfo;
    if (team === "local") {
      setJugadoresLocal((prev) => prev.filter((p) => p.id !== id));
    } else {
      setJugadoresVisitante((prev) => prev.filter((p) => p.id !== id));
    }
    if (editingPlayerId === id) {
      setEditingPlayerId(null);
      setEditingPlayerTeam(null);
    }
    setPlayerToDeleteInfo(null);
  };

  const applyFormation = (team: "local" | "visitante", formation: string) => {
    let layout: { x: number; y: number; posName: string }[] = [];
    if (formation === "4-4-2") {
      layout = [
        { x: 50, y: 88, posName: "POR" }, // GK (Portero)
        { x: 80, y: 72, posName: "LD" }, // RB (Lateral Derecho)
        { x: 62, y: 76, posName: "CT" }, // RCB (Central Derecho)
        { x: 38, y: 76, posName: "CT" }, // LCB (Central Izquierdo)
        { x: 20, y: 72, posName: "LI" }, // LB (Lateral Izquierdo)
        { x: 80, y: 48, posName: "MD" }, // RM (Interior Derecho)
        { x: 60, y: 52, posName: "MC" }, // RCM (Medio Centro)
        { x: 40, y: 52, posName: "MC" }, // LCM (Medio Centro)
        { x: 20, y: 48, posName: "MI" }, // LM (Interior Izquierdo)
        { x: 60, y: 20, posName: "DC" }, // RST (Delantero Derecho)
        { x: 40, y: 20, posName: "DC" }, // LST (Delantero Izquierdo)
      ];
    } else if (formation === "4-3-3") {
      layout = [
        { x: 50, y: 88, posName: "POR" }, // GK (Portero)
        { x: 80, y: 70, posName: "LD" }, // RB (Lateral Derecho)
        { x: 62, y: 76, posName: "CT" }, // RCB (Central Derecho)
        { x: 38, y: 76, posName: "CT" }, // LCB (Central Izquierdo)
        { x: 20, y: 70, posName: "LI" }, // LB (Lateral Izquierdo)
        { x: 50, y: 55, posName: "MCD" }, // DM (Pivote)
        { x: 68, y: 42, posName: "MC" }, // RCM (Interior Derecho)
        { x: 32, y: 42, posName: "MC" }, // LCM (Interior Izquierdo)
        { x: 82, y: 22, posName: "ED" }, // RW (Extremo Derecho)
        { x: 18, y: 22, posName: "EI" }, // LW (Extremo Izquierdo)
        { x: 50, y: 12, posName: "DC" }, // ST (Delantero)
      ];
    } else if (formation === "3-5-2") {
      layout = [
        { x: 50, y: 88, posName: "POR" }, // GK (Portero)
        { x: 65, y: 75, posName: "CT" }, // RCB (Central Derecho)
        { x: 50, y: 77, posName: "CT" }, // CB (Central)
        { x: 35, y: 75, posName: "CT" }, // LCB (Central Izquierdo)
        { x: 82, y: 52, posName: "MD" }, // RM (Carrilero/Interior Der)
        { x: 62, y: 48, posName: "MC" }, // RCM (Medio Derecho)
        { x: 50, y: 58, posName: "MCD" }, // DM (Pivote)
        { x: 38, y: 48, posName: "MC" }, // LCM (Medio Izquierdo)
        { x: 18, y: 52, posName: "MI" }, // LM (Carrilero/Interior Izq)
        { x: 60, y: 18, posName: "DC" }, // RST (Delantero)
        { x: 40, y: 18, posName: "DC" }, // LST (Delantero)
      ];
    } else if (formation === "4-2-3-1") {
      layout = [
        { x: 50, y: 88, posName: "POR" }, // GK (Portero)
        { x: 80, y: 70, posName: "LD" }, // RB (Lateral Derecho)
        { x: 62, y: 76, posName: "CT" }, // RCB (Central Derecho)
        { x: 38, y: 76, posName: "CT" }, // LCB (Central Izquierdo)
        { x: 20, y: 70, posName: "LI" }, // LB (Lateral Izquierdo)
        { x: 65, y: 55, posName: "MCD" }, // RDM (Pivote)
        { x: 35, y: 55, posName: "MCD" }, // LDM (Pivote)
        { x: 78, y: 34, posName: "ED" }, // RW / RAM (Extremo Derecho)
        { x: 50, y: 34, posName: "MCO" }, // AM (Mediapunta)
        { x: 22, y: 34, posName: "EI" }, // LW / LAM (Extremo Izquierdo)
        { x: 50, y: 14, posName: "DC" }, // ST (Delantero Centro)
      ];
    }

    if (layout.length === 0) return;

    let list = team === "local" ? [...jugadoresLocal] : [...jugadoresVisitante];
    let starters = list.filter((p) => p.isTitular);
    const subs = list.filter((p) => !p.isTitular);

    // Auto-populate starters list up to 11 if we have fewer starting players
    if (starters.length < 11) {
      const neededCount = 11 - starters.length;
      const takenDorsales = new Set(starters.map((p) => p.dorsal));
      const getFreeDorsal = () => {
        for (let num = 1; num <= 99; num++) {
          if (!takenDorsales.has(String(num))) {
            takenDorsales.add(String(num));
            return String(num);
          }
        }
        return String(Math.floor(Math.random() * 90) + 10);
      };

      for (let i = 0; i < neededCount; i++) {
        const isGK =
          starters.length === 0 ||
          !starters.some((p) => {
            const pos = p.posicion.toUpperCase();
            return (
              pos.includes("GK") ||
              pos.includes("POR") ||
              pos.includes("PT") ||
              pos.includes("ARQ")
            );
          });
        const dorsal = isGK ? "1" : getFreeDorsal();
        const placeholderName = isGK
          ? "Portero Selecc."
          : `Jugador ${starters.length + 1}`;
        const newStarter: MatchPlayer = {
          id: `p-auto-${team}-${Date.now()}-${i}`,
          dorsal,
          nombre: placeholderName,
          anoNacimiento: 2004,
          posicion: isGK ? "POR" : "MC",
          pie: "D",
          pts: "6",
          isTitular: true,
          pitchX: 50,
          pitchY: 50,
        };
        starters.push(newStarter);
      }
    }

    const getPlayerLineupWeight = (p: MatchPlayer) => {
      const pos = p.posicion.toUpperCase();
      if (
        pos.includes("GK") ||
        pos.includes("POR") ||
        pos.includes("PT") ||
        pos.includes("ARQ")
      )
        return 1;
      if (
        pos.includes("CB") ||
        pos.includes("DF") ||
        pos.includes("LD") ||
        pos.includes("LI") ||
        pos.includes("CAD") ||
        pos.includes("CAI") ||
        pos.includes("LAT") ||
        pos.includes("DEF")
      )
        return 2;
      if (
        pos.includes("DM") ||
        pos.includes("CM") ||
        pos.includes("MC") ||
        pos.includes("MD") ||
        pos.includes("MI") ||
        pos.includes("AM") ||
        pos.includes("MCO") ||
        pos.includes("VOL") ||
        pos.includes("MED")
      )
        return 3;
      return 4;
    };

    const sortedStarters = [...starters].sort(
      (a, b) => getPlayerLineupWeight(a) - getPlayerLineupWeight(b),
    );

    const updatedStarters = sortedStarters.map((player, idx) => {
      if (idx < layout.length) {
        return {
          ...player,
          pitchX: layout[idx].x,
          pitchY: layout[idx].y,
          posicion: layout[idx].posName, // Automatically assign position label!
        };
      }
      return player;
    });

    const finalPlayersList = [...updatedStarters, ...subs];

    if (team === "local") {
      setJugadoresLocal(finalPlayersList);
    } else {
      setJugadoresVisitante(finalPlayersList);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const startersLocal = jugadoresLocal.filter((p) => p.isTitular);
  const subsLocal = jugadoresLocal.filter((p) => !p.isTitular);

  const startersVisitante = jugadoresVisitante.filter((p) => p.isTitular);
  const subsVisitante = jugadoresVisitante.filter((p) => !p.isTitular);

  return (
    <>
      <ConfirmationModal
        isOpen={!!playerToDeleteInfo}
        onClose={() => setPlayerToDeleteInfo(null)}
        onConfirm={confirmDeletePlayer}
        title="Eliminar Jugador de Acta"
        message={`¿Estás seguro de que deseas eliminar a "${playerToDeleteInfo?.nombre}" de este informe de partido?`}
        confirmText="Eliminar"
      />

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 backdrop-blur-sm print:relative print:bg-white print:text-black print:p-0 print:z-10 ${
          isFullscreen ? "p-0" : "p-3 sm:p-5"
        }`}
      >
        {/* Scrollable Container Wrapper */}
        <div
          className={`w-full bg-slate-900 overflow-hidden flex flex-col print:max-h-none print:shadow-none print:border-none print:bg-white print:text-black transition-all duration-300 ${
            isFullscreen
              ? "w-screen h-screen max-h-screen rounded-none border-none"
              : "max-w-6xl rounded-lg max-h-[92vh] border border-slate-850 shadow-2xl"
          }`}
        >
          {/* Modal Toolbar (hidden in print) */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700/80 print:hidden">
            <div className="flex items-center space-x-2">
              <span className="p-1 px-2 text-[10px] uppercase font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-555 rounded-sm">
                TÁCTICO LA LIGA
              </span>
              <span className="text-white text-xs font-bold uppercase hidden sm:inline-block font-mono">
                Editor de Acta de Partido
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleLoadTemplatePlayers}
                className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-700 rounded active:scale-95 transition-all w-fit"
                title="Cargar alineaciones Getafe B - Logroñés del partido de Playoffs"
              >
                <RefreshCw className="w-3 h-3 text-emerald-400" />
                <span>Plantilla Demo (Foto)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-700 rounded hover:bg-slate-650 active:scale-95 transition-all"
                title={
                  isFullscreen
                    ? "Salir de pantalla completa"
                    : "Pantalla completa (Fullscreen)"
                }
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="hidden sm:inline">
                  {isFullscreen ? "Ventana" : "Pantalla Completa"}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-700 rounded hover:bg-slate-650 active:scale-95 transition-all"
                title="Imprimir visualizador o guardar como PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>

              <button
                onClick={handleSaveReport}
                className="flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-550 active:scale-95 text-white rounded text-[11px] font-bold transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>

              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded active:scale-90"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Printable Sheet Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 print:overflow-visible print:p-0 print:text-black">
            {/* Printable Watermark banner (only on print) */}
            <div className="hidden print:flex items-center justify-between border-b pb-2 mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold tracking-widest text-slate-800">
                  DEPARTAMENTO SCOUTING REPORT_DOC
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Generado el: {new Date().toLocaleDateString()}
              </span>
            </div>

            {/* Editable Match Header Data Section */}
            <div className="bg-slate-950/45 p-4 rounded border border-slate-800/60 print:bg-white print:border-none print:p-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                {/* Competition and Date Grid */}
                <div className="md:col-span-4 space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase print:hidden">
                    Competición
                  </label>
                  <select
                    value={competicion}
                    onChange={(e) => setCompeticion(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none print:border-none print:bg-transparent print:text-slate-800 print:text-center print:font-bold print:uppercase cursor-pointer"
                  >
                    <option value="" className="text-slate-500">-- Seleccionar --</option>
                    <option value="Primera RFEF">Primera RFEF</option>
                    <option value="Segunda RFEF">Segunda RFEF</option>
                    <option value="Tercera RFEF">Tercera RFEF</option>
                    <option value="Segunda División">Segunda División</option>
                    <option value="Copa del Rey">Copa del Rey</option>
                    <option value="Amistoso">Amistoso</option>
                    {competicion && !["Primera RFEF", "Segunda RFEF", "Tercera RFEF", "Segunda División", "Copa del Rey", "Amistoso"].includes(competicion) && (
                      <option value={competicion}>{competicion}</option>
                    )}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase print:hidden">
                    Fecha de Calendario
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-blue-500 focus:outline-none print:hidden"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase print:hidden">
                    Fecha y Hora Legible
                  </label>
                  <input
                    type="text"
                    value={fechaHoraDetallada}
                    onChange={(e) => setFechaHoraDetallada(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-blue-500 focus:outline-none print:border-none print:bg-transparent print:text-slate-650 print:text-[10px] print:text-center"
                    placeholder="Ej: Domingo, 10 MAYO 2026 - 11:30"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase print:hidden">
                    Ojeador / Autor
                  </label>
                  <input
                    type="text"
                    value={autor}
                    onChange={(e) => setAutor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-blue-500 focus:outline-none print:border-none print:bg-transparent print:text-slate-700 print:text-[9px] print:text-right"
                    placeholder="Ej: ScoutingRealAvilésCF"
                  />
                </div>

                {/* Local Team vs Visitante Score Board */}
                <div className="md:col-span-12 grid grid-cols-12 gap-2 items-center border-t border-slate-900/60 pt-3 mt-1 print:border-none print:pt-0">
                  {/* Local team */}
                  <div className="col-span-4 flex items-center space-x-2 justify-end">
                    <div className="text-right space-y-0.5">
                      <select
                        value={
                          allScoutingTeams.includes(equipoLocal)
                            ? equipoLocal
                            : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setEquipoLocal(val);
                            setDraggingSourceTeamLocal(val);
                          }
                        }}
                        className="block w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] text-blue-400 font-mono focus:outline-none focus:border-blue-500 max-w-[120px] ml-auto print:hidden"
                      >
                        <option value="">-- DB Local --</option>
                        {allScoutingTeams.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={equipoLocal}
                        onChange={(e) => setEquipoLocal(e.target.value)}
                        className="text-right bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white font-bold max-w-[120px] focus:outline-none focus:border-blue-500 print:border-none print:bg-transparent print:text-black print:text-xl print:max-w-none"
                        placeholder="Local"
                      />
                      <input
                        type="text"
                        value={escudoLocal}
                        onChange={(e) => setEscudoLocal(e.target.value)}
                        className="block text-[8px] bg-slate-900 border border-slate-800 rounded px-1 text-slate-400 font-mono text-right max-w-[125px] ml-auto focus:outline-none print:hidden"
                        placeholder="Escudo URL"
                      />
                    </div>
                    <div className="w-8 h-8 rounded bg-slate-850 flex items-center justify-center border border-slate-700/60 overflow-hidden shrink-0 print:border-slate-300">
                      {escudoLocal ? (
                        <img
                          src={escudoLocal}
                          alt="Local logo"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Shield className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-4 flex items-center justify-center space-x-1 px-2.5">
                    <input
                      type="number"
                      value={golesLocal}
                      onChange={(e) =>
                        setGolesLocal(
                          Math.max(0, parseInt(e.target.value) || 0),
                        )
                      }
                      className="w-10 text-center bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-sm font-bold text-blue-400 focus:outline-none print:border-none print:bg-transparent print:text-black print:text-2xl print:w-auto"
                      min="0"
                    />
                    <span className="text-slate-600 font-mono">-</span>
                    <input
                      type="number"
                      value={golesVisitante}
                      onChange={(e) =>
                        setGolesVisitante(
                          Math.max(0, parseInt(e.target.value) || 0),
                        )
                      }
                      className="w-10 text-center bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-sm font-bold text-blue-400 focus:outline-none print:border-none print:bg-transparent print:text-black print:text-2xl print:w-auto"
                      min="0"
                    />
                  </div>

                  {/* Visitante Team */}
                  <div className="col-span-4 flex items-center space-x-2 justify-start">
                    <div className="w-8 h-8 rounded bg-slate-850 flex items-center justify-center border border-slate-700/60 overflow-hidden shrink-0 print:border-slate-300">
                      {escudoVisitante ? (
                        <img
                          src={escudoVisitante}
                          alt="Visitante logo"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Shield className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <select
                        value={
                          allScoutingTeams.includes(equipoVisitante)
                            ? equipoVisitante
                            : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setEquipoVisitante(val);
                            setDraggingSourceTeamVisitante(val);
                          }
                        }}
                        className="block w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] text-blue-400 font-mono focus:outline-none focus:border-blue-500 max-w-[120px] print:hidden"
                      >
                        <option value="">-- DB Visitante --</option>
                        {allScoutingTeams.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={equipoVisitante}
                        onChange={(e) => setEquipoVisitante(e.target.value)}
                        className="text-left bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white font-bold max-w-[120px] focus:outline-none focus:border-blue-500 print:border-none print:bg-transparent print:text-black print:text-xl print:max-w-none"
                        placeholder="Visitante"
                      />
                      <input
                        type="text"
                        value={escudoVisitante}
                        onChange={(e) => setEscudoVisitante(e.target.value)}
                        className="block text-[8px] bg-slate-900 border border-slate-800 rounded px-1 text-slate-400 font-mono text-left max-w-[125px] focus:outline-none print:hidden"
                        placeholder="Escudo URL"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick instructions to edit */}
            <div className="text-[10px] bg-slate-900/30 text-slate-400 border border-slate-800 px-3 py-1.5 rounded flex flex-col md:flex-row gap-2 justify-between items-start md:items-center print:hidden">
              <span>
                💡 <strong>Consejo táctico:</strong> Haz clic en cualquier
                jugador en la pizarra verde o en la lista inferior para
                posicionarlo, arrastrar su slider o editar sus datos.
              </span>
              <div className="flex items-center space-x-3 self-end md:self-auto shrink-0 font-mono">
                <span className="text-slate-500">
                  Local: {startersLocal.length} | Visitante:{" "}
                  {startersVisitante.length}
                </span>
              </div>
            </div>

            {/* Pitches layout tab toggles (useful on mobile view) */}
            <div className="flex sm:hidden space-x-1 border-b border-slate-800 pb-2 print:hidden justify-center">
              <button
                onClick={() => setVisualTab("ambos")}
                className={`px-3 py-1 rounded text-xs font-semibold ${visualTab === "ambos" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                Completos
              </button>
              <button
                onClick={() => setVisualTab("local")}
                className={`px-3 py-1 rounded text-xs font-semibold ${visualTab === "local" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                U. Local
              </button>
              <button
                onClick={() => setVisualTab("visitante")}
                className={`px-3 py-1 rounded text-xs font-semibold ${visualTab === "visitante" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                U. Visitante
              </button>
            </div>

            {/* Side-by-Side Tactical Pitches */}
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${visualTab === "local" ? "flex" : visualTab === "visitante" ? "flex" : ""}`}
            >
              {/* LOCAL TEAM PITCH */}
              {(visualTab === "ambos" || visualTab === "local") && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-xs font-bold font-mono text-blue-400 uppercase tracking-widest flex items-center space-x-1.5">
                      <span>Alineación - {equipoLocal || "Local"}</span>
                      <span className="text-[10px] text-slate-500">
                        ({startersLocal.length} titulares)
                      </span>
                    </h3>
                    <div className="flex items-center space-x-1.5 print:hidden">
                      <select
                        onChange={(e) => {
                          const form = e.target.value;
                          if (form) applyFormation("local", form);
                          e.target.value = "";
                        }}
                        className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold outline-none cursor-pointer"
                      >
                        <option value="">⚙️ Sistema</option>
                        <option value="4-3-3">4-3-3 + Portero</option>
                        <option value="4-4-2">4-4-2 + Portero</option>
                        <option value="3-5-2">3-5-2 + Portero</option>
                        <option value="4-2-3-1">4-2-3-1 + Portero</option>
                      </select>
                      <button
                        onClick={() => addNewPlayer("local")}
                        className="flex items-center space-x-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold transition-all"
                      >
                        <Plus className="w-3 h-3 text-blue-400" />
                        <span>Añadir</span>
                      </button>
                    </div>
                  </div>

                  {/* Tactical pitch representation */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOverLocal(true);
                    }}
                    onDragLeave={() => {
                      setIsDragOverLocal(false);
                    }}
                    onDrop={(e) => {
                      setIsDragOverLocal(false);
                      handleDropOnPitch(e, "local");
                    }}
                    className={`aspect-[3/4] sm:aspect-[4/5] bg-emerald-950/80 rounded-lg border p-4 relative overflow-hidden shadow-inner flex flex-col justify-between print:border-emerald-700 print:bg-emerald-100/50 transition-all duration-200 ${
                      isDragOverLocal
                        ? "border-blue-500 bg-emerald-900/95 ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950"
                        : "border-emerald-800/60"
                    }`}
                  >
                    {/* Pitch lines */}
                    <div className="absolute inset-0 border-4 border-slate-200/20 m-2 rounded pointer-events-none"></div>
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-slate-200/20 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-slate-200/20 pointer-events-none"></div>

                    {/* Penalty Box Top */}
                    <div className="absolute inset-x-12 top-2 h-20 border-x-2 border-b-2 border-slate-200/20 pointer-events-none"></div>
                    <div className="absolute inset-x-20 top-2 h-8 border-x-2 border-b-2 border-slate-200/20 pointer-events-none"></div>

                    {/* Penalty Box Bottom */}
                    <div className="absolute inset-x-12 bottom-2 h-20 border-x-2 border-t-2 border-slate-200/20 pointer-events-none"></div>
                    <div className="absolute inset-x-20 bottom-2 h-8 border-x-2 border-t-2 border-slate-200/20 pointer-events-none"></div>

                    {/* Goal outlines */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-2 border-x border-b border-white px-1 opacity-65 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-2 border-x border-t border-white px-1 opacity-65 pointer-events-none"></div>

                    {/* Pitch label */}
                    <div className="absolute bottom-4 left-4 z-0 pointer-events-none font-mono text-[9px] font-bold uppercase tracking-widest text-slate-400/25 print:text-emerald-900/10">
                      {equipoLocal || "TÁCTICO LOCAL"}
                    </div>

                    {/* Players rendered absolutely */}
                    {startersLocal.map((p) => {
                      const isSelected = editingPlayerId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => startEditPlayer(p, "local")}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData(
                              "text/plain",
                              JSON.stringify({
                                source: "pitch",
                                id: p.id,
                                team: "local",
                              }),
                            );
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group transition-transform ${isSelected ? "scale-110" : "hover:scale-105"} cursor-grab active:cursor-grabbing`}
                          style={{ left: `${p.pitchX}%`, top: `${p.pitchY}%` }}
                        >
                          {/* Soccer Badge element */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center relative font-mono text-xs font-bold transition-colors shadow-lg border-2 ${
                                isSelected
                                  ? "bg-blue-600 border-white text-white"
                                  : "bg-slate-900 border-blue-500 text-white hover:bg-slate-800"
                              } print:border-blue-900 print:text-black`}
                            >
                              {p.fotoUrl ? (
                                <>
                                  <img
                                    src={p.fotoUrl}
                                    alt={p.nombre}
                                    className="w-full h-full object-cover rounded-full"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute -bottom-1 -left-1 bg-slate-900 text-white text-[8px] font-bold font-mono h-4 w-4 flex items-center justify-center rounded-full border border-slate-700 shadow shadow-black">
                                    {p.dorsal}
                                  </span>
                                </>
                              ) : (
                                p.dorsal
                              )}

                              {/* Short Rating dot */}
                              {p.pts && p.pts !== "-" && (
                                <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-slate-950 font-sans text-[7px] font-bold px-1 py-0.2 rounded-full scale-90 border border-slate-900 print:border-none font-bold">
                                  {p.pts}
                                </span>
                              )}
                            </div>

                            {/* Player name card label */}
                            <div className="mt-1 bg-slate-950/80 border border-slate-800 px-1.5 py-0.5 rounded text-[8px] font-semibold text-white whitespace-nowrap max-w-[90px] truncate leading-none text-center shadow-md print:bg-white print:text-black print:border-slate-300">
                              {p.nombre}
                            </div>

                            {/* Role text */}
                            <span className="text-[7px] font-mono text-slate-400 uppercase tracking-widest leading-none mt-0.5 print:text-slate-805">
                              {p.posicion}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VISITANTE TEAM PITCH */}
              {(visualTab === "ambos" || visualTab === "visitante") && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center space-x-1.5">
                      <span>Alineación - {equipoVisitante || "Visitante"}</span>
                      <span className="text-[10px] text-slate-500">
                        ({startersVisitante.length} titulares)
                      </span>
                    </h3>
                    <div className="flex items-center space-x-1.5 print:hidden">
                      <select
                        onChange={(e) => {
                          const form = e.target.value;
                          if (form) applyFormation("visitante", form);
                          e.target.value = "";
                        }}
                        className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold outline-none cursor-pointer"
                      >
                        <option value="">⚙️ Sistema</option>
                        <option value="4-3-3">4-3-3 + Portero</option>
                        <option value="4-4-2">4-4-2 + Portero</option>
                        <option value="3-5-2">3-5-2 + Portero</option>
                        <option value="4-2-3-1">4-2-3-1 + Portero</option>
                      </select>
                      <button
                        onClick={() => addNewPlayer("visitante")}
                        className="flex items-center space-x-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold transition-all"
                      >
                        <Plus className="w-3 h-3 text-emerald-400" />
                        <span>Añadir</span>
                      </button>
                    </div>
                  </div>

                  {/* Tactical pitch representation */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOverVisitante(true);
                    }}
                    onDragLeave={() => {
                      setIsDragOverVisitante(false);
                    }}
                    onDrop={(e) => {
                      setIsDragOverVisitante(false);
                      handleDropOnPitch(e, "visitante");
                    }}
                    className={`aspect-[3/4] sm:aspect-[4/5] bg-emerald-950/80 rounded-lg border p-4 relative overflow-hidden shadow-inner flex flex-col justify-between print:border-emerald-700 print:bg-emerald-100/50 transition-all duration-200 ${
                      isDragOverVisitante
                        ? "border-emerald-500 bg-emerald-900/95 ring-2 ring-emerald-550 ring-offset-2 ring-offset-slate-950"
                        : "border-emerald-800/60"
                    }`}
                  >
                    {/* Pitch lines */}
                    <div className="absolute inset-0 border-4 border-slate-200/20 m-2 rounded pointer-events-none"></div>
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-slate-200/20 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-slate-200/20 pointer-events-none"></div>

                    {/* Penalty Box Top */}
                    <div className="absolute inset-x-12 top-2 h-20 border-x-2 border-b-2 border-slate-200/20 pointer-events-none"></div>
                    <div className="absolute inset-x-20 top-2 h-8 border-x-2 border-b-2 border-slate-200/20 pointer-events-none"></div>

                    {/* Penalty Box Bottom */}
                    <div className="absolute inset-x-12 bottom-2 h-20 border-x-2 border-t-2 border-slate-200/20 pointer-events-none"></div>
                    <div className="absolute inset-x-20 bottom-2 h-8 border-x-2 border-t-2 border-slate-200/20 pointer-events-none"></div>

                    {/* Goal outlines */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-2 border-x border-b border-white px-1 opacity-65 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-2 border-x border-t border-white px-1 opacity-65 pointer-events-none"></div>

                    {/* Pitch label */}
                    <div className="absolute bottom-4 left-4 z-0 pointer-events-none font-mono text-[9px] font-bold uppercase tracking-widest text-slate-400/25 print:text-emerald-900/10">
                      {equipoVisitante || "TÁCTICO VISITANTE"}
                    </div>

                    {/* Players rendered absolutely */}
                    {startersVisitante.map((p) => {
                      const isSelected = editingPlayerId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => startEditPlayer(p, "visitante")}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData(
                              "text/plain",
                              JSON.stringify({
                                source: "pitch",
                                id: p.id,
                                team: "visitante",
                              }),
                            );
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group transition-transform ${isSelected ? "scale-110" : "hover:scale-105"} cursor-grab active:cursor-grabbing`}
                          style={{ left: `${p.pitchX}%`, top: `${p.pitchY}%` }}
                        >
                          {/* Soccer Badge element */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center relative font-mono text-xs font-bold transition-colors shadow-lg border-2 ${
                                isSelected
                                  ? "bg-emerald-600 border-white text-white"
                                  : "bg-slate-900 border-emerald-500 text-white hover:bg-slate-800"
                              } print:border-emerald-900 print:text-black`}
                            >
                              {p.fotoUrl ? (
                                <>
                                  <img
                                    src={p.fotoUrl}
                                    alt={p.nombre}
                                    className="w-full h-full object-cover rounded-full"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute -bottom-1 -left-1 bg-slate-900 text-white text-[8px] font-bold font-mono h-4 w-4 flex items-center justify-center rounded-full border border-slate-700 shadow shadow-black">
                                    {p.dorsal}
                                  </span>
                                </>
                              ) : (
                                p.dorsal
                              )}

                              {/* Short Rating dot */}
                              {p.pts && p.pts !== "-" && (
                                <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-slate-950 font-sans text-[7px] font-bold px-1 py-0.2 rounded-full scale-90 border border-slate-900 print:border-none font-bold">
                                  {p.pts}
                                </span>
                              )}
                            </div>

                            {/* Player name card label */}
                            <div className="mt-1 bg-slate-950/80 border border-slate-800 px-1.5 py-0.5 rounded text-[8px] font-semibold text-white whitespace-nowrap max-w-[90px] truncate leading-none text-center shadow-md print:bg-white print:text-black print:border-slate-300">
                              {p.nombre}
                            </div>

                            {/* Role text */}
                            <span className="text-[7px] font-mono text-slate-400 uppercase tracking-widest leading-none mt-0.5 print:text-slate-805">
                              {p.posicion}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick inline overlay element to edit a single player node when selected */}
            {editingPlayerId && (
              <div className="bg-slate-950 border border-blue-500 p-4 rounded-lg relative shadow-xl space-y-3 print:hidden">
                <button
                  onClick={cancelEditPlayer}
                  className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white"
                  title="Cerrar formulario rápido"
                >
                  <X className="w-4 h-4" />
                </button>

                <h4 className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest flex items-center">
                  <span>
                    Editar Ficha de Jugador (
                    {editingPlayerTeam === "local"
                      ? equipoLocal
                      : equipoVisitante}
                    )
                  </span>
                </h4>

                {/* Selector de Jugador Escautado para autocompletar */}
                {players && players.length > 0 && (
                  <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-md space-y-2">
                    <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-wider block">
                      ⚡ Autocompletar desde el Catálogo de Scouting
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-1">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-mono text-slate-500 uppercase">
                          1. Filtrar por Equipo
                        </label>
                        <select
                          value={catalogFilterTeam}
                          onChange={(e) => {
                            setCatalogFilterTeam(e.target.value);
                            setCatalogSelectedPlayerId("");
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                        >
                          <option value="">-- Ver todos los equipos --</option>
                          {Array.from(
                            new Set(
                              players.map((p) => p.equipo).filter(Boolean),
                            ),
                          )
                            .sort()
                            .map((team) => (
                              <option key={team} value={team}>
                                {team}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-mono text-slate-500 uppercase">
                          2. Filtrar por Posición
                        </label>
                        <select
                          value={catalogFilterPosition}
                          onChange={(e) => {
                            setCatalogFilterPosition(e.target.value);
                            setCatalogSelectedPlayerId("");
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                        >
                          <option value="">-- Todas las posiciones --</option>
                          {Array.from(
                            new Set(
                              players.map((p) => p.posicion).filter(Boolean),
                            ),
                          )
                            .sort(
                              (a, b) =>
                                getPositionPriorityValue(a) -
                                getPositionPriorityValue(b),
                            )
                            .map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-mono text-slate-500 uppercase">
                          3. Seleccionar Jugador
                        </label>
                        <select
                          value={catalogSelectedPlayerId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setCatalogSelectedPlayerId(id);
                            const p = players.find((x) => x.id === id);
                            if (p) {
                              setEditNombre(p.nombre);
                              setEditAno(p.anoNacimiento);
                              setEditFotoUrl(p.fotoUrl || "");
                              setEditPie(
                                p.lateralidad === "Zurdo"
                                  ? "Z"
                                  : p.lateralidad === "Diestro"
                                    ? "D"
                                    : "A",
                              );
                              setEditValoracionFisica(p.valoracionFisica || {});

                              // Map positional strings to short match positions
                              const shortPos = (() => {
                                switch (p.posicion) {
                                  case "Portero":
                                    return "GK";
                                  case "Defensa Central":
                                    return "CB";
                                  case "Lateral Derecho":
                                    return "RB";
                                  case "Lateral Izquierdo":
                                    return "LB";
                                  case "Mediocentro Defensivo":
                                    return "DM";
                                  case "Mediocentro":
                                    return "CM";
                                  case "Mediapunta":
                                    return "AM";
                                  case "Extremo Derecho":
                                    return "RW";
                                  case "Extremo Izquierdo":
                                    return "LW";
                                  case "Delantero Centro":
                                    return "ST";
                                  default:
                                    return "CM";
                                }
                              })();
                              setEditPosicion(shortPos);
                              setEditComentarios("");
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                        >
                          <option value="">-- Elegir Jugador --</option>
                          {players
                            .filter((p) => {
                              const matchesTeam =
                                !catalogFilterTeam ||
                                p.equipo === catalogFilterTeam;
                              const matchesPos =
                                !catalogFilterPosition ||
                                p.posicion === catalogFilterPosition;
                              return matchesTeam && matchesPos;
                            })
                            .sort((a, b) => a.nombre.localeCompare(b.nombre))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} ({p.posicion}){" "}
                                {p.equipo ? `[${p.equipo}]` : ""}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">
                      Dorsal
                    </label>
                    <input
                      type="text"
                      value={editDorsal}
                      onChange={(e) => setEditDorsal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center font-bold font-mono focus:border-blue-500 focus:outline-none"
                      placeholder="10"
                      maxLength={3}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:border-blue-500 focus:outline-none font-bold"
                      placeholder="Jorge Benito"
                      maxLength={24}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">
                      Año Nac.
                    </label>
                    <input
                      type="text"
                      value={editAno}
                      onChange={(e) => setEditAno(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center font-mono focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: 2004"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">
                      Posición
                    </label>
                    <input
                      type="text"
                      value={editPosicion}
                      onChange={(e) => setEditPosicion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center uppercase font-mono focus:border-blue-500 focus:outline-none"
                      placeholder="GK, CB, ST"
                      maxLength={4}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">
                      Pie hábil
                    </label>
                    <select
                      value={editPie}
                      onChange={(e) =>
                        setEditPie(e.target.value as "D" | "Z" | "A")
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="D">D (Diestro)</option>
                      <option value="Z">Z (Zurdo)</option>
                      <option value="A">A (Ambidiestro)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">
                      Puntos / Calif.
                    </label>
                    <input
                      type="text"
                      value={editPts}
                      onChange={(e) => setEditPts(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center font-bold focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: 8, 7"
                      maxLength={3}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">
                      Estado ficha
                    </label>
                    <select
                      value={editIsTitular ? "titular" : "suplente"}
                      onChange={(e) =>
                        setEditIsTitular(e.target.value === "titular")
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="titular">TITULAR 🟢</option>
                      <option value="suplente">SUPLENTE 🔴</option>
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-2 space-y-1">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">
                      Foto de Jugador (URL)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editFotoUrl}
                        onChange={(e) => setEditFotoUrl(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:border-blue-500 focus:outline-none font-semibold truncate"
                        placeholder="Ej: https://..."
                      />
                      {editFotoUrl && (
                        <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                          <img
                            src={editFotoUrl}
                            alt="Previsualización"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const matchPhys = getPhysicalCapacitiesByPosition(editPosicion);
                    if (!matchPhys) return null;
                    return (
                      <div className="col-span-2 sm:col-span-6 border border-slate-800/80 bg-slate-900/40 p-3 rounded-lg space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold font-mono text-amber-500 uppercase tracking-widest flex items-center">
                            <Activity className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-500" />
                            Valoración de Capacidades Físicas ({matchPhys.category})
                          </span>
                          <span className="text-[9px] text-slate-400">Escala de 1 a 4 estrellas</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {matchPhys.capacities.map((cap) => {
                            const rating = editValoracionFisica[cap] || 2; // Default to 2
                            return (
                              <div key={cap} className="flex items-center justify-between bg-slate-950/40 border border-slate-900 px-3 py-1.5 rounded-md">
                                <span className="text-[11px] text-slate-300 font-medium">{cap}</span>
                                <div className="flex items-center space-x-0.5">
                                  {[1, 2, 3, 4].map((starNum) => {
                                    const isActive = starNum <= rating;
                                    return (
                                      <button
                                        type="button"
                                        key={starNum}
                                        onClick={() => {
                                          setEditValoracionFisica((prev) => ({
                                            ...prev,
                                            [cap]: starNum,
                                          }));
                                        }}
                                        className="p-0.5 focus:outline-none transition hover:scale-110"
                                      >
                                        <Star
                                          className={`w-3.5 h-3.5 ${
                                            isActive
                                              ? "fill-amber-400 text-amber-400"
                                              : "text-slate-600 hover:text-amber-300"
                                          }`}
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="col-span-2 sm:col-span-6 space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">
                      Comentario de partido / análisis breve (Ficha Jugador)
                    </label>
                    <textarea
                      rows={3}
                      value={editComentarios}
                      onChange={(e) => setEditComentarios(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500 leading-normal font-sans"
                      placeholder="Ej: P3 zurdo. Lateral moderno de talla baja..."
                    />
                  </div>
                </div>

                {/* Action Buttons inside overlay */}
                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() =>
                      deletePlayer(editingPlayerId!, editingPlayerTeam!)
                    }
                    className="flex items-center space-x-1.5 px-3 py-1 bg-red-950/30 hover:bg-red-900/30 text-red-400 rounded text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar del Acta</span>
                  </button>

                  <button
                    type="button"
                    onClick={cancelEditPlayer}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={savePlayerEdit}
                    className="flex items-center space-x-1.5 px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aplicar Cambios</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUPLENTES / REVOLUCIONES DE AMBOS EQUIPOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              {/* Suplentes Local */}
              <div className="bg-slate-950/25 p-3 rounded border border-slate-800/80 space-y-2 print:bg-white print:border-none print:p-0">
                <h4 className="text-[10px] font-bold font-mono tracking-widest text-slate-300 uppercase">
                  Suplentes {equipoLocal || "Local"}
                </h4>

                <div className="flex flex-wrap gap-2 pt-1">
                  {subsLocal.map((p) => {
                    const isSelected = editingPlayerId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => startEditPlayer(p, "local")}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900/80 border rounded-full cursor-pointer h-8 group hover:border-slate-400 max-w-[160px] truncate ${
                          isSelected
                            ? "border-blue-500 bg-slate-850"
                            : "border-slate-850"
                        } print:border-slate-300 print:bg-transparent`}
                      >
                        <div className="w-5 h-5 rounded-full bg-slate-850 text-slate-300 text-[10px] font-bold flex items-center justify-center font-mono shrink-0 print:border uppercase">
                          {p.dorsal}
                        </div>
                        <div className="text-[9px] font-medium text-slate-200 uppercase tracking-tight truncate print:text-black">
                          {p.nombre}
                        </div>
                        <span className="text-[7px] font-mono text-slate-500 uppercase bg-slate-950 px-1 rounded-sm">
                          {p.posicion || "SU"}
                        </span>
                      </div>
                    );
                  })}
                  {subsLocal.length === 0 && (
                    <span className="text-[9px] text-slate-600 font-mono italic">
                      Sin suplentes agregados.
                    </span>
                  )}
                </div>
              </div>

              {/* Suplentes Visitante */}
              <div className="bg-slate-950/25 p-3 rounded border border-slate-800/80 space-y-2 print:bg-white print:border-none print:p-0">
                <h4 className="text-[10px] font-bold font-mono tracking-widest text-slate-300 uppercase">
                  Suplentes {equipoVisitante || "Visitante"}
                </h4>

                <div className="flex flex-wrap gap-2 pt-1">
                  {subsVisitante.map((p) => {
                    const isSelected = editingPlayerId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => startEditPlayer(p, "visitante")}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900/80 border rounded-full cursor-pointer h-8 group hover:border-slate-400 max-w-[160px] truncate ${
                          isSelected
                            ? "border-emerald-500 bg-slate-850"
                            : "border-slate-850"
                        } print:border-slate-300 print:bg-transparent`}
                      >
                        <div className="w-5 h-5 rounded-full bg-slate-850 text-slate-300 text-[10px] font-bold flex items-center justify-center font-mono shrink-0 print:border uppercase">
                          {p.dorsal}
                        </div>
                        <div className="text-[9px] font-medium text-slate-200 uppercase tracking-tight truncate print:text-black">
                          {p.nombre}
                        </div>
                        <span className="text-[7px] font-mono text-slate-500 uppercase bg-slate-950 px-1 rounded-sm font-bold">
                          {p.posicion || "SU"}
                        </span>
                      </div>
                    );
                  })}
                  {subsVisitante.length === 0 && (
                    <span className="text-[9px] text-slate-600 font-mono italic">
                      Sin suplentes agregados.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* TWO ALINEACIONES DETAILED TABLES SPLIT SIDE-BY-SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LOCAL TABLE LIST DETAILS */}
              <div className="space-y-2 print:break-inside-avoid">
                <div className="border-b border-slate-800 pb-1 flex justify-between items-center print:border-slate-300">
                  <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono">
                    Lista de Futbolistas - {equipoLocal || "Local"}
                  </h4>
                  <span className="text-[9px] font-mono text-slate-500">
                    {jugadoresLocal.length} en acta
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[10px] font-mono text-left border border-slate-800 print:border-slate-300">
                    <thead className="bg-slate-950/60 uppercase font-bold text-[9px] border-b border-slate-800 text-slate-400 print:bg-slate-100 print:text-black print:border-slate-300">
                      <tr>
                        <th className="px-2 py-1.5 text-center w-8">Dor</th>
                        <th className="px-2.5 py-1.5">Jugador</th>
                        <th className="px-2 py-1.5 text-center w-10">Año</th>
                        <th className="px-2 py-1.5 text-center w-10">Pos</th>
                        <th className="px-2 py-1.5 text-center w-8">Pie</th>
                        <th className="px-2 py-1.5 text-center w-8 text-yellow-400 font-bold">
                          Pts
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-900/10 text-slate-300 divide-y divide-slate-800/60 print:bg-transparent print:divide-slate-300">
                      {jugadoresLocal.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => startEditPlayer(p, "local")}
                          className={`hover:bg-slate-800/40 cursor-pointer ${editingPlayerId === p.id ? "bg-blue-900/20 text-white" : ""} ${!p.isTitular ? "opacity-80 text-slate-450 bg-slate-950/5" : ""} print:hover:bg-transparent`}
                        >
                          <td className="px-2 py-1.5 text-center font-bold bg-slate-950/40 text-white print:text-black">
                            {p.dorsal}
                          </td>
                          <td className="px-2.5 py-1.5 font-sans">
                            <div className="font-bold flex items-center space-x-1">
                              <span>{p.nombre}</span>
                              {!p.isTitular && (
                                <span className="text-[7px] text-slate-500 uppercase scale-90 border rounded px-0.5 ml-1">
                                  Suplente
                                </span>
                              )}
                            </div>
                            {p.comentarios && (
                              <div className="text-[11px] leading-relaxed text-slate-350 italic mt-1 font-sans whitespace-pre-wrap print:text-slate-700 bg-slate-950/40 p-2 rounded-md border border-slate-800/40 max-w-full">
                                💬 {p.comentarios}
                              </div>
                            )}
                            {(() => {
                              const matchPhys = getPhysicalCapacitiesByPosition(p.posicion);
                              if (!matchPhys) return null;
                              const hasRatings = matchPhys.capacities.some(cap => p.valoracionFisica?.[cap] !== undefined);
                              if (!hasRatings) return null;
                              return (
                                <div className="mt-1.5 flex flex-wrap gap-2 animate-fade-in print:mt-1">
                                  {matchPhys.capacities.map((cap) => {
                                    const stars = p.valoracionFisica?.[cap] || 2;
                                    return (
                                      <div key={cap} className="flex items-center space-x-1 bg-slate-950/50 border border-slate-800 px-2 py-0.5 rounded text-[9px] print:bg-slate-100 print:text-black print:border-slate-300">
                                        <span className="text-slate-400 font-mono font-medium print:text-slate-705">{cap}:</span>
                                        <div className="flex items-center text-amber-400">
                                          {Array.from({ length: 4 }).map((_, i) => (
                                            <Star key={i} className={`w-2.5 h-2.5 ${i < stars ? "fill-amber-400 text-amber-400" : "text-slate-700 print:text-slate-300"}`} />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {p.anoNacimiento || "2004"}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-blue-400 print:text-blue-900">
                            {p.posicion}
                          </td>
                          <td className="px-2 py-1.5 text-center">{p.pie}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-yellow-405">
                            {p.pts || "-"}
                          </td>
                        </tr>
                      ))}
                      {jugadoresLocal.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-slate-500 font-sans italic"
                          >
                            Alineación vacía. Carga la plantilla de playoffs
                            arriba o añade jugadores manualmente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* LOCAL GENERAL COMMENTS */}
                <div className="space-y-1 mt-2">
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider print:hidden">
                    📝 Comentarios colectivos / Análisis de equipo (
                    {equipoLocal})
                  </label>
                  <textarea
                    value={comentariosLocal}
                    onChange={(e) => setComentariosLocal(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 leading-relaxed font-sans print:border-none print:bg-transparent print:text-slate-800 print:p-0"
                    placeholder="Por ejemplo: Bloque defensivo, esfuerzos de repliegue, etc."
                  />
                </div>
              </div>

              {/* VISITANTE TABLE LIST DETAILS */}
              <div className="space-y-2 print:break-inside-avoid">
                <div className="border-b border-slate-800 pb-1 flex justify-between items-center print:border-slate-300">
                  <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                    Lista de Futbolistas - {equipoVisitante || "Visitante"}
                  </h4>
                  <span className="text-[9px] font-mono text-slate-500">
                    {jugadoresVisitante.length} en acta
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[10px] font-mono text-left border border-slate-800 print:border-slate-300">
                    <thead className="bg-slate-950/60 uppercase font-bold text-[9px] border-b border-slate-800 text-slate-400 print:bg-slate-100 print:text-black print:border-slate-300">
                      <tr>
                        <th className="px-2 py-1.5 text-center w-8">Dor</th>
                        <th className="px-2.5 py-1.5">Jugador</th>
                        <th className="px-2 py-1.5 text-center w-10">Año</th>
                        <th className="px-2 py-1.5 text-center w-10">Pos</th>
                        <th className="px-2 py-1.5 text-center w-8">Pie</th>
                        <th className="px-2 py-1.5 text-center w-8 text-yellow-405 font-bold">
                          Pts
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-900/10 text-slate-300 divide-y divide-slate-800/60 print:bg-transparent print:divide-slate-300">
                      {jugadoresVisitante.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => startEditPlayer(p, "visitante")}
                          className={`hover:bg-slate-800/40 cursor-pointer ${editingPlayerId === p.id ? "bg-emerald-900/20 text-white" : ""} ${!p.isTitular ? "opacity-80 text-slate-450 bg-slate-950/5" : ""} print:hover:bg-transparent`}
                        >
                          <td className="px-2 py-1.5 text-center font-bold bg-slate-950/40 text-white print:text-black">
                            {p.dorsal}
                          </td>
                          <td className="px-2.5 py-1.5 font-sans">
                            <div className="font-bold flex items-center space-x-1">
                              <span>{p.nombre}</span>
                              {!p.isTitular && (
                                <span className="text-[7px] text-slate-500 uppercase scale-90 border rounded px-0.5 ml-1">
                                  Suplente
                                </span>
                              )}
                            </div>
                            {p.comentarios && (
                              <div className="text-[11px] leading-relaxed text-slate-350 italic mt-1 font-sans whitespace-pre-wrap print:text-slate-700 bg-slate-950/40 p-2 rounded-md border border-slate-800/40 max-w-full">
                                💬 {p.comentarios}
                              </div>
                            )}
                            {(() => {
                              const matchPhys = getPhysicalCapacitiesByPosition(p.posicion);
                              if (!matchPhys) return null;
                              const hasRatings = matchPhys.capacities.some(cap => p.valoracionFisica?.[cap] !== undefined);
                              if (!hasRatings) return null;
                              return (
                                <div className="mt-1.5 flex flex-wrap gap-2 animate-fade-in print:mt-1">
                                  {matchPhys.capacities.map((cap) => {
                                    const stars = p.valoracionFisica?.[cap] || 2;
                                    return (
                                      <div key={cap} className="flex items-center space-x-1 bg-slate-950/50 border border-slate-800 px-2 py-0.5 rounded text-[9px] print:bg-slate-100 print:text-black print:border-slate-300">
                                        <span className="text-slate-400 font-mono font-medium print:text-slate-705">{cap}:</span>
                                        <div className="flex items-center text-amber-400">
                                          {Array.from({ length: 4 }).map((_, i) => (
                                            <Star key={i} className={`w-2.5 h-2.5 ${i < stars ? "fill-amber-400 text-amber-400" : "text-slate-700 print:text-slate-300"}`} />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {p.anoNacimiento || "2004"}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-400 print:text-emerald-900">
                            {p.posicion}
                          </td>
                          <td className="px-2 py-1.5 text-center">{p.pie}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-yellow-405">
                            {p.pts || "-"}
                          </td>
                        </tr>
                      ))}
                      {jugadoresVisitante.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-slate-500 font-sans italic"
                          >
                            Alineación vacía. Carga la plantilla de playoffs
                            arriba o añade jugadores manualmente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* VISITANTE GENERAL COMMENTS */}
                <div className="space-y-1 mt-2">
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider print:hidden">
                    📝 Comentarios colectivos / Análisis de equipo (
                    {equipoVisitante})
                  </label>
                  <textarea
                    value={comentariosVisitante}
                    onChange={(e) => setComentariosVisitante(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 leading-relaxed font-sans print:border-none print:bg-transparent print:text-slate-800 print:p-0"
                    placeholder="Por ejemplo: Equipo veterano y consolidado, replegar rápido, etc."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Printable Action Footer (hidden in print) */}
          <div className="px-4 py-3 bg-slate-950 border-t border-slate-850 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 font-mono gap-3 print:hidden">
            <span>
              Licencia Oficial: ARENA-SCOUT-TÁCTICO | DanielSaugar@gmail.com
            </span>

            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded font-semibold transition"
              >
                Cerrar sin guardar
              </button>
              <button
                onClick={handleSaveReport}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-550 text-white rounded font-bold transition flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Acta de Partido</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
