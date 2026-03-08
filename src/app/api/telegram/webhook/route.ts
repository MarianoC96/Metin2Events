// ─── Telegram Webhook API Route ─────────────────────────────────
// Receives updates from Telegram Bot API.

import { NextRequest, NextResponse } from 'next/server';
import { registerAllCommands } from '@/bot/commands';
import { telegramAdapter } from '@/bot/telegram-adapter';

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
        console.error('Webhook unauthorized. Expected:', webhookSecret, 'Got:', headerSecret);
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        ensureInitialized();
        const update = await request.json();
        console.log('Webhook update received:', JSON.stringify(update).substring(0, 200));
        await telegramAdapter.handleUpdate(update);
        console.log('Update processed successfully');
        return NextResponse.json({ ok: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        console.error('Webhook error:', errorMessage);
        console.error('Stack:', errorStack);
        return NextResponse.json({ ok: true }); // Always return 200 to Telegram
    }
}

export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        status: 'Telegram webhook is active',
        timestamp: new Date().toISOString(),
    });
}
