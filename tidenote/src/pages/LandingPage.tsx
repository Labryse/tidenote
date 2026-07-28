import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useNoteStore } from "../store/useNoteStore";

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, user } = useNoteStore();

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById("features");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-wrapper">
      {/* NAVBAR */}
      <header className="landing-navbar-wrapper">
        <div className="landing-navbar">
          <Link to="/" className="landing-logo">
            <span>~</span> TideNote
          </Link>

          <div className="landing-nav-right">
            {/* Language Selector */}
            <div className="landing-lang-selector">
              <button
                onClick={() => i18n.changeLanguage("tr")}
                className={`lang-btn ${i18n.language.startsWith("tr") ? "active" : ""}`}
              >
                TR
              </button>
              <span className="lang-separator">/</span>
              <button
                onClick={() => i18n.changeLanguage("en")}
                className={`lang-btn ${i18n.language.startsWith("en") ? "active" : ""}`}
              >
                EN
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              className="landing-theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Nav Auth Buttons */}
            {user ? (
              <Link to="/app" className="btn-signup">
                {t("landing.goApp", "Uygulamaya Git")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-login">
                  {t("landing.login", "Giriş Yap")}
                </Link>
                <Link to="/login" className="btn-signup">
                  {t("landing.startFree", "Ücretsiz Başla")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="hero-badge">
            {t("landing.badge", "✦ Not alma yeniden tasarlandı")}
          </div>
          <h1 className="hero-title">
            {t("landing.title")}
          </h1>
          <p className="hero-subtitle">
            {t("landing.subtitle")}
          </p>

          <div className="hero-buttons">
            {user ? (
              <Link to="/app" className="btn-hero-primary">
                {t("landing.goApp", "Uygulamaya Git")} &rarr;
              </Link>
            ) : (
              <Link to="/login" className="btn-hero-primary">
                {t("landing.startFreeArrow")}
              </Link>
            )}
            <a href="#features" onClick={scrollToFeatures} className="btn-hero-secondary">
              {t("landing.howItWorks", "Nasıl Çalışır?")}
            </a>
          </div>

          <div className="hero-mockup-frame">
            <div className="hero-mockup-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>{t("landing.previewTitle", "Uygulama önizlemesi yakında")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="landing-section">
        <div className="section-header">
          <h2 className="section-title">
            {t("landing.featuresTitle", "Her şey düşündüğünüzden daha kolay.")}
          </h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>{t("landing.features.editorTitle", "Blok Editör")}</h3>
            <p>{t("landing.features.editorDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>{t("landing.features.canvasTitle", "Sonsuz Canvas")}</h3>
            <p>{t("landing.features.canvasDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">☁️</div>
            <h3>{t("landing.features.syncTitle", "Bulut Senkronizasyon")}</h3>
            <p>{t("landing.features.syncDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌙</div>
            <h3>{t("landing.features.themeTitle", "Açık & Koyu Tema")}</h3>
            <p>{t("landing.features.themeDesc")}</p>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="landing-section" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="section-header">
          <h2 className="section-title">
            {t("landing.pricingTitle", "Başlamak ücretsiz.")}
          </h2>
        </div>

        <div className="pricing-grid">
          {/* FREE CARD */}
          <div className="pricing-card">
            <div className="pricing-card-header">
              <h3>{t("landing.pricing.free", "Ücretsiz")}</h3>
              <div className="pricing-price">{t("landing.pricing.freeDesc", "$0 / ay")}</div>
            </div>
            <ul className="pricing-features">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fUnlimited")}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fStorage1")}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fCore")}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fThemes")}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fApps")}
              </li>
            </ul>
            <Link to={user ? "/app" : "/login"} className="pricing-btn btn-free">
              {t("landing.pricing.freeBtn", "Hemen Başla")}
            </Link>
          </div>

          {/* PREMIUM CARD */}
          <div className="pricing-card popular">
            <span className="pricing-badge">{t("landing.pricing.popular", "En Popüler")}</span>
            <div className="pricing-card-header">
              <h3>{t("landing.pricing.premium", "Premium")}</h3>
              <div className="pricing-price">{t("landing.pricing.premiumDesc", "$2.99 / ay")}</div>
            </div>
            <ul className="pricing-features">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fEverything")}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fStorage10")}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fPdf")}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fHistory")}
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("landing.pricing.fSupport")}
              </li>
            </ul>
            <Link to={user ? "/app" : "/login"} className="pricing-btn btn-premium">
              {t("landing.pricing.premiumBtn", "Premium'a Geç")}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div>&copy; 2026 TideNote</div>
        <div className="landing-footer-links">
          <Link to="/privacy">{t("landing.footer.privacy", "Gizlilik Politikası")}</Link>
          <Link to="/terms">{t("landing.footer.terms", "Kullanım Şartları")}</Link>
        </div>
      </footer>
    </div>
  );
}
