import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Star, Clock, Tag, Zap, Bookmark, X, Search, FileText, Layout } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNoteStore } from "../store/useNoteStore";

// Helper to render icon by name
export const getCollectionIcon = (iconName: string, size = 14, className?: string) => {
  const props = { size, className };
  switch (iconName) {
    case "Star":
      return <Star {...props} />;
    case "Clock":
      return <Clock {...props} />;
    case "Tag":
      return <Tag {...props} />;
    case "Zap":
      return <Zap {...props} />;
    case "Bookmark":
      return <Bookmark {...props} />;
    default:
      return <Tag {...props} />;
  }
};

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionToEdit?: any | null;
  allUniqueTags: string[];
  allNotes: any[];
  uid: string;
}

export default function CollectionModal({
  isOpen,
  onClose,
  collectionToEdit,
  allNotes = [],
  uid,
}: CollectionModalProps) {
  const { t } = useTranslation();
  const { showToast } = useNoteStore();
  const [isClosing, setIsClosing] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Tag");
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [noteSearchQuery, setNoteSearchQuery] = useState("");

  const filteredNotes = allNotes.filter(note =>
    (note.title || "").toLowerCase().includes(noteSearchQuery.toLowerCase())
  );

  // Sync edit mode fields
  useEffect(() => {
    if (isOpen) {
      if (collectionToEdit) {
        setName(collectionToEdit.name || "");
        setSelectedIcon(collectionToEdit.icon || "Tag");
        const f = collectionToEdit.filters || {};
        setSelectedNoteIds(f.noteIds || []);
      } else {
        // Reset values for new collection
        setName("");
        setSelectedIcon("Tag");
        setSelectedNoteIds([]);
      }
      setNoteSearchQuery("");
    }
  }, [isOpen, collectionToEdit]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(t("collections.nameRequired", "Lütfen koleksiyon adı girin"), "error");
      return;
    }

    const filters = {
      noteIds: selectedNoteIds,
    };

    try {
      if (collectionToEdit) {
        // Update
        const colRef = doc(db, "users", uid, "collections", collectionToEdit.id);
        await updateDoc(colRef, {
          name,
          icon: selectedIcon,
          filters,
          updatedAt: serverTimestamp(),
        });
        showToast(t("collections.updateSuccess", "Koleksiyon güncellendi"), "success");
      } else {
        // Create
        const colCollectionRef = collection(db, "users", uid, "collections");
        await addDoc(colCollectionRef, {
          name,
          icon: selectedIcon,
          filters,
          createdAt: serverTimestamp(),
        });
        showToast(t("collections.createSuccess", "Koleksiyon oluşturuldu"), "success");
      }
      handleClose();
    } catch (error: any) {
      console.error("Error saving collection:", error);
      showToast(t("collections.saveError", "Koleksiyon kaydedilemedi"), "error");
    }
  };

  if (!isOpen && !isClosing) return null;

  const icons = ["Tag", "Star", "Clock", "Zap", "Bookmark"];

  return (
    <div className={`confirm-modal-overlay ${isClosing ? "closing" : ""}`} onClick={handleClose}>
      <div className="confirm-modal-box collection-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="collection-modal-header">
          <h3 className="confirm-modal-title">
            {collectionToEdit
              ? t("collections.editTitle", "Koleksiyonu Düzenle")
              : t("collections.newCollectionTitle", "Koleksiyon Oluştur")}
          </h3>
          <button type="button" className="collection-modal-close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="collection-modal-form">
          {/* Koleksiyon Adı */}
          <div className="collection-form-group">
            <label className="collection-form-label">{t("collections.nameLabel", "Koleksiyon Adı")}</label>
            <input
              type="text"
              autoFocus
              className="collection-form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("collections.namePlaceholder", "Örn: Önemli Notlarım")}
            />
          </div>

          {/* İkon Seçici */}
          <div className="collection-form-group">
            <label className="collection-form-label">{t("collections.iconLabel", "Simge Seçin")}</label>
            <div className="collection-icon-picker">
              {icons.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  className={`collection-icon-btn ${selectedIcon === iconName ? "active" : ""}`}
                  onClick={() => setSelectedIcon(iconName)}
                >
                  {getCollectionIcon(iconName, 16)}
                </button>
              ))}
            </div>
          </div>

          {/* Not Seçimi (Özel Notlar) */}
          <div className="collection-form-group" style={{ marginTop: "8px" }}>
            <label className="collection-form-label">{t("collections.selectNotesLabel", "Koleksiyona Eklenecek Notlar")}</label>
            <div className="collection-notes-search-container">
              <Search size={14} className="collection-notes-search-icon" />
              <input
                type="text"
                className="collection-notes-search-input"
                placeholder={t("collections.searchNotesPlaceholder", "Not ara...")}
                value={noteSearchQuery}
                onChange={(e) => setNoteSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="collection-notes-select-list" style={{ maxHeight: "200px" }}>
              {filteredNotes.map((note) => {
                const isChecked = selectedNoteIds.includes(note.id);
                return (
                  <label key={note.id} className="collection-note-select-item">
                    <input
                      type="checkbox"
                      className="collection-note-checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedNoteIds(prev => prev.filter(id => id !== note.id));
                        } else {
                          setSelectedNoteIds(prev => [...prev, note.id]);
                        }
                      }}
                    />
                    <span className="collection-note-icon">
                      {note.type === "canvas" ? <Layout size={14} /> : <FileText size={14} />}
                    </span>
                    <span className="collection-note-title">
                      {note.title || (note.type === "canvas" ? t("sidebar.untitledCanvas") : t("sidebar.untitledNote"))}
                    </span>
                  </label>
                );
              })}
              {filteredNotes.length === 0 && (
                <div className="collection-notes-empty">
                  {t("collections.noNotesFound", "Not bulunamadı")}
                </div>
              )}
            </div>
          </div>

          {/* Aksiyonlar */}
          <div className="confirm-modal-actions">
            <button type="button" className="confirm-modal-btn cancel" onClick={handleClose}>
              {t("modal.cancel")}
            </button>
            <button type="submit" className="confirm-modal-btn confirm">
              {collectionToEdit ? t("modal.save", "Kaydet") : t("modal.create", "Oluştur")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
