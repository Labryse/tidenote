import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Canvas from "./components/Canvas";
import Auth from "./components/Auth";
import Toast from "./components/Toast";
import LandingPage from "./pages/LandingPage";
import PlaceholderPage from "./components/PlaceholderPage";
import { useNoteStore } from "./store/useNoteStore";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "react-i18next";

function WorkspaceApp() {
  const { activeNoteId, isLoading, notes, isMobileSidebarOpen, setIsMobileSidebarOpen } = useNoteStore();
  const activeNote = notes.find((n) => n.id === activeNoteId);
  const activeNoteType = activeNote?.type || "document";

  return (
    <div className="app-container">
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
        />
      )}

      <Sidebar />
      <main 
        className="main-content"
        style={{
          padding: activeNoteId && activeNoteType === "canvas" ? "0" : "0 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: activeNoteId && activeNoteType === "canvas" ? "stretch" : "center",
          justifyContent: activeNoteId && activeNoteType === "canvas" ? "stretch" : (activeNoteId ? "flex-start" : "center"),
          overflow: activeNoteId && activeNoteType === "canvas" ? "hidden" : "auto"
        }}
      >
        {isLoading ? (
          <div className="empty-state" style={{ marginTop: activeNoteId ? "4rem" : "0" }}>
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
              style={{ animation: "spin 1s linear infinite" }}
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
            <h3>Notlar Yükleniyor...</h3>
          </div>
        ) : activeNoteId ? (
          activeNoteType === "canvas" ? (
            <Canvas />
          ) : (
            <div className="editor-card">
              <Editor />
            </div>
          )
        ) : (
          <div className="empty-state">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--color-text-muted)" }}
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <h3>Henüz not yok</h3>
            <p>Soldaki panelden <strong>+ Yeni Not</strong> butonuna basarak not oluşturun.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  const { user, setUser, setIsLoading, theme } = useNoteStore();
  const [authChecking, setAuthChecking] = useState(true);
  const { t } = useTranslation();

  // Sync theme attribute on document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecking(false);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setIsLoading]);

  if (authChecking) {
    return (
      <div className="auth-page-container">
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
            style={{ animation: "spin 1s linear infinite" }}
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
          <h3>Kimlik Doğrulanıyor...</h3>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Auth />} />
        <Route path="/app" element={user ? <WorkspaceApp /> : <Navigate to="/login" replace />} />
        <Route path="/privacy" element={<PlaceholderPage title={t("landing.footer.privacy", "Gizlilik Politikası")} />} />
        <Route path="/terms" element={<PlaceholderPage title={t("landing.footer.terms", "Kullanım Şartları")} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
