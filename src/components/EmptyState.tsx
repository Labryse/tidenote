import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNoteStore, type Note } from "../store/useNoteStore";
import { FilePlus, PenSquare } from "lucide-react";
import { getResolvedName, getLogoSrc } from "../lib/utils";

const logoSrc = getLogoSrc();

export default function EmptyState() {
  const { t, i18n } = useTranslation();
  const { notes, setActiveNoteId, user, createNote, showToast, firestoreUser } = useNoteStore();

  const username = getResolvedName(user, firestoreUser);

  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString(i18n.language.startsWith("tr") ? "tr-TR" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const weekdayPart = now.toLocaleDateString(i18n.language.startsWith("tr") ? "tr-TR" : "en-US", {
        weekday: "long"
      });
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setTimeStr(`${datePart}, ${weekdayPart} • ${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [i18n.language]);

  // Get top 3 active (unarchived) notes sorted by updatedAt
  const getTimestampMs = (timestamp: any): number => {
    if (!timestamp) return Date.now();
    if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
    if (timestamp.seconds !== undefined) return timestamp.seconds * 1000;
    return new Date(timestamp).getTime() || 0;
  };

  const activeNotes = notes.filter((n) => !n.archived);
  const recentNotes = [...activeNotes]
    .sort((a, b) => getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt))
    .slice(0, 3);

  const formatCardDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(i18n.language.startsWith("tr") ? "tr-TR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  const handleCreate = async (type: "document" | "canvas") => {
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
    
    try {
      const noteId = await createNote(type, title);
      if (noteId) {
        showToast(t("toast.createSuccess"), "success");
      }
    } catch (err) {
      console.error("Error creating note from dashboard:", err);
    }
  };

  return (
    <div className="empty-state-container dashboard-container">
      {/* Subtle floating background blobs */}
      <div className="dashboard-bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="dashboard-content">
        
        {/* HERO SECTION */}
        <header className="dashboard-hero">
          <div className="empty-state-wave-wrapper">
            <img
              src={logoSrc}
              alt="TideNote"
              className="app-logo-img dashboard-logo"
              style={{
                width: '112px',
                height: '112px',
                objectFit: 'contain'
              }}
            />
          </div>
          <h2 className="dashboard-greeting">
            {t("dashboard.greeting", { name: username })}
          </h2>
          <p className="dashboard-date">{timeStr}</p>
        </header>

        {/* RECENT NOTES SECTION */}
        {recentNotes.length > 0 && (
          <section className="dashboard-section recent-notes-section">
            <h3 className="dashboard-section-title">
              {t("dashboard.recentNotes", "SON NOTLAR")}
            </h3>
            <div className="recent-notes-list">
              {recentNotes.map((note: Note) => (
                <div
                  key={note.id}
                  className="recent-note-card"
                  onClick={() => setActiveNoteId(note.id)}
                >
                  <div className="recent-note-icon">
                    {note.type === "canvas" ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22C17.52 22 22 17.52 22 12S17.52 2 12 2 2 6.48 2 12c0 2.22 1.21 4.15 3 5.19l.71.41a6 6 0 0 1-2.91 3.96l-.8 1.43 1.43.8A12.02 12.02 0 0 0 12 22z" />
                        <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
                        <circle cx="11.5" cy="7.5" r="1" fill="currentColor" />
                        <circle cx="16.5" cy="9.5" r="1" fill="currentColor" />
                        <circle cx="15.5" cy="14.5" r="1" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    )}
                  </div>
                  <div className="recent-note-details">
                    <h4 className="recent-note-title">
                      {note.title || (note.type === "canvas" ? t("sidebar.untitledCanvas") : t("sidebar.untitledNote"))}
                    </h4>
                    <span className="recent-note-date">
                      {formatCardDate(note.updatedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* QUICK CREATE SECTION */}
        <section className="dashboard-section quick-create-section">
          <h3 className="dashboard-section-title">
            {t("dashboard.quickCreate", "Hızlı Oluştur")}
          </h3>
          <div className="quick-create-actions">
            <button
              className="quick-action-card doc-card"
              onClick={() => handleCreate("document")}
            >
              <span className="quick-action-icon"><FilePlus size={22} style={{ flexShrink: 0 }} /></span>
              <span className="quick-action-text">{t("sidebar.newDocument", "Yeni Belge")}</span>
            </button>
            <button
              className="quick-action-card canvas-card"
              onClick={() => handleCreate("canvas")}
            >
              <span className="quick-action-icon"><PenSquare size={22} style={{ flexShrink: 0 }} /></span>
              <span className="quick-action-text">{t("sidebar.newCanvas", "Yeni Canvas")}</span>
            </button>
          </div>
        </section>

      </div>

      {/* WATERMARK */}
      <footer className="empty-state-watermark dashboard-watermark">
        ~ TideNote
      </footer>
    </div>
  );
}
