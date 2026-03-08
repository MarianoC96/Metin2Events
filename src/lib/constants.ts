// ─── Design Tokens & Application Constants ─────────────────────
// All magic values are centralized here to prevent hardcoding.

export const APP_CONFIG = {
    NAME: 'Metin2 Events Bot',
    DEFAULT_LOCALE: 'es' as const,
    DEFAULT_TIMEZONE: 'America/Lima' as const,
    EVENT_SOURCE_TIMEZONE: 'CET' as const,
} as const;

export const NOTIFICATION_WINDOWS = {
    FIRST_ALERT_MINUTES: 30,
    SECOND_ALERT_MINUTES: 5,
    CRON_INTERVAL_MINUTES: 5,
    /** Tolerance window in minutes for matching events to cron ticks */
    TOLERANCE_MINUTES: 3,
} as const;

export const ALERT_TYPES = {
    THIRTY_MIN: '30min',
    FIVE_MIN: '5min',
} as const;

export const SUPPORTED_LOCALES = ['es', 'en', 'pt'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
    es: '🇪🇸',
    en: '🇺🇸',
    pt: '🇧🇷',
};

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
    es: 'Español',
    en: 'English',
    pt: 'Português',
};

/** Emojis for event type categories */
export const EVENT_EMOJIS: Record<string, string> = {
    'double-drop': '💎',
    'chaos-stone': '🌀',
    'hexagonal-chest': '📦',
    'mining': '⛏️',
    'moonlight': '🌙',
    'jigsaw': '🧩',
    'dungeon': '🏰',
    'maps-leaders': '👑',
} as const;
