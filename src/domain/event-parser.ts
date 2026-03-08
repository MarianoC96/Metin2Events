// ─── Event Text Parser ──────────────────────────────────────────
// Parses the weekly event schedule from plain text format
// into structured objects for database insertion.
// Handles deduplication of event types.

import type { ParsedEvent, ParsedDaySchedule } from '@/lib/types';
import { EVENT_EMOJIS } from '@/lib/constants';

/**
 * Regex to match event lines in the format:
 * "Event Name HH:MM (TZ) - HH:MM (TZ)"
 * Also handles variations like "HH:MM(TZ)" without space
 */
const EVENT_LINE_REGEX = /^(.+?)\s+(\d{2}:\d{2})\s*\(?(\w+)\)?\s*-\s*(\d{2}:\d{2})\s*\(?(\w+)\)?$/;

/**
 * Regex to match date headers: "DD.MM.YYYY"
 */
const DATE_HEADER_REGEX = /^(\d{2})\.(\d{2})\.(\d{4})$/;

/**
 * Parses a full multi-day event schedule text into structured data.
 * Input format:
 *   06.03.2026
 *   Double Drop Soul Stone 09:00 (CET) - 10:00 (CET)
 *   ...
 */
export function parseEventSchedule(text: string): readonly ParsedDaySchedule[] {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const days: ParsedDaySchedule[] = [];
    let currentDate: string | null = null;
    let currentEvents: ParsedEvent[] = [];

    for (const line of lines) {
        const dateMatch = line.match(DATE_HEADER_REGEX);
        if (dateMatch) {
            if (currentDate && currentEvents.length > 0) {
                days.push({ date: currentDate, events: [...currentEvents] });
            }
            const [, day, month, year] = dateMatch;
            currentDate = `${year}-${month}-${day}`;
            currentEvents = [];
            continue;
        }

        if (!currentDate) {
            continue;
        }

        const eventMatch = line.match(EVENT_LINE_REGEX);
        if (eventMatch) {
            const [, rawName, startTime, startTz, endTime] = eventMatch;
            const eventTypeName = normalizeEventName(rawName);
            currentEvents.push({
                eventTypeName,
                startTime,
                endTime,
                timezone: startTz.toUpperCase(),
            });
        }
    }

    if (currentDate && currentEvents.length > 0) {
        days.push({ date: currentDate, events: [...currentEvents] });
    }

    return days;
}

/**
 * Extracts unique event type names from parsed schedules.
 * Used for deduplication when inserting into event_types table.
 */
export function extractUniqueEventTypes(
    schedules: readonly ParsedDaySchedule[]
): readonly { name: string; slug: string; emoji: string }[] {
    const seen = new Set<string>();
    const result: { name: string; slug: string; emoji: string }[] = [];

    for (const day of schedules) {
        for (const event of day.events) {
            const slug = generateSlug(event.eventTypeName);
            if (seen.has(slug)) {
                continue;
            }
            seen.add(slug);
            result.push({
                name: event.eventTypeName,
                slug,
                emoji: resolveEmoji(slug),
            });
        }
    }

    return result;
}

/**
 * Normalizes event names for consistent storage.
 * Trims whitespace, collapses multiple spaces, title-cases.
 */
function normalizeEventName(raw: string): string {
    return raw
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\+$/, '+')
        .replace(/\s\+$/, '+');
}

/**
 * Generates a URL-safe slug from an event name.
 * "Double Drop Soul Stone" → "double-drop-soul-stone"
 */
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/\+/g, '-plus')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Resolves an emoji for an event based on its slug.
 * Matches against known category prefixes.
 */
function resolveEmoji(slug: string): string {
    for (const [prefix, emoji] of Object.entries(EVENT_EMOJIS)) {
        if (slug.startsWith(prefix)) {
            return emoji;
        }
    }
    return '🎮';
}
