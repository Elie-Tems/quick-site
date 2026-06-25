import { Component, ReactNode } from "react";
import { reportError } from "@/lib/errorReporter";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

// Catches React render crashes, reports them (email to admins), and shows a
// friendly fallback instead of a blank white screen.
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    reportError(error.message || "React render error", {
      kind: "react.boundary",
      stack: `${error.stack || ""}\n--- component stack ---\n${info.componentStack}`,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          style={{
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>משהו השתבש</h1>
            <p style={{ color: "#666", marginBottom: "1.5rem" }}>
              אירעה תקלה זמנית. נסו לרענן את הדף - אנחנו כבר יודעים על זה.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                background: "#16a34a",
                color: "#fff",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              רענון הדף
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
