// ─── Internationalization Engine ────────────────────────────────
// Resolves locale strings for a given user locale.
// Bot UI strings come from static locale files.
// Event names come from the database (event_type_translations).

import es from './locales/es';
import en from './locales/en';
import type { LocaleStrings } from './locales/types';
import { APP_CONFIG } from './constants';
import type { SupportedLocale } from './constants';

const LOCALE_MAP: Record<SupportedLocale, LocaleStrings> = {
    es,
    en,
    pt: es, // Fallback to Spanish until Portuguese locale is added
};

/**
 * Returns the locale strings for a given locale code.
 * Falls back to the default locale if the requested one is not available.
 */
export function getLocaleStrings(locale: string): LocaleStrings {
    const resolved = LOCALE_MAP[locale as SupportedLocale];
    if (resolved) {
        return resolved;
    }
    return LOCALE_MAP[APP_CONFIG.DEFAULT_LOCALE];
}

export type { LocaleStrings };
