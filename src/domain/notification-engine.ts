// ─── Notification Engine ────────────────────────────────────────
// Core logic executed by Vercel cron every 5 minutes.
// Finds upcoming events, resolves subscribed users, sends alerts,
// and logs to prevent duplicates.

import { db } from '@/db/client';
import { notificationLog, eventTypeTranslations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { fetchEventsStartingInMinutes } from './event-service';
import { fetchSubscribedUsers } from './subscription-service';
import { NOTIFICATION_WINDOWS, ALERT_TYPES, APP_CONFIG } from '@/lib/constants';
import { getLocaleStrings } from '@/lib/i18n';
import { convertTime } from '@/lib/timezone';
import type { ITelegramBotAdapter } from '@/lib/types';

interface NotificationResult {
    readonly alertsSent: number;
    readonly alertsSkipped: number;
    readonly errors: number;
}

/**
 * Main entry point for the notification cron job.
 * Checks both 30min and 5min windows and sends alerts.
 */
export async function processNotifications(
    botAdapter: ITelegramBotAdapter
): Promise<NotificationResult> {
    const thirtyMinResult = await processAlertWindow(
        botAdapter,
        NOTIFICATION_WINDOWS.FIRST_ALERT_MINUTES,
        ALERT_TYPES.THIRTY_MIN
    );

    const fiveMinResult = await processAlertWindow(
        botAdapter,
        NOTIFICATION_WINDOWS.SECOND_ALERT_MINUTES,
        ALERT_TYPES.FIVE_MIN
    );

    return {
        alertsSent: thirtyMinResult.alertsSent + fiveMinResult.alertsSent,
        alertsSkipped: thirtyMinResult.alertsSkipped + fiveMinResult.alertsSkipped,
        errors: thirtyMinResult.errors + fiveMinResult.errors,
    };
}

/**
 * Processes a single alert window (e.g., 30min or 5min).
 */
async function processAlertWindow(
    botAdapter: ITelegramBotAdapter,
    targetMinutes: number,
    alertType: string
): Promise<NotificationResult> {
    let alertsSent = 0;
    let alertsSkipped = 0;
    let errors = 0;

    const upcomingEvents = await fetchEventsStartingInMinutes(
        targetMinutes,
        NOTIFICATION_WINDOWS.TOLERANCE_MINUTES
    );

    for (const event of upcomingEvents) {
        const subscribedUsers = await fetchSubscribedUsers(event.eventTypeId);

        for (const user of subscribedUsers) {
            const alreadySent = await hasNotificationBeenSent(
                user.userId,
                event.id,
                alertType
            );

            if (alreadySent) {
                alertsSkipped++;
                continue;
            }

            try {
                const message = await buildNotificationMessage(
                    event,
                    alertType,
                    user.locale ?? APP_CONFIG.DEFAULT_LOCALE,
                    user.timezone ?? APP_CONFIG.DEFAULT_TIMEZONE
                );

                await botAdapter.sendMessage(user.telegramId, message, {
                    parseMode: 'MarkdownV2',
                });

                await logNotification(user.userId, event.id, alertType);
                alertsSent++;
            } catch (error) {
                console.error(
                    `Failed to send notification to user ${user.telegramId} for event ${event.id}:`,
                    error
                );
                errors++;
            }
        }
    }

    return { alertsSent, alertsSkipped, errors };
}

/**
 * Checks if a notification was already sent for this user/event/alert combo.
 */
async function hasNotificationBeenSent(
    userId: number,
    eventId: number,
    alertType: string
): Promise<boolean> {
    const existing = await db
        .select()
        .from(notificationLog)
        .where(
            and(
                eq(notificationLog.userId, userId),
                eq(notificationLog.eventId, eventId),
                eq(notificationLog.alertType, alertType)
            )
        )
        .limit(1);

    return existing.length > 0;
}

/**
 * Records a sent notification to prevent duplicates.
 */
async function logNotification(
    userId: number,
    eventId: number,
    alertType: string
): Promise<void> {
    await db.insert(notificationLog).values({
        userId,
        eventId,
        alertType,
    });
}

/**
 * Builds the notification message in the user's locale.
 * Converts event times from CET to the user's timezone.
 */
async function buildNotificationMessage(
    event: {
        id: number;
        eventTypeId: number;
        eventDate: string;
        startTime: string;
        endTime: string;
        eventName: string;
        emoji: string;
    },
    alertType: string,
    locale: string,
    userTimezone: string
): Promise<string> {
    const strings = getLocaleStrings(locale);

    // Try to get translated event name
    const translation = await db
        .select()
        .from(eventTypeTranslations)
        .where(
            and(
                eq(eventTypeTranslations.eventTypeId, event.eventTypeId),
                eq(eventTypeTranslations.locale, locale)
            )
        )
        .limit(1);

    const displayName = translation.length > 0
        ? translation[0].name
        : event.eventName;

    // Convert times from CET to user's timezone
    const startLocal = convertTime(
        event.eventDate,
        event.startTime,
        APP_CONFIG.EVENT_SOURCE_TIMEZONE,
        userTimezone
    );
    const endLocal = convertTime(
        event.eventDate,
        event.endTime,
        APP_CONFIG.EVENT_SOURCE_TIMEZONE,
        userTimezone
    );

    const escapedName = escapeMarkdownV2(displayName);
    const escapedEmoji = event.emoji;
    const escapedStart = escapeMarkdownV2(startLocal);
    const escapedEnd = escapeMarkdownV2(endLocal);

    if (alertType === ALERT_TYPES.THIRTY_MIN) {
        return strings.notifications.alert30min(escapedEmoji, escapedName, escapedStart, escapedEnd);
    }
    return strings.notifications.alert5min(escapedEmoji, escapedName, escapedStart, escapedEnd);
}

/**
 * Escapes special characters for Telegram MarkdownV2 format.
 */
function escapeMarkdownV2(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
