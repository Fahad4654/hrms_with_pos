import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

interface LocaleContextType {
  country: string;
  timezone: string;
  currency: string;
  formatDate: (date: string | Date | null | undefined) => string;
  formatTime: (date: string | Date | null | undefined) => string;
  formatDateTime: (date: string | Date | null | undefined) => string;
  formatCurrency: (amount: number | string | null | undefined) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  country: 'US',
  timezone: 'America/New_York',
  currency: 'USD',
  formatDate: (d) => d ? new Date(d).toLocaleDateString() : '--',
  formatTime: (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
  formatDateTime: (d) => d ? new Date(d).toLocaleString() : '--',
  formatCurrency: (a) => `$${Number(a || 0).toFixed(2)}`,
});

// Map country code to IANA locale (BCP 47)
// Uses Intl.Locale if available, otherwise maps common codes
function countryToLocale(country: string): string {
  const map: Record<string, string> = {
    US: 'en-US',
    GB: 'en-GB',
    AU: 'en-AU',
    CA: 'en-CA',
    IN: 'en-IN',
    PK: 'en-PK',
    BD: 'en-BD',
    DE: 'de-DE',
    FR: 'fr-FR',
    ES: 'es-ES',
    IT: 'it-IT',
    JP: 'ja-JP',
    CN: 'zh-CN',
    KR: 'ko-KR',
    AE: 'ar-AE',
    SA: 'ar-SA',
    BR: 'pt-BR',
    RU: 'ru-RU',
    MX: 'es-MX',
    TR: 'tr-TR',
    ID: 'id-ID',
    NL: 'nl-NL',
    PL: 'pl-PL',
    SE: 'sv-SE',
    NO: 'nb-NO',
    DK: 'da-DK',
    FI: 'fi-FI',
    ZA: 'en-ZA',
    NG: 'en-NG',
    EG: 'ar-EG',
    MY: 'ms-MY',
    SG: 'en-SG',
    TH: 'th-TH',
    PH: 'en-PH',
  };
  return map[country] || 'en-US';
}

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [country, setCountry] = useState('US');
  const [timezone, setTimezone] = useState('America/New_York');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/settings/company').then(res => {
        if (res.data.country) setCountry(res.data.country);
        if (res.data.timezone) setTimezone(res.data.timezone);
        if (res.data.currency) setCurrency(res.data.currency);
      }).catch(() => {}); // Silently fail - use defaults
    }
  }, []);

  const locale = countryToLocale(country);

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '--';
    try {
      return new Date(date).toLocaleDateString(locale, { timeZone: timezone, year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return new Date(date).toLocaleDateString(); }
  };

  const formatTime = (date: string | Date | null | undefined): string => {
    if (!date) return '--';
    try {
      return new Date(date).toLocaleTimeString(locale, { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
    } catch { return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  };

  const formatDateTime = (date: string | Date | null | undefined): string => {
    if (!date) return '--';
    try {
      return new Date(date).toLocaleString(locale, { timeZone: timezone, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return new Date(date).toLocaleString(); }
  };

  const formatCurrency = (amount: number | string | null | undefined): string => {
    const value = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
      }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  };

  return (
    <LocaleContext.Provider value={{ country, timezone, currency, formatDate, formatTime, formatDateTime, formatCurrency }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);
