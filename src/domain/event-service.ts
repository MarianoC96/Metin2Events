// ─── Event Service ──────────────────────────────────────────────
// Domain logic for event management: CRUD, deduplication, queries.
// No direct dependency on Telegram or any external adapter.

import { db } from '@/db/client';
import { events, eventTypes, eventTypeTranslations } from '@/db/schema';
import { eq, and, sql, gte, asc } from 'drizzle-orm';
import { parseEventSchedule, extractUniqueEventTypes, generateSlug } from './event-parser';
import type { EventTypeWithTranslation, EventTypeWithSchedule } from '@/lib/types';
import { APP_CONFIG } from '@/lib/constants';
import { formatDateInTimezone, now } from '@/lib/timezone';

/**
 * Imports events from raw text, handling deduplication of event types.
 * If an event_type already exists (by slug), it is reused.
 * If an event (same type + date + time) already exists, it is skipped.
 * Returns the count of newly created events and the names of new types.
 */
export async function importEventsFromText(text: string): Promise<{
    readonly eventsCreated: number;
    readonly eventsSkipped: number;
    readonly eventTypesCreated: number;
    readonly newEventTypeNames: readonly string[];
}> {
    const schedules = parseEventSchedule(text);
    const uniqueTypes = extractUniqueEventTypes(schedules);

    let eventTypesCreated = 0;
    const newEventTypeNames: string[] = [];

    // Upsert event types (deduplication by slug)
    for (const type of uniqueTypes) {
        const existing = await db
            .select()
            .from(eventTypes)
            .where(eq(eventTypes.slug, type.slug))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(eventTypes).values({
                name: type.name,
                slug: type.slug,
                emoji: type.emoji,
            });
            eventTypesCreated++;
            newEventTypeNames.push(type.name);
        }
    }

    let eventsCreated = 0;
    let eventsSkipped = 0;

    // Insert events, skipping duplicates (same type + date + time)
    for (const day of schedules) {
        for (const event of day.events) {
            const slug = generateSlug(event.eventTypeName);
            const eventType = await db
                .select()
                .from(eventTypes)
                .where(eq(eventTypes.slug, slug))
                .limit(1);

            if (eventType.length === 0) {
                continue;
            }

            const typeId = eventType[0].id;

            const existingEvent = await db
                .select()
                .from(events)
                .where(
                    and(
                        eq(events.eventTypeId, typeId),
                        eq(events.eventDate, day.date),
                        eq(events.startTime, event.startTime),
                        eq(events.endTime, event.endTime)
                    )
                )
                .limit(1);

            if (existingEvent.length > 0) {
                eventsSkipped++;
                continue;
            }

            await db.insert(events).values({
                eventTypeId: typeId,
                eventDate: day.date,
                startTime: event.startTime,
                endTime: event.endTime,
                timezone: event.timezone,
            });
            eventsCreated++;
        }
    }

    return { eventsCreated, eventsSkipped, eventTypesCreated, newEventTypeNames };
}


/**
 * Fetches today's events with typed translations for a given locale.
 */
export async function fetchTodayEvents(
    locale: string = APP_CONFIG.DEFAULT_LOCALE,
    timezone: string = APP_CONFIG.EVENT_SOURCE_TIMEZONE
): Promise<readonly EventTypeWithTranslation[]> {
    const todayStr = formatDateInTimezone(now(), timezone);

    const rows = await db
        .select({
            id: events.id,
            eventTypeId: events.eventTypeId,
            eventDate: events.eventDate,
            startTime: events.startTime,
            endTime: events.endTime,
            eventName: eventTypes.name,
            eventSlug: eventTypes.slug,
            eventEmoji: eventTypes.emoji,
            translatedName: eventTypeTranslations.name,
        })
        .from(events)
        .innerJoin(eventTypes, eq(events.eventTypeId, eventTypes.id))
        .leftJoin(
            eventTypeTranslations,
            and(
                eq(eventTypeTranslations.eventTypeId, eventTypes.id),
                eq(eventTypeTranslations.locale, locale)
            )
        )
        .where(eq(events.eventDate, todayStr))
        .orderBy(events.startTime);

    return rows.map((row) => ({
        id: row.id,
        name: row.eventName,
        slug: row.eventSlug,
        emoji: row.eventEmoji ?? '🎮',
        translatedName: row.translatedName ?? row.eventName,
        startTime: row.startTime,
        endTime: row.endTime,
    }));
}

/**
 * Fetches all distinct event types from the database.
 */
