import { ScoutedPlayer } from '../types';

export const DEFAULT_TEAM_ESCUDOS: Record<string, string> = {
  'FC Barcelona': '/escudos/barcelona.svg',
  'Real Madrid': '/escudos/real-madrid.svg',
  'Athletic Club': '/escudos/athletic-club.svg',
  'Bilbao Athletic': 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1',
  'Bilbao Ath.': 'https://cdn.resfu.com/img_data/equipos/348.png?size=120x&lossy=1',
  'FC Cartagena': '/escudos/cartagena.svg',
  'Real Avilés': '/escudos/real-aviles.svg',
  'Real Avilés Industrial': '/escudos/real-aviles.svg',
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
