/**
 * renderPostcard.ts — Format A compositor
 * Output: 1080×1080 vintage postcard PFP
 * Uses real brand images from /public/
 */

import { drawCoverFit } from './fit';
import { imageToHalftone } from './halftone';
import { bakeStamp, StampConfig } from './stamp';
import { loadImg, BRAND } from './loadImg';

export interface PostcardOptions {
  image: HTMLImageElement | ImageBitmap;
  halftone: boolean;
  stampConfig: StampConfig | null;
  panX?: number;
  panY?: number;
  zoom?: number;
}

const W = 1080;
const H = 1080;

const CREAM  = '#FBF7EC';
const GREEN  = '#0A6B3C';
const PINK   = '#EC1E79';
const YELLOW = '#FFD400';

export async function renderPostcard(opts: PostcardOptions): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const { image, halftone, stampConfig, panX = 0, panY = 0, zoom = 1 } = opts;

  // Load brand assets (cached after first call)
  const [bannerImg, goaSticker] = await Promise.all([
    loadImg(BRAND.banner),
    loadImg(BRAND.goaSticker),
  ]);

  // ── 1. Green background ──────────────────────────────────
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);

  // Light paper grain
  addPaperNoise(ctx, W, H, 10);

  // ── 2. Postcard card (angled, cream) ─────────────────────
  const CARD_W = 860;
  const CARD_H = 760;
  const ANGLE  = -2.5 * (Math.PI / 180);

  ctx.save();
  ctx.translate(W / 2, H / 2 - 20);
  ctx.rotate(ANGLE);

  // Drop shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.38)';
  ctx.shadowBlur    = 32;
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle     = CREAM;
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 6);
  ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // ── 3. Photo area ────────────────────────────────────────
  const PHOTO_PAD = 28;
  const STAMP_COL = 150; // width reserved for postage stamp column
  const PHOTO_W   = CARD_W - PHOTO_PAD * 2 - STAMP_COL;
  const PHOTO_H   = CARD_H - PHOTO_PAD * 2 - 130; // room for bottom banner
  const PHOTO_X   = -CARD_W / 2 + PHOTO_PAD;
  const PHOTO_Y   = -CARD_H / 2 + PHOTO_PAD;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, 4);
  ctx.clip();

  if (halftone) {
    const ht = imageToHalftone(image as HTMLImageElement, PHOTO_W, PHOTO_H, { cellSize: 6 });
    ctx.drawImage(ht, PHOTO_X, PHOTO_Y);
  } else {
    drawCoverFit(ctx, image, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, panX, panY, zoom);
  }
  ctx.restore();

  // ── 4. Cancellation postmark waves over photo ─────────────
  drawPostmarkWaves(ctx, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);

  // ── 5. Postage stamp column (top-right of card) ───────────
  const STAMP_X = CARD_W / 2 - STAMP_COL + 12;
  const STAMP_Y = -CARD_H / 2 + PHOTO_PAD;
  const STAMP_SIZE = 118;
  drawPostageStampBox(ctx, STAMP_X, STAMP_Y, STAMP_SIZE, goaSticker);

  // ── 6. Bottom banner using real brand-banner image ────────
  const BANNER_H = 110;
  const BANNER_Y = CARD_H / 2 - BANNER_H;
  const BANNER_X = -CARD_W / 2;

  // Green strip behind banner
  ctx.fillStyle = GREEN;
  ctx.fillRect(BANNER_X, BANNER_Y, CARD_W, BANNER_H + 10); // +10 to bleed to card edge

  // Draw brand banner image fitted to strip
  const bannerAspect = bannerImg.width / bannerImg.height;
  const bannerRenderW = BANNER_H * bannerAspect * 0.88;
  const bannerRenderH = BANNER_H * 0.88;
  ctx.drawImage(
    bannerImg,
    BANNER_X + 10,
    BANNER_Y + 8,
    bannerRenderW,
    bannerRenderH
  );

  // #FrameInGoa stamp text (right side of banner)
  ctx.fillStyle = YELLOW;
  ctx.font = `bold 20px "DM Serif Display", serif`;
  ctx.textAlign = 'right';
  ctx.fillText('#FrameInGoa', CARD_W / 2 - 20, BANNER_Y + 52);
  ctx.fillStyle = CREAM;
  ctx.font = `13px "Courier Prime", monospace`;
  ctx.fillText('2:47 PM STUDIO', CARD_W / 2 - 20, BANNER_Y + 74);

  ctx.restore(); // end angled card transform

  // ── 7. Bake stamp onto final (non-angled) canvas ──────────
  if (stampConfig) {
    const stampCanvas = renderStampSeal(210);
    bakeStamp(ctx, stampCanvas, W, H, stampConfig, 210, 36);
  }

  return canvas;
}

