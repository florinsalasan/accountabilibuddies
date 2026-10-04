import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema.ts';

export const DB_NAME = 'accountabilibuddies.db';

let _expoDb: SQLite.SQLiteDatabase | null = null;
let _drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getExpoDb(): SQLite.SQLiteDatabase {
  if (!_expoDb) {
    _expoDb = SQLite.openDatabaseSync(DB_NAME);
  }
  return _expoDb;
}

export function getDb() {
  if (!_drizzleDb) {
    const expoDb = getExpoDb();
    _drizzleDb = drizzle(expoDb, { schema });
  }
  return _drizzleDb;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const actualDb = getDb();
    // @ts-expect-error dynamic proxy access
    return actualDb[prop];
  },
});
