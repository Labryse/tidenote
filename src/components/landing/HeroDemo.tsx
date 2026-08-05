import { useLogoSrc } from '../../lib/utils';
import React from "react";
import { useTranslation } from "react-i18next";
import {
  FilePlus, PenSquare, Search, FileText, Compass,
  Sun, Settings, User, Briefcase, Home, Rocket
} from "lucide-react";

/* TEMPORARY UI MOCKUP - replace with real screenshot
   Static, hand-built visual approximation of the app's own main screen
   (Sidebar + welcome dashboard). This is a plain presentational copy —
   it does NOT render the real <Sidebar>/<EmptyState> components and has
   no connection to live state/Firebase/auth, so it can never leak real
   user data. All copy below is generic placeholder content by design. */

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("HeroDemo crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: "#fef2f2", color: "#991b1b", borderRadius: 8, border: "1px solid #fee2e2" }}>
          <strong>HeroDemo Error:</strong>
          <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function HeroDemoInner() {
  const logoSrc = useLogoSrc();
  const { i18n } = useTranslation();
  const isTr = i18n.language?.startsWith("tr") ?? false;

  const folders = [
    { icon: <Briefcase size={13} />, label: isTr ? "İş" : "Work", active: true },
    { icon: <Home size={13} />, label: isTr ? "Kişisel" : "Personal", active: false },
    { icon: <Rocket size={13} />, label: isTr ? "Projeler" : "Projects", active: false },
  ];

  const sidebarNotes = [
    { label: isTr ? "Proje Planı" : "Project Roadmap", active: true },
    { label: isTr ? "Toplantı Notları" : "Meeting Notes", active: false },
  ];

  const recentNotes = [
    { icon: <FileText size={16} />, title: isTr ? "Proje Planı" : "Project Roadmap", meta: isTr ? "2 gün önce" : "2 days ago" },
    { icon: <FileText size={16} />, title: isTr ? "Toplantı Notları" : "Meeting Notes", meta: isTr ? "3 gün önce" : "3 days ago" },
    { icon: <Compass size={16} />, title: isTr ? "Fikirler" : "Ideas", meta: isTr ? "5 gün önce" : "5 days ago" },
  ];

  return (
    <div className="hero-demo-container">
      <div className="hero-demo-browser">
        <div className="hero-demo-browser-header">
          <div className="hero-demo-dots">
            <div className="hero-demo-dot red" />
            <div className="hero-demo-dot yellow" />
            <div className="hero-demo-dot green" />
          </div>
          <span className="hero-demo-header-caption">tidenote.app</span>
        </div>

        <div className="hero-demo-mockup">
          {/* Sidebar mockup */}
          <div className="hd-mock-sidebar">
            <div className="hd-mock-brand">
              <img src={logoSrc} alt="" aria-hidden="true" className="hd-mock-brand-icon" />
              <span className="hd-mock-brand-name">TideNote</span>
            </div>

            <div className="hd-mock-new-btn">
              <FilePlus size={13} />
              <span>{isTr ? "Yeni Not" : "New Note"}</span>
            </div>

            <div className="hd-mock-search">
              <Search size={12} />
              <span>{isTr ? "Notlarda ara..." : "Search notes..."}</span>
            </div>

            <div className="hd-mock-section-label">{isTr ? "KLASÖRLER" : "FOLDERS"}</div>
            {folders.map((f, i) => (
              <div key={i} className={`hd-mock-row${f.active ? " active" : ""}`}>
                {f.icon}
                <span>{f.label}</span>
              </div>
            ))}

            <div className="hd-mock-divider" />

            <div className="hd-mock-section-label">{isTr ? "NOTLAR" : "NOTES"}</div>
            {sidebarNotes.map((n, i) => (
              <div key={i} className={`hd-mock-row${n.active ? " active" : ""}`}>
                <FileText size={13} />
                <span>{n.label}</span>
              </div>
            ))}

            <div className="hd-mock-sidebar-footer">
              <span className="hd-mock-icon-btn"><Sun size={13} /></span>
              <span className="hd-mock-icon-btn"><Settings size={13} /></span>
              <span className="hd-mock-avatar"><User size={13} /></span>
            </div>
          </div>

          {/* Main dashboard mockup */}
          <div className="hd-mock-main">
            <div className="hd-mock-greeting-block">
              <h3 className="hd-mock-greeting">
                {isTr ? "TideNote'a Hoş Geldiniz" : "Welcome to TideNote"}
              </h3>
              <p className="hd-mock-date">
                {isTr ? "Perşembe, 9 Ekim" : "Thursday, October 9"}
              </p>
            </div>

            <div className="hd-mock-section">
              <div className="hd-mock-section-title">{isTr ? "SON NOTLAR" : "RECENT NOTES"}</div>
              <div className="hd-mock-recent-list">
                {recentNotes.map((n, i) => (
                  <div key={i} className="hd-mock-recent-card">
                    <span className="hd-mock-recent-icon">{n.icon}</span>
                    <div className="hd-mock-recent-text">
                      <span className="hd-mock-recent-title">{n.title}</span>
                      <span className="hd-mock-recent-meta">{n.meta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hd-mock-section">
              <div className="hd-mock-section-title">{isTr ? "HIZLI OLUŞTUR" : "QUICK CREATE"}</div>
              <div className="hd-mock-quick-row">
                <div className="hd-mock-quick-card">
                  <FilePlus size={18} />
                  <span>{isTr ? "Yeni Belge" : "New Document"}</span>
                </div>
                <div className="hd-mock-quick-card">
                  <PenSquare size={18} />
                  <span>{isTr ? "Yeni Canvas" : "New Canvas"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function HeroDemo() {
  return (
    <ErrorBoundary>
      <HeroDemoInner />
    </ErrorBoundary>
  );
}
