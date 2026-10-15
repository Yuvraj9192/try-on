// Free preview: runs entirely in the browser. MediaPipe finds the hair, recolor.js changes its colour.
// No API key, no server call, and the photo never leaves the device.
import { recolorHair } from './recolor.js';

let segmenterPromise = null;

async function getSegmenter(modelUrl) {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import('/vendor/mediapipe/vision_bundle.mjs');
      const fileset = await FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
      const make = (delegate) =>
        ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: modelUrl, delegate },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        });
      try {
        return await make('GPU');
      } catch {
        return await make('CPU');
      }
    })().catch((e) => {
      segmenterPromise = null; // allow a retry
      throw e;
    });
  }
  return segmenterPromise;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That photo could not be opened.'));
    img.src = src;
  });
}

export async function freePreview({ dataUrl, color, streaks, modelUrl }) {
  let segmenter;
  try {
    segmenter = await getSegmenter(modelUrl);
  } catch {
    throw new Error('The hair detector could not load. Check your connection and try again.');
  }

  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const result = segmenter.segment(canvas);
  let mask;
  try {
    const masks = result.confidenceMasks || [];
    // Two-class model: [background, hair]. Fall back to a single mask if that is all we get.
    const m = masks.length > 1 ? masks[1] : masks[0];
    if (!m) throw new Error('no mask');
    mask = Float32Array.from(m.getAsFloat32Array());
  } finally {
    result.close?.();
  }

  // Safety net: if "hair" covers most of the frame the mask is probably inverted.
  let high = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i] > 0.5) high++;
  if (high / mask.length > 0.75) for (let i = 0; i < mask.length; i++) mask[i] = 1 - mask[i];

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { hairShare } = recolorHair(frame, mask, { hex: color.hex, hex2: color.hex2, streaks });
  if (hairShare < 0.004) {
    throw new Error('We could not find hair in this photo. Try a clear, front-facing one with your hair visible.');
  }
  ctx.putImageData(frame, 0, 0);
  const out = canvas.toDataURL('image/jpeg', 0.92);
  return { mime: 'image/jpeg', data: out.split(',')[1] };
}
