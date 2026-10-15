// Thin wrapper around the Gemini Interactions API (image editing with Nano Banana).
// Docs: https://ai.google.dev/gemini-api/docs/image-generation
// Uses plain fetch so there is no SDK to keep in sync. The key never leaves the server.

export class TryOnError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function pickImage(json) {
  // Final image lives in a model_output step. Thought steps may also carry draft images, so skip those.
  let image = null;
  const texts = [];
  for (const step of json.steps || []) {
    if (step.type !== 'model_output') continue;
    for (const block of step.content || []) {
      if (block.type === 'image' && block.data) image = block;
      if (block.type === 'text' && block.text) texts.push(block.text);
    }
  }
  if (!image && json.output_image?.data) image = json.output_image;
  return { image, text: texts.join(' ').trim() };
}

export async function generateTryOn({ prompt, image, signal }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new TryOnError('Server is missing GEMINI_API_KEY.', 500);

  const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
  const model = process.env.GEMINI_MODEL || 'gemini-nano-banana-2.1';

  const body = {
    model,
    input: [
      { type: 'text', text: prompt },
      { type: 'image', mime_type: image.mime, data: image.data },
    ],
    response_format: { type: 'image', image_size: process.env.GEMINI_IMAGE_SIZE || '1K' },
  };

  let res;
  try {
    res = await fetch(`${base}/v1beta/interactions`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  if (!res.ok) {
    const detail = json?.error?.message || raw.slice(0, 200);
    console.error(`[gemini] ${res.status} ${detail}`);
    if (res.status === 429) throw new TryOnError('The image service is busy. Please try again in a minute.', 429);
    if (res.status === 400) throw new TryOnError('The image service could not use this photo or request.', 422);
    if (res.status === 401 || res.status === 403) throw new TryOnError('The server\'s Gemini key was rejected.', 500);
    throw new TryOnError('The image service returned an error. Please try again.', 502);
  }

  const { image: out, text } = pickImage(json);
  if (!out) {
    throw new TryOnError(text || 'No preview was generated. Try a clearer, front-facing photo.', 422);
  }
  return { mime: out.mime_type || 'image/png', data: out.data };
}
