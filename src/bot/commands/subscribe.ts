// ─── /subscribe, /unsubscribe, /mysubs Command Handlers ─────────
// Interactive subscription management with inline keyboard buttons.
// Each event button displays the next occurrence time and countdown.

import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchAllEventTypesWithSchedule } from '@/domain/event-service';
import {
    subscribeToEventType,
    unsubscribeFromEventType,
    subscribeToAll,
    unsubscribeFromAll,
    fetchUserSubscriptions,
    isSubscribed,
} from '@/domain/subscription-service';
import { getLocaleStrings } from '@/lib/i18n';
import { APP_CONFIG } from '@/lib/constants';
import { convertTime, minutesUntil, formatCountdown } from '@/lib/timezone';
import type { EventTypeWithSchedule } from '@/lib/types';
import type { LocaleStrings } from '@/lib/locales/types';

/**
 * Builds the schedule suffix for a button label.
 * Shows "(HH:mm - faltan Xh Xmin)" or "(🔴 EN VIVO)" or empty.
 */
function buildScheduleSuffix(
    type: EventTypeWithSchedule,
    userTimezone: string,
    strings: LocaleStrings
): string {
    if (!type.nextStartTime || !type.nextEventDate) {
        return strings.bot.eventNoSchedule;
    }

    const startLocal = convertTime(
        type.nextEventDate,
        type.nextStartTime,
        APP_CONFIG.EVENT_SOURCE_TIMEZONE,
        userTimezone
    );

    const remainingMinutes = minutesUntil(
        type.nextEventDate,
        type.nextStartTime,
        APP_CONFIG.EVENT_SOURCE_TIMEZONE
    );

    if (remainingMinutes <= 0) {
        return strings.bot.eventLive;
    }

    const countdownStr = formatCountdown(remainingMinutes);
    return strings.bot.countdown(startLocal, countdownStr);
}

/**
 * Builds the subscribe keyboard with schedule info on each row.
 */
async function buildSubscribeKeyboard(
    userId: number,
    allTypes: readonly EventTypeWithSchedule[],
    userTimezone: string,
    strings: LocaleStrings,
    overridePrefix?: string
): Promise<InlineKeyboard> {
    const keyboard = new InlineKeyboard();

    for (const type of allTypes) {
        const prefix =
            overridePrefix ?? (await isSubscribed(userId, type.id) ? '✅' : '⬜');

        const scheduleSuffix = buildScheduleSuffix(type, userTimezone, strings);
        const label = scheduleSuffix
            ? `${prefix} ${type.emoji} ${type.translatedName} ${scheduleSuffix}`
            : `${prefix} ${type.emoji} ${type.translatedName}`;

        keyboard.text(label, `toggle_sub:${type.id}`).row();
    }

    keyboard
        .text(strings.bot.subscribeAll, 'subscribe_all')
        .row()
        .text(strings.bot.unsubscribeAll, 'unsubscribe_all');

    return keyboard;
}

