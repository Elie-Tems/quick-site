import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered instead of the children when they crash. */
  fallback: ReactNode;
}
interface State {
  hasError: boolean;
}

// A contained error boundary that shows a fallback WITHOUT reloading the page.
//
// Unlike the app-root ErrorBoundary (which reloads once on a stale-chunk error),
// this one is meant to wrap a single non-critical, lazily-loaded region so that a
// failure there degrades just that region and leaves the surrounding UI - and any
// in-memory state around it - fully intact.
class SoftErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default SoftErrorBoundary;
