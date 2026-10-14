import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture(fetch) {
  const values = new Map([['access_token', 'old-access'], ['refresh_token', 'old-refresh']]);
  const localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const window = new EventTarget();
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(code, { exports, require: (name) => load(resolve(dirname(file), name + '.ts')), window, localStorage, fetch, Event, Error, process: { env: {} }, console });
    return exports;
  }
  const { ApiClient } = load(resolve(root, 'src/lib/api.ts'));
  return { api: new ApiClient('https://api.example/api/v1'), values, load };
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const tokenResponse = { data: { access_token: 'new-access', refresh_token: 'new-refresh' } };

test('parallel unauthorized requests rotate the refresh token once', async () => {
  let rotations = 0;
  const { api, values } = fixture(async (url, options) => {
    if (url.endsWith('/auth/refresh')) { rotations++; await new Promise((done) => setImmediate(done)); return json(tokenResponse); }
    return options.headers.Authorization === 'Bearer new-access' ? json({ data: { total_users: 7 } }) : json({ error: 'expired' }, 401);
  });
  const results = await Promise.all(Array.from({ length: 12 }, () => api.getAdminStats()));
  assert.equal(rotations, 1);
  assert.ok(results.every((result) => result.total_users === 7));
  assert.equal(values.get('refresh_token'), 'new-refresh');
});

test('temporary refresh failure preserves the session', async () => {
  const { api, values } = fixture(async (url) => url.endsWith('/auth/refresh') ? json({ error: 'unavailable' }, 503) : json({ error: 'expired' }, 401));
  await assert.rejects(api.getMe(), (error) => error.status === 503);
  assert.equal(values.get('access_token'), 'old-access');
  assert.equal(values.get('refresh_token'), 'old-refresh');
});

test('logout while refresh is pending cannot restore the old session', async () => {
  let finish;
  let started;
  const waiting = new Promise((done) => { started = done; });
  const { api, values } = fixture(async (url) => {
    if (url.endsWith('/auth/refresh')) { started(); return new Promise((done) => { finish = done; }); }
    return json({ error: 'expired' }, 401);
  });
  const request = api.getAdminStats();
  await waiting;
  values.clear();
  finish(json(tokenResponse));
  await assert.rejects(request, (error) => error.status === 401);
  assert.equal(values.size, 0);
});

test('bad login credentials do not rotate an existing session', async () => {
  let rotations = 0;
  const { api } = fixture(async (url) => { if (url.endsWith('/auth/refresh')) rotations++; return json({ error: 'invalid credentials' }, 401); });
  await assert.rejects(api.login('user@example.com', 'wrong'), (error) => error.status === 401);
  assert.equal(rotations, 0);
});

test('2FA enable submits both the setup secret and the verification code', async () => {
  let payload;
  const { api } = fixture(async (_url, options) => { payload = JSON.parse(options.body); return json({ data: { backup_codes: ['backup'] } }); });
  const result = await api.enable2FA('SETUP-SECRET', '123456');
  assert.deepEqual(payload, { secret: 'SETUP-SECRET', code: '123456' });
  assert.equal(result.backup_codes[0], 'backup');
});

test('expired access without a refresh token clears the cached session', async () => {
  const { api, values } = fixture(async () => json({ error: 'expired' }, 401));
  values.delete('refresh_token');
  assert.equal(await api.getMe(), null);
  assert.equal(values.has('access_token'), false);
});

test('story metadata cannot break out of the JSON-LD script element', () => {
  const { load } = fixture(async () => json({}));
  const { serializeJsonLd } = load(resolve(root, 'src/lib/json-ld.ts'));
  const metadata = { name: '</script><script>alert("session theft")</script>', description: '<img src=x onerror=alert(1)>' };
  const output = serializeJsonLd(metadata);
  assert.equal(output.includes('<'), false);
  assert.deepEqual(JSON.parse(output), metadata);
});
