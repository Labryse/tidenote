import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useNoteStore, PREMIUM_ENABLED } from "../store/useNoteStore";
import { useEffect, useState } from "react";
import {
  FileText, PenSquare, Cloud, Moon, FolderOpen, CalendarDays,
  Check, Sun, ArrowRight, Sparkles
} from "lucide-react";
import DownloadButton from "../components/DownloadButton";


const logoSrc = (() => {
  try { return new URL("/icon.png", import.meta.url).href; }
  catch { return "/icon.png"; }
})();

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme, user, setSettingsTab, setIsSettingsOpen } = useNoteStore();

  useScrollReveal();

  const isTr = i18n.language?.startsWith("tr") ?? false;
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const features = [
    {
      Icon: FileText,
      title: t("landing.features.editorTitle", "Blok Editör"),
      desc: t("landing.features.editorDesc", "Başlıklar, listeler, görev kutuları ve zengin içerik blokları."),
    },
    {
      Icon: PenSquare,
      title: t("landing.features.canvasTitle", "Sonsuz Canvas"),
      desc: t("landing.features.canvasDesc", "Fikirlerinizi serbest çizimler ve şemalarla görselleştirin."),
    },
    {
      Icon: Cloud,
      title: t("landing.features.syncTitle", "Bulut Senkronizasyon"),
      desc: t("landing.features.syncDesc", "Tüm cihazlarınızda anlık ve kesintisiz senkronizasyon."),
    },
    {
      Icon: FolderOpen,
      title: isTr ? "Klasörler" : "Folders",
      desc: isTr ? "Hiyerarşik klasörlerle notlarınızı kolayca düzenleyin." : "Organize your notes with nested folders.",
    },
    {
      Icon: CalendarDays,
      title: isTr ? "Günlük Journal" : "Daily Journal",
      desc: isTr ? "Her güne ait bir sayfa — düşüncelerinizi kaybetmeyin." : "One page per day — never lose a thought.",
    },
    {
      Icon: Moon,
      title: t("landing.features.themeTitle", "Açık & Koyu Tema"),
      desc: t("landing.features.themeDesc", "Gözlerinizi yormadan, istediğiniz temada çalışın."),
    },
  ];

  const freeFeatures = [
    t("landing.pricing.fUnlimited"),
    t("landing.pricing.fStorage1"),
    t("landing.pricing.fCore"),
    t("landing.pricing.fThemes"),
    t("landing.pricing.fApps"),
  ];

  const premiumFeatures = [
    t("landing.pricing.fEverything"),
    t("landing.pricing.fStorage10"),
    t("landing.pricing.fPdf"),
    t("landing.pricing.fHistory"),
    t("landing.pricing.fSupport"),
  ];

  return (
    <div className="landing-wrapper">
      {/* ── NAVBAR ────────────────────────────────────────── */}
      <header className="landing-navbar-wrapper">
        <div className="landing-navbar">
          <Link to="/" className="lp-nav-logo">
            <img src={logoSrc} alt="TideNote" style={{ width: 26, height: 26, objectFit: "contain" }} />
            <span className="lp-nav-logo-text">TideNote</span>
          </Link>

          <div className="landing-nav-right">
            <div className="landing-lang-selector">
              <button onClick={() => i18n.changeLanguage("tr")} className={`lang-btn ${i18n.language?.startsWith("tr") ? "active" : ""}`}>TR</button>
              <span className="lang-separator">/</span>
              <button onClick={() => i18n.changeLanguage("en")} className={`lang-btn ${i18n.language?.startsWith("en") ? "active" : ""}`}>EN</button>
            </div>

            <button className="landing-theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user ? (
              <Link to="/app" className="btn-signup">{t("landing.goApp", "Uygulamaya Git")}</Link>
            ) : (
              <>
                <Link to="/login" className="btn-login">{t("landing.login", "Giriş Yap")}</Link>
                <Link to="/login" className="btn-signup">{t("landing.startFree", "Ücretsiz Başla")}</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-blobs" aria-hidden="true">
          <div className="lp-blob lp-blob-1" />
          <div className="lp-blob lp-blob-2" />
        </div>

        <div className="lp-hero-inner">
          {/* Left — Text */}
          <div className="lp-hero-text">
            <div className="lp-hero-badge">
              <span>{t("landing.badge", "Not alma yeniden tasarlandı")}</span>
              <span className="lp-hero-badge-cursor" aria-hidden="true" />
            </div>

            <h1 className="lp-hero-title">{t("landing.title")}</h1>
            <p className="lp-hero-sub">{t("landing.subtitle")}</p>

            <div className="lp-hero-ctas">
              <Link to={user ? "/app" : "/login"} className="lp-btn-secondary">
                {t("landing.goApp", "Uygulamaya Git")} <ArrowRight size={15} />
              </Link>
              <DownloadButton />
            </div>
          </div>

          {/* Right — Animated visual / Screenshot */}
          <div className="lp-hero-visual" aria-hidden="true">
            {/* TEMPORARY HERO MOCKUP - replace with real product screenshot when ready */}
            <div className="static-mockup-window">
              <div className="static-mockup-header">
                <div className="static-mockup-dots">
                  <div className="static-mockup-dot red"></div>
                  <div className="static-mockup-dot yellow"></div>
                  <div className="static-mockup-dot green"></div>
                </div>
              </div>
              <div className="static-mockup-body">
                {/* Left Pane: Editor */}
                <div className="static-mockup-pane editor-pane">
                  <div className="mockup-skeleton-title"></div>
                  <div className="mockup-skeleton-line" style={{ width: "85%" }}></div>
                  <div className="mockup-skeleton-line" style={{ width: "70%" }}></div>
                  
                  <div className="mockup-skeleton-list">
                    <div className="mockup-skeleton-check-item">
                      <div className="mockup-skeleton-checkbox checked"></div>
                      <div className="mockup-skeleton-line" style={{ width: "60%" }}></div>
                    </div>
                    <div className="mockup-skeleton-check-item">
                      <div className="mockup-skeleton-checkbox"></div>
                      <div className="mockup-skeleton-line" style={{ width: "50%" }}></div>
                    </div>
                    <div className="mockup-skeleton-check-item">
                      <div className="mockup-skeleton-checkbox"></div>
                      <div className="mockup-skeleton-line" style={{ width: "75%" }}></div>
                    </div>
                  </div>
                  
                  <div className="mockup-skeleton-line" style={{ width: "90%", marginTop: "16px" }}></div>
                  <div className="mockup-skeleton-line" style={{ width: "40%" }}></div>
                </div>
                
                {/* Divider */}
                <div className="static-mockup-divider"></div>
                
                {/* Right Pane: Canvas */}
                <div className="static-mockup-pane canvas-pane">
                  <svg className="mockup-canvas-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                    <rect x="50" y="80" width="90" height="50" rx="8" className="mockup-canvas-shape" />
                    <rect x="230" y="140" width="100" height="60" rx="8" className="mockup-canvas-shape" />
                    <path d="M 140 105 C 190 105, 180 170, 225 170" fill="none" stroke="#0891b2" strokeWidth="2" strokeDasharray="4 4" />
                    <polygon points="230,170 222,165 222,175" fill="#0891b2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-section-inner">
          <div className="reveal">
            <p className="lp-eyebrow">{isTr ? "ÖZELLİKLER" : "FEATURES"}</p>
            <h2 className="lp-section-title">
              {t("landing.featuresTitle", "Her şey düşündüğünüzden daha kolay.")}
            </h2>
          </div>

          <div className="lp-features-grid">
            {features.map((f, i) => (
              <div
                key={i}
                className="lp-feature-card reveal"
                style={{ transitionDelay: `${i * 0.07}s` }}
              >
                <div className="lp-feature-icon-wrap">
                  <f.Icon size={20} />
                </div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      {PREMIUM_ENABLED && (
        <section id="pricing" className="lp-section lp-pricing-section">
          <div className="lp-section-inner">
            <div className="reveal">
              <p className="lp-eyebrow">{isTr ? "FİYATLANDIRMA" : "PRICING"}</p>
              <h2 className="lp-section-title">
                {t("landing.pricingTitle", "Başlamak ücretsiz.")}
              </h2>
            </div>

            {/* Billing cycle toggle */}
            <div className="lp-billing-toggle reveal">
              <button
                className={`lp-billing-btn ${billingCycle === "monthly" ? "active" : ""}`}
                onClick={() => setBillingCycle("monthly")}
              >
                {t("landing.pricing.monthly", "Aylık")}
              </button>
              <button
                className={`lp-billing-btn ${billingCycle === "yearly" ? "active" : ""}`}
                onClick={() => setBillingCycle("yearly")}
              >
                {t("landing.pricing.yearly", "Yıllık")}
                <span className="lp-billing-badge">{t("landing.pricing.yearlyBadge", "2 ay ücretsiz")}</span>
              </button>
            </div>

            <div className="lp-pricing-grid">
              {/* FREE */}
              <div className="lp-pricing-card reveal">
                <p className="lp-plan-name">{t("landing.pricing.free", "Ücretsiz")}</p>
                <div className="lp-plan-price">
                  <span className="lp-price-num">$0</span>
                  <span className="lp-price-per">/{t("settings.month", "ay")}</span>
                </div>
                <ul className="lp-plan-list">
                  {freeFeatures.map((feat, i) => (
                    <li key={i}><Check size={14} /><span>{feat}</span></li>
                  ))}
                </ul>
                <Link to={user ? "/app" : "/login"} className="lp-plan-btn lp-plan-btn-free">
                  {t("landing.pricing.freeBtn", "Hemen Başla")}
                </Link>
              </div>

              {/* PREMIUM */}
              <div className="lp-pricing-card lp-pricing-popular reveal" style={{ transitionDelay: "0.1s" }}>
                <span className="lp-popular-badge">{t("landing.pricing.popular", "En Popüler")}</span>
                <p className="lp-plan-name">{t("landing.pricing.premium", "Premium")}</p>
                <div className="lp-plan-price">
                  {billingCycle === "yearly" ? (
                    <>
                      <span className="lp-price-num">$24.99</span>
                      <span className="lp-price-per">/{t("settings.year", "yıl")}</span>
                    </>
                  ) : (
                    <>
                      <span className="lp-price-num">$2.99</span>
                      <span className="lp-price-per">/{t("settings.month", "ay")}</span>
                    </>
                  )}
                </div>
                <ul className="lp-plan-list">
                  {premiumFeatures.map((feat, i) => (
                    <li key={i}><Check size={14} /><span>{feat}</span></li>
                  ))}
                </ul>
                <button
                  className="lp-plan-btn lp-plan-btn-premium"
                  onClick={() => {
                    if (user) {
                      setSettingsTab("billing");
                      setIsSettingsOpen(true);
                    } else {
                      navigate("/login");
                    }
                  }}
                >
                  {t("landing.pricing.premiumBtn", "Premium'a Geç")}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-footer-logo">
              <img src={logoSrc} alt="TideNote" style={{ width: 20, height: 20, objectFit: "contain" }} />
              <span>TideNote</span>
            </div>
            <p className="lp-footer-tagline">
              {isTr ? "Fikirleriniz için modern bir alan." : "A modern space for your ideas."}
            </p>
          </div>

          <div className="lp-footer-links">
            <Link to="/privacy">{t("landing.footer.privacy", "Gizlilik Politikası")}</Link>
            <Link to="/terms">{t("landing.footer.terms", "Kullanım Şartları")}</Link>
            {!user && <Link to="/login">{t("landing.login", "Giriş Yap")}</Link>}
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 TideNote. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
