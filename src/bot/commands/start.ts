// ─── /start Command Handler ─────────────────────────────────────
// Registers the user in the database and sends a welcome message.

import type { Bot } from 'grammy';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLocaleStrings } from '@/lib/i18n';
import { APP_CONFIG } from '@/lib/constants';

export function registerStartCommand(bot: Bot): void {
    bot.command('start', async (ctx) => {
        const telegramId = String(ctx.from?.id);
        const username = ctx.from?.username ?? null;
        const firstName = ctx.from?.first_name ?? 'Jugador';

        if (!telegramId) {
            return;
        }

        // Check if user already exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.telegramId, telegramId))
            .limit(1);

        if (existingUser.length === 0) {
            await db.insert(users).values({
                telegramId,
                telegramUsername: username,
                firstName,
                timezone: APP_CONFIG.DEFAULT_TIMEZONE,
                locale: APP_CONFIG.DEFAULT_LOCALE,
                isActive: true,
            });
        } else if (!existingUser[0].isActive) {
            // Reactivate if previously deactivated
            await db
                .update(users)
                .set({ isActive: true, updatedAt: new Date().toISOString() })
                .where(eq(users.id, existingUser[0].id));
        }

        const strings = getLocaleStrings(
            existingUser[0]?.locale ?? APP_CONFIG.DEFAULT_LOCALE
        );

        await ctx.reply(strings.bot.welcome(firstName), {
            parse_mode: 'Markdown',
        });
    });
}
