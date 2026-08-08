import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; info: string };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: "" };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: "" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("MyMoney runtime error", error, info);
    this.setState({ info: info.componentStack ?? "" });
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main style={{ minHeight: "100vh", padding: 20, background: "#081018", color: "#f5f7fa" }}>
        <section style={{ maxWidth: 720, margin: "0 auto", padding: 20, border: "1px solid #344353", borderRadius: 14, background: "#111a23" }}>
          <p style={{ marginTop: 0, opacity: 0.75 }}>MyMoney runtime error</p>
          <h1 style={{ fontSize: 24 }}>App could not open after PIN</h1>
          <p style={{ wordBreak: "break-word" }}><strong>Error:</strong> {this.state.error.message || String(this.state.error)}</p>
          {this.state.info && <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, opacity: 0.85 }}>{this.state.info}</pre>}
          <button onClick={this.reload} style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, border: 0, fontWeight: 800 }}>Reload</button>
        </section>
      </main>
    );
  }
}
