/**
 * loadImg.ts — Promise-based image loader with cache
 * Used by canvas renderers to draw /public assets onto canvases.
 */

const cache = new Map<string, HTMLImageElement>();

export function loadImg(src: string): Promise<HTMLImageElement> {
  if (cache.has(src)) return Promise.resolve(cache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { cache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

/** Preload all brand assets at startup */
export const BRAND = {
  banner:    '/brand-banner.png',   // Full wordmark: HACKER HOUSE गोवा + dates
  bgBeach:   '/bg-beach.png',       // Beach illustration (upload zone bg)
  bgScooter: '/bg-scooter.png',     // Beach+scooter scene (passport right page)
  bgHouse:   '/bg-house.png',       // House illustration (share page)
  bgPalms:   '/bg-palms.png',       // Palms + wordmark banner
  goaSticker:'/goa-sticker.png',    // गोवा pink sticker badge
  wordmark:  '/hh-wordmark.png',    // HACKER HOUSE yellow wordmark (transparent bg)
  passTemplate: '/builder-pass-template.png',
} as const;

export async function preloadBrand(): Promise<void> {
  await Promise.allSettled(Object.values(BRAND).map(loadImg));
}
