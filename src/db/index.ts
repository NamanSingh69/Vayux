import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error("khel khatam hai");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });