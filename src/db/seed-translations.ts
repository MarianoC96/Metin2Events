// ─── Seed Spanish Event Translations ────────────────────────────
// Populates the event_type_translations table with Spanish names.
// Run with: npx tsx src/db/seed-translations.ts

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

/**
 * English → Spanish translation map for all known Metin2 event types.
 */
const TRANSLATIONS: Record<string, string> = {
    'Chaos Stone Event': 'Evento Piedra del Caos',
    'Double Drop Ability book': 'Doble Drop Libro de Habilidad',
    'Double Drop Biologist Coin': 'Doble Drop Moneda de Biólogo',
    'Double Drop Biologist Coin+': 'Doble Drop Moneda de Biólogo+',
    'Double Drop Dragon Stone Shard': 'Doble Drop Fragmento de Piedra Dragón',
    'Double Drop Enchanted Item': 'Doble Drop Objeto Encantado',
    'Double Drop Medicinal Herb+': 'Doble Drop Hierba Medicinal+',
    'Double Drop Permit Fragment': 'Doble Drop Fragmento de Permiso',
    'Double Drop Permit Fragment+': 'Doble Drop Fragmento de Permiso+',
    'Double Drop Soul Stone': 'Doble Drop Piedra del Alma',
    'Hexagonal Chest': 'Cofre Hexagonal',
    'Hexagonal Chest Event': 'Evento Cofre Hexagonal',
    'Maps Leaders Double Drop': 'Doble Drop Líderes de Mapa',
    'Double Drop Leaders': 'Doble Drop Líderes',
    'Mining Drop Chance Increased': 'Probabilidad de Minería Aumentada',
    'Moonlight Chests': 'Cofres de Luna',
    'Double Drop Cor Draconis': 'Doble Drop Cor Draconis',
    'Double Drop Fine Cloth': 'Doble Drop Tela Fina',
    'Double Drop Metin Stones': 'Doble Drop Piedras Metin',
    'Double Drop Talisman Remnant': 'Doble Drop Remanente de Talismán',
    'Double Drop Energy Fragment': 'Doble Drop Fragmento de Energía',
};

async function seedTranslations() {
    console.log('🌱 Seeding Spanish translations...\n');

    const allTypes = await db.select().from(schema.eventTypes);
    let created = 0;

    for (const eventType of allTypes) {
        const spanishName = TRANSLATIONS[eventType.name] ?? eventType.name;

        try {
            await db.insert(schema.eventTypeTranslations).values({
                eventTypeId: eventType.id,
                locale: 'es',
                name: spanishName,
            });
            console.log(`  ✅ ${eventType.name} → ${spanishName}`);
            created++;
        } catch {
            console.log(`  ⏭️ Already exists: ${eventType.name}`);
        }
    }

    console.log(`\n🎉 Done! Translations created: ${created}`);
    process.exit(0);
}

seedTranslations().catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
});
