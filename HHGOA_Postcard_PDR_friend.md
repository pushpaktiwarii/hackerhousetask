# PDR — "Postcard from Goa" · HH Goa 2026 Frame & ID Generator

**Project codename:** `goa-postcard`
**Hashtag:** `#FrameInGoa`
**Deadline:** 11:59 PM IST, 13 Aug 2026
**Deploy target:** Vercel (Next.js 14 App Router + Vercel Blob)

> This is an intentionally different concept from the "Beach Pass" build (duotone filter + boarding-pass ID + sticker shuffle). Zero overlap in the hero feature, photo treatment, output metaphor, or signature interaction — the two submissions will not look related.

---

## 1. Concept & uniqueness thesis

Most of the ~5,000 submissions are circle-frame PNG generators. The other team in our circle is doing a duotone boarding pass. **This build's identity is print nostalgia: a vintage Goa holiday postcard and a passport entry stamp.** Three differentiators, all distinct from Beach Pass:

### 1.1 Halftone Print Effect (hero photo treatment)
The uploaded photo is converted into a **retro print-dot halftone** — like a postcard that ran through a 1970s offset press. Dots sized by luminance, printed in dark green ink on cream paper, with slight registration offset (a pink layer shifted 1–2 px) for that misprinted-souvenir charm. This is a completely different visual family from duotone: it reads as *printed*, not *filtered*, and it makes low-quality phone photos look intentional instead of bad.

- Implementation: sample the photo on a grid (6–8 px cells at 1080p), draw circles with radius ∝ darkness on a cream background; second pass in pink at reduced density, offset. Pure canvas math, <80 ms.
- Toggle between **"Press Print" (halftone)** and **"Glossy" (original photo)**.

### 1.2 The Stamp Slam (signature interaction)
When the graphic is ready, a big rubber stamp — **"HH GOA 2026 · ARRIVED ✓"** in a distressed circular seal — slams down on the card with a squash-and-thumb animation, a paper-shake, and an ink-splat sound-off haptic (vibration API on mobile). The final PNG bakes the stamp in at a random rotation (−12° to +12°) and random corner, so every export is subtly one-of-a-kind. It's a 2-second moment people will screen-record and post *in addition to* the image — free extra hashtag content.

### 1.3 Two print formats (different metaphors from Beach Pass)

**Format A — "Postcard Front" PFP (1080×1080):**
Photo in halftone fills a postcard mounted at a slight angle on the green background, white deckled border, scalloped **postage-stamp frame** in the top-right containing a mini palm illustration and "गोवा · 2026", wavy cancellation postmark lines crossing onto the photo, `HACKER HOUSE` in the site's serif along the bottom edge, `#FrameInGoa` as a small ink stamp.

**Format B — "Passport Page" ID (1200×675):**
An open passport spread. Left page: halftone photo in the document-photo box, MRZ-style machine-readable line at the bottom (`HHGOA<2026<<BUILDER<<NAME...` — mono font, decorative), name + role in typewriter-style fields ("NAME OF BUILDER", "OCCUPATION", "PORT OF ENTRY: GOA"). Right page: the ARRIVED entry stamp, visa-sticker with sun illustration, dates `28–31 OCT 2026`, and a **generated "Visa Class"** instead of a builder title — e.g., "CLASS: SHIP-1 (Multiple Entry Debugger)", "CLASS: VIBE-2 (Permanent Beach Resident)". Deterministic from name hash; different phrase bank from the other build.

**Speed story:** identical constraint, different pipeline — all client-side canvas, photo → stamped result in ~1.5 s including the slam animation (skippable). Only network call is the Blob upload on Share.

---

## 2. Brand system usage (same source, different emphasis)

Same hhgoa.com tokens, applied inversely from Beach Pass — **cream-paper-forward with green ink**, rather than green-background-forward:

| Token | Value | Usage here |
|---|---|---|
| `--cream` | `#FBF7EC` | Dominant: postcard/passport paper |
| `--green-deep` | `#0A6B3C` | Ink: halftone dots, type, borders; page background |
| `--pink` | `#EC1E79` | Misprint layer, stamp ink, visa sticker, गोवा |
| `--yellow` | `#FFD400` | Postage stamp, sun, small accents only |
| `--ink` | `#111` | MRZ line, outlines |

**Type:** display serif for HACKER HOUSE wordmark moments ("DM Serif Display"); **"Special Elite" or "Courier Prime" (typewriter)** for passport fields — deliberately not the Space Mono/label look of the other build; गोवा baked as SVG.

**Illustration set (drawn fresh, different props from Beach Pass):** scalloped postage stamp, cancellation postmark waves, rubber-stamp seal, visa sticker with sun, scooter silhouette, seagulls. No palms-over-ring, no barcode, no boarding-pass motifs.

**Mandatory text on every output:** `HACKER HOUSE गोवा` · `GOA, INDIA · 28–31 OCT 2026` · `#FrameInGoa` · `2:47 PM STUDIO`.

---

## 3. User flow