// ── Stamp Seal ────────────────────────────────────────────

export function renderStampSeal(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2, cy = size / 2;
  const r  = size / 2 - 6;

  // Background ink wash
  ctx.fillStyle = 'rgba(236,30,121,0.06)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = PINK;
  ctx.lineWidth   = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 14, 0, Math.PI * 2);
  ctx.stroke();

  // Top arc text
  drawArcText(ctx, 'HH GOA 2026 ·', cx, cy, r - 7, -Math.PI * 0.78, Math.PI * 0.78,
    PINK, `bold ${Math.floor(size * 0.115)}px serif`, false);

  // Bottom arc text
  drawArcText(ctx, '✓  ARRIVED  ✓', cx, cy, r - 7, Math.PI * 0.28, Math.PI * 1.72,
    PINK, `bold ${Math.floor(size * 0.1)}px "Courier Prime", monospace`, true);

  // Center
  ctx.fillStyle    = PINK;
  ctx.font         = `bold ${Math.floor(size * 0.135)}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HACKER', cx, cy - 10);
  ctx.fillText('HOUSE',  cx, cy + 14);
  ctx.font = `${Math.floor(size * 0.1)}px serif`;
  ctx.fillText('✦', cx, cy + 38);

  return canvas;
}

// ── Helpers ───────────────────────────────────────────────

function addPaperNoise(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  const id = ctx.createImageData(w, h);
  const d  = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 20;
    d[i] = d[i+1] = d[i+2] = 128 + n;
    d[i+3] = alpha;
  }
  ctx.putImageData(id, 0, 0);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawPostmarkWaves(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, 4);
  ctx.clip();
  ctx.strokeStyle = 'rgba(10,107,60,0.22)';
  ctx.lineWidth   = 2.5;
  for (let lineY = y + 28; lineY < y + h; lineY += 20) {
    ctx.beginPath();
    for (let px = x; px <= x + w; px += 7) {
      const wy = lineY + Math.sin((px - x) * 0.09) * 5;
      if (px === x) ctx.moveTo(px, wy); else ctx.lineTo(px, wy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawPostageStampBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  goaSticker: HTMLImageElement
) {
  const tooth = 7;
  const inner = tooth + 5;
  const innerSize = size - inner * 2;

  // White stamp body
  ctx.fillStyle = CREAM;
  ctx.fillRect(x, y, size, size);

  // Perforation teeth
  const numT = Math.floor(size / (tooth * 2));
  ctx.fillStyle = GREEN;
  for (let i = 0; i < numT; i++) {
    const p = i * tooth * 2 + tooth;
    [[x + p, y], [x + p, y + size], [x, y + p], [x + size, y + p]].forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.arc(tx, ty, tooth / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Yellow inner area
  ctx.fillStyle = YELLOW;
  ctx.fillRect(x + inner, y + inner, innerSize, innerSize);

  // Draw गोवा sticker image centred in stamp
  const stickerSize = innerSize * 0.72;
  const stickerX    = x + inner + (innerSize - stickerSize) / 2;
  const stickerY    = y + inner + (innerSize - stickerSize) / 2 + 4;
  ctx.drawImage(goaSticker, stickerX, stickerY, stickerSize, stickerSize);

  // "2026" text at bottom of stamp
  ctx.fillStyle  = GREEN;
  ctx.font       = `bold ${Math.floor(innerSize * 0.18)}px serif`;
  ctx.textAlign  = 'center';
  ctx.fillText('2026', x + inner + innerSize / 2, y + inner + innerSize - 5);
}

function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number, cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  color: string,
  font: string,
  flip: boolean
) {
  ctx.save();
  ctx.fillStyle    = color;
  ctx.font         = font;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const chars = text.split('');
  const total = endAngle - startAngle;
  const step  = total / chars.length;

  chars.forEach((ch, i) => {
    const angle = startAngle + i * step + step / 2;
    ctx.save();
    ctx.translate(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    ctx.rotate(angle + (flip ? Math.PI : Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}
