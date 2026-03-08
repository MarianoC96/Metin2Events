// ─── Webhook Setup API Route ────────────────────────────────────
// Call this once to register the Telegram webhook URL.

import { NextRequest, NextResponse } from 'next/server';
import { telegramAdapter } from '@/bot/telegram-adapter';

/**
 * POST /api/telegram/setup — Sets up the Telegram webhook
 * Body: { url?: string }
 * If url is not provided, uses NEXT_PUBLIC_APP_URL from env.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json().catch(() => ({}));
        const appUrl = (body as { url?: string }).url ?? process.env.NEXT_PUBLIC_APP_URL;

        if (!appUrl) {
            return NextResponse.json(
                { ok: false, error: 'Missing app URL. Set NEXT_PUBLIC_APP_URL or pass url in body.' },
                { status: 400 }
            );
        }

        const webhookUrl = `${appUrl}/api/telegram/webhook`;
        const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

        await telegramAdapter.setWebhook(webhookUrl, secret);

        return NextResponse.json({
            ok: true,
            webhookUrl,
            message: 'Webhook registered successfully',
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to set webhook:', errorMessage);
        return NextResponse.json(
            { ok: false, error: `Failed to set webhook: ${errorMessage}` },
            { status: 500 }
        );
    }
}
