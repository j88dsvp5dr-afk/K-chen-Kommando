import React from "react";

// -----------------------------------------------------------
//  SCREEN GUARD — ErrorBoundary fuer jeden Tab
//  Crasht ein Tab, laufen die anderen weiter
// -----------------------------------------------------------
export class ScreenGuard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error("ScreenGuard [" + this.props.name + "]:", e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 15, color: "#5A5550", marginBottom: 20 }}>
            {this.props.name} konnte nicht geladen werden.
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: "10px 24px", background: "#E8552A", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
