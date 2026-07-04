import React, { useEffect, useState, useRef } from "react";
import { db, auth, enableNetwork } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, where, updateDoc, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNoteStore, type Note, type Folder } from "../store/useNoteStore";
import { useTranslation } from "react-i18next";
import ConfirmModal from "./ConfirmModal";
import { useNavigate } from "react-router-dom";
import { FilePlus, PenSquare, LayoutTemplate, Users, CalendarDays, Lightbulb, Kanban, ChevronLeft, ChevronRight, ChevronDown, LogOut, MoreVertical, FolderPlus, Folder as FolderIcon, FolderOpen, Archive, Palette, Bug, Laptop, Sparkles, Filter, Star, Clock, Tag, Zap, Bookmark } from "lucide-react";
import BugReportModal from "./BugReportModal";
import CollectionModal, { getCollectionIcon } from "./CollectionModal";
import { extractTextFromBlocks } from "../lib/searchUtils";
import { getResolvedName, isElectron, getLogoSrc } from "../lib/utils";
import { getNoteRoute } from "../lib/platform";
import { isWebOnly } from "../lib/platformDetect";
import { getLatestRelease, findAssetForPlatform } from "../lib/githubReleases";


const logoSrc = getLogoSrc();

const getNoteTextContent = (note: Note): string => {
  let text = "";
  if (note.type === "canvas") {
    if (note.elements) {
      try {
        const elementsList = JSON.parse(note.elements);
        if (Array.isArray(elementsList)) {
          text = elementsList
            .filter((el: any) => el && el.type === "text" && typeof el.text === "string")
            .map((el: any) => el.text)
            .join(" ");
        }
      } catch (e) {
        // ignore
      }
    }
  } else {
    if (note.content) {
      let blocks: any[] = [];
      if (typeof note.content === "string") {
        try {
          blocks = JSON.parse(note.content);
        } catch {
          // ignore
        }
      } else if (Array.isArray(note.content)) {
        blocks = note.content;
      }
      if (Array.isArray(blocks)) {
        text = extractTextFromBlocks(blocks);
      }
    }
  }
  return text;
};

const getTimestampMs = (timestamp: any): number => {
  if (!timestamp) return Date.now();
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().getTime();
  }
  if (timestamp.seconds !== undefined) {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
  }
  const parsed = new Date(timestamp).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight || highlight.startsWith("#")) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

interface Template {
  id: string;
  name: string;
  desc: string;
  icon: string;
  content: () => any[];
}

const COLOR_PRESETS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

