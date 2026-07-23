import { useState, useEffect, Fragment } from 'react';
import { ScoutedPlayer, MatchReport } from './types';
import { INITIAL_PLAYERS } from './initialPlayers';
import { INITIAL_MATCH_REPORTS } from './utils/initialMatchReports';
import StatsGrid from './components/StatsGrid';
import PlayerTable from './components/PlayerTable';
import PlayerFormModal from './components/PlayerFormModal';
import PlayerReportModal from './components/PlayerReportModal';
import MatchReportModal from './components/MatchReportModal';
import SupabaseSyncBanner from './components/SupabaseSyncBanner';
import TeamsView from './components/TeamsView';
import TacticalBoard from './components/TacticalBoard';
import VideoLibrary from './components/VideoLibrary';
import DataReportsView from './components/DataReportsView';
import HomeView from './components/HomeView';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DEFAULT_TEAM_ESCUDOS } from './utils/escudoHelper';
import { isSupabaseConfigured, dbFetchPlayers, dbSavePlayer, dbDeletePlayer, dbBulkUpsert, dbFetchMatchReports, dbSaveMatchReport, dbDeleteMatchReport, dbBulkUpsertMatchReports } from './utils/supabaseClient';
import { Trophy, HelpCircle, FileJson, Info, Calendar, Plus, Trash2, Edit, FileText, ChevronRight, BarChart3 } from 'lucide-react';

