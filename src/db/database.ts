import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Abre (uma única vez) o banco local e garante que as tabelas existam. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("reconec.db").then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS clientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          criado_em TEXT NOT NULL,
          fotos TEXT NOT NULL,
          embedding TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

/** Usado pelos testes/scripts para forçar a reabertura do banco. Não é usado em produção. */
export function _resetDatabaseParaTestes(): void {
  dbPromise = null;
}
