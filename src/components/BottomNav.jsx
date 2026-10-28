import { C } from "../lib/theme";

// -----------------------------------------------------------
//  BOTTOM NAV
// -----------------------------------------------------------
export function BottomNav({ screen, setScreen }) {
  const items = [
    { id: "home",    label: "Home",    icon: "⌂" },
    { id: "kueche",  label: "Kueche",  icon: "🧊" },
    { id: "voice",   label: "KI",      icon: "◎" },
    { id: "kinder",  label: "Kinder",  icon: "👧" },
    { id: "master",  label: "Master",  icon: "📋" },
    { id: "termine", label: "Termine", icon: "📅" },
  ];

  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: C.bg + "ee",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid " + C.border,
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 12px)",
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => setScreen(item.id)} style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", gap: 4,
          padding: "14px 4px 10px",
          background: "transparent", border: "none",
          color: screen === item.id ? C.accent : C.muted,
          cursor: "pointer", transition: "color 0.15s",
        }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
          <span style={{ fontSize: 10, letterSpacing: 0.3, fontWeight: screen === item.id ? 700 : 400 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
