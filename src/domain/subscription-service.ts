// ─── Subscription Service ───────────────────────────────────────
// Domain logic for managing user subscriptions to event types.

import { db } from '@/db/client';
import { subscriptions, eventTypes, eventTypeTranslations, users } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { APP_CONFIG } from '@/lib/constants';

/**
 * Subscribes a user to a specific event type.
 * Returns false if already subscribed.
 */
export async function subscribeToEventType(
    userId: number,
    eventTypeId: number
): Promise<boolean> {
    const existing = await db
        .select()
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.eventTypeId, eventTypeId),
                eq(subscriptions.isActive, true)
            )
        )
        .limit(1);

    if (existing.length > 0) {
        return false;
    }

    // Reactivate if previously deactivated
    const inactive = await db
        .select()
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.eventTypeId, eventTypeId)
            )
        )
        .limit(1);

    if (inactive.length > 0) {
        await db
            .update(subscriptions)
            .set({ isActive: true })
            .where(eq(subscriptions.id, inactive[0].id));
        return true;
    }

    await db.insert(subscriptions).values({
        userId,
        eventTypeId,
    });
    return true;
}

/**
 * Unsubscribes a user from a specific event type.
 */
export async function unsubscribeFromEventType(
    userId: number,
    eventTypeId: number
): Promise<boolean> {
    const existing = await db
        .select()
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.eventTypeId, eventTypeId),
                eq(subscriptions.isActive, true)
            )
        )
        .limit(1);

    if (existing.length === 0) {
        return false;
    }

    await db
        .update(subscriptions)
        .set({ isActive: false })
        .where(eq(subscriptions.id, existing[0].id));

    return true;
}

/**
 * Subscribes a user to ALL event types.
 */
export async function subscribeToAll(userId: number): Promise<number> {
    const allTypes = await db.select().from(eventTypes);
    let count = 0;

    for (const type of allTypes) {
        const wasSubscribed = await subscribeToEventType(userId, type.id);
        if (wasSubscribed) {
            count++;
        }
    }

    return count;
}

/**
 * Unsubscribes a user from ALL event types.
 */
export async function unsubscribeFromAll(userId: number): Promise<number> {
    const activeSubs = await db
        .select()
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.isActive, true)
            )
        );

    for (const sub of activeSubs) {
        await db
            .update(subscriptions)
            .set({ isActive: false })
            .where(eq(subscriptions.id, sub.id));
    }

    return activeSubs.length;
}

/**
 * Fetches user's active subscriptions with event type info.
 */
export async function fetchUserSubscriptions(userId: number, locale: string = APP_CONFIG.DEFAULT_LOCALE) {
    const rows = await db
        .select({
            subscriptionId: subscriptions.id,
            eventTypeId: eventTypes.id,
            eventName: eventTypes.name,
            eventSlug: eventTypes.slug,
            eventEmoji: eventTypes.emoji,
            translatedName: eventTypeTranslations.name,
        })
        .from(subscriptions)
        .innerJoin(eventTypes, eq(subscriptions.eventTypeId, eventTypes.id))
        .leftJoin(
            eventTypeTranslations,
            and(
                eq(eventTypeTranslations.eventTypeId, eventTypes.id),
                eq(eventTypeTranslations.locale, locale)
            )
        )
        .where(
            and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.isActive, true)
            )
        )
        .orderBy(eventTypes.name);

    return rows.map((row) => ({
        subscriptionId: row.subscriptionId,
        eventTypeId: row.eventTypeId,
        name: row.eventName,
        slug: row.eventSlug,
        emoji: row.eventEmoji ?? '🎮',
        translatedName: row.translatedName ?? row.eventName,
    }));
}

/**
 * Fetches users subscribed to a specific event type.
 */
export async function fetchSubscribedUsers(eventTypeId: number) {
    const rows = await db
        .select({
            userId: users.id,
            telegramId: users.telegramId,
            locale: users.locale,
            timezone: users.timezone,
        })
        .from(subscriptions)
        .innerJoin(users, eq(subscriptions.userId, users.id))
        .where(
            and(
                eq(subscriptions.eventTypeId, eventTypeId),
                eq(subscriptions.isActive, true),
                eq(users.isActive, true)
            )
        );

    return rows;
}

/**
 * Checks if a user is subscribed to a specific event type.
 */
export async function isSubscribed(userId: number, eventTypeId: number): Promise<boolean> {
    const existing = await db
        .select()
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.eventTypeId, eventTypeId),
                eq(subscriptions.isActive, true)
            )
        )
        .limit(1);

    return existing.length > 0;
}
