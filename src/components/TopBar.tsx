import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNoteStore, type Note, PREMIUM_ENABLED } from "../store/useNoteStore";
import { exportToBlob, exportToSvg } from "@excalidraw/excalidraw";
import { Document as PDFDocument, Page as PDFPage, Text as PDFText, StyleSheet as PDFStyleSheet, pdf, Font } from "@react-pdf/renderer";
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { saveAs } from "file-saver";
import { FileText, Image, ImageOff, Pen, File, Lock, Maximize2, Minimize2, Info, Share2, Link2, Globe, UserPlus } from "lucide-react";

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff' },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff', fontWeight: 700 }
  ]
});

interface TopBarProps {
  note: Note | undefined;
}

const TAG_COLORS = [
  { id: "teal", hex: "#0d9488", label: "Teal" },
  { id: "purple", hex: "#8b5cf6", label: "Purple" },
  { id: "green", hex: "#10b981", label: "Green" },
  { id: "yellow", hex: "#f59e0b", label: "Yellow" },
  { id: "red", hex: "#ef4444", label: "Red" },
  { id: "orange", hex: "#f97316", label: "Orange" }
];

const pdfStyles = PDFStyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    color: "#1A202C",
    fontFamily: "Inter",
    lineHeight: 1.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 10,
    fontFamily: "Inter",
  },
  heading1: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 8,
    color: "#0F172A",
    fontFamily: "Inter",
  },
  heading2: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
    color: "#1E293B",
    fontFamily: "Inter",
  },
  paragraph: {
    marginBottom: 10,
    fontFamily: "Inter",
  },
  bulletItem: {
    marginBottom: 6,
    paddingLeft: 12,
    fontFamily: "Inter",
  },
  numberedItem: {
    marginBottom: 6,
    paddingLeft: 12,
    fontFamily: "Inter",
  },
  watermark: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#A0AEC0",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    fontFamily: "Inter",
  }
});

