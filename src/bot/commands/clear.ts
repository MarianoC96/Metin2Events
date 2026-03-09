// ─── /clear & /limpiar Command Handler ──────────────────────────
// Clears the chat visually by sending spacer messages.
// Telegram bots cannot delete entire chat history in private chats,
// so we push old content off-screen and then post a clean status.
// Subscriptions and user data are preserved.

import type { Bot, Context } from 'grammy';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLocaleStrings } from '@/lib/i18n';
import { APP_CONFIG } from '@/lib/constants';

/** Number of blank lines to push old messages off-screen */
const CLEAR_SPACER_LINES = 50;

/**
 * Core handler for the "clear" action.
 * Sends a tall spacer message, then deletes it, and shows a clean welcome.
 */
async function handleClearChat(ctx: Context): Promise<void> {
    const telegramId = String(ctx.from?.id);
    const chatId = ctx.chat?.id;

    if (!chatId) {
        return;
    }

    const user = await db
        .select()
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .limit(1);

    const locale = user[0]?.locale ?? APP_CONFIG.DEFAULT_LOCALE;
    const strings = getLocaleStrings(locale);
    const firstName = user[0]?.firstName ?? ctx.from?.first_name ?? 'Jugador';

    // Delete the user's /clear command message
    try {
        await ctx.deleteMessage();
    } catch {
        // Deletion may fail if the bot lacks permissions — non-critical
    }

    // Send a tall spacer to push old content off-screen
    const spacer = '\u200B' + '\n'.repeat(CLEAR_SPACER_LINES);
    const spacerMsg = await ctx.reply(spacer);

    // Delete the spacer itself for a clean effect
    try {
        await ctx.api.deleteMessage(chatId, spacerMsg.message_id);
    } catch {
        // Non-critical if deletion fails
    }

    // Send the clean welcome message
    await ctx.reply(
        strings.bot.chatCleared(firstName),
        { parse_mode: 'Markdown' }
    );
}

export function registerClearCommand(bot: Bot): void {
    bot.command('clear', handleClearChat);
    bot.command('limpiar', handleClearChat);
}
