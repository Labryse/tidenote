import { useState } from "react";
import { auth } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useNoteStore } from "../store/useNoteStore";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const { t } = useTranslation();
  const { theme, setTheme, showToast } = useNoteStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const translateError = (errorCode: string) => {
    switch (errorCode) {
      case "auth/invalid-credential":
      case "auth/invalid-email":
      case "auth/missing-email":
        return t("auth.invalidCredentials");
      case "auth/email-already-in-use":
        return t("auth.emailInUse");
      case "auth/weak-password":
      case "auth/missing-password":
        return t("auth.weakPassword");
      default:
        return t("auth.unknownError");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t("auth.invalidCredentials"));
      return;
    }
    if (!password.trim()) {
      setError(t("auth.weakPassword"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.weakPassword"));
      return;
    }
    if (!isLogin && password !== passwordConfirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showToast(t("auth.loginSuccess"), "success");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast(t("auth.registerSuccess"), "success");
      }
    } catch (err: any) {
      console.error("Firebase auth error:", err);
      const translatedMsg = translateError(err.code);
      setError(translatedMsg);
      showToast(translatedMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Theme Toggle Button (Top Right) */}
      <div className="auth-theme-toggle">
        <button
          className="theme-toggle-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Light Theme" : "Dark Theme"}
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
      </div>

      <div className="auth-card-redesign">
        {/* Logo Section */}
        <div className="auth-logo-row">
          <span style={{ fontSize: "1.75rem", fontWeight: "bold" }}>~</span>
          <span className="auth-logo-text">TideNote</span>
        </div>

        {/* Tab Selector */}
        <div className="auth-tabs-redesign">
          <button
            type="button"
            className={`auth-tab-redesign ${isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(true);
              setError("");
              setPasswordConfirm("");
            }}
          >
            {t("auth.login")}
          </button>
          <button
            type="button"
            className={`auth-tab-redesign ${!isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
          >
            {t("auth.register")}
          </button>
        </div>

        {/* Auth Form */}
        <form className="auth-form-redesign" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label htmlFor="email">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              className="auth-input-redesign"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              className="auth-input-redesign"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {!isLogin && (
            <div className="auth-input-group">
              <label htmlFor="passwordConfirm">{t("auth.passwordRepeat")}</label>
              <input
                id="passwordConfirm"
                type="password"
                className="auth-input-redesign"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="auth-error-text">{error}</div>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "..." : isLogin ? t("auth.login") : t("auth.register")}
          </button>
        </form>
      </div>
    </div>
  );
}
