// ─── Notification Cron API Route ────────────────────────────────
// Triggered by Vercel cron every 5 minutes.
// Processes both 30min and 5min alert windows.

import { NextRequest, NextResponse } from 'next/server';
import { processNotifications } from '@/domain/notification-engine';
import { telegramAdapter } from '@/bot/telegram-adapter';
import { registerAllCommands } from '@/bot/commands';

let isInitialized = false;

function ensureInitialized(): void {
    if (isInitialized) {
        return;
    }
    registerAllCommands();
    isInitialized = true;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    // Verify cron secret to prevent unauthorized access
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (cronSecret) {
        const expectedAuth = `Bearer ${cronSecret}`;
        if (authHeader !== expectedAuth) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
    }

    try {
        ensureInitialized();

        const result = await processNotifications(telegramAdapter);

        return NextResponse.json({
            ok: true,
            timestamp: new Date().toISOString(),
            ...result,
        });
    } catch (error) {
        console.error('Cron notification error:', error);
        return NextResponse.json(
            { error: 'Internal server error', timestamp: new Date().toISOString() },
            { status: 500 }
        );
    }
}
