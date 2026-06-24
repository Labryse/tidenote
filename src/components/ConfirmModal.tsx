import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCancel();
    }, 200);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`confirm-modal-overlay ${isClosing ? "closing" : ""}`} onClick={handleClose}>
      <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className="confirm-modal-btn cancel" onClick={handleClose}>
            {t("modal.cancel")}
          </button>
          <button className="confirm-modal-btn confirm" onClick={onConfirm}>
            {t("modal.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
