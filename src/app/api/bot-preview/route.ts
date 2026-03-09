// ─── Bot Preview API ────────────────────────────────────────────
// Returns simulated bot messages for the admin dashboard preview.
// Mirrors the exact logic used by bot commands without Telegram dependency.

import { NextResponse } from 'next/server';
import { fetchTodayEvents, fetchAllEventTypesWithSchedule } from '@/domain/event-service';
import { getLocaleStrings } from '@/lib/i18n';
import { APP_CONFIG } from '@/lib/constants';
import {
    convertTime,
    formatDateInTimezone,
    formatTimeInTimezone,
    minutesUntil,
    formatCountdown,
    now,
} from '@/lib/timezone';

interface PreviewMessage {
    readonly command: string;
    readonly label: string;
    readonly content: string;
}

interface SubscribeButton {
    readonly emoji: string;
    readonly name: string;
    readonly scheduleSuffix: string;
}

/**
 * Builds the /events preview message
 */
function buildEventsPreview(
    todayEvents: Awaited<ReturnType<typeof fetchTodayEvents>>,
    timezone: string,
    locale: string
): PreviewMessage {
    const strings = getLocaleStrings(locale);

    if (todayEvents.length === 0) {
        return {
            command: '/events',
            label: '📋 Eventos de Hoy',
            content: strings.bot.noEventsToday,
        };
    }

    const todayStr = formatDateInTimezone(now(), timezone);
    let message = strings.bot.eventListHeader(todayStr);

    for (const event of todayEvents) {
        const e = event as typeof event & { startTime: string; endTime: string };
        const startLocal = convertTime(
            todayStr,
            e.startTime,
            APP_CONFIG.EVENT_SOURCE_TIMEZONE,
            timezone
        );
        const endLocal = convertTime(
            todayStr,
            e.endTime,
            APP_CONFIG.EVENT_SOURCE_TIMEZONE,
            timezone
        );
        message += '\n' + strings.bot.eventRow(e.emoji, e.translatedName, startLocal, endLocal);
    }

    return {
        command: '/events',
        label: '📋 Eventos de Hoy',
        content: message,
    };
}

/**
 * Builds the /next preview message
 */
function buildNextPreview(
    todayEvents: Awaited<ReturnType<typeof fetchTodayEvents>>,
    timezone: string,
    locale: string
): PreviewMessage {
    const strings = getLocaleStrings(locale);

    if (todayEvents.length === 0) {
        return {
            command: '/siguiente',
            label: '⏭️ Próximo Evento',
            content: strings.bot.noEventsToday,
        };
    }

    const currentTime = now();
    const currentCetTime = formatTimeInTimezone(currentTime, APP_CONFIG.EVENT_SOURCE_TIMEZONE);
    const todayStr = formatDateInTimezone(currentTime, APP_CONFIG.EVENT_SOURCE_TIMEZONE);

    const nextEvent = todayEvents.find((event) => {
        const e = event as typeof event & { startTime: string };
        return e.startTime > currentCetTime;
    }) as (typeof todayEvents[0] & { startTime: string; endTime: string }) | undefined;

    if (!nextEvent) {
        return {
            command: '/siguiente',
            label: '⏭️ Próximo Evento',
            content: strings.bot.noUpcomingEvents,
        };
    }

    const startLocal = convertTime(
        todayStr,
        nextEvent.startTime,
        APP_CONFIG.EVENT_SOURCE_TIMEZONE,
        timezone
    );
    const endLocal = convertTime(
        todayStr,
        nextEvent.endTime,
        APP_CONFIG.EVENT_SOURCE_TIMEZONE,
        timezone
    );

    const remainingMinutes = minutesUntil(
        todayStr,
        nextEvent.startTime,
        APP_CONFIG.EVENT_SOURCE_TIMEZONE
    );

    const timeStr = `${startLocal} — ${endLocal}`;
    const countdownSuffix = remainingMinutes > 0
        ? `\n⏳ ${strings.bot.countdown(startLocal, formatCountdown(remainingMinutes))}`
        : '';

    return {
        command: '/siguiente',
        label: '⏭️ Próximo Evento',
        content: strings.bot.nextEvent(nextEvent.translatedName, nextEvent.emoji, timeStr) + countdownSuffix,
    };
}

/**
 * Builds the /subscribe preview (list of buttons)
 */
async function buildSubscribePreview(
    locale: string,
    timezone: string
): Promise<{ message: PreviewMessage; buttons: readonly SubscribeButton[] }> {
    const strings = getLocaleStrings(locale);
    const allTypes = await fetchAllEventTypesWithSchedule(locale);

    const buttons: SubscribeButton[] = allTypes.map((type) => {
        let scheduleSuffix = '';

        if (type.nextStartTime && type.nextEventDate) {
            const startLocal = convertTime(
                type.nextEventDate,
                type.nextStartTime,
                APP_CONFIG.EVENT_SOURCE_TIMEZONE,
                timezone
            );

            const remaining = minutesUntil(
                type.nextEventDate,
                type.nextStartTime,
                APP_CONFIG.EVENT_SOURCE_TIMEZONE
            );

            scheduleSuffix = remaining <= 0
                ? strings.bot.eventLive
                : strings.bot.countdown(startLocal, formatCountdown(remaining));
        }

        return {
            emoji: type.emoji,
            name: type.translatedName,
            scheduleSuffix,
        };
    });

    return {
        message: {
            command: '/subscribe',
            label: '🔔 Suscripciones',
            content: strings.bot.subscribePrompt,
        },
        buttons,
    };
}

export async function GET(): Promise<NextResponse> {
    try {
        const locale = APP_CONFIG.DEFAULT_LOCALE;
        const timezone = APP_CONFIG.DEFAULT_TIMEZONE;

        const todayEvents = await fetchTodayEvents(locale);
        const eventsPreview = buildEventsPreview(todayEvents, timezone, locale);
        const nextPreview = buildNextPreview(todayEvents, timezone, locale);
        const subscribePreview = await buildSubscribePreview(locale, timezone);

        const strings = getLocaleStrings(locale);
        const welcomePreview: PreviewMessage = {
            command: '/start',
            label: '👋 Bienvenida',
            content: strings.bot.welcome('Jugador'),
        };

        const helpPreview: PreviewMessage = {
            command: '/help',
            label: '📖 Ayuda',
            content: strings.bot.help,
        };

        const clearPreview: PreviewMessage = {
            command: '/limpiar',
            label: '🧹 Limpiar',
            content: strings.bot.chatCleared('Jugador'),
        };

        return NextResponse.json({
            ok: true,
            data: {
                previews: [welcomePreview, eventsPreview, nextPreview, clearPreview, helpPreview],
                subscribe: subscribePreview,
                locale,
                timezone,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Bot preview error:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to generate bot preview' },
            { status: 500 }
        );
    }
}
