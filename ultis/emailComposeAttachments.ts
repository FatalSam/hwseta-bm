/**
 * Prepare files for email compose: compress raster images (JPEG) before upload.
 * SVG and non-image types are left unchanged.
 */

const IMAGE_TYPE = /^image\//;
const SKIP_COMPRESS = /image\/svg\+xml/i;

export function isCompressibleImage(file: File): boolean {
  return IMAGE_TYPE.test(file.type) && !SKIP_COMPRESS.test(file.type);
}

/**
 * Resize (max edge) and export as JPEG. GIF animation is flattened to one frame.
 */
export async function compressImageToJpegFile(file: File, maxEdge = 2048, quality = 0.82): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not load image'));
      el.src = url;
    });

    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (!w || !h) return file;

    if (w > maxEdge || h > maxEdge) {
      const scale = Math.min(maxEdge / w, maxEdge / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
    if (!blob) return file;

    const stem = file.name.replace(/\.[^/.]+$/, '') || 'attachment';
    return new File([blob], `${stem}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareFileForEmailAttachment(file: File): Promise<File> {
  if (isCompressibleImage(file)) {
    try {
      return await compressImageToJpegFile(file);
    } catch {
      return file;
    }
  }
  return file;
}
