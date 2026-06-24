import { useState, useEffect, useRef } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
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
  ExternalLink
} from "lucide-react";

export default function Canvas() {
  const { t, i18n } = useTranslation();
  const { activeNoteId, notes, theme, setExcalidrawAPI: storeSetExcalidrawAPI } = useNoteStore();
  
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [activeTool, setActiveTool] = useState<string>("selection");
  const [initialData, setInitialData] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [selectedContainer, setSelectedContainer] = useState<{ rect: any; text: any } | null>(null);
  const [floatingPos, setFloatingPos] = useState<{ top: number; left: number } | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isThreeDotsOpen, setIsThreeDotsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [customBlockType, setCustomBlockTypeState] = useState<string | null>(null);
  const customBlockTypeRef = useRef<string | null>(null);

  const setCustomBlockType = (type: string | null) => {
    setCustomBlockTypeState(type);
    customBlockTypeRef.current = type;
  };

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

    const defaultBg = theme === "dark" ? "rgba(39, 39, 42, 0.9)" : "rgba(244, 244, 245, 0.9)";
    const defaultStroke = theme === "dark" ? "#71717a" : "#d4d4d8";

    let text = i18n.language.startsWith("tr") ? "Yazmaya Başla..." : "Type '/' for commands...";
    let fontSize = 16;
    let fontFamily = 1;
    let textAlign: "left" | "center" | "right" = "left";
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
    const newTextId = `text-${idSuffix}`;
    const newGroupId = `group-dup-${idSuffix}`;

    const existing = excalidrawAPI.getSceneElements();
    const newRect = {
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
    };
    
    const newText = {
      ...text,
      id: newTextId,
      x: text ? text.x + 30 : rect.x + 46,
      y: text ? text.y + 30 : rect.y + 46,
      containerId: newRectId,
      groupIds: [newGroupId],
      seed: Math.floor(Math.random() * 999999),
      version: 1,
      versionNonce: Math.floor(Math.random() * 999999),
      updated: Date.now()
    };

    excalidrawAPI.updateScene({
      elements: [...existing, newRect, newText]
    });

    excalidrawAPI.updateScene({
      appState: {
        selectedElementIds: {
          [newRectId]: true
        }
      }
    });
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
      setIsInitialized(false);
      setInitialData(null);
    }

    if (!activeNoteId) {
      initializedNoteIdRef.current = null;
      return;
    }

    // If already initialized for this activeNoteId, do not run initialization again
    if (isInitialized && activeNoteId === initializedNoteIdRef.current) {
      return;
    }

    const note = notes.find((n) => n.id === activeNoteId);
    if (!note) {
      // Wait until the note is loaded in notes store
      return;
    }

    initializedNoteIdRef.current = activeNoteId;

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
      },
      files
    });
    
    setIsInitialized(true);
  }, [activeNoteId, notes, isInitialized]);

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
    if (!activeNoteId || !isInitialized) return;

    if (appState?.activeTool?.type && appState.activeTool.type !== activeTool) {
      setActiveTool(appState.activeTool.type);
    }

    // Selection tracking
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      id => appState.selectedElementIds[id]
    );

    if (selectedIds.length === 1 && excalidrawAPI) {
      const selectedId = selectedIds[0];
      const el = elements.find(e => e.id === selectedId && !e.isDeleted);
      if (el) {
        let rectEl = null;
        let textEl = null;

        if (el.type === "rectangle" && el.boundElements?.some((be: any) => be.type === "text")) {
          rectEl = el;
          const textId = el.boundElements.find((be: any) => be.type === "text")?.id;
          textEl = elements.find(e => e.id === textId && !e.isDeleted);
        } else if (el.type === "text" && el.containerId) {
          textEl = el;
          rectEl = elements.find(e => e.id === el.containerId && !e.isDeleted);
        }

        if (rectEl && textEl) {
          setSelectedContainer({ rect: rectEl, text: textEl });

          const zoom = appState.zoom?.value ?? 1;
          const scrollX = appState.scrollX ?? 0;
          const scrollY = appState.scrollY ?? 0;

          const screenX = rectEl.x * zoom + scrollX;
          const screenY = rectEl.y * zoom + scrollY;
          const screenW = rectEl.width * zoom;

          setFloatingPos({
            left: screenX + screenW / 2,
            top: screenY - 56
          });
        } else {
          setSelectedContainer(null);
          setFloatingPos(null);
        }
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

  if (!isInitialized || !initialData) {
    return (
      <div className="canvas-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%" }}>
        <div className="empty-state">
          <LoadingSpinner label={i18n.language.startsWith("tr") ? "Yükleniyor..." : "Loading..."} muted />
        </div>
      </div>
    );
  }

  return (
    <div className={`canvas-container ${customBlockType ? "custom-block-placement-active" : ""}`}>
      <div 
        ref={wrapperRef}
        className="canvas-wrapper"
        onPointerDownCapture={handlePointerDownCapture}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
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
      </div>

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
