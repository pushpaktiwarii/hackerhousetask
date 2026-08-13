/**
 * fit.ts — cover-fit + pan/zoom transform for uploaded photos
 */

export interface FitTransform {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Returns source crop coordinates to cover-fit an image into (targetW × targetH)
 * with optional panX/panY offsets in the range [-1, 1] and zoom scale >= 1.
 */
export function coverFit(
  imgW: number,
  imgH: number,
  targetW: number,
  targetH: number,
  panX = 0,
  panY = 0,
  zoom = 1
): FitTransform {
  const imgAspect = imgW / imgH;
  const targetAspect = targetW / targetH;

  let sw: number, sh: number;
  if (imgAspect > targetAspect) {
    sh = imgH / zoom;
    sw = sh * targetAspect;
  } else {
    sw = imgW / zoom;
    sh = sw / targetAspect;
  }

  const maxPanX = (imgW - sw) / 2;
  const maxPanY = (imgH - sh) / 2;

  const sx = clamp(imgW / 2 - sw / 2 + panX * maxPanX, 0, imgW - sw);
  const sy = clamp(imgH / 2 - sh / 2 + panY * maxPanY, 0, imgH - sh);

  return { sx, sy, sw, sh };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function drawCoverFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  panX = 0,
  panY = 0,
  zoom = 1
) {
  const { sx, sy, sw, sh } = coverFit(img.width, img.height, destW, destH, panX, panY, zoom);
  ctx.drawImage(img, sx, sy, sw, sh, destX, destY, destW, destH);
}
