// ─── Locale Type Definitions ────────────────────────────────────
// Shared interface for all locale files to ensure type safety.

export interface LocaleStrings {
    readonly bot: {
        readonly welcome: (name: string) => string;
        readonly help: string;
        readonly noEventsToday: string;
        readonly nextEvent: (name: string, emoji: string, time: string) => string;
        readonly noUpcomingEvents: string;
        readonly subscribePrompt: string;
        readonly subscribeAll: string;
        readonly unsubscribeAll: string;
        readonly subscribedSuccess: (name: string) => string;
        readonly unsubscribedSuccess: (name: string) => string;
        readonly subscribedAll: string;
        readonly unsubscribedAll: string;
        readonly mySubsTitle: string;
        readonly noSubs: string;
        readonly languagePrompt: string;
        readonly languageChanged: (lang: string) => string;
        readonly alreadySubscribed: (name: string) => string;
        readonly eventListHeader: (date: string) => string;
        readonly eventRow: (emoji: string, name: string, start: string, end: string) => string;
        readonly countdown: (startTime: string, remaining: string) => string;
        readonly eventLive: string;
        readonly eventNoSchedule: string;
        readonly chatCleared: (name: string) => string;
        readonly newEventsAlert: (eventList: string, count: number) => string;
    };
    readonly notifications: {
        readonly alert30min: (emoji: string, name: string, start: string, end: string) => string;
        readonly alert5min: (emoji: string, name: string, start: string, end: string) => string;
    };
}
