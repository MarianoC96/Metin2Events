// ─── /next Command Handler ──────────────────────────────────────
// Shows the next upcoming event for today.

import type { Bot } from 'grammy';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchTodayEvents } from '@/domain/event-service';
import { getLocaleStrings } from '@/lib/i18n';
import { APP_CONFIG } from '@/lib/constants';
import { convertTime, formatDateInTimezone, formatTimeInTimezone, now } from '@/lib/timezone';

export function registerNextCommand(bot: Bot): void {
    bot.command('next', async (ctx) => {
        const telegramId = String(ctx.from?.id);
        const user = await db
            .select()
            .from(users)
            .where(eq(users.telegramId, telegramId))
            .limit(1);

        const locale = user[0]?.locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const timezone = user[0]?.timezone ?? APP_CONFIG.DEFAULT_TIMEZONE;
        const strings = getLocaleStrings(locale);

        const todayEvents = await fetchTodayEvents(locale);

        if (todayEvents.length === 0) {
            await ctx.reply(strings.bot.noEventsToday);
            return;
        }

        const currentTime = now();
        const currentCetTime = formatTimeInTimezone(currentTime, APP_CONFIG.EVENT_SOURCE_TIMEZONE);
        const todayStr = formatDateInTimezone(currentTime, APP_CONFIG.EVENT_SOURCE_TIMEZONE);

        // Find first event that hasn't started yet in CET
        const nextEvent = todayEvents.find((event) => {
            const e = event as typeof event & { startTime: string };
            return e.startTime > currentCetTime;
        }) as (typeof todayEvents[0] & { startTime: string; endTime: string }) | undefined;

        if (!nextEvent) {
            await ctx.reply(strings.bot.noUpcomingEvents);
            return;
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

        const timeStr = `${startLocal} — ${endLocal}`;
        await ctx.reply(
            strings.bot.nextEvent(nextEvent.translatedName, nextEvent.emoji, timeStr),
            { parse_mode: 'Markdown' }
        );
    });
}
