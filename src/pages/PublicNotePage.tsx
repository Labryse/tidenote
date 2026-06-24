import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import LoadingSpinner from "../components/LoadingSpinner";

// ── Inline content renderer ──────────────────────────────────
function renderInline(content: any[]): React.ReactNode {
  if (!content || !Array.isArray(content)) return null;
  return content.map((c: any, i: number) => {
    if (c.type === "link") {
      return (
        <a key={i} href={c.href} target="_blank" rel="noreferrer">
          {renderInline(c.content)}
        </a>
      );
    }
    let el: React.ReactNode = c.text || "";
    if (c.styles?.bold) el = <strong>{el}</strong>;
    if (c.styles?.italic) el = <em>{el}</em>;
    if (c.styles?.underline) el = <u>{el}</u>;
    if (c.styles?.strike) el = <s>{el}</s>;
    if (c.styles?.code) el = <code className="public-inline-code">{el}</code>;
    return <React.Fragment key={i}>{el}</React.Fragment>;
  });
}

// ── Block renderer ────────────────────────────────────────────
function renderBlocks(blocks: any[]): React.ReactNode {
  if (!blocks || !Array.isArray(blocks)) return null;
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    if (!block) { i++; continue; }

    if (block.type === "bulletListItem") {
      const items: React.ReactNode[] = [];
      while (i < blocks.length && blocks[i]?.type === "bulletListItem") {
        items.push(<li key={i}>{renderInline(blocks[i].content)}</li>);
        i++;
      }
      out.push(<ul key={`ul-${i}`} className="public-list">{items}</ul>);
      continue;
    }

    if (block.type === "numberedListItem") {
      const items: React.ReactNode[] = [];
      while (i < blocks.length && blocks[i]?.type === "numberedListItem") {
        items.push(<li key={i}>{renderInline(blocks[i].content)}</li>);
        i++;
      }
      out.push(<ol key={`ol-${i}`} className="public-list">{items}</ol>);
      continue;
    }

    const inline = renderInline(block.content);

    switch (block.type) {
      case "heading": {
        const lvl = block.props?.level || 1;
        if (lvl === 1) out.push(<h1 key={i} className="public-h1">{inline}</h1>);
        else if (lvl === 2) out.push(<h2 key={i} className="public-h2">{inline}</h2>);
        else out.push(<h3 key={i} className="public-h3">{inline}</h3>);
        break;
      }
      case "checkListItem":
        out.push(
          <div key={i} className="public-check-item">
            <input type="checkbox" checked={block.props?.checked || false} readOnly />
            <span>{inline}</span>
          </div>
        );
        break;
      case "image":
        if (block.props?.url) {
          out.push(
            <figure key={i} className="public-figure">
              <img src={block.props.url} alt={block.props.caption || ""} className="public-img" />
              {block.props.caption && <figcaption>{block.props.caption}</figcaption>}
            </figure>
          );
        }
        break;
      default:
        out.push(<p key={i} className="public-p">{inline}</p>);
    }
    i++;
  }

  return out;
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
          {blocks.length > 0 ? renderBlocks(blocks) : (
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
