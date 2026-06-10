import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const BUCKET = "media";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

export interface UploadResult {
  path: string;
  url: string;
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extFromType(type: string, fallback: string) {
  if (!type) return fallback;
  if (type.includes("mp4")) return "mp4";
  if (type.includes("webm")) return "webm";
  if (type.includes("quicktime")) return "mov";
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return fallback;
}

export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not sign URL");
  return data.signedUrl;
}

/**
 * Upload a Blob/File to the `media` bucket and return a long-lived signed URL.
 * Reports progress 0..1 via onProgress.
 */
export function uploadMedia(
  file: Blob,
  opts: {
    folder: "videos" | "posters" | "fighters" | "avatars";
    filename?: string;
    contentType?: string;
    onProgress?: (pct: number) => void;
  },
): Promise<UploadResult> {
  const type = opts.contentType || (file as File).type || "application/octet-stream";
  const ext = extFromType(type, opts.folder === "videos" ? "mp4" : "jpg");
  const base = (opts.filename || randomId()).replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${opts.folder}/${randomId()}-${base}.${ext}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  // Use the current user's access token when available — storage RLS evaluates
  // policies against the JWT, and some networks/CDNs reject raw-body POST
  // uploads carrying only the anon key.
  return (async () => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token || SUPABASE_KEY;
    return new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      // PUT + x-upsert is the documented update path and is more reliable
      // than POST for re-uploads / retries.
      xhr.open("PUT", endpoint, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", SUPABASE_KEY);
      xhr.setRequestHeader("Content-Type", type);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && opts.onProgress) {
          opts.onProgress(Math.min(0.99, ev.loaded / ev.total));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onload = async () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          // Fallback to supabase-js (handles auth + multipart correctly).
          try {
            const { error } = await supabase.storage
              .from(BUCKET)
              .upload(path, file, { upsert: true, contentType: type });
            if (error) throw error;
            const url = await getSignedUrl(path);
            opts.onProgress?.(1);
            resolve({ path, url });
          } catch (e) {
            reject(
              new Error(
                `Upload failed (${xhr.status}): ${xhr.responseText || (e as Error).message}`,
              ),
            );
          }
          return;
        }
        try {
          const url = await getSignedUrl(path);
          opts.onProgress?.(1);
          resolve({ path, url });
        } catch (e) {
          reject(e as Error);
        }
      };
      xhr.send(file);
    });
  })();
}

export async function deleteMedia(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}