import { useState, useEffect, useRef } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNoteStore } from "../store/useNoteStore";
import { useTranslation } from "react-i18next";

export default function Canvas() {
  const { t, i18n } = useTranslation();
  const { activeNoteId, notes, theme } = useNoteStore();

  const [initialData, setInitialData] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
      console.log(`Saved canvas ${noteId} successfully.`);
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
        viewBackgroundColor: appState?.viewBackgroundColor || "#ffffff"
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
          <svg
            className="animate-spin"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }}
          >
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
          <h3>{i18n.language.startsWith("tr") ? "Yükleniyor..." : "Loading..."}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-container">
      <Excalidraw
        key={activeNoteId}
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
    </div>
  );
}
