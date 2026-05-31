import React, { useState, useEffect, useRef, useCallback } from "react";

// -----------------------------------------------------------
//  VERENA OS -- Familien-Operator
//  Architektur: 4 Modi - KI-Herz - Zero Mental Drop
// -----------------------------------------------------------

// -- Farben & Design ----------------------------------------
const C = {
  bg:      "#0D0D0D",
  surface: "#161616",
  card:    "#1E1E1E",
  border:  "#2A2A2A",
  text:    "#F0EDE8",
  muted:   "#6B6560",
  accent:  "#E8552A",
  gold:    "#C9A04A",
  sage:    "#5C7A52",
  danger:  "#C0392B",
};

const MODE_CONFIG = {
  GREEN:    { label: "Normal",    emoji: "🟢", color: C.sage,   sub: "Alles laeuft." },
  YELLOW:   { label: "Reduziert", emoji: "🟡", color: C.gold,   sub: "Fokus auf Wichtiges." },
  RED:      { label: "Overload",  emoji: "🔴", color: C.accent, sub: "Ich uebernehme." },
  DARK_RED: { label: "Krise",     emoji: "⚫", color: "#1a0a0a", sub: "Nur das Noetigste." },
};

// -- Storage Helper -----------------------------------------
function load(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// -- Claude API Call ----------------------------------------
async function askClaude(systemPrompt, userMessage, history = []) {
  const messages = [
    ...history.map(m => ({ role: m.role, content: m.text })),
    { role: "user", content: userMessage }
  ];
  const res = await fetch("/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Keine Antwort.";
}

// -----------------------------------------------------------
//  MAIN APP
// -----------------------------------------------------------
// -- Verena-Kontext: feste Muster die die KI kennt ----------
const VERENA_KONTEXT = `
Du bist Verenas persoenlicher Familien-Operator. Du kennst sie gut:

FAMILIE:
- Verena: arbeitet Di-Fr morgens (Teilzeit), Montag frei
- Hanna: 12 Jahre, Schule
- Timo: 10 Jahre, Schule, hatte kuerzlich Arzttermin
- Paul: Partner
- Donnerstag 17:00: Nachhilfe fuer Hanna + Timo (fixer Termin jede Woche)
- Sonntag 18:00: Familien-Meeting

ESSEN:
- IMMER laktosefrei (Verena vertraegt keine Laktose)
- Kindertauglich, einfach, max 30 Min
- Donnerstag nach Nachhilfe: besonders wenig Zeit, max 15 Min

HAUSHALT:
- Sonntags: Brot vorbereiten fuer die Woche (Hanna schmiert, Timo belegt, Verena packt)
- Waesche, Geschirrspueler, 5-Min Tidy sind Routinen

PSYCHOLOGIE:
- Verena startet stark aber verliert den Faden bei zu vielen Aufgaben
- Max 3-5 Aufgaben sichtbar
- Keine Schuldgefuehle erzeugen
- Realitaet vor Perfektion
`;


// -- Feste Verena-Vorlagen (werden beim Onboarding eingefuegt) --
const VERENA_VORLAGEN = {
  tasks: [
    { id: 1, text: "Brot vorbereiten", wann: "heute", kategorie: "haushalt", wiederholung: "so", priority: "normal", done: false, createdAt: Date.now(), lastCreated: "" },
    { id: 2, text: "Familienmeeting 18 Uhr", wann: "heute", kategorie: "kinder", wiederholung: "so", priority: "normal", done: false, createdAt: Date.now(), lastCreated: "" },
    { id: 3, text: "Nachhilfe vorbereiten", wann: "heute", kategorie: "kinder", wiederholung: "do", priority: "high", done: false, createdAt: Date.now(), lastCreated: "" },
    { id: 4, text: "Geschirrspueler leeren", wann: "heute", kategorie: "haushalt", wiederholung: "taeglich", priority: "normal", done: false, createdAt: Date.now(), lastCreated: "" },
    { id: 5, text: "Waesche aufhaengen", wann: "heute", kategorie: "haushalt", wiederholung: "einmalig", priority: "normal", done: false, createdAt: Date.now(), lastCreated: "" },
  ],
  vorrat: [
    { id: 10, name: "Nudeln" },
    { id: 11, name: "Reis" },
    { id: 12, name: "Olivenoel" },
    { id: 13, name: "Salz, Pfeffer, Gewuerze" },
    { id: 14, name: "Tomaten Dose" },
  ],
};

export default function VerenaOS() {
  // -- State ----------------------------------------------
  const [mode, setMode]         = useState(() => load("vos_mode", "GREEN"));
  const [tasks, setTasks]       = useState(() => load("vos_tasks", []));
  const [meal, setMeal]         = useState(() => load("vos_meal", null));
  const [memory, setMemory]     = useState(() => load("vos_memory", []));
  const [autopilot, setAutopilot] = useState(null);
  const [autopilotLoading, setAutopilotLoading] = useState(false);
  const [screen, setScreen]     = useState("home");
  const [warning, setWarning]   = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem("vos_onboarded") !== "true";
  });

  // -- Persist ---------------------------------------------
  useEffect(() => save("vos_mode", mode), [mode]);
  useEffect(() => save("vos_tasks", tasks), [tasks]);
  useEffect(() => save("vos_meal", meal), [meal]);
  useEffect(() => save("vos_memory", memory), [memory]);

  // -- Derived: visible tasks per mode ---------------------
  const maxVisible = mode === "DARK_RED" ? 3 : mode === "RED" ? 3 : mode === "YELLOW" ? 4 : 5;
  const activeTasks = tasks.filter(t => !t.done).slice(0, maxVisible);
  const mc = MODE_CONFIG[mode];

  // -- Add to memory ----------------------------------------
  const addMemory = useCallback((text) => {
    const entry = { id: Date.now(), text, ts: new Date().toLocaleString("de-DE") };
    setMemory(prev => [entry, ...prev].slice(0, 100));
    return entry;
  }, []);

  // -- Export / Import / Onboarding -------------------------
  function doExport() {
    const data = {
      version: 1,
      tasks:    JSON.parse(localStorage.getItem("vos_tasks") || "[]"),
      termine:  JSON.parse(localStorage.getItem("vos_termine") || "[]"),
      tk:       JSON.parse(localStorage.getItem("vos_tk") || "[]"),
      vorrat:   JSON.parse(localStorage.getItem("vos_vorrat") || "[]"),
      wochenplan: JSON.parse(localStorage.getItem("vos_wochenplan") || "null"),
      einkauf:  JSON.parse(localStorage.getItem("vos_einkauf") || "[]"),
      ts: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verena-os-backup-" + new Date().toISOString().slice(0,10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.tasks)      { localStorage.setItem("vos_tasks", JSON.stringify(data.tasks)); setTasks(data.tasks); }
        if (data.termine)    localStorage.setItem("vos_termine", JSON.stringify(data.termine));
        if (data.tk)         localStorage.setItem("vos_tk", JSON.stringify(data.tk));
        if (data.vorrat)     localStorage.setItem("vos_vorrat", JSON.stringify(data.vorrat));
        if (data.wochenplan) localStorage.setItem("vos_wochenplan", JSON.stringify(data.wochenplan));
        if (data.einkauf)    localStorage.setItem("vos_einkauf", JSON.stringify(data.einkauf));
        localStorage.setItem("vos_onboarded", "true");
        setShowOnboarding(false);
        alert("Backup wiederhergestellt!");
      } catch { alert("Fehler beim Laden."); }
    };
    reader.readAsText(file);
  }

  function doOnboarding() {
    const now = Date.now();
    const vorlagen = VERENA_VORLAGEN.tasks.map((t, i) => ({ ...t, id: now + i, lastCreated: "" }));
    setTasks(vorlagen);
    localStorage.setItem("vos_tasks", JSON.stringify(vorlagen));
    localStorage.setItem("vos_vorrat", JSON.stringify(VERENA_VORLAGEN.vorrat));
    localStorage.setItem("vos_onboarded", "true");
    setShowOnboarding(false);
  }

  // -- Wiederkehrende Aufgaben automatisch erstellen -----------
  useEffect(() => {
    const heute = new Date();
    const wochentag = ["so","mo","di","mi","do","fr","sa"][heute.getDay()];
    const tagDesMonats = heute.getDate();
    const today = heute.toDateString();

    setTasks(prev => {
      const updated = [...prev];
      // Für jede wiederkehrende Aufgabe prüfen ob heute fällig
      prev.forEach(t => {
        if (!t.wiederholung || t.wiederholung === "einmalig") return;
        if (t.lastCreated === today) return; // Heute schon erstellt

        let faellig = false;
        if (t.wiederholung === "taeglich") faellig = true;
        if (t.wiederholung === wochentag) faellig = true;
        if (t.wiederholung === "monatlich" && tagDesMonats === new Date(t.createdAt).getDate()) faellig = true;

        if (faellig) {
          // Neue Instanz erstellen
          updated.push({
            ...t,
            id: Date.now() + Math.random(),
            done: false,
            createdAt: Date.now(),
            lastCreated: today,
            autoAdded: true,
          });
          // lastCreated auf Original aktualisieren
          const idx = updated.findIndex(x => x.id === t.id);
          if (idx !== -1) updated[idx] = { ...updated[idx], lastCreated: today };
        }
      });
      return updated;
    });
  }, []);

  // -- Morgen-Autopilot: laeuft einmal pro Tag beim Oeffnen --
  useEffect(() => {
    const today = new Date().toDateString();
    const lastRun = localStorage.getItem("vos_autopilot_date");
    if (lastRun === today) {
      // Bereits heute gelaufen - gespeichertes Ergebnis laden
      const saved = localStorage.getItem("vos_autopilot_result");
      if (saved) { try { setAutopilot(JSON.parse(saved)); } catch {} }
      return;
    }
    // Erster Aufruf heute - Autopilot starten
    runAutopilot();
  }, []);

  async function runAutopilot() {
    setAutopilotLoading(true);
    try {
      const now = new Date();
      const wochentage = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
      const wochentag = wochentage[now.getDay()];
      const datum = now.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
      const offeneAufgaben = tasks.filter(t => !t.done).map(t => t.text).join(", ") || "keine";
      const termine = (() => {
        try {
          const t = JSON.parse(localStorage.getItem("vos_termine") || "[]");
          const heute = new Date(); heute.setHours(0,0,0,0);
          return t.filter(x => {
            const d = new Date(x.datum); d.setHours(0,0,0,0);
            const diff = Math.round((d - heute) / 86400000);
            return diff >= 0 && diff <= 3;
          }).map(x => x.title + (x.time ? " um " + x.time : "") + " (" + (
            Math.round((new Date(x.datum) - heute) / 86400000) === 0 ? "heute" :
            Math.round((new Date(x.datum) - heute) / 86400000) === 1 ? "morgen" :
            "in " + Math.round((new Date(x.datum) - heute) / 86400000) + " Tagen"
          ) + ")").join(", ") || "keine";
        } catch { return "keine"; }
      })();

      const prompt = `${VERENA_KONTEXT}

HEUTE: ${wochentag}, ${datum}
Offene Aufgaben: ${offeneAufgaben}
Termine naechste 3 Tage: ${termine}

Erstelle den Tagesplan fuer Verena. Antworte NUR als JSON:
{
  "fokus": "Die eine wichtigste Aufgabe heute (max 8 Worte)",
  "essen": "Heutiges Abendessen (laktosefrei, kindertauglich, mit Zeitangabe)",
  "warnung": "Wichtigste Warnung oder null wenn nichts dringend",
  "modus": "GREEN oder YELLOW oder RED je nach Tagesbelastung",
  "begruendung": "1 kurzer Satz warum dieser Plan"
}`;

      const reply = await askClaude("Antworte nur als reines JSON ohne Markdown.", prompt);
      const clean = reply.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);

      setAutopilot(data);
      localStorage.setItem("vos_autopilot_result", JSON.stringify(data));
      localStorage.setItem("vos_autopilot_date", new Date().toDateString());

      // Modus automatisch setzen wenn KI RED empfiehlt
      if (data.modus === "RED" && mode === "GREEN") setMode("RED");
      if (data.modus === "YELLOW" && mode === "GREEN") setMode("YELLOW");

      // Warnung setzen
      if (data.warnung) setWarning(data.warnung);

      // Essen vorbelegen wenn noch keins
      if (!meal && data.essen) setMeal(data.essen);

      // Fokus-Aufgabe hinzufuegen wenn nicht schon vorhanden
      if (data.fokus) {
        const exists = tasks.some(t => t.text.toLowerCase().includes(data.fokus.toLowerCase().slice(0, 10)));
        if (!exists) {
          setTasks(prev => [
            { id: Date.now(), text: data.fokus, priority: "high", done: false, createdAt: Date.now(), autoAdded: true },
            ...prev
          ]);
        }
      }

      addMemory("Autopilot: " + data.begruendung);
    } catch (e) {
      console.error("Autopilot error:", e);
    }
    setAutopilotLoading(false);
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: C.bg,
      color: C.text,
      fontFamily: "'SF Pro Display', -apple-system, 'Helvetica Neue', sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* -- Status Bar -- */}
      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Verena OS
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={doExport} style={{
            background: "transparent", border: "1px solid " + C.border, borderRadius: 20,
            padding: "5px 10px", color: C.muted, fontSize: 11, cursor: "pointer"
          }}>💾 Backup</button>
          <ModeButton mode={mode} setMode={setMode} mc={mc} />
        </div>
      </div>

      {/* -- Onboarding Modal -- */}
      {showOnboarding && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "flex-end", padding: "0 0 32px" }}>
          <div style={{ background: "#1E1E1E", borderRadius: "24px 24px 0 0", padding: "32px 24px 24px", width: "100%", maxWidth: 480, margin: "0 auto" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>👋</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: "center", marginBottom: 8, color: C.text }}>Willkommen, Verena</h2>
            <p style={{ fontSize: 15, color: C.muted, textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
              Hast du ein Backup von vorher, oder moechtest du mit meinen Vorlagen starten?
            </p>
            <button onClick={doOnboarding} style={{
              width: "100%", padding: "15px", background: C.accent, border: "none",
              borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer", marginBottom: 10
            }}>
              Mit Vorlagen starten
            </button>
            <label style={{
              display: "block", width: "100%", padding: "15px", background: "transparent",
              border: "1px solid " + C.border, borderRadius: 14, color: C.text, fontWeight: 700,
              fontSize: 16, cursor: "pointer", textAlign: "center", boxSizing: "border-box", marginBottom: 10
            }}>
              Backup laden
              <input type="file" accept=".json" onChange={doImport} style={{ display: "none" }} />
            </label>
            <button onClick={() => { localStorage.setItem("vos_onboarded", "true"); setShowOnboarding(false); }} style={{
              width: "100%", padding: "12px", background: "transparent", border: "none",
              color: C.muted, fontSize: 14, cursor: "pointer"
            }}>
              Leer starten
            </button>
          </div>
        </div>
      )}

      {/* -- Screen Content -- */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 100px" }}>
        {screen === "home"    && <HomeScreen mode={mode} mc={mc} activeTasks={activeTasks} tasks={tasks} setTasks={setTasks} meal={meal} setMeal={setMeal} warning={warning} setWarning={setWarning} addMemory={addMemory} maxVisible={maxVisible} autopilot={autopilot} autopilotLoading={autopilotLoading} runAutopilot={runAutopilot} />}
        {screen === "tasks"   && <TasksScreen tasks={tasks} setTasks={setTasks} mode={mode} maxVisible={maxVisible} addMemory={addMemory} />}
        {screen === "kueche"  && <KuecheScreen addMemory={addMemory} mode={mode} />}
        {screen === "voice"   && <VoiceScreen mode={mode} setMode={setMode} tasks={tasks} setTasks={setTasks} meal={meal} setMeal={setMeal} addMemory={addMemory} setWarning={setWarning} />}
        {screen === "termine" && <TermineScreen addMemory={addMemory} setWarning={setWarning} tasks={tasks} setTasks={setTasks} />}
      </div>

      {/* -- Bottom Nav -- */}
      <BottomNav screen={screen} setScreen={setScreen} />
    </div>
  );
}

