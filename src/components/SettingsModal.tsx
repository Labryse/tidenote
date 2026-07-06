import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useNoteStore, PREMIUM_ENABLED } from "../store/useNoteStore";
import { User as UserIcon, Palette, HardDrive, CreditCard, Download, Info, Camera, Sun, Moon, AlertTriangle, Crown, FileText, Star, Archive } from "lucide-react";
import { version } from "../../package.json";
import { auth, db, storage } from "../lib/firebase";
import { updatePassword, deleteUser, updateProfile, EmailAuthProvider, reauthenticateWithCredential, type User } from "firebase/auth";
import { doc, deleteDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ConfirmModal from "./ConfirmModal";
import { deleteAllCanvasFiles } from "../lib/canvasFiles";
import { getLogoSrc, calculateStorageBytes } from "../lib/utils";
import DownloadButton from "./DownloadButton";
import { isWebOnly } from "../lib/platformDetect";


const logoSrc = getLogoSrc();

export default function SettingsModal() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    notes,
    theme,
    setTheme,
    userTier,
    editorFontSize,
    setEditorFontSize,
    listDensity,
    setListDensity,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsTab,
    setSettingsTab,
    showToast,
    setActiveNoteId,
    user,
    setUser
  } = useNoteStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const importFileRef = useRef<HTMLInputElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsSettingsOpen(false);
    }, 200);
  };

  // Scroll content to top on mobile when tab changes
  useEffect(() => {
    if (contentRef.current && window.innerWidth <= 768) {
      contentRef.current.scrollTop = 0;
    }
  }, [settingsTab]);

  // Close Settings on ESC key press
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen, handleClose]);

  // Sync display name state
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.email?.split("@")[0] || "User");
    }
  }, [user, isSettingsOpen]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast(t("settings.imageTooLarge", "Dosya boyutu 2MB'den büyük olamaz"), "error");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const avatarRef = ref(storage, `avatars/${user.uid}/profile.jpg`);
      const snapshot = await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await updateProfile(user, {
        photoURL: downloadURL,
      });

      await user.reload();
      if (auth.currentUser) {
        const clonedUser = Object.assign(
          Object.create(Object.getPrototypeOf(auth.currentUser)),
          auth.currentUser
        ) as User;
        setUser(clonedUser);
      }
      showToast(t("settings.profileUpdated", "Profil güncellendi"), "success");
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      showToast(err.message || "Fotoğraf yüklenemedi", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      showToast(t("settings.usernameRequired", "Kullanıcı adı boş olamaz"), "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile(user, {
        displayName: displayName.trim(),
      });

      await user.reload();
      if (auth.currentUser) {
        const clonedUser = Object.assign(
          Object.create(Object.getPrototypeOf(auth.currentUser)),
          auth.currentUser
        ) as User;
        setUser(clonedUser);
      }
      showToast(t("settings.profileUpdated", "Profil güncellendi"), "success");
    } catch (err: any) {
      console.error("Profile update error:", err);
      showToast(err.message || "Profil güncellenemedi", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!isSettingsOpen && !isClosing) return null;

  const email = user?.email || "";
  const rawUsername = user?.displayName || email.split("@")[0] || "User";
  const avatarLetter = rawUsername ? rawUsername.charAt(0).toUpperCase() : "?";

  const usedBytes = calculateStorageBytes(notes);
  const usedMB = usedBytes / (1024 * 1024);
  const isPremium = PREMIUM_ENABLED ? (userTier === "premium") : true;
  const limitMB = 1024;
  const percentage = Math.min((usedMB / limitMB) * 100, 100);

  // Storage color helper
  const getStorageColorClass = (pct: number) => {
    if (pct < 60) return "pct-normal";
    if (pct < 80) return "pct-warning";
    return "pct-danger";
  };

  // Note counts
  const docCount = notes.filter((n) => n.type === "document" && !n.archived).length;
  const canvasCount = notes.filter((n) => n.type === "canvas" && !n.archived).length;
  const favoriteCount = notes.filter((n) => n.starred && !n.archived).length;
  const archiveCount = notes.filter((n) => n.archived).length;

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;

    if (newPassword !== confirmPassword) {
      showToast(t("auth.passwordMismatch", "Şifreler eşleşmiyor."), "error");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const isGoogleUser = currentUser.providerData.some(
      (p) => p.providerId === "google.com"
    );

    try {
      if (isGoogleUser) {
        // Google user: no reauthentication required
        await updatePassword(currentUser, newPassword);
      } else {
        // Email/Password user: requires reauthentication
        if (!currentPassword) {
          showToast(t("settings.currentPasswordRequired", "Mevcut şifrenizi girmeniz gerekir."), "error");
          return;
        }
        const credential = EmailAuthProvider.credential(
          currentUser.email!,
          currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);
      }

      showToast(t("toast.saveSuccess", "Şifre başarıyla güncellendi"), "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password update error:", err);
      if (err.code === "auth/requires-recent-login") {
        showToast(
          t(
            "settings.reauthRequired",
            "Güvenlik nedeniyle şifre değiştirmek için tekrar giriş yapmanız gerekir."
          ),
          "error"
        );
      } else {
        showToast(err.message || "Şifre güncellenemedi", "error");
      }
    }
  };

  const handleDeleteAccountConfirm = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // 1. Delete all note documents owned by this user (purge each canvas
      //    note's files subcollection first, while the parent note still exists
      //    so the rules can authorize it).
      for (const note of notes) {
        if (note.type === "canvas") {
          try {
            await deleteAllCanvasFiles(note.id);
          } catch (e) {
            console.error("Failed to purge canvas files:", e);
          }
        }
        await deleteDoc(doc(db, "notes", note.id));
      }

      // 2. Delete user doc in firestore
      await deleteDoc(doc(db, "users", currentUser.uid));

      // 3. Delete auth user
      await deleteUser(currentUser);

      handleClose();
      setShowConfirmDelete(false);
      showToast(t("toast.deleteSuccess", "Hesap başarıyla silindi"), "success");
    } catch (err: any) {
      console.error("Account delete error:", err);
      if (err.code === "auth/requires-recent-login") {
        showToast(
          t(
            "settings.reauthRequired",
            "Güvenlik nedeniyle bu işlem için tekrar giriş yapmanız gerekir."
          ),
          "error"
        );
      } else {
        showToast(err.message || "Hesap silinemedi", "error");
      }
      setShowConfirmDelete(false);
    }
  };

  const handleImportMarkdownFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text !== "string") return;

      const lines = text.split("\n");
      const blocks = lines.map((line) => {
        let type = "paragraph";
        let level = 1;
        let trimmed = line.trim();

        if (trimmed.startsWith("# ")) {
          type = "heading";
          level = 1;
          trimmed = trimmed.substring(2);
        } else if (trimmed.startsWith("## ")) {
          type = "heading";
          level = 2;
          trimmed = trimmed.substring(3);
        } else if (trimmed.startsWith("### ")) {
          type = "heading";
          level = 3;
          trimmed = trimmed.substring(4);
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          type = "bulletListItem";
          trimmed = trimmed.substring(2);
        } else if (/^\d+\.\s/.test(trimmed)) {
          type = "numberedListItem";
          trimmed = trimmed.replace(/^\d+\.\s/, "");
        }

        return {
          type,
          props: type === "heading" ? { level } : {},
          content: trimmed ? [{ type: "text", text: trimmed, styles: {} }] : []
        };
      });

      const title = file.name.replace(/\.md$/, "");
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const newNote = {
          title,
          type: "document",
          content: blocks,
          ownerId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          pinned: false,
        };
        const docRef = await addDoc(collection(db, "notes"), newNote);
        setActiveNoteId(docRef.id);
        handleClose();
        showToast(t("toast.importSuccess", "Markdown başarıyla içe aktarıldı"), "success");
      } catch (err: any) {
        console.error("Import Markdown error:", err);
        showToast(t("toast.saveError", "İçe aktarılırken hata oluştu"), "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`settings-modal-overlay ${isClosing ? "closing" : ""}`} onClick={handleClose}>
      <div className="settings-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Dekoratif arka plan */}
        <div className="upgrade-modal-bg">
          <div className="upgrade-modal-circle c1" />
          <div className="upgrade-modal-circle c2" />
        </div>

        {/* Close button */}
        <button className="settings-modal-close" onClick={handleClose}>
          ✕ {t("settings.close", "Kapat")}
        </button>

        {/* Sidebar Navigation */}
        <aside className="settings-sidebar">
          <div className="settings-user-profile">
            <div
              className="settings-avatar-wrapper"
              onClick={() => avatarFileRef.current?.click()}
              title={t("settings.changePhotoTooltip", "Fotoğraf değiştir")}
            >
              <div className="settings-avatar">
                {isUploadingAvatar ? (
                  <div className="avatar-spinner"></div>
                ) : user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="settings-avatar-img" />
                ) : (
                  avatarLetter
                )}
                <div className="settings-avatar-hover-overlay">
                  <Camera size={16} />
                </div>
              </div>
              <input
                type="file"
                ref={avatarFileRef}
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
            </div>
            <div className="settings-user-info">
              <span className="settings-username">{rawUsername}</span>
              {PREMIUM_ENABLED && (
                <span className={`settings-plan-badge ${userTier}`} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {userTier === "premium" ? <><Crown size={11} />{t("landing.pricing.premium", "Premium")}</> : t("landing.pricing.free", "Free")}
                </span>
              )}
            </div>
          </div>

          <nav className="settings-nav-links">
            <button
              className={`settings-nav-item ${settingsTab === "account" ? "active" : ""}`}
              onClick={() => setSettingsTab("account")}
            >
              <UserIcon size={16} className="settings-nav-icon" />
              {t("settings.account", "Hesap")}
            </button>
            <button
              className={`settings-nav-item ${settingsTab === "appearance" ? "active" : ""}`}
              onClick={() => setSettingsTab("appearance")}
            >
              <Palette size={16} className="settings-nav-icon" />
              {t("settings.appearance", "Görünüm")}
            </button>
            <button
              className={`settings-nav-item ${settingsTab === "storage" ? "active" : ""}`}
              onClick={() => setSettingsTab("storage")}
            >
              <HardDrive size={16} className="settings-nav-icon" />
              {t("settings.storage", "Depolama")}
            </button>
            {PREMIUM_ENABLED && (
              <button
                className={`settings-nav-item ${settingsTab === "billing" ? "active" : ""}`}
                onClick={() => setSettingsTab("billing")}
              >
                <CreditCard size={16} className="settings-nav-icon" />
                {t("settings.billing", "Plan & Fatura")}
              </button>
            )}
            <button
              className={`settings-nav-item ${settingsTab === "import" ? "active" : ""}`}
              onClick={() => setSettingsTab("import")}
            >
              <Download size={16} className="settings-nav-icon" />
              {t("settings.import", "İçe Aktar")}
            </button>
            <button
              className={`settings-nav-item ${settingsTab === "about" ? "active" : ""}`}
              onClick={() => setSettingsTab("about")}
            >
              <Info size={16} className="settings-nav-icon" />
              {t("settings.about", "Hakkında")}
            </button>
          </nav>
        </aside>

        {/* Content Pane */}
        <main className="settings-content" ref={contentRef}>

          {/* 1. ACCOUNT PAGE */}
          {settingsTab === "account" && (
            <div className="settings-pane">
              <h2 className="settings-pane-title">{t("settings.account", "Hesap Ayarları")}</h2>

              <div className="settings-field-group">
                <label className="settings-label">{t("settings.username", "Kullanıcı Adı")}</label>
                <input
                  type="text"
                  className="settings-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isSavingProfile}
                />
              </div>

              <div className="settings-field-group">
                <label className="settings-label">{t("settings.email", "E-posta Adresi")}</label>
                <input type="text" className="settings-input" value={email} disabled />
              </div>

              <button
                type="button"
                className="settings-action-btn primary-btn"
                onClick={handleUpdateDisplayName}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "..." : t("settings.saveProfile", "Kaydet")}
              </button>

              {(() => {
                const isGoogleUser = user?.providerData?.some(
                  (p) => p.providerId === "google.com"
                ) || false;
                return (
                  <form onSubmit={handleUpdatePasswordSubmit} className="settings-form-section">
                    <h3 className="settings-section-subtitle">
                      {isGoogleUser
                        ? t("settings.setPasswordTitle", "Şifre Belirle")
                        : t("settings.changePasswordTitle", "Şifre Değiştir")}
                    </h3>

                    {isGoogleUser && (
                      <p className="settings-description-text" style={{ marginBottom: "16px", fontSize: "13px" }}>
                        {t(
                          "settings.setPasswordDesc",
                          "Google hesabınıza ek olarak e-posta ile giriş için şifre belirleyebilirsiniz."
                        )}
                      </p>
                    )}

                    {!isGoogleUser && (
                      <div className="settings-field-group">
                        <label className="settings-label">{t("settings.currentPassword", "Mevcut Şifre")}</label>
                        <input
                          type="password"
                          className="settings-input"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    <div className="settings-field-group">
                      <label className="settings-label">
                        {isGoogleUser
                          ? t("settings.newPassword", "Şifre")
                          : t("settings.newPassword", "Yeni Şifre")}
                      </label>
                      <input
                        type="password"
                        className="settings-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="settings-field-group">
                      <label className="settings-label">{t("auth.passwordRepeat", "Şifre Tekrar")}</label>
                      <input
                        type="password"
                        className="settings-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>

                    <button type="submit" className="settings-action-btn primary-btn">
                      {isGoogleUser
                        ? t("settings.setPasswordBtn", "Şifre Belirle")
                        : t("settings.savePasswordBtn", "Şifreyi Güncelle")}
                    </button>
                  </form>
                );
              })()}

              <div className="settings-danger-zone">
                <h3 className="settings-section-subtitle danger-text">{t("settings.deleteAccountTitle", "Hesabı Sil")}</h3>
                <p className="settings-description-text">
                  {t("settings.deleteAccountDesc", "Bu işlem geri alınamaz. Tüm notlarınız ve verileriniz kalıcı olarak silinecektir.")}
                </p>
                <button
                  type="button"
                  className="settings-action-btn danger-btn"
                  onClick={() => setShowConfirmDelete(true)}
                >
                  {t("settings.deleteAccountBtn", "Hesabımı Kalıcı Olarak Sil")}
                </button>
              </div>
            </div>
          )}

          {/* 2. APPEARANCE PAGE */}
          {settingsTab === "appearance" && (
            <div className="settings-pane">
              <h2 className="settings-pane-title">{t("settings.appearance", "Görünüm Ayarları")}</h2>

              <div className="settings-field-group">
                <label className="settings-label">{t("settings.theme", "Arayüz Teması")}</label>
                <div className="settings-button-group">
                  <button
                    className={`settings-tab-btn ${theme === "light" ? "active" : ""}`}
                    onClick={() => setTheme("light")}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Sun size={14} /> {t("settings.themeLight", "Açık Tema")}
                  </button>
                  <button
                    className={`settings-tab-btn ${theme === "dark" ? "active" : ""}`}
                    onClick={() => setTheme("dark")}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Moon size={14} /> {t("settings.themeDark", "Koyu Tema")}
                  </button>
                </div>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">{t("settings.language", "Dil")}</label>
                <div className="settings-button-group">
                  <button
                    className={`settings-tab-btn ${i18n.language.startsWith("tr") ? "active" : ""}`}
                    onClick={() => i18n.changeLanguage("tr")}
                  >
                    TR (Türkçe)
                  </button>
                  <button
                    className={`settings-tab-btn ${i18n.language.startsWith("en") ? "active" : ""}`}
                    onClick={() => i18n.changeLanguage("en")}
                  >
                    EN (English)
                  </button>
                </div>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">{t("settings.editorFontSize", "Editör Yazı Boyutu")}</label>
                <div className="settings-button-group">
                  <button
                    className={`settings-tab-btn ${editorFontSize === "small" ? "active" : ""}`}
                    onClick={() => setEditorFontSize("small")}
                  >
                    {t("settings.fontSizeSmall", "Küçük")}
                  </button>
                  <button
                    className={`settings-tab-btn ${editorFontSize === "medium" ? "active" : ""}`}
                    onClick={() => setEditorFontSize("medium")}
                  >
                    {t("settings.fontSizeMedium", "Orta")}
                  </button>
                  <button
                    className={`settings-tab-btn ${editorFontSize === "large" ? "active" : ""}`}
                    onClick={() => setEditorFontSize("large")}
                  >
                    {t("settings.fontSizeLarge", "Büyük")}
                  </button>
                </div>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">{t("settings.listDensity", "Not Listesi Yoğunluğu")}</label>
                <div className="settings-button-group">
                  <button
                    className={`settings-tab-btn ${listDensity === "compact" ? "active" : ""}`}
                    onClick={() => setListDensity("compact")}
                  >
                    {t("settings.densityCompact", "Kompakt")}
                  </button>
                  <button
                    className={`settings-tab-btn ${listDensity === "normal" ? "active" : ""}`}
                    onClick={() => setListDensity("normal")}
                  >
                    {t("settings.densityNormal", "Normal")}
                  </button>
                  <button
                    className={`settings-tab-btn ${listDensity === "comfortable" ? "active" : ""}`}
                    onClick={() => setListDensity("comfortable")}
                  >
                    {t("settings.densityComfortable", "Rahat")}
                  </button>
                </div>
              </div>

              {/* Keyboard Shortcuts Reference */}
              <div className="settings-form-section shortcuts-section">
                <h3 className="settings-section-subtitle">{t("settings.keyboardShortcuts", "Klavye Kısayolları")}</h3>
                <div className="shortcuts-ref-container">
                  <div className="shortcut-row">
                    <span className="shortcut-label">Yeni Not</span>
                    <span className="shortcut-keys">
                      <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>N</kbd>
                    </span>
                  </div>
                  <div className="shortcut-row">
                    <span className="shortcut-label">{t("quickCapture.title", "Hızlı Not")}</span>
                    <span className="shortcut-keys">
                      <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>
                    </span>
                  </div>
                  <div className="shortcut-row">
                    <span className="shortcut-label">Ara</span>
                    <span className="shortcut-keys">
                      <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd>
                    </span>
                  </div>
                  <div className="shortcut-row">
                    <span className="shortcut-label">Ayarlar</span>
                    <span className="shortcut-keys">
                      <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>,</kbd>
                    </span>
                  </div>
                  <div className="shortcut-row">
                    <span className="shortcut-label">Dışa Aktar</span>
                    <span className="shortcut-keys">
                      <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>E</kbd>
                    </span>
                  </div>
                  <div className="shortcut-row">
                    <span className="shortcut-label">Kapat</span>
                    <span className="shortcut-keys">
                      <kbd>Esc</kbd>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. STORAGE PAGE */}
          {settingsTab === "storage" && (
            <div className="settings-pane">
              <h2 className="settings-pane-title">{t("settings.storage", "Depolama")}</h2>

              <div className="storage-progress-section">
                <div className="storage-progress-header">
                  <span>
                    {t("settings.usedSpace", "Kullanılan Alan")}: <strong>{usedMB.toFixed(1)} MB</strong> / 1 GB
                  </span>
                  <span>{percentage.toFixed(1)}%</span>
                </div>
                <div className="storage-progress-bar-wrapper">
                  <div
                    className={`storage-progress-bar-fill ${getStorageColorClass(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {percentage > 80 && (
                <div className="storage-warning-box">
                  <AlertTriangle size={16} className="warning-icon" />
                  <div className="warning-text-container">
                    <p className="warning-bold-text">
                      {t("settings.storageWarningBold", "Depolama alanınız dolmak üzere.")}
                    </p>
                    <p className="warning-sub-text">
                      {PREMIUM_ENABLED
                        ? t("settings.storageWarningText", "Yeni notlar oluşturmaya devam etmek için Premium'a geçin.")
                        : t("settings.storageWarningTextFree", "Yeni notlar oluşturmaya devam etmek için lütfen gereksiz not veya dosyaları silerek alan açın.")
                      }
                    </p>
                  </div>
                  {PREMIUM_ENABLED && (
                    <button className="upgrade-warning-btn" style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={() => setSettingsTab("billing")}>
                      <Crown size={13} /> {t("landing.pricing.premiumBtn", "Premium'a Geç")}
                    </button>
                  )}
                </div>
              )}

              <div className="storage-statistics-section">
                <h3 className="settings-section-subtitle">{t("settings.noteStatistics", "Not İstatistikleri")}</h3>
                <div className="storage-stats-grid">
                  <div className="stat-item-box">
                    <FileText size={18} className="stat-icon" />
                    <span className="stat-label">{t("settings.totalDocuments", "Toplam Belge")}</span>
                    <span className="stat-value">{docCount}</span>
                  </div>
                  <div className="stat-item-box">
                    <Palette size={18} className="stat-icon" />
                    <span className="stat-label">{t("settings.totalCanvas", "Toplam Canvas")}</span>
                    <span className="stat-value">{canvasCount}</span>
                  </div>
                  <div className="stat-item-box">
                    <Star size={18} className="stat-icon" />
                    <span className="stat-label">{t("sidebar.favoritesSection", "Favoriler")}</span>
                    <span className="stat-value">{favoriteCount}</span>
                  </div>
                  <div className="stat-item-box">
                    <Archive size={18} className="stat-icon" />
                    <span className="stat-label">{t("sidebar.archiveSection", "Arşiv")}</span>
                    <span className="stat-value">{archiveCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. BILLING PAGE */}
          {settingsTab === "billing" && PREMIUM_ENABLED && (
            <div className="settings-pane">
              <h2 className="settings-pane-title">{t("settings.billing", "Plan & Fatura")}</h2>

              {/* Billing cycle toggle */}
              <div className="billing-cycle-toggle">
                <button
                  className={`billing-cycle-btn ${billingCycle === "monthly" ? "active" : ""}`}
                  onClick={() => setBillingCycle("monthly")}
                >
                  {t("landing.pricing.monthly", "Aylık")}
                </button>
                <button
                  className={`billing-cycle-btn ${billingCycle === "yearly" ? "active" : ""}`}
                  onClick={() => setBillingCycle("yearly")}
                >
                  {t("landing.pricing.yearly", "Yıllık")}
                  <span className="billing-yearly-badge">{t("landing.pricing.yearlyBadge", "2 ay ücretsiz")}</span>
                </button>
              </div>

              <div className="billing-plans-container">
                {/* FREE PLAN */}
                <div className={`billing-plan-card ${userTier === "free" ? "active-plan" : ""}`}>
                  <div className="plan-card-header">
                    <h3 className="plan-title">{t("landing.pricing.free", "Ücretsiz Plan")}</h3>
                    {userTier === "free" && <span className="active-badge">✓ {t("settings.planActive", "Aktif")}</span>}
                  </div>
                  <div className="plan-price-block">
                    <span className="plan-price-amount">$0</span>
                    <span className="plan-price-period">/{t("settings.month", "ay")}</span>
                  </div>
                  <ul className="plan-features-list">
                    <li>• {t("landing.pricing.fStorage1", "1 GB Depolama")}</li>
                    <li>• {t("landing.pricing.fUnlimited", "Sınırsız Not")}</li>
                    <li>• {t("landing.pricing.fCore", "Temel Özellikler")}</li>
                  </ul>
                </div>

                {/* PREMIUM PLAN */}
                <div className={`billing-plan-card premium-card ${userTier === "premium" ? "active-plan" : ""}`}>
                  <div className="plan-card-header">
                    <h3 className="plan-title">
                      {t("landing.pricing.premium", "Premium Plan")} {userTier === "premium" && <Crown size={14} style={{ verticalAlign: "middle" }} />}
                    </h3>
                    {userTier === "premium" ? (
                      <span className="active-badge">✓ {t("settings.planActive", "Aktif")}</span>
                    ) : (
                      <button className="plan-select-btn" onClick={() => showToast("Ödeme sistemi yakında aktif olacak! 🚀", "success")}>
                        {t("landing.pricing.premiumBtn", "Premium'a Geç")}
                      </button>
                    )}
                  </div>
                  <div className="plan-price-block">
                    {billingCycle === "yearly" ? (
                      <>
                        <span className="plan-price-amount">$24.99</span>
                        <span className="plan-price-period">/{t("settings.year", "yıl")}</span>
                      </>
                    ) : (
                      <>
                        <span className="plan-price-amount">$2.99</span>
                        <span className="plan-price-period">/{t("settings.month", "ay")}</span>
                      </>
                    )}
                  </div>
                  <ul className="plan-features-list">
                    <li>• {t("landing.pricing.fStorage10", "10 GB Depolama")}</li>
                    <li>• {t("landing.pricing.fPdf", "PDF & Word Dışa Aktarma")}</li>
                    <li>• {t("settings.transparentPng", "Şeffaf PNG Dışa Aktarma")}</li>
                    <li>• {t("landing.pricing.fSupport", "Öncelikli Destek")}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 5. IMPORT PAGE */}
          {settingsTab === "import" && (
            <div className="settings-pane">
              <h2 className="settings-pane-title">{t("settings.import", "İçe Aktar")}</h2>

              <div className="settings-import-section">
                <div className="import-action-item">
                  <div className="import-text-details">
                    <h4 className="import-title">{t("settings.importMdTitle", "Markdown Dosyası İçe Aktar (.md)")}</h4>
                    <p className="import-desc">
                      {t("settings.importMdDesc", "Bilgisayarınızdaki bir .md dosyasını seçerek TideNote içine aktarın.")}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".md"
                    onChange={handleImportMarkdownFile}
                    ref={importFileRef}
                    style={{ display: "none" }}
                  />
                  <button
                    className="settings-action-btn primary-btn"
                    onClick={() => importFileRef.current?.click()}
                  >
                    <Download size={14} style={{ marginRight: 4 }} />{t("settings.chooseFile", "Dosya Seç")}
                  </button>
                </div>

                <div className="import-action-item disabled-item">
                  <div className="import-text-details">
                    <h4 className="import-title">
                      {t("settings.importJsonTitle", "JSON İçe Aktar (TideNote formatı)")}
                      <span className="coming-soon-badge">{t("common.comingSoon", "Yakında")}</span>
                    </h4>
                    <p className="import-desc">
                      {t("settings.importJsonDesc", "TideNote yedek dosyalarınızı (.json) geri yükleyin.")}
                    </p>
                  </div>
                  <button className="settings-action-btn" disabled>
                    <Download size={14} style={{ marginRight: 4 }} />{t("settings.chooseFile", "Dosya Seç")}
                  </button>
                </div>

                <div className="import-action-item disabled-item">
                  <div className="import-text-details">
                    <h4 className="import-title">
                      {t("settings.importNotionTitle", "Notion'dan İçe Aktar")}
                      <span className="coming-soon-badge">{t("common.comingSoon", "Yakında")}</span>
                    </h4>
                    <p className="import-desc">
                      {t("settings.importNotionDesc", "Notion verilerinizi doğrudan TideNote içine gömün.")}
                    </p>
                  </div>
                  <button className="settings-action-btn" disabled>
                    <Download size={14} style={{ marginRight: 4 }} />{t("settings.chooseFile", "Dosya Seç")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. ABOUT PAGE */}
          {settingsTab === "about" && (
            <div className="settings-pane about-pane">
              <div className="about-brand-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img
                  src={logoSrc}
                  className="app-logo-img"
                  alt="TideNote"
                  style={{
                    width: '28px',
                    height: '28px',
                    objectFit: 'contain'
                  }}
                />
                <h2 className="about-title" style={{
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: 'var(--color-text-primary)',
                  margin: 0
                }}>
                  TideNote
                </h2>
                <span className="about-version">v{version}</span>
                {isWebOnly() && (
                  <div className="about-download-wrapper" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      {t("settings.desktopApp", "Masaüstü Uygulaması")}
                    </span>
                    <DownloadButton />
                  </div>
                )}
              </div>
              <p className="about-description">
                {t(
                  "settings.aboutDesc",
                  "TideNote, fikirlerinizi, çizimlerinizi ve belgelerinizi tek bir yerde toplayan modern ve hızlı not defterinizdir."
                )}
              </p>
              <div className="about-links">
                <button
                  onClick={() => {
                    navigate('/privacy')
                    setIsSettingsOpen(false)
                  }}
                  className="about-link-item"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                >
                  {t("landing.footer.privacy", "Gizlilik Politikası")}
                </button>
                <span className="about-divider">•</span>
                <button
                  onClick={() => {
                    navigate('/terms')
                    setIsSettingsOpen(false)
                  }}
                  className="about-link-item"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                >
                  {t("landing.footer.terms", "Kullanım Şartları")}
                </button>
                <span className="about-divider">•</span>
                <a href="https://tidenote.app" target="_blank" rel="noreferrer" className="about-link-item">
                  tidenote.app
                </a>
              </div>
              <p className="about-copyright">© 2026 TideNote. All rights reserved.</p>
            </div>
          )}
        </main>
      </div>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={showConfirmDelete}
        title={t("settings.deleteAccountTitle", "Hesabı Sil")}
        message={t(
          "settings.deleteAccountConfirmMsg",
          "Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm notlarınız kalıcı olarak silinecektir."
        )}
        onConfirm={handleDeleteAccountConfirm}
        onCancel={() => setShowConfirmDelete(false)}
      />

    </div>
  );
}
