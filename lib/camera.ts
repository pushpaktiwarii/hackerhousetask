/**
 * camera.ts — getUserMedia booth mode with 3-2-1 countdown overlay
 */

export interface BoothResult {
  image: HTMLImageElement;
}

/**
 * Opens the front camera, shows a countdown, captures a frame,
 * and returns it as an HTMLImageElement.
 * Calls onCountdown(n) each second (3, 2, 1, 0=capture).
 * Calls onError(msg) on permission denied or other failures.
 */
export async function boothCapture(
  onCountdown: (n: number) => void,
  onError: (msg: string) => void
): Promise<BoothResult | null> {
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    });
  } catch {
    onError('Camera permission denied. You can still upload a photo.');
    return null;
  }

  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  // Countdown 3 → 2 → 1
  for (let i = 3; i >= 1; i--) {
    onCountdown(i);
    await sleep(1000);
  }
  onCountdown(0); // capture moment

  // Capture frame
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  // Mirror for selfie feel
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);

  // Stop stream
  stream.getTracks().forEach(t => t.stop());

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const img = new Image();
  await new Promise<void>((res) => { img.onload = () => res(); img.src = dataUrl; });

  return { image: img };
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