// -----------------------------------------------------------
//  MODE BUTTON
// -----------------------------------------------------------
function ModeButton({ mode, setMode, mc }) {
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

// -----------------------------------------------------------
//  HOME SCREEN
// -----------------------------------------------------------
function HomeScreen({ mode, mc, activeTasks, tasks, setTasks, meal, setMeal, warning, setWarning, addMemory, maxVisible, autopilot, autopilotLoading, runAutopilot }) {
  const isDark = mode === "DARK_RED";

  return (
    <div style={{ paddingTop: 28 }}>
      {/* Hero */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
          {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 style={{
          fontSize: isDark ? 28 : 32,
          fontWeight: 900,
          lineHeight: 1.1,
          margin: 0,
          letterSpacing: -1,
          color: isDark ? C.danger : C.text,
        }}>
          {isDark ? "Nur das Noetigste." : mode === "RED" ? "Ich uebernehme." : mode === "YELLOW" ? "Fokus." : "Guten Morgen."}
        </h1>
      </div>

      {/* Autopilot Banner */}
      {autopilotLoading && (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.muted }}>Autopilot plant deinen Tag...</div>
        </div>
      )}
      {autopilot && !autopilotLoading && (
        <div style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #1E1E1E 100%)",
          border: "1px solid " + C.accent + "40",
          borderRadius: 18, padding: "16px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
            Autopilot aktiv
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            {autopilot.begruendung}
          </div>
          <button onClick={() => { localStorage.removeItem("vos_autopilot_date"); runAutopilot(); }} style={{
            marginTop: 10, background: "transparent", border: "1px solid " + C.border,
            borderRadius: 8, padding: "5px 10px", color: C.muted, fontSize: 11, cursor: "pointer"
          }}>Neu planen</button>
        </div>
      )}

      {/* Warning Banner */}
      {warning && (
        <div style={{
          background: `${C.accent}18`,
          border: `1px solid ${C.accent}44`,
          borderRadius: 16,
          padding: "14px 16px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ fontSize: 14, color: C.accent }}>{warning}</div>
          <button onClick={() => setWarning(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer" }}>x</button>
        </div>
      )}

      {/* Focus Card -- Hauptaufgabe */}
      {activeTasks.length > 0 && (
        <FocusCard task={activeTasks[0]} onDone={() => {
          setTasks(prev => prev.map((t, i) => t.id === activeTasks[0].id ? { ...t, done: true } : t));
          addMemory(`✓ Erledigt: ${activeTasks[0].text}`);
        }} />
      )}

      {/* Task List Preview */}
      {activeTasks.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>
            Danach ({activeTasks.length - 1} weitere)
          </div>
          {activeTasks.slice(1, maxVisible).map(t => (
            <MiniTask key={t.id} task={t} onDone={() => {
              setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: true } : x));
              addMemory(`✓ Erledigt: ${t.text}`);
            }} />
          ))}
        </div>
      )}

      {/* Meal Card */}
      <MealCard meal={meal} setMeal={setMeal} mode={mode} addMemory={addMemory} />

      {/* Quick Add Task */}
      {mode !== "DARK_RED" && (
        <QuickAddTask tasks={tasks} setTasks={setTasks} addMemory={addMemory} />
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <StatPill label="Erledigt heute" value={tasks.filter(t => t.done && isToday(t.doneAt)).length} />
        <StatPill label="Offen gesamt" value={tasks.filter(t => !t.done).length} />
      </div>
    </div>
  );
}

function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function FocusCard({ task, onDone }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      padding: "20px",
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
        Jetzt
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, marginBottom: 16 }}>
        {task.text}
      </div>
      {task.note && (
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{task.note}</div>
      )}
      <button onClick={onDone} style={{
        background: C.accent,
        border: "none",
        borderRadius: 14,
        padding: "13px 20px",
        color: "#fff",
        fontWeight: 800,
        fontSize: 16,
        cursor: "pointer",
        width: "100%",
      }}>
        ✓ Erledigt
      </button>
    </div>
  );
}

