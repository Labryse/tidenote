import { useEffect, useRef } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNoteStore } from "../store/useNoteStore";
import { useTranslation } from "react-i18next";
import { en } from "@blocknote/core/locales";

export default function Editor() {
  const { t, i18n } = useTranslation();
  const { activeNoteId, notes, theme } = useNoteStore();

  const trLocale = {
    ...en,
    drag_handle: {
      ...en.drag_handle,
      delete_menuitem: "Sil",
      colors_menuitem: "Renkler",
    },
  };

  const editor = useCreateBlockNote({
    dictionary: i18n.language.startsWith("tr") ? trLocale : undefined
  }, [i18n.language]);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const lastActiveNoteIdRef = useRef<string | null>(null);
  const lastLoadedContentRef = useRef<string>("");
  const isInitialLoadingRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ noteId: string; document: any[] } | null>(null);

  // Helper to parse notes content
  const parseContent = (content: any) => {
    if (!content) return [{ type: "paragraph", content: [] }];
    if (typeof content === "string") {
      try {
        return JSON.parse(content);
      } catch {
        return [{ type: "paragraph", content: [] }];
      }
    }
    return content;
  };

  // Direct sync function to save to Firestore
  const saveNoteToFirestore = async (noteId: string, document: any[]) => {
    try {
      let title = t("sidebar.untitledNote");
      const firstBlock = document[0];
      if (firstBlock) {
        let textContent = "";
        if (typeof firstBlock.content === "string") {
          textContent = firstBlock.content;
        } else if (Array.isArray(firstBlock.content)) {
          textContent = firstBlock.content
            .map((c: any) => c.text || "")
            .join("")
            .trim();
        }
        if (textContent) {
          title = textContent;
        }
      }

      const noteRef = doc(db, "notes", noteId);
      await updateDoc(noteRef, {
        title,
        content: document,
        updatedAt: serverTimestamp(),
      });
      console.log(`Saved note ${noteId} successfully.`);
    } catch (error: any) {
      console.error("Error saving note to Firestore:", error);
      useNoteStore.getState().showToast(t("toast.saveError"));
    }
  };

  // Debounced auto-save function
  const debouncedSave = (noteId: string, document: any[]) => {
    pendingSaveRef.current = { noteId, document };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveNoteToFirestore(noteId, document);
      pendingSaveRef.current = null;
      saveTimeoutRef.current = null;
    }, 1000);
  };

  // Flush any pending save immediately when switching active notes or unmounting
  useEffect(() => {
    if (pendingSaveRef.current && pendingSaveRef.current.noteId !== activeNoteId) {
      const { noteId: oldId, document: oldDoc } = pendingSaveRef.current;
      saveNoteToFirestore(oldId, oldDoc);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      pendingSaveRef.current = null;
    }
  }, [activeNoteId]);

  // Load note content into editor when selection changes
  useEffect(() => {
    if (!activeNote) return;

    if (activeNoteId !== lastActiveNoteIdRef.current) {
      lastActiveNoteIdRef.current = activeNoteId;
      isInitialLoadingRef.current = true;

      const blocks = parseContent(activeNote.content);
      editor.replaceBlocks(editor.document, blocks);

      // Set refs to prevent trigger save
      lastLoadedContentRef.current = JSON.stringify(editor.document);

      // Reset loading flag
      setTimeout(() => {
        isInitialLoadingRef.current = false;
      }, 100);
    }
  }, [activeNoteId, activeNote, editor]);

  // Clean up pending saves on unmount
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const { noteId, document } = pendingSaveRef.current;
        saveNoteToFirestore(noteId, document);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleEditorChange = () => {
    if (!activeNoteId || isInitialLoadingRef.current) return;

    const currentDoc = editor.document;
    const currentDocStr = JSON.stringify(currentDoc);

    // If no change, return
    if (currentDocStr === lastLoadedContentRef.current) return;

    lastLoadedContentRef.current = currentDocStr;
    debouncedSave(activeNoteId, currentDoc);
  };

  return (
    <MantineProvider>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <BlockNoteView
          editor={editor}
          onChange={handleEditorChange}
          theme={theme}
        />
      </div>
    </MantineProvider>
  );
}
