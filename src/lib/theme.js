// -----------------------------------------------------------
//  VERENA OS -- Familien-Operator
//  Architektur: 4 Modi - KI-Herz - Zero Mental Drop
// -----------------------------------------------------------

// -- Farben & Design ----------------------------------------
export const C = {
  bg:      "#080808",
  surface: "#111111",
  card:    "#181818",
  border:  "#252525",
  text:    "#F2EEE8",
  muted:   "#5A5550",
  accent:  "#E8552A",
  gold:    "#C9A04A",
  sage:    "#4A6B42",
  danger:  "#C0392B",
  subtle:  "#1D1D1D",
};

// Globale Styles
export const PRIO = {
  p1: { label: "P1", color: "#E8552A", bg: "#E8552A20" },
  p2: { label: "P2", color: "#C9A04A", bg: "#C9A04A20" },
  p3: { label: "P3", color: "#4A90D9", bg: "#4A90D920" },
};

export const PRIO_SORT = { "p1": 0, "p2": 1, "p3": 2 };

export const WANN_SORT = { "heute": 0, "diese-woche": 1, "diesen-monat": 2, "irgendwann": 3 };

export const KAT_SORT  = { "kinder": 0, "behoerde": 1, "arbeit": 2, "haushalt": 3, "sonstiges": 4 };

export const GS = {
  // Touch-optimierte Groessen fuer iPhone
  touchTarget: 52,       // Min Touch-Target iOS HIG
  fontBase: 16,          // Basis-Schriftgroesse
  fontLarge: 18,         // Grosse Schrift
  fontSmall: 13,         // Kleine Schrift
  fontTiny: 11,          // Labels
  radius: 18,            // Standard Border-Radius
  radiusSm: 12,          // Kleiner Radius
  radiusLg: 24,          // Grosser Radius
  pad: 20,               // Standard Padding
  gap: 12,               // Standard Gap
};

export const MODE_CONFIG = {
  GREEN:    { label: "Normal",    emoji: "🟢", color: C.sage,   sub: "Alles laeuft." },
  YELLOW:   { label: "Reduziert", emoji: "🟡", color: C.gold,   sub: "Fokus auf Wichtiges." },
  RED:      { label: "Overload",  emoji: "🔴", color: C.accent, sub: "Ich uebernehme." },
  DARK_RED: { label: "Krise",     emoji: "⚫", color: "#1a0a0a", sub: "Nur das Noetigste." },
};