export async function fetchAllEventTypes(locale: string = APP_CONFIG.DEFAULT_LOCALE) {
    const rows = await db
        .select({
            id: eventTypes.id,
            name: eventTypes.name,
            slug: eventTypes.slug,
            emoji: eventTypes.emoji,
            translatedName: eventTypeTranslations.name,
        })
        .from(eventTypes)
        .leftJoin(
            eventTypeTranslations,
            and(
                eq(eventTypeTranslations.eventTypeId, eventTypes.id),
                eq(eventTypeTranslations.locale, locale)
            )
        )
        .orderBy(eventTypes.name);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        emoji: row.emoji ?? '🎮',
        translatedName: row.translatedName ?? row.name,
    }));
}

/**
 * Fetches all event types enriched with their next scheduled occurrence.
 * Used by the subscribe menu to display start time and countdown.
 * Looks for events today or in the future, picking the earliest per type.
 */
export async function fetchAllEventTypesWithSchedule(
    locale: string = APP_CONFIG.DEFAULT_LOCALE
): Promise<readonly EventTypeWithSchedule[]> {
    const todayStr = formatDateInTimezone(now(), APP_CONFIG.EVENT_SOURCE_TIMEZONE);

    // Fetch all event types with translations
    const allTypes = await fetchAllEventTypes(locale);

    // Fetch upcoming events (today and future), ordered by date + start time
    const upcomingEvents = await db
        .select({
            eventTypeId: events.eventTypeId,
            eventDate: events.eventDate,
            startTime: events.startTime,
        })
        .from(events)
        .where(gte(events.eventDate, todayStr))
        .orderBy(asc(events.eventDate), asc(events.startTime));

    // Build a map: eventTypeId → first upcoming occurrence
    const nextOccurrenceMap = new Map<number, { startTime: string; eventDate: string }>();

    for (const event of upcomingEvents) {
        if (nextOccurrenceMap.has(event.eventTypeId)) {
            continue;
        }
        nextOccurrenceMap.set(event.eventTypeId, {
            startTime: event.startTime,
            eventDate: event.eventDate,
        });
    }

    return allTypes.map((type) => {
        const next = nextOccurrenceMap.get(type.id) ?? null;
        return {
            ...type,
            nextStartTime: next?.startTime ?? null,
            nextEventDate: next?.eventDate ?? null,
        };
    });
}

/**
 * Fetches events that start within a given minute window from now.
 * Used by the notification engine.
 */
export async function fetchEventsStartingInMinutes(
    targetMinutes: number,
    toleranceMinutes: number
): Promise<
    readonly {
        id: number;
        eventTypeId: number;
        eventDate: string;
        startTime: string;
        endTime: string;
        eventName: string;
        emoji: string;
    }[]
> {
    const todayStr = formatDateInTimezone(now(), APP_CONFIG.EVENT_SOURCE_TIMEZONE);
    const currentTime = now();

    const allTodayEvents = await db
        .select({
            id: events.id,
            eventTypeId: events.eventTypeId,
            eventDate: events.eventDate,
            startTime: events.startTime,
            endTime: events.endTime,
            timezone: events.timezone,
            eventName: eventTypes.name,
            emoji: eventTypes.emoji,
        })
        .from(events)
        .innerJoin(eventTypes, eq(events.eventTypeId, eventTypes.id))
        .where(eq(events.eventDate, todayStr));

    // Filter events that start within the target window
    return allTodayEvents.filter((event) => {
        const [hours, minutes] = event.startTime.split(':').map(Number);
        const eventDate = new Date(event.eventDate + 'T00:00:00Z');

        // Build event time in CET
        const cetFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Berlin',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const currentCetTime = cetFormatter.format(currentTime);
        const [currentHours, currentMinutes] = currentCetTime.split(':').map(Number);

        const eventMinutesFromMidnight = hours * 60 + minutes;
        const currentMinutesFromMidnight = currentHours * 60 + currentMinutes;
        const diff = eventMinutesFromMidnight - currentMinutesFromMidnight;

        return diff >= (targetMinutes - toleranceMinutes) && diff <= (targetMinutes + toleranceMinutes);
    }).map((event) => ({
        id: event.id,
        eventTypeId: event.eventTypeId,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        eventName: event.eventName,
        emoji: event.emoji ?? '🎮',
    }));
}

/**
 * Returns the total count of events in the database.
 */
export async function countEvents(): Promise<number> {
    const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(events);
    return result[0]?.count ?? 0;
}

/**
 * Returns total count of event types.
 */
export async function countEventTypes(): Promise<number> {
    const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventTypes);
    return result[0]?.count ?? 0;
}
