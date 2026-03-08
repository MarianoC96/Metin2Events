import type { SupportedLocale } from './constants';

// ─── Domain Types ───────────────────────────────────────────────

export interface ParsedEvent {
    readonly eventTypeName: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly timezone: string;
}

export interface ParsedDaySchedule {
    readonly date: string;
    readonly events: readonly ParsedEvent[];
}

export interface NotificationPayload {
    readonly userId: number;
    readonly telegramId: string;
    readonly eventTypeName: string;
    readonly translatedName: string;
    readonly emoji: string;
    readonly startTimeLocal: string;
    readonly endTimeLocal: string;
    readonly alertType: '30min' | '5min';
    readonly locale: SupportedLocale;
}

export interface UserProfile {
    readonly id: number;
    readonly telegramId: string;
    readonly telegramUsername: string | null;
    readonly firstName: string | null;
    readonly timezone: string;
    readonly locale: SupportedLocale;
    readonly isActive: boolean;
}

export interface EventTypeWithTranslation {
    readonly id: number;
    readonly name: string;
    readonly slug: string;
    readonly emoji: string;
    readonly translatedName: string;
}

// ─── Adapter Interfaces ─────────────────────────────────────────

export interface MessageOptions {
    readonly parseMode?: 'HTML' | 'MarkdownV2';
    readonly replyMarkup?: unknown;
}

export interface ITelegramBotAdapter {
    sendMessage(chatId: string, text: string, options?: MessageOptions): Promise<void>;
    setWebhook(url: string, secret?: string): Promise<void>;
    handleUpdate(update: unknown): Promise<void>;
}
