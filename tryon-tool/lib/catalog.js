// Radrasa catalog used by the try-on tool.
// Source: radrasa.com product pages (checked 12 Oct 2026). Prices are USD for a single unit.
// Covers all 15 hair products in the store's "Shop Now" collection. The necklace and glass cup are not hair.
// Where the store page only shows a starting price per variant, `fromPrice` is used and the UI says "from".
// Edit this file when the store's colours, lengths or prices change.

const STORE = 'https://radrasa.com/products/';

const c = (name, hex, price, hex2) => ({ name, hex, ...(price != null ? { price } : {}), ...(hex2 ? { hex2 } : {}) });
const l = (inches, price) => ({ inches, price });

const NATURAL_BLACK = [c('Natural black', '#0B0B0E')];

export const STYLES = [
  {
    id: 'kinky-straight',
    name: 'Brazilian kinky straight',
    group: 'Human hair',
    handle: 'brazilian-kinky-straight-human-hair',
    mode: 'full',
    shrink: 0.92,
    texture:
      'kinky straight texture: a natural-looking, slightly coarse, blown-out straight finish with soft body and a little bounce, like relaxed textured hair. It is NOT glass-smooth or poker straight',
    blurb: 'Virgin Brazilian bundles with a natural, voluminous blow-out finish.',
    colors: NATURAL_BLACK,
    lengths: [
      l(8, 40), l(10, 46.67), l(12, 53.33), l(14, 63.33), l(16, 63.33), l(18, 66.67), l(20, 70), l(22, 80),
      l(24, 86.67), l(26, 100), l(28, 120), l(30, 130), l(32, 193.33), l(34, 220), l(36, 246.67), l(38, 273.33), l(40, 303.33),
    ],
  },
  {
    id: 'pixie-curly',
    name: 'Pixie curly',
    group: 'Human hair',
    handle: 'pixie-curly-human-hair-bundles',
    mode: 'full',
    shrink: 0.65,
    texture:
      'pixie curls: tight, springy, well-defined bouncy curls with natural volume and a rounded silhouette',
    blurb: 'Raw Brazilian Remy curls, soft and bouncy.',
    colors: NATURAL_BLACK,
    lengths: [
      l(8, 26.67), l(10, 36.67), l(12, 40), l(14, 53.33), l(16, 53.33), l(18, 53.33), l(20, 60), l(22, 70), l(24, 76.67),
    ],
  },
  {
    id: 'body-wave',
    name: 'PerisModa body wave',
    group: 'Human hair',
    handle: 'perismoda-body-wave-bundles-human-hair',
    mode: 'full',
    shrink: 0.88,
    texture: 'body wave: soft, loose, glossy S-shaped waves that flow smoothly from root to ends',
    blurb: 'Glossy, loose waves in natural black.',
    colors: NATURAL_BLACK,
    lengths: [l(22, 100), l(24, 113.33), l(26, 130), l(28, 146.67), l(30, 176.67), l(32, 220)],
  },
  {
    id: 'clip-straight',
    name: 'Long straight clip-ins',
    group: 'Synthetic',
    handle: 'hair-extension-black-long-straight',
    mode: 'blend',
    shrink: 1,
    texture:
      'sleek, long, straight clip-in extensions blended seamlessly into the person\'s own hair, adding length and fullness. The extension colour is matched to the shade chosen below and blends at mid-lengths',
    blurb: 'Seven-piece clip-in set, 24 inches, heat-resistant fibre.',
    fixedInches: 24,
    colors: [
      c('Jet black', '#0B0B0E', 20), c('Blue black', '#0E1424', 20), c('Black with burgundy tint', '#2A0F16', 20),
      c('Espresso brown', '#2E1D16', 20), c('Dark brown', '#3B2A1E', 20), c('Dark brown with highlights', '#4A3322', 16.67, '#8B6A4A'),
      c('Medium brown', '#5E4330', 16.67), c('Light brown', '#8B6A4A', 16.67), c('Ash brown', '#6B5E52', 20),
      c('Auburn', '#7B3A22', 20), c('Copper blonde', '#B8703A', 20), c('Dark golden blonde', '#A8823F', 20),
      c('Honey blonde', '#C99A4B', 20), c('Golden blonde', '#D4AF5A', 20), c('Warm blonde', '#C9A064', 20),
      c('Light golden blonde', '#E0C482', 20), c('Yellow blonde', '#E5CB6E', 20), c('Pale yellow blonde', '#EEDFA0', 20),
      c('Ash blonde', '#B9AE98', 20), c('Light ash blonde', '#CFC6B3', 20), c('Platinum blonde', '#E6E1D3', 20),
      c('Silver', '#B8BCC4', 20), c('Ice white', '#F1F3F6', 20), c('Dark red', '#7A1418', 20),
      c('Burgundy', '#6B1A2E', 16.67), c('Dark burgundy', '#4A1426', 20),
    ],
  },
  {
    id: 'unicorn-clip',
    name: 'Unicorn colour clip-ins',
    group: 'Synthetic',
    handle: 'unicorn-clip-in-colored-hair-extensions',
    mode: 'streaks',
    shrink: 1,
    texture:
      'vivid fantasy-colour clip-in extensions worn as several long, 22-inch streaks of colour clipped in underneath and blended with the person\'s own hair, not a full head of colour',
    blurb: 'Bold fantasy shades, 22 inches, packs of 6 or 12.',
    fixedInches: 22,
    colors: [
      c('Frozen blue', '#9ED8F0', 16.67), c('Electric blue', '#1F6BFF', 16.67), c('Sky denim', '#6E9BD1', 16.67),
      c('Mint ice', '#B7F0D8', 16.67), c('Emerald green', '#1F9D6A', 16.67), c('Lavender mist', '#C9B6EA', 16.67),
      c('Crystal lilac', '#D8C8F0', 16.67), c('Amethyst purple', '#8B4FC8', 16.67), c('Fairy pink', '#F4B6D0', 16.67),
      c('Cotton candy pink', '#F7C5DC', 16.67), c('Fuchsia pink', '#D6218F', 16.67), c('Cherry bomb', '#D2203F', 16.67),
      c('Scarlet red', '#E02424', 16.67), c('Silver spark', '#C7CCD6', 16.67), c('Pearl blonde', '#EADFC8', 16.67),
    ],
  },
  {
    id: 'claw-ponytail',
    name: 'Claw clip ponytail',
    group: 'Synthetic',
    handle: 'synthetic-claw-clip-ponytail-long-wavy',
    mode: 'ponytail',
    shrink: 1,
    texture:
      'a long, wavy, layered ponytail extension attached with a claw clip, with the person\'s own hair gathered up into the clip and the wavy ponytail falling from it',
    blurb: 'Wavy layered ponytail, 18 inches, 100 g.',
    fixedInches: 18,
    colors: [
      c('Jet black', '#0B0B0E', 20), c('Off-black', '#1A1816', 20), c('Ebony black', '#08080A', 26.67), c('Soft black', '#1D1B1C', 26.67),
      c('Dark brown', '#3B2A1E', 20), c('Chocolate brown', '#4A2C20', 20), c('Mahogany brown', '#55261D', 20), c('Chestnut brown', '#6B3F26', 20),
      c('Espresso brown', '#2E1D16', 26.67), c('Walnut brown', '#4D3624', 26.67), c('Dark ash brown', '#52473F', 26.67), c('Ash brown', '#6B5E52', 26.67),
      c('Light ash brown', '#8A7968', 20), c('Honey blonde', '#C99A4B', 20), c('Golden blonde', '#D4AF5A', 20), c('Light blonde', '#DCC38B', 20),
      c('Sandy blonde', '#C8B183', 26.67), c('Cool beige blonde', '#CDBFA5', 26.67),
    ],
  },
  {
    id: 'passion-twists',
    name: 'Passion twists',
    group: 'Crochet',
    handle: 'synthetic-passion-twists-crochet-hair',
    mode: 'full',
    shrink: 1,
    texture:
      'pre-twisted passion twists: a full head of long, soft, bohemian crochet twists with wavy, curly ends, installed with neat parts at the scalp. Show them at a typical mid-back length (the store page does not state a length)',
    blurb: 'Pre-twisted, 12 strands per pack, protective style.',
    colors: [
      c('Natural black', '#0B0B0E', 13.33), c('Auburn brown', '#7B3A22', 13.33),
      c('Burgundy ombre', '#2A0F16', 13.33, '#8A2236'), c('Blonde ombre', '#1B1410', 13.33, '#D4AF5A'),
    ],
  },
  {
    id: 'jerry-curl',
    name: 'Marlybob jerry curl',
    group: 'Crochet',
    handle: 'marlybob-jerry-curl-jamaican-bounce',
    mode: 'full',
    shrink: 0.7,
    texture:
      'Jamaican bounce jerry curls: glossy, loose-to-medium, well-defined wet-look curls with lots of body and bounce',
    blurb: 'Glossy bounce curls, 8 or 12 inches, 8 colours.',
    colors: [
      c('Natural black', '#0B0B0E'), c('Chocolate brown', '#4A2C20'), c('Auburn brown', '#7B3A22'), c('Ginger brown', '#A5532A'),
      c('Burgundy red', '#6B1A2E'), c('Burgundy ombre', '#2A0F16', null, '#8A2236'),
      c('Ombre brown to copper', '#4A2C20', null, '#B8703A'), c('Ombre black to blonde', '#0B0B0E', null, '#D4AF5A'),
    ],
    lengths: [l(8, 16.67), l(12, 20)],
  },
  {
    id: 'yanky-twist',
    name: 'Yanky twist pre-looped',
    group: 'Crochet',
    handle: 'yanky-twist-crochet-hair-pre-looped',
    mode: 'full',
    shrink: 1,
    texture:
      'pre-looped yanky twists: a full head of neat, pre-twisted crochet twists with soft curly ends, similar to butterfly locs',
    blurb: 'Pre-looped twists, 8 packs of 30 strands.',
    fixedInches: 8,
    colors: [c('Natural black', '#0B0B0E', 96.67), c('Ombre blend', '#4A2C20', 106.67, '#A8823F')],
  },
  {
    id: 'loose-wave',
    name: 'Loose wave bundles',
    group: 'Human hair',
    handle: 'human-hair-bundles-loose-wave-bundles',
    mode: 'full',
    shrink: 0.88,
    texture:
      'loose wave: soft, bouncy, glossy loose waves with natural volume, flowing from root to ends',
    blurb: 'Remy Indian loose wave, natural or jet black.',
    fromPrice: 63.33,
    colors: [
      { name: 'Natural color', hex: '#1C1411', desc: 'natural black-brown' },
      { name: 'Jet black', hex: '#0B0B0E' },
    ],
    lengths: [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((n) => l(n)),
  },
  {
    id: 'straight-weave',
    name: 'Straight weave bundles',
    group: 'Human hair',
    handle: 'straight-human-hair-weave-bundles',
    mode: 'full',
    shrink: 0.97,
    texture:
      'bone-straight, silky, sleek straight hair with a polished salon finish and a natural shine',
    blurb: 'Brazilian Remy, silky bone-straight, natural black.',
    fromPrice: 46.67,
    colors: NATURAL_BLACK,
    lengths: [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32].map((n) => l(n)),
  },
  {
    id: 'curly-bundles',
    name: 'Curly bundles (deep wave)',
    group: 'Human hair',
    handle: 'curly-human-hair-bundles-30-32-inch',
    mode: 'full',
    shrink: 0.72,
    texture:
      'deep wave curls: full, bouncy, well-defined water-wave curls with a lot of volume and a rounded silhouette',
    blurb: 'Raw Brazilian Remy curls, 8 to 40 inches.',
    fromPrice: 46.67,
    colors: [{ name: 'Natural color', hex: '#1C1411', desc: 'natural black-brown' }],
    lengths: [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40].map((n) => l(n)),
  },
  {
    id: 'burmese-curly',
    name: 'Burmese curly bundles',
    group: 'Human hair',
    handle: 'hair-bundles-curly-hair-burmese-weaving',
    mode: 'full',
    shrink: 0.7,
    texture:
      'Burmese curls: soft, springy, defined curls that look fluffy and natural, with plenty of bounce and volume',
    blurb: 'Raw Burmese Remy curls, virgin or raw.',
    fromPrice: 33.33,
    colors: [
      { name: 'Virgin hair', hex: '#1C1411', desc: 'natural black-brown, unprocessed virgin hair' },
      { name: 'Raw hair', hex: '#241812', desc: 'natural dark brown-black, raw unprocessed hair' },
    ],
    lengths: [10, 18, 20, 22, 24, 26, 28, 30, 32, 34].map((n) => l(n)),
  },
  {
    id: 'balayage-tape-in',
    name: 'Balayage tape-in extensions',
    group: 'Human hair',
    handle: 'hair-extensions-balayage-blonde-hair',
    mode: 'blend',
    shrink: 1,
    texture:
      'seamless straight tape-in extensions with a soft, multi-dimensional balayage colour blend, added under the person\'s own hair for length, volume and a sun-kissed dimensional effect',
    blurb: 'Remy tape-ins in 16 balayage shades, 18 to 22 inches.',
    fromPrice: 286.67,
    colors: [
      c('Midnight Black', '#0B0B12'), c('Espresso Brown', '#2E1D16'),
      c('Ash Blonde Balayage', '#7A6A58', null, '#CBBFA8'), c('Golden Honey Blonde', '#C99A4B'),
      c('Champagne Ash Mix', '#B9A98C', null, '#E3D6BC'), c('Chocolate Brown Ombre', '#3B2A1E', null, '#8B6A4A'),
      c('Mocha Brown Blend', '#4E3A2C', null, '#8A6C52'), c('Icy Platinum Blonde', '#E6E1D3'),
      c('Chestnut Brown Highlights', '#5A3A26', null, '#A5703C'), c('Caramel Blonde', '#B07A3A'),
      c('Cool Toned Silver Blonde', '#C5C2B8'), c('Toffee Brown Melt', '#6B3F26', null, '#B88A52'),
      c('Vanilla Cream Blonde', '#E8D9AE'), c('Warm Cinnamon Brown', '#7B4A2A'),
      c('Smoky Ash Brown', '#5F564E'), c('Sun-Kissed Blonde', '#B8894A', null, '#E8CB8A'),
    ],
    lengths: [l(18), l(20), l(22)],
  },
  {
    id: 'brazilian-wool',
    name: 'Brazilian wool braids',
    group: 'Wool',
    handle: '4-pack-brazilian-wool-hair',
    mode: 'full',
    shrink: 1,
    texture:
      'soft Brazilian wool braids and twists (for example Senegalese twists or faux locs): a full head of neat, individually braided strands with a matte, slightly fluffy wool-yarn texture, installed with clean parts at the scalp. Show them at a typical mid-back length (the store page does not state a length)',
    blurb: 'Soft wool for braids, twists and faux locs, 4-pack, 14 colours.',
    colors: [
      c('Black', '#0B0B0E', 10), c('Purple', '#6B3FA0', 10), c('Honey Blonde', '#C99A4B', 10),
      c('Wine Red', '#5E1424', 10), c('Olive Green', '#5B6B2E', 10), c('Bright Green', '#2EBF4F', 10),
      c('Off White', '#EDE8DC', 10), c('Dark Brown', '#3B2A1E', 10), c('Blue', '#1F5FD0', 10),
      c('Gold', '#C9A227', 10), c('Gray', '#8A8D93', 10), c('Red', '#C81E1E', 10),
      c('Pink', '#E85C9A', 10), c('White', '#FAFAFA', 10),
    ],
  },
];

export function getStyle(id) {
  return STYLES.find((s) => s.id === id) || null;
}

/** Validate a client selection against the catalog and return the resolved variant, or null. */
export function resolveSelection(styleId, colorName, inches) {
  const style = getStyle(styleId);
  if (!style) return null;
  const color = style.colors.find((x) => x.name === colorName);
  if (!color) return null;
  let length = null;
  if (style.lengths) {
    length = style.lengths.find((x) => x.inches === Number(inches));
    if (!length) return null;
  } else if (style.fixedInches) {
    length = { inches: style.fixedInches };
  }
  const price = color.price ?? length?.price ?? style.fromPrice ?? null;
  return { style, color, length, price };
}

/** Public catalog sent to the browser. Contains no prompt text. */
export function publicCatalog() {
  return STYLES.map((s) => ({
    id: s.id,
    name: s.name,
    group: s.group,
    mode: s.mode,
    blurb: s.blurb,
    url: STORE + s.handle,
    colors: s.colors,
    lengths: s.lengths || null,
    fixedInches: s.fixedInches || null,
    fromPrice: s.fromPrice || null,
  }));
}
