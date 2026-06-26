import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { getLogoSrc } from "../lib/utils";

const logoSrc = getLogoSrc();

export default function AuthRedirectPage() {
  const [status, setStatus] = useState("idle");

  const handleGoogleAuth = async () => {
    setStatus("loading");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        console.error("No access token!");
        setStatus("error");
        return;
      }

      // Deep link oluştur ve aç
      const deepLink = `tidenote://auth?accessToken=${encodeURIComponent(
        accessToken
      )}&email=${encodeURIComponent(result.user.email || "")}`;

      setStatus("success");

      // Deep link'i aç (Electron yakalar)
      window.location.href = deepLink;
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === "auth/popup-closed-by-user") {
        window.close();
        return;
      }
      setStatus("error");
    }
  };

  return (
    <div style={{
      display: "flex",
      width: "100vw",
      minHeight: "100dvh",
      background: "var(--color-bg-app)",
      fontFamily: "var(--font-sans)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animasyonlu arka plan daireler */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden"
      }}>
        {[
          { w: 400, h: 400, top: "-100px", left: "-100px", dur: "20s" },
          { w: 300, h: 300, bottom: "-80px", right: "-80px", dur: "15s", dir: "reverse" },
          { w: 200, h: 200, top: "40%", left: "60%", dur: "25s" }
        ].map((c, i) => (
          <div key={i} style={{
            position: "absolute",
            width: c.w,
            height: c.h,
            top: c.top,
            bottom: c.bottom,
            left: c.left,
            right: c.right,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(8,145,178,0.10), transparent)",
            animation: `auth-circle-float ${c.dur} linear infinite`,
            animationDirection: c.dir || "normal"
          }} />
        ))}
      </div>

      {/* İçerik */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        gap: "0",
        position: "relative",
        zIndex: 1,
        padding: "48px 24px"
      }}>
        {/* Kart */}
        <div style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "20px",
          padding: "48px 40px",
          maxWidth: "420px",
          width: "100%",
          margin: "0 auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px"
        }}>
          {/* Logo */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px"
          }}>
            <img 
              src={logoSrc} 
              width={56} 
              height={56}
              alt="Logo"
              style={{
                animation: "auth-logo-float 3s ease-in-out infinite",
                filter: "drop-shadow(0 6px 16px rgba(8,145,178,0.3))"
              }}
            />
            <span style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.02em"
            }}>TideNote</span>
          </div>

          {/* Ayraç */}
          <div style={{
            width: "100%",
            height: "1px",
            background: "var(--color-border)"
          }} />

          {/* Durum içeriği */}
          {status === "idle" && (
            <>
              <div style={{ textAlign: "center" }}>
                <h2 style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  margin: "0 0 8px 0"
                }}>
                  Masaüstü Uygulaması Girişi
                </h2>
                <p style={{
                  fontSize: "14px",
                  color: "var(--color-text-muted)",
                  margin: 0,
                  lineHeight: 1.6
                }}>
                  Google hesabınızla giriş yaparak TideNote masaüstü uygulamasına bağlanın.
                </p>
              </div>
              <button 
                type="button"
                onClick={handleGoogleAuth}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "13px 20px",
                  background: "white",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                  fontFamily: "inherit",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "all 0.15s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google ile Giriş Yap
              </button>
            </>
          )}

          {status === "loading" && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px"
            }}>
              <div style={{
                width: "36px",
                height: "36px",
                border: "3px solid var(--color-border)",
                borderTop: "3px solid var(--color-accent)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
              }} />
              <p style={{
                color: "var(--color-text-muted)",
                fontSize: "14px",
                margin: 0
              }}>
                Google hesabına bağlanılıyor...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px', height: '64px',
                background: 'rgba(16,185,129,0.1)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px'
              }}>✅</div>
              
              <div>
                <p style={{
                  fontWeight: 700, fontSize: '20px',
                  color: 'var(--color-text-primary)',
                  margin: '0 0 8px 0'
                }}>
                  Giriş Başarılı!
                </p>
                <p style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '14px', margin: 0,
                  lineHeight: 1.6
                }}>
                  TideNote masaüstü uygulamasına
                  dönün ve bu sekmeyi kapatın.
                </p>
              </div>

              {/* Büyük belirgin buton */}
              <button
                onClick={() => window.close()}
                style={{
                  background: 'var(--color-accent)',
                  color: 'white', border: 'none',
                  borderRadius: '12px',
                  padding: '14px 32px',
                  fontSize: '16px', fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxShadow: '0 4px 16px rgba(8,145,178,0.3)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform =
                    'translateY(-2px)'
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px rgba(8,145,178,0.4)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform =
                    'translateY(0)'
                  e.currentTarget.style.boxShadow =
                    '0 4px 16px rgba(8,145,178,0.3)'
                }}
              >
                ✓ Sekmeyi Kapat
              </button>

              <p style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                margin: 0, opacity: 0.6
              }}>
                Masaüstü uygulamasına dönmeyi
                unutmayın.
              </p>
            </div>
          )}

          {status === "error" && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                background: "var(--color-danger-soft)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px"
              }}>❌</div>
              <p style={{
                color: "var(--color-danger)",
                fontWeight: 600,
                fontSize: "16px",
                margin: 0,
                textAlign: "center"
              }}>
                Giriş Başarısız
              </p>
              <button 
                type="button"
                onClick={handleGoogleAuth}
                style={{
                  background: "var(--color-accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 24px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  width: "100%"
                }}
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {/* Alt not */}
          <p style={{
            fontSize: "12px",
            color: "var(--color-text-muted)",
            margin: 0,
            textAlign: "center",
            lineHeight: 1.5,
            opacity: 0.7
          }}>
            Bu sayfa yalnızca TideNote masaüstü uygulamadan yönlendirme için açılır.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes auth-circle-float {
          0% { transform: translate(0,0) rotate(0deg); }
          33% { transform: translate(20px,-20px) rotate(120deg); }
          66% { transform: translate(-15px,15px) rotate(240deg); }
          100% { transform: translate(0,0) rotate(360deg); }
        }
        @keyframes auth-logo-float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes success-pop {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
