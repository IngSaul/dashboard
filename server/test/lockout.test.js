import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyPragmas } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { clearLockout, isLocked, recordFailedLogin } from '../src/auth/lockout.js';
function insertUser(db, username) {
    const row = db
        .prepare("INSERT INTO users (username, password_hash) VALUES (?, 'hash') RETURNING id")
        .get(username);
    return row.id;
}
describe('lockout', () => {
    let db;
    beforeEach(() => {
        db = new Database(':memory:');
        applyPragmas(db);
        migrate(db);
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it('does not lock before the 10th consecutive failure', () => {
        const userId = insertUser(db, 'alice');
        for (let i = 0; i < 9; i += 1) {
            const status = recordFailedLogin(db, userId);
            expect(status.locked).toBe(false);
        }
        expect(isLocked(db, userId)).toEqual({ locked: false, retryAfterSeconds: 0 });
    });
    it('locks the account on the 10th consecutive failure for 15 minutes', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        const userId = insertUser(db, 'bob');
        for (let i = 0; i < 9; i += 1) {
            recordFailedLogin(db, userId);
        }
        const status = recordFailedLogin(db, userId);
        expect(status.locked).toBe(true);
        expect(status.retryAfterSeconds).toBe(15 * 60);
        expect(isLocked(db, userId).locked).toBe(true);
    });
    it('a successful login before the 10th failure resets the counter', () => {
        const userId = insertUser(db, 'carol');
        for (let i = 0; i < 5; i += 1) {
            recordFailedLogin(db, userId);
        }
        clearLockout(db, userId);
        for (let i = 0; i < 9; i += 1) {
            const status = recordFailedLogin(db, userId);
            expect(status.locked).toBe(false);
        }
    });
    it('lock clears automatically once the 15-minute window elapses', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        const userId = insertUser(db, 'dave');
        for (let i = 0; i < 10; i += 1) {
            recordFailedLogin(db, userId);
        }
        expect(isLocked(db, userId).locked).toBe(true);
        vi.setSystemTime(new Date('2026-01-01T00:16:00.000Z'));
        expect(isLocked(db, userId)).toEqual({ locked: false, retryAfterSeconds: 0 });
    });
});
//# sourceMappingURL=lockout.test.js.map