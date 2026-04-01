import type { ActivityEvent } from './activity-actions';

export function getEventLabel(event: ActivityEvent): { action: string; gradient: string } {
  switch (event.event_type) {
    case 'session_joined':
      return { action: 'a rejoint une sortie', gradient: 'from-neon-400 to-teal-500' };
    case 'session_created':
      return { action: 'a créé un run', gradient: 'from-pink-400 to-purple-500' };
    case 'friend_accepted':
      return { action: 'a rejoint la communauté', gradient: 'from-blue-400 to-indigo-500' };
    case 'badge_earned':
      return { action: 'a obtenu un badge', gradient: 'from-yellow-400 to-orange-500' };
    case 'team_joined':
      return { action: 'a rejoint une équipe', gradient: 'from-purple-400 to-pink-500' };
    default:
      return { action: 'a été actif', gradient: 'from-silver-400 to-slate-500' };
  }
}

export function getEventTimeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1)  return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1)   return 'Hier';
  return `Il y a ${days}j`;
}
