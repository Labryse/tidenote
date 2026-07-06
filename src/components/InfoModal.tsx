import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNoteStore } from "../store/useNoteStore";
import { getResolvedName } from "../lib/utils";
import { extractTextFromBlocks } from "../lib/searchUtils";

export default function InfoModal() {
  const { notes, infoModalNoteId, setInfoModalNoteId, user, firestoreUser } = useNoteStore();
  const { t, i18n } = useTranslation();
  
  const [activeNote, setActiveNote] = useState<any>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (infoModalNoteId) {
      const note = notes.find((n) => n.id === infoModalNoteId);
      if (note) {
        setActiveNote(note);
        setShow(true);
        setIsClosing(false);
      }
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShow(false);
        setActiveNote(null);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [infoModalNoteId, notes]);

  const handleClose = () => {
    setInfoModalNoteId(null);
  };

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show]);

  if (!show || !activeNote) return null;

  const tags = activeNote.tags || [];

  const formatInfoDate = (timestamp: any, isUpdate = false) => {
    if (!timestamp) return "-";
    const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
    const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
    
    if (isUpdate) {
      const today = new Date();
      const isToday = date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear();
      if (isToday) {
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const prefix = i18n.language.startsWith("tr") ? "Bugün" : "Today";
        return `${prefix}, ${hours}:${minutes}`;
      }
    }
    
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long"
    });
  };

  const getWordCount = (): number => {
    if (!activeNote) return 0;

    if (activeNote.type === "canvas") {
      if (!activeNote.elements) return 0;
      try {
        const els: any[] = JSON.parse(activeNote.elements);
        const text = els
          .filter(el => el && el.type === "text" && typeof el.text === "string" && !el.isDeleted)
          .map(el => el.text)
          .join(" ");
        const trimmed = text.trim();
        return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
      } catch { return 0; }
    }

    let blocks: any[] = [];
    if (typeof activeNote.content === "string") {
      try { blocks = JSON.parse(activeNote.content); } catch { blocks = []; }
    } else if (Array.isArray(activeNote.content)) {
      blocks = activeNote.content;
    }

    const text = extractTextFromBlocks(blocks);
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  };

  const getCanvasStats = () => {
    if (!activeNote || activeNote.type !== "canvas" || !activeNote.elements) return null;
    try {
      const els: any[] = JSON.parse(activeNote.elements);
      const active = els.filter(el => !el.isDeleted);
      const shapes = active.filter(el => ["rectangle", "ellipse", "diamond", "line", "arrow"].includes(el.type)).length;
      const images = active.filter(el => el.type === "image").length;
      const texts = active.filter(el => el.type === "text").length;
      return { shapes, images, texts };
    } catch { return null; }
  };

  return (
    <div className={`info-modal-overlay ${isClosing ? "closing" : ""}`} onClick={handleClose}>
      <div className="info-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="info-modal-header">
          <h3 className="info-modal-title">
            {t("info.title", "Not Bilgileri")}
          </h3>
          <button type="button" className="info-modal-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>
        
        <div className="info-modal-body">
          <div className="info-modal-row">
            <span className="info-modal-label">{t("info.mode", "Belge Modu")}</span>
            <span className="info-modal-value">
              {activeNote.type === "canvas" ? t("info.canvasModeLabel", "Sonsuz Tuval") : t("info.documentModeLabel", "Belge")}
            </span>
          </div>
          <div className="info-modal-row">
            <span className="info-modal-label">{t("info.creator", "Oluşturan")}</span>
            <span className="info-modal-value">{getResolvedName(user, firestoreUser)}</span>
          </div>
          <div className="info-modal-row">
            <span className="info-modal-label">{t("info.createdAt", "Oluşturulma Tarihi")}</span>
            <span className="info-modal-value">{formatInfoDate(activeNote.createdAt)}</span>
          </div>
          <div className="info-modal-row">
            <span className="info-modal-label">{t("info.updatedAt", "Güncellenme Tarihi")}</span>
            <span className="info-modal-value">{formatInfoDate(activeNote.updatedAt, true)}</span>
          </div>
          <div className="info-modal-row">
            <span className="info-modal-label">{t("info.wordCount", "Kelime Sayısı")}</span>
            <span className="info-modal-value">{getWordCount()}</span>
          </div>
          {activeNote.type === "canvas" && (() => {
            const stats = getCanvasStats();
            if (!stats) return null;
            return (
              <>
                <div className="info-modal-row">
                  <span className="info-modal-label">{t("info.canvasShapes", "Şekil Sayısı")}</span>
                  <span className="info-modal-value">{stats.shapes}</span>
                </div>
                <div className="info-modal-row">
                  <span className="info-modal-label">{t("info.canvasImages", "Görsel Sayısı")}</span>
                  <span className="info-modal-value">{stats.images}</span>
                </div>
                <div className="info-modal-row">
                  <span className="info-modal-label">{t("info.canvasTexts", "Metin Sayısı")}</span>
                  <span className="info-modal-value">{stats.texts}</span>
                </div>
              </>
            );
          })()}
          <div className="info-modal-row">
            <span className="info-modal-label">{t("info.tags", "Etiketler")}</span>
            <div className="info-modal-tags">
              {tags.length > 0 ? (
                tags.map((tagStr: string) => {
                  const parts = tagStr.split(":");
                  const name = parts[0];
                  const colorClass = parts[1] || "teal";
                  return (
                    <span key={tagStr} className={`tag-pill tag-${colorClass}`}>
                      {name}
                    </span>
                  );
                })
              ) : (
                <span className="info-modal-value" style={{ fontStyle: "italic", color: "var(--color-text-muted)", fontWeight: 400 }}>
                  {t("info.noTags", "Etiket yok")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
