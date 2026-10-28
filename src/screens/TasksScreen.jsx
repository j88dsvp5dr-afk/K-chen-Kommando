import { useState } from "react";
import { askClaude } from "../lib/claude";
import { C, MODE_CONFIG } from "../lib/theme";

// -----------------------------------------------------------
//  TASKS SCREEN
// -----------------------------------------------------------
export function TasksScreen({ tasks, setTasks, mode, maxVisible, addMemory }) {
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
        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -1.2 }}>Aufgaben</h2>
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

export function TaskRow({ task, index, onDone, onDelete }) {
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
