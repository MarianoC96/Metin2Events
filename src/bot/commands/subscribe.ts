// ─── /subscribe, /unsubscribe, /mysubs Command Handlers ─────────
// Interactive subscription management with inline keyboard buttons.

import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchAllEventTypes } from '@/domain/event-service';
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
        const strings = getLocaleStrings(locale);
        const allTypes = await fetchAllEventTypes(locale);

        if (allTypes.length === 0) {
            await ctx.reply('📭 No hay tipos de evento disponibles aún.');
            return;
        }

        const keyboard = new InlineKeyboard();

        for (const type of allTypes) {
            const subscribed = await isSubscribed(user.id, type.id);
            const prefix = subscribed ? '✅' : '⬜';
            keyboard
                .text(
                    `${prefix} ${type.emoji} ${type.translatedName}`,
                    `toggle_sub:${type.id}`
                )
                .row();
        }

        keyboard
            .text(strings.bot.subscribeAll, 'subscribe_all')
            .row()
            .text(strings.bot.unsubscribeAll, 'unsubscribe_all');

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
        const strings = getLocaleStrings(locale);
        const allTypes = await fetchAllEventTypes(locale);
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
        const keyboard = new InlineKeyboard();
        for (const type of allTypes) {
            const subscribed = await isSubscribed(user.id, type.id);
            const prefix = subscribed ? '✅' : '⬜';
            keyboard
                .text(
                    `${prefix} ${type.emoji} ${type.translatedName}`,
                    `toggle_sub:${type.id}`
                )
                .row();
        }
        keyboard
            .text(strings.bot.subscribeAll, 'subscribe_all')
            .row()
            .text(strings.bot.unsubscribeAll, 'unsubscribe_all');

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
        const strings = getLocaleStrings(locale);

        await subscribeToAll(user.id);
        await ctx.answerCallbackQuery({ text: strings.bot.subscribedAll });

        // Rebuild keyboard with all checked
        const allTypes = await fetchAllEventTypes(locale);
        const keyboard = new InlineKeyboard();
        for (const type of allTypes) {
            keyboard
                .text(
                    `✅ ${type.emoji} ${type.translatedName}`,
                    `toggle_sub:${type.id}`
                )
                .row();
        }
        keyboard
            .text(strings.bot.subscribeAll, 'subscribe_all')
            .row()
            .text(strings.bot.unsubscribeAll, 'unsubscribe_all');

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
        const strings = getLocaleStrings(locale);

        await unsubscribeFromAll(user.id);
        await ctx.answerCallbackQuery({ text: strings.bot.unsubscribedAll });

        // Rebuild keyboard with all unchecked
        const allTypes = await fetchAllEventTypes(locale);
        const keyboard = new InlineKeyboard();
        for (const type of allTypes) {
            keyboard
                .text(
                    `⬜ ${type.emoji} ${type.translatedName}`,
                    `toggle_sub:${type.id}`
                )
                .row();
        }
        keyboard
            .text(strings.bot.subscribeAll, 'subscribe_all')
            .row()
            .text(strings.bot.unsubscribeAll, 'unsubscribe_all');

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
