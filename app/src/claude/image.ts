/**
 * Photos are resized before upload. Claude's high-resolution vision models
 * read images up to 2576 px on the long edge; anything larger is downscaled
 * by the API anyway, so sending more only costs time on mobile data.
 */
export const MAX_LONG_EDGE = 2576;
export const JPEG_QUALITY = 0.9; // labels are small text: keep compression light

export function fitWithin(width: number, height: number, maxLongEdge = MAX_LONG_EDGE) {
  const long = Math.max(width, height);
  if (long <= maxLongEdge) return { width, height };
  const scale = maxLongEdge / long;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export interface PreparedImage {
  mediaType: 'image/jpeg';
  /** Base64 without the data: prefix. */
  data: string;
  width: number;
  height: number;
}

/** Browser only: decode (respecting EXIF rotation), resize and re-encode as JPEG. */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser can’t process photos.');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t encode the photo.'))), 'image/jpeg', JPEG_QUALITY),
    );
    return { mediaType: 'image/jpeg', data: await toBase64(blob), width, height };
  } finally {
    bitmap.close();
  }
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => reject(r.error ?? new Error('Couldn’t read the photo.'));
    r.readAsDataURL(blob);
  });
}
