/**
 * Holiday utilities – wraps date-holidays with a simple, cached API.
 */
import Holidays from 'date-holidays';

const cache = new Map<string, Holidays>();

export function getHolidays(country: string = 'CZ', subdivision?: string | null): Holidays {
  const key = `${country.toUpperCase()}${subdivision ? `:${subdivision}` : ''}`;
  if (!cache.has(key)) {
    const hd = subdivision && subdivision.length > 0
      ? new Holidays(country.toUpperCase(), subdivision)
      : new Holidays(country.toUpperCase());
    cache.set(key, hd);
  }
  return cache.get(key)!;
}

export function isHoliday(date: Date, country: string = 'CZ', subdivision?: string | null): boolean {
  return Boolean(getHolidays(country, subdivision).isHoliday(date));
}


