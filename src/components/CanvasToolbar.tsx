import { useState, useRef, useEffect } from "react";
import { FONT_FAMILY } from "@excalidraw/excalidraw";
import {
  MousePointer2,
  Hand,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Slash,
  PenTool,
  Image as ImageIcon,
  Frame,
  Eraser,
  Type,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Trash2,
  Network,
  Bold,
  Italic,
  RefreshCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Palette,
  Crop
} from "lucide-react";
import { useTranslation } from "react-i18next";

const RoundedSquareIcon = ({ size = 16, ...props }: { size?: number; [key: string]: any }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
  </svg>
);

interface CanvasToolbarProps {
  excalidrawAPI: any;
  activeTool: string;
  customBlockType: string | null;
  setCustomBlockType: (type: string | null) => void;
  hasLockedElements?: boolean;
  onUnlockAll?: () => void;
  selectedContainer: any;
  handleLayering: (action: "front" | "back") => void;
  updateContainerColor: (bgColor: string, strokeColor: string) => void;
  theme: string;
  floatingPos: { left: number; top: number } | null;
  isToolbarHidden: boolean;
}

import {
  CANVAS_FONTS,
  getBaseFontFamily,
  resolveFontVariant,
  fontSupports,
  measureCanvasText,
} from "../lib/canvasFonts";

