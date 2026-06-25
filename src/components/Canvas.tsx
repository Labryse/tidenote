import { useState, useEffect, useRef } from "react";
import { Excalidraw, MainMenu, FONT_FAMILY } from "@excalidraw/excalidraw";
import LoadingSpinner from "./LoadingSpinner";
import "@excalidraw/excalidraw/index.css";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
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
  ChevronDown
} from "lucide-react";

const FLOATING_FONTS = [
  { id: FONT_FAMILY.Helvetica as number, label: "Helvetica" },
  { id: FONT_FAMILY["Liberation Sans"] as number, label: "Liberation Sans" },
  { id: FONT_FAMILY.Nunito as number, label: "Nunito" },
  { id: FONT_FAMILY.Excalifont as number, label: "Excalifont" },
  { id: FONT_FAMILY["Comic Shanns"] as number, label: "Comic Shanns" },
  { id: FONT_FAMILY.Cascadia as number, label: "Cascadia" },
];

export default function Canvas() {
  const { t, i18n } = useTranslation();
  const { activeNoteId, notes, theme, setExcalidrawAPI: storeSetExcalidrawAPI } = useNoteStore();
  
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [activeTool, setActiveTool] = useState<string>("selection");
  const [initialData, setInitialData] = useState<any>(null);
  const isInitializedRef = useRef(false);

  const [selectedContainer, setSelectedContainer] = useState<{ rect: any; text: any } | null>(null);
  const [floatingPos, setFloatingPos] = useState<{ top: number; left: number } | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isThreeDotsOpen, setIsThreeDotsOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);

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

  // Esc key cancels block placement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && customBlockTypeRef.current) {
        setCustomBlockType(null);
        setPreviewRect(null);
        isDraggingRef.current = false;
        dragStartRef.current = null;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!customBlockTypeRef.current || !excalidrawAPI) return;

    e.stopPropagation();
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const appState = excalidrawAPI.getAppState();
    const zoom = appState.zoom?.value ?? 1;
    const scrollX = appState.scrollX ?? 0;
    const scrollY = appState.scrollY ?? 0;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const canvasX = (-scrollX + clickX) / zoom;
    const canvasY = (-scrollY + clickY) / zoom;

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
    const zoom = appState.zoom?.value ?? 1;
    const scrollX = appState.scrollX ?? 0;
    const scrollY = appState.scrollY ?? 0;

    const startCanvasX = dragStartRef.current.canvasX;
    const startCanvasY = dragStartRef.current.canvasY;

    const currentClientX = e.clientX;
    const currentClientY = e.clientY;
    const currentX = currentClientX - rect.left;
    const currentY = currentClientY - rect.top;

    const currentCanvasX = (-scrollX + currentX) / zoom;
    const currentCanvasY = (-scrollY + currentY) / zoom;

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

    let text = i18n.language.startsWith("tr") ? "Yazmaya Başla..." : "Type '/' for commands...";
    let fontSize = 16;
    let fontFamily = FONT_FAMILY.Helvetica as number;
    let textAlign: "left" | "center" | "right" = "center";
    let strokeColor = theme === "dark" ? "#f4f4f5" : "#18181b";
    let customLink: string | null = null;

    if (type === "h1") {
      fontSize = 36;
      text = i18n.language.startsWith("tr") ? "Başlık 1" : "Heading 1";
    } else if (type === "h2") {
      fontSize = 28;
      text = i18n.language.startsWith("tr") ? "Başlık 2" : "Heading 2";
    } else if (type === "h3") {
      fontSize = 22;
      text = i18n.language.startsWith("tr") ? "Başlık 3" : "Heading 3";
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
      customType: type
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
      autoResize: true
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

    excalidrawAPI.updateScene({
      elements: [...existing, ...elementsToAppend]
    });

    excalidrawAPI.updateScene({
      appState: {
        selectedElementIds: {
          [rectId]: true
        }
      }
    });
  };

  const updateContainerColor = (bgColor: string, strokeColor: string) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect } = selectedContainer;
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
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setIsFontDropdownOpen(false);
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
  };

  const updateFillStyle = (fillStyle: string) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect } = selectedContainer;
    const elements = excalidrawAPI.getSceneElements();
    const updated = elements.map((el: any) => {
      if (el.id === rect.id) {
        return { ...el, fillStyle, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) };
      }
      return el;
    });
    excalidrawAPI.updateScene({ elements: updated });
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
  };

  const updateCornerRadius = (rounded: boolean) => {
    if (!excalidrawAPI || !selectedContainer) return;
    const { rect } = selectedContainer;
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
  };

  const handleDoubleClick = () => {
    if (!excalidrawAPI) return;
    const appState = excalidrawAPI.getAppState();
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(id => appState.selectedElementIds[id]);
    if (selectedIds.length !== 1) return;
    const elements = excalidrawAPI.getSceneElements();
    const el = elements.find((e: any) => e.id === selectedIds[0]);
    if (!el || el.type !== "image" || !el.fileId) return;
    const files = excalidrawAPI.getFiles();
    const file = files[el.fileId];
    if (!file || !file.dataURL) return;
    setImagePreviewUrl(file.dataURL);
    setIsImagePreviewOpen(true);
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

  const initializedNoteIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ noteId: string; elements: any[]; appState: any; files: any } | null>(null);

  // Direct sync function to save canvas to Firestore
  const saveCanvasToFirestore = async (noteId: string, elements: any[], appState: any, files: any) => {
    try {
      const cleanElements = JSON.parse(JSON.stringify(elements));
      const cleanAppState = JSON.parse(JSON.stringify({
        viewBackgroundColor: appState?.viewBackgroundColor || "#ffffff",
      }));
      const cleanFiles = files ? JSON.parse(JSON.stringify(files)) : {};

      const noteRef = doc(db, "notes", noteId);
      await updateDoc(noteRef, {
        elements: JSON.stringify(cleanElements),
        appState: JSON.stringify(cleanAppState),
        files: JSON.stringify(cleanFiles),
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error("Error saving canvas to Firestore:", error);
      useNoteStore.getState().showToast(t("toast.saveError"));
    }
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
    }, 1500);
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

    lastSavedRef.current = JSON.stringify(elements);

    setInitialData({
      elements,
      appState: {
        ...appState,
        gridModeEnabled: false,
        viewBackgroundColor: "transparent",
        currentItemRoughness: 0,
        currentItemFontFamily: FONT_FAMILY.Helvetica as number,
        objectsSnapModeEnabled: true,
      },
      files
    });
  }, [activeNoteId, notes]);

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
    };
  }, []);

  const handleCanvasChange = (elements: readonly any[], appState: any, files: any) => {
    if (!activeNoteId || !isInitializedRef.current) return;

    if (appState?.activeTool?.type && appState.activeTool.type !== activeTool) {
      setActiveTool(appState.activeTool.type);
    }

    // Fix: restore transparent background when canvas is cleared (Ctrl+Backspace)
    const activeEls = (elements as any[]).filter(e => !e.isDeleted);
    const currentCount = activeEls.length;
    if (prevElementsCountRef.current > 0 && currentCount === 0) {
      setTimeout(() => {
        if (excalidrawAPI) {
          excalidrawAPI.updateScene({ appState: { viewBackgroundColor: "transparent" } });
        }
      }, 60);
    }
    prevElementsCountRef.current = currentCount;

    // Selection tracking — works for all element types
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      id => appState.selectedElementIds[id]
    );

    if (selectedIds.length >= 1) {
      const selEls = activeEls.filter(e => selectedIds.includes(e.id));
      if (selEls.length > 0) {
        const zoom = appState.zoom?.value ?? 1;
        const scrollX = appState.scrollX ?? 0;
        const scrollY = appState.scrollY ?? 0;

        // Bounding box of all selected elements
        const minX = Math.min(...selEls.map(e => e.x ?? 0));
        const minY = Math.min(...selEls.map(e => e.y ?? 0));
        const maxX = Math.max(...selEls.map(e => (e.x ?? 0) + (e.width ?? 0)));

        const screenMinX = minX * zoom + scrollX;
        const screenMinY = minY * zoom + scrollY;
        const screenMaxX = maxX * zoom + scrollX;

        const newLeft = (screenMinX + screenMaxX) / 2;
        const newTop = Math.max(8, screenMinY - 54);

        setFloatingPos(prev =>
          prev?.left === newLeft && prev?.top === newTop ? prev : { left: newLeft, top: newTop }
        );

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
              primaryEl.boundElements.some((be: any) => be.type === "text" && be.id === e.id) && !e.isDeleted
            ) ?? null
          : null;

        setSelectedContainer(prev =>
          prev?.rect?.id === primaryEl.id ? prev : { rect: primaryEl, text: textChild }
        );
      } else {
        setSelectedContainer(null);
        setFloatingPos(null);
      }
    } else {
      setSelectedContainer(null);
      setFloatingPos(null);
    }

    const currentStr = JSON.stringify(elements);
    if (currentStr === lastSavedRef.current) return;
    if (!elements || elements.length === 0) return;

    lastSavedRef.current = currentStr;
    debouncedSave(activeNoteId, [...elements], appState, files);
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
  const floatingBarTextEl: any = selectedContainer?.text ||
    (floatingBarIsText ? selectedContainer?.rect : null);

  return (
    <div className={`canvas-container ${customBlockType ? "custom-block-placement-active" : ""}`}>
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

        {/* Floating Properties Bar */}
        {selectedContainer && floatingPos && (
          <div
            className="floating-props-bar"
            style={{ left: floatingPos.left, top: floatingPos.top, transform: "translateX(-50%)" }}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            {/* Duplicate */}
            <button type="button" className="floating-props-btn" onClick={handleDuplicateContainer} title={i18n.language.startsWith("tr") ? "Çoğalt" : "Duplicate"}>
              <Copy size={14} />
            </button>
            <div className="floating-props-sep" />
            {/* Layer */}
            <button type="button" className="floating-props-btn" onClick={() => handleLayering("front")} title={i18n.language.startsWith("tr") ? "Öne Getir" : "Bring to Front"}>
              <ArrowUp size={14} />
            </button>
            <button type="button" className="floating-props-btn" onClick={() => handleLayering("back")} title={i18n.language.startsWith("tr") ? "Arkaya Gönder" : "Send to Back"}>
              <ArrowDown size={14} />
            </button>
            <div className="floating-props-sep" />
            {/* Lock */}
            <button
              type="button"
              className={`floating-props-btn${selectedContainer.rect?.locked ? " locked" : ""}`}
              onClick={handleToggleLock}
              title={selectedContainer.rect?.locked ? (i18n.language.startsWith("tr") ? "Kilidi Aç" : "Unlock") : (i18n.language.startsWith("tr") ? "Kilitle" : "Lock")}
            >
              {selectedContainer.rect?.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>

            {/* SHAPE PROPERTIES */}
            {floatingBarIsShape && (
              <>
                <div className="floating-props-sep" />
                {/* Stroke width */}
                {[{ w: 1, h: 1 }, { w: 2, h: 2 }, { w: 4, h: 4 }].map(({ w, h }) => (
                  <button
                    key={w}
                    type="button"
                    className={`floating-props-btn ${selectedContainer.rect?.strokeWidth === w ? "active" : ""}`}
                    onClick={() => updateStrokeWidth(w)}
                    title={`${i18n.language.startsWith("tr") ? "Kontur" : "Stroke"} ${w}px`}
                  >
                    <span style={{ display: "block", width: 14, height: h, background: "currentColor", borderRadius: 1 }} />
                  </button>
                ))}
                <div className="floating-props-sep" />
                {/* Fill style */}
                {[
                  { style: "solid", symbol: "■", title: i18n.language.startsWith("tr") ? "Dolu" : "Solid" },
                  { style: "hachure", symbol: "▤", title: i18n.language.startsWith("tr") ? "Taralı" : "Hachure" },
                  { style: "dots", symbol: "⋯", title: i18n.language.startsWith("tr") ? "Noktalı" : "Dots" }
                ].map(({ style, symbol, title }) => (
                  <button
                    key={style}
                    type="button"
                    className={`floating-props-btn ${selectedContainer.rect?.fillStyle === style ? "active" : ""}`}
                    onClick={() => updateFillStyle(style)}
                    title={title}
                    style={{ fontSize: 12 }}
                  >
                    {symbol}
                  </button>
                ))}
                <div className="floating-props-sep" />
                {/* Fill & stroke color */}
                <label className="floating-color-label" title={i18n.language.startsWith("tr") ? "Dolgu Rengi" : "Fill Color"}>
                  <span className="floating-color-dot" style={{ background: selectedContainer.rect?.backgroundColor?.startsWith("#") ? selectedContainer.rect.backgroundColor : "#f4f4f5" }} />
                  <input type="color" style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                    value={selectedContainer.rect?.backgroundColor?.startsWith("#") ? selectedContainer.rect.backgroundColor : "#f4f4f5"}
                    onChange={e => updateContainerColor(e.target.value, selectedContainer.rect?.strokeColor || "#71717a")} />
                </label>
                <label className="floating-color-label" title={i18n.language.startsWith("tr") ? "Çerçeve Rengi" : "Stroke Color"}>
                  <span className="floating-color-dot" style={{ background: selectedContainer.rect?.strokeColor?.startsWith("#") ? selectedContainer.rect.strokeColor : "#71717a" }} />
                  <input type="color" style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                    value={selectedContainer.rect?.strokeColor?.startsWith("#") ? selectedContainer.rect.strokeColor : "#71717a"}
                    onChange={e => updateContainerColor(selectedContainer.rect?.backgroundColor || "#f4f4f5", e.target.value)} />
                </label>
                <div className="floating-props-sep" />
                {/* Opacity slider */}
                <div className="floating-opacity-wrap" title={`${i18n.language.startsWith("tr") ? "Opaklık" : "Opacity"}: ${selectedContainer.rect?.opacity ?? 100}%`}>
                  <input
                    type="range" min={0} max={100} step={10}
                    value={selectedContainer.rect?.opacity ?? 100}
                    onChange={e => updateOpacity(Number(e.target.value))}
                    className="floating-opacity-slider"
                  />
                </div>
                <div className="floating-props-sep" />
                {/* Corner radius toggle */}
                <button
                  type="button"
                  className={`floating-props-btn ${selectedContainer.rect?.roundness ? "active" : ""}`}
                  onClick={() => updateCornerRadius(!selectedContainer.rect?.roundness)}
                  title={selectedContainer.rect?.roundness ? (i18n.language.startsWith("tr") ? "Keskin Köşe" : "Sharp Corner") : (i18n.language.startsWith("tr") ? "Yuvarlak Köşe" : "Round Corner")}
                  style={{ fontSize: 14 }}
                >
                  {selectedContainer.rect?.roundness ? "○" : "□"}
                </button>
              </>
            )}

            {/* TEXT PROPERTIES */}
            {(floatingBarIsText || !!selectedContainer.text) && floatingBarTextEl && (
              <>
                <div className="floating-props-sep" />
                {/* Font family dropdown */}
                <div ref={fontDropdownRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={`floating-props-btn ${isFontDropdownOpen ? "active" : ""}`}
                    style={{ width: 42, display: "flex", alignItems: "center", gap: 1 }}
                    onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                    title={i18n.language.startsWith("tr") ? "Font Ailesi" : "Font Family"}
                  >
                    <span style={{ fontSize: 10 }}>Aa</span>
                    <ChevronDown size={8} />
                  </button>
                  {isFontDropdownOpen && (
                    <div className="floating-font-dropdown">
                      {FLOATING_FONTS.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          className={`floating-font-option ${floatingBarTextEl.fontFamily === f.id ? "active" : ""}`}
                          onClick={() => { updateFontFamily(f.id); setIsFontDropdownOpen(false); }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="floating-props-sep" />
                {/* Font size */}
                {[{ label: "S", size: 14 }, { label: "M", size: 20 }, { label: "L", size: 28 }, { label: "XL", size: 36 }].map(s => (
                  <button
                    key={s.label}
                    type="button"
                    className={`floating-props-btn ${floatingBarTextEl.fontSize === s.size ? "active" : ""}`}
                    style={{ width: 26, fontSize: 9, fontWeight: 700 }}
                    onClick={() => updateFontSize(s.size)}
                    title={`${s.label} (${s.size}px)`}
                  >
                    {s.label}
                  </button>
                ))}
                <div className="floating-props-sep" />
                {/* Text align */}
                {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as Array<[string, React.FC<{size: number}>]>).map(([align, Icon]) => (
                  <button
                    key={align}
                    type="button"
                    className={`floating-props-btn ${floatingBarTextEl.textAlign === align ? "active" : ""}`}
                    onClick={() => updateTextAlign(align)}
                    title={`${i18n.language.startsWith("tr") ? "Hizala" : "Align"}: ${align}`}
                  >
                    <Icon size={12} />
                  </button>
                ))}
                <div className="floating-props-sep" />
                {/* Text color */}
                <label className="floating-color-label" title={i18n.language.startsWith("tr") ? "Metin Rengi" : "Text Color"}>
                  <span className="floating-color-dot" style={{ background: floatingBarTextEl?.strokeColor?.startsWith("#") ? floatingBarTextEl.strokeColor : "#f4f4f5" }} />
                  <input
                    type="color"
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                    value={floatingBarTextEl?.strokeColor?.startsWith("#") ? floatingBarTextEl.strokeColor : "#f4f4f5"}
                    onChange={e => {
                      if (!excalidrawAPI) return;
                      const els = excalidrawAPI.getSceneElements();
                      const updated = els.map((el: any) =>
                        el.id === floatingBarTextEl.id
                          ? { ...el, strokeColor: e.target.value, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                          : el
                      );
                      excalidrawAPI.updateScene({ elements: updated });
                    }}
                  />
                </label>
              </>
            )}

            <div className="floating-props-sep" />
            {/* Delete */}
            <button type="button" className="floating-props-btn danger" onClick={handleDeleteContainer} title={i18n.language.startsWith("tr") ? "Sil" : "Delete"}>
              <Trash size={14} />
            </button>
          </div>
        )}
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
      />
      <Minimap excalidrawAPI={excalidrawAPI} />
    </div>
  );
}
