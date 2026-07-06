import React, { useState } from "react";
import { Bug, X, Send } from "lucide-react";
import { sendBugReport } from "../lib/emailjs";
import { useNoteStore } from "../store/useNoteStore";

interface Props {
  onClose: () => void;
}

export default function BugReportModal({ onClose }: Props) {
  const { showToast } = useNoteStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSending(true);
    try {
      await sendBugReport({ title, description, steps, email });
      showToast("Bug bildiriminiz alındı, teşekkürler!", "success");
      onClose();
    } catch {
      showToast("Gönderilemedi, tekrar deneyin");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bug-report-modal-overlay" onClick={onClose}>
      <div className="bug-report-modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Bug size={20} color="var(--color-accent)" />
          <h2 className="bug-report-modal-title">Bug Bildir</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center" }}
          >
            <X size={18} />
          </button>
        </div>
        <p className="bug-report-modal-subtitle">Karşılaştığın sorunu bizimle paylaş.</p>

        <form onSubmit={handleSubmit}>
          <div className="bug-report-field">
            <label className="bug-report-label">Bug Başlığı *</label>
            <input
              className="bug-report-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kısa bir başlık yaz"
              required
            />
          </div>

          <div className="bug-report-field">
            <label className="bug-report-label">Açıklama *</label>
            <textarea
              className="bug-report-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bug'ı detaylıca açıkla"
              rows={4}
              required
            />
          </div>

          <div className="bug-report-field">
            <label className="bug-report-label">Adım Adım Nasıl Oluştu?</label>
            <textarea
              className="bug-report-textarea"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="1. Sayfayı aç&#10;2. ... yap&#10;3. Hata oluştu"
              rows={3}
            />
          </div>

          <div className="bug-report-field">
            <label className="bug-report-label">E-posta (opsiyonel)</label>
            <input
              className="bug-report-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="geri.donus@ornek.com"
            />
          </div>

          <div className="bug-report-actions">
            <button type="button" className="bug-report-cancel-btn" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="bug-report-submit-btn" disabled={sending || !title.trim() || !description.trim()}>
              <Send size={14} />
              {sending ? "Gönderiliyor..." : "Gönder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