1. Land directly on the tool. No login, no gates.
2. Upload JPG/PNG/WebP/HEIC (magic-byte sniff → lazy `heic2any`; graceful failure message) **or "📸 Booth Mode"** — front-camera capture with a 3-2-1 countdown overlay, another interaction Beach Pass doesn't have.
3. Halftone ON by default; drag to pan, pinch/wheel to zoom for any aspect ratio or off-center photo.
4. Format B: name (required) + role (optional) + "🛂 Assign Visa Class" button.
5. **Stamp Slam** plays → card is ready.
6. **Download PNG** (`canvas.toBlob`; `navigator.share({files})` on mobile so the image attaches straight into the X composer) and **Share to X**.

### Share-to-X flow
Same compliance mechanics, different caption and page dressing:
1. Share tap → `POST /api/share` → PNG to Vercel Blob → random id.
2. Open `x.com/intent/tweet?text=<caption>&url=<app>/s/<id>`.
3. `/s/[id]` sets `og:image`/`twitter:image` to the blob and `twitter:card: summary_large_image`; the page renders the card on a mail-desk background with a "Send your own postcard →" CTA (viral loop).
4. Caption: `Passport stamped ✅ Postcard sent from HACKER HOUSE गोवा 🏝️ 28–31 Oct — #FrameInGoa` (hashtag hard-coded).
5. Unique id per share (X caches OG per URL); UI copy nudges the download-and-attach path as the best-looking option.

---

## 4. Architecture

```
Next.js 14 (App Router, TS, Tailwind)
├── app/
│   ├── page.tsx                 # tool (client component)
│   ├── s/[id]/page.tsx          # OG share page
│   ├── api/share/route.ts       # Vercel Blob put()
│   └── layout.tsx               # next/font: DM Serif Display, Courier Prime
├── lib/
│   ├── halftone.ts              # grid sampler → dot renderer + pink misprint pass
│   ├── fit.ts                   # cover-fit + pan/zoom transform
│   ├── renderPostcard.ts        # Format A compositor
│   ├── renderPassport.ts        # Format B compositor (incl. MRZ line builder)
│   ├── stamp.ts                 # slam animation (rAF) + baked-stamp randomizer
│   ├── camera.ts                # getUserMedia booth mode + countdown
│   ├── heic.ts                  # sniff + dynamic import('heic2any')
│   └── visa.ts                  # visa-class generator (own phrase bank)
├── components/assets/*.tsx      # SVGs: postage stamp, postmark, seal, visa sticker, seagulls, scooter
└── public/paper.png             # 5KB paper-fiber texture
```

Perf budget: first-load JS < 120 KB; halftone computed once per photo on an offscreen canvas and re-blitted during pan/zoom; 2× export only on download. Env: `BLOB_READ_WRITE_TOKEN` only.

---

## 5. Edge cases & QA

- [ ] Real iPhone HEIC converts; failure shows "try a screenshot" fallback
- [ ] Booth Mode: camera permission denied → falls back to upload without breaking flow
- [ ] Halftone legible on very dark and very bright photos (clamp dot radius range)
- [ ] Long names fit the passport field (auto-shrink; MRZ truncates with `<<<`)
- [ ] गोवा renders in export (SVG, not font)
- [ ] Stamp bake never covers the face area (stamp corners only)
- [ ] `/s/<id>` pasted in an X draft shows the actual card as large image
- [ ] Full phone flow over 4G < 10 s; Lighthouse mobile ≥ 90

## 6. Build order (tonight)

| # | Task | Time |
|---|---|---|
| 1 | Scaffold, fonts, upload → cover-fit canvas → PNG download | 45 min |
| 2 | Halftone engine + toggle + pan/zoom | 60 min |
| 3 | Postcard renderer + SVG assets (stamp, postmark, seal) | 60 min |
| 4 | Blob + `/s/[id]` OG page + intent — verify with a real test post | 40 min |
| 5 | Passport renderer + visa-class generator + Stamp Slam | 60 min |
| 6 | Booth Mode camera, HEIC, mobile polish, QA, deploy | 45 min |
| 7 | Post on X with `#FrameInGoa` → submit form | 15 min |

## 7. Submission checklist
- [ ] Live Vercel URL works end-to-end in incognito on a phone
- [ ] X post published **containing `#FrameInGoa`** with the generated image
- [ ] Form: https://forms.gle/jM5hTaGvsrfEfixPA — one submission per team, no retries
- [ ] Submitted before 11:59 PM IST, 13 Aug 2026

## 8. Differentiation matrix (vs the Beach Pass build)

| Axis | Beach Pass (other team) | Postcard from Goa (this) |
|---|---|---|
| Photo treatment | Duotone color remap | Halftone print dots + misprint |
| Format A metaphor | Ring frame + stickers | Angled postcard + postage stamp |
| Format B metaphor | Boarding pass | Passport spread + visa |
| Signature moment | Sticker layout shuffle | Stamp Slam animation |
| Extra input | — | Camera Booth Mode with countdown |
| Fun generator | Builder Title | Visa Class (separate phrase bank) |
| Palette stance | Green-dominant | Cream-paper-dominant |
| Secondary font | Space Mono | Typewriter (Courier Prime) |
