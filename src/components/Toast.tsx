import { useEffect } from "react";
import { useNoteStore } from "../store/useNoteStore";

export default function Toast() {
  const { toast, hideToast } = useNoteStore();

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      hideToast();
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div className="toast-container">
      <div className={`toast-item ${toast.type}`}>
        <span className="toast-message">{toast.message}</span>
        {toast.actionLabel && toast.onActionClick && (
          <button
            onClick={() => {
              toast.onActionClick?.();
              hideToast();
            }}
            className="toast-action-btn"
            style={{
              marginLeft: "auto",
              marginRight: "8px",
              background: "var(--color-accent)",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "11px",
              cursor: "pointer",
              fontWeight: "600",
              flexShrink: 0
            }}
          >
            {toast.actionLabel}
          </button>
        )}
        <button onClick={hideToast} className="toast-close-btn" aria-label="Close toast">
          &times;
        </button>
      </div>
    </div>
  );
}