const TEMPLATES: Template[] = [
  {
    id: "meeting",
    name: "Toplantı Notu",
    desc: "Gündem, kararlar ve aksiyon maddeleri",
    icon: "meeting",
    content: () => {
      const today = new Date().toLocaleDateString("tr-TR");
      return [
        {
          type: "heading",
          props: { level: 2 },
          content: [{ type: "text", text: "Toplantı Notları", styles: {} }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: `📅 Tarih: ${today}`, styles: {} }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "👥 Katılımcılar:", styles: {} }]
        },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: "Gündem", styles: {} }]
        },
        {
          type: "bulletListItem",
          content: []
        },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: "Kararlar", styles: {} }]
        },
        {
          type: "bulletListItem",
          content: []
        },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: "Aksiyon Maddeleri", styles: {} }]
        },
        {
          type: "checkListItem",
          props: { checked: false },
          content: []
        }
      ];
    }
  },
  {
    id: "daily",
    name: "Günlük Plan",
    desc: "Öncelikler, yapılacaklar ve notlar",
    icon: "daily",
    content: () => {
      const today = new Date().toLocaleDateString("tr-TR");
      return [
        {
          type: "heading",
          props: { level: 2 },
          content: [{ type: "text", text: `Günlük Plan — ${today}`, styles: {} }]
        },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: "🌅 Bugünün Öncelikleri", styles: {} }]
        },
        { type: "numberedListItem", content: [] },
        { type: "numberedListItem", content: [] },
        { type: "numberedListItem", content: [] },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: "✅ Yapılacaklar", styles: {} }]
        },
        { type: "checkListItem", props: { checked: false }, content: [] },
        { type: "checkListItem", props: { checked: false }, content: [] },
        { type: "checkListItem", props: { checked: false }, content: [] },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: "💭 Notlar", styles: {} }]
        },
        {
          type: "paragraph",
          content: []
        }
      ];
    }
  },
  {
    id: "brainstorm",
    name: "Beyin Fırtınası",
    desc: "Fikir toplama ve sonraki adımlar",
    icon: "brainstorm",
    content: () => [
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Beyin Fırtınası", styles: {} }]
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "🎯 Konu: ", styles: {} }]
      },
      {
        type: "heading",
        props: { level: 3 },
        content: [{ type: "text", text: "Fikirler", styles: {} }]
      },
      { type: "bulletListItem", content: [] },
      { type: "bulletListItem", content: [] },
      { type: "bulletListItem", content: [] },
      { type: "bulletListItem", content: [] },
      { type: "bulletListItem", content: [] },
      {
        type: "heading",
        props: { level: 3 },
        content: [{ type: "text", text: "En İyi 3 Fikir", styles: {} }]
      },
      { type: "numberedListItem", content: [] },
      { type: "numberedListItem", content: [] },
      { type: "numberedListItem", content: [] },
      {
        type: "heading",
        props: { level: 3 },
        content: [{ type: "text", text: "Sonraki Adımlar", styles: {} }]
      },
      { type: "checkListItem", props: { checked: false }, content: [] },
      { type: "checkListItem", props: { checked: false }, content: [] }
    ]
  },
  {
    id: "project",
    name: "Proje Planı",
    desc: "Proje fazları ve potansiyel riskler",
    icon: "project",
    content: () => [
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Proje Planı", styles: {} }]
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "📌 Proje Adı: ", styles: {} }]
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "🎯 Hedef: ", styles: {} }]
      },
      {
        type: "heading",
        props: { level: 3 },
        content: [{ type: "text", text: "Fazlar", styles: {} }]
      },
      { type: "numberedListItem", content: [] },
      { type: "numberedListItem", content: [] },
      { type: "numberedListItem", content: [] },
      {
        type: "heading",
        props: { level: 3 },
        content: [{ type: "text", text: "Riskler", styles: {} }]
      },
      { type: "bulletListItem", content: [] },
      { type: "bulletListItem", content: [] }
    ]
  }
];

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    notes,
    setNotes,
    activeNoteId,
    setActiveNoteId,
    setIsLoading,
    user,
    showToast,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    listDensity,
    setIsSettingsOpen,
    setSettingsTab,
    theme,
    setTheme,
    isNewNoteDropdownOpen,
    setIsNewNoteDropdownOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    firestoreUser,
    setInfoModalNoteId,
    folders,
    setFolders,
    activeFolderId,
    setActiveFolderId,
  } = useNoteStore();

  const [isTemplatesSubmenuOpen, setIsTemplatesSubmenuOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);

  const isTr = i18n.language.startsWith("tr");

  const [downloadUrl, setDownloadUrl] = useState<string>("https://github.com/Labryse/tidenote/releases/latest");
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem("desktop-download-dismissed") === "true";
  });

  useEffect(() => {
    if (isWebOnly() && !isDismissed) {
      getLatestRelease().then((data) => {
        if (data) {
          const asset = findAssetForPlatform(data.assets, 'windows');
          if (asset) {
            setDownloadUrl(asset.browser_download_url);
          }
        }
      });
    }
  }, [isDismissed]);


  // Folder tree state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<{ isOpen: boolean; mode: "create" | "rename"; folderId: string | null; value: string; isClosing: boolean }>({
    isOpen: false, mode: "create", folderId: null, value: "", isClosing: false
  });
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const draggedNoteIdRef = useRef<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [recentlyDroppedFolderId, setRecentlyDroppedFolderId] = useState<string | null>(null);
  const [isUnfiledSectionOpen, setIsUnfiledSectionOpen] = useState(false);
  const [colorPickerNoteId, setColorPickerNoteId] = useState<string | null>(null);
  const [colorPickerFolderId, setColorPickerFolderId] = useState<string | null>(null);
  const nativeColorInputRef = useRef<HTMLInputElement>(null);
  const colorTargetRef = useRef<{ type: "note" | "folder"; id: string } | null>(null);
  const notesUnsubRef = useRef<(() => void) | null>(null);
  const foldersUnsubRef = useRef<(() => void) | null>(null);

  // Collections state
  const [collections, setCollections] = useState<any[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState<any | null>(null);
  const [deletingCollectionId, setDeletingCollectionId] = useState<string | null>(null);
  const [openCollectionMenuId, setOpenCollectionMenuId] = useState<string | null>(null);
  const collectionsUnsubRef = useRef<(() => void) | null>(null);

  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null) {
      const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
      if (diffX > 50) {
        setIsMobileSidebarOpen(false);
      }
      touchStartXRef.current = null;
    }
  };

  const handleEdgeDrag = (e: React.MouseEvent) => {
    const startX = e.clientX;
    
    const onMouseMove = (e: MouseEvent) => {
      const diff = startX - e.clientX;
      if (diff > 80) { // 80px sola sürüklendi
        setIsSidebarCollapsed(true);
      }
    };
    
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt" | "title">("updatedAt");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuNoteId(null);
      setColorPickerNoteId(null);
    };
    if (openMenuNoteId) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [openMenuNoteId]);

  useEffect(() => {
    const handleOutsideClick = () => { setOpenFolderMenuId(null); setColorPickerFolderId(null); };
    if (openFolderMenuId) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [openFolderMenuId]);

  useEffect(() => {
    const handleOutsideClickCol = () => { setOpenCollectionMenuId(null); };
    if (openCollectionMenuId) {
      document.addEventListener("click", handleOutsideClickCol);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClickCol);
    };
  }, [openCollectionMenuId]);

  const [isJournalHistoryOpen, setIsJournalHistoryOpen] = useState(false);

  const getJournalDisplayTitle = (note: Note) => {
    if (!note.journalDate) return note.title;
    const [year, month, day] = note.journalDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dateStr = date.toLocaleDateString(i18n.language.startsWith("tr") ? "tr-TR" : "en-US", {
      day: "numeric",
      month: "short"
    });
    return `${dateStr} — ${t("journal.sidebarSuffix", "Journal")}`;
  };

  const formatJournalTitle = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const isTr = i18n.language.startsWith("tr");
    const weekdayStr = date.toLocaleDateString(isTr ? "tr-TR" : "en-US", { weekday: "long" });
    const dateStrFormatted = date.toLocaleDateString(isTr ? "tr-TR" : "en-US", { year: "numeric", month: "long", day: "numeric" });
    return isTr ? `📅 ${dateStrFormatted}, ${weekdayStr}` : `📅 ${weekdayStr}, ${dateStrFormatted}`;
  };

  const getTodayShortDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const [year, month, day] = today.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(i18n.language.startsWith("tr") ? "tr-TR" : "en-US", {
      day: "numeric",
      month: "short"
    });
  };

  const handleTodayJournalClick = async () => {
    if (!user) {
      showToast(t("auth.unknownError"));
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      const notesRef = collection(db, "notes");
      const q = query(
        notesRef,
        where("ownerId", "==", user.uid),
        where("type", "==", "journal"),
        where("journalDate", "==", today)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingNoteDoc = querySnapshot.docs[0];
        setActiveNoteId(existingNoteDoc.id);
        setIsMobileSidebarOpen(false);
        return;
      }

      const noteTitle = formatJournalTitle(today);
      const isTr = i18n.language.startsWith("tr");
      const [year, month, day] = today.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const weekdayStr = date.toLocaleDateString(isTr ? "tr-TR" : "en-US", { weekday: "long" });
      const dateStrFormatted = date.toLocaleDateString(isTr ? "tr-TR" : "en-US", { year: "numeric", month: "long", day: "numeric" });
      const headingDate = isTr ? `${dateStrFormatted}, ${weekdayStr}` : `${weekdayStr}, ${dateStrFormatted}`;

      const defaultContent = [
        {
          type: "heading",
          props: { level: 2 },
          content: [{ type: "text", text: `📅 ${headingDate}`, styles: {} }]
        },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: isTr ? "🌅 Bugün nasıl hissediyorum?" : "🌅 How do I feel today?", styles: {} }]
        },
        {
          type: "paragraph",
          content: []
        },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: isTr ? "✅ Bugün yapacaklarım" : "✅ Today's tasks", styles: {} }]
        },
        {
          type: "checkListItem",
          props: { checked: false },
          content: []
        },
        {
          type: "checkListItem",
          props: { checked: false },
          content: []
        },
        {
          type: "checkListItem",
          props: { checked: false },
          content: []
        },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: isTr ? "💭 Notlar & Düşünceler" : "💭 Notes & Thoughts", styles: {} }]
        },
        {
          type: "paragraph",
          content: []
        },
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: isTr ? "🌙 Günün özeti" : "🌙 Summary of the day", styles: {} }]
        },
        {
          type: "paragraph",
          content: []
        }
      ];

      const newJournalNote = {
        type: "journal",
        title: noteTitle,
        journalDate: today,
        ownerId: user.uid,
        content: defaultContent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pinned: false
      };

      const docRef = await addDoc(collection(db, "notes"), newJournalNote);
      setActiveNoteId(docRef.id);
      setIsMobileSidebarOpen(false);
      showToast(t("toast.createSuccess"), "success");
    } catch (error: any) {
      console.error("Journal error:", error);
      showToast(t("toast.createError") || "Journal açılamadı");
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setIsNewNoteDropdownOpen(false);
      }
    }

    if (isNewNoteDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNewNoteDropdownOpen]);

  useEffect(() => {
    function handleClickOutsideSort(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    if (isSortDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutsideSort);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideSort);
    };
  }, [isSortDropdownOpen]);

  useEffect(() => {
    if (notesUnsubRef.current) {
      notesUnsubRef.current();
      notesUnsubRef.current = null;
    }

    if (!user) {
      setNotes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let isMounted = true;

    const timer = setTimeout(() => {
      if (!isMounted) return;

      const q = query(
        collection(db, 'notes'),
        where('ownerId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      )

      const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        if (!isMounted) return;
        // Skip snapshots that only contain our own local (optimistic) writes.
        // hasPendingWrites:true means Firestore echoed back what WE just wrote —
        // processing this causes a setNotes → re-render loop that breaks the
        // BlockNote slash menu while the user is still interacting with it.
        if (snapshot.docs.every(d => d.metadata.hasPendingWrites)) return;

        const notesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Note[]
        setNotes(notesList)
        setIsLoading(false)
      }, (error) => {
        console.error('onSnapshot error:', error)
        if (isMounted) {
          setIsLoading(false);
        }
      })

      notesUnsubRef.current = unsubscribe;
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (notesUnsubRef.current) {
        notesUnsubRef.current();
        notesUnsubRef.current = null;
      }
    };
  }, [user?.uid]) // user.uid değişince yeniden kur, user objesi değil

  // Folders subscription
  useEffect(() => {
    if (foldersUnsubRef.current) {
      foldersUnsubRef.current();
      foldersUnsubRef.current = null;
    }

    if (!user) { setFolders([]); return; }
    let isMounted = true;

    const timer = setTimeout(() => {
      if (!isMounted) return;

      const q = query(
        collection(db, "users", user.uid, "folders"),
        orderBy("createdAt", "asc")
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!isMounted) return;
        setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Folder)));
      }, (err) => { console.error("folders onSnapshot error:", err); });

      foldersUnsubRef.current = unsubscribe;
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (foldersUnsubRef.current) {
        foldersUnsubRef.current();
        foldersUnsubRef.current = null;
      }
    };
  }, [user?.uid]);

  // Collections subscription
  useEffect(() => {
    if (collectionsUnsubRef.current) {
      collectionsUnsubRef.current();
      collectionsUnsubRef.current = null;
    }

    if (!user) { setCollections([]); return; }
    let isMounted = true;

    const timer = setTimeout(() => {
      if (!isMounted) return;

      const q = query(
        collection(db, "users", user.uid, "collections"),
        orderBy("createdAt", "asc")
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!isMounted) return;
        setCollections(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      }, (err) => { console.error("collections onSnapshot error:", err); });

      collectionsUnsubRef.current = unsubscribe;
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (collectionsUnsubRef.current) {
        collectionsUnsubRef.current();
        collectionsUnsubRef.current = null;
      }
    };
  }, [user?.uid]);

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        enableNetwork(db).catch(() => {});
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [user]);

  const handleCreateNote = async (type: "document" | "canvas") => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast(t("auth.unknownError"));
      return;
    }

    setIsNewNoteDropdownOpen(false);
    try {
      let title = t("sidebar.untitledNote");
      if (type === "canvas") {
        const dateStr = new Date().toLocaleDateString(i18n.language.startsWith("tr") ? "tr-TR" : "en-US", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        title = `${t("sidebar.untitledCanvas")} [${dateStr}]`;
      }

      const newNote = {
        title,
        type,
        content: null,
        ownerId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pinned: false,
      };
      const docRef = await addDoc(collection(db, "notes"), newNote);
      setActiveNoteId(docRef.id);
      setIsMobileSidebarOpen(false);
      showToast(t("toast.createSuccess"), "success");
    } catch (error: any) {
      console.error("Error creating new note:", error);
      showToast(`${t("toast.createError")}: ${error.message || error}`);
    }
  };

  // ── Folder handlers ──────────────────────────────────────────

  const closeFolderModal = () => {
    setFolderModal(prev => ({ ...prev, isClosing: true }));
    setTimeout(() => setFolderModal({ isOpen: false, mode: "create", folderId: null, value: "", isClosing: false }), 200);
  };

  const confirmFolderModal = async () => {
    const trimmed = folderModal.value.trim();
    if (!trimmed || !user || !folderModal.folderId) { closeFolderModal(); return; }
    try {
      await updateDoc(doc(db, "users", user.uid, "folders", folderModal.folderId), { name: trimmed });
    } catch {
      showToast(t("toast.saveError"));
    }
    closeFolderModal();
  };

  const handleCreateFolder = async (parentId: string | null) => {
    if (!user) return;
    try {
      const folderName = t("folders.untitledFolder", "Başlıksız Klasör");
      const folderRef = await addDoc(collection(db, "users", user.uid, "folders"), {
        name: folderName,
        parentId: parentId ?? null,
        createdAt: serverTimestamp(),
        order: folders.length,
      });
      if (parentId) setExpandedFolders((prev) => new Set([...prev, parentId]));
      setFolderModal({ isOpen: true, mode: "create", folderId: folderRef.id, value: folderName, isClosing: false });
    } catch {
      showToast(t("toast.createError"));
    }
  };

  const startRenaming = (folder: Folder) => {
    setOpenFolderMenuId(null);
    setFolderModal({ isOpen: true, mode: "rename", folderId: folder.id, value: folder.name, isClosing: false });
  };

  const handleNoteColorChange = async (noteId: string, color: string) => {
    try {
      await updateDoc(doc(db, "notes", noteId), { color: color || null });
    } catch {
      showToast(t("toast.saveError"));
    }
  };

  const handleFolderColorChange = async (folderId: string, color: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "folders", folderId), { color: color || null });
    } catch {
      showToast(t("toast.saveError"));
    }
  };

  const getAllDescendantIds = (folderId: string): string[] => {
    const children = folders.filter((f) => f.parentId === folderId);
    return [folderId, ...children.flatMap((c) => getAllDescendantIds(c.id))];
  };

  const confirmDeleteFolder = async () => {
    if (!deletingFolderId || !user) { setDeletingFolderId(null); return; }
    try {
      const idsToDelete = getAllDescendantIds(deletingFolderId);
      const affectedNotes = notes.filter((n) => n.folderId && idsToDelete.includes(n.folderId));
      await Promise.all(affectedNotes.map((n) => updateDoc(doc(db, "notes", n.id), { folderId: null })));
      await Promise.all(idsToDelete.map((id) => deleteDoc(doc(db, "users", user.uid, "folders", id))));
      if (activeFolderId && idsToDelete.includes(activeFolderId)) setActiveFolderId(null);
    } catch (error: any) {
      showToast(t("toast.deleteError"));
    } finally {
      setDeletingFolderId(null);
    }
  };

  const confirmDeleteCollection = async () => {
    if (!user || !deletingCollectionId) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "collections", deletingCollectionId));
      if (activeCollectionId === deletingCollectionId) {
        setActiveCollectionId(null);
      }
      showToast(t("collections.deleteSuccess", "Koleksiyon silindi"), "success");
    } catch (error) {
      console.error("Error deleting collection:", error);
      showToast(t("collections.deleteError", "Koleksiyon silinemedi"), "error");
    } finally {
      setDeletingCollectionId(null);
    }
  };

  const handleCollectionClick = (colId: string) => {
    setActiveCollectionId(activeCollectionId === colId ? null : colId);
    setActiveFolderId(null);
  };

  const handleDropNoteToCollection = async (colId: string) => {
    const noteId = draggedNoteIdRef.current;
    if (!noteId || !user) return;
    draggedNoteIdRef.current = null;
    
    try {
      const col = collections.find(c => c.id === colId);
      if (!col) return;
      
      const filters = col.filters || {};
      const noteIds = filters.noteIds || [];
      
      if (!noteIds.includes(noteId)) {
        const updatedNoteIds = [...noteIds, noteId];
        await updateDoc(doc(db, "users", user.uid, "collections", colId), {
          "filters.noteIds": updatedNoteIds,
          updatedAt: serverTimestamp()
        });
        showToast(t("collections.noteAdded", "Not koleksiyona eklendi"), "success");
      } else {
        showToast(t("collections.alreadyExists", "Not zaten bu koleksiyonda"), "warning");
      }
    } catch (error) {
      console.error("Error adding note to collection:", error);
      showToast(t("collections.addError", "Not koleksiyona eklenemedi"), "error");
    }
  };

  const handleDropNoteToFolder = async (folderId: string | null) => {
    const noteId = draggedNoteIdRef.current;
    if (!noteId) return;
    draggedNoteIdRef.current = null;
    setDragOverFolderId(null);
    try {
      await updateDoc(doc(db, "notes", noteId), { folderId: folderId ?? null });
      if (folderId) {
        setRecentlyDroppedFolderId(folderId);
        setTimeout(() => setRecentlyDroppedFolderId(null), 600);
      }
    } catch (error: any) {
      showToast(t("toast.saveError"));
    }
  };

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  };

  const renderFolderItem = (folder: Folder, depth: number): React.ReactNode => {
    const children = folders.filter((f) => f.parentId === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = activeFolderId === folder.id;
    const folderColor = folder.color;
    const notesInFolder = notes.filter(n => n.folderId === folder.id && !n.archived).length;
    const isDragOver = dragOverFolderId === folder.id;
    const isRecentDrop = recentlyDroppedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`folder-item${isActive ? " active" : ""}${isDragOver ? " drag-over" : ""}${isRecentDrop ? " drop-highlight" : ""}`}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => { setActiveFolderId(isActive ? null : folder.id); setActiveCollectionId(null); }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOverFolderId !== folder.id) setDragOverFolderId(folder.id);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragOverFolderId(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            draggedNoteIdRef.current = draggedNoteIdRef.current || e.dataTransfer.getData("text/plain");
            handleDropNoteToFolder(folder.id);
          }}
        >
          <button
            type="button"
            className="folder-chevron-btn"
            onClick={(e) => { e.stopPropagation(); toggleFolderExpanded(folder.id); }}
          >
            {children.length > 0 ? (
              isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />
            ) : (
              <span style={{ width: 10, display: "inline-block" }} />
            )}
          </button>
          {isExpanded && children.length > 0 ? (
            <FolderOpen size={13} className="folder-icon" style={folderColor ? { color: folderColor } : undefined} />
          ) : (
            <FolderIcon size={13} className="folder-icon" style={folderColor ? { color: folderColor } : undefined} />
          )}
          <span className="folder-name">{folder.name}</span>
          {notesInFolder > 0 && (
            <span className="folder-note-badge">{notesInFolder}</span>
          )}
          <button
            type="button"
            className="folder-menu-btn"
            onClick={(e) => { e.stopPropagation(); setOpenFolderMenuId(openFolderMenuId === folder.id ? null : folder.id); }}
          >
            <MoreVertical size={12} />
          </button>
          {openFolderMenuId === folder.id && (
            <div className="folder-menu-dropdown" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="folder-menu-item" onClick={() => startRenaming(folder)}>
                {t("folders.rename", "Yeniden Adlandır")}
              </button>
              {depth < 2 && (
                <button type="button" className="folder-menu-item" onClick={() => { setOpenFolderMenuId(null); handleCreateFolder(folder.id); }}>
                  {t("folders.addSubfolder", "Alt Klasör Ekle")}
                </button>
              )}
              <button type="button" className="folder-menu-item" onClick={(e) => { e.stopPropagation(); setColorPickerFolderId(colorPickerFolderId === folder.id ? null : folder.id); }}>
                <Palette size={12} style={{ marginRight: 4 }} />{t("noteMenu.colorLabel", "Renk Etiketi")}
              </button>
              {colorPickerFolderId === folder.id && (
                <div className="color-picker-row" onClick={(e) => e.stopPropagation()}>
                  {COLOR_PRESETS.map(c => (
                    <button key={c} type="button" className="color-dot" style={{ background: c }}
                      onClick={() => { handleFolderColorChange(folder.id, c); setColorPickerFolderId(null); setOpenFolderMenuId(null); }} />
                  ))}
                  <button type="button" className="color-dot color-dot-custom" title={t("noteMenu.customColor", "Özel Renk")}
                    onClick={() => { colorTargetRef.current = { type: "folder", id: folder.id }; nativeColorInputRef.current?.click(); setColorPickerFolderId(null); setOpenFolderMenuId(null); }} />
                  {folderColor && (
                    <button type="button" className="color-dot color-dot-clear" title={t("noteMenu.clearColor", "Rengi Kaldır")}
                      onClick={() => { handleFolderColorChange(folder.id, ""); setColorPickerFolderId(null); setOpenFolderMenuId(null); }} />
                  )}
                </div>
              )}
              <div className="dropdown-divider" />
              <button type="button" className="folder-menu-item danger" onClick={() => { setOpenFolderMenuId(null); setDeletingFolderId(folder.id); }}>
                {t("folders.delete", "Klasörü Sil")}
              </button>
            </div>
          )}
        </div>
        {isExpanded && children.map((child) => renderFolderItem(child, depth + 1))}
      </div>
    );
  };

  const renderCollectionItem = (col: any) => {
    const isActive = activeCollectionId === col.id;
    const isMenuOpen = openCollectionMenuId === col.id;
    
    // Count notes matching this collection's filters
    const notesInCollection = notes.filter((note) => {
      if (note.archived) return false;
      const filters = col.filters || {};
      const noteIds = filters.noteIds || [];
      return noteIds.includes(note.id);
    }).length;

    return (
      <div 
        key={col.id}
        className={`folder-item${isActive ? " active" : ""}`}
        style={{ paddingLeft: "8px", position: "relative" }}
        onClick={() => handleCollectionClick(col.id)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          e.currentTarget.classList.add("drag-over");
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            e.currentTarget.classList.remove("drag-over");
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("drag-over");
          draggedNoteIdRef.current = draggedNoteIdRef.current || e.dataTransfer.getData("text/plain");
          handleDropNoteToCollection(col.id);
        }}
      >
        <span style={{ width: 10, display: "inline-block", flexShrink: 0 }} />
        {getCollectionIcon(col.icon, 13, "folder-icon")}
        <span className="folder-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {col.name}
        </span>
        
        {notesInCollection > 0 && (
          <span className="folder-note-badge" style={{ marginRight: "4px" }}>{notesInCollection}</span>
        )}

        {/* 3-dots Menu for Edit / Delete */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="folder-menu-btn"
            onClick={() => setOpenCollectionMenuId(isMenuOpen ? null : col.id)}
          >
            <MoreVertical size={12} />
          </button>
          
          {isMenuOpen && (
            <div className="folder-menu-dropdown" style={{ right: 0, top: "100%", zIndex: 100 }}>
              <button
                type="button"
                className="folder-menu-item"
                onClick={() => {
                  setOpenCollectionMenuId(null);
                  setCollectionToEdit(col);
                  setIsCollectionModalOpen(true);
                }}
              >
                {t("collections.edit", "Düzenle")}
              </button>
              <button
                type="button"
                className="folder-menu-item danger"
                onClick={() => {
                  setOpenCollectionMenuId(null);
                  setDeletingCollectionId(col.id);
                }}
              >
                {t("collections.delete", "Sil")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── End folder handlers ───────────────────────────────────────

  const handleCreateFromTemplate = async (template: Template) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast(t("auth.unknownError"));
      return;
    }

    setIsNewNoteDropdownOpen(false);
    setIsTemplatesSubmenuOpen(false);
    try {
      const newNote = {
        title: template.name,
        type: "document",
        content: template.content(),
        ownerId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pinned: false,
      };
      const docRef = await addDoc(collection(db, "notes"), newNote);
      setActiveNoteId(docRef.id);
      setIsMobileSidebarOpen(false);
      showToast(t("toast.createSuccess"), "success");
    } catch (error: any) {
      console.error("Error creating note from template:", error);
      showToast(`${t("toast.createError")}: ${error.message || error}`);
    }
  };

  const handleNoteSelect = (id: string) => {
    setActiveNoteId(id);
    setIsMobileSidebarOpen(false);
  };

  const handleTogglePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const noteRef = doc(db, "notes", note.id);
      await updateDoc(noteRef, {
        pinned: !note.pinned,
      });
    } catch (error: any) {
      console.error("Error toggling pin:", error);
      showToast(t("toast.saveError") || "Error saving pin");
    }
  };

  const handleToggleStar = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const noteRef = doc(db, "notes", note.id);
      await updateDoc(noteRef, {
        starred: !note.starred,
      });
    } catch (error: any) {
      console.error("Error toggling star:", error);
      showToast(t("toast.saveError") || "Error toggling star");
    }
  };

  const handleToggleArchive = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const noteRef = doc(db, "notes", note.id);
      const newArchivedState = !note.archived;
      await updateDoc(noteRef, {
        archived: newArchivedState,
      });
      
      // Local state'i de hemen güncelle (onSnapshot beklemeden anlık görünüm için)
      setNotes(notes.map(n =>
        n.id === note.id ? { ...n, archived: newArchivedState } : n
      ));

      if (newArchivedState && activeNoteId === note.id) {
        setActiveNoteId(null);
      }
    } catch (error: any) {
      console.error("Error archiving note:", error);
      showToast(t("toast.saveError") || "Error archiving note");
    }
  };



  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteNoteId(id);
  };

  const confirmDeleteNote = async () => {
    if (!deleteNoteId) return;
    try {
      if (activeNoteId === deleteNoteId) {
        const remainingNotes = notes.filter((n) => n.id !== deleteNoteId);
        if (remainingNotes.length > 0) {
          setActiveNoteId(remainingNotes[0].id);
        } else {
          setActiveNoteId(null);
        }
      }
      await deleteDoc(doc(db, "notes", deleteNoteId));
      showToast(t("toast.deleteSuccess"), "success");
    } catch (error: any) {
      console.error("Error deleting note:", error);
      showToast(`${t("toast.deleteError")}: ${error.message || error}`);
    } finally {
      setDeleteNoteId(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Error signing out:", error);
      showToast(`${t("auth.unknownError")}: ${error.message || error}`);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return t("sidebar-extra.saving");
    const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(i18n.language.startsWith("tr") ? "tr-TR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  // Get past journals for collapsible history under "Bugün" button
  const todayDateStrVal = new Date().toISOString().split('T')[0];
  const pastJournals = notes.filter(
    (n) => n.type === "journal" && n.journalDate !== todayDateStrVal && !n.archived
  ).sort((a, b) => {
    const dateA = a.journalDate || "";
    const dateB = b.journalDate || "";
    return dateB.localeCompare(dateA);
  });

  // Extractions for Tag filter bar
  // Unique tags are gathered from active, unarchived notes
  const activeNotes = notes.filter((n) => !n.archived);
  const allUniqueTags = Array.from(
    new Set(
      activeNotes
        .flatMap((n) => n.tags || [])
        .map((tagStr) => {
          const parts = tagStr.split(":");
          return parts[0];
        })
        .filter(Boolean)
    )
  );

  const archivedCount = notes.filter((n) => n.archived).length;

  const getSortLabel = (key: string) => {
    switch (key) {
      case "createdAt":
        return t("sidebar.sortCreated");
      case "title":
        return t("sidebar.sortTitle");
      default:
        return t("sidebar.sortUpdated");
    }
  };

  // Root-level folders (no parent)
  const rootFolders = folders.filter((f) => !f.parentId);

  // Local filtering and sorting logic
  const filteredAndSortedNotes = notes
    .filter((note) => {
      // Archive filter
      if (showArchived) {
        if (!note.archived) return false;
      } else {
        if (note.archived) return false;
      }

      // Folder filter
      if (!activeCollectionId) {
        if (activeFolderId === "unfiled") {
          if (note.folderId) return false;
        } else if (activeFolderId) {
          if (note.folderId !== activeFolderId) return false;
        }
      }

      // Collection filter
      if (activeCollectionId) {
        const col = collections.find(c => c.id === activeCollectionId);
        if (col && col.filters) {
          const noteIds = col.filters.noteIds || [];
          if (!noteIds.includes(note.id)) return false;
        } else {
          return false;
        }
      }

      // Tag filter bar matching (ignoring color suffix)
      if (activeTagFilter) {
        const noteTags = (note.tags || []).map((tStr) => tStr.split(":")[0].toLowerCase());
        if (!noteTags.includes(activeTagFilter.toLowerCase())) return false;
      }

      if (!searchQuery) return true;

      // Check for hashtag search
      if (searchQuery.startsWith("#")) {
        const tagQuery = searchQuery.slice(1).toLowerCase();
        if (!tagQuery) return true;
        const noteTags = (note.tags || []).map((tStr) => tStr.split(":")[0].toLowerCase());
        return noteTags.some((tag) => tag.includes(tagQuery));
      }

      // Regular title & content search
      const queryLower = searchQuery.toLowerCase();
      const titleMatch = (note.title || "").toLowerCase().includes(queryLower);
      const contentMatch = getNoteTextContent(note).toLowerCase().includes(queryLower);
      return titleMatch || contentMatch;
    })
    .sort((a, b) => {
      // Sorting
      if (sortBy === "title") {
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        return titleA.localeCompare(titleB);
      }
      if (sortBy === "createdAt") {
        return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
      }
      // default: updatedAt
      return getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt);
    });

  // Grouping - Starred/Favorites are strictly grouped at the top
  const favoriteNotes = filteredAndSortedNotes.filter((n) => n.starred === true);
  // Pinned notes (which aren't starred)
  const pinnedNotes = filteredAndSortedNotes.filter((n) => n.pinned === true && n.starred !== true);
  // Unpinned and unstarred notes
  const unpinnedNotes = filteredAndSortedNotes.filter((n) => n.pinned !== true && n.starred !== true);

  const shouldShowUnfiledSection = Boolean(activeFolderId) && activeFolderId !== "unfiled" && !showArchived;
  const unfiledNotesForSection = shouldShowUnfiledSection
    ? notes
        .filter(n => !n.folderId && !n.archived)
        .filter(n => {
          if (activeTagFilter) {
            const noteTags = (n.tags || []).map(tStr => tStr.split(":")[0].toLowerCase());
            if (!noteTags.includes(activeTagFilter.toLowerCase())) return false;
          }
          if (!searchQuery) return true;
          if (searchQuery.startsWith("#")) {
            const tagQuery = searchQuery.slice(1).toLowerCase();
            if (!tagQuery) return true;
            const noteTags = (n.tags || []).map(tStr => tStr.split(":")[0].toLowerCase());
            return noteTags.some(tag => tag.includes(tagQuery));
          }
          const queryLower = searchQuery.toLowerCase();
          return (n.title || "").toLowerCase().includes(queryLower) || getNoteTextContent(n).toLowerCase().includes(queryLower);
        })
        .sort((a, b) => getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt))
    : [];

  const renderNoteItem = (note: Note) => (
    <div
      key={note.id}
      className={`note-item ${activeNoteId === note.id ? "active" : ""}`}
      onClick={() => handleNoteSelect(note.id)}
      draggable={true}
      onDragStart={(e) => {
        draggedNoteIdRef.current = note.id;
        e.dataTransfer.setData("text/plain", note.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => { draggedNoteIdRef.current = null; }}
    >
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
        {/* Note Type Icon */}
        <div className="note-type-icon">
          {note.type === "journal" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-accent)" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          ) : note.type === "canvas" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22C17.52 22 22 17.52 22 12S17.52 2 12 2 2 6.48 2 12c0 2.22 1.21 4.15 3 5.19l.71.41a6 6 0 0 1-2.91 3.96l-.8 1.43 1.43.8A12.02 12.02 0 0 0 12 22z" />
              <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
              <circle cx="11.5" cy="7.5" r="1" fill="currentColor" />
              <circle cx="16.5" cy="9.5" r="1" fill="currentColor" />
              <circle cx="15.5" cy="14.5" r="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          )}
        </div>
        <div className="note-item-content">
          <h4 className="note-title" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <HighlightedText
                text={
                  note.type === "journal"
                    ? getJournalDisplayTitle(note)
                    : note.title || (note.type === "canvas" ? t("sidebar.untitledCanvas") : t("sidebar.untitledNote"))
                }
                highlight={searchQuery}
              />
            </span>
            {note.pinned && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6, flexShrink: 0 }}>
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
            )}
            {note.starred && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#f59e0b", flexShrink: 0 }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            )}
            {note.color && (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: note.color, display: "inline-block", flexShrink: 0 }} />
            )}
          </h4>
          <span className="note-date">{formatDate(note.updatedAt)}</span>
        </div>
      </div>
      <div className="note-actions" onClick={(e) => e.stopPropagation()}>
        <div className="note-menu-container">
          <button
            type="button"
            className={`note-menu-btn ${openMenuNoteId === note.id ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setOpenMenuNoteId(openMenuNoteId === note.id ? null : note.id);
            }}
            title={t("sidebar-extra.options", "Seçenekler")}
          >
            <MoreVertical size={14} />
          </button>
          
          {openMenuNoteId === note.id && (
            <div className="note-menu-dropdown" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="note-menu-item"
                onClick={() => {
                  setOpenMenuNoteId(null);
                  setInfoModalNoteId(note.id);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                {t("info.title", "Not Bilgileri")}
              </button>

              <div className="dropdown-divider"></div>

              <button
                type="button"
                className="note-menu-item"
                onClick={(e) => {
                  setOpenMenuNoteId(null);
                  handleToggleStar(note, e);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={note.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" style={{ color: note.starred ? "#f59e0b" : "inherit" }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {note.starred ? t("sidebar.removeFromFavorites", "Favorilerden Çıkar") : t("sidebar.addToFavorites", "Favorilere Ekle")}
              </button>

              <button
                type="button"
                className="note-menu-item"
                onClick={(e) => {
                  setOpenMenuNoteId(null);
                  handleTogglePin(note, e);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={note.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
                {note.pinned ? t("sidebar.unpin", "Sabitlemeyi Kaldır") : t("sidebar.pin", "Sabitle")}
              </button>

              <button
                type="button"
                className="note-menu-item"
                onClick={(e) => {
                  setOpenMenuNoteId(null);
                  handleToggleArchive(note, e);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8" />
                  <rect x="1" y="3" width="22" height="5" />
                  <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
                {note.archived ? t("sidebar.unarchive", "Arşivden Çıkar") : t("sidebar.archiveSection", "Arşivle")}
              </button>

              <button
                type="button"
                className="note-menu-item"
                onClick={(e) => { e.stopPropagation(); setColorPickerNoteId(colorPickerNoteId === note.id ? null : note.id); }}
              >
                <Palette size={14} />
                {t("noteMenu.colorLabel", "Renk Etiketi")}
              </button>
              {colorPickerNoteId === note.id && (
                <div className="color-picker-row" onClick={(e) => e.stopPropagation()}>
                  {COLOR_PRESETS.map(c => (
                    <button key={c} type="button" className="color-dot" style={{ background: c }}
                      onClick={() => { handleNoteColorChange(note.id, c); setColorPickerNoteId(null); setOpenMenuNoteId(null); }} />
                  ))}
                  <button type="button" className="color-dot color-dot-custom" title={t("noteMenu.customColor", "Özel Renk")}
                    onClick={() => { colorTargetRef.current = { type: "note", id: note.id }; nativeColorInputRef.current?.click(); setColorPickerNoteId(null); setOpenMenuNoteId(null); }} />
                  {note.color && (
                    <button type="button" className="color-dot color-dot-clear" title={t("noteMenu.clearColor", "Rengi Kaldır")}
                      onClick={() => { handleNoteColorChange(note.id, ""); setColorPickerNoteId(null); setOpenMenuNoteId(null); }} />
                  )}
                </div>
              )}

              <div className="dropdown-divider"></div>

              <button
                type="button"
                className="note-menu-item"
                onClick={() => {
                  setOpenMenuNoteId(null);
                  window.open(window.location.origin + getNoteRoute(note.id), "_blank");
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                {t("noteMenu.openInNewTab", "Yeni Sekmede Aç")}
              </button>

              {isElectron() && (
                <button
                  type="button"
                  className="note-menu-item"
                  onClick={() => {
                    setOpenMenuNoteId(null);
                    const api = (window as any).electronAPI;
                    api?.openExternal?.("tidenote://open?note=" + note.id);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  {t("noteMenu.openInDesktop", "Masaüstü Uygulamasında Aç")}
                </button>
              )}

              <div className="dropdown-divider"></div>

              <button
                type="button"
                className="note-menu-item danger"
                onClick={(e) => {
                  setOpenMenuNoteId(null);
                  handleDeleteClick(note.id, e);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {t("modal.deleteTitle", "Sil")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <aside 
      className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""} ${isMobileSidebarOpen ? "open" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle to collapse */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '8px',
          height: '100%',
          cursor: 'col-resize',
          zIndex: 5
        }}
        onMouseDown={handleEdgeDrag}
      />

      {/* Tab toggle button */}
      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        title={isSidebarCollapsed ? (i18n.language.startsWith("tr") ? "Genişlet" : "Expand") : (i18n.language.startsWith("tr") ? "Daralt" : "Collapse")}
      >
        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="sidebar-header">
        <div className="sidebar-brand-row" style={{ display: "flex", alignItems: "center", justifyContent: isSidebarCollapsed ? "center" : "flex-start", width: "100%", position: "relative", minHeight: "32px" }}>
          {!isSidebarCollapsed ? (
            <h1 className="app-title" onClick={() => { navigate("/"); setActiveNoteId(null); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <img 
                src={logoSrc} 
                className="app-logo-img"
                alt="TideNote"
                style={{
                  width: '28px',
                  height: '28px',
                  objectFit: 'contain'
                }}
              />
              <span style={{
                fontWeight: 700,
                fontSize: '1.1rem',
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap'
              }}>
                TideNote
              </span>
            </h1>
          ) : (
            <img 
              src={logoSrc} 
              className="app-logo-img"
              alt="TideNote"
              onClick={() => { navigate("/"); setActiveNoteId(null); }}
              style={{
                width: '28px',
                height: '28px',
                objectFit: 'contain',
                cursor: 'pointer',
                margin: '0 auto'
              }}
              title="TideNote"
            />
          )}
        </div>
        
        {/* Dropdown triggers */}
        <div className="new-note-container" ref={dropdownContainerRef}>
          <button 
            className="new-note-btn" 
            onClick={() => setIsNewNoteDropdownOpen(!isNewNoteDropdownOpen)} 
            disabled={!user}
            title={isSidebarCollapsed ? t("sidebar.newNote") : undefined}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {!isSidebarCollapsed && t("sidebar.newNote")}
          </button>

          {isNewNoteDropdownOpen && (
            <div className="new-note-dropdown">
              <button type="button" className="new-note-option" onClick={() => handleCreateNote("document")}>
                <FilePlus size={14} style={{ flexShrink: 0 }} />
                {t("sidebar.newDocument")}
              </button>
              <button type="button" className="new-note-option" onClick={() => handleCreateNote("canvas")}>
                <PenSquare size={14} style={{ flexShrink: 0 }} />
                {t("sidebar.newCanvas")}
              </button>
              <div className="dropdown-divider"></div>
              <div
                className="new-note-option templates-option"
                onMouseEnter={() => setIsTemplatesSubmenuOpen(true)}
                onMouseLeave={() => setIsTemplatesSubmenuOpen(false)}
                onClick={() => setIsTemplatesSubmenuOpen(prev => !prev)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <LayoutTemplate size={14} style={{ flexShrink: 0 }} />
                  {t("sidebar.createFromTemplate", "Şablondan Oluştur")}
                </span>
                <span className="arrow-icon">›</span>

                {isTemplatesSubmenuOpen && (
                  <div className="templates-submenu">
                    {TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        className="template-submenu-item"
                        onClick={() => handleCreateFromTemplate(tmpl)}
                      >
                        <span className="template-item-icon">
                          {tmpl.icon === "meeting" && <Users size={14} style={{ flexShrink: 0 }} />}
                          {tmpl.icon === "daily" && <CalendarDays size={14} style={{ flexShrink: 0 }} />}
                          {tmpl.icon === "brainstorm" && <Lightbulb size={14} style={{ flexShrink: 0 }} />}
                          {tmpl.icon === "project" && <Kanban size={14} style={{ flexShrink: 0 }} />}
                        </span>
                        <div className="template-item-meta">
                          <span className="template-item-name">{tmpl.name}</span>
                          <span className="template-item-desc">{tmpl.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today's Journal Button & Collapsible Past Journals */}
        {user && (
          <div className="journal-sidebar-section" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
            <button 
              className="today-journal-btn"
              onClick={handleTodayJournalClick}
              title={isSidebarCollapsed ? t("journal.today", "Bugün") : undefined}
            >
              <span className="today-journal-btn-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              {!isSidebarCollapsed && <span>{t("journal.today", "Bugün")}</span>}
              {!isSidebarCollapsed && <span className="today-journal-btn-date">{getTodayShortDate()}</span>}
            </button>
            
            {/* Collapsible journals list has been removed as they are displayed in the main notes list */}
          </div>
        )}

        {/* Search & Sort Section */}
        {user && (
          isSidebarCollapsed ? (
            <button 
              className="mini-search-btn"
              onClick={() => setIsSidebarCollapsed(false)}
              title={t("sidebar.searchPlaceholder")}
            >
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          ) : (
            <div className="sidebar-controls">
              <div className="search-box-container">
                <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder={t("sidebar.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-clear-btn" onClick={() => setSearchQuery("")} aria-label="Clear search">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="sort-container-custom" ref={sortDropdownRef}>
                <button
                  type="button"
                  className="sort-dropdown-btn"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                >
                  ↕ {getSortLabel(sortBy)} ▾
                </button>
                {isSortDropdownOpen && (
                  <div className="sort-dropdown-panel">
                    <button
                      type="button"
                      className={`sort-dropdown-option ${sortBy === "updatedAt" ? "active" : ""}`}
                      onClick={() => {
                        setSortBy("updatedAt");
                        setIsSortDropdownOpen(false);
                      }}
                    >
                      {t("sidebar.sortUpdated")}
                    </button>
                    <button
                      type="button"
                      className={`sort-dropdown-option ${sortBy === "createdAt" ? "active" : ""}`}
                      onClick={() => {
                        setSortBy("createdAt");
                        setIsSortDropdownOpen(false);
                      }}
                    >
                      {t("sidebar.sortCreated")}
                    </button>
                    <button
                      type="button"
                      className={`sort-dropdown-option ${sortBy === "title" ? "active" : ""}`}
                      onClick={() => {
                        setSortBy("title");
                        setIsSortDropdownOpen(false);
                      }}
                    >
                      {t("sidebar.sortTitle")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* Tags horizontal filter bar */}
        {user && !isSidebarCollapsed && allUniqueTags.length > 0 && !showArchived && (
          <div className="sidebar-tags-scroll">
            <button
              type="button"
              className={`sidebar-tag-filter-badge ${activeTagFilter === null ? "active" : ""}`}
              onClick={() => setActiveTagFilter(null)}
            >
              {t("sidebar.allTags")}
            </button>
            {allUniqueTags.map((tagName) => (
              <button
                key={tagName}
                type="button"
                className={`sidebar-tag-filter-badge ${activeTagFilter === tagName ? "active" : ""}`}
                onClick={() => setActiveTagFilter(activeTagFilter === tagName ? null : tagName)}
              >
                #{tagName}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isSidebarCollapsed && (
        <div className={`notes-list density-${listDensity}`}>
          {/* Folders & Collections section */}
          {user && (
            <div className="sidebar-folders-section">
              <div className="folders-section-header">
                <span className="folders-section-label">{t("sidebar.organization", "KLASÖRLER & KOLEKSİYONLAR")}</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="folder-plus-btn"
                    title={t("folders.newFolder", "Yeni Klasör")}
                    onClick={() => handleCreateFolder(null)}
                  >
                    <FolderPlus size={13} />
                  </button>
                  <button
                    type="button"
                    className="folder-plus-btn"
                    title={t("collections.newCollection", "Yeni Koleksiyon")}
                    onClick={() => {
                      setCollectionToEdit(null);
                      setIsCollectionModalOpen(true);
                    }}
                  >
                    <Sparkles size={13} />
                  </button>
                </div>
              </div>
              {/* Folders */}
              {rootFolders.map((f) => renderFolderItem(f, 0))}
              <div
                className={`folder-item${activeFolderId === "unfiled" ? " active" : ""}`}
                style={{ paddingLeft: "8px" }}
                onClick={() => { setActiveFolderId(activeFolderId === "unfiled" ? null : "unfiled"); setActiveCollectionId(null); }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; (e.currentTarget as HTMLElement).classList.add("drag-over"); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { (e.currentTarget as HTMLElement).classList.remove("drag-over"); } }}
                onDrop={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.remove("drag-over"); draggedNoteIdRef.current = draggedNoteIdRef.current || e.dataTransfer.getData("text/plain"); handleDropNoteToFolder(null); }}
              >
                <span style={{ width: 10, display: "inline-block", flexShrink: 0 }} />
                <FolderIcon size={13} className="folder-icon" style={{ opacity: 0.45 }} />
                <span className="folder-name" style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  {t("folders.unfoldered", "Klasörsüz Notlar")}
                </span>
              </div>
              
              {/* Divider between Folders and Collections inside the same section list */}
              {collections.length > 0 && <div style={{ height: 1, background: "var(--color-border)", margin: "8px 4px 4px 4px", opacity: 0.5 }} />}
              
              {/* Collections */}
              {collections.map((col) => renderCollectionItem(col))}
            </div>
          )}

          {notes.length === 0 ? (
            <div style={{ whiteSpace: "pre-line", textAlign: "center", padding: "2rem 0", color: "var(--color-text-muted)", fontSize: "0.82rem", lineHeight: "1.5" }}>
              {t("sidebar.noNotes")}
            </div>
          ) : filteredAndSortedNotes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
              {i18n.language.startsWith("tr") ? "Eşleşen not bulunamadı." : "No matching notes found."}
            </div>
          ) : showArchived ? (
            <div className="notes-section-group">
              <div className="notes-section-title">
                <Archive size={12} style={{ marginRight: 4 }} />{t("sidebar.archiveTitle")}
              </div>
              {filteredAndSortedNotes.map((note) => renderNoteItem(note))}
            </div>
          ) : (
            <>
              {favoriteNotes.length > 0 && (
                <div className="notes-section-group">
                  <div className="notes-section-title">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "4px", color: "#f59e0b" }}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {t("sidebar.favoritesSection")}
                  </div>
                  {favoriteNotes.map((note) => renderNoteItem(note))}
                </div>
              )}

              {pinnedNotes.length > 0 && (
                <div className="notes-section-group">
                  <div className="notes-section-title">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "4px" }}>
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                    {t("sidebar.pinnedSection")}
                  </div>
                  {pinnedNotes.map((note) => renderNoteItem(note))}
                </div>
              )}
              
              {unpinnedNotes.length > 0 && (
                <div className="notes-section-group">
                  {(pinnedNotes.length > 0 || favoriteNotes.length > 0) && (
                    <div className="notes-section-title">
                      {t("sidebar.notesSection")}
                    </div>
                  )}
                  {unpinnedNotes.map((note) => renderNoteItem(note))}
                </div>
              )}
            </>
          )}

          {shouldShowUnfiledSection && unfiledNotesForSection.length > 0 && (
            <div className="notes-section-group unfiled-section">
              <button
                type="button"
                className="unfiled-section-toggle"
                onClick={() => setIsUnfiledSectionOpen(!isUnfiledSectionOpen)}
              >
                <span style={{ fontSize: "9px" }}>{isUnfiledSectionOpen ? "▼" : "▶"}</span>
                <FolderIcon size={10} style={{ opacity: 0.5 }} />
                <span>{t("folders.unfoldered", "Klasörsüz Notlar")} ({unfiledNotesForSection.length})</span>
              </button>
              {isUnfiledSectionOpen && unfiledNotesForSection.map(note => renderNoteItem(note))}
            </div>
          )}
        </div>
      )}

      {user && (
        <div className="sidebar-footer">
          {archivedCount > 0 && (
            <div className="sidebar-footer-row" style={{ borderBottom: isSidebarCollapsed ? "none" : "1px solid var(--color-border)", paddingBottom: isSidebarCollapsed ? "0" : "6px", marginBottom: "4px", justifyContent: isSidebarCollapsed ? "center" : "flex-start", display: "flex" }}>
              <button
                type="button"
                className={`sidebar-archive-toggle-btn ${showArchived ? "active" : ""}`}
                onClick={() => {
                  setShowArchived(!showArchived);
                  setActiveTagFilter(null);
                }}
                title={t("sidebar.archiveTitle") + ` (${archivedCount})`}
              >
                <Archive size={16} />
                {!isSidebarCollapsed && <span> {t("sidebar.archiveTitle")} ({archivedCount})</span>}
              </button>
            </div>
          )}


          {isWebOnly() && !isDismissed && (
            <div className={`sidebar-download-banner ${isSidebarCollapsed ? "collapsed" : ""}`}>
              {isSidebarCollapsed ? (
                <a
                  href={downloadUrl}
                  download
                  title={isTr ? "Masaüstü Uygulamasını İndir" : "Download Desktop App"}
                  className="sidebar-download-link-collapsed"
                >
                  <Laptop size={16} />
                </a>
              ) : (
                <>
                  <a
                    href={downloadUrl}
                    download
                    className="sidebar-download-link"
                  >
                    <Laptop size={14} className="sidebar-download-icon" />
                    <span>{isTr ? "Masaüstü uygulamasını indir" : "Download desktop app"}</span>
                  </a>
                  <button
                    onClick={() => {
                      sessionStorage.setItem("desktop-download-dismissed", "true");
                      setIsDismissed(true);
                    }}
                    className="sidebar-download-close"
                    title={isTr ? "Kapat" : "Close"}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          )}

          <div className="sidebar-footer-row" style={{ display: "flex", flexDirection: isSidebarCollapsed ? "column" : "row", alignItems: "center", gap: isSidebarCollapsed ? "12px" : "8px", width: "100%" }}>
            <button
              type="button"
              className="sidebar-theme-toggle-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Açık Tema" : "Koyu Tema"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className="sidebar-theme-toggle-btn"
              onClick={() => setIsBugReportOpen(true)}
              title="Bug Bildir"
              aria-label="Bug Report"
            >
              <Bug size={18} />
            </button>

            <button
              type="button"
              className="sidebar-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              title={t("settings.title", "Ayarlar")}
              aria-label="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>

            {(() => {
              const resolvedName = getResolvedName(user, firestoreUser);
              return (
                <div 
                  className="sidebar-profile-group" 
                  onClick={() => {
                    setSettingsTab("account");
                    setIsSettingsOpen(true);
                  }}
                  title={resolvedName}
                >
                  <div className="sidebar-avatar-container">
                    {user.photoURL ? (
                      <img src={user.photoURL} className="sidebar-avatar-img" alt="Avatar" />
                    ) : (
                      <span>{resolvedName[0].toUpperCase()}</span>
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="sidebar-user-name">
                      {resolvedName}
                    </span>
                  )}
                </div>
              );
            })()}

            {isSidebarCollapsed ? (
              <button 
                type="button"
                className="sidebar-logout-icon-btn" 
                onClick={handleSignOut}
                title={t("auth.logout")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s"
                }}
              >
                <LogOut size={18} />
              </button>
            ) : (
              <button 
                className="sidebar-logout-btn" 
                onClick={handleSignOut}
                title={t("auth.logout")}
              >
                <LogOut size={18} className="logout-icon" />
                <span className="logout-text">{t("auth.logout")}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {folderModal.isOpen && (
        <div className={`modal-overlay${folderModal.isClosing ? " closing" : ""}`} onClick={closeFolderModal}>
          <div className="folder-name-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="folder-name-modal-title">
              {folderModal.mode === "create" ? t("folders.newFolder", "Yeni Klasör") : t("folders.renameFolder", "Klasörü Yeniden Adlandır")}
            </h3>
            <input
              className="folder-name-modal-input"
              value={folderModal.value}
              onChange={(e) => setFolderModal(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmFolderModal();
                if (e.key === "Escape") closeFolderModal();
              }}
              autoFocus
              placeholder={t("folders.untitledFolder", "Başlıksız Klasör")}
            />
            <div className="folder-name-modal-actions">
              <button type="button" className="folder-name-modal-cancel" onClick={closeFolderModal}>
                {t("modal.cancel", "İptal")}
              </button>
              <button type="button" className="folder-name-modal-confirm" onClick={confirmFolderModal}>
                {folderModal.mode === "create" ? t("folders.create", "Oluştur") : t("folders.save", "Kaydet")}
              </button>
            </div>
          </div>
        </div>
      )}
      <input
        type="color"
        ref={nativeColorInputRef}
        style={{ display: "none" }}
        onChange={(e) => {
          if (colorTargetRef.current) {
            const { type, id } = colorTargetRef.current;
            if (type === "note") handleNoteColorChange(id, e.target.value);
            else handleFolderColorChange(id, e.target.value);
            colorTargetRef.current = null;
          }
        }}
      />
      <ConfirmModal
        isOpen={deleteNoteId !== null}
        title={t("modal.deleteTitle")}
        message={t("modal.deleteMessage")}
        onConfirm={confirmDeleteNote}
        onCancel={() => setDeleteNoteId(null)}
      />
      <ConfirmModal
        isOpen={deletingFolderId !== null}
        title={t("folders.delete", "Klasörü Sil")}
        message={t("folders.deleteConfirm", "Bu klasör ve alt klasörleri silinecek. İçindeki notlar klasörsüz kalacak. Emin misin?")}
        onConfirm={confirmDeleteFolder}
        onCancel={() => setDeletingFolderId(null)}
      />
      {user && (
        <CollectionModal
          isOpen={isCollectionModalOpen}
          onClose={() => {
            setIsCollectionModalOpen(false);
            setCollectionToEdit(null);
          }}
          collectionToEdit={collectionToEdit}
          allUniqueTags={allUniqueTags}
          allNotes={notes.filter(n => !n.archived)}
          uid={user.uid}
        />
      )}
      <ConfirmModal
        isOpen={deletingCollectionId !== null}
        title={t("collections.deleteTitle", "Koleksiyonu Sil")}
        message={t("collections.deleteConfirm", "Bu koleksiyonu silmek istediğinize emin misiniz? Notlarınız silinmeyecektir.")}
        onConfirm={confirmDeleteCollection}
        onCancel={() => setDeletingCollectionId(null)}
      />
      {isBugReportOpen && (
        <BugReportModal onClose={() => setIsBugReportOpen(false)} />
      )}
    </aside>
  );
}
