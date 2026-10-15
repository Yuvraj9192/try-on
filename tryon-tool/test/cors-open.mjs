// With CORS_ORIGINS unset, any website may call the API (works anywhere).
import assert from 'node:assert/strict';
delete process.env.CORS_ORIGINS; delete process.env.CF_ACCOUNT_ID; delete process.env.CF_API_TOKEN; delete process.env.GEMINI_API_KEY;
const { app } = await import('../server.js');
const srv = app.listen(0);
const base = `http://127.0.0.1:${srv.address().port}`;
let n = 0; const ok = (m) => console.log(`  ok ${++n} ${m}`);

let r = await fetch(`${base}/api/tryon`, { method: 'OPTIONS', headers: { Origin: 'https://anything.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
assert.equal(r.status, 204);
assert.equal(r.headers.get('access-control-allow-origin'), '*');
ok('preflight from any site is allowed by default');

r = await fetch(`${base}/api/catalog`, { headers: { Origin: 'https://other.example' } });
assert.equal(r.status, 200);
assert.equal(r.headers.get('access-control-allow-origin'), '*');
ok('API responses carry the wildcard CORS header');

srv.close();
console.log(`\nAll ${n} open-CORS checks passed.`);