export function registerSubscribeCommand(bot: Bot): void {
    // ─── /subscribe — Show event picker ───────────────────────────
    bot.command('subscribe', async (ctx) => {
        const telegramId = String(ctx.from?.id);
        const user = await findUser(telegramId);
        if (!user) {
            await ctx.reply('⚠️ Usá /start primero.');
            return;
        }

        const locale = user.locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const timezone = user.timezone ?? APP_CONFIG.DEFAULT_TIMEZONE;
        const strings = getLocaleStrings(locale);
        const allTypes = await fetchAllEventTypesWithSchedule(locale);

        if (allTypes.length === 0) {
            await ctx.reply('📭 No hay tipos de evento disponibles aún.');
            return;
        }

        const keyboard = await buildSubscribeKeyboard(
            user.id, allTypes, timezone, strings
        );

        await ctx.reply(strings.bot.subscribePrompt, {
            reply_markup: keyboard,
        });
    });

    // ─── /unsubscribe — Cancel all ────────────────────────────────
    bot.command('unsubscribe', async (ctx) => {
        const telegramId = String(ctx.from?.id);
        const user = await findUser(telegramId);
        if (!user) {
            await ctx.reply('⚠️ Usá /start primero.');
            return;
        }

        const locale = user.locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const strings = getLocaleStrings(locale);

        await unsubscribeFromAll(user.id);
        await ctx.reply(strings.bot.unsubscribedAll);
    });

    // ─── /mysubs — Show active subscriptions ──────────────────────
    bot.command('mysubs', async (ctx) => {
        const telegramId = String(ctx.from?.id);
        const user = await findUser(telegramId);
        if (!user) {
            await ctx.reply('⚠️ Usá /start primero.');
            return;
        }

        const locale = user.locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const strings = getLocaleStrings(locale);
        const subs = await fetchUserSubscriptions(user.id, locale);

        if (subs.length === 0) {
            await ctx.reply(strings.bot.noSubs);
            return;
        }

        let message = strings.bot.mySubsTitle;
        for (const sub of subs) {
            message += `\n${sub.emoji} ${sub.translatedName}`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
    });

    // ─── Callback: Toggle individual subscription ─────────────────
    bot.callbackQuery(/^toggle_sub:(\d+)$/, async (ctx) => {
        const eventTypeId = parseInt(ctx.match[1], 10);
        const telegramId = String(ctx.from?.id);
        const user = await findUser(telegramId);
        if (!user) {
            await ctx.answerCallbackQuery({ text: '⚠️ Usá /start primero.' });
            return;
        }

        const locale = user.locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const timezone = user.timezone ?? APP_CONFIG.DEFAULT_TIMEZONE;
        const strings = getLocaleStrings(locale);
        const allTypes = await fetchAllEventTypesWithSchedule(locale);
        const targetType = allTypes.find((t) => t.id === eventTypeId);

        if (!targetType) {
            await ctx.answerCallbackQuery({ text: '❌ Evento no encontrado.' });
            return;
        }

        const currentlySubscribed = await isSubscribed(user.id, eventTypeId);

        if (currentlySubscribed) {
            await unsubscribeFromEventType(user.id, eventTypeId);
            await ctx.answerCallbackQuery({
                text: `❌ ${targetType.translatedName}`,
            });
        } else {
            await subscribeToEventType(user.id, eventTypeId);
            await ctx.answerCallbackQuery({
                text: `✅ ${targetType.translatedName}`,
            });
        }

        // Rebuild the keyboard with updated states
        const keyboard = await buildSubscribeKeyboard(
            user.id, allTypes, timezone, strings
        );
        await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
    });

    // ─── Callback: Subscribe to all ───────────────────────────────
    bot.callbackQuery('subscribe_all', async (ctx) => {
        const telegramId = String(ctx.from?.id);
        const user = await findUser(telegramId);
        if (!user) {
            await ctx.answerCallbackQuery({ text: '⚠️ Usá /start primero.' });
            return;
        }

        const locale = user.locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const timezone = user.timezone ?? APP_CONFIG.DEFAULT_TIMEZONE;
        const strings = getLocaleStrings(locale);

        await subscribeToAll(user.id);
        await ctx.answerCallbackQuery({ text: strings.bot.subscribedAll });

        // Rebuild keyboard with all checked
        const allTypes = await fetchAllEventTypesWithSchedule(locale);
        const keyboard = await buildSubscribeKeyboard(
            user.id, allTypes, timezone, strings, '✅'
        );
        await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
    });

    // ─── Callback: Unsubscribe from all ───────────────────────────
    bot.callbackQuery('unsubscribe_all', async (ctx) => {
        const telegramId = String(ctx.from?.id);
        const user = await findUser(telegramId);
        if (!user) {
            await ctx.answerCallbackQuery({ text: '⚠️ Usá /start primero.' });
            return;
        }

        const locale = user.locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const timezone = user.timezone ?? APP_CONFIG.DEFAULT_TIMEZONE;
        const strings = getLocaleStrings(locale);

        await unsubscribeFromAll(user.id);
        await ctx.answerCallbackQuery({ text: strings.bot.unsubscribedAll });

        // Rebuild keyboard with all unchecked
        const allTypes = await fetchAllEventTypesWithSchedule(locale);
        const keyboard = await buildSubscribeKeyboard(
            user.id, allTypes, timezone, strings, '⬜'
        );
        await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
    });
}

/**
 * Helper to find a user by telegram_id.
 */
async function findUser(telegramId: string) {
    const result = await db
        .select()
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .limit(1);
    return result[0] ?? null;
}
