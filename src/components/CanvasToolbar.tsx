import { useState, useRef, useEffect } from "react";
import { FONT_FAMILY } from "@excalidraw/excalidraw";
import {
  MousePointer2,
  Hand,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Image as ImageIcon,
  Frame,
  Eraser,
  GripVertical,
  ChevronDown,
  Link as LinkIcon,
  Paperclip,
  Code,
  Quote,
  List,
  ListOrdered,
  CheckSquare
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface CanvasToolbarProps {
  excalidrawAPI: any;
  activeTool: string;
  customBlockType: string | null;
  setCustomBlockType: (type: string | null) => void;
}

// Excalidraw built-in fonts available in 0.18.x
const CANVAS_FONTS = [
  { id: FONT_FAMILY.Helvetica as number, label: "Helvetica" },
  { id: FONT_FAMILY["Liberation Sans"] as number, label: "Liberation Sans" },
  { id: FONT_FAMILY.Nunito as number, label: "Nunito" },
  { id: FONT_FAMILY.Excalifont as number, label: "Excalifont" },
  { id: FONT_FAMILY["Lilita One"] as number, label: "Lilita One" },
  { id: FONT_FAMILY["Comic Shanns"] as number, label: "Comic Shanns" },
  { id: FONT_FAMILY.Cascadia as number, label: "Cascadia Code" },
];

const DEFAULT_FONT = FONT_FAMILY.Helvetica as number;

export default function CanvasToolbar({
  excalidrawAPI,
  activeTool,
  customBlockType,
  setCustomBlockType
}: CanvasToolbarProps) {
  const { t } = useTranslation();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fontPickerRef = useRef<HTMLDivElement>(null);
  const miniBarRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [snapZone, setSnapZone] = useState<"top" | "bottom" | "left" | "right">(() => {
    const saved = localStorage.getItem("tidenote-toolbar-snap");
    if (saved === "top" || saved === "bottom" || saved === "left" || saved === "right") {
      return saved;
    }
    return "top";
  });
  const [selectedFont, setSelectedFont] = useState<number>(DEFAULT_FONT);
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const [isMiniBarOpen, setIsMiniBarOpen] = useState(false);

  // Close font picker on outside click
  useEffect(() => {
    if (!isFontPickerOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) {
        setIsFontPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isFontPickerOpen]);

  // Close mini bar on outside click
  useEffect(() => {
    if (!isMiniBarOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (miniBarRef.current && !miniBarRef.current.contains(e.target as Node)) {
        setIsMiniBarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isMiniBarOpen]);

  const getNearestSnap = (mouseX: number, mouseY: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const distances = {
      left: Math.abs(mouseX - 160),
      right: Math.abs(w - mouseX),
      top: Math.abs(mouseY),
      bottom: Math.abs(h - mouseY)
    };
    return Object.entries(distances)
      .sort((a, b) => a[1] - b[1])[0][0] as "top" | "bottom" | "left" | "right";
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof Element && e.target.closest(".toolbar-tool-btn")) return;
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const rect = toolbar.getBoundingClientRect();
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragPos({ x: rect.left, y: rect.top });
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target instanceof Element && e.target.closest(".toolbar-tool-btn")) return;
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const rect = toolbar.getBoundingClientRect();
    setIsDragging(true);
    dragOffset.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
    setDragPos({ x: rect.left, y: rect.top });
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      setDragPos({ x: clientX - dragOffset.current.x, y: clientY - dragOffset.current.y });
      setSnapZone(getNearestSnap(clientX, clientY));
    };

    const handleMouseUp = (clientX: number, clientY: number) => {
      if (isDragging) {
        const nearest = getNearestSnap(clientX, clientY);
        setSnapZone(nearest);
        setIsDragging(false);
        setDragPos(null);
        localStorage.setItem("tidenote-toolbar-snap", nearest);
      }
    };

    let lastX = 0;
    let lastY = 0;

    const onMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      handleMouseMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        handleMouseMove(lastX, lastY);
      }
    };

    const onMouseUp = (e: MouseEvent) => handleMouseUp(e.clientX, e.clientY);
    const onTouchEnd = () => handleMouseUp(lastX, lastY);

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging]);

  const getCanvasCenter = () => {
    if (!excalidrawAPI) return { cx: 0, cy: 0 };
    const appState = excalidrawAPI.getAppState();
    const zoom = appState.zoom?.value ?? 1;
    const scrollX = appState.scrollX ?? 0;
    const scrollY = appState.scrollY ?? 0;
    return {
      cx: (-scrollX + window.innerWidth / 2) / zoom,
      cy: (-scrollY + window.innerHeight / 2) / zoom
    };
  };

  const handleSelectFont = (fontId: number) => {
    setSelectedFont(fontId);
    setIsFontPickerOpen(false);
    if (excalidrawAPI) {
      try {
        excalidrawAPI.updateScene({ appState: { currentItemFontFamily: fontId } });
      } catch (_) {}
    }
  };

  const tools = [
    { type: "selection", icon: MousePointer2, label: t("canvas.tool.select", "Seç"), key: "V" },
    { type: "hand", icon: Hand, label: t("canvas.tool.hand", "Kaydır"), key: "H" },
    null,
    { type: "rectangle", icon: Square, label: t("canvas.tool.rectangle", "Dikdörtgen"), key: "R" },
    { type: "diamond", icon: Diamond, label: t("canvas.tool.diamond", "Elmas"), key: "D" },
    { type: "ellipse", icon: Circle, label: t("canvas.tool.ellipse", "Elips"), key: "O" },
    { type: "arrow", icon: ArrowRight, label: t("canvas.tool.arrow", "Ok"), key: "A" },
    { type: "line", icon: Minus, label: t("canvas.tool.line", "Çizgi"), key: "L" },
    null,
    { type: "freedraw", icon: Pencil, label: t("canvas.tool.freedraw", "Kalem"), key: "P" },
    { type: "image", icon: ImageIcon, label: t("canvas.tool.image", "Görsel"), key: "9" },
    { type: "frame", icon: Frame, label: t("canvas.tool.frame", "Çerçeve"), key: "F" },
    null,
    { type: "eraser", icon: Eraser, label: t("canvas.tool.eraser", "Silgi"), key: "E" }
  ];

  const handleToolSelect = (toolType: string) => {
    if (excalidrawAPI) excalidrawAPI.setActiveTool({ type: toolType });
  };

  const isVertical = snapZone === "left" || snapZone === "right";

  const fontDropdownClass =
    snapZone === "bottom" ? "above" :
    snapZone === "right" ? "to-left" :
    snapZone === "left" ? "to-right" : "below";

  const SNAP_POSITIONS: Record<"top" | "bottom" | "left" | "right", React.CSSProperties> = {
    top: { position: "fixed", top: "12px", left: "50%", transform: "translateX(-50%)", flexDirection: "row" },
    bottom: { position: "fixed", bottom: "56px", left: "50%", transform: "translateX(-50%)", flexDirection: "row" },
    left: { position: "fixed", left: "248px", top: "50%", transform: "translateY(-50%)", flexDirection: "column" },
    right: { position: "fixed", right: "12px", top: "50%", transform: "translateY(-50%)", flexDirection: "column" }
  };

  const dragStyle: React.CSSProperties = {
    position: "fixed",
    left: dragPos?.x ?? 0,
    top: dragPos?.y ?? 0,
    transform: "none",
    flexDirection: isVertical ? "column" : "row",
    zIndex: 50,
    cursor: "grabbing",
    userSelect: "none" as const,
    transition: "none",
    opacity: 0.85,
    display: "flex",
    alignItems: "center"
  };

  const snapStyle: React.CSSProperties = {
    ...SNAP_POSITIONS[snapZone],
    zIndex: 50,
    cursor: "grab",
    userSelect: "none" as const,
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    opacity: 1,
    display: "flex",
    alignItems: "center"
  };

  const activeStyle = isDragging && dragPos ? dragStyle : snapStyle;

  return (
    <div
      className={`canvas-toolbar ${isVertical ? "vertical" : "horizontal"} ${isDragging ? "dragging" : ""}`}
      ref={toolbarRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={activeStyle}
    >
      {/* Drag handle */}
      <div className="toolbar-drag-handle">
        <GripVertical size={16} />
      </div>

      {/* Separator */}
      <div className="toolbar-separator" />

      {/* Main tools */}
      <div className={`toolbar-tools-list ${isVertical ? "vertical" : "horizontal"}`}>
        {tools.map((tool, idx) => {
          if (tool === null) {
            return <div key={`sep-${idx}`} className="toolbar-separator" />;
          }
          const IconComponent = tool.icon;
          const isActive = activeTool === tool.type;
          return (
            <button
              key={tool.type}
              type="button"
              className={`toolbar-btn toolbar-tool-btn tool-btn ${isActive ? "active" : ""}`}
              onClick={() => handleToolSelect(tool.type)}
              title={`${tool.label} (${tool.key})`}
            >
              <IconComponent size={18} />
            </button>
          );
        })}

        {/* T / Text button — opens content block mini bar */}
        <div className="toolbar-separator" />
        <div
          ref={miniBarRef}
          className="toolbar-minibar-wrap"
          style={{ position: "relative" }}
        >
          <button
            type="button"
            className={`toolbar-btn toolbar-tool-btn tool-btn ${isMiniBarOpen || customBlockType ? "active" : ""}`}
            onClick={() => setIsMiniBarOpen(!isMiniBarOpen)}
            title={t("canvas.tool.text", "Metin / İçerik (T)")}
          >
            <Type size={18} />
          </button>
          {isMiniBarOpen && (
            <div className={`toolbar-minibar-dropdown ${fontDropdownClass}`}>
              <div className="toolbar-minibar-dropdown-title">
                {t("canvas.contentBlock.label", "Metin & İçerik")}
              </div>
              <div className="toolbar-minibar-options-grid">
                <button
                  type="button"
                  className="toolbar-minibar-option"
                  onClick={() => {
                    setIsMiniBarOpen(false);
                    setCustomBlockType("text");
                  }}
                  title={t("canvas.block.text", "Metin Kutusu")}
                >
                  <Type size={16} />
                  <span>{t("canvas.block.text", "Metin")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option font-bold-badge"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("h1"); }}
                  title="H1"
                >
                  <span className="bold-label">H1</span>
                  <span>{t("canvas.block.h1", "Başlık 1")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option font-bold-badge"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("h2"); }}
                  title="H2"
                >
                  <span className="bold-label">H2</span>
                  <span>{t("canvas.block.h2", "Başlık 2")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option font-bold-badge"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("h3"); }}
                  title="H3"
                >
                  <span className="bold-label">H3</span>
                  <span>{t("canvas.block.h3", "Başlık 3")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("code"); }}
                  title={t("canvas.block.code", "Kod Bloğu")}
                >
                  <Code size={16} />
                  <span>{t("canvas.block.code", "Kod")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("quote"); }}
                  title={t("canvas.block.quote", "Alıntı")}
                >
                  <Quote size={16} />
                  <span>{t("canvas.block.quote", "Alıntı")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("bullet"); }}
                  title={t("canvas.block.bullet", "Bullet Liste")}
                >
                  <List size={16} />
                  <span>{t("canvas.block.bullet", "Bullet")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("numbered"); }}
                  title={t("canvas.block.numbered", "Numaralı Liste")}
                >
                  <ListOrdered size={16} />
                  <span>{t("canvas.block.numbered", "Numaralı")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("todo"); }}
                  title={t("canvas.block.todo", "Yapılacaklar")}
                >
                  <CheckSquare size={16} />
                  <span>{t("canvas.block.todo", "Yapılacak")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("link"); }}
                  title={t("canvas.block.link", "Link")}
                >
                  <LinkIcon size={16} />
                  <span>{t("canvas.block.link", "Link")}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-minibar-option"
                  onClick={() => { setIsMiniBarOpen(false); setCustomBlockType("file"); }}
                  title={t("canvas.block.file", "Dosya")}
                >
                  <Paperclip size={16} />
                  <span>{t("canvas.block.file", "Dosya")}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Font picker */}
        <div className="toolbar-separator" />
        <div
          ref={fontPickerRef}
          className="toolbar-font-picker-wrap toolbar-tool-btn"
          style={{ position: "relative" }}
        >
          <button
            type="button"
            className="toolbar-btn toolbar-tool-btn tool-btn toolbar-font-btn"
            onClick={() => setIsFontPickerOpen(!isFontPickerOpen)}
            title={t("canvas.font.pick", "Font Seç")}
          >
            <span style={{ fontSize: 11, lineHeight: 1 }}>Aa</span>
            <ChevronDown size={8} style={{ marginLeft: 2 }} />
          </button>
          {isFontPickerOpen && (
            <div className={`toolbar-font-dropdown ${fontDropdownClass}`}>
              <div className="toolbar-font-dropdown-title">
                {t("canvas.font.label", "Canvas Fontu")}
              </div>
              {CANVAS_FONTS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  className={`toolbar-font-option ${selectedFont === f.id ? "active" : ""}`}
                  onClick={() => handleSelectFont(f.id)}
                >
                  {f.label}
                </button>
              ))}
              <div className="toolbar-font-note">
                {t("canvas.font.note", "Yeni elementlere uygulanır")}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
