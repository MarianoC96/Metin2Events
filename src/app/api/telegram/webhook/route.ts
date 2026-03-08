// ─── Telegram Webhook API Route ─────────────────────────────────
// Receives updates from Telegram Bot API.

import { NextRequest, NextResponse } from 'next/server';
import { registerAllCommands } from '@/bot/commands';
import { telegramAdapter, getBotInstance } from '@/bot/telegram-adapter';

// Register commands once at module load
let isInitialized = false;

function ensureInitialized(): void {
    if (isInitialized) {
        return;
    }
    registerAllCommands();
    isInitialized = true;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const headerSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');

    if (webhookSecret && headerSecret !== webhookSecret) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        ensureInitialized();
        const update = await request.json();
        await telegramAdapter.handleUpdate(update);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ ok: true }); // Always return 200 to Telegram
    }
}

export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        status: 'Telegram webhook is active',
        timestamp: new Date().toISOString(),
    });
}
