// Pure pixel maths for the free, in-browser preview. No browser APIs, so it is unit-testable in Node.
// Takes an RGBA image and a per-pixel hair probability (0..1) and recolours only the hair,
// keeping the original strand shading and highlights so it still looks like hair, not a flat fill.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const luma = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
// stable pseudo-random 0..1 for a streak band index (integer hash, well spread even for small n)
const hash = (n) => {
  let x = (n + 1) * 0x9e3779b1;
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

/**
 * @param {{data: Uint8ClampedArray, width: number, height: number}} img  edited in place
 * @param {Float32Array} hair  width*height values in 0..1
 * @param {{hex: string, hex2?: string, streaks?: boolean}} opts
 * @returns {{hairShare: number}}  share of the image that was treated as hair
 */
export function recolorHair(img, hair, { hex, hex2, streaks = false }) {
  const { data, width: w, height: h } = img;
  const n = w * h;
  if (hair.length !== n) throw new Error('mask size does not match image');

  // Find the hair's mean brightness and vertical extent.
  let sum = 0, cnt = 0, top = h, bottom = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (hair[i] > 0.6) {
        const p = i * 4;
        sum += luma(data[p], data[p + 1], data[p + 2]);
        cnt++;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  const hairShare = cnt / n;
  if (hairShare < 0.004) return { hairShare };

  const meanL = Math.max(sum / cnt, 0.06);
  const c1 = hexToRgb(hex);
  const c2 = hex2 ? hexToRgb(hex2) : null;
  const span = Math.max(bottom - top, 1);
  const band = Math.max(6, Math.round(w * 0.012));

  for (let y = 0; y < h; y++) {
    // ombre runs roots (top of the hair) to ends (bottom)
    let t = 0;
    if (c2) t = smooth(0.15, 0.95, (y - top) / span);
    const tr = c2 ? c1[0] + (c2[0] - c1[0]) * t : c1[0];
    const tg = c2 ? c1[1] + (c2[1] - c1[1]) * t : c1[1];
    const tb = c2 ? c1[2] + (c2[2] - c1[2]) * t : c1[2];

    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let s = smooth(0.3, 0.75, hair[i]);
      if (s <= 0) continue;
      if (streaks) s *= hash(Math.floor(x / band)) > 0.72 ? 1 : 0;
      if (s <= 0) continue;

      const p = i * 4;
      const r = data[p], g = data[p + 1], b = data[p + 2];
      const rel = luma(r, g, b) / meanL;                  // 1 = average hair brightness
      const shade = clamp(0.5 + 0.5 * rel, 0.35, 1.25);    // keeps strand shadows and body
      const spec = Math.max(0, rel - 1.6) * 30;            // keeps shine on top of the new colour
      const nr = clamp(tr * shade + spec, 0, 255);
      const ng = clamp(tg * shade + spec, 0, 255);
      const nb = clamp(tb * shade + spec, 0, 255);

      data[p] = r + (nr - r) * s;
      data[p + 1] = g + (ng - g) * s;
      data[p + 2] = b + (nb - b) * s;
    }
  }
  return { hairShare };
}
