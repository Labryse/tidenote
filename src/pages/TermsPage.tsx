import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useNoteStore } from "../store/useNoteStore";
import { useEffect } from "react";

const logoSrc = (() => {
  try {
    return new URL("/icon.png", import.meta.url).href;
  } catch {
    return "/icon.png";
  }
})();

export default function TermsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, user } = useNoteStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  return (
    <div className="legal-page-container landing-wrapper">
      {/* NAVBAR */}
      <header className="landing-navbar-wrapper">
        <div className="landing-navbar">
          <Link to="/" className="landing-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
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
            <span style={{
              fontWeight: 700,
              fontSize: '1.1rem',
              color: 'var(--color-text-primary)'
            }}>
              TideNote
            </span>
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

      {/* CONTENT */}
      <main className="legal-content-wrapper">
        <h1 className="legal-title">{t("terms.title")}</h1>
        <p className="legal-meta">{t("terms.lastUpdated")}</p>

        {/* Table of Contents */}
        <nav className="legal-toc">
          <h2 className="legal-toc-title">{t("terms.tableOfContents")}</h2>
          <ul className="legal-toc-list">
            {sections.map((sec) => (
              <li key={sec}>
                <a href={`#sec-${sec}`} className="legal-toc-link">
                  {t(`terms.sections.${sec}.title`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Section 1 */}
        <section id="sec-1">
          <h2 className="legal-section-h2">{t("terms.sections.1.title")}</h2>
          <p className="legal-body-text">{t("terms.sections.1.p1")}</p>
        </section>

        {/* Section 2 */}
        <section id="sec-2">
          <h2 className="legal-section-h2">{t("terms.sections.2.title")}</h2>
          <p className="legal-body-text">{t("terms.sections.2.p1")}</p>
        </section>

        {/* Section 3 */}
        <section id="sec-3">
          <h2 className="legal-section-h2">{t("terms.sections.3.title")}</h2>
          <ul className="legal-list">
            <li>{t("terms.sections.3.item1")}</li>
            <li>{t("terms.sections.3.item2")}</li>
            <li>{t("terms.sections.3.item3")}</li>
            <li>{t("terms.sections.3.item4")}</li>
            <li>{t("terms.sections.3.item5")}</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="sec-4">
          <h2 className="legal-section-h2">{t("terms.sections.4.title")}</h2>
          <p className="legal-body-text">{t("terms.sections.4.p1")}</p>
          <ul className="legal-list">
            <li>{t("terms.sections.4.item1")}</li>
            <li>{t("terms.sections.4.item2")}</li>
            <li>{t("terms.sections.4.item3")}</li>
            <li>{t("terms.sections.4.item4")}</li>
            <li>{t("terms.sections.4.item5")}</li>
            <li>{t("terms.sections.4.item6")}</li>
            <li>{t("terms.sections.4.item7")}</li>
          </ul>
          <p className="legal-body-text">{t("terms.sections.4.p2")}</p>
        </section>

        {/* Section 5 */}
        <section id="sec-5">
          <h2 className="legal-section-h2">{t("terms.sections.5.title")}</h2>
          
          <h3 className="legal-section-h3">{t("terms.sections.5.sub1_title")}</h3>
          <p className="legal-body-text">{t("terms.sections.5.sub1_p1")}</p>
          <p className="legal-body-text">{t("terms.sections.5.sub1_p2")}</p>

          <h3 className="legal-section-h3">{t("terms.sections.5.sub2_title")}</h3>
          <p className="legal-body-text">{t("terms.sections.5.sub2_p1")}</p>
        </section>

        {/* Section 6 */}
        <section id="sec-6">
          <h2 className="legal-section-h2">{t("terms.sections.6.title")}</h2>
          
          <h3 className="legal-section-h3">{t("terms.sections.6.sub1_title")}</h3>
          <p className="legal-body-text">{t("terms.sections.6.sub1_p1")}</p>

          <h3 className="legal-section-h3">{t("terms.sections.6.sub2_title")}</h3>
          <ul className="legal-list">
            <li>{t("terms.sections.6.sub2_item1")}</li>
            <li>{t("terms.sections.6.sub2_item2")}</li>
            <li>{t("terms.sections.6.sub2_item3")}</li>
            <li>{t("terms.sections.6.sub2_item4")}</li>
          </ul>

          <h3 className="legal-section-h3">{t("terms.sections.6.sub3_title")}</h3>
          <ul className="legal-list">
            <li>{t("terms.sections.6.sub3_item1")}</li>
            <li>{t("terms.sections.6.sub3_item2")}</li>
            <li>{t("terms.sections.6.sub3_item3")}</li>
          </ul>
          <p className="legal-body-text">{t("terms.sections.6.sub3_p1")}</p>

          <h3 className="legal-section-h3">{t("terms.sections.6.sub4_title")}</h3>
          <ul className="legal-list">
            <li>{t("terms.sections.6.sub4_item1")}</li>
            <li>{t("terms.sections.6.sub4_item2")}</li>
            <li>{t("terms.sections.6.sub4_item3")}</li>
          </ul>
          <p className="legal-body-text">{t("terms.sections.6.sub4_p1")}</p>
        </section>

        {/* Section 7 */}
        <section id="sec-7">
          <h2 className="legal-section-h2">{t("terms.sections.7.title")}</h2>
          
          <h3 className="legal-section-h3">{t("terms.sections.7.sub1_title")}</h3>
          <p className="legal-body-text">{t("terms.sections.7.sub1_p1")}</p>

          <h3 className="legal-section-h3">{t("terms.sections.7.sub2_title")}</h3>
          <ul className="legal-list">
            <li>{t("terms.sections.7.sub2_item1")}</li>
            <li>{t("terms.sections.7.sub2_item2")}</li>
            <li>{t("terms.sections.7.sub2_item3")}</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section id="sec-8">
          <h2 className="legal-section-h2">{t("terms.sections.8.title")}</h2>
          <p className="legal-body-text">{t("terms.sections.8.p1")}</p>
          <ul className="legal-list">
            <li>{t("terms.sections.8.item1")}</li>
            <li>{t("terms.sections.8.item2")}</li>
            <li>{t("terms.sections.8.item3")}</li>
          </ul>
          <p className="legal-body-text">{t("terms.sections.8.p2")}</p>
        </section>

        {/* Section 9 */}
        <section id="sec-9">
          <h2 className="legal-section-h2">{t("terms.sections.9.title")}</h2>
          <p className="legal-body-text">{t("terms.sections.9.p1")}</p>
        </section>

        {/* Section 10 */}
        <section id="sec-10">
          <h2 className="legal-section-h2">{t("terms.sections.10.title")}</h2>
          <p className="legal-body-text">{t("terms.sections.10.p1")}</p>
        </section>

        {/* Section 11 */}
        <section id="sec-11">
          <h2 className="legal-section-h2">{t("terms.sections.11.title")}</h2>
          <p className="legal-body-text">{t("terms.sections.11.p1")}</p>
        </section>

        {/* Section 12 */}
        <section id="sec-12">
          <h2 className="legal-section-h2">{t("terms.sections.12.title")}</h2>
          <p className="legal-body-text">{t("terms.sections.12.p1")}</p>
          <ul className="legal-list">
            <li>
              <a href="mailto:ulkartal@gmail.com" className="legal-external-link">
                ulkartal@gmail.com
              </a>
            </li>
            <li>
              <a href="https://tidenote-22fde.web.app" target="_blank" rel="noreferrer" className="legal-external-link">
                https://tidenote-22fde.web.app
              </a>
            </li>
          </ul>
        </section>
      </main>

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
