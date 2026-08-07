import { useNoteStore } from '../store/useNoteStore';
import darkLogo from '../../public/tnlogo.png';
import lightLogo from '../../public/icon.png';

export const useLogoSrc = (): string => {
  const theme = useNoteStore(s => s.theme);
  // Vite'ın asset yönetimini kullanarak logoların her ortamda doğru yüklenmesini garanti ediyoruz
  return theme === 'dark' ? darkLogo : lightLogo;
};

export const isElectron = (): boolean => {
  return (
    (typeof window !== "undefined" && typeof (window as Window & { electronAPI?: unknown }).electronAPI !== "undefined") ||
    (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("electron"))
  );
};

export const calculateStorageBytes = (notesList: any[]): number => {
  return notesList.reduce((total, note) => {
    const contentSize = note.content ? JSON.stringify(note.content).length : 0;
    const elementsSize = note.elements ? note.elements.length : 0;
    const filesSize = note.files ? note.files.length : 0;
    return total + contentSize + elementsSize + filesSize;
  }, 0);
};

export const getResolvedName = (user: any, firestoreUser: any): string => {
  if (firestoreUser) {
    if (typeof firestoreUser.displayName === "string" && firestoreUser.displayName.trim()) {
      return firestoreUser.displayName.trim();
    }
    if (typeof firestoreUser.username === "string" && firestoreUser.username.trim()) {
      return firestoreUser.username.trim();
    }
  }
  if (user) {
    if (typeof user.displayName === "string" && user.displayName.trim()) {
      return user.displayName.trim();
    }
  }
  return "Kullanıcı";
};
