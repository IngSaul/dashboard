import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyPragmas } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { hashPassword } from '../src/auth/password.js';
import { buildApp } from '../src/app.js';
const TTL = { idleTtlDays: 30, absoluteTtlDays: 90 };
function extractSessionCookie(setCookieHeader) {
    const header = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
    if (!header) {
        throw new Error('expected a Set-Cookie header');
    }
    return header.split(';')[0];
}
describe('dashboard routes', () => {
    let db;
    let app;
    beforeEach(async () => {
        db = new Database(':memory:');
        applyPragmas(db);
        migrate(db);
        const passwordHash = await hashPassword('password-one-123');
        db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('userone', ?, 'user')").run(passwordHash);
        const passwordHashTwo = await hashPassword('password-two-123');
        db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('usertwo', ?, 'user')").run(passwordHashTwo);
        app = await buildApp({ db, cookieSecure: false, sessionTtl: TTL, logger: false });
    });
    afterEach(async () => {
        await app.close();
    });
    async function loginAs(username, password) {
        const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { username, password } });
        return extractSessionCookie(login.headers['set-cookie']);
    }
    it('returns 404 for a user with no saved config yet', async () => {
        const cookie = await loginAs('userone', 'password-one-123');
        const response = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie } });
        expect(response.statusCode).toBe(404);
    });
    it('rejects unauthenticated access', async () => {
        const response = await app.inject({ method: 'GET', url: '/dashboard' });
        expect(response.statusCode).toBe(401);
    });
    it('round-trips a PUT then GET for the same user', async () => {
        const cookie = await loginAs('userone', 'password-one-123');
        const config = { version: 1, theme: 'dark' };
        const put = await app.inject({ method: 'PUT', url: '/dashboard', headers: { cookie }, payload: config });
        expect(put.statusCode).toBe(200);
        expect(put.json()).toEqual({ updatedAt: expect.any(String) });
        const get = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie } });
        expect(get.statusCode).toBe(200);
        expect(get.json()).toEqual(config);
    });
    it('rejects a malformed dashboard payload', async () => {
        const cookie = await loginAs('userone', 'password-one-123');
        const response = await app.inject({
            method: 'PUT',
            url: '/dashboard',
            headers: { cookie },
            payload: { notAValidConfig: true },
        });
        expect(response.statusCode).toBe(400);
    });
    it('keeps two users fully isolated — neither can read or overwrite the other', async () => {
        const cookieOne = await loginAs('userone', 'password-one-123');
        const cookieTwo = await loginAs('usertwo', 'password-two-123');
        await app.inject({
            method: 'PUT',
            url: '/dashboard',
            headers: { cookie: cookieOne },
            payload: { version: 1, theme: 'light', owner: 'one' },
        });
        await app.inject({
            method: 'PUT',
            url: '/dashboard',
            headers: { cookie: cookieTwo },
            payload: { version: 1, theme: 'dark', owner: 'two' },
        });
        const getOne = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie: cookieOne } });
        const getTwo = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie: cookieTwo } });
        expect(getOne.json()).toEqual({ version: 1, theme: 'light', owner: 'one' });
        expect(getTwo.json()).toEqual({ version: 1, theme: 'dark', owner: 'two' });
    });
});
//# sourceMappingURL=dashboard.test.js.map