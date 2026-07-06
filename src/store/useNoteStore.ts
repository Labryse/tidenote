import { create } from "zustand";
import type { User } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";

let titleSaveTimeout: any = null;

export interface Note {
  id: string;
  title: string;
  type: "document" | "canvas" | "journal";
  journalDate?: string;
  content: any; // JSON block data or Excalidraw content
  elements?: string;
  appState?: string;
  files?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  pinned?: boolean;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
  folderId?: string | null;
  isPublic?: boolean;
  color?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: any;
  order: number;
  color?: string | null;
}

export interface CollectionFilters {
  type: 'tag' | 'dateRange' | 'noteType' | 'combined';
  tagIds: string[];
  dateRangeDays: number | null; // son X gün
  noteType: 'document' | 'canvas' | 'all';
  favoriteOnly: boolean;
}

export interface Collection {
  id: string;
  name: string;
  icon: string; // Lucide icon name or emoji
  filters: CollectionFilters;
  createdAt: any;
}

export interface ToastState {
  message: string;
  type: "success" | "error" | "warning";
  actionLabel?: string;
  onActionClick?: () => void;
}

interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean;
  user: User | null;
  firestoreUser: any | null;
  toast: ToastState | null;
  saveStatus: "saved" | "saving" | "error";
  theme: "light" | "dark";
  isMobileSidebarOpen: boolean;
  userTier: "free" | "premium";
  editorInstance: any | null;
  excalidrawAPI: any | null;
  setNotes: (notes: Note[]) => void;
  setActiveNoteId: (id: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setUser: (user: User | null) => void;
  setFirestoreUser: (firestoreUser: any | null) => void;
  showToast: (message: string, type?: "success" | "error" | "warning", actionLabel?: string, onActionClick?: () => void) => void;
  hideToast: () => void;
  setSaveStatus: (status: "saved" | "saving" | "error") => void;
  setTheme: (theme: "light" | "dark") => void;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  setUserTier: (tier: "free" | "premium") => void;
  setEditorInstance: (editor: any | null) => void;
  setExcalidrawAPI: (api: any | null) => void;
  createNote: (type: "document" | "canvas", title: string) => Promise<string | null>;
  editorFontSize: "small" | "medium" | "large";
  listDensity: "compact" | "normal" | "comfortable";
  isSettingsOpen: boolean;
  settingsTab: "account" | "appearance" | "storage" | "billing" | "import" | "about";
  setEditorFontSize: (editorFontSize: "small" | "medium" | "large") => void;
  setListDensity: (listDensity: "compact" | "normal" | "comfortable") => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setSettingsTab: (tab: "account" | "appearance" | "storage" | "billing" | "import" | "about") => void;
  isNewNoteDropdownOpen: boolean;
  isExportDropdownOpen: boolean;
  setIsNewNoteDropdownOpen: (isOpen: boolean) => void;
  setIsExportDropdownOpen: (isOpen: boolean) => void;
  activeNoteTitle: string;
  setActiveNoteTitle: (title: string) => void;
  updateNoteTitle: (noteId: string, title: string) => void;
  isQuickCaptureOpen: boolean;
  setIsQuickCaptureOpen: (isOpen: boolean) => void;
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (isOpen: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (isCollapsed: boolean) => void;
  isCanvasFullscreen: boolean;
  setIsCanvasFullscreen: (isFullscreen: boolean) => void;
  infoModalNoteId: string | null;
  setInfoModalNoteId: (noteId: string | null) => void;
  folders: Folder[];
  setFolders: (folders: Folder[]) => void;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  activeNoteId: null,
  isLoading: true,
  user: null,
  firestoreUser: null,
  toast: null,
  saveStatus: "saved",
  theme: (localStorage.getItem("theme") as "light" | "dark") || "dark",
  isMobileSidebarOpen: false,
  userTier: "free",
  editorInstance: null,
  excalidrawAPI: null,
  editorFontSize: (localStorage.getItem("editorFontSize") as "small" | "medium" | "large") || "medium",
  listDensity: (localStorage.getItem("listDensity") as "compact" | "normal" | "comfortable") || "normal",
  isSettingsOpen: false,
  settingsTab: "account",
  setNotes: (notes) => set({ notes }),
  setActiveNoteId: (activeNoteId) => set({ activeNoteId }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setUser: (user) => set({ user }),
  setFirestoreUser: (firestoreUser) => set({ firestoreUser }),
  showToast: (message: string, type: "success" | "error" | "warning" = "error", actionLabel?: string, onActionClick?: () => void) => set({ toast: { message, type, actionLabel, onActionClick } }),
  hideToast: () => set({ toast: null }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
  setIsMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
  setUserTier: (userTier) => set({ userTier }),
  setEditorInstance: (editorInstance) => set({ editorInstance }),
  setExcalidrawAPI: (excalidrawAPI) => set({ excalidrawAPI }),
  setEditorFontSize: (editorFontSize) => {
    localStorage.setItem("editorFontSize", editorFontSize);
    set({ editorFontSize });
  },
  setListDensity: (listDensity) => {
    localStorage.setItem("listDensity", listDensity);
    set({ listDensity });
  },
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setSettingsTab: (settingsTab) => set({ settingsTab }),
  isNewNoteDropdownOpen: false,
  isExportDropdownOpen: false,
  setIsNewNoteDropdownOpen: (isNewNoteDropdownOpen) => set({ isNewNoteDropdownOpen }),
  setIsExportDropdownOpen: (isExportDropdownOpen) => set({ isExportDropdownOpen }),
  isQuickCaptureOpen: false,
  setIsQuickCaptureOpen: (isQuickCaptureOpen) => set({ isQuickCaptureOpen }),
  isUpgradeModalOpen: false,
  setIsUpgradeModalOpen: (isUpgradeModalOpen) => set({ isUpgradeModalOpen }),
  isSidebarCollapsed: typeof window !== "undefined" && (
    localStorage.getItem("sidebar-mode") === "mini" ||
    (localStorage.getItem("sidebar-mode") === null && window.innerWidth <= 1366)
  ),
  setIsSidebarCollapsed: (isSidebarCollapsed) => {
    localStorage.setItem("sidebar-mode", isSidebarCollapsed ? "mini" : "full");
    set({ isSidebarCollapsed });
  },
  isCanvasFullscreen: false,
  setIsCanvasFullscreen: (isCanvasFullscreen) => set({ isCanvasFullscreen }),
  infoModalNoteId: null,
  setInfoModalNoteId: (infoModalNoteId) => set({ infoModalNoteId }),
  folders: [],
  setFolders: (folders) => set({ folders }),
  activeFolderId: null,
  setActiveFolderId: (activeFolderId) => set({ activeFolderId }),
  createNote: async (type, title) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      set({ toast: { message: "Giriş hatası", type: "error" } });
      return null;
    }
    try {
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
      set({ activeNoteId: docRef.id, isMobileSidebarOpen: false });
      return docRef.id;
    } catch (error: any) {
      console.error("Error creating note:", error);
      set({ toast: { message: error.message || "Not oluşturulamadı", type: "error" } });
      return null;
    }
  },
  activeNoteTitle: "",
  setActiveNoteTitle: (activeNoteTitle) => set({ activeNoteTitle }),
  updateNoteTitle: (noteId, title) => {
    set({ activeNoteTitle: title });
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? { ...n, title } : n)),
    }));

    if (titleSaveTimeout) {
      clearTimeout(titleSaveTimeout);
    }

    titleSaveTimeout = setTimeout(async () => {
      try {
        const noteRef = doc(db, "notes", noteId);
        await updateDoc(noteRef, {
          title,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Error saving title to Firestore:", err);
      }
    }, 1000);
  },
}));

export const PREMIUM_ENABLED = false; // TODO: 50-100 kullanıcıda true yap

export const useSubscription = () => {
  const userTier = useNoteStore((state) => state.userTier);
  const checkActualSubscription = () => userTier === "premium";
  const isPremium = PREMIUM_ENABLED ? checkActualSubscription() : true;
  return { isPremium };
};

