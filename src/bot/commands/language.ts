// ─── /language Command Handler ──────────────────────────────────
// Lets the user pick their preferred language with inline buttons.

import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLocaleStrings } from '@/lib/i18n';
import { SUPPORTED_LOCALES, LOCALE_FLAGS, LOCALE_NAMES, APP_CONFIG } from '@/lib/constants';
import type { SupportedLocale } from '@/lib/constants';

export function registerLanguageCommand(bot: Bot): void {
    bot.command('language', async (ctx) => {
        const telegramId = String(ctx.from?.id);
        const user = await db
            .select()
            .from(users)
            .where(eq(users.telegramId, telegramId))
            .limit(1);

        if (user.length === 0) {
            await ctx.reply('⚠️ Usá /start primero.');
            return;
        }

        const locale = user[0].locale ?? APP_CONFIG.DEFAULT_LOCALE;
        const strings = getLocaleStrings(locale);

        const keyboard = new InlineKeyboard();
        for (const loc of SUPPORTED_LOCALES) {
            const flag = LOCALE_FLAGS[loc];
            const name = LOCALE_NAMES[loc];
            const current = loc === locale ? ' ✓' : '';
            keyboard.text(`${flag} ${name}${current}`, `set_lang:${loc}`).row();
        }

        await ctx.reply(strings.bot.languagePrompt, {
            reply_markup: keyboard,
        });
    });

    bot.callbackQuery(/^set_lang:(\w+)$/, async (ctx) => {
        const newLocale = ctx.match[1] as SupportedLocale;
        const telegramId = String(ctx.from?.id);

        if (!SUPPORTED_LOCALES.includes(newLocale)) {
            await ctx.answerCallbackQuery({ text: '❌ Idioma no soportado.' });
            return;
        }

        await db
            .update(users)
            .set({ locale: newLocale, updatedAt: new Date().toISOString() })
            .where(eq(users.telegramId, telegramId));

        const strings = getLocaleStrings(newLocale);
        const langName = LOCALE_NAMES[newLocale];

        await ctx.answerCallbackQuery({
            text: strings.bot.languageChanged(langName),
        });

        // Update keyboard to show current selection
        const keyboard = new InlineKeyboard();
        for (const loc of SUPPORTED_LOCALES) {
            const flag = LOCALE_FLAGS[loc];
            const name = LOCALE_NAMES[loc];
            const current = loc === newLocale ? ' ✓' : '';
            keyboard.text(`${flag} ${name}${current}`, `set_lang:${loc}`).row();
        }

        await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
    });
}
