import { ScoutedPlayer } from '../types';

export const DEFAULT_TEAM_ESCUDOS: Record<string, string> = {
  'FC Barcelona': '/escudos/barcelona.svg',
  'Real Madrid': '/escudos/real-madrid.svg',
  'Athletic Club': '/escudos/athletic-club.svg',
  'Bilbao Athletic': 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1',
  'Bilbao Ath.': 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1',
  'FC Cartagena': '/escudos/cartagena.svg',
  'Real Avilés': 'https://cdn.resfu.com/img_data/equipos/2096.png?size=120x&lossy=1',
  'Real Avilés Industrial': 'https://cdn.resfu.com/img_data/equipos/2096.png?size=120x&lossy=1',
  'Bayern de Múnich': '/escudos/bayern.svg',
  'Bayer Leverkusen': '/escudos/leverkusen.svg',
  'Arsenal FC': '/escudos/arsenal.svg',
  'Manchester City': '/escudos/manchester-city.svg',
  'FC Porto': '/escudos/porto.svg',
  'CF Talavera': '/escudos/talavera.svg',
};

// High-quality generic sports shield placeholder
export const ESCUDO_FALLBACK = '/escudos/default.svg'; // a blurred sports turf texture or we can use custom-designed CSS shield

export function getPlayerEscudoUrl(player: ScoutedPlayer): string {
  const teamNormal = player.equipo?.trim();

  // If team is Real Avilés or Real Avilés Industrial, always return the 2096 logo
  if (teamNormal && (teamNormal === 'Real Avilés' || teamNormal === 'Real Avilés Industrial' || teamNormal.toLowerCase().includes('real avilés') || teamNormal.toLowerCase().includes('real aviles'))) {
    return 'https://cdn.resfu.com/img_data/equipos/2096.png?size=120x&lossy=1';
  }

  // If team is Bilbao Athletic, override the logo explicitly
  if (teamNormal && (teamNormal === 'Bilbao Athletic' || teamNormal === 'Bilbao Ath.')) {
    return 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1';
  }

  if (player.escudoUrl && player.escudoUrl.trim().length > 0) {
    // If it is the old local athletic-club crest, override it for Bilbao
    if (player.escudoUrl.includes('athletic-club.svg') && teamNormal && (teamNormal.toLowerCase().includes('bilbao') || teamNormal.toLowerCase().includes('athletic'))) {
      return 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1';
    }
    return player.escudoUrl.trim();
  }
  
  if (teamNormal && DEFAULT_TEAM_ESCUDOS[teamNormal]) {
    return DEFAULT_TEAM_ESCUDOS[teamNormal];
  }

  // Fallback to a clean inline SVG with initials or simple sport shield
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teamNormal || 'FC')}&radius=10&backgroundColor=1e293b&fontSize=45`;
}

export function getCategoryEscudoUrl(categoria?: string): string {
  const cat = (categoria || '').toLowerCase().trim();
  
  if (cat.includes('segunda rfef') || cat.includes('2ª rfef') || cat.includes('2ª federacion') || cat.includes('segunda federacion') || cat.includes('segunda federación') || cat.includes('2ª federación')) {
    return '/escudos/segunda-federacion.png';
  }
  if (cat.includes('segunda div') || cat.includes('hypermotion') || cat.includes('smartbank') || cat.includes('laliga2') || cat.includes('2ª división') || cat.includes('2ª division')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/LaLiga_Hypermotion_2023_logo.svg/500px-LaLiga_Hypermotion_2023_logo.svg.png';
  }
  if (cat.includes('tercera rfef') || cat.includes('3ª rfef') || cat.includes('3ª federacion') || cat.includes('tercera federacion') || cat.includes('tercera federación') || cat.includes('3ª federación')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Logo_Tercera_Federaci%C3%B3n.png/480px-Logo_Tercera_Federaci%C3%B3n.png';
  }
  if (cat.includes('primera div') || cat.includes('laliga ea') || cat.includes('1ª division') || cat.includes('1ª división')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/LaLiga_EA_Sports_2023_logo.svg/500px-LaLiga_EA_Sports_2023_logo.svg.png';
  }

  // Default / Primera Federación
  return '/escudos/primera-federacion.png';
}
