/**
 * heic.ts — Magic-byte sniff + lazy heic2any conversion
 */

const HEIC_MAGIC = [
  // ftyp box signatures for HEIC/HEIF
  'heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1',
];

async function isHeic(file: File): Promise<boolean> {
  const buf = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buf);
  // HEIC: bytes 4–7 are "ftyp", bytes 8–11 are brand
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return HEIC_MAGIC.includes(brand.toLowerCase());
}

/**
 * Convert a File (any format including HEIC) to an HTMLImageElement.
 * On failure, returns null and calls onError with a message.
 */
export async function fileToImage(
  file: File,
  onError: (msg: string) => void
): Promise<HTMLImageElement | null> {
  try {
    let blob: Blob = file;

    if (await isHeic(file)) {
      try {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        blob = Array.isArray(converted) ? converted[0] : converted;
      } catch {
        onError("Couldn't convert HEIC — try taking a screenshot first.");
        return null;
      }
    }

    const url = URL.createObjectURL(blob);
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } catch {
    onError('Could not load image. Please try a different file.');
    return null;
  }
}