export default function CanvasToolbar({
  excalidrawAPI,
  activeTool,
  customBlockType,
  setCustomBlockType,
  hasLockedElements = false,
  onUnlockAll,
  selectedContainer,
  handleLayering,
  updateContainerColor,
  theme,
  floatingPos,
  isToolbarHidden
}: CanvasToolbarProps) {
  const { t, i18n } = useTranslation();
  const isTr = i18n.language.startsWith("tr");
  const fontPickerRef = useRef<HTMLDivElement>(null);
  
  const [selectedFont, setSelectedFont] = useState<number>(FONT_FAMILY.Helvetica as number);
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const [renderVersion, setRenderVersion] = useState(0);
  const forceUpdate = () => setRenderVersion(v => v + 1);
  const [isShapeDropdownOpen, setIsShapeDropdownOpen] = useState(false);
  const [isMainShapeDropdownOpen, setIsMainShapeDropdownOpen] = useState(false);
  const mainShapeDropdownRef = useRef<HTMLDivElement>(null);



  const [pencilSize, setPencilSize] = useState<number>(2);
  const [lineSize, setLineSize] = useState<number>(2);
  const [arrowSize, setArrowSize] = useState<number>(2);

  // SEPARATED SHAPE AND PEN STROKE PREFERENCES
  const lastPenStrokeColorRef = useRef<string>("#1e293b");
  const lastPenStrokeWidthRef = useRef<number>(2);
  const lastShapeStrokeColorRef = useRef<string>("transparent");
  const lastShapeStrokeWidthRef = useRef<number>(0);


  // Keep track of previous active tool to detect transitions
  const prevActiveToolRef = useRef<string>(activeTool);

  useEffect(() => {
    if (!excalidrawAPI) return;

    const isShape = (tool: string) => ["rectangle", "ellipse", "diamond"].includes(tool);
    const isPen = (tool: string) => ["freedraw", "line", "arrow"].includes(tool);

    const prevTool = prevActiveToolRef.current;
    prevActiveToolRef.current = activeTool;

    if (isPen(activeTool)) {
      const color = lastPenStrokeColorRef.current || (theme === "dark" ? "#f4f4f5" : "#1e293b");
      let width = lastPenStrokeWidthRef.current;
      if (activeTool === "freedraw") width = pencilSize;
      else if (activeTool === "line") width = lineSize;
      else if (activeTool === "arrow") width = arrowSize;

      excalidrawAPI.updateScene({
        appState: {
          currentItemStrokeColor: color,
          currentItemStrokeWidth: width
        }
      });
      setStrokeColor(color);
      setStrokeWidth(width);
    } else if (isShape(activeTool)) {
      const color = lastShapeStrokeColorRef.current;
      const width = lastShapeStrokeWidthRef.current;

      excalidrawAPI.updateScene({
        appState: {
          currentItemStrokeColor: color,
          currentItemStrokeWidth: width
        }
      });
      setStrokeColor(color);
      setStrokeWidth(width);
    }
  }, [activeTool, excalidrawAPI, theme, pencilSize, lineSize, arrowSize]);

  const screenToCanvas = (screenX: number, screenY: number, appState: any, containerRect: DOMRect) => {
    const z = appState.zoom.value;
    return {
      x: (screenX - containerRect.left - appState.scrollX * z) / z,
      y: (screenY - containerRect.top - appState.scrollY * z) / z
    };
  };

  const selectedElements = excalidrawAPI
    ? excalidrawAPI.getSceneElements().filter((e: any) => {
        const appState = excalidrawAPI.getAppState();
        return appState.selectedElementIds?.[e.id] && !e.isDeleted;
      })
    : [];

  useEffect(() => {
    setIsShapeDropdownOpen(false);
    setIsMainShapeDropdownOpen(false);
  }, [selectedElements[0]?.id]);

  const getActiveTextElement = () => {
    if (!excalidrawAPI || selectedElements.length !== 1) return null;
    const first = selectedElements[0];
    if (first.type === "text") return first;
    
    // If it's a shape container, check if it has a bound text child
    if (first.boundElements) {
      const allEls = excalidrawAPI.getSceneElements();
      const textChild = allEls.find((e: any) =>
        first.boundElements.some((be: any) => be && be.type === "text" && be.id === e.id) && !e.isDeleted
      );
      if (textChild) return textChild;
    }
    return null;
  };

  const activeText = getActiveTextElement();

  const updateTextProp = (prop: string, value: any) => {
    if (!excalidrawAPI || !activeText) return;

    const updated = excalidrawAPI.getSceneElements().map((e: any) => {
      if (e.id === activeText.id) {
        let updatedElement = { ...e, [prop]: value, updated: Date.now(), version: e.version + 1, versionNonce: Math.floor(Math.random() * 999999) };

        if (prop === "fontSize" || prop === "fontFamily") {
          const fontSize = prop === "fontSize" ? value : (typeof updatedElement.fontSize === "object" ? updatedElement.fontSize.size : updatedElement.fontSize);
          // Changing the base font keeps the current bold/italic style by
          // resolving straight to the equivalent variant of the new font.
          const fontFamilyId = prop === "fontFamily"
            ? resolveFontVariant(value, updatedElement.customData?.fontWeight, updatedElement.customData?.fontStyle)
            : (updatedElement.fontFamily || 2);

          const { width, height } = measureCanvasText(updatedElement.text, fontSize, fontFamilyId);
          const dx = (width - e.width) / 2;
          const dy = (height - e.height) / 2;

          updatedElement = {
            ...updatedElement,
            fontFamily: fontFamilyId,
            fontSize,
            width,
            height,
            x: e.x - dx,
            y: e.y - dy
          };
        }
        return updatedElement;
      }
      return e;
    });
    excalidrawAPI.updateScene({ elements: updated });
    forceUpdate();
  };

  const updateTextCustomData = (prop: string, value: any) => {
    if (!excalidrawAPI || !activeText) return;

    const updated = excalidrawAPI.getSceneElements().map((e: any) => {
      if (e.id === activeText.id) {
        const nextCustomData = {
          ...(e.customData || {}),
          [prop]: value
        };

        // Bold/italic = swap to the real variant family; fontSize stays a plain
        // number (the old wrapper-class hack crashed Excalidraw's resize math).
        const targetFamilyId = resolveFontVariant(e.fontFamily, nextCustomData.fontWeight, nextCustomData.fontStyle);
        const rawSize = typeof e.fontSize === "object" ? Number(e.fontSize.size) || 16 : e.fontSize;

        const { width, height } = measureCanvasText(e.text, rawSize, targetFamilyId);
        const dx = (width - e.width) / 2;
        const dy = (height - e.height) / 2;

        return {
          ...e,
          customData: nextCustomData,
          fontFamily: targetFamilyId,
          fontSize: rawSize,
          width,
          height,
          x: e.x - dx,
          y: e.y - dy,
          updated: Date.now(),
          version: e.version + 1,
          versionNonce: Math.floor(Math.random() * 999999)
        };
      }
      return e;
    });
    excalidrawAPI.updateScene({ elements: updated });
    forceUpdate();
  };

  // Enter Excalidraw's native image crop mode (drag handles crop; Escape/Enter
  // exits). Same appState transition as its internal crop action.
  const handleCropImage = () => {
    if (!excalidrawAPI || selectedElements.length !== 1) return;
    const el = selectedElements[0];
    if (el.type !== "image") return;
    excalidrawAPI.updateScene({
      appState: { croppingElementId: el.id, isCropping: false }
    });
  };

  const changeShapeType = (targetType: "rectangle" | "rounded-rectangle" | "ellipse" | "diamond") => {
    if (!excalidrawAPI || selectedElements.length !== 1) return;
    const shape = selectedElements[0];
    
    let typeVal = targetType === "rounded-rectangle" ? "rectangle" : targetType;
    let roundnessVal = targetType === "rounded-rectangle" ? { type: 3, value: 8 } : null;

    const updated = excalidrawAPI.getSceneElements().map((e: any) =>
      e.id === shape.id
        ? { 
            ...e, 
            type: typeVal, 
            roundness: roundnessVal,
            updated: Date.now(), 
            version: e.version + 1, 
            versionNonce: Math.floor(Math.random() * 999999) 
          }
        : e
    );
    excalidrawAPI.updateScene({ elements: updated });
    forceUpdate();
  };

  const handleAddTextToShape = () => {
    if (!excalidrawAPI || selectedElements.length !== 1) return;
    const shape = selectedElements[0];
    const elements = excalidrawAPI.getSceneElements();
    
    // Check if shape already has a bound text element
    const existingText = elements.find((e: any) => e.type === "text" && e.containerId === shape.id && !e.isDeleted);
    if (existingText) {
      excalidrawAPI.updateScene({
        appState: {
          editingElement: existingText,
          selectedElementIds: { [shape.id]: false, [existingText.id]: true }
        }
      });
      forceUpdate();
      return;
    }

    // Create a new text element
    const textId = `text-${Math.floor(Math.random() * 999999)}`;
    const textX = shape.x + 16;
    const textY = shape.y + 16;
    const textW = shape.width - 32;
    const textH = shape.height - 32;
    const isTrLanguage = i18n.language.startsWith("tr");
    const placeholderText = isTrLanguage ? "Yazmaya Başla..." : "Type '/' for commands...";
    
    const normalStrokeColor = theme === "dark" ? "#f4f4f5" : "#1a1a1a";

    const newText = {
      id: textId,
      type: "text",
      x: textX,
      y: textY,
      width: textW,
      height: textH,
      angle: 0,
      strokeColor: normalStrokeColor,
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
      containerId: shape.id,
      originalText: placeholderText,
      lineHeight: 1.3,
      autoResize: true
    };

    const updatedShape = {
      ...shape,
      boundElements: [...(shape.boundElements || []), { id: textId, type: "text" }]
    };

    const updatedElements = elements.map((e: any) => e.id === shape.id ? updatedShape : e);
    updatedElements.push(newText);

    excalidrawAPI.updateScene({ elements: updatedElements });

    setTimeout(() => {
      const currentElements = excalidrawAPI.getSceneElements();
      const addedText = currentElements.find((e: any) => e.id === textId);
      if (addedText) {
        excalidrawAPI.updateScene({
          appState: {
            editingElement: addedText,
            selectedElementIds: { [shape.id]: false, [textId]: true }
          }
        });
      }
      forceUpdate();
    }, 50);
  };

  const updateArrowhead = (type: "none" | "arrow" | "circle") => {
    if (!excalidrawAPI || selectedElements.length !== 1) return;
    const arrow = selectedElements[0];
    const arrowheadVal = type === "none" ? null : type;
    const updated = excalidrawAPI.getSceneElements().map((e: any) =>
      e.id === arrow.id
        ? {
            ...e,
            endArrowhead: arrowheadVal,
            updated: Date.now(),
            version: e.version + 1,
            versionNonce: Math.floor(Math.random() * 999999)
          }
        : e
    );
    excalidrawAPI.updateScene({ elements: updated });
    forceUpdate();
  };

  const alignElements = (direction: "horizontal" | "vertical") => {
    if (!excalidrawAPI || selectedElements.length <= 1) return;
    const minX = Math.min(...selectedElements.map((e: any) => e.x));
    const maxX = Math.max(...selectedElements.map((e: any) => e.x + e.width));
    const minY = Math.min(...selectedElements.map((e: any) => e.y));
    const maxY = Math.max(...selectedElements.map((e: any) => e.y + e.height));

    const targetCx = (minX + maxX) / 2;
    const targetCy = (minY + maxY) / 2;

    const updated = excalidrawAPI.getSceneElements().map((e: any) => {
      if (selectedElements.some((sel: any) => sel.id === e.id)) {
        const elCx = e.x + e.width / 2;
        const elCy = e.y + e.height / 2;
        const diffX = targetCx - elCx;
        const diffY = targetCy - elCy;
        
        return {
          ...e,
          x: direction === "horizontal" ? e.x + diffX : e.x,
          y: direction === "vertical" ? e.y + diffY : e.y,
          updated: Date.now(),
          version: e.version + 1,
          versionNonce: Math.floor(Math.random() * 999999)
        };
      }
      return e;
    });
    excalidrawAPI.updateScene({ elements: updated });
    forceUpdate();
  };

  // Local property states for instant reactivity
  const [strokeColor, setStrokeColor] = useState<string>("#1e293b");
  const [fillColor, setFillColor] = useState<string>("#1e293b");
  const [strokeWidth, setStrokeWidth] = useState<number>(1);
  const [opacity, setOpacity] = useState<number>(100);
  const [roughness, setRoughness] = useState<number>(0);

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

  // Close main shapes dropdown on outside click
  useEffect(() => {
    if (!isMainShapeDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (mainShapeDropdownRef.current && !mainShapeDropdownRef.current.contains(e.target as Node)) {
        setIsMainShapeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isMainShapeDropdownOpen]);

  const getAppState = () => {
    if (!excalidrawAPI) return null;
    try {
      return excalidrawAPI.getAppState();
    } catch (_) {
      return null;
    }
  };

  const getSelectedElements = () => {
    if (!excalidrawAPI) return [];
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
        id => appState.selectedElementIds[id]
      );
      return elements.filter((el: any) => selectedIds.includes(el.id) && !el.isDeleted);
    } catch (_) {
      return [];
    }
  };

  // Synchronize local states when selection or component initial state changes
  useEffect(() => {
    try {
      const selected = getSelectedElements();
      if (selected.length > 0) {
        const first = selected[0];
        setStrokeColor(first.strokeColor ?? "#1e293b");
        setFillColor(first.backgroundColor ?? "transparent");
        setStrokeWidth(first.strokeWidth ?? 1);
        setOpacity(first.opacity ?? 100);
        setRoughness(first.roughness ?? 0);
      } else {
        const appState = getAppState();
        if (appState) {
          setStrokeColor(appState.currentItemStrokeColor ?? "#1e293b");
          setFillColor(appState.currentItemBackgroundColor ?? "transparent");
          setStrokeWidth(appState.currentItemStrokeWidth ?? 1);
          setOpacity(appState.currentItemOpacity ?? 100);
          setRoughness(appState.currentItemRoughness ?? 0);
        }
      }
    } catch (_) {}
  }, [selectedContainer, excalidrawAPI, activeTool]);

  const selectedEls = getSelectedElements();
  const isSelectedLocked = selectedEls[0]?.locked ?? false;

  const updateStrokeColor = (color: string) => {
    setStrokeColor(color);

    const selected = getSelectedElements();
    const isShape = ["rectangle", "ellipse", "diamond"].includes(activeTool) || 
                    (activeTool === "selection" && selected.length > 0 && ["rectangle", "ellipse", "diamond"].includes(selected[0].type));
    const isPen = ["freedraw", "line", "arrow"].includes(activeTool) ||
                  (activeTool === "selection" && selected.length > 0 && ["freedraw", "line", "arrow", "pencil"].includes(selected[0].type));
    
    if (isShape) {
      lastShapeStrokeColorRef.current = color;
    } else if (isPen) {
      lastPenStrokeColorRef.current = color;
    }

    if (!excalidrawAPI) return;
    if (selected.length > 0) {
      excalidrawAPI.updateScene({
        elements: excalidrawAPI.getSceneElements().map((el: any) => 
          selected.some((sel: any) => sel.id === el.id) ? { ...el, strokeColor: color } : el
        )
      });
    }
    excalidrawAPI.updateScene({ appState: { currentItemStrokeColor: color } });
  };

  const updateFillColor = (color: string) => {
    setFillColor(color);
    if (!excalidrawAPI) return;
    const selected = getSelectedElements();
    if (selected.length > 0) {
      excalidrawAPI.updateScene({
        elements: excalidrawAPI.getSceneElements().map((el: any) => 
          selected.some((sel: any) => sel.id === el.id) ? { ...el, backgroundColor: color } : el
        )
      });
    }
    excalidrawAPI.updateScene({ appState: { currentItemBackgroundColor: color } });
  };

  const updateStrokeWidth = (width: number) => {
    setStrokeWidth(width);

    const selected = getSelectedElements();
    const isShape = ["rectangle", "ellipse", "diamond"].includes(activeTool) || 
                    (activeTool === "selection" && selected.length > 0 && ["rectangle", "ellipse", "diamond"].includes(selected[0].type));
    const isPen = ["freedraw", "line", "arrow"].includes(activeTool) ||
                  (activeTool === "selection" && selected.length > 0 && ["freedraw", "line", "arrow", "pencil"].includes(selected[0].type));
    
    if (isShape) {
      lastShapeStrokeWidthRef.current = width;
    } else if (isPen) {
      lastPenStrokeWidthRef.current = width;
      if (activeTool === "freedraw") setPencilSize(width);
      else if (activeTool === "line") setLineSize(width);
      else if (activeTool === "arrow") setArrowSize(width);
    }

    if (!excalidrawAPI) return;
    if (selected.length > 0) {
      excalidrawAPI.updateScene({
        elements: excalidrawAPI.getSceneElements().map((el: any) => 
          selected.some((sel: any) => sel.id === el.id) ? { ...el, strokeWidth: width } : el
        )
      });
    }
    excalidrawAPI.updateScene({ appState: { currentItemStrokeWidth: width } });
  };

  const updateOpacity = (op: number) => {
    setOpacity(op);
    if (!excalidrawAPI) return;
    const selected = getSelectedElements();
    if (selected.length > 0) {
      excalidrawAPI.updateScene({
        elements: excalidrawAPI.getSceneElements().map((el: any) => 
          selected.some((sel: any) => sel.id === el.id) ? { ...el, opacity: op } : el
        )
      });
    }
    excalidrawAPI.updateScene({ appState: { currentItemOpacity: op } });
  };

  const updateRoughness = (r: number) => {
    setRoughness(r);
    if (!excalidrawAPI) return;
    const selected = getSelectedElements();
    if (selected.length > 0) {
      excalidrawAPI.updateScene({
        elements: excalidrawAPI.getSceneElements().map((el: any) => 
          selected.some((sel: any) => sel.id === el.id) ? { ...el, roughness: r } : el
        )
      });
    }
    excalidrawAPI.updateScene({ appState: { currentItemRoughness: r } });
  };

  const lockSelected = () => {
    if (!excalidrawAPI) return;
    const selected = getSelectedElements();
    if (selected.length === 0) return;
    const shouldLock = !selected[0].locked;
    excalidrawAPI.updateScene({
      elements: excalidrawAPI.getSceneElements().map((el: any) => 
        selected.some((sel: any) => sel.id === el.id) ? { ...el, locked: shouldLock } : el
      )
    });
    forceUpdate();
  };

  const deleteSelected = () => {
    if (!excalidrawAPI) return;
    const selected = getSelectedElements();
    if (selected.length === 0) return;
    excalidrawAPI.updateScene({
      elements: excalidrawAPI.getSceneElements().map((el: any) => 
        selected.some((sel: any) => sel.id === el.id) ? { ...el, isDeleted: true } : el
      )
    });
    forceUpdate();
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

  const handleToolSelect = (toolType: string) => {
    if (toolType === "text") {
      setCustomBlockType(customBlockType === "text" ? null : "text");
      if (excalidrawAPI) {
        excalidrawAPI.setActiveTool({ type: "text" });
        excalidrawAPI.updateScene({
          appState: {
            currentItemStrokeColor: theme === "dark" ? "#f4f4f5" : "#1a1a1a",
            currentItemStrokeWidth: 1,
            currentItemBackgroundColor: "transparent",
            currentItemFontSize: 16,
            currentItemFontFamily: FONT_FAMILY.Helvetica as number
          }
        });
      }
    } else if (toolType === "schema") {
      setCustomBlockType(customBlockType === "schema" ? null : "schema");
      if (excalidrawAPI) excalidrawAPI.setActiveTool({ type: "selection" });
    } else {
      setCustomBlockType(null);
      if (excalidrawAPI) {
        if (toolType === "rounded-rectangle") {
          excalidrawAPI.setActiveTool({ type: "rectangle" });
        } else {
          excalidrawAPI.setActiveTool({ type: toolType });
        }
        
        const isShape = ["rectangle", "ellipse", "diamond", "rounded-rectangle"].includes(toolType);
        const isPen = ["freedraw", "line", "arrow"].includes(toolType);
        
        if (isPen) {
          const color = lastPenStrokeColorRef.current || "#1e293b";
          let sWidth = lastPenStrokeWidthRef.current;
          if (toolType === "freedraw") sWidth = pencilSize;
          else if (toolType === "line") sWidth = lineSize;
          else if (toolType === "arrow") sWidth = arrowSize;
          
          excalidrawAPI.updateScene({
            appState: {
              currentItemStrokeColor: color,
              currentItemStrokeWidth: sWidth
            }
          });
          setStrokeColor(color);
          setStrokeWidth(sWidth);
        } else if (isShape) {
          const color = lastShapeStrokeColorRef.current;
          const width = lastShapeStrokeWidthRef.current;
          const roundnessVal = toolType === "rounded-rectangle" ? { type: 3, value: 8 } : null;
          
          excalidrawAPI.updateScene({
            appState: {
              currentItemStrokeColor: color,
              currentItemStrokeWidth: width,
              currentItemRoundness: roundnessVal,
              currentItemBackgroundColor: "#1e293b"
            }
          });
          setStrokeColor(color);
          setStrokeWidth(width);
        }
      }
    }
  };

  const getCanvasCenter = () => {
    if (!excalidrawAPI) return { cx: 100, cy: 100 };
    try {
      const appState = excalidrawAPI.getAppState();
      const containerEl = document.querySelector(".canvas-wrapper");
      if (!containerEl) return { cx: 100, cy: 100 };
      const rect = containerEl.getBoundingClientRect();
      const screenX = rect.left + rect.width / 2;
      const screenY = rect.top + rect.height / 2;
      const canvasCoords = screenToCanvas(screenX, screenY, appState, rect);
      return {
        cx: canvasCoords.x,
        cy: canvasCoords.y
      };
    } catch (_) {
      return { cx: 100, cy: 100 };
    }
  };

  // Helper box container elements creator (with custom pre-defined ID)
  const createBox = (rectId: string, text: string, x: number, y: number, w: number, h: number, bgColor: string, strokeColor: string, textColor: string) => {
    const textId = `text-${rectId}-${Math.floor(Math.random() * 99999)}`;
    
    const rect = {
      id: rectId,
      type: "rectangle",
      x,
      y,
      width: w,
      height: h,
      angle: 0,
      strokeColor,
      backgroundColor: bgColor,
      fillStyle: "solid",
      strokeWidth: 2,
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
      customData: { isSchemaElement: true }
    };

    const txt = {
      id: textId,
      type: "text",
      x: x + 8,
      y: y + 8,
      width: w - 16,
      height: h - 16,
      angle: 0,
      strokeColor: textColor,
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
      text,
      fontSize: 14,
      fontFamily: FONT_FAMILY.Helvetica as number,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: rectId,
      originalText: text,
      lineHeight: 1.3,
      autoResize: true
    };

    return [rect, txt];
  };

  const createEllipse = (elId: string, text: string, x: number, y: number, w: number, h: number, bgColor: string, strokeColor: string, textColor: string) => {
    const textId = `text-${elId}-${Math.floor(Math.random() * 99999)}`;
    
    const ellipse = {
      id: elId,
      type: "ellipse",
      x,
      y,
      width: w,
      height: h,
      angle: 0,
      strokeColor,
      backgroundColor: bgColor,
      fillStyle: "solid",
      strokeWidth: 2,
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
      customData: { isSchemaElement: true }
    };

    const txt = {
      id: textId,
      type: "text",
      x: x + 8,
      y: y + 8,
      width: w - 16,
      height: h - 16,
      angle: 0,
      strokeColor: textColor,
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
      text,
      fontSize: 14,
      fontFamily: FONT_FAMILY.Helvetica as number,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: elId,
      originalText: text,
      lineHeight: 1.3,
      autoResize: true
    };

    return [ellipse, txt];
  };

  const createDiamond = (diaId: string, text: string, x: number, y: number, w: number, h: number, bgColor: string, strokeColor: string, textColor: string) => {
    const textId = `text-${diaId}-${Math.floor(Math.random() * 99999)}`;
    
    const diamond = {
      id: diaId,
      type: "diamond",
      x,
      y,
      width: w,
      height: h,
      angle: 0,
      strokeColor,
      backgroundColor: bgColor,
      fillStyle: "solid",
      strokeWidth: 2,
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
      customData: { isSchemaElement: true }
    };

    const txt = {
      id: textId,
      type: "text",
      x: x + 8,
      y: y + 8,
      width: w - 16,
      height: h - 16,
      angle: 0,
      strokeColor: textColor,
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
      text,
      fontSize: 14,
      fontFamily: FONT_FAMILY.Helvetica as number,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: diaId,
      originalText: text,
      lineHeight: 1.3,
      autoResize: true
    };

    return [diamond, txt];
  };

  const createSchema = (schemaType: string) => {
    if (!excalidrawAPI) return;
    const { cx, cy } = getCanvasCenter();
    const newElements: any[] = [];
    
    const nextSeed = () => Math.floor(Math.random() * 999999);
    
    // Bound Arrow builder (Updates bidirectional startBinding and endBinding)
    const addBoundArrow = (startBoxId: string, endBoxId: string, startPoint: [number, number], endPoint: [number, number], labelText?: string) => {
      const arrowId = `arrow-${nextSeed()}`;
      const arrow = {
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
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        points: [[0, 0], [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]]],
        lastCommittedPoint: null,
        startBinding: { elementId: startBoxId, focus: 0, gap: 4 },
        endBinding: { elementId: endBoxId, focus: 0, gap: 4 },
        startArrowhead: null,
        endArrowhead: null
      };

      newElements.push(arrow);

      // Mutate startShape and endShape to declare the incoming/outgoing arrow
      const startShape = newElements.find(e => e.id === startBoxId);
      if (startShape) {
        if (!startShape.boundElements) startShape.boundElements = [];
        startShape.boundElements.push({ id: arrowId, type: "arrow" });
      }

      const endShape = newElements.find(e => e.id === endBoxId);
      if (endShape) {
        if (!endShape.boundElements) endShape.boundElements = [];
        endShape.boundElements.push({ id: arrowId, type: "arrow" });
      }

      if (labelText) {
        const textId = `text-label-${nextSeed()}`;
        const labelTextEl = {
          id: textId,
          type: "text",
          x: startPoint[0] + (endPoint[0] - startPoint[0]) / 2 - 20,
          y: startPoint[1] + (endPoint[1] - startPoint[1]) / 2 - 15,
          width: 40,
          height: 20,
          angle: 0,
          strokeColor: theme === "dark" ? "#f4f4f5" : "#18181b",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: null,
          seed: nextSeed(),
          version: 1,
          versionNonce: nextSeed(),
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: false,
          text: labelText,
          fontSize: 12,
          fontFamily: FONT_FAMILY.Helvetica as number,
          textAlign: "center",
          verticalAlign: "middle",
          containerId: null,
          originalText: labelText,
          lineHeight: 1.3
        };
        newElements.push(labelTextEl);
      }
    };

    if (schemaType === "mindmap") {
      newElements.push(...createBox("mm-center", isTr ? "Ana Fikir" : "Main Idea", cx - 75, cy - 25, 150, 50, "#0891B2", "#0891B2", "#ffffff"));
      
      newElements.push(...createBox("mm-dal1", isTr ? "Dal 1" : "Branch 1", cx + 175, cy - 105, 100, 40, theme === "dark" ? "#1e293b" : "#f1f5f9", "#0891B2", theme === "dark" ? "#f4f4f5" : "#18181b"));
      addBoundArrow("mm-center", "mm-dal1", [cx + 75, cy - 10], [cx + 175, cy - 80]);

      newElements.push(...createBox("mm-dal2", isTr ? "Dal 2" : "Branch 2", cx + 175, cy - 20, 100, 40, theme === "dark" ? "#1e293b" : "#f1f5f9", "#0891B2", theme === "dark" ? "#f4f4f5" : "#18181b"));
      addBoundArrow("mm-center", "mm-dal2", [cx + 75, cy], [cx + 175, cy]);

      newElements.push(...createBox("mm-dal3", isTr ? "Dal 3" : "Branch 3", cx + 175, cy + 60, 100, 40, theme === "dark" ? "#1e293b" : "#f1f5f9", "#0891B2", theme === "dark" ? "#f4f4f5" : "#18181b"));
      addBoundArrow("mm-center", "mm-dal3", [cx + 75, cy + 10], [cx + 175, cy + 80]);
    
    } else if (schemaType === "flowchart") {
      newElements.push(...createEllipse("fc-start", isTr ? "Başlangıç" : "Start", cx - 50, cy - 180, 100, 50, theme === "dark" ? "#3f3f46" : "#e2e8f0", "#64748b", theme === "dark" ? "#f4f4f5" : "#18181b"));
      newElements.push(...createBox("fc-step1", isTr ? "Adım 1" : "Step 1", cx - 60, cy - 80, 120, 50, "#0891B2", "#0891B2", "#ffffff"));
      addBoundArrow("fc-start", "fc-step1", [cx, cy - 130], [cx, cy - 80]);

      newElements.push(...createDiamond("fc-decision", isTr ? "Karar?" : "Decision?", cx - 60, cy + 10, 120, 80, theme === "dark" ? "#3f3f46" : "#e2e8f0", "#64748b", theme === "dark" ? "#f4f4f5" : "#18181b"));
      addBoundArrow("fc-step1", "fc-decision", [cx, cy - 30], [cx, cy + 10]);
      
      newElements.push(...createBox("fc-evet", isTr ? "İşlemi Tamamla" : "Complete Process", cx + 160, cy + 25, 120, 50, "#0891B2", "#0891B2", "#ffffff"));
      addBoundArrow("fc-decision", "fc-evet", [cx + 60, cy + 50], [cx + 160, cy + 50], isTr ? "Evet" : "Yes");

      newElements.push(...createBox("fc-hayir", isTr ? "Geri Dön" : "Go Back", cx - 60, cy + 180, 120, 50, "#ef4444", "#dc2626", "#ffffff"));
      addBoundArrow("fc-decision", "fc-hayir", [cx, cy + 90], [cx, cy + 180], isTr ? "Hayır" : "No");

    } else if (schemaType === "orgchart") {
      newElements.push(...createBox("oc-ceo", "CEO", cx - 60, cy - 150, 120, 45, "#0891B2", "#0891B2", "#ffffff"));
      
      newElements.push(...createBox("oc-m1", isTr ? "Müdür 1" : "Manager 1", cx - 240, cy - 50, 120, 40, "#06b6d4", "#0891B2", "#ffffff"));
      addBoundArrow("oc-ceo", "oc-m1", [cx, cy - 105], [cx - 180, cy - 50]);

      newElements.push(...createBox("oc-m2", isTr ? "Müdür 2" : "Manager 2", cx - 60, cy - 50, 120, 40, "#06b6d4", "#0891B2", "#ffffff"));
      addBoundArrow("oc-ceo", "oc-m2", [cx, cy - 105], [cx, cy - 50]);

      newElements.push(...createBox("oc-m3", isTr ? "Müdür 3" : "Manager 3", cx + 120, cy - 50, 120, 40, "#06b6d4", "#0891B2", "#ffffff"));
      addBoundArrow("oc-ceo", "oc-m3", [cx, cy - 105], [cx + 180, cy - 50]);

      // Employee arrows & boxes
      newElements.push(...createBox("oc-e11", isTr ? "Çalışan 1" : "Staff 1", cx - 290, cy + 50, 90, 35, theme === "dark" ? "#1e293b" : "#f1f5f9", "#cbd5e1", theme === "dark" ? "#f4f4f5" : "#334155"));
      addBoundArrow("oc-m1", "oc-e11", [cx - 180, cy - 10], [cx - 240, cy + 50]);

      newElements.push(...createBox("oc-e12", isTr ? "Çalışan 2" : "Staff 2", cx - 180, cy + 50, 90, 35, theme === "dark" ? "#1e293b" : "#f1f5f9", "#cbd5e1", theme === "dark" ? "#f4f4f5" : "#334155"));
      addBoundArrow("oc-m1", "oc-e12", [cx - 180, cy - 10], [cx - 140, cy + 50]);

      newElements.push(...createBox("oc-e21", isTr ? "Çalışan 3" : "Staff 3", cx - 100, cy + 50, 90, 35, theme === "dark" ? "#1e293b" : "#f1f5f9", "#cbd5e1", theme === "dark" ? "#f4f4f5" : "#334155"));
      addBoundArrow("oc-m2", "oc-e21", [cx, cy - 10], [cx - 50, cy + 50]);

      newElements.push(...createBox("oc-e22", isTr ? "Çalışan 4" : "Staff 4", cx + 10, cy + 50, 90, 35, theme === "dark" ? "#1e293b" : "#f1f5f9", "#cbd5e1", theme === "dark" ? "#f4f4f5" : "#334155"));
      addBoundArrow("oc-m2", "oc-e22", [cx, cy - 10], [cx + 50, cy + 50]);

      newElements.push(...createBox("oc-e31", isTr ? "Çalışan 5" : "Staff 5", cx + 90, cy + 50, 90, 35, theme === "dark" ? "#1e293b" : "#f1f5f9", "#cbd5e1", theme === "dark" ? "#f4f4f5" : "#334155"));
      addBoundArrow("oc-m3", "oc-e31", [cx + 180, cy - 10], [cx + 135, cy + 50]);

      newElements.push(...createBox("oc-e32", isTr ? "Çalışan 6" : "Staff 6", cx + 200, cy + 50, 90, 35, theme === "dark" ? "#1e293b" : "#f1f5f9", "#cbd5e1", theme === "dark" ? "#f4f4f5" : "#334155"));
      addBoundArrow("oc-m3", "oc-e32", [cx + 180, cy - 10], [cx + 225, cy + 50]);

    } else if (schemaType === "kanban") {
      newElements.push(...createBox("kb-col1", isTr ? "Yapılacak" : "To-Do", cx - 220, cy - 150, 130, 35, "#fee2e2", "#ef4444", "#ef4444"));
      newElements.push(...createBox("kb-card11", isTr ? "Arayüz Tasarımı" : "UI Design", cx - 220, cy - 100, 130, 45, "#fef9c3", "#eab308", "#854d0e"));
      newElements.push(...createBox("kb-card12", isTr ? "API Bağlantısı" : "API Integration", cx - 220, cy - 45, 130, 45, "#fef9c3", "#eab308", "#854d0e"));

      newElements.push(...createBox("kb-col2", isTr ? "Devam Eden" : "In Progress", cx - 60, cy - 150, 130, 35, "#dbeafe", "#3b82f6", "#3b82f6"));
      newElements.push(...createBox("kb-card21", isTr ? "Veritabanı Ayarı" : "DB Configuration", cx - 60, cy - 100, 130, 45, "#dbeafe", "#3b82f6", "#1e3a8a"));
      newElements.push(...createBox("kb-card22", isTr ? "Test Yazımı" : "Write Tests", cx - 60, cy - 45, 130, 45, "#dbeafe", "#3b82f6", "#1e3a8a"));

      newElements.push(...createBox("kb-col3", isTr ? "Tamamlandı" : "Completed", cx + 100, cy - 150, 130, 35, "#dcfce7", "#22c55e", "#15803d"));
      newElements.push(...createBox("kb-card31", isTr ? "Gereksinim Analizi" : "Requirements Anal.", cx + 100, cy - 100, 130, 45, "#dcfce7", "#22c55e", "#15803d"));
    }

    const currentElements = excalidrawAPI.getSceneElements();
    const updatedElements = [...currentElements, ...newElements];
    excalidrawAPI.updateScene({ elements: updatedElements });
    
    setTimeout(() => {
      try {
        excalidrawAPI.scrollToContent(newElements, { animate: false, fitToContent: false });
      } catch (err) {
        console.error("scrollToContent error:", err);
      }
    }, 100);

    setCustomBlockType(null);
  };
  const currentRoundness = excalidrawAPI?.getAppState()?.currentItemRoundness ?? null;

  const mainTools = [
    { type: "selection", icon: MousePointer2, label: t("canvas.tool.select", "Seç") },
    { type: "hand", icon: Hand, label: t("canvas.tool.hand", "Kaydır") },
    { type: "shapes-dropdown", label: isTr ? "Şekiller" : "Shapes", isShapeGroup: true },
    { type: "arrow", icon: ArrowRight, label: t("canvas.tool.arrow", "Ok") },
    { type: "line", icon: Slash, label: t("canvas.tool.line", "Çizgi") },
    { type: "freedraw", icon: PenTool, label: t("canvas.tool.freedraw", "Kalem") },
    { type: "image", icon: ImageIcon, label: t("canvas.tool.image", "Görsel") },
    { type: "frame", icon: Frame, label: t("canvas.tool.frame", "Çerçeve") },
    { type: "eraser", icon: Eraser, label: t("canvas.tool.eraser", "Silgi") },
    { type: "text", icon: Type, label: t("canvas.tool.text", "Metin Kutusu") },
    { type: "font", icon: Type, label: "Aa" },
    { type: "schema", icon: Network, label: isTr ? "Şablon Şemalar" : "Schemas" }
  ];

  // Determine category of options to show in the animated mini bar
  let miniBarCategory: "pen" | "shape" | "text" | "selection" | "schema" | null = null;

  if (["freedraw", "line", "arrow"].includes(activeTool)) {
    miniBarCategory = "pen";
  } else if (["rectangle", "diamond", "ellipse"].includes(activeTool)) {
    miniBarCategory = "shape";
  } else if (customBlockType && ["text", "h1", "h2", "h3", "h4", "h5", "h6"].includes(customBlockType)) {
    miniBarCategory = "text";
  } else if (customBlockType === "schema") {
    miniBarCategory = "schema";
  } else if (activeTool === "selection" && selectedElements.length > 0) {
    miniBarCategory = "selection";
  }

  const strokePresets = ["#1e293b", "#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed"];
  const fillPresets = ["#f8fafc", "#fee2e2", "#dbeafe", "#dcfce7", "#fef9c3", "#f3e8ff"];

  return (
    <>
      {/* 2. ÜST MİNİ BAR (Araç seçilince veya element seçilince animasyonlu gelir) */}
      {miniBarCategory && (
        <div className={`canvas-mini-bar-container ${isToolbarHidden ? "dragging" : ""}`}
             style={miniBarCategory === "selection" && floatingPos ? {
               position: "fixed",
               left: `${floatingPos.left}px`,
               top: `${floatingPos.top}px`,
               transform: "none",
               bottom: "auto"
             } : undefined}
        >
          <div className="canvas-mini-bar" onMouseDown={e => e.stopPropagation()}>
            {miniBarCategory === "pen" && (
              <div className="mini-bar-group">
                {/* Stroke Color */}
                <div className="mini-bar-section">
                  <span className="mini-bar-label">{isTr ? "Renk:" : "Color:"}</span>
                  <div className="mini-bar-palette">
                    {strokePresets.map((color, index) => (
                      <button
                        key={`color-${index}-${color}`}
                        type="button"
                        className={`mini-bar-swatch ${strokeColor === color ? "active" : ""}`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateStrokeColor(color)}
                      />
                    ))}
                    <input
                      type="color"
                      className="mini-bar-color-input"
                      value={strokeColor?.startsWith("#") ? strokeColor : "#000000"}
                      onChange={e => updateStrokeColor(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Thickness */}
                <div className="mini-bar-separator" />
                <div className="mini-bar-section">
                  <span className="mini-bar-label">{isTr ? "Kalınlık:" : "Size:"}</span>
                  <div className="mini-bar-options">
                    {[1, 2, 4].map(w => {
                      let isAct = false;
                      if (activeTool === "freedraw") isAct = pencilSize === w;
                      else if (activeTool === "line") isAct = lineSize === w;
                      else if (activeTool === "arrow") isAct = arrowSize === w;

                      return (
                        <button
                          key={w}
                          type="button"
                          className={`mini-bar-option-btn ${isAct ? "active" : ""}`}
                          onClick={() => {
                            if (activeTool === "freedraw") setPencilSize(w);
                            else if (activeTool === "line") setLineSize(w);
                            else if (activeTool === "arrow") setArrowSize(w);
                            lastPenStrokeWidthRef.current = w;
                            if (excalidrawAPI) excalidrawAPI.updateScene({ appState: { currentItemStrokeWidth: w } });
                          }}
                        >
                          {w === 1 ? (isTr ? "İnce" : "Thin") : w === 2 ? (isTr ? "Orta" : "Medium") : (isTr ? "Kalın" : "Thick")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Opacity */}
                <div className="mini-bar-separator" />
                <div className="mini-bar-section">
                  <span className="mini-bar-label">{isTr ? "Opaklık:" : "Opacity:"}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="mini-bar-slider"
                    value={opacity}
                    onChange={e => updateOpacity(parseInt(e.target.value))}
                  />
                  <span className="mini-bar-value">{opacity}%</span>
                </div>
              </div>
            )}

            {miniBarCategory === "shape" && (
              <div className="mini-bar-group">
                {/* Stroke Color */}
                <div className="mini-bar-section">
                  <span className="mini-bar-label">{isTr ? "Kenar:" : "Border:"}</span>
                  <div className="mini-bar-palette">
                    {strokePresets.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`mini-bar-swatch ${strokeColor === color ? "active" : ""}`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateStrokeColor(color)}
                      />
                    ))}
                  </div>
                </div>

                {/* Fill Color */}
                <div className="mini-bar-separator" />
                <div className="mini-bar-section">
                  <span className="mini-bar-label">{isTr ? "Dolgu:" : "Fill:"}</span>
                  <div className="mini-bar-palette">
                    {/* Transparent button — separate from color inputs */}
                    <button
                      type="button"
                      className={`mini-bar-swatch swatch-transparent ${fillColor === "transparent" ? "active" : ""}`}
                      style={{ backgroundColor: "transparent" }}
                      onClick={() => updateFillColor("transparent")}
                      title={isTr ? "Şeffaf" : "Transparent"}
                    />
                    {fillPresets.map((color, idx) => (
                      <button
                        key={`fill-${idx}-${color}`}
                        type="button"
                        className={`mini-bar-swatch ${fillColor === color ? "active" : ""}`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateFillColor(color)}
                      />
                    ))}
                  </div>
                </div>

                {/* Thickness */}
                <div className="mini-bar-separator" />
                <div className="mini-bar-section">
                  <span className="mini-bar-label">{isTr ? "Kalınlık:" : "Size:"}</span>
                  <div className="mini-bar-options">
                    {[1, 2, 4].map(w => (
                      <button
                        key={w}
                        type="button"
                        className={`mini-bar-option-btn ${strokeWidth === w ? "active" : ""}`}
                        onClick={() => updateStrokeWidth(w)}
                      >
                        {w === 1 ? (isTr ? "İnce" : "Thin") : w === 2 ? (isTr ? "Orta" : "Medium") : (isTr ? "Kalın" : "Thick")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Roughness */}
                <div className="mini-bar-separator" />
                <div className="mini-bar-section">
                  <span className="mini-bar-label">{isTr ? "Stil:" : "Style:"}</span>
                  <div className="mini-bar-options">
                    {[0, 1].map(r => (
                      <button
                        key={r}
                        type="button"
                        className={`mini-bar-option-btn ${roughness === r ? "active" : ""}`}
                        onClick={() => updateRoughness(r)}
                      >
                        {r === 0 ? (isTr ? "Düz" : "Smooth") : (isTr ? "El Çizimi" : "Handdrawn")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {miniBarCategory === "text" && (
              <div className="mini-bar-group">
                {["text", "h1", "h2", "h3", "h4", "h5", "h6"].map(tType => {
                  const label = tType === "text" ? "T" : tType.toUpperCase();
                  const isOptionActive = customBlockType === tType;
                  return (
                    <button
                      key={tType}
                      type="button"
                      className={`mini-bar-option-btn ${isOptionActive ? "active" : ""}`}
                      onClick={() => setCustomBlockType(tType)}
                      style={{ fontWeight: "bold", minWidth: "36px" }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {miniBarCategory === "schema" && (
              <div className="mini-bar-group">
                <button
                  type="button"
                  className="mini-bar-option-btn"
                  onClick={() => createSchema("mindmap")}
                >
                  {isTr ? "Zihin Haritası" : "Mind Map"}
                </button>
                <button
                  type="button"
                  className="mini-bar-option-btn"
                  onClick={() => createSchema("flowchart")}
                >
                  {isTr ? "Akış Şeması" : "Flowchart"}
                </button>
                <button
                  type="button"
                  className="mini-bar-option-btn"
                  onClick={() => createSchema("orgchart")}
                >
                  {isTr ? "Organizasyon" : "Org Chart"}
                </button>
                <button
                  type="button"
                  className="mini-bar-option-btn"
                  onClick={() => createSchema("kanban")}
                >
                  Kanban
                </button>
              </div>
            )}

            {miniBarCategory === "selection" && (
              <div className="mini-bar-group">
                {/* 0. IMAGE SELECTED — crop */}
                {selectedElements.length === 1 && selectedElements[0].type === "image" && (
                  <button
                    type="button"
                    className="mini-bar-btn"
                    onClick={handleCropImage}
                    title={isTr ? "Görseli Kırp" : "Crop Image"}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px" }}
                  >
                    <Crop size={15} />
                    <span style={{ fontSize: "12px" }}>{isTr ? "Kırp" : "Crop"}</span>
                  </button>
                )}

                {/* 1. TEXT ELEMENT SELECTED OR CONTAINER WITH BOUND TEXT */}
                {activeText && (() => {
                  const rawSize = typeof activeText.fontSize === "object" ? (activeText.fontSize as any).size : (activeText.fontSize || 16);
                  return (
                    <>
                      {/* Font Dropdown */}
                      <select
                        value={getBaseFontFamily(activeText.fontFamily)}
                        onChange={e => updateTextProp("fontFamily", Number(e.target.value))}
                        className="mini-bar-select"
                        style={{
                          background: "var(--color-bg-card, #ffffff)",
                          border: "1px solid var(--color-border, #e5e7eb)",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          fontSize: "12px",
                          cursor: "pointer",
                          marginRight: "4px"
                        }}
                      >
                        {CANVAS_FONTS.map(f => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>

                      {/* Font Preset Dropdown */}
                      <div className="mini-bar-separator" />
                      <select
                        value={[16, 20, 28, 36].includes(Math.round(rawSize)) ? Math.round(rawSize) : ""}
                        onChange={e => updateTextProp("fontSize", Number(e.target.value))}
                        className="mini-bar-select"
                        style={{
                          background: "var(--color-bg-card, #ffffff)",
                          border: "1px solid var(--color-border, #e5e7eb)",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          fontSize: "12px",
                          cursor: "pointer",
                          marginRight: "4px"
                        }}
                      >
                        {![16, 20, 28, 36].includes(Math.round(rawSize)) && (
                          <option value="" disabled>{isTr ? `Özel (${Math.round(rawSize)}px)` : `Custom (${Math.round(rawSize)}px)`}</option>
                        )}
                        <option value={16}>{isTr ? "S (16px)" : "S (16px)"}</option>
                        <option value={20}>{isTr ? "M (20px)" : "M (20px)"}</option>
                        <option value={28}>{isTr ? "L (28px)" : "L (28px)"}</option>
                        <option value={36}>{isTr ? "XL (36px)" : "XL (36px)"}</option>
                      </select>

                      {/* Alignments */}
                      <div className="mini-bar-separator" />
                      {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as Array<[string, any]>).map(([align, Icon]) => (
                        <button
                          key={align}
                          type="button"
                          className={`mini-bar-btn ${activeText.textAlign === align ? "active" : ""}`}
                          onClick={() => updateTextProp("textAlign", align)}
                        >
                          <Icon size={16} />
                        </button>
                      ))}

                      {/* Bold & Italic — disabled for fonts without a real variant (e.g. Bebas Neue) */}
                      <div className="mini-bar-separator" />
                      {(() => {
                        const caps = fontSupports(activeText.fontFamily);
                        return (
                          <>
                            <button
                              type="button"
                              className={`mini-bar-btn ${activeText.customData?.fontWeight === "bold" ? "active" : ""}`}
                              disabled={!caps.bold}
                              style={!caps.bold ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
                              title={!caps.bold ? (isTr ? "Bu yazı tipinde kalın yok" : "No bold for this font") : undefined}
                              onClick={() => caps.bold && updateTextCustomData("fontWeight", activeText.customData?.fontWeight === "bold" ? "normal" : "bold")}
                            >
                              <Bold size={16} />
                            </button>
                            <button
                              type="button"
                              className={`mini-bar-btn ${activeText.customData?.fontStyle === "italic" ? "active" : ""}`}
                              disabled={!caps.italic}
                              style={!caps.italic ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
                              title={!caps.italic ? (isTr ? "Bu yazı tipinde italik yok" : "No italic for this font") : undefined}
                              onClick={() => caps.italic && updateTextCustomData("fontStyle", activeText.customData?.fontStyle === "italic" ? "normal" : "italic")}
                            >
                              <Italic size={16} />
                            </button>
                          </>
                        );
                      })()}
                    </>
                  );
                })()}

                {/* Color Palette */}
                {activeText && (
                  <>
                    <div className="mini-bar-separator" />
                    <div className="mini-bar-palette">
                      {strokePresets.map((color, index) => (
                        <button
                          key={`textstroke-${index}-${color}`}
                          type="button"
                          className={`mini-bar-swatch ${activeText.strokeColor === color ? "active" : ""}`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateTextProp("strokeColor", color)}
                        />
                      ))}
                      <label
                        className="mini-bar-swatch"
                        style={{
                          borderRadius: "50%",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          border: "1.5px dashed var(--color-border, #e5e7eb)",
                          backgroundColor: "transparent",
                          position: "relative"
                        }}
                        title={isTr ? "Özel Renk" : "Custom Color"}
                      >
                        <Palette size={12} />
                        <input
                          type="color"
                          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                          value={activeText.strokeColor?.startsWith("#") ? activeText.strokeColor : "#000000"}
                          onChange={e => updateTextProp("strokeColor", e.target.value)}
                        />
                      </label>
                    </div>
                  </>
                )}

                {/* 2. RECTANGLE / ELLIPSE / DIAMOND SELECTED */}
                {selectedElements.length === 1 && (selectedElements[0].type === "rectangle" || selectedElements[0].type === "ellipse" || selectedElements[0].type === "diamond") && (
                  <>
                    {/* Fill Palette */}
                    <div className="mini-bar-section">
                      <span className="mini-bar-label">{isTr ? "Dolgu:" : "Fill:"}</span>
                      <div className="mini-bar-palette">
                        {/* Transparent fill button */}
                        <button
                          type="button"
                          className={`mini-bar-swatch swatch-transparent ${selectedElements[0].backgroundColor === "transparent" ? "active" : ""}`}
                          style={{ backgroundColor: "transparent" }}
                          onClick={() => {
                            const updated = excalidrawAPI.getSceneElements().map((e: any) =>
                              e.id === selectedElements[0].id
                                ? { ...e, backgroundColor: "transparent", fillStyle: "hachure", updated: Date.now(), version: e.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                                : e
                            );
                            excalidrawAPI.updateScene({ elements: updated });
                            forceUpdate();
                          }}
                          title={isTr ? "Şeffaf" : "Transparent"}
                        />
                        {fillPresets.map((color, idx) => (
                          <button
                            key={`selfill-${idx}-${color}`}
                            type="button"
                            className={`mini-bar-swatch ${selectedElements[0].backgroundColor === color ? "active" : ""}`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              const updated = excalidrawAPI.getSceneElements().map((e: any) =>
                                e.id === selectedElements[0].id
                                  ? { ...e, backgroundColor: color, fillStyle: "solid", updated: Date.now(), version: e.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                                  : e
                              );
                              excalidrawAPI.updateScene({ elements: updated });
                              forceUpdate();
                            }}
                          />
                        ))}
                        <label
                          className="mini-bar-swatch"
                          style={{
                            borderRadius: "50%",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            border: "1.5px dashed var(--color-border, #e5e7eb)",
                            backgroundColor: "transparent",
                            position: "relative"
                          }}
                          title={isTr ? "Özel Renk" : "Custom Color"}
                        >
                          <Palette size={12} />
                          <input
                            type="color"
                            style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                            value={(() => {
                              const bg = selectedElements[0].backgroundColor;
                              if (!bg || bg === "transparent" || !bg.startsWith("#")) return "#ffffff";
                              return bg;
                            })()}
                            onChange={e => {
                              const val = e.target.value;
                              const updated = excalidrawAPI.getSceneElements().map((el: any) =>
                                el.id === selectedElements[0].id
                                  ? { ...el, backgroundColor: val, fillStyle: "solid", updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                                  : el
                              );
                              excalidrawAPI.updateScene({ elements: updated });
                              forceUpdate();
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Stroke Width */}
                    <div className="mini-bar-separator" />
                    <div className="mini-bar-section">
                      <span className="mini-bar-label">{isTr ? "Kenar:" : "Stroke:"}</span>
                      <div className="mini-bar-options">
                        {[{ label: isTr ? "Yok" : "None", w: 0 }, { label: isTr ? "İnce" : "Thin", w: 1 }, { label: isTr ? "Orta" : "Med", w: 2 }, { label: isTr ? "Kalın" : "Thick", w: 4 }].map(opt => (
                          <button
                            key={opt.w}
                            type="button"
                            className={`mini-bar-option-btn ${selectedElements[0].strokeWidth === opt.w ? "active" : ""}`}
                            style={{ fontSize: "10px", minWidth: "28px" }}
                            onClick={() => {
                              const newColor = opt.w === 0 ? "transparent" : (selectedElements[0].strokeColor === "transparent" ? "#1e293b" : selectedElements[0].strokeColor);
                              const updated = excalidrawAPI.getSceneElements().map((e: any) =>
                                e.id === selectedElements[0].id
                                  ? { ...e, strokeWidth: opt.w, strokeColor: newColor, updated: Date.now(), version: e.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                                  : e
                              );
                              excalidrawAPI.updateScene({ elements: updated });
                              lastShapeStrokeWidthRef.current = opt.w;
                              lastShapeStrokeColorRef.current = newColor;
                              excalidrawAPI.updateScene({
                                appState: {
                                  currentItemStrokeWidth: opt.w,
                                  currentItemStrokeColor: newColor
                                }
                              });
                              forceUpdate();
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stroke Color Palette (only if strokeWidth > 0) */}
                    {selectedElements[0].strokeWidth > 0 && (
                      <>
                        <div className="mini-bar-separator" />
                        <div className="mini-bar-palette">
                          {strokePresets.map((color, idx) => (
                            <button
                              key={`selstroke-${idx}-${color}`}
                              type="button"
                              className={`mini-bar-swatch ${selectedElements[0].strokeColor === color ? "active" : ""}`}
                              style={{ backgroundColor: color }}
                              onClick={() => {
                                const newWidth = selectedElements[0].strokeWidth === 0 ? 1 : selectedElements[0].strokeWidth;
                                const updated = excalidrawAPI.getSceneElements().map((e: any) =>
                                  e.id === selectedElements[0].id
                                    ? { ...e, strokeColor: color, strokeWidth: newWidth, updated: Date.now(), version: e.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                                    : e
                                );
                                excalidrawAPI.updateScene({ elements: updated });
                                lastShapeStrokeColorRef.current = color;
                                lastShapeStrokeWidthRef.current = newWidth;
                                excalidrawAPI.updateScene({
                                  appState: {
                                    currentItemStrokeColor: color,
                                    currentItemStrokeWidth: newWidth
                                  }
                                });
                                forceUpdate();
                              }}
                            />
                          ))}
                          <label
                            className="mini-bar-swatch"
                            style={{
                              borderRadius: "50%",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              border: "1.5px dashed var(--color-border, #e5e7eb)",
                              backgroundColor: "transparent",
                              position: "relative"
                            }}
                            title={isTr ? "Özel Renk" : "Custom Color"}
                          >
                            <Palette size={12} />
                            <input
                              type="color"
                              style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                              value={(() => {
                                const sc = selectedElements[0].strokeColor;
                                if (!sc || sc === "transparent" || !sc.startsWith("#")) return "#1e293b";
                                return sc;
                              })()}
                              onChange={e => {
                                const val = e.target.value;
                                const newWidth = selectedElements[0].strokeWidth === 0 ? 1 : selectedElements[0].strokeWidth;
                                const updated = excalidrawAPI.getSceneElements().map((el: any) =>
                                  el.id === selectedElements[0].id
                                    ? { ...el, strokeColor: val, strokeWidth: newWidth, updated: Date.now(), version: el.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                                    : el
                                );
                                excalidrawAPI.updateScene({ elements: updated });
                                lastShapeStrokeColorRef.current = val;
                                lastShapeStrokeWidthRef.current = newWidth;
                                excalidrawAPI.updateScene({
                                  appState: {
                                    currentItemStrokeColor: val,
                                    currentItemStrokeWidth: newWidth
                                  }
                                });
                                forceUpdate();
                              }}
                            />
                          </label>
                        </div>
                      </>
                    )}

                    {/* Add Text */}
                    {!activeText && (
                      <>
                        <div className="mini-bar-separator" />
                        <button
                          type="button"
                          className="mini-bar-btn"
                          onClick={handleAddTextToShape}
                          title={isTr ? "Metin Ekle" : "Add Text"}
                        >
                          <Type size={16} />
                        </button>
                      </>
                    )}

                    {/* Shape Selector Dropdown */}
                    <div className="mini-bar-separator" />
                    <div className="mini-bar-dropdown-container" style={{ position: "relative" }}>
                      <button
                        type="button"
                        className={`mini-bar-btn ${isShapeDropdownOpen ? "active" : ""}`}
                        onClick={() => setIsShapeDropdownOpen(!isShapeDropdownOpen)}
                        title={isTr ? "Şekil Değiştir" : "Change Shape"}
                        style={{ display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        {(() => {
                          const el = selectedElements[0];
                          if (el.type === "rectangle" && el.roundness === null) {
                            return <Square size={14} />;
                          } else if (el.type === "rectangle" && el.roundness !== null) {
                            return <RoundedSquareIcon size={14} />;
                          } else if (el.type === "ellipse") {
                            return <Circle size={14} />;
                          } else if (el.type === "diamond") {
                            return <Diamond size={14} />;
                          }
                          return <Square size={14} />;
                        })()}
                        <ChevronDown size={10} style={{ transform: isShapeDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                      </button>

                      {isShapeDropdownOpen && (
                        <div 
                          className="mini-bar-dropdown-list above" 
                          style={{
                            position: "absolute",
                            bottom: "calc(100% + 8px)",
                            left: "50%",
                            transform: "translateX(-50%)",
                            backgroundColor: "var(--color-bg-primary, #ffffff)",
                            border: "1.5px solid var(--color-border, #e4e4e7)",
                            borderRadius: "8px",
                            padding: "4px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            zIndex: 1000,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            minWidth: "150px"
                          }}
                        >
                          <button
                            type="button"
                            className={`mini-bar-dropdown-item ${selectedElements[0].type === "rectangle" && selectedElements[0].roundness === null ? "active" : ""}`}
                            onClick={() => {
                              changeShapeType("rectangle");
                              setIsShapeDropdownOpen(false);
                            }}
                          >
                            <Square size={14} />
                            <span>{isTr ? "Sivri Dikdörtgen" : "Sharp Rectangle"}</span>
                          </button>
                          <button
                            type="button"
                            className={`mini-bar-dropdown-item ${selectedElements[0].type === "rectangle" && selectedElements[0].roundness !== null ? "active" : ""}`}
                            onClick={() => {
                              changeShapeType("rounded-rectangle");
                              setIsShapeDropdownOpen(false);
                            }}
                          >
                            <RoundedSquareIcon size={14} />
                            <span>{isTr ? "Yumuşak Dikdörtgen" : "Soft Rectangle"}</span>
                          </button>
                          <button
                            type="button"
                            className={`mini-bar-dropdown-item ${selectedElements[0].type === "ellipse" ? "active" : ""}`}
                            onClick={() => {
                              changeShapeType("ellipse");
                              setIsShapeDropdownOpen(false);
                            }}
                          >
                            <Circle size={14} />
                            <span>{isTr ? "Daire" : "Circle"}</span>
                          </button>
                          <button
                            type="button"
                            className={`mini-bar-dropdown-item ${selectedElements[0].type === "diamond" ? "active" : ""}`}
                            onClick={() => {
                              changeShapeType("diamond");
                              setIsShapeDropdownOpen(false);
                            }}
                          >
                            <Diamond size={14} />
                            <span>{isTr ? "Elmas" : "Diamond"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 3. ARROW / LINE SELECTED */}
                {selectedElements.length === 1 && (selectedElements[0].type === "arrow" || selectedElements[0].type === "line") && (
                  <>
                    {/* Color Palette */}
                    <div className="mini-bar-palette">
                      {strokePresets.map((color, index) => (
                        <button
                          key={`arrstroke-${index}-${color}`}
                          type="button"
                          className={`mini-bar-swatch ${selectedElements[0].strokeColor === color ? "active" : ""}`}
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            const updated = excalidrawAPI.getSceneElements().map((e: any) =>
                              e.id === selectedElements[0].id
                                ? { ...e, strokeColor: color, updated: Date.now(), version: e.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                                : e
                            );
                            excalidrawAPI.updateScene({ elements: updated });
                            lastPenStrokeColorRef.current = color;
                            excalidrawAPI.updateScene({ appState: { currentItemStrokeColor: color } });
                            forceUpdate();
                          }}
                        />
                      ))}
                      <input
                        type="color"
                        className="mini-bar-color-input"
                        value={selectedElements[0].strokeColor?.startsWith("#") ? selectedElements[0].strokeColor : "#000000"}
                        onChange={ev => {
                          const val = ev.target.value;
                          const updated = excalidrawAPI.getSceneElements().map((e: any) =>
                            e.id === selectedElements[0].id
                              ? { ...e, strokeColor: val, updated: Date.now(), version: e.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                              : e
                          );
                          excalidrawAPI.updateScene({ elements: updated });
                          lastPenStrokeColorRef.current = val;
                          excalidrawAPI.updateScene({ appState: { currentItemStrokeColor: val } });
                          forceUpdate();
                        }}
                      />
                    </div>

                    {/* Thickness */}
                    <div className="mini-bar-separator" />
                    {[{ label: isTr ? "İnce" : "Thin", w: 1 }, { label: isTr ? "Orta" : "Med", w: 2 }, { label: isTr ? "Kalın" : "Thick", w: 4 }].map(tOpt => (
                      <button
                        key={tOpt.w}
                        type="button"
                        className={`mini-bar-option-btn ${selectedElements[0].strokeWidth === tOpt.w ? "active" : ""}`}
                        onClick={() => {
                          const updated = excalidrawAPI.getSceneElements().map((e: any) =>
                            e.id === selectedElements[0].id
                              ? { ...e, strokeWidth: tOpt.w, updated: Date.now(), version: e.version + 1, versionNonce: Math.floor(Math.random() * 999999) }
                              : e
                          );
                          excalidrawAPI.updateScene({ elements: updated });
                          lastPenStrokeWidthRef.current = tOpt.w;
                          excalidrawAPI.updateScene({ appState: { currentItemStrokeWidth: tOpt.w } });
                          forceUpdate();
                        }}
                        style={{ fontSize: "10px" }}
                      >
                        {tOpt.label}
                      </button>
                    ))}

                    {/* Arrowhead */}
                    {selectedElements[0].type === "arrow" && (
                      <>
                        <div className="mini-bar-separator" />
                        {[{ label: isTr ? "Düz" : "None", value: "none" }, { label: isTr ? "Ok" : "Arrow", value: "arrow" }, { label: isTr ? "Daire" : "Circle", value: "circle" }].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`mini-bar-option-btn ${((selectedElements[0].endArrowhead === null && opt.value === "none") || selectedElements[0].endArrowhead === opt.value) ? "active" : ""}`}
                            onClick={() => updateArrowhead(opt.value as any)}
                            style={{ fontSize: "10px" }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}

                {/* 4. MULTIPLE ELEMENTS SELECTED */}
                {selectedElements.length > 1 && (
                  <>
                    {/* Alignments */}
                    <button
                      type="button"
                      className="mini-bar-btn"
                      onClick={() => alignElements("horizontal")}
                      title={isTr ? "Yatay Ortala" : "Align Horizontally"}
                    >
                      <AlignHorizontalSpaceAround size={16} />
                    </button>
                    <button
                      type="button"
                      className="mini-bar-btn"
                      onClick={() => alignElements("vertical")}
                      title={isTr ? "Dikey Ortala" : "Align Vertically"}
                    >
                      <AlignVerticalSpaceAround size={16} />
                    </button>
                  </>
                )}

                {/* COMMON ACTIONS: LAYERING, LOCK, DELETE */}
                <div className="mini-bar-separator" />
                <button
                  type="button"
                  className="mini-bar-btn"
                  onClick={() => handleLayering("front")}
                  title={isTr ? "Öne Getir" : "Bring to Front"}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="mini-bar-btn"
                  onClick={() => handleLayering("back")}
                  title={isTr ? "Arkaya Gönder" : "Send to Back"}
                >
                  <ArrowDown size={16} />
                </button>

                <div className="mini-bar-separator" />
                <button
                  type="button"
                  className="mini-bar-btn"
                  onClick={lockSelected}
                  title={isSelectedLocked ? (isTr ? "Kilidi Aç" : "Unlock") : (isTr ? "Kilitle" : "Lock")}
                >
                  {isSelectedLocked ? <Unlock size={16} /> : <Lock size={16} />}
                </button>

                <button
                  type="button"
                  className="mini-bar-btn"
                  onClick={deleteSelected}
                  title={isTr ? "Sil" : "Delete"}
                  style={{ color: "#ef4444" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. ANA TOOLBAR (Alt, sabit ortalanmış) */}
      <div className="canvas-main-toolbar">
        {mainTools.map((tool, idx) => {
          if (tool.isShapeGroup) {
            const isActive = ["rectangle", "ellipse", "diamond"].includes(activeTool) && !customBlockType;
            return (
              <div
                key="shapes-dropdown-main"
                ref={mainShapeDropdownRef}
                style={{ position: "relative", display: "flex", alignItems: "center" }}
              >
                <button
                  type="button"
                  className={`toolbar-btn ${isActive ? "active" : ""} ${isMainShapeDropdownOpen ? "open" : ""}`}
                  onClick={() => setIsMainShapeDropdownOpen(!isMainShapeDropdownOpen)}
                  title={tool.label}
                >
                  <div className="shapes-fan-container">
                    <Square className="fan-icon fan-icon-1" size={11} />
                    <RoundedSquareIcon className="fan-icon fan-icon-2" size={11} />
                    <Circle className="fan-icon fan-icon-3" size={11} />
                    <Diamond className="fan-icon fan-icon-4" size={11} />
                  </div>
                  <ChevronDown size={8} style={{ marginLeft: 2, transform: isMainShapeDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {isMainShapeDropdownOpen && (
                  <div className="toolbar-shapes-dropdown above" onMouseDown={e => e.stopPropagation()}>
                    <div className="toolbar-shapes-dropdown-title">
                      {isTr ? "Şekiller" : "Shapes"}
                    </div>
                    <button
                      type="button"
                      className={`toolbar-shapes-option ${activeTool === "rectangle" && currentRoundness === null ? "active" : ""}`}
                      onClick={() => {
                        handleToolSelect("rectangle");
                        setIsMainShapeDropdownOpen(false);
                      }}
                    >
                      <Square size={14} />
                      <span>{isTr ? "Sivri Dikdörtgen" : "Sharp Rectangle"}</span>
                    </button>
                    <button
                      type="button"
                      className={`toolbar-shapes-option ${activeTool === "rectangle" && currentRoundness !== null ? "active" : ""}`}
                      onClick={() => {
                        handleToolSelect("rounded-rectangle");
                        setIsMainShapeDropdownOpen(false);
                      }}
                    >
                      <RoundedSquareIcon size={14} />
                      <span>{isTr ? "Yumuşak Dikdörtgen" : "Soft Rectangle"}</span>
                    </button>
                    <button
                      type="button"
                      className={`toolbar-shapes-option ${activeTool === "ellipse" ? "active" : ""}`}
                      onClick={() => {
                        handleToolSelect("ellipse");
                        setIsMainShapeDropdownOpen(false);
                      }}
                    >
                      <Circle size={14} />
                      <span>{isTr ? "Daire" : "Circle"}</span>
                    </button>
                    <button
                      type="button"
                      className={`toolbar-shapes-option ${activeTool === "diamond" ? "active" : ""}`}
                      onClick={() => {
                        handleToolSelect("diamond");
                        setIsMainShapeDropdownOpen(false);
                      }}
                    >
                      <Diamond size={14} />
                      <span>{isTr ? "Elmas" : "Diamond"}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          }

          if (tool.type === "font") {
            return (
              <div
                key="font-picker-dropdown"
                ref={fontPickerRef}
                style={{ position: "relative", display: "flex", alignItems: "center" }}
              >
                <button
                  type="button"
                  className={`toolbar-btn ${isFontPickerOpen ? "active" : ""}`}
                  onClick={() => setIsFontPickerOpen(!isFontPickerOpen)}
                  title={t("canvas.font.pick", "Font Seç")}
                >
                  <span style={{ fontSize: 13, fontWeight: "bold" }}>Aa</span>
                  <ChevronDown size={8} style={{ marginLeft: 2 }} />
                </button>
                {isFontPickerOpen && (
                  <div className="toolbar-font-dropdown above" onMouseDown={e => e.stopPropagation()}>
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
            );
          }

          const IconComponent = tool.icon as any;
          let isActive = false;
          if (tool.type === "text") {
            isActive = customBlockType === "text";
          } else if (tool.type === "schema") {
            isActive = customBlockType === "schema";
          } else {
            isActive = activeTool === tool.type && !customBlockType;
          }

          return (
            <button
              key={tool.type}
              type="button"
              className={`toolbar-btn ${isActive ? "active" : ""}`}
              onClick={() => handleToolSelect(tool.type)}
              title={tool.label}
            >
              <IconComponent size={20} />
            </button>
          );
        })}

        {/* Unlock All — visible when scene has locked elements */}
        {hasLockedElements && onUnlockAll && (
          <>
            <div className="toolbar-separator" />
            <button
              type="button"
              className="toolbar-btn"
              onClick={onUnlockAll}
              title={t("canvas.tool.unlockAll", "Tüm Kilitleri Aç")}
              style={{ color: "var(--color-accent)" }}
            >
              <Unlock size={20} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
