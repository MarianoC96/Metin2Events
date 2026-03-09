// ─── New Event Types Notifier ───────────────────────────────────
// Detects newly-created event types after an import and notifies
// all active users so they can subscribe to them.
// Depends on the Telegram adapter interface for decoupling.

import { db } from '@/db/client';
import { users, eventTypes, eventTypeTranslations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { APP_CONFIG } from '@/lib/constants';
import { getLocaleStrings } from '@/lib/i18n';
import type { ITelegramBotAdapter } from '@/lib/types';

interface NewEventTypeInfo {
    readonly id: number;
    readonly name: string;
    readonly emoji: string;
}

interface NotifyNewTypesResult {
    readonly usersNotified: number;
    readonly errors: number;
}

/**
 * Fetches translated name for an event type in a given locale.
 * Falls back to the original English name if no translation exists.
 */
async function resolveTranslatedName(
    eventTypeId: number,
    originalName: string,
    locale: string
): Promise<string> {
    const translation = await db
        .select()
        .from(eventTypeTranslations)
        .where(
            and(
                eq(eventTypeTranslations.eventTypeId, eventTypeId),
                eq(eventTypeTranslations.locale, locale)
            )
        )
        .limit(1);

    return translation.length > 0 ? translation[0].name : originalName;
}

/**
 * Notifies all active users about newly-added event types.
 * Each user receives the message in their configured locale.
 */
export async function notifyUsersAboutNewEventTypes(
    botAdapter: ITelegramBotAdapter,
    newTypeNames: readonly string[]
): Promise<NotifyNewTypesResult> {
    if (newTypeNames.length === 0) {
        return { usersNotified: 0, errors: 0 };
    }

    // Resolve the new event types from the database
    const newTypes: NewEventTypeInfo[] = [];
    for (const name of newTypeNames) {
        const found = await db
            .select()
            .from(eventTypes)
            .where(eq(eventTypes.name, name))
            .limit(1);

        if (found.length > 0) {
            newTypes.push({
                id: found[0].id,
                name: found[0].name,
                emoji: found[0].emoji ?? '🎮',
            });
        }
    }

    if (newTypes.length === 0) {
        return { usersNotified: 0, errors: 0 };
    }

    // Fetch all active users
    const activeUsers = await db
        .select({
            telegramId: users.telegramId,
            locale: users.locale,
        })
        .from(users)
        .where(eq(users.isActive, true));

    let usersNotified = 0;
    let errors = 0;

    for (const user of activeUsers) {
        const locale = user.locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const strings = getLocaleStrings(locale);

        // Build the list of new event names, translated
        const translatedNames: string[] = [];
        for (const type of newTypes) {
            const translated = await resolveTranslatedName(type.id, type.name, locale);
            translatedNames.push(`${type.emoji} ${translated}`);
        }

        const eventList = translatedNames.join('\n');
        const message = strings.bot.newEventsAlert(eventList, newTypes.length);

        try {
            await botAdapter.sendMessage(user.telegramId, message, {
                parseMode: 'Markdown',
            });
            usersNotified++;
        } catch (error) {
            console.error(
                `Failed to notify user ${user.telegramId} about new event types:`,
                error
            );
            errors++;
        }
    }

    return { usersNotified, errors };
}
