// Builds the Gemini prompt on the server from a validated catalog selection.
// The browser never sends prompt text, only ids, so users cannot inject instructions.

function lengthPhrase(effectiveInches) {
  const x = effectiveInches;
  if (x <= 9) return 'jaw length';
  if (x <= 11) return 'chin length, just above the shoulders';
  if (x <= 13) return 'shoulder length';
  if (x <= 15) return 'just below the shoulders';
  if (x <= 17) return 'collarbone to upper chest';
  if (x <= 19) return 'mid-chest';
  if (x <= 21) return 'around the ribcage';
  if (x <= 23) return 'mid-back';
  if (x <= 25) return 'lower back';
  if (x <= 27) return 'waist length';
  if (x <= 29) return 'hip length';
  if (x <= 33) return 'below the hips';
  return 'thigh length';
}

const MODE_RULES = {
  full: 'Replace the person\'s visible hair with the new style as a complete, natural-looking head of hair with a believable hairline and parting.',
  blend:
    'Keep the person\'s own hair visible at the roots and crown. Add the extensions underneath so they blend seamlessly with the natural hair, adding length and volume without a visible weft line.',
  streaks:
    'Keep most of the person\'s own hair as it is. Add only a few clearly visible streaks of the chosen colour, clipped in underneath and falling with the natural hair. Do not colour the whole head.',
  ponytail:
    'Show the person\'s own hair gathered up into a claw clip, with the extension ponytail falling from it. If the back of the head is not visible in the photo, let the ponytail hang naturally over one shoulder or show the top of the clip, whichever fits the pose.',
};

export function buildPrompt({ style, color, length }, { compact = false } = {}) {
  const effective = length ? length.inches * (style.shrink ?? 1) : null;
  const lengthLine = length
    ? `Length: ${length.inches} inches stretched. On this person it should visibly reach about ${lengthPhrase(effective)}.`
    : 'Length: use the natural length of this style.';
  const colorName = color.desc ? `"${color.name}" (${color.desc})` : `"${color.name}"`;
  const colorLine = color.hex2
    ? `Colour: ${colorName}, a blend that goes from ${color.hex} at the roots to ${color.hex2} at the ends.`
    : `Colour: ${colorName}, approximately ${color.hex}.`;

  if (compact) return buildCompact({ style, colorLine, lengthLine });

  return [
    `Edit the attached photo to show how this person would look wearing "${style.name}" hair.`,
    '',
    `Style: ${style.texture}.`,
    colorLine,
    lengthLine,
    MODE_RULES[style.mode] || MODE_RULES.full,
    '',
    'Keep exactly the same: the face and facial features, skin tone and texture, expression, apparent age, head pose, camera angle, clothing, jewellery, background, lighting and framing.',
    'Change only the hair. Match the new hair to the photo\'s lighting, with realistic shadows, highlights and individual strand detail. Blend the hairline naturally.',
    'If the photo is cropped, let long hair continue naturally out of frame and do not change the framing.',
    'Return one photorealistic image. No text, logos, watermarks, borders, collages or before-and-after splits.',
    'If there is no clearly visible person in the photo, do not generate an image and reply with a short text explanation instead.',
  ].join('\n');
}

// Shorter, plain-language prompt for FLUX.2 models (Cloudflare Workers AI). They follow short, positive
// instructions better than long lists, and they have no negative prompt.
function buildCompact({ style, colorLine, lengthLine }) {
  return [
    `Edit this photo: change only the person's hair so they are wearing "${style.name}".`,
    `Style: ${style.texture}.`,
    colorLine,
    lengthLine,
    MODE_RULES[style.mode] || MODE_RULES.full,
    'Keep the face, skin tone, expression, head pose, clothing, background, lighting and framing exactly as in the original photo.',
    'Make the new hair photorealistic, matched to the photo\'s lighting, with natural strand detail and a believable hairline.',
  ].join(' ');
}
