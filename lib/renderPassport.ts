/**
 * renderPassport.ts — Format B compositor
 * Output: 1200×675 passport spread ID card
 * Uses real brand images from /public/
 */

import { drawCoverFit } from './fit';
import { imageToHalftone } from './halftone';
import { StampConfig } from './stamp';
import { renderStampSeal } from './renderPostcard';
import { generateVisaClass } from './visa';
import { loadImg, BRAND } from './loadImg';

export interface PassportOptions {
  image: HTMLImageElement | ImageBitmap;
  name: string;
  role: string;
  halftone: boolean;
  stampConfig: StampConfig | null;
  panX?: number;
  panY?: number;
  zoom?: number;
}

const W = 1200;
const H = 675;

const CREAM  = '#FBF7EC';
const GREEN  = '#0A6B3C';
const PINK   = '#EC1E79';
const YELLOW = '#FFD400';
const INK    = '#111111';

export async function renderPassport(opts: PassportOptions): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const { image, name, role, halftone, stampConfig, panX = 0, panY = 0, zoom = 1 } = opts;
  const visaClass = generateVisaClass(name);

  // Load brand assets
  const [scooterImg, goaSticker, wordmark] = await Promise.all([
    loadImg(BRAND.bgScooter),
    loadImg(BRAND.goaSticker),
    loadImg(BRAND.wordmark),
  ]);

  // ── Background ─────────────────────────────────────────
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);

  // ── Passport book ──────────────────────────────────────
  const PAD    = 28;
  const BOOK_W = W - PAD * 2;
  const BOOK_H = H - PAD * 2;
  const SPINE  = 16;

  // Book shadow
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur  = 36;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, PAD, PAD, BOOK_W, BOOK_H, 8);
  ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  const LEFT_W = (BOOK_W - SPINE) / 2;
  const RIGHT_X = PAD + LEFT_W + SPINE;

  // Left page
  ctx.fillStyle = CREAM;
  roundRectLeft(ctx, PAD, PAD, LEFT_W, BOOK_H, 8);
  ctx.fill();

  // Right page
  ctx.fillStyle = '#F5F0E0';
  roundRectRight(ctx, RIGHT_X, PAD, LEFT_W, BOOK_H, 8);
  ctx.fill();

  // Spine
  ctx.fillStyle = '#0B5530';
  ctx.fillRect(PAD + LEFT_W, PAD, SPINE, BOOK_H);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(PAD + LEFT_W + 2, PAD, 2, BOOK_H);
  ctx.fillRect(PAD + LEFT_W + SPINE - 4, PAD, 2, BOOK_H);

  // ── LEFT PAGE ──────────────────────────────────────────
  const LP_X = PAD + 18;
  const LP_Y = PAD + 14;
  const LP_W = LEFT_W - 36;
  const LP_H = BOOK_H - 28;

  // Header strip
  ctx.fillStyle = GREEN;
  ctx.fillRect(LP_X, LP_Y, LP_W, 30);
  ctx.fillStyle = CREAM;
  ctx.font      = `bold 11px "Courier Prime", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('HACKER HOUSE · REPUBLIC OF BUILDERS', LP_X + LP_W / 2, LP_Y + 20);

  // Photo box
  const PH_W  = 155;
  const PH_H  = 195;
  const PH_X  = LP_X + 14;
  const PH_Y  = LP_Y + 44;

  ctx.strokeStyle = GREEN;
  ctx.lineWidth   = 2;
  ctx.strokeRect(PH_X - 2, PH_Y - 2, PH_W + 4, PH_H + 4);

  ctx.save();
  ctx.beginPath();
  ctx.rect(PH_X, PH_Y, PH_W, PH_H);
  ctx.clip();
  if (halftone) {
    const ht = imageToHalftone(image as HTMLImageElement, PH_W, PH_H, { cellSize: 5 });
    ctx.drawImage(ht, PH_X, PH_Y);
  } else {
    drawCoverFit(ctx, image, PH_X, PH_Y, PH_W, PH_H, panX, panY, zoom);
  }
  ctx.restore();

  // Fields
  const FX = PH_X + PH_W + 18;
  const FW = LP_W - PH_W - 50;

  const fields = [
    { label: 'NAME OF BUILDER', value: (name || 'BUILDER').toUpperCase() },
    { label: 'OCCUPATION',      value: (role  || 'HACKER').toUpperCase()  },
    { label: 'PORT OF ENTRY',   value: 'GOA, INDIA'                       },
    { label: 'DATE OF ISSUE',   value: '28 OCT 2026'                      },
    { label: 'VALID UNTIL',     value: '31 OCT 2026'                      },
  ];

  let FY = LP_Y + 54;
  for (const { label, value } of fields) {
    ctx.fillStyle = '#777';
    ctx.font      = `9px "Courier Prime", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(label, FX, FY);
    ctx.fillStyle = '#C0B89A';
    ctx.fillRect(FX, FY + 2, FW, 1);
    ctx.fillStyle = INK;
    ctx.font      = `bold 13px "Courier Prime", monospace`;
    ctx.fillText(clipText(ctx, value, FW), FX, FY + 18);
    FY += 43;
  }

  // Visa class
  ctx.fillStyle = PINK;
  ctx.font      = `bold 10px "Courier Prime", monospace`;
  ctx.fillText(clipText(ctx, visaClass, FW + 20), FX, FY + 6);

  // MRZ strip
  const MRZ_Y = LP_Y + LP_H - 46;
  ctx.fillStyle = '#E5DEC8';
  ctx.fillRect(LP_X, MRZ_Y - 8, LP_W, 42);
  const [mrz1, mrz2] = buildMRZ(name, role);
  ctx.fillStyle = INK;
  ctx.font      = `bold 10px "Courier Prime", monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(mrz1, LP_X + 6, MRZ_Y + 8);
  ctx.fillText(mrz2, LP_X + 6, MRZ_Y + 24);

  // ── RIGHT PAGE ─────────────────────────────────────────
  const RP_X = RIGHT_X + 18;
  const RP_Y = PAD + 14;
  const RP_W = LEFT_W - 36;
  const RP_H = BOOK_H - 28;

  // Header
  ctx.fillStyle = GREEN;
  ctx.fillRect(RP_X, RP_Y, RP_W, 30);
  ctx.fillStyle = CREAM;
  ctx.font      = `bold 11px "Courier Prime", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('ENTRY · VISA · STAMPS', RP_X + RP_W / 2, RP_Y + 20);

  // Brand scooter scene (top-right of right page, clipped) ───
  const SCENE_H = 140;
  ctx.save();
  ctx.beginPath();
  ctx.rect(RP_X, RP_Y + 32, RP_W, SCENE_H);
  ctx.clip();
  // Draw the scooter illustration, cover-fitted
  const scootAspect = scooterImg.width / scooterImg.height;
  const scootRenderW = SCENE_H * scootAspect;
  const scootOffsetX = RP_X + (RP_W - scootRenderW) / 2;
  ctx.drawImage(scooterImg, scootOffsetX, RP_Y + 32, scootRenderW, SCENE_H);
  // Green tint overlay to keep it on-brand
  ctx.fillStyle = 'rgba(10,107,60,0.18)';
  ctx.fillRect(RP_X, RP_Y + 32, RP_W, SCENE_H);
  ctx.restore();

  // Arrived stamp overlaid on scene
  const SEAL_SIZE = 160;
  const SEAL_X    = RP_X + (RP_W - SEAL_SIZE) / 2;
  const SEAL_Y    = RP_Y + 32 + (SCENE_H - SEAL_SIZE) / 2;

  const seal = renderStampSeal(SEAL_SIZE);
  if (stampConfig) {
    ctx.save();
    ctx.translate(SEAL_X + SEAL_SIZE / 2, SEAL_Y + SEAL_SIZE / 2);
    ctx.rotate((stampConfig.rotation * Math.PI) / 180);
    ctx.drawImage(seal, -SEAL_SIZE / 2, -SEAL_SIZE / 2, SEAL_SIZE, SEAL_SIZE);
    ctx.restore();
  } else {
    // Placeholder dashed ring
    ctx.save();
    ctx.strokeStyle = 'rgba(236,30,121,0.35)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(SEAL_X + SEAL_SIZE / 2, SEAL_Y + SEAL_SIZE / 2, SEAL_SIZE / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle  = 'rgba(251,247,236,0.5)';
    ctx.font       = `12px "Courier Prime", monospace`;
    ctx.textAlign  = 'center';
    ctx.fillText('STAMP HERE', SEAL_X + SEAL_SIZE / 2, SEAL_Y + SEAL_SIZE / 2 + 5);
    ctx.restore();
  }

  // Visa sticker strip below scene
  const VISA_Y = RP_Y + 32 + SCENE_H + 8;
  const VISA_H = 88;
  drawVisaSticker(ctx, RP_X, VISA_Y, RP_W, VISA_H, goaSticker, name, visaClass);

  // Wordmark at bottom of right page
  const WM_H = 36;
  const WM_Y = RP_Y + RP_H - WM_H - 6;
  const wmAspect = wordmark.width / wordmark.height;
  const WM_W = WM_H * wmAspect;
  ctx.drawImage(wordmark, RP_X + (RP_W - WM_W) / 2, WM_Y, WM_W, WM_H);

  return canvas;
}

