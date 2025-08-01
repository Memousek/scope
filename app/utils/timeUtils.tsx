/**
 * Utility pro formátování času
 * - Převádí datum na relativní čas (např. "2 hodiny zpět")
 * - Podporuje češtinu a angličtinu
 */

import React from 'react';
import { FiFolder, FiEdit3, FiCheckCircle, FiUsers, FiUserMinus, FiCalendar, FiClipboard } from 'react-icons/fi';

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

export function getActivityIcon(type: string): React.ReactElement {
  switch (type) {
    case 'project_created':
      return <FiFolder className="text-2xl" />;
    case 'project_updated':
      return <FiEdit3 className="text-2xl" />;
    case 'project_completed':
      return <FiCheckCircle className="text-2xl" />;
    case 'member_added':
      return <FiUsers className="text-2xl" />;
    case 'member_removed':
      return <FiUserMinus className="text-2xl" />;
    case 'delivery_updated':
      return <FiCalendar className="text-2xl" />;
    default:
      return <FiClipboard className="text-2xl" />;
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