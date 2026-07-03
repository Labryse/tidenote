import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNoteStore, type Note, PREMIUM_ENABLED } from "../store/useNoteStore";
import { exportToBlob, exportToSvg } from "@excalidraw/excalidraw";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import interRegularUrl from "../assets/fonts/Inter-Regular.ttf";
import interBoldUrl from "../assets/fonts/Inter-Bold.ttf";
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { saveAs } from "file-saver";
import { FileText, Image, ImageOff, Pen, File, Lock, Maximize2, Minimize2, Info, Share2, Link2, Globe, UserPlus } from "lucide-react";
import { getNoteRoute } from "../lib/platform";

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
  const shareUrl = `${window.location.origin}${getNoteRoute(note.id)}`;

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

  const handleExportPDF = async () => {
    try {
      setIsSharePanelOpen(false);
      showToast(t("toast.pdfPreparing", "PDF hazırlanıyor..."), "success");

      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      const regularBytes = await fetch(interRegularUrl).then((res) => res.arrayBuffer());
      const boldBytes = await fetch(interBoldUrl).then((res) => res.arrayBuffer());

      const regularFont = await pdfDoc.embedFont(regularBytes);
      const boldFont = await pdfDoc.embedFont(boldBytes);

      let page = pdfDoc.addPage([595.28, 841.89]);
      let currentY = 841.89 - 50; // 791.89

      const checkPageBreak = (neededHeight: number) => {
        if (currentY - neededHeight < 50) {
          page = pdfDoc.addPage([595.28, 841.89]);
          currentY = 841.89 - 50;
        }
      };

      const wordWrap = (text: string, font: any, size: number, maxWidth: number): string[] => {
        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, size);
          if (testWidth > maxWidth) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };

      const wrapText = (text: string, font: any, size: number, maxWidth: number): string[] => {
        const segments = text.split("\n");
        const result: string[] = [];
        for (const segment of segments) {
          result.push(...wordWrap(segment, font, size, maxWidth));
        }
        return result;
      };

      // Draw title
      const titleText = note ? (note.title || t("sidebar.untitledNote")) : t("sidebar.untitledNote");
      const titleWrapped = wrapText(titleText, boldFont, 24, 515.28);
      
      for (const line of titleWrapped) {
        checkPageBreak(30);
        page.drawText(line, {
          x: 40,
          y: currentY - 24,
          size: 24,
          font: boldFont,
          color: rgb(15 / 255, 23 / 255, 42 / 255), // slate-900
        });
        currentY -= 30;
      }

      // Title divider line
      checkPageBreak(15);
      page.drawLine({
        start: { x: 40, y: currentY - 5 },
        end: { x: 595.28 - 40, y: currentY - 5 },
        thickness: 1,
        color: rgb(226 / 255, 232 / 255, 240 / 255), // slate-200
      });
      currentY -= 20;

      // Extract editor blocks
      let blocks: any[] = [];
      if (note) {
        if (typeof note.content === "string") {
          try { blocks = JSON.parse(note.content); } catch { /* ignore */ }
        } else if (Array.isArray(note.content)) {
          blocks = note.content;
        }
      }
      if (!blocks || blocks.length === 0) blocks = [{ type: "paragraph", content: [] }];

      const getBlockText = (content: any): string => {
        if (!content) return "";
        if (typeof content === "string") return content;
        if (Array.isArray(content)) return content.map((c: any) => c.text || "").join("");
        return "";
      };

      let currentListIndex = 0;

      for (const block of blocks) {
        if (!block) continue;
        const textContent = getBlockText(block.content);
        
        let prefix = "";
        let font = regularFont;
        let size = 11;
        let color = rgb(26 / 255, 32 / 255, 44 / 255); // charcoal #1A202C
        let spacingBefore = 8;
        let spacingLine = 16;
        let listIndent = 0;

        if (block.type === "heading") {
          font = boldFont;
          color = rgb(15 / 255, 23 / 255, 42 / 255);
          const level = block.props?.level || 1;
          if (level === 3) {
            size = 12;
            spacingBefore = 12;
            spacingLine = 18;
          } else if (level === 2) {
            size = 14;
            spacingBefore = 14;
            spacingLine = 20;
          } else {
            size = 18;
            spacingBefore = 16;
            spacingLine = 24;
          }
          currentListIndex = 0;
        } else if (block.type === "bulletListItem") {
          prefix = "• ";
          listIndent = 12;
          currentListIndex = 0;
          spacingBefore = 4;
          spacingLine = 16;
        } else if (block.type === "numberedListItem") {
          currentListIndex++;
          prefix = `${currentListIndex}. `;
          listIndent = 12;
          spacingBefore = 4;
          spacingLine = 16;
        } else {
          currentListIndex = 0;
          spacingBefore = 6;
          spacingLine = 16;
        }

        const lines = wrapText(textContent, font, size, 515.28 - listIndent);

        currentY -= spacingBefore;

        for (let i = 0; i < lines.length; i++) {
          checkPageBreak(spacingLine);
          
          let lineText = lines[i];
          let drawX = 40;

          if (i === 0 && prefix) {
            // Draw prefix (e.g. bullet or list number)
            page.drawText(prefix, {
              x: 40,
              y: currentY - size,
              size: size,
              font: font,
              color: color,
            });
            drawX += listIndent;
          } else if (prefix) {
            drawX += listIndent;
          }

          page.drawText(lineText, {
            x: drawX,
            y: currentY - size,
            size: size,
            font: font,
            color: color,
          });

          currentY -= spacingLine;
        }
      }

      // Draw watermark on all pages
      const pages = pdfDoc.getPages();
      const watermarkWidth = regularFont.widthOfTextAtSize("TideNote", 11);
      pages.forEach((p) => {
        p.drawText("TideNote", {
          x: 595.28 - 40 - watermarkWidth,
          y: 25,
          size: 11,
          font: regularFont,
          color: rgb(140 / 255, 190 / 255, 185 / 255),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      downloadFile(blob, `${(note && note.title) || t("sidebar.untitledNote")}.pdf`);
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
                    <div className={`share-export-row ${!isPremium ? "premium-locked" : ""}`}>
                      <span className="share-export-label">
                        <FileText size={14} />
                        PDF (.pdf)
                        {!isPremium && <Lock size={11} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />}
                      </span>
                      <button
                        type="button"
                        className="share-export-action-btn"
                        onClick={() => handlePremiumClick("PDF", handleExportPDF)}
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
