import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { publicCatalog, resolveSelection } from './lib/catalog.js';
import { buildPrompt } from './lib/prompt.js';
import { generateTryOn, TryOnError } from './lib/gemini.js';
import { generateTryOnCloudflare, outputSize, CF_MAX_INPUT } from './lib/cloudflare.js';

try {
  process.loadEnvFile?.(); // reads .env if present (Node 20.12+)
} catch {
  /* no .env file, rely on real environment variables */
}

const PORT = Number(process.env.PORT || 3000);
const MOCK = process.env.TRYON_MOCK === '1';
// 'cloudflare' = Cloudflare Workers AI (FLUX.2) makes the preview. Needs CF_ACCOUNT_ID and CF_API_TOKEN.
//                Has a free daily allowance, so it can cost nothing at low volume.
// 'gemini'     = Google Gemini image model makes the preview. Needs GEMINI_API_KEY.
// 'free'       = recolours the user's own hair in their browser. No account, no cost.
// If TRYON_MODE is not set, the first of cloudflare, gemini, free whose credentials exist is used.
const HAS_CF = Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN);
const MODE = MOCK ? 'mock' : process.env.TRYON_MODE || (HAS_CF ? 'cloudflare' : process.env.GEMINI_API_KEY ? 'gemini' : 'free');
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // decoded size
const PER_IP_PER_MINUTE = Number(process.env.RATE_PER_MINUTE || 4);
// Global daily cap protects your bill. Cloudflare's free allowance is roughly 90 previews a day at the default size.
const DAILY_CAP = Number(process.env.DAILY_CAP || (MODE === 'cloudflare' ? 80 : 300));
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
// CORS: the Shopify store calls this service from the browser.
// Default (CORS_ORIGINS unset, empty or "*"): any website may call it, so it runs anywhere with no setup.
// To lock it to your store, set CORS_ORIGINS="https://radrasa.com,https://store.myshopify.com".
// Note: CORS only controls browsers. Abuse protection is the rate limit and DAILY_CAP below.
const CORS_LIST = (process.env.CORS_ORIGINS || '*').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
const CORS_OPEN = CORS_LIST.length === 0 || CORS_LIST.includes('*');
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const ok = CORS_OPEN || (Boolean(origin) && CORS_LIST.includes(origin));
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', CORS_OPEN ? '*' : origin);
    if (!CORS_OPEN) res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(ok ? 204 : 403);
  next();
});
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// MediaPipe runs in the browser; serve its files from our own server so nothing depends on a CDN.
app.use('/vendor/mediapipe', express.static(path.join(__dirname, 'node_modules/@mediapipe/tasks-vision')));
// Hair segmentation model: use a local copy if you downloaded one, otherwise Google's public file.
const LOCAL_MODEL = path.join(__dirname, 'public/models/hair_segmenter.tflite');
const MODEL_URL = fs.existsSync(LOCAL_MODEL)
  ? '/models/hair_segmenter.tflite'
  : 'https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite';

// ---- tiny in-memory rate limiting (swap for Redis if you run several instances) ----
const hits = new Map();
let day = new Date().toDateString();
let dayCount = 0;

function allowed(ip) {
  const today = new Date().toDateString();
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  if (dayCount >= DAILY_CAP) return { ok: false, why: 'Today\'s preview limit has been reached. Please try again tomorrow.' };
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= PER_IP_PER_MINUTE) return { ok: false, why: 'Too many previews in a minute. Please wait a moment.' };
  recent.push(now);
  hits.set(ip, recent);
  dayCount += 1;
  return { ok: true };
}

app.get('/api/catalog', (_req, res) => res.json({ styles: publicCatalog(), mock: MOCK, mode: MODE, modelUrl: MODEL_URL }));

app.post('/api/tryon', async (req, res) => {
  if (MODE === 'free') return res.status(404).json({ error: 'AI previews are switched off. This site runs in free mode.' });
  const { image, styleId, color, length, consent } = req.body || {};

  if (consent !== true) return res.status(400).json({ error: 'Please confirm the photo is of you and you are 18 or over.' });
  if (!image || typeof image.data !== 'string' || !ALLOWED_MIME.has(image.mime)) {
    return res.status(400).json({ error: 'Upload a JPEG, PNG or WebP photo.' });
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(image.data)) return res.status(400).json({ error: 'The photo data is not valid.' });
  if (Buffer.byteLength(image.data, 'base64') > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: 'That photo is too large. Please use one under 8 MB.' });
  }

  const selection = resolveSelection(styleId, color, length);
  if (!selection) return res.status(400).json({ error: 'That style, colour or length is not available.' });

  let size = null;
  if (MODE === 'cloudflare') {
    const w = Number(image.width);
    const h = Number(image.height);
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 64 || h < 64 || Math.max(w, h) > CF_MAX_INPUT) {
      return res.status(400).json({ error: `Send a photo no larger than ${CF_MAX_INPUT} px on its longest side, with its width and height.` });
    }
    size = outputSize(w, h);
  }

  const gate = allowed(req.ip);
  if (!gate.ok) return res.status(429).json({ error: gate.why });

  const label = `${selection.style.name}, ${selection.color.name}${selection.length ? `, ${selection.length.inches}"` : ''}`;

  try {
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 1200));
      return res.json({ image: image, label, price: selection.price, mock: true });
    }
    const signal = AbortSignal.timeout(90_000);
    const out =
      MODE === 'cloudflare'
        ? await generateTryOnCloudflare({ prompt: buildPrompt(selection, { compact: true }), image, ...size, signal })
        : await generateTryOn({ prompt: buildPrompt(selection), image, signal });
    return res.json({ image: out, label, price: selection.price });
  } catch (err) {
    const status = err instanceof TryOnError ? err.status : 500;
    if (!(err instanceof TryOnError)) console.error(err);
    return res.status(status).json({ error: err instanceof TryOnError ? err.message : 'Something went wrong. Please try again.' });
  }
});

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That photo is too large. Please use one under 8 MB.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Radrasa try-on running at http://localhost:${PORT}${MOCK ? ' (MOCK mode, no Gemini calls)' : ''}`);
    console.log(`Mode: ${MODE}${MODE === 'free' ? ' (no account needed, hair colour is changed in the browser)' : ''}`);
    if (MODE === 'gemini' && !process.env.GEMINI_API_KEY) console.warn('Warning: GEMINI_API_KEY is not set. Copy .env.example to .env.');
    if (MODE === 'cloudflare' && !HAS_CF) console.warn('Warning: set CF_ACCOUNT_ID and CF_API_TOKEN in .env.');
  });
}

export { app };
export default app;
