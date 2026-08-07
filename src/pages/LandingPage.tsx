import { useLogoSrc } from '../lib/utils';
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useNoteStore } from "../store/useNoteStore";
import { useEffect } from "react";
import {
  Moon, Sun, LayoutGrid, Maximize, Cloud, FolderTree, Book, Share2, GitFork,
  FilePlus, Search, Briefcase, Home, FileText, Square, CheckSquare,
  Folder, FolderPlus, Grid, PenTool, Calendar, MousePointer2, Plus
} from "lucide-react";
import DownloadButton from "../components/DownloadButton";
import "./LandingPage.css";



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
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );
    document.querySelectorAll(".lp-reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const lpContent = {
  tr: {
    navGoApp: "Uygulamaya Git",
    heroBadge: "Not alma yeniden tasarlandı",
    heroTitle: "Düşünceleriniz için sonsuz bir alan",
    heroSub: "Blok editör ve sonsuz canvas bir arada. Notlarınız, çizimleriniz, fikirleriniz — tek yerde.",
    btnGoApp: "Uygulamaya Git",
    featuresEyebrow: "ÖZELLİKLER",
    featuresTitle: "Her şey düşündüğünüzden daha kolay",
    feat1Title: "Blok Editör",
    feat1Desc: "Slash komutuyla başlıklar, listeler, görev kutuları ekle. Blokları sürükleyip düzenle.",
    feat2Title: "Sonsuz Canvas",
    feat2Desc: "Çiz, şekil ekle, diyagram oluştur. Sınır yok, zoom yok, kısıtlama yok.",
    feat3Title: "Bulut Senkronizasyon",
    feat3Desc: "Telefon, tablet, bilgisayar — her cihazda anında erişim. Otomatik kaydedilir.",
    feat4Title: "Klasörler & Etiketler",
    feat4Desc: "Hiyerarşik klasörler ve etiketlerle notlarını kolayca düzenle.",
    feat5Title: "Günlük (Journal)",
    feat5Desc: "Her güne ait bir sayfa — düşüncelerini kaybetme.",
    feat6Title: "Paylaş & Dışa Aktar",
    feat6Desc: "Notlarını herkese açık bağlantıyla paylaş. Word, PDF, PNG, SVG olarak dışa aktar.",
    farkTitle: "Yazmak ve çizmek, tek ekranda",
    farkDesc: "Editör ile canvas aynı uygulamada. Fikirlerinizi yazarken anında diyagrama dönüştürün, geçiş yapmadan üretin.",
    platformsTitle: "Her cihazında",
    platWeb: "Web",
    platWin: "Windows",
    platAndroid: "Android (Yakında)",
    closingTitle: "Fikirlerin bir yere ait olmalı",
    closingCta: "Ücretsiz Başla",
    closingNote: "Kayıt ücretsiz, kredi kartı gerekmez.",
    footerPrivacy: "Gizlilik Politikası",
    footerTerms: "Kullanım Şartları",
    footerContact: "İletişim",
  },
  en: {
    navGoApp: "Go to App",
    heroBadge: "Note-taking reimagined",
    heroTitle: "An infinite space for your thoughts",
    heroSub: "A block editor and infinite canvas in one place. Your notes, drawings, and ideas — all together.",
    btnGoApp: "Go to App",
    featuresEyebrow: "FEATURES",
    featuresTitle: "Everything simpler than you think",
    feat1Title: "Block Editor",
    feat1Desc: "Add headings, lists, to-do boxes with slash commands. Drag and drop to reorder.",
    feat2Title: "Infinite Canvas",
    feat2Desc: "Draw, add shapes, create diagrams. No borders, no zoom limits, no constraints.",
    feat3Title: "Cloud Sync",
    feat3Desc: "Phone, tablet, computer — instant access on every device. Saved automatically.",
    feat4Title: "Folders & Tags",
    feat4Desc: "Organize your notes easily with hierarchical folders and tags.",
    feat5Title: "Journal",
    feat5Desc: "A page for every day — don't lose your thoughts.",
    feat6Title: "Share & Export",
    feat6Desc: "Share your notes with public links. Export as Word, PDF, PNG, SVG.",
    farkTitle: "Writing and drawing, on one screen",
    farkDesc: "Editor and canvas in the same app. Turn your ideas into diagrams instantly while writing, without switching context.",
    platformsTitle: "On every device",
    platWeb: "Web",
    platWin: "Windows",
    platAndroid: "Android (Soon)",
    closingTitle: "Your ideas deserve a home",
    closingCta: "Get Started Free",
    closingNote: "Free to start, no credit card.",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service",
    footerContact: "Contact",
  }
};

