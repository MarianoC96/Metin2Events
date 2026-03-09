import { APP_CONFIG } from './constants';

// ─── Timezone Utilities ─────────────────────────────────────────
// Converts between CET (event source) and user timezones.
// Uses Intl.DateTimeFormat for native timezone support without heavy libs.

/**
 * Builds a full Date object from a date string and a time string in a given timezone.
 * Example: buildDateInTimezone('2026-03-08', '09:00', 'CET') → Date in CET
 */
export function buildDateInTimezone(
    dateStr: string,
    timeStr: string,
    timezone: string
): Date {
    const ianaTimezone = resolveTimezone(timezone);
    const dateTimeStr = `${dateStr}T${timeStr}:00`;

    const tempDate = new Date(dateTimeStr);

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: ianaTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(tempDate);
    const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
        parts.find((p) => p.type === type)?.value ?? '00';

    const offsetDate = new Date(
        `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}`
    );

    const diffMs = offsetDate.getTime() - tempDate.getTime();
    return new Date(tempDate.getTime() - diffMs);
}

/**
 * Converts a time string from one timezone to another.
 * Returns the time in HH:mm format.
 */
export function convertTime(
    dateStr: string,
    timeStr: string,
    fromTimezone: string,
    toTimezone: string
): string {
    const date = buildDateInTimezone(dateStr, timeStr, fromTimezone);
    return formatTimeInTimezone(date, toTimezone);
}

/**
 * Gets the current time formatted in a specific timezone.
 */
export function formatTimeInTimezone(date: Date, timezone: string): string {
    const ianaTimezone = resolveTimezone(timezone);
    return date.toLocaleTimeString('en-GB', {
        timeZone: ianaTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/**
 * Gets the current date string (YYYY-MM-DD) in a specific timezone.
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
    const ianaTimezone = resolveTimezone(timezone);
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: ianaTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
}

/**
 * Returns current time as Date.
 */
export function now(): Date {
    return new Date();
}

/**
 * Calculates minutes difference between now and a target time in a timezone.
 * Positive = target is in the future; Negative = target has passed.
 */
export function minutesUntil(
    dateStr: string,
    timeStr: string,
    timezone: string
): number {
    const targetDate = buildDateInTimezone(dateStr, timeStr, timezone);
    const diffMs = targetDate.getTime() - Date.now();
    return Math.round(diffMs / 60_000);
}

/**
 * Formats a total-minutes value into a compact countdown string.
 * Examples: 185 → '3h 05min', 12 → '12min', 0 → '0min'
 * Negative values return '0min' (already started).
 */
export function formatCountdown(totalMinutes: number): string {
    const clamped = Math.max(0, totalMinutes);
    const hours = Math.floor(clamped / 60);
    const minutes = clamped % 60;

    if (hours === 0) {
        return `${minutes}min`;
    }
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${hours}h ${paddedMinutes}min`;
}

/**
 * Resolves shorthand timezone names to IANA identifiers.
 * CET → Europe/Berlin (canonical IANA for Central European Time)
 */
function resolveTimezone(tz: string): string {
    const TIMEZONE_MAP: Record<string, string> = {
        CET: 'Europe/Berlin',
        CEST: 'Europe/Berlin',
        PET: APP_CONFIG.DEFAULT_TIMEZONE,
    };
    return TIMEZONE_MAP[tz.toUpperCase()] ?? tz;
}
