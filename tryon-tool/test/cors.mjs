// Checks that only the configured store origins get CORS headers.
import assert from 'node:assert/strict';
delete process.env.CF_ACCOUNT_ID; delete process.env.CF_API_TOKEN; delete process.env.GEMINI_API_KEY;
process.env.CORS_ORIGINS = 'https://radrasa.com, https://demo.myshopify.com/';
const { app } = await import('../server.js');
const srv = app.listen(0);
const base = `http://127.0.0.1:${srv.address().port}`;
let n = 0; const ok = (m) => console.log(`  ok ${++n} ${m}`);

let r = await fetch(`${base}/api/tryon`, { method: 'OPTIONS', headers: { Origin: 'https://radrasa.com', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
assert.equal(r.status, 204);
assert.equal(r.headers.get('access-control-allow-origin'), 'https://radrasa.com');
assert.match(r.headers.get('access-control-allow-headers'), /content-type/i);
ok('preflight from the store is allowed');

r = await fetch(`${base}/api/tryon`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
assert.equal(r.status, 403);
assert.equal(r.headers.get('access-control-allow-origin'), null);
ok('preflight from another site is refused');

r = await fetch(`${base}/api/catalog`, { headers: { Origin: 'https://demo.myshopify.com' } });
assert.equal(r.status, 200);
assert.equal(r.headers.get('access-control-allow-origin'), 'https://demo.myshopify.com');
ok('trailing slash and spaces in CORS_ORIGINS are tolerated');

r = await fetch(`${base}/api/catalog`, { headers: { Origin: 'https://evil.example' } });
assert.equal(r.headers.get('access-control-allow-origin'), null);
ok('other origins get no CORS header');

srv.close();
console.log(`\nAll ${n} CORS checks passed.`);
