// ─── /events Command Handler ────────────────────────────────────
// Shows today's event schedule with times converted to user's timezone.

import type { Bot } from 'grammy';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchTodayEvents } from '@/domain/event-service';
import { getLocaleStrings } from '@/lib/i18n';
import { APP_CONFIG } from '@/lib/constants';
import { convertTime, formatDateInTimezone, now } from '@/lib/timezone';

export function registerEventsCommand(bot: Bot): void {
    bot.command('events', async (ctx) => {
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
            message += '\n' + strings.bot.eventRow(
                e.emoji,
                e.translatedName,
                startLocal,
                endLocal
            );
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
    });
}
