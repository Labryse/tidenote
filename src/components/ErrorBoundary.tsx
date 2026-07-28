import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>⚠️</div>
            <h2 style={styles.title}>Bir şeyler ters gitti</h2>
            <p style={styles.message}>
              Uygulama yüklenirken bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin.
            </p>
            <button onClick={this.handleReload} style={styles.button}>
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    // Fill the viewport even when the boundary is mounted inside a flex-row
    // layout (sidebar + content) — otherwise the card hugs the left edge.
    width: "100%",
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "#0f172a",
    fontFamily: "Inter, sans-serif",
    color: "#f1f5f9",
    padding: "20px",
    zIndex: 100000,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    padding: "40px 30px",
    textAlign: "center" as const,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
    maxWidth: "400px",
    width: "100%",
  },
  icon: {
    fontSize: "48px",
    marginBottom: "20px",
  },
  title: {
    fontSize: "22px",
    fontWeight: 600,
    marginBottom: "12px",
    color: "#f87171",
  },
  message: {
    fontSize: "14px",
    color: "#94a3b8",
    marginBottom: "28px",
    lineHeight: "1.6",
  },
  button: {
    backgroundColor: "#14b8a6",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};
