import type { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle>;

let _db: Db | null = null;

function getDb(): Db {
	if (!_db) {
		// Lazy-require native addon so it is NOT loaded at import time.
		// During the Next.js build "Collecting page data" phase, modules are
		// evaluated but route handlers are not invoked, so this code path is
		// never reached and the native .node binary does not need to exist.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const Database = require("better-sqlite3");
		const { drizzle } = require("drizzle-orm/better-sqlite3");
		const { webEnv } = require("@opencut/env/web");

		// DATABASE_URL is expected to be a file path like "file:/path/to/opencut.db"
		const dbPath = (webEnv.DATABASE_URL as string).replace(/^file:/, "");
		const sqlite = new Database(dbPath);
		// Enable WAL mode for better concurrent access
		sqlite.pragma("journal_mode = WAL");
		_db = drizzle(sqlite, { schema });
	}

	return _db!;
}

/**
 * Lazy proxy – the underlying better-sqlite3 connection is only created when
 * a property on `db` is first accessed (i.e. at request time), not when the
 * module is imported during the build.
 */
export const db: Db = new Proxy({} as Db, {
	get(_target, prop, receiver) {
		const real = getDb();
		const value = Reflect.get(real, prop, receiver);
		return typeof value === "function" ? value.bind(real) : value;
	},
});

export * from "./schema";
