import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import LoadingSpinner from "../components/LoadingSpinner";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { MantineProvider } from "@mantine/core";
import { defaultBlockSpecs } from "@blocknote/core";
import { CalloutBlock } from "../components/CalloutBlock";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@mantine/core/styles.css";

function BlockNoteReader({ content }: { content: any[] }) {
  const editor = useCreateBlockNote({
    initialContent: content,
    blockSpecs: {
      ...defaultBlockSpecs,
      callout: CalloutBlock,
    },
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={false}
      theme="dark"
    />
  );
}

// ── Document public view ──────────────────────────────────────
function DocumentPublicView({ note }: { note: any }) {
  let blocks: any[] = [];
  if (typeof note.content === "string") {
    try { blocks = JSON.parse(note.content); } catch { /* ignore */ }
  } else if (Array.isArray(note.content)) {
    blocks = note.content;
  }

  return (
    <div className="public-note-page">
      <header className="public-note-header">
        <Link to="/" className="public-note-logo-link">
          <span className="public-note-logo-text">TideNote</span>
        </Link>
        <Link to="/login" className="public-note-open-btn">
          Uygulamada Aç
        </Link>
      </header>
      <main className="public-note-document">
        <h1 className="public-note-title">{note.title || "Başlıksız Not"}</h1>
        <div className="public-note-content">
          {blocks.length > 0 ? (
            <MantineProvider>
              <BlockNoteReader content={blocks} />
            </MantineProvider>
          ) : (
            <p className="public-note-empty">Bu not henüz içerik içermiyor.</p>
          )}
        </div>
      </main>
      <footer className="public-note-footer">
        <span>TideNote ile oluşturuldu</span>
        <Link to="/">tidenote.app</Link>
      </footer>
    </div>
  );
}

// ── Canvas public view ────────────────────────────────────────
function CanvasPublicView({ note }: { note: any }) {
  let elements: any[] = [];
  let appState: any = {};
  let files: any = {};

  try { elements = note.elements ? JSON.parse(note.elements) : []; } catch { /* ignore */ }
  try { appState = note.appState ? JSON.parse(note.appState) : {}; } catch { /* ignore */ }
  try { files = note.files ? JSON.parse(note.files) : {}; } catch { /* ignore */ }

  return (
    <div className="public-note-canvas-page">
      <header className="public-note-header">
        <Link to="/" className="public-note-logo-link">
          <span className="public-note-logo-text">TideNote</span>
        </Link>
        <span className="public-note-canvas-title">{note.title || "Başlıksız Canvas"}</span>
        <Link to="/login" className="public-note-open-btn">
          Uygulamada Aç
        </Link>
      </header>
      <div className="public-note-canvas-wrapper">
        <Excalidraw
          initialData={{
            elements,
            appState: { ...appState, viewBackgroundColor: "#ffffff" },
            files,
          }}
          viewModeEnabled={true}
          zenModeEnabled={false}
        />
      </div>
    </div>
  );
}

// ── Main public page ──────────────────────────────────────────
export default function PublicNotePage() {
  const { noteId } = useParams<{ noteId: string }>();
  const [note, setNote] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "found" | "private" | "notfound" | "error">("loading");

  useEffect(() => {
    if (!noteId) { setStatus("notfound"); return; }

    getDoc(doc(db, "notes", noteId))
      .then((snap) => {
        if (!snap.exists()) {
          setStatus("notfound");
          return;
        }
        const data = { id: snap.id, ...snap.data() } as any;
        if (!data.isPublic) {
          setStatus("private");
          return;
        }
        setNote(data);
        setStatus("found");
      })
      .catch((err) => {
        console.error("Error fetching public note:", err);
        // Permission denied → treat as private
        setStatus(err?.code === "permission-denied" ? "private" : "error");
      });
  }, [noteId]);

  if (status === "loading") {
    return (
      <div className="public-note-loading">
        <LoadingSpinner label="Yükleniyor..." />
      </div>
    );
  }

  if (status !== "found") {
    const icon = status === "private" ? "🔒" : status === "notfound" ? "🔍" : "⚠️";
    const heading = status === "private"
      ? "Bu not herkese açık değil"
      : status === "notfound"
      ? "Not bulunamadı"
      : "Bir hata oluştu";
    const sub = status === "private"
      ? "Bu notun sahibi içeriği herkese açık hale getirmemiş olabilir."
      : status === "notfound"
      ? "Aradığınız not mevcut değil veya silinmiş olabilir."
      : "Not yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.";

    return (
      <div className="public-note-error-page">
        <div className="public-note-error-box">
          <div className="public-note-error-icon">{icon}</div>
          <h2>{heading}</h2>
          <p>{sub}</p>
          <Link to="/" className="public-note-home-btn">TideNote'a Dön</Link>
        </div>
      </div>
    );
  }

  if (note.type === "canvas") {
    return <CanvasPublicView note={note} />;
  }

  return <DocumentPublicView note={note} />;
}
