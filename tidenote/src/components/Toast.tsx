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
        <button onClick={hideToast} className="toast-close-btn" aria-label="Close toast">
          &times;
        </button>
      </div>
    </div>
  );
}
