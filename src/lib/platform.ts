import { Capacitor } from "@capacitor/core";

export const isElectron = (): boolean => {
  const isAgent = typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.includes("Electron");
  const isProcess = typeof window !== "undefined" && (window as any).process?.versions?.electron;
  return !!(isAgent || isProcess);
};

export const isCapacitor = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getNoteRoute = (noteId: string): string => {
  // tidenote.app web sitesi her zaman BrowserRouter (/#/ olmadan) kullanır.
  // Native uygulamada bile olsak, paylaşılan link web sitemize gideceği için
  // url'de her zaman /note/.. olmalıdır.
  return `/note/${noteId}`;
};

export const getAuthRedirectUrl = (): string => {
  // If we authenticate on the web browser, it depends on whether the web app uses HashRouter or BrowserRouter.
  // Since the hosted web version will be BrowserRouter, the redirect path must match.
  return "https://tidenote.app/auth-redirect";
};
