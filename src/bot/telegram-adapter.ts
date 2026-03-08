// ─── Telegram Bot Adapter ───────────────────────────────────────
// Wraps grammY's Bot class behind our ITelegramBotAdapter interface.
// Domain logic never imports grammy directly — only this adapter.

import { Bot } from 'grammy';
import type { ITelegramBotAdapter, MessageOptions } from '@/lib/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

let isBotInitialized = false;

/**
 * Ensures the bot is initialized before handling updates.
 * grammY requires bot.init() in webhook/serverless mode
 * to fetch bot info (username, id) from Telegram API.
 */
async function ensureBotInitialized(): Promise<void> {
    if (isBotInitialized) {
        return;
    }
    await bot.init();
    isBotInitialized = true;
}

export const telegramAdapter: ITelegramBotAdapter = {
    async sendMessage(
        chatId: string,
        text: string,
        options?: MessageOptions
    ): Promise<void> {
        await ensureBotInitialized();
        await bot.api.sendMessage(chatId, text, {
            parse_mode: options?.parseMode ?? 'Markdown',
            reply_markup: options?.replyMarkup as never,
        });
    },

    async setWebhook(url: string, secret?: string): Promise<void> {
        await bot.api.setWebhook(url, {
            secret_token: secret,
        });
    },

    async handleUpdate(update: unknown): Promise<void> {
        await ensureBotInitialized();
        await bot.handleUpdate(update as Parameters<typeof bot.handleUpdate>[0]);
    },
};

/**
 * Returns the raw grammY Bot instance for command registration.
 * This should only be used in the bot command handlers layer,
 * NOT in domain logic.
 */
export function getBotInstance(): Bot {
    return bot;
}
