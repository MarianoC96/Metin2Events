// ─── /help Command Handler ──────────────────────────────────────

import type { Bot } from 'grammy';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLocaleStrings } from '@/lib/i18n';
import { APP_CONFIG } from '@/lib/constants';

export function registerHelpCommand(bot: Bot): void {
    bot.command('help', async (ctx) => {
        const telegramId = String(ctx.from?.id);
        const user = await db
            .select()
            .from(users)
            .where(eq(users.telegramId, telegramId))
            .limit(1);

        const locale = user[0]?.locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const strings = getLocaleStrings(locale);

        await ctx.reply(strings.bot.help, { parse_mode: 'Markdown' });
    });
}
