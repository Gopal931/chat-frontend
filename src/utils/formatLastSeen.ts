/**
 * Formats a user's presence state into a WhatsApp-like last seen string.
 * Uses local viewer timezone and native Date methods.
 */
export function formatLastSeen(
  lastSeenAt?: string | Date | null,
  isOnline?: boolean
): string {
  if (isOnline) return 'Online';
  if (!lastSeenAt) return 'Last seen unavailable';

  const date = typeof lastSeenAt === 'string' ? new Date(lastSeenAt) : lastSeenAt;
  if (!date || isNaN(date.getTime())) return 'Last seen unavailable';

  const now = new Date();

  // Reset hours to compare calendar days in local timezone
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = todayStart.getTime() - targetStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Time string: e.g., "01:04 AM" or "10:32 PM"
  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (diffDays === 0) {
    return `last seen today at ${timeStr}`;
  }

  if (diffDays === 1) {
    return `last seen yesterday at ${timeStr}`;
  }

  if (diffDays > 1 && diffDays < 7) {
    const dayName = date.toLocaleDateString([], { weekday: 'long' });
    return `last seen ${dayName} at ${timeStr}`;
  }

  // Older than 7 days
  const isSameYear = date.getFullYear() === now.getFullYear();
  const dateStr = date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(isSameYear ? {} : { year: 'numeric' }),
  });

  return `last seen ${dateStr} at ${timeStr}`;
}