export default function TopBar({ note }: TopBarProps) {
  const { t } = useTranslation();
  const {
    showToast, userTier, editorInstance, excalidrawAPI,
    isExportDropdownOpen, setIsExportDropdownOpen,
    activeNoteTitle, setActiveNoteTitle, updateNoteTitle,
    isCanvasFullscreen, setIsCanvasFullscreen, setInfoModalNoteId,
    setIsSettingsOpen, setSettingsTab
  } = useNoteStore();

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("teal");

  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"share" | "export">("share");
  const [isCopied, setIsCopied] = useState(false);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const [isPublicToggle, setIsPublicToggle] = useState(false);
  const [isPublicSaving, setIsPublicSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Keyboard shortcut Cmd+E → open panel on export tab
  useEffect(() => {
    if (isExportDropdownOpen) {
      setIsSharePanelOpen(true);
      setActiveTab("export");
      setIsExportDropdownOpen(false);
    }
  }, [isExportDropdownOpen, setIsExportDropdownOpen]);

  // Click outside closes panel
  useEffect(() => {
    if (!isSharePanelOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (sharePanelRef.current && !sharePanelRef.current.contains(e.target as Node)) {
        setIsSharePanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSharePanelOpen]);

  useEffect(() => {
    if (note) setActiveNoteTitle(note.title || "");
  }, [note?.id, note?.title, note, setActiveNoteTitle]);

  useEffect(() => {
    setIsPublicToggle(note?.isPublic ?? false);
  }, [note?.id, note?.isPublic]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsCanvasFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [setIsCanvasFullscreen]);

  if (!note) return null;

  const isPremium = PREMIUM_ENABLED ? (userTier === "premium") : true;
  const tags = note.tags || [];
  const shareUrl = `${window.location.origin}/#/note/${note.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleTogglePublic = async () => {
    const newValue = !isPublicToggle;
    setIsPublicToggle(newValue);
    setIsPublicSaving(true);
    try {
      const noteRef = doc(db, "notes", note!.id);
      await updateDoc(noteRef, { isPublic: newValue });
    } catch {
      setIsPublicToggle(!newValue);
      showToast(t("toast.saveError"), "error");
    } finally {
      setIsPublicSaving(false);
    }
  };

  const handleInviteSend = () => {
    showToast("Bu özellik yakında aktif olacak", "warning");
    setInviteEmail("");
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    if (!editorInstance) {
      showToast(t("toast.error", "Editör hazır değil"), "error");
      return;
    }
    try {
      const markdownContent = editorInstance.blocksToMarkdownLossy(editorInstance.document);
      const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
      downloadFile(blob, `${note.title || t("sidebar.untitledNote")}.md`);
      setIsSharePanelOpen(false);
      showToast(t("toast.exportSuccess", "Markdown başarıyla indirildi"), "success");
    } catch (err) {
      console.error("Error exporting Markdown:", err);
      showToast(t("toast.saveError", "Markdown dışa aktarılamadı"), "error");
    }
  };

  const handleExportPNG = async (transparent: boolean) => {
    if (!excalidrawAPI) {
      showToast(t("toast.error", "Tuval hazır değil"), "error");
      return;
    }
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportBackground: !transparent, exportWithDarkMode: false },
        files,
        mimeType: "image/png",
      });
      const filename = `${note.title || t("sidebar.untitledCanvas")}${transparent ? "-transparent" : ""}.png`;
      downloadFile(blob, filename);
      setIsSharePanelOpen(false);
      showToast(t("toast.exportSuccess", "PNG başarıyla indirildi"), "success");
    } catch (err) {
      console.error("Error exporting PNG:", err);
      showToast(t("toast.saveError", "PNG dışa aktarılamadı"), "error");
    }
  };

  const handleExportJPG = async () => {
    if (!excalidrawAPI) {
      showToast(t("toast.error", "Tuval hazır değil"), "error");
      return;
    }
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportBackground: true, exportWithDarkMode: false },
        files,
        mimeType: "image/jpeg",
        quality: 0.92,
      });
      downloadFile(blob, `${note.title || t("sidebar.untitledCanvas")}.jpg`);
      setIsSharePanelOpen(false);
      showToast(t("toast.exportSuccess", "JPG başarıyla indirildi"), "success");
    } catch (err) {
      console.error("Error exporting JPG:", err);
      showToast(t("toast.saveError", "JPG dışa aktarılamadı"), "error");
    }
  };

  const handleExportSVG = async () => {
    if (!excalidrawAPI) {
      showToast(t("toast.error", "Tuval hazır değil"), "error");
      return;
    }
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      const svgElement = await exportToSvg({
        elements,
        appState: { ...appState, exportBackground: true, exportWithDarkMode: false },
        files,
      });
      const serializer = new XMLSerializer();
      const blob = new Blob([serializer.serializeToString(svgElement)], { type: "image/svg+xml;charset=utf-8" });
      downloadFile(blob, `${note.title || t("sidebar.untitledCanvas")}.svg`);
      setIsSharePanelOpen(false);
      showToast(t("toast.exportSuccess", "SVG başarıyla indirildi"), "success");
    } catch (err) {
      console.error("Error exporting SVG:", err);
      showToast(t("toast.saveError", "SVG dışa aktarılamadı"), "error");
    }
  };

  const handleExportPDF = async (isFull: boolean) => {
    try {
      setIsSharePanelOpen(false);
      showToast(t("toast.pdfPreparing", "PDF hazırlanıyor..."), "success");

      let blocks: any[] = [];
      if (typeof note.content === "string") {
        try { blocks = JSON.parse(note.content); } catch { /* ignore */ }
      } else if (Array.isArray(note.content)) {
        blocks = note.content;
      }
      if (!blocks || blocks.length === 0) blocks = [{ type: "paragraph", content: [] }];

      const blocksToExport = isFull ? blocks : blocks.slice(0, 15);

      const getBlockText = (content: any): string => {
        if (!content) return "";
        if (typeof content === "string") return content;
        if (Array.isArray(content)) return content.map((c: any) => c.text || "").join("");
        return "";
      };

      let currentListIndex = 0;
      const elementsToRender = blocksToExport.map((block: any) => {
        if (!block) return null;
        const textContent = getBlockText(block.content);
        if (block.type === "numberedListItem") {
          currentListIndex++;
          return { type: "numberedListItem", text: textContent, number: currentListIndex };
        } else {
          currentListIndex = 0;
          return { type: block.type, text: textContent, level: block.props?.level };
        }
      });

      const PDFDoc = (
        <PDFDocument>
          <PDFPage size="A4" style={pdfStyles.page}>
            <PDFText style={pdfStyles.title}>{note.title}</PDFText>
            {elementsToRender.map((el: any, idx: number) => {
              if (!el) return null;
              if (el.type === "heading") {
                return <PDFText key={idx} style={el.level === 3 ? pdfStyles.heading2 : pdfStyles.heading1}>{el.text}</PDFText>;
              } else if (el.type === "bulletListItem") {
                return <PDFText key={idx} style={pdfStyles.bulletItem}>• {el.text}</PDFText>;
              } else if (el.type === "numberedListItem") {
                return <PDFText key={idx} style={pdfStyles.numberedItem}>{el.number}. {el.text}</PDFText>;
              } else {
                return <PDFText key={idx} style={pdfStyles.paragraph}>{el.text}</PDFText>;
              }
            })}
            {!isPremium && (
              <PDFText style={pdfStyles.watermark}>TideNote ile oluşturuldu — tidenote.app</PDFText>
            )}
          </PDFPage>
        </PDFDocument>
      );

      const blob = await pdf(PDFDoc).toBlob();
      downloadFile(blob, `${note.title || t("sidebar.untitledNote")}.pdf`);
      showToast(t("toast.pdfSuccess", "PDF başarıyla indirildi"), "success");
    } catch (err) {
      console.error("Error generating PDF:", err);
      showToast(t("toast.pdfError", "PDF oluşturulurken hata oluştu"), "error");
    }
  };

  const handleExportWord = async () => {
    try {
      setIsSharePanelOpen(false);
      showToast(t("toast.docxPreparing", "Word belgesi hazırlanıyor..."), "success");

      let blocks: any[] = [];
      if (typeof note.content === "string") {
        try { blocks = JSON.parse(note.content); } catch { /* ignore */ }
      } else if (Array.isArray(note.content)) {
        blocks = note.content;
      }
      if (!blocks || blocks.length === 0) blocks = [{ type: "paragraph", content: [] }];

      const getBlockText = (content: any): string => {
        if (!content) return "";
        if (typeof content === "string") return content;
        if (Array.isArray(content)) return content.map((c: any) => c.text || "").join("");
        return "";
      };

      const docxChildren: any[] = [
        new Paragraph({ text: note.title, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } })
      ];

      blocks.forEach((block: any) => {
        if (!block) return;
        const textContent = getBlockText(block.content);
        if (block.type === "heading") {
          const level = block.props?.level === 2 ? HeadingLevel.HEADING_2
            : block.props?.level === 3 ? HeadingLevel.HEADING_3
            : HeadingLevel.HEADING_2;
          docxChildren.push(new Paragraph({ text: textContent, heading: level, spacing: { before: 240, after: 120 } }));
        } else {
          docxChildren.push(new Paragraph({
            children: [new TextRun({ text: textContent, size: 24 })],
            bullet: block.type === "bulletListItem" ? { level: 0 } : undefined,
            spacing: { after: 120 }
          }));
        }
      });

      const docFile = new DocxDocument({ sections: [{ properties: {}, children: docxChildren }] });
      const blob = await Packer.toBlob(docFile);
      saveAs(blob, `${note.title || t("sidebar.untitledNote")}.docx`);
      showToast(t("toast.docxSuccess", "Word belgesi başarıyla indirildi"), "success");
    } catch (err) {
      console.error("Error generating DOCX:", err);
      showToast(t("toast.docxError", "Word belgesi oluşturulurken hata oluştu"), "error");
    }
  };

  const handlePremiumClick = (formatName: string, actionCallback: () => void) => {
    if (isPremium) {
      actionCallback();
    } else {
      setIsSharePanelOpen(false);
      showToast(`${t("toast.premiumOnly", "Bu özellik Premium'a özel")} (${formatName})`, "error");
      setSettingsTab("billing");
      setIsSettingsOpen(true);
    }
  };

  const handleAddTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    const lowerName = trimmed.toLowerCase();
    const exists = tags.some((tStr) => tStr.split(":")[0].toLowerCase() === lowerName);
    if (exists) {
      showToast(t("toast.saveError") || "Tag already exists");
      return;
    }
    const tagValue = `${trimmed}:${selectedColor}`;
    try {
      const noteRef = doc(db, "notes", note.id);
      await updateDoc(noteRef, { tags: [...tags, tagValue] });
      setNewTagName("");
      setIsAddingTag(false);
    } catch (err: any) {
      console.error("Error adding tag:", err);
      showToast(t("toast.saveError") || "Could not add tag");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const noteRef = doc(db, "notes", note.id);
      await updateDoc(noteRef, { tags: tags.filter((tStr) => tStr !== tagToRemove) });
    } catch (err: any) {
      console.error("Error removing tag:", err);
      showToast(t("toast.saveError") || "Could not remove tag");
    }
  };

  return (
    <header className="top-bar">
      <input
        type="text"
        className="top-bar-title-input"
        value={activeNoteTitle}
        onChange={(e) => updateNoteTitle(note.id, e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        placeholder={note.type === "canvas" ? t("sidebar.untitledCanvas") : t("sidebar.untitledNote")}
      />

      <span className="top-bar-separator" />

      <button
        type="button"
        className="top-bar-info-btn"
        onClick={() => setInfoModalNoteId(note.id)}
        title={t("info.title", "Not Bilgileri")}
      >
        <Info size={14} />
      </button>

      <div className="top-bar-tags-container">
        <div className="top-bar-tags-list">
          {tags.map((tagStr) => {
            const parts = tagStr.split(":");
            const name = parts[0];
            const colorClass = parts[1] || "teal";
            return (
              <span key={tagStr} className={`tag-pill tag-${colorClass}`}>
                {name}
                <button className="tag-remove-btn" onClick={() => handleRemoveTag(tagStr)} aria-label={`Remove tag ${name}`}>
                  &times;
                </button>
              </span>
            );
          })}

          {isAddingTag ? (
            <form className="top-bar-tag-form" onSubmit={handleAddTag}>
              <input
                type="text"
                className="top-bar-tag-input"
                placeholder={t("sidebar.tagPlaceholder")}
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Escape") setIsAddingTag(false); }}
              />
              <div className="tag-color-picker">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`tag-color-dot ${selectedColor === c.id ? "active" : ""}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setSelectedColor(c.id)}
                    title={c.label}
                  />
                ))}
              </div>
              <div className="tag-form-actions">
                <button type="submit" className="tag-form-btn submit">✓</button>
                <button type="button" className="tag-form-btn cancel" onClick={() => setIsAddingTag(false)}>&times;</button>
              </div>
            </form>
          ) : (
            <button
              className="top-bar-add-tag-btn"
              onClick={() => { setIsAddingTag(true); setSelectedColor("teal"); }}
            >
              {t("sidebar.addTag")}
            </button>
          )}
        </div>
      </div>

      {note.type === "canvas" && (
        <button
          type="button"
          className="top-bar-fullscreen-btn"
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch((err) => console.error(err));
            } else {
              document.documentElement.requestFullscreen().catch((err) => console.error(err));
            }
          }}
          title={isCanvasFullscreen ? t("canvas.exitFullscreen", "Tam Ekrandan Çık") : t("canvas.enterFullscreen", "Tam Ekran")}
        >
          {isCanvasFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      )}

      {/* Share & Export Panel */}
      <div className="top-bar-share-container" ref={sharePanelRef}>
        <button
          type="button"
          className="top-bar-share-btn"
          onClick={() => {
            if (!isSharePanelOpen) setActiveTab("share");
            setIsSharePanelOpen(!isSharePanelOpen);
          }}
        >
          <Share2 size={14} style={{ flexShrink: 0 }} />
          {t("topbar.share_button", "Paylaş")}
        </button>

        {isSharePanelOpen && (
          <div className="share-panel">
            {/* Header */}
            <div className="share-panel-header">
              <span className="share-panel-title">Paylaş</span>
              <button type="button" className="share-panel-close" onClick={() => setIsSharePanelOpen(false)}>
                ×
              </button>
            </div>

            <div className="share-panel-divider" />

            {/* Tabs */}
            <div className="share-panel-tabs">
              <button
                type="button"
                className={`share-panel-tab ${activeTab === "share" ? "active" : ""}`}
                onClick={() => setActiveTab("share")}
              >
                Paylaş
              </button>
              <button
                type="button"
                className={`share-panel-tab ${activeTab === "export" ? "active" : ""}`}
                onClick={() => setActiveTab("export")}
              >
                Dışa Aktar
              </button>
            </div>

            <div className="share-panel-body">
              {activeTab === "share" ? (
                <>
                  {/* Copy link */}
                  <div className="share-link-row">
                    <Link2 size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                    <span className="share-link-url">{shareUrl}</span>
                    <button
                      type="button"
                      className={`share-copy-btn ${isCopied ? "copied" : ""}`}
                      onClick={handleCopyLink}
                    >
                      {isCopied ? "Kopyalandı ✓" : "Kopyala"}
                    </button>
                  </div>

                  <div className="share-section-divider" />

                  {/* General access toggle */}
                  <p className="share-section-label">GENEL ERİŞİM</p>
                  <div className="share-access-row">
                    <Globe size={14} style={{ color: isPublicToggle ? "var(--color-accent)" : "var(--color-text-muted)", flexShrink: 0 }} />
                    <span className="share-access-text">Bağlantıya sahip herkes görüntüleyebilir</span>
                    <button
                      type="button"
                      className={`share-toggle ${isPublicToggle ? "active" : ""}`}
                      onClick={handleTogglePublic}
                      disabled={isPublicSaving}
                      title={isPublicToggle ? "Herkese açık — kapat" : "Herkese açık yap"}
                    >
                      <span className="share-toggle-thumb" />
                    </button>
                  </div>
                  {isPublicToggle && (
                    <p className="share-public-hint">
                      Bu bağlantıya sahip herkes notu görüntüleyebilir.
                    </p>
                  )}

                  <div className="share-section-divider" />

                  {/* Invite members */}
                  <div className="share-invite-header-row">
                    <UserPlus size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                    <span className="share-invite-text">Üyeleri Davet Et</span>
                  </div>
                  <div className="share-invite-input-row">
                    <input
                      type="email"
                      className="share-invite-email-input"
                      placeholder="E-posta adresi gir..."
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleInviteSend(); }}
                    />
                    <button
                      type="button"
                      className="share-invite-send-btn"
                      onClick={handleInviteSend}
                    >
                      Davet Gönder
                    </button>
                  </div>
                </>
              ) : (
                /* Export tab */
                note.type === "canvas" ? (
                  <>
                    <div className="share-export-row">
                      <span className="share-export-label">
                        <Image size={14} />
                        PNG İndir (beyaz arka plan)
                      </span>
                      <button type="button" className="share-export-action-btn" onClick={() => handleExportPNG(false)}>
                        İndir
                      </button>
                    </div>
                    <div className="share-export-row">
                      <span className="share-export-label">
                        <Image size={14} />
                        JPG İndir
                      </span>
                      <button type="button" className="share-export-action-btn" onClick={handleExportJPG}>
                        İndir
                      </button>
                    </div>
                    <div className={`share-export-row ${!isPremium ? "premium-locked" : ""}`}>
                      <span className="share-export-label">
                        <ImageOff size={14} />
                        Şeffaf PNG
                        {!isPremium && <Lock size={11} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />}
                      </span>
                      <button
                        type="button"
                        className="share-export-action-btn"
                        onClick={() => handlePremiumClick("Şeffaf PNG", () => handleExportPNG(true))}
                      >
                        İndir
                      </button>
                    </div>
                    <div className={`share-export-row ${!isPremium ? "premium-locked" : ""}`}>
                      <span className="share-export-label">
                        <Pen size={14} />
                        SVG İndir
                        {!isPremium && <Lock size={11} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />}
                      </span>
                      <button
                        type="button"
                        className="share-export-action-btn"
                        onClick={() => handlePremiumClick("SVG", handleExportSVG)}
                      >
                        İndir
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="share-export-row">
                      <span className="share-export-label">
                        <FileText size={14} />
                        Markdown (.md)
                      </span>
                      <button type="button" className="share-export-action-btn" onClick={handleExportMarkdown}>
                        İndir
                      </button>
                    </div>
                    <div className="share-export-row">
                      <span className="share-export-label">
                        <FileText size={14} />
                        PDF (ilk 3 sayfa)
                      </span>
                      <button type="button" className="share-export-action-btn" onClick={() => handleExportPDF(false)}>
                        İndir
                      </button>
                    </div>
                    <div className={`share-export-row ${!isPremium ? "premium-locked" : ""}`}>
                      <span className="share-export-label">
                        <FileText size={14} />
                        PDF (tam)
                        {!isPremium && <Lock size={11} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />}
                      </span>
                      <button
                        type="button"
                        className="share-export-action-btn"
                        onClick={() => handlePremiumClick("PDF (Tam)", () => handleExportPDF(true))}
                      >
                        İndir
                      </button>
                    </div>
                    <div className={`share-export-row ${!isPremium ? "premium-locked" : ""}`}>
                      <span className="share-export-label">
                        <File size={14} />
                        Word (.docx)
                        {!isPremium && <Lock size={11} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />}
                      </span>
                      <button
                        type="button"
                        className="share-export-action-btn"
                        onClick={() => handlePremiumClick("Word", handleExportWord)}
                      >
                        İndir
                      </button>
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </div>

    </header>
  );
}
