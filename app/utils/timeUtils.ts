/**
 * Utility pro formátování času
 * - Převádí datum na relativní čas (např. "2 hodiny zpět")
 * - Podporuje češtinu a angličtinu
 */

export function formatRelativeTime(date: Date, locale: string = 'cs-CZ'): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (locale === 'cs-CZ') {
    if (diffInMinutes < 1) return 'Právě teď';
    if (diffInMinutes < 60) return `${diffInMinutes} minut zpět`;
    if (diffInHours < 24) return `${diffInHours} hodin zpět`;
    if (diffInDays === 1) return '1 den zpět';
    if (diffInDays < 7) return `${diffInDays} dní zpět`;
    return date.toLocaleDateString('cs-CZ');
  } else {
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString('en-US');
  }
}

export function getActivityIcon(type: string): string {
  switch (type) {
    case 'project_created':
      return '🚀';
    case 'project_updated':
      return '📝';
    case 'project_completed':
      return '✅';
    case 'member_added':
      return '👥';
    case 'member_removed':
      return '👋';
    case 'delivery_updated':
      return '📅';
    default:
      return '📋';
  }
}

export function getActivityColor(type: string): string {
  switch (type) {
    case 'project_created':
      return 'bg-blue-500';
    case 'project_updated':
      return 'bg-green-500';
    case 'project_completed':
      return 'bg-green-500';
    case 'member_added':
      return 'bg-blue-500';
    case 'member_removed':
      return 'bg-red-500';
    case 'delivery_updated':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
} 