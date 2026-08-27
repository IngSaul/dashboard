import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyPragmas } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
describe('migrate', () => {
    let db;
    beforeEach(() => {
        db = new Database(':memory:');
        applyPragmas(db);
        migrate(db);
    });
    it('creates the users, sessions, and dashboard_configs tables', () => {
        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name")
            .all();
        expect(tables.map((t) => t.name)).toEqual(['dashboard_configs', 'sessions', 'users']);
    });
    it('enforces case-insensitive unique usernames', () => {
        db.prepare("INSERT INTO users (username, password_hash) VALUES ('Alice', 'hash')").run();
        expect(() => db.prepare("INSERT INTO users (username, password_hash) VALUES ('alice', 'hash2')").run()).toThrow();
    });
    it('enforces unique session token hashes', () => {
        const user = db
            .prepare("INSERT INTO users (username, password_hash) VALUES ('bob', 'hash') RETURNING id")
            .get();
        db.prepare(`INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at)
       VALUES ('tok', ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')`).run(user.id);
        expect(() => db
            .prepare(`INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at)
           VALUES ('tok', ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')`)
            .run(user.id)).toThrow();
    });
    it('cascades session and dashboard_config deletion when a user is deleted', () => {
        const user = db
            .prepare("INSERT INTO users (username, password_hash) VALUES ('carol', 'hash') RETURNING id")
            .get();
        db.prepare(`INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at)
       VALUES ('tok2', ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')`).run(user.id);
        db.prepare("INSERT INTO dashboard_configs (user_id, config_json, schema_version, updated_at) VALUES (?, '{}', 1, '2026-01-01T00:00:00.000Z')").run(user.id);
        db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
        expect(db.prepare('SELECT * FROM sessions WHERE user_id = ?').all(user.id)).toEqual([]);
        expect(db.prepare('SELECT * FROM dashboard_configs WHERE user_id = ?').all(user.id)).toEqual([]);
    });
});
//# sourceMappingURL=migrate.test.js.map