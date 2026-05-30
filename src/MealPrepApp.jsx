import React, { useState, useEffect, useCallback } from "react";


// ============================================================
// KI-CHAT — Freitext-Chat mit Küchen-Kontext
// ============================================================
function KIChat({ freezer, pantry, recipes, plan, shopping, diet, household }) {
  const theme = useTheme();
  const [messages, setMessages] = React.useState([
    { role: "assistant", text: "Hallo! Ich bin dein Küchen-Assistent 🍳 Frag mich alles — Rezeptideen, was du mit deinem Vorrat kochen kannst, Einkaufstipps oder Meal-Prep-Hilfe!" }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function buildContext() {
    const freezerItems = freezer.slice(0, 15).map(f => f.name + (f.bestBefore ? " (MHD: " + f.bestBefore + ")" : "")).join(", ");
    const pantryItems = pantry.slice(0, 15).map(p => p.name).join(", ");
    const recipeNames = recipes.slice(0, 10).map(r => r.title).join(", ");
    const shoppingItems = shopping.filter(s => !s.done).slice(0, 10).map(s => s.name).join(", ");
    const weekPlan = plan?.days?.slice(0, 7).map(d => d.day + ": " + d.meal).join(", ") || "kein Plan";
    const dietInfo = Object.entries(diet).filter(([k,v]) => v).map(([k]) => k).join(", ") || "keine";
    const persons = household?.persons || 4;
    return `Du bist ein hilfreicher Küchen-Assistent für eine Familie mit ${persons} Personen.
Ernährung: ${dietInfo} (laktosefrei ist Standard).
Gefrierschrank: ${freezerItems || "leer"}.
Vorrat: ${pantryItems || "leer"}.
Gespeicherte Rezepte: ${recipeNames || "keine"}.
Einkaufsliste (offen): ${shoppingItems || "leer"}.
Wochenplan: ${weekPlan}.
Antworte kurz, praktisch und auf Deutsch. Nutze den Kontext um konkrete Vorschläge zu machen.`;
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      const response = await fetch("/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: buildContext(),
          messages: [...history, { role: "user", content: userMsg }]
        })
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "Entschuldigung, ich konnte keine Antwort generieren.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Verbindungsfehler. Bitte versuche es erneut." }]);
    }
    setLoading(false);
  }

  const inp = { borderRadius: 12, border: `1.5px solid ${theme.INP_BORDER}`, padding: "10px 14px", fontSize: 15, outline: "none", fontFamily: "inherit", background: theme.INP_BG, color: theme.TEXT };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", minHeight: 400 }}>
      <SectionTitle>🤖 KI-Küchen-Chat</SectionTitle>

      {/* Chat Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%",
              background: m.role === "user" ? ACCENT : theme.CARD,
              color: m.role === "user" ? "#fff" : theme.TEXT,
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "11px 15px",
              fontSize: 15,
              lineHeight: 1.5,
              border: m.role === "assistant" ? `1.5px solid ${theme.BORDER}` : "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }} className="kk-b">
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: theme.CARD, border: `1.5px solid ${theme.BORDER}`, borderRadius: "18px 18px 18px 4px", padding: "11px 15px", color: theme.MUTED, fontSize: 15 }} className="kk-b">
              ✦ Denke nach…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, flexShrink: 0 }}>
        {["Was kann ich heute kochen?", "Rezept mit meinem Vorrat", "Schnelles Abendessen", "Meal-Prep Idee"].map(q => (
          <button key={q} onClick={() => { setInput(q); }} className="kk-btn kk-b"
            style={{ flexShrink: 0, background: theme.SAGE_BG, color: SAGE, border: `1.5px solid ${SAGE}33`, borderRadius: 20, padding: "6px 12px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Frag mich etwas…"
          style={{ ...inp, flex: 1 }}
        />
        <button onClick={send} disabled={loading || !input.trim()} className="kk-btn kk-b"
          style={{ background: input.trim() ? ACCENT : theme.BORDER, color: "#fff", padding: "10px 18px", borderRadius: 12, fontWeight: 700, fontSize: 15, transition: "background 0.2s" }}>
          ➤
        </button>
      </div>
    </div>
  );
}

// ============================================================
//  KÜCHEN-KOMMANDO — Meal-Prep & KI-Einkaufsplanung
//  Module: Gefrierschrank · KI-Rezepte · Batch-Plan · Brotzeit · Einkauf
// ============================================================

const ACCENT = "#E8552A";
const GOLD = "#C9A04A";
const SAGE = "#5C6B52";

// Hell-Modus — eleganter, wärmer
const LIGHT = {
  DEEP: "#1A1714", PAPER: "#F7F0E6", CARD: "#FFFFFF",
  CARD2: "#FBF7F2", NAV: "#FFFFFF", SUBNAV: "#F7F0E6",
  BORDER: "#E8DDD0", INP_BG: "#FDFAF6", INP_BORDER: "#D4C8B8",
  TEXT: "#1A1714", MUTED: "rgba(26,23,20,0.5)",
  DOT: "#EDE5D8", SAGE_BG: "#EEF2EB",
  SHADOW: "0 2px 12px rgba(26,23,20,0.08), 0 1px 3px rgba(26,23,20,0.05)",
  SHADOW_LG: "0 8px 32px rgba(26,23,20,0.12), 0 2px 8px rgba(26,23,20,0.06)",
};

// Dunkel-Modus — warmes Dunkelbraun
const DARK = {
  DEEP: "#F4EDE2", PAPER: "#141210", CARD: "#1E1B17",
  CARD2: "#1A1714", NAV: "#1A1714", SUBNAV: "#141210",
  BORDER: "#2E2822", INP_BG: "#211E1A", INP_BORDER: "#3A342C",
  TEXT: "#F4EDE2", MUTED: "rgba(244,237,226,0.48)",
  DOT: "#2A2520", SAGE_BG: "#1A2018",
  SHADOW: "0 2px 12px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)",
  SHADOW_LG: "0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.25)",
};

// Aktives Theme — wird per Context durchgereicht
const ThemeCtx = React.createContext(LIGHT);
function useTheme() { return React.useContext(ThemeCtx); }

// Kompatibilität: DEEP und PAPER als globale Refs (werden unten überschrieben)
let DEEP = LIGHT.DEEP;
let PAPER = LIGHT.PAPER;

const CATEGORIES = ["Fleisch/Fisch", "Gemüse", "Stärke", "Milchprodukt (laktosefrei)", "Soße/Basis", "Fertiggericht", "Brot", "Sonstiges"];

const PANTRY_CATEGORIES = [
  { key: "Getreide & Nudeln", label: "🌾 Getreide & Nudeln", color: "#C9A04A" },
  { key: "Konserven & Gläser", label: "🥫 Konserven & Gläser", color: "#8A5A44" },
  { key: "Öle & Gewürze", label: "🫙 Öle & Gewürze", color: "#A8763E" },
  { key: "Milchprodukt (laktosefrei)", label: "🥛 Milchprodukte (laktosefrei)", color: "#6E8CA0" },
  { key: "Brot & Backwaren", label: "🍞 Brot & Backwaren", color: "#B5833A" },
  { key: "Eier & Aufschnitt", label: "🍳 Eier & Aufschnitt", color: "#D4A017" },
  { key: "Gemüse & Obst", label: "🥦 Gemüse & Obst (frisch)", color: "#5C6B52" },
  { key: "Fleisch & Fisch", label: "🥩 Fleisch & Fisch", color: "#B5472E" },
  { key: "Tiefkühl", label: "🧊 Tiefkühl", color: "#6E8CA0" },
  { key: "Sonstiges", label: "📦 Sonstiges", color: "#6B6259" },
];

const UNITS = ["g", "kg", "ml", "l", "Stück", "Packung", "Dose", "Flasche", "Bund", "EL", "TL"];

// Reihenfolge nach typischem Supermarkt-Laufweg (Obst/Gemüse zuerst → TK/Kühl zuletzt)
const MARKET_ORDER = ["Gemüse", "Brot", "Stärke", "Soße/Basis", "Sonstiges", "Milchprodukt (laktosefrei)", "Fleisch/Fisch", "Fertiggericht"];
const MARKET_AISLE = {
  "Gemüse": "Obst & Gemüse",
  "Brot": "Backwaren",
  "Stärke": "Trockenware / Nudeln & Reis",
  "Soße/Basis": "Konserven & Soßen",
  "Sonstiges": "Trockenware / Diverses",
  "Milchprodukt (laktosefrei)": "Kühlregal",
  "Fleisch/Fisch": "Fleisch & Fisch / Theke",
  "Fertiggericht": "Tiefkühl",
};
const CAT_COLORS = {
  "Fleisch/Fisch": "#B5472E",
  "Gemüse": "#5C6B52",
  "Stärke": "#C9A04A",
  "Milchprodukt (laktosefrei)": "#6E8CA0",
  "Soße/Basis": "#8A5A44",
  "Fertiggericht": "#7A5C8A",
  "Brot": "#A8763E",
  "Sonstiges": "#6B6259",
};

// Ernährungs-Einstellungen (frei an/aus). Laktosefrei ist Standard-an.
const DIET_OPTIONS = [
  { key: "laktosefrei", label: "Laktosefrei", desc: "Alle Milchprodukte laktosefrei", defaultOn: true },
  { key: "glutenfrei", label: "Glutenfrei", desc: "Kein Weizen/Gluten" },
  { key: "vegetarisch", label: "Vegetarisch", desc: "Kein Fleisch & Fisch" },
  { key: "vegan", label: "Vegan", desc: "Keine tierischen Produkte" },
  { key: "nussfrei", label: "Nussfrei", desc: "Keine Nüsse/Erdnüsse" },
  { key: "schweinefrei", label: "Ohne Schwein", desc: "Kein Schweinefleisch" },
  {
    key: "low_carb",
    label: "Low Carb",
    desc: "Wenig Kohlenhydrate — max. 100g Kohlenhydrate pro Tag",
    science: "Low Carb bedeutet: Kohlenhydrate stark reduzieren (unter 100g/Tag, ketogen unter 20g). Der Körper wechselt von Zucker- auf Fettverbrennung. Besonders wirksam bei Gewichtsreduktion, Insulinresistenz, PCOS und Typ-2-Diabetes. Hashimoto: Low Carb kann Entzündungen reduzieren aber Schilddrüse braucht ausreichend Jod und Selen.",
    tips: ["Erlaubt: Fleisch + Fisch, Eier, Gemüse (nicht stärkehaltig), Käse, Nüsse, Avocado, Olivenöl", "Meiden: Brot + Nudeln + Reis + Kartoffeln + Zucker + Hülsenfrüchte", "Ersatz: Blumenkohlreis, Zucchini-Nudeln, Mandelmehl, Kokosmehl", "Elektrolyte beachten: Natrium + Kalium + Magnesium — gerade in der Umstellungsphase", "Ausreichend Protein: verhindert Muskelverlust"],
    examples: ["Blumenkohlreis mit Hähnchen", "Zucchini-Nudeln Bolognese", "Omelett mit Gemüse", "Salat mit Lachs + Avocado", "Mandelmehl-Pfannkuchen"],
  },
];

// Kinder-Profile
// ---- Gamification ----
const LEVELS = [
  { level: 1,  xp: 0,    title: "Chaosküche",           emoji: "🍳", desc: "Der Anfang aller Dinge" },
  { level: 2,  xp: 50,   title: "Küchenanfänger",        emoji: "👨‍🍳", desc: "Du hast Feuer gefangen" },
  { level: 3,  xp: 120,  title: "Meal-Prep-Novize",      emoji: "📦", desc: "Erste Vorbereitung gemeistert" },
  { level: 4,  xp: 220,  title: "Vorratshüter",          emoji: "🧊", desc: "Gefrierschrank im Griff" },
  { level: 5,  xp: 350,  title: "Familienchef",          emoji: "👨‍👩‍👧‍👦", desc: "Die Familie isst gut" },
  { level: 7,  xp: 600,  title: "Batch-Profi",           emoji: "⚡", desc: "1× kochen, 3× essen" },
  { level: 10, xp: 1000, title: "Sparfüchsin",           emoji: "💰", desc: "Budget immer im Griff" },
  { level: 15, xp: 2000, title: "Zero-Waste-Heldin",     emoji: "🌿", desc: "Nichts geht verloren" },
  { level: 20, xp: 3500, title: "Küchenkommando Elite",  emoji: "🏆", desc: "Absolute Meisterschaft" },
];

const ACHIEVEMENTS = [
  { key: "first_cook",     emoji: "🍳", title: "Erste Mahlzeit",        desc: "Erstes Rezept gekocht",                    xp: 10,  check: (g) => g.totalCooked >= 1 },
  { key: "no_waste_3",     emoji: "🌿", title: "3 Tage kein Food Waste",desc: "3 Tage nichts abgelaufen",                 xp: 25,  check: (g) => g.noWasteDays >= 3 },
  { key: "no_waste_7",     emoji: "🏆", title: "7 Tage kein Food Waste",desc: "Eine Woche alles aufgebraucht",            xp: 75,  check: (g) => g.noWasteDays >= 7 },
  { key: "budget_25",      emoji: "💰", title: "Sparwoche",             desc: "Woche unter 25 € geschafft",              xp: 50,  check: (g) => g.weekUnder25 >= 1 },
  { key: "budget_3weeks",  emoji: "💎", title: "Sparmonat",             desc: "3 Wochen unter Budget",                   xp: 150, check: (g) => g.weekUnder25 >= 3 },
  { key: "batch_5",        emoji: "⚡", title: "Batch-Meister",         desc: "5 Batch-Rezepte gekocht",                 xp: 60,  check: (g) => g.totalCooked >= 5 },
  { key: "frozen_10",      emoji: "❄", title: "Gefrier-Profi",         desc: "10 Portionen eingefroren",                xp: 40,  check: (g) => g.totalFrozen >= 10 },
  { key: "recipes_7",      emoji: "📖", title: "Rezept-Sammler",        desc: "7 Rezepte gespeichert",                   xp: 30,  check: (g) => g.savedRecipes >= 7 },
  { key: "streak_3",       emoji: "🔥", title: "3-Tage-Streak",         desc: "3 Tage in Folge gekocht",                 xp: 45,  check: (g) => g.cookStreak >= 3 },
  { key: "double_first",   emoji: "⊞", title: "Doppelrezept-Debüt",    desc: "Erstes Doppelrezept erstellt",             xp: 20,  check: (g) => g.doubleRecipes >= 1 },
  { key: "routine_week",   emoji: "✔", title: "Routine-Profi",         desc: "7 Tage alle Routinen erledigt",           xp: 80,  check: (g) => g.routineWeeks >= 1 },
  { key: "kids_loved_3",   emoji: "👦👧","title": "Kinder-Liebling",     desc: "3 Rezepte als Kinder-Liebling markiert",  xp: 35,  check: (g) => g.kidsLoved >= 3 },
];

function getCurrentLevel(xp) {
  const sorted = [...LEVELS].sort((a, b) => b.xp - a.xp);
  return sorted.find((l) => xp >= l.xp) || LEVELS[0];
}
function getNextLevel(xp) {
  const sorted = [...LEVELS].sort((a, b) => a.xp - b.xp);
  return sorted.find((l) => l.xp > xp) || null;
}

const KIDS_PROFILES = [
  {
    key: "picky",
    label: "Picky Eater",
    emoji: "🙅",
    desc: "Isst nur wenige Sachen — neue Lebensmittel werden abgelehnt",
    science: "Neophobia (Angst vor Neuem) ist bei 50-80% der Kleinkinder normal. Wiederholte Exposition in stressfreier Umgebung ist wirksamer als Druck. Kinder brauchen oft 10-15 Kontakte mit einem neuen Lebensmittel bevor sie es akzeptieren.",
    tips: ["Neues neben Bekanntem anbieten (nicht statt)", "Gleiche Zubereitung, neue Zutat", "Kind beim Kochen einbeziehen erhöht Akzeptanz um 30%", "Hunger-Zeitpunkt nutzen — nach Schule, vor Abendessen"],
    prompt: "KINDER: sehr wählerisch — nur bekannte Aromen, kein sichtbares Gemüse, milde Gewürze, vertraute Texturen. Neue Zutaten höchstens als kleinen Anteil einarbeiten.",
  },
  {
    key: "adhs",
    label: "ADHS-freundlich",
    emoji: "⚡",
    desc: "Keine künstlichen Farbstoffe, Omega-3, Eiweiß morgens, wenig Zucker",
    science: "Aktuelle Forschung (Ernährungsdocs, MDR): Omega-3-Fettsäuren (Leinöl, Walnüsse, fetter Fisch) können ADHS-Symptome messbar reduzieren. Eiweiß zum Frühstück stabilisiert Dopamin. Künstliche Farbstoffe E102/E110/E124/E129 sind nachweislich mit erhöhter Hyperaktivität verbunden (EFSA 2010). Magnesium-Mangel häufig bei ADHS — Kürbiskerne, Mandeln helfen.",
    tips: ["Omega-3 täglich: Leinöl ins Essen, Walnüsse als Snack", "Eiweiß morgens: Ei, Quark, Nussbutter", "Keine E102/E110/E124/E129 (Lebensmittelfarben)", "Regelmäßige Mahlzeiten — ADHS-Kinder vergessen Hunger", "Magnesium: Kürbiskerne, Mandeln, Vollkorn"],
    prompt: "KINDER: ADHS-freundlich — KEINE künstlichen Farbstoffe oder E-Nummern E102/E110/E124/E129, wenig Zucker und Weißmehl, viel Omega-3 (Leinöl, Walnüsse), Eiweiß-Fokus, einfache Struktur, klare Portionen.",
  },
  {
    key: "pubertaet",
    label: "Pubertät Mädchen",
    emoji: "🌸",
    desc: "Eisen, Calcium, Magnesium — Schwindel, Stimmungsschwankungen, Krämpfe",
    science: "Pubertät bei Mädchen (ca. 10-14 Jahre): Eisenbedarf steigt auf 15mg/Tag durch Menstruation. Eisenmangel = Schwindel, Müdigkeit, Konzentrationsprobleme (sehr häufig, oft unerkannt). Magnesium reduziert Menstruationskrämpfe nachweislich. Calcium + Vitamin D für Knochendichte (kritisches Fenster!). Vitamin B6 stabilisiert Stimmung. Zink für Hormontransport.",
    tips: ["Eisen: rotes Fleisch, Linsen, Spinat + Vitamin C dazu (verdoppelt Aufnahme)", "Magnesium: dunkle Schokolade + Mandeln bei Krämpfen", "Calcium laktosefrei: Brokkoli, Sesam, Mandelmilch angereichert", "B6: Hühnchen, Kartoffeln, Bananen bei Stimmungsschwankungen", "Zink: Kürbiskerne, Fleisch, Hülsenfrüchte"],
    prompt: "KINDER (Mädchen Pubertät): Eisenreich (Fleisch, Hülsenfrüchte + Vitamin C), magnesiumreich (bei Krämpfen), calciumreich laktosefrei, B6-haltig für Stimmungsstabilität. Kein Koffein, wenig Zucker.",
  },
  {
    key: "hidden_veg",
    label: "Gemüse versteckt",
    emoji: "🥕",
    desc: "Gemüse unsichtbar in Soßen, Teig oder püriert einarbeiten",
    science: "Studien zeigen: Wenn Gemüse püriert in Mahlzeiten eingearbeitet wird, essen Kinder bis zu 50% mehr Gemüse ohne es zu merken. Beste Versteck-Methoden: Möhren in Bolognese, Zucchini in Muffins, Spinat in Pfannkuchen (grün macht neugierig nicht ablehnend).",
    tips: ["Blumenkohl püriert in Mac&Cheese", "Möhren fein gerieben in Hacksoße", "Spinat im Smoothie (Banane überdeckt Geschmack)", "Zucchini gerieben in Pfannkuchen-Teig", "Rote Beete im Schokoladenkuchen"],
    prompt: "KINDER: Gemüse immer verstecken — püriert in Soße, gerieben in Teig, als Püree unter Fleisch. Kein sichtbares Gemüse auf dem Teller. Möhren/Zucchini/Blumenkohl bevorzugt.",
  },
  {
    key: "adventurous",
    label: "Abenteuerlustig",
    emoji: "🌍",
    desc: "Probiert gerne Neues — exotische Gerichte und Aromen willkommen",
    science: "Kinder die früh vielfältige Aromen kennenlernen entwickeln eine breitere Geschmackspräferenz. Geschmackserziehung ist bis ca. 12 Jahren besonders effektiv. Wer als Kind Gewürze wie Kurkuma, Zimt, Koriander kennt, isst als Erwachsener vielfältiger.",
    tips: ["Verschiedene Küchen rotieren: asiatisch, mediterran, mexikanisch", "Kinder benennen Gewürze lassen — schafft Neugier", "Internationale Zutaten beim Einkauf vorstellen"],
    prompt: "KINDER: abenteuerlustig — gerne neue Aromen, exotische Gewürze, bunte Gerichte, verschiedene Küchen. Kreative Präsentation.",
  },
];

// Gesundheitszustände mit KI-Hinweis für Rezepte
const HEALTH_OPTIONS = [
  {
    key: "hashimoto",
    label: "Hashimoto",
    emoji: "🦋",
    desc: "Schilddrüsen-Autoimmunerkrankung",
    rules: "Kein Gluten + wenig Soja + keine rohen Kreuzblütler (Brokkoli + Kohl) + jodarm kochen + entzündungshemmend.",
    tips: ["Glutenfrei einkaufen", "Kein Soja", "Brokkoli/Kohl nur gegart", "Omega-3 bevorzugen"],
  },
  {
    key: "migräne",
    label: "Migräne",
    emoji: "🧠",
    desc: "Migräne-Trigger vermeiden",
    rules: "Kein Rotwein/Alkohol + wenig Histamin (kein Käse + Schinken + Fischkonserven) + kein MSG + regelmäßige Mahlzeiten.",
    tips: ["Kein Alkohol", "Histaminarm", "Regelmäßig essen", "Viel Wasser"],
  },
  {
    key: "adhs",
    label: "ADHS",
    emoji: "⚡",
    desc: "Ernährung bei ADHS",
    rules: "Wenig Zucker + keine künstlichen Farbstoffe/Konservierungsstoffe + Omega-3 fördern + Eiweiß zum Frühstück + wenig Verarbeitetes.",
    tips: ["Kein Zucker", "Keine Farbstoffe E1xx", "Omega-3 täglich", "Eiweiß morgens"],
  },
  {
    key: "magnesium",
    label: "Magnesiummangel",
    emoji: "💊",
    desc: "Magnesiumreiche Ernährung",
    rules: "Magnesiumreiche Lebensmittel bevorzugen: Kürbiskerne + Mandeln + Spinat + dunkle Schokolade + Hülsenfrüchte + Vollkorn.",
    tips: ["Kürbiskerne", "Dunkle Schokolade", "Spinat & Hülsenfrüchte", "Vollkornprodukte"],
  },
  {
    key: "reizdarm",
    label: "Reizdarm (IBS)",
    emoji: "🫁",
    desc: "Low-FODMAP-Ernährung",
    rules: "Low-FODMAP: kein Weizen + wenig Zwiebeln/Knoblauch + keine Hülsenfrüchte + kein Laktose + wenig Fruktose.",
    tips: ["Low-FODMAP", "Wenig Zwiebeln/Knoblauch", "Keine Hülsenfrüchte", "Laktosefrei"],
  },
  {
    key: "diabetes",
    label: "Diabetes Typ 2",
    emoji: "🩺",
    desc: "Blutzuckerstabiles Essen",
    rules: "Wenig schnelle Kohlenhydrate + kein Weißmehl/Zucker + viel Ballaststoffe + komplexe Kohlenhydrate + regelmäßige Mahlzeiten.",
    tips: ["Kein Weißmehl", "Kein Zucker", "Ballaststoffreich", "Regelmäßig essen"],
  },
  {
    key: "histamin",
    label: "Histaminintoleranz",
    emoji: "🌡",
    desc: "Histaminarme Ernährung",
    rules: "Kein Käse + kein Rotwein + keine Fischkonserven + keine Tomaten/Spinat/Avocado + frisch kochen statt aufgewärmt.",
    tips: ["Frisch kochen", "Kein Reifkäse", "Keine Tomaten/Spinat", "Kein Alkohol"],
  },
  {
    key: "alkoholfrei",
    label: "Alkoholfrei",
    emoji: "🚫",
    desc: "Kein Alkohol in Rezepten",
    rules: "Kein Alkohol + kein Wein zum Kochen + keine alkoholhaltigen Zutaten.",
    tips: ["Kein Alkohol", "Kein Kochwein"],
  },
  {
    key: "zuckerfrei",
    label: "Zuckerfrei",
    emoji: "🍬",
    desc: "Kein Zucker / sehr wenig",
    rules: "Kein Zucker + kein Honig + keine Süßigkeiten + natürliche Süße durch Obst + Stevia erlaubt.",
    tips: ["Kein Zucker/Honig", "Natürlich süßen", "Kein Sirup"],
  },
  {
    key: "weizenunverträgl",
    label: "Weizenunverträglichkeit",
    emoji: "🌾",
    desc: "Kein Weizen (nicht Zöliakie)",
    rules: "Kein Weizen + kein Dinkel + kein Kamut. Alternativen: Hafer (zertifiziert) + Reis + Mais + Buchweizen.",
    tips: ["Kein Weizen/Dinkel", "Reis & Mais", "Buchweizen als Alternative"],
  },
];

// ---- Screen Wake Lock: Handy bleibt an ----
function useWakeLock() {
  const lock = React.useRef(null);
  React.useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then((l) => { lock.current = l; }).catch(() => {});
    const reacquire = () => { if (document.visibilityState === 'visible') navigator.wakeLock.request('screen').then((l) => { lock.current = l; }).catch(() => {}); };
    document.addEventListener('visibilitychange', reacquire);
    return () => { document.removeEventListener('visibilitychange', reacquire); lock.current?.release(); };
  }, []);
}
function foodImageUrl(title, w = 400, h = 220) {
  const map = [
    ["kürbis", "pumpkin soup food"], ["ofenkartoffel", "baked potato food"], ["spaghetti", "spaghetti bolognese"],
    ["hackfleisch", "pasta meat sauce food"], ["flammkuchen", "tarte flambee food"], ["hähnchen", "chicken meal food"],
    ["pfannkuchen", "pancakes food"], ["suppe", "homemade soup food"], ["curry", "curry bowl food"],
    ["auflauf", "casserole dish food"], ["pasta", "pasta dish food"], ["reis", "rice bowl food"],
    ["pizza", "homemade pizza food"], ["salat", "fresh salad food"], ["rührei", "scrambled eggs food"],
    ["toast", "toast food"], ["pfanne", "pan fried meal food"], ["wrap", "wrap sandwich food"],
    ["eintopf", "stew pot food"], ["omelett", "omelette food"], ["linsen", "lentil soup food"],
    ["lachs", "salmon dish food"], ["tofu", "tofu dish food"], ["bowl", "grain bowl food"],
    ["schnitzel", "schnitzel food"], ["gulasch", "goulash stew food"], ["puten", "turkey meal food"],
    ["braten", "roast meat food"], ["fisch", "fish meal food"], ["gemüse", "vegetable dish food"],
  ];
  let keyword = "delicious home cooked food meal";
  const t = (title || "").toLowerCase();
  for (const [de, en] of map) {
    if (t.includes(de)) { keyword = en; break; }
  }
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(keyword)}`;
}

function FoodImage({ title, height = 180, radius = "14px 14px 0 0", style = {} }) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Emoji + Farbverlauf basierend auf Gericht
  const t = (title || "").toLowerCase();
  const visual = (() => {
    if (t.includes("kürbis") || t.includes("karotte") || t.includes("möhren")) return { emoji: "🎃", grad: "135deg, #E8552A, #C9A04A" };
    if (t.includes("spaghetti") || t.includes("pasta") || t.includes("nudel")) return { emoji: "🍝", grad: "135deg, #C85A1A, #8B3A10" };
    if (t.includes("hähnchen") || t.includes("chicken") || t.includes("paprika")) return { emoji: "🍗", grad: "135deg, #C9A04A, #5C6B52" };
    if (t.includes("suppe") || t.includes("eintopf")) return { emoji: "🍲", grad: "135deg, #5C6B52, #3A5240" };
    if (t.includes("pfannkuchen")) return { emoji: "🥞", grad: "135deg, #C9A04A, #A06010" };
    if (t.includes("flammkuchen") || t.includes("pizza")) return { emoji: "🫓", grad: "135deg, #B5472E, #8B2A10" };
    if (t.includes("reis") || t.includes("bowl")) return { emoji: "🍚", grad: "135deg, #5C6B52, #2A4030" };
    if (t.includes("hack") || t.includes("fleisch")) return { emoji: "🥩", grad: "135deg, #8B2A10, #5C1A05" };
    if (t.includes("salat")) return { emoji: "🥗", grad: "135deg, #5C6B52, #4A9A6A" };
    if (t.includes("curry")) return { emoji: "🍛", grad: "135deg, #C9A04A, #E8552A" };
    if (t.includes("toast") || t.includes("brot")) return { emoji: "🍞", grad: "135deg, #C9A04A, #A06010" };
    if (t.includes("ei") || t.includes("rührei")) return { emoji: "🍳", grad: "135deg, #C9A04A, #E8552A" };
    if (t.includes("wrap")) return { emoji: "🌯", grad: "135deg, #5C6B52, #C9A04A" };
    return { emoji: "🍽", grad: "135deg, #1A1714, #2A1F14" };
  })();

  const url = `https://source.unsplash.com/400x${height}/?${encodeURIComponent(t.split(" ")[0])},food,meal`;

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: radius, overflow: "hidden", background: `linear-gradient(${visual.grad})`, ...style }}>
      {/* Fallback: Emoji-Illustration — immer sichtbar bis Bild lädt */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: height * 0.42, opacity: 0.35, filter: "drop-shadow(0 4px 8px rgba(0,0,0,.3))" }}>{visual.emoji}</span>
      </div>
      {/* Bild versuchen (klappt auf Replit) */}
      {!err && (
        <img src={url} alt={title} onLoad={() => setLoaded(true)} onError={() => setErr(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity .5s ease" }} />
      )}
      {/* Gradient-Overlay */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "65%", background: "linear-gradient(transparent, rgba(0,0,0,0.6))", pointerEvents: "none" }} />
    </div>
  );
}

// ---- Storage helpers (persistieren über Sitzungen) ----
async function loadKey(key, fallback) {
  try {
    const raw = localStorage.getItem("kk_" + key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && fallback.length > 0) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    localStorage.setItem("kk_" + key, JSON.stringify(value));
  } catch (e) {
    console.error("save failed", e);
  }
}

// ---- Claude API call ----
const ANTHROPIC_KEY = process.env.REACT_APP_ANTHROPIC_KEY || "";

async function askClaude(prompt, maxTokens = 2000) {
  const response = await fetch("/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

// Vision: liest MHD von einem Foto (base64 ohne data:-Prefix, mediaType z.B. image/jpeg)
async function readDateFromImage(base64, mediaType) {
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `Auf dem Foto ist ein Lebensmittel mit Mindesthaltbarkeitsdatum (MHD/"mind. haltbar bis"/"best before"). Heute ist ${today}. Lies das Datum ab. Falls nur Monat+Jahr (z.B. "08/2026"), nimm den letzten Tag des Monats. Erkenne auch das Produkt, wenn möglich. Antworte AUSSCHLIESSLICH mit reinem JSON, kein Markdown: {"date":"YYYY-MM-DD oder null","product":"erkannter Produktname oder null","confidence":"hoch|mittel|niedrig"}` },
        ],
      }],
    }),
  });
  const data = await response.json();
  const txt = data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return parseJSON(txt);
}

// Kassenbon-Scan: liest Preise von einem Kassenbonfoto aus
async function readReceiptFromImage(base64, mediaType) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `Das ist ein Kassenbon. Erkenne alle Produkte mit ihren Preisen. Ignoriere Rabatte, Pfand, MwSt-Zeilen. Antworte AUSSCHLIESSLICH mit reinem JSON, kein Markdown:
{"items":[{"name":"Produktname möglichst kurz","price":1.29,"unit":"Stück/kg/l etc"}]}
Nur echte Lebensmittel/Haushaltsartikel, keine Servicegebühren.` },
        ],
      }],
    }),
  });
  const data = await response.json();
  const txt = data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return parseJSON(txt);
}

// File → base64 (ohne data:-Prefix)
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res({ data: r.result.split(",")[1], mediaType: file.type || "image/jpeg" });
    r.onerror = () => rej(new Error("Lesen fehlgeschlagen"));
    r.readAsDataURL(file);
  });
}

// Kinder-Profil-Regeln für KI-Prompts
function kidsRules(kidsProfile) {
  const active = KIDS_PROFILES.filter((o) => kidsProfile[o.key]);
  if (active.length === 0) return "";
  return "KINDER-PROFIL: " + active.map((o) => o.prompt).join(" ") + " Bewerte jeden Rezeptvorschlag mit einem Kinder-Akzeptanz-Score 1-10.";
}

// Kinder-Score aus Rezept-Daten schätzen (regelbasiert)
function kidsScore(r, kidsProfile) {
  if (r.kidsScore) return r.kidsScore; // manuell gesetzt
  let score = 7; // Basis
  if (r.kidsLoved) score = 9;
  if (kidsProfile?.picky) {
    // Picky: Punkte abziehen für komplexe Gerichte
    const complex = ["Curry", "Suppe", "Eintopf", "Chili", "Linsen"];
    if (complex.some((w) => (r.title || "").includes(w))) score -= 2;
  }
  if (kidsProfile?.adhs) {
    // ADHS: Punkte für einfache, schnelle Gerichte
    if ((r.prepMinutes || 30) <= 20) score += 1;
  }
  if (kidsProfile?.hidden_veg) score += 1;
  return Math.min(10, Math.max(1, score));
}

// Gesundheits-Regeln für KI-Prompts
function healthRules(health) {
  const active = HEALTH_OPTIONS.filter((o) => health[o.key]);
  if (active.length === 0) return "";
  return "GESUNDHEITSHINWEISE (strikt beachten): " + active.map((o) => `${o.label}: ${o.rules}`).join(" | ");
}

// Baut aus den aktiven Diät-Einstellungen einen Regel-Text für die KI-Prompts
function dietRules(diet) {
  const active = DIET_OPTIONS.filter((o) => diet[o.key]).map((o) => o.label);
  if (active.length === 0) return "Keine besonderen Ernährungseinschränkungen.";
  return "ZWINGENDE Ernährungsregeln (strikt einhalten): " + active.join(", ") + ".";
}

// Anzahl Esser je nach Modus (Erwachsene zählen 1, Kinder 0.6 Portionen)
function eaterCount(hh) {
  if (hh.soloMode) return 1;
  return (hh.adults || 0) + (hh.kids?.length || 0);
}
function householdRules(hh) {
  if (hh.soloMode) return "WICHTIG: Plane NUR für 1 erwachsene Person (Solo-Modus). Mengen und Portionen entsprechend klein.";
  const kidsTxt = hh.kids?.length ? `${hh.kids.length} Kinder (Alter ${hh.kids.map((k) => k.age).join(", ")})` : "keine Kinder";
  return `Haushalt: ${hh.adults} Erwachsene(r) + ${kidsTxt}. Plane Mengen für diesen Haushalt.`;
}

function parseJSON(text) {
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const arrStart = clean.indexOf("[");
  let s = start;
  if (arrStart !== -1 && (arrStart < start || start === -1)) s = arrStart;
  return JSON.parse(clean.slice(s));
}

// ============================================================

export default function App() {
  useWakeLock();
  const [tab, setTab] = useState("dashboard");
  const [freezer, setFreezer] = useState([]);
  const [pantry, setPantry] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [plan, setPlan] = useState(null);
  const [shopping, setShopping] = useState([]);
  const [staples, setStaples] = useState([]);
  const [history, setHistory] = useState([]);
  const [prices, setPrices] = useState({});
  const [diet, setDiet] = useState({ laktosefrei: true });
  const [health, setHealth] = useState({});
  const [kidsProfile, setKidsProfile] = useState({});
  const [gamification, setGamification] = useState({ xp: 0, achievements: [], totalCooked: 0, noWasteDays: 0, weekUnder25: 0, totalFrozen: 0, savedRecipes: 0, cookStreak: 0, doubleRecipes: 0, routineWeeks: 0, kidsLoved: 0 });
  const [household, setHousehold] = useState({ adults: 1, kids: [{ age: 13 }, { age: 11 }], soloMode: false });
  const [budget, setBudget] = useState({ monthly: 400, expenses: [] });
  const [darkMode, setDarkMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [calEvents, setCalEvents] = useState([]); // wird aus Storage geladen
  const theme = darkMode ? DARK : LIGHT;

  // Picnic-Stammartikel vorbelegt (einmalig beim ersten Start)
  const PICNIC_STAPLES = [
    { name: "Golden Toast Butter Toast 500g", cat: "Brot" },
    { name: "G&G Weizenbrötchen 8 Stück", cat: "Brot" },
    { name: "G&G Laugenbrezeln 10 Stück", cat: "Brot" },
    { name: "Rheinfels Quelle Medium 6×1,5L", cat: "Sonstiges" },
    { name: "G&G Röstkaffee Naturmild 500g", cat: "Sonstiges" },
    { name: "G&G Kaffeefilter 120 Stück", cat: "Sonstiges" },
    { name: "G&G Laktosefreie H-Milch 3,5% 1L", cat: "Milchprodukt (laktosefrei)" },
    { name: "G&G Deutsche Markenbutter 250g", cat: "Milchprodukt (laktosefrei)" },
    { name: "Deli Reform Margarine 450g", cat: "Milchprodukt (laktosefrei)" },
    { name: "G&G Gouda Jung Scheiben 400g", cat: "Milchprodukt (laktosefrei)" },
    { name: "G&G Frischkäse Kräuter 300g", cat: "Milchprodukt (laktosefrei)" },
    { name: "G&G Hähnchenbrust Aufschnitt 100g", cat: "Fleisch/Fisch" },
    { name: "G&G Kasseler 100g", cat: "Fleisch/Fisch" },
    { name: "G&G Lachsschinken 150g", cat: "Fleisch/Fisch" },
    { name: "G&G Teewurst 125g", cat: "Fleisch/Fisch" },
    { name: "Büsch Kasseler geschnitten 1kg", cat: "Fleisch/Fisch" },
  ];

  const PICNIC_PRICES = {
    "golden toast butter toast 500g":          { name: "Golden Toast Butter Toast 500g",      current: 1.49, previous: 1.89, date: new Date().toISOString(), history: [{ price: 1.49, date: new Date().toISOString() }, { price: 1.89, date: new Date().toISOString() }] },
    "g&g weizenbrötchen 8 stück":              { name: "G&G Weizenbrötchen 8 Stück",           current: 1.35, previous: null, date: new Date().toISOString(), history: [{ price: 1.35, date: new Date().toISOString() }] },
    "g&g laugenbrezeln 10 stück":              { name: "G&G Laugenbrezeln 10 Stück",            current: 1.99, previous: null, date: new Date().toISOString(), history: [{ price: 1.99, date: new Date().toISOString() }] },
    "rheinfels quelle medium 6×1,5l":          { name: "Rheinfels Quelle Medium 6×1,5L",        current: 4.98, previous: null, date: new Date().toISOString(), history: [{ price: 4.98, date: new Date().toISOString() }] },
    "g&g röstkaffee naturmild 500g":           { name: "G&G Röstkaffee Naturmild 500g",         current: 5.79, previous: null, date: new Date().toISOString(), history: [{ price: 5.79, date: new Date().toISOString() }] },
    "g&g kaffeefilter 120 stück":              { name: "G&G Kaffeefilter 120 Stück",             current: 0.99, previous: null, date: new Date().toISOString(), history: [{ price: 0.99, date: new Date().toISOString() }] },
    "g&g laktosefreie h-milch 3,5% 1l":       { name: "G&G Laktosefreie H-Milch 3,5% 1L",      current: 1.15, previous: null, date: new Date().toISOString(), history: [{ price: 1.15, date: new Date().toISOString() }] },
    "g&g deutsche markenbutter 250g":          { name: "G&G Deutsche Markenbutter 250g",         current: 1.05, previous: null, date: new Date().toISOString(), history: [{ price: 1.05, date: new Date().toISOString() }] },
    "deli reform margarine 450g":              { name: "Deli Reform Margarine 450g",              current: 2.19, previous: null, date: new Date().toISOString(), history: [{ price: 2.19, date: new Date().toISOString() }] },
    "g&g gouda jung scheiben 400g":            { name: "G&G Gouda Jung Scheiben 400g",            current: 2.45, previous: null, date: new Date().toISOString(), history: [{ price: 2.45, date: new Date().toISOString() }] },
    "g&g frischkäse kräuter 300g":             { name: "G&G Frischkäse Kräuter 300g",             current: 1.59, previous: null, date: new Date().toISOString(), history: [{ price: 1.59, date: new Date().toISOString() }] },
    "g&g hähnchenbrust aufschnitt 100g":       { name: "G&G Hähnchenbrust Aufschnitt 100g",       current: 1.59, previous: null, date: new Date().toISOString(), history: [{ price: 1.59, date: new Date().toISOString() }] },
    "g&g kasseler 100g":                       { name: "G&G Kasseler 100g",                        current: 1.49, previous: null, date: new Date().toISOString(), history: [{ price: 1.49, date: new Date().toISOString() }] },
    "g&g lachsschinken 150g":                  { name: "G&G Lachsschinken 150g",                  current: 2.39, previous: null, date: new Date().toISOString(), history: [{ price: 2.39, date: new Date().toISOString() }] },
    "g&g teewurst 125g":                       { name: "G&G Teewurst 125g",                        current: 1.29, previous: null, date: new Date().toISOString(), history: [{ price: 1.29, date: new Date().toISOString() }] },
    "büsch kasseler geschnitten 1kg":          { name: "Büsch Kasseler geschnitten 1kg",            current: 3.50, previous: null, date: new Date().toISOString(), history: [{ price: 3.50, date: new Date().toISOString() }] },
  };

  async function loadAll() {
    setFreezer(await loadKey("freezer", []));
    setPantry(await loadKey("pantry", []));
    setRecipes(await loadKey("recipes", []));
    // Rezepte Woche 4: beim ersten Start vorbelegen
    const WOCHE4_RECIPES = [
      { id: 101, title: "Cremige Kürbissuppe mit Ingwer & Kokos", portions: 3, prepMinutes: 25, reuse: "Rest als Sauce zu Reis oder Nudeln am nächsten Tag verwenden", fav: false, rating: 0, kidsLoved: false, cookedCount: 0, totalCost: "4.20", costPerPortion: "1.40", estCostPerMeal: "3–5 €",
        ingredients: [
          { item: "Hokkaido Kürbis", amount: "1 kg", fromFreezer: false },
          { item: "Kokosmilch", amount: "400 ml", fromFreezer: false },
          { item: "Ingwer frisch", amount: "1 Stück", fromFreezer: false },
          { item: "Gemüsebrühe", amount: "500 ml", fromFreezer: false },
          { item: "Zwiebel & Knoblauch", amount: "je 1", fromFreezer: false },
          { item: "Vollkornbrot G&G", amount: "500 g", fromFreezer: false },
        ],
        steps: ["Zwiebel, Knoblauch & Ingwer andünsten.", "Kürbis gewürfelt + 500 ml Brühe + Kokosmilch dazu — Hokkaido muss nicht geschält werden!", "20 Min garen, dann samtig pürieren.", "Salzen, abschmecken. Mit Vollkornbrot servieren."],
        tmSteps: [
          { text: "Zwiebel, Knoblauch & Ingwer zerkleinern", stufe: "5", temp: null, time: "5 Sek" },
          { text: "Andünsten", stufe: "1", temp: "Varoma", time: "3 Min" },
          { text: "Kürbis + Brühe + Kokosmilch dazu — Hokkaido muss nicht geschält werden!", stufe: "1", temp: "100°", time: "20 Min" },
          { text: "Samtig pürieren", stufe: "10", temp: null, time: "1 Min" },
          { text: "Abschmecken. Mit Vollkornbrot servieren.", stufe: null, temp: null, time: null },
        ] },

      { id: 102, title: "Ofenkartoffeln mit Kräuterquark & Schinkenwürfeln", portions: 3, prepMinutes: 50, reuse: "Quark 3 Tage haltbar — für Donnerstag (Flammkuchen) aufheben", fav: false, rating: 0, kidsLoved: false, cookedCount: 0, totalCost: "3.80", costPerPortion: "1.27", estCostPerMeal: "3–5 €",
        ingredients: [
          { item: "Frühkartoffeln festkochend", amount: "1 kg", fromFreezer: false },
          { item: "LF Magerquark", amount: "500 g", fromFreezer: false },
          { item: "Schinkenwürfel G&G", amount: "125 g", fromFreezer: false },
          { item: "LF Saure Sahne", amount: "200 g", fromFreezer: false },
          { item: "Schnittlauch & Knoblauch", amount: "nach Geschmack", fromFreezer: false },
        ],
        steps: ["Kartoffeln waschen, mit Öl & Salz einreiben → 45 Min bei 200° backen bis Schale knusprig.", "Quark + saure Sahne + Schnittlauch + Knoblauch + Salz verrühren.", "Schinkenwürfel in trockener Pfanne 3 Min knusprig rösten — gibt Röstaroma!", "Kartoffeln aufschneiden, Quark rein, Speck drüber — fertig!"],
        tmSteps: [
          { text: "Kartoffeln waschen, mit Öl & Salz einreiben → 45 Min bei 200° im Ofen backen", stufe: null, temp: "Ofen 200°", time: "45 Min" },
          { text: "Knoblauch zerkleinern", stufe: "5", temp: null, time: "3 Sek" },
          { text: "Quark + Saure Sahne + Schnittlauch + Knoblauch + Salz mischen", stufe: "3", temp: null, time: "10 Sek" },
          { text: "Schinkenwürfel in Pfanne knusprig rösten (extern)", stufe: null, temp: "Pfanne", time: "3 Min" },
          { text: "Kartoffeln aufschneiden, Quark rein, Speck drüber — fertig!", stufe: null, temp: null, time: null },
        ] },

      { id: 103, title: "Spaghetti mit Hackfleisch-Tomaten-Soße & Parmesan", portions: 3, prepMinutes: 25, reuse: "Restsoße einfrieren für nächste Woche Lasagne oder Pasta", fav: false, rating: 0, kidsLoved: true, cookedCount: 0, totalCost: "4.80", costPerPortion: "1.60", estCostPerMeal: "4–6 €",
        ingredients: [
          { item: "Hackfleisch gemischt G&G", amount: "500 g", fromFreezer: false },
          { item: "Spaghetti G&G", amount: "500 g", fromFreezer: false },
          { item: "Passata", amount: "500 ml", fromFreezer: false },
          { item: "Tomatenmark", amount: "70 g", fromFreezer: false },
          { item: "Parmesan gerieben", amount: "50 g", fromFreezer: false },
          { item: "Zwiebel, Knoblauch, Oregano", amount: "nach Geschmack", fromFreezer: false },
        ],
        steps: ["Zwiebel & Knoblauch andünsten. Hack scharf anbraten — erst nach 2 Min rühren!", "Tomatenmark dazu, 1 Min mitrösten bis dunkler.", "Passata + Oregano + Salz rein, 12 Min köcheln. Pasta parallel kochen.", "Parmesan frisch drüber — fertig!"],
        tmSteps: [
          { text: "Zwiebel & Knoblauch zerkleinern", stufe: "5", temp: null, time: "5 Sek" },
          { text: "Andünsten", stufe: "1", temp: "Varoma", time: "3 Min" },
          { text: "Hackfleisch dazu, anbraten", stufe: "1", temp: "Varoma", time: "5 Min" },
          { text: "Tomatenmark + Passata + Oregano + Salz dazu, köcheln", stufe: "1", temp: "100°", time: "12 Min" },
          { text: "Pasta extern kochen. Parmesan frisch drüber — fertig!", stufe: null, temp: null, time: null },
        ] },

      { id: 104, title: "Flammkuchen mit Crème fraîche & Speckwürfeln", portions: 3, prepMinutes: 25, reuse: "Restteig als Mini-Flammkuchen einfrieren", fav: false, rating: 0, kidsLoved: true, cookedCount: 0, totalCost: "4.50", costPerPortion: "1.50", estCostPerMeal: "4–5 €",
        ingredients: [
          { item: "Weizenmehl", amount: "250 g", fromFreezer: false },
          { item: "LF Crème fraîche", amount: "150 g", fromFreezer: false },
          { item: "Speckwürfel G&G", amount: "150 g", fromFreezer: false },
          { item: "Edeka Bio Gouda gerieben", amount: "150 g", fromFreezer: false },
          { item: "Zwiebeln & Trockenhefe", amount: "je 1", fromFreezer: false },
        ],
        steps: ["Teig: 250g Mehl + Hefe + Salz + 150 ml Wasser + Öl — kneten, 15 Min ruhen.", "Ofen auf 250° — maximal heiß! Zwiebeln in dünne Ringe schneiden.", "Teig hauchdünn ausrollen. Crème fraîche + Speck + Zwiebeln + Käse drauf.", "10–12 Min backen bis Rand goldbraun knusprig. Sofort essen!"],
        tmSteps: [
          { text: "Teig: Mehl + Hefe + Salz + Wasser + Öl — Teig kneten", stufe: "Teigknetstufe", temp: null, time: "2 Min" },
          { text: "Teig 15 Min ruhen lassen", stufe: null, temp: null, time: "15 Min" },
          { text: "Ofen auf 250° vorheizen. Zwiebeln in TM zerkleinern", stufe: "4", temp: null, time: "3 Sek" },
          { text: "Teig hauchdünn ausrollen, belegen, backen", stufe: null, temp: "Ofen 250°", time: "10–12 Min" },
        ] },

      { id: 105, title: "Kartoffel-Möhren-Suppe mit Würstchen", portions: 3, prepMinutes: 30, reuse: "Rest einfrieren — perfekte schnelle Mahlzeit für nächste Woche", fav: false, rating: 0, kidsLoved: true, cookedCount: 0, totalCost: "3.50", costPerPortion: "1.17", estCostPerMeal: "3–4 €",
        ingredients: [
          { item: "Kartoffeln (Rest Di.)", amount: "500 g", fromFreezer: false },
          { item: "Möhren", amount: "500 g", fromFreezer: false },
          { item: "Wiener Würstchen G&G", amount: "5 Stück", fromFreezer: false },
          { item: "Gemüsebrühe & Zwiebel", amount: "800 ml / 1", fromFreezer: false },
          { item: "Vollkornbrot (Rest Mo.)", amount: "nach Bedarf", fromFreezer: false },
        ],
        steps: ["Zwiebel andünsten. Kartoffel- & Möhrenwürfel + 800 ml Brühe dazu.", "20 Min garen.", "Halb pürieren — cremig aber mit Stückigkeit.", "Würstchen in Scheiben rein, 2 Min ziehen lassen. Schnittlauch drüber, Brot dazu."],
        tmSteps: [
          { text: "Zwiebel zerkleinern & andünsten", stufe: "1", temp: "Varoma", time: "3 Min" },
          { text: "Kartoffel- & Möhrenwürfel + 800 ml Brühe dazu, garen", stufe: "1", temp: "100°", time: "20 Min" },
          { text: "Halb pürieren — cremig aber mit Stückigkeit", stufe: "5", temp: null, time: "5 Sek" },
          { text: "Würstchen in Scheiben rein, ziehen lassen", stufe: "1", temp: "90°", time: "2 Min" },
          { text: "Schnittlauch drüber, Brot dazu — fertig!", stufe: null, temp: null, time: null },
        ] },

      { id: 106, title: "Hähnchen-Paprika-Pfanne mit Reis", portions: 3, prepMinutes: 25, reuse: "Reste kalt als Reissalat am nächsten Tag", fav: false, rating: 0, kidsLoved: true, cookedCount: 0, totalCost: "4.90", costPerPortion: "1.63", estCostPerMeal: "4–6 €",
        ingredients: [
          { item: "Hähnchenbrustfilet", amount: "400 g", fromFreezer: false },
          { item: "Paprika Mix", amount: "500 g", fromFreezer: false },
          { item: "Langkornreis G&G", amount: "300 g", fromFreezer: false },
          { item: "Sojasoße, Knoblauch, Ingwer", amount: "nach Geschmack", fromFreezer: false },
        ],
        steps: ["Reis garen.", "Hähnchen in Streifen scharf anbraten (5 Min), herausnehmen.", "Paprika in Streifen anbraten (3 Min). Knoblauch & Ingwer kurz mit.", "Hähnchen zurück + Sojasoße + Schuss Wasser + Prise Stärke → 2 Min einkochen. Mit Reis servieren."],
        tmSteps: [
          { text: "Reis garen (350g Reis + 700ml Wasser)", stufe: "1", temp: "100°", time: "20 Min" },
          { text: "Hähnchen in Streifen extern scharf anbraten, herausnehmen", stufe: null, temp: "Pfanne heiß", time: "5 Min" },
          { text: "Paprika + Knoblauch + Ingwer in Pfanne anbraten", stufe: null, temp: "Pfanne", time: "3 Min" },
          { text: "Hähnchen zurück + Sojasoße + Wasser + Stärke einkochen", stufe: null, temp: "Pfanne", time: "2 Min" },
          { text: "Mit Reis servieren — fertig!", stufe: null, temp: null, time: null },
        ] },

      { id: 107, title: "Herzhafte Pfannkuchen mit Schinken & Käse", portions: 3, prepMinutes: 25, reuse: "Übrige Pfannkuchen kalt mit Marmelade als Frühstück", fav: false, rating: 0, kidsLoved: true, cookedCount: 0, totalCost: "4.70", costPerPortion: "1.57", estCostPerMeal: "4–5 €",
        ingredients: [
          { item: "Weizenmehl", amount: "200 g", fromFreezer: false },
          { item: "Eier G&G", amount: "3 Stück", fromFreezer: false },
          { item: "LF H-Milch 3,5%", amount: "400 ml", fromFreezer: false },
          { item: "Schinkenwürfel (Rest Di.)", amount: "125 g", fromFreezer: false },
          { item: "Gouda Jung Scheiben G&G", amount: "400 g", fromFreezer: false },
          { item: "LF Butter & Schnittlauch", amount: "nach Bedarf", fromFreezer: false },
        ],
        steps: ["Teig: Mehl + Eier + Milch + Salz. 10 Min ruhen lassen.", "Pfannkuchen in Butter goldbraun backen (~2 Min pro Seite).", "Käsescheibe auf heißen Pfannkuchen — schmilzt sofort. Schinken + Schnittlauch drauf.", "Aufrollen, sofort servieren — Hanna & Timo rollen selbst!"],
        tmSteps: [
          { text: "Teig: Mehl + Eier + Milch + Salz mixen", stufe: "6", temp: null, time: "30 Sek" },
          { text: "Teig ruhen lassen", stufe: null, temp: null, time: "10 Min" },
          { text: "Pfannkuchen in Butter extern backen (~2 Min pro Seite)", stufe: null, temp: "Pfanne mittel", time: "2 Min/Seite" },
          { text: "Käse drauf schmelzen lassen, Schinken + Schnittlauch, aufrollen — Hanna & Timo rollen selbst!", stufe: null, temp: null, time: null },
        ] },
    ];

    // Batch-Plan Woche 4
    const WOCHE4_PLAN = {
      title: "Woche 4 — Kürbis, Hack & Hähnchen",
      summary: "Einmal am Sonntag vorkochen, Mo–So täglich frisch auf den Tisch — max. 5 € pro Mahlzeit, laktosefrei.",
      cookDay: "Sonntag",
      cookSession: [
        "Hackfleisch-Tomaten-Soße (doppelte Portion — für Mi + einfrieren)",
        "Kartoffeln vorbacken für Di & Fr-Suppe",
        "Quark-Kräutermix anrühren (hält 3 Tage)",
        "Pfannkuchenteig vorbereiten",
      ],
      days: [
        { day: "Montag", meal: "🎃 Cremige Kürbissuppe mit Ingwer & Kokos", note: "Vegetarisch · Thermomix · 25 Min", minutes: 25, isLeftover: false, thawTonight: "" },
        { day: "Dienstag", meal: "🥔 Ofenkartoffeln mit Kräuterquark & Schinkenwürfeln", note: "Kartoffeln vom Sonntag vorgebacken · 50 Min", minutes: 50, isLeftover: false, thawTonight: "" },
        { day: "Mittwoch", meal: "🍝 Spaghetti mit Hackfleisch-Tomaten-Soße & Parmesan", note: "Soße vom Sonntag · nur aufwärmen · 10 Min", minutes: 10, isLeftover: true, thawTonight: "Hackfleisch-Soße aus Gefrierschrank" },
        { day: "Donnerstag", meal: "🫓 Flammkuchen mit Crème fraîche & Speckwürfeln", note: "Nachhilfe-Tag · nur 25 Min · Kinder belegen selbst", minutes: 25, isLeftover: false, thawTonight: "" },
        { day: "Freitag", meal: "🥕 Kartoffel-Möhren-Suppe mit Würstchen", note: "Reste Kartoffeln Di · Thermomix · 30 Min", minutes: 30, isLeftover: true, thawTonight: "" },
        { day: "Samstag", meal: "🍗 Hähnchen-Paprika-Pfanne mit Reis", note: "Bunt & aromatisch · 25 Min", minutes: 25, isLeftover: false, thawTonight: "" },
        { day: "Sonntag", meal: "🥞 Herzhafte Pfannkuchen mit Schinken & Käse", note: "Hanna & Timo rollen selbst · Sonntagsspaß", minutes: 25, isLeftover: false, thawTonight: "" },
      ],
      shoppingList: [],
    };

    setRecipes(await loadKey("recipes", []));
    setPlan(await loadKey("plan", null));

    setShopping(await loadKey("shopping", []));

    setStaples(await loadKey("staples", []));

    setHistory(await loadKey("history", []));

    setPrices(await loadKey("prices", {}));

    setDiet(await loadKey("diet", { laktosefrei: true }));
    setHealth(await loadKey("health", {}));
    setKidsProfile(await loadKey("kidsProfile", {}));
    setGamification(await loadKey("gamification", { xp: 0, achievements: [], totalCooked: 0, noWasteDays: 0, weekUnder25: 0, totalFrozen: 0, savedRecipes: 0, cookStreak: 0, doubleRecipes: 0, routineWeeks: 0, kidsLoved: 0 }));
    setHousehold(await loadKey("household", { adults: 1, kids: [{ age: 13 }, { age: 11 }], soloMode: false }));
    setBudget(await loadKey("budget", { monthly: 400, expenses: [] }));
    const onb = await loadKey("onboarding_done", false);
    setOnboardingDone(!!onb);
    setCalEvents(await loadKey("cal_events", []));
    setLoaded(true);
  }

  useEffect(() => { loadAll(); }, []);

  async function applyBackup(data) {
    const keys = ["freezer", "pantry", "recipes", "plan", "shopping", "staples", "history", "prices", "diet", "household", "budget"];
    for (const k of keys) {
      if (data[k] !== undefined) await saveKey(k, data[k]);
    }
    await loadAll();
  }

  function collectBackup() {
    return { _app: "Küchen-Kommando", _version: 1, _exported: new Date().toISOString(),
      freezer, pantry, recipes, plan, shopping, staples, history, prices, diet, health, kidsProfile, gamification, household, budget };
  }

  useEffect(() => { if (loaded) saveKey("freezer", freezer); }, [freezer, loaded]);
  useEffect(() => { if (loaded) saveKey("pantry", pantry); }, [pantry, loaded]);
  useEffect(() => { if (loaded) saveKey("recipes", recipes); }, [recipes, loaded]);
  useEffect(() => { if (loaded) saveKey("plan", plan); }, [plan, loaded]);
  useEffect(() => { if (loaded) saveKey("shopping", shopping); }, [shopping, loaded]);
  useEffect(() => { if (loaded) saveKey("staples", staples); }, [staples, loaded]);
  useEffect(() => { if (loaded) saveKey("history", history); }, [history, loaded]);
  useEffect(() => { if (loaded) saveKey("prices", prices); }, [prices, loaded]);
  useEffect(() => { if (loaded) saveKey("diet", diet); }, [diet, loaded]);
  useEffect(() => { if (loaded) saveKey("health", health); }, [health, loaded]);
  useEffect(() => { if (loaded) saveKey("kidsProfile", kidsProfile); }, [kidsProfile, loaded]);
  useEffect(() => { if (loaded) saveKey("gamification", gamification); }, [gamification, loaded]);

  // XP verdienen + Achievement prüfen
  function earnXP(amount, reason) {
    setGamification((prev) => {
      const newXP = (prev.xp || 0) + amount;
      const newAchievements = [...(prev.achievements || [])];
      ACHIEVEMENTS.forEach((a) => {
        if (!newAchievements.includes(a.key) && a.check(prev)) {
          newAchievements.push(a.key);
        }
      });
      return { ...prev, xp: newXP, achievements: newAchievements };
    });
  }
  function updateGamStat(key, value) {
    setGamification((prev) => {
      const updated = { ...prev, [key]: value };
      const newAchievements = [...(prev.achievements || [])];
      ACHIEVEMENTS.forEach((a) => {
        if (!newAchievements.includes(a.key) && a.check(updated)) {
          newAchievements.push(a.key);
          updated.xp = (updated.xp || 0) + a.xp;
        }
      });
      updated.achievements = newAchievements;
      return updated;
    });
  }
  useEffect(() => { if (loaded) saveKey("household", household); }, [household, loaded]);
  useEffect(() => { if (loaded) saveKey("budget", budget); }, [budget, loaded]);
  useEffect(() => { if (loaded) saveKey("darkMode", darkMode); }, [darkMode, loaded]);
  useEffect(() => { if (loaded) saveKey("cal_events", calEvents); }, [calEvents, loaded]);

  // darkMode beim Laden lesen
  useEffect(() => {
    (async () => { const d = await loadKey("darkMode", false); setDarkMode(d); })();
  }, []);

  // ---- Gruppen-Navigation ----
  const GROUPS = [
    {
      id: "home", label: "Übersicht", emoji: "🏠", color: ACCENT,
      pages: [{ id: "dashboard", label: "Dashboard" }],
    },
    {
      id: "stock", label: "Vorräte", emoji: "🧊", color: "#6E8CA0",
      pages: [
        { id: "freezer", label: "Gefrierschrank" },
        { id: "pantry", label: "Vorratsschrank" },
      ],
    },
    {
      id: "cook", label: "Kochen", emoji: "🍳", color: SAGE,
      pages: [
        { id: "recipes", label: "KI-Rezepte" },
        { id: "double", label: "Doppelrezepte" },
        { id: "plan", label: "Batch-Plan" },
        { id: "week", label: "Wochenkalender" },
        { id: "handover", label: "Wochen-Übergabe" },
      ],
    },
    {
      id: "shop", label: "Einkauf", emoji: "🛒", color: GOLD,
      pages: [
        { id: "shopping", label: "Einkaufsliste" },
        { id: "prices", label: "Preisgedächtnis" },
      ],
    },
    {
      id: "ai", label: "KI-Chat", emoji: "🤖", color: "#7C3AED",
      pages: [{ id: "chat", label: "KI-Chat" }],
    },
    {
      id: "family", label: "Familie", emoji: "👨‍👩‍👧‍👦", color: "#C084FC",
      pages: [
        { id: "routines", label: "Tagesroutinen" },
        { id: "clips", label: "Klammern" },
        { id: "gamification", label: "Level & Erfolge" },
        { id: "bread", label: "Brotzeit" },
        { id: "calendar", label: "📅 Termine" },
        { id: "notes", label: "📝 Notizen" },
        { id: "budget", label: "Budget" },
        { id: "settings", label: "Einstellungen" },
      ],
    },
  ];

  // Welche Gruppe ist aktiv?
  const activeGroup = GROUPS.find((g) => g.pages.some((p) => p.id === tab)) || GROUPS[0];

  // Badges: Anzahl dringender Dinge pro Gruppe
  function groupBadge(gid) {
    if (gid === "home") {
      const urgent = freezer.filter((f) => { const l = freshnessStatus(f.bestBefore).level; return l === "red" || l === "expired"; }).length;
      const low = pantry.filter((p) => p.low).length;
      const open = shopping.filter((s) => !s.done).length;
      return urgent + low + open;
    }
    if (gid === "stock") return freezer.filter((f) => { const l = freshnessStatus(f.bestBefore).level; return l === "red" || l === "expired"; }).length;
    if (gid === "shop") return shopping.filter((s) => !s.done).length;
    return 0;
  }

  return (
    <ThemeCtx.Provider value={theme}>
    {loaded && !onboardingDone && (
      <Onboarding onDone={() => {
        setOnboardingDone(true);
        saveKey("onboarding_done", true);
      }} />
    )}
    <div style={{
      minHeight: "100vh", background: theme.PAPER, color: theme.TEXT,
      fontFamily: "'Georgia', serif",
      backgroundImage: darkMode ? "none" : `radial-gradient(${ACCENT}11 1px, transparent 1px)`,
      backgroundSize: "22px 22px",
      transition: "background .3s, color .3s",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,400;9..144,0,600;9..144,0,900;9..144,1,400&family=Archivo:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .kk-h { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.02em; }
        .kk-b { font-family: 'Archivo', sans-serif; }

        /* Buttons — springender, lebendiger */
        .kk-btn {
          transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease, opacity .15s ease, background .2s ease;
          cursor: pointer; border: none;
        }
        .kk-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
        .kk-btn:active { transform: translateY(1px) scale(0.97); box-shadow: none; }

        /* Cards — elegante Schatten, weiches Heben */
        .kk-card {
          transition: transform .22s cubic-bezier(.34,1.4,.64,1), box-shadow .22s ease;
          box-shadow: 0 1px 4px rgba(26,23,20,0.06), 0 4px 16px rgba(26,23,20,0.04);
        }
        .kk-card:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 4px 20px rgba(26,23,20,0.1), 0 1px 4px rgba(26,23,20,0.06);
        }

        /* Pop-Animation — staggered, weicher */
        @keyframes pop {
          from { opacity:0; transform: translateY(16px) scale(0.96); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        .kk-pop { animation: pop .45s cubic-bezier(.34,1.4,.64,1) backwards; }
        .kk-pop > * { animation: pop .38s cubic-bezier(.34,1.4,.64,1) backwards; }
        .kk-pop > *:nth-child(1) { animation-delay: .04s }
        .kk-pop > *:nth-child(2) { animation-delay: .09s }
        .kk-pop > *:nth-child(3) { animation-delay: .14s }
        .kk-pop > *:nth-child(4) { animation-delay: .19s }
        .kk-pop > *:nth-child(5) { animation-delay: .24s }
        .kk-pop > *:nth-child(6) { animation-delay: .29s }

        /* Slide-in von unten für neue Elemente */
        @keyframes slideUp {
          from { opacity:0; transform: translateY(24px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .kk-slide { animation: slideUp .35s cubic-bezier(.25,.46,.45,.94) backwards; }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .kk-spin { animation: spin 1s linear infinite; display:inline-block; }

        /* Shimmer für leere States */
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .kk-shimmer {
          background: linear-gradient(90deg, #f0e8d8 25%, #fff8f0 50%, #f0e8d8 75%);
          background-size: 200% 100%;
          animation: shimmer 1.8s ease infinite;
          border-radius: 10px;
        }

        /* Pulse für wichtige Badges */
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,85,42,.35); }
          50%       { box-shadow: 0 0 0 8px rgba(232,85,42,0); }
        }
        .kk-pulse { animation: pulse 2.2s ease infinite; }

        /* Fortschrittsbalken animiert */
        @keyframes fillBar {
          from { width: 0%; }
        }
        .kk-bar { animation: fillBar .9s cubic-bezier(.34,1.2,.64,1) backwards; transition: width .4s ease; }

        /* Glow für Accent-Buttons */
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,85,42,.3); }
          50%       { box-shadow: 0 0 20px rgba(232,85,42,.25); }
        }
        .kk-glow { animation: glow 3s ease infinite; }

        /* Inputs */
        input, select, textarea {
          font-family: 'Archivo', sans-serif;
          background: transparent;
          color: inherit;
          outline: none;
          transition: border-color .18s ease, box-shadow .18s ease;
        }
        input:focus, select:focus, textarea:focus {
          box-shadow: 0 0 0 3px rgba(232,85,42,0.15);
          border-color: rgba(232,85,42,0.5) !important;
        }

        /* Scrollbar dezent */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 2px; }

        /* Checkboxen */
        input[type=checkbox] { border-radius: 4px; }
      `}</style>

      {/* Header */}
      <header style={{ background: theme.DEEP, color: theme.PAPER, padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="kk-h" style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>
            KÜCHEN<span style={{ color: ACCENT }}>·</span>KOMMANDO
          </div>
          <div className="kk-b" style={{ fontSize: 13, opacity: 0.55, marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>
            1× kochen · mehrere Tage essen · laktosefrei
          </div>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className="kk-btn"
          style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 20, padding: "7px 12px", fontSize: 16, cursor: "pointer" }}
          title="Dunkelmodus">
          {darkMode ? "☀️" : "🌙"}
        </button>
      </header>

      {/* Haupt-Gruppen-Nav (5 Bereiche) */}
      <div style={{ background: theme.NAV, borderBottom: `2px solid ${theme.BORDER}`, padding: "10px 12px 8px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {GROUPS.map((g) => {
            const active = g.id === activeGroup.id;
            const badge = groupBadge(g.id);
            return (
              <button key={g.id} onClick={() => setTab(g.pages[0].id)} className="kk-btn kk-b"
                style={{ flex: 1, padding: "8px 4px", borderRadius: 12, background: active ? g.color : theme.SAGE_BG, color: active ? "#fff" : theme.TEXT, border: `2px solid ${active ? g.color : "transparent"}`, position: "relative", textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{g.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, lineHeight: 1.2 }}>{g.label}</div>
                {badge > 0 && !active && (
                  <div style={{ position: "absolute", top: 3, right: 3, background: ACCENT, color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge > 9 ? "9+" : badge}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Unterseiten der aktiven Gruppe */}
        {activeGroup.pages.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto", paddingBottom: 2 }}>
            {activeGroup.pages.map((p) => (
              <button key={p.id} onClick={() => setTab(p.id)} className="kk-btn kk-b"
                style={{ flex: "0 0 auto", padding: "6px 14px", borderRadius: 20, background: tab === p.id ? theme.DEEP : "transparent", color: tab === p.id ? theme.PAPER : theme.TEXT, border: `1.5px solid ${tab === p.id ? theme.DEEP : theme.BORDER}`, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 80px" }}>
        {!loaded ? <Loading /> :
          tab === "dashboard" ? <Dashboard freezer={freezer} setFreezer={setFreezer} pantry={pantry} recipes={recipes} plan={plan} shopping={shopping} setShopping={setShopping} household={household} gamification={gamification} setTab={setTab} onOpenRecipe={(r) => { if(r) { setTab("recipes"); } }} /> :
          tab === "freezer" ? <Freezer freezer={freezer} setFreezer={setFreezer} setTab={setTab} diet={diet} health={health} kidsProfile={kidsProfile} household={household} /> :
          tab === "pantry" ? <Pantry pantry={pantry} setPantry={setPantry} shopping={shopping} setShopping={setShopping} /> :
          tab === "recipes" ? <Recipes freezer={freezer} setFreezer={setFreezer} pantry={pantry} setPantry={setPantry} recipes={recipes} setRecipes={setRecipes} diet={diet} health={health} kidsProfile={kidsProfile} household={household} /> :
          tab === "double" ? <DoubleRecipes freezer={freezer} pantry={pantry} setShopping={setShopping} shopping={shopping} diet={diet} health={health} kidsProfile={kidsProfile} household={household} /> :
          tab === "plan" ? <BatchPlan freezer={freezer} setFreezer={setFreezer} pantry={pantry} recipes={recipes} plan={plan} setPlan={setPlan} setShopping={setShopping} shopping={shopping} diet={diet} health={health} household={household} calEvents={calEvents} /> :
          tab === "week" ? <WeekView plan={plan} setPlan={setPlan} setTab={setTab} freezer={freezer} setFreezer={setFreezer} calEvents={calEvents} recipes={recipes} setRecipes={setRecipes} diet={diet} health={health} household={household} /> :
          tab === "handover" ? <WeekHandover freezer={freezer} pantry={pantry} plan={plan} recipes={recipes} setTab={setTab} /> :
          tab === "routines" ? <Routines /> :
          tab === "clips" ? <ClipRewards /> :
          tab === "notes" ? <QuickNotes /> :
          tab === "chat" ? <KIChat freezer={freezer} pantry={pantry} recipes={recipes} plan={plan} shopping={shopping} diet={diet} household={household} /> :
          tab === "calendar" ? <CalendarEvents events={calEvents} setEvents={setCalEvents} /> :
          tab === "gamification" ? <GamificationTab gamification={gamification} recipes={recipes} /> :
          tab === "bread" ? <Bread household={household} shopping={shopping} setShopping={setShopping} /> :
          tab === "budget" ? <Budget budget={budget} setBudget={setBudget} /> :
          tab === "prices" ? <PriceMemory prices={prices} setPrices={setPrices} /> :
          tab === "settings" ? <Settings diet={diet} setDiet={setDiet} health={health} setHealth={setHealth} kidsProfile={kidsProfile} setKidsProfile={setKidsProfile} household={household} setHousehold={setHousehold} collectBackup={collectBackup} applyBackup={applyBackup} darkMode={darkMode} setDarkMode={setDarkMode} /> :
          <Shopping shopping={shopping} setShopping={setShopping} staples={staples} setStaples={setStaples} history={history} setHistory={setHistory} prices={prices} setPrices={setPrices} freezer={freezer} setFreezer={setFreezer} pantry={pantry} setPantry={setPantry} />}
      </main>
    </div>
    </ThemeCtx.Provider>
  );
}

function Loading() {
  const theme = useTheme();
  return <div style={{ textAlign: "center", padding: 60, opacity: 0.5, color: theme.TEXT }} className="kk-b">Lade dein Küchen-Kommando…</div>;
}

// ---------------- Wochenfortschritt (Dopamin-Karte) ----------------
function WeekProgressCard({ recipes, freezer }) {
  const theme = useTheme();
  const cookedThisWeek = recipes.reduce((s, r) => s + (r.cookedCount || 0), 0);
  const weekGoal = 5;
  const pct = Math.min(100, Math.round((cookedThisWeek / weekGoal) * 100));
  const rescued = freezer.filter((f) => f.bestBefore && daysUntil(f.bestBefore) > 0).length;
  const saved = recipes.filter((r) => r.cookedCount > 0).reduce((sum, r) => {
    const home = parseFloat(r.totalCost || "0") || 4;
    const rest = 12 * (r.portions || 3);
    return sum + Math.max(0, rest - home);
  }, 0);
  const barSegments = 10;
  const filledSegments = Math.round((pct / 100) * barSegments);
  return (
    <div className="kk-card" style={{ background: theme.CARD, borderRadius: 20, padding: "20px 18px", marginBottom: 16, boxShadow: "0 4px 24px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04)", border: "1.5px solid " + theme.BORDER }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div className="kk-h" style={{ fontSize: 17, fontWeight: 700, color: theme.TEXT }}>Diese Woche geschafft</div>
        <div className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: pct >= 80 ? SAGE : pct >= 40 ? GOLD : theme.MUTED }}>{pct} %</div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {Array.from({ length: barSegments }).map((_, i) => (
          <div key={i} className={i < filledSegments ? "kk-bar" : ""} style={{ flex: 1, height: 10, borderRadius: 5, background: i < filledSegments ? ("linear-gradient(90deg, " + SAGE + ", " + (i === filledSegments - 1 ? GOLD : SAGE) + ")") : theme.DOT, animationDelay: (i * 0.06) + "s" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[[cookedThisWeek, "🍳 Mahlzeiten", SAGE], [saved > 0 ? saved.toFixed(0) + " €" : "—", "💰 gespart", GOLD], [rescued, "🌿 gerettet", ACCENT]].map(([val, label, color], i) => (
          <div key={i} style={{ textAlign: "center", padding: "10px 6px", background: color + "14", borderRadius: 14 }}>
            <div className="kk-h" style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
            <div className="kk-b" style={{ fontSize: 12, color: theme.MUTED, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
      {pct >= 100 && <div className="kk-b" style={{ fontSize: 14.5, color: SAGE, fontWeight: 700, marginTop: 12, textAlign: "center" }}>🏆 Wochenziel erreicht! Du bist ein Familienchef.</div>}
      {pct >= 60 && pct < 100 && <div className="kk-b" style={{ fontSize: 14, color: GOLD, fontWeight: 600, marginTop: 10, textAlign: "center" }}>Fast da — noch {weekGoal - cookedThisWeek} Mahlzeit{weekGoal - cookedThisWeek !== 1 ? "en" : ""} bis zum Ziel.</div>}
    </div>
  );
}

// ---------------- Dashboard ----------------
// ---------------- 1× Kochen = 2 Gerichte Hero ----------------
function DoppelHero({ plan, recipes, setTab }) {
  const theme = useTheme();

  // Nur echte Doppelrezepte — erkennbar an reuse-Text UND zwei dishes
  // Wir suchen in gespeicherten Rezepten nach Batch-Rezepten mit Resteverwertung
  const batchRecipes = recipes.filter((r) => r.reuse && r.reuse.length > 15);
  const best = batchRecipes.sort((a, b) => (b.cookedCount || 0) - (a.cookedCount || 0))[0];

  // Zeitersparnis: Zweites Gericht = nur aufwärmen ≈ 10 Min statt vollem Kochen
  const fullTime = parseInt(best?.prepMinutes) || 25;
  const timeSaved = Math.max(10, Math.round(fullTime * 0.55));
  const moneySaved = best?.costPerPortion
    ? (parseFloat(best.costPerPortion) * (parseInt(best.portions) || 3)).toFixed(2).replace(".", ",")
    : "4,50";

  // Kein echtes Doppelrezept → Teaser
  if (!best) {
    return (
      <div className="kk-card" style={{
        background: `linear-gradient(135deg, ${SAGE} 0%, #3A5240 100%)`,
        borderRadius: 18, padding: "18px 16px", marginBottom: 14,
        boxShadow: `4px 4px 0 ${SAGE}66`,
      }}>
        <div className="kk-b" style={{ fontSize: 12.5, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 6, fontWeight: 700 }}>
          🍲 Dein stärkstes Werkzeug
        </div>
        <div className="kk-h" style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 8 }}>
          1× kochen =<br />2 Tage entspannen
        </div>
        <div className="kk-b" style={{ fontSize: 14.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 12 }}>
          Eine Basis vorkochen — daraus werden zwei völlig verschiedene Gerichte. Spart Zeit, Geld und Abwasch.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {[["💰", "bis 5 €/Woche gespart"], ["🧽", "30 Min weniger Abwasch"], ["⏱", "1 Kochtag statt 5"]].map(([e, t], i) => (
            <span key={i} className="kk-b" style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 10px", fontSize: 13, color: "#fff", fontWeight: 600 }}>{e} {t}</span>
          ))}
        </div>
        <button onClick={() => setTab("double")} className="kk-btn kk-b"
          style={{ background: "#fff", color: SAGE, padding: "10px 18px", borderRadius: 20, fontWeight: 800, fontSize: 15 }}>
          ⊞ Erstes Doppelrezept erstellen →
        </button>
      </div>
    );
  }

  // Echtes Doppelrezept: Basis → Gericht 1 → Gericht 2
  // reuse-Text als "Morgen"-Beschreibung, Titel als "Heute"
  const reuseShort = best.reuse.length > 60 ? best.reuse.slice(0, 57) + "…" : best.reuse;

  return (
    <div className="kk-card" style={{
      background: `linear-gradient(135deg, ${SAGE} 0%, #2A4030 100%)`,
      borderRadius: 18, padding: "18px 16px", marginBottom: 14,
      boxShadow: `4px 4px 0 ${SAGE}55`, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", right: -15, top: -15, width: 90, height: 90, borderRadius: "50%", background: "#fff", opacity: 0.05 }} />

      <div className="kk-b" style={{ fontSize: 12.5, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 8, fontWeight: 700 }}>
        🍲 1× kochen · 2 Tage entspannen
      </div>

      {/* Basis → zwei Gerichte */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.12)", borderRadius: 12, overflow: "hidden" }}>
          {best.title && (
            <div style={{ position: "relative", height: 70 }}>
              <FoodImage title={best.title} height={70} radius="12px 12px 0 0" />
            </div>
          )}
          <div style={{ padding: "8px 12px 10px" }}>
            <div className="kk-b" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Heute kochen</div>
            <div className="kk-h" style={{ fontSize: 15.5, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{best.title}</div>
            <div className="kk-b" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>⏱ {best.prepMinutes} Min · {best.portions} Port.</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, flexShrink: 0 }}>
          <div style={{ fontSize: 20, color: "#fff", opacity: 0.7 }}>→</div>
          <div className="kk-b" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", writing: "vertical" }}>♻</div>
        </div>

        <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 12px", border: "1px dashed rgba(255,255,255,0.2)" }}>
          <div className="kk-b" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Morgen entspannen</div>
          <div className="kk-h" style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1.35 }}>{reuseShort}</div>
          <div className="kk-b" style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>aus Resten · ~10 Min</div>
        </div>
      </div>

      {/* Ersparnis */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <span className="kk-b" style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 11px", fontSize: 14, color: "#fff", fontWeight: 700 }}>
          💰 {moneySaved} € gespart
        </span>
        <span className="kk-b" style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 11px", fontSize: 14, color: "#fff", fontWeight: 700 }}>
          🧽 {timeSaved} Min weniger
        </span>
      </div>

      <button onClick={() => setTab("double")} className="kk-btn kk-b"
        style={{ background: "#fff", color: SAGE, padding: "9px 16px", borderRadius: 20, fontWeight: 800, fontSize: 14.5 }}>
        ⊞ Doppelrezept ansehen →
      </button>
    </div>
  );
}

// ---------------- KI-Coach (proaktive Vorschläge) ----------------
function KICoach({ freezer, pantry, plan, recipes, household, setTab, shopping }) {
  const theme = useTheme();

  // Vorschläge regelbasiert generieren
  const suggestions = [];
  const now = new Date();
  const hour = now.getHours();
  const kidsCount = household?.kids?.length || 0;

  // 1. Ablaufende Lebensmittel → konkretes Gericht vorschlagen
  const urgent = freezer.filter((f) => f.bestBefore && daysUntil(f.bestBefore) >= 0 && daysUntil(f.bestBefore) <= 3)
    .sort((a, b) => daysUntil(a.bestBefore) - daysUntil(b.bestBefore));
  if (urgent.length > 0) {
    const item = urgent[0];
    const days = daysUntil(item.bestBefore);
    const dishes = {
      "Fleisch/Fisch": ["Pfanne mit Reis", "Auflauf", "Suppe"],
      "Gemüse": ["Suppe", "Ofengemüse", "Nuggets"],
      "Milchprodukt (laktosefrei)": ["Pfannkuchen", "Quark-Dip", "Auflauf"],
      "Stärke": ["Fried Rice", "Nudelauflauf", "Salat"],
      "Sonstiges": ["Auflauf", "Pfanne", "Suppe"],
    };
    const dish = (dishes[item.cat] || ["Pfanne"])[Math.floor(now.getDate() % 3)];
    const kidScore = item.cat === "Gemüse" ? "8/10" : "9/10";
    suggestions.push({
      icon: "⚠️",
      color: ACCENT,
      title: `${item.name} läuft in ${days === 0 ? "heute" : days + " T."} ab`,
      text: `Daraus könntest du heute ${dish} machen${kidsCount > 0 ? ` — kindergeprüft ${kidScore}` : ""}.`,
      action: () => setTab("recipes"),
      btn: "Rezept →",
    });
  }

  // 2. Tageszeit → Expressgerichte wenn Abend und noch kein Plan
  const todayName = now.toLocaleDateString("de-DE", { weekday: "long" });
  const todayMeal = (plan?.days || []).find((d) => (d.day || "").toLowerCase().startsWith(todayName.toLowerCase().slice(0, 2)));
  if (hour >= 16 && !todayMeal) {
    suggestions.push({
      icon: "⚡",
      color: GOLD,
      title: "Noch kein Abendessen geplant",
      text: `Es ist ${hour}:00 Uhr. Hier sind Expressgerichte unter 20 Minuten — ideal für heute Abend.`,
      action: () => setTab("recipes"),
      btn: "Express-Rezept →",
    });
  }

  // 3. Morgens: Auftau-Erinnerung für heute Abend
  if (hour < 10) {
    const tomorrowName = new Date(Date.now() + 86400000).toLocaleDateString("de-DE", { weekday: "long" });
    const thaw = (plan?.days || []).find((d) => d.thawTonight && d.thawTonight.trim() && (d.day || "").toLowerCase().startsWith(tomorrowName.toLowerCase().slice(0, 2)));
    if (thaw) {
      suggestions.push({
        icon: "❄",
        color: "#6E8CA0",
        title: "Heute Abend auftauen nicht vergessen",
        text: `Für morgen (${thaw.day}) musst du heute Abend auftauen: ${thaw.thawTonight}.`,
        action: () => setTab("week"),
        btn: "Wochenplan →",
      });
    }
  }

  // 4. Vorrat fast leer → automatisch auf Einkaufsliste
  const lowItems = pantry.filter((p) => p.low);
  if (lowItems.length >= 3) {
    suggestions.push({
      icon: "🛒",
      color: SAGE,
      title: `${lowItems.length} Vorräte fast leer`,
      text: `${lowItems.slice(0, 2).map((p) => p.name).join(", ")} und ${lowItems.length - 2} weitere — jetzt auf die Picnic-Liste?`,
      action: () => setTab("shopping"),
      btn: "Zur Liste →",
    });
  }

  // 4b. Fleisch/Fisch im Einkauf → einfrieren vorschlagen
  const freshMeat = (shopping || []).filter((s) => !s.done && s.cat === "Fleisch/Fisch");
  if (freshMeat.length > 0) {
    suggestions.push({
      icon: "🧊",
      color: "#6E8CA0",
      title: `${freshMeat[0].name} — direkt einfrieren?`,
      text: `Du hast Fleisch/Fisch auf der Liste. Was nicht diese Woche gebraucht wird, jetzt einfrieren — spart Geld und verhindert Verderb.`,
      action: () => setTab("freezer"),
      btn: "Zum TK →",
    });
  }

  // 4c. Nach dem Kochen: Reste einfrieren?
  const justCooked = recipes.filter((r) => r.cookedCount > 0 && r.reuse).sort((a, b) => b.cookedCount - a.cookedCount)[0];
  if (justCooked && hour >= 17 && hour <= 21) {
    suggestions.push({
      icon: "♻",
      color: SAGE,
      title: `Reste von heute einfrieren?`,
      text: `${justCooked.title}: ${justCooked.reuse} — Reste jetzt einfrieren damit morgen nichts verschwendet wird.`,
      action: () => setTab("freezer"),
      btn: "Einfrieren →",
    });
  }

  // 4d. Montags: neue Woche planen
  if (now.getDay() === 1) {
    suggestions.push({
      icon: "📅",
      color: GOLD,
      title: "Neue Woche — Kochtag planen?",
      text: "Montag ist der perfekte Moment: Wochenplan erstellen, Einkaufsliste füllen, Kochtag festlegen — dann läuft die Woche von selbst.",
      action: () => setTab("plan"),
      btn: "Wochenplan →",
    });
  }

  // 4e. Freitags: Picnic-Bestellung nicht vergessen
  if (now.getDay() === 5) {
    suggestions.push({
      icon: "🛒",
      color: ACCENT,
      title: "Freitag — Picnic für Montag bestellen!",
      text: "Montag-Lieferung muss bis heute bestellt sein. Einkaufsliste prüfen, letzte Artikel ergänzen, dann in der Picnic-App bestellen.",
      action: () => setTab("shopping"),
      btn: "Zur Liste →",
      urgent: true,
    });
  }

  // 5. Wochentag = Donnerstag → Nachhilfe-Tag Hinweis
  if (now.getDay() === 4) {
    suggestions.push({
      icon: "📚",
      color: "#C084FC",
      title: "Heute Nachhilfe — 25-Min-Gericht empfohlen",
      text: "Donnerstags ist wenig Zeit. Flammkuchen, Pfannkuchen oder Pasta — fertig bevor die Kinder hungrig werden.",
      action: () => setTab("recipes"),
      btn: "Schnell-Rezept →",
    });
  }

  // 6. Rezept öfter gekocht → Favorit empfehlen
  const topRecipe = [...recipes].sort((a, b) => (b.cookedCount || 0) - (a.cookedCount || 0))[0];
  if (topRecipe?.cookedCount >= 3) {
    suggestions.push({
      icon: "⭐",
      color: GOLD,
      title: `Euer Familien-Liebling: ${topRecipe.title}`,
      text: `Schon ${topRecipe.cookedCount}× gekocht${topRecipe.kidsLoved ? " — die Kinder lieben es" : ""}. Läuft diese Woche wieder?`,
      action: () => setTab("recipes"),
      btn: "Zum Rezept →",
    });
  }

  // 7. Sonntag → Wochenplan-Erinnerung
  if (now.getDay() === 0) {
    suggestions.push({
      icon: "📋",
      color: ACCENT,
      title: "Sonntag — Zeit für den Wochenplan",
      text: "Jetzt 10 Minuten investieren spart 3 Kochabende. Batch-Plan erstellen und Picnic-Bestellung aufgeben.",
      action: () => setTab("plan"),
      btn: "Wochenplan →",
    });
  }

  if (suggestions.length === 0) return null;

  // Maximal 2 Vorschläge zeigen (die relevantesten zuerst)
  const shown = suggestions.slice(0, 2);

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="kk-b" style={{ fontSize: 12.5, letterSpacing: 2, textTransform: "uppercase", color: theme.MUTED, marginBottom: 8, fontWeight: 700 }}>
        🧠 Küchen-KI denkt mit
      </div>
      {shown.map((s, i) => (
        <div key={i} className="kk-card" style={{ background: theme.CARD, border: `1.5px solid ${s.color}33`, borderLeft: `4px solid ${s.color}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
            <div style={{ flex: 1 }}>
              <div className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: theme.TEXT, marginBottom: 2 }}>{s.title}</div>
              <div className="kk-b" style={{ fontSize: 14, color: theme.MUTED, lineHeight: 1.5 }}>{s.text}</div>
            </div>
          </div>
          <button onClick={s.action} className="kk-btn kk-b"
            style={{ background: s.color, color: "#fff", padding: "7px 14px", borderRadius: 16, fontWeight: 700, fontSize: 14, marginTop: 9 }}>
            {s.btn}
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------- Dashboard ----------------
function Dashboard({ freezer, setFreezer, pantry, recipes, plan, shopping, setShopping, household, gamification, setTab, onOpenRecipe }) {
  const theme = useTheme();
  const [showFreeze, setShowFreeze] = useState(false);
  const [notfallMode, setNotfallMode] = useState(false);
  const [hiddenCards, setHiddenCards] = useState({});
  const currentLevel = getCurrentLevel(gamification?.xp || 0);

  function hideCard(id) { setHiddenCards(h => ({ ...h, [id]: true })); }
  function showAll() { setHiddenCards({}); }
  const hiddenCount = Object.values(hiddenCards).filter(Boolean).length;

  // HideButton Komponente
  function HideBtn({ id }) {
    return (
      <button onClick={() => hideCard(id)} className="kk-btn"
        style={{ position: "absolute", top: 8, right: 8, background: "transparent", color: theme.MUTED, fontSize: 18, lineHeight: 1, padding: "2px 6px", borderRadius: 8, opacity: 0.5, zIndex: 2 }}
        title="Karte ausblenden">×</button>
    );
  }

  // Notfall-Rezepte: aus Gefrierschrank + Vorrat, max 15 Min, kinderfreundlich
  const NOTFALL_RECIPES = [
    { title: "Toast mit Käse & Aufschnitt", min: 5, emoji: "🍞", pots: 0, desc: "Toaster an, belegen, fertig. Kein Abwasch." },
    { title: "Spiegelei & Toast", min: 8, emoji: "🍳", pots: 1, desc: "1 Pfanne, 5 Min. Kinder lieben es." },
    { title: "Nudeln mit Butter & Parmesan", min: 10, emoji: "🍝", pots: 1, desc: "Pasta kochen, Butter rein, Parmesan drauf. Klassiker." },
    { title: "Pfannkuchen (schnell)", min: 12, emoji: "🥞", pots: 1, desc: "Teig 2 Min rühren, backen. Kinder essen immer." },
    { title: "Dosensuppe aufgewärmt + Brot", min: 5, emoji: "🍲", pots: 1, desc: "Öffnen, erhitzen, Brot dazu. Fertig." },
    { title: "Aufgetautes aus dem Gefrierschrank", min: 10, emoji: "❄", pots: 1, desc: `${freezer.length > 0 ? freezer[0].name + " aufwärmen" : "Einfach aufwärmen"}. Schon fertig.` },
    { title: "Brot mit allem was da ist", min: 3, emoji: "🥪", pots: 0, desc: "Aufschnitt, Käse, was der Kühlschrank hergibt. Kein Kochen." },
    { title: "Rührei mit Gemüse", min: 8, emoji: "🥚", pots: 1, desc: "Eier aufschlagen, Gemüsereste rein, 1 Pfanne." },
  ];
  const notfallOptions = NOTFALL_RECIPES.sort(() => Math.random() - 0.5).slice(0, 3);
  const expiring = freezer.filter((f) => f.bestBefore && daysUntil(f.bestBefore) <= 30).sort((a, b) => daysUntil(a.bestBefore) - daysUntil(b.bestBefore));
  const openShop = shopping.filter((s) => !s.done).length;
  const lowStock = pantry.filter((p) => p.low);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const expiringThisWeek = freezer.filter((f) => f.bestBefore && daysUntil(f.bestBefore) >= 0 && daysUntil(f.bestBefore) <= 7);

  function addLowToShopping(p) {
    if (shopping.some((s) => s.name === p.name && !s.done)) return;
    setShopping([...shopping, { id: Date.now(), name: p.name, amount: p.qty || "", cat: p.cat || "Sonstiges", done: false }]);
  }

  // Heutiges Gericht aus dem Wochenplan
  const todayName = new Date().toLocaleDateString("de-DE", { weekday: "long" });
  const todayMeal = (plan?.days || []).find((d) => (d.day || "").toLowerCase().startsWith(todayName.toLowerCase().slice(0, 2)));
  // Passendes Rezept aus gespeicherten Rezepten suchen
  const todayRecipe = todayMeal ? recipes.find((r) => todayMeal.meal && todayMeal.meal.toLowerCase().includes(r.title.toLowerCase().slice(0, 10))) : null;

  // Routinen-Fortschritt heute
  const [routineChecks, setRoutineChecks] = useState({});
  useEffect(() => {
    (async () => {
      const saved = await loadKey("routines_checks", {});
      const savedDate = await loadKey("routines_date", "");
      if (savedDate === todayStr) setRoutineChecks(saved);
    })();
  }, []);
  const totalRoutineTasks = ROUTINES.reduce((s, r) => s + r.tasks.length, 0);
  const doneRoutineTasks = ROUTINES.reduce((s, r) => s + r.tasks.filter((_, i) => routineChecks[`${r.id}_${i}`]).length, 0);

  // Todos
  const urgentFood = freezer.filter((f) => { const l = freshnessStatus(f.bestBefore).level; return l === "red" || l === "expired"; }).sort((a, b) => daysUntil(a.bestBefore) - daysUntil(b.bestBefore));
  const tomorrowName = new Date(Date.now() + 86400000).toLocaleDateString("de-DE", { weekday: "long" });
  const thawToday = (plan?.days || []).filter((d) => d.thawTonight && d.thawTonight.trim() && (d.day || "").toLowerCase().startsWith(tomorrowName.toLowerCase().slice(0, 2)));
  const todos = [];
  if (urgentFood.length > 0) todos.push({ icon: "🔴", text: `${urgentFood.length} Lebensmittel dringend aufbrauchen (${urgentFood.slice(0, 2).map((f) => f.name).join(", ")}${urgentFood.length > 2 ? "…" : ""})`, action: () => setTab("recipes"), btn: "Rezept" });
  thawToday.forEach((d) => todos.push({ icon: "❄", text: `Heute Abend auftauen für morgen: ${d.thawTonight}`, action: null }));
  if (lowStock.length > 0) todos.push({ icon: "⚠", text: `${lowStock.length} Vorrat fast leer — nachkaufen`, action: () => setTab("pantry"), btn: "Vorrat" });
  if (openShop > 0) todos.push({ icon: "🛒", text: `${openShop} offene Einkäufe auf der Liste`, action: () => setTab("shopping"), btn: "Einkauf" });

  const stats = [
    ["❄", freezer.length, "Gefrierschrank", "freezer"],
    ["▦", pantry.length, "Vorrat", "pantry"],
    ["✓", openShop, "offene Einkäufe", "shopping"],
  ];

  // ---- Spar-Berechnung ----
  // Heute gerettete Lebensmittel: Wert der ablaufenden Artikel
  const todaySaved = expiringThisWeek.reduce((sum, f) => {
    // Grobe Schätzung: Fleisch 4€, Milch 1.50€, Gemüse 1€, Rest 2€ pro Portion
    const catVal = { "Fleisch/Fisch": 4, "Milchprodukt (laktosefrei)": 1.5, "Gemüse": 1, "Stärke": 0.8, "Fertiggericht": 3, "Soße/Basis": 1.2, "Brot": 1, "Sonstiges": 1.5 };
    return sum + (catVal[f.cat] || 1.5);
  }, 0);

  // Woche gespart: Kosten der gekochten Rezepte vs. Restaurant (∅ 12€/Person)
  const cookedThisWeek = recipes.filter((r) => r.cookedCount > 0);
  const weekSaved = cookedThisWeek.reduce((sum, r) => {
    const homeCost = parseFloat(r.totalCost || "0") || (parseFloat(r.estCostPerMeal) || 4) * (r.portions || 3);
    const restaurantCost = 12 * (r.portions || 3);
    return sum + Math.max(0, restaurantCost - homeCost);
  }, 0);

  // Motivations-Streak: wie viele Tage in Folge hat sie gekocht (aus cookedCount-Daten)
  const totalCooked = recipes.reduce((s, r) => s + (r.cookedCount || 0), 0);

  return (
    <div className="kk-pop">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <div className="kk-b" style={{ fontSize: 14, opacity: 0.55 }}>
          {today.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        {hiddenCount > 0 && (
          <button onClick={showAll} className="kk-btn kk-b"
            style={{ fontSize: 12, color: ACCENT, background: "transparent", padding: "2px 8px", borderRadius: 8, border: `1px solid ${ACCENT}` }}>
            {hiddenCount} ausgeblendet · alle zeigen
          </button>
        )}
      </div>
      {/* Tages-Stimmungs-Banner */}
      {(() => {
        const tag = WEEKDAY_TAGS[todayName];
        if (!tag) return null;
        return (
          <div className="kk-b" style={{ display: "flex", alignItems: "center", gap: 8, background: tag.urgent ? ACCENT + "18" : SAGE + "12", border: `1px solid ${tag.urgent ? ACCENT + "33" : SAGE + "22"}`, borderRadius: 10, padding: "7px 12px", marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{tag.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: tag.urgent ? ACCENT : SAGE }}>{todayName} — {tag.label}</span>
            {tag.urgent && <span style={{ fontSize: 12, color: ACCENT }}>· {tag.urgent}</span>}
          </div>
        );
      })()}
      <SectionTitle>Guten Tag, Verena</SectionTitle>

      {/* WOCHENFORTSCHRITT */}
      {!hiddenCards["week"] && (
        <div style={{ position: "relative" }}>
          <HideBtn id="week" />
          <WeekProgressCard recipes={recipes} freezer={freezer} budget={null} setTab={setTab} />
        </div>
      )}

      {/* 🚨 NOTFALLMODUS */}
      <button onClick={() => setNotfallMode(!notfallMode)} className="kk-btn kk-b"        style={{ width: "100%", background: notfallMode ? "#8B1A1A" : ACCENT, color: "#fff", borderRadius: 14, padding: "15px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12, boxShadow: notfallMode ? "0 4px 20px rgba(200,30,30,0.4)" : `0 4px 16px ${ACCENT}55`, border: "none" }}>
        <span style={{ fontSize: 24 }}>🚨</span>
        <div style={{ textAlign: "left", flex: 1 }}>
          <div className="kk-h" style={{ fontSize: 19, fontWeight: 900, lineHeight: 1 }}>Ich bin fertig — gib mir was Einfaches</div>
          <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.85, marginTop: 3 }}>Max. 10 Min · 1 Topf · Kinderfreundlich · Kaum Abwasch</div>
        </div>
        <span style={{ fontSize: 20, opacity: 0.8 }}>{notfallMode ? "✕" : "→"}</span>
      </button>

      {/* Notfall-Ergebnisse */}
      {notfallMode && (
        <div className="kk-pop" style={{ marginBottom: 14 }}>
          <div className="kk-b" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: ACCENT, fontWeight: 700, marginBottom: 10 }}>
            🚨 Notfall-Gerichte — fertig in Minuten
          </div>
          {notfallOptions.map((r, i) => (
            <div key={i} className="kk-card" style={{ background: theme.CARD, border: `2px solid ${i === 0 ? ACCENT : theme.BORDER}`, borderRadius: 14, padding: "14px", marginBottom: 8, position: "relative" }}>
              {i === 0 && <div className="kk-b" style={{ position: "absolute", top: -1, right: 12, background: ACCENT, color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: "0 0 8px 8px" }}>EMPFOHLEN</div>}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ fontSize: 30, flexShrink: 0 }}>{r.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div className="kk-h" style={{ fontSize: 16, fontWeight: 700, color: theme.TEXT, marginBottom: 3 }}>{r.title}</div>
                  <div className="kk-b" style={{ fontSize: 14.5, color: theme.MUTED, lineHeight: 1.4, marginBottom: 8 }}>{r.desc}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span className="kk-b" style={{ background: SAGE + "22", color: SAGE, border: `1px solid ${SAGE}44`, borderRadius: 10, padding: "3px 9px", fontSize: 13, fontWeight: 700 }}>⏱ {r.min} Min</span>
                    <span className="kk-b" style={{ background: "#6E8CA022", color: "#6E8CA0", border: "1px solid #6E8CA044", borderRadius: 10, padding: "3px 9px", fontSize: 13, fontWeight: 700 }}>🧽 {r.pots === 0 ? "Kein Topf" : r.pots + " Topf"}</span>
                    <span className="kk-b" style={{ background: GOLD + "22", color: GOLD, border: `1px solid ${GOLD}44`, borderRadius: 10, padding: "3px 9px", fontSize: 13, fontWeight: 700 }}>👦👧 ✓</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => setTab("recipes")} className="kk-btn kk-b"
            style={{ background: theme.DEEP, color: theme.PAPER, padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 15, width: "100%", marginTop: 4 }}>
            ✦ KI-Expressrezept aus meinem Vorrat generieren →
          </button>
        </div>
      )}

      {/* WOW-HERO: Spar-Karte */}
      {!hiddenCards["hero"] && (
      <div style={{ position: "relative" }}>
        <button onClick={() => hideCard("hero")} className="kk-btn"
          style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, lineHeight: 1, padding: "2px 8px", borderRadius: 8, zIndex: 2, border: "none" }}>×</button>
      <div className="kk-card" style={{
        background: `linear-gradient(135deg, ${DEEP} 0%, #2A1F14 100%)`,
        borderRadius: 18, padding: "20px 18px", marginBottom: 14,
        boxShadow: `0 8px 24px rgba(0,0,0,0.18), 4px 4px 0 ${ACCENT}`,
        position: "relative", overflow: "hidden",
      }}>
        {/* Dekorativer Hintergrund-Kreis */}
        <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: ACCENT, opacity: 0.08 }} />
        <div style={{ position: "absolute", right: 20, bottom: -30, width: 80, height: 80, borderRadius: "50%", background: GOLD, opacity: 0.06 }} />

        <div className="kk-b" style={{ fontSize: 12.5, letterSpacing: 2, textTransform: "uppercase", color: GOLD, marginBottom: 8, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>◆ Küchen-Kommando · Deine Bilanz</span>
          <button onClick={() => setTab("gamification")} className="kk-btn kk-b"
            style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 16, padding: "4px 10px", fontSize: 13, color: GOLD, fontWeight: 700 }}>
            {currentLevel.emoji} Lv.{currentLevel.level} {currentLevel.title}
          </button>
        </div>

        {/* Haupt-Zahl */}
        {weekSaved > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <div className="kk-h" style={{ fontSize: 44, fontWeight: 900, color: GOLD, lineHeight: 1 }}>
                {weekSaved.toFixed(0)} €
              </div>
              <div className="kk-b" style={{ fontSize: 15, color: "rgba(255,255,255,0.7)" }}>gespart diese Woche</div>
            </div>
            <div className="kk-b" style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
              vs. Restaurant (∅ 12 € / Person) · {totalCooked}× selbst gekocht
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div className="kk-h" style={{ fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
              Starte jetzt —<br />spare bis zu 60 € / Woche
            </div>
            <div className="kk-b" style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
              vs. täglich auswärts essen
            </div>
          </div>
        )}

        {/* Trennlinie */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "10px 0" }} />

        {/* Zwei Unter-Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            {todaySaved > 0 ? (
              <>
                <div className="kk-h" style={{ fontSize: 24, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>
                  {todaySaved.toFixed(2).replace(".", ",")} €
                </div>
                <div className="kk-b" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                  ⚠️ heute noch retten
                </div>
              </>
            ) : (
              <>
                <div className="kk-h" style={{ fontSize: 24, fontWeight: 900, color: SAGE, lineHeight: 1 }}>✓</div>
                <div className="kk-b" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Nichts läuft ab</div>
              </>
            )}
          </div>
          <div>
            <div className="kk-h" style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
              {freezer.length}
            </div>
            <div className="kk-b" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              ❄ Portionen eingefroren
            </div>
          </div>
        </div>

        {/* Motivations-Zeile */}
        {todaySaved > 0 && (
          <button onClick={() => setTab("recipes")} className="kk-btn kk-b"
            style={{ background: ACCENT, color: "#fff", padding: "9px 16px", borderRadius: 20, fontWeight: 700, fontSize: 14.5, marginTop: 12, width: "100%" }}>
            ⚠️ Heute {todaySaved.toFixed(2).replace(".", ",")} € Lebensmittel retten →
          </button>
        )}
      </div>
      </div>
      )}

      {/* KI-COACH: Proaktive Vorschläge */}
      {!hiddenCards["coach"] && (
        <div style={{ position: "relative" }}>
          <HideBtn id="coach" />
          <KICoach shopping={shopping} freezer={freezer} pantry={pantry} plan={plan} recipes={recipes} household={household} setTab={setTab} />
        </div>
      )}

      {/* 1× KOCHEN = 2 GERICHTE HERO */}
      {!hiddenCards["doppel"] && (
        <div style={{ position: "relative" }}>
          <HideBtn id="doppel" />
          <DoppelHero plan={plan} recipes={recipes} setTab={setTab} />
        </div>
      )}

      {/* Zwei Schnell-Widgets nebeneinander */}
      {!hiddenCards["widgets"] && (
      <div style={{ position: "relative", marginBottom: 14 }}>
        <HideBtn id="widgets" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Was koche ich heute — Klick öffnet Rezept direkt */}
          <button onClick={() => onOpenRecipe ? onOpenRecipe(todayRecipe) : setTab(todayRecipe ? "recipes" : "week")} className="kk-btn kk-card"
            style={{ background: SAGE, color: "#fff", borderRadius: 14, padding: 0, textAlign: "left", border: "none", overflow: "hidden" }}>
            <div style={{ position: "relative", height: 90 }}>
              <FoodImage title={todayMeal?.meal || "home cooked meal"} height={90} radius="14px 14px 0 0" />
              <div style={{ position: "absolute", top: 8, left: 10 }}>
                <div className="kk-b" style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.5)" }}>{todayName}</div>
              </div>
            </div>
            <div style={{ padding: "10px 12px 12px" }}>
              <div className="kk-b" style={{ fontSize: 11, opacity: 0.75, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>🍳 Heute</div>
              <div className="kk-h" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
                {todayMeal ? todayMeal.meal.replace(/^[^\s]+\s/, "") : "Noch kein Plan"}
              </div>
              {todayMeal?.minutes && <div className="kk-b" style={{ fontSize: 12.5, opacity: 0.8, marginTop: 4 }}>⏱ {todayMeal.minutes} Min</div>}
              {todayRecipe && <div className="kk-b" style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>→ Rezept ansehen</div>}
            </div>
          </button>

          {/* Routinen-Widget */}
          <button onClick={() => setTab("routines")} className="kk-btn kk-card"
            style={{ background: doneRoutineTasks === totalRoutineTasks && totalRoutineTasks > 0 ? GOLD : theme.CARD, color: doneRoutineTasks === totalRoutineTasks && totalRoutineTasks > 0 ? DEEP : theme.TEXT, borderRadius: 14, padding: "14px 12px", textAlign: "left", border: `2px solid ${theme.BORDER}` }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>✔</div>
            <div className="kk-b" style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Routinen heute</div>
            <div className="kk-h" style={{ fontSize: 24, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>
              {doneRoutineTasks}<span style={{ fontSize: 15, fontWeight: 400, opacity: 0.6 }}>/{totalRoutineTasks}</span>
            </div>
            <div style={{ background: theme.DOT, borderRadius: 6, height: 6, margin: "6px 0 4px", overflow: "hidden" }}>
              <div style={{ width: `${totalRoutineTasks > 0 ? (doneRoutineTasks / totalRoutineTasks) * 100 : 0}%`, height: "100%", background: ACCENT, borderRadius: 6 }} />
            </div>
            <div className="kk-b" style={{ fontSize: 12, opacity: 0.7 }}>
              {doneRoutineTasks === totalRoutineTasks && totalRoutineTasks > 0 ? "✓ Alles erledigt!" : "→ Weiter"}
            </div>
          </button>
        </div>
      </div>
      )}

      {/* Schnell-Einfrieren */}
      {todayMeal && (
        <button onClick={() => setShowFreeze(!showFreeze)} className="kk-btn kk-b"
          style={{ background: showFreeze ? "#6E8CA0" : "transparent", color: showFreeze ? "#fff" : "#6E8CA0", border: `2px solid #6E8CA0`, borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 15, width: "100%", marginBottom: 4 }}>
          ❄ Reste von heute einfrieren
        </button>
      )}
      {showFreeze && (
        <FreezeAssistant
          suggestedName={todayMeal ? `${todayMeal.meal.replace(/^[^\s]+\s/, "")} (Reste)` : ""}
          freezer={freezer}
          setFreezer={setFreezer}
          onClose={() => setShowFreeze(false)}
        />
      )}

      {/* FOOD WASTE ZERO — ablaufende Artikel retten */}
      {!hiddenCards["waste"] && urgentFood.length > 0 && (
        <div style={{ position: "relative" }}>
          <HideBtn id="waste" />
          <div className="kk-card" style={{ background: `linear-gradient(135deg, #8B1A1A, #C0392B)`, color: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 26 }}>🚨</span>
              <div>
                <div className="kk-h" style={{ fontSize: 18, fontWeight: 900 }}>Food Waste Zero</div>
                <div className="kk-b" style={{ fontSize: 13, opacity: 0.85 }}>{urgentFood.length} Artikel laufen bald ab — jetzt retten!</div>
              </div>
            </div>
            {urgentFood.slice(0, 3).map((f, i) => {
              const fs = freshnessStatus(f.bestBefore);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                  <span className="kk-b" style={{ fontSize: 14 }}>{f.name}</span>
                  <span className="kk-b" style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                    {fs.days <= 0 ? "⚫ abgelaufen" : `⏰ noch ${fs.days} Tag${fs.days === 1 ? "" : "e"}`}
                  </span>
                </div>
              );
            })}
            <button onClick={() => setTab("recipes")} className="kk-btn kk-b"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 10, padding: "10px", fontWeight: 700, fontSize: 14, width: "100%", marginTop: 12 }}>
              ✦ Rettungsrezept aus diesen Zutaten generieren →
            </button>
          </div>
        </div>
      )}

      {/* Heute zu erledigen */}
      <div className="kk-card" style={{ background: todos.length ? theme.DEEP : theme.CARD, color: todos.length ? theme.PAPER : theme.TEXT, border: `2px solid ${theme.DEEP}`, borderRadius: 14, padding: 16, marginBottom: 18, boxShadow: todos.length ? `4px 4px 0 ${ACCENT}` : "none" }}>
        <div className="kk-b" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: todos.length ? GOLD : SAGE, marginBottom: 10, fontWeight: 700 }}>
          ◆ Heute zu erledigen
        </div>
        {todos.length === 0 ? (
          <div className="kk-b" style={{ fontSize: 15.5 }}>Alles im grünen Bereich — nichts Dringendes heute. ✓</div>
        ) : (
          todos.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < todos.length - 1 ? "1px solid rgba(255,255,255,.12)" : "none" }}>
              <span style={{ fontSize: 17 }}>{t.icon}</span>
              <span className="kk-b" style={{ fontSize: 15, flex: 1, lineHeight: 1.4 }}>{t.text}</span>
              {t.action && <button onClick={t.action} className="kk-btn kk-b" style={{ background: ACCENT, color: "#fff", padding: "5px 12px", borderRadius: 16, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{t.btn} →</button>}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
        {stats.map(([icon, n, label, t], i) => (
          <button key={i} onClick={() => setTab(t)} className="kk-btn kk-card"
            style={{ background: theme.CARD, border: `2px solid ${theme.DEEP}`, borderRadius: 14, padding: "16px 10px", textAlign: "left" }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div className="kk-h" style={{ fontSize: 32, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>{n}</div>
            <div className="kk-b" style={{ fontSize: 12.5, opacity: 0.65, marginTop: 4 }}>{label}</div>
          </button>
        ))}
      </div>

      {lowStock.length > 0 && (
        <Card highlight>
          <div className="kk-b" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>⚠ Vorrat fast leer — nachkaufen</div>
          {lowStock.map((p) => {
            const already = shopping.some((s) => s.name === p.name && !s.done);
            return (
              <div key={p.id} className="kk-b" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #00000010", fontSize: 15 }}>
                <span>{p.name} <span style={{ opacity: 0.5 }}>· {p.qty}</span></span>
                <button onClick={() => addLowToShopping(p)} disabled={already} className="kk-btn kk-b"
                  style={{ background: already ? SAGE : DEEP, color: PAPER, padding: "5px 12px", borderRadius: 16, fontSize: 13, fontWeight: 600 }}>
                  {already ? "✓ auf Liste" : "+ Einkauf"}
                </button>
              </div>
            );
          })}
        </Card>
      )}

      {plan && (
        <Card>
          <div className="kk-b" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: SAGE, marginBottom: 6 }}>Aktueller Wochenplan</div>
          <div className="kk-h" style={{ fontSize: 22, fontWeight: 600 }}>{plan.title}</div>
          <p className="kk-b" style={{ fontSize: 15, opacity: 0.75, marginTop: 6 }}>{plan.summary}</p>
          <button className="kk-btn kk-b" onClick={() => setTab("plan")}
            style={{ marginTop: 10, background: DEEP, color: PAPER, padding: "8px 16px", borderRadius: 20, fontSize: 14, fontWeight: 600 }}>
            Plan ansehen →
          </button>
        </Card>
      )}

      <Card>
        <div className="kk-b" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>⚠ Bald aufbrauchen</div>
        {expiring.length === 0 ? (
          <div className="kk-b" style={{ fontSize: 15, opacity: 0.5 }}>Nichts läuft demnächst ab. ✓</div>
        ) : expiring.slice(0, 5).map((f) => (
          <div key={f.id} className="kk-b" style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #00000010", fontSize: 15 }}>
            <span>{f.name} <span style={{ opacity: 0.5 }}>· {f.qty}</span></span>
            <span style={{ color: daysUntil(f.bestBefore) <= 7 ? ACCENT : SAGE, fontWeight: 600 }}>{daysUntil(f.bestBefore)} Tage</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ---------------- Pantry (Trockenvorrat) ----------------
function Pantry({ pantry, setPantry, shopping, setShopping }) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const [cat, setCat] = useState("Getreide & Nudeln");
  const [editId, setEditId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editUnit, setEditUnit] = useState("g");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const detectorRef = React.useRef(null);
  const scanIntervalRef = React.useRef(null);

  async function loadZXing() {
    if (window.__ZXing__) return window.__ZXing__;
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js";
      s.onload = () => { window.__ZXing__ = window.ZXing; resolve(window.ZXing); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function startScan() {
    setScanning(true);
    setScanMsg("Lade Scanner…");
    try {
      const ZXing = await loadZXing();
      const hints = new Map();
      const formats = [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
      ];
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
      const reader = new ZXing.BrowserMultiFormatReader(hints);
      detectorRef.current = reader;
      setScanMsg("Barcode vor die Kamera halten…");
      await reader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          stopScan();
          lookupBarcode(result.getText());
        }
      });
    } catch(e) {
      setScanMsg("Kamera-Zugriff verweigert oder nicht verfügbar.");
      setTimeout(() => stopScan(), 2500);
    }
  }

  function stopScan() {
    setScanning(false);
    if (detectorRef.current?.reset) detectorRef.current.reset();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function lookupBarcode(barcode) {
    setScanMsg(`Suche Produkt für ${barcode}…`);
    setScanning(false);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,quantity,product_name_de,categories_tags`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const productName = p.product_name_de || p.product_name || "";
        const quantity = p.quantity || "";
        // Parse quantity like "500 g" or "1 kg"
        const qMatch = quantity.match(/([d.,]+)s*(g|kg|ml|l|cl)/i);
        if (qMatch) {
          setAmount(qMatch[1].replace(",", "."));
          setUnit(qMatch[2].toLowerCase() === "cl" ? "ml" : qMatch[2].toLowerCase());
        }
        setName(productName);
        // Auto-detect category from tags
        const tags = (p.categories_tags || []).join(" ").toLowerCase();
        if (tags.includes("pasta") || tags.includes("noodle") || tags.includes("nudel") || tags.includes("rice") || tags.includes("reis") || tags.includes("mehl") || tags.includes("flour") || tags.includes("cereal")) setCat("Getreide & Nudeln");
        else if (tags.includes("milk") || tags.includes("milch") || tags.includes("yogurt") || tags.includes("joghurt") || tags.includes("cheese") || tags.includes("käse")) setCat("Milchprodukt (laktosefrei)");
        else if (tags.includes("canned") || tags.includes("konserv") || tags.includes("tomato") || tags.includes("tomate") || tags.includes("bean") || tags.includes("bohne")) setCat("Konserven & Gläser");
        else if (tags.includes("oil") || tags.includes("öl") || tags.includes("spice") || tags.includes("gewürz") || tags.includes("sauce")) setCat("Öle & Gewürze");
        else if (tags.includes("bread") || tags.includes("brot") || tags.includes("biscuit") || tags.includes("keks")) setCat("Brot & Backwaren");
        else if (tags.includes("meat") || tags.includes("fleisch") || tags.includes("fish") || tags.includes("fisch")) setCat("Fleisch & Fisch");
        setScanMsg(`✓ Gefunden: ${productName}`);
        setTimeout(() => setScanMsg(""), 3000);
      } else {
        setScanMsg("Produkt nicht gefunden — bitte manuell eingeben.");
        setTimeout(() => setScanMsg(""), 3000);
      }
    } catch(e) {
      setScanMsg("Fehler beim Suchen — bitte manuell eingeben.");
      setTimeout(() => setScanMsg(""), 3000);
    }
  }

  function add() {
    if (!name.trim()) return;
    const qty = amount.trim() ? `${amount.trim()} ${unit}` : unit;
    setPantry([...pantry, { id: Date.now(), name: name.trim(), qty, amount: parseFloat(amount) || 0, unit, cat, low: false }]);
    setName(""); setAmount("");
  }

  function remove(id) { setPantry(pantry.filter((p) => p.id !== id)); }
  function toggleLow(id) { setPantry(pantry.map((p) => p.id === id ? { ...p, low: !p.low } : p)); }

  function saveEdit(id) {
    const qty = editAmount.trim() ? `${editAmount.trim()} ${editUnit}` : editUnit;
    setPantry(pantry.map((p) => p.id === id ? { ...p, qty, amount: parseFloat(editAmount) || 0, unit: editUnit } : p));
    setEditId(null);
  }

  function addToShopping(p) {
    if (shopping.some((s) => s.name === p.name && !s.done)) return;
    setShopping([...shopping, { id: Date.now(), name: p.name, amount: p.qty || "", cat: p.cat || "Sonstiges", done: false }]);
  }

  const inpStyle = { ...inp, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` };
  const grouped = PANTRY_CATEGORIES.map((c) => [c, pantry.filter((p) => p.cat === c.key)]).filter(([, arr]) => arr.length);

  return (
    <div className="kk-pop">
      <SectionTitle>Vorratsschrank</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 14, opacity: 0.7, marginBottom: 12, color: theme.TEXT }}>
          Nudeln, Reis, Konserven, Öl, Gewürze — alles Haltbare hier eintragen.
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Was? z.B. Basmati-Reis" style={inpStyle} />
          <div style={{ display: "flex", gap: 6 }}>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Menge" style={{ ...inpStyle, flex: 1, minWidth: 0 }} type="number" min="0" />
            <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...inpStyle, flex: "0 0 80px" }}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
            <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inpStyle, flex: 2, minWidth: 0, fontSize: 13 }}>
              {PANTRY_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={add} className="kk-btn kk-b" style={{ flex: 1, background: ACCENT, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 16 }}>
              + In den Vorrat
            </button>
            <button onClick={scanning ? stopScan : startScan} className="kk-btn kk-b"
              style={{ background: scanning ? SAGE : theme.CARD, color: scanning ? "#fff" : theme.TEXT, border: `1.5px solid ${scanning ? SAGE : theme.BORDER}`, padding: "11px 14px", borderRadius: 10, fontWeight: 700, fontSize: 18 }}>
              {scanning ? "⏹" : "📷"}
            </button>
          </div>
        </div>

        {/* Barcode Scanner Video */}
        {scanning && (
          <div style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", position: "relative", background: "#000" }}>
            <video ref={videoRef} style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} playsInline muted />
            <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center" }}>
              <div className="kk-b" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", padding: "6px 14px", borderRadius: 20, display: "inline-block", fontSize: 13 }}>
                {scanMsg || "Barcode vor die Kamera halten…"}
              </div>
            </div>
            <div style={{ position: "absolute", top: "50%", left: "10%", right: "10%", height: 2, background: ACCENT, opacity: 0.8, transform: "translateY(-50%)" }} />
          </div>
        )}
        {scanMsg && !scanning && (
          <div className="kk-b" style={{ marginTop: 8, fontSize: 13, color: scanMsg.startsWith("✓") ? SAGE : ACCENT, fontWeight: 600 }}>{scanMsg}</div>
        )}
      </Card>

      {grouped.length === 0 ? (
        <div className="kk-b" style={{ textAlign: "center", opacity: 0.5, padding: 30, fontSize: 15, color: theme.TEXT }}>Noch leer — füge oben den ersten Artikel hinzu.</div>
      ) : grouped.map(([c, arr]) => (
        <div key={c.key} style={{ marginBottom: 14 }}>
          <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: c.color, marginBottom: 6 }}>
            {c.label} <span style={{ opacity: 0.5 }}>({arr.length})</span>
          </div>
          {arr.map((p) => (
            <div key={p.id} className="kk-card" style={{ background: p.low ? ACCENT + "12" : theme.CARD, border: `1.5px solid ${p.low ? ACCENT : theme.BORDER}`, borderLeft: `4px solid ${c.color}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="kk-b" style={{ fontSize: 15, fontWeight: 600, color: theme.TEXT }}>
                    {p.name} {p.low && <span style={{ color: ACCENT, fontSize: 12 }}>⚠ fast leer</span>}
                  </div>
                  {editId === p.id ? (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="Menge" type="number" style={{ ...inpStyle, fontSize: 14, padding: "5px 8px", flex: 1 }} />
                      <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)} style={{ ...inpStyle, fontSize: 13, padding: "5px 6px", flex: "0 0 70px" }}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <button onClick={() => saveEdit(p.id)} className="kk-btn kk-b" style={{ background: SAGE, color: "#fff", padding: "5px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>✓</button>
                      <button onClick={() => setEditId(null)} className="kk-btn kk-b" style={{ color: theme.MUTED, padding: "5px 8px", fontSize: 13 }}>×</button>
                    </div>
                  ) : (
                    <div className="kk-b" style={{ fontSize: 13, color: p.qty ? SAGE : theme.MUTED, fontWeight: p.qty ? 600 : 400 }}>
                      {p.qty || "Menge nicht angegeben"}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => { setEditId(p.id); setEditAmount(String(p.amount || "")); setEditUnit(p.unit || "g"); }} className="kk-btn kk-b" style={{ background: "transparent", color: GOLD, border: `1.5px solid ${GOLD}`, borderRadius: 14, fontSize: 13, fontWeight: 700, padding: "4px 9px" }}>✏</button>
                  <button onClick={() => toggleLow(p.id)} className="kk-btn kk-b" style={{ background: p.low ? ACCENT : "transparent", color: p.low ? "#fff" : ACCENT, border: `1.5px solid ${ACCENT}`, borderRadius: 14, fontSize: 13, padding: "4px 9px" }}>⚠</button>
                  {p.low && <button onClick={() => addToShopping(p)} className="kk-btn kk-b" style={{ background: theme.DEEP, color: theme.PAPER, borderRadius: 14, fontSize: 12, fontWeight: 600, padding: "4px 8px" }}>+ Einkauf</button>}
                  <button onClick={() => remove(p.id)} className="kk-btn kk-b" style={{ color: ACCENT, fontSize: 20, padding: "0 4px" }}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------- Freezer ----------------
function Freezer({ freezer, setFreezer, setTab, diet, health, kidsProfile, household }) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [bb, setBb] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const camRef = React.useRef(null);
  const galRef = React.useRef(null);
  const [resteIdea, setResteIdea] = useState("");
  const [resteLoading, setResteLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editBb, setEditBb] = useState("");

  function saveEdit(id) {
    setFreezer(freezer.map(f => f.id === id ? { ...f, name: editName, qty: editQty, bestBefore: editBb || null } : f));
    setEditId(null);
  }

  function add() {
    if (!name.trim()) return;
    setFreezer([...freezer, { id: Date.now(), name: name.trim(), qty: qty.trim() || "1 Portion", cat, bestBefore: bb || null }]);
    setName(""); setQty(""); setBb("");
  }
  function remove(id) { setFreezer(freezer.filter((f) => f.id !== id)); }

  function shareInventar() {
    if (freezer.length === 0) { setShareMsg("TK ist leer."); return; }
    const sorted = [...freezer].sort((a,b) => {
      const da = a.bestBefore ? daysUntil(a.bestBefore) : 999;
      const db = b.bestBefore ? daysUntil(b.bestBefore) : 999;
      return da - db;
    });
    let text = "❄ TK-Inventar:\n";
    sorted.forEach(f => {
      const fs = f.bestBefore ? freshnessStatus(f.bestBefore) : null;
      const mhd = fs ? ` (${fs.dot} ${fs.label})` : "";
      text += `• ${f.name} — ${f.qty}${mhd}\n`;
    });
    if (navigator.share) {
      navigator.share({ title: "TK-Inventar", text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        setShareMsg("✓ Inventar kopiert!"); setTimeout(() => setShareMsg(""), 2000);
      });
    }
  }

  async function generateResteIdee() {
    setResteLoading(true); setResteIdea("");
    const items = freezer.map(f => f.name).join(", ");
    const prompt = `Ich habe folgendes im Gefrierschrank: ${items}. ${dietRules(diet)} ${healthRules(health)} ${kidsRules(kidsProfile)}
Was kann ich daraus heute schnell kochen? Gib mir 3 kreative Ideen in 1-2 Sätzen je. Kurz, praktisch, kinderfreundlich. Kein JSON, nur Text.`;
    try {
      const txt = await askClaude(prompt, 600);
      setResteIdea(txt);
    } catch { setResteIdea("Konnte keine Ideen generieren."); }
    setResteLoading(false);
  }
  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true); setScanMsg("");
    try {
      const { data, mediaType } = await fileToBase64(file);
      const res = await readDateFromImage(data, mediaType);
      if (res.date) {
        setBb(res.date);
        if (res.product && !name.trim()) setName(res.product);
        setScanMsg(`✓ MHD erkannt: ${formatDate(res.date)}${res.product ? ` · ${res.product}` : ""} (${res.confidence})`);
      } else {
        setScanMsg("Kein Datum erkannt — bitte manuell eintragen oder schärferes Foto.");
      }
    } catch (err) {
      setScanMsg("Scan fehlgeschlagen — bitte erneut oder Datum manuell.");
    }
    setScanning(false);
  }

  const grouped = CATEGORIES.map((c) => [c, freezer.filter((f) => f.cat === c)]).filter(([, arr]) => arr.length);
  const atRiskItems = freezer.filter((f) => { const l = freshnessStatus(f.bestBefore).level; return l === "red" || l === "orange" || l === "expired"; })
    .sort((a, b) => daysUntil(a.bestBefore) - daysUntil(b.bestBefore));

  return (
    <div className="kk-pop">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionTitle>Gefrierschrank-Inventar</SectionTitle>
        <button onClick={shareInventar} className="kk-btn kk-b"
          style={{ background: "transparent", color: "#6E8CA0", border: `1.5px solid #6E8CA0`, borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ↗ Teilen
        </button>
      </div>
      {shareMsg && <div className="kk-b" style={{ fontSize: 13, color: SAGE, fontWeight: 600, marginBottom: 8 }}>{shareMsg}</div>}

      {/* Reste-KI */}
      {freezer.length > 0 && (
        <Card>
          <div className="kk-b" style={{ fontSize: 13.5, color: theme.TEXT, marginBottom: 8 }}>
            🤔 Was kann ich aus meinem TK heute kochen?
          </div>
          <button onClick={generateResteIdee} disabled={resteLoading} className="kk-btn kk-b"
            style={{ background: resteLoading ? SAGE : "#6E8CA0", color: "#fff", padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 14, width: "100%", marginBottom: resteIdea ? 10 : 0 }}>
            {resteLoading ? <><span className="kk-spin">✦</span> Ideen werden generiert…</> : "✦ KI-Ideen aus meinem Bestand"}
          </button>
          {resteIdea && (
            <div className="kk-b" style={{ fontSize: 14, color: theme.TEXT, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{resteIdea}</div>
          )}
        </Card>
      )}

      {atRiskItems.length > 0 && (
        <div className="kk-card" style={{ background: DEEP, color: PAPER, borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: `4px 4px 0 ${ACCENT}` }}>
          <div className="kk-h" style={{ fontSize: 16, fontWeight: 900 }}>⚠ {atRiskItems.length} {atRiskItems.length === 1 ? "Lebensmittel läuft" : "Lebensmittel laufen"} bald ab</div>
          <div className="kk-b" style={{ fontSize: 14.5, opacity: 0.85, margin: "6px 0 10px", lineHeight: 1.5 }}>
            {atRiskItems.slice(0, 3).map((f) => `${f.name} (${freshnessStatus(f.bestBefore).days < 0 ? "abgelaufen" : freshnessStatus(f.bestBefore).days + " T."})`).join(" · ")}
            {atRiskItems.length > 3 ? ` · +${atRiskItems.length - 3} mehr` : ""}
          </div>
          <button onClick={() => setTab && setTab("recipes")} className="kk-btn kk-b"
            style={{ background: ACCENT, color: "#fff", padding: "10px 18px", borderRadius: 22, fontWeight: 700, fontSize: 15.5 }}>
            🍳 Rette mein Essen → Rezept finden
          </button>
        </div>
      )}

      <Card>
        <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{ display: "none" }} />
        <input ref={galRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={() => camRef.current?.click()} disabled={scanning} className="kk-btn kk-b"
            style={{ flex: 1, background: scanning ? SAGE : DEEP, color: PAPER, padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
            {scanning ? <><span className="kk-spin">✦</span> liest MHD…</> : "▣ MHD fotografieren"}
          </button>
          <button onClick={() => galRef.current?.click()} disabled={scanning} className="kk-btn kk-b"
            style={{ flex: 1, background: "transparent", color: DEEP, border: `2px solid ${DEEP}`, padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
            ⬆ Foto hochladen
          </button>
        </div>
        {scanMsg && <div className="kk-b" style={{ fontSize: 14, color: scanMsg.startsWith("✓") ? SAGE : ACCENT, marginBottom: 10, fontWeight: 600 }}>{scanMsg}</div>}
        <div style={{ display: "grid", gap: 8 }}>
          <input className="kk-inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Was? z.B. Hähnchen-Curry" style={inp} />
          <div style={{ display: "flex", gap: 8 }}>
            <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Menge / Portionen" style={{ ...inp, flex: 1 }} />
            <input type="date" value={bb} onChange={(e) => setBb(e.target.value)} style={{ ...inp, flex: 1 }} />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={inp}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button onClick={add} className="kk-btn kk-b" style={{ background: ACCENT, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 16 }}>
            + In den Gefrierschrank
          </button>
        </div>
      </Card>

      {grouped.length === 0 ? (
        <div className="kk-b" style={{ textAlign: "center", opacity: 0.5, padding: 30, fontSize: 15 }}>Noch leer — füge oben den ersten Artikel hinzu.</div>
      ) : grouped.map(([c, arr]) => (
        <div key={c} style={{ marginBottom: 14 }}>
          <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: CAT_COLORS[c], marginBottom: 6 }}>
            {c} <span style={{ opacity: 0.5 }}>({arr.length})</span>
          </div>
          {arr.map((f) => {
            const fs = freshnessStatus(f.bestBefore);
            const atRisk = fs.level === "red" || fs.level === "orange" || fs.level === "expired";
            return (
              <div key={f.id} className="kk-card" style={{ background: fs.level === "green" ? "#EFF6EE" : fs.level === "orange" ? "#FFF8EE" : (fs.level === "red" || fs.level === "expired") ? "#FCEEEC" : theme.CARD, border: `1.5px solid ${fs.level === "green" ? "#5C6B5244" : atRisk ? fs.color : theme.BORDER}`, borderLeft: `5px solid ${fs.level === "none" ? CAT_COLORS[c] : fs.color}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
                {editId === f.id ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" style={{ ...inp, fontSize: 14, padding: "6px 10px", background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }} />
                    <input value={editQty} onChange={e => setEditQty(e.target.value)} placeholder="Menge z.B. 500g" style={{ ...inp, fontSize: 14, padding: "6px 10px", background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }} />
                    <input type="date" value={editBb} onChange={e => setEditBb(e.target.value)} style={{ ...inp, fontSize: 14, padding: "6px 10px", background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => saveEdit(f.id)} className="kk-btn kk-b" style={{ flex: 1, background: SAGE, color: "#fff", padding: "7px", borderRadius: 8, fontWeight: 700 }}>✓ Speichern</button>
                      <button onClick={() => setEditId(null)} className="kk-btn kk-b" style={{ background: "transparent", color: theme.MUTED, padding: "7px 12px", borderRadius: 8 }}>× Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div className="kk-b" style={{ fontSize: 16, fontWeight: 600 }}>
                        <span style={{ fontSize: 12, marginRight: 5 }}>{fs.dot}</span>{f.name}
                      </div>
                      <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.6 }}>
                        {f.qty}{f.bestBefore ? ` · MHD ${formatDate(f.bestBefore)}` : ""}
                      </div>
                    </div>
                    {f.bestBefore && (
                      <span className="kk-b" style={{ fontSize: 13, fontWeight: 700, color: fs.color, background: "#fff", border: `1px solid ${fs.color}`, borderRadius: 12, padding: "3px 8px", marginRight: 8, whiteSpace: "nowrap" }}>
                        {fs.label}
                      </span>
                    )}
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { setEditId(f.id); setEditName(f.name); setEditQty(f.qty || ""); setEditBb(f.bestBefore || ""); }} className="kk-btn kk-b" style={{ background: "transparent", color: GOLD, border: `1.5px solid ${GOLD}`, borderRadius: 14, fontSize: 13, fontWeight: 700, padding: "4px 9px" }}>✏</button>
                      <button onClick={() => remove(f.id)} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, fontSize: 22, padding: "0 6px", lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------- KI-Rezepte ----------------
function Recipes({ freezer, setFreezer, pantry, setPantry, recipes, setRecipes, diet, health, kidsProfile, household }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [extra, setExtra] = useState("");
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [cookingId, setCookingId] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [searchQ, setSearchQ] = useState("");
  const swipeStart = React.useRef(null);
  const theme = useTheme();

  const result = results[activeIdx] || null;

  const sortedRecipes = [...recipes]
    .filter(r => !searchQ || r.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      (r.ingredients || []).some(i => i.item?.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === "fav") return (b.fav ? 1 : 0) - (a.fav ? 1 : 0);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "kids") return (b.kidsLoved ? 1 : 0) - (a.kidsLoved ? 1 : 0);
      if (sortBy === "cooked") return (b.cookedCount || 0) - (a.cookedCount || 0);
      return b.id - a.id;
    });

  async function generate() {
    setBusy(true); setErr(""); setResults([]); setActiveIdx(0);
    const stock = freezer.length ? freezer.map((f) => { const fs = freshnessStatus(f.bestBefore); return `${f.name} (${f.qty}, ${f.cat}${f.bestBefore ? `, MHD in ${fs.days} Tagen` : ""})`; }).join("; ") : "leer";
    const pant = pantry.length ? pantry.map((p) => `${p.name} (${p.qty})`).join("; ") : "leer";
    const totalPersons = (household?.adults || 1) + (household?.kids?.length || 0);
    const varieties = ["mediterran", "asiatisch inspiriert", "deutsch-deftig", "mexikanisch", "indisch gewürzt", "nordisch-schlicht", "orientalisch"].sort(() => Math.random() - 0.5).slice(0, 3);
    const recentTitles = recipes.slice(0, 5).map(r => r.title).join(", ");

    const urgentItems = freezer.filter(f => f.bestBefore && daysUntil(f.bestBefore) <= 5 && daysUntil(f.bestBefore) >= 0);
    const urgentStr = urgentItems.length > 0 ? `\n🚨 DRINGEND RETTEN (läuft in ≤5 Tagen ab): ${urgentItems.map(f => `${f.name} (noch ${daysUntil(f.bestBefore)} Tage!)`).join(", ")} — MUSS im Rezept verwendet werden.` : "";

    // 3 Vorschläge parallel generieren
    const makePrompt = (variety) => `Du bist ein Profi-Küchenchef und Meal-Prep-Experte. ${householdRules(household)} ${dietRules(diet)} ${healthRules(health)} ${kidsRules(kidsProfile)} Budget 7–9 € pro Mahlzeit, alltagstauglich.

ZWINGEND PORTIONEN: Exakt ${totalPersons} Portionen — nicht mehr, nicht weniger.
ZWINGEND VARIATION: Heute ${variety} — andere Hauptzutat als: ${recentTitles || "keine"}.
ZWINGEND KEINE WIEDERHOLUNG: Kein Gericht mit Linsen oder Süßkartoffeln wenn kürzlich verwendet.
ZWINGEND MENGEN: Jede Zutat mit EXAKTER Menge — "400 ml Wasser" nicht "Wasser", "3 EL Olivenöl" nicht "Öl", "1 TL Meersalz" nicht "Salz". Flüssigkeiten in ml, Festes in g/Stück/EL/TL.
ZWINGEND PROFI-TRICKS: 1-2 Profi-Hinweise in den Schritten die das Gericht besonders machen — z.B. "Tomatenmark 1 Min anrösten bis dunkler — gibt Tiefe", "erst rühren wenn Fleisch sich löst", "Spritzer Zitrone vor dem Servieren hebt alle Aromen", "Zwiebeln 8 Min bei niedriger Hitze karamellisieren".
${urgentStr}

PRIORITÄT 1 (KRITISCH): Ablaufende Artikel MÜSSEN verwendet werden — plane rückwärts von diesen Zutaten.
PRIORITÄT 2: Alle weiteren Gefrierschrank-Artikel mit MHD zuerst, dann Vorrat.
PRIORITÄT 3: Max. 1-2 Töpfe/Pfannen.
PRIORITÄT 4: Kinder essen es gerne.

Gefrierschrank: ${stock}.
Vorrat: ${pant}.
Wunsch: ${extra || "keiner"}.

EIN Batch-Rezept für ${totalPersons} Personen, mehrere Tage haltbar.

Nur JSON, kein Markdown:
{"title":"...","portions":${totalPersons},"prepMinutes":Zahl,"reuse":"Reste-Idee für Folgetage","ingredients":[{"item":"Name","amount":"EXAKT z.B. 400g oder 200ml oder 3 EL","fromFreezer":true/false}],"steps":["Schritt mit exakten Mengen und Profi-Tipp"],"totalCost":"z.B. 12.50","costPerPortion":"z.B. 2.10","estCostPerMeal":"x–y €","nutrition":{"kcal":Zahl,"protein":Zahl,"carbs":Zahl,"fat":Zahl},"savedFromWaste":["welche Artikel gerettet wurden"]}`;

    try {
      const generated = [];
      for (let i = 0; i < 3; i++) {
        try {
          const txt = await askClaude(makePrompt(varieties[i]));
          const r = parseJSON(txt);
          if (r?.title) generated.push(r);
        } catch {}
        if (generated.length > 0) setResults([...generated]); // zeige sofort erstes
      }
      if (generated.length === 0) setErr("KI-Rezept konnte nicht erstellt werden. Bitte erneut versuchen.");
      setResults(generated);
    } catch (e) {
      setErr("KI-Rezept konnte nicht erstellt werden. Bitte erneut versuchen.");
    }
    setBusy(false);
  }

  const [saved, setSaved] = useState(false);

  function save() {
    if (!result) return;
    const appliedProfiles = [
      ...HEALTH_OPTIONS.filter((o) => health[o.key]).map((o) => `${o.emoji} ${o.label}`),
      ...KIDS_PROFILES.filter((o) => kidsProfile[o.key]).map((o) => `${o.emoji} ${o.label}`),
      ...(diet.laktosefrei ? ["🥛 Laktosefrei"] : []),
      ...(diet.glutenfrei ? ["🌾 Glutenfrei"] : []),
    ];
    const newRecipe = { ...result, id: Date.now(), cookedCount: 0, fav: false, rating: 0, kidsLoved: false, appliedProfiles };
    setRecipes(prev => [newRecipe, ...prev]);
    setSaved(true);
    setTimeout(() => { setResults([]); setActiveIdx(0); setExtra(""); setSaved(false); }, 1500);
  }

  return (
    <div className="kk-pop">
      <SectionTitle>KI-Rezeptgenerator</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 15, opacity: 0.75, marginBottom: 10 }}>
          Claude erstellt live ein Batch-Rezept aus Gefrierbestand ({freezer.length}) + Vorrat ({pantry.length}) — laktosefrei, 7–9 €/Mahlzeit.
        </div>
        <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Optional: Wunsch, z.B. 'schnell', 'vegetarisch', 'mit Reis'" style={{ ...inp, marginBottom: 8 }} />
        <button onClick={generate} disabled={busy} className="kk-btn kk-b"
          style={{ background: busy ? SAGE : ACCENT, color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 16, width: "100%" }}>
          {busy ? <><span className="kk-spin">✦</span> Claude kocht mit…</> : "✦ Rezept generieren"}
        </button>
        {err && <div className="kk-b" style={{ color: ACCENT, fontSize: 14, marginTop: 8 }}>{err}</div>}
      </Card>

      {/* Busy: erstes Rezept lädt */}
      {busy && results.length === 0 && (
        <Card>
          <div className="kk-b" style={{ textAlign: "center", padding: "20px 0", color: theme.MUTED }}>
            <span className="kk-spin" style={{ fontSize: 22, display: "block", marginBottom: 8 }}>✦</span>
            Claude kocht 3 Vorschläge…
          </div>
        </Card>
      )}

      {/* Karussell */}
      {results.length > 0 && (
        <div>
          {/* Dots Navigation */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10, alignItems: "center" }}>
            {results.map((_, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} className="kk-btn"
                style={{ width: i === activeIdx ? 28 : 10, height: 10, borderRadius: 5, background: i === activeIdx ? ACCENT : theme.DOT, border: "none", transition: "all .25s ease", padding: 0 }} />
            ))}
            {busy && <span className="kk-spin kk-b" style={{ fontSize: 13, color: theme.MUTED }}>+</span>}
          </div>

          {/* Aktive Karte mit Swipe */}
          <Card highlight>
            <div className="kk-b" style={{ fontSize: 12, color: theme.MUTED, textAlign: "center", marginBottom: 8 }}>
              Vorschlag {activeIdx + 1} von {results.length}{busy ? "+" : ""} — wische oder tippe die Punkte
            </div>
            <div
              onTouchStart={(e) => { swipeStart.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (swipeStart.current === null) return;
                const diff = swipeStart.current - e.changedTouches[0].clientX;
                if (diff > 50 && activeIdx < results.length - 1) setActiveIdx(activeIdx + 1);
                if (diff < -50 && activeIdx > 0) setActiveIdx(activeIdx - 1);
                swipeStart.current = null;
              }}
            >
              <RecipeView r={result} kidsProfile={kidsProfile} freezer={freezer} setFreezer={setFreezer} />
            </div>

            {/* Navigation Pfeile */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))} disabled={activeIdx === 0} className="kk-btn kk-b"
                style={{ flex: 1, padding: "10px", borderRadius: 12, background: activeIdx === 0 ? theme.DOT : theme.CARD, color: activeIdx === 0 ? theme.MUTED : theme.TEXT, border: `1.5px solid ${theme.BORDER}`, fontWeight: 700, fontSize: 15 }}>
                ← Vorheriger
              </button>
              <button onClick={save} disabled={saved} className="kk-btn kk-b"
                style={{ flex: 2, background: saved ? SAGE : ACCENT, color: "#fff", padding: "10px", borderRadius: 12, fontWeight: 700, fontSize: 15, transition: "all .3s ease" }}>
                {saved ? "✓ Gespeichert!" : "✓ Diesen speichern"}
              </button>
              <button onClick={() => setActiveIdx(Math.min(results.length - 1, activeIdx + 1))} disabled={activeIdx >= results.length - 1} className="kk-btn kk-b"
                style={{ flex: 1, padding: "10px", borderRadius: 12, background: activeIdx >= results.length - 1 ? theme.DOT : theme.CARD, color: activeIdx >= results.length - 1 ? theme.MUTED : theme.TEXT, border: `1.5px solid ${theme.BORDER}`, fontWeight: 700, fontSize: 15 }}>
                Nächster →
              </button>
            </div>
            <button onClick={() => { setResults([]); setActiveIdx(0); }} className="kk-btn kk-b"
              style={{ width: "100%", marginTop: 8, background: "transparent", color: theme.MUTED, fontSize: 13, padding: "6px" }}>
              × Alle verwerfen
            </button>
          </Card>
        </div>
      )}

      {recipes.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <SectionTitle small>Gespeichert ({recipes.length})</SectionTitle>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="🔍 Rezept oder Zutat suchen…"
              style={{ ...inp, flex: 1, fontSize: 15, padding: "9px 12px", background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }}
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...inp, width: "auto", fontSize: 13.5, padding: "5px 8px", background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }}>
              <option value="newest">Neueste zuerst</option>
              <option value="fav">★ Favoriten zuerst</option>
              <option value="rating">Beste Bewertung</option>
              <option value="kids">Kinder-Lieblinge</option>
              <option value="cooked">Oft gekocht</option>
            </select>
          </div>
        </div>
      )}
          {searchQ && sortedRecipes.length === 0 && (
            <div className="kk-b" style={{ textAlign: "center", padding: "24px 0", color: theme.MUTED, fontSize: 15 }}>
              Kein Rezept mit „{searchQ}" gefunden.
            </div>
          )}
      {sortedRecipes.map((r) => (
        <Card key={r.id} style={{ border: r.fav ? `2px solid ${GOLD}` : undefined }}>
          <RecipeView r={r} compact kidsProfile={kidsProfile} onUpdate={(upd) => setRecipes(recipes.map((x) => x.id === r.id ? upd : x))} freezer={freezer} setFreezer={setFreezer} />
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button onClick={() => { setCookingId(cookingId === r.id ? null : r.id); if (cookingId !== r.id) setRecipes(recipes.map((x) => x.id === r.id ? { ...x, cookedCount: (x.cookedCount || 0) + 1 } : x)); }} className="kk-btn kk-b" style={{ background: SAGE, color: "#fff", fontSize: 14, fontWeight: 700, padding: "7px 14px", borderRadius: 16 }}>
              🍳 Gekocht – Bestand abziehen
            </button>
            <button onClick={() => setRecipes(recipes.filter((x) => x.id !== r.id))} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, fontSize: 14, fontWeight: 600, padding: 0, marginLeft: "auto" }}>
              Löschen
            </button>
          </div>
          {cookingId === r.id && (
            <CookConsume recipe={r} freezer={freezer} setFreezer={setFreezer} pantry={pantry} setPantry={setPantry} onClose={() => setCookingId(null)} />
          )}
        </Card>
      ))}
    </div>
  );
}

// Verbrauchs-Dialog: zeigt Inventar-Artikel, die zum Rezept passen, zum Abhaken
function CookConsume({ recipe, freezer, setFreezer, pantry, setPantry, onClose }) {
  const theme = useTheme();
  const ingredientWords = (recipe.ingredients || []).map((i) => (i.item || "").toLowerCase());
  function matches(name) {
    const n = name.toLowerCase();
    return ingredientWords.some((w) => w && (w.includes(n.split(" ")[0]) || n.includes(w.split(" ")[0])));
  }
  const freezerMatches = freezer.filter((f) => matches(f.name));
  const pantryMatches = pantry.filter((p) => matches(p.name));
  const allMatches = [...freezerMatches.map((f) => ({ ...f, src: "freezer" })), ...pantryMatches.map((p) => ({ ...p, src: "pantry" }))];

  const [sel, setSel] = useState(() => {
    const s = {};
    allMatches.forEach((m) => { s[m.id] = true; }); // Alle vorausgewählt
    return s;
  });
  const [actions, setActions] = useState(() => {
    const a = {};
    allMatches.forEach((m) => { a[m.id] = "remove"; }); // Standard: entfernen
    return a;
  });

  function consume() {
    const selected = allMatches.filter((m) => sel[m.id]);
    const toRemove = selected.filter((m) => actions[m.id] === "remove").map((m) => String(m.id));
    const toReduce = selected.filter((m) => actions[m.id] === "reduce");
    setFreezer(freezer.filter((f) => !toRemove.includes(String(f.id))).map((f) => {
      const r = toReduce.find((m) => m.id === f.id && m.src === "freezer");
      return r ? { ...f, qty: "Teilweise verbraucht" } : f;
    }));
    setPantry(pantry.filter((p) => !toRemove.includes(String(p.id))).map((p) => {
      const r = toReduce.find((m) => m.id === p.id && m.src === "pantry");
      return r ? { ...p, low: true } : p;
    }));
    onClose();
  }

  return (
    <div className="kk-pop" style={{ background: theme.SAGE_BG, border: `1.5px solid ${SAGE}44`, borderRadius: 12, padding: 14, marginTop: 10 }}>
      <div className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: theme.TEXT, marginBottom: 4 }}>🍳 Welche Zutaten hast du verbraucht?</div>
      <div className="kk-b" style={{ fontSize: 13.5, color: theme.MUTED, marginBottom: 10 }}>Ich habe passende Artikel aus Vorrat & TK gefunden — hake ab was du verwendet hast:</div>
      {allMatches.length === 0 ? (
        <div className="kk-b" style={{ fontSize: 14, opacity: 0.65, marginBottom: 8, color: theme.TEXT }}>
          Keine passenden Artikel erkannt. Bitte manuell im Gefrierschrank/Vorrat aktualisieren.
        </div>
      ) : (
        allMatches.map((m) => (
          <div key={m.id} style={{ padding: "8px 0", borderBottom: `1px solid ${theme.BORDER}` }}>
            <label className="kk-b" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15, cursor: "pointer", color: theme.TEXT }}>
              <input type="checkbox" checked={!!sel[m.id]} onChange={() => setSel({ ...sel, [m.id]: !sel[m.id] })} style={{ width: 18, height: 18, accentColor: ACCENT }} />
              <span style={{ flex: 1 }}>{m.src === "freezer" ? "❄" : "▦"} <b>{m.name}</b> <span style={{ opacity: 0.55 }}>· {m.qty}</span></span>
            </label>
            {sel[m.id] && (
              <div style={{ display: "flex", gap: 6, marginTop: 6, marginLeft: 28 }}>
                <button onClick={() => setActions({ ...actions, [m.id]: "remove" })} className="kk-btn kk-b"
                  style={{ padding: "4px 10px", borderRadius: 16, fontSize: 13, fontWeight: 700, background: actions[m.id] === "remove" ? ACCENT : "transparent", color: actions[m.id] === "remove" ? "#fff" : theme.TEXT, border: `1px solid ${ACCENT}` }}>
                  🗑 Komplett aufgebraucht
                </button>
                <button onClick={() => setActions({ ...actions, [m.id]: "reduce" })} className="kk-btn kk-b"
                  style={{ padding: "4px 10px", borderRadius: 16, fontSize: 13, fontWeight: 700, background: actions[m.id] === "reduce" ? SAGE : "transparent", color: actions[m.id] === "reduce" ? "#fff" : theme.TEXT, border: `1px solid ${SAGE}` }}>
                  📉 Teilweise verbraucht
                </button>
              </div>
            )}
          </div>
        ))
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={consume} className="kk-btn kk-b" style={{ background: SAGE, color: "#fff", fontSize: 15, fontWeight: 700, padding: "10px 14px", borderRadius: 10, flex: 2 }}>
          ✓ Bestand aktualisieren
        </button>
        <button onClick={onClose} className="kk-btn kk-b" style={{ background: "transparent", color: theme.TEXT, border: `1.5px solid ${theme.BORDER}`, fontSize: 14, fontWeight: 600, padding: "10px 14px", borderRadius: 10, flex: 1 }}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function RecipeView({ r, compact, onUpdate, kidsProfile, onBatchFreeze, freezer, setFreezer }) {
  const theme = useTheme();
  const [open, setOpen] = useState(!compact);
  const [editCost, setEditCost] = useState(false);
  const [total, setTotal] = useState(r.totalCost || "");
  const [tmMode, setTmMode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [cookMode, setCookMode] = useState(false); // Koch-Modus: Vollbild
  const [cookStep, setCookStep] = useState(0); // aktiver Schritt im Koch-Modus
  const [batchPortions, setBatchPortions] = useState((r.portions || 3) * 3);
  const hasTm = !!(r.tmSteps && r.tmSteps.length > 0);
  const portions = Number(r.portions) || 3;
  const perPortion = total && portions ? (Number(total) / portions).toFixed(2) : (r.costPerPortion || null);
  const score = kidsScore(r, kidsProfile);
  const scoreColor = score >= 8 ? SAGE : score >= 6 ? GOLD : ACCENT;
  const steps = r.steps || [];

  // Koch-Modus Overlay
  if (cookMode) {
    const step = steps[cookStep];
    return (
      <div style={{ position: "fixed", inset: 0, background: "#1A1714", color: "#F4EDE2", zIndex: 9999, display: "flex", flexDirection: "column", padding: "24px 20px 40px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div className="kk-b" style={{ fontSize: 12, opacity: 0.55, textTransform: "uppercase", letterSpacing: 1 }}>Koch-Modus</div>
            <div className="kk-h" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>{r.title}</div>
          </div>
          <button onClick={() => setCookMode(false)} className="kk-btn kk-b"
            style={{ background: "rgba(255,255,255,0.1)", color: "#F4EDE2", borderRadius: 20, padding: "6px 14px", fontSize: 14, fontWeight: 700 }}>
            × Beenden
          </button>
        </div>

        {/* Fortschritt */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} onClick={() => setCookStep(i)} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= cookStep ? ACCENT : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "background .3s" }} />
          ))}
        </div>

        {/* Schritt */}
        <div style={{ flex: 1 }}>
          <div className="kk-b" style={{ fontSize: 13, color: ACCENT, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            Schritt {cookStep + 1} von {steps.length}
          </div>
          <div className="kk-b" style={{ fontSize: 20, lineHeight: 1.7, color: "#F4EDE2" }}>{step}</div>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button onClick={() => setCookStep(Math.max(0, cookStep - 1))} disabled={cookStep === 0} className="kk-btn kk-b"
            style={{ flex: 1, padding: "16px", borderRadius: 14, background: "rgba(255,255,255,0.08)", color: cookStep === 0 ? "rgba(255,255,255,0.2)" : "#F4EDE2", fontSize: 17, fontWeight: 700 }}>
            ← Zurück
          </button>
          {cookStep < steps.length - 1 ? (
            <button onClick={() => setCookStep(cookStep + 1)} className="kk-btn kk-b"
              style={{ flex: 2, padding: "16px", borderRadius: 14, background: ACCENT, color: "#fff", fontSize: 17, fontWeight: 900 }}>
              Weiter →
            </button>
          ) : (
            <button onClick={() => setCookMode(false)} className="kk-btn kk-b"
              style={{ flex: 2, padding: "16px", borderRadius: 14, background: SAGE, color: "#fff", fontSize: 17, fontWeight: 900 }}>
              ✓ Fertig gekocht!
            </button>
          )}
        </div>
      </div>
    );
  }

  // Zutat hochrechnen
  function scaleAmount(amountStr, factor) {
    if (!amountStr) return amountStr;
    return amountStr.replace(/(\d+(?:[.,]\d+)?)/g, (n) => {
      const num = parseFloat(n.replace(",", ".")) * factor;
      const rounded = Math.round(num * 10) / 10;
      return String(rounded).replace(".", ",");
    });
  }
  const batchFactor = batchPortions / portions;
  const batchCost = perPortion ? (parseFloat(perPortion) * batchPortions).toFixed(2) : null;

  function saveCost() {
    if (onUpdate) onUpdate({ ...r, totalCost: total, costPerPortion: total && portions ? (Number(total) / portions).toFixed(2) : r.costPerPortion });
    setEditCost(false);
  }

  function toggleFav() { if (onUpdate) onUpdate({ ...r, fav: !r.fav }); }
  function setRating(n) { if (onUpdate) onUpdate({ ...r, rating: r.rating === n ? 0 : n }); }
  function toggleKids() { if (onUpdate) onUpdate({ ...r, kidsLoved: !r.kidsLoved }); }
  function toggleCooked() { if (onUpdate) onUpdate({ ...r, cookedCount: (r.cookedCount || 0) + 1 }); }

  return (
    <div style={{ borderRadius: 18, overflow: "hidden", border: `1.5px solid ${r.fav ? GOLD + "66" : "transparent"}` }}>

      {/* Food-Bild — volle Breite */}
      {!compact && (
        <div style={{ position: "relative" }}>
          <FoodImage title={r.title} height={200} radius="0" />
          {/* Favorit-Stern über dem Bild */}
          <button onClick={toggleFav} className="kk-btn"
            style={{ position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", fontSize: 20, color: r.fav ? GOLD : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {r.fav ? "★" : "☆"}
          </button>
          {/* Titel über Bild */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 14px 12px" }}>
            <div className="kk-h" style={{ fontSize: 21, fontWeight: 700, color: "#fff", lineHeight: 1.2, textShadow: "0 1px 6px rgba(0,0,0,.6)" }}>{r.title}</div>
          </div>
        </div>
      )}

      <div style={{ padding: compact ? 0 : "14px 14px 16px" }}>
        {compact && (
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div className="kk-h" style={{ fontSize: 21, fontWeight: 600, flex: 1, color: theme.TEXT }}>{r.title}</div>
            <button onClick={toggleFav} className="kk-btn" style={{ background: "none", fontSize: 24, lineHeight: 1, padding: "0 2px", color: r.fav ? GOLD : "#CFC6B8" }}>
              {r.fav ? "★" : "☆"}
            </button>
          </div>
        )}

      {/* Kinder-Score-Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "7px 0 4px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: scoreColor + "18", border: `1.5px solid ${scoreColor}44`, borderRadius: 20, padding: "4px 12px" }}>
          <span style={{ fontSize: 16 }}>👦👧</span>
          <span className="kk-h" style={{ fontSize: 17, fontWeight: 900, color: scoreColor }}>{score}/10</span>
          <span className="kk-b" style={{ fontSize: 13, color: scoreColor, fontWeight: 600 }}>
            {score >= 9 ? "Kinder lieben es!" : score >= 7 ? "Gut akzeptiert" : score >= 5 ? "Geht so" : "Schwierig"}
          </span>
        </div>
        {r.kidsLoved && <span className="kk-b" style={{ fontSize: 13, background: ACCENT + "18", color: ACCENT, border: `1px solid ${ACCENT}44`, borderRadius: 12, padding: "3px 8px", fontWeight: 600 }}>♥ bewährt</span>}
      </div>

      {/* KI-Profil-Badges: welche Regeln waren aktiv */}
      {r.appliedProfiles && r.appliedProfiles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, margin: "6px 0 8px" }}>
          <span className="kk-b" style={{ fontSize: 12, opacity: 0.55, alignSelf: "center" }}>🧠 KI berücksichtigt:</span>
          {r.appliedProfiles.map((p, i) => (
            <span key={i} className="kk-b" style={{ fontSize: 12.5, background: SAGE + "18", color: SAGE, border: `1px solid ${SAGE}44`, borderRadius: 10, padding: "2px 8px", fontWeight: 600 }}>{p}</span>
          ))}
        </div>
      )}

      {/* Batch-Modus Button */}
      {!compact && (
        <button onClick={() => setBatchMode(!batchMode)} className="kk-btn kk-b"
          style={{ background: batchMode ? "#6E8CA0" : "transparent", color: batchMode ? "#fff" : "#6E8CA0", border: `1.5px solid #6E8CA0`, borderRadius: 20, padding: "6px 14px", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          🧊 {batchMode ? "Batch-Modus schließen ×" : "Zu Batch-Rezept umwandeln →"}
        </button>
      )}

      {/* Batch-Panel */}
      {!compact && batchMode && (
        <div className="kk-pop" style={{ background: "#EEF4F8", border: "1.5px solid #6E8CA0", borderRadius: 14, padding: 14, marginBottom: 10 }}>
          <div className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: "#1A4A5A", marginBottom: 4 }}>🧊 Batch-Kochen für den TK</div>
          <div className="kk-b" style={{ fontSize: 14, color: "#1A4A5A", opacity: 0.75, marginBottom: 10 }}>
            Wie viele Portionen möchtest du vorkochen und einfrieren?
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button onClick={() => setBatchPortions(Math.max(portions, batchPortions - portions))} className="kk-btn kk-h"
              style={{ width: 32, height: 32, borderRadius: 8, background: "#6E8CA0", color: "#fff", fontSize: 20, fontWeight: 900 }}>−</button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div className="kk-h" style={{ fontSize: 30, fontWeight: 900, color: "#6E8CA0", lineHeight: 1 }}>{batchPortions}</div>
              <div className="kk-b" style={{ fontSize: 13, color: "#1A4A5A", opacity: 0.65 }}>Portionen · {Math.round(batchFactor * 10) / 10}× Rezept</div>
            </div>
            <button onClick={() => setBatchPortions(batchPortions + portions)} className="kk-btn kk-h"
              style={{ width: 32, height: 32, borderRadius: 8, background: "#6E8CA0", color: "#fff", fontSize: 20, fontWeight: 900 }}>+</button>
          </div>

          <div className="kk-b" style={{ fontSize: 14, fontWeight: 700, color: "#1A4A5A", marginBottom: 6 }}>Zutaten für {batchPortions} Portionen:</div>
          {r.ingredients?.map((ing, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #C8DCE8" }}>
              <span className="kk-b" style={{ fontSize: 15, color: "#1A4A5A" }}>{ing.item}</span>
              <span className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: "#6E8CA0" }}>{scaleAmount(ing.amount, batchFactor)}</span>
            </div>
          ))}

          {perPortion && (
            <div className="kk-b" style={{ fontSize: 14, color: "#1A4A5A", opacity: 0.75, marginTop: 8 }}>
              Gesamtkosten: ~{(parseFloat(perPortion) * batchPortions).toFixed(2)} € · {perPortion} € / Portion
            </div>
          )}

          {setFreezer && freezer && (
            <button onClick={() => {
              const d = new Date(); d.setMonth(d.getMonth() + 3);
              const bestBefore = d.toISOString().slice(0, 10);
              const newItems = [];
              let remaining = batchPortions;
              let idx = 0;
              while (remaining > 0) {
                const p = Math.min(portions, remaining);
                newItems.push({ id: Date.now() + idx++, name: `${r.title} (${p} Port.)`, qty: `${p} Portionen`, cat: "Fertiggericht", bestBefore });
                remaining -= p;
              }
              setFreezer(prev => [...newItems, ...prev]);
              setBatchMode(false);
            }} className="kk-btn kk-b"
              style={{ background: "#6E8CA0", color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 16, width: "100%", marginTop: 10 }}>
              ❄ {batchPortions} Portionen einfrieren
            </button>
          )}
        </div>
      )}

      <div className="kk-b" style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13.5, opacity: 0.7, margin: "6px 0 8px", color: theme.TEXT }}>
        <span>◷ {r.prepMinutes} Min</span><span>◆ {r.portions} Portionen</span>
        {r.cookedCount > 0 && <span style={{ color: SAGE, fontWeight: 600 }}>🍳 {r.cookedCount}× gekocht</span>}
      </div>

      {/* Nährwerte pro Portion */}
      {r.nutrition && (r.nutrition.kcal || r.nutrition.protein) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[
            { label: "kcal", val: r.nutrition.kcal, color: ACCENT, unit: "" },
            { label: "Eiweiß", val: r.nutrition.protein, color: SAGE, unit: "g" },
            { label: "Kohlenhydr.", val: r.nutrition.carbs, color: GOLD, unit: "g" },
            { label: "Fett", val: r.nutrition.fat, color: "#6E8CA0", unit: "g" },
          ].map((n, i) => n.val ? (
            <div key={i} style={{ background: n.color + "14", border: `1px solid ${n.color}33`, borderRadius: 10, padding: "7px 6px", textAlign: "center" }}>
              <div className="kk-h" style={{ fontSize: 17, fontWeight: 900, color: n.color, lineHeight: 1 }}>{n.val}{n.unit}</div>
              <div className="kk-b" style={{ fontSize: 11, color: theme.MUTED, marginTop: 2 }}>{n.label}</div>
            </div>
          ) : null)}
        </div>
      )}

      {/* Bewertungs-Zeile */}
      {onUpdate && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          {/* Sterne 1–5 */}
          <div style={{ display: "flex", gap: 2 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className="kk-btn" style={{ background: "none", fontSize: 20, lineHeight: 1, padding: 0, color: (r.rating || 0) >= n ? GOLD : "#CFC6B8" }}>★</button>
            ))}
          </div>
          {/* Kinder-Button */}
          <button onClick={toggleKids} className="kk-btn kk-b" style={{ background: r.kidsLoved ? "#FFF3EE" : "transparent", border: `1.5px solid ${r.kidsLoved ? ACCENT : "#CFC6B8"}`, color: r.kidsLoved ? ACCENT : "#9B8E85", borderRadius: 16, fontSize: 13.5, fontWeight: 700, padding: "4px 10px" }}>
            {r.kidsLoved ? "👧 Kinder: ♥" : "👧 Kinder?"}
          </button>
        </div>
      )}

      {/* Kosten-Box */}
      <div style={{ background: "#F0F2EC", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
        {!editCost ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span className="kk-h" style={{ fontSize: 20, fontWeight: 900, color: DEEP }}>{total ? `${Number(total).toFixed(2)} €` : "— €"}</span>
              <span className="kk-b" style={{ fontSize: 13.5, opacity: 0.6 }}> gesamt</span>
              {perPortion && <span className="kk-b" style={{ fontSize: 14.5, color: SAGE, fontWeight: 600, marginLeft: 10 }}>≈ {perPortion} € / Portion</span>}
            </div>
            <button onClick={() => setEditCost(true)} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, fontSize: 13.5, fontWeight: 600, padding: "2px 6px" }}>✎ Preis</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Gesamt €" style={{ ...inp, width: 100, padding: "6px 8px" }} autoFocus />
            <span className="kk-b" style={{ fontSize: 13.5, opacity: 0.6 }}>€ gesamt → {total && portions ? (Number(total) / portions).toFixed(2) : "?"} €/Portion</span>
            <button onClick={saveCost} className="kk-btn kk-b" style={{ background: ACCENT, color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 700, padding: "6px 10px", marginLeft: "auto" }}>✓</button>
          </div>
        )}
      </div>

      {/* Gerettete Artikel — Food Waste Zero */}
      {r.savedFromWaste && r.savedFromWaste.length > 0 && (
        <div style={{ background: SAGE + "18", border: `1.5px solid ${SAGE}44`, borderRadius: 10, padding: "8px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>♻</span>
          <div className="kk-b" style={{ fontSize: 13, color: SAGE, fontWeight: 600 }}>
            Gerettet vor Verderb: {r.savedFromWaste.join(" · ")}
          </div>
        </div>
      )}
      {r.reuse && <div className="kk-b" style={{ fontSize: 14, fontStyle: "italic", color: SAGE, marginBottom: 8 }}>♻ {r.reuse}</div>}
      {compact && <button onClick={() => setOpen(!open)} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 6 }}>{open ? "− weniger" : "+ Details"}</button>}
      {open && <>
        {/* TM-Toggle */}
        {hasTm && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, marginTop: 4 }}>
            <button onClick={() => setTmMode(false)} className="kk-btn kk-b"
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: 14, fontWeight: 700, background: !tmMode ? theme.DEEP : "transparent", color: !tmMode ? theme.PAPER : theme.TEXT, border: `1.5px solid ${theme.BORDER}` }}>
              🍳 Normal
            </button>
            <button onClick={() => setTmMode(true)} className="kk-btn kk-b"
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: 14, fontWeight: 700, background: tmMode ? "#CC2120" : "transparent", color: tmMode ? "#fff" : theme.TEXT, border: `1.5px solid ${tmMode ? "#CC2120" : theme.BORDER}` }}>
              🌀 Thermomix
            </button>
          </div>
        )}

        <div className="kk-b" style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>Zutaten</div>
        <ul className="kk-b" style={{ fontSize: 14.5, margin: "4px 0 8px", paddingLeft: 18, color: theme.TEXT }}>
          {r.ingredients?.map((i, k) => <li key={k} style={{ marginBottom: 2 }}>{i.amount} {i.item} {i.fromFreezer && <span style={{ color: "#6E8CA0", fontSize: 12 }}>❄</span>}</li>)}
        </ul>

        {/* Koch-Modus Button */}
        {!compact && steps.length > 0 && (
          <button onClick={() => { setCookMode(true); setCookStep(0); }} className="kk-btn kk-b kk-glow"
            style={{ background: ACCENT, color: "#fff", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: 15, width: "100%", marginBottom: 12 }}>
            👨‍🍳 Koch-Modus starten → Schritt für Schritt
          </button>
        )}

        <div className="kk-b" style={{ fontSize: 14, fontWeight: 700, color: theme.TEXT }}>
          {tmMode ? "🌀 Thermomix-Zubereitung" : "Zubereitung"}
        </div>

        {tmMode && r.tmSteps ? (
          <div style={{ margin: "6px 0" }}>
            {r.tmSteps.map((s, k) => (
              <div key={k} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${theme.BORDER}` }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#CC2120", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>{k + 1}</div>
                <div style={{ flex: 1 }}>
                  <div className="kk-b" style={{ fontSize: 15, color: theme.TEXT }}>{s.text}</div>
                  {(s.stufe || s.temp || s.time) && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                      {s.stufe && <span className="kk-b" style={{ background: "#CC212018", color: "#CC2120", border: "1px solid #CC212044", borderRadius: 10, padding: "2px 8px", fontSize: 13, fontWeight: 700 }}>Stufe {s.stufe}</span>}
                      {s.temp && <span className="kk-b" style={{ background: "#FF760018", color: "#CC5500", border: "1px solid #FF760044", borderRadius: 10, padding: "2px 8px", fontSize: 13, fontWeight: 700 }}>🌡 {s.temp}</span>}
                      {s.time && <span className="kk-b" style={{ background: "#1A6B2A18", color: "#1A6B2A", border: "1px solid #1A6B2A44", borderRadius: 10, padding: "2px 8px", fontSize: 13, fontWeight: 700 }}>⏱ {s.time}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ol className="kk-b" style={{ fontSize: 14.5, margin: "4px 0", paddingLeft: 18, color: theme.TEXT }}>
            {r.steps?.map((s, k) => <li key={k} style={{ marginBottom: 3 }}>{s}</li>)}
          </ol>
        )}
      </>}
      </div>
    </div>
  );
}

// ---------------- Einfrieren-Assistent ----------------
function FreezeAssistant({ suggestedName, onClose, freezer, setFreezer }) {
  const theme = useTheme();
  const [name, setName] = useState(suggestedName || "");
  const [portions, setPortions] = useState("2");
  const [cat, setCat] = useState("Fertiggericht");
  const [bestBefore, setBestBefore] = useState(() => {
    // Standard: 3 Monate ab heute
    const d = new Date(); d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [saved, setSaved] = useState(false);

  function save() {
    const item = {
      id: Date.now(),
      name: name.trim() || "Reste",
      qty: `${portions} Portion${portions !== "1" ? "en" : ""}`,
      cat,
      bestBefore,
    };
    setFreezer([item, ...freezer]);
    setSaved(true);
    setTimeout(() => { onClose && onClose(); }, 1200);
  }

  if (saved) return (
    <div style={{ background: "#6E8CA0", color: "#fff", borderRadius: 12, padding: "12px 14px", marginTop: 10, textAlign: "center" }}>
      <div className="kk-b" style={{ fontSize: 16, fontWeight: 700 }}>❄ Eingefroren! Steht jetzt im Gefrierschrank.</div>
    </div>
  );

  return (
    <div className="kk-pop" style={{ background: theme.CARD, border: `2px solid #6E8CA0`, borderRadius: 14, padding: 14, marginTop: 10 }}>
      <div className="kk-h" style={{ fontSize: 16, fontWeight: 900, color: "#6E8CA0", marginBottom: 10 }}>❄ Einfrieren-Assistent</div>
      <div style={{ display: "grid", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Was wird eingefroren?" style={{ ...inp, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="kk-b" style={{ fontSize: 13, opacity: 0.6, marginBottom: 3 }}>Portionen</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setPortions(String(Math.max(1, Number(portions) - 1)))} className="kk-btn kk-h" style={{ width: 30, height: 30, borderRadius: 8, background: "#EEE6D8", color: DEEP, fontSize: 20, fontWeight: 900 }}>−</button>
              <span className="kk-h" style={{ fontSize: 22, fontWeight: 900, minWidth: 24, textAlign: "center", color: theme.TEXT }}>{portions}</span>
              <button onClick={() => setPortions(String(Number(portions) + 1))} className="kk-btn kk-h" style={{ width: 30, height: 30, borderRadius: 8, background: "#6E8CA0", color: "#fff", fontSize: 16, fontWeight: 900 }}>+</button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="kk-b" style={{ fontSize: 13, opacity: 0.6, marginBottom: 3 }}>MHD</div>
            <input type="date" value={bestBefore} onChange={(e) => setBestBefore(e.target.value)} style={{ ...inp, padding: "7px 8px", background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }} />
          </div>
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inp, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} className="kk-btn kk-b" style={{ flex: 2, background: "#6E8CA0", color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 16 }}>
            ❄ Einfrieren
          </button>
          <button onClick={onClose} className="kk-btn kk-b" style={{ flex: 1, background: "transparent", color: theme.TEXT, border: `1.5px solid ${theme.BORDER}`, padding: "11px", borderRadius: 10, fontWeight: 600 }}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Doppelrezepte (1 Basis → 2 Gerichte) ----------------
function DoubleRecipes({ freezer, pantry, setShopping, shopping, diet, health, kidsProfile, household }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState(null);

  async function generate() {
    setBusy(true); setErr(""); setResult(null);
    const stock = freezer.length ? freezer.map((f) => `${f.name} (${f.qty})`).join("; ") : "leer";
    const pant = pantry.length ? pantry.map((p) => `${p.name} (${p.qty})`).join("; ") : "leer";
    const prompt = `Du bist Meal-Prep-Profi. ${householdRules(household)} ${dietRules(diet)} ${healthRules(health)} ${kidsRules(kidsProfile)} 7–9 €/Mahlzeit, alltagstauglich.

Konzept DOPPELREZEPT: EINE große Basis vorkochen (z.B. Hackfleisch-Tomaten-Basis, Ofengemüse, Currysoße), die an verschiedenen Tagen zu ZWEI klar unterschiedlichen Gerichten wird. Ziel: einen Koch- UND Putztag pro Woche sparen. Plane bewusst PUTZ-SPARSAM: möglichst 1 Topf/1 Blech, wenig Abwasch, gemeinsame Komponenten.

Gefrierbestand: ${stock}. Vorrat: ${pant}. Wunsch: ${extra || "keiner"}.

Antworte AUSSCHLIESSLICH mit reinem JSON, kein Markdown:
{"baseName":"Name der Basis","basePortions":Zahl,"basePrepMinutes":Zahl,"baseSteps":["Schritt zum Vorkochen der Basis"],"cleanupSaving":"konkret wie Putz-/Abwasch-Aufwand reduziert wird (1-2 Sätze)","oneEquipment":"z.B. 1 großer Topf","dishes":[{"name":"Gericht 1","day":"z.B. Tag 1","fromBase":"wie aus der Basis wird","extraSteps":["..."],"freshAdd":["was frisch dazu kommt"]},{"name":"Gericht 2","day":"z.B. Tag 3","fromBase":"...","extraSteps":["..."],"freshAdd":["..."]}],"estCostPerMeal":"x–y €","shoppingList":[{"item":"...","amount":"...","cat":"Fleisch/Fisch|Gemüse|Stärke|Milchprodukt (laktosefrei)|Soße/Basis|Brot|Sonstiges"}]}`;
    try {
      const txt = await askClaude(prompt);
      setResult(parseJSON(txt));
    } catch (e) {
      setErr("Doppelrezept konnte nicht erstellt werden. Bitte erneut versuchen.");
    }
    setBusy(false);
  }

  function toShopping() {
    if (!result?.shoppingList) return;
    const add = result.shoppingList.map((s, i) => ({ id: Date.now() + i, name: s.item, amount: s.amount, cat: s.cat || "Sonstiges", done: false }));
    setShopping([...shopping, ...add]);
  }

  return (
    <div className="kk-pop">
      <SectionTitle>Doppelrezepte</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 15, opacity: 0.8, marginBottom: 4 }}>
          <b>1× kochen → 2 Gerichte.</b> Eine Basis vorkochen, an zwei Tagen unterschiedlich verwerten. Putz-sparsam geplant: möglichst 1 Topf, wenig Abwasch.
        </div>
        <div className="kk-b" style={{ fontSize: 14, color: SAGE, fontWeight: 600, marginBottom: 10 }}>
          → So sparst du jede Woche einen Koch- und Putztag.
        </div>
        <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Optional: Wunsch, z.B. 'mit Hack', 'vegetarisch', 'Ofengericht'" style={{ ...inp, marginBottom: 8 }} />
        <button onClick={generate} disabled={busy} className="kk-btn kk-b"
          style={{ background: busy ? SAGE : ACCENT, color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 16, width: "100%" }}>
          {busy ? <><span className="kk-spin">✦</span> Claude entwickelt Doppelrezept…</> : "⊞ Doppelrezept generieren"}
        </button>
        {err && <div className="kk-b" style={{ color: ACCENT, fontSize: 14, marginTop: 8 }}>{err}</div>}
      </Card>

      {result && (
        <>
          <Card highlight>
            <div className="kk-b" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: ACCENT, marginBottom: 4 }}>① Basis vorkochen</div>
            <div className="kk-h" style={{ fontSize: 21, fontWeight: 600 }}>{result.baseName}</div>
            <div className="kk-b" style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13.5, opacity: 0.7, margin: "6px 0 8px" }}>
              <span>◷ {result.basePrepMinutes} Min</span><span>◆ {result.basePortions} Portionen</span><span>€ {result.estCostPerMeal}/Mahlzeit</span>
            </div>
            <ol className="kk-b" style={{ fontSize: 14.5, margin: "4px 0 10px", paddingLeft: 18 }}>
              {result.baseSteps?.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}
            </ol>
            <div style={{ background: "#F0F2EC", borderRadius: 10, padding: "10px 12px" }}>
              <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, color: SAGE, textTransform: "uppercase", letterSpacing: 1 }}>🧽 Putz-Ersparnis</div>
              <div className="kk-b" style={{ fontSize: 14.5, marginTop: 4 }}>{result.cleanupSaving}</div>
              {result.oneEquipment && <div className="kk-b" style={{ fontSize: 13.5, marginTop: 4, fontStyle: "italic", opacity: 0.75 }}>Nur: {result.oneEquipment}</div>}
            </div>
          </Card>

          {result.dishes?.map((d, i) => (
            <Card key={i}>
              <div className="kk-b" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: SAGE, marginBottom: 2 }}>{i === 0 ? "②" : "③"} {d.day}</div>
              <div className="kk-h" style={{ fontSize: 20, fontWeight: 600 }}>{d.name}</div>
              <div className="kk-b" style={{ fontSize: 14.5, fontStyle: "italic", color: ACCENT, margin: "4px 0 8px" }}>♻ aus der Basis: {d.fromBase}</div>
              {d.extraSteps?.length > 0 && <>
                <div className="kk-b" style={{ fontSize: 14, fontWeight: 700 }}>Zusätzlich</div>
                <ol className="kk-b" style={{ fontSize: 14.5, margin: "3px 0 8px", paddingLeft: 18 }}>
                  {d.extraSteps.map((s, k) => <li key={k} style={{ marginBottom: 2 }}>{s}</li>)}
                </ol>
              </>}
              {d.freshAdd?.length > 0 && (
                <div className="kk-b" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>Frisch dazu: </span>
                  {d.freshAdd.map((f, k) => <span key={k} style={{ display: "inline-block", background: SAGE, color: "#fff", borderRadius: 20, padding: "2px 10px", margin: "0 5px 5px 0", fontSize: 13 }}>{f}</span>)}
                </div>
              )}
            </Card>
          ))}

          {result.shoppingList && (
            <button onClick={toShopping} className="kk-btn kk-b" style={{ marginTop: 4, background: DEEP, color: PAPER, padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 16, width: "100%" }}>
              ✓ {result.shoppingList.length} Zutaten → Einkaufsliste (Picnic)
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Batch-Plan ----------------
function BatchPlan({ freezer, setFreezer, pantry, recipes, plan, setPlan, setShopping, shopping, diet, health, household, calEvents }) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [skippedItems, setSkippedItems] = React.useState([]);
  const [showSkipped, setShowSkipped] = React.useState(false);
  const [chatMode, setChatMode] = useState(false);

  async function generate() {
    setBusy(true); setErr("");
    const stock = freezer.length ? freezer.slice(0,20).map((f) => `${f.name} (${f.qty})`).join("; ") : "leer";
    const pant = pantry.length ? pantry.slice(0,20).map((p) => `${p.name} (${p.qty})`).join("; ") : "leer";
    const saved = recipes.length ? recipes.slice(0,10).map((r) => r.title).join("; ") : "keine";
    const extra = chatInput.trim() ? `\nBesonderer Wunsch: "${chatInput.trim()}"` : "";
    const weekdayRules = Object.entries(WEEKDAY_TAGS).map(([day, t]) =>
      `${day}: max. ${t.maxMin} Min${t.urgent ? ` (⚡ ${t.urgent})` : ""}`
    ).join("; ");

    // Persönliche Termine einbeziehen
    const eventRules = (calEvents || []).length > 0
      ? "\nPERSÖNLICHE TERMINE (zwingend berücksichtigen): " +
        (calEvents || []).map(e => `${e.day} ${e.time}: ${e.name} (${e.duration} Min, danach max. ${e.maxMinAfter} Min kochen)`).join("; ")
      : "";

    const prompt = `Erstelle einen Wochen-Batch-Plan. ${householdRules(household)} Ziel: einen Kochtag pro Woche sparen durch clevere Mehrfach-Nutzung. ${dietRules(diet)} ${healthRules(health)} 7–9 €/Mahlzeit, alltagstauglich.${extra}

WOCHENTAGS-REGELN (zwingend beachten): ${weekdayRules}${eventRules}

Gefrierbestand: ${stock}. Vorratsschrank: ${pant}. Gespeicherte Rezepte: ${saved}.

Plane EINEN großen Kochtag, dessen Ergebnisse über mehrere Tage variiert werden. Nutze vorhandene Zutaten. Liste pro Wochentag (Mo–So) ein Abendessen. Pro Tag: Aufwand in Minuten, ob Resteverwertung, was am Vorabend aufgetaut werden muss.

Nur JSON:
{"title":"...","summary":"1 Satz Überblick","cookDay":"z.B. Sonntag","cookSession":["Was am Kochtag zubereitet wird"],"days":[{"day":"Montag","meal":"...","note":"...","minutes":Zahl,"isLeftover":true/false,"thawTonight":"was aufgetaut werden muss oder leer"}],"shoppingList":[{"item":"...","amount":"...","cat":"Fleisch/Fisch|Gemüse|Stärke|Milchprodukt (laktosefrei)|Soße/Basis|Brot|Sonstiges"}]}`;
    try {
      const txt = await askClaude(prompt, 2500);
      const p = parseJSON(txt);
      setPlan(p);
      setChatInput("");
      setChatMode(false);
    } catch (e) {
      setErr("Plan konnte nicht erstellt werden. Bitte erneut versuchen.");
    }
    setBusy(false);
  }

  function toShopping() {
    if (!plan?.shoppingList) return;

    // Vorrats-Abgleich: Namen aus Froster + Vorratsschrank normalisieren
    const stockNames = [
      ...freezer.map(f => (f.name || "").toLowerCase().trim()),
      ...pantry.map(p => (p.name || "").toLowerCase().trim()),
    ];

    function inStock(itemName) {
      const n = (itemName || "").toLowerCase().trim();
      return stockNames.some(s => s.includes(n.slice(0, 5)) || n.includes(s.slice(0, 5)));
    }

    const skipped = [];
    const add = [];

    plan.shoppingList.forEach((s, i) => {
      if (inStock(s.item)) {
        skipped.push(s.item);
      } else {
        add.push({ id: Date.now() + i, name: s.item, amount: s.amount, cat: s.cat || "Sonstiges", done: false });
      }
    });

    setShopping([...shopping, ...add]);
    setSkippedItems(skipped);
    setShowSkipped(true);
  }

  return (
    <div className="kk-pop">
      <SectionTitle>Batch-Wochenplan</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 15, opacity: 0.75, marginBottom: 10, color: theme.TEXT }}>
          Ein Kochtag → die ganze Woche essen. Claude plant aus Gefrierbestand + gespeicherten Rezepten.
        </div>

        {/* Chat-Wunsch-Eingabe */}
        <button onClick={() => setChatMode(!chatMode)} className="kk-btn kk-b"
          style={{ background: "transparent", color: SAGE, border: `1.5px solid ${SAGE}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, marginBottom: 10, width: "100%" }}>
          {chatMode ? "× Wunsch verbergen" : "💬 Besonderen Wunsch hinzufügen"}
        </button>

        {chatMode && (
          <div style={{ marginBottom: 10 }}>
            <div className="kk-b" style={{ fontSize: 12.5, color: theme.MUTED, marginBottom: 6 }}>
              Schreib deinen Wunsch — z.B. "diese Woche viel Fleisch", "schnell unter 20 Min", "Timon mag kein Fisch", "wir haben noch Hähnchen im TK"
            </div>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="z.B. Ich möchte diese Woche asiatisch kochen, Timo mag kein Fisch, wir haben noch Hähnchen im TK..."
              rows={3}
              style={{ ...inp, width: "100%", resize: "none", fontSize: 14, lineHeight: 1.5, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }}
            />
          </div>
        )}

        <button onClick={generate} disabled={busy} className="kk-btn kk-b"
          style={{ background: busy ? SAGE : ACCENT, color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 16, width: "100%" }}>
          {busy ? <><span className="kk-spin">✦</span> Plane Woche…</> : "▤ Wochenplan erstellen"}
        </button>
        {err && <div className="kk-b" style={{ color: ACCENT, fontSize: 14, marginTop: 8 }}>{err}</div>}
      </Card>

      {plan && (
        <>
          <Card highlight>
            <div className="kk-h" style={{ fontSize: 22, fontWeight: 700, color: theme.TEXT }}>{plan.title}</div>
            <p className="kk-b" style={{ fontSize: 15, opacity: 0.8, margin: "6px 0", color: theme.TEXT }}>{plan.summary}</p>
            <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: ACCENT, marginTop: 10 }}>
              ◷ Kochtag: {plan.cookDay}
            </div>
            {plan.cookSession?.length > 0 && (
              <ul className="kk-b" style={{ fontSize: 14, paddingLeft: 18, margin: "6px 0", color: theme.TEXT }}>
                {plan.cookSession.map((c, i) => <li key={i} style={{ marginBottom: 3 }}>{c}</li>)}
              </ul>
            )}
          </Card>

          {/* Tages-Karten mit vollem Rezept-Detail */}
          {plan.days?.map((d, i) => {
            const tag = WEEKDAY_TAGS[d.day];
            // Passendes gespeichertes Rezept finden
            const matchedRecipe = recipes?.find(r =>
              r.title && d.meal && (
                r.title.toLowerCase().includes(d.meal.toLowerCase().slice(0, 8)) ||
                d.meal.toLowerCase().includes(r.title.toLowerCase().slice(0, 8))
              )
            );

            return (
              <div key={i} className="kk-card" style={{ background: theme.CARD, border: `1.5px solid ${theme.BORDER}`, borderRadius: 16, padding: "14px", marginBottom: 10 }}>
                {/* Tag-Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ background: ACCENT, color: "#fff", borderRadius: 10, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="kk-h" style={{ fontSize: 15, fontWeight: 900 }}>{d.day?.slice(0, 2).toUpperCase()}</span>
                    {tag && <span style={{ fontSize: 14 }}>{tag.emoji}</span>}
                  </div>
                  {tag?.urgent && <span className="kk-b" style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>⚡ {tag.urgent}</span>}
                  {d.isLeftover && <span className="kk-b" style={{ fontSize: 11, color: SAGE, fontWeight: 700 }}>♻ Resteverwertung</span>}
                  {d.minutes && <span className="kk-b" style={{ fontSize: 11, color: theme.MUTED }}>⏱ {d.minutes} Min</span>}
                </div>

                {/* Gerichtsname */}
                <div className="kk-h" style={{ fontSize: 18, fontWeight: 800, color: theme.TEXT, marginBottom: 4 }}>{d.meal}</div>
                {d.note && <div className="kk-b" style={{ fontSize: 13.5, color: SAGE, fontStyle: "italic", marginBottom: 8 }}>{d.note}</div>}
                {d.thawTonight && d.thawTonight.trim() && (
                  <div className="kk-b" style={{ fontSize: 12.5, color: "#6E8CA0", fontWeight: 600, marginBottom: 8 }}>
                    ❄ Heute Abend auftauen: {d.thawTonight}
                  </div>
                )}

                {/* Passendes Rezept aus gespeicherten Rezepten */}
                {matchedRecipe && (
                  <div style={{ background: theme.SAGE_BG, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                    <div className="kk-b" style={{ fontSize: 12, color: SAGE, fontWeight: 700, marginBottom: 6 }}>📖 Gespeichertes Rezept gefunden:</div>

                    {/* Zutaten mit Mengen */}
                    <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, color: theme.TEXT, marginBottom: 4 }}>Zutaten ({matchedRecipe.portions} Port.):</div>
                    <ul style={{ margin: "0 0 8px", paddingLeft: 16 }}>
                      {matchedRecipe.ingredients?.map((ing, k) => (
                        <li key={k} className="kk-b" style={{ fontSize: 13.5, color: theme.TEXT, marginBottom: 2 }}>
                          <span style={{ fontWeight: 700 }}>{ing.amount}</span> {ing.item}
                          {ing.fromFreezer && <span style={{ color: "#6E8CA0", fontSize: 11 }}> ❄TK</span>}
                        </li>
                      ))}
                    </ul>

                    {/* Nährwerte */}
                    {matchedRecipe.nutrition && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
                        {[
                          { l: "kcal", v: matchedRecipe.nutrition.kcal, c: ACCENT },
                          { l: "Eiweiß", v: matchedRecipe.nutrition.protein ? matchedRecipe.nutrition.protein + "g" : null, c: SAGE },
                          { l: "Kohlenhydr.", v: matchedRecipe.nutrition.carbs ? matchedRecipe.nutrition.carbs + "g" : null, c: GOLD },
                          { l: "Fett", v: matchedRecipe.nutrition.fat ? matchedRecipe.nutrition.fat + "g" : null, c: "#6E8CA0" },
                        ].filter(n => n.v).map((n, ni) => (
                          <div key={ni} style={{ background: n.c + "18", borderRadius: 8, padding: "4px 6px", textAlign: "center" }}>
                            <div className="kk-h" style={{ fontSize: 14, fontWeight: 900, color: n.c }}>{n.v}</div>
                            <div className="kk-b" style={{ fontSize: 9, color: theme.MUTED }}>{n.l}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Buttons: Rezept öffnen + Einfrieren */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setTab("recipes")} className="kk-btn kk-b"
                        style={{ flex: 1, background: ACCENT, color: "#fff", padding: "9px", borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
                        📖 Rezept öffnen
                      </button>
                      {setFreezer && (
                        <button onClick={() => {
                          const d2 = new Date(); d2.setMonth(d2.getMonth() + 3);
                          const bb = d2.toISOString().slice(0, 10);
                          setFreezer(prev => [...prev, {
                            id: Date.now(), name: `${matchedRecipe.title} (${matchedRecipe.portions} Port.)`,
                            qty: `${matchedRecipe.portions} Portionen`, cat: "Fertiggericht", bestBefore: bb
                          }]);
                        }} className="kk-btn kk-b"
                          style={{ flex: 1, background: "#6E8CA0", color: "#fff", padding: "9px", borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
                          ❄ Einfrieren
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Kein Rezept gefunden — KI generieren */}
                {!matchedRecipe && (
                  <button onClick={() => setTab("recipes")} className="kk-btn kk-b"
                    style={{ background: "transparent", color: ACCENT, border: `1.5px solid ${ACCENT}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, width: "100%" }}>
                    ✦ Rezept für diesen Tag generieren →
                  </button>
                )}
              </div>
            );
          })}

          {plan.shoppingList?.length > 0 && (
            <button onClick={toShopping} className="kk-btn kk-b"
              style={{ marginTop: 4, background: DEEP, color: PAPER, padding: "13px", borderRadius: 12, fontWeight: 700, fontSize: 16, width: "100%" }}>
              🛒 {plan.shoppingList.length} Zutaten → Einkaufsliste
            </button>
          )}

          {showSkipped && skippedItems.length > 0 && (
            <div style={{ marginTop: 10, background: SAGE + "18", border: `1.5px solid ${SAGE}55`, borderRadius: 12, padding: "12px 14px" }}>
              <div className="kk-b" style={{ fontSize: 14, fontWeight: 700, color: SAGE, marginBottom: 6 }}>
                ✓ {skippedItems.length} bereits im Vorrat — nicht auf die Liste:
              </div>
              {skippedItems.map((item, i) => (
                <div key={i} className="kk-b" style={{ fontSize: 13, color: SAGE, padding: "2px 0" }}>· {item}</div>
              ))}
              <button onClick={() => setShowSkipped(false)} className="kk-btn kk-b"
                style={{ marginTop: 8, fontSize: 12, color: SAGE, background: "transparent", padding: 0, fontWeight: 600 }}>
                × schließen
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Wochen-Übergabe ----------------
function WeekHandover({ freezer, pantry, plan, recipes, setTab }) {
  const theme = useTheme();
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=So, 1=Mo...
  const isSunday = dayOfWeek === 0;
  const daysUntilSunday = isSunday ? 0 : 7 - dayOfWeek;
  const nextSunday = new Date(today); nextSunday.setDate(today.getDate() + daysUntilSunday);

  // Was läuft diese Woche ab (≤7 Tage)
  const expiringThisWeek = freezer
    .filter((f) => f.bestBefore && daysUntil(f.bestBefore) >= 0 && daysUntil(f.bestBefore) <= 7)
    .sort((a, b) => daysUntil(a.bestBefore) - daysUntil(b.bestBefore));

  // Was läuft nächste Woche ab (8–14 Tage)
  const expiringNextWeek = freezer
    .filter((f) => f.bestBefore && daysUntil(f.bestBefore) >= 8 && daysUntil(f.bestBefore) <= 14)
    .sort((a, b) => daysUntil(a.bestBefore) - daysUntil(b.bestBefore));

  // Vorrat fast leer
  const lowPantry = pantry.filter((p) => p.low);

  // Reste aus diesem Wochenplan die weiterverwendet werden können
  const reuseable = (plan?.days || [])
    .filter((d) => d.note && d.note.toLowerCase().includes("rest"))
    .concat((recipes || []).filter((r) => r.reuse).map((r) => ({ meal: r.title, note: r.reuse })));

  // Gefrierschrank-Bestand nach Kategorien
  const freezerByCat = CATEGORIES.map((c) => [c, freezer.filter((f) => f.cat === c)]).filter(([, arr]) => arr.length);

  // Checklist für Sonntagsritual
  const [checks, setChecks] = useState({});
  const SUNDAY_TASKS = [
    "Gefrierschrank durchschauen — was muss diese Woche weg?",
    "Wochenplan für nächste Woche erstellen",
    "Picnic-Bestellung aufgeben",
    "Brot-Prep mit Hanna & Timo (Sonntag)",
    "Batch-Kochtag planen — was wird vorgekocht?",
    "Klammern zählen & einlösen (18:00 Familienrat)",
    "Backup erstellen",
  ];

  return (
    <div className="kk-pop">
      <SectionTitle>Wochen-Übergabe</SectionTitle>

      {/* Sonntagsinfo */}
      <div className="kk-card" style={{ background: isSunday ? ACCENT : theme.CARD, color: isSunday ? "#fff" : theme.TEXT, border: `2px solid ${isSunday ? ACCENT : theme.BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.75, marginBottom: 4 }}>
          {isSunday ? "🎯 Heute ist Sonntag — Übergabe-Tag!" : `📅 Nächster Übergabe-Sonntag`}
        </div>
        <div className="kk-h" style={{ fontSize: 22, fontWeight: 900 }}>
          {isSunday ? "Alles auf einen Blick" : nextSunday.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        {!isSunday && <div className="kk-b" style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>in {daysUntilSunday} {daysUntilSunday === 1 ? "Tag" : "Tagen"}</div>}
      </div>

      {/* Dringend: läuft diese Woche ab */}
      {expiringThisWeek.length > 0 && (
        <>
          <SectionTitle small>🔴 Diese Woche aufbrauchen</SectionTitle>
          <Card>
            {expiringThisWeek.map((f, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < expiringThisWeek.length - 1 ? `1px solid ${theme.BORDER}` : "none" }}>
                <span className="kk-b" style={{ fontSize: 15, color: theme.TEXT }}>{f.name} <span style={{ opacity: 0.55 }}>· {f.qty}</span></span>
                <span className="kk-b" style={{ fontSize: 14, color: "#C0392B", fontWeight: 700 }}>{daysUntil(f.bestBefore)} T.</span>
              </div>
            ))}
            <button onClick={() => setTab("recipes")} className="kk-btn kk-b"
              style={{ background: ACCENT, color: "#fff", padding: "9px 14px", borderRadius: 10, fontWeight: 700, fontSize: 14.5, marginTop: 10, width: "100%" }}>
              ✦ Rezept aus Resten generieren
            </button>
          </Card>
        </>
      )}

      {/* Nächste Woche einplanen */}
      {expiringNextWeek.length > 0 && (
        <>
          <SectionTitle small>🟠 Nächste Woche einplanen</SectionTitle>
          <Card>
            {expiringNextWeek.map((f, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < expiringNextWeek.length - 1 ? `1px solid ${theme.BORDER}` : "none" }}>
                <span className="kk-b" style={{ fontSize: 15, color: theme.TEXT }}>{f.name} <span style={{ opacity: 0.55 }}>· {f.qty}</span></span>
                <span className="kk-b" style={{ fontSize: 14, color: GOLD, fontWeight: 700 }}>{daysUntil(f.bestBefore)} T.</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Reste die weiterverwendet werden können */}
      {reuseable.length > 0 && (
        <>
          <SectionTitle small>♻ Reste für nächste Woche</SectionTitle>
          <Card>
            {reuseable.slice(0, 5).map((r, i) => (
              <div key={i} style={{ padding: "7px 0", borderBottom: i < Math.min(reuseable.length, 5) - 1 ? `1px solid ${theme.BORDER}` : "none" }}>
                <div className="kk-b" style={{ fontSize: 15, fontWeight: 600, color: theme.TEXT }}>{r.meal || r.title}</div>
                <div className="kk-b" style={{ fontSize: 13.5, color: SAGE, marginTop: 2 }}>{r.note}</div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Vorrat nachkaufen */}
      {lowPantry.length > 0 && (
        <>
          <SectionTitle small>⚠ Vorrat nachkaufen</SectionTitle>
          <Card>
            {lowPantry.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < lowPantry.length - 1 ? `1px solid ${theme.BORDER}` : "none" }}>
                <span className="kk-b" style={{ fontSize: 15, color: theme.TEXT }}>{p.name}</span>
                <span className="kk-b" style={{ fontSize: 13.5, opacity: 0.6 }}>{p.qty}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Gefrierschrank-Überblick */}
      {freezer.length > 0 && (
        <>
          <SectionTitle small>❄ Gefrierschrank-Stand</SectionTitle>
          <Card>
            {freezerByCat.map(([c, arr], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < freezerByCat.length - 1 ? `1px solid ${theme.BORDER}` : "none" }}>
                <span className="kk-b" style={{ fontSize: 14.5, color: CAT_COLORS[c], fontWeight: 700 }}>{c}</span>
                <span className="kk-b" style={{ fontSize: 14.5, color: theme.TEXT }}>{arr.length} {arr.length === 1 ? "Artikel" : "Artikel"} · {arr.map((f) => f.name).slice(0, 2).join(", ")}{arr.length > 2 ? "…" : ""}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Sonntags-Checkliste */}
      <SectionTitle small>☑ Sonntags-Checkliste</SectionTitle>
      <Card>
        {SUNDAY_TASKS.map((t, i) => (
          <label key={i} className="kk-b" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < SUNDAY_TASKS.length - 1 ? `1px solid ${theme.BORDER}` : "none", cursor: "pointer" }}>
            <input type="checkbox" checked={!!checks[i]} onChange={() => setChecks({ ...checks, [i]: !checks[i] })}
              style={{ width: 20, height: 20, accentColor: ACCENT, flexShrink: 0 }} />
            <span style={{ fontSize: 15, textDecoration: checks[i] ? "line-through" : "none", opacity: checks[i] ? 0.45 : 1, color: theme.TEXT }}>{t}</span>
          </label>
        ))}
        <div className="kk-b" style={{ fontSize: 13, opacity: 0.5, marginTop: 10 }}>
          {Object.values(checks).filter(Boolean).length}/{SUNDAY_TASKS.length} erledigt
        </div>
      </Card>

      {/* Direkt-Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
        <button onClick={() => setTab("plan")} className="kk-btn kk-b" style={{ background: ACCENT, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>▤ Neuer Wochenplan</button>
        <button onClick={() => setTab("shopping")} className="kk-btn kk-b" style={{ background: SAGE, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>🛒 Einkauf planen</button>
      </div>
    </div>
  );
}

// ---------------- Wochen-Kalender ----------------
const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

// Aufwands-Tags pro Wochentag — für Rezept-Kopplung
const WEEKDAY_TAGS = {
  "Montag":    { emoji: "💪", label: "Start der Woche", maxMin: 45 },
  "Dienstag":  { emoji: "🍳", label: "Normal", maxMin: 40 },
  "Mittwoch":  { emoji: "🍳", label: "Normal", maxMin: 40 },
  "Donnerstag":{ emoji: "⚡", label: "Nachhilfe-Tag!", maxMin: 25, urgent: "Max. 25 Min! Nachhilfe 17:00 — 1 Topf" },
  "Freitag":   { emoji: "🎉", label: "Wochenende!", maxMin: 50 },
  "Samstag":   { emoji: "👨‍🍳", label: "Großer Kochtag", maxMin: 120 },
  "Sonntag":   { emoji: "☀️", label: "Entspannt", maxMin: 30 },
};
const DAY_EMOJI = { fleisch: "🍖", curry: "🍛", pasta: "🍝", lasagne: "🍝", suppe: "🍲", eintopf: "🍲", salat: "🥗", bowl: "🥗", reis: "🍚", pizza: "🍕", auflauf: "🧀", ofen: "🔥", wrap: "🌯", burger: "🍔", fisch: "🐟" };

function mealEmoji(meal) {
  const m = (meal || "").toLowerCase();
  for (const key in DAY_EMOJI) if (m.includes(key)) return DAY_EMOJI[key];
  return "🍽";
}

function WeekView({ plan, setPlan, setTab, freezer, setFreezer, calEvents, recipes, setRecipes, diet, health, household }) {
  const theme = useTheme();
  const [freezeDay, setFreezeDay] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualPlan, setManualPlan] = useState(() =>
    WEEKDAYS.map(d => ({ day: d, meal: "", note: "", minutes: 30, isLeftover: false, thawTonight: "" }))
  );
  const [assignDay, setAssignDay] = useState(null); // welcher Tag bekommt gerade ein Rezept
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const touchStartY = React.useRef(null);
  const touchDragIdx = React.useRef(null);

  const [genAllProgress, setGenAllProgress] = useState({ running: false, current: 0, total: 0, done: false });

  async function generateAllRecipes() {
    if (!plan?.days?.length) return;
    const days = plan.days.filter(d => d.meal && d.meal.trim());
    setGenAllProgress({ running: true, current: 0, total: days.length, done: false });

    const newRecipes = [...(recipes || [])];

    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      setGenAllProgress({ running: true, current: i + 1, total: days.length, done: false });

      // Skip if recipe already exists
      const already = newRecipes.find(r => r.title && d.meal && (
        r.title.toLowerCase().includes(d.meal.toLowerCase().slice(0, 8)) ||
        d.meal.toLowerCase().includes(r.title.toLowerCase().slice(0, 8))
      ));
      if (already) continue;

      try {
        const dietStr = Object.entries(diet || {}).filter(([,v])=>v).map(([k])=>k).join(", ") || "laktosefrei";
        const persons = household?.persons || 4;
        const prompt = `Erstelle ein detailliertes Rezept für: "${d.meal}". Für ${persons} Personen. Ernährung: ${dietStr}. Maximal ${d.minutes || 30} Minuten. Nur JSON ohne Markdown:
{"title":"${d.meal}","portions":${persons},"prepMinutes":${d.minutes||30},"reuse":"Reste-Tipp für Tag 2","estCostPerMeal":"3–6 €","totalCost":"Zahl","costPerPortion":"Zahl","ingredients":[{"item":"Name","amount":"Menge mit Einheit","fromFreezer":false}],"steps":["Schritt 1","Schritt 2"],"nutrition":{"kcal":Zahl,"protein":Zahl,"carbs":Zahl,"fat":Zahl}}`;

        const txt = await askClaude(prompt, 1500);
        const recipe = parseJSON(txt);
        if (recipe?.title) {
          recipe.id = Date.now() + i;
          recipe.fav = false;
          recipe.rating = 0;
          recipe.kidsLoved = false;
          recipe.cookedCount = 0;
          newRecipes.push(recipe);
          setRecipes([...newRecipes]);
        }
      } catch(e) {
        // Skip failed recipe, continue with next
      }

      // Small delay between requests
      if (i < days.length - 1) await new Promise(r => setTimeout(r, 800));
    }

    setGenAllProgress({ running: false, current: days.length, total: days.length, done: true });
    setTimeout(() => setGenAllProgress({ running: false, current: 0, total: 0, done: false }), 4000);
  }

  function swapDays(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx == null || toIdx == null) return;
    if (!plan || !plan.days) return;
    const newDays = [...plan.days];
    const sorted2 = [...newDays].sort((a, b) => {
      const ia = WEEKDAYS.findIndex((w) => (a.day || "").toLowerCase().startsWith(w.toLowerCase().slice(0, 2)));
      const ib = WEEKDAYS.findIndex((w) => (b.day || "").toLowerCase().startsWith(w.toLowerCase().slice(0, 2)));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    const fromDay = sorted2[fromIdx];
    const toDay = sorted2[toIdx];
    const fi = newDays.findIndex(d => d.day === fromDay.day);
    const ti = newDays.findIndex(d => d.day === toDay.day);
    if (fi === -1 || ti === -1) return;
    // Swap only meal/note/minutes, keep day names
    const tmpMeal = newDays[fi].meal; const tmpNote = newDays[fi].note; const tmpMin = newDays[fi].minutes;
    newDays[fi] = { ...newDays[fi], meal: newDays[ti].meal, note: newDays[ti].note, minutes: newDays[ti].minutes };
    newDays[ti] = { ...newDays[ti], meal: tmpMeal, note: tmpNote, minutes: tmpMin };
    setPlan({ ...plan, days: newDays });
    setDragIdx(null); setDragOverIdx(null);
  }



  const todayName = new Date().toLocaleDateString("de-DE", { weekday: "long" });
  const todayShort = todayName.slice(0, 2).toLowerCase();

  function assignRecipe(dayIdx, recipe) {
    const next = [...manualPlan];
    next[dayIdx] = { ...next[dayIdx], meal: recipe.title, note: recipe.reuse || "", minutes: recipe.prepMinutes || 30 };
    setManualPlan(next);
    setAssignDay(null);
  }

  function saveManualPlan() {
    setPlan({ title: "Manueller Wochenplan", summary: "Selbst zusammengestellt", cookDay: "Samstag", cookSession: [], days: manualPlan.filter(d => d.meal), shoppingList: [] });
    setManualMode(false);
  }

  if (!plan || !plan.days?.length) {
    return (
      <div className="kk-pop">
        <SectionTitle>Wochen-Kalender</SectionTitle>
        <Card>
          <div className="kk-b" style={{ fontSize: 15, opacity: 0.75, marginBottom: 12, color: theme.TEXT }}>
            Noch kein Wochenplan. KI-Batch-Plan erstellen oder Rezepte manuell zuweisen.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setTab("plan")} className="kk-btn kk-b"
              style={{ flex: 1, background: ACCENT, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
              ✦ Batch-Plan erstellen
            </button>
            <button onClick={() => setManualMode(true)} className="kk-btn kk-b"
              style={{ flex: 1, background: "transparent", color: SAGE, border: `1.5px solid ${SAGE}`, padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
              ✏ Manuell planen
            </button>
          </div>
        </Card>

        {/* Manueller Wochenplaner */}
        {manualMode && (
          <div>
            <SectionTitle small>✏ Rezepte zuweisen</SectionTitle>
            {manualPlan.map((d, i) => {
              const tag = WEEKDAY_TAGS[d.day];
              return (
                <div key={d.day} className="kk-card" style={{ background: theme.CARD, border: `1.5px solid ${theme.BORDER}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: d.meal ? 6 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{tag?.emoji}</span>
                      <span className="kk-b" style={{ fontSize: 16, fontWeight: 700, color: theme.TEXT }}>{d.day}</span>
                      {tag?.urgent && <span className="kk-b" style={{ fontSize: 11, color: ACCENT }}>⚡ max. {tag.maxMin} Min</span>}
                    </div>
                    <button onClick={() => setAssignDay(assignDay === i ? null : i)} className="kk-btn kk-b"
                      style={{ background: assignDay === i ? ACCENT : "transparent", color: assignDay === i ? "#fff" : ACCENT, border: `1.5px solid ${ACCENT}`, borderRadius: 16, fontSize: 12, fontWeight: 700, padding: "4px 12px" }}>
                      {d.meal ? "✏ ändern" : "+ Rezept"}
                    </button>
                  </div>
                  {d.meal && <div className="kk-b" style={{ fontSize: 14, color: SAGE, fontWeight: 600 }}>✓ {d.meal}</div>}
                  {assignDay === i && (
                    <div style={{ marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
                      {(recipes || []).length === 0 ? (
                        <div className="kk-b" style={{ fontSize: 13, color: theme.MUTED }}>Keine gespeicherten Rezepte — erst Rezepte generieren und speichern.</div>
                      ) : (recipes || []).map(r => (
                        <button key={r.id} onClick={() => assignRecipe(i, r)} className="kk-btn kk-b"
                          style={{ width: "100%", background: theme.CARD2, border: `1px solid ${theme.BORDER}`, borderRadius: 10, padding: "8px 12px", marginBottom: 4, textAlign: "left", color: theme.TEXT, fontSize: 14 }}>
                          {r.title} <span style={{ opacity: 0.55, fontSize: 12 }}>· {r.prepMinutes} Min · {r.portions} Port.</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={saveManualPlan} className="kk-btn kk-b"
              style={{ background: SAGE, color: "#fff", padding: "13px", borderRadius: 12, fontWeight: 700, fontSize: 16, width: "100%", marginTop: 8 }}>
              ✓ Wochenplan speichern
            </button>
          </div>
        )}
      </div>
    );
  }

  const sorted = [...plan.days].sort((a, b) => {
    const ia = WEEKDAYS.findIndex((w) => (a.day || "").toLowerCase().startsWith(w.toLowerCase().slice(0, 2)));
    const ib = WEEKDAYS.findIndex((w) => (b.day || "").toLowerCase().startsWith(w.toLowerCase().slice(0, 2)));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const thawDays = sorted.filter((d) => d.thawTonight && d.thawTonight.trim());

  return (
    <div className="kk-pop">
      <SectionTitle>Wochen-Kalender</SectionTitle>

      {/* Heute-Banner */}
      <div className="kk-card" style={{ background: SAGE, color: "#fff", borderRadius: 14, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>📅</span>
        <div>
          <div className="kk-b" style={{ fontSize: 13, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Heute ist</div>
          <div className="kk-h" style={{ fontSize: 19, fontWeight: 900 }}>{todayName}</div>
        </div>
        {(() => {
          const todayMeal = sorted.find((d) => (d.day || "").toLowerCase().startsWith(todayShort));
          return todayMeal ? (
            <div style={{ flex: 1, textAlign: "right" }}>
              <div className="kk-b" style={{ fontSize: 14, opacity: 0.8 }}>Heute Abend</div>
              <div className="kk-h" style={{ fontSize: 16, fontWeight: 700 }}>{todayMeal.meal?.replace(/^[^\s]+\s/, "")}</div>
            </div>
          ) : null;
        })()}
      </div>

      <Card highlight>
        <div className="kk-h" style={{ fontSize: 20, fontWeight: 600, color: theme.TEXT }}>{plan.title}</div>
        {plan.cookDay && (
          <div className="kk-b" style={{ fontSize: 14, color: ACCENT, fontWeight: 700, marginTop: 6 }}>
            ◷ Großer Kochtag: {plan.cookDay}
          </div>
        )}
      </Card>

      {thawDays.length > 0 && (
        <div className="kk-card" style={{ background: "#6E8CA0", color: "#fff", borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div className="kk-h" style={{ fontSize: 17, fontWeight: 900 }}>❄ Auftau-Erinnerungen</div>
          <div className="kk-b" style={{ fontSize: 14.5, marginTop: 6, lineHeight: 1.6 }}>
            {thawDays.map((d, i) => (
              <div key={i}>Am Vorabend von <b>{d.day}</b>: {d.thawTonight} auftauen</div>
            ))}
          </div>
        </div>
      )}

      {/* Alle Rezepte generieren */}
      <button onClick={generateAllRecipes} disabled={genAllProgress.running} className="kk-btn kk-b"
        style={{ marginBottom: 14, background: genAllProgress.done ? SAGE : ACCENT, color: "#fff", padding: "13px", borderRadius: 12, fontWeight: 700, fontSize: 15, width: "100%", opacity: genAllProgress.running ? 0.85 : 1 }}>
        {genAllProgress.done ? "✓ Alle Rezepte generiert!" :
         genAllProgress.running ? `✦ Generiere ${genAllProgress.current}/${genAllProgress.total}…` :
         "✦ Alle Rezepte dieser Woche generieren"}
      </button>
      {genAllProgress.running && (
        <div style={{ marginBottom: 14, background: theme.CARD, borderRadius: 10, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${(genAllProgress.current / genAllProgress.total) * 100}%`, height: "100%", background: ACCENT, borderRadius: 10, transition: "width 0.5s ease" }} />
        </div>
      )}

      {/* Timeline */}
      {sorted.map((d, i) => {
        const isToday = (d.day || "").toLowerCase().startsWith(todayShort);
        return (
        <div key={i}
          className="kk-card"
          draggable
          onDragStart={() => setDragIdx(i)}
          onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
          onDragEnd={() => swapDays(dragIdx, dragOverIdx)}
          onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; touchDragIdx.current = i; }}
          onTouchEnd={(e) => {
            const endY = e.changedTouches[0].clientY;
            const diff = endY - touchStartY.current;
            if (Math.abs(diff) > 40) {
              const targetIdx = diff > 0 ? Math.min(sorted.length - 1, i + 1) : Math.max(0, i - 1);
              swapDays(i, targetIdx);
            }
            touchStartY.current = null; touchDragIdx.current = null;
          }}
          style={{ display: "flex", gap: 12, background: dragOverIdx === i ? SAGE + "28" : (isToday ? SAGE + "18" : theme.CARD), border: `${isToday ? "2.5px" : "1.5px"} solid ${dragOverIdx === i ? SAGE : (isToday ? SAGE : theme.BORDER)}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, position: "relative", cursor: "grab", transition: "background 0.2s, border 0.2s", opacity: dragIdx === i ? 0.6 : 1 }}>
          {isToday && (
            <div style={{ position: "absolute", top: -1, left: 14, background: SAGE, color: "#fff", fontSize: 12, fontWeight: 900, padding: "2px 10px", borderRadius: "0 0 8px 8px" }} className="kk-b">
              HEUTE
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 46, marginTop: isToday ? 8 : 0 }}>
            <div style={{ fontSize: 11, opacity: 0.3, marginBottom: 2, letterSpacing: 1 }}>⠿</div>
            <div className="kk-h" style={{ fontSize: 13, fontWeight: 900, color: isToday ? SAGE : ACCENT, textTransform: "uppercase" }}>{(d.day || "").slice(0, 2)}</div>
            <div style={{ fontSize: 24, marginTop: 2 }}>{mealEmoji(d.meal)}</div>
            {WEEKDAY_TAGS[d.day] && <div style={{ fontSize: 14, marginTop: 2 }} title={WEEKDAY_TAGS[d.day].label}>{WEEKDAY_TAGS[d.day].emoji}</div>}
          </div>
          <div style={{ flex: 1, marginTop: isToday ? 8 : 0 }}>
            <div className="kk-b" style={{ fontSize: 16.5, fontWeight: isToday ? 700 : 600, color: theme.TEXT }}>
              <input
                value={d.meal}
                onChange={e => {
                  if (!setPlan || !plan) return;
                  const newDays = plan.days.map((day, di) => di === i ? { ...day, meal: e.target.value } : day);
                  setPlan({ ...plan, days: newDays });
                }}
                style={{ background: "transparent", border: "none", borderBottom: `1px solid ${theme.BORDER}`, width: "100%", fontSize: 16.5, fontWeight: isToday ? 700 : 600, color: theme.TEXT, fontFamily: "inherit", padding: "2px 0", outline: "none" }}
                placeholder="Gericht eingeben…"
              />
            </div>
            {WEEKDAY_TAGS[d.day]?.urgent && (
              <div className="kk-b" style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginTop: 2 }}>⚡ {WEEKDAY_TAGS[d.day].urgent}</div>
            )}
            {/* Termine dieses Tages */}
            {(calEvents || []).filter(e => e.day === d.day).map((ev, ei) => (
              <div key={ei} className="kk-b" style={{ fontSize: 12, color: "#6E8CA0", fontWeight: 600, marginTop: 3 }}>
                📅 {ev.time} {ev.name} ({ev.duration} Min)
              </div>
            ))}
            {d.note && <div className="kk-b" style={{ fontSize: 14, opacity: 0.65, marginTop: 4, color: theme.TEXT }}>{d.note}</div>}

            {/* Passendes gespeichertes Rezept */}
            {(() => {
              const matched = (recipes || []).find(r =>
                r.title && d.meal && (
                  r.title.toLowerCase().includes(d.meal.toLowerCase().slice(0, 8)) ||
                  d.meal.toLowerCase().includes(r.title.toLowerCase().slice(0, 8))
                )
              );
              if (!matched) return null;
              return (
                <div style={{ background: theme.SAGE_BG, borderRadius: 12, padding: "10px", marginTop: 8 }}>
                  <div className="kk-b" style={{ fontSize: 12, color: SAGE, fontWeight: 700, marginBottom: 6 }}>📖 Rezept · {matched.portions} Port. · {matched.prepMinutes} Min</div>
                  {/* Zutaten mit Mengen */}
                  <ul style={{ margin: "0 0 8px", paddingLeft: 16 }}>
                    {matched.ingredients?.slice(0, 6).map((ing, k) => (
                      <li key={k} className="kk-b" style={{ fontSize: 13, color: theme.TEXT, marginBottom: 1 }}>
                        <b>{ing.amount}</b> {ing.item}{ing.fromFreezer ? " ❄" : ""}
                      </li>
                    ))}
                    {matched.ingredients?.length > 6 && (
                      <li className="kk-b" style={{ fontSize: 12, color: theme.MUTED }}>+ {matched.ingredients.length - 6} weitere…</li>
                    )}
                  </ul>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setTab("recipes")} className="kk-btn kk-b"
                      style={{ flex: 1, background: ACCENT, color: "#fff", padding: "8px", borderRadius: 9, fontWeight: 700, fontSize: 12 }}>
                      📖 Öffnen
                    </button>
                    {setFreezer && (
                      <button onClick={() => {
                        const dd = new Date(); dd.setMonth(dd.getMonth() + 3);
                        setFreezer(prev => [...prev, { id: Date.now(), name: `${matched.title} (Reste)`, qty: `${matched.portions} Portionen`, cat: "Fertiggericht", bestBefore: dd.toISOString().slice(0, 10) }]);
                      }} className="kk-btn kk-b"
                        style={{ flex: 1, background: "#6E8CA0", color: "#fff", padding: "8px", borderRadius: 9, fontWeight: 700, fontSize: 12 }}>
                        ❄ Einfrieren
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
              {d.minutes ? <Chip color={SAGE}>⏱ {d.minutes} Min</Chip> : null}
              {d.isLeftover ? <Chip color={GOLD}>♻ Resteverwertung</Chip> : null}
              {d.thawTonight && d.thawTonight.trim() ? <Chip color="#6E8CA0">❄ vorher auftauen</Chip> : null}
            </div>
            {freezeDay === d.day && freezer && setFreezer && (
              <FreezeAssistant
                suggestedName={`${d.meal?.replace(/^[^\s]+\s/, "") || "Gericht"} (Reste)`}
                freezer={freezer}
                setFreezer={setFreezer}
                onClose={() => setFreezeDay(null)}
              />
            )}
          </div>
        </div>
        );
      })}

      <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.55, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
        Tipp: Die „❄ vorher auftauen"-Hinweise zeigen, was du am Vorabend aus dem Gefrierschrank nehmen musst.
      </div>
    </div>
  );
}

function Chip({ children, color }) {
  return <span className="kk-b" style={{ background: color, color: "#fff", borderRadius: 14, padding: "3px 9px", fontSize: 12.5, fontWeight: 600 }}>{children}</span>;
}

// ---------------- Gamification: Level & Erfolge ----------------
// ---------------- Schnell-Notizen ----------------
function QuickNotes() {
  const theme = useTheme();
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadKey("quick_notes", []).then(n => { setNotes(n); setLoaded(true); });
  }, []);
  useEffect(() => { if (loaded) saveKey("quick_notes", notes); }, [notes, loaded]);

  function addNote() {
    if (!text.trim()) return;
    setNotes(prev => [{ id: Date.now(), text: text.trim(), date: new Date().toISOString() }, ...prev]);
    setText("");
  }

  function deleteNote(id) { setNotes(prev => prev.filter(n => n.id !== id)); }

  return (
    <div className="kk-pop">
      <SectionTitle>Schnell-Notizen</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 13, color: theme.MUTED, marginBottom: 8 }}>
          Gedanken, Ideen, Merkzettel — immer verfügbar.
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
          placeholder="Notiz schreiben… (Enter zum Speichern)"
          rows={3}
          style={{ ...inp, resize: "none", fontSize: 15, lineHeight: 1.5, marginBottom: 8, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }}
        />
        <button onClick={addNote} className="kk-btn kk-b"
          style={{ background: ACCENT, color: "#fff", padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 15, width: "100%" }}>
          + Notiz speichern
        </button>
      </Card>

      {notes.length === 0 ? (
        <div className="kk-b" style={{ textAlign: "center", color: theme.MUTED, fontSize: 14, padding: "24px 0" }}>
          Noch keine Notizen — schreibe oben die erste.
        </div>
      ) : notes.map(n => (
        <div key={n.id} className="kk-card" style={{ background: theme.CARD, border: `1.5px solid ${theme.BORDER}`, borderLeft: `4px solid ${GOLD}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, position: "relative" }}>
          <button onClick={() => deleteNote(n.id)} className="kk-btn"
            style={{ position: "absolute", top: 8, right: 10, background: "transparent", color: theme.MUTED, fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
          <div className="kk-b" style={{ fontSize: 15, color: theme.TEXT, lineHeight: 1.6, paddingRight: 24 }}>{n.text}</div>
          <div className="kk-b" style={{ fontSize: 11.5, color: theme.MUTED, marginTop: 6 }}>
            {new Date(n.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Kalender-Termine ----------------
function CalendarEvents({ events, setEvents }) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [day, setDay] = useState("Montag");
  const [time, setTime] = useState("17:00");
  const [duration, setDuration] = useState(60);
  const [repeat, setRepeat] = useState("weekly");
  const [maxMinAfter, setMaxMinAfter] = useState(30);
  const [importMsg, setImportMsg] = useState("");
  const icsRef = React.useRef();

  function addEvent() {
    if (!name.trim()) return;
    const ev = { id: Date.now(), name: name.trim(), day, time, duration, repeat, maxMinAfter };
    setEvents(prev => [...prev, ev]);
    setName(""); setTime("17:00"); setDuration(60); setMaxMinAfter(30);
  }

  function removeEvent(id) { setEvents(prev => prev.filter(e => e.id !== id)); }

  // .ics-Datei einlesen
  async function importIcs(e) {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    setImportMsg("Lese Kalender…");
    try {
      const text = await file.text();
      const imported = [];
      const lines = text.split(/\r?\n/);
      let current = {};
      lines.forEach(l => {
        if (l.startsWith("BEGIN:VEVENT")) current = {};
        if (l.startsWith("SUMMARY:")) current.name = l.replace("SUMMARY:", "").trim();
        if (l.startsWith("DTSTART")) {
          const val = l.split(":")[1]?.trim();
          if (val) {
            // Wochentag extrahieren
            const d = new Date(
              val.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6")
            );
            const days = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
            current.day = days[d.getDay()] || "Montag";
            current.time = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
          }
        }
        if (l.startsWith("DURATION:")) {
          const m = l.match(/PT(\d+)H/) || l.match(/PT(\d+)M/);
          current.duration = m ? parseInt(m[1]) * (l.includes("H") ? 60 : 1) : 60;
        }
        if (l.startsWith("RRULE:")) {
          current.repeat = l.includes("WEEKLY") ? "weekly" : l.includes("MONTHLY") ? "monthly" : "once";
        }
        if (l.startsWith("END:VEVENT") && current.name) {
          imported.push({ id: Date.now() + Math.random(), maxMinAfter: 30, repeat: "weekly", duration: 60, ...current });
        }
      });
      setEvents(prev => [...prev, ...imported]);
      setImportMsg(`✓ ${imported.length} Termine importiert.`);
    } catch { setImportMsg("Fehler beim Lesen — ist es eine .ics-Datei?"); }
  }

  const byDay = WEEKDAYS.reduce((acc, d) => {
    acc[d] = (events || []).filter(e => e.day === d);
    return acc;
  }, {});

  return (
    <div className="kk-pop">
      <SectionTitle>Kalender & Termine</SectionTitle>

      {/* .ics Import */}
      <Card highlight>
        <div className="kk-b" style={{ fontSize: 14, fontWeight: 700, color: theme.TEXT, marginBottom: 6 }}>
          📥 iCloud-Kalender importieren
        </div>
        <div className="kk-b" style={{ fontSize: 13, color: theme.MUTED, marginBottom: 10, lineHeight: 1.5 }}>
          Exportiere deinen Kalender unter iCloud.com → Kalender → ⋮ → Kalender exportieren. Dann hier hochladen — alle Termine werden importiert und beeinflussen die KI-Planung.
        </div>
        <input ref={icsRef} type="file" accept=".ics,text/calendar" onChange={importIcs} style={{ display: "none" }} />
        <button onClick={() => icsRef.current?.click()} className="kk-btn kk-b"
          style={{ background: ACCENT, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 15, width: "100%" }}>
          📁 .ics-Datei hochladen
        </button>
        {importMsg && <div className="kk-b" style={{ fontSize: 13, color: importMsg.startsWith("✓") ? SAGE : ACCENT, marginTop: 8 }}>{importMsg}</div>}
      </Card>

      {/* Manuell hinzufügen */}
      <SectionTitle small>➕ Termin manuell eintragen</SectionTitle>
      <Card>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Terminname z.B. Nachhilfe Hanna & Timo"
          style={{ ...inp, marginBottom: 8, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <select value={day} onChange={e => setDay(e.target.value)}
            style={{ ...inp, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }}>
            {WEEKDAYS.map(d => <option key={d}>{d}</option>)}
          </select>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            style={{ ...inp, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <div className="kk-b" style={{ fontSize: 12, color: theme.MUTED, marginBottom: 4 }}>Dauer (Min)</div>
            <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)} min={15} max={240}
              style={{ ...inp, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }} />
          </div>
          <div>
            <div className="kk-b" style={{ fontSize: 12, color: theme.MUTED, marginBottom: 4 }}>Kochzeit danach max.</div>
            <select value={maxMinAfter} onChange={e => setMaxMinAfter(parseInt(e.target.value))}
              style={{ ...inp, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }}>
              <option value={15}>15 Min</option>
              <option value={20}>20 Min</option>
              <option value={25}>25 Min</option>
              <option value={30}>30 Min</option>
              <option value={45}>45 Min</option>
              <option value={60}>60 Min</option>
            </select>
          </div>
        </div>
        <select value={repeat} onChange={e => setRepeat(e.target.value)}
          style={{ ...inp, marginBottom: 10, background: theme.INP_BG, color: theme.TEXT, border: `1.5px solid ${theme.INP_BORDER}` }}>
          <option value="weekly">Wöchentlich wiederkehrend</option>
          <option value="monthly">Monatlich</option>
          <option value="once">Einmalig</option>
        </select>
        <button onClick={addEvent} className="kk-btn kk-b"
          style={{ background: ACCENT, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 15, width: "100%" }}>
          + Termin hinzufügen
        </button>
      </Card>

      {/* Wochenübersicht */}
      <SectionTitle small>📅 Deine Termine</SectionTitle>
      {WEEKDAYS.map(d => {
        const dayEvents = byDay[d] || [];
        const tag = WEEKDAY_TAGS[d];
        return (
          <div key={d} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{tag?.emoji}</span>
              <span className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: theme.TEXT }}>{d}</span>
              {tag?.urgent && <span className="kk-b" style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>⚡ {tag.label}</span>}
              {dayEvents.length === 0 && <span className="kk-b" style={{ fontSize: 12, color: theme.MUTED, marginLeft: 4 }}>frei</span>}
            </div>
            {dayEvents.map(ev => (
              <div key={ev.id} className="kk-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: theme.CARD, border: `1.5px solid ${theme.BORDER}`, borderLeft: `4px solid ${ACCENT}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
                <div>
                  <div className="kk-b" style={{ fontSize: 15, fontWeight: 600, color: theme.TEXT }}>{ev.name}</div>
                  <div className="kk-b" style={{ fontSize: 12.5, color: theme.MUTED }}>
                    {ev.time} · {ev.duration} Min · danach max. {ev.maxMinAfter} Min kochen
                    {ev.repeat === "weekly" ? " · wöchentlich" : ev.repeat === "monthly" ? " · monatlich" : " · einmalig"}
                  </div>
                </div>
                <button onClick={() => removeEvent(ev.id)} className="kk-btn"
                  style={{ background: "transparent", color: ACCENT, fontSize: 20, padding: "0 6px", lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        );
      })}

      {(events || []).length === 0 && (
        <div className="kk-b" style={{ textAlign: "center", color: theme.MUTED, fontSize: 14, padding: "24px 0" }}>
          Noch keine Termine — trage sie oben ein oder importiere deinen iCloud-Kalender.
        </div>
      )}
    </div>
  );
}

function GamificationTab({ gamification: g, recipes }) {
  const theme = useTheme();
  const xp = g?.xp || 0;
  const currentLevel = getCurrentLevel(xp);
  const nextLevel = getNextLevel(xp);
  const xpToNext = nextLevel ? nextLevel.xp - xp : 0;
  const xpProgress = nextLevel ? ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100 : 100;
  const earned = g?.achievements || [];

  // Stats aus echten Daten
  const totalCooked = recipes.reduce((s, r) => s + (r.cookedCount || 0), 0);
  const kidsLovedCount = recipes.filter((r) => r.kidsLoved).length;

  return (
    <div className="kk-pop">
      <SectionTitle>Level & Erfolge</SectionTitle>

      {/* Level-Hero */}
      <div style={{
        background: `linear-gradient(135deg, #1A1714 0%, #2A1F14 100%)`,
        borderRadius: 18, padding: "20px 18px", marginBottom: 14,
        boxShadow: `4px 4px 0 ${GOLD}66`, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -10, top: -10, fontSize: 80, opacity: 0.08 }}>{currentLevel.emoji}</div>

        <div className="kk-b" style={{ fontSize: 12.5, letterSpacing: 2, textTransform: "uppercase", color: GOLD, marginBottom: 6, fontWeight: 700 }}>
          Level {currentLevel.level}
        </div>
        <div className="kk-h" style={{ fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: 4 }}>
          {currentLevel.emoji} {currentLevel.title}
        </div>
        <div className="kk-b" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>
          {currentLevel.desc}
        </div>

        {/* XP-Balken */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span className="kk-b" style={{ fontSize: 14, color: GOLD, fontWeight: 700 }}>{xp} XP</span>
            {nextLevel && <span className="kk-b" style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Nächstes Level: {nextLevel.xp} XP ({xpToNext} fehlen)</span>}
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, height: 12, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, xpProgress)}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, ${ACCENT})`, borderRadius: 10, transition: "width .5s ease" }} />
          </div>
        </div>

        {nextLevel && (
          <div className="kk-b" style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)" }}>
            → Nächstes Level: {nextLevel.emoji} {nextLevel.title}
          </div>
        )}
      </div>

      {/* Stats-Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          ["🍳", totalCooked, "Mahlzeiten gekocht"],
          ["❄", g?.totalFrozen || 0, "Portionen eingefroren"],
          ["👦👧", kidsLovedCount, "Kinder-Lieblinge"],
          ["🌿", g?.noWasteDays || 0, "Tage kein Waste"],
          ["💰", g?.weekUnder25 || 0, "Sparwochen"],
          ["🔥", g?.cookStreak || 0, "Tage Streak"],
        ].map(([icon, val, label], i) => (
          <div key={i} style={{ background: theme.CARD, border: `1.5px solid ${theme.BORDER}`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 16 }}>{icon}</div>
            <div className="kk-h" style={{ fontSize: 22, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>{val}</div>
            <div className="kk-b" style={{ fontSize: 11, opacity: 0.6, marginTop: 2, color: theme.TEXT }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <SectionTitle small>🏆 Erfolge</SectionTitle>
      {ACHIEVEMENTS.map((a) => {
        const done = earned.includes(a.key);
        return (
          <div key={a.key} className="kk-card" style={{ display: "flex", alignItems: "center", gap: 12, background: done ? (theme.PAPER === "#F4EDE2" ? "#FFFBEE" : "#1E1A00") : theme.CARD, border: `1.5px solid ${done ? GOLD : theme.BORDER}`, borderRadius: 12, padding: "11px 14px", marginBottom: 7, opacity: done ? 1 : 0.55 }}>
            <div style={{ fontSize: 24, flexShrink: 0, filter: done ? "none" : "grayscale(1)" }}>{a.emoji}</div>
            <div style={{ flex: 1 }}>
              <div className="kk-b" style={{ fontSize: 15.5, fontWeight: 600, color: done ? theme.TEXT : theme.MUTED }}>{a.title}</div>
              <div className="kk-b" style={{ fontSize: 13.5, color: theme.MUTED, marginTop: 1 }}>{a.desc}</div>
            </div>
            <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, color: done ? GOLD : theme.MUTED, flexShrink: 0 }}>
              {done ? "✓" : `+${a.xp} XP`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Klammern-Belohnungssystem ----------------
const KIDS = [
  { id: "hanna", name: "Hanna", age: 13, color: "#C084FC", emoji: "🌸" },
  { id: "timo", name: "Timo", age: 11, color: "#60A5FA", emoji: "⚡" },
];
const IND_GOAL = 10;    // → 30 Min Extra-Bildschirmzeit
const POOL_MOVIE = 40;  // → Filmabend
const POOL_OUTING = 70; // → Familienausflug

// Klammer-Gründe: positive Eigenschaft + Lob-Text
const CLIP_REASONS = [
  // Küche & Haushalt
  { emoji: "🍽", label: "Tisch gedeckt", talent: "Fürsorge", praise: "Du denkst an andere — das ist echtes Mitgefühl!" },
  { emoji: "🧹", label: "Zimmer aufgeräumt", talent: "Ordnungssinn", praise: "Du schaffst Ordnung — das entlastet die ganze Familie!" },
  { emoji: "🥪", label: "Brot mitgemacht", talent: "Teamgeist", praise: "Du hilfst beim Vorbereiten — das ist echter Teamgeist!" },
  { emoji: "🍳", label: "Beim Kochen geholfen", talent: "Küchenkompetenz", praise: "Du lernst kochen — eine Fähigkeit fürs Leben!" },
  { emoji: "🧺", label: "Wäsche gefaltet", talent: "Zuverlässigkeit", praise: "Zuverlässigkeit ist Gold — man kann sich auf dich verlassen!" },
  { emoji: "🛒", label: "Einkaufen geholfen", talent: "Verantwortung", praise: "Du übernimmst Verantwortung — das macht dich stark!" },
  // Schule & Lernen
  { emoji: "📚", label: "Hausaufgaben ohne Mahnen", talent: "Selbstständigkeit", praise: "Du brauchst keinen Antrieb von außen — das ist echte Stärke!" },
  { emoji: "✏️", label: "Gut in der Schule", talent: "Fleiß", praise: "Fleiß zahlt sich aus — du zeigst das jeden Tag!" },
  { emoji: "🎨", label: "Kreativ etwas gebaut", talent: "Kreativität", praise: "Deine Kreativität ist ein Geschenk — weiter so!" },
  // Soziales
  { emoji: "🤝", label: "Geschwister geholfen", talent: "Hilfsbereitschaft", praise: "Für andere da sein ist eine der schönsten Fähigkeiten!" },
  { emoji: "😊", label: "Freundlich & offen", talent: "Herzlichkeit", praise: "Deine Herzlichkeit macht alle glücklicher!" },
  { emoji: "💬", label: "Gut kommuniziert", talent: "Kommunikation", praise: "Du sprichst klar und offen — das ist so wertvoll!" },
  { emoji: "💪", label: "Trotz Schwierigkeiten durchgehalten", talent: "Durchhaltevermögen", praise: "Nicht aufgeben wenn es schwer wird — das macht dich besonders!" },
  { emoji: "🌟", label: "Besonderer Moment", talent: "Besonderes Talent", praise: "Das war etwas ganz Besonderes — du hast beeindruckt!" },
  { emoji: "🐾", label: "Um Tier gekümmert", talent: "Empathie", praise: "Empathie für andere Lebewesen — du hast ein großes Herz!" },
];

function ClipRewards() {
  const theme = useTheme();
  const [clips, setClips] = useState({ hanna: 0, timo: 0 });
  const [log, setLog] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");
  const [showReasonPicker, setShowReasonPicker] = useState(null); // kidId
  const [lastPraise, setLastPraise] = useState(null); // { name, reason, praise }

  useEffect(() => {
    (async () => {
      setClips(await loadKey("clips", { hanna: 0, timo: 0 }));
      setLog(await loadKey("clips_log", []));
      setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (loaded) saveKey("clips", clips); }, [clips, loaded]);
  useEffect(() => { if (loaded) saveKey("clips_log", log); }, [log, loaded]);

  const pool = (clips.hanna || 0) + (clips.timo || 0);

  function addClip(kidId, reason) {
    const kid = KIDS.find((k) => k.id === kidId);
    const next = { ...clips, [kidId]: (clips[kidId] || 0) + 1 };
    setClips(next);
    const entry = {
      id: Date.now(), kid: kidId, name: kid.name, delta: 1,
      total: next[kidId], date: new Date().toISOString(),
      reason: reason?.label || "Klammer", talent: reason?.talent || "",
      praise: reason?.praise || "",
    };
    setLog([entry, ...log].slice(0, 100));
    setLastPraise({ name: kid.name, emoji: kid.emoji, color: kid.color, reason: reason?.label, talent: reason?.talent, praise: reason?.praise });
    setShowReasonPicker(null);
    setRedeemMsg("");
    setTimeout(() => setLastPraise(null), 4000);
  }

  function undoLastClip() {
    if (log.length === 0) return;
    const last = log[0];
    if (last.delta < 0) return; // Einlösung nicht rückgängig
    const next = { ...clips, [last.kid]: Math.max(0, (clips[last.kid] || 0) - last.delta) };
    setClips(next);
    setLog(log.slice(1));
    setRedeemMsg(`↩ Letzte Klammer für ${last.name} rückgängig gemacht.`);
    setTimeout(() => setRedeemMsg(""), 3000);
  }
  function redeem(type, kidId) {
    if (type === "individual") {
      const current = clips[kidId] || 0;
      if (current < IND_GOAL) return;
      const next = { ...clips, [kidId]: current - IND_GOAL };
      setClips(next);
      const kid = KIDS.find((k) => k.id === kidId);
      const entry = { id: Date.now(), kid: kidId, name: kid.name, delta: -IND_GOAL, total: next[kidId], date: new Date().toISOString(), redeemed: "30 Min Bildschirmzeit" };
      setLog([entry, ...log].slice(0, 100));
      setRedeemMsg(`✓ ${kid.name} hat 30 Min Extra-Bildschirmzeit eingelöst!`);
    } else {
      const cost = type === "movie" ? POOL_MOVIE : POOL_OUTING;
      const label = type === "movie" ? "Filmabend" : "Familienausflug";
      if (pool < cost) return;
      const ratio = cost / pool;
      const nextH = Math.round((clips.hanna || 0) - (clips.hanna || 0) * ratio);
      const nextT = Math.round((clips.timo || 0) - (clips.timo || 0) * ratio);
      setClips({ hanna: Math.max(0, nextH), timo: Math.max(0, nextT) });
      const entry = { id: Date.now(), kid: "pool", name: "Familie", delta: -cost, total: pool - cost, date: new Date().toISOString(), redeemed: label };
      setLog([entry, ...log].slice(0, 100));
      setRedeemMsg(`✓ ${label} eingelöst! Viel Spaß! 🎉`);
    }
  }

  function pct(val, max) { return Math.min(1, (val || 0) / max); }

  return (
    <div className="kk-pop">
      <SectionTitle>Klammern-Belohnungssystem</SectionTitle>

      {/* Lob-Toast */}
      {lastPraise && (
        <div className="kk-pop" style={{ background: lastPraise.color, color: "#fff", borderRadius: 18, padding: "16px 18px", marginBottom: 14, boxShadow: `0 8px 24px ${lastPraise.color}55` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 36 }}>{lastPraise.emoji}</div>
            <div>
              <div className="kk-b" style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Talent erkannt ✦</div>
              <div className="kk-h" style={{ fontSize: 20, fontWeight: 900 }}>{lastPraise.name} — {lastPraise.talent}</div>
              <div className="kk-b" style={{ fontSize: 14, opacity: 0.9, marginTop: 2 }}>„{lastPraise.praise}"</div>
              {lastPraise.reason && <div className="kk-b" style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>📌 {lastPraise.reason}</div>}
            </div>
          </div>
        </div>
      )}

      {redeemMsg && (
        <div className="kk-card" style={{ background: SAGE, color: "#fff", borderRadius: 14, padding: "12px 16px", marginBottom: 14, textAlign: "center" }}>
          <div className="kk-b" style={{ fontSize: 17, fontWeight: 700 }}>{redeemMsg}</div>
        </div>
      )}

      {/* Individuelle Konten */}
      {KIDS.map((kid) => {
        const c = clips[kid.id] || 0;
        const p = pct(c, IND_GOAL);
        const canRedeem = c >= IND_GOAL;
        const times = Math.floor(c / IND_GOAL);
        return (
          <Card key={kid.id} highlight={canRedeem}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div className="kk-h" style={{ width: 44, height: 44, borderRadius: "50%", background: kid.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{kid.emoji}</div>
              <div style={{ flex: 1 }}>
                <div className="kk-h" style={{ fontSize: 21, fontWeight: 900, color: theme.TEXT }}>{kid.name}</div>
                <div className="kk-b" style={{ fontSize: 14, opacity: 0.65, color: theme.TEXT }}>{IND_GOAL} Klammern → 30 Min Bildschirmzeit</div>
              </div>
              <div className="kk-h" style={{ fontSize: 34, fontWeight: 900, color: kid.color }}>{c}</div>
            </div>

            <div style={{ background: theme.DOT, borderRadius: 10, height: 14, marginBottom: 6, overflow: "hidden" }}>
              <div className="kk-bar" style={{ width: `${p * 100}%`, height: "100%", background: kid.color, borderRadius: 10 }} />
            </div>
            <div className="kk-b" style={{ fontSize: 14, opacity: 0.6, marginBottom: 12, color: theme.TEXT }}>
              {c % IND_GOAL}/{IND_GOAL} bis zur nächsten Belohnung{times > 0 ? ` · ${times}× einlösbar` : ""}
            </div>

            {/* +Klammer Button → Grund-Picker */}
            <button onClick={() => setShowReasonPicker(showReasonPicker === kid.id ? null : kid.id)} className="kk-btn kk-b"
              style={{ width: "100%", background: kid.color, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 17, marginBottom: showReasonPicker === kid.id ? 10 : 0 }}>
              {showReasonPicker === kid.id ? "× Abbrechen" : `+ Klammer für ${kid.name}`}
            </button>

            {/* Grund-Picker */}
            {showReasonPicker === kid.id && (
              <div className="kk-pop" style={{ marginTop: 8 }}>
                <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, color: theme.MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                  Wofür verdient {kid.name} eine Klammer?
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {CLIP_REASONS.map((r, i) => (
                    <button key={i} onClick={() => addClip(kid.id, r)} className="kk-btn kk-b"
                      style={{ background: theme.CARD, border: `1.5px solid ${kid.color}44`, borderRadius: 12, padding: "10px 8px", textAlign: "left", display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{r.emoji}</span>
                      <div>
                        <div className="kk-b" style={{ fontSize: 12, fontWeight: 700, color: theme.TEXT, lineHeight: 1.2 }}>{r.label}</div>
                        <div className="kk-b" style={{ fontSize: 10.5, color: kid.color, fontWeight: 600 }}>{r.talent}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {canRedeem && (
              <button onClick={() => redeem("individual", kid.id)} className="kk-btn kk-b"
                style={{ background: theme.DEEP, color: theme.PAPER, padding: "10px 12px", borderRadius: 10, fontWeight: 700, fontSize: 15, width: "100%", marginTop: 8 }}>
                🎁 30 Min Bildschirmzeit einlösen
              </button>
            )}
          </Card>
        );
      })}

      {/* Familienpool */}
      <SectionTitle small>★ Familien-Pool</SectionTitle>
      <Card highlight={pool >= POOL_MOVIE}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <div className="kk-h" style={{ fontSize: 24, fontWeight: 900 }}>
            {clips.hanna || 0} + {clips.timo || 0} = <span style={{ color: ACCENT }}>{pool}</span>
          </div>
          <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.6 }}>gemeinsame Klammern</div>
        </div>

        {/* Zwei Ziele */}
        {[{ goal: POOL_MOVIE, label: "Filmabend 🎬", type: "movie" }, { goal: POOL_OUTING, label: "Familienausflug 🎡", type: "outing" }].map(({ goal, label, type }) => {
          const p = pct(pool, goal);
          const can = pool >= goal;
          return (
            <div key={type} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span className="kk-b" style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
                <span className="kk-b" style={{ fontSize: 14, color: can ? SAGE : DEEP, fontWeight: can ? 700 : 400 }}>{pool}/{goal} {can ? "✓" : ""}</span>
              </div>
              <div style={{ background: "#E5DDD0", borderRadius: 8, height: 10, marginBottom: 6, overflow: "hidden" }}>
                <div style={{ width: `${p * 100}%`, height: "100%", background: can ? SAGE : GOLD, borderRadius: 8, transition: "width .4s" }} />
              </div>
              {can && (
                <button onClick={() => redeem(type, null)} className="kk-btn kk-b" style={{ background: DEEP, color: PAPER, padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: 15, width: "100%" }}>
                  🎁 {label} einlösen
                </button>
              )}
            </div>
          );
        })}
      </Card>

      {/* Sonntags-Familienrat Erinnerung */}
      <Card>
        <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: SAGE, marginBottom: 6 }}>📅 Sonntags-Familienrat · 18:00</div>
        <div className="kk-b" style={{ fontSize: 15, lineHeight: 1.6, color: theme.TEXT }}>
          Klammern zählen · Belohnungen einlösen · Rückblick (was war gut/schwer?) · nächste Woche planen
        </div>
      </Card>

      {/* Korrektur */}
      {log.length > 0 && log[0].delta > 0 && (
        <button onClick={undoLastClip} className="kk-btn kk-b"
          style={{ width: "100%", background: "transparent", color: theme.MUTED, border: `1px solid ${theme.BORDER}`, borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          ↩ Letzte Klammer rückgängig ({log[0]?.name}, {log[0]?.reason || "Klammer"})
        </button>
      )}

      {/* Letzter Verlauf */}
      {log.length > 0 && (
        <>
          <SectionTitle small>Verlauf</SectionTitle>
          {log.slice(0, 15).map((e) => {
            const kid = KIDS.find((k) => k.id === e.kid);
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: `1px solid ${theme.BORDER}` }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: kid?.color || SAGE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  {e.delta > 0 ? "+" : "−"}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="kk-b" style={{ fontSize: 14, fontWeight: 600, color: theme.TEXT }}>
                    {e.name} {e.delta > 0 ? `+${e.delta}` : e.delta} Klammer{e.redeemed ? ` — 🎁 ${e.redeemed}` : ""}
                  </div>
                  {e.talent && (
                    <div className="kk-b" style={{ fontSize: 12, color: kid?.color || SAGE, fontWeight: 600, marginTop: 1 }}>
                      ✦ {e.talent} · {e.reason}
                    </div>
                  )}
                  {e.praise && (
                    <div className="kk-b" style={{ fontSize: 11.5, color: theme.MUTED, fontStyle: "italic", marginTop: 2 }}>„{e.praise}"</div>
                  )}
                  <div className="kk-b" style={{ fontSize: 11, opacity: 0.45, marginTop: 2, color: theme.TEXT }}>
                    {new Date(e.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ---------------- Routinen ----------------
const ROUTINES = [
  {
    id: "morgen", label: "Morgen Routine", emoji: "🌅", color: "#F9C74F",
    subtitle: "Startklar & Fokus",
    tasks: ["Bett machen", "Körperpflege & anziehen", "Waschbecken und WC", "5 Minuten aufräumen", "Spülmaschine leer", "Wäsche anstellen"],
  },
  {
    id: "mittag", label: "Mittag Routine", emoji: "☀️", color: "#90E0EF",
    subtitle: "Ordnung & Flow",
    tasks: ["Wäsche starten oder abhängen", "3×5 Min Raumblitz (Zone oder Chaos-Stelle)", "5 Minuten aufräumen", "Müll rausbringen", "15 Min Zone-Aufgabe"],
  },
  {
    id: "abend", label: "Abend Routine", emoji: "🌙", color: "#F4A261",
    subtitle: "Abrunden & Vorbereiten",
    tasks: ["Brote schmieren", "Spülmaschine an / Küche klar machen", "5 Minuten aufräumen", "Kleidung & Taschen vorbereiten", "Termine / To-dos für morgen checken"],
  },
];

function Routines() {
  const theme = useTheme();
  const today = new Date().toISOString().slice(0, 10);
  const [checks, setChecks] = useState({});
  const [lastDate, setLastDate] = useState("");
  const [active, setActive] = useState("morgen");
  const [pillChecks, setPillChecks] = useState({});
  const [pillDate, setPillDate] = useState("");

  // Standard-Supplements (anpassbar)
  const SUPPLEMENTS = [
    { id: "l_thyroxin", label: "L-Thyroxin", emoji: "💊", note: "Nüchtern, 30 Min vor dem Frühstück", color: ACCENT },
    { id: "vitamin_d", label: "Vitamin D3", emoji: "☀️", note: "Mit fetthaltiger Mahlzeit", color: GOLD },
    { id: "magnesium", label: "Magnesium", emoji: "⚡", note: "Abends — entspannt Muskeln", color: SAGE },
    { id: "omega3", label: "Omega-3", emoji: "🐟", note: "Mit dem Essen", color: "#6E8CA0" },
    { id: "lithium", label: "Lithium", emoji: "🔋", note: "Wie verschrieben — mit Mahlzeit", color: "#8B5CF6" },
    { id: "pille", label: "Pille", emoji: "💗", note: "Täglich zur gleichen Zeit", color: "#EC4899" },
  ];

  useEffect(() => {
    (async () => {
      const savedDate = await loadKey("routines_date", "");
      const savedChecks = await loadKey("routines_checks", {});
      if (savedDate === today) {
        setChecks(savedChecks);
      } else {
        setChecks({});
        await saveKey("routines_checks", {});
        await saveKey("routines_date", today);
      }
      setLastDate(today);

      const savedPillDate = await loadKey("pill_date", "");
      const savedPillChecks = await loadKey("pill_checks", {});
      if (savedPillDate === today) {
        setPillChecks(savedPillChecks);
      } else {
        setPillChecks({});
        await saveKey("pill_checks", {});
        await saveKey("pill_date", today);
      }
      setPillDate(today);
    })();
  }, []);

  async function togglePill(id) {
    const next = { ...pillChecks, [id]: !pillChecks[id] };
    setPillChecks(next);
    await saveKey("pill_checks", next);
    await saveKey("pill_date", today);
  }

  async function toggle(routineId, taskIdx) {
    const key = `${routineId}_${taskIdx}`;
    const next = { ...checks, [key]: !checks[key] };
    setChecks(next);
    await saveKey("routines_checks", next);
    await saveKey("routines_date", today);
  }

  const current = ROUTINES.find((r) => r.id === active);
  const doneCount = (current?.tasks || []).filter((_, i) => checks[`${active}_${i}`]).length;
  const total = current?.tasks?.length || 0;
  const allDone = doneCount === total && total > 0;

  // Gesamt-Fortschritt aller drei Routinen
  const totalAll = ROUTINES.reduce((s, r) => s + r.tasks.length, 0);
  const doneAll = ROUTINES.reduce((s, r) => s + r.tasks.filter((_, i) => checks[`${r.id}_${i}`]).length, 0);

  return (
    <div className="kk-pop">
      <SectionTitle>Tagesroutinen</SectionTitle>

      {/* 💊 SUPPLEMENTS */}
      <SectionTitle small>💊 Supplements heute</SectionTitle>

      {/* Erinnerungs-Banner wenn noch nicht alle genommen */}
      {Object.values(pillChecks).filter(Boolean).length < SUPPLEMENTS.length && (
        <div style={{ background: ACCENT + "15", border: `1.5px solid ${ACCENT}55`, borderRadius: 14, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>⏰</span>
          <div>
            <div className="kk-b" style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>
              Noch {SUPPLEMENTS.length - Object.values(pillChecks).filter(Boolean).length} Supplement{SUPPLEMENTS.length - Object.values(pillChecks).filter(Boolean).length > 1 ? "s" : ""} ausstehend
            </div>
            <div className="kk-b" style={{ fontSize: 12.5, color: theme.MUTED }}>
              Tippe unten zum Abhaken
            </div>
          </div>
        </div>
      )}

      <Card>
        <div className="kk-b" style={{ fontSize: 13, color: theme.MUTED, marginBottom: 10 }}>
          Tippe an was du heute genommen hast — setzt sich automatisch morgen zurück.
        </div>
        {SUPPLEMENTS.map((s) => {
          const done = !!pillChecks[s.id];
          return (
            <button key={s.id} onClick={() => togglePill(s.id)} className="kk-btn"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: done ? s.color + "18" : theme.CARD2, border: `1.5px solid ${done ? s.color + "55" : theme.BORDER}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, textAlign: "left" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: done ? s.color : theme.DOT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, transition: "all .25s ease" }}>
                {done ? "✓" : s.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: done ? s.color : theme.TEXT }}>{s.label}</div>
                <div className="kk-b" style={{ fontSize: 12.5, color: theme.MUTED }}>{s.note}</div>
              </div>
              {!done && <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} className="kk-pulse" />}
            </button>
          );
        })}
        {Object.values(pillChecks).filter(Boolean).length === SUPPLEMENTS.length && (
          <div className="kk-b" style={{ textAlign: "center", fontSize: 15, color: SAGE, fontWeight: 700, padding: "8px 0" }}>
            ✓ Alle Supplements heute genommen!
          </div>
        )}
      </Card>

      {/* Gesamt-Fortschritt */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div className="kk-h" style={{ fontSize: 16, fontWeight: 700 }}>Heute: {doneAll}/{totalAll} erledigt</div>
          <div className="kk-b" style={{ fontSize: 14, color: doneAll === totalAll ? SAGE : GOLD, fontWeight: 700 }}>
            {doneAll === totalAll ? "✓ Alles geschafft!" : `${totalAll - doneAll} offen`}
          </div>
        </div>
        <div style={{ background: "#E5DDD0", borderRadius: 10, height: 12, overflow: "hidden" }}>
          <div style={{ width: `${totalAll > 0 ? (doneAll / totalAll) * 100 : 0}%`, height: "100%", background: doneAll === totalAll ? SAGE : GOLD, borderRadius: 10, transition: "width .3s ease" }} />
        </div>
        <div className="kk-b" style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>
          {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} · Reset täglich automatisch
        </div>
      </Card>

      {/* Routinen-Umschalter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {ROUTINES.map((r) => {
          const rDone = r.tasks.filter((_, i) => checks[`${r.id}_${i}`]).length;
          const rAll = r.tasks.length;
          const isActive = active === r.id;
          return (
            <button key={r.id} onClick={() => setActive(r.id)} className="kk-btn kk-b"
              style={{ flex: 1, padding: "10px 6px", borderRadius: 12, background: isActive ? DEEP : "#fff", color: isActive ? PAPER : DEEP, border: `2px solid ${DEEP}`, textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>{r.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3, lineHeight: 1.2 }}>{r.label.split(" ")[0]}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{rDone}/{rAll}</div>
            </button>
          );
        })}
      </div>

      {/* Aktive Routine */}
      {current && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div className="kk-h" style={{ fontSize: 22, fontWeight: 900 }}>{current.emoji} {current.label}</div>
              <div className="kk-b" style={{ fontSize: 14, opacity: 0.6 }}>{current.subtitle}</div>
            </div>
            <div className="kk-h" style={{ fontSize: 24, fontWeight: 900, color: allDone ? SAGE : ACCENT }}>{doneCount}/{total}</div>
          </div>

          {/* Fortschrittsbalken der aktiven Routine */}
          <div style={{ background: "#E5DDD0", borderRadius: 10, height: 10, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%`, height: "100%", background: allDone ? SAGE : current.color, borderRadius: 10, transition: "width .3s ease" }} />
          </div>

          {/* Aufgaben */}
          {current.tasks.map((task, i) => {
            const done = !!checks[`${active}_${i}`];
            return (
              <label key={i} className="kk-card" style={{ display: "flex", alignItems: "center", gap: 14, background: done ? "#F0F2EC" : "#fff", border: `1.5px solid ${done ? SAGE + "66" : DEEP + "1A"}`, borderLeft: `5px solid ${done ? SAGE : current.color}`, borderRadius: 12, padding: "13px 14px", marginBottom: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={done} onChange={() => toggle(active, i)} style={{ width: 24, height: 24, accentColor: SAGE, flexShrink: 0 }} />
                <span className="kk-b" style={{ fontSize: 17, fontWeight: done ? 400 : 600, textDecoration: done ? "line-through" : "none", opacity: done ? 0.45 : 1 }}>
                  {task}
                </span>
              </label>
            );
          })}

          {allDone && (
            <div className="kk-card" style={{ background: SAGE, color: "#fff", borderRadius: 14, padding: "14px 16px", textAlign: "center", marginTop: 8 }}>
              <div className="kk-h" style={{ fontSize: 20, fontWeight: 900 }}>✓ {current.label} abgeschlossen!</div>
              <div className="kk-b" style={{ fontSize: 14.5, marginTop: 4, opacity: 0.85 }}>Gut gemacht — alle Aufgaben erledigt.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Brotzeit ----------------
function Bread({ household, shopping, setShopping }) {
  const theme = useTheme();
  const TOPPINGS_FREEZE = ["Käse (laktosefrei)", "Aufschnitt", "Frischkäse (laktosefrei)", "Marmelade", "Nutella", "Honig"];
  const TOPPINGS_FRESH = ["Tomate", "Gurke", "Salat"];
  const [checks, setChecks] = useState({});
  const toggle = (k) => setChecks({ ...checks, [k]: !checks[k] });

  // KI-Schulbrot-Generator
  const [sandwichIdeas, setSandwichIdeas] = useState([]);
  const [sandwichBusy, setSandwichBusy] = useState(false);
  const [sandwichErr, setSandwichErr] = useState("");

  async function generateSandwichIdeas() {
    setSandwichBusy(true); setSandwichErr(""); setSandwichIdeas([]);
    const kids = household?.kids?.map(k => k.name).join(" und ") || "Hanna und Timo";
    const prompt = `Du bist Ernährungsexperte für Schulbrote. Erstelle 5 kreative, abwechslungsreiche Schulbrot-Ideen für ${kids} (Kinder 10-13 Jahre). Laktosefrei wo Milchprodukte vorkommen.

Regeln:
- Einfrierbar (kein Tomaten/Gurke/Salat — die kommen morgens frisch dazu)
- Kinderfreundlich aber nicht langweilig
- Mix aus herzhaft UND süß (Nutella, Marmelade, Honig erlaubt)
- Kreativ aber mit normalen Zutaten (kein Exotisches)
- Pro Idee: kurze Beschreibung + Profi-Tipp warum Kinder es lieben

Antworte NUR mit JSON, kein Markdown:
[{"name":"Brotzeit-Name","belag":"Zutaten kurz","tipp":"warum Kinder es lieben / Profi-Trick","einfrierbar":true,"kategorie":"herzhaft|süß|gemischt"}]`;

    try {
      const txt = await askClaude(prompt, 1200);
      const ideas = parseJSON(txt);
      if (Array.isArray(ideas)) setSandwichIdeas(ideas);
      else setSandwichErr("Konnte keine Ideen generieren. Versuche es erneut.");
    } catch { setSandwichErr("Fehler beim Generieren. Versuche es erneut."); }
    setSandwichBusy(false);
  }

  function addSandwichToList(idea) {
    const items = (idea.belag || "").split(",").map(s => s.trim()).filter(Boolean);
    let added = 0;
    items.forEach((item, i) => {
      if (!shopping.some(s => s.name === item && !s.done)) {
        setShopping(prev => [...prev, { id: Date.now() + i, name: item, amount: "", cat: "Sonstiges", done: false }]);
        added++;
      }
    });
    return added;
  }

  const kidsCount = household?.soloMode ? 0 : (household?.kids?.length || 0);
  const adultsCount = household?.soloMode ? 1 : (household?.adults || 0);
  const [perKid, setPerKid] = useState(5);
  const [perAdult, setPerAdult] = useState(4);
  const [addedMsg, setAddedMsg] = useState("");

  const kidsTotal = kidsCount * perKid;
  const adultsTotal = adultsCount * perAdult;
  const totalSandwiches = kidsTotal + adultsTotal;
  const slices = totalSandwiches * 2;
  const loaves = Math.ceil(slices / 20);

  // Einkaufswagen-Badge: wie viele Brotzeit-Artikel schon auf Liste
  const breadItemsOnList = shopping.filter((s) => !s.done && (s.cat === "Brot" || s.name.toLowerCase().includes("margarine") || s.name.toLowerCase().includes("brot"))).length;

  function addToList(name, cat) {
    // Duplikatschutz: nur hinzufügen wenn noch nicht drauf
    if (shopping.some((s) => s.name === name && !s.done)) {
      setAddedMsg(`"${name}" ist schon auf der Liste.`);
      setTimeout(() => setAddedMsg(""), 2000);
      return false;
    }
    setShopping(prev => [...prev, { id: Date.now() + Math.random(), name, amount: "", cat, done: false }]);
    return true;
  }

  function addBreadToShopping() {
    let added = 0;
    if (addToList(`Brot/Toast (~${loaves} Pck. für ${totalSandwiches} Brote)`, "Brot")) added++;
    if (addToList("Margarine zum Streichen", "Milchprodukt (laktosefrei)")) added++;
    if (added > 0) {
      setAddedMsg(`✓ ${added} Artikel zur Einkaufsliste hinzugefügt.`);
    } else {
      setAddedMsg("Steht schon alles auf der Einkaufsliste.");
    }
    setTimeout(() => setAddedMsg(""), 3000);
  }

  function addFreshToList(name) {
    if (addToList(name, "Gemüse")) {
      setAddedMsg(`✓ "${name}" zur Einkaufsliste hinzugefügt.`);
      setTimeout(() => setAddedMsg(""), 2000);
    }
  }

  const tasks = [
    ["Hanna", "schmiert Margarine"],
    ["Timo", "belegt"],
    ["Verena", "verpackt & friert ein"],
  ];

  return (
    <div className="kk-pop">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionTitle>Brotzeit-Werkstatt</SectionTitle>
        {breadItemsOnList > 0 && (
          <div style={{ background: ACCENT, color: "#fff", borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 700 }} className="kk-b">
            🛒 {breadItemsOnList} auf Liste
          </div>
        )}
      </div>

      {/* Sandwich-Zähler */}
      <Card highlight>
        <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>🥪 Sandwich-Zähler diese Woche</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span className="kk-b" style={{ fontSize: 15, color: theme.TEXT }}>Pro Kind / Woche ({kidsCount})</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setPerKid(Math.max(0, perKid - 1))} className="kk-btn kk-h" style={{ width: 30, height: 30, borderRadius: 8, background: theme.DOT, color: theme.TEXT, fontSize: 20, fontWeight: 900 }}>−</button>
            <span className="kk-h" style={{ fontSize: 21, fontWeight: 900, minWidth: 24, textAlign: "center", color: theme.TEXT }}>{perKid}</span>
            <button onClick={() => setPerKid(perKid + 1)} className="kk-btn kk-h" style={{ width: 30, height: 30, borderRadius: 8, background: ACCENT, color: "#fff", fontSize: 17, fontWeight: 900 }}>+</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="kk-b" style={{ fontSize: 15, color: theme.TEXT }}>Pro Erwachsene(r) / Woche ({adultsCount})</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setPerAdult(Math.max(0, perAdult - 1))} className="kk-btn kk-h" style={{ width: 30, height: 30, borderRadius: 8, background: theme.DOT, color: theme.TEXT, fontSize: 20, fontWeight: 900 }}>−</button>
            <span className="kk-h" style={{ fontSize: 21, fontWeight: 900, minWidth: 24, textAlign: "center", color: theme.TEXT }}>{perAdult}</span>
            <button onClick={() => setPerAdult(perAdult + 1)} className="kk-btn kk-h" style={{ width: 30, height: 30, borderRadius: 8, background: ACCENT, color: "#fff", fontSize: 17, fontWeight: 900 }}>+</button>
          </div>
        </div>

        <div style={{ background: theme.SAGE_BG, borderRadius: 12, padding: "12px 14px", textAlign: "center", marginBottom: 10 }}>
          <div className="kk-h" style={{ fontSize: 36, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>{totalSandwiches}</div>
          <div className="kk-b" style={{ fontSize: 14, opacity: 0.7, color: theme.TEXT }}>Brote/Woche · {kidsTotal} Kinder + {adultsTotal} Erwachsene</div>
          <div className="kk-b" style={{ fontSize: 13, color: SAGE, fontWeight: 600, marginTop: 4 }}>
            ≈ {slices} Scheiben · ca. {loaves} {loaves === 1 ? "Packung" : "Packungen"} Brot/Toast
          </div>
        </div>

        <button onClick={addBreadToShopping} className="kk-btn kk-b"
          style={{ background: theme.DEEP, color: theme.PAPER, padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 16, width: "100%" }}>
          🛒 Brot & Margarine → Einkaufsliste
        </button>
        {addedMsg && (
          <div className="kk-b" style={{ fontSize: 14, color: addedMsg.startsWith("✓") ? SAGE : ACCENT, marginTop: 8, fontWeight: 600 }}>
            {addedMsg}
          </div>
        )}
      </Card>

      <SectionTitle small>Aufgaben am Sonntag</SectionTitle>
      {tasks.map(([who, what], i) => (
        <div key={i} className="kk-card" style={{ display: "flex", alignItems: "center", gap: 12, background: theme.CARD, border: `1.5px solid ${theme.BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 6 }}>
          <div className="kk-h" style={{ width: 34, height: 34, borderRadius: "50%", background: ACCENT, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 17 }}>{i + 1}</div>
          <div className="kk-b" style={{ fontSize: 16, color: theme.TEXT }}><b>{who}</b> {what}</div>
        </div>
      ))}

      {/* KI-SCHULBROT-GENERATOR */}
      <SectionTitle small>✦ KI-Schulbrot-Ideen</SectionTitle>
      <Card highlight>
        <div className="kk-b" style={{ fontSize: 13, color: theme.MUTED, marginBottom: 10 }}>
          Claude generiert 5 kreative Brotzeit-Ideen — abwechslungsreich, einfrierbar, für Kinder die Spaß am Essen haben.
        </div>
        <button onClick={generateSandwichIdeas} disabled={sandwichBusy} className="kk-btn kk-b"
          style={{ background: sandwichBusy ? SAGE : ACCENT, color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 16, width: "100%" }}>
          {sandwichBusy ? <><span className="kk-spin">✦</span> Ideen werden generiert…</> : "✦ 5 Schulbrot-Ideen generieren"}
        </button>
        {sandwichErr && <div className="kk-b" style={{ color: ACCENT, fontSize: 13, marginTop: 8 }}>{sandwichErr}</div>}
      </Card>

      {sandwichIdeas.length > 0 && (
        <div>
          {sandwichIdeas.map((idea, i) => {
            const catColor = idea.kategorie === "süß" ? GOLD : idea.kategorie === "gemischt" ? "#C084FC" : SAGE;
            return (
              <div key={i} className="kk-card" style={{ background: theme.CARD, border: `1.5px solid ${catColor}33`, borderLeft: `4px solid ${catColor}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <span className="kk-b" style={{ fontSize: 10.5, background: catColor + "22", color: catColor, border: `1px solid ${catColor}44`, borderRadius: 10, padding: "2px 8px", fontWeight: 700 }}>
                        {idea.kategorie || "herzhaft"}
                      </span>
                      {idea.einfrierbar && <span className="kk-b" style={{ fontSize: 10.5, color: "#6E8CA0", fontWeight: 600 }}>❄ einfrierbar</span>}
                    </div>
                    <div className="kk-h" style={{ fontSize: 16, fontWeight: 700, color: theme.TEXT, marginBottom: 3 }}>{idea.name}</div>
                    <div className="kk-b" style={{ fontSize: 13.5, color: theme.MUTED, marginBottom: 6 }}>{idea.belag}</div>
                    <div className="kk-b" style={{ fontSize: 13, color: catColor, fontStyle: "italic" }}>💡 {idea.tipp}</div>
                  </div>
                </div>
                <button onClick={() => addSandwichToList(idea)} className="kk-btn kk-b"
                  style={{ marginTop: 10, background: "transparent", color: ACCENT, border: `1.5px solid ${ACCENT}`, borderRadius: 10, padding: "7px 12px", fontSize: 13, fontWeight: 700, width: "100%" }}>
                  🛒 Zutaten auf Einkaufsliste
                </button>
              </div>
            );
          })}
          <button onClick={() => setSandwichIdeas([])} className="kk-btn kk-b"
            style={{ background: "transparent", color: theme.MUTED, fontSize: 13, padding: "6px", width: "100%" }}>
            × Ideen verwerfen
          </button>
        </div>
      )}

      {/* Einfrierbar */}
      <SectionTitle small>❄ Einfrierbar (vorbereiten)</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 12.5, color: theme.MUTED, marginBottom: 8 }}>Hake ab was du diese Woche vorbereitest:</div>
        {TOPPINGS_FREEZE.map((t) => (
          <label key={t} className="kk-b" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${theme.BORDER}`, fontSize: 16, cursor: "pointer", color: theme.TEXT }}>
            <input type="checkbox" checked={!!checks[t]} onChange={() => toggle(t)} style={{ width: 20, height: 20, accentColor: ACCENT }} />
            <span style={{ textDecoration: checks[t] ? "line-through" : "none", opacity: checks[t] ? 0.45 : 1 }}>{t}</span>
            {checks[t] && <span style={{ marginLeft: "auto", fontSize: 13, color: SAGE, fontWeight: 600 }}>✓</span>}
          </label>
        ))}
      </Card>

      {/* Frische Artikel ROT — direkt auf Liste */}
      <SectionTitle small>🔴 Morgens frisch dazu — nicht einfrieren!</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 13.5, color: theme.MUTED, marginBottom: 10 }}>
          Diese Artikel müssen frisch sein — tippe auf „+ Liste" um sie auf die Einkaufsliste zu schicken:
        </div>
        {TOPPINGS_FRESH.map((t) => {
          const onList = shopping.some((s) => s.name === t && !s.done);
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: onList ? SAGE : ACCENT, flexShrink: 0 }} />
                <span className="kk-b" style={{ fontSize: 16, color: onList ? theme.MUTED : ACCENT, fontWeight: onList ? 400 : 600, textDecoration: onList ? "line-through" : "none" }}>{t}</span>
              </div>
              <button onClick={() => addFreshToList(t)} disabled={onList} className="kk-btn kk-b"
                style={{ background: onList ? "transparent" : ACCENT, color: onList ? SAGE : "#fff", border: `1.5px solid ${onList ? SAGE : ACCENT}`, borderRadius: 16, fontSize: 12, fontWeight: 700, padding: "4px 12px" }}>
                {onList ? "✓ auf Liste" : "+ Liste"}
              </button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ---------------- Preisgedächtnis ----------------
function PriceMemory({ prices, setPrices }) {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [editKey, setEditKey] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanErr, setScanErr] = useState("");
  const [view, setView] = useState("list"); // list | chart
  const receiptRef = React.useRef();

  const entries = Object.entries(prices || {})
    .filter(([k]) => !search || k.includes(search.toLowerCase()))
    .sort((a, b) => (b[1].date || "").localeCompare(a[1].date || ""));

  function saveEdit(key) {
    const p = parseFloat(editVal.replace(",", "."));
    if (!p || p <= 0) { setEditKey(null); return; }
    const existing = prices[key];
    setPrices({ ...prices, [key]: { ...existing, previous: existing.current || null, current: p, date: new Date().toISOString(), history: [{ price: p, date: new Date().toISOString() }, ...(existing.history || [])].slice(0, 12) } });
    setEditKey(null);
  }

  function deleteEntry(key) { const p = { ...prices }; delete p[key]; setPrices(p); }

  async function scanReceipt(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setScanning(true); setScanErr(""); setScanResult(null);
    try {
      const { data, mediaType } = await fileToBase64(file);
      const result = await readReceiptFromImage(data, mediaType);
      setScanResult(result.items || []);
    } catch { setScanErr("Kassenbon konnte nicht gelesen werden. Versuche es erneut."); }
    setScanning(false);
  }

  function applyScanResult() {
    if (!scanResult) return;
    const updated = { ...prices };
    scanResult.forEach((item) => {
      const key = item.name.toLowerCase().trim();
      const existing = updated[key] || {};
      updated[key] = { name: item.name, previous: existing.current || null, current: item.price, date: new Date().toISOString(), history: [{ price: item.price, date: new Date().toISOString() }, ...(existing.history || [])].slice(0, 12) };
    });
    setPrices(updated);
    setScanResult(null);
  }

  const roseCount = entries.filter(([, v]) => v.previous && v.current > v.previous * 1.05).length;

  // Inflations-Daten: Durchschnittspreis pro Monat über alle Artikel
  const monthlyAvg = (() => {
    const byMonth = {};
    Object.values(prices || {}).forEach((p) => {
      (p.history || []).forEach((h) => {
        const m = (h.date || "").slice(0, 7);
        if (!m) return;
        if (!byMonth[m]) byMonth[m] = { sum: 0, count: 0 };
        byMonth[m].sum += h.price; byMonth[m].count++;
      });
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([m, { sum, count }]) => ({ month: m, avg: (sum / count).toFixed(2) }));
  })();

  return (
    <div className="kk-pop">
      <SectionTitle>Preisgedächtnis</SectionTitle>

      {/* Kassenbon-Scan */}
      <Card highlight>
        <div className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: theme.TEXT, marginBottom: 6 }}>📄 Kassenbon scannen</div>
        <div className="kk-b" style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>Foto vom Kassenbon → alle Preise werden automatisch ins Gedächtnis eingetragen.</div>
        <input ref={receiptRef} type="file" accept="image/*" onChange={scanReceipt} style={{ display: "none" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={() => receiptRef.current?.click()} disabled={scanning} className="kk-btn kk-b"
            style={{ background: scanning ? SAGE : ACCENT, color: "#fff", padding: "11px 8px", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
            {scanning ? <><span className="kk-spin">◆</span> Lese…</> : "🖼 Aus Fotos/Mail"}
          </button>
          <button onClick={() => { const i = document.createElement("input"); i.type="file"; i.accept="image/*"; i.capture="environment"; i.onchange=scanReceipt; i.click(); }} disabled={scanning} className="kk-btn kk-b"
            style={{ background: "transparent", color: ACCENT, border: "2px solid " + ACCENT, padding: "11px 8px", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
            📷 Kamera
          </button>
        </div>
        {scanErr && <div className="kk-b" style={{ color: ACCENT, fontSize: 14, marginTop: 8 }}>{scanErr}</div>}
        {scanResult && (
          <div style={{ marginTop: 12 }}>
            <div className="kk-b" style={{ fontSize: 14, fontWeight: 700, color: SAGE, marginBottom: 8 }}>✓ {scanResult.length} Artikel erkannt:</div>
            {scanResult.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${theme.BORDER}` }}>
                <span className="kk-b" style={{ fontSize: 15, color: theme.TEXT }}>{item.name}</span>
                <span className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: theme.TEXT }}>{item.price?.toFixed(2)} €</span>
              </div>
            ))}
            <button onClick={applyScanResult} className="kk-btn kk-b"
              style={{ background: SAGE, color: "#fff", padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 15, width: "100%", marginTop: 10 }}>
              ✓ Alle Preise speichern
            </button>
          </div>
        )}
      </Card>

      {/* Ansicht: Liste / Grafik */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["list", "📋 Preisliste"], ["chart", "📈 Inflations-Grafik"]].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} className="kk-btn kk-b"
            style={{ flex: 1, padding: "8px", borderRadius: 10, fontWeight: 600, fontSize: 15, background: view === v ? theme.DEEP : "transparent", color: view === v ? theme.PAPER : theme.TEXT, border: `1.5px solid ${theme.BORDER}` }}>
            {label}
          </button>
        ))}
      </div>

      {view === "chart" && (
        <Card>
          <div className="kk-b" style={{ fontSize: 15, fontWeight: 700, color: theme.TEXT, marginBottom: 12 }}>📈 Durchschnittspreis-Verlauf</div>
          {monthlyAvg.length < 2 ? (
            <div className="kk-b" style={{ fontSize: 14, opacity: 0.6 }}>Noch zu wenig Daten — scanne mehr Kassenbons um die Inflations-Kurve zu sehen.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, minWidth: monthlyAvg.length * 40 }}>
                {monthlyAvg.map((m, i) => {
                  const maxVal = Math.max(...monthlyAvg.map((x) => parseFloat(x.avg)));
                  const h = Math.max(10, (parseFloat(m.avg) / maxVal) * 100);
                  const isUp = i > 0 && parseFloat(m.avg) > parseFloat(monthlyAvg[i-1].avg);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div className="kk-b" style={{ fontSize: 11, color: theme.MUTED }}>{m.avg}€</div>
                      <div style={{ width: "100%", height: h, background: isUp ? ACCENT : SAGE, borderRadius: "4px 4px 0 0", transition: "height .3s ease" }} />
                      <div className="kk-b" style={{ fontSize: 8, color: theme.MUTED, textAlign: "center" }}>{m.month.slice(5)}/{m.month.slice(2,4)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="kk-b" style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
                🟠 = teurer als Vormonat · 🟢 = günstiger · letzten 12 Monate
              </div>
            </div>
          )}
        </Card>
      )}

      {view === "list" && (
        <>
          <Card>
            <div className="kk-b" style={{ fontSize: 14.5, opacity: 0.8, lineHeight: 1.5, color: theme.TEXT }}>
              Alle gemerkten Preise. Scanne Kassenbons oben oder trage Preise beim Einkaufen manuell ein.
            </div>
            {roseCount > 0 && (
              <div className="kk-b" style={{ fontSize: 14.5, color: GOLD, fontWeight: 700, marginTop: 8 }}>
                ▲ {roseCount} {roseCount === 1 ? "Artikel ist" : "Artikel sind"} teurer geworden
              </div>
            )}
          </Card>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Artikel suchen…" style={{ ...inp, marginBottom: 12 }} />

      {entries.length === 0 ? (
        <div className="kk-b" style={{ textAlign: "center", opacity: 0.5, padding: 30, fontSize: 15 }}>
          Noch keine Preise gespeichert. Trage beim Hinzufügen zur Einkaufsliste einen Preis ein.
        </div>
      ) : entries.map(([key, v]) => {
        const rose = v.previous && v.current > v.previous * 1.05;
        const fell = v.previous && v.current < v.previous * 0.95;
        const diffPct = v.previous ? Math.round(((v.current - v.previous) / v.previous) * 100) : null;
        return (
          <div key={key} className="kk-card" style={{ background: rose ? "#FFF8EE" : "#fff", border: `1.5px solid ${rose ? GOLD : fell ? SAGE + "66" : DEEP + "1A"}`, borderLeft: `5px solid ${rose ? GOLD : fell ? SAGE : "#CFC6B8"}`, borderRadius: 10, padding: "11px 14px", marginBottom: 7 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div className="kk-b" style={{ fontSize: 16, fontWeight: 600 }}>{v.name || key}</div>
                <div className="kk-b" style={{ fontSize: 13.5, marginTop: 3 }}>
                  {editKey === key ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="number" step="0.01" value={editVal} onChange={(e) => setEditVal(e.target.value)} placeholder="Neuer Preis €" style={{ ...inp, width: 90, padding: "4px 8px", fontSize: 14 }} autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit(key)} />
                      <button onClick={() => saveEdit(key)} className="kk-btn kk-b" style={{ background: ACCENT, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, padding: "4px 9px" }}>✓</button>
                      <button onClick={() => setEditKey(null)} className="kk-btn kk-b" style={{ background: "transparent", color: DEEP, fontSize: 13, padding: "4px 6px" }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span className="kk-h" style={{ fontSize: 16, fontWeight: 900, color: DEEP }}>{v.current?.toFixed(2).replace(".", ",")} €</span>
                      {v.previous && <span style={{ opacity: 0.55, fontSize: 13, marginLeft: 8 }}>vorher {v.previous.toFixed(2).replace(".", ",")} €</span>}
                      {diffPct !== null && <span style={{ marginLeft: 6, fontWeight: 700, color: rose ? GOLD : fell ? SAGE : "#6B6259", fontSize: 13 }}>{rose ? `▲ +${diffPct}%` : fell ? `▼ ${diffPct}%` : ""}</span>}
                    </>
                  )}
                </div>
                <div className="kk-b" style={{ fontSize: 12.5, opacity: 0.45, marginTop: 2 }}>
                  {v.history?.length || 0} Einträge · zuletzt {v.date ? new Date(v.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => { setEditKey(key); setEditVal(String(v.current || "")); }} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, fontSize: 13.5, fontWeight: 600, padding: "4px 8px" }}>✎</button>
                <button onClick={() => deleteEntry(key)} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, fontSize: 20, padding: "0 4px", lineHeight: 1 }}>×</button>
              </div>
            </div>

            {/* Mini-Verlauf */}
            {v.history?.length > 1 && (
              <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                {v.history.slice(0, 6).map((h, i) => (
                  <span key={i} className="kk-b" style={{ fontSize: 12, background: "#F0F2EC", borderRadius: 8, padding: "2px 7px", color: "#6B6259" }}>
                    {h.price.toFixed(2).replace(".", ",")} €
                    <span style={{ opacity: 0.5, marginLeft: 3 }}>{new Date(h.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
        </>
      )}
    </div>
  );
}

// ---------------- Shopping ----------------
function Shopping({ shopping, setShopping, staples, setStaples, history, setHistory, prices, setPrices, freezer, setFreezer, pantry, setPantry }) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [showStaples, setShowStaples] = useState(false);
  const [shopMode, setShopMode] = useState(false);
  const [showEinraeum, setShowEinraeum] = useState(false);
  const [einraeumTargets, setEinraeumTargets] = useState({});
  const [shareMsg, setShareMsg] = useState("");

  function shareList() {
    const open = shopping.filter(s => !s.done);
    if (open.length === 0) { setShareMsg("Liste ist leer."); return; }
    const grouped = MARKET_ORDER.reduce((acc, c) => {
      const items = open.filter(s => s.cat === c);
      if (items.length) acc[c] = items;
      return acc;
    }, {});
    const other = open.filter(s => !MARKET_ORDER.includes(s.cat));
    let text = "🛒 Einkaufsliste Küchen-Kommando\n\n";
    Object.entries(grouped).forEach(([cat, items]) => {
      text += `${MARKET_AISLE[cat] || cat}:\n`;
      items.forEach(i => { text += `• ${i.name}${i.amount ? ` (${i.amount})` : ""}\n`; });
      text += "\n";
    });
    if (other.length) {
      text += "Sonstiges:\n";
      other.forEach(i => { text += `• ${i.name}${i.amount ? ` (${i.amount})` : ""}\n`; });
    }
    if (navigator.share) {
      navigator.share({ title: "Einkaufsliste", text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        setShareMsg("✓ Liste in Zwischenablage kopiert!");
        setTimeout(() => setShareMsg(""), 2500);
      });
    }
  }

  // Kategorie → Ziel (freezer/pantry)
  function defaultTarget(cat) {
    if (["Fleisch/Fisch", "Fertiggericht"].includes(cat)) return "freezer";
    return "pantry";
  }

  const doneItems = shopping.filter((s) => s.done);

  function openEinraeum() {
    const targets = {};
    doneItems.forEach((s) => { targets[s.id] = defaultTarget(s.cat); });
    setEinraeumTargets(targets);
    setShowEinraeum(true);
  }

  function einraeum() {
    const newFreezerItems = doneItems
      .filter((s) => einraeumTargets[s.id] === "freezer")
      .map((s, i) => ({ id: Date.now() + i, name: s.name, qty: s.amount || "1 Pck.", cat: s.cat, bestBefore: null }));
    const newPantryItems = doneItems
      .filter((s) => einraeumTargets[s.id] === "pantry")
      .map((s, i) => ({ id: Date.now() + 1000 + i, name: s.name, qty: s.amount || "1 Pck.", cat: s.cat, low: false }));
    if (newFreezerItems.length) setFreezer([...freezer, ...newFreezerItems]);
    if (newPantryItems.length) setPantry([...pantry, ...newPantryItems]);
    setShopping(shopping.filter((s) => !s.done));
    setShowEinraeum(false);
  }

  function remember(itemName, itemCat) {
    const key = itemName.trim().toLowerCase();
    if (!key) return;
    const rest = history.filter((h) => h.name.toLowerCase() !== key);
    setHistory([{ name: itemName.trim(), cat: itemCat }, ...rest].slice(0, 60));
  }

  // Preis merken: { current, previous, date, history: [{price, date}] }
  function recordPrice(itemName, priceVal) {
    if (!priceVal || !itemName.trim()) return;
    const key = itemName.trim().toLowerCase();
    const p = parseFloat(String(priceVal).replace(",", "."));
    if (!p || p <= 0) return;
    const existing = prices[key] || { history: [] };
    const entry = { price: p, date: new Date().toISOString() };
    const newHistory = [entry, ...(existing.history || [])].slice(0, 12);
    setPrices({ ...prices, [key]: { name: itemName.trim(), current: p, previous: existing.current || null, date: entry.date, history: newHistory } });
  }

  function addItem(itemName, itemCat, itemAmount = "", itemPrice = "") {
    const n = itemName.trim();
    if (!n) return;
    if (shopping.some((s) => s.name.toLowerCase() === n.toLowerCase() && !s.done)) return;
    setShopping([...shopping, { id: Date.now() + Math.random(), name: n, amount: itemAmount.trim(), cat: itemCat, done: false }]);
    remember(n, itemCat);
    if (itemPrice) recordPrice(n, itemPrice);
  }

  function addFromInput() {
    if (!name.trim()) return;
    addItem(name, cat, amount, price);
    setName(""); setAmount(""); setPrice("");
  }

  // Beim Abhaken: Preisinfo aus Preisgedächtnis anzeigen
  const toggle = (id) => setShopping(shopping.map((s) => s.id === id ? { ...s, done: !s.done } : s));
  const clearDone = () => setShopping(shopping.filter((s) => !s.done));

  // ---- Tipp-Suche: Vorschläge aus Stammartikeln + Verlauf ----
  const q = name.trim().toLowerCase();
  const pool = [
    ...staples.map((s) => ({ ...s, source: "staple" })),
    ...history.filter((h) => !staples.some((s) => s.name.toLowerCase() === h.name.toLowerCase())).map((h) => ({ ...h, source: "history" })),
  ];
  const suggestions = q.length >= 1
    ? pool.filter((p) => p.name.toLowerCase().includes(q) && !shopping.some((s) => s.name.toLowerCase() === p.name.toLowerCase() && !s.done)).slice(0, 8)
    : [];

  // ---- Stammartikel verwalten ----
  function toggleStaple() {
    const n = name.trim();
    if (!n) return;
    const exists = staples.some((s) => s.name.toLowerCase() === n.toLowerCase());
    if (exists) {
      setStaples(staples.filter((s) => s.name.toLowerCase() !== n.toLowerCase()));
    } else {
      setStaples([...staples, { name: n, cat }]);
    }
  }
  function removeStaple(n) { setStaples(staples.filter((s) => s.name.toLowerCase() !== n.toLowerCase())); }
  function addAllStaples() {
    const existing = new Set(shopping.filter((s) => !s.done).map((s) => s.name.toLowerCase()));
    const toAdd = staples
      .filter((s) => !existing.has(s.name.toLowerCase()))
      .map((s, i) => ({ id: Date.now() + i, name: s.name, amount: "", cat: s.cat, done: false }));
    if (toAdd.length) setShopping([...shopping, ...toAdd]);
  }
  const currentIsStaple = staples.some((s) => s.name.toLowerCase() === name.trim().toLowerCase());

  // Nach Supermarkt-Laufweg sortiert (statt Datenmodell-Reihenfolge)
  const grouped = MARKET_ORDER.map((c) => [c, shopping.filter((s) => s.cat === c)]).filter(([, arr]) => arr.length);
  const doneCount = shopping.filter((s) => s.done).length;
  const openCount = shopping.length - doneCount;

  return (
    <div className="kk-pop">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionTitle>Einkaufsliste</SectionTitle>
        <button onClick={shareList} className="kk-btn kk-b"
          style={{ background: "transparent", color: SAGE, border: `1.5px solid ${SAGE}`, borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ↗ Teilen
        </button>
      </div>
      {shareMsg && <div className="kk-b" style={{ fontSize: 13, color: SAGE, fontWeight: 600, marginBottom: 8 }}>{shareMsg}</div>}

      {/* Einkaufsmodus-Umschalter + Fortschritt */}
      {shopping.length > 0 && (
        <div className="kk-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: shopMode ? DEEP : "#fff", color: shopMode ? PAPER : DEEP, border: `2px solid ${DEEP}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
          <div>
            <div className="kk-h" style={{ fontSize: 17, fontWeight: 900 }}>{shopMode ? "🛒 Einkaufsmodus" : "Einkaufsmodus"}</div>
            <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.7 }}>
              {shopMode ? `Noch ${openCount} Artikel · ${doneCount} erledigt` : "Großer Haken-Modus, nach Markt-Laufweg"}
            </div>
          </div>
          <button onClick={() => setShopMode(!shopMode)} className="kk-btn kk-b"
            style={{ background: shopMode ? ACCENT : DEEP, color: "#fff", padding: "9px 16px", borderRadius: 20, fontWeight: 700, fontSize: 15 }}>
            {shopMode ? "Fertig" : "Start"}
          </button>
        </div>
      )}

      {/* Fortschrittsbalken im Einkaufsmodus */}
      {shopMode && shopping.length > 0 && (
        <div style={{ background: "#E5DDD0", borderRadius: 10, height: 12, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ width: `${(doneCount / shopping.length) * 100}%`, height: "100%", background: SAGE, borderRadius: 10, transition: "width .3s ease" }} />
        </div>
      )}

      {/* Stammartikel-Sammelbutton */}
      {!shopMode && staples.length > 0 && (
        <button onClick={addAllStaples} className="kk-btn kk-b"
          style={{ background: SAGE, color: "#fff", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: 16, width: "100%", marginBottom: 12 }}>
          ★ Alle {staples.length} Stammartikel auf die Liste
        </button>
      )}

      {!shopMode && <Card>
        <div style={{ position: "relative" }}>
          <input value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addFromInput(); }}
            placeholder="Tippen… z.B. 'but' → Vorschläge erscheinen" style={{ ...inp, marginBottom: 8 }} />

          {/* Live-Vorschläge als Buttons */}
          {suggestions.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {suggestions.map((p, i) => (
                <button key={i} onClick={() => { addItem(p.name, p.cat); setName(""); }} className="kk-btn kk-b"
                  style={{ background: p.source === "staple" ? ACCENT : "#fff", color: p.source === "staple" ? "#fff" : DEEP, border: `1.5px solid ${p.source === "staple" ? ACCENT : DEEP + "33"}`, borderRadius: 18, padding: "6px 12px", fontSize: 14.5, fontWeight: 600 }}>
                  {p.source === "staple" ? "★ " : "+ "}{p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Menge (optional)" style={{ ...inp, flex: 1 }} />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preis €" inputMode="decimal" style={{ ...inp, flex: 0.8 }} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inp, flex: 1.3 }}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={addFromInput} className="kk-btn kk-b" style={{ background: ACCENT, color: "#fff", padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 16, flex: 2 }}>+ Hinzufügen</button>
          <button onClick={toggleStaple} disabled={!name.trim()} title="Als Stammartikel merken" className="kk-btn kk-b"
            style={{ background: currentIsStaple ? ACCENT : "transparent", color: currentIsStaple ? "#fff" : ACCENT, border: `2px solid ${ACCENT}`, padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 15, flex: 1 }}>
            {currentIsStaple ? "★ Stamm" : "☆ Stamm"}
          </button>
        </div>
      </Card>}

      {/* Stammartikel-Verwaltung */}
      {!shopMode && <button onClick={() => setShowStaples(!showStaples)} className="kk-btn kk-b"
        style={{ background: "transparent", color: DEEP, fontWeight: 600, fontSize: 14.5, padding: "4px 0", marginBottom: 6 }}>
        {showStaples ? "▾" : "▸"} Stammartikel verwalten ({staples.length})
      </button>}
      {!shopMode && showStaples && (
        <Card>
          <div className="kk-b" style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>
            Deine Immer-wieder-Artikel. Tippe oben einen Namen + ☆ Stamm, um neue anzulegen.
          </div>
          {staples.length === 0 ? (
            <div className="kk-b" style={{ fontSize: 14.5, opacity: 0.5 }}>Noch keine Stammartikel.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {staples.map((s, i) => (
                <span key={i} className="kk-b" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFF3EE", border: `1.5px solid ${ACCENT}`, borderRadius: 18, padding: "5px 10px", fontSize: 14.5 }}>
                  <button onClick={() => addItem(s.name, s.cat)} className="kk-btn" style={{ background: "none", color: DEEP, fontWeight: 600, padding: 0 }}>{s.name}</button>
                  <button onClick={() => removeStaple(s.name)} className="kk-btn" style={{ background: "none", color: ACCENT, fontWeight: 700, padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {shopping.length === 0 ? (
        <div className="kk-b" style={{ textAlign: "center", opacity: 0.5, padding: 30, fontSize: 15 }}>
          Leer. Tippe oben, nutze Stammartikel oder erstelle einen Batch-Plan.
        </div>
      ) : (
        <>
          {grouped.map(([c, arr]) => (
            <div key={c} style={{ marginBottom: 12 }}>
              <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: CAT_COLORS[c], marginBottom: 5 }}>
                {MARKET_AISLE[c] || c}
              </div>
              {arr.map((s) => {
                const pk = s.name.toLowerCase();
                const pd = prices?.[pk];
                const priceRose = pd?.previous && pd?.current && pd.current > pd.previous * 1.05;
                return (
                  <label key={s.id} className="kk-card" style={{ display: "flex", alignItems: "center", gap: shopMode ? 14 : 10, background: priceRose ? "#FFF8EE" : "#fff", border: `1.5px solid ${priceRose ? GOLD : DEEP + "1A"}`, borderLeft: `5px solid ${CAT_COLORS[c]}`, borderRadius: 9, padding: shopMode ? "13px 14px" : "9px 12px", marginBottom: 5, cursor: "pointer" }}>
                    <input type="checkbox" checked={s.done} onChange={() => toggle(s.id)} style={{ width: shopMode ? 26 : 18, height: shopMode ? 26 : 18, accentColor: SAGE }} />
                    <div style={{ flex: 1 }}>
                      <span className="kk-b" style={{ fontSize: shopMode ? 15.5 : 13.5, fontWeight: shopMode ? 600 : 400, textDecoration: s.done ? "line-through" : "none", opacity: s.done ? 0.4 : 1 }}>
                        {s.name}{s.amount ? <span style={{ opacity: 0.6 }}> · {s.amount}</span> : ""}
                      </span>
                      {pd?.current && !s.done && (
                        <div className="kk-b" style={{ fontSize: 12.5, marginTop: 1 }}>
                          <span style={{ color: priceRose ? GOLD : SAGE, fontWeight: 600 }}>
                            {priceRose ? `▲ ${pd.current.toFixed(2)} € (war ${pd.previous.toFixed(2)} €)` : `${pd.current.toFixed(2)} €`}
                          </span>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          ))}
          {doneCount > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <button onClick={openEinraeum} className="kk-btn kk-b"
                style={{ background: SAGE, color: "#fff", fontWeight: 700, fontSize: 15, padding: "10px 16px", borderRadius: 10 }}>
                📦 {doneCount} Artikel einräumen
              </button>
              <button onClick={clearDone} className="kk-btn kk-b"
                style={{ background: "transparent", color: ACCENT, fontWeight: 600, fontSize: 14, padding: "10px 0" }}>
                × nur entfernen
              </button>
            </div>
          )}

          {/* Einräum-Dialog */}
          {showEinraeum && (
            <div className="kk-pop" style={{ background: theme.CARD, border: `2px solid ${SAGE}`, borderRadius: 14, padding: 16, marginTop: 12 }}>
              <div className="kk-h" style={{ fontSize: 19, fontWeight: 900, color: theme.TEXT, marginBottom: 4 }}>📦 Wo kommt was hin?</div>
              <div className="kk-b" style={{ fontSize: 14, opacity: 0.65, marginBottom: 12 }}>
                Ich habe automatisch sortiert — tippe zum Ändern.
              </div>
              {doneItems.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.BORDER}` }}>
                  <span className="kk-b" style={{ fontSize: 15, flex: 1, color: theme.TEXT }}>{s.name}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEinraeumTargets({ ...einraeumTargets, [s.id]: "freezer" })} className="kk-btn kk-b"
                      style={{ padding: "5px 10px", borderRadius: 16, fontSize: 13, fontWeight: 700, background: einraeumTargets[s.id] === "freezer" ? "#6E8CA0" : "transparent", color: einraeumTargets[s.id] === "freezer" ? "#fff" : theme.TEXT, border: `1.5px solid #6E8CA0` }}>
                      ❄ Gefriert.
                    </button>
                    <button onClick={() => setEinraeumTargets({ ...einraeumTargets, [s.id]: "pantry" })} className="kk-btn kk-b"
                      style={{ padding: "5px 10px", borderRadius: 16, fontSize: 13, fontWeight: 700, background: einraeumTargets[s.id] === "pantry" ? SAGE : "transparent", color: einraeumTargets[s.id] === "pantry" ? "#fff" : theme.TEXT, border: `1.5px solid ${SAGE}` }}>
                      ▦ Vorrat
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={einraeum} className="kk-btn kk-b"
                  style={{ flex: 2, background: SAGE, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 16 }}>
                  ✓ Alles einräumen
                </button>
                <button onClick={() => setShowEinraeum(false)} className="kk-btn kk-b"
                  style={{ flex: 1, background: "transparent", color: theme.TEXT, border: `1.5px solid ${theme.BORDER}`, padding: "11px", borderRadius: 10, fontWeight: 600, fontSize: 15 }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Budget-Challenge ----------------
const BUDGET_CATS = ["Kochen/Hauptmahlzeit", "Snacks", "Brote/Frühstück", "Getränke", "Sonstiges"];
const BUDGET_CAT_COLORS = { "Kochen/Hauptmahlzeit": "#B5472E", "Snacks": "#C9A04A", "Brote/Frühstück": "#A8763E", "Getränke": "#6E8CA0", "Sonstiges": "#6B6259" };

function Budget({ budget, setBudget }) {
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [bcat, setBcat] = useState(BUDGET_CATS[0]);
  const [editBudget, setEditBudget] = useState(false);
  const [newMonthly, setNewMonthly] = useState(String(budget.monthly));
  const [view, setView] = useState("month");

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
  const monthExpenses = (budget.expenses || []).filter((e) => e.month === thisMonth);
  const spent = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = budget.monthly - spent;
  const pct = budget.monthly > 0 ? Math.min(100, (spent / budget.monthly) * 100) : 0;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const perDayLeft = daysLeft > 0 ? remaining / daysLeft : 0;
  const overBudget = remaining < 0;
  const barColor = pct < 70 ? SAGE : pct < 90 ? GOLD : ACCENT;

  // Wochenrückblick
  function getMondayOf(d) {
    const dt = new Date(d); const day = dt.getDay();
    dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
    dt.setHours(0,0,0,0); return dt;
  }
  const weeks = Array.from({ length: 5 }, (_, i) => {
    const monday = getMondayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59);
    const wExp = (budget.expenses || []).filter((e) => { const d = new Date(e.date); return d >= monday && d <= sunday; });
    const wSpent = wExp.reduce((s, e) => s + Number(e.amount), 0);
    return { monday, sunday, spent: wSpent, budget: budget.monthly / 4.33, expenses: wExp, isCurrent: i === 0 };
  }).reverse();
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];
  const weekDiff = lastWeek?.spent > 0 ? ((thisWeek.spent - lastWeek.spent) / lastWeek.spent) * 100 : null;

  function weekLabel(w) {
    return w.monday.toLocaleDateString("de-DE", { day:"numeric", month:"short" }) + " – " + w.sunday.toLocaleDateString("de-DE", { day:"numeric", month:"short" });
  }
  function motivation(w) {
    if (w.spent === 0) return { text: "Noch keine Ausgaben.", color: SAGE };
    const p = w.spent / w.budget;
    if (p < 0.7) return { text: `Sehr sparsam — ${(w.budget-w.spent).toFixed(2).replace(".",",")} € unter Plan. Super!`, color: SAGE };
    if (p < 0.9) return { text: `Gut im Rahmen — noch ${(w.budget-w.spent).toFixed(2).replace(".",",")} € Puffer.`, color: GOLD };
    if (p < 1.0) return { text: `Knapp — nur noch ${(w.budget-w.spent).toFixed(2).replace(".",",")} € Puffer.`, color: GOLD };
    return { text: `Wochenbudget überschritten um ${(w.spent-w.budget).toFixed(2).replace(".",",")} €.`, color: ACCENT };
  }

  function addExpense() {
    const a = parseFloat(amount.replace(",", "."));
    if (!a || a <= 0) return;
    setBudget({ ...budget, expenses: [{ id: Date.now(), amount: a, label: label.trim() || bcat, cat: bcat, month: thisMonth, date: now.toISOString() }, ...(budget.expenses || [])] });
    setAmount(""); setLabel("");
  }
  function removeExpense(id) { setBudget({ ...budget, expenses: budget.expenses.filter((e) => e.id !== id) }); }
  function saveBudget() {
    const m = parseFloat(newMonthly.replace(",", "."));
    if (m > 0) setBudget({ ...budget, monthly: m });
    setEditBudget(false);
  }

  // Ausgaben je Kategorie (diesen Monat)
  const byCat = BUDGET_CATS.map((c) => [c, monthExpenses.filter((e) => e.cat === c).reduce((s, e) => s + Number(e.amount), 0)]).filter(([, v]) => v > 0);

  const monthName = now.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <div className="kk-pop">
      <SectionTitle>Budget-Challenge</SectionTitle>

      {/* Monats / Woche Umschalter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["month", "Monat"], ["week", "Wochenrückblick"]].map(([v, lbl]) => (
          <button key={v} onClick={() => setView(v)} className="kk-btn kk-b"
            style={{ flex: 1, padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 15, background: view === v ? DEEP : "#fff", color: view === v ? PAPER : DEEP, border: `2px solid ${DEEP}` }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Wochenrückblick-Ansicht */}
      {view === "week" && (
        <div>
          {/* Diese Woche Hauptkarte */}
          <Card highlight>
            <div className="kk-b" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: GOLD, marginBottom: 6 }}>Diese Woche · {weekLabel(thisWeek)}</div>
            <div className="kk-h" style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: DEEP }}>{thisWeek.spent.toFixed(2).replace(".", ",")} €</div>
            <div className="kk-b" style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
              von {thisWeek.budget.toFixed(2).replace(".", ",")} € Wochenbudget
            </div>
            <div style={{ background: "#E5DDD0", borderRadius: 10, height: 10, margin: "10px 0 8px", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, (thisWeek.spent / thisWeek.budget) * 100)}%`, height: "100%", background: thisWeek.spent > thisWeek.budget ? ACCENT : SAGE, borderRadius: 10, transition: "width .3s" }} />
            </div>
            {weekDiff !== null && (
              <div className="kk-b" style={{ fontSize: 14.5, fontWeight: 600, color: weekDiff > 0 ? ACCENT : SAGE }}>
                {weekDiff > 0 ? `▲ ${weekDiff.toFixed(0)}% mehr` : `▼ ${Math.abs(weekDiff).toFixed(0)}% weniger`} als letzte Woche
              </div>
            )}
            <div className="kk-b" style={{ fontSize: 14.5, marginTop: 8, color: motivation(thisWeek).color, fontWeight: 600 }}>
              {motivation(thisWeek).text}
            </div>
          </Card>

          {/* Letzte 5 Wochen Balkenübersicht */}
          <SectionTitle small>Verlauf (5 Wochen)</SectionTitle>
          <Card>
            {weeks.map((w, i) => {
              const wPct = w.budget > 0 ? Math.min(100, (w.spent / w.budget) * 100) : 0;
              const wColor = wPct < 70 ? SAGE : wPct < 100 ? GOLD : ACCENT;
              return (
                <div key={i} style={{ marginBottom: i < weeks.length - 1 ? 12 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span className="kk-b" style={{ fontSize: 13.5, fontWeight: w.isCurrent ? 700 : 400 }}>
                      {w.isCurrent ? "● Diese Woche" : weekLabel(w)}
                    </span>
                    <span className="kk-b" style={{ fontSize: 13.5, fontWeight: 600, color: wColor }}>
                      {w.spent.toFixed(2).replace(".", ",")} €
                    </span>
                  </div>
                  <div style={{ background: "#E5DDD0", borderRadius: 6, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${wPct}%`, height: "100%", background: wColor, borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
            <div className="kk-b" style={{ fontSize: 13, opacity: 0.5, marginTop: 10 }}>
              Strich = {(budget.monthly / 4.33).toFixed(2).replace(".", ",")} € Wochenbudget ({budget.monthly} € ÷ 4,33 Wochen)
            </div>
          </Card>

          {/* Woche nach Kategorie */}
          {thisWeek.expenses.length > 0 && (
            <>
              <SectionTitle small>Diese Woche nach Kategorie</SectionTitle>
              <Card>
                {BUDGET_CATS.map((c) => {
                  const v = thisWeek.expenses.filter((e) => e.cat === c).reduce((s, e) => s + Number(e.amount), 0);
                  if (!v) return null;
                  return (
                    <div key={c} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }} className="kk-b">
                        <span style={{ fontSize: 14.5 }}>{c}</span>
                        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{v.toFixed(2).replace(".", ",")} €</span>
                      </div>
                      <div style={{ background: "#E5DDD0", borderRadius: 6, height: 7, marginTop: 3, overflow: "hidden" }}>
                        <div style={{ width: `${thisWeek.spent > 0 ? (v / thisWeek.spent) * 100 : 0}%`, height: "100%", background: BUDGET_CAT_COLORS[c], borderRadius: 6 }} />
                      </div>
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </div>
      )}

      {/* Monatsansicht */}
      {view === "month" && <>

      {/* Hauptanzeige */}
      <Card highlight>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="kk-b" style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: SAGE }}>{monthName}</div>
          {!editBudget ? (
            <button onClick={() => { setNewMonthly(String(budget.monthly)); setEditBudget(true); }} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, fontSize: 13.5, fontWeight: 600, padding: 0 }}>✎ Budget ändern</button>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="number" value={newMonthly} onChange={(e) => setNewMonthly(e.target.value)} style={{ ...inp, width: 80, padding: "4px 8px" }} autoFocus />
              <button onClick={saveBudget} className="kk-btn kk-b" style={{ background: ACCENT, color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 700, padding: "5px 9px" }}>✓</button>
            </div>
          )}
        </div>

        <div className="kk-h" style={{ fontSize: 38, fontWeight: 900, color: overBudget ? ACCENT : DEEP, lineHeight: 1.1, marginTop: 4 }}>
          {remaining.toFixed(2).replace(".", ",")} €
        </div>
        <div className="kk-b" style={{ fontSize: 14.5, opacity: 0.7 }}>
          {overBudget ? "über dem Budget" : "übrig"} · {spent.toFixed(2).replace(".", ",")} € von {budget.monthly} € ausgegeben
        </div>

        {/* Fortschrittsbalken */}
        <div style={{ background: "#E5DDD0", borderRadius: 10, height: 14, marginTop: 12, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 10, transition: "width .4s ease" }} />
        </div>

        {!overBudget ? (
          <div className="kk-b" style={{ fontSize: 14, color: SAGE, fontWeight: 600, marginTop: 10 }}>
            💡 Noch {daysLeft} Tage — das sind {perDayLeft.toFixed(2).replace(".", ",")} € pro Tag, die du ausgeben kannst.
          </div>
        ) : (
          <div className="kk-b" style={{ fontSize: 14, color: ACCENT, fontWeight: 600, marginTop: 10 }}>
            ⚠ Budget überschritten. Nächsten Monat etwas mehr einplanen oder günstiger kochen.
          </div>
        )}
      </Card>

      {/* Ausgabe erfassen */}
      <Card>
        <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: ACCENT, marginBottom: 8 }}>+ Ausgabe erfassen</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addExpense(); }} placeholder="Betrag €" inputMode="decimal" style={{ ...inp, flex: 1 }} />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Notiz (optional)" style={{ ...inp, flex: 1.5 }} />
        </div>
        <select value={bcat} onChange={(e) => setBcat(e.target.value)} style={{ ...inp, marginBottom: 8 }}>
          {BUDGET_CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button onClick={addExpense} className="kk-btn kk-b" style={{ background: ACCENT, color: "#fff", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 16, width: "100%" }}>+ Hinzufügen</button>
      </Card>

      {/* Aufschlüsselung nach Kategorie */}
      {byCat.length > 0 && (
        <Card>
          <div className="kk-b" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: SAGE, marginBottom: 10 }}>Diesen Monat nach Kategorie</div>
          {byCat.map(([c, v]) => (
            <div key={c} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5 }} className="kk-b">
                <span>{c}</span><span style={{ fontWeight: 700 }}>{v.toFixed(2).replace(".", ",")} €</span>
              </div>
              <div style={{ background: "#E5DDD0", borderRadius: 6, height: 7, marginTop: 3, overflow: "hidden" }}>
                <div style={{ width: `${(v / spent) * 100}%`, height: "100%", background: BUDGET_CAT_COLORS[c], borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Liste der Ausgaben */}
      {monthExpenses.length > 0 && (
        <>
          <SectionTitle small>Ausgaben ({monthExpenses.length})</SectionTitle>
          {monthExpenses.map((e) => (
            <div key={e.id} className="kk-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: `1.5px solid ${DEEP}1A`, borderLeft: `5px solid ${BUDGET_CAT_COLORS[e.cat] || "#6B6259"}`, borderRadius: 9, padding: "9px 12px", marginBottom: 5 }}>
              <div>
                <div className="kk-b" style={{ fontSize: 15.5, fontWeight: 600 }}>{e.label}</div>
                <div className="kk-b" style={{ fontSize: 13, opacity: 0.55 }}>{e.cat} · {new Date(e.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="kk-h" style={{ fontSize: 17, fontWeight: 900 }}>{Number(e.amount).toFixed(2).replace(".", ",")} €</span>
                <button onClick={() => removeExpense(e.id)} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, fontSize: 20, padding: "0 4px", lineHeight: 1 }}>×</button>
              </div>
            </div>
          ))}
        </>
      )}

      {monthExpenses.length === 0 && (
        <div className="kk-b" style={{ textAlign: "center", opacity: 0.5, padding: 24, fontSize: 15 }}>
          Noch keine Ausgaben diesen Monat. Erfasse oben deine erste — Lebensmittel, Snacks, Getränke.
        </div>
      )}
      </>}
    </div>
  );
}

// ---------------- Settings (Ernährung/Intoleranzen + Haushalt) ----------------
function Settings({ diet, setDiet, health, setHealth, kidsProfile, setKidsProfile, household, setHousehold, collectBackup, applyBackup, darkMode, setDarkMode }) {
  const theme = useTheme();
  function toggle(key) { setDiet({ ...diet, [key]: !diet[key] }); }
  function toggleHealth(key) { setHealth({ ...health, [key]: !health[key] }); }
  function toggleKids(key) { setKidsProfile({ ...kidsProfile, [key]: !kidsProfile[key] }); }
  const activeCount = DIET_OPTIONS.filter((o) => diet[o.key]).length;

  function setAdults(n) { setHousehold({ ...household, adults: Math.max(0, n) }); }
  function addKid() { setHousehold({ ...household, kids: [...(household.kids || []), { age: 10 }] }); }
  function removeKid(i) { setHousehold({ ...household, kids: household.kids.filter((_, k) => k !== i) }); }
  function setKidAge(i, age) { setHousehold({ ...household, kids: household.kids.map((k, idx) => idx === i ? { age: Math.max(0, age) } : k) }); }
  function toggleSolo() { setHousehold({ ...household, soloMode: !household.soloMode }); }

  const [importMsg, setImportMsg] = useState("");
  const importRef = React.useRef(null);

  // Auto-Backup Sonntag: zeige Banner wenn heute Sonntag und noch kein Backup heute
  const isSunday = new Date().getDay() === 0;
  const lastBackupDate = localStorage.getItem("kk_last_backup_date") || "";
  const todayStr = new Date().toISOString().slice(0, 10);
  const showBackupBanner = isSunday && lastBackupDate !== todayStr;

  function doExport(auto = false) {
    try {
      const data = collectBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      a.href = url;
      a.download = `kuechen-kommando-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      localStorage.setItem("kk_last_backup_date", new Date().toISOString().slice(0, 10));
      if (!auto) setImportMsg("✓ Backup-Datei wurde erstellt und heruntergeladen.");
    } catch (e) {
      setImportMsg("Export fehlgeschlagen — bitte erneut versuchen.");
    }
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportMsg("Lese Backup…");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data._app !== "Küchen-Kommando") {
        setImportMsg("Das ist keine gültige Backup-Datei dieser App.");
        return;
      }
      await applyBackup(data);
      setImportMsg(`✓ Backup vom ${data._exported ? new Date(data._exported).toLocaleDateString("de-DE") : "?"} wiederhergestellt.`);
    } catch (err) {
      setImportMsg("Import fehlgeschlagen — Datei beschädigt oder falsches Format.");
    }
  }

  return (
    <div className="kk-pop">
      <SectionTitle>Einstellungen</SectionTitle>

      {/* Solo-Modus */}
      <div className="kk-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: household.soloMode ? "#FFF3EE" : "#fff", border: `2px solid ${household.soloMode ? ACCENT : DEEP + "22"}`, borderRadius: 12, padding: "14px", marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="kk-h" style={{ fontSize: 16, fontWeight: 600 }}>Nur für mich planen</div>
          <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.65 }}>Rezepte & Mengen auf 1 Person heruntergerechnet</div>
        </div>
        <button onClick={toggleSolo} className="kk-btn" aria-label="Solo-Modus"
          style={{ width: 52, height: 30, borderRadius: 16, background: household.soloMode ? ACCENT : "#CFC6B8", position: "relative", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 3, left: household.soloMode ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
        </button>
      </div>

      {/* Haushalt */}
      <SectionTitle small>Haushalt {household.soloMode && <span style={{ fontSize: 13, color: ACCENT }}>· im Solo-Modus inaktiv</span>}</SectionTitle>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, opacity: household.soloMode ? 0.4 : 1 }}>
          <span className="kk-b" style={{ fontSize: 16, fontWeight: 600 }}>Erwachsene</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setAdults(household.adults - 1)} disabled={household.soloMode} className="kk-btn kk-h" style={{ width: 32, height: 32, borderRadius: 8, background: "#EEE6D8", color: DEEP, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>−</button>
            <span className="kk-h" style={{ fontSize: 22, fontWeight: 900, minWidth: 24, textAlign: "center" }}>{household.adults}</span>
            <button onClick={() => setAdults(household.adults + 1)} disabled={household.soloMode} className="kk-btn kk-h" style={{ width: 32, height: 32, borderRadius: 8, background: ACCENT, color: "#fff", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>+</button>
          </div>
        </div>

        <div style={{ opacity: household.soloMode ? 0.4 : 1 }}>
          <div className="kk-b" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Kinder (mit Alter)</div>
          {(household.kids || []).map((k, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="kk-b" style={{ fontSize: 15, opacity: 0.6 }}>Kind {i + 1}:</span>
              <input type="number" value={k.age} onChange={(e) => setKidAge(i, parseInt(e.target.value) || 0)} disabled={household.soloMode} style={{ ...inp, width: 70, padding: "6px 8px" }} />
              <span className="kk-b" style={{ fontSize: 15, opacity: 0.6 }}>Jahre</span>
              <button onClick={() => removeKid(i)} disabled={household.soloMode} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, fontSize: 20, padding: "0 6px", marginLeft: "auto" }}>×</button>
            </div>
          ))}
          <button onClick={addKid} disabled={household.soloMode} className="kk-btn kk-b" style={{ background: "transparent", color: ACCENT, border: `1.5px dashed ${ACCENT}`, borderRadius: 8, padding: "7px 12px", fontSize: 14.5, fontWeight: 600, marginTop: 4 }}>+ Kind hinzufügen</button>
        </div>
        <div className="kk-b" style={{ fontSize: 13.5, color: SAGE, fontWeight: 600, marginTop: 12, paddingTop: 10, borderTop: "1px solid #00000010" }}>
          → Geplant wird aktuell für {household.soloMode ? "1 Person (Solo)" : `${household.adults} Erw. + ${household.kids?.length || 0} Kinder`}
        </div>
      </Card>

      {/* Ernährung */}
      {/* Gesundheit & Erkrankungen */}
      {/* Kinder-Profile */}
      {/* Einfrieren-Guide */}
      <SectionTitle small>❄ Was kann eingefroren werden?</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 14, opacity: 0.65, marginBottom: 10 }}>Schnelle Übersicht — Ampel-System:</div>
        {[
          { item: "Butter, Margarine", status: "✅", hint: "Problemlos, bis 12 Monate" },
          { item: "Sahne (flüssig)", status: "✅", hint: "Gut, nur zum Kochen auftauen" },
          { item: "Hartkäse (gerieben)", status: "✅", hint: "Direkt aus Tiefkühl verwenden" },
          { item: "Frischkäse", status: "✅", hint: "Textur leicht körnig → nur zum Kochen" },
          { item: "Crème fraîche", status: "✅", hint: "Wird leicht körnig → für Soßen ideal" },
          { item: "Laktosefreie Milch", status: "✅", hint: "Gut, gut schütteln nach Auftauen" },
          { item: "Schmand", status: "⚠️", hint: "Trennt sich → nur in warmen Gerichten" },
          { item: "Joghurt", status: "⚠️", hint: "Textur verändert sich → nur zum Kochen" },
          { item: "Weichkäse (Brie etc.)", status: "❌", hint: "Wird matschig, nicht empfohlen" },
          { item: "Fleisch (roh)", status: "✅", hint: "Bis 6 Monate, gut einwickeln" },
          { item: "Fleischbällchen (gegart)", status: "✅", hint: "Perfekt! Bis 3 Monate, direkt aufwärmen" },
          { item: "Hackfleisch-Soße", status: "✅", hint: "Bis 3 Monate, Liebling zum Vorkochen" },
          { item: "Brot & Brötchen", status: "✅", hint: "Bis 3 Monate, direkt toasten" },
          { item: "Gekochter Reis", status: "✅", hint: "Bis 1 Monat, mit Wasser aufwärmen" },
          { item: "Pasta (ungegessen)", status: "✅", hint: "Ohne Soße einfrieren, bis 2 Monate" },
          { item: "Rohes Gemüse", status: "⚠️", hint: "Vorher blanchieren → besser" },
          { item: "Gefrorenes Gemüse", status: "✅", hint: "Direkt verarbeiten, nicht auftauen" },
          { item: "Eier (roh, geschlagen)", status: "✅", hint: "Ohne Schale, bis 3 Monate" },
          { item: "Kartoffeln (roh)", status: "❌", hint: "Werden matschig — lieber garen, dann einfrieren" },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${theme.BORDER}` }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{r.status}</span>
            <div style={{ flex: 1 }}>
              <div className="kk-b" style={{ fontSize: 15, fontWeight: 600, color: theme.TEXT }}>{r.item}</div>
              <div className="kk-b" style={{ fontSize: 13, color: theme.MUTED }}>{r.hint}</div>
            </div>
          </div>
        ))}
        <div className="kk-b" style={{ fontSize: 13, opacity: 0.5, marginTop: 10 }}>✅ einfrieren · ⚠️ bedingt · ❌ nicht empfohlen</div>
      </Card>

      <SectionTitle small>👦👧 Kinder-Profile</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 14.5, opacity: 0.75, lineHeight: 1.5 }}>
          Aktiviere was auf deine Kinder zutrifft. Die App berechnet automatisch den <b>Kinder-Akzeptanz-Score</b> pro Rezept und passt die KI-Vorschläge an.
        </div>
      </Card>
      {KIDS_PROFILES.map((o) => {
        const on = !!kidsProfile[o.key];
        return (
          <div key={o.key} className="kk-card" style={{ background: on ? (theme.PAPER === "#F4EDE2" ? "#FFF8F0" : "#201810") : theme.CARD, border: `1.5px solid ${on ? GOLD : theme.BORDER}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div className="kk-b" style={{ fontSize: 17, fontWeight: 700, color: theme.TEXT }}>{o.emoji} {o.label}</div>
                <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.7, color: theme.TEXT, marginTop: 2 }}>{o.desc}</div>
              </div>
              <button onClick={() => toggleKids(o.key)} className="kk-btn"
                style={{ width: 52, height: 30, borderRadius: 16, background: on ? GOLD : "#CFC6B8", position: "relative", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
              </button>
            </div>
            {on && o.science && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.BORDER}` }}>
                <div className="kk-b" style={{ fontSize: 12, color: GOLD, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>🔬 Wissenschaftlicher Hintergrund</div>
                <div className="kk-b" style={{ fontSize: 13, color: theme.TEXT, lineHeight: 1.5, marginBottom: 8, opacity: 0.85 }}>{o.science}</div>
                <div className="kk-b" style={{ fontSize: 12, color: theme.MUTED, fontWeight: 700, marginBottom: 5 }}>💡 Praktische Tipps:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(o.tips || []).map((t, i) => (
                    <span key={i} className="kk-b" style={{ background: GOLD + "18", color: GOLD, border: `1px solid ${GOLD}44`, borderRadius: 12, padding: "3px 9px", fontSize: 12, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <SectionTitle small>Gesundheit & Erkrankungen</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 14.5, opacity: 0.75, lineHeight: 1.5 }}>
          Aktiviere was auf dich oder jemanden im Haushalt zutrifft. Die KI berücksichtigt alle aktiven Punkte automatisch bei Rezepten, Doppelrezepten und dem Wochenplan.
        </div>
      </Card>
      {HEALTH_OPTIONS.map((o) => {
        const on = !!health[o.key];
        return (
          <div key={o.key} className="kk-card" style={{ background: on ? (theme.PAPER === "#F4EDE2" ? "#FFF0EC" : "#2A1810") : theme.CARD, border: `1.5px solid ${on ? ACCENT : theme.BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div className="kk-b" style={{ fontSize: 16.5, fontWeight: 600, color: theme.TEXT }}>{o.emoji} {o.label}</div>
                <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.6, color: theme.TEXT }}>{o.desc}</div>
              </div>
              <button onClick={() => toggleHealth(o.key)} className="kk-btn" aria-label={o.label}
                style={{ width: 52, height: 30, borderRadius: 16, background: on ? ACCENT : "#CFC6B8", position: "relative", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
              </button>
            </div>
            {on && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.BORDER}` }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {o.tips.map((t, i) => (
                    <span key={i} className="kk-b" style={{ background: ACCENT + "18", color: ACCENT, border: `1px solid ${ACCENT}44`, borderRadius: 12, padding: "3px 9px", fontSize: 13, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <SectionTitle small>Ernährung & Intoleranzen</SectionTitle>
      <Card>
        <div className="kk-b" style={{ fontSize: 14.5, opacity: 0.75 }}>
          Frei an/aus. Aktive Regeln gelten für <b>alle</b> KI-Rezepte, Doppelrezepte und den Batch-Plan. <span style={{ color: SAGE, fontWeight: 600 }}>{activeCount} aktiv</span>
        </div>
      </Card>

      {DIET_OPTIONS.map((o) => {
        const on = !!diet[o.key];
        return (
          <div key={o.key} className="kk-card" style={{ background: on ? (theme.PAPER === "#F4EDE2" ? "#FFF3EE" : "#2A1410") : theme.CARD, border: `1.5px solid ${on ? ACCENT : theme.BORDER}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div className="kk-b" style={{ fontSize: 17, fontWeight: 700, color: theme.TEXT }}>{o.label}</div>
                <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.65, color: theme.TEXT, marginTop: 2 }}>{o.desc}</div>
              </div>
              <button onClick={() => toggle(o.key)} className="kk-btn" aria-label={o.label}
                style={{ width: 52, height: 30, borderRadius: 16, background: on ? ACCENT : "#CFC6B8", position: "relative", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
              </button>
            </div>
            {on && o.science && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.BORDER}` }}>
                <div className="kk-b" style={{ fontSize: 13, color: theme.TEXT, lineHeight: 1.5, marginBottom: 8, opacity: 0.85 }}>{o.science}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: o.examples ? 8 : 0 }}>
                  {(o.tips || []).map((t, i) => (
                    <span key={i} className="kk-b" style={{ background: ACCENT + "18", color: ACCENT, border: `1px solid ${ACCENT}44`, borderRadius: 12, padding: "3px 9px", fontSize: 12, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
                {o.examples && (
                  <div>
                    <div className="kk-b" style={{ fontSize: 12, color: theme.MUTED, fontWeight: 700, marginBottom: 4 }}>🍽 Beispiele die passen:</div>
                    <div className="kk-b" style={{ fontSize: 13, color: SAGE }}>{o.examples.join(" · ")}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="kk-b" style={{ fontSize: 13.5, opacity: 0.55, textAlign: "center", marginTop: 14, lineHeight: 1.5, color: theme.TEXT }}>
        Alle Einstellungen bleiben gespeichert und gelten ab dem nächsten generierten Rezept.
      </div>

      <button onClick={() => { saveKey("onboarding_done", false); window.location.reload(); }} className="kk-btn kk-b"
        style={{ width: "100%", marginTop: 8, background: "transparent", color: theme.MUTED, border: `1px solid ${theme.BORDER}`, borderRadius: 10, padding: "10px", fontSize: 13 }}>
        📖 Einführungs-Tutorial erneut anzeigen
      </button>

      {/* Backup & Wiederherstellung */}
      <SectionTitle small>Backup & Sicherung</SectionTitle>

      {/* Sonntags-Banner */}
      {showBackupBanner && (
        <div className="kk-card kk-pop" style={{ background: GOLD, color: DEEP, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
          <div className="kk-h" style={{ fontSize: 17, fontWeight: 900, marginBottom: 4 }}>📅 Sonntags-Backup empfohlen</div>
          <div className="kk-b" style={{ fontSize: 13.5, marginBottom: 12, opacity: 0.85 }}>
            Es ist Sonntag — der perfekte Moment für dein wöchentliches Backup. Alle Rezepte, Vorräte und Einstellungen sichern.
          </div>
          <button onClick={() => doExport(false)} className="kk-btn kk-b"
            style={{ background: DEEP, color: GOLD, padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 15, width: "100%" }}>
            📥 Jetzt Backup erstellen
          </button>
        </div>
      )}
      <Card>
        <div className="kk-b" style={{ fontSize: 14.5, opacity: 0.8, marginBottom: 12, lineHeight: 1.5 }}>
          Sichere alle deine Daten (Gefrierschrank, Vorrat, Rezepte, Einkauf, Budget, Einstellungen) in eine Datei. So geht nichts verloren — auch nicht bei einem App-Update. Bewahre die Datei sicher auf, z.B. in deiner Cloud oder per Mail an dich selbst.
        </div>
        <input ref={importRef} type="file" accept="application/json,.json" onChange={onImportFile} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={doExport} className="kk-btn kk-b" style={{ flex: 1, background: ACCENT, color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 15.5 }}>
            ⬇ Backup speichern
          </button>
          <button onClick={() => importRef.current?.click()} className="kk-btn kk-b" style={{ flex: 1, background: "transparent", color: DEEP, border: `2px solid ${DEEP}`, padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 15.5 }}>
            ⬆ Wiederherstellen
          </button>
        </div>
        {importMsg && <div className="kk-b" style={{ fontSize: 14, color: importMsg.startsWith("✓") ? SAGE : ACCENT, marginTop: 10, fontWeight: 600 }}>{importMsg}</div>}
        <div className="kk-b" style={{ fontSize: 13, opacity: 0.55, marginTop: 10, lineHeight: 1.5 }}>
          ⚠ Beim Wiederherstellen werden die aktuellen Daten durch die Backup-Datei ersetzt.
        </div>
      </Card>
    </div>
  );
}

// ---------------- Shared bits ----------------
function SectionTitle({ children, small }) {
  const theme = useTheme();
  return (
    <div className="kk-h" style={{
      fontSize: small ? 17 : 26,
      fontWeight: small ? 700 : 900,
      margin: small ? "24px 0 10px" : "4px 0 18px",
      letterSpacing: small ? -0.3 : -0.7,
      color: theme.TEXT,
      lineHeight: 1.15,
    }}>{children}</div>
  );
}
function Card({ children, highlight, glass }) {
  const theme = useTheme();
  return (
    <div className="kk-card" style={{
      background: glass
        ? "rgba(255,255,255,0.7)"
        : highlight ? theme.CARD : theme.CARD2,
      border: `1.5px solid ${highlight ? ACCENT + "33" : theme.BORDER}`,
      borderRadius: 20,
      padding: "18px 18px",
      marginBottom: 16,
      boxShadow: highlight
        ? `0 6px 28px ${ACCENT}1A, 0 1px 4px rgba(0,0,0,.07), inset 0 1px 0 rgba(255,255,255,0.5)`
        : `0 2px 16px rgba(0,0,0,.05), 0 1px 3px rgba(0,0,0,.03), inset 0 1px 0 rgba(255,255,255,0.4)`,
      backdropFilter: glass ? "blur(12px)" : "none",
    }}>{children}</div>
  );
}
function inpStyle(theme) {
  return { padding: "11px 14px", border: `1.5px solid ${theme.INP_BORDER}`, borderRadius: 12, fontSize: 16, background: theme.INP_BG, width: "100%", color: theme.TEXT };
}
const inp = { padding: "11px 14px", border: `1.5px solid #1A171422`, borderRadius: 12, fontSize: 16, background: "#fff", width: "100%", color: "#1A1714" };

// ---------------- date utils ----------------
function daysUntil(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }
function formatDate(d) { const x = new Date(d); return `${x.getDate()}.${x.getMonth() + 1}.`; }

// Frische-Status anhand MHD: liefert Farbe, Label und Stufe
// ---------------- Onboarding ----------------
const ONBOARDING_STEPS = [
  {
    emoji: "👋",
    title: "Willkommen bei Küchen-Kommando!",
    text: "Dein persönlicher Meal-Prep-Assistent. Einmal pro Woche kochen — die ganze Woche gut essen. Lass mich dir kurz zeigen wie alles funktioniert.",
    color: "#E8552A",
  },
  {
    emoji: "🧊",
    title: "Vorräte eintragen",
    text: "Trage zuerst deinen Gefrierschrank und Vorrat ein — unter 🏠 Vorräte. Mit MHD-Scan kannst du Verfallsdaten direkt fotografieren. Die KI plant dann aus dem was du hast.",
    color: "#6E8CA0",
  },
  {
    emoji: "🍳",
    title: "KI-Rezept generieren",
    text: "Unter 🍳 Kochen → KI-Rezepte: einfach auf 'Rezept generieren' tippen. Claude erstellt 3 Vorschläge aus deinem Bestand — wische zwischen ihnen und speichere deinen Favoriten.",
    color: "#5C6B52",
  },
  {
    emoji: "📅",
    title: "Wochenplan erstellen",
    text: "Unter 🍳 Kochen → Batch-Plan: Claude plant die komplette Woche — einen Kochtag, der Rest läuft von selbst. Zutaten kommen direkt auf die Picnic-Liste.",
    color: "#C9A04A",
  },
  {
    emoji: "🛒",
    title: "Einkauf & Picnic",
    text: "Alle Zutaten landen unter 🛒 Einkauf. Stammartikel sind schon vorbelegt. Einfach ergänzen, bestellen — fertig. Die App merkt sich Preise und warnt bei Preiserhöhungen.",
    color: "#E8552A",
  },
  {
    emoji: "👨‍👩‍👧‍👦",
    title: "Familie & Klammern",
    text: "Unter 👨‍👩‍👧‍👦 Familie: Kinder-Profile aktivieren, Klammern vergeben wenn die Kinder helfen, Schulbrot-Ideen generieren. Sonntags-Familienrat um 18:00!",
    color: "#C084FC",
  },
  {
    emoji: "⚙️",
    title: "Einstellungen anpassen",
    text: "Unter 👨‍👩‍👧‍👦 → Einstellungen: Laktosefrei, Hashimoto, ADHS, Low-Carb — alles was aktiviert ist, berücksichtigt die KI automatisch bei jedem Rezept.",
    color: "#5C6B52",
  },
  {
    emoji: "🚀",
    title: "Los geht's!",
    text: "Du bist bereit. Fang damit an, deinen Gefrierschrank einzutragen — dann generiere dein erstes Rezept. Das System wird mit jeder Woche besser.",
    color: "#E8552A",
  },
];

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const s = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,23,20,0.85)", zIndex: 9999, display: "flex", alignItems: "flex-end", padding: "0 0 32px" }}>
      <div className="kk-pop" style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "32px 24px 24px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? s.color : "#E5DDD0", transition: "all .3s ease" }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>{s.emoji}</div>
          <div className="kk-h" style={{ fontSize: 26, fontWeight: 900, color: "#1A1714", marginBottom: 12, letterSpacing: -0.5 }}>{s.title}</div>
          <div className="kk-b" style={{ fontSize: 17, color: "#1A1714", opacity: 0.75, lineHeight: 1.6 }}>{s.text}</div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="kk-btn kk-b"
              style={{ flex: 1, padding: "14px", borderRadius: 14, background: "transparent", border: "1.5px solid #E5DDD0", color: "#1A1714", fontWeight: 700, fontSize: 16 }}>
              ← Zurück
            </button>
          )}
          <button onClick={() => isLast ? onDone() : setStep(step + 1)} className="kk-btn kk-b"
            style={{ flex: 2, padding: "14px", borderRadius: 14, background: s.color, color: "#fff", fontWeight: 900, fontSize: 17 }}>
            {isLast ? "🚀 Loslegen!" : "Weiter →"}
          </button>
        </div>

        <button onClick={onDone} className="kk-btn kk-b"
          style={{ width: "100%", marginTop: 12, background: "transparent", color: "#1A1714", opacity: 0.4, fontSize: 14, padding: "8px" }}>
          Überspringen
        </button>
      </div>
    </div>
  );
}

function freshnessStatus(bestBefore) {
  if (!bestBefore) return { level: "none", color: "#6B6259", label: "kein MHD", dot: "⚪" };
  const d = daysUntil(bestBefore);
  if (d < 0) return { level: "expired", color: "#8B1A1A", label: `seit ${Math.abs(d)} T. abgelaufen`, dot: "⚫", days: d };
  if (d <= 7) return { level: "red", color: "#C0392B", label: `${d} Tage übrig`, dot: "🔴", days: d };
  if (d <= 14) return { level: "orange", color: "#D68910", label: `${d} Tage übrig`, dot: "🟠", days: d };
  return { level: "green", color: "#5C6B52", label: `${d} Tage übrig`, dot: "🟢", days: d };
}
