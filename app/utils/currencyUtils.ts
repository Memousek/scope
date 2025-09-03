/**
 * Currency utilities for billing calculations
 * Maps location to default currency and provides conversion rates
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  exchangeRateToCZK: number; // Exchange rate to CZK (base currency)
}

// Mapování zemí na defaultní měny
export const LOCATION_TO_CURRENCY: Record<string, CurrencyInfo> = {
  'CZ': { code: 'CZK', symbol: 'Kč', name: 'Česká koruna', exchangeRateToCZK: 1 },
  'SK': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
  'PL': { code: 'PLN', symbol: 'zł', name: 'Polský zlotý', exchangeRateToCZK: 5.8 },
  'DE': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
  'AT': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
  'HU': { code: 'HUF', symbol: 'Ft', name: 'Maďarský forint', exchangeRateToCZK: 0.007 },
  'GB': { code: 'GBP', symbol: '£', name: 'Britská libra', exchangeRateToCZK: 29.8 },
  'US': { code: 'USD', symbol: '$', name: 'Americký dolar', exchangeRateToCZK: 23.2 },
  'CA': { code: 'CAD', symbol: 'C$', name: 'Kanadský dolar', exchangeRateToCZK: 17.1 },
  'FR': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
  'ES': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
  'IT': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
  'NL': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
  'BE': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
  'SE': { code: 'SEK', symbol: 'kr', name: 'Švédská koruna', exchangeRateToCZK: 2.1 },
  'NO': { code: 'NOK', symbol: 'kr', name: 'Norská koruna', exchangeRateToCZK: 2.2 },
  'FI': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
  'DK': { code: 'DKK', symbol: 'kr', name: 'Dánská koruna', exchangeRateToCZK: 3.4 },
  'PT': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToCZK: 25.5 },
};

/**
 * Získá defaultní měnu pro danou lokaci
 */
export function getDefaultCurrencyForLocation(countryCode: string, subdivisionCode?: string | null): CurrencyInfo {
  // Pro USA a Kanadu můžeme mít specifické regiony s jinými měnami
  if (countryCode === 'US' && subdivisionCode) {
    // Některé US teritoria mají jiné měny
    if (['PR', 'VI'].includes(subdivisionCode)) {
      return { code: 'USD', symbol: '$', name: 'Americký dolar', exchangeRateToCZK: 23.2 };
    }
  }
  
  if (countryCode === 'CA' && subdivisionCode) {
    // Quebec může mít preference pro CAD
    if (subdivisionCode === 'QC') {
      return { code: 'CAD', symbol: 'C$', name: 'Kanadský dolar', exchangeRateToCZK: 17.1 };
    }
  }
  
  return LOCATION_TO_CURRENCY[countryCode.toUpperCase()] || LOCATION_TO_CURRENCY['CZ'];
}

/**
 * Převede částku z jedné měny do druhé
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromInfo = Object.values(LOCATION_TO_CURRENCY).find(c => c.code === fromCurrency);
  const toInfo = Object.values(LOCATION_TO_CURRENCY).find(c => c.code === toCurrency);
  
  if (!fromInfo || !toInfo) return amount;
  
  // Převedeme přes CZK jako základní měnu
  const amountInCZK = amount * fromInfo.exchangeRateToCZK;
  return amountInCZK / toInfo.exchangeRateToCZK;
}

/**
 * Formátuje měnu podle lokace
 */
export function formatCurrencyByLocation(amount: number, currencyCode: string, locale: string = 'cs-CZ'): string {
  const currencyInfo = Object.values(LOCATION_TO_CURRENCY).find(c => c.code === currencyCode);
  if (!currencyInfo) return `${amount} ${currencyCode}`;
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback na jednoduchý formát
    return `${amount} ${currencyInfo.symbol}`;
  }
}

/**
 * Získá seznam dostupných měn pro danou lokaci
 */
export function getAvailableCurrenciesForLocation(countryCode: string): string[] {
  const defaultCurrency = getDefaultCurrencyForLocation(countryCode);
  const currencies = [defaultCurrency.code];
  
  // Přidáme další relevantní měny podle lokace
  if (countryCode === 'CZ' || countryCode === 'SK') {
    currencies.push('EUR', 'USD');
  } else if (countryCode === 'US') {
    currencies.push('EUR', 'CZK');
  } else if (countryCode === 'GB') {
    currencies.push('EUR', 'USD', 'CZK');
  } else if (countryCode === 'DE' || countryCode === 'AT') {
    currencies.push('CZK', 'USD', 'GBP');
  }
  
  return [...new Set(currencies)]; // Odstraníme duplicity
}
