import { useState } from "react";
import { auth, googleProvider } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, sendEmailVerification } from "firebase/auth";
import { useNoteStore } from "../store/useNoteStore";
import { useTranslation } from "react-i18next";
import { isElectron, getLogoSrc } from "../lib/utils";
import { getAuthRedirectUrl } from "../lib/platform";

const logoSrc = getLogoSrc();

export default function Auth() {
  const { t } = useTranslation();
  const { theme, setTheme, showToast } = useNoteStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (isElectron()) {
      await (window as Window & { electronAPI?: { openExternal: (url: string) => Promise<void> } }).electronAPI?.openExternal(
        getAuthRedirectUrl()
      );
      showToast(
        "Tarayıcıda Google hesabınızı seçin...",
        "success"
      );
      return;
    }

    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast(t("auth.loginSuccess"), "success");
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(t("auth.unknownError"));
        showToast(t("auth.unknownError"), "error");
      }
    } finally {
      setLoading(false);
    }
  };

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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await sendEmailVerification(userCredential.user);
          showToast(t("auth.verificationEmailSent", "Doğrulama maili gönderildi. Lütfen e-postanızı kontrol edin."), "success");
        } catch (verifErr: any) {
          console.error("Error sending email verification:", verifErr);
          showToast(t("auth.registerSuccess"), "success");
        }
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

      {/* Left side: animated background + big logo */}
      <div className="auth-left">
        <div className="auth-bg-circle"></div>
        <div className="auth-bg-circle"></div>
        <div className="auth-bg-circle"></div>
        <img 
          src={logoSrc} 
          width={96} 
          height={96}
          alt="TideNote"
          style={{
            animation: "auth-logo-float 4s ease-in-out infinite",
            filter: "drop-shadow(0 8px 24px rgba(8,145,178,0.3))"
          }}
        />
        <h1 style={{
          fontSize: "28px", 
          fontWeight: 800,
          color: "var(--color-text-primary)",
          letterSpacing: "-0.02em", 
          margin: "16px 0 8px"
        }}>
          TideNote
        </h1>
        <p style={{
          fontSize: "14px",
          color: "var(--color-text-muted)",
          textAlign: "center", 
          lineHeight: 1.6,
          maxWidth: "220px"
        }}>
          Düşünceleriniz için sonsuz bir alan.
        </p>
      </div>

      {/* Right side: form */}
      <div className="auth-right">
        {/* Mobile Header (visible only on mobile when auth-left is hidden) */}
        <div className="auth-mobile-header">
          <img src={logoSrc} width={48} height={48} alt="TideNote" />
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>TideNote</h1>
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>Hoş Geldiniz</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "32px" }}>
          Hesabınıza giriş yapın veya yeni hesap oluşturun.
        </p>

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

        {/* Google Sign In Button */}
        <button
          type="button"
          className="auth-google-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{t("auth.continueWithGoogle")}</span>
        </button>

        {/* veya Divider */}
        <div className="auth-divider-container">
          <span className="auth-divider-line"></span>
          <span className="auth-divider-text">{t("auth.or")}</span>
          <span className="auth-divider-line"></span>
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
