/**
 * halftone.ts — Retro halftone print effect
 * Converts an image into cream-paper dots with a pink misprint layer.
 */

const CREAM = { r: 251, g: 247, b: 236 };
const GREEN = { r: 10,  g: 107, b: 60  };
const PINK  = { r: 236, g: 30,  b: 121 };

export interface HalftoneOptions {
  cellSize?: number;
  dotScale?: number;
  pinkDensity?: number;
  pinkOffset?: number;
}

export function renderHalftone(
  src: HTMLCanvasElement,
  dest: HTMLCanvasElement,
  opts: HalftoneOptions = {}
) {
  const { cellSize = 7, dotScale = 0.92, pinkDensity = 0.35, pinkOffset = 2 } = opts;
  const w = src.width;
  const h = src.height;

  const srcCtx = src.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, w, h).data;
  const dstCtx = dest.getContext('2d')!;

  dstCtx.fillStyle = `rgb(${CREAM.r},${CREAM.g},${CREAM.b})`;
  dstCtx.fillRect(0, 0, w, h);

  const half = cellSize / 2;
  const maxR = half * dotScale;

  function seededRand(seed: number) {
    const x = Math.sin(seed + 1) * 10000;
    return x - Math.floor(x);
  }

  let cellIndex = 0;
  for (let cy = half; cy < h; cy += cellSize) {
    for (let cx = half; cx < w; cx += cellSize) {
      const px = Math.min(Math.floor(cx), w - 1);
      const py = Math.min(Math.floor(cy), h - 1);
      const i = (py * w + px) * 4;

      const r = srcData[i], g = srcData[i + 1], b = srcData[i + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const darkness = 1 - lum;
      const dotR = darkness * maxR;

      if (dotR > 0.3) {
        dstCtx.beginPath();
        dstCtx.arc(cx, cy, dotR, 0, Math.PI * 2);
        dstCtx.fillStyle = `rgb(${GREEN.r},${GREEN.g},${GREEN.b})`;
        dstCtx.fill();
      }

      if (seededRand(cellIndex) < pinkDensity && dotR > 0.5) {
        const pinkR = dotR * 0.45;
        dstCtx.beginPath();
        dstCtx.arc(cx + pinkOffset, cy + pinkOffset, pinkR, 0, Math.PI * 2);
        dstCtx.fillStyle = `rgba(${PINK.r},${PINK.g},${PINK.b},0.7)`;
        dstCtx.fill();
      }

      cellIndex++;
    }
  }
}

export function imageToHalftone(
  img: HTMLImageElement | ImageBitmap,
  width: number,
  height: number,
  opts?: HalftoneOptions
): HTMLCanvasElement {
  const src = document.createElement('canvas');
  src.width = width;
  src.height = height;
  src.getContext('2d')!.drawImage(img, 0, 0, width, height);

  const dest = document.createElement('canvas');
  dest.width = width;
  dest.height = height;

  renderHalftone(src, dest, opts);
  return dest;
}
