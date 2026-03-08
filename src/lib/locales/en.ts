// ─── English Locale ─────────────────────────────────────────────

import type { LocaleStrings } from './types';

const en: LocaleStrings = {
    bot: {
        welcome: (name: string) =>
            `🎮 Welcome, *${name}*!\n\nI'm the Metin2 Events Bot. I'll notify you before each event starts so you never miss one.\n\n🔔 Use /subscribe to pick your events\n📋 Use /events to see today's schedule\n🌐 Use /language to change language`,
        help: `📖 *Available commands:*\n
/events — Today's events
/next — Next event
/subscribe — Choose favorite events
/unsubscribe — Cancel subscriptions
/mysubs — View your subscriptions
/language — Change language
/help — This help`,
        noEventsToday: '📭 No events scheduled for today.',
        nextEvent: (name: string, emoji: string, time: string) =>
            `⏭️ *Next event:*\n${emoji} ${name}\n🕐 ${time}`,
        noUpcomingEvents: '✅ No more events left today. Rest up!',
        subscribePrompt: '📋 Choose the events you want:',
        subscribeAll: '✅ Subscribe to ALL',
        unsubscribeAll: '❌ Cancel ALL my subscriptions',
        subscribedSuccess: (name: string) => `✅ Subscribed to: *${name}*`,
        unsubscribedSuccess: (name: string) => `❌ Unsubscribed from: *${name}*`,
        subscribedAll: '✅ Subscribed to all events!',
        unsubscribedAll: '❌ All subscriptions cancelled.',
        mySubsTitle: '📋 *Your active subscriptions:*\n',
        noSubs: '📭 You have no subscriptions. Use /subscribe to get started.',
        languagePrompt: '🌐 Choose your language:',
        languageChanged: (lang: string) => `✅ Language changed to: *${lang}*`,
        alreadySubscribed: (name: string) => `ℹ️ Already subscribed to: *${name}*`,
        eventListHeader: (date: string) => `📅 *Events for ${date}:*\n`,
        eventRow: (emoji: string, name: string, start: string, end: string) =>
            `${emoji} ${name}\n    🕐 ${start} — ${end}`,
    },
    notifications: {
        alert30min: (emoji: string, name: string, start: string, end: string) =>
            `⏰ *In 30 minutes:*\n${emoji} ${name}\n🕐 ${start} — ${end}\n\nGet ready!`,
        alert5min: (emoji: string, name: string, start: string, end: string) =>
            `🚨 *In 5 minutes!*\n${emoji} ${name}\n🕐 ${start} — ${end}\n\nIt's about to start!`,
    },
};

export default en;
