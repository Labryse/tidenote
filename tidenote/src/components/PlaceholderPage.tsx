import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "var(--color-bg-app)",
      color: "var(--color-text-primary)",
      padding: "2rem",
      textAlign: "center",
      fontFamily: "var(--font-sans)",
      boxSizing: "border-box"
    }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", fontWeight: 700 }}>{title}</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "2.5rem", fontSize: "1.2rem" }}>
        {t("common.comingSoon", "Çok Yakında")}
      </p>
      <Link 
        to="/" 
        className="btn-hero-primary"
        style={{
          background: "var(--color-accent)",
          border: "none",
          color: "#ffffff",
          padding: "12px 28px",
          borderRadius: "10px",
          fontSize: "1.05rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center"
        }}
      >
        {t("common.backToHome", "Ana Sayfaya Dön")}
      </Link>
    </div>
  );
}
