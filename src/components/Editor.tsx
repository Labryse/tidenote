import { useEffect, useRef, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { defaultBlockSpecs } from "@blocknote/core";
import { CalloutBlock } from "./CalloutBlock";
import TableOfContents from "./TableOfContents";
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
  const { activeNoteId, notes, theme, setEditorInstance, editorFontSize, activeNoteTitle, updateNoteTitle } = useNoteStore();

  const trLocale = {
    ...en,
    placeholders: {
      ...en.placeholders,
      default: t("editor.placeholder"),
      heading: "Başlık",
      toggleListItem: "Değiştir",
      bulletListItem: "Liste",
      numberedListItem: "Liste",
      checkListItem: "Liste",
    },
    drag_handle: {
      ...en.drag_handle,
      delete_menuitem: "Sil",
      colors_menuitem: "Renkler",
    },
    slash_menu: {
      heading: {
        title: "Başlık 1",
        subtext: "En üst düzey başlık",
        aliases: ["h", "heading1", "h1", "baslik", "baslik1"],
        group: "Başlıklar",
      },
      heading_2: {
        title: "Başlık 2",
        subtext: "Ana bölüm başlığı",
        aliases: ["h2", "heading2", "subheading", "baslik2"],
        group: "Başlıklar",
      },
      heading_3: {
        title: "Başlık 3",
        subtext: "Alt bölüm başlığı",
        aliases: ["h3", "heading3", "subheading", "baslik3"],
        group: "Başlıklar",
      },
      heading_4: {
        title: "Başlık 4",
        subtext: "Küçük alt bölüm başlığı",
        aliases: ["h4", "heading4", "subheading4", "baslik4"],
        group: "Başlıklar",
      },
      heading_5: {
        title: "Başlık 5",
        subtext: "En küçük alt bölüm başlığı",
        aliases: ["h5", "heading5", "subheading5", "baslik5"],
        group: "Başlıklar",
      },
      heading_6: {
        title: "Başlık 6",
        subtext: "En alt düzey başlık",
        aliases: ["h6", "heading6", "subheading6", "baslik6"],
        group: "Başlıklar",
      },
      toggle_heading: {
        title: "Daraltılabilir Başlık 1",
        subtext: "Açılıp kapanabilir en üst düzey başlık",
        aliases: ["h", "heading1", "h1", "collapsable"],
        group: "Başlıklar",
      },
      toggle_heading_2: {
        title: "Daraltılabilir Başlık 2",
        subtext: "Açılıp kapanabilir ana bölüm başlığı",
        aliases: ["h2", "heading2", "subheading", "collapsable"],
        group: "Başlıklar",
      },
      toggle_heading_3: {
        title: "Daraltılabilir Başlık 3",
        subtext: "Açılıp kapanabilir alt bölüm başlığı",
        aliases: ["h3", "heading3", "subheading", "collapsable"],
        group: "Başlıklar",
      },
      paragraph: {
        title: "Paragraf",
        subtext: "Belgenizin gövde metni",
        aliases: ["p", "paragraph", "paragraf", "metin"],
        group: "Temel Bloklar",
      },
      bullet_list: {
        title: "Maddeli Liste",
        subtext: "Sırasız liste",
        aliases: ["ul", "li", "list", "bulletlist", "bullet list", "madde"],
        group: "Temel Bloklar",
      },
      numbered_list: {
        title: "Numaralı Liste",
        subtext: "Sıralı liste",
        aliases: ["ol", "li", "list", "numberedlist", "numbered list", "sayi"],
        group: "Temel Bloklar",
      },
      check_list: {
        title: "Yapılacaklar Listesi",
        subtext: "Onay kutulu liste",
        aliases: ["ul", "li", "list", "checklist", "check list", "gorev", "yapilacaklar"],
        group: "Temel Bloklar",
      },
      toggle_list: {
        title: "Daraltılabilir Liste",
        subtext: "Açılıp kapanabilir alt ögeli liste",
        aliases: ["li", "list", "toggleList", "toggle list", "collapsable list"],
        group: "Temel Bloklar",
      },
      quote: {
        title: "Alıntı",
        subtext: "Alıntı metin veya blok",
        aliases: ["quotation", "blockquote", "bq", "alinti"],
        group: "Temel Bloklar",
      },
      code_block: {
        title: "Kod Bloğu",
        subtext: "Sözdizimi vurgulamalı kod alanı",
        aliases: ["code", "pre", "kod"],
        group: "Temel Bloklar",
      },
      page_break: {
        title: "Sayfa Sonu",
        subtext: "Sayfa ayırıcı çizgi",
        aliases: ["page", "break", "separator", "kesme", "sayfa"],
        group: "Temel Bloklar",
      },
      table: {
        title: "Tablo",
        subtext: "Düzenlenebilir hücreli tablo",
        aliases: ["table", "tablo"],
        group: "Gelişmiş",
      },
      image: {
        title: "Görsel",
        subtext: "Yazı eklenip boyutlandırılabilen resim",
        aliases: ["image", "imageUpload", "upload", "img", "picture", "media", "resim"],
        group: "Medya",
      },
      video: {
        title: "Video",
        subtext: "Yazı eklenip boyutlandırılabilen video",
        aliases: ["video", "videoUpload", "upload", "mp4", "film", "media"],
        group: "Medya",
      },
      audio: {
        title: "Ses",
        subtext: "Yazı eklenebilen ses dosyası",
        aliases: ["audio", "audioUpload", "upload", "mp3", "sound", "media", "ses"],
        group: "Medya",
      },
      file: {
        title: "Dosya",
        subtext: "Gömülü dosya",
        aliases: ["file", "upload", "embed", "media", "dosya"],
        group: "Medya",
      },
      emoji: {
        title: "Emoji",
        subtext: "Emoji arayın ve ekleyin",
        aliases: ["emoji", "emote", "emotion", "face"],
        group: "Diğerleri",
      },
      divider: {
        title: "Bölücü Çizgi",
        subtext: "Blokları görsel olarak ayıran çizgi",
        aliases: ["divider", "hr", "line", "horizontal rule", "cizgi"],
        group: "Temel Bloklar",
      },
    },
  };

  const editor = useCreateBlockNote({
    blockSpecs: {
      ...defaultBlockSpecs,
      callout: CalloutBlock,
    },
    dictionary: i18n.language.startsWith("tr") ? trLocale : undefined,
    placeholders: {
      default: i18n.language.startsWith("tr") ? "✍️ Yazmaya başla..." : "✍️ Start writing...",
      heading: i18n.language.startsWith("tr") ? "Başlık yaz..." : "Write a heading...",
    },
  }, [i18n.language]);

  // Expose editor instance to the note store
  useEffect(() => {
    setEditorInstance(editor);
    return () => {
      setEditorInstance(null);
    };
  }, [editor, setEditorInstance]);

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const [headings, setHeadings] = useState<{ level: number; text: string; id: string }[]>([]);

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
      const noteRef = doc(db, "notes", noteId);
      await updateDoc(noteRef, {
        content: document,
        updatedAt: serverTimestamp(),
      });
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

      // Set initial headings
      const h = editor.document
        .filter((block: any) => block.type === "heading")
        .map((block: any) => ({
          level: block.props.level,
          text: block.content.map((c: any) => c.text).join(""),
          id: block.id,
        }));
      setHeadings(h);

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

    // Update headings reactively
    const h = currentDoc
      .filter((block: any) => block.type === "heading")
      .map((block: any) => ({
        level: block.props.level,
        text: block.content.map((c: any) => c.text).join(""),
        id: block.id,
      }));
    setHeadings(h);

    // If no change, return
    if (currentDocStr === lastLoadedContentRef.current) return;

    lastLoadedContentRef.current = currentDocStr;
    debouncedSave(activeNoteId, currentDoc);
  };

  return (
    <MantineProvider>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", wordWrap: "break-word", wordBreak: "break-word" }} className={`editor-workspace font-${editorFontSize}`}>
        <input
          className="editor-title-input"
          value={activeNoteTitle}
          onChange={(e) => updateNoteTitle(activeNoteId!, e.target.value)}
          placeholder={t("sidebar.untitledNote")}
        />
        <hr className="editor-title-divider" />
        <BlockNoteView
          editor={editor}
          onChange={handleEditorChange}
          theme={theme}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => {
              const defaultItems = getDefaultReactSlashMenuItems(editor);
              
              const allowedTypes = [
                'paragraph', 'heading 1', 'heading 2', 'heading 3',
                'bullet', 'numbered', 'check', 'quote', 'blockquote', 'code',
                'divider', 'table', 'image',
                // Turkish
                'paragraf', 'başlık 1', 'başlık 2', 'başlık 3',
                'maddeli', 'numaralı', 'yapılacaklar', 'alıntı', 'kod',
                'bölücü', 'tablo', 'görsel'
              ];
              
              const filteredDefaultItems = defaultItems.filter(item => {
                const titleLower = item.title.toLowerCase();
                // Exclude Heading 4, 5, 6 explicitly
                if (titleLower.includes('4') || titleLower.includes('5') || titleLower.includes('6')) {
                  return false;
                }
                return allowedTypes.some(t => titleLower.includes(t));
              });

              const calloutItems = [
                { title: `💡 ${t("editor.callout.infoTitle", "Bilgi Notu")}`, group: t("editor.callout.group", "Callout"),
                  onItemClick: () => editor.insertBlocks(
                    [{ type: 'callout' as any, props: { type: 'info' } }],
                    editor.getTextCursorPosition().block, 'after') },
                { title: `⚠️ ${t("editor.callout.warningTitle", "Uyarı")}`, group: t("editor.callout.group", "Callout"),
                  onItemClick: () => editor.insertBlocks(
                    [{ type: 'callout' as any, props: { type: 'warning' } }],
                    editor.getTextCursorPosition().block, 'after') },
                { title: `✅ ${t("editor.callout.successTitle", "Başarı")}`, group: t("editor.callout.group", "Callout"),
                  onItemClick: () => editor.insertBlocks(
                    [{ type: 'callout' as any, props: { type: 'success' } }],
                    editor.getTextCursorPosition().block, 'after') },
                { title: `❌ ${t("editor.callout.dangerTitle", "Hata")}`, group: t("editor.callout.group", "Callout"),
                  onItemClick: () => editor.insertBlocks(
                    [{ type: 'callout' as any, props: { type: 'danger' } }],
                    editor.getTextCursorPosition().block, 'after') },
                { title: `🔥 ${t("editor.callout.tipTitle", "İpucu")}`, group: t("editor.callout.group", "Callout"),
                  onItemClick: () => editor.insertBlocks(
                    [{ type: 'callout' as any, props: { type: 'tip' } }],
                    editor.getTextCursorPosition().block, 'after') },
              ];
              const allItems = [...filteredDefaultItems, ...calloutItems] as any[];
              return allItems.filter((item) =>
                item.title.toLowerCase().includes(query.toLowerCase())
              );
            }}
          />
        </BlockNoteView>
        <TableOfContents headings={headings} />
      </div>
    </MantineProvider>
  );
}
