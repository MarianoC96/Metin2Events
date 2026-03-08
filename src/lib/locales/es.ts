// ─── Spanish Locale (Default) ───────────────────────────────────

import type { LocaleStrings } from './types';

const es: LocaleStrings = {
    bot: {
        welcome: (name: string) =>
            `🎮 ¡Bienvenido, *${name}*!\n\nSoy el bot de eventos de Metin2. Te aviso antes de que empiece cada evento para que no te los pierdas.\n\n🔔 Usá /subscribe para elegir tus eventos\n📋 Usá /events para ver los de hoy\n🌐 Usá /language para cambiar el idioma`,
        help: `📖 *Comandos disponibles:*\n
/events — Ver eventos de hoy
/next — Próximo evento
/subscribe — Elegir eventos favoritos
/unsubscribe — Cancelar suscripciones
/mysubs — Ver tus suscripciones
/language — Cambiar idioma
/help — Esta ayuda`,
        noEventsToday: '📭 No hay eventos programados para hoy.',
        nextEvent: (name: string, emoji: string, time: string) =>
            `⏭️ *Próximo evento:*\n${emoji} ${name}\n🕐 ${time}`,
        noUpcomingEvents: '✅ No hay más eventos por hoy. ¡Descansá!',
        subscribePrompt: '📋 Elegí los eventos que te interesen:',
        subscribeAll: '✅ Suscribirme a TODOS',
        unsubscribeAll: '❌ Cancelar TODAS mis suscripciones',
        subscribedSuccess: (name: string) => `✅ Suscrito a: *${name}*`,
        unsubscribedSuccess: (name: string) => `❌ Desuscrito de: *${name}*`,
        subscribedAll: '✅ ¡Suscrito a todos los eventos!',
        unsubscribedAll: '❌ Todas las suscripciones canceladas.',
        mySubsTitle: '📋 *Tus suscripciones activas:*\n',
        noSubs: '📭 No estás suscrito a ningún evento. Usá /subscribe para empezar.',
        languagePrompt: '🌐 Elegí tu idioma:',
        languageChanged: (lang: string) => `✅ Idioma cambiado a: *${lang}*`,
        alreadySubscribed: (name: string) => `ℹ️ Ya estás suscrito a: *${name}*`,
        eventListHeader: (date: string) => `📅 *Eventos para ${date}:*\n`,
        eventRow: (emoji: string, name: string, start: string, end: string) =>
            `${emoji} ${name}\n    🕐 ${start} — ${end}`,
    },
    notifications: {
        alert30min: (emoji: string, name: string, start: string, end: string) =>
            `⏰ *En 30 minutos:*\n${emoji} ${name}\n🕐 ${start} — ${end}\n\n¡Prepárate!`,
        alert5min: (emoji: string, name: string, start: string, end: string) =>
            `🚨 *¡En 5 minutos!*\n${emoji} ${name}\n🕐 ${start} — ${end}\n\n¡Ya casi empieza!`,
    },
};

export default es;
