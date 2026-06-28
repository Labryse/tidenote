import { useEffect, useState, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Canvas from "./components/Canvas";
import Auth from "./components/Auth";
import Toast from "./components/Toast";
import LandingPage from "./pages/LandingPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import TopBar from "./components/TopBar";
import EmptyState from "./components/EmptyState";
import SettingsModal from "./components/SettingsModal";
import QuickCapture from "./components/QuickCapture";
import UpdateNotification from "./components/UpdateNotification";
import { useNoteStore } from "./store/useNoteStore";
import { isElectron, calculateStorageBytes } from "./lib/utils";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import AuthRedirectPage from "./pages/AuthRedirectPage";
import InfoModal from "./components/InfoModal";
import LoadingSpinner from "./components/LoadingSpinner";
import PublicNotePage from "./pages/PublicNotePage";

function VerificationBanner() {
  const { user, showToast } = useNoteStore();
  const [dismissed, setDismissed] = useState(
    sessionStorage.getItem("emailVerificationDismissed") === "true"
  );

  if (!user || user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        showToast("Doğrulama maili gönderildi. Lütfen e-postanızı kontrol edin.", "success");
      }
    } catch (err: any) {
      console.error("Error resending email verification:", err);
      showToast(err.message || "Doğrulama maili gönderilemedi.", "error");
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("emailVerificationDismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="verification-warning-banner">
      <span className="banner-text">
        E-postanız henüz doğrulanmadı.
      </span>
      <div className="banner-actions">
        <button type="button" className="banner-btn resend" onClick={handleResend}>
          Tekrar Gönder
        </button>
        <button type="button" className="banner-btn dismiss" onClick={handleDismiss} aria-label="Kapat">
          &times;
        </button>
      </div>
    </div>
  );
}

function WorkspaceApp() {
  const {
    activeNoteId,
    setActiveNoteId,
    isLoading,
    notes,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    user,
    userTier,
    showToast,
    setIsSettingsOpen,
    setSettingsTab,
    setIsNewNoteDropdownOpen,
    setIsExportDropdownOpen,
    setIsQuickCaptureOpen,
    isCanvasFullscreen,
    setIsCanvasFullscreen
  } = useNoteStore();

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

  // Reset fullscreen when note ID changes
  useEffect(() => {
    setIsCanvasFullscreen(false);
  }, [activeNoteId, setIsCanvasFullscreen]);

  // Load note from URL query parameter (?note=ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noteIdFromUrl = params.get("note");
    if (noteIdFromUrl && notes.length > 0) {
      if (notes.some((n) => n.id === noteIdFromUrl)) {
        if (activeNoteId !== noteIdFromUrl) {
          setActiveNoteId(noteIdFromUrl);
        }
      }
    }
  }, [notes, activeNoteId, setActiveNoteId]);

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const activeNoteType = activeNote?.type || "document";

  useEffect(() => {
    if (isLoading || notes.length === 0 || !user) return;

    const usedBytes = calculateStorageBytes(notes);
    const usedMB = usedBytes / (1024 * 1024);
    const limitMB = userTier === "premium" ? 10240 : 1024;
    const percentage = (usedMB / limitMB) * 100;

    if (percentage > 80) {
      const today = new Date().toDateString();
      const lastShown = localStorage.getItem("lastStorageWarningDate");
      if (lastShown !== today) {
        localStorage.setItem("lastStorageWarningDate", today);
        showToast(
          `⚠️ Depolama alanınız %${percentage.toFixed(1)} dolu. Premium'a geçerek 10GB'a yükseltin.`,
          "warning",
          "Planı Gör",
          () => {
            setSettingsTab("billing");
            setIsSettingsOpen(true);
          }
        );
      }
    }
  }, [isLoading, notes, user, userTier, showToast, setIsSettingsOpen, setSettingsTab]);

  useEffect(() => {
    if (!user) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;

      if (isModifierPressed && e.shiftKey && e.key.toLowerCase() === "c") {
        const target = e.target as HTMLElement;
        const isEditingText =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.tagName === "SELECT";

        if (!isEditingText) {
          e.preventDefault();
        }
        setIsQuickCaptureOpen(!useNoteStore.getState().isQuickCaptureOpen);
        return;
      }

      if (e.key === "Escape") {
        setIsSettingsOpen(false);
        setIsNewNoteDropdownOpen(false);
        setIsExportDropdownOpen(false);
        setIsMobileSidebarOpen(false);
        return;
      }

      if (isModifierPressed) {
        const key = e.key.toLowerCase();
        const target = e.target as HTMLElement;
        const isEditingText =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.tagName === "SELECT";

        if (key === "n" && !isEditingText) {
          e.preventDefault();
          setIsNewNoteDropdownOpen(true);
        } else if (key === "k" && !isEditingText) {
          e.preventDefault();
          const searchInput = document.querySelector(".search-input") as HTMLInputElement;
          searchInput?.focus();
        } else if (key === ",") {
          e.preventDefault();
          setSettingsTab("account");
          setIsSettingsOpen(true);
        } else if (key === "e" && activeNoteId) {
          e.preventDefault();
          setIsExportDropdownOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    user,
    activeNoteId,
    setIsSettingsOpen,
    setIsNewNoteDropdownOpen,
    setIsExportDropdownOpen,
    setIsMobileSidebarOpen,
    setSettingsTab,
    setIsQuickCaptureOpen
  ]);

  return (
    <div className={`app-container ${isCanvasFullscreen ? "canvas-fullscreen-active" : ""}`}>
      <QuickCapture />
      {/* Mobile Hamburger Button */}
      <button 
        className="mobile-hamburger" 
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="mobile-sidebar-overlay" 
          onClick={() => setIsMobileSidebarOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
      )}

      <Sidebar />
      <main className="main-content">
        {isLoading ? (
          <div className="empty-state">
            <LoadingSpinner label="Notlar Yükleniyor..." />
          </div>
        ) : activeNoteId && activeNote ? (
          <div className="content-area">
            <VerificationBanner />
            <TopBar note={activeNote} />
            {activeNoteType === "canvas" ? (
              <Canvas />
            ) : (
              <div className="editor-workspace">
                <div className="editor-card">
                  <Editor />
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function App() {
  const {
    user,
    setUser,
    setIsLoading,
    theme,
    setUserTier,
    setFirestoreUser
  } = useNoteStore();
  const [authChecking, setAuthChecking] = useState(true);

  // Android hardware back button
  useEffect(() => {
    const handler = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.minimizeApp();
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, []);

  // Sync theme attribute on document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!isElectron()) return;

    const handleDeepLinkAuth = async (
      _event: unknown,
      { accessToken }: { accessToken: string }
    ) => {
      try {
        const { GoogleAuthProvider, signInWithCredential } = await import(
          "firebase/auth"
        );

        const credential = GoogleAuthProvider.credential(null, accessToken);
        await signInWithCredential(auth, credential);
        useNoteStore.getState().showToast("Google ile giriş başarılı! 🎉", "success");
      } catch (err) {
        const error = err as { message?: string };
        console.error("Deep link auth:", error);
        useNoteStore.getState().showToast(
          "Giriş yapılamadı: " + (error.message || "Bilinmeyen hata"),
          "error"
        );
      }
    };

    const handleOpenNote = (
      _event: unknown,
      { noteId }: { noteId: string }
    ) => {
      if (noteId) {
        useNoteStore.getState().setActiveNoteId(noteId);
      }
    };

    const api = (window as any).electronAPI;
    api?.onDeepLinkAuth(handleDeepLinkAuth);
    api?.onOpenNote?.(handleOpenNote);

    return () => {
      api?.removeDeepLinkAuth?.();
      api?.removeOpenNote?.();
    };
  }, []);


  useEffect(() => {
    let isMounted = true;
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Listen to changes on the user doc
        const unsub = onSnapshot(userDocRef, async (docSnap) => {
          if (!isMounted) {
            unsub();
            return;
          }
          if (!docSnap.exists()) {
            // First time login - create user doc with free tier
            try {
              await setDoc(userDocRef, {
                tier: "free",
                createdAt: serverTimestamp(),
              });
            } catch (err) {
              console.error("Error creating user doc:", err);
              if (isMounted) {
                setUserTier("free");
                setFirestoreUser(null);
              }
            }
          } else {
            const data = docSnap.data();
            if (isMounted) {
              setUserTier(data?.tier || "free");
              setFirestoreUser(data || null);
            }
          }
        }, (error) => {
          console.warn("User doc snapshot error:", error.code, error.message);
          if (isMounted) {
            setUserTier("free");
            setFirestoreUser(null);
          }
        });
        unsubscribeUserDoc = unsub;
      } else {
        setUser(null);
        setUserTier("free");
        setFirestoreUser(null);
      }
      
      setAuthChecking(false);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, [setUser, setUserTier, setIsLoading, setFirestoreUser]);

  if (authChecking) {
    return (
      <div className="auth-page-container">
        <div className="empty-state">
          <LoadingSpinner label="Kimlik Doğrulanıyor..." />
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast />
      <SettingsModal />
      <InfoModal />
      <UpdateNotification />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Auth />} />
        <Route path="/auth-redirect" element={<AuthRedirectPage />} />
        <Route path="/app" element={user ? <WorkspaceApp /> : <Navigate to="/login" replace />} />
        <Route path="/note/:noteId" element={<PublicNotePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
