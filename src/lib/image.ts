// Client-side image validation + compression.
// Keeps localStorage / payloads small and renders fast thumbnails in lists.

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB raw input

export interface ProcessedImage {
  full: string; // compressed display image (data URL)
  thumb: string; // tiny thumbnail (data URL)
  width: number;
  height: number;
  bytes: number; // approx bytes of `full`
}

export class ImageValidationError extends Error {
  code: "type" | "size" | "decode";
  constructor(code: "type" | "size" | "decode", message: string) {
    super(message);
    this.code = code;
  }
}

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new ImageValidationError("decode", "Could not read image")); };
    img.src = url;
  });
}

function drawToDataUrl(
  img: HTMLImageElement,
  maxDim: number,
  quality: number,
  mime: "image/webp" | "image/jpeg",
): { url: string; w: number; h: number } {
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageValidationError("decode", "Canvas unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return { url: canvas.toDataURL(mime, quality), w, h };
}

function pickMime(): "image/webp" | "image/jpeg" {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
  } catch {
    return "image/jpeg";
  }
}

export async function processImage(
  file: File,
  opts: { maxDim?: number; thumbDim?: number; quality?: number } = {},
): Promise<ProcessedImage> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new ImageValidationError("type", "Only JPG, PNG or WEBP images are allowed");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("size", `Image too large (max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB)`);
  }
  const img = await loadBitmap(file);
  const mime = pickMime();
  const { url: full, w, h } = drawToDataUrl(img, opts.maxDim ?? 1600, opts.quality ?? 0.82, mime);
  const { url: thumb } = drawToDataUrl(img, opts.thumbDim ?? 240, 0.75, mime);
  // Approx bytes for the base64 payload (4/3 expansion, minus padding).
  const bytes = Math.round((full.length - (full.indexOf(",") + 1)) * 0.75);
  return { full, thumb, width: w, height: h, bytes };
}