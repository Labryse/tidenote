import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  PenLine, Palette, Table2, Folder, CheckSquare, Square,
  Sparkles, FileText, Image, Search, Quote
} from "lucide-react";

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

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(
  text: string,
  speed: number = 35,
  startDelay: number = 0,
  trigger: boolean = true
) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!trigger) {
      setDisplayed("");
      setDone(false);
      return;
    }
    setDisplayed("");
    setDone(false);
    let idx = 0;
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        idx++;
        setDisplayed(text.slice(0, idx));
        if (idx >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, startDelay, trigger]);

  return { displayed, done };
}

// ── HeroDemoInner ─────────────────────────────────────────────────────────────
function HeroDemoInner() {
  const { i18n } = useTranslation();
  const isTr = i18n.language?.startsWith("tr") ?? false;

  const [activeTab, setActiveTab] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const advance = useCallback(() => {
    setActiveTab(prev => (prev + 1) % 3);
  }, []);

  // Re-key scenes on tab change so animations restart cleanly
  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [activeTab]);

  const tabs = [
    { label: isTr ? "Yaz"        : "Write",    icon: <PenLine  size={14} /> },
    { label: isTr ? "Çiz"        : "Draw",     icon: <Palette  size={14} /> },
    { label: isTr ? "Organize Et": "Organize", icon: <Table2   size={14} /> },
  ];

  return (
    <div className="hero-demo-container">
      {/* ── Tab bar ── */}
      <div className="hero-demo-tabs">
        {tabs.map((t, i) => (
          <button
            key={i}
            type="button"
            className={`hero-demo-tab-btn${activeTab === i ? " active" : ""}`}
            onClick={() => setActiveTab(i)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Fake browser frame ── */}
      <div className="hero-demo-browser">
        <div className="hero-demo-browser-header">
          <div className="hero-demo-dots">
            <div className="hero-demo-dot red"    />
            <div className="hero-demo-dot yellow" />
            <div className="hero-demo-dot green"  />
          </div>
        </div>

        <div className="demo-workspace">
          {/* Sidebar */}
          <div className="demo-sidebar">
            <div className="demo-sidebar-logo">
              <img src="/icon.png" alt="TideNote" style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 4 }} />
              TideNote
            </div>
            <div className="demo-sidebar-section-title">
              {isTr ? "Klasörler & Koleksiyonlar" : "Folders & Collections"}
            </div>
            <div className={`demo-sidebar-item${activeTab === 0 ? " active" : ""}`}>
              <Folder size={14} />
              <span>{isTr ? "Uygulama Geliştirme" : "App Dev"}</span>
            </div>
            <div className={`demo-sidebar-item${activeTab === 1 ? " active" : ""}`}>
              <Folder size={14} />
              <span>{isTr ? "Oyun Tasarımları" : "Game Designs"}</span>
            </div>
            <div className="demo-sidebar-item">
              <Folder size={14} />
              <span>{isTr ? "Kişisel" : "Personal"}</span>
            </div>
            <div className="demo-sidebar-divider" />
            <div className={`demo-sidebar-item${activeTab === 2 ? " active" : ""}`}>
              <Sparkles size={14} />
              <span>{isTr ? "Seyahat Planı" : "Travel Plan"}</span>
            </div>
          </div>

          {/* Scenes */}
          <div className="hero-demo-scenes">
            {activeTab === 0 && (
              <div key={`write-${animKey}`} className="hero-demo-scene-wrapper active">
                <SceneWrite isTr={isTr} onComplete={advance} />
              </div>
            )}
            {activeTab === 1 && (
              <div key={`draw-${animKey}`} className="hero-demo-scene-wrapper active">
                <SceneDraw isTr={isTr} onComplete={advance} />
              </div>
            )}
            {activeTab === 2 && (
              <div key={`org-${animKey}`} className="hero-demo-scene-wrapper active">
                <SceneOrganize isTr={isTr} onComplete={advance} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scene 1: Write ────────────────────────────────────────────────────────────
function SceneWrite({ isTr, onComplete }: { isTr: boolean; onComplete: () => void }) {
  const titleStr = isTr ? "Mobil Cihaz Projesi"                    : "Mobile Device Project";
  const paraStr  = isTr ? "MVP lansmanı öncesi kritik görevler:"   : "Critical tasks before MVP launch:";
  const line1Str = isTr ? "Uygulama mağazası görsellerini hazırla" : "Prepare app store screenshots";
  const line2Str = isTr ? "API entegrasyonlarını test et"          : "Test API integrations";

  const { displayed: titleTxt, done: titleDone } = useTypewriter(titleStr, 38, 0,   true);
  const { displayed: paraTxt,  done: paraDone  } = useTypewriter(paraStr,  28, 700, titleDone);
  const { displayed: line1Txt, done: line1Done } = useTypewriter(line1Str, 28, 300, paraDone);
  const { displayed: line2Txt, done: line2Done } = useTypewriter(line2Str, 28, 200, line1Done);

  const [checked,    setChecked]    = useState(false);
  const [showQuote,  setShowQuote]  = useState(false);
  const [slashStr,   setSlashStr]   = useState("/");
  const [showMenu,   setShowMenu]   = useState(false);
  const [showTable,  setShowTable]  = useState(false);

  // Checkbox tick
  useEffect(() => {
    if (!line2Done) return;
    const t = setTimeout(() => setChecked(true), 350);
    return () => clearTimeout(t);
  }, [line2Done]);

  // Quote fade-in
  useEffect(() => {
    if (!checked) return;
    const t = setTimeout(() => setShowQuote(true), 400);
    return () => clearTimeout(t);
  }, [checked]);

  // Slash command typing
  useEffect(() => {
    if (!showQuote) return;
    const target = "/tablo";
    let i = 1;
    const t1 = setTimeout(() => {
      setSlashStr("/");
      const interval = setInterval(() => {
        i++;
        setSlashStr(target.slice(0, i));
        if (i >= target.length) {
          clearInterval(interval);
          setShowMenu(true);
        }
      }, 45);
      return () => clearInterval(interval);
    }, 700);
    return () => clearTimeout(t1);
  }, [showQuote]);

  // Replace menu with table
  useEffect(() => {
    if (!showMenu) return;
    const t = setTimeout(() => { setShowTable(true); setShowMenu(false); }, 600);
    return () => clearTimeout(t);
  }, [showMenu]);

  // Advance scene
  useEffect(() => {
    if (!showTable) return;
    const t = setTimeout(onComplete, 3200);
    return () => clearTimeout(t);
  }, [showTable, onComplete]);

  return (
    <div className="demo-scene-write">
      <div className="demo-scene-title">{titleTxt}&nbsp;</div>

      {titleDone && (
        <p className="demo-editor-para">{paraTxt}&nbsp;</p>
      )}

      {paraDone && (
        <p className="demo-editor-line">
          {checked
            ? <CheckSquare size={16} className="demo-checkboxChecked" />
            : <Square      size={16} className="demo-checkbox" />
          }
          <span>{line1Txt}</span>
        </p>
      )}

      {line1Done && (
        <p className="demo-editor-line">
          <Square size={16} className="demo-checkbox" />
          <span>{line2Txt}</span>
        </p>
      )}

      {showQuote && (
        <div className="demo-editor-quote">
          <Quote size={14} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
          <span>
            {isTr ? "Lansman tarihi 15 Temmuz olarak güncellendi." : "Launch date updated to July 15th."}
          </span>
        </div>
      )}

      {showQuote && !showTable && (
        <p className="demo-editor-slash">{slashStr}</p>
      )}

      {showMenu && (
        <div className="demo-editor-dropdown">
          <div className="demo-dropdown-item">
            <Table2 size={15} />
            <div>
              <div className="demo-dropdown-title">{isTr ? "Tablo" : "Table"}</div>
              <div className="demo-dropdown-sub">{isTr ? "3×3 tablo oluştur" : "Create 3×3 table"}</div>
            </div>
          </div>
        </div>
      )}

      {showTable && (
        <div className="demo-editor-table-wrap">
          <table className="demo-editor-table">
            <thead>
              <tr>
                <th>{isTr ? "Özellik"   : "Feature"}</th>
                <th>{isTr ? "Öncelik"   : "Priority"}</th>
                <th>{isTr ? "Durum"     : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{isTr ? "Koyu Tema"     : "Dark Theme"}</td>
                <td>{isTr ? "Yüksek"        : "High"}</td>
                <td><span className="demo-badge teal-green">{isTr ? "Tamamlandı" : "Done"}</span></td>
              </tr>
              <tr>
                <td>{isTr ? "Bildirimler"   : "Push Alerts"}</td>
                <td>{isTr ? "Kritik"        : "Critical"}</td>
                <td><span className="demo-badge teal-dark">{isTr ? "Devam Ediyor" : "In Progress"}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Scene 2: Draw (Canvas / Mind-map) ────────────────────────────────────────
function SceneDraw({ isTr, onComplete }: { isTr: boolean; onComplete: () => void }) {
  // Staged boolean gates for sequential animation
  const [s1, setS1] = useState(false); // circle done → center text
  const [s2, setS2] = useState(false); // center text done → branch lines
  const [s3, setS3] = useState(false); // branch lines → sub nodes
  const [s4, setS4] = useState(false); // sub nodes → leaf lines + extras

  const centerStr = isTr ? "Zindan Girişi" : "Dungeon\nEntrance";
  const sub1Str   = isTr ? "Zindan Odası"  : "Dungeon Room";
  const sub2Str   = isTr ? "Boss Arenası"  : "Boss Arena";
  const sub3Str   = isTr ? "Gizli Hazine"  : "Secret\nTreasure";
  const stickyStr = isTr ? "DİKKAT: Canavarlar burada beliriyor!" : "WARNING: Monsters spawn here!";

  const { displayed: centerTxt, done: centerDone } = useTypewriter(centerStr.replace("\n"," "), 35, 0, s1);
  const { displayed: sub1Txt,   done: sub1Done   } = useTypewriter(sub1Str,   32, 0, s3);
  const { displayed: sub2Txt,   done: sub2Done   } = useTypewriter(sub2Str,   32, 0, s3);
  const { displayed: sub3Txt                      } = useTypewriter(sub3Str.replace("\n"," "), 32, 0, s4);
  const { displayed: stickyTxt, done: stickyDone  } = useTypewriter(stickyStr, 28, 100, s4);

  // Stage timers
  useEffect(() => { const t = setTimeout(() => setS1(true), 800);  return () => clearTimeout(t); }, []);
  useEffect(() => { if (!centerDone) return; const t = setTimeout(() => setS2(true), 300);  return () => clearTimeout(t); }, [centerDone]);
  useEffect(() => { if (!s2) return;         const t = setTimeout(() => setS3(true), 600);  return () => clearTimeout(t); }, [s2]);
  useEffect(() => { if (!sub1Done || !sub2Done) return; const t = setTimeout(() => setS4(true), 500); return () => clearTimeout(t); }, [sub1Done, sub2Done]);
  useEffect(() => { if (!stickyDone) return; const t = setTimeout(onComplete, 3200); return () => clearTimeout(t); }, [stickyDone, onComplete]);

  // CSS-animated line lengths (stroke-dasharray = stroke-dashoffset initially, animated to 0)
  const lineStyle = (delay: string): React.CSSProperties => ({
    strokeDasharray: 260,
    strokeDashoffset: 260,
    animation: `hd-draw 0.45s ease-out ${delay} forwards`,
  });
  const freeStyle = (delay: string): React.CSSProperties => ({
    strokeDasharray: 100,
    strokeDashoffset: 100,
    animation: `hd-draw 0.35s ease-out ${delay} forwards`,
  });

  return (
    <div className="demo-scene-draw">
      <svg className="demo-canvas-svg">
        <defs>
          <marker id="hd-arrow" viewBox="0 0 10 10" refX="7" refY="5"
            markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,2 L8,5 L0,8z" fill="rgba(13,148,136,0.55)" />
          </marker>
        </defs>

        {/* Center circle (always visible — animates in via CSS class) */}
        <circle cx="160" cy="210" r="44" className="hd-circle" />

        {/* Branch lines (visible after s2) */}
        {s2 && <>
          <path d="M204,210 Q255,140 320,108" className="hd-conn" style={lineStyle("0s")} markerEnd="url(#hd-arrow)" />
          <path d="M204,210 Q255,280 320,308" className="hd-conn" style={lineStyle("0.05s")} markerEnd="url(#hd-arrow)" />
        </>}

        {/* Leaf lines (visible after s4) */}
        {s4 && <>
          <path d="M448,108 L520,108"          className="hd-conn" style={lineStyle("0s")}    markerEnd="url(#hd-arrow)" />
          <path d="M448,308 Q484,268 520,228"  className="hd-conn" style={lineStyle("0.06s")} markerEnd="url(#hd-arrow)" />
          <path d="M384,330 Q450,370 520,362"  className="hd-conn" style={lineStyle("0.12s")} markerEnd="url(#hd-arrow)" />
        </>}

        {/* Freehand doodles */}
        {s4 && <>
          <path d="M210,150 Q240,138 256,158 T278,148" className="hd-free" style={freeStyle("0.2s")} />
          <path d="M458,55  Q484,44  498,64  T518,54"  className="hd-free" style={freeStyle("0.35s")} />
        </>}
      </svg>

      {/* Center label inside circle */}
      {s1 && (
        <div className="demo-canvas-node center-label visible"
          style={{ left: 116, top: 166, width: 88, height: 88 }}>
          {centerTxt}
        </div>
      )}

      {/* Sub-node 1 */}
      {s3 && (
        <div className="demo-canvas-node visible"
          style={{ left: 320, top: 84, width: 130, height: 48 }}>
          {sub1Txt}
        </div>
      )}

      {/* Sub-node 2 */}
      {s3 && (
        <div className="demo-canvas-node visible"
          style={{ left: 320, top: 284, width: 130, height: 48 }}>
          {sub2Txt}
        </div>
      )}

      {/* Leaf node 3 */}
      {s4 && (
        <div className="demo-canvas-node visible"
          style={{ left: 520, top: 84, width: 130, height: 48 }}>
          {sub3Txt}
        </div>
      )}

      {/* Image card */}
      {s4 && (
        <div className="demo-img-card visible"
          style={{ left: 520, top: 182, width: 130, height: 90 }}>
          <div className="demo-img-card-thumb"><Image size={22} /></div>
          <div className="demo-img-card-label">Boss_Konsepti.png</div>
        </div>
      )}

      {/* Sticky note */}
      {s4 && (
        <div className="demo-sticky visible"
          style={{ left: 520, top: 318, width: 138 }}>
          {stickyTxt}
        </div>
      )}
    </div>
  );
}

// ── Scene 3: Organize ─────────────────────────────────────────────────────────
function SceneOrganize({ isTr, onComplete }: { isTr: boolean; onComplete: () => void }) {
  const queryStr = isTr ? "İtalya" : "Italy";
  const { displayed: query, done: queryDone } = useTypewriter(queryStr, 55, 1800, true);

  const [filtered, setFiltered] = useState(false);

  useEffect(() => {
    if (!queryDone) return;
    const t = setTimeout(() => setFiltered(true), 450);
    return () => clearTimeout(t);
  }, [queryDone]);

  useEffect(() => {
    const t = setTimeout(onComplete, 6800);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="demo-scene-organize">
      <div className="demo-organize-title">
        <Sparkles size={17} style={{ color: "var(--color-accent)" }} />
        {isTr ? "Koleksiyon: Seyahat Planı" : "Collection: Travel Plan"}
      </div>
      <p className="demo-organize-desc">
        {isTr
          ? "Akıllı arama ile yüzlerce not arasından saniyeler içinde bulun:"
          : "Find anything across hundreds of notes in seconds:"}
      </p>

      {/* Search bar */}
      <div className="demo-search-bar">
        <Search size={15} style={{ color: "var(--color-text-muted)" }} />
        <div className="demo-search-text">
          {query}
          {!queryDone && (
            <span style={{ display: "inline-block", width: 1.5, height: 14, background: "var(--color-accent)", marginLeft: 2, verticalAlign: "middle" }} />
          )}
        </div>
      </div>

      {/* Note list */}
      <div className="demo-note-list">
        <div className="demo-note-item">
          <div className="demo-note-left">
            <FileText size={15} style={{ color: "var(--color-text-muted)" }} />
            <span>{isTr ? "Roma Gezi Rotası" : "Rome Travel Itinerary"}</span>
          </div>
          <div className="demo-note-right">
            <span className="hd-badge teal">#italya</span>
            <span className="hd-badge gray"><Folder size={10} /> {isTr ? "Kişisel" : "Personal"}</span>
          </div>
        </div>

        <div className="demo-note-item">
          <div className="demo-note-left">
            <FileText size={15} style={{ color: "var(--color-text-muted)" }} />
            <span>{isTr ? "Uçak Biletleri (İtalya)" : "Flight Tickets (Italy)"}</span>
          </div>
          <div className="demo-note-right">
            <span className="hd-badge teal">#bilet</span>
            <span className="hd-badge gray"><Folder size={10} /> {isTr ? "Kişisel" : "Personal"}</span>
          </div>
        </div>

        <div className={`demo-note-item${filtered ? " filtered-out" : ""}`}>
          <div className="demo-note-left">
            <FileText size={15} style={{ color: "var(--color-text-muted)" }} />
            <span>{isTr ? "Alışveriş Listesi" : "Weekly Grocery List"}</span>
          </div>
          <div className="demo-note-right">
            <span className="hd-badge gray">#market</span>
            <span className="hd-badge gray"><Folder size={10} /> {isTr ? "Kişisel" : "Personal"}</span>
          </div>
        </div>

        <div className={`demo-note-item${filtered ? " filtered-out" : ""}`}>
          <div className="demo-note-left">
            <FileText size={15} style={{ color: "var(--color-text-muted)" }} />
            <span>{isTr ? "Haftalık Egzersiz" : "Weekly Exercise Plan"}</span>
          </div>
          <div className="demo-note-right">
            <span className="hd-badge gray">#saglik</span>
            <span className="hd-badge gray"><Folder size={10} /> {isTr ? "Kişisel" : "Personal"}</span>
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
