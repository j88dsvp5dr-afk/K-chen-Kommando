import { useState, useEffect } from "react";
import { C } from "../lib/theme";

// -----------------------------------------------------------
//  TERMINE SCREEN
// -----------------------------------------------------------
export function TermineScreen({ addMemory, setWarning, tasks, setTasks, termine, setTermine }) {
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
        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -1.2 }}>Termine</h2>
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
