// Tests the Cloudflare Workers AI mode against a fake Cloudflare server, plus catalog coverage.
import http from 'node:http';
import assert from 'node:assert/strict';

const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const JPEG_B64 = '/9j/4AAQSkZJRg=='; // starts like a JPEG
let seen = null;
let behave = 'ok';

const fake = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (d) => chunks.push(d));
  req.on('end', async () => {
    const buf = Buffer.concat(chunks);
    let form = null;
    try {
      form = await new Response(buf, { headers: { 'content-type': req.headers['content-type'] } }).formData();
    } catch { /* not multipart */ }
    seen = { url: req.url, auth: req.headers.authorization, form };
    res.setHeader('Content-Type', 'application/json');
    if (behave === 'quota') { res.statusCode = 429; return res.end(JSON.stringify({ success: false, errors: [{ code: 4006, message: 'you have used up your daily free allocation of 10,000 neurons' }] })); }
    if (behave === 'auth') { res.statusCode = 403; return res.end(JSON.stringify({ success: false, errors: [{ message: 'Authentication error' }] })); }
    if (behave === 'empty') return res.end(JSON.stringify({ success: true, result: {} }));
    res.end(JSON.stringify({ success: true, errors: [], result: { image: JPEG_B64 } }));
  });
});
await new Promise((r) => fake.listen(0, r));

delete process.env.GEMINI_API_KEY;
delete process.env.TRYON_MOCK;
delete process.env.TRYON_MODE;
process.env.CF_ACCOUNT_ID = 'acct123';
process.env.CF_API_TOKEN = 'tok-abc';
process.env.CF_BASE_URL = `http://127.0.0.1:${fake.address().port}`;
process.env.RATE_PER_MINUTE = '1000';

const { app } = await import('../server.js');
const { STYLES, resolveSelection } = await import('../lib/catalog.js');
const { buildPrompt } = await import('../lib/prompt.js');
const { outputSize } = await import('../lib/cloudflare.js');
const srv = app.listen(0);
const base = `http://127.0.0.1:${srv.address().port}`;
const post = (p) => fetch(`${base}/api/tryon`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
const good = { image: { mime: 'image/png', data: PIXEL, width: 360, height: 480 }, styleId: 'loose-wave', color: 'Jet black', length: 22, consent: true };
let n = 0;
const ok = (m) => console.log(`  ok ${++n} ${m}`);

// ---- catalog covers the whole store ----
const STORE_HAIR = [
  'brazilian-kinky-straight-human-hair', 'pixie-curly-human-hair-bundles', 'perismoda-body-wave-bundles-human-hair',
  'human-hair-bundles-loose-wave-bundles', 'straight-human-hair-weave-bundles', 'curly-human-hair-bundles-30-32-inch',
  'hair-bundles-curly-hair-burmese-weaving', 'hair-extensions-balayage-blonde-hair', 'hair-extension-black-long-straight',
  'unicorn-clip-in-colored-hair-extensions', 'synthetic-claw-clip-ponytail-long-wavy', 'synthetic-passion-twists-crochet-hair',
  'marlybob-jerry-curl-jamaican-bounce', 'yanky-twist-crochet-hair-pre-looped', '4-pack-brazilian-wool-hair',
];
assert.equal(STORE_HAIR.length, 15);
assert.deepEqual([...new Set(STORE_HAIR)].sort(), STORE_HAIR.slice().sort());
const mine = STYLES.map((s) => s.handle).sort();
assert.deepEqual(mine, STORE_HAIR.slice().sort());
assert.equal(new Set(STYLES.map((s) => s.id)).size, STYLES.length, 'style ids must be unique');
ok('catalog has exactly the 15 hair products in the store');

let combos = 0;
for (const s of STYLES) for (const col of s.colors) for (const len of s.lengths || [null]) {
  const sel = resolveSelection(s.id, col.name, len?.inches);
  assert.ok(sel, `${s.id}/${col.name}/${len?.inches}`);
  assert.ok(sel.price > 0, `${s.id} needs a price`);
  const full = buildPrompt(sel);
  const compact = buildPrompt(sel, { compact: true });
  assert.ok(full.includes(col.name) && compact.includes(col.name) && compact.includes(s.name));
  assert.ok(compact.length < full.length);
  combos++;
}
ok(`prompts and prices work for all ${combos} variants`);

// ---- mode and request shape ----
const cat = await (await fetch(`${base}/api/catalog`)).json();
assert.equal(cat.mode, 'cloudflare');
assert.equal(cat.styles.length, 15);
ok('server picks Cloudflare when its credentials are set');

assert.deepEqual(outputSize(360, 480), { width: 576, height: 768 });
assert.deepEqual(outputSize(480, 270), { width: 768, height: 432 });
ok('output size keeps the photo shape in multiples of 16');

let r = await post(good);
let j = await r.json();
assert.equal(r.status, 200, JSON.stringify(j));
assert.equal(seen.url, '/client/v4/accounts/acct123/ai/run/@cf/black-forest-labs/flux-2-klein-4b');
assert.equal(seen.auth, 'Bearer tok-abc');
assert.match(seen.form.get('prompt'), /Loose wave bundles/);
assert.match(seen.form.get('prompt'), /Jet black/);
assert.equal(seen.form.get('width'), '576');
assert.equal(seen.form.get('height'), '768');
const file = seen.form.get('input_image_0');
assert.ok(file && file.size > 0 && file.type === 'image/png');
assert.equal(j.image.data, JPEG_B64);
assert.equal(j.image.mime, 'image/jpeg');
ok('multipart request matches the Workers AI FLUX.2 format and the image comes back');

// ---- validation ----
assert.equal((await post({ ...good, image: { ...good.image, width: 1280, height: 960 } })).status, 400);
assert.equal((await post({ ...good, image: { mime: 'image/png', data: PIXEL } })).status, 400);
assert.equal((await post({ ...good, styleId: 'brazilian-wool', color: 'Neon' })).status, 400);
assert.equal((await post({ ...good, length: 99 })).status, 400);
ok('oversized photos and bad selections are rejected');

// styles without a length (wool) still work
r = await post({ ...good, styleId: 'brazilian-wool', color: 'Purple', length: null });
j = await r.json();
assert.equal(r.status, 200, JSON.stringify(j));
assert.equal(j.price, 10);
assert.match(seen.form.get('prompt'), /wool/i);
ok('wool (no length options) previews and prices correctly');

// "from" prices pass through
r = await post({ ...good, styleId: 'balayage-tape-in', color: 'Icy Platinum Blonde', length: 20 });
j = await r.json();
assert.equal(j.price, 286.67);
ok('starting prices are used where the store shows only "from"');

// ---- failures ----
behave = 'quota';
r = await post(good);
assert.equal(r.status, 429);
assert.match((await r.json()).error, /free allowance/);
behave = 'auth';
r = await post(good);
assert.equal(r.status, 500);
assert.match((await r.json()).error, /token was rejected/);
behave = 'empty';
r = await post(good);
assert.equal(r.status, 422);
ok('quota, bad token and empty replies give clear errors');

srv.close();
fake.close();
console.log(`\nAll ${n} Cloudflare checks passed.`);
