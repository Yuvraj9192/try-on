// Image editing through Cloudflare Workers AI (FLUX.2 klein by default).
// Docs: https://developers.cloudflare.com/workers-ai/models/flux-2-klein-9b/
// The model takes multipart form data: prompt, input_image_0 (a photo smaller than 512x512), width, height.
// The account id and API token stay on the server.
import { TryOnError } from './gemini.js';

export const CF_MAX_INPUT = 480; // input photos must be smaller than 512x512, the browser shrinks to this

/** Output size that keeps the photo's shape: longest side = CF_OUTPUT_MAX, multiples of 16, within 256-1920. */
export function outputSize(w, h, max = Number(process.env.CF_OUTPUT_MAX || 768)) {
  const scale = max / Math.max(w, h);
  const snap = (v) => Math.min(1920, Math.max(256, Math.round((v * scale) / 16) * 16));
  return { width: snap(w), height: snap(h) };
}

function sniffMime(b64) {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBOR')) return 'image/png';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

export async function generateTryOnCloudflare({ prompt, image, width, height, signal }) {
  const account = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!account || !token) throw new TryOnError('Server is missing Cloudflare credentials.', 500);

  const base = process.env.CF_BASE_URL || 'https://api.cloudflare.com';
  const model = process.env.CF_MODEL || '@cf/black-forest-labs/flux-2-klein-4b';

  const form = new FormData();
  form.append('prompt', prompt);
  form.append('input_image_0', new Blob([Buffer.from(image.data, 'base64')], { type: image.mime }), 'photo.jpg');
  form.append('width', String(width));
  form.append('height', String(height));
  if (process.env.CF_GUIDANCE) form.append('guidance', process.env.CF_GUIDANCE);

  let res;
  try {
    res = await fetch(`${base}/client/v4/accounts/${account}/ai/run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // fetch adds the multipart boundary itself
      body: form,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') throw new TryOnError('The preview took too long. Please try again.', 504);
    throw new TryOnError('Could not reach the image service. Please try again.', 502);
  }

  const raw = await res.text();
  let json = {};
  try {
    json = JSON.parse(raw);
  } catch {
    /* non-JSON error body */
  }

  if (!res.ok || json.success === false) {
    const detail = json?.errors?.[0]?.message || raw.slice(0, 200);
    console.error(`[cloudflare] ${res.status} ${detail}`);
    if (res.status === 429 || /capacity|rate limit|neurons|quota/i.test(detail)) {
      throw new TryOnError('The image service is busy or today\'s free allowance is used up. Please try again later.', 429);
    }
    if (res.status === 400 || res.status === 422) throw new TryOnError('The image service could not use this photo or request.', 422);
    if (res.status === 401 || res.status === 403) throw new TryOnError('The server\'s Cloudflare token was rejected.', 500);
    throw new TryOnError('The image service returned an error. Please try again.', 502);
  }

  const b64 = json?.result?.image ?? json?.image;
  if (typeof b64 !== 'string' || !b64) throw new TryOnError('No preview was generated. Try a clearer, front-facing photo.', 422);
  return { mime: sniffMime(b64), data: b64 };
}
