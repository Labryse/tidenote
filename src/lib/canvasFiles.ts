import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Firestore-only canvas image storage (Firebase Storage is unavailable on the
 * Spark plan).
 *
 * Images are compressed client-side on insert, then stored as their own
 * documents in the `notes/{noteId}/files` subcollection — never inside the note
 * doc, which must stay under Firestore's ~1 MB limit. A compressed image that
 * still exceeds one doc is split into sequential chunk docs (`{fileId}__{i}`)
 * and reassembled on load. The note doc keeps only small `{ mimeType, chunks }`
 * references.
 */

export interface CanvasFileRef {
  mimeType: string;
  chunks: number;
}

/** A note-doc `files` entry that references subcollection docs (not inline base64). */
export function isCanvasFileRef(entry: any): entry is CanvasFileRef {
  return !!entry && typeof entry.chunks === "number" && !entry.dataURL;
}

const MAX_EDGE = 1600;          // longest-edge cap (px)
const QUALITY = 0.75;           // WebP/JPEG quality
const CHUNK_SIZE = 900_000;     // per-doc data size, safely under the 1 MB field limit
/** Originals larger than this are rejected with a clear error rather than stored. */
export const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024;

/** Decoded byte size of a base64 data URL. */
export function dataURLByteSize(dataURL: string): number {
  const i = dataURL.indexOf(",");
  const b64 = i >= 0 ? dataURL.slice(i + 1) : dataURL;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = src;
  });
}

/**
 * Downscale to MAX_EDGE on the longest side and re-encode as WebP (JPEG
 * fallback) at QUALITY. Returns the original untouched if canvas 2D is
 * unavailable.
 */
export async function compressImageDataURL(
  dataURL: string
): Promise<{ dataURL: string; mimeType: string }> {
  const img = await loadImage(dataURL);
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (!width || !height) return { dataURL, mimeType: "image/png" };

  const longest = Math.max(width, height);
  if (longest > MAX_EDGE) {
    const scale = MAX_EDGE / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataURL, mimeType: "image/png" };
  ctx.drawImage(img, 0, 0, width, height);

  let out = canvas.toDataURL("image/webp", QUALITY);
  let mimeType = "image/webp";
  if (!out.startsWith("data:image/webp")) {
    // Browser without WebP encode support: fall back to JPEG (flatten onto
    // white so transparency doesn't turn black).
    const flat = document.createElement("canvas");
    flat.width = width;
    flat.height = height;
    const fctx = flat.getContext("2d");
    if (fctx) {
      fctx.fillStyle = "#ffffff";
      fctx.fillRect(0, 0, width, height);
      fctx.drawImage(img, 0, 0, width, height);
      out = flat.toDataURL("image/jpeg", QUALITY);
      mimeType = "image/jpeg";
    }
  }
  return { dataURL: out, mimeType };
}

/** Persist a (compressed) data URL as chunk docs; returns the ref for the note doc. */
export async function saveCanvasFile(
  noteId: string,
  fileId: string,
  dataURL: string,
  mimeType: string
): Promise<CanvasFileRef> {
  const parts: string[] = [];
  for (let i = 0; i < dataURL.length; i += CHUNK_SIZE) {
    parts.push(dataURL.slice(i, i + CHUNK_SIZE));
  }
  const filesCol = collection(db, "notes", noteId, "files");
  const batch = writeBatch(db);
  parts.forEach((data, index) => {
    const ref = doc(filesCol, `${fileId}__${index}`);
    batch.set(
      ref,
      index === 0
        ? { fileId, index, data, mimeType, chunks: parts.length }
        : { fileId, index, data }
    );
  });
  await batch.commit();
  return { mimeType, chunks: parts.length };
}

/** Delete all chunk docs for a file (used when its image leaves the canvas). */
export async function deleteCanvasFile(noteId: string, fileId: string, chunks: number): Promise<void> {
  const filesCol = collection(db, "notes", noteId, "files");
  const batch = writeBatch(db);
  for (let i = 0; i < Math.max(1, chunks); i++) {
    batch.delete(doc(filesCol, `${fileId}__${i}`));
  }
  await batch.commit();
}

/**
 * Load every stored file for a note in a single query and reassemble each into
 * a data URL keyed by fileId. Works for owner and public readers alike.
 */
export async function loadCanvasFiles(
  noteId: string
): Promise<Record<string, { dataURL: string; mimeType: string }>> {
  const snap = await getDocs(collection(db, "notes", noteId, "files"));
  const grouped: Record<string, { mimeType: string; parts: string[] }> = {};
  snap.forEach((d) => {
    const data = d.data() as any;
    const fid = data.fileId;
    if (!fid) return;
    if (!grouped[fid]) grouped[fid] = { mimeType: "image/webp", parts: [] };
    if (data.mimeType) grouped[fid].mimeType = data.mimeType;
    if (typeof data.index === "number") grouped[fid].parts[data.index] = data.data || "";
  });

  const out: Record<string, { dataURL: string; mimeType: string }> = {};
  for (const [fid, v] of Object.entries(grouped)) {
    const dataURL = v.parts.join("");
    if (dataURL) out[fid] = { dataURL, mimeType: v.mimeType };
  }
  return out;
}
