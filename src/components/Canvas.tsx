import { useState, useEffect, useRef, useCallback } from "react";
import { Excalidraw, MainMenu, FONT_FAMILY } from "@excalidraw/excalidraw";
import LoadingSpinner from "./LoadingSpinner";
import "@excalidraw/excalidraw/index.css";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  type CanvasFileRef,
  isCanvasFileRef,
  compressImageDataURL,
  dataURLByteSize,
  saveCanvasFile,
  deleteCanvasFile,
  loadCanvasFiles,
  MAX_ORIGINAL_BYTES,
} from "../lib/canvasFiles";
import { useNoteStore } from "../store/useNoteStore";
import { useTranslation } from "react-i18next";
import CanvasToolbar from "./CanvasToolbar";
import Minimap from "./Minimap";
import {
  Sparkles,
  Palette,
  ArrowUpDown,
  Lock,
  Unlock,
  MoreHorizontal,
  Copy,
  Trash,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import {
  resolveFontVariant,
  fontSupports,
  sanitizeTextElementFont,
  measureCanvasText,
} from "../lib/canvasFonts";
import { installExcalidrawDomPatches } from "../lib/excalidrawDomPatches";
import { installCanvasEmoticons } from "../lib/canvasEmoticons";

export default function Canvas() {
  const { t, i18n } = useTranslation();
  const { activeNoteId, notes, theme, setExcalidrawAPI: storeSetExcalidrawAPI } = useNoteStore();
  
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const prevEditingRef = useRef<any>(null);

  const [activeTool, setActiveToolState] = useState<string>("selection");
  const activeToolRef = useRef<string>("selection");
  const setActiveTool = useCallback((tool: string) => {
    setActiveToolState(tool);
    activeToolRef.current = tool;
  }, []);

  const themeRef = useRef(theme);
  const activeNoteIdRef = useRef(activeNoteId);
  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);
  const [initialData, setInitialData] = useState<any>(null);
  const isInitializedRef = useRef(false);

  const [selectedContainer, setSelectedContainer] = useState<{ rect: any; text: any } | null>(null);
  const [floatingPos, setFloatingPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedIdsStr, setSelectedIdsStr] = useState<string>("");
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const lastSelectedIdsStrRef = useRef<string>("");
  const latestElementsRef = useRef<readonly any[]>([]);
  const latestAppStateRef = useRef<any>(null);
  const latestFilesRef = useRef<any>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isThreeDotsOpen, setIsThreeDotsOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [fontDropdownFixedPos, setFontDropdownFixedPos] = useState<{left: number; bottom: number} | null>(null);
  const [hasLockedElements, setHasLockedElements] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const fontBtnRef = useRef<HTMLButtonElement>(null);
  const hasLockedElementsRef = useRef(false);
  const lastEditingTextElementIdRef = useRef<string | null>(null);
  const [quickConnect, setQuickConnect] = useState<{
    selectedId: string;
    type: string;
    top: { x: number; y: number };
    bottom: { x: number; y: number };
    left: { x: number; y: number };
    right: { x: number; y: number };
  } | null>(null);
  const lastScrollZoomRef = useRef<{ scrollX: number; scrollY: number; zoom: number }>({
    scrollX: 0,
    scrollY: 0,
    zoom: 1
  });
  const isEditingRef = useRef(false);
  const [isScrollingOrZooming, setIsScrollingOrZooming] = useState(false);
  const scrollZoomTimeoutRef = useRef<any>(null);
  const [positionVersion, setPositionVersion] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [customBlockType, setCustomBlockTypeState] = useState<string | null>(null);
  const customBlockTypeRef = useRef<string | null>(null);

  const setCustomBlockType = (type: string | null) => {
    setCustomBlockTypeState(type);
    customBlockTypeRef.current = type;
  };

  const prevElementsCountRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; canvasX: number; canvasY: number } | null>(null);
  const [previewRect, setPreviewRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);



  // Esc key cancels block placement mode & T/t key sets black stroke and font color for text tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && customBlockTypeRef.current) {
        setCustomBlockType(null);
        setPreviewRect(null);
        isDraggingRef.current = false;
        dragStartRef.current = null;
      }
      if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeElement = document.activeElement;
        const isInput = activeElement && (
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.hasAttribute("contenteditable") ||
          activeElement.classList.contains("excalidraw-texteditor")
        );
        if (!isInput && excalidrawAPI) {
          excalidrawAPI.updateScene({
            appState: {
              currentItemStrokeColor: "#1e293b",
              currentItemFontColor: "#1e293b"
            }
          });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [excalidrawAPI]);

  // Bold (Ctrl/Cmd+B) and italic (Ctrl/Cmd+I) shortcuts for the selected canvas text.
  // Excalidraw has no native bold/italic shortcut, so these do nothing by default;
  // here we mirror CanvasToolbar's updateTextCustomData (toggle customData + re-measure)
  // and resolve the target text element from the current selection/editing state.
  // Registered in the capture phase so we intercept the combo before it falls through.
  useEffect(() => {
    if (!excalidrawAPI) return;

    const handleStyleShortcut = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      // Ignore Alt so we never clash with Excalidraw's Ctrl+Alt+C (copy styles) etc.
      if (!isModifierPressed || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== "b" && key !== "i") return;

      // Don't hijack the combo while the user types in a non-Excalidraw input.
      const active = document.activeElement as HTMLElement | null;
      const inExcalidrawEditor = !!active && active.classList.contains("excalidraw-texteditor");
      const inOtherInput =
        !!active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable) &&
        !inExcalidrawEditor;
      if (inOtherInput) return;

      const appState = excalidrawAPI.getAppState();
      const elements = excalidrawAPI.getSceneElements() || [];

      // Resolve the active text element: editing, directly selected, or bound to a selected container
      let textEl: any = null;
      const editing = appState.editingElement;
      if (editing && editing.type === "text") {
        textEl = elements.find((el: any) => el.id === editing.id) || editing;
      } else {
        const selIds = Object.keys(appState.selectedElementIds || {}).filter(
          (id) => appState.selectedElementIds[id]
        );
        const selEls = elements.filter((el: any) => selIds.includes(el.id) && !el.isDeleted);
        textEl = selEls.find((el: any) => el.type === "text") || null;
        if (!textEl) {
          const container = selEls.find(
            (el: any) =>
              Array.isArray(el.boundElements) &&
              el.boundElements.some((b: any) => b && b.type === "text")
          );
          if (container) {
            const boundId = container.boundElements.find((b: any) => b.type === "text").id;
            textEl = elements.find((el: any) => el.id === boundId) || null;
          }
        }
      }
      if (!textEl) return;

      // Skip fonts that don't support the requested style (e.g. Bebas Neue).
      const caps = fontSupports(textEl.fontFamily);
      if ((key === "b" && !caps.bold) || (key === "i" && !caps.italic)) return;

      // We're handling it — keep the browser/Excalidraw from also acting on the combo.
      e.preventDefault();
      e.stopPropagation();

      const prop = key === "b" ? "fontWeight" : "fontStyle";
      const onValue = key === "b" ? "bold" : "italic";
      const nextValue = textEl.customData?.[prop] === onValue ? "normal" : onValue;

      const updated = elements.map((el: any) => {
        if (el.id !== textEl.id) return el;

        const nextCustomData = { ...(el.customData || {}), [prop]: nextValue };

        // Bold/italic = swap to the real variant font family; fontSize stays a
        // plain number (Excalidraw's move/resize math requires it).
        const targetFamilyId = resolveFontVariant(el.fontFamily, nextCustomData.fontWeight, nextCustomData.fontStyle);
        const rawSize = typeof el.fontSize === "object" ? Number(el.fontSize.size) || 16 : el.fontSize;

        const { width, height } = measureCanvasText(el.text, rawSize, targetFamilyId);
        const dx = (width - el.width) / 2;
        const dy = (height - el.height) / 2;

        return {
          ...el,
          customData: nextCustomData,
          fontFamily: targetFamilyId,
          fontSize: rawSize,
          width,
          height,
          x: el.x - dx,
          y: el.y - dy,
          updated: Date.now(),
          version: el.version + 1,
          versionNonce: Math.floor(Math.random() * 999999)
        };
      });
      excalidrawAPI.updateScene({ elements: updated });
    };

    window.addEventListener("keydown", handleStyleShortcut, true);
    return () => window.removeEventListener("keydown", handleStyleShortcut, true);
  }, [excalidrawAPI]);

  const handlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!customBlockTypeRef.current || customBlockTypeRef.current === "schema" || !excalidrawAPI) return;

    e.stopPropagation();
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const appState = excalidrawAPI.getAppState();
    const z = appState.zoom?.value ?? 1;
    const scrollX = appState.scrollX ?? 0;
    const scrollY = appState.scrollY ?? 0;

    const canvasX = (e.clientX - rect.left - scrollX * z) / z;
    const canvasY = (e.clientY - rect.top - scrollY * z) / z;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      canvasX,
      canvasY
    };

    setPreviewRect({
      x: clickX,
      y: clickY,
      w: 0,
      h: 0
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;

    e.stopPropagation();
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const currentClientX = e.clientX;
    const currentClientY = e.clientY;

    const startX = dragStartRef.current.clientX - rect.left;
    const startY = dragStartRef.current.clientY - rect.top;
    const currentX = currentClientX - rect.left;
    const currentY = currentClientY - rect.top;

    setPreviewRect({
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      w: Math.abs(currentX - startX),
      h: Math.abs(currentY - startY)
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !dragStartRef.current || !excalidrawAPI) return;

    e.stopPropagation();
    e.preventDefault();

    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const appState = excalidrawAPI.getAppState();
    const z = appState.zoom?.value ?? 1;
    const scrollX = appState.scrollX ?? 0;
    const scrollY = appState.scrollY ?? 0;

    const startCanvasX = dragStartRef.current.canvasX;
    const startCanvasY = dragStartRef.current.canvasY;

    const currentCanvasX = (e.clientX - rect.left - scrollX * z) / z;
    const currentCanvasY = (e.clientY - rect.top - scrollY * z) / z;

    const x = Math.min(startCanvasX, currentCanvasX);
    const y = Math.min(startCanvasY, currentCanvasY);
    const w = Math.abs(currentCanvasX - startCanvasX);
    const h = Math.abs(currentCanvasY - startCanvasY);

    const type = customBlockTypeRef.current;

    setCustomBlockType(null);
    setPreviewRect(null);
    dragStartRef.current = null;

    if (type) {
      createElementAt(type, x, y, w, h);
    }
  };

  const createElementAt = async (
    type: string,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    if (!excalidrawAPI) return;
    
    const existing = excalidrawAPI.getSceneElements() || [];
    const elementsToAppend: any[] = [];
    const idSuffix = `${Date.now()}`;
    const rectId = `rect-${idSuffix}`;
    const textId = `text-${idSuffix}`;
    const groupId = `group-${type}-${idSuffix}`;

    const finalW = w < 10 ? 300 : w;
    const finalH = h < 10 ? 100 : h;

    if (type === "file") {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.onchange = async (ev: any) => {
        const file = ev.target.files?.[0];
        if (!file) return;

        const fileName = file.name;
        const fileSizeStr = (file.size / 1024).toFixed(1) + " KB";
        const fontSize = 14;
        const text = `📎 ${fileName} (${fileSizeStr})`;

        const fileW = w < 10 ? 250 : w;
        const fileH = h < 10 ? 44 : h;

        const latestElements = excalidrawAPI.getSceneElements() || [];
        const fileElements = [
          {
            id: `file-card-${idSuffix}`,
            type: "rectangle",
            x,
            y,
            width: fileW,
            height: fileH,
            angle: 0,
            strokeColor: "#9ca3af",
            backgroundColor: theme === "dark" ? "rgba(39, 39, 42, 0.9)" : "rgba(244, 244, 245, 0.9)",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "dashed",
            roughness: 0,
            opacity: 100,
            groupIds: [groupId],
            frameId: null,
            roundness: { type: 3, value: 6 },
            seed: Math.floor(Math.random() * 999999),
            version: 1,
            versionNonce: Math.floor(Math.random() * 999999),
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false
          },
          {
            id: `file-text-${idSuffix}`,
            type: "text",
            x: x + 10,
            y: y + (fileH - fontSize * 1.25) / 2,
            width: fileW - 20,
            height: fontSize * 1.25,
            angle: 0,
            strokeColor: theme === "dark" ? "#f4f4f5" : "#18181b",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            groupIds: [groupId],
            frameId: null,
            roundness: null,
            seed: Math.floor(Math.random() * 999999),
            version: 1,
            versionNonce: Math.floor(Math.random() * 999999),
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
            text,
            fontSize,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            containerId: null,
            originalText: text,
            lineHeight: 1.25,
            autoResize: true
          }
        ];

        excalidrawAPI.updateScene({
          elements: [...latestElements, ...fileElements]
        });

        excalidrawAPI.updateScene({
          appState: {
            selectedElementIds: {
              [`file-card-${idSuffix}`]: true,
              [`file-text-${idSuffix}`]: true
            }
          }
        });
      };
      fileInput.click();
      return;
    }

    const defaultBg = theme === "dark" ? "#2A2A2A" : "#F0F0F0";
    const defaultStroke = theme === "dark" ? "#71717a" : "#d4d4d8";

    let text = "";
    let fontSize = 16;
    let fontFamily = FONT_FAMILY.Helvetica as number;
    let textAlign: "left" | "center" | "right" = "center";
    let strokeColor = theme === "dark" ? "#f4f4f5" : "#18181b";
    let customLink: string | null = null;



    if (type === "text") {
      const isTr = i18n.language.startsWith("tr");
      const placeholderText = isTr ? "Yazmaya Başla..." : "Type '/' for commands...";

      const containerRect = {
        id: rectId,
        type: "rectangle",
        x,
        y,
        width: finalW,
        height: finalH,
        angle: 0,
        strokeColor: "#CCCCCC",
        backgroundColor: theme === "dark" ? "#2A2A2A" : "#F5F5F5",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: { type: 3, value: 8 },
        seed: Math.floor(Math.random() * 999999),
        version: 1,
        versionNonce: Math.floor(Math.random() * 999999),
        isDeleted: false,
        boundElements: [{ id: textId, type: "text" }],
        updated: Date.now(),
        link: null,
        locked: false,
        customType: "text",
        customData: {
          initialWidth: finalW,
          initialHeight: finalH,
          initialFontSize: 16
        }
      };

      const boundText = {
        id: textId,
        type: "text",
        x: x + 16,
        y: y + 16,
        width: finalW - 32,
        height: finalH - 32,
        angle: 0,
        strokeColor: "#1a1a1a",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 999999),
        version: 1,
        versionNonce: Math.floor(Math.random() * 999999),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: "",
        fontSize: 16,
        fontFamily: FONT_FAMILY.Helvetica as number,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: rectId,
        originalText: "",
        lineHeight: 1.3,
        autoResize: true,
        customData: {
          initialWidth: finalW,
          initialHeight: finalH,
          initialFontSize: 16
        }
      };

      elementsToAppend.push(containerRect, boundText);
    } else if (type === "postit") {
      const isTr = i18n.language.startsWith("tr");
      const placeholderText = isTr ? "Not yaz..." : "Write a note...";

      const singleTextEl = {
        id: textId,
        type: "text",
        x,
        y,
        width: finalW || 150,
        height: finalH || 150,
        angle: 0,
        strokeColor: "#854d0e",
        backgroundColor: "#fef08a",
        fillStyle: "solid",
        strokeWidth: 0,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 999999),
        version: 1,
        versionNonce: Math.floor(Math.random() * 999999),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: placeholderText,
        fontSize: 16,
        fontFamily: FONT_FAMILY.Helvetica as number,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: null,
        originalText: placeholderText,
        lineHeight: 1.3,
        padding: 20
      };

      elementsToAppend.push(singleTextEl);
    } else {
      // Set type properties
      if (type === "h1") {
        fontSize = 36;
        text = i18n.language.startsWith("tr") ? "Başlık 1" : "Heading 1";
      } else if (type === "h2") {
        fontSize = 28;
        text = i18n.language.startsWith("tr") ? "Başlık 2" : "Heading 2";
      } else if (type === "h3") {
        fontSize = 22;
        text = i18n.language.startsWith("tr") ? "Başlık 3" : "Heading 3";
      } else if (type === "h4") {
        fontSize = 18;
        text = i18n.language.startsWith("tr") ? "Başlık 4" : "Heading 4";
      } else if (type === "h5") {
        fontSize = 16;
        text = i18n.language.startsWith("tr") ? "Başlık 5" : "Heading 5";
      } else if (type === "h6") {
        fontSize = 14;
        text = i18n.language.startsWith("tr") ? "Başlık 6" : "Heading 6";
      } else if (type === "code") {
        fontFamily = 3;
        text = `// Code block\nfunction init() {\n  console.log("Hello World");\n}`;
        strokeColor = "#0f766e";
      } else if (type === "quote") {
        text = i18n.language.startsWith("tr") ? "Alıntı metni..." : "Quote text...";
        strokeColor = theme === "dark" ? "#a1a1aa" : "#4b5563";
      } else if (type === "bullet") {
        text = `• ${i18n.language.startsWith("tr") ? "Liste elemanı" : "List item"}`;
      } else if (type === "numbered") {
        text = `1. ${i18n.language.startsWith("tr") ? "Liste elemanı" : "List item"}`;
      } else if (type === "todo") {
        text = i18n.language.startsWith("tr") ? "Yapılacak iş..." : "To-do task...";
      } else if (type === "link") {
        const url = window.prompt(i18n.language.startsWith("tr") ? "Link URL'sini girin:" : "Enter Link URL:", "https://");
        if (!url) return;
        let label = window.prompt(i18n.language.startsWith("tr") ? "Metin girin (isteğe bağlı):" : "Enter Text (optional):", "Link");
        if (!label) label = url;
        text = `${label}\n${url}`;
        strokeColor = "#2563eb";
        customLink = url;
      }

      const containerRect = {
        id: rectId,
        type: "rectangle",
        x,
        y,
        width: finalW,
        height: finalH,
        angle: 0,
        strokeColor: defaultStroke,
        backgroundColor: defaultBg,
        fillStyle: "solid",
        strokeWidth: 1.5,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: { type: 3, value: 10 },
        seed: Math.floor(Math.random() * 999999),
        version: 1,
        versionNonce: Math.floor(Math.random() * 999999),
        isDeleted: false,
        boundElements: [{ id: textId, type: "text" }],
        updated: Date.now(),
        link: customLink,
        locked: false,
        customType: type,
        customData: {
          initialWidth: finalW,
          initialHeight: finalH,
          initialFontSize: fontSize
        }
      };

      const boundText = {
        id: textId,
        type: "text",
        x: x + 16,
        y: y + 16,
        width: finalW - 32,
        height: finalH - 32,
        angle: 0,
        strokeColor,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 999999),
        version: 1,
        versionNonce: Math.floor(Math.random() * 999999),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: customLink,
        locked: false,
        text,
        fontSize,
        fontFamily,
        textAlign,
        verticalAlign: "middle",
        containerId: rectId,
        originalText: text,
        lineHeight: 1.3,
        autoResize: true,
        customData: {
          initialWidth: finalW,
          initialHeight: finalH,
          initialFontSize: fontSize
        }
      };

      elementsToAppend.push(containerRect, boundText);

      if (type === "quote") {
        elementsToAppend.push({
          id: `quote-line-${idSuffix}`,
          type: "line",
          x: x + 12,
          y: y + 12,
          width: 0,
          height: finalH - 24,
          angle: 0,
          strokeColor: "#9ca3af",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: 3.5,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          groupIds: [groupId],
          frameId: null,
          roundness: null,
          seed: Math.floor(Math.random() * 999999),
          version: 1,
          versionNonce: Math.floor(Math.random() * 999999),
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: false,
          points: [[0, 0], [0, finalH - 24]],
          lastCommittedPoint: null,
          startBinding: null,
          endBinding: null,
          startArrowhead: null,
          endArrowhead: null
        });
        boundText.x += 12;
        boundText.width -= 12;
      }

      if (type === "todo") {
        elementsToAppend.push({
          id: `todo-chk-${idSuffix}`,
          type: "rectangle",
          x: x + 16,
          y: y + (finalH - 18) / 2,
          width: 18,
          height: 18,
          angle: 0,
          strokeColor: theme === "dark" ? "#a1a1aa" : "#4b5563",
          backgroundColor: "#ffffff",
          fillStyle: "solid",
          strokeWidth: 1.5,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          groupIds: [groupId],
          frameId: null,
          roundness: { type: 3, value: 4 },
          seed: Math.floor(Math.random() * 999999),
          version: 1,
          versionNonce: Math.floor(Math.random() * 999999),
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: false
        });
        boundText.x += 28;
        boundText.width -= 28;
      }
    }

    excalidrawAPI.updateScene({
      elements: [...existing, ...elementsToAppend]
    });

    excalidrawAPI.updateScene({
      appState: {
        selectedElementIds: {
          [(type === "text" || type === "postit") ? textId : rectId]: true
        }
      }
    });

    if (["text", "postit", "h1", "h2", "h3", "h4", "h5", "h6"].includes(type)) {
      const textElement = type === "postit"
        ? elementsToAppend[0] 
        : elementsToAppend[1]; // boundText for shape groups
        
      setTimeout(() => {
        if (excalidrawAPI) {
          excalidrawAPI.updateScene({
            appState: {
              editingElement: textElement,
              selectedElementIds: { [textElement.id]: true }
            }
          });
        }
      }, 50);
    }
  };

  const updateContainerColor = (bgColor: string, strokeColor: string) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === rect.id) {
        return {
          ...el,
          backgroundColor: bgColor,
          strokeColor: strokeColor,
          fillStyle: bgColor === "transparent" ? "hachure" : "solid",
          updated: Date.now(),
          version: el.version + 1,
          versionNonce: Math.floor(Math.random() * 999999)
        };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer({
      rect: { ...rect, backgroundColor: bgColor, strokeColor: strokeColor, fillStyle: bgColor === "transparent" ? "hachure" : "solid" },
      text
    });
  };

  const handleAutoHeight = () => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    if (!text) return;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === rect.id) {
        return {
          ...el,
          height: text.height + 32,
          updated: Date.now(),
          version: el.version + 1,
          versionNonce: Math.floor(Math.random() * 999999)
        };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
  };

  const handleConnector = () => {
    if (!excalidrawAPI) return;
    excalidrawAPI.setActiveTool({ type: "arrow" });
  };

  const handleToggleLock = () => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const isLocked = !rect.locked;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === rect.id || (text && el.id === text.id)) {
        return {
          ...el,
          locked: isLocked,
          updated: Date.now(),
          version: el.version + 1,
          versionNonce: Math.floor(Math.random() * 999999)
        };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
  };

  const handleDeleteContainer = () => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === rect.id || (text && el.id === text.id)) {
        return {
          ...el,
          isDeleted: true,
          updated: Date.now(),
          version: el.version + 1,
          versionNonce: Math.floor(Math.random() * 999999)
        };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer(null);
    setFloatingPos(null);
  };

  const handleDuplicateContainer = () => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const idSuffix = `${Date.now()}`;
    const newRectId = `rect-${idSuffix}`;
    const newGroupId = `group-dup-${idSuffix}`;
    const existing = excalidrawAPI.getSceneElements();
    const newElements: any[] = [];

    if (text) {
      const newTextId = `text-${idSuffix}`;
      newElements.push({
        ...rect,
        id: newRectId,
        x: rect.x + 30,
        y: rect.y + 30,
        boundElements: [{ id: newTextId, type: "text" }],
        groupIds: [newGroupId],
        seed: Math.floor(Math.random() * 999999),
        version: 1,
        versionNonce: Math.floor(Math.random() * 999999),
        updated: Date.now()
      });
      newElements.push({
        ...text,
        id: newTextId,
        x: text.x + 30,
        y: text.y + 30,
        containerId: newRectId,
        groupIds: [newGroupId],
        seed: Math.floor(Math.random() * 999999),
        version: 1,
        versionNonce: Math.floor(Math.random() * 999999),
        updated: Date.now()
      });
    } else {
      newElements.push({
        ...rect,
        id: newRectId,
        x: rect.x + 30,
        y: rect.y + 30,
        boundElements: null,
        groupIds: [newGroupId],
        seed: Math.floor(Math.random() * 999999),
        version: 1,
        versionNonce: Math.floor(Math.random() * 999999),
        updated: Date.now()
      });
    }

    excalidrawAPI.updateScene({ elements: [...existing, ...newElements] });
    excalidrawAPI.updateScene({ appState: { selectedElementIds: { [newRectId]: true } } });
  };

  const handleLayering = (action: "front" | "back") => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const existing = [...excalidrawAPI.getSceneElements()];
    
    const rectIndex = existing.findIndex(e => e.id === rect.id);
    const textIndex = text ? existing.findIndex(e => e.id === text.id) : -1;
    
    const itemsToMove: any[] = [];
    if (rectIndex !== -1) itemsToMove.push(existing[rectIndex]);
    if (textIndex !== -1) itemsToMove.push(existing[textIndex]);

    const remaining = existing.filter(e => e.id !== rect.id && (!text || e.id !== text.id));
    
    let updatedScene = [];
    if (action === "front") {
      updatedScene = [...remaining, ...itemsToMove];
    } else {
      updatedScene = [...itemsToMove, ...remaining];
    }

    excalidrawAPI.updateScene({ elements: updatedScene });
  };

  // Close font dropdown on outside click
  useEffect(() => {
    if (!isFontDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        fontDropdownRef.current && !fontDropdownRef.current.contains(target) &&
        !(fontBtnRef.current && fontBtnRef.current.contains(target))
      ) {
        setIsFontDropdownOpen(false);
        setFontDropdownFixedPos(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isFontDropdownOpen]);

  // ESC closes image preview
  useEffect(() => {
    if (!isImagePreviewOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsImagePreviewOpen(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isImagePreviewOpen]);

  const updateStrokeWidth = (width: number) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === rect.id || (text && el.id === text.id)) {
        return { ...el, strokeWidth: width, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer({
      rect: { ...rect, strokeWidth: width },
      text: text ? { ...text, strokeWidth: width } : null
    });
  };

  const updateFillStyle = (fillStyle: string) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === rect.id) {
        return { ...el, fillStyle, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer({
      rect: { ...rect, fillStyle },
      text
    });
  };

  const updateOpacity = (opacity: number) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === rect.id || (text && el.id === text.id)) {
        return { ...el, opacity, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer({
      rect: { ...rect, opacity },
      text: text ? { ...text, opacity } : null
    });
  };

  const updateFontFamily = (fontFamily: number) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const targetId = text ? text.id : rect.id;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === targetId) {
        return { ...el, fontFamily, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
    try { excalidrawAPI.updateScene({ appState: { currentItemFontFamily: fontFamily } }); } catch (_) {}
    // Optimistically update selectedContainer so the dropdown immediately reflects the chosen font
    setSelectedContainer(text
      ? { rect, text: { ...text, fontFamily } }
      : { rect: { ...rect, fontFamily }, text: null }
    );
  };

  const updateFontSize = (fontSize: number) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const targetId = text ? text.id : rect.id;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === targetId) {
        return { ...el, fontSize, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer(text
      ? { rect, text: { ...text, fontSize } }
      : { rect: { ...rect, fontSize }, text: null }
    );
  };

  const updateTextAlign = (textAlign: string) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const targetId = text ? text.id : rect.id;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === targetId) {
        return { ...el, textAlign, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer(text
      ? { rect, text: { ...text, textAlign } }
      : { rect: { ...rect, textAlign }, text: null }
    );
  };

  const handleUnlockAll = () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) =>
      el.locked
        ? { ...el, locked: false, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
        : el
    );
    excalidrawAPI.updateScene({ elements: updated });
    hasLockedElementsRef.current = false;
    setHasLockedElements(false);
  };

  const updateElementStrokeColor = (color: string) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) =>
      el.id === rect.id
        ? { ...el, strokeColor: color, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
        : el
    );
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer({
      rect: { ...rect, strokeColor: color },
      text
    });
  };

  const updateStrokeStyle = (strokeStyle: string) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) =>
      el.id === rect.id
        ? { ...el, strokeStyle, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
        : el
    );
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer({
      rect: { ...rect, strokeStyle },
      text
    });
  };

  const updateCornerRadius = (rounded: boolean) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect, text } = selectedContainer;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === rect.id) {
        return {
          ...el,
          roundness: rounded ? { type: 3, value: 10 } : null,
          updated: Date.now(),
          version: el.version + 1,
          versionNonce: Math.floor(Math.random() * 999999)
        };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
    setSelectedContainer({
      rect: { ...rect, roundness: rounded ? { type: 3, value: 10 } : null },
      text
    });
  };

  const handleDoubleClick = (e?: any) => {
    if (!excalidrawAPI) return;
    const appState = excalidrawAPI.getAppState();
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(id => appState.selectedElementIds[id]);
    if (selectedIds.length !== 1) return;
    const elements = excalidrawAPI.getSceneElements();
    const el = elements.find((e: any) => e.id === selectedIds[0]);
    if (!el) return;

    if (el.type === "image" && el.fileId) {
      const files = excalidrawAPI.getFiles();
      const file = files[el.fileId];
      if (!file || !file.dataURL) return;
      setImagePreviewUrl(file.dataURL);
      setIsImagePreviewOpen(true);
      return;
    }
  };

  useEffect(() => {
    return () => {
      storeSetExcalidrawAPI(null);
    };
  }, [storeSetExcalidrawAPI]);

  // Intercept and prevent help/support link navigation in Excalidraw menu
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        const href = anchor.getAttribute("href") || "";
        const text = anchor.textContent || "";
        const hrefLower = href.toLowerCase();
        const textLower = text.toLowerCase();
        
        if (
          hrefLower.includes("excalidraw.com") ||
          hrefLower.includes("plus.excalidraw.com")
        ) {
          if (
            textLower.includes("help") ||
            textLower.includes("yardım") ||
            textLower.includes("destek") ||
            textLower.includes("support")
          ) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, []);

  // Patch Excalidraw-internal UI (context menu clamp + Zen mode removal,
  // "Copied styles" toast behavior, missing TR strings in the stats panel).
  useEffect(() => {
    if (!wrapperRef.current) return;
    return installExcalidrawDomPatches(wrapperRef.current, () => i18n.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawAPI]);

  // Emoticon → emoji auto-conversion inside the canvas text editor.
  useEffect(() => {
    if (!wrapperRef.current) return;
    return installCanvasEmoticons(wrapperRef.current);
  }, [excalidrawAPI]);

  const initializedNoteIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>("");
  const lastSavedFilesKeysRef = useRef<string>("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ noteId: string; elements: any[]; appState: any; files: any } | null>(null);
  const isWritingRef = useRef<boolean>(false);
  // fileId -> subcollection ref for images already persisted for the current note.
  const persistedFilesRef = useRef<Record<string, CanvasFileRef>>({});
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard so the "image too large" toast fires once, not on every retry.
  const oversizedFileIdsRef = useRef<Set<string>>(new Set());
  // Files parsed from the note doc that still need resolving/migrating once the
  // Excalidraw API is ready (load persisted docs; migrate legacy inline base64).
  const pendingFileResolveRef = useRef<{ noteId: string; files: any } | null>(null);

  // Direct sync function to save canvas to Firestore
  const saveCanvasToFirestore = async (noteId: string, elements: any[], appState: any, files: any) => {
    if (isWritingRef.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveCanvasToFirestore(noteId, elements, appState, files);
      }, 500);
      return;
    }

    isWritingRef.current = true;
    const store = useNoteStore.getState();
    store.setSaveStatus("saving");
    try {
      const cleanElements = JSON.parse(JSON.stringify(elements));
      const cleanAppState = JSON.parse(JSON.stringify({
        viewBackgroundColor: appState?.viewBackgroundColor || "#ffffff",
      }));

      // Images live in the notes/{id}/files subcollection (compressed, chunked);
      // the note doc keeps only tiny refs so it can never approach the 1 MB limit.
      const usedFileIds = new Set<string>(
        cleanElements
          .filter((e: any) => e.type === "image" && !e.isDeleted && e.fileId)
          .map((e: any) => e.fileId)
      );

      // What the note doc currently holds, so we can PRESERVE an entry we fail to
      // persist this round (legacy inline base64, or a prior ref) instead of
      // overwriting it with nothing — otherwise a failed save (rules not yet
      // deployed, offline) would permanently destroy the only copy of an image.
      let storedFiles: Record<string, any> = {};
      try {
        const storedRaw = useNoteStore.getState().notes.find((n) => n.id === noteId)?.files;
        if (storedRaw) storedFiles = JSON.parse(storedRaw);
      } catch { /* ignore */ }

      const refs: Record<string, any> = {};
      let retryableFileError = false;
      let hardFileError = false;

      for (const fileId of Array.from(usedFileIds)) {
        if (persistedFilesRef.current[fileId]) {
          refs[fileId] = persistedFilesRef.current[fileId];
          continue;
        }
        const entry: any = (files || {})[fileId];
        const dataURL: string | undefined = entry?.dataURL;
        if (!dataURL) {
          // No in-memory data yet — keep whatever the doc already had for it.
          if (storedFiles[fileId]) refs[fileId] = storedFiles[fileId];
          continue;
        }

        if (dataURLByteSize(dataURL) > MAX_ORIGINAL_BYTES) {
          hardFileError = true;
          if (storedFiles[fileId]) refs[fileId] = storedFiles[fileId];
          if (!oversizedFileIdsRef.current.has(fileId)) {
            oversizedFileIdsRef.current.add(fileId);
            store.showToast(t("toast.imageTooLarge"), "error");
          }
          continue;
        }

        try {
          const { dataURL: compressed, mimeType } = await compressImageDataURL(dataURL);
          const ref = await saveCanvasFile(noteId, fileId, compressed, mimeType);
          persistedFilesRef.current[fileId] = ref;
          refs[fileId] = ref;
        } catch (e) {
          // Offline / rules not deployed: keep the drawing saving, retry later,
          // and preserve any existing doc copy so nothing is lost meanwhile.
          console.error("Canvas image persist failed:", e);
          retryableFileError = true;
          if (storedFiles[fileId]) refs[fileId] = storedFiles[fileId];
        }
      }

      // Delete subcollection docs for images that are no longer on the canvas.
      for (const fileId of Object.keys(persistedFilesRef.current)) {
        if (!usedFileIds.has(fileId)) {
          const stale = persistedFilesRef.current[fileId];
          delete persistedFilesRef.current[fileId];
          deleteCanvasFile(noteId, fileId, stale.chunks).catch((e) =>
            console.error("Canvas file delete failed:", e)
          );
        }
      }

      const noteRef = doc(db, "notes", noteId);
      await updateDoc(noteRef, {
        elements: JSON.stringify(cleanElements),
        appState: JSON.stringify(cleanAppState),
        files: JSON.stringify(refs),
        updatedAt: serverTimestamp(),
      });

      if (retryableFileError) {
        store.setSaveStatus("error");
        scheduleSaveRetry(noteId, elements, appState, files);
      } else if (hardFileError) {
        // Permanent (oversized) — surfaced via the indicator, but don't retry.
        store.setSaveStatus("error");
      } else {
        store.setSaveStatus("saved");
      }
    } catch (error: any) {
      console.error("Error saving canvas to Firestore:", error);
      store.setSaveStatus("error");
      if (error.code === 'failed-precondition' || error.message?.includes('INTERNAL ASSERTION')) {
        console.warn('Firestore connection issue, retrying...');
      } else {
        store.showToast(t("toast.saveError"));
      }
      scheduleSaveRetry(noteId, elements, appState, files);
    } finally {
      isWritingRef.current = false;
    }
  };

  // Retry a failed save (image upload offline, or transient Firestore error)
  // without stacking timers.
  const scheduleSaveRetry = (noteId: string, elements: any[], appState: any, files: any) => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      saveCanvasToFirestore(noteId, elements, appState, files);
    }, 3000);
  };

  // Debounced auto-save function
  const debouncedSave = (noteId: string, elements: any[], appState: any, files: any) => {
    pendingSaveRef.current = { noteId, elements, appState, files };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveCanvasToFirestore(noteId, elements, appState, files);
      pendingSaveRef.current = null;
      saveTimeoutRef.current = null;
    }, 2000);
  };

  // Sync loaded note from store
  useEffect(() => {
    // If activeNoteId changed (or is null), reset initialization state
    if (activeNoteId !== initializedNoteIdRef.current) {
      isInitializedRef.current = false;
      setInitialData(null);
    }

    if (!activeNoteId) {
      initializedNoteIdRef.current = null;
      return;
    }

    // If already initialized for this activeNoteId, do not run initialization again
    if (isInitializedRef.current && activeNoteId === initializedNoteIdRef.current) {
      return;
    }

    const note = notes.find((n) => n.id === activeNoteId);
    if (!note) {
      // Wait until the note is loaded in notes store
      return;
    }

    initializedNoteIdRef.current = activeNoteId;
    isInitializedRef.current = true;
    persistedFilesRef.current = {};
    oversizedFileIdsRef.current = new Set();

    let elements: any[] = [];
    let appState: any = {};
    let files: any = {};

    // 1. Try reading from root level fields (new format)
    if (note.elements !== undefined) {
      try {
        elements = note.elements ? JSON.parse(note.elements) : [];
      } catch {
        elements = [];
      }
      try {
        appState = note.appState ? JSON.parse(note.appState) : {};
      } catch {
        appState = {};
      }
      try {
        files = note.files ? JSON.parse(note.files) : {};
      } catch {
        files = {};
      }
    } 
    // 2. Try reading from old nested content format (legacy fallback)
    else if (note.content) {
      try {
        const parsed = typeof note.content === "string"
          ? JSON.parse(note.content)
          : note.content;
        
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.elements === "string") {
            try {
              elements = JSON.parse(parsed.elements);
            } catch {
              elements = [];
            }
          } else {
            elements = parsed.elements || [];
          }

          if (typeof parsed.appState === "string") {
            try {
              appState = JSON.parse(parsed.appState);
            } catch {
              appState = {};
            }
          } else {
            appState = parsed.appState || {};
          }

          if (typeof parsed.files === "string") {
            try {
              files = JSON.parse(parsed.files);
            } catch {
              files = {};
            }
          } else {
            files = parsed.files || {};
          }
        }
      } catch (error) {
        console.error("Error parsing legacy canvas content:", error);
      }
    }

    // Heal legacy font data (old variant ids, wrapped fontSize) on load.
    elements = elements.map((el: any) => sanitizeTextElementFont(el));

    lastSavedRef.current = JSON.stringify(elements);
    const initialFilesWithData = Object.entries(files || {})
      .filter(([_, entry]: [string, any]) => !!entry?.dataURL)
      .map(([id]) => id)
      .sort()
      .join(",");
    lastSavedFilesKeysRef.current = initialFilesWithData;

    // Only entries that already carry an inline dataURL can render at mount.
    // Storage refs (and legacy base64 to migrate) are handled once the API is
    // ready — see the file-resolution effect below.
    const renderFiles: any = {};
    for (const [fileId, entry] of Object.entries<any>(files || {})) {
      if (entry?.dataURL) renderFiles[fileId] = entry;
    }
    pendingFileResolveRef.current = { noteId: activeNoteId, files };

    setInitialData({
      elements,
      appState: {
        ...appState,
        gridModeEnabled: false,
        viewBackgroundColor: "transparent",
        currentItemFontFamily: FONT_FAMILY.Helvetica as number,
        objectsSnapModeEnabled: true,
        currentItemStrokeColor: "#1e293b",
        currentItemFontColor: "#1e293b",
        currentItemStrokeWidth: 0,
        currentItemFillStyle: "solid",
        currentItemBackgroundColor: "#1e293b",
        currentItemRoughness: 0
      },
      files: renderFiles
    });
  }, [activeNoteId, notes]);

  // Load persisted images from the files subcollection, and migrate any legacy
  // inline base64 into it, once the Excalidraw API is ready for the open note.
  useEffect(() => {
    const pending = pendingFileResolveRef.current;
    if (!excalidrawAPI || !pending || pending.noteId !== activeNoteId) return;
    pendingFileResolveRef.current = null;

    let cancelled = false;
    (async () => {
      const noteId = pending.noteId;
      const files = pending.files || {};
      const uid = useNoteStore.getState().user?.uid;

      // Mark refs already recorded in the note doc as persisted.
      for (const [fileId, entry] of Object.entries<any>(files)) {
        if (isCanvasFileRef(entry)) persistedFilesRef.current[fileId] = { mimeType: entry.mimeType, chunks: entry.chunks };
      }

      const toAdd: any[] = [];

      // 1. Load whatever is stored in the subcollection (one query).
      try {
        const stored = await loadCanvasFiles(noteId);
        for (const [fileId, v] of Object.entries(stored)) {
          toAdd.push({ id: fileId, dataURL: v.dataURL, mimeType: v.mimeType, created: Date.now() });
        }
      } catch (e) {
        console.error("Canvas files load failed:", e);
      }

      // 2. Legacy inline base64 still living in the note doc: render + migrate.
      const legacy: { fileId: string; dataURL: string }[] = [];
      for (const [fileId, entry] of Object.entries<any>(files)) {
        if (entry?.dataURL) {
          legacy.push({ fileId, dataURL: entry.dataURL });
          toAdd.push({ id: fileId, dataURL: entry.dataURL, mimeType: entry.mimeType || "image/png", created: Date.now() });
        }
      }

      if (cancelled) return;
      if (toAdd.length) {
        try { excalidrawAPI.addFiles(toAdd); } catch (e) { console.error(e); }
      }

      // Check for broken image references and show a non-blocking toast warning.
      if (!cancelled) {
        const sceneElements = excalidrawAPI.getSceneElements() || [];
        const expectedFileIds = new Set<string>(
          sceneElements
            .filter((el: any) => el.type === "image" && !el.isDeleted && el.fileId)
            .map((el: any) => el.fileId)
        );
        const loadedFileIds = new Set<string>(toAdd.map(f => f.id));
        let hasMissingFiles = false;
        for (const fid of Array.from(expectedFileIds)) {
          if (!loadedFileIds.has(fid)) {
            hasMissingFiles = true;
            console.warn(`Canvas image file missing: ${fid}`);
          }
        }
        if (hasMissingFiles) {
          useNoteStore.getState().showToast(t("toast.imageLoadError"), "error");
        }
      }

      if (uid && legacy.length) {
        try {
          const refs: Record<string, CanvasFileRef> = { ...persistedFilesRef.current };
          for (const f of legacy) {
            if (dataURLByteSize(f.dataURL) > MAX_ORIGINAL_BYTES) continue; // leave untouched
            const { dataURL: compressed, mimeType } = await compressImageDataURL(f.dataURL);
            const ref = await saveCanvasFile(noteId, f.fileId, compressed, mimeType);
            persistedFilesRef.current[f.fileId] = ref;
            refs[f.fileId] = ref;
          }
          if (!cancelled) {
            await updateDoc(doc(db, "notes", noteId), { files: JSON.stringify(refs) });
          }
        } catch (e) {
          console.error("Canvas legacy image migration failed:", e);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [excalidrawAPI, activeNoteId, initialData]);

  // Flush any pending save immediately when switching active notes
  useEffect(() => {
    if (pendingSaveRef.current && pendingSaveRef.current.noteId !== activeNoteId) {
      const { noteId: oldId, elements: oldElements, appState: oldState, files: oldFiles } = pendingSaveRef.current;
      saveCanvasToFirestore(oldId, oldElements, oldState, oldFiles);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      pendingSaveRef.current = null;
    }
  }, [activeNoteId]);

  // Clean up pending saves on unmount
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const { noteId, elements, appState, files } = pendingSaveRef.current;
        saveCanvasToFirestore(noteId, elements, appState, files);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (scrollZoomTimeoutRef.current) {
        clearTimeout(scrollZoomTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Synchronize shape background color style when theme changes
  useEffect(() => {
    if (!excalidrawAPI) return;
    excalidrawAPI.updateScene({
      appState: {
        currentItemBackgroundColor: "#1e293b",
        currentItemStrokeColor: "#1e293b",
        currentItemFontColor: "#1e293b"
      }
    });
  }, [theme, excalidrawAPI]);

  // Restore saved viewport (scroll + zoom) when excalidrawAPI becomes ready
  useEffect(() => {
    if (!excalidrawAPI || !activeNoteId) return;
    const key = `canvas-viewport-${activeNoteId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const { scrollX, scrollY, zoom } = JSON.parse(saved);
        // Use a timeout to let Excalidraw finish initializing before overriding scroll
        setTimeout(() => {
          try {
            excalidrawAPI.updateScene({
              appState: {
                scrollX: scrollX ?? 0,
                scrollY: scrollY ?? 0,
                zoom: { value: zoom ?? 1 }
              }
            });
          } catch {}
        }, 200);
      }
    } catch {}
  }, [excalidrawAPI, activeNoteId]);

  const getElementDOMRect = (element: any, excalidrawAPI: any, containerRef: React.RefObject<HTMLDivElement | null>) => {
    if (!excalidrawAPI || !containerRef.current) return null;
    const appState = excalidrawAPI.getAppState();
    const container = containerRef.current.getBoundingClientRect();
    const z = appState.zoom.value;
    
    const x = container.left + element.x * z + appState.scrollX * z;
    const y = container.top + element.y * z + appState.scrollY * z;
    const w = element.width * z;
    const h = element.height * z;
    
    return { x, y, w, h, centerX: x + w/2, centerY: y + h/2 };
  };

  const updateToolbarPosition = (selectedIds: string[], elements: readonly any[], appState: any) => {
    if (!elements || !appState || !wrapperRef.current || !excalidrawAPI) return;

    if (selectedIds.length >= 1) {
      const activeEls = elements.filter(e => !e.isDeleted);
      const selEls = activeEls.filter(e => selectedIds.includes(e.id));
      if (selEls.length > 0) {
        const unionEl = {
          x: Math.min(...selEls.map(e => e.x ?? 0)),
          y: Math.min(...selEls.map(e => e.y ?? 0)),
          width: Math.max(...selEls.map(e => (e.x ?? 0) + (e.width ?? 0))) - Math.min(...selEls.map(e => e.x ?? 0)),
          height: Math.max(...selEls.map(e => (e.y ?? 0) + (e.height ?? 0))) - Math.min(...selEls.map(e => e.y ?? 0))
        };

        const domRect = getElementDOMRect(unionEl, excalidrawAPI, wrapperRef);
        if (domRect) {
          const toolbarWidth = 240;
          const toolbarHeight = 44;
          const rect = wrapperRef.current.getBoundingClientRect();

          let toolbarLeft = domRect.centerX - toolbarWidth / 2;
          let toolbarTop: number;

          // If element is near top of viewport, show toolbar below
          if (domRect.y < rect.top + 100) {
            toolbarTop = domRect.y + domRect.h + 12;
          } else {
            toolbarTop = domRect.y - toolbarHeight - 12;
          }

          // Clamp to screen bounds
          toolbarLeft = Math.min(Math.max(toolbarLeft, rect.left + 10), rect.left + rect.width - toolbarWidth - 10);
          toolbarTop = Math.min(Math.max(toolbarTop, rect.top + 10), rect.top + rect.height - toolbarHeight - 10);

          // Hide toolbar if Excalidraw is in text editing mode
          if (!appState.editingElement) {
            const nextPos = { left: toolbarLeft, top: toolbarTop };
            setFloatingPos(prev => {
              if (!prev) return nextPos;
              if (prev.left === nextPos.left && prev.top === nextPos.top) return prev;
              return nextPos;
            });
          } else {
            setFloatingPos(prev => prev === null ? prev : null);
          }
        }

        // Determine primary element for the floating bar
        const primaryId = selectedIds[0];
        let primaryEl = selEls.find(e => e.id === primaryId) ?? selEls[0];

        // Prefer the rectangle when text inside a container is selected
        if (primaryEl.type === "text" && primaryEl.containerId) {
          const container = activeEls.find(e => e.id === primaryEl.containerId);
          if (container) primaryEl = container;
        }

        const textChild = primaryEl.boundElements
          ? activeEls.find(e =>
              primaryEl.boundElements.some((be: any) => be && be.type === "text" && be.id === e.id) && !e.isDeleted
            ) ?? null
          : null;

        setSelectedContainer(prev => {
          if (!prev) return { rect: primaryEl, text: textChild };
          if (prev.rect?.id === primaryEl?.id && prev.text?.id === textChild?.id) return prev;
          return { rect: primaryEl, text: textChild };
        });

        // Calculate quick connect arrows positions if exactly 1 element is selected and it is a schema element
        if (selectedIds.length === 1) {
          const selEl = selEls[0];
          if (
            selEl &&
            (selEl.type === "rectangle" || selEl.type === "ellipse" || selEl.type === "diamond") &&
            selEl.customData?.isSchemaElement === true
          ) {
            const domRectEl = getElementDOMRect(selEl, excalidrawAPI, wrapperRef);
            if (domRectEl) {
              const nextQuickConnect = {
                selectedId: selEl.id,
                type: selEl.type,
                top: { x: domRectEl.centerX - 12, y: domRectEl.y - 20 - 24 },
                bottom: { x: domRectEl.centerX - 12, y: domRectEl.y + domRectEl.h + 20 },
                left: { x: domRectEl.x - 20 - 24, y: domRectEl.centerY - 12 },
                right: { x: domRectEl.x + domRectEl.w + 20, y: domRectEl.centerY - 12 }
              };
              setQuickConnect(prev => {
                if (!prev) return nextQuickConnect;
                if (
                  prev.selectedId === nextQuickConnect.selectedId &&
                  prev.top.x === nextQuickConnect.top.x &&
                  prev.top.y === nextQuickConnect.top.y &&
                  prev.bottom.x === nextQuickConnect.bottom.x &&
                  prev.bottom.y === nextQuickConnect.bottom.y &&
                  prev.left.x === nextQuickConnect.left.x &&
                  prev.left.y === nextQuickConnect.left.y &&
                  prev.right.x === nextQuickConnect.right.x &&
                  prev.right.y === nextQuickConnect.right.y
                ) return prev;
                return nextQuickConnect;
              });
            } else {
              setQuickConnect(prev => prev === null ? prev : null);
            }
          } else {
            setQuickConnect(prev => prev === null ? prev : null);
          }
        } else {
          setQuickConnect(prev => prev === null ? prev : null);
        }
      } else {
        setSelectedContainer(prev => prev === null ? prev : null);
        setFloatingPos(prev => prev === null ? prev : null);
        setIsFontDropdownOpen(prev => prev === false ? prev : false);
        setFontDropdownFixedPos(prev => prev === null ? prev : null);
        setQuickConnect(prev => prev === null ? prev : null);
      }
    } else {
      setSelectedContainer(prev => prev === null ? prev : null);
      setFloatingPos(prev => prev === null ? prev : null);
      setIsFontDropdownOpen(prev => prev === false ? prev : false);
      setFontDropdownFixedPos(prev => prev === null ? prev : null);
      setQuickConnect(prev => prev === null ? prev : null);
    }
  };

  const debouncedSaveRef = useRef(debouncedSave);
  useEffect(() => {
    debouncedSaveRef.current = debouncedSave;
  });

  const updateToolbarPositionRef = useRef(updateToolbarPosition);
  useEffect(() => {
    updateToolbarPositionRef.current = updateToolbarPosition;
  });

  const handleCanvasChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    if (!activeNoteIdRef.current || !isInitializedRef.current) return;

    // Keep the latest values in refs to prevent stale closure issues in useEffect
    latestElementsRef.current = elements;
    latestAppStateRef.current = appState;
    latestFilesRef.current = files;

    // Auto-correct bound text colors and apply styled fontSize wrapping for Bold/Italic rendering
    if (excalidrawAPI) {
      let elementsChanged = false;
      const updatedElements = elements.map((el: any) => {
        let nextEl = el;
        
        // 1. Bound text color contrast correction
        if (el.type === "text" && el.containerId && !el.isDeleted) {
          const container = elements.find((c: any) => c.id === el.containerId && !c.isDeleted);
          if (container) {
            // If container has dark background (#1e293b), bound text must be white (#ffffff)
            if (container.backgroundColor === "#1e293b" && el.strokeColor !== "#ffffff") {
              elementsChanged = true;
              nextEl = { ...nextEl, strokeColor: "#ffffff", originalText: el.text, version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) };
            }
            // If container has transparent or light background, and text is white, make it dark slate (#1e293b)
            else if (container.backgroundColor === "transparent" && el.strokeColor === "#ffffff") {
              elementsChanged = true;
              nextEl = { ...nextEl, strokeColor: "#1e293b", originalText: el.text, version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) };
            }
          }
        }
        
        // 2. Keep fontFamily in sync with customData style + heal legacy data:
        //    non-numeric fontSize (old StyledFontSize wrapper) is unwrapped and
        //    old variant ids are remapped. fontSize must stay a plain number —
        //    the wrapper class crashed Excalidraw's move/resize math.
        if (nextEl.type === "text" && !nextEl.isDeleted) {
          const healed = sanitizeTextElementFont(nextEl);
          const targetFamilyId = resolveFontVariant(
            healed.fontFamily,
            healed.customData?.fontWeight,
            healed.customData?.fontStyle
          );

          if (healed !== nextEl || healed.fontFamily !== targetFamilyId) {
            elementsChanged = true;
            nextEl = {
              ...healed,
              fontFamily: targetFamilyId,
              version: nextEl.version + 1,
              versionNonce: Math.floor(Math.random() * 999999)
            };
          }
        }

        // 3. Bound text must never outlive its container. Deleting a text box
        //    could leave its bound text orphaned (invisible to selection, only
        //    reachable by double-click) — cascade the deletion here, which also
        //    heals any orphans already saved in existing notes.
        if (nextEl.type === "text" && nextEl.containerId && !nextEl.isDeleted) {
          const parent = elements.find((c: any) => c.id === nextEl.containerId);
          if (!parent || parent.isDeleted) {
            elementsChanged = true;
            nextEl = {
              ...nextEl,
              isDeleted: true,
              version: nextEl.version + 1,
              versionNonce: Math.floor(Math.random() * 999999)
            };
          }
        }

        return nextEl;
      });

      if (elementsChanged) {
        excalidrawAPI.updateScene({ elements: updatedElements });
        return;
      }
    }

    const currentDragging = !!appState.draggingElement || !!appState.resizingElement;
    setIsDraggingElement(prev => prev === currentDragging ? prev : currentDragging);

    // Detect editingElement changes → immediately hide/restore floating toolbar
    const currentlyEditing = !!appState.editingElement;
    if (currentlyEditing !== isEditingRef.current) {
      isEditingRef.current = currentlyEditing;
      setIsEditingText(prev => prev === currentlyEditing ? prev : currentlyEditing);
      if (currentlyEditing) {
        setFloatingPos(prev => prev === null ? prev : null);
        setQuickConnect(prev => prev === null ? prev : null);
      } else {
        setTimeout(() => setPositionVersion(v => v + 1), 100);
      }
    }

    // DÜZELTME 4: metin ekleme bitince selectedElementIds'e bakarak toolbar'ı tekrar göster
    const wasEditing = prevEditingRef.current !== null;
    const isEditing = appState.editingElement !== null;
    if (wasEditing && !isEditing) {
      setTimeout(() => {
        const selected = Object.keys(appState.selectedElementIds || {}).filter(
          id => appState.selectedElementIds[id]
        );
        if (selected.length > 0) {
          setPositionVersion(v => v + 1);
        }
      }, 100);
    }
    prevEditingRef.current = appState.editingElement || null;

    // Detect scroll/zoom changes to hide toolbar
    const prevScrollZoom = lastScrollZoomRef.current;
    const currentScrollX = appState?.scrollX ?? 0;
    const currentScrollY = appState?.scrollY ?? 0;
    const currentZoom = appState?.zoom?.value ?? 1;

    if (
      prevScrollZoom.scrollX !== currentScrollX ||
      prevScrollZoom.scrollY !== currentScrollY ||
      prevScrollZoom.zoom !== currentZoom
    ) {
      setIsScrollingOrZooming(prev => prev === true ? prev : true);

      if (scrollZoomTimeoutRef.current) {
        clearTimeout(scrollZoomTimeoutRef.current);
      }
      scrollZoomTimeoutRef.current = setTimeout(() => {
        setIsScrollingOrZooming(prev => prev === false ? prev : false);
        // Force recalculation by touching selectedIdsStr
        setSelectedIdsStr(prev => prev + " ");
      }, 300);

      lastScrollZoomRef.current = {
        scrollX: currentScrollX,
        scrollY: currentScrollY,
        zoom: currentZoom
      };

      // Save viewport to localStorage for refresh restore
      try {
        localStorage.setItem(
          `canvas-viewport-${activeNoteIdRef.current}`,
          JSON.stringify({ scrollX: currentScrollX, scrollY: currentScrollY, zoom: currentZoom })
        );
      } catch {}
    }

    // Excalidraw placeholder swap logic
    const prevEditingId = lastEditingTextElementIdRef.current;
    const currentEditingId = appState?.editingElement?.id;
    const isTr = i18n.language.startsWith("tr");
    const placeholderText = isTr ? "Yazmaya Başla..." : "Type '/' for commands...";

    // Case A: Just exited editing mode on a text element
    if (prevEditingId && prevEditingId !== currentEditingId) {
      const el = elements.find((e: any) => e.id === prevEditingId && !e.isDeleted);
      if (el && el.type === "text" && (!el.text || el.text.trim() === "")) {
        setTimeout(() => {
          if (excalidrawAPIRef.current) {
            excalidrawAPIRef.current.updateScene({
              elements: excalidrawAPIRef.current.getSceneElements().map((e: any) => 
                e.id === prevEditingId 
                  ? { ...e, text: placeholderText, originalText: placeholderText, strokeColor: "#aaaaaa" } 
                  : e
              )
            });
          }
        }, 50);
      }
    }

    // Case B: Just entered editing mode on a text element containing placeholder
    if (currentEditingId && currentEditingId !== prevEditingId) {
      const el = elements.find((e: any) => e.id === currentEditingId && !e.isDeleted);
      if (el && el.type === "text" && el.text === placeholderText) {
        setTimeout(() => {
          if (excalidrawAPIRef.current) {
            const normalStrokeColor = themeRef.current === "dark" ? "#f4f4f5" : "#18181b";
            excalidrawAPIRef.current.updateScene({
              elements: excalidrawAPIRef.current.getSceneElements().map((e: any) => 
                e.id === currentEditingId 
                  ? { ...e, text: "", originalText: "", strokeColor: normalStrokeColor } 
                  : e
              )
            });
          }
        }, 50);
      }
    }

    lastEditingTextElementIdRef.current = currentEditingId;

    if (appState?.activeTool?.type && appState.activeTool.type !== activeToolRef.current) {
      setActiveTool(appState.activeTool.type);
      if (appState.activeTool.type === "text" && excalidrawAPIRef.current) {
        setTimeout(() => {
          if (excalidrawAPIRef.current) {
            excalidrawAPIRef.current.updateScene({
              appState: {
                currentItemStrokeColor: "#1e293b",
                currentItemFontColor: "#1e293b"
              }
            });
          }
        }, 50);
      }
    }

    // Fix: restore transparent background when canvas is cleared (Ctrl+Backspace)
    const activeEls = (elements as any[]).filter(e => !e.isDeleted);
    const currentCount = activeEls.length;
    if (prevElementsCountRef.current > 0 && currentCount === 0) {
      setTimeout(() => {
        if (excalidrawAPIRef.current) {
          excalidrawAPIRef.current.updateScene({ appState: { viewBackgroundColor: "transparent" } });
        }
      }, 60);
    }
    prevElementsCountRef.current = currentCount;

    // Selection tracking — works for all element types
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      id => appState.selectedElementIds[id]
    );
    const sortedIdsStr = selectedIds.sort().join(",");

    // Only update the selected IDs state when the selection list actually changes
    if (sortedIdsStr !== lastSelectedIdsStrRef.current) {
      lastSelectedIdsStrRef.current = sortedIdsStr;
      setSelectedIdsStr(sortedIdsStr);
    }

    // DÜZELTME 1: Update floating toolbar and selectedContainer inside onChange directly
    if (currentlyEditing) {
      setFloatingPos(prev => prev === null ? prev : null);
      setQuickConnect(prev => prev === null ? prev : null);
    } else if (selectedIds.length > 0) {
      updateToolbarPositionRef.current(selectedIds, elements, appState);
    } else {
      setFloatingPos(prev => prev === null ? prev : null);
      setSelectedContainer(prev => prev === null ? prev : null);
      setQuickConnect(prev => prev === null ? prev : null);
    }

    const hasLocked = activeEls.some((e: any) => e.locked);
    if (hasLocked !== hasLockedElementsRef.current) {
      hasLockedElementsRef.current = hasLocked;
      setHasLockedElements(prev => prev === hasLocked ? prev : hasLocked);
    }

    const currentStr = JSON.stringify(elements);
    
    // Check if the set of files carrying a dataURL has changed.
    const fileIdsWithData = Object.entries(files || {})
      .filter(([_, entry]: [string, any]) => !!entry?.dataURL)
      .map(([id]) => id)
      .sort()
      .join(",");

    const elementsChanged = currentStr !== lastSavedRef.current;
    const filesChanged = fileIdsWithData !== lastSavedFilesKeysRef.current;

    if (!elementsChanged && !filesChanged) return;
    if (!elements || elements.length === 0) return;

    lastSavedRef.current = currentStr;
    lastSavedFilesKeysRef.current = fileIdsWithData;
    debouncedSaveRef.current(activeNoteIdRef.current, [...elements], appState, files);
  }, []);



  // Position calculation and state updates for the floating properties bar
  useEffect(() => {
    const elements = latestElementsRef.current;
    const appState = latestAppStateRef.current;
    if (!elements || !appState) return;

    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      id => appState.selectedElementIds[id]
    );
    updateToolbarPosition(selectedIds, elements, appState);
  }, [selectedIdsStr, positionVersion]);

  const handleQuickConnect = (direction: "top" | "bottom" | "left" | "right") => {
    if (!excalidrawAPI || !quickConnect) return;
    const elements = excalidrawAPI.getSceneElements();
    const selEl = elements.find((e: any) => e.id === quickConnect.selectedId && !e.isDeleted);
    if (!selEl) return;

    const w = 140;
    const h = 60;
    let newX = selEl.x;
    let newY = selEl.y;

    const selCx = selEl.x + selEl.width / 2;
    const selCy = selEl.y + selEl.height / 2;

    if (direction === "top") {
      newX = selCx - w / 2;
      newY = selEl.y - 200 - h;
    } else if (direction === "bottom") {
      newX = selCx - w / 2;
      newY = selEl.y + selEl.height + 200;
    } else if (direction === "left") {
      newX = selEl.x - 200 - w;
      newY = selCy - h / 2;
    } else if (direction === "right") {
      newX = selEl.x + selEl.width + 200;
      newY = selCy - h / 2;
    }

    const rectId = `rect-${Math.floor(Math.random() * 999999)}`;
    const textId = `text-${Math.floor(Math.random() * 999999)}`;

    const newRect = {
      id: rectId,
      type: "rectangle",
      x: newX,
      y: newY,
      width: w,
      height: h,
      angle: 0,
      strokeColor: "#CCCCCC",
      backgroundColor: theme === "dark" ? "#2A2A2A" : "#F5F5F5",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 3, value: 8 },
      seed: Math.floor(Math.random() * 999999),
      version: 1,
      versionNonce: Math.floor(Math.random() * 999999),
      isDeleted: false,
      boundElements: [{ id: textId, type: "text" }],
      updated: Date.now(),
      link: null,
      locked: false,
      customType: "text",
      customData: { isSchemaElement: true }
    };

    const isTr = i18n.language.startsWith("tr");
    const placeholderText = isTr ? "Yazmaya Başla..." : "Type '/' for commands...";

    const newText = {
      id: textId,
      type: "text",
      x: newX + 16,
      y: newY + 16,
      width: w - 32,
      height: h - 32,
      angle: 0,
      strokeColor: "#AAAAAA",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 999999),
      version: 1,
      versionNonce: Math.floor(Math.random() * 999999),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      text: placeholderText,
      fontSize: 16,
      fontFamily: FONT_FAMILY.Helvetica as number,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: rectId,
      originalText: placeholderText,
      lineHeight: 1.3,
      autoResize: true
    };

    let startPoint: [number, number] = [0, 0];
    let endPoint: [number, number] = [0, 0];

    if (direction === "top") {
      startPoint = [selCx, selEl.y];
      endPoint = [selCx, newY + h];
    } else if (direction === "bottom") {
      startPoint = [selCx, selEl.y + selEl.height];
      endPoint = [selCx, newY];
    } else if (direction === "left") {
      startPoint = [selEl.x, selCy];
      endPoint = [newX + w, selCy];
    } else if (direction === "right") {
      startPoint = [selEl.x + selEl.width, selCy];
      endPoint = [newX, selCy];
    }

    const arrowId = `arrow-${Math.floor(Math.random() * 999999)}`;
    const newArrow = {
      id: arrowId,
      type: "arrow",
      x: startPoint[0],
      y: startPoint[1],
      width: Math.abs(endPoint[0] - startPoint[0]),
      height: Math.abs(endPoint[1] - startPoint[1]),
      angle: 0,
      strokeColor: "#0891B2",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1.5,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 2 },
      seed: Math.floor(Math.random() * 999999),
      version: 1,
      versionNonce: Math.floor(Math.random() * 999999),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      points: [[0, 0], [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]]],
      lastCommittedPoint: null,
      startBinding: { elementId: selEl.id, focus: 0, gap: 4 },
      endBinding: { elementId: rectId, focus: 0, gap: 4 },
      startArrowhead: null,
      endArrowhead: null
    };

    if (!selEl.boundElements) selEl.boundElements = [];
    selEl.boundElements.push({ id: arrowId, type: "arrow" });

    newRect.boundElements.push({ id: arrowId, type: "arrow" });

    const updatedElements = [
      ...elements.map((e: any) => e.id === selEl.id ? selEl : e),
      newRect,
      newText,
      newArrow
    ];

    excalidrawAPI.updateScene({ elements: updatedElements });

    setTimeout(() => {
      try {
        excalidrawAPI.updateScene({
          appState: {
            editingElement: newText,
            selectedElementIds: { [rectId]: false, [textId]: true }
          }
        });
      } catch (err) {
        console.error("Failed to enter edit mode:", err);
      }
    }, 100);
  };

  if (!initialData) {
    return (
      <div className="canvas-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%" }}>
        <div className="empty-state">
          <LoadingSpinner label={i18n.language.startsWith("tr") ? "Yükleniyor..." : "Loading..."} muted />
        </div>
      </div>
    );
  }

  const floatingBarIsShape = selectedContainer?.rect?.type === "rectangle" ||
    selectedContainer?.rect?.type === "ellipse" ||
    selectedContainer?.rect?.type === "diamond";
  const floatingBarIsText = selectedContainer?.rect?.type === "text";
  const floatingBarIsLine = selectedContainer?.rect?.type === "arrow" ||
    selectedContainer?.rect?.type === "line";
  const floatingBarIsFreedraw = selectedContainer?.rect?.type === "freedraw";
  const floatingBarTextEl: any = selectedContainer?.text ||
    (floatingBarIsText ? selectedContainer?.rect : null);

  return (
    <div className={`canvas-container ${customBlockType && customBlockType !== "schema" ? "custom-block-placement-active" : ""}`}>
      <div
        ref={wrapperRef}
        className="canvas-wrapper"
        onPointerDownCapture={handlePointerDownCapture}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <Excalidraw
          key={activeNoteId}
          excalidrawAPI={(api) => {
            setExcalidrawAPI(api);
            excalidrawAPIRef.current = api;
            storeSetExcalidrawAPI(api);
          }}
          initialData={initialData}
          onChange={handleCanvasChange}
          theme={theme}
          langCode={i18n.language.startsWith("tr") ? "tr-TR" : "en-US"}

          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              saveAsImage: true,
              toggleTheme: false
            }
          }}
          renderTopRightUI={() => null}
        >
          <MainMenu>
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ToggleTheme />
          </MainMenu>
        </Excalidraw>

        {quickConnect && !isDraggingElement && !isScrollingOrZooming && !isEditingText && (
          <>
            <button
              type="button"
              className="quick-connect-btn top"
              style={{
                position: "fixed",
                left: `${quickConnect.top.x}px`,
                top: `${quickConnect.top.y}px`,
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                border: "1.5px solid #0891b2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0891b2",
                cursor: "pointer",
                zIndex: 999,
                padding: 0
              }}
              onClick={() => handleQuickConnect("top")}
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              className="quick-connect-btn bottom"
              style={{
                position: "fixed",
                left: `${quickConnect.bottom.x}px`,
                top: `${quickConnect.bottom.y}px`,
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                border: "1.5px solid #0891b2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0891b2",
                cursor: "pointer",
                zIndex: 999,
                padding: 0
              }}
              onClick={() => handleQuickConnect("bottom")}
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className="quick-connect-btn left"
              style={{
                position: "fixed",
                left: `${quickConnect.left.x}px`,
                top: `${quickConnect.left.y}px`,
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                border: "1.5px solid #0891b2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0891b2",
                cursor: "pointer",
                zIndex: 999,
                padding: 0
              }}
              onClick={() => handleQuickConnect("left")}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="quick-connect-btn right"
              style={{
                position: "fixed",
                left: `${quickConnect.right.x}px`,
                top: `${quickConnect.right.y}px`,
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                border: "1.5px solid #0891b2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0891b2",
                cursor: "pointer",
                zIndex: 999,
                padding: 0
              }}
              onClick={() => handleQuickConnect("right")}
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}



        {previewRect && (
          <div
            className="canvas-block-drag-preview"
            style={{
              position: "absolute",
              left: previewRect.x,
              top: previewRect.y,
              width: previewRect.w,
              height: previewRect.h,
              border: "1.5px dashed var(--color-accent, #0891b2)",
              backgroundColor: "rgba(8, 145, 178, 0.08)",
              pointerEvents: "none",
              zIndex: 9999,
              borderRadius: "4px"
            }}
          />
        )}

        {/* Floating properties bar removed */}
      </div>

      {/* Image Preview Modal */}
      {isImagePreviewOpen && imagePreviewUrl && (
        <div
          className="image-preview-overlay"
          onClick={() => setIsImagePreviewOpen(false)}
        >
          <button
            type="button"
            className="image-preview-close-btn"
            onClick={() => setIsImagePreviewOpen(false)}
          >
            <X size={20} />
          </button>
          <img
            src={imagePreviewUrl}
            className="image-preview-img"
            onClick={e => e.stopPropagation()}
            alt=""
          />
        </div>
      )}

      <CanvasToolbar
        excalidrawAPI={excalidrawAPI}
        activeTool={activeTool}
        customBlockType={customBlockType}
        setCustomBlockType={setCustomBlockType}
        hasLockedElements={hasLockedElements}
        onUnlockAll={handleUnlockAll}
        selectedContainer={selectedContainer}
        handleLayering={handleLayering}
        updateContainerColor={updateContainerColor}
        theme={theme}
        floatingPos={floatingPos}
        isToolbarHidden={isDraggingElement || isScrollingOrZooming || isEditingText}
      />
      {!isEditingText && <Minimap excalidrawAPI={excalidrawAPI} />}
    </div>
  );
}
