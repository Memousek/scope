/**
 * Time Tracking Utilities
 * Supports Jira-style time tracking formats like "1d 2h 30m", "2h", "45m", etc.
 */

/**
 * Parses time tracking string and converts it to hours
 * Supports formats: "1d 2h 30m", "2h", "45m", "1.5h", "90m", etc.
 * @param timeString - Time tracking string (e.g., "1d 2h 30m")
 * @returns Hours as number (e.g., 10.5 for "1d 2h 30m")
 */
export function parseTimeTracking(timeString: string): number {
  if (!timeString || typeof timeString !== 'string') {
    return 0;
  }

  // Remove extra spaces and convert to lowercase
  const cleanString = timeString.trim().toLowerCase();
  
  // If it's already a number, return it
  if (/^\d+(\.\d+)?$/.test(cleanString)) {
    return parseFloat(cleanString);
  }

  let totalHours = 0;

  // Parse days (d)
  const dayMatch = cleanString.match(/(\d+(?:\.\d+)?)\s*d/);
  if (dayMatch) {
    totalHours += parseFloat(dayMatch[1]) * 8; // 1 day = 8 hours
  }

  // Parse hours (h)
  const hourMatch = cleanString.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hourMatch) {
    totalHours += parseFloat(hourMatch[1]);
  }

  // Parse minutes (m)
  const minuteMatch = cleanString.match(/(\d+(?:\.\d+)?)\s*m/);
  if (minuteMatch) {
    totalHours += parseFloat(minuteMatch[1]) / 60; // Convert minutes to hours
  }

  // If no units found but contains numbers, treat as hours
  if (totalHours === 0 && /\d/.test(cleanString)) {
    const numberMatch = cleanString.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      totalHours = parseFloat(numberMatch[1]);
    }
  }

  return Math.round(totalHours * 100) / 100; // Round to 2 decimal places
}

/**
 * Formats hours back to time tracking string
 * @param hours - Hours as number
 * @returns Formatted time string (e.g., "1d 2h 30m")
 */
export function formatTimeTracking(hours: number): string {
  if (hours === 0) return '0h';
  
  const days = Math.floor(hours / 8);
  const remainingHours = hours % 8;
  const hourPart = Math.floor(remainingHours);
  const minutePart = Math.round((remainingHours - hourPart) * 60);
  
  const parts: string[] = [];
  
  if (days > 0) parts.push(`${days}d`);
  if (hourPart > 0) parts.push(`${hourPart}h`);
  if (minutePart > 0) parts.push(`${minutePart}m`);
  
  return parts.join(' ') || '0h';
}

/**
 * Validates if a time tracking string is valid
 * @param timeString - Time tracking string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimeTracking(timeString: string): boolean {
  if (!timeString || typeof timeString !== 'string') return false;
  
  const cleanString = timeString.trim().toLowerCase();
  
  // Allow pure numbers
  if (/^\d+(\.\d+)?$/.test(cleanString)) return true;
  
  // Allow time tracking format
  const timeTrackingRegex = /^(\d+(?:\.\d+)?\s*[dhm]\s*)*$/;
  return timeTrackingRegex.test(cleanString);
}

/**
 * Examples of valid time tracking formats
 */
export const TIME_TRACKING_EXAMPLES = [
  '1d',      // 1 day (8 hours)
  '2h',      // 2 hours
  '30m',     // 30 minutes
  '1d 2h',   // 1 day 2 hours (10 hours)
  '1d 2h 30m', // 1 day 2 hours 30 minutes (10.5 hours)
  '1.5h',    // 1.5 hours
  '90m',     // 90 minutes (1.5 hours)
  '8',       // 8 hours (pure number)
  '0.5',     // 0.5 hours (pure number)
];
