import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL) {
    throw new Error('Missing TURSO_DATABASE_URL environment variable');
}

if (!TURSO_AUTH_TOKEN) {
    throw new Error('Missing TURSO_AUTH_TOKEN environment variable');
}

const tursoClient = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
});

export const db = drizzle(tursoClient, { schema });
export type Database = typeof db;
