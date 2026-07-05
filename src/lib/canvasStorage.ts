import { ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Canvas image storage.
 *
 * Excalidraw stores images as base64 `dataURL`s. Persisting those inside the
 * note document blows Firestore's 1 MB doc limit and fails the whole save. We
 * instead upload the image bytes to Firebase Storage and keep only a small
 * reference in the doc; on open we fetch the bytes back into Excalidraw.
 *
 * Public read is intentional (public/shared canvas notes embed these files) —
 * see storage.rules. Paths use the fileId, which is unguessable in practice.
 */

export interface CanvasFileRef {
  storagePath: string;
  mimeType?: string;
}

/** A doc `files` entry is a Storage reference (not inline base64). */
export function isCanvasFileRef(entry: any): entry is CanvasFileRef {
  return !!entry && typeof entry.storagePath === "string" && !entry.dataURL;
}

export function canvasFilePath(uid: string, noteId: string, fileId: string): string {
  return `canvas-files/${uid}/${noteId}/${fileId}`;
}

/** Upload one image (base64 dataURL) and return the doc reference to store. */
export async function uploadCanvasFile(
  uid: string,
  noteId: string,
  fileId: string,
  dataURL: string,
  mimeType?: string
): Promise<CanvasFileRef> {
  const path = canvasFilePath(uid, noteId, fileId);
  const r = storageRef(storage, path);
  await uploadString(r, dataURL, "data_url");
  return { storagePath: path, mimeType };
}

/** Fetch a stored image back as a base64 dataURL for Excalidraw. */
export async function fetchCanvasFileDataURL(storagePath: string): Promise<string> {
  const r = storageRef(storage, storagePath);
  const url = await getDownloadURL(r);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Storage fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  return await blobToDataURL(blob);
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
