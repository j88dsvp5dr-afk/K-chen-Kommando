import { useState } from "react";
import { C, MODE_CONFIG } from "../lib/theme";

export function ModeButton({ mode, setMode, mc }) {
  const [open, setOpen] = useState(false);
  const modes = ["GREEN", "YELLOW", "RED", "DARK_RED"];

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: "5px 12px",
        color: C.text,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
      }}>
        {mc.emoji} {mc.label}
      </button>
      {open && (
        <div style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 8px)",
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          overflow: "hidden",
          zIndex: 100,
          minWidth: 160,
        }}>
          {modes.map(m => {
            const cfg = MODE_CONFIG[m];
            return (
              <button key={m} onClick={() => { setMode(m); setOpen(false); }} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "12px 16px",
                background: mode === m ? C.border : "transparent",
                border: "none",
                color: C.text,
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
              }}>
                <span>{cfg.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{cfg.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
