import { useState, useEffect, useMemo, Fragment } from 'react';
import { ScoutedPlayer, MatchReport } from './types';
import { INITIAL_PLAYERS } from './initialPlayers';
import { INITIAL_MATCH_REPORTS } from './utils/initialMatchReports';
import PlayerTable from './components/PlayerTable';
import PlayerFormModal from './components/PlayerFormModal';
import PlayerReportModal from './components/PlayerReportModal';
import MatchReportModal from './components/MatchReportModal';
import TeamsView from './components/TeamsView';
import TacticalBoard from './components/TacticalBoard';
import VideoLibrary from './components/VideoLibrary';
import DataReportsView from './components/DataReportsView';
import HomeView from './components/HomeView';
import PlanSemanal from './components/PlanSemanal';
import { ConfirmationModal } from './components/ConfirmationModal';
import LoginScreen from './components/LoginScreen';
import { DEFAULT_TEAM_ESCUDOS } from './utils/escudoHelper';
import { 
  isSupabaseConfigured, 
  dbFetchPlayers, 
  dbSavePlayer, 
  dbDeletePlayer, 
  dbBulkUpsert, 
  dbFetchMatchReports, 
  dbSaveMatchReport, 
  dbDeleteMatchReport, 
  dbBulkUpsertMatchReports, 
  dbSaveSetting,
  getSupabaseUser,
  getSupabaseSession,
  onSupabaseAuthStateChange,
  supabaseSignOut
} from './utils/supabaseClient';
import { Trophy, HelpCircle, FileJson, Info, Calendar, Plus, Trash2, Edit, FileText, ChevronRight, BarChart3, LogOut, User, ArrowLeft } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
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
  const [matchReportsFilterTeam, setMatchReportsFilterTeam] = useState<string>('All');

  const availableMatchTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    matchReports.forEach((r) => {
      if (r.equipoLocal && r.equipoLocal.trim()) teamsSet.add(r.equipoLocal.trim());
      if (r.equipoVisitante && r.equipoVisitante.trim()) teamsSet.add(r.equipoVisitante.trim());
    });
    return Array.from(teamsSet).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matchReports]);
  const [selectedReport, setSelectedReport] = useState<MatchReport | null>(null);
  const [isReportEditorOpen, setIsReportEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inicio' | 'plan_semanal' | 'players' | 'matchReports' | 'teams' | 'tactical' | 'videoteca' | 'data_reports'>('inicio');

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
      'avi_21': 'p34', 'avi_22': 'p15',
      'gk_algeciras_cf_ivan_moreno': 'p_algeciras_ivan_moreno',
      'gk_ud_ibiza_tao_paradowski': 'p_algeciras_tao_paradowski'
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

      const existingIdx = unique.findIndex(u => {
        const uNorm = u.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
        const uTeam = (u.equipo === 'Real Avilés' || u.equipo === 'Real Avilés Industrial') ? 'Real Avilés Industrial' : u.equipo;
        return `${uNorm}_${uTeam}` === key;
      });

      if (existingIdx === -1) {
        seenKeys.add(key);
        unique.push(p);
      } else {
        // If the new one is richer (e.g. has dorsal or is from specialized dataset), swap it
        if ((p.dorsal !== undefined && unique[existingIdx].dorsal === undefined) || p.id.startsWith('p_algeciras_') || p.id.startsWith('p_castilla_')) {
          const oldId = unique[existingIdx].id;
          unique[existingIdx] = p;
          if (oldId !== p.id) {
            dbDeletePlayer(oldId).catch(console.error);
          }
        } else if (p.id.startsWith('avi_') || p.id.startsWith('gk_')) {
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
        const mergedDeletedIds = Array.from(new Set([...localDeletedIds, ...dbDeletedIds]));
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
            console.warn('Error syncing merged deleted IDs to Supabase on load (offline/network):', err?.message || err);
          });

          // Delete those players physically from Supabase to keep both databases in sync
          const newlyDeletedFromLocal = localDeletedIds.filter(id => !dbDeletedIds.includes(id));
          newlyDeletedFromLocal.forEach(id => {
            dbDeletePlayer(id).catch(err => {
              console.warn(`Error deleting player ${id} from Supabase during load reconciliation:`, err?.message || err);
            });
          });
        }

        // Filter out any players that have been marked as deleted (either locally or synced in DB)
        // Also ensure they are physically deleted from Supabase if we found them in fetched!
        const playersToDeleteFromDb = fetched.filter(p => mergedDeletedIds.includes(p.id));
        if (playersToDeleteFromDb.length > 0) {
          playersToDeleteFromDb.forEach(p => {
            dbDeletePlayer(p.id).catch(err => {
              console.warn(`Error al purgar jugador eliminado ${p.id} de Supabase:`, err?.message || err);
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
              console.log('Fichajes demo sincronizados en Supabase.');
            })
            .catch(err => {
              console.warn('Error al subir jugadores demo a Supabase (offline/network):', err?.message || err);
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
          const bilbaoUpdatedIds = [
            'p_ba03', 'p_ba06', 'p_ba13', 'p_ba23', 'p_ba_simon_garcia', 'p_ba_benat_larrea', 'p_ba_telmo_zarandona',
            'p_ba20', 'p_ba_dani_perez', 'p_ba_selton_sanchez', 'p_ba07', 'p_ba22', 'p_ba11', 'p_ba19', 'p_ba10', 'p_ba_elijah_gift',
            'p_ba_aritz_conde', 'p_ba02', 'p_ba_aingeru_olabarrieta', 'p_ba24', 'p_ba_manex_lozano', 'p_ba_asier_hierro', 'p_ba_igor_oyono', 'p_ba_txus_vizcay', 'p_ba_ander_pecina'
          ];
          if (bilbaoUpdatedIds.includes(current.id)) {
            const freshBilbao = INITIAL_PLAYERS.find(pl => pl.id === current.id);
            if (freshBilbao) {
              if (current.nombre !== freshBilbao.nombre || current.dorsal !== freshBilbao.dorsal || current.altura !== freshBilbao.altura) {
                current = { ...current, ...freshBilbao };
                updated = true;
              }
            }
          }
          const teamName = current.equipo ? current.equipo.trim() : '';
          if (teamName === 'Bilbao Ath.' || teamName === 'Bilbao Athletic') {
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('cacereño') || teamName.toLowerCase().includes('cacereno')) {
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/602.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('pontevedra')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/1997.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('mirandés') || teamName.toLowerCase().includes('mirandes')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/1699.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('unionistas')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/54657.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('alcorcón') || teamName.toLowerCase().includes('alcorcon')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/64.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('sporting atlético') || teamName.toLowerCase().includes('sporting atletico') || teamName.toLowerCase().includes('sporting b') || teamName.toLowerCase().includes('sporting de gijón b')) {
            if (current.categoria !== 'Tercera RFEF') { current.categoria = 'Tercera RFEF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/2124.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('majadahonda') || teamName.toLowerCase().includes('rayo majadahonda')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Rayo Majadahonda') { current.equipo = 'Rayo Majadahonda'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/2078.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('villarreal b') || teamName.toLowerCase().includes('villarreal cf b') || teamName.toLowerCase().includes('villarreal "b"')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Villarreal B') { current.equipo = 'Villarreal B'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/2716.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('torremolinos') || teamName.toLowerCase().includes('juventud torremolinos')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Juventud Torremolinos CF') { current.equipo = 'Juventud Torremolinos CF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/4770.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('coria') || teamName === 'CD Coria') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'CD Coria') { current.equipo = 'CD Coria'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/677.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('madrileño') || teamName.toLowerCase().includes('madrileno') || teamName.toLowerCase().includes('atlético de madrid b') || teamName.toLowerCase().includes('atletico de madrid b') || teamName === 'Atlético Madrileño' || teamName === 'Atletico Madrileño') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Atlético Madrileño') { current.equipo = 'Atlético Madrileño'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/323.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('ce europa') || teamName.toLowerCase().includes('club esportiu europa') || teamName === 'CE Europa' || teamName === 'Europa') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'CE Europa') { current.equipo = 'CE Europa'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/8760.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          const algecirasPlayerIds = [
            'p_algeciras_ivan_moreno', 'p_algeciras_tao_paradowski', 'p_algeciras_fran_carmona',
            'p_algeciras_angel_gomez', 'p_algeciras_victor_ruiz', 'p_algeciras_aleix_coch',
            'p_algeciras_jose_carlos_marquez', 'p_algeciras_tomas_sanchez', 'p_algeciras_paris_adot',
            'p_algeciras_jony_alamo', 'p_algeciras_toni_ramon', 'p_algeciras_oscar_castro',
            'p_algeciras_ivan_turrillo', 'p_algeciras_diego_almeida', 'p_algeciras_dani_garrido',
            'p_algeciras_joe_riley', 'p_algeciras_pau_martinez', 'p_algeciras_javi_aviles',
            'p_algeciras_diego_iglesias', 'p_algeciras_raul_rubio', 'p_algeciras_juanma_garcia',
            'p_algeciras_enrique_herrero'
          ];
          if (algecirasPlayerIds.includes(current.id) || (current.equipo?.includes('Algeciras') && ['iván moreno', 'ivan moreno', 'tao paradowski', 'fran carmona', 'ángel gómez', 'angel gomez', 'víctor ruiz', 'victor ruiz', 'aleix coch', 'josé carlos márquez', 'jose carlos marquez', 'tomás sánchez', 'tomas sanchez', 'paris adot', 'jony álamo', 'jony alamo', 'toni ramón', 'toni ramon', 'óscar castro', 'oscar castro', 'iván turrillo', 'ivan turrillo', 'diego almeida', 'dani garrido', 'joe riley', 'pau martínez', 'pau martinez', 'javi avilés', 'javi aviles', 'diego iglesias', 'raúl rubio', 'raul rubio', 'juanma garcía', 'juanma garcia', 'enrique herrero'].includes(current.nombre.toLowerCase().trim()))) {
            const freshAlgeciras = INITIAL_PLAYERS.find(pl => pl.id === current.id || (pl.equipo === 'Algeciras CF' && pl.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === current.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
            if (freshAlgeciras) {
              if (current.dorsal !== freshAlgeciras.dorsal || current.escudoUrl !== freshAlgeciras.escudoUrl || current.altura !== freshAlgeciras.altura || current.lateralidad !== freshAlgeciras.lateralidad || current.posicion !== freshAlgeciras.posicion) {
                current = { ...current, ...freshAlgeciras };
                updated = true;
              }
            }
          }
          if (teamName.toLowerCase().includes('algeciras') || teamName === 'Algeciras CF' || teamName === 'Algeciras') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Algeciras CF') { current.equipo = 'Algeciras CF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/166.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          const castillaPlayerIds = [
            'p_castilla_sergio_mestre', 'p_castilla_ferran_quetglas', 'p_castilla_diego_arroyo',
            'p_castilla_javi_navarro', 'p_castilla_diego_aguado', 'p_castilla_joan_martinez',
            'p_castilla_lamini_fati', 'p_castilla_mario_rivas', 'p_castilla_oscar_naasei',
            'p_castilla_alvaro_lezcano', 'p_castilla_jesus_fortea',
            'p_castilla_cristian_perea', 'p_castilla_jorge_cestero', 'p_castilla_sergio_martinez',
            'p_castilla_roberto_martin', 'p_castilla_daniel_mesonero', 'p_castilla_izan_regueira',
            'p_castilla_pol_fortuny', 'p_castilla_alexis_ciria', 'p_castilla_hugo_de_llanos',
            'p_castilla_daniel_yanez', 'p_castilla_manex_rezola', 'p_castilla_alvaro_leiva',
            'p_castilla_rachad_fettal', 'p_castilla_angel_carvajal',
            'p37', 'p38', 'p39', 'p40', 'p41', 'p42', 'p43', 'p44', 'p45', 'p46', 'p47'
          ];
          if (castillaPlayerIds.includes(current.id) || (current.equipo?.includes('Castilla') && ['sergio mestre', 'ferran quetglas', 'ferran quetglás', 'diego arroyo', 'javi navarro', 'diego aguado', 'joan martinez', 'joan martínez', 'lamini fati', 'mario rivas', 'oscar naasei', 'alvaro lezcano', 'álvaro lezcano', 'jesus fortea', 'jesús fortea', 'cristian perea', 'jorge cestero', 'sergio martinez', 'sergio martínez', 'roberto martin', 'roberto martín', 'daniel mesonero', 'izan regueira', 'pol fortuny', 'alexis ciria', 'hugo de llanos', 'daniel yanez', 'daniel yáñez', 'manex rezola', 'alvaro leiva', 'álvaro leiva', 'rachad fettal', 'angel carvajal', 'ángel carvajal'].includes(current.nombre.toLowerCase().trim()))) {
            const freshCastilla = INITIAL_PLAYERS.find(pl => pl.id === current.id || ((pl.equipo === 'RM Castilla' || pl.equipo?.includes('Castilla')) && pl.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === current.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
            if (freshCastilla) {
              if (current.dorsal !== freshCastilla.dorsal || current.escudoUrl !== freshCastilla.escudoUrl || current.altura !== freshCastilla.altura || current.lateralidad !== freshCastilla.lateralidad || current.posicion !== freshCastilla.posicion || current.categoria !== freshCastilla.categoria) {
                current = { ...current, ...freshCastilla };
                updated = true;
              }
            }
          }
          if (teamName.toLowerCase().includes('castilla') || teamName === 'RM Castilla' || teamName === 'Real Madrid Castilla') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'RM Castilla') { current.equipo = 'RM Castilla'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/2170.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('mijas') || teamName.toLowerCase().includes('lagunas') || teamName === 'CP Mijas Las Lagunas' || teamName === 'CP Mijas-Las Lagunas') {
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/8468.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('vetusta') || teamName === 'Real Oviedo Vetusta' || teamName === 'Oviedo Vetusta' || teamName === 'Real Oviedo B') {
            if (current.categoria !== 'Segunda RFEF') { current.categoria = 'Segunda RFEF'; updated = true; }
            if (current.equipo !== 'Real Oviedo Vetusta') { current.equipo = 'Real Oviedo Vetusta'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/4646.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (updated) {
            migratedAny = true;
            dbSavePlayer(current).catch(err => {
              console.warn(`Could not sync migrated player ${current.nombre} to Supabase (offline/network):`, err?.message || err);
            });
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
          console.warn('Error fetching match reports from Supabase, falling back to local storage:', reportErr?.message || reportErr);
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
          setSupabaseErrorMsg('La tabla "scouting_match_reports" no fue encontrada o no hay conexión. Los informes se guardarán temporalmente en local.');
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
              console.warn('Error parsing synced deleted match report IDs from Supabase:', e);
            }
          }

          // Filter out system metadata from the fetched list
          fetchedReports = fetchedReports.filter(r => r.id !== 'system_deleted_ids');

          // Merge local deleted IDs with DB deleted IDs and update local storage
          const localDeletedReportIds = getDeletedMatchReportIds();
          const mergedDeletedReportIds = Array.from(new Set([...localDeletedReportIds, ...dbDeletedReportIds]));
          try {
            localStorage.setItem('scouting_deleted_match_reports_db', JSON.stringify(mergedDeletedReportIds));
          } catch (e) {}

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
            dbSaveMatchReport(systemDeletedReport).catch(err => {
              console.warn('Error saving system deleted reports to Supabase (offline/network):', err?.message || err);
            });
          }

          // Filter out any match reports that have been marked as deleted
          // Also ensure they are physically deleted from Supabase if we found them in fetched!
          const reportsToDeleteFromDb = fetchedReports.filter(r => mergedDeletedReportIds.includes(r.id));
          if (reportsToDeleteFromDb.length > 0) {
            reportsToDeleteFromDb.forEach(r => {
              dbDeleteMatchReport(r.id).catch(err => {
                console.warn(`Error al purgar informe eliminado ${r.id} de Supabase:`, err?.message || err);
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
                console.warn('Error al subir informes demo a Supabase (offline/network):', err?.message || err);
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
        const msg = err?.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
          console.warn('[Supabase Offline] Sin conexión con la base de datos remota. Operando en modo local.');
          setSupabaseStatus('error');
          setSupabaseErrorMsg('Sin conexión con Supabase. Utilizando base de datos local.');
        } else {
          console.error('[Supabase Error]:', err);
          setSupabaseStatus('error');
          setSupabaseErrorMsg(msg);
        }
        
        // Local fallback
        loadFromLocalStorage();
        loadMatchReports();
        if (!silent) {
          showNotification('Sin conexión con Supabase. Utilizando almacenamiento local.', 'info');
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
        
        // Merge missing initial players automatically, excluding any manually deleted ones
        let deletedIds = getDeletedPlayerIds();
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
          const bilbaoUpdatedIds = [
            'p_ba03', 'p_ba06', 'p_ba13', 'p_ba23', 'p_ba_simon_garcia', 'p_ba_benat_larrea', 'p_ba_telmo_zarandona',
            'p_ba20', 'p_ba_dani_perez', 'p_ba_selton_sanchez', 'p_ba07', 'p_ba22', 'p_ba11', 'p_ba19', 'p_ba10', 'p_ba_elijah_gift',
            'p_ba_aritz_conde', 'p_ba02', 'p_ba_aingeru_olabarrieta', 'p_ba24', 'p_ba_manex_lozano', 'p_ba_asier_hierro', 'p_ba_igor_oyono', 'p_ba_txus_vizcay', 'p_ba_ander_pecina'
          ];
          if (bilbaoUpdatedIds.includes(current.id)) {
            const freshBilbao = INITIAL_PLAYERS.find(pl => pl.id === current.id);
            if (freshBilbao) {
              if (current.nombre !== freshBilbao.nombre || current.dorsal !== freshBilbao.dorsal || current.altura !== freshBilbao.altura) {
                current = { ...current, ...freshBilbao };
                updated = true;
              }
            }
          }
          const teamName = current.equipo ? current.equipo.trim() : '';
          if (teamName === 'Bilbao Ath.' || teamName === 'Bilbao Athletic') {
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('cacereño') || teamName.toLowerCase().includes('cacereno')) {
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/602.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('pontevedra')) {
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/1997.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('mirandés') || teamName.toLowerCase().includes('mirandes')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/1699.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('unionistas')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/54657.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('alcorcón') || teamName.toLowerCase().includes('alcorcon')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/64.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('majadahonda') || teamName.toLowerCase().includes('rayo majadahonda')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Rayo Majadahonda') { current.equipo = 'Rayo Majadahonda'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/2078.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('villarreal b') || teamName.toLowerCase().includes('villarreal cf b') || teamName.toLowerCase().includes('villarreal "b"')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Villarreal B') { current.equipo = 'Villarreal B'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/2716.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('torremolinos') || teamName.toLowerCase().includes('juventud torremolinos')) {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Juventud Torremolinos CF') { current.equipo = 'Juventud Torremolinos CF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/4770.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('coria') || teamName === 'CD Coria') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'CD Coria') { current.equipo = 'CD Coria'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/677.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('madrileño') || teamName.toLowerCase().includes('madrileno') || teamName.toLowerCase().includes('atlético de madrid b') || teamName.toLowerCase().includes('atletico de madrid b') || teamName === 'Atlético Madrileño' || teamName === 'Atletico Madrileño') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Atlético Madrileño') { current.equipo = 'Atlético Madrileño'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/323.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('ce europa') || teamName.toLowerCase().includes('club esportiu europa') || teamName === 'CE Europa' || teamName === 'Europa') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'CE Europa') { current.equipo = 'CE Europa'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/8760.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          const algecirasPlayerIds = [
            'p_algeciras_ivan_moreno', 'p_algeciras_tao_paradowski', 'p_algeciras_fran_carmona',
            'p_algeciras_angel_gomez', 'p_algeciras_victor_ruiz', 'p_algeciras_aleix_coch',
            'p_algeciras_jose_carlos_marquez', 'p_algeciras_tomas_sanchez', 'p_algeciras_paris_adot',
            'p_algeciras_jony_alamo', 'p_algeciras_toni_ramon', 'p_algeciras_oscar_castro',
            'p_algeciras_ivan_turrillo', 'p_algeciras_diego_almeida', 'p_algeciras_dani_garrido',
            'p_algeciras_joe_riley', 'p_algeciras_pau_martinez', 'p_algeciras_javi_aviles',
            'p_algeciras_diego_iglesias', 'p_algeciras_raul_rubio', 'p_algeciras_juanma_garcia',
            'p_algeciras_enrique_herrero'
          ];
          if (algecirasPlayerIds.includes(current.id) || (current.equipo?.includes('Algeciras') && ['iván moreno', 'ivan moreno', 'tao paradowski', 'fran carmona', 'ángel gómez', 'angel gomez', 'víctor ruiz', 'victor ruiz', 'aleix coch', 'josé carlos márquez', 'jose carlos marquez', 'tomás sánchez', 'tomas sanchez', 'paris adot', 'jony álamo', 'jony alamo', 'toni ramón', 'toni ramon', 'óscar castro', 'oscar castro', 'iván turrillo', 'ivan turrillo', 'diego almeida', 'dani garrido', 'joe riley', 'pau martínez', 'pau martinez', 'javi avilés', 'javi aviles', 'diego iglesias', 'raúl rubio', 'raul rubio', 'juanma garcía', 'juanma garcia', 'enrique herrero'].includes(current.nombre.toLowerCase().trim()))) {
            const freshAlgeciras = INITIAL_PLAYERS.find(pl => pl.id === current.id || (pl.equipo === 'Algeciras CF' && pl.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === current.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
            if (freshAlgeciras) {
              if (current.dorsal !== freshAlgeciras.dorsal || current.escudoUrl !== freshAlgeciras.escudoUrl || current.altura !== freshAlgeciras.altura || current.lateralidad !== freshAlgeciras.lateralidad || current.posicion !== freshAlgeciras.posicion) {
                current = { ...current, ...freshAlgeciras };
                updated = true;
              }
            }
          }
          if (teamName.toLowerCase().includes('algeciras') || teamName === 'Algeciras CF' || teamName === 'Algeciras') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'Algeciras CF') { current.equipo = 'Algeciras CF'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/166.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          const castillaPlayerIds = [
            'p_castilla_sergio_mestre', 'p_castilla_ferran_quetglas', 'p_castilla_diego_arroyo',
            'p_castilla_javi_navarro', 'p_castilla_diego_aguado', 'p_castilla_joan_martinez',
            'p_castilla_lamini_fati', 'p_castilla_mario_rivas', 'p_castilla_oscar_naasei',
            'p_castilla_alvaro_lezcano', 'p_castilla_jesus_fortea',
            'p_castilla_cristian_perea', 'p_castilla_jorge_cestero', 'p_castilla_sergio_martinez',
            'p_castilla_roberto_martin', 'p_castilla_daniel_mesonero', 'p_castilla_izan_regueira',
            'p_castilla_pol_fortuny', 'p_castilla_alexis_ciria', 'p_castilla_hugo_de_llanos',
            'p_castilla_daniel_yanez', 'p_castilla_manex_rezola', 'p_castilla_alvaro_leiva',
            'p_castilla_rachad_fettal', 'p_castilla_angel_carvajal',
            'p37', 'p38', 'p39', 'p40', 'p41', 'p42', 'p43', 'p44', 'p45', 'p46', 'p47'
          ];
          if (castillaPlayerIds.includes(current.id) || (current.equipo?.includes('Castilla') && ['sergio mestre', 'ferran quetglas', 'ferran quetglás', 'diego arroyo', 'javi navarro', 'diego aguado', 'joan martinez', 'joan martínez', 'lamini fati', 'mario rivas', 'oscar naasei', 'alvaro lezcano', 'álvaro lezcano', 'jesus fortea', 'jesús fortea', 'cristian perea', 'jorge cestero', 'sergio martinez', 'sergio martínez', 'roberto martin', 'roberto martín', 'daniel mesonero', 'izan regueira', 'pol fortuny', 'alexis ciria', 'hugo de llanos', 'daniel yanez', 'daniel yáñez', 'manex rezola', 'alvaro leiva', 'álvaro leiva', 'rachad fettal', 'angel carvajal', 'ángel carvajal'].includes(current.nombre.toLowerCase().trim()))) {
            const freshCastilla = INITIAL_PLAYERS.find(pl => pl.id === current.id || ((pl.equipo === 'RM Castilla' || pl.equipo?.includes('Castilla')) && pl.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === current.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
            if (freshCastilla) {
              if (current.dorsal !== freshCastilla.dorsal || current.escudoUrl !== freshCastilla.escudoUrl || current.altura !== freshCastilla.altura || current.lateralidad !== freshCastilla.lateralidad || current.posicion !== freshCastilla.posicion || current.categoria !== freshCastilla.categoria) {
                current = { ...current, ...freshCastilla };
                updated = true;
              }
            }
          }
          if (teamName.toLowerCase().includes('castilla') || teamName === 'RM Castilla' || teamName === 'Real Madrid Castilla') {
            if (current.categoria !== 'Primera RFEF') { current.categoria = 'Primera RFEF'; updated = true; }
            if (current.equipo !== 'RM Castilla') { current.equipo = 'RM Castilla'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/2170.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('mijas') || teamName.toLowerCase().includes('lagunas') || teamName === 'CP Mijas Las Lagunas' || teamName === 'CP Mijas-Las Lagunas') {
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/8468.png?size=120x&lossy=1';
            if (current.escudoUrl !== targetEscudo) {
              current.escudoUrl = targetEscudo;
              updated = true;
            }
          }
          if (teamName.toLowerCase().includes('vetusta') || teamName === 'Real Oviedo Vetusta' || teamName === 'Oviedo Vetusta' || teamName === 'Real Oviedo B') {
            if (current.categoria !== 'Segunda RFEF') { current.categoria = 'Segunda RFEF'; updated = true; }
            if (current.equipo !== 'Real Oviedo Vetusta') { current.equipo = 'Real Oviedo Vetusta'; updated = true; }
            const targetEscudo = 'https://cdn.resfu.com/img_data/equipos/4646.png?size=120x&lossy=1';
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
        const deletedIds = getDeletedPlayerIds();
        const initialFiltered = INITIAL_PLAYERS.filter(p => !deletedIds.includes(p.id));
        setPlayers(initialFiltered);
        localStorage.setItem('scouting_players_db', JSON.stringify(initialFiltered));
        if (initialFiltered.length > 0) {
          setSelectedPlayer(initialFiltered[0]);
        }
      }
    } else {
      const deletedIds = getDeletedPlayerIds();
      const initialFiltered = INITIAL_PLAYERS.filter(p => !deletedIds.includes(p.id));
      setPlayers(initialFiltered);
      localStorage.setItem('scouting_players_db', JSON.stringify(initialFiltered));
      if (initialFiltered.length > 0) {
        setSelectedPlayer(initialFiltered[0]);
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

  const handleSignOut = async () => {
    try {
      await supabaseSignOut();
      setUser(null);
      showNotification('Sesión cerrada correctamente', 'info');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  useEffect(() => {
    // Check initial Supabase Auth session
    if (isSupabaseConfigured()) {
      getSupabaseSession()
        .then((session) => {
          setUser(session?.user || null);
          setAuthChecked(true);
        })
        .catch((err) => {
          console.warn('Initial Supabase session check error:', err);
          setUser(null);
          setAuthChecked(true);
        });

      const { data: { subscription } } = onSupabaseAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || (event as string) === 'TOKEN_REFRESH_FAILED') {
          setUser(null);
        } else {
          setUser(session?.user || null);
        }
        setAuthChecked(true);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (user || !isSupabaseConfigured()) {
      loadAllPlayers(true);
      loadMatchReports();
    }
  }, [user]);

  // Loading state while checking auth session
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 select-none">
        <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-400">Verificando sesión de scouting...</p>
      </div>
    );
  }

  // If Supabase is configured and user is not logged in, display full login screen
  if (isSupabaseConfigured() && !user) {
    return (
      <LoginScreen onLoginSuccess={(u) => {
        setUser(u);
        showNotification(`Bienvenido, ${u.email}`, 'success');
      }} />
    );
  }

  // Save changes to state, local storage and Supabase in sync
  const handleSavePlayer = async (playerData: Omit<ScoutedPlayer, 'id' | 'fechaRegistro'> & { id?: string }) => {
    let updated: ScoutedPlayer[];
    let playerToSave: ScoutedPlayer;

    // Auto-fill/propagate team escudoUrl if it exists for this team elsewhere, or in DEFAULT_TEAM_ESCUDOS
    let resolvedEscudoUrl = playerData.escudoUrl;
    if (playerData.equipo) {
      const targetTeam = playerData.equipo.trim().toLowerCase();
      if (targetTeam.includes('pontevedra')) {
        resolvedEscudoUrl = 'https://cdn.resfu.com/img_data/equipos/1997.png?size=120x&lossy=1';
      } else if (targetTeam.includes('algeciras')) {
        resolvedEscudoUrl = 'https://cdn.resfu.com/img_data/equipos/166.png?size=120x&lossy=1';
      } else if (targetTeam.includes('castilla')) {
        resolvedEscudoUrl = 'https://cdn.resfu.com/img_data/equipos/2170.png?size=120x&lossy=1';
      } else if (targetTeam.includes('mijas') || targetTeam.includes('lagunas')) {
        resolvedEscudoUrl = 'https://cdn.resfu.com/img_data/equipos/8468.png?size=120x&lossy=1';
      } else if (targetTeam.includes('vetusta') || targetTeam.includes('oviedo vetusta')) {
        resolvedEscudoUrl = 'https://cdn.resfu.com/img_data/equipos/4646.png?size=120x&lossy=1';
      } else {
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
        const msg = err?.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
          console.warn('[Supabase Offline] Guardado en local. Sin conexión a Supabase:', msg);
          showNotification(`Guardado en local. Sin conexión con Supabase en este momento.`, 'info');
        } else {
          console.error('Error al guardar jugador:', err);
          showNotification('Error de sincronización con Supabase. Cambios guardados localmente.', 'error');
        }
        setSupabaseStatus('error');
        setSupabaseErrorMsg(msg);
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

  // Delete player from state, local storage and Supabase permanently
  const handleDeletePlayer = async (id: string) => {
    const freshPlayers = players.filter((p) => p.id !== id);
    setPlayers(freshPlayers);
    localStorage.setItem('scouting_players_db', JSON.stringify(freshPlayers));
    
    if (freshPlayers.length > 0) {
      if (selectedPlayer?.id === id) {
        setSelectedPlayer(freshPlayers[0]);
      }
    } else {
      setSelectedPlayer(null);
    }

    // Save deleted player ID permanently so they don't get restored
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
      console.warn('Error recording deleted player in local storage:', e);
    }

    if (isSupabaseConfigured()) {
      showNotification('Eliminando jugador permanentemente de Supabase...', 'info');
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
        } catch (e) {}

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

        showNotification('Jugador eliminado permanentemente de la base de datos.', 'success');
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
          console.warn('[Supabase Offline] Eliminado localmente. Sin conexión a Supabase:', msg);
          showNotification('Eliminado en local. Sin conexión con Supabase en este momento.', 'info');
        } else {
          console.error('Error deleting player:', err);
          showNotification('Error de red con Supabase. Eliminado localmente.', 'error');
        }
        setSupabaseStatus('error');
        setSupabaseErrorMsg(msg);
      }
    } else {
      showNotification('Jugador eliminado permanentemente.', 'info');
    }

    // Clean up deleted player ID from campogramas in localStorage and Supabase
    try {
      const savedCampogramasStr = localStorage.getItem('DEPARTAMENTO_SCOUTING_CAMPOGRAMAS_V2');
      if (savedCampogramasStr) {
        let currentCampograms: any[] = JSON.parse(savedCampogramasStr);
        let campogramasChanged = false;

        currentCampograms = currentCampograms.map((c: any) => {
          let updatedAssignments = { ...(c.assignments || {}) };
          let updatedMonthly = { ...(c.monthlyAssignments || {}) };
          let itemChanged = false;

          // Clean single assignments
          Object.keys(updatedAssignments).forEach(posKey => {
            if (updatedAssignments[posKey] === id) {
              delete updatedAssignments[posKey];
              itemChanged = true;
            }
          });

          // Clean monthly assignments
          Object.keys(updatedMonthly).forEach(posKey => {
            if (Array.isArray(updatedMonthly[posKey]) && updatedMonthly[posKey].includes(id)) {
              updatedMonthly[posKey] = updatedMonthly[posKey].filter((pid: string) => pid !== id);
              itemChanged = true;
            }
          });

          if (itemChanged) {
            campogramasChanged = true;
            return {
              ...c,
              assignments: updatedAssignments,
              monthlyAssignments: updatedMonthly,
              fechaModificacion: new Date().toLocaleDateString('es-ES'),
              updatedAt: Date.now()
            };
          }
          return c;
        });

        if (campogramasChanged) {
          localStorage.setItem('DEPARTAMENTO_SCOUTING_CAMPOGRAMAS_V2', JSON.stringify(currentCampograms));
          if (isSupabaseConfigured()) {
            dbSaveSetting('campogramas', currentCampograms).catch(console.error);
          }
        }
      }
    } catch (campErr) {
      console.warn('Error purging deleted player from campogramas:', campErr);
    }

    // Clean up deleted player from custom team lineups in localStorage and Supabase
    try {
      const savedCustomLineupsStr = localStorage.getItem('DEPARTAMENTO_SCOUTING_TEAMS_CUSTOM_LINEUPS_V2');
      if (savedCustomLineupsStr) {
        let currentLineups: Record<string, Record<string, string[]>> = JSON.parse(savedCustomLineupsStr);
        let lineupsChanged = false;
        for (const teamKey of Object.keys(currentLineups)) {
          const posMap = currentLineups[teamKey];
          if (posMap && typeof posMap === 'object') {
            for (const posKey of Object.keys(posMap)) {
              if (Array.isArray(posMap[posKey]) && posMap[posKey].includes(id)) {
                posMap[posKey] = posMap[posKey].filter((pid: string) => pid !== id);
                lineupsChanged = true;
              }
            }
          }
        }
        if (lineupsChanged) {
          localStorage.setItem('DEPARTAMENTO_SCOUTING_TEAMS_CUSTOM_LINEUPS_V2', JSON.stringify(currentLineups));
          if (isSupabaseConfigured()) {
            dbSaveSetting('custom_team_lineups', currentLineups).catch(console.error);
          }
        }
      }
    } catch (lineupErr) {
      console.warn('Error purging deleted player from team custom lineups:', lineupErr);
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
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // 1. Competition Filter
    if (matchReportsFilterComp !== 'All') {
      const compValue = (report.competicion || '').toLowerCase();
      const filterValue = matchReportsFilterComp.toLowerCase();
      const normComp = normalize(compValue);
      const normFilter = normalize(filterValue);
      
      let compMatch = false;
      if (normFilter.includes("segunda rfef")) {
        compMatch = normComp.includes("segunda rfef") || normComp.includes("segunda federacion") || normComp.includes("2a rfef") || normComp.includes("2ª");
      } else if (normFilter.includes("primera rfef")) {
        compMatch = normComp.includes("primera rfef") || normComp.includes("primera federacion") || normComp.includes("1a rfef") || normComp.includes("1ª");
      } else if (normFilter.includes("tercera rfef")) {
        compMatch = normComp.includes("tercera rfef") || normComp.includes("tercera federacion") || normComp.includes("3a rfef") || normComp.includes("3ª");
      } else if (normFilter.includes("segunda division")) {
        compMatch = normComp.includes("segunda division") || normComp.includes("la liga hypermotion") || normComp.includes("laliga hypermotion") || normComp.includes("2a division");
      } else {
        compMatch = normComp.includes(normFilter);
      }

      if (!compMatch) return false;
    }

    // 2. Team Filter
    if (matchReportsFilterTeam !== 'All') {
      const normTeamFilter = normalize(matchReportsFilterTeam);
      const normLocal = normalize(report.equipoLocal || '');
      const normVisitante = normalize(report.equipoVisitante || '');
      const normPartido = normalize(report.partido || '');

      const teamMatch = normLocal.includes(normTeamFilter) || normVisitante.includes(normTeamFilter) || normPartido.includes(normTeamFilter);
      if (!teamMatch) return false;
    }

    return true;
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
                DIRECCIÓN DEPORTIVA
              </h1>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="font-mono text-slate-300 font-semibold truncate max-w-[200px]">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="ml-2 p-1 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded transition flex items-center gap-1 cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase hidden sm:inline">Salir</span>
                </button>
              </div>
            </div>
          )}
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
            onClick={() => setActiveTab('plan_semanal')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'plan_semanal'
                ? 'border-blue-500 text-blue-400 bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-800'
            }`}
          >
            <span>📅 Plan Semanal</span>
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

        {activeTab === 'plan_semanal' && (
          <PlanSemanal onBack={() => setActiveTab('inicio')} />
        )}

        {activeTab === 'players' && (
          <>
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
                  onBack={() => setActiveTab('inicio')}
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
            onBack={() => setActiveTab('inicio')}
          />
        )}

        {activeTab === 'matchReports' && (
          <div className="bg-slate-900 border border-slate-850 rounded-lg p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setActiveTab('inicio')}
                className="w-9 h-9 rounded-full border-2 border-slate-700 bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center justify-center shrink-0 shadow-md group active:scale-95 cursor-pointer"
                title="Volver al Inicio"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5] group-hover:-translate-x-0.5 transition-transform text-blue-400" />
              </button>

              <button
                onClick={handleNewMatchReportClick}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-550 text-white rounded text-[10px] font-bold tracking-wider font-mono active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>INSERTAR INFORME DE PARTIDO</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider shrink-0">
                    🔍 Competición:
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

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider shrink-0">
                    🛡️ Equipo:
                  </span>
                  <select
                    value={matchReportsFilterTeam}
                    onChange={(e) => setMatchReportsFilterTeam(e.target.value)}
                    className="bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-100 rounded px-2.5 py-1 text-xs font-semibold font-sans focus:border-blue-500 focus:outline-none transition-all cursor-pointer max-w-[210px] truncate"
                  >
                    <option value="All">-- Todos los Equipos --</option>
                    {availableMatchTeams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider shrink-0">
                Mostrando {filteredMatchReports.length} de {matchReports.length} actas
              </div>
            </div>

            {/* Match Reports List/Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-mono min-w-[700px]">
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
            onOpenPlayerReport={(player) => {
              setReportEditingPlayer(player);
              setIsReportModalOpen(true);
            }}
            onBack={() => setActiveTab('inicio')}
          />
        )}

        {activeTab === 'videoteca' && (
          <VideoLibrary
            players={players}
            showNotification={showNotification}
            onBack={() => setActiveTab('inicio')}
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
