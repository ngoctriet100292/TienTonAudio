import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture(fetch) {
  const values = new Map([['tienton_session_revision',JSON.stringify({authenticated:true,stamp:'initial'})]]);
  const localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const window = new EventTarget();
  const cache = new Map();
  function load(file) {
    if (file.endsWith('.json')) return JSON.parse(readFileSync(file, 'utf8'));
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(code, { exports, require: (name) => load(resolve(dirname(file), name.endsWith('.json') ? name : name + '.ts')), window, localStorage, fetch:async(url,options={})=>url.endsWith('/auth/csrf')?json({data:{csrf_token:'c'.repeat(43)}}):fetch(url,options), Event, Error, AbortSignal, process: { env: {} }, console });
    return exports;
  }
  const { ApiClient } = load(resolve(root, 'src/lib/api.ts'));
  return { api: new ApiClient('https://api.example/api/v1'), values, load };
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const tokenResponse = {data:{authenticated:true}};

test('parallel expired cookie requests refresh once without exposing credentials',async()=>{
 let rotations=0;let renewed=false;
 const {api,values}=fixture(async(url,options)=>{
  assert.equal(options.credentials,'include');assert.equal(options.headers.Authorization,undefined);
  if(url.endsWith('/auth/refresh')){rotations++;await new Promise(r=>setImmediate(r));renewed=true;assert.equal(options.headers['X-CSRF-Token'],'c'.repeat(43));assert.equal(options.body,'{}');return json(tokenResponse)}
  return renewed?json({data:{total_users:7}}):json({error:'expired'},401);
 });
 const result=await Promise.all(Array.from({length:12},()=>api.getAdminStats()));assert.equal(rotations,1);assert.ok(result.every(x=>x.total_users===7));assert.equal(values.has('access_token'),false);assert.equal(values.has('refresh_token'),false);
});
test('temporary refresh failure preserves authenticated session state',async()=>{
 const {api,values}=fixture(async url=>url.endsWith('/auth/refresh')?json({error:'unavailable'},503):json({error:'expired'},401));
 await assert.rejects(api.getMe(),e=>e.status===503);assert.equal(JSON.parse(values.get('tienton_session_revision')).authenticated,true);
});
test('logout waits for an in-flight refresh and then clears the browser session',async()=>{
 let finish,start;let active=false;const waiting=new Promise(r=>start=r);const calls=[];
 const {api,values}=fixture(async(url)=>{
  if(url.endsWith('/auth/refresh')){calls.push('refresh');start();await new Promise(r=>finish=r);active=true;return json(tokenResponse)}
  if(url.endsWith('/auth/logout')){calls.push('logout');active=false;return json({data:{logged_out:true}})}
  return active?json({data:{total_users:1}}):json({error:'expired'},401);
 });
 const request=api.getAdminStats();await waiting;const logout=api.logout();finish();await Promise.allSettled([request,logout]);assert.deepEqual(calls,['refresh','logout']);assert.equal(active,false);assert.equal(JSON.parse(values.get('tienton_session_revision')).authenticated,false);
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

test('missing refresh cookie ends the session without retry loops',async()=>{
 let calls=0;const {api,values}=fixture(async()=>{calls++;return json({error:'expired'},401)});
 assert.equal(await api.getMe(),null);assert.equal(calls,2);assert.equal(JSON.parse(values.get('tienton_session_revision')).authenticated,false);
});

test('story metadata cannot break out of the JSON-LD script element', () => {
  const { load } = fixture(async () => json({}));
  const { serializeJsonLd } = load(resolve(root, 'src/lib/json-ld.ts'));
  const metadata = { name: '</script><script>alert("session theft")</script>', description: '<img src=x onerror=alert(1)>' };
  const output = serializeJsonLd(metadata);
  assert.equal(output.includes('<'), false);
  assert.deepEqual(JSON.parse(output), metadata);
});

test('partner activation refreshes cookie claims before subsequent studio requests',async()=>{
 const calls=[];const {api}=fixture(async(url,options)=>{
  calls.push(url);assert.equal(options.headers.Authorization,undefined);assert.equal(options.credentials,'include');
  if(url.endsWith('/partner/become-partner'))return json({data:{user_id:'user',role:'partner'}});
  if(url.endsWith('/auth/refresh'))return json(tokenResponse);
  return json({data:{total_stories:1}});
 });
 await api.becomePartner();await api.getPartnerStats();assert.ok(calls.findIndex(x=>x.endsWith('/auth/refresh'))<calls.findIndex(x=>x.endsWith('/partner/stats')));
});

test('catalogue failures are not converted into empty success responses', async () => {
  const { api } = fixture(async () => json({ error: 'unavailable' }, 503));
  await assert.rejects(api.getStories(), error => error.status === 503);
  await assert.rejects(api.getCategories(), error => error.status === 503);
  await assert.rejects(api.getStoryBySlug('missing'), error => error.status === 503);
});

test('missing story and chapter return null only for HTTP 404', async () => {
  const { api } = fixture(async () => json({ error: 'not found' }, 404));
  assert.equal(await api.getStoryBySlug('missing'), null);
  assert.equal(await api.getChapter('missing'), null);
});

test('successful 204 mutations do not attempt to parse JSON', async () => {
  const { api } = fixture(async () => new Response(null, { status: 204 }));
  await api.logout();
});

test('chapter routes reject chapters that belong to another story', async () => {
  const { load } = fixture(async () => json({}));
  const { resolveChapterRoute } = load(resolve(root, 'src/lib/chapter-route.ts'));
  const id = '12345678-1234-1234-1234-123456789abc';
  const source = { getStoryBySlug: async () => ({ id: 'story-a' }), getStoryChapters: async () => [], getChapter: async () => ({ id, story_id: 'story-b' }) };
  assert.equal(await resolveChapterRoute(source, 'story-a', id), null);
});

test('numeric chapter routes resolve through the actual story chapter list', async () => {
  const { load } = fixture(async () => json({}));
  const { resolveChapterRoute } = load(resolve(root, 'src/lib/chapter-route.ts'));
  let requested;
  const chapter = { id: 'chapter-uuid', chapter_number: 2, story_id: 'story-a' };
  const source = { getStoryBySlug: async () => ({ id: 'story-a' }), getStoryChapters: async () => [chapter], getChapter: async id => { requested = id; return chapter; } };
  assert.equal((await resolveChapterRoute(source, 'story-a', '2')).chapter.id, chapter.id);
  assert.equal(requested, chapter.id);
  assert.equal(await resolveChapterRoute(source, 'story-a', '3'), null);
});


test('nullable catalogue counters do not break story cards', async () => {
  const { api } = fixture(async () => json({ data: [{ id: 'story-a', title: 'Truyện', rating_avg: null, total_chapters: null }] }));
  const [story] = await api.getStories();
  assert.equal(story.rating_avg.toFixed(1), '0.0');
  assert.equal(story.total_chapters.toLocaleString('vi-VN'), '0');
  assert.equal(story.categories.length, 0);
});

test('progress uses the catalogue returned by the API, including edited thresholds', () => {
  const { load } = fixture(async () => json({}));
  const { adaptRealms, getRealmProgress } = load(resolve(root, 'src/lib/cultivation.ts'));
  const seed = JSON.parse(readFileSync(resolve(root, '../backend/internal/domain/cultivation_realms.json'), 'utf8'));
  const realms = adaptRealms(seed);
  assert.equal(realms.length, 34);
  for (const realm of realms) assert.equal(getRealmProgress(realm.min_exp, realms).realm.name, realm.name);
  assert.equal(getRealmProgress(20000000, realms).realm.name, 'Tiên Đế');
  const edited = seed.map(r => ({ ...r }));
  edited[10].max_exp = 330000;
  edited[11].min_exp = 330000;
  edited[11].name = 'Kết Đan mới';
  const updated = adaptRealms(edited);
  assert.equal(getRealmProgress(310000, updated).realm.name, 'Trúc Cơ');
  assert.equal(getRealmProgress(330000, updated).realm.name, 'Kết Đan mới');
  assert.throws(() => adaptRealms([]));
  assert.throws(() => adaptRealms([{ ...seed[0], min_exp: 10 }]));
});

test('cultivation responses preserve server data and catalogue failures propagate', async () => {
  const server = { current_exp: 310000, current_realm: 'Cảnh giới từ DB', level: 11, all_realms: [] };
  const { api } = fixture(async url => String(url).endsWith('/cultivation/realms') ? json({ error: 'DB unavailable' }, 503) : json({ data: server }));
  assert.deepEqual(await api.getCultivation(), server);
  await assert.rejects(() => api.getCultivationRealms());
});


test('subscription plans use server names and prices; failures remain errors', async () => {
  const plan = { id: 1, name: 'Kết Đan (30 ngày)', price: 49000, duration_days: 30, description: 'Quyền lợi từ DB' };
  const success = fixture(async () => json({ data: [plan] }));
  assert.deepEqual(await success.api.getSubscriptionPlans(), [plan]);
  const failure = fixture(async () => json({ error: 'unavailable' }, 503));
  await assert.rejects(() => failure.api.getSubscriptionPlans());
});


test('OAuth code exchange is single-flight and includes browser cookies', async () => {
  let exchanges=0;
  const { api } = fixture(async (url, options) => {
    assert.equal(String(url).endsWith('/auth/oauth/exchange'), true);
    assert.equal(options.credentials, 'include');
    assert.deepEqual(JSON.parse(options.body), { provider: 'google', code: 'one-use-code' });
    exchanges++;
    return json({ data: { mfa_required: true, mfa_token: 'mfa-only' } });
  });
  const [first, second] = await Promise.all([api.exchangeOAuthCode('google', 'one-use-code'), api.exchangeOAuthCode('google', 'one-use-code')]);
  assert.equal(exchanges, 1);
  assert.deepEqual(first, second);
  assert.equal(first.mfa_required, true);
});

test('invalid OAuth codes do not rotate an existing login session', async () => {
  let calls=0;
  const { api, values } = fixture(async () => { calls++; return json({ error: 'invalid code' }, 401); });
  await assert.rejects(() => api.exchangeOAuthCode('google', 'invalid-code'));
  assert.equal(calls, 1);
  assert.equal(JSON.parse(values.get('tienton_session_revision')).authenticated,true);
});

test('catalogue sends advanced filters to the server and normalizes nullable counters', async () => {
  const {api}=fixture(async(url,options)=>{
    const parsed=new URL(url);
    assert.equal(parsed.pathname,'/api/v1/catalogue/search');
    assert.equal(parsed.searchParams.get('narrator'),'Giọng đọc A');
    assert.equal(parsed.searchParams.get('min_chapters'),'200');
    assert.equal(parsed.searchParams.get('min_minutes'),'120');
    assert.equal(options.cache,'no-store');
    return json({data:[{id:'story',view_count:null,rating_avg:null,total_chapters:200,categories:null}]});
  });
  const result=await api.searchCatalogue(new URLSearchParams({narrator:'Giọng đọc A',min_chapters:'200',min_minutes:'120'}));
  assert.equal(result[0].view_count,0);
  assert.equal(result[0].total_chapters,200);
});

test('guest playback never posts listening data to an authenticated endpoint', async () => {
  let calls=0;const {api,values}=fixture(async()=>{calls++;return json({data:{}})});
  values.clear();await api.saveListeningProgress('chapter',200,false,1,'story');
  assert.equal(calls,0);
});

test('OAuth linking includes current authorization and browser binding cookies',async()=>{
  const {api}=fixture(async(url,options)=>{
    assert.equal(new URL(url).pathname,'/api/v1/auth/oauth/google/link');
    assert.equal(options.headers.Authorization,undefined);
    assert.equal(options.headers['X-CSRF-Token'],'c'.repeat(43));
    assert.equal(options.credentials,'include');
    assert.equal(options.method,'POST');
    return json({data:{auth_url:'https://accounts.google.com/authorize'}});
  });
  const result=await api.platformRequest('/auth/oauth/google/link',{method:'POST',credentials:'include'});
  assert.equal(result.auth_url,'https://accounts.google.com/authorize');
});

test('expired authenticated OAuth linking refreshes the app session and preserves cookies',async()=>{
 let rotations=0;
 const {api}=fixture(async(url,options)=>{
  if(url.endsWith('/auth/refresh')){rotations++;return json(tokenResponse)}
  assert.equal(options.credentials,'include');
  return rotations?json({data:{auth_url:'https://accounts.google.com/authorize'}}):json({error:'expired'},401);
 });
 const result=await api.platformRequest('/auth/oauth/google/link',{method:'POST',credentials:'include'});
 assert.equal(rotations,1);assert.ok(result.auth_url);
});

test('CSRF expiry retries once after fetching a fresh token',async()=>{
 let attempts=0;const {api}=fixture(async()=>++attempts===1?json({error:'csrf expired',code:'csrf_failed'},403):json({data:{saved:true}}));
 const result=await api.platformRequest('/stories/story/reviews',{method:'PUT',body:'{}'});assert.equal(attempts,2);assert.equal(result.saved,true);
});
test('paginated catalogue preserves totals and sends the requested page',async()=>{
 const {api}=fixture(async(url)=>{assert.equal(new URL(url).searchParams.get('page'),'2');return json({data:{items:[{id:'story',view_count:null}],page:2,limit:20,total:35,total_pages:2}})});
 const page=await api.searchCataloguePage(new URLSearchParams({page:'2'}));assert.equal(page.total,35);assert.equal(page.page,2);assert.equal(page.items[0].view_count,0);
});
test('draft conflicts preserve their machine-readable error code',async()=>{
 const {api}=fixture(async()=>json({error:'Version changed',code:'draft_conflict'},409));
 await assert.rejects(api.platformRequest('/partner/chapters/id/draft',{method:'PUT',body:'{}'}),error=>error.status===409&&error.code==='draft_conflict');
});


test('expired CSRF is renewed before rotating an expired access cookie', async () => {
  let refreshes=0;let rotated=false;
  const {api}=fixture(async(url)=>{
    if(url.endsWith('/auth/refresh')){
      refreshes++;
      if(refreshes===1)return json({code:'csrf_failed'},403);
      rotated=true;return json(tokenResponse);
    }
    return rotated?json({data:{id:'user'}}):json({error:'expired'},401);
  });
  assert.equal((await api.getMe()).id,'user');assert.equal(refreshes,2);
});

test('CSRF recovery and access refresh each get one retry for a mutation', async () => {
  let attempts=0;let refreshes=0;
  const {api}=fixture(async(url)=>{
    if(url.endsWith('/auth/refresh')){refreshes++;return json(tokenResponse);}
    attempts++;
    if(attempts===1)return json({code:'csrf_failed'},403);
    if(attempts===2)return json({error:'expired'},401);
    return new Response(null,{status:204});
  });
  await api.platformRequest('/partner/chapters/example/draft',{method:'PUT',body:'{}'});
  assert.equal(attempts,3);assert.equal(refreshes,1);
});