export default function LandingPage() {
  const logoSrc = useLogoSrc();
  const { i18n } = useTranslation();
  const { theme, setTheme, user } = useNoteStore();
  useScrollReveal();

  const isTr = i18n.language?.startsWith("tr") ?? false;
  const content = isTr ? lpContent.tr : lpContent.en;

  const features = [
    { icon: LayoutGrid, title: content.feat1Title, desc: content.feat1Desc },
    { icon: Maximize, title: content.feat2Title, desc: content.feat2Desc },
    { icon: Cloud, title: content.feat3Title, desc: content.feat3Desc },
    { icon: FolderTree, title: content.feat4Title, desc: content.feat4Desc },
    { icon: Book, title: content.feat5Title, desc: content.feat5Desc },
    { icon: Share2, title: content.feat6Title, desc: content.feat6Desc }
  ];

  return (
    <div className="lp-new-wrapper">
      {/* 1. NAVBAR */}
      <header className="landing-navbar-wrapper">
        <div className="landing-navbar">
          <Link to="/" className="landing-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img 
              src={logoSrc} 
              className="app-logo-img"
              alt="TideNote"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
              TideNote
            </span>
          </Link>
          <div className="landing-nav-right">
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
            {user ? (
              <Link to="/app" className="btn-signup">
                {content.navGoApp}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-login">
                  {isTr ? "Giriş Yap" : "Log in"}
                </Link>
                <Link to="/login" className="btn-signup">
                  {content.navGoApp}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO */}
      <section className="lp-hero">
        <h1 className="lp-hero-title lp-reveal" style={{ transitionDelay: "0.1s" }}>
          {content.heroTitle}
        </h1>
        <p className="lp-hero-sub lp-reveal" style={{ transitionDelay: "0.2s" }}>
          {content.heroSub}
        </p>
        <div className="lp-hero-actions lp-reveal" style={{ transitionDelay: "0.3s" }}>
          <Link to={user ? "/app" : "/login"} className="lp-btn-teal large">
            {content.btnGoApp}
          </Link>
          <div className="lp-download-wrapper">
            <DownloadButton />
          </div>
        </div>

        {/* CSS mockup of TideNote's own empty state
            no stock/placeholder screenshot, real product layout. */}
        <div className="lp-window-wrapper" aria-hidden="true">
          <div className="lp-window">
            <div className="lp-window-topbar browser-style">
              <div className="lp-window-dots">
                <span className="lp-window-dot red" />
                <span className="lp-window-dot yellow" />
                <span className="lp-window-dot green" />
              </div>
              <div className="lp-browser-tabs">
                <div className="lp-browser-tab active">
                  <img src={logoSrc} className="lp-tab-icon" alt="" />
                  <span>TideNote</span>
                  <div className="lp-tab-close">×</div>
                </div>
                <div className="lp-browser-tab-new">
                  <Plus size={14} />
                </div>
              </div>
            </div>
            <div className="lp-app-mock lp-mockup-img">
              <div className="lp-app-mock-body">
            <aside className="lp-app-mock-sidebar">
              <div className="lp-app-mock-brand">
                <img src={logoSrc} alt="" className="lp-app-mock-brand-icon" />
                <span>TideNote</span>
              </div>
              <div className="lp-app-mock-newbtn"><FilePlus size={14} /><span>{isTr ? "Yeni Not" : "New Note"}</span></div>
              <div className="lp-app-mock-today"><Calendar size={12} /> <span>{isTr ? "Bugün" : "Today"}</span><span className="lp-app-mock-badge">4 {isTr ? "Ağu" : "Aug"}</span></div>
              <div className="lp-app-mock-search"><Search size={12} /><span>{isTr ? "Notlarda ara..." : "Search notes..."}</span></div>
              <div className="lp-app-mock-sort">↓ {isTr ? "Son Güncelleme" : "Last Updated"} ▾</div>
              
              <div className="lp-app-mock-filters">
                <div className="lp-app-mock-pill active">{isTr ? "Tümü" : "All"}</div>
                <div className="lp-app-mock-pill">#TideNote</div>
              </div>

              <div className="lp-app-mock-label">
                <span>{isTr ? "KLASÖRLER & KOLEKSİYONLAR" : "FOLDERS & COLLECTIONS"}</span>
                <div className="lp-app-mock-label-icons"><FolderPlus size={10} /><Grid size={10} /></div>
              </div>
              <div className="lp-app-mock-row"><Folder size={12} /><span>{isTr ? "Pazarlama Planı" : "Marketing Plan"}</span></div>
              <div className="lp-app-mock-row"><Folder size={12} /><span>{isTr ? "Tasarım Fikirleri" : "Design Ideas"}</span></div>
              
              <div className="lp-app-mock-spacer"></div>
              
              <div className="lp-app-mock-file"><FileText size={12} /><div><span>{isTr ? "Lansman Hedefleri" : "Launch Goals"}</span><small>12 {isTr ? "Eyl" : "Sep"} 09:23</small></div></div>
              <div className="lp-app-mock-file"><PenTool size={12} /><div><span>{isTr ? "Kullanıcı Akışı" : "User Flow"}</span><small>28 {isTr ? "Tem" : "Jul"} 14:15</small></div></div>
              <div className="lp-app-mock-file"><FileText size={12} /><div><span>{isTr ? "Toplantı Notu" : "Meeting Note"}</span><small>05 {isTr ? "Haz" : "Jun"} 11:30</small></div></div>
            </aside>
            <main className="lp-app-mock-main">
              <MousePointer2 className="lp-app-mock-cursor" fill="#1E293B" color="#ffffff" strokeWidth={1} />
              <div className="lp-app-mock-hero-area">
                <img src={logoSrc} className="lp-app-mock-hero-logo" alt="" />
                <h2>{isTr ? "Merhaba, Kullanıcı!" : "Hello, User!"}</h2>
                <div className="lp-app-mock-date">14 {isTr ? "Eylül" : "September"} 2026, {isTr ? "Pazartesi" : "Monday"} • 14:23:45</div>
              </div>
              
              <div className="lp-app-mock-section">
                <h3>{isTr ? "SON NOTLAR" : "RECENT NOTES"}</h3>
                <div className="lp-app-mock-cards">
                  <div className="lp-app-mock-card"><FileText size={16} /><div><span>{isTr ? "Lansman Hedefleri" : "Launch Goals"}</span><small>12 {isTr ? "Eyl" : "Sep"} 09:23</small></div></div>
                  <div className="lp-app-mock-card"><PenTool size={16} /><div><span>{isTr ? "Kullanıcı Akışı" : "User Flow"} [7/7 12:09]</span><small>28 {isTr ? "Tem" : "Jul"} 14:15</small></div></div>
                  <div className="lp-app-mock-card"><FileText size={16} /><div><span>{isTr ? "Toplantı Notu" : "Meeting Note"}</span><small>05 {isTr ? "Haz" : "Jun"} 11:30</small></div></div>
                </div>
              </div>

              <div className="lp-app-mock-section">
                <h3>{isTr ? "HIZLI OLUŞTUR" : "QUICK CREATE"}</h3>
                <div className="lp-app-mock-quick">
                  <div className="lp-app-mock-quick-card"><FileText size={20} /><br/><span>{isTr ? "Yeni Belge" : "New Document"}</span></div>
                  <div className="lp-app-mock-quick-card teal"><PenTool size={20} /><br/><span>{isTr ? "Yeni Canvas" : "New Canvas"}</span></div>
                </div>
              </div>
            </main>
          </div>
        </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURES */}
      <section className="lp-section">
        <div className="lp-section-header lp-reveal">
          <div className="lp-section-eyebrow">{content.featuresEyebrow}</div>
          <h2 className="lp-section-title">{content.featuresTitle}</h2>
        </div>
        <div className="lp-features-grid">
          {features.map((feat, i) => (
            <div key={i} className="lp-feature-card lp-reveal" style={{ transitionDelay: `${i * 0.05}s` }}>
              <div className="lp-feature-icon">
                <feat.icon size={24} />
              </div>
              <h3 className="lp-feature-title">{feat.title}</h3>
              <p className="lp-feature-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. DIFFERENCE (FARK) */}
      <section className="lp-section">
        <div className="lp-fark">
          <div className="lp-fark-text lp-reveal">
            <h2 className="lp-fark-title">{content.farkTitle}</h2>
            <p className="lp-fark-desc">{content.farkDesc}</p>
          </div>

        </div>
      </section>

      {/* 6. CLOSING */}
      <section className="lp-closing lp-reveal">
        <h2 className="lp-closing-title">{content.closingTitle}</h2>
        <Link to={user ? "/app" : "/login"} className="lp-btn-white">
          {content.closingCta}
        </Link>
        <p className="lp-closing-note">{content.closingNote}</p>
      </section>

      {/* 7. FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <div className="lp-footer-logo">
              <img src={logoSrc} alt="TideNote" style={{ width: 22, height: 22, objectFit: "contain" }} />
              <span>TideNote</span>
            </div>
            <p className="lp-footer-desc">
              {isTr ? "Fikirleriniz için sonsuz bir alan." : "An infinite space for your ideas."}
            </p>
          </div>

          <nav className="lp-footer-links">
            <Link to="/privacy">{content.footerPrivacy}</Link>
            <Link to="/terms">{content.footerTerms}</Link>
            <a href="mailto:info@tidenote.app">{content.footerContact}</a>
            <a href="https://github.com/Labryse/tidenote" target="_blank" rel="noopener noreferrer">
              <GitFork size={14} /> GitHub
            </a>
            <Link to="/login">{isTr ? "Giriş Yap" : "Log In"}</Link>
          </nav>
        </div>

        <div className="lp-footer-bottom">
          <div className="lp-footer-lang">
            <button onClick={() => i18n.changeLanguage("tr")} className={`lp-lang-toggle ${isTr ? "lp-lang-active" : ""}`}>TR</button>
            <span className="lp-lang-sep">/</span>
            <button onClick={() => i18n.changeLanguage("en")} className={`lp-lang-toggle ${!isTr ? "lp-lang-active" : ""}`}>EN</button>
          </div>
          <span className="lp-footer-credit">Made by Studio Critonia with 💗</span>
          <span className="lp-footer-copyright">© 2026 TideNote. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
