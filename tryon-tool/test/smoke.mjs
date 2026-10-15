// Run with: npm test
// Spins up a fake Gemini server and the real app, then exercises the whole flow without a real key.
import http from 'node:http';
import assert from 'node:assert/strict';

const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FINAL = 'RklOQUw='; // "FINAL"
const THOUGHT = 'VEhPVUdIVA=='; // "THOUGHT"

let seen = null;
let mode = 'ok';
const fake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (d) => (body += d));
  req.on('end', () => {
    seen = { url: req.url, key: req.headers['x-goog-api-key'], body: JSON.parse(body) };
    res.setHeader('Content-Type', 'application/json');
    if (mode === 'ratelimit') { res.statusCode = 429; return res.end(JSON.stringify({ error: { message: 'quota' } })); }
    if (mode === 'text') {
      return res.end(JSON.stringify({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'I cannot see a person in this photo.' }] }] }));
    }
    res.end(JSON.stringify({
      steps: [
        { type: 'thought', summary: [{ type: 'image', mime_type: 'image/png', data: THOUGHT }] },
        { type: 'model_output', content: [{ type: 'text', text: 'Here you go' }, { type: 'image', mime_type: 'image/png', data: FINAL }] },
      ],
    }));
  });
});
await new Promise((r) => fake.listen(0, r));
process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}`;
process.env.GEMINI_API_KEY = 'test-key';
process.env.RATE_PER_MINUTE = '1000';

const { app } = await import('../server.js');
const { STYLES, resolveSelection } = await import('../lib/catalog.js');
const { buildPrompt } = await import('../lib/prompt.js');
const srv = app.listen(0);
const base = `http://127.0.0.1:${srv.address().port}`;
const post = (payload) => fetch(`${base}/api/tryon`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
const good = { image: { mime: 'image/png', data: PIXEL }, styleId: 'body-wave', color: 'Natural black', length: 24, consent: true };

let n = 0;
const ok = (name) => console.log(`  ok ${++n} ${name}`);

// catalog + prompts
const cat = await (await fetch(`${base}/api/catalog`)).json();
assert.equal(cat.styles.length, STYLES.length);
assert.ok(!JSON.stringify(cat).includes('texture'), 'prompt text must not reach the browser');
ok('catalog served without prompt text');

let combos = 0;
for (const s of STYLES) {
  for (const col of s.colors) {
    for (const len of s.lengths || [null]) {
      const sel = resolveSelection(s.id, col.name, len?.inches);
      assert.ok(sel, `${s.id}/${col.name}/${len?.inches} should resolve`);
      const p = buildPrompt(sel);
      assert.ok(p.includes(s.name) && p.includes(col.name));
      combos++;
    }
  }
}
ok(`prompts build for all ${combos} catalog combinations`);

const p = buildPrompt(resolveSelection('pixie-curly', 'Natural black', 24));
assert.match(p, /24 inches stretched/);
assert.match(p, /around the ribcage|mid-chest|collarbone/); // 24" curly shrinks to about 15.6"
ok('curl shrinkage lowers the described length');

// validation
assert.equal((await post({ ...good, consent: false })).status, 400);
assert.equal((await post({ ...good, styleId: 'nope' })).status, 400);
assert.equal((await post({ ...good, length: 99 })).status, 400);
assert.equal((await post({ ...good, color: 'Neon' })).status, 400);
assert.equal((await post({ ...good, image: { mime: 'image/gif', data: PIXEL } })).status, 400);
assert.equal((await post({ ...good, image: { mime: 'image/png', data: 'not base64!!' } })).status, 400);
ok('bad input is rejected');

// happy path and request shape
const r = await post(good);
const j = await r.json();
assert.equal(r.status, 200, JSON.stringify(j));
assert.equal(j.image.data, FINAL, 'must return the final image, not the thought image');
assert.equal(j.price, 113.33);
assert.equal(seen.url, '/v1beta/interactions');
assert.equal(seen.key, 'test-key');
assert.equal(seen.body.model, 'gemini-nano-banana-2.1');
assert.equal(seen.body.input[0].type, 'text');
assert.equal(seen.body.input[1].type, 'image');
assert.equal(seen.body.input[1].mime_type, 'image/png');
assert.equal(seen.body.input[1].data, PIXEL);
assert.equal(seen.body.response_format.type, 'image');
ok('request shape matches the Interactions API and final image is chosen');

// upstream failures
mode = 'text';
let r2 = await post(good);
assert.equal(r2.status, 422);
assert.match((await r2.json()).error, /cannot see a person/);
ok('text-only reply becomes a clear 422');

mode = 'ratelimit';
r2 = await post(good);
assert.equal(r2.status, 429);
ok('upstream 429 is passed on');

srv.close();
fake.close();
console.log(`\nAll ${n} checks passed.`);
