// ─── Admin Dashboard Stats API ──────────────────────────────────
// Returns statistics for the admin dashboard.

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users, events, eventTypes, subscriptions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(): Promise<NextResponse> {
    try {
        const [usersCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.isActive, true));

        const [eventsCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(events);

        const [eventTypesCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(eventTypes);

        const [subscriptionsCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(subscriptions)
            .where(eq(subscriptions.isActive, true));

        return NextResponse.json({
            ok: true,
            data: {
                activeUsers: usersCount?.count ?? 0,
                totalEvents: eventsCount?.count ?? 0,
                totalEventTypes: eventTypesCount?.count ?? 0,
                activeSubscriptions: subscriptionsCount?.count ?? 0,
            },
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
