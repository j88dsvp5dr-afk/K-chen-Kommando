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
export default function VerenaOS() {
  // -- State ----------------------------------------------
  const [mode, setMode]         = useState(() => load("vos_mode", "GREEN"));
  const [tasks, setTasks]       = useState(() => load("vos_tasks", []));
  const [meal, setMeal]         = useState(() => load("vos_meal", null));
  const [memory, setMemory]     = useState(() => load("vos_memory", []));
  const [screen, setScreen]     = useState("home"); // home | tasks | food | voice | memory
  const [warning, setWarning]   = useState(null);

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
      <div style={{
        padding: "16px 20px 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Verena OS
        </div>
        <ModeButton mode={mode} setMode={setMode} mc={mc} />
      </div>

      {/* -- Screen Content -- */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 100px" }}>
        {screen === "home"   && <HomeScreen mode={mode} mc={mc} activeTasks={activeTasks} tasks={tasks} setTasks={setTasks} meal={meal} setMeal={setMeal} warning={warning} setWarning={setWarning} addMemory={addMemory} maxVisible={maxVisible} />}
        {screen === "tasks"  && <TasksScreen tasks={tasks} setTasks={setTasks} mode={mode} maxVisible={maxVisible} addMemory={addMemory} />}
        {screen === "food"   && <FoodScreen meal={meal} setMeal={setMeal} mode={mode} addMemory={addMemory} />}
        {screen === "voice"  && <VoiceScreen mode={mode} setMode={setMode} tasks={tasks} setTasks={setTasks} meal={meal} setMeal={setMeal} addMemory={addMemory} setWarning={setWarning} />}
        {screen === "memory" && <MemoryScreen memory={memory} setMemory={setMemory} />}
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
function HomeScreen({ mode, mc, activeTasks, tasks, setTasks, meal, setMeal, warning, setWarning, addMemory, maxVisible }) {
  const isDark = mode === "DARK_RED";

  return (
    <div style={{ paddingTop: 28 }}>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
          {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 style={{
          fontSize: isDark ? 28 : 36,
          fontWeight: 900,
          lineHeight: 1.1,
          margin: 0,
          letterSpacing: -1,
          color: isDark ? C.danger : C.text,
        }}>
          {isDark ? "⚫ Nur das Noetigste." : mode === "RED" ? "Ich uebernehme jetzt." : mode === "YELLOW" ? "Fokus." : "Wie laeuft's?"}
        </h1>
      </div>

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
  const [tab, setTab]   = useState("open");
  const [val, setVal]   = useState("");
  const [note, setNote] = useState("");
  const [prio, setPrio] = useState("normal");
  const [generating, setGenerating] = useState(false);

  const open = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const hidden = open.length - maxVisible;

  function addTask() {
    if (!val.trim()) return;
    const t = { id: Date.now(), text: val.trim(), note: note.trim(), priority: prio, done: false, createdAt: Date.now() };
    setTasks(prev => [...prev, t]);
    addMemory(`+ ${val.trim()}`);
    setVal(""); setNote(""); setPrio("normal");
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
      const list = open.map((t, i) => `${i + 1}. ${t.text}`).join("\n");
      const reply = await askClaude(
        `Du bist Verenas Familien-Operator. Priorisiere diese Aufgabenliste. 
Regeln: max ${maxVisible} anzeigen, Kinder/Gesundheit zuerst, Haushalt minimal, Rest ignorieren.
Modus: ${mode}. 
Antworte NUR mit einer nummerierten Liste der TOP ${maxVisible} Aufgaben in Reihenfolge. Keine Erklaerung.`,
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
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: "16px",
        marginBottom: 20,
      }}>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()}
          placeholder="Neue Aufgabe..."
          style={{
            width: "100%",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "12px",
            color: C.text,
            fontSize: 15,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 8,
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {["normal", "high"].map(p => (
            <button key={p} onClick={() => setPrio(p)} style={{
              flex: 1,
              padding: "8px",
              borderRadius: 10,
              border: `1px solid ${prio === p ? C.accent : C.border}`,
              background: prio === p ? `${C.accent}20` : "transparent",
              color: prio === p ? C.accent : C.muted,
              fontSize: 13,
              cursor: "pointer",
            }}>
              {p === "high" ? "! Wichtig" : "Normal"}
            </button>
          ))}
          <button onClick={addTask} style={{
            flex: 2,
            padding: "8px 14px",
            borderRadius: 10,
            background: C.accent,
            border: "none",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}>
            + Hinzufuegen
          </button>
        </div>
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
  return (
    <div style={{
      background: isFirst ? C.card : "transparent",
      border: `1px solid ${isFirst ? C.accent + "40" : C.border}`,
      borderRadius: isFirst ? 18 : 12,
      padding: isFirst ? "16px" : "12px",
      marginBottom: 8,
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <button onClick={onDone} style={{
        width: isFirst ? 28 : 22,
        height: isFirst ? 28 : 22,
        borderRadius: isFirst ? 10 : 8,
        border: `2px solid ${isFirst ? C.accent : C.border}`,
        background: "transparent",
        cursor: "pointer",
        flexShrink: 0,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: isFirst ? 16 : 14, fontWeight: isFirst ? 600 : 400 }}>{task.text}</div>
        {task.note && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{task.note}</div>}
      </div>
      {task.priority === "high" && <div style={{ color: C.accent, fontWeight: 900, fontSize: 16 }}>!</div>}
      <button onClick={onDelete} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
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
    { id: "home",   label: "Home",     icon: "⌂" },
    { id: "tasks",  label: "Aufgaben", icon: "✓" },
    { id: "food",   label: "Essen",    icon: "🍽" },
    { id: "voice",  label: "KI",       icon: "◎" },
    { id: "memory", label: "Memory",   icon: "◈" },
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