function MiniTask({ task, onDone }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <button onClick={onDone} style={{
        width: 24,
        height: 24,
        borderRadius: 8,
        border: `2px solid ${C.border}`,
        background: "transparent",
        cursor: "pointer",
        flexShrink: 0,
      }} />
      <div style={{ fontSize: 15, color: C.text }}>{task.text}</div>
      {task.priority === "high" && (
        <div style={{ marginLeft: "auto", fontSize: 11, color: C.accent, fontWeight: 700 }}>!</div>
      )}
    </div>
  );
}

function MealCard({ meal, setMeal, mode, addMemory }) {
  const [loading, setLoading] = useState(false);

  async function generateMeal() {
    setLoading(true);
    try {
      const stressLevel = mode === "DARK_RED" ? "extrem hoch" : mode === "RED" ? "hoch" : mode === "YELLOW" ? "mittel" : "normal";
      const reply = await askClaude(
        `Du bist Verenas Familien-Operator. Schlage GENAU 1 Abendessen vor. 
Regeln: laktosefrei, kindertauglich (Hanna 12, Timo 10), max ${mode === "GREEN" ? "30" : "20"} Minuten, einfach.
Stresslevel heute: ${stressLevel}.
Antworte NUR in diesem Format:
🍽 [Gericht]
⏱ [X] Min
📝 [2-3 Zutaten, kurz]
Sonst nichts.`,
        "Heutiges Abendessen vorschlagen"
      );
      setMeal(reply);
      addMemory(`🍽 Essen geplant: ${reply.split("\n")[0]}`);
    } catch {}
    setLoading(false);
  }

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      padding: "18px",
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
        Heute Essen
      </div>
      {meal ? (
        <>
          <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 12, whiteSpace: "pre-line" }}>{meal}</div>
          <button onClick={() => { setMeal(null); }} style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "8px 14px",
            color: C.muted,
            fontSize: 13,
            cursor: "pointer",
          }}>
            Anders
          </button>
        </>
      ) : (
        <button onClick={generateMeal} disabled={loading} style={{
          background: loading ? C.border : C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: "14px",
          color: loading ? C.muted : C.text,
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? "default" : "pointer",
          width: "100%",
        }}>
          {loading ? "KI denkt..." : "🍽 Was essen wir heute?"}
        </button>
      )}
    </div>
  );
}

