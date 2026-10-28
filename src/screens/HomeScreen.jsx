import { useState, useEffect, useRef } from "react";
import { Sonntagsrueckblick } from "../components/Sonntagsrueckblick";
import { askClaude, safeParseKI } from "../lib/claude";
import { beobachte } from "../lib/memory";
import { C, GS, KAT_SORT, PRIO, PRIO_SORT, WANN_SORT } from "../lib/theme";

// -----------------------------------------------------------
//  HOME SCREEN
// -----------------------------------------------------------
export function HomeScreen({ mode, mc, activeTasks, tasks, setTasks, meal, setMeal, warning, setWarning, addMemory, maxVisible, autopilot, autopilotLoading, runAutopilot, onPushAktivieren, termine }) {
  const [showOverblick, setShowOverblick] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [quickVal, setQuickVal] = useState("");
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const sortedTasks = tasks.filter(t => !t.done).sort((a, b) => {
    const pA = PRIO_SORT[a.prio || "p3"]; const pB = PRIO_SORT[b.prio || "p3"];
    if (pA !== pB) return pA - pB;
    const wA = WANN_SORT[a.wann || "irgendwann"]; const wB = WANN_SORT[b.wann || "irgendwann"];
    if (wA !== wB) return wA - wB;
    return KAT_SORT[a.kategorie || "sonstiges"] - KAT_SORT[b.kategorie || "sonstiges"];
  });

  const stressCards = (mode === "RED" || mode === "DARK_RED") ? sortedTasks.filter(t => t.prio === "p1" || t.prio === "p2") : sortedTasks;
  const cards = stressCards;
  const safeIndex = Math.min(cardIndex, Math.max(0, cards.length - 1));
  const currentCard = cards[safeIndex] || null;
  const prio = currentCard ? PRIO[currentCard.prio || "p3"] : null;

  useEffect(() => { if (safeIndex !== cardIndex) setCardIndex(safeIndex); }, [cards.length]);

  function erledigen() {
    if (!currentCard) return;
    setSwipeAnim("right");
    setTimeout(() => {
      setTasks(prev => prev.map(x => x.id === currentCard.id ? {...x, done: true, doneAt: Date.now()} : x));
      addMemory("erledigt: " + currentCard.text);
      beobachte("aufgabe_erledigt", {kategorie: currentCard.kategorie});
      setSwipeAnim(null);
    }, 220);
  }

  function ueberspringen() {
    if (!currentCard || cards.length <= 1) return;
    setSwipeAnim("left");
    setTimeout(() => {
      setCardIndex(i => (i + 1) % cards.length);
      setSwipeAnim(null);
    }, 220);
  }

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (!touchStartX.current) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 60 && dy < 100) { dx > 0 ? erledigen() : ueberspringen(); }
    touchStartX.current = null;
  }

  const naechsterTermin = (termine || []).find(t => {
    const d = new Date(t.datum); d.setHours(0,0,0,0);
    const h = new Date(); h.setHours(0,0,0,0);
    const diff = Math.round((d-h)/86400000);
    return diff >= 0 && diff <= 1;
  });

  // Wochenübersicht: naechste 7 Tage
  const wocheTermine = (termine || []).filter(t => {
    const d = new Date(t.datum); d.setHours(0,0,0,0);
    const h = new Date(); h.setHours(0,0,0,0);
    const diff = Math.round((d-h)/86400000);
    return diff >= 0 && diff <= 7;
  }).slice(0, 4);

  return (
    <div style={{ paddingTop: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: C.muted }}>{new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1.2, margin: "4px 0 0", color: mode === "DARK_RED" ? C.danger : C.text }}>
            {mode === "DARK_RED" ? "Nur das Noetigste." : mode === "RED" ? "Ich uebernehme." : mode === "YELLOW" ? "Fokus." : "Guten Morgen."}
          </h1>
        </div>
        <button onClick={() => setShowOverblick(o => !o)} style={{
          background: showOverblick ? C.accent : C.surface, border: "1px solid " + (showOverblick ? C.accent : C.border),
          borderRadius: 12, padding: "8px 14px", color: showOverblick ? "#fff" : C.muted,
          fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4, flexShrink: 0,
        }}>{showOverblick ? "x Schliessen" : "Ueberblick"}</button>
      </div>

      {/* Warnung */}
      {warning && (
        <div style={{ background: C.accent + "18", border: "1px solid " + C.accent + "44", borderRadius: 14, padding: "12px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, color: C.accent }}>{warning}</div>
          <button onClick={() => setWarning(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer" }}>x</button>
        </div>
      )}

      {/* Termin heute/morgen */}
      {naechsterTermin && !showOverblick && (
        <div style={{ background: C.gold + "15", border: "1px solid " + C.gold + "40", borderRadius: 14, padding: "10px 16px", marginBottom: 14, fontSize: 14, color: C.gold }}>
          Termin: {naechsterTermin.title}{naechsterTermin.time ? " um " + naechsterTermin.time : ""}
        </div>
      )}

      {/* Wochenübersicht — naechste 7 Tage kompakt */}
      {wocheTermine.length > 0 && !showOverblick && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 4 }}>
          {wocheTermine.map(t => {
            const d = new Date(t.datum); d.setHours(0,0,0,0);
            const h = new Date(); h.setHours(0,0,0,0);
            const diff = Math.round((d-h)/86400000);
            return (
              <div key={t.id} style={{
                flexShrink: 0, background: C.card, border: "1px solid " + (diff === 0 ? C.accent + "60" : C.border),
                borderRadius: 10, padding: "8px 12px", minWidth: 100
              }}>
                <div style={{ fontSize: 10, color: diff === 0 ? C.accent : C.gold, fontWeight: 800, textTransform: "uppercase", marginBottom: 3 }}>
                  {diff === 0 ? "HEUTE" : diff === 1 ? "MORGEN" : d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric" })}
                </div>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 600, lineHeight: 1.3 }}>
                  {t.title.length > 22 ? t.title.slice(0, 22) + "…" : t.title}
                </div>
                {t.time && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t.time}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* UEBERBLICK */}
      {showOverblick && (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: GS.radius, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={quickVal} onChange={e => setQuickVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && quickVal.trim()) {
                setTasks(prev => [...prev, { id: Date.now(), text: quickVal.trim(), wann: "diese-woche", prio: "p3", priority: "normal", done: false, createdAt: Date.now() }]);
                addMemory("+ " + quickVal.trim()); setQuickVal("");
              }}}
              placeholder="+ Neue Aufgabe..."
              style={{ flex: 1, background: C.surface, border: "1px solid " + C.border, borderRadius: GS.radiusSm, padding: "10px 14px", color: C.text, fontSize: 15, outline: "none" }} />
            <button onClick={() => { if (quickVal.trim()) { setTasks(prev => [...prev, { id: Date.now(), text: quickVal.trim(), wann: "diese-woche", prio: "p3", priority: "normal", done: false, createdAt: Date.now() }]); setQuickVal(""); }}}
              style={{ background: C.accent, border: "none", borderRadius: GS.radiusSm, padding: "10px 16px", color: "#fff", fontSize: 18, cursor: "pointer" }}>+</button>
          </div>
          <AutoPrioButton tasks={tasks} setTasks={setTasks} addMemory={addMemory} />
          <div style={{ marginTop: 12 }}>
            {sortedTasks.map((t, i) => {
              const p = PRIO[t.prio || "p3"];
              return (
                <div key={t.id} onClick={() => setEditTask({...t})} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < sortedTasks.length-1 ? "1px solid " + C.border : "none", cursor: "pointer" }}>
                  <button onClick={e => { e.stopPropagation(); setTasks(prev => prev.map(x => x.id === t.id ? {...x, done: true, doneAt: Date.now()} : x)); addMemory("erledigt: " + t.text); }} style={{ width: 24, height: 24, borderRadius: 7, border: "2px solid " + p.color, background: "transparent", cursor: "pointer", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: p.color, background: p.bg, padding: "1px 6px", borderRadius: 5, flexShrink: 0 }}>{p.label}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>{t.text}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{t.wann === "heute" ? "Heute" : t.wann === "diese-woche" ? "Woche" : t.wann === "diesen-monat" ? "Monat" : "Spaeter"}{t.kategorie && t.kategorie !== "sonstiges" ? " - " + t.kategorie : ""}</div>
                  </div>
                </div>
              );
            })}
            {tasks.filter(t => t.done).slice(0,5).map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", opacity: 0.4 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: C.sage, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}>ok</div>
                <div style={{ flex: 1, fontSize: 13, textDecoration: "line-through" }}>{t.text}</div>
                <button onClick={() => setTasks(prev => prev.map(x => x.id === t.id ? {...x, done: false, doneAt: null} : x))} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 6, padding: "2px 8px", color: C.muted, fontSize: 11, cursor: "pointer" }}>zurueck</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARD SWIPE */}
      {!showOverblick && (
        <>
          {currentCard ? (
            <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{
              background: C.card, border: "1px solid " + prio.color + "50",
              borderRadius: 22, padding: "24px 20px", marginBottom: 16,
              transform: swipeAnim === "right" ? "translateX(110%) rotate(5deg)" : swipeAnim === "left" ? "translateX(-110%) rotate(-5deg)" : "translateX(0)",
              opacity: swipeAnim ? 0 : 1,
              transition: "transform 0.22s ease, opacity 0.22s ease",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: prio.color, background: prio.bg, padding: "3px 10px", borderRadius: 8 }}>{prio.label}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{safeIndex + 1} / {cards.length}</span>
              </div>
              <div style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.3, marginBottom: 6, color: C.text }}>{currentCard.text}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 26 }}>
                {currentCard.wann === "heute" ? "Heute" : currentCard.wann === "diese-woche" ? "Diese Woche" : currentCard.wann === "diesen-monat" ? "Diesen Monat" : "Irgendwann"}
                {currentCard.kategorie && currentCard.kategorie !== "sonstiges" ? " - " + currentCard.kategorie : ""}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={ueberspringen} style={{ flex: 1, padding: "15px", background: "transparent", border: "1px solid " + C.border, borderRadius: GS.radius, color: C.muted, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Spaeter</button>
                <button onClick={erledigen} style={{ flex: 2, padding: "15px", background: C.accent, border: "none", borderRadius: GS.radius, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Erledigt</button>
              </div>
              <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.muted }}>Wischen: rechts = erledigt, links = spaeter</div>
            </div>
          ) : (
            <div style={{ background: C.card, border: "1px solid " + C.sage + "40", borderRadius: 22, padding: "32px 20px", marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>Alles erledigt!</div>
              <div style={{ fontSize: 15, color: C.sage, fontWeight: 700 }}>Gut gemacht.</div>
            </div>
          )}

          <KarteMitToggle id="essen" label="Essen">
            <MealCard meal={meal} setMeal={setMeal} mode={mode} addMemory={addMemory} />
          </KarteMitToggle>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <StatPill label="Heute erledigt" value={tasks.filter(t => t.done && isToday(t.doneAt)).length} />
            <StatPill label="Noch offen" value={sortedTasks.length} />
          </div>
        </>
      )}

      {/* Autopilot */}
      {autopilot && !autopilotLoading && !showOverblick && (
        <KarteMitToggle id="autopilot" label="Autopilot">
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "12px 16px", marginBottom: 0 }}>
            {autopilot.offline ? (
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>📵 KI offline — Tagesplan nicht verfuegbar.</div>
            ) : (
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{autopilot.begruendung}</div>
            )}
            <button onClick={() => { localStorage.removeItem("vos_autopilot_date"); localStorage.removeItem("vos_autopilot_result"); setAutopilot(null); runAutopilot(); }} style={{ marginTop: 8, background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "4px 10px", color: C.muted, fontSize: 11, cursor: "pointer" }}>Neu planen</button>
          </div>
        </KarteMitToggle>
      )}

      <Sonntagsrueckblick tasks={tasks} termine={termine || []} addMemory={addMemory} />

      {typeof Notification !== "undefined" && Notification.permission === "default" && (
        <button onClick={onPushAktivieren} style={{ width: "100%", padding: "13px", background: "transparent", border: "1px solid " + C.gold + "60", borderRadius: GS.radius, color: C.gold, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}>Terminerinnerungen aktivieren</button>
      )}

      {editTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9998, display: "flex", alignItems: "flex-end" }} onClick={() => setEditTask(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480, margin: "0 auto" }}>
            <input value={editTask.text} onChange={e => setEditTask(p => ({...p, text: e.target.value}))}
              style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "13px", color: C.text, fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Prioritaet</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {Object.entries(PRIO).map(([key, p]) => (
                <button key={key} onClick={() => setEditTask(prev => ({...prev, prio: key}))} style={{ flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer", border: "2px solid " + (editTask.prio === key ? p.color : C.border), background: editTask.prio === key ? p.bg : "transparent", color: editTask.prio === key ? p.color : C.muted, fontWeight: 800, fontSize: 15 }}>{p.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Wann</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {[{id:"heute",l:"Heute"},{id:"diese-woche",l:"Diese Woche"},{id:"diesen-monat",l:"Diesen Monat"},{id:"irgendwann",l:"Irgendwann"}].map(w => (
                <button key={w.id} onClick={() => setEditTask(p => ({...p, wann: w.id}))} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", border: "1px solid " + (editTask.wann === w.id ? C.accent : C.border), background: editTask.wann === w.id ? C.accent + "20" : "transparent", color: editTask.wann === w.id ? C.accent : C.muted, fontWeight: editTask.wann === w.id ? 700 : 400 }}>{w.l}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setTasks(prev => prev.filter(x => x.id !== editTask.id)); setEditTask(null); }} style={{ flex: 1, padding: "13px", background: "transparent", border: "1px solid " + C.border, borderRadius: 12, color: C.muted, fontSize: 14, cursor: "pointer" }}>Loeschen</button>
              <button onClick={() => { setTasks(prev => prev.map(x => x.id === editTask.id ? {...x, ...editTask} : x)); addMemory("bearbeitet: " + editTask.text); setEditTask(null); }} style={{ flex: 2, padding: "13px", background: C.accent, border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function MealCard({ meal, setMeal, mode, addMemory }) {
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
          <button onClick={() => { beobachte("essen_abgelehnt"); setMeal(null); }} style={{
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

export function AutoPrioButton({ tasks, setTasks, addMemory }) {
  const [loading, setLoading] = useState(false);
  async function autoPrio() {
    const offen = tasks.filter(t => !t.done);
    if (offen.length === 0) return;
    setLoading(true);
    try {
      const liste = offen.map((t, i) => (i+1) + ". [" + (t.wann||"irgendwann") + "][" + (t.kategorie||"sonstiges") + "] " + t.text).join("\n");
      const reply = await askClaude(
        "Du bist Verenas Familien-Operator. Priorisiere diese Aufgaben mit P1/P2/P3. P1=dringend/Gesundheit/Fristen, P2=diese Woche wichtig, P3=irgendwann. Antworte NUR als JSON-Array: [{\"nr\":1,\"prio\":\"p1\"},...]",
        liste
      );
      const clean = reply.replace(/```json|```/g, "").trim();
      const prioMap = safeParseKI(reply);
      if (!prioMap) return; // KI offline — Prios bleiben unveraendert
      setTasks(prev => {
        const updated = [...prev];
        prioMap.forEach(item => {
          const aufgabe = offen[item.nr - 1];
          if (aufgabe) {
            const idx = updated.findIndex(t => t.id === aufgabe.id);
            if (idx !== -1) updated[idx] = { ...updated[idx], prio: item.prio };
          }
        });
        return updated;
      });
      addMemory("KI priorisiert: " + offen.length + " Aufgaben");
    } catch(e) { console.error(e); }
    setLoading(false);
  }
  return (
    <button onClick={autoPrio} disabled={loading} style={{
      background: "transparent", border: "1px solid " + C.gold + "60",
      borderRadius: 20, padding: "6px 14px", color: loading ? C.muted : C.gold,
      fontSize: 12, fontWeight: 600, cursor: loading ? "default" : "pointer", marginBottom: 8,
    }}>{loading ? "KI priorisiert..." : "Auto P1/P2/P3"}</button>
  );
}

// Versteckbare Karte mit Tipp-Toggle
export function KarteMitToggle({ id, label, children }) {
  const key = "vos_karte_" + id;
  const [sichtbar, setSichtbar] = useState(() => {
    try { return localStorage.getItem(key) !== "hidden"; } catch { return true; }
  });
  function toggle() {
    const neu = !sichtbar;
    setSichtbar(neu);
    try { localStorage.setItem(key, neu ? "visible" : "hidden"); } catch {}
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: sichtbar ? 4 : 0 }}>
        <button onClick={toggle} style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", padding: "2px 6px" }}>
          {sichtbar ? "▲ " + label : "▼ " + label + " anzeigen"}
        </button>
      </div>
      {sichtbar && children}
    </div>
  );
}

export function StatPill({ label, value }) {
  return (
    <div style={{
      flex: 1, background: C.surface, border: "1px solid " + C.border,
      borderRadius: GS.radius, padding: "16px 12px", textAlign: "center",
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 3, fontWeight: 500 }}>{label}</div>
    </div>
  );
}