export default function App() {
  const [players, setPlayers] = useState<ScoutedPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutedPlayer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<ScoutedPlayer | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportEditingPlayer, setReportEditingPlayer] = useState<ScoutedPlayer | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Match Reports States
  const [matchReports, setMatchReports] = useState<MatchReport[]>([]);
  const [matchReportsFilterComp, setMatchReportsFilterComp] = useState<string>('All');
  const [selectedReport, setSelectedReport] = useState<MatchReport | null>(null);
  const [isReportEditorOpen, setIsReportEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inicio' | 'players' | 'matchReports' | 'teams' | 'tactical' | 'videoteca' | 'data_reports'>('inicio');

  // Supabase states
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'error' | 'not_configured' | 'loading'>('not_configured');
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string>('');

  // Custom confirmation modal states
  const [reportToDeleteId, setReportToDeleteId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const deduplicatePlayers = (playerList: ScoutedPlayer[]): ScoutedPlayer[] => {
    const DUPLICATE_MAPPINGS: Record<string, string> = {
      'avi_01': 'p20', 'avi_02': 'p32', 'avi_03': 'p35', 'avi_04': 'p22',
      'avi_05': 'p30', 'avi_06': 'p21', 'avi_07': 'p24', 'avi_08': 'p14',
      'avi_09': 'p23', 'avi_10': 'p13', 'avi_11': 'p29', 'avi_12': 'p17',
      'avi_13': 'p33', 'avi_14': 'p18', 'avi_15': 'p25', 'avi_16': 'p28',
      'avi_17': 'p36', 'avi_18': 'p16', 'avi_19': 'p31', 'avi_20': 'p19',
      'avi_21': 'p34', 'avi_22': 'p15'
    };

    // 1. First, explicitly remove any player with an 'avi_xx' ID if the corresponding 'pXX' exists in the list OR in INITIAL_PLAYERS
    let filtered = playerList.filter(p => {
      const targetPId = DUPLICATE_MAPPINGS[p.id];
      if (targetPId) {
        // If the rich player exists in this list or we are merging, we should delete the 'avi_' duplicate from database
        dbDeletePlayer(p.id).catch(err => console.error(`Error al borrar jugador duplicado ${p.id} de Supabase:`, err));
        return false;
      }
      return true;
    });

    // 2. Secondary name-based exact deduplication just in case
    const seenKeys = new Set<string>();
    const unique: ScoutedPlayer[] = [];

    filtered.forEach(p => {
      const normName = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
      const team = (p.equipo === 'Real Avilés' || p.equipo === 'Real Avilés Industrial') ? 'Real Avilés Industrial' : p.equipo;
      const key = `${normName}_${team}`;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        unique.push(p);
      } else {
        // If it's a duplicate, delete from Supabase if it's an extra one
        if (p.id.startsWith('avi_')) {
          dbDeletePlayer(p.id).catch(console.error);
        }
      }
    });

    return unique;
  };

  const getDeletedPlayerIds = (): string[] => {
    try {
      const saved = localStorage.getItem('scouting_deleted_players_db');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  const getDeletedMatchReportIds = (): string[] => {
    try {
      const saved = localStorage.getItem('scouting_deleted_match_reports_db');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  // Load from Supabase OR fallback to localStorage
  const loadAllPlayers = async (silent = false) => {
    if (isSupabaseConfigured()) {
      setSupabaseStatus('loading');
      if (!silent) showNotification('Conectando a Supabase...', 'info');
      try {
        // 1. Fetch Players
        let fetched = await dbFetchPlayers();
        
        // Find system metadata about deleted player IDs
        const systemDeletedRow = fetched.find(p => p.id === 'system_deleted_ids');
        let dbDeletedIds: string[] = [];
        if (systemDeletedRow && systemDeletedRow.notas) {
          try {
            dbDeletedIds = JSON.parse(systemDeletedRow.notas);
          } catch (e) {
            console.error('Error parsing synced deleted IDs from Supabase:', e);
          }
        }

        // Filter out system metadata from the players list
        fetched = fetched.filter(p => p.id !== 'system_deleted_ids');

        // Merge local deleted IDs with DB deleted IDs and update local storage
        let localDeletedIds = getDeletedPlayerIds();
        const forceKeepIds = ['p16', 'p_roger_escoruela', 'fich_2026_07', 'fich_2026_08', 'p_andres_lopez'];
        if (localDeletedIds.some(id => forceKeepIds.includes(id))) {
          localDeletedIds = localDeletedIds.filter(id => !forceKeepIds.includes(id));
          try {
            localStorage.setItem('scouting_deleted_players_db', JSON.stringify(localDeletedIds));
          } catch (e) {}
        }
        const cleanDbDeletedIds = dbDeletedIds.filter(id => !forceKeepIds.includes(id));
        const mergedDeletedIds = Array.from(new Set([...localDeletedIds, ...cleanDbDeletedIds]));
        try {
          localStorage.setItem('scouting_deleted_players_db', JSON.stringify(mergedDeletedIds));
        } catch (e) {
          console.error('Error saving merged deleted IDs to local storage:', e);
        }

        // Reconcile and push back deleted players metadata if new local deletions exist or if deleted IDs changed
        if (mergedDeletedIds.length !== dbDeletedIds.length) {
          const systemDeletedPlayer: ScoutedPlayer = {
            id: 'system_deleted_ids',
            nombre: 'SYSTEM_DELETED_IDS',
            equipo: 'SYSTEM',
            posicion: 'Portero',
            anoNacimiento: 2000,
            lateralidad: 'Diestro',
            calificacion: 1,
            notas: JSON.stringify(mergedDeletedIds),
            atributos: { fisico: 1, tecnica: 1, tactica: 1, mental: 1 },
            fechaRegistro: new Date().toISOString()
          };
          
          dbSavePlayer(systemDeletedPlayer).catch(err => {
            console.error('Error syncing merged deleted IDs to Supabase on load:', err);
          });

          // Delete those players physically from Supabase to keep both databases in sync
          const newlyDeletedFromLocal = localDeletedIds.filter(id => !dbDeletedIds.includes(id));
          newlyDeletedFromLocal.forEach(id => {
            dbDeletePlayer(id).catch(err => {
              console.error(`Error deleting player ${id} from Supabase during load reconciliation:`, err);
            });
          });
        }

        // Filter out any players that have been marked as deleted (either locally or synced in DB)
        // Also ensure they are physically deleted from Supabase if we found them in fetched!
        const playersToDeleteFromDb = fetched.filter(p => mergedDeletedIds.includes(p.id));
        if (playersToDeleteFromDb.length > 0) {
          console.log('Detectados jugadores eliminados que aún existen en Supabase. Procediendo a borrarlos físicamente:', playersToDeleteFromDb.map(p => p.id));
          playersToDeleteFromDb.forEach(p => {
            dbDeletePlayer(p.id).catch(err => {
              console.error(`Error al purgar jugador eliminado ${p.id} de Supabase:`, err);
            });
          });
        }
        fetched = fetched.filter(p => !mergedDeletedIds.includes(p.id));

        // Find missing initial players (like goalkeepers and summer signings) and merge them, excluding any manually deleted ones
        const missingFromDb: ScoutedPlayer[] = [];
        INITIAL_PLAYERS.forEach((initP) => {
          if (!fetched.some((p) => p.id === initP.id) && !mergedDeletedIds.includes(initP.id)) {
            missingFromDb.push(initP);
          }
        });

        let finalPlayers = [...fetched];
        if (missingFromDb.length > 0) {
          // Merge to state immediately so they are visible right away
          finalPlayers = [...fetched, ...missingFromDb];
          
          // Silently upsert missing players to Supabase so they persist there
          Promise.all(missingFromDb.map(p => dbSavePlayer(p)))
            .then(() => {
              console.log('Fichajes demo (Álvaro/Nando) sincronizados en Supabase.');
            })
            .catch(err => {
              console.error('Error al subir jugadores demo a Supabase:', err);
            });
        }

        // Migrate Real Avilés players and Bilbao Athletic logos
        let migratedAny = false;
        finalPlayers = finalPlayers.map(p => {
          let updated = false;
          let current = { ...p };
          if (current.equipo === 'Real Avilés' || current.equipo === 'Real Avilés Industrial') {
            if (current.equipo === 'Real Avilés' || current.categoria !== 'Primera RFEF') {
              current.equipo = 'Real Avilés Industrial';
              current.categoria = 'Primera RFEF';
              updated = true;
            }
            const targetAvilesEscudo = 'https://cdn.resfu.com/img_data/equipos/2096.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetAvilesEscudo) {
              current.escudoUrl = targetAvilesEscudo;
              updated = true;
            }
          }
          if (current.id === 'p16' && current.nombre !== 'Osky Menéndez') {
            const freshOsky = INITIAL_PLAYERS.find(pl => pl.id === 'p16');
            if (freshOsky) {
              current = { ...current, ...freshOsky, equipo: 'Real Avilés Industrial', categoria: 'Primera RFEF' };
              updated = true;
            } else {
              current.nombre = 'Osky Menéndez';
              updated = true;
            }
          }
          if ((current.id === 'fich_2026_07' || current.id === 'fich_2026_08') && current.lateralidad !== 'Zurdo') {
            current.lateralidad = 'Zurdo';
            updated = true;
          }
          const teamName = current.equipo ? current.equipo.trim() : '';
          if (teamName === 'Bilbao Ath.' || teamName === 'Bilbao Athletic') {
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (updated) {
            migratedAny = true;
            dbSavePlayer(current).catch(console.error);
            return current;
          }
          return p;
        });

        // Deduplicate players
        finalPlayers = deduplicatePlayers(finalPlayers);
        
        // Always cache the clean list from Supabase into local storage so they remain synchronized
        localStorage.setItem('scouting_players_db', JSON.stringify(finalPlayers));

        setPlayers(finalPlayers);

        if (finalPlayers.length > 0) {
          // Highlight or select newly added players if present, otherwise default to first
          const newDefenders = finalPlayers.filter(p => p.id === 'p13' || p.id === 'p11' || p.id === 'p12' || p.id === 'p_neskes' || p.id === 'p_sillero' || p.id === 'p_artetxe');
          setSelectedPlayer(newDefenders.length > 0 ? newDefenders[0] : finalPlayers[0]);
        } else {
          setSelectedPlayer(null);
        }

        // 2. Fetch Match Reports
        let fetchedReports: MatchReport[] = [];
        let reportsSuccess = false;
        try {
          fetchedReports = await dbFetchMatchReports();
          reportsSuccess = true;
        } catch (reportErr: any) {
          console.warn('Error fetching match reports from Supabase, table might not exist yet:', reportErr);
          // Fallback to local storage for match reports specifically, keeping players loaded!
          const savedReports = localStorage.getItem('scouting_match_reports_db');
          if (savedReports) {
            try {
              fetchedReports = JSON.parse(savedReports);
            } catch (jsonErr) {
              fetchedReports = INITIAL_MATCH_REPORTS;
            }
          } else {
            fetchedReports = INITIAL_MATCH_REPORTS;
          }
          setSupabaseStatus('error');
          setSupabaseErrorMsg('La tabla "scouting_match_reports" no fue encontrada. Por favor, ejecuta la sentencia SQL en Supabase.');
          if (!silent) {
            showNotification('Falta la tabla "scouting_match_reports" en tu Supabase. Los informes se guardarán temporalmente en local hasta que crees la tabla.', 'error');
          }
        }

        let finalReports = [...fetchedReports];
        if (reportsSuccess) {
          // Find system metadata about deleted match report IDs
          const systemDeletedReportsRow = fetchedReports.find(r => r.id === 'system_deleted_ids');
          let dbDeletedReportIds: string[] = [];
          if (systemDeletedReportsRow && systemDeletedReportsRow.comentariosLocal) {
            try {
              dbDeletedReportIds = JSON.parse(systemDeletedReportsRow.comentariosLocal);
            } catch (e) {
              console.error('Error parsing synced deleted match report IDs from Supabase:', e);
            }
          }

          // Filter out system metadata from the fetched list
          fetchedReports = fetchedReports.filter(r => r.id !== 'system_deleted_ids');

          // Merge local deleted IDs with DB deleted IDs and update local storage
          const localDeletedReportIds = getDeletedMatchReportIds();
          const mergedDeletedReportIds = Array.from(new Set([...localDeletedReportIds, ...dbDeletedReportIds]));
          try {
            localStorage.setItem('scouting_deleted_match_reports_db', JSON.stringify(mergedDeletedReportIds));
          } catch (e) {
            console.error('Error saving merged deleted report IDs to local storage:', e);
          }

          // Reconcile and push back deleted reports metadata if new local deletions exist
          if (mergedDeletedReportIds.length > dbDeletedReportIds.length) {
            const systemDeletedReport: MatchReport = {
              id: 'system_deleted_ids',
              fecha: '2000-01-01',
              partido: 'SYSTEM_DELETED_IDS',
              competicion: 'SYSTEM',
              autor: 'SYSTEM',
              equipoLocal: 'SYSTEM',
              equipoVisitante: 'SYSTEM',
              golesLocal: 0,
              golesVisitante: 0,
              comentariosLocal: JSON.stringify(mergedDeletedReportIds),
              comentariosVisitante: '',
              jugadoresLocal: [],
              jugadoresVisitante: []
            };
            dbSaveMatchReport(systemDeletedReport).catch(console.error);
          }

          // Filter out any match reports that have been marked as deleted
          // Also ensure they are physically deleted from Supabase if we found them in fetched!
          const reportsToDeleteFromDb = fetchedReports.filter(r => mergedDeletedReportIds.includes(r.id));
          if (reportsToDeleteFromDb.length > 0) {
            console.log('Detectados informes de partidos eliminados que aún existen en Supabase. Procediendo a borrarlos físicamente:', reportsToDeleteFromDb.map(r => r.id));
            reportsToDeleteFromDb.forEach(r => {
              dbDeleteMatchReport(r.id).catch(err => {
                console.error(`Error al purgar informe eliminado ${r.id} de Supabase:`, err);
              });
            });
          }
          fetchedReports = fetchedReports.filter(r => !mergedDeletedReportIds.includes(r.id));

          // Find missing initial match reports and merge them, excluding any that are deleted!
          const missingReportsFromDb: MatchReport[] = [];
          INITIAL_MATCH_REPORTS.forEach((initR) => {
            if (!mergedDeletedReportIds.includes(initR.id) && !fetchedReports.some((r) => r.id === initR.id)) {
              missingReportsFromDb.push(initR);
            }
          });

          if (missingReportsFromDb.length > 0) {
            fetchedReports = [...fetchedReports, ...missingReportsFromDb];
            // Silently upsert missing reports
            Promise.all(missingReportsFromDb.map(r => dbSaveMatchReport(r)))
              .then(() => {
                console.log('Informes demo sincronizados en Supabase.');
              })
              .catch(err => {
                console.error('Error al subir informes demo a Supabase:', err);
              });
          }
          finalReports = fetchedReports;
        }

        setMatchReports(finalReports);
        if (reportsSuccess) {
          localStorage.setItem('scouting_match_reports_db', JSON.stringify(finalReports));
          setSupabaseStatus('connected');
          setSupabaseErrorMsg('');
          if (!silent) showNotification('Sincronización con Supabase finalizada.', 'success');
        }

        if (!silent) showNotification('Sincronización con Supabase finalizada.', 'success');
      } catch (err: any) {
        console.error(err);
        setSupabaseStatus('error');
        setSupabaseErrorMsg(err.message || String(err));
        
        // Local fallback
        loadFromLocalStorage();
        loadMatchReports();
        if (!silent) {
          showNotification('Error al conectar con Supabase. Utilizando almacenamiento local.', 'error');
        }
      }
    } else {
      setSupabaseStatus('not_configured');
      loadFromLocalStorage();
      loadMatchReports();
    }
  };

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('scouting_players_db');
    if (saved) {
      try {
        let parsed = JSON.parse(saved) as ScoutedPlayer[];
        let changed = false;
        
        // Merge missing initial players automatically (like the new goalkeepers), excluding any manually deleted ones
        let deletedIds = getDeletedPlayerIds();
        const forceKeepIds = ['p16', 'p_roger_escoruela', 'fich_2026_07', 'fich_2026_08', 'p_andres_lopez', 'p_mangel_prendes', 'p_samu_mayo'];
        if (deletedIds.some(id => forceKeepIds.includes(id))) {
          deletedIds = deletedIds.filter(id => !forceKeepIds.includes(id));
          try {
            localStorage.setItem('scouting_deleted_players_db', JSON.stringify(deletedIds));
          } catch (e) {}
        }
        INITIAL_PLAYERS.forEach((initP) => {
          if (!parsed.some((p) => p.id === initP.id) && !deletedIds.includes(initP.id)) {
            parsed.push(initP);
            changed = true;
          }
        });

        // Ensure Real Avilés and Bilbao Athletic have up-to-date fields
        parsed = parsed.map(p => {
          let updated = false;
          let current = { ...p };
          if (current.equipo === 'Real Avilés' || current.equipo === 'Real Avilés Industrial') {
            if (current.equipo === 'Real Avilés' || current.categoria !== 'Primera RFEF') {
              current.equipo = 'Real Avilés Industrial';
              current.categoria = 'Primera RFEF';
              updated = true;
            }
            const targetAvilesEscudo = 'https://cdn.resfu.com/img_data/equipos/2096.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetAvilesEscudo) {
              current.escudoUrl = targetAvilesEscudo;
              updated = true;
            }
          }
          if (current.id === 'p16' && current.nombre !== 'Osky Menéndez') {
            const freshOsky = INITIAL_PLAYERS.find(pl => pl.id === 'p16');
            if (freshOsky) {
              current = { ...current, ...freshOsky, equipo: 'Real Avilés Industrial', categoria: 'Primera RFEF' };
              updated = true;
            } else {
              current.nombre = 'Osky Menéndez';
              updated = true;
            }
          }
          if ((current.id === 'fich_2026_07' || current.id === 'fich_2026_08') && current.lateralidad !== 'Zurdo') {
            current.lateralidad = 'Zurdo';
            updated = true;
          }
          const teamName = current.equipo ? current.equipo.trim() : '';
          if (teamName === 'Bilbao Ath.' || teamName === 'Bilbao Athletic') {
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (updated) {
            changed = true;
            return current;
          }
          return p;
        });

        // Deduplicate
        const deduplicated = deduplicatePlayers(parsed);
        if (deduplicated.length !== parsed.length) {
          parsed = deduplicated;
          changed = true;
        }

        if (changed) {
          localStorage.setItem('scouting_players_db', JSON.stringify(parsed));
        }
        setPlayers(parsed);
        if (parsed.length > 0) {
          const newlyAdded = parsed.find(p => p.id === 'p13' || p.id === 'p11' || p.id === 'p12' || p.id === 'p_neskes' || p.id === 'p_sillero' || p.id === 'p_artetxe');
          setSelectedPlayer(newlyAdded || parsed[0]);
        } else {
          setSelectedPlayer(null);
        }
      } catch (err) {
        setPlayers(INITIAL_PLAYERS);
        localStorage.setItem('scouting_players_db', JSON.stringify(INITIAL_PLAYERS));
        if (INITIAL_PLAYERS.length > 0) {
          setSelectedPlayer(INITIAL_PLAYERS[0]);
        }
      }
    } else {
      setPlayers(INITIAL_PLAYERS);
      localStorage.setItem('scouting_players_db', JSON.stringify(INITIAL_PLAYERS));
      if (INITIAL_PLAYERS.length > 0) {
        setSelectedPlayer(INITIAL_PLAYERS[0]);
      }
    }
  };

  const loadMatchReports = () => {
    const saved = localStorage.getItem('scouting_match_reports_db');
    if (saved) {
      try {
        setMatchReports(JSON.parse(saved));
      } catch (err) {
        setMatchReports(INITIAL_MATCH_REPORTS);
        localStorage.setItem('scouting_match_reports_db', JSON.stringify(INITIAL_MATCH_REPORTS));
      }
    } else {
      setMatchReports(INITIAL_MATCH_REPORTS);
      localStorage.setItem('scouting_match_reports_db', JSON.stringify(INITIAL_MATCH_REPORTS));
    }
  };

  const handleSaveMatchReport = async (reportData: MatchReport) => {
    let updated: MatchReport[];
    const exists = matchReports.some(r => r.id === reportData.id);
    if (exists) {
      updated = matchReports.map(r => r.id === reportData.id ? reportData : r);
    } else {
      updated = [reportData, ...matchReports];
    }

    if (isSupabaseConfigured()) {
      showNotification('Sincronizando acta en Supabase...', 'info');
      try {
        await dbSaveMatchReport(reportData);
        if (exists) {
          showNotification(`Acta de partido "${reportData.partido}" guardada y sincronizada en Supabase.`, 'success');
        } else {
          showNotification(`Ficha de partido "${reportData.partido}" registrada y sincronizada en Supabase.`, 'success');
        }
      } catch (err: any) {
        console.error(err);
        showNotification('Error al sincronizar con Supabase. Acta guardada en local.', 'error');
        setSupabaseStatus('error');
        setSupabaseErrorMsg(err.message || String(err));
      }
    } else {
      if (exists) {
        showNotification(`Acta de partido "${reportData.partido}" guardada correctamente.`, 'success');
      } else {
        showNotification(`Ficha de partido "${reportData.partido}" registrada con éxito.`, 'success');
      }
    }

    setMatchReports(updated);
    localStorage.setItem('scouting_match_reports_db', JSON.stringify(updated));
  };

  const handleDeleteMatchReport = (id: string, e: any) => {
    e.stopPropagation();
    setReportToDeleteId(id);
  };

  const confirmDeleteMatchReport = async () => {
    if (!reportToDeleteId) return;
    const id = reportToDeleteId;
    const reportName = matchReports.find(r => r.id === id)?.partido || 'Acta';
    const updated = matchReports.filter(r => r.id !== id);

    // Save deleted match report ID locally
    const currentDeleted = getDeletedMatchReportIds();
    const updatedDeletedIds = Array.from(new Set([...currentDeleted, id]));
    try {
      localStorage.setItem('scouting_deleted_match_reports_db', JSON.stringify(updatedDeletedIds));
    } catch (e) {
      console.error(e);
    }

    if (isSupabaseConfigured()) {
      showNotification('Eliminando acta de Supabase...', 'info');
      try {
        await dbDeleteMatchReport(id);

        // Fetch current system_deleted_ids from Supabase to ensure we don't overwrite other clients' deletions!
        let dbDeletedIds: string[] = [];
        try {
          const reportsList = await dbFetchMatchReports();
          const systemDeletedRow = reportsList.find(r => r.id === 'system_deleted_ids');
          if (systemDeletedRow && systemDeletedRow.comentariosLocal) {
            dbDeletedIds = JSON.parse(systemDeletedRow.comentariosLocal);
          }
        } catch (fetchErr) {
          console.warn('Could not fetch existing deleted match report IDs from Supabase, falling back to local list:', fetchErr);
        }

        // Merge existing dbDeletedIds with our updated localDeletedIds list
        const finalDeletedIds = Array.from(new Set([...updatedDeletedIds, ...dbDeletedIds]));

        // Update local storage to have the complete merged list too!
        try {
          localStorage.setItem('scouting_deleted_match_reports_db', JSON.stringify(finalDeletedIds));
        } catch (e) {
          console.error(e);
        }

        // Save the updated list of deleted match report IDs to Supabase as system metadata
        const systemDeletedReport: MatchReport = {
          id: 'system_deleted_ids',
          fecha: '2000-01-01',
          partido: 'SYSTEM_DELETED_IDS',
          competicion: 'SYSTEM',
          autor: 'SYSTEM',
          equipoLocal: 'SYSTEM',
          equipoVisitante: 'SYSTEM',
          golesLocal: 0,
          golesVisitante: 0,
          comentariosLocal: JSON.stringify(finalDeletedIds),
          comentariosVisitante: '',
          jugadoresLocal: [],
          jugadoresVisitante: []
        };
        await dbSaveMatchReport(systemDeletedReport);

        showNotification(`Acta de partido "${reportName}" eliminada en Supabase y local.`, 'success');
      } catch (err: any) {
        console.error(err);
        showNotification('Error de red con Supabase. Eliminada localmente.', 'error');
        setSupabaseStatus('error');
        setSupabaseErrorMsg(err.message || String(err));
      }
    } else {
      showNotification(`Acta de partido "${reportName}" eliminada.`, 'info');
    }

    setMatchReports(updated);
    localStorage.setItem('scouting_match_reports_db', JSON.stringify(updated));
    setReportToDeleteId(null);
  };

  const handleNewMatchReportClick = () => {
    setSelectedReport(null);
    setIsReportEditorOpen(true);
  };

  const handleEditMatchReportClick = (report: MatchReport) => {
    setSelectedReport(report);
    setIsReportEditorOpen(true);
  };

  useEffect(() => {
    loadAllPlayers(true);
    loadMatchReports();
  }, []);

  // Save changes to state, local storage and Supabase in sync
  const handleSavePlayer = async (playerData: Omit<ScoutedPlayer, 'id' | 'fechaRegistro'> & { id?: string }) => {
    let updated: ScoutedPlayer[];
    let playerToSave: ScoutedPlayer;

    // Auto-fill/propagate team escudoUrl if it exists for this team elsewhere, or in DEFAULT_TEAM_ESCUDOS
    let resolvedEscudoUrl = playerData.escudoUrl;
    if (playerData.equipo) {
      const targetTeam = playerData.equipo.trim().toLowerCase();
      // First, look for any other player in the list who has a non-empty escudoUrl for this team
      const existingTeamPlayer = players.find(
        (p) => p.id !== playerData.id && p.equipo && p.equipo.trim().toLowerCase() === targetTeam && p.escudoUrl && p.escudoUrl.trim() !== ''
      );

      if (existingTeamPlayer && existingTeamPlayer.escudoUrl) {
        resolvedEscudoUrl = existingTeamPlayer.escudoUrl.trim();
      } else if (!resolvedEscudoUrl || resolvedEscudoUrl.trim() === '') {
        // Look up in DEFAULT_TEAM_ESCUDOS map
        const matchedKey = Object.keys(DEFAULT_TEAM_ESCUDOS).find(
          (k) => k.toLowerCase() === targetTeam
        );
        if (matchedKey) {
          resolvedEscudoUrl = DEFAULT_TEAM_ESCUDOS[matchedKey];
        }
      }
    }

    if (playerData.id) {
      // Edit existing player
      const original = players.find(p => p.id === playerData.id);
      const originalDate = original ? original.fechaRegistro : new Date().toISOString().split('T')[0];
      
      playerToSave = {
        ...playerData,
        escudoUrl: resolvedEscudoUrl,
        id: playerData.id,
        fechaRegistro: originalDate
      } as ScoutedPlayer;

      updated = players.map((p) => p.id === playerData.id ? playerToSave : p);
    } else {
      // Add new player
      playerToSave = {
        ...playerData,
        escudoUrl: resolvedEscudoUrl,
        id: `p-${Date.now()}`,
        fechaRegistro: new Date().toISOString().split('T')[0]
      } as ScoutedPlayer;
      
      updated = [playerToSave, ...players];
    }

    // Propagate shield/escudo URL to all players of the same team
    if (playerToSave.equipo && playerToSave.escudoUrl) {
      const targetTeam = playerToSave.equipo.trim().toLowerCase();
      const targetEscudo = playerToSave.escudoUrl.trim();
      if (targetEscudo) {
        updated = updated.map((p) => {
          if (p.equipo && p.equipo.trim().toLowerCase() === targetTeam && p.escudoUrl !== targetEscudo) {
            return { ...p, escudoUrl: targetEscudo };
          }
          return p;
        });
      }
    }

    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      showNotification('Guardando cambios en Supabase...', 'info');
      try {
        const sameTeamPlayers = updated.filter(
          (p) => p.equipo && p.equipo.trim().toLowerCase() === playerToSave.equipo?.trim().toLowerCase()
        );

        if (sameTeamPlayers.length > 1) {
          await dbBulkUpsert(sameTeamPlayers);
        } else {
          await dbSavePlayer(playerToSave);
        }
        showNotification(`Los datos de ${playerToSave.nombre} y el escudo del equipo han sido sincronizados en Supabase.`, 'success');
      } catch (err: any) {
        console.error(err);
        showNotification('Error de sincronización con Supabase. Cambios guardados localmente.', 'error');
        setSupabaseStatus('error');
        setSupabaseErrorMsg(err.message || String(err));
      }
    } else {
      showNotification(`Los datos de ${playerToSave.nombre} han sido actualizados correctamente.`, 'success');
    }

    setPlayers(updated);
    if (selectedPlayer && selectedPlayer.id === playerToSave.id) {
      setSelectedPlayer(playerToSave);
    } else if (!selectedPlayer) {
      setSelectedPlayer(playerToSave);
    }
    localStorage.setItem('scouting_players_db', JSON.stringify(updated));
  };

  // Delete player from state, local storage and Supabase
  const handleDeletePlayer = async (id: string) => {
    const freshPlayers = players.filter((p) => p.id !== id);

    // Save deleted player ID so they don't get restored
    let updatedDeletedIds: string[] = [];
    try {
      const saved = localStorage.getItem('scouting_deleted_players_db');
      const deletedIds: string[] = saved ? JSON.parse(saved) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('scouting_deleted_players_db', JSON.stringify(deletedIds));
      }
      updatedDeletedIds = deletedIds;
    } catch (e) {
      console.error('Error recording deleted player:', e);
    }

    if (isSupabaseConfigured()) {
      showNotification('Eliminando jugador de Supabase...', 'info');
      try {
        await dbDeletePlayer(id);

        // Fetch current system_deleted_ids from Supabase to ensure we don't overwrite other clients' deletions!
        let dbDeletedIds: string[] = [];
        try {
          const playersList = await dbFetchPlayers();
          const systemDeletedRow = playersList.find(p => p.id === 'system_deleted_ids');
          if (systemDeletedRow && systemDeletedRow.notas) {
            dbDeletedIds = JSON.parse(systemDeletedRow.notas);
          }
        } catch (fetchErr) {
          console.warn('Could not fetch existing deleted IDs from Supabase, falling back to local list:', fetchErr);
        }

        // Merge existing dbDeletedIds with our updated localDeletedIds list
        const finalDeletedIds = Array.from(new Set([...updatedDeletedIds, ...dbDeletedIds]));

        // Update local storage to have the complete merged list too!
        try {
          localStorage.setItem('scouting_deleted_players_db', JSON.stringify(finalDeletedIds));
        } catch (e) {
          console.error(e);
        }

        // Save the updated list of deleted player IDs to Supabase as system metadata
        const systemDeletedPlayer: ScoutedPlayer = {
          id: 'system_deleted_ids',
          nombre: 'SYSTEM_DELETED_IDS',
          equipo: 'SYSTEM',
          posicion: 'Portero',
          anoNacimiento: 2000,
          lateralidad: 'Diestro',
          calificacion: 1,
          notas: JSON.stringify(finalDeletedIds),
          atributos: { fisico: 1, tecnica: 1, tactica: 1, mental: 1 },
          fechaRegistro: new Date().toISOString()
        };
        await dbSavePlayer(systemDeletedPlayer);

        showNotification('Jugador removido de Supabase con éxito.', 'success');
      } catch (err: any) {
        console.error(err);
        showNotification('Error de red con Supabase. Eliminado localmente.', 'error');
        setSupabaseStatus('error');
        setSupabaseErrorMsg(err.message || String(err));
      }
    } else {
      showNotification('Jugador removido del archivo de ojeadores.', 'info');
    }

    setPlayers(freshPlayers);
    localStorage.setItem('scouting_players_db', JSON.stringify(freshPlayers));
    
    if (freshPlayers.length > 0) {
      setSelectedPlayer(freshPlayers[0]);
    } else {
      setSelectedPlayer(null);
    }
  };

  // Open modal for editing
  const handleOpenEdit = (player: ScoutedPlayer) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  // Reset database to initial templates
  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    localStorage.removeItem('scouting_deleted_players_db');
    localStorage.removeItem('scouting_deleted_match_reports_db');
    if (isSupabaseConfigured()) {
      showNotification('Subiendo datos demo a Supabase...', 'info');
      try {
        // Clear deleted players metadata row from Supabase
        try {
          await dbDeletePlayer('system_deleted_ids');
        } catch (metadataErr) {
          console.warn('Could not clear system_deleted_ids on reset:', metadataErr);
        }

        // Clear deleted match reports metadata row from Supabase
        try {
          await dbDeleteMatchReport('system_deleted_ids');
        } catch (metadataErr) {
          console.warn('Could not clear system_deleted_ids on reset for match reports:', metadataErr);
        }

        // Restore players
        await dbBulkUpsert(INITIAL_PLAYERS);
        setPlayers(INITIAL_PLAYERS);
        localStorage.setItem('scouting_players_db', JSON.stringify(INITIAL_PLAYERS));
        if (INITIAL_PLAYERS.length > 0) {
          setSelectedPlayer(INITIAL_PLAYERS[0]);
        } else {
          setSelectedPlayer(null);
        }

        // Restore match reports
        await dbBulkUpsertMatchReports(INITIAL_MATCH_REPORTS);
        setMatchReports(INITIAL_MATCH_REPORTS);
        localStorage.setItem('scouting_match_reports_db', JSON.stringify(INITIAL_MATCH_REPORTS));

        showNotification('Supabase y LocalStorage restablecidos con datos de prueba.', 'success');
      } catch (err: any) {
        console.error(err);
        showNotification('Error al resetear la base de datos en Supabase.', 'error');
        setSupabaseStatus('error');
        setSupabaseErrorMsg(err.message || String(err));
      }
    } else {
      // Offline reset for players
      setPlayers(INITIAL_PLAYERS);
      localStorage.setItem('scouting_players_db', JSON.stringify(INITIAL_PLAYERS));
      if (INITIAL_PLAYERS.length > 0) {
        setSelectedPlayer(INITIAL_PLAYERS[0]);
      } else {
        setSelectedPlayer(null);
      }

      // Offline reset for match reports
      setMatchReports(INITIAL_MATCH_REPORTS);
      localStorage.setItem('scouting_match_reports_db', JSON.stringify(INITIAL_MATCH_REPORTS));

      showNotification('La base de datos local de candidatos e informes ha sido restablecida.', 'info');
    }
    setShowResetConfirm(false);
  };

  const handleForceBulkUpload = async () => {
    if (!isSupabaseConfigured()) {
      showNotification('Supabase no está configurado en las variables de entorno.', 'error');
      return;
    }
    setSupabaseStatus('loading');
    showNotification('Sincronizando base de datos completa con tu Supabase...', 'info');
    try {
      // 1. Bulk upload active players
      await dbBulkUpsert(players);

      // 2. Sync and delete any locally deleted player records from Supabase
      const localDeletedIds = getDeletedPlayerIds();
      if (localDeletedIds.length > 0) {
        // Fetch current system_deleted_ids from Supabase first
        let dbDeletedIds: string[] = [];
        try {
          const playersList = await dbFetchPlayers();
          const systemDeletedRow = playersList.find(p => p.id === 'system_deleted_ids');
          if (systemDeletedRow && systemDeletedRow.notas) {
            dbDeletedIds = JSON.parse(systemDeletedRow.notas);
          }
        } catch (fetchErr) {
          console.warn('Could not fetch existing deleted IDs from Supabase during bulk sync:', fetchErr);
        }

        const finalDeletedIds = Array.from(new Set([...localDeletedIds, ...dbDeletedIds]));

        // Physically delete from database
        await Promise.all(
          finalDeletedIds.map(id => 
            dbDeletePlayer(id).catch(err => console.warn(`Error deleting player ${id} from Supabase during bulk upload:`, err))
          )
        );

        // Upload the deleted IDs system metadata row
        const systemDeletedPlayer: ScoutedPlayer = {
          id: 'system_deleted_ids',
          nombre: 'SYSTEM_DELETED_IDS',
          equipo: 'SYSTEM',
          posicion: 'Portero',
          anoNacimiento: 2000,
          lateralidad: 'Diestro',
          calificacion: 1,
          notas: JSON.stringify(finalDeletedIds),
          atributos: { fisico: 1, tecnica: 1, tactica: 1, mental: 1 },
          fechaRegistro: new Date().toISOString()
        };
        await dbSavePlayer(systemDeletedPlayer);

        // Update local storage to have the complete merged list too
        try {
          localStorage.setItem('scouting_deleted_players_db', JSON.stringify(finalDeletedIds));
        } catch (e) {
          console.error(e);
        }
      }
      
      // 3. Bulk upload match reports and handle deleted reports sync
      const localDeletedReportIds = getDeletedMatchReportIds();
      let finalDeletedReportIds = [...localDeletedReportIds];
      try {
        let dbDeletedReportIds: string[] = [];
        try {
          const reportsList = await dbFetchMatchReports();
          const systemDeletedRow = reportsList.find(r => r.id === 'system_deleted_ids');
          if (systemDeletedRow && systemDeletedRow.comentariosLocal) {
            dbDeletedReportIds = JSON.parse(systemDeletedRow.comentariosLocal);
          }
        } catch (fetchErr) {
          console.warn('Could not fetch existing deleted match report IDs from Supabase during bulk sync:', fetchErr);
        }

        finalDeletedReportIds = Array.from(new Set([...localDeletedReportIds, ...dbDeletedReportIds]));

        // Physically delete from database
        await Promise.all(
          finalDeletedReportIds.map(id => 
            dbDeleteMatchReport(id).catch(err => console.warn(`Error deleting match report ${id} from Supabase during bulk upload:`, err))
          )
        );

        // Upload the deleted IDs system metadata row
        const systemDeletedReport: MatchReport = {
          id: 'system_deleted_ids',
          fecha: '2000-01-01',
          partido: 'SYSTEM_DELETED_IDS',
          competicion: 'SYSTEM',
          autor: 'SYSTEM',
          equipoLocal: 'SYSTEM',
          equipoVisitante: 'SYSTEM',
          golesLocal: 0,
          golesVisitante: 0,
          comentariosLocal: JSON.stringify(finalDeletedReportIds),
          comentariosVisitante: '',
          jugadoresLocal: [],
          jugadoresVisitante: []
        };
        await dbSaveMatchReport(systemDeletedReport);

        // Update local storage to have the complete merged list too
        try {
          localStorage.setItem('scouting_deleted_match_reports_db', JSON.stringify(finalDeletedReportIds));
        } catch (e) {
          console.error(e);
        }
      } catch (err) {
        console.warn('Error syncing deleted match reports during bulk upload:', err);
      }
      
      const activeMatchReports = matchReports.filter(r => !finalDeletedReportIds.includes(r.id) && r.id !== 'system_deleted_ids');
      if (activeMatchReports.length > 0) {
        try {
          await dbBulkUpsertMatchReports(activeMatchReports);
        } catch (reportErr) {
          console.warn('Error syncing match reports bulk upload:', reportErr);
        }
      }
      
      showNotification('¡Base de datos local y de AI Studio sincronizada completamente con Supabase!', 'success');
      setSupabaseStatus('connected');
      setSupabaseErrorMsg(undefined);
      
      // Re-fetch to ensure alignment
      loadAllPlayers(true);
    } catch (err: any) {
      console.error(err);
      showNotification('Fallo en la sincronización masiva con Supabase.', 'error');
      setSupabaseStatus('error');
      setSupabaseErrorMsg(err.message || String(err));
    }
  };

  // Import JSON helper
  const handleImport = async (importString: string) => {
    try {
      const parsed = JSON.parse(importString);
      if (Array.isArray(parsed)) {
        const isValid = parsed.every(p => p.nombre && p.equipo && p.posicion && p.anoNacimiento && p.lateralidad);
        if (isValid) {
          if (isSupabaseConfigured()) {
            showNotification('Subiendo futbolistas importados a Supabase...', 'info');
            try {
              await dbBulkUpsert(parsed);
              showNotification('Base de datos importada y sincronizada en Supabase.', 'success');
            } catch (err: any) {
              console.error(err);
              showNotification('Importado localmente, pero falló la sincronización con Supabase.', 'error');
              setSupabaseStatus('error');
              setSupabaseErrorMsg(err.message || String(err));
            }
          } else {
            showNotification('Base de datos importada correctamente.', 'success');
          }
          
          setPlayers(parsed);
          localStorage.setItem('scouting_players_db', JSON.stringify(parsed));
          if (parsed.length > 0) {
            setSelectedPlayer(parsed[0]);
          } else {
            setSelectedPlayer(null);
          }
        } else {
          showNotification('Error: El archivo JSON no tiene la estructura de scouting requerida.', 'error');
        }
      } else {
        showNotification('El archivo JSON debe contener una lista de futbolistas.', 'error');
      }
    } catch (e) {
      showNotification('Error al parsear el archivo JSON. Verifica el formato.', 'error');
    }
  };

  const filteredMatchReports = matchReports.filter(report => {
    if (matchReportsFilterComp === 'All') return true;
    
    const compValue = (report.competicion || '').toLowerCase();
    const filterValue = matchReportsFilterComp.toLowerCase();
    
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const normComp = normalize(compValue);
    const normFilter = normalize(filterValue);
    
    if (normFilter.includes("segunda rfef")) {
      return normComp.includes("segunda rfef") || normComp.includes("segunda federacion") || normComp.includes("2a rfef") || normComp.includes("2ª");
    }
    if (normFilter.includes("primera rfef")) {
      return normComp.includes("primera rfef") || normComp.includes("primera federacion") || normComp.includes("1a rfef") || normComp.includes("1ª");
    }
    if (normFilter.includes("tercera rfef")) {
      return normComp.includes("tercera rfef") || normComp.includes("tercera federacion") || normComp.includes("3a rfef") || normComp.includes("3ª");
    }
    if (normFilter.includes("segunda division")) {
      return normComp.includes("segunda division") || normComp.includes("la liga hypermotion") || normComp.includes("laliga hypermotion") || normComp.includes("2a division");
    }

    return normComp.includes(normFilter);
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 font-sans">
      {/* Top Header Banner */}
      <header id="main-scouting-header" className="bg-slate-900/60 border-b border-slate-900/80 shadow-md backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="p-2 bg-blue-600 rounded text-white shadow-md shadow-blue-500/10 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-white tracking-widest uppercase">
                DEPARTAMENTO SCOUTING <span className="text-[10px] font-mono text-blue-400 px-1.5 py-0.5 bg-slate-800 rounded ml-2 font-normal">V2.4.0</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase font-semibold">
                SISTEMA INTEGRADO DE PROSPECCIÓN DEPORTIVA
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 text-[10px] bg-slate-950/55 px-3 py-1.5 rounded border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-blue-550 animate-pulse"></span>
            <span className="text-slate-400 font-mono font-bold">CLIENT: D_SAUGAR_SCOUT</span>
          </div>
        </div>
      </header>

      {/* Main body content section */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-5">
        
        {/* Helper Notification Banner */}
        {notification && (
          <div 
            id="system-notification-banner" 
            className={`px-4 py-2.5 rounded border text-xs font-mono font-bold flex items-center shadow-xs animate-fade-in ${
              notification.type === 'success' ? 'bg-green-950/25 text-green-400 border-green-900/30' :
              notification.type === 'error' ? 'bg-red-950/25 text-red-500 border-red-900/30' : 'bg-blue-950/25 text-blue-400 border-blue-900/30'
            }`}
          >
            <Info className="w-4 h-4 mr-2.5 flex-shrink-0" />
            <span className="uppercase tracking-wider">[{notification.type}] {notification.message}</span>
          </div>
        )}

        {/* Supabase connection status banner */}
        <SupabaseSyncBanner
          status={supabaseStatus}
          errorMessage={supabaseErrorMsg}
          onRefresh={loadAllPlayers}
          onForceSyncDemo={handleForceBulkUpload}
          playerCount={players.length}
          matchReportCount={matchReports.length}
        />

        {/* Workspace Segmented Navigation Tabs */}
        <div className="flex border-b border-slate-850/80 pb-px gap-1 print:hidden overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('inicio')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'inicio'
                ? 'border-blue-500 text-blue-400 bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-800'
            }`}
          >
            <span>🏠 Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'players'
                ? 'border-blue-500 text-blue-400 bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-800'
            }`}
          >
            <span>🏃‍♂️ Base de datos de jugadores</span>
            <span className="px-1.5 py-0.2 bg-slate-900 border border-slate-800 text-[9px] text-slate-400 rounded-full font-normal">
              {players.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'teams'
                ? 'border-blue-500 text-blue-400 bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-800'
            }`}
          >
            <span>🛡️ Equipos</span>
            <span className="px-1.5 py-0.2 bg-slate-900 border border-slate-800 text-[9px] text-slate-400 rounded-full font-normal">
              {new Set(players.filter(p => p.equipo).map(p => p.equipo.trim())).size}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('matchReports')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'matchReports'
                ? 'border-blue-500 text-blue-400 bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-800'
            }`}
          >
            <span>⚽ Informes de Partidos</span>
            <span className="px-1.5 py-0.2 bg-slate-900 border border-slate-800 text-[9px] text-slate-400 rounded-full font-normal">
              {matchReports.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tactical')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'tactical'
                ? 'border-blue-500 text-blue-400 bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-800'
            }`}
          >
            <span>📋 Campograma</span>
          </button>

          <button
            onClick={() => setActiveTab('videoteca')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'videoteca'
                ? 'border-blue-500 text-blue-400 bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-800'
            }`}
          >
            <span>📹 Videoteca</span>
          </button>

          <button
            onClick={() => setActiveTab('data_reports')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'data_reports'
                ? 'border-blue-500 text-blue-400 bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-800'
            }`}
          >
            <span>📊 Informes de Datos</span>
          </button>
        </div>

        {activeTab === 'inicio' && (
          <HomeView
            players={players}
            matchReports={matchReports}
            setActiveTab={setActiveTab}
            onAddPlayer={handleOpenAdd}
          />
        )}

        {activeTab === 'players' && (
          <>
            {/* Stats metrics layout */}
            <StatsGrid players={players} />

            {/* Dynamic split panes workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Main player table view (Full width) */}
              <section className="lg:col-span-12 col-span-12 h-full">
                <PlayerTable
                  players={players}
                  selectedPlayerId={selectedPlayer?.id || null}
                  onSelectPlayer={(p) => setSelectedPlayer(p)}
                  onAddPlayer={handleOpenAdd}
                  onImportData={handleImport}
                  onResetData={handleReset}
                  onEditPlayer={handleOpenEdit}
                  onEditReport={(player) => {
                    setReportEditingPlayer(player);
                    setIsReportModalOpen(true);
                  }}
                  onDeletePlayer={handleDeletePlayer}
                  onUpdatePlayer={handleSavePlayer}
                  matchReports={matchReports}
                  onUpdateMatchReport={handleSaveMatchReport}
                />
              </section>
            </div>
          </>
        )}

        {activeTab === 'teams' && (
          <TeamsView
            players={players}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onEditPlayer={handleOpenEdit}
            onEditReport={(p) => {
              setReportEditingPlayer(p);
              setIsReportModalOpen(true);
            }}
            onDeletePlayer={handleDeletePlayer}
          />
        )}

        {activeTab === 'matchReports' && (
          <div className="bg-slate-900 border border-slate-850 rounded-lg p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold font-display text-white tracking-widest uppercase flex items-center space-x-2">
                  <span>⚽ Central de Actas e Informes de Partidos</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
                  Visualización, creación y edición de alineaciones tácticas y rendimiento colectivo
                </p>
              </div>

              <button
                onClick={handleNewMatchReportClick}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-550 text-white rounded text-[10px] font-bold tracking-wider font-mono active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>INSERTAR INFORME DE PARTIDO</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              <div className="flex items-center space-x-3.5">
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider shrink-0">
                  🔍 Filtrar Competición:
                </span>
                <select
                  value={matchReportsFilterComp}
                  onChange={(e) => setMatchReportsFilterComp(e.target.value)}
                  className="bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-100 rounded px-2.5 py-1 text-xs font-semibold font-sans focus:border-blue-500 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="All">-- Todas las Competiciones --</option>
                  <option value="Segunda División">Segunda División</option>
                  <option value="Primera RFEF">Primera RFEF</option>
                  <option value="Segunda RFEF">Segunda RFEF</option>
                  <option value="Tercera RFEF">Tercera RFEF</option>
                </select>
              </div>

              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                Mostrando {filteredMatchReports.length} de {matchReports.length} actas
              </div>
            </div>

            {/* Match Reports List/Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead className="bg-slate-950/60 uppercase font-bold text-[9px] tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-center w-36">Fecha</th>
                    <th className="px-4 py-3">Partido / Enfrentamiento</th>
                    <th className="px-4 py-3 w-72">Competición</th>
                    <th className="px-4 py-3 text-center w-40">Ojeador</th>
                    <th className="px-4 py-3 text-right w-44">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/10">
                  {filteredMatchReports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => handleEditMatchReportClick(report)}
                      className="hover:bg-slate-850/45 cursor-pointer transition-colors"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-850 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-blue-450" />
                          <span>{report.fecha}</span>
                        </div>
                      </td>

                      {/* Partido (teams + mini logos + score) */}
                      <td className="px-4 py-3 font-sans">
                        <div className="flex items-center space-x-3.5">
                          {/* Local Team Block */}
                          <div className="flex items-center space-x-1.5 w-32 justify-end text-right">
                            <span className="font-bold text-slate-100 truncate text-xs">{report.equipoLocal}</span>
                            <div className="w-5 h-5 rounded overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 border border-slate-755">
                              {report.escudoLocal ? (
                                <img src={report.escudoLocal} alt="Local" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-[7px] text-slate-500 font-bold">L</span>
                              )}
                            </div>
                          </div>

                          {/* Score Board Badge */}
                          <div className="px-2 py-0.5 bg-slate-950 rounded border border-slate-850 text-center font-bold text-blue-400 font-mono text-xs w-16 whitespace-nowrap shrink-0">
                            {report.golesLocal} - {report.golesVisitante}
                          </div>

                          {/* Visitante Team Block */}
                          <div className="flex items-center space-x-1.5 w-32 justify-start text-left">
                            <div className="w-5 h-5 rounded overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 border border-slate-755">
                              {report.escudoVisitante ? (
                                <img src={report.escudoVisitante} alt="Visitante" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-[7px] text-slate-500 font-bold">V</span>
                              )}
                            </div>
                            <span className="font-bold text-slate-100 truncate text-xs">{report.equipoVisitante}</span>
                          </div>
                        </div>
                      </td>

                      {/* Competición info */}
                      <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                        <span className="px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded text-[9px] font-semibold text-slate-400 uppercase">
                          {report.competicion}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="px-4 py-3 text-center text-[10px] text-slate-400 italic whitespace-nowrap">
                        {report.autor}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditMatchReportClick(report)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded text-[10px] font-bold transition-all"
                          >
                            <FileText className="w-3 h-3 text-blue-400" />
                            <span>Ver/Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteMatchReport(report.id, e)}
                            className="p-1 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded transition-all"
                            title="Eliminar acta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredMatchReports.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic font-sans text-xs">
                        {matchReports.length === 0
                          ? 'No hay informes de partido registrados. Presiona "Insertar informe de partido" para crear uno.'
                          : 'No hay informes independientes que coincidan con la competición seleccionada.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tactical' && (
          <TacticalBoard
            players={players}
            showNotification={showNotification}
            onUpdatePlayer={handleSavePlayer}
          />
        )}

        {activeTab === 'videoteca' && (
          <VideoLibrary
            players={players}
            showNotification={showNotification}
          />
        )}

        {activeTab === 'data_reports' && (
          <DataReportsView
            players={players}
            matchReports={matchReports}
          />
        )}
      </main>

      {/* Scout Dialog Modal popup form overlay */}
      <PlayerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlayer}
        onDeletePlayer={handleDeletePlayer}
        playerToEdit={editingPlayer}
      />

      {/* Official Scouting Document Report Modal */}
      <PlayerReportModal
        isOpen={isReportModalOpen}
        player={reportEditingPlayer}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportEditingPlayer(null);
        }}
        onSaveReport={handleSavePlayer}
      />

      {/* Tactical Team Match Report Modal */}
      <MatchReportModal
        isOpen={isReportEditorOpen}
        onClose={() => setIsReportEditorOpen(false)}
        report={selectedReport}
        onSave={handleSaveMatchReport}
        players={players}
      />

      {/* Custom Confirmation Modals */}
      <ConfirmationModal
        isOpen={!!reportToDeleteId}
        onClose={() => setReportToDeleteId(null)}
        onConfirm={confirmDeleteMatchReport}
        title="Eliminar Acta de Partido"
        message={`¿Estás seguro de que deseas eliminar permanentemente este acta de partido? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
      />

      <ConfirmationModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmReset}
        title="Restablecer Base de Datos"
        message={`¿Estás seguro de que deseas restablecer la base de datos de candidatos y clubes? Se perderán todos los datos personalizados de tus ojeadores y se cargarán los jugadores de muestra iniciales.`}
        confirmText="Restablecer"
      />

      {/* Footer copyright Status Bar */}
      <footer className="bg-slate-950 border-t border-slate-900/60 py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 font-mono tracking-wider gap-2">
          <span>LAST SYNC: 2026-05-26 19:19:32 UTC | DB STATUS: ONLINE</span>
          <span>USER: DanielSaugar@gmail.com | LICENSE: ACTIVE-DENSE-v2</span>
        </div>
      </footer>
    </div>
  );
}
