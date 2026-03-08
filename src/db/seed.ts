// ─── Database Seed Script ───────────────────────────────────────
// Seeds initial data: languages and default event type translations.
// Run with: npx tsx src/db/seed.ts

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { config } from 'dotenv';

config({ path: '.env.local' });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client, { schema });

async function seed() {
    console.log('🌱 Seeding languages...');

    await db.insert(schema.languages).values([
        { code: 'es', name: 'Español', isDefault: true },
        { code: 'en', name: 'English', isDefault: false },
        { code: 'pt', name: 'Português', isDefault: false },
    ]).onConflictDoNothing();

    console.log('✅ Languages seeded.');
    console.log('🎉 Seed complete!');
    process.exit(0);
}

seed().catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
});
