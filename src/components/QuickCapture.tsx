import React, { useState, useEffect, useRef } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { getLogoSrc } from "../lib/utils";

const logoSrc = getLogoSrc();

export default function QuickCapture() {
  const { t } = useTranslation();
  const { 
    isQuickCaptureOpen, 
    setIsQuickCaptureOpen, 
    setActiveNoteId, 
    showToast 
  } = useNoteStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [noteType, setNoteType] = useState<"document" | "canvas">("document");
  const [isSaving, setIsSaving] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset and focus when modal is opened
  useEffect(() => {
    if (isQuickCaptureOpen) {
      setTitle("");
      setDescription("");
      setNoteType("document");
      setIsSaving(false);
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isQuickCaptureOpen]);

  // Handle clicking outside overlay
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsQuickCaptureOpen(false);
      }
    }
    if (isQuickCaptureOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isQuickCaptureOpen, setIsQuickCaptureOpen]);

  // Handle Esc key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsQuickCaptureOpen(false);
      }
    }
    if (isQuickCaptureOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isQuickCaptureOpen, setIsQuickCaptureOpen]);

  if (!isQuickCaptureOpen) return null;

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSaving) return;

    setIsSaving(true);
    const user = useNoteStore.getState().user;
    if (!user) {
      showToast(t("auth.unknownError"), "error");
      setIsSaving(false);
      return;
    }

    try {
      let contentVal: any = null;

      if (noteType === "document") {
        const trimmedDesc = description.trim();
        if (trimmedDesc) {
          contentVal = [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: trimmedDesc,
                  styles: {}
                }
              ]
            }
          ];
        }
      }

      const newNote = {
        title: trimmedTitle,
        type: noteType,
        content: contentVal,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pinned: false
      };

      const docRef = await addDoc(collection(db, "notes"), newNote);
      setIsQuickCaptureOpen(false);
      setActiveNoteId(docRef.id);
      showToast(t("toast.createSuccess", "Not oluşturuldu ✓"), "success");
    } catch (error: any) {
      console.error("Quick capture save error:", error);
      showToast(error.message || t("toast.createError"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <>
      <div className="quick-capture-overlay" />
      <div className="quick-capture-modal" ref={modalRef} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="quick-capture-header">
          <div className="quick-capture-header-left">
            <img src={logoSrc} className="quick-capture-logo" alt="Logo" />
            <span className="quick-capture-header-title">{t("quickCapture.title", "Hızlı Not")}</span>
          </div>
          <div className="quick-capture-header-right">
            <span className="quick-capture-esc-badge">Esc</span>
            <button 
              type="button" 
              className="quick-capture-close-btn"
              onClick={() => setIsQuickCaptureOpen(false)}
              aria-label="Kapat"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Title Input */}
        <div className="quick-capture-title-section">
          <input
            ref={titleInputRef}
            type="text"
            placeholder={t("quickCapture.placeholder", "Başlık...")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-sans)"
            }}
          />
        </div>

        {/* Description Textarea */}
        <div className="quick-capture-body-section">
          <textarea
            placeholder={t("quickCapture.bodyPlaceholder", "Ne düşünüyorsun? (opsiyonel)")}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleDescriptionKeyDown}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "14px",
              resize: "none",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.6
            }}
          />
        </div>

        {/* Bottom Bar */}
        <div className="quick-capture-footer">
          <div className="quick-capture-type-selector">
            <button
              type="button"
              className={`quick-capture-type-btn ${noteType === "document" ? "active" : ""}`}
              onClick={() => setNoteType("document")}
            >
              📄 {t("quickCapture.document", "Belge")}
            </button>
            <button
              type="button"
              className={`quick-capture-type-btn ${noteType === "canvas" ? "active" : ""}`}
              onClick={() => setNoteType("canvas")}
            >
              🎨 {t("quickCapture.canvas", "Canvas")}
            </button>
          </div>

          <button
            type="button"
            className="quick-capture-save-btn"
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
          >
            {t("quickCapture.save", "Kaydet")} ↵
          </button>
        </div>
      </div>
    </>
  );
}
