import { create } from "zustand";
import type { User } from "firebase/auth";

export interface Note {
  id: string;
  title: string;
  type: "document" | "canvas";
  content: any; // JSON block data or Excalidraw content
  elements?: string;
  appState?: string;
  files?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface ToastState {
  message: string;
  type: "success" | "error";
}

interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean;
  user: User | null;
  toast: ToastState | null;
  theme: "light" | "dark";
  isMobileSidebarOpen: boolean;
  setNotes: (notes: Note[]) => void;
  setActiveNoteId: (id: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setUser: (user: User | null) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  hideToast: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  activeNoteId: null,
  isLoading: true,
  user: null,
  toast: null,
  theme: (localStorage.getItem("theme") as "light" | "dark") || "dark",
  isMobileSidebarOpen: false,
  setNotes: (notes) => set({ notes }),
  setActiveNoteId: (activeNoteId) => set({ activeNoteId }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setUser: (user) => set({ user }),
  showToast: (message, type = "error") => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),
  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
  setIsMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
}));
