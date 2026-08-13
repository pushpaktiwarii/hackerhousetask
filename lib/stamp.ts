/**
 * stamp.ts — Stamp Slam animation + baked-stamp randomizer
 */

export interface StampConfig {
  rotation: number;    // degrees, range −12 to +12
  cornerX: 'left' | 'right';
  cornerY: 'top' | 'bottom';
}

/** Generate a random (but seeded-reproducible if needed) stamp config */
export function randomStampConfig(): StampConfig {
  return {
    rotation: (Math.random() - 0.5) * 24, // −12 to +12
    cornerX: Math.random() > 0.5 ? 'left' : 'right',
    cornerY: Math.random() > 0.5 ? 'top' : 'bottom',
  };
}

export interface SlamState {
  phase: 'idle' | 'falling' | 'impact' | 'bounce' | 'done';
  progress: number; // 0–1 within each phase
  scale: number;
  opacity: number;
  squash: number; // y-scale at impact
}

/**
 * Runs the stamp slam animation via rAF.
 * Calls onFrame(state) each frame.
 * Calls onDone() when animation completes.
 * Returns a cancel function.
 */
export function runStampSlam(
  onFrame: (state: SlamState) => void,
  onDone: () => void
): () => void {
  let raf = 0;
  let cancelled = false;
  const start = performance.now();

  // Phase timings in ms
  const FALL_MS = 350;
  const IMPACT_MS = 80;
  const BOUNCE_MS = 200;
  const SETTLE_MS = 150;
  const TOTAL_MS = FALL_MS + IMPACT_MS + BOUNCE_MS + SETTLE_MS;

  function tick(now: number) {
    if (cancelled) return;
    const elapsed = now - start;

    let state: SlamState;

    if (elapsed < FALL_MS) {
      // Fall: stamp drops from above, accelerating (ease-in)
      const t = elapsed / FALL_MS;
      const eased = t * t; // ease-in quad
      state = {
        phase: 'falling',
        progress: t,
        scale: 1,
        opacity: 0.3 + 0.7 * eased,
        squash: 1,
      };
    } else if (elapsed < FALL_MS + IMPACT_MS) {
      // Impact: squash
      const t = (elapsed - FALL_MS) / IMPACT_MS;
      state = {
        phase: 'impact',
        progress: t,
        scale: 1 + 0.08 * (1 - t), // slight scale up
        opacity: 1,
        squash: 1 - 0.18 * Math.sin(t * Math.PI), // squash then restore
      };
      // Haptic at impact start
      if (t < 0.1 && navigator.vibrate) navigator.vibrate([30]);
    } else if (elapsed < FALL_MS + IMPACT_MS + BOUNCE_MS) {
      // Bounce: slight rise and fall
      const t = (elapsed - FALL_MS - IMPACT_MS) / BOUNCE_MS;
      state = {
        phase: 'bounce',
        progress: t,
        scale: 1 + 0.04 * Math.sin(t * Math.PI),
        opacity: 1,
        squash: 1,
      };
    } else if (elapsed < TOTAL_MS) {
      // Settle
      state = { phase: 'bounce', progress: 1, scale: 1, opacity: 1, squash: 1 };
    } else {
      onFrame({ phase: 'done', progress: 1, scale: 1, opacity: 1, squash: 1 });
      onDone();
      return;
    }

    onFrame(state);
    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);
  return () => { cancelled = true; cancelAnimationFrame(raf); };
}

/**
 * Bake the stamp onto a canvas at a randomized position.
 * The stamp SVG element is drawn into the canvas context.
 * stampSize: diameter of the stamp in canvas pixels.
 * margin: distance from the edge of the canvas.
 */
export function bakeStamp(
  ctx: CanvasRenderingContext2D,
  stampCanvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  config: StampConfig,
  stampSize: number,
  margin: number
) {
  const x = config.cornerX === 'left' ? margin : canvasW - margin - stampSize;
  const y = config.cornerY === 'top' ? margin : canvasH - margin - stampSize;

  ctx.save();
  ctx.translate(x + stampSize / 2, y + stampSize / 2);
  ctx.rotate((config.rotation * Math.PI) / 180);
  ctx.drawImage(stampCanvas, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
  ctx.restore();
}
