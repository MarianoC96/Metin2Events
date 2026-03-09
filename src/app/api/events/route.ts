// ─── Events API Route ───────────────────────────────────────────
// REST API for managing events from the admin dashboard.
// When new event types are imported, all active users are notified.

import { NextRequest, NextResponse } from 'next/server';
import { importEventsFromText, fetchTodayEvents, countEvents, countEventTypes } from '@/domain/event-service';
import { notifyUsersAboutNewEventTypes } from '@/domain/new-events-notifier';
import { telegramAdapter } from '@/bot/telegram-adapter';
import { APP_CONFIG } from '@/lib/constants';

/**
 * GET /api/events — Returns today's events and stats
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') ?? APP_CONFIG.DEFAULT_LOCALE;

    try {
        const [todayEvents, totalEvents, totalTypes] = await Promise.all([
            fetchTodayEvents(locale),
            countEvents(),
            countEventTypes(),
        ]);

        return NextResponse.json({
            ok: true,
            data: {
                todayEvents,
                stats: {
                    totalEvents,
                    totalEventTypes: totalTypes,
                },
            },
        });
    } catch (error) {
        console.error('Failed to fetch events:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/events — Imports events from raw text
 * Body: { text: string }
 * When new event types are detected, notifies all active users.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { text } = body as { text: string };

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json(
                { ok: false, error: 'Missing or empty "text" field' },
                { status: 400 }
            );
        }

        const result = await importEventsFromText(text);

        // Fire-and-forget: notify users about new event types
        // Runs in background to avoid blocking the API response
        if (result.newEventTypeNames.length > 0) {
            notifyUsersAboutNewEventTypes(telegramAdapter, result.newEventTypeNames)
                .then((notifyResult) => {
                    console.log(
                        `New event types notification: ${notifyResult.usersNotified} users notified, ${notifyResult.errors} errors`
                    );
                })
                .catch((error) => {
                    console.error('Failed to notify users about new event types:', error);
                });
        }

        return NextResponse.json({
            ok: true,
            data: result,
        });
    } catch (error) {
        console.error('Failed to import events:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to import events' },
            { status: 500 }
        );
    }
}

