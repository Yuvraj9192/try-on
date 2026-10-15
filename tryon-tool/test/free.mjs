// Tests the free (no API key) mode: server config and the recolouring maths.
import assert from 'node:assert/strict';

delete process.env.GEMINI_API_KEY;
delete process.env.TRYON_MOCK;
delete process.env.TRYON_MODE;

const { app } = await import('../server.js');
const { recolorHair } = await import('../public/recolor.js');
const srv = app.listen(0);
const base = `http://127.0.0.1:${srv.address().port}`;
let n = 0;
const ok = (name) => console.log(`  ok ${++n} ${name}`);

// server
const cat = await (await fetch(`${base}/api/catalog`)).json();
assert.equal(cat.mode, 'free');
assert.ok(cat.modelUrl);
assert.ok(cat.styles.every((s) => s.mode));
ok('without a key the server starts in free mode');

const t = await fetch(`${base}/api/tryon`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
assert.equal(t.status, 404);
ok('the paid AI endpoint is off in free mode');

const js = await fetch(`${base}/vendor/mediapipe/vision_bundle.mjs`);
assert.equal(js.status, 200);
await js.arrayBuffer();
const wasm = await fetch(`${base}/vendor/mediapipe/wasm/vision_wasm_internal.wasm`);
assert.equal(wasm.status, 200);
assert.match(wasm.headers.get('content-type'), /wasm/);
await wasm.arrayBuffer();
ok('MediaPipe files are served locally with the right wasm type');
srv.close();
srv.closeAllConnections?.();

// recolour maths on a synthetic photo: skin background, dark hair block with light/dark strands
const W = 400, H = 60;
const make = () => {
  const data = new Uint8ClampedArray(W * H * 4);
  const hair = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, p = i * 4;
    const inHair = x >= 40 && x < 360 && y >= 8 && y < 52;
    if (inHair) { const v = 20 + ((x * 7 + y * 3) % 40); data.set([v, v - 3, v - 3, 255], p); hair[i] = 1; }
    else data.set([205, 155, 125, 255], p);
  }
  return { img: { data, width: W, height: H }, hair };
};
const px = (img, x, y) => Array.from(img.data.slice((y * W + x) * 4, (y * W + x) * 4 + 3));

let { img, hair } = make();
const before = make().img;
let res = recolorHair(img, hair, { hex: '#C8A24A' });
assert.ok(res.hairShare > 0.3);
assert.deepEqual(px(img, 2, 2), px(before, 2, 2), 'skin/background must not change');
const [r, g, b] = px(img, 200, 30);
assert.ok(r > g && g > b && r > 100, `hair should turn golden, got ${[r, g, b]}`);
ok('hair takes the new colour and the rest of the photo is untouched');

// shading is kept: a brighter source strand stays brighter after recolouring
const lum = (a) => a[0] + a[1] + a[2];
let bright = null, dark = null;
for (let x = 40; x < 360 && !(bright && dark); x++) {
  const v = lum(px(before, x, 30));
  if (v > 150 && !bright) bright = x;
  if (v < 90 && !dark) dark = x;
}
assert.ok(lum(px(img, bright, 30)) > lum(px(img, dark, 30)));
ok('strand shading survives the recolour');

// ombre: ends differ from roots
({ img, hair } = make());
recolorHair(img, hair, { hex: '#1A1A1A', hex2: '#E8C98A' });
assert.ok(lum(px(img, 200, 50)) > lum(px(img, 200, 10)) + 150, 'ends should be much lighter than roots');
ok('ombre goes dark at the roots to light at the ends');

// streaks: only some columns change
({ img, hair } = make());
const src = make().img;
recolorHair(img, hair, { hex: '#FF3CAC', streaks: true });
let changed = 0, total = 0;
for (let x = 40; x < 360; x++) { total++; if (px(img, x, 30).join() !== px(src, x, 30).join()) changed++; }
assert.ok(changed > 0 && changed < total * 0.6, `expected some streaks, got ${changed}/${total}`);
ok('streak styles colour only a few strands');

// no hair found
const empty = make();
const none = new Float32Array(W * H);
res = recolorHair(empty.img, none, { hex: '#C8A24A' });
assert.ok(res.hairShare < 0.004);
assert.deepEqual(px(empty.img, 200, 30), px(before, 200, 30));
ok('no hair in the mask leaves the photo alone and reports it');

assert.throws(() => recolorHair(make().img, new Float32Array(5), { hex: '#000000' }));
ok('mismatched mask size is rejected');

console.log(`\nAll ${n} free-mode checks passed.`);