function QuickAddTask({ tasks, setTasks, addMemory }) {
  const [val, setVal] = useState("");
  const inp = useRef();

  function add() {
    if (!val.trim()) return;
    const t = { id: Date.now(), text: val.trim(), done: false, priority: "normal", createdAt: Date.now() };
    setTasks(prev => [...prev, t]);
    addMemory(`+ Aufgabe: ${val.trim()}`);
    setVal("");
  }

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        ref={inp}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && add()}
        placeholder="Aufgabe hinzufuegen..."
        style={{
          flex: 1,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: "13px 16px",
          color: C.text,
          fontSize: 15,
          outline: "none",
        }}
      />
      <button onClick={add} style={{
        background: C.accent,
        border: "none",
        borderRadius: 14,
        padding: "13px 18px",
        color: "#fff",
        fontSize: 18,
        cursor: "pointer",
      }}>+</button>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={{
      flex: 1,
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: "14px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// -----------------------------------------------------------
//  TASKS SCREEN
// -----------------------------------------------------------
function TasksScreen({ tasks, setTasks, mode, maxVisible, addMemory }) {
  const [tab, setTab]       = useState("open");
  const [val, setVal]       = useState("");
  const [wann, setWann]     = useState("diese-woche");
  const [kategorie, setKat] = useState("sonstiges");
  const [generating, setGenerating] = useState(false);

  const WANN = [
    { id: "heute",        label: "Heute",        color: C.accent },
    { id: "diese-woche",  label: "Diese Woche",  color: C.gold },
    { id: "diesen-monat", label: "Diesen Monat", color: C.sage },
    { id: "irgendwann",   label: "Irgendwann",   color: C.muted },
  ];
  const KATEGORIEN = [
    { id: "kinder",   label: "Kinder",   icon: "👧" },
    { id: "behoerde", label: "Behoerde", icon: "📋" },
    { id: "haushalt", label: "Haushalt", icon: "🏠" },
    { id: "arbeit",   label: "Arbeit",   icon: "💼" },
    { id: "sonstiges",label: "Sonstiges",icon: "•"  },
  ];
  const WIEDERHOLUNG = [
    { id: "einmalig",   label: "Einmalig" },
    { id: "taeglich",   label: "Taeglich" },
    { id: "mo",         label: "Mo" },
    { id: "di",         label: "Di" },
    { id: "mi",         label: "Mi" },
    { id: "do",         label: "Do" },
    { id: "fr",         label: "Fr" },
    { id: "sa",         label: "Sa" },
    { id: "so",         label: "So" },
    { id: "monatlich",  label: "Monatlich" },
  ];
  const [wiederholung, setWiederholung] = useState("einmalig");

  // Sortierung: Heute+Kinder zuerst, Irgendwann+Haushalt zuletzt
  const WANN_ORDER = { "heute": 0, "diese-woche": 1, "diesen-monat": 2, "irgendwann": 3 };
  const KAT_ORDER  = { "kinder": 0, "behoerde": 1, "arbeit": 2, "haushalt": 3, "sonstiges": 4 };

  const open = tasks.filter(t => !t.done).sort((a, b) => {
    const wA = WANN_ORDER[a.wann || "irgendwann"];
    const wB = WANN_ORDER[b.wann || "irgendwann"];
    if (wA !== wB) return wA - wB;
    return (KAT_ORDER[a.kategorie || "sonstiges"]) - (KAT_ORDER[b.kategorie || "sonstiges"]);
  });
  const done = tasks.filter(t => t.done);
  const hidden = open.length - maxVisible;

  function addTask() {
    if (!val.trim()) return;
    const t = {
      id: Date.now(), text: val.trim(),
      wann, kategorie, wiederholung,
      priority: wann === "heute" ? "high" : "normal",
      done: false, createdAt: Date.now(),
      lastCreated: new Date().toDateString(),
    };
    setTasks(prev => [...prev, t]);
    addMemory("+ " + val.trim() + (wiederholung !== "einmalig" ? " (wiederkehrend: " + wiederholung + ")" : ""));
    setVal("");
    setWiederholung("einmalig");
  }

  function doneTask(id, text) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: true, doneAt: Date.now() } : t));
    addMemory(`✓ ${text}`);
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function aiPrioritize() {
    if (open.length === 0) return;
    setGenerating(true);
    try {
      const list = open.map((t, i) => `${i + 1}. [${t.wann || "irgendwann"}][${t.kategorie || "sonstiges"}] ${t.text}`).join("\n");
      const reply = await askClaude(
        `Du bist Verenas Familien-Operator. Priorisiere diese Aufgabenliste.
Regeln: 
- heute+kinder = hoechste Prioritaet
- behoerde vor haushalt
- irgendwann+haushalt = niedrigste
- max ${maxVisible} zurueckgeben
- Modus: ${mode}
Antworte NUR mit nummerierten Zeilennummern der Aufgaben in Prioritaetsreihenfolge. Nur Zahlen.`,
        list
      );
      // Parse und sortiere
      const lines = reply.split("\n").filter(l => l.trim()).slice(0, maxVisible);
      const orderedTexts = lines.map(l => l.replace(/^\d+\.\s*/, "").trim());
      const sorted = [];
      orderedTexts.forEach(text => {
        const found = open.find(t => t.text.toLowerCase().includes(text.toLowerCase().slice(0, 15)));
        if (found) sorted.push(found);
      });
      // Remaining tasks
      const remaining = open.filter(t => !sorted.find(s => s.id === t.id));
      setTasks([...sorted, ...remaining, ...done]);
      addMemory("🤖 KI hat Aufgaben priorisiert");
    } catch {}
    setGenerating(false);
  }

  return (
    <div style={{ paddingTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.8 }}>Aufgaben</h2>
        <button onClick={aiPrioritize} disabled={generating} style={{
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "8px 12px",
          color: generating ? C.muted : C.gold,
          fontSize: 13,
          cursor: generating ? "default" : "pointer",
        }}>
          {generating ? "..." : "🤖 Priorisieren"}
        </button>
      </div>

      {/* Modus-Hinweis */}
      {mode !== "GREEN" && (
        <div style={{
          background: `${C.gold}15`,
          border: `1px solid ${C.gold}30`,
          borderRadius: 12,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
          color: C.gold,
        }}>
          {mode === "DARK_RED" ? "⚫ Nur 3 Aufgaben. Alles andere verschoben." :
           mode === "RED"      ? "🔴 Ich fuehre. Fokus auf das Wesentliche." :
                                 "🟡 Reduzierter Modus -- weniger ist mehr."}
        </div>
      )}

      {/* Add Task */}
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 18, padding: "16px", marginBottom: 20 }}>
        <input value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()}
          placeholder="Was muss erledigt werden?"
          style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "12px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />

        {/* Wann */}
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Wann?</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {WANN.map(w => (
            <button key={w.id} onClick={() => setWann(w.id)} style={{
              padding: "7px 12px", borderRadius: 20,
              border: "1px solid " + (wann === w.id ? w.color : C.border),
              background: wann === w.id ? w.color + "25" : "transparent",
              color: wann === w.id ? w.color : C.muted,
              fontSize: 13, fontWeight: wann === w.id ? 700 : 400, cursor: "pointer"
            }}>{w.label}</button>
          ))}
        </div>

        {/* Kategorie */}
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Was ist es?</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {KATEGORIEN.map(k => (
            <button key={k.id} onClick={() => setKat(k.id)} style={{
              padding: "7px 12px", borderRadius: 20,
              border: "1px solid " + (kategorie === k.id ? C.text : C.border),
              background: kategorie === k.id ? C.border : "transparent",
              color: kategorie === k.id ? C.text : C.muted,
              fontSize: 13, cursor: "pointer"
            }}>{k.icon} {k.label}</button>
          ))}
        </div>

        {/* Wiederholung */}
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Wiederholt sich?</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {WIEDERHOLUNG.map(w => (
            <button key={w.id} onClick={() => setWiederholung(w.id)} style={{
              padding: "7px 10px", borderRadius: 20,
              border: "1px solid " + (wiederholung === w.id ? C.text : C.border),
              background: wiederholung === w.id ? C.card : "transparent",
              color: wiederholung === w.id ? C.text : C.muted,
              fontSize: 12, fontWeight: wiederholung === w.id ? 700 : 400, cursor: "pointer"
            }}>{w.label}</button>
          ))}
        </div>

        <button onClick={addTask} disabled={!val.trim()} style={{
          width: "100%", padding: "13px", background: val.trim() ? C.accent : C.border,
          border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 15, cursor: val.trim() ? "pointer" : "default"
        }}>+ Hinzufuegen</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["open", `Offen (${open.length})`], ["done", `Erledigt (${done.length})`]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1,
            padding: "10px",
            borderRadius: 12,
            border: "none",
            background: tab === t ? C.card : "transparent",
            color: tab === t ? C.text : C.muted,
            fontSize: 14,
            fontWeight: tab === t ? 700 : 400,
            cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      {/* Task list */}
      {tab === "open" && (
        <>
          {open.slice(0, maxVisible).map((t, i) => (
            <TaskRow key={t.id} task={t} index={i} onDone={() => doneTask(t.id, t.text)} onDelete={() => deleteTask(t.id)} />
          ))}
          {hidden > 0 && (
            <div style={{
              textAlign: "center",
              padding: "14px",
              fontSize: 13,
              color: C.muted,
              border: `1px dashed ${C.border}`,
              borderRadius: 12,
              marginTop: 8,
            }}>
              + {hidden} weitere versteckt ({MODE_CONFIG[mode].label}-Modus)
            </div>
          )}
        </>
      )}
      {tab === "done" && done.map(t => (
        <div key={t.id} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 0",
          borderBottom: `1px solid ${C.border}`,
          opacity: 0.5,
        }}>
          <div style={{ fontSize: 14, textDecoration: "line-through" }}>{t.text}</div>
          <button onClick={() => deleteTask(t.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function TaskRow({ task, index, onDone, onDelete }) {
  const isFirst = index === 0;
  const WANN_COLOR = { "heute": C.accent, "diese-woche": C.gold, "diesen-monat": C.sage, "irgendwann": C.muted };
  const WANN_LABEL = { "heute": "Heute", "diese-woche": "Diese Woche", "diesen-monat": "Diesen Monat", "irgendwann": "Irgendwann" };
  const KAT_ICON   = { "kinder": "👧", "behoerde": "📋", "haushalt": "🏠", "arbeit": "💼", "sonstiges": "•" };
  const wannColor = WANN_COLOR[task.wann] || C.muted;

  return (
    <div style={{
      background: isFirst ? C.card : "transparent",
      border: "1px solid " + (isFirst ? C.accent + "40" : C.border),
      borderRadius: isFirst ? 18 : 12,
      padding: isFirst ? "16px" : "10px 12px",
      marginBottom: 8,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <button onClick={onDone} style={{
        width: isFirst ? 28 : 22, height: isFirst ? 28 : 22,
        borderRadius: isFirst ? 10 : 8,
        border: "2px solid " + (isFirst ? C.accent : C.border),
        background: "transparent", cursor: "pointer", flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isFirst ? 16 : 14, fontWeight: isFirst ? 600 : 400 }}>{task.text}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
          {task.wann && (
            <span style={{ fontSize: 10, color: wannColor, fontWeight: 700, letterSpacing: 0.3 }}>
              {WANN_LABEL[task.wann] || task.wann}
            </span>
          )}
          {task.kategorie && task.kategorie !== "sonstiges" && (
            <span style={{ fontSize: 11, color: C.muted }}>
              {KAT_ICON[task.kategorie]} {task.kategorie}
            </span>
          )}
          {task.wiederholung && task.wiederholung !== "einmalig" && (
            <span style={{ fontSize: 10, color: C.sage, fontWeight: 600 }}>
              ↻ {task.wiederholung}
            </span>
          )}
        </div>
      </div>
      <button onClick={onDelete} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>x</button>
    </div>
  );
}

// -----------------------------------------------------------
//  KUECHE SCREEN — TK + Vorrat + Wochenplan + Einkauf
// -----------------------------------------------------------
function KuecheScreen({ addMemory, mode }) {
  const [tab, setTab] = useState("woche");
  const [tk, setTk] = useState(() => { try { return JSON.parse(localStorage.getItem("vos_tk") || "[]"); } catch { return []; } });
  const [vorrat, setVorrat] = useState(() => { try { return JSON.parse(localStorage.getItem("vos_vorrat") || "[]"); } catch { return []; } });
  const [wochenplan, setWochenplan] = useState(() => { try { return JSON.parse(localStorage.getItem("vos_wochenplan") || "null"); } catch { return null; } });
  const [einkauf, setEinkauf] = useState(() => { try { return JSON.parse(localStorage.getItem("vos_einkauf") || "[]"); } catch { return []; } });
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newVorrat, setNewVorrat] = useState("");

  useEffect(() => { try { localStorage.setItem("vos_tk", JSON.stringify(tk)); } catch {} }, [tk]);
  useEffect(() => { try { localStorage.setItem("vos_vorrat", JSON.stringify(vorrat)); } catch {} }, [vorrat]);
  useEffect(() => { try { localStorage.setItem("vos_wochenplan", JSON.stringify(wochenplan)); } catch {} }, [wochenplan]);
  useEffect(() => { try { localStorage.setItem("vos_einkauf", JSON.stringify(einkauf)); } catch {} }, [einkauf]);

  const WOCHENTAGE = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];

  async function generiereWochenplan() {
    setLoading(true);
    try {
      const tkListe = tk.map(i => i.name).join(", ") || "nichts";
      const vorratListe = vorrat.map(i => i.name).join(", ") || "nichts";
      const reply = await askClaude(
        `Du bist Verenas Familien-Operator. Antworte NUR als reines JSON-Array ohne Markdown.`,
        `Erstelle einen Wochenplan Mo-So.
TK-Schrank: ${tkListe}
Vorrat: ${vorratListe}

Regeln:
- IMMER laktosefrei
- Kindertauglich (Hanna 12, Timo 10)
- Nutze vorhandene Zutaten aus TK und Vorrat
- Donnerstag max 15 Min (Nachhilfe)
- Montag entspannt (kein Arbeitstag)
- Realistisch und einfach

Antworte als JSON-Array mit 7 Objekten:
[{"tag":"Montag","gericht":"Name","zeit":20,"zutaten":["zutat1","zutat2"],"vorhanden":true},...]
vorhanden=true wenn alle Hauptzutaten im TK/Vorrat sind.`
      );
      const clean = reply.replace(/```json|```/g, "").trim();
      const plan = JSON.parse(clean);
      setWochenplan(plan);
      addMemory("Wochenplan generiert");

      // Einkaufsliste aus nicht-vorhandenen Zutaten
      const fehlendeZutaten = [];
      plan.forEach(tag => {
        if (!tag.vorhanden) {
          tag.zutaten.forEach(z => {
            const imVorrat = vorrat.some(v => v.name.toLowerCase().includes(z.toLowerCase()));
            const imTk = tk.some(t => t.name.toLowerCase().includes(z.toLowerCase()));
            if (!imVorrat && !imTk) {
              if (!fehlendeZutaten.includes(z)) fehlendeZutaten.push(z);
            }
          });
        }
      });
      if (fehlendeZutaten.length > 0) {
        const neueItems = fehlendeZutaten.map(z => ({ id: Date.now() + Math.random(), name: z, done: false }));
        setEinkauf(prev => {
          const vorhandene = prev.map(p => p.name.toLowerCase());
          const wirklichNeu = neueItems.filter(n => !vorhandene.includes(n.name.toLowerCase()));
          return [...prev, ...wirklichNeu];
        });
        addMemory("Einkaufsliste: " + fehlendeZutaten.length + " Artikel hinzugefuegt");
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  const tabs = [
    { id: "woche", label: "Woche" },
    { id: "einkauf", label: "Einkauf (" + einkauf.filter(e => !e.done).length + ")" },
    { id: "tk", label: "TK (" + tk.length + ")" },
    { id: "vorrat", label: "Vorrat (" + vorrat.length + ")" },
  ];

  return (
    <div style={{ paddingTop: 28 }}>
      <h2 style={{ margin: "0 0 20px", fontSize: 28, fontWeight: 900, letterSpacing: -0.8 }}>Kueche</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 12, border: "none",
            background: tab === t.id ? C.card : "transparent",
            color: tab === t.id ? C.text : C.muted,
            fontSize: 13, fontWeight: tab === t.id ? 700 : 400, cursor: "pointer"
          }}>{t.label}</button>
        ))}
      </div>

      {/* WOCHENPLAN */}
      {tab === "woche" && (
        <div>
          <button onClick={generiereWochenplan} disabled={loading} style={{
            width: "100%", padding: "14px", background: loading ? C.border : C.accent,
            border: "none", borderRadius: 14, color: "#fff",
            fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", marginBottom: 16
          }}>
            {loading ? "KI plant..." : wochenplan ? "Neu generieren" : "Wochenplan erstellen"}
          </button>

          {!wochenplan && !loading && (
            <div style={{ textAlign: "center", padding: "30px 0", color: C.muted, fontSize: 14 }}>
              Trage erst TK und Vorrat ein,{"\n"}dann erstellt die KI den Plan.
            </div>
          )}

          {wochenplan && wochenplan.map((tag, i) => (
            <div key={i} style={{
              background: C.card, border: "1px solid " + (tag.vorhanden ? C.sage + "40" : C.gold + "40"),
              borderRadius: 16, padding: "14px 16px", marginBottom: 8,
              display: "flex", alignItems: "flex-start", gap: 12
            }}>
              <div style={{ width: 80, flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: C.muted }}>{tag.tag}</div>
                <div style={{ fontSize: 10, color: tag.vorhanden ? C.sage : C.gold, fontWeight: 700, marginTop: 2 }}>
                  {tag.vorhanden ? "vorhanden" : "kaufen"}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{tag.gericht}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                  {tag.zeit} Min - {tag.zutaten ? tag.zutaten.slice(0,3).join(", ") : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EINKAUFSLISTE */}
      {tab === "einkauf" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newItem.trim()) {
                setEinkauf(prev => [...prev, { id: Date.now(), name: newItem.trim(), done: false }]);
                setNewItem("");
              }}}
              placeholder="Artikel hinzufuegen..."
              style={{ flex: 1, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none" }} />
          </div>
          {einkauf.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 0", color: C.muted, fontSize: 14 }}>
              Erst Wochenplan erstellen - dann kommt die Liste automatisch.
            </div>
          )}
          {einkauf.filter(e => !e.done).map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid " + C.border }}>
              <button onClick={() => setEinkauf(prev => prev.map(x => x.id === item.id ? { ...x, done: true } : x))} style={{
                width: 22, height: 22, borderRadius: 7, border: "2px solid " + C.border, background: "transparent", cursor: "pointer", flexShrink: 0
              }} />
              <div style={{ flex: 1, fontSize: 15 }}>{item.name}</div>
              <button onClick={() => setEinkauf(prev => prev.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>x</button>
            </div>
          ))}
          {einkauf.some(e => e.done) && (
            <>
              <div style={{ fontSize: 11, color: C.muted, margin: "16px 0 8px", letterSpacing: 1, textTransform: "uppercase" }}>Erledigt</div>
              {einkauf.filter(e => e.done).map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", opacity: 0.4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: C.sage, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 14, textDecoration: "line-through" }}>{item.name}</div>
                  <button onClick={() => setEinkauf(prev => prev.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>x</button>
                </div>
              ))}
              <button onClick={() => setEinkauf(prev => prev.filter(e => !e.done))} style={{
                marginTop: 8, background: "transparent", border: "1px solid " + C.border,
                borderRadius: 10, padding: "8px 14px", color: C.muted, fontSize: 13, cursor: "pointer"
              }}>Erledigte loeschen</button>
            </>
          )}
        </div>
      )}

      {/* TK SCHRANK */}
      {tab === "tk" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newItem.trim()) {
                setTk(prev => [...prev, { id: Date.now(), name: newItem.trim() }]);
                addMemory("TK: " + newItem.trim() + " hinzugefuegt");
                setNewItem("");
              }}}
              placeholder="z.B. Hackfleisch 500g..."
              style={{ flex: 1, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none" }} />
            <button onClick={() => { if (newItem.trim()) { setTk(prev => [...prev, { id: Date.now(), name: newItem.trim() }]); setNewItem(""); }}} style={{
              background: C.accent, border: "none", borderRadius: 12, padding: "11px 16px", color: "#fff", fontSize: 16, cursor: "pointer"
            }}>+</button>
          </div>
          {tk.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 0", color: C.muted, fontSize: 14 }}>
              TK-Schrank ist leer. Einfach eingeben was drin ist.
            </div>
          )}
          {tk.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid " + C.border }}>
              <div style={{ fontSize: 18 }}>❄️</div>
              <div style={{ flex: 1, fontSize: 15 }}>{item.name}</div>
              <button onClick={() => { setTk(prev => prev.filter(x => x.id !== item.id)); addMemory("TK: " + item.name + " entfernt"); }}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>x</button>
            </div>
          ))}
        </div>
      )}

      {/* VORRAT */}
      {tab === "vorrat" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={newVorrat} onChange={e => setNewVorrat(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newVorrat.trim()) {
                setVorrat(prev => [...prev, { id: Date.now(), name: newVorrat.trim() }]);
                addMemory("Vorrat: " + newVorrat.trim() + " hinzugefuegt");
                setNewVorrat("");
              }}}
              placeholder="z.B. Nudeln, Reis, Tomaten..."
              style={{ flex: 1, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none" }} />
            <button onClick={() => { if (newVorrat.trim()) { setVorrat(prev => [...prev, { id: Date.now(), name: newVorrat.trim() }]); setNewVorrat(""); }}} style={{
              background: C.accent, border: "none", borderRadius: 12, padding: "11px 16px", color: "#fff", fontSize: 16, cursor: "pointer"
            }}>+</button>
          </div>
          {vorrat.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 0", color: C.muted, fontSize: 14 }}>
              Vorrat ist leer. Was hast du zu Hause?
            </div>
          )}
          {vorrat.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid " + C.border }}>
              <div style={{ fontSize: 18 }}>🥫</div>
              <div style={{ flex: 1, fontSize: 15 }}>{item.name}</div>
              <button onClick={() => { setVorrat(prev => prev.filter(x => x.id !== item.id)); addMemory("Vorrat: " + item.name + " entfernt"); }}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>x</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------
//  FOOD SCREEN
// -----------------------------------------------------------
function FoodScreen({ meal, setMeal, mode, addMemory }) {
  const [loading, setLoading]   = useState(false);
  const [shopping, setShopping] = useState(() => load("vos_shopping", []));
  const [newItem, setNewItem]   = useState("");
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => save("vos_shopping", shopping), [shopping]);

  async function generateMeal() {
    setLoading(true);
    try {
      const stressMap = { DARK_RED: "extrem hoch, max 10 Min", RED: "hoch, max 15 Min", YELLOW: "mittel, max 20 Min", GREEN: "normal, max 30 Min" };
      const reply = await askClaude(
        `Du bist Verenas Familien-Operator. Schlage 1 konkretes Abendessen vor.
Regeln:
- Laktosefrei (immer!)
- Kindertauglich (Hanna 12, Timo 10)
- Stress heute: ${stressMap[mode]}
- Einfach, wenige Zutaten
- Kein Experimentieren

Antworte in diesem Format:
🍽 [Gericht]
⏱ [X] Min
🥕 [Zutat 1], [Zutat 2], [Zutat 3]
💡 [1 kurzer Tipp]`,
        "Essen vorschlagen"
      );
      setMeal(reply);
      addMemory(`🍽 ${reply.split("\n")[0]}`);
    } catch {}
    setLoading(false);
  }

  async function generateShopping() {
    if (!meal) return;
    setGenLoading(true);
    try {
      const reply = await askClaude(
        `Erstelle eine Einkaufsliste fuer dieses Gericht. 
Nur die Zutaten die man KAUFEN muss (keine Grundgewuerze).
Antworte NUR mit einer Liste, ein Artikel pro Zeile, ohne Nummerierung.`,
        meal
      );
      const items = reply.split("\n").filter(l => l.trim()).map(l => ({
        id: Date.now() + Math.random(),
        name: l.trim(),
        done: false,
      }));
      setShopping(prev => [...prev, ...items]);
      addMemory(`🛒 Einkaufsliste generiert (${items.length} Artikel)`);
    } catch {}
    setGenLoading(false);
  }

  return (
    <div style={{ paddingTop: 28 }}>
      <h2 style={{ margin: "0 0 24px", fontSize: 28, fontWeight: 900, letterSpacing: -0.8 }}>Essen & Einkauf</h2>

      {/* Meal Section */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "18px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
          Heute Abend
        </div>
        {meal ? (
          <>
            <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-line", marginBottom: 14 }}>{meal}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setMeal(null)} style={{
                flex: 1, background: "transparent", border: `1px solid ${C.border}`,
                borderRadius: 12, padding: "10px", color: C.muted, fontSize: 13, cursor: "pointer"
              }}>Anders</button>
              <button onClick={generateShopping} disabled={genLoading} style={{
                flex: 2, background: C.sage, border: "none", borderRadius: 12,
                padding: "10px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer"
              }}>
                {genLoading ? "..." : "🛒 Einkaufliste erstellen"}
              </button>
            </div>
          </>
        ) : (
          <button onClick={generateMeal} disabled={loading} style={{
            width: "100%", padding: "16px", background: loading ? C.border : C.surface,
            border: `1px solid ${C.border}`, borderRadius: 14,
            color: loading ? C.muted : C.text, fontSize: 16, fontWeight: 600, cursor: "pointer"
          }}>
            {loading ? "KI denkt..." : "🍽 Essen vorschlagen"}
          </button>
        )}
      </div>

      {/* Shopping List */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "18px" }}>
        <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
          Einkaufsliste ({shopping.filter(s => !s.done).length} offen)
        </div>

        {/* Add item */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && newItem.trim()) {
              setShopping(prev => [...prev, { id: Date.now(), name: newItem.trim(), done: false }]);
              setNewItem("");
            }}}
            placeholder="Artikel hinzufuegen..."
            style={{
              flex: 1, background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none"
            }}
          />
        </div>

        {shopping.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 14 }}>
            Keine Artikel -- oben Essen generieren!
          </div>
        ) : (
          <>
            {shopping.filter(s => !s.done).map(s => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderBottom: `1px solid ${C.border}`
              }}>
                <button onClick={() => setShopping(prev => prev.map(x => x.id === s.id ? { ...x, done: true } : x))} style={{
                  width: 22, height: 22, borderRadius: 7, border: `2px solid ${C.border}`,
                  background: "transparent", cursor: "pointer", flexShrink: 0
                }} />
                <div style={{ flex: 1, fontSize: 14 }}>{s.name}</div>
                <button onClick={() => setShopping(prev => prev.filter(x => x.id !== s.id))} style={{
                  background: "none", border: "none", color: C.muted, cursor: "pointer"
                }}>✕</button>
              </div>
            ))}
            {shopping.some(s => s.done) && (
              <button onClick={() => setShopping(prev => prev.filter(s => !s.done))} style={{
                marginTop: 12, background: "transparent", border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "8px 14px", color: C.muted, fontSize: 13, cursor: "pointer"
              }}>
                ✓ Erledigte loeschen
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------
//  VOICE SCREEN -- KI-Kommandozentrale
// -----------------------------------------------------------
function VoiceScreen({ mode, setMode, tasks, setTasks, meal, setMeal, addMemory, setWarning }) {
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: "Bereit. Sag mir was du brauchst.\n\nBeispiele:\n- Milch leer\n- Heute schlimm\n- Was jetzt?\n- Lehrer anrufen\n- Ueberfordert"
  }]);
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const SYSTEM = `Du bist Verenas Familien-Operator. Aktueller Modus: ${mode}.

Aufgaben offen: ${tasks.filter(t => !t.done).map(t => t.text).join(", ") || "keine"}
Essen heute: ${meal?.split("\n")[0] || "noch nicht geplant"}

Regeln:
- Antworte KURZ, KLAR, FUeHREND (max 3 Saetze)
- Keine Rueckfragen wenn moeglich
- Wenn Nutzer "ueberfordert" oder "heute schlimm" sagt - schlage Modus-Wechsel zu RED vor
- Wenn "was jetzt?" - nenne NUR die 1 wichtigste Aufgabe
- Wenn Artikel leer (z.B. "Milch leer") - bestaetige und merke es
- Kein Smalltalk
- Deutsch

Spezielle Aktionen (im Format [AKTION]):
- [MODUS:RED] wenn du Modus wechseln empfiehlst
- [AUFGABE:text] wenn du eine neue Aufgabe hinzufuegst`;

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const history = messages.slice(-6);
      const reply = await askClaude(SYSTEM, msg, history);

      // Parse actions
      let cleanReply = reply;
      if (reply.includes("[MODUS:RED]")) {
        setMode("RED");
        cleanReply = reply.replace("[MODUS:RED]", "").trim();
        addMemory("🔴 Modus auf RED gesetzt");
      }
      const taskMatch = reply.match(/\[AUFGABE:(.+?)\]/);
      if (taskMatch) {
        const t = { id: Date.now(), text: taskMatch[1], done: false, priority: "high", createdAt: Date.now() };
        setTasks(prev => [...prev, t]);
        cleanReply = cleanReply.replace(taskMatch[0], "").trim();
        addMemory(`+ ${taskMatch[1]}`);
      }

      setMessages(prev => [...prev, { role: "assistant", text: cleanReply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Verbindungsfehler." }]);
    }
    setLoading(false);
  }

  const QUICK = ["Was jetzt?", "Ueberfordert", "Heute schlimm", "Was essen wir?"];

  return (
    <div style={{ paddingTop: 28, display: "flex", flexDirection: "column", height: "calc(100dvh - 160px)" }}>
      <h2 style={{ margin: "0 0 20px", fontSize: 28, fontWeight: 900, letterSpacing: -0.8 }}>Frag mich</h2>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%",
              background: m.role === "user" ? C.accent : C.card,
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "12px 16px",
              fontSize: 15,
              lineHeight: 1.5,
              border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
              whiteSpace: "pre-wrap",
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "18px 18px 18px 4px", padding: "12px 16px", color: C.muted, fontSize: 15 }}>
              ...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick buttons */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10 }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} style={{
            flexShrink: 0,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: "7px 14px",
            color: C.text,
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}>{q}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Sag mir was..."
          style={{
            flex: 1,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "13px 16px",
            color: C.text,
            fontSize: 15,
            outline: "none",
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          background: input.trim() ? C.accent : C.border,
          border: "none",
          borderRadius: 14,
          padding: "13px 18px",
          color: "#fff",
          fontSize: 18,
          cursor: "pointer",
        }}>➤</button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
//  TERMINE SCREEN
// -----------------------------------------------------------
function TermineScreen({ addMemory, setWarning, tasks, setTasks }) {
  const [termine, setTermine] = useState(() => {
    try { const v = localStorage.getItem("vos_termine"); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [datum, setDatum] = useState("");
  const [time, setTime]   = useState("");
  const [note, setNote]   = useState("");

  useEffect(() => {
    try { localStorage.setItem("vos_termine", JSON.stringify(termine)); } catch {}
  }, [termine]);

  useEffect(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    termine.forEach(t => {
      const d = new Date(t.datum); d.setHours(0,0,0,0);
      const diff = Math.round((d - today) / 86400000);
      if (diff === 0) setWarning("Heute: " + t.title + (t.time ? " um " + t.time : ""));
      if (diff === 1) setWarning("Morgen: " + t.title);
    });
  }, [termine]);

  function addTermin() {
    if (!title.trim() || !datum) return;
    const t = { id: Date.now(), title: title.trim(), datum, time, note: note.trim() };
    setTermine(prev => [...prev, t].sort((a, b) => new Date(a.datum) - new Date(b.datum)));
    addMemory("Termin: " + title.trim() + " am " + formatDatum(datum));
    setTitle(""); setDatum(""); setTime(""); setNote("");
    setShowForm(false);
  }

  function formatDatum(d) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return day + "." + m + "." + y;
  }

  function daysUntil(d) {
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(d); target.setHours(0,0,0,0);
    return Math.round((target - today) / 86400000);
  }

  function badgeColor(diff) {
    if (diff < 0) return C.muted;
    if (diff === 0) return C.accent;
    if (diff <= 3) return C.gold;
    return C.sage;
  }

  function badgeLabel(diff) {
    if (diff < 0) return "vergangen";
    if (diff === 0) return "HEUTE";
    if (diff === 1) return "morgen";
    return "in " + diff + " Tagen";
  }

  const upcoming = termine.filter(t => daysUntil(t.datum) >= 0);
  const past = termine.filter(t => daysUntil(t.datum) < 0);

  return (
    <div style={{ paddingTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.8 }}>Termine</h2>
        <button onClick={() => setShowForm(s => !s)} style={{
          background: showForm ? C.border : C.accent, border: "none",
          borderRadius: 12, padding: "8px 16px", color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: "pointer"
        }}>{showForm ? "Abbrechen" : "+ Neu"}</button>
      </div>

      {showForm && (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 18, padding: 18, marginBottom: 20 }}>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titel (z.B. Arzt Timo)"
            style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "12px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)}
              style={{ flex: 2, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "12px", color: C.text, fontSize: 15, outline: "none" }} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              style={{ flex: 1, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "12px", color: C.text, fontSize: 15, outline: "none" }} />
          </div>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Notiz (optional)"
            style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
          <button onClick={addTermin} style={{
            width: "100%", background: C.accent, border: "none", borderRadius: 12,
            padding: "13px", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer"
          }}>Speichern</button>
        </div>
      )}

      {upcoming.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 15 }}>
          Keine Termine. Tippe "+ Neu".
        </div>
      )}

      {upcoming.map(t => {
        const diff = daysUntil(t.datum);
        return (
          <div key={t.id} style={{
            background: C.card, border: "1px solid " + (diff <= 1 ? C.accent + "60" : C.border),
            borderRadius: 18, padding: 16, marginBottom: 10,
            display: "flex", alignItems: "center", gap: 12
          }}>
            <div style={{
              background: badgeColor(diff), borderRadius: 10,
              padding: "6px 10px", fontSize: 11, fontWeight: 800,
              color: "#fff", flexShrink: 0, textAlign: "center", minWidth: 64
            }}>{badgeLabel(diff)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                {formatDatum(t.datum)}{t.time ? " - " + t.time + " Uhr" : ""}
              </div>
              {t.note && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t.note}</div>}
            </div>
            <button onClick={() => setTermine(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>x</button>
          </div>
        );
      })}

      {past.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, textTransform: "uppercase", margin: "20px 0 10px" }}>Vergangen</div>
          {past.slice(-3).reverse().map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid " + C.border, opacity: 0.4 }}>
              <div style={{ flex: 1, fontSize: 14, textDecoration: "line-through" }}>{t.title} - {formatDatum(t.datum)}</div>
              <button onClick={() => setTermine(prev => prev.filter(x => x.id !== t.id))}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>x</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------
//  MEMORY SCREEN -- Externes Gehirn
// -----------------------------------------------------------
function MemoryScreen({ memory, setMemory }) {
  return (
    <div style={{ paddingTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.8 }}>Gedaechtnis</h2>
        {memory.length > 0 && (
          <button onClick={() => setMemory([])} style={{
            background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "7px 12px", color: C.muted, fontSize: 13, cursor: "pointer"
          }}>Loeschen</button>
        )}
      </div>

      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
        Alles was passiert ist -- nichts geht verloren.
      </div>

      {memory.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 15 }}>
          Noch nichts gespeichert.
        </div>
      ) : (
        memory.map(m => (
          <div key={m.id} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: `1px solid ${C.border}`,
            gap: 16,
          }}>
            <div style={{ fontSize: 14, lineHeight: 1.4 }}>{m.text}</div>
            <div style={{ fontSize: 11, color: C.muted, flexShrink: 0, marginTop: 2 }}>{m.ts}</div>
          </div>
        ))
      )}
    </div>
  );
}

// -----------------------------------------------------------
//  BOTTOM NAV
// -----------------------------------------------------------
function BottomNav({ screen, setScreen }) {
  const items = [
    { id: "home",    label: "Home",    icon: "⌂" },
    { id: "tasks",   label: "Aufgaben",icon: "✓" },
    { id: "kueche",  label: "Kueche",  icon: "🧊" },
    { id: "voice",   label: "KI",      icon: "◎" },
    { id: "termine", label: "Termine", icon: "📅" },
  ];

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 480,
      background: C.surface,
      borderTop: `1px solid ${C.border}`,
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 8px)",
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => setScreen(item.id)} style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          padding: "12px 4px 8px",
          background: "transparent",
          border: "none",
          color: screen === item.id ? C.accent : C.muted,
          cursor: "pointer",
          fontSize: 0,
        }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ fontSize: 10, letterSpacing: 0.5 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
