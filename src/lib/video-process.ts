// Video validation + best-effort browser-side recompression.
//
// True transcoding in the browser is expensive (ffmpeg.wasm is ~30 MB) so we
// take a pragmatic path:
//   1. Hard-validate MIME type and size before doing any work.
//   2. Probe duration / dimensions by loading the file metadata.
//   3. If the file is over the "compress" threshold AND short enough, attempt
//      a real-time MediaRecorder re-encode at a capped bitrate and resolution.
//      Anything that goes wrong falls back to the original file with a flag.

export const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov from iPhones
] as const;

export const MAX_VIDEO_MB = 100;
export const COMPRESS_THRESHOLD_MB = 25;
export const MAX_COMPRESS_DURATION_S = 180; // 3 min — keeps real-time encode bounded

export class VideoValidationError extends Error {
  code: "type" | "size" | "decode" | "empty";
  constructor(code: VideoValidationError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "VideoValidationError";
  }
}

export interface VideoMeta {
  width: number;
  height: number;
  duration: number;
}

export interface ProcessedVideo {
  file: Blob;
  meta: VideoMeta;
  compressed: boolean;
  originalBytes: number;
  bytes: number;
  contentType: string;
}

function readMeta(file: Blob): Promise<{ meta: VideoMeta; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    const cleanup = () => {
      v.onloadedmetadata = null;
      v.onerror = null;
    };
    v.onloadedmetadata = () => {
      cleanup();
      resolve({
        url,
        meta: {
          width: v.videoWidth || 0,
          height: v.videoHeight || 0,
          duration: v.duration || 0,
        },
      });
    };
    v.onerror = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new VideoValidationError("decode", "Could not read this video file."));
    };
  });
}

async function recordCanvas(
  src: HTMLVideoElement,
  meta: VideoMeta,
  opts: { maxDim: number; videoBitsPerSecond: number },
): Promise<Blob> {
  const scale = Math.min(1, opts.maxDim / Math.max(meta.width, meta.height || 1));
  const w = Math.max(2, Math.round((meta.width * scale) / 2) * 2);
  const h = Math.max(2, Math.round((meta.height * scale) / 2) * 2);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const stream = canvas.captureStream(30);
  // Best-effort audio passthrough.
  // Browsers expose captureStream / mozCaptureStream on HTMLMediaElement.
  const elStream =
    (src as unknown as { captureStream?: () => MediaStream }).captureStream?.() ??
    (src as unknown as { mozCaptureStream?: () => MediaStream }).mozCaptureStream?.();
  elStream?.getAudioTracks().forEach((t) => stream.addTrack(t));

  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mimeType =
    candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: opts.videoBitsPerSecond,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (ev) => reject(ev);
  });

  recorder.start(250);
  src.currentTime = 0;
  await src.play();

  let raf = 0;
  const draw = () => {
    ctx.drawImage(src, 0, 0, w, h);
    raf = requestAnimationFrame(draw);
  };
  draw();

  await new Promise<void>((resolve) => {
    src.onended = () => resolve();
  });
  cancelAnimationFrame(raf);
  recorder.stop();
  return done;
}

export async function processVideo(
  file: File,
  opts: {
    maxMB?: number;
    compressThresholdMB?: number;
    maxDim?: number;
    videoBitsPerSecond?: number;
    onStage?: (stage: "validate" | "probe" | "compress" | "done") => void;
  } = {},
): Promise<ProcessedVideo> {
  const maxMB = opts.maxMB ?? MAX_VIDEO_MB;
  const compressThresholdMB = opts.compressThresholdMB ?? COMPRESS_THRESHOLD_MB;
  const maxDim = opts.maxDim ?? 1080;
  const bitrate = opts.videoBitsPerSecond ?? 2_500_000;

  opts.onStage?.("validate");
  if (!file || file.size === 0) {
    throw new VideoValidationError("empty", "That file is empty.");
  }
  const type = file.type || "";
  if (!ALLOWED_VIDEO_MIME.includes(type as (typeof ALLOWED_VIDEO_MIME)[number])) {
    throw new VideoValidationError(
      "type",
      `Unsupported video type${type ? ` (${type})` : ""}. Use MP4, MOV or WebM.`,
    );
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxMB) {
    throw new VideoValidationError(
      "size",
      `Video is ${sizeMB.toFixed(1)} MB — the maximum is ${maxMB} MB.`,
    );
  }

  opts.onStage?.("probe");
  const { meta, url } = await readMeta(file);
  try {
    const shouldCompress =
      sizeMB > compressThresholdMB &&
      meta.duration > 0 &&
      meta.duration <= MAX_COMPRESS_DURATION_S &&
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported("video/webm");

    if (!shouldCompress) {
      opts.onStage?.("done");
      return {
        file,
        meta,
        compressed: false,
        originalBytes: file.size,
        bytes: file.size,
        contentType: type,
      };
    }

    opts.onStage?.("compress");
    const src = document.createElement("video");
    src.src = url;
    src.muted = false;
    src.playsInline = true;
    await new Promise<void>((res, rej) => {
      src.onloadeddata = () => res();
      src.onerror = () => rej(new VideoValidationError("decode", "Could not decode for compression."));
    });
    try {
      const compressed = await recordCanvas(src, meta, {
        maxDim,
        videoBitsPerSecond: bitrate,
      });
      // Only keep the result if it actually got smaller; otherwise fall back.
      if (compressed.size > 0 && compressed.size < file.size) {
        opts.onStage?.("done");
        return {
          file: compressed,
          meta,
          compressed: true,
          originalBytes: file.size,
          bytes: compressed.size,
          contentType: compressed.type || "video/webm",
        };
      }
    } catch {
      // fall through and ship the original
    }
    opts.onStage?.("done");
    return {
      file,
      meta,
      compressed: false,
      originalBytes: file.size,
      bytes: file.size,
      contentType: type,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}