import { useEffect, useState, useRef } from "react";
import { db, auth, enableNetwork } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, where, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNoteStore, type Note } from "../store/useNoteStore";
import { useTranslation } from "react-i18next";
import ConfirmModal from "./ConfirmModal";

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const { notes, setNotes, activeNoteId, setActiveNoteId, setIsLoading, user, showToast, theme, setTheme, isMobileSidebarOpen, setIsMobileSidebarOpen } = useNoteStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, "notes"),
      where("ownerId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notesList: Note[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          notesList.push({
            id: doc.id,
            title: data.title || "",
            type: data.type || "document",
            content: data.content,
            elements: data.elements,
            appState: data.appState,
            files: data.files,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setNotes(notesList);
        setIsLoading(false);
      },
      (error: any) => {
        console.error("Firestore onSnapshot error:", error);
        showToast(`${t("toast.loadError")}: ${error.message || error}`);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, setNotes, setIsLoading]);

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        enableNetwork(db).catch(console.error)
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

    setIsDropdownOpen(false);
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

  const handleNoteSelect = (id: string) => {
    setActiveNoteId(id);
    setIsMobileSidebarOpen(false);
  };

  const handleDoubleClickTitle = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setEditTitleValue(note.title);
  };

  const handleSaveTitle = async (note: Note) => {
    const trimmedTitle = editTitleValue.trim();
    const finalTitle = trimmedTitle || (note.type === "canvas" ? t("sidebar.untitledCanvas") : t("sidebar.untitledNote"));
    
    setEditingNoteId(null);

    if (finalTitle === note.title) {
      return;
    }

    try {
      const noteRef = doc(db, "notes", note.id);
      await updateDoc(noteRef, {
        title: finalTitle,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error("Error updating note title:", error);
      showToast(t("toast.saveError") || "Error saving title");
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
    });
  };

  return (
    <aside className={`sidebar ${isMobileSidebarOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <h1 className="app-title">
          <span style={{ color: "var(--color-accent)", marginRight: "6px", fontSize: "1.5rem", fontWeight: "bold" }}>~</span>
          TideNote
        </h1>
        
        {/* Dropdown triggers */}
        <div className="new-note-container" ref={dropdownContainerRef}>
          <button 
            className="new-note-btn" 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
            disabled={!user}
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
            {t("sidebar.newNote")}
          </button>

          {isDropdownOpen && (
            <div className="new-note-dropdown">
              <button className="new-note-option" onClick={() => handleCreateNote("document")}>
                📄 {t("sidebar.newDocument")}
              </button>
              <button className="new-note-option" onClick={() => handleCreateNote("canvas")}>
                🎨 {t("sidebar.newCanvas")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="notes-list">
        {notes.length === 0 ? (
          <div style={{ whiteSpace: "pre-line", textAlign: "center", padding: "2rem 0", color: "var(--color-text-muted)", fontSize: "0.82rem", lineHeight: "1.5" }}>
            {t("sidebar.noNotes")}
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`note-item ${activeNoteId === note.id ? "active" : ""}`}
              onClick={() => handleNoteSelect(note.id)}
            >
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                {/* Note Type Icon */}
                <div className="note-type-icon">
                  {note.type === "canvas" ? (
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
                <div 
                  className="note-item-content"
                  onDoubleClick={(e) => handleDoubleClickTitle(note, e)}
                >
                  {editingNoteId === note.id ? (
                    <input
                      className="note-title-input"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onBlur={() => handleSaveTitle(note)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveTitle(note);
                        } else if (e.key === "Escape") {
                          setEditingNoteId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <h4 className="note-title">
                      {note.title || (note.type === "canvas" ? t("sidebar.untitledCanvas") : t("sidebar.untitledNote"))}
                    </h4>
                  )}
                  <span className="note-date">{formatDate(note.updatedAt)}</span>
                </div>
              </div>
              <button className="delete-btn" onClick={(e) => handleDeleteClick(note.id, e)} title={t("modal.deleteTitle")}>
                <svg
                  style={{ pointerEvents: "none" }}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" style={{ pointerEvents: "none" }} />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" style={{ pointerEvents: "none" }} />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-footer-row">
            <span className="sidebar-user-email" title={user.email || ""}>
              {user.email}
            </span>
            <button className="sidebar-logout-btn" onClick={handleSignOut}>
              {t("auth.logout")}
            </button>
          </div>
          <div className="sidebar-footer-row" style={{ marginTop: "4px" }}>
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              )}
            </button>

            {/* Language Selector */}
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <button
                onClick={() => i18n.changeLanguage("tr")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: i18n.language.startsWith("tr") ? "bold" : "normal",
                  color: i18n.language.startsWith("tr") ? "var(--color-accent)" : "var(--color-text-muted)",
                  padding: "4px 6px"
                }}
              >
                TR
              </button>
              <span style={{ color: "var(--color-border)", fontSize: "11px" }}>/</span>
              <button
                onClick={() => i18n.changeLanguage("en")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: i18n.language.startsWith("en") ? "bold" : "normal",
                  color: i18n.language.startsWith("en") ? "var(--color-accent)" : "var(--color-text-muted)",
                  padding: "4px 6px"
                }}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteNoteId !== null}
        title={t("modal.deleteTitle")}
        message={t("modal.deleteMessage")}
        onConfirm={confirmDeleteNote}
        onCancel={() => setDeleteNoteId(null)}
      />
    </aside>
  );
}