// ── Helpers ─────────────────────────────────────────────

function buildMRZ(name: string, role: string): [string, string] {
  const pad   = (s: string, n: number) => (s + '<'.repeat(n)).slice(0, n);
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '<');
  const line1 = `HHGOA<2026<<${pad(clean(name || 'BUILDER'), 20)}`;
  const line2 = `BUILDR26<<<<<${pad(clean(role || 'HACKER'), 16)}<<`;
  return [pad(line1, 44), pad(line2, 44)];
}

function drawVisaSticker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  goaSticker: HTMLImageElement,
  name: string,
  visaClass: string
) {
  ctx.fillStyle = YELLOW;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = PINK;
  ctx.lineWidth   = 2;
  ctx.setLineDash([5, 3]);
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // गोवा sticker icon
  const ICON = 52;
  ctx.drawImage(goaSticker, x + 10, y + (h - ICON) / 2, ICON, ICON);

  ctx.fillStyle = INK;
  ctx.font      = `bold 12px "Courier Prime", monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('ENTRY VISA · HH GOA 2026', x + 72, y + 20);
  ctx.font = `10px "Courier Prime", monospace`;
  ctx.fillText('28 OCT – 31 OCT 2026 · GOA, INDIA', x + 72, y + 36);
  ctx.fillStyle = GREEN;
  ctx.font      = `bold 10px "Courier Prime", monospace`;
  ctx.fillText(clipText(ctx, visaClass, w - 82), x + 72, y + 52);
  ctx.fillStyle = INK;
  ctx.font      = `10px "Courier Prime", monospace`;
  ctx.fillText('#FrameInGoa · 2:47 PM STUDIO', x + 72, y + 68);
}

function clipText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function roundRectLeft(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function roundRectRight(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x, y + h); ctx.closePath();
}
