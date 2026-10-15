# Radrasa try-on

Upload a photo, pick a Radrasa style, colour and length, and preview it. Two modes:

| Mode | Needs | Cost | What it shows |
| --- | --- | --- | --- |
| **cloudflare** (when `CF_ACCOUNT_ID` and `CF_API_TOKEN` are set) | A free Cloudflare account and API token | Free daily allowance, then pay as you go | An AI render of the style, colour and length using FLUX.2 on Cloudflare Workers AI. |
| **gemini** (when `GEMINI_API_KEY` is set) | A Google API key | Per preview | An AI render using the Gemini image API (Nano Banana). Higher quality, higher cost. |
| **free** (default with nothing set) | Nothing | Free | The chosen **colour** on the person's own hair, done in the browser. Length, texture and volume are not shown. The photo never leaves the device. |

If both Cloudflare and Gemini credentials exist, Cloudflare is used. Force one with `TRYON_MODE=cloudflare|gemini|free`.

## Run it

```bash
npm install
npm start                 # http://localhost:3000, free mode, no key needed
```

For full AI previews, `cp .env.example .env`, fill in either the Cloudflare pair or `GEMINI_API_KEY`, and restart.

### Cloudflare setup (about 3 minutes)

1. Sign up at cloudflare.com. The Workers Free plan is enough.
2. Copy your **Account ID** from the dashboard (Workers & Pages page, right-hand side).
3. My Profile > API Tokens > Create Token > use the **Workers AI** template. Copy the token.
4. Put both in `.env` as `CF_ACCOUNT_ID` and `CF_API_TOKEN`, then `npm start`.

Cloudflare gives every account 10,000 "Neurons" a day free; beyond that it is $0.011 per 1,000 Neurons and needs the Workers Paid plan. Cloudflare lists FLUX.2 klein 4B at about 5.4 Neurons per 512x512 input tile and 26 per 512x512 output tile, so a 576x768 preview costs roughly 110 Neurons, or around 90 free previews a day. Check current rates at developers.cloudflare.com/workers-ai/platform/pricing. `DAILY_CAP` defaults to 80 in this mode so you stop before the free allowance runs out. FLUX.2 klein 9B (`CF_MODEL=@cf/black-forest-labs/flux-2-klein-9b`) looks better but is billed at about 1,364 Neurons for the first megapixel, so the free allowance covers only a handful of previews.

Cloudflare's FLUX.2 only accepts input photos smaller than 512x512, so the browser sends a 480 px copy and the result is about 768 px on its longest side. It is good for showing a look, not for print.

Free mode loads Google's hair segmentation model (about 1 MB, a public file, no key) the first time someone uses it. To host it yourself, download `hair_segmenter.tflite` into `public/models/` and the server will use that copy instead.

No key yet? `npm run dev` runs in demo mode: the UI works end to end and your photo is echoed back.
`npm test` runs a smoke test against a fake Gemini server (no key or network needed).

## How it works

1. The browser shrinks the photo to 1280 px, re-encodes it (this strips EXIF and location data) and sends it with a style id, colour name and length.
2. `server.js` checks those against `lib/catalog.js`, so only real Radrasa variants are accepted.
3. `lib/prompt.js` builds the prompt on the server. The browser never sends prompt text.
4. In cloudflare mode `lib/cloudflare.js` posts the prompt and a small copy of the photo to Workers AI (`@cf/black-forest-labs/flux-2-klein-4b`). In gemini mode `lib/gemini.js` calls `POST /v1beta/interactions` with model `gemini-nano-banana-2.1`. Either returns the final image.
5. The page shows a before/after slider and keeps each look in a strip so shoppers can compare variants.

## Variants covered

All 15 hair products on radrasa.com, 249 style, colour and length combinations:

- **Human hair:** Brazilian kinky straight, pixie curly, PerisModa body wave, loose wave bundles, straight weave bundles, curly bundles (deep wave, 8 to 40 in), Burmese curly bundles, balayage tape-in extensions (16 shades).
- **Synthetic:** long straight clip-ins (26 colours), unicorn colour clip-ins (15), claw clip ponytail (18).
- **Crochet and wool:** passion twists, Marlybob jerry curl (8 colours, 2 lengths), yanky twist, Brazilian wool braids (14 colours).

The necklace and the glass cup are on the site but are not hair, so they are left out. A test (`npm test`) checks the catalog against this list of 15.

Update `lib/catalog.js` when the store changes colours, lengths or prices. Some pages (loose wave, straight weave, curly, Burmese, balayage) only show a starting price, so the tool shows "from $X" for those. Swatch hex values are approximations, so adjust them to match your product photos. Stock is not checked: some product pages show "sold out".

## Before you launch

- **Keep the key on the server.** Never put it in `public/` or in a Shopify theme file.
- **Cost.** Each preview is one image generation. Defaults: 4 previews per minute per IP and 300 per day overall, or 80 in Cloudflare mode (`RATE_PER_MINUTE`, `DAILY_CAP`). Rate limits are in memory, so use Redis if you run more than one server.
- **Privacy.** The server does not store photos or log them. The consent line on the page names the provider the photo goes to (Cloudflare or Google). In free mode the photo never leaves the browser. If you sell to the EU, UK, Illinois or similar, get your privacy policy and consent wording reviewed, since face photos can count as biometric data.
- **Honesty.** Previews are approximate: length, colour and texture will not match the product exactly. Keep the on-page disclaimer, and avoid wording like "exactly how it will look". Gemini results carry Google's SynthID watermark.
- **Minors.** The page asks users to confirm they are 18 or over, but nothing verifies it.

## Putting it on your Shopify store

Run this as its own small service (Render, Railway, Fly.io, Cloud Run) and either link to it from the store or embed it in a page with an iframe. For a tighter integration, a Shopify App Proxy can serve it from a path on your own domain. Mapping a style to a Shopify variant for add-to-cart is the natural next step; `catalog.js` already stores each product's handle.

## Known limits

- The model can drift: faces occasionally change slightly, and hairlines can look pasted on. A clear, front-facing, well-lit photo helps a lot.
- Long lengths on a head-and-shoulders photo are cut off by the frame.
- Passion twists have no length on the store page, so the preview uses a typical mid-back length.
- Cloudflare's FLUX.2 klein is a small, fast model: expect more face and hairline drift than Gemini, and softer detail because of the 480 px input.
- Previews take roughly 5 to 60 seconds.
