import { useState, useEffect, useRef } from "react";
import { askClaude, safeParseKI } from "../lib/claude";
import { C } from "../lib/theme";
import { releaseWakeLock, requestWakeLock } from "../lib/wakeLock";

// -----------------------------------------------------------
//  KUECHE SCREEN — TK + Vorrat + Wochenplan + Einkauf
// -----------------------------------------------------------
export function KuecheScreen({ addMemory, mode, einkauf, setEinkauf, vorrat, setVorrat, tk, setTk }) {
  const wakeLockRef = useRef(null);
  useEffect(() => {
    // Wake Lock aktivieren wenn Einkaufsliste offen
    requestWakeLock(wakeLockRef);
    return () => releaseWakeLock(wakeLockRef);
  }, []);
  const [tab, setTab] = useState("woche");
  const [wochenplan, setWochenplan] = useState(() => { try { return JSON.parse(localStorage.getItem("vos_wochenplan") || "null"); } catch { return null; } });
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newVorrat, setNewVorrat] = useState("");

  useEffect(() => { try { localStorage.setItem("vos_wochenplan", JSON.stringify(wochenplan)); } catch {} }, [wochenplan]);

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
      const plan = safeParseKI(reply);
      if (!plan) {
        addMemory("Wochenplan: KI nicht erreichbar — bitte spaeter nochmal versuchen.");
        return;
      }
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
      <h2 style={{ margin: "0 0 20px", fontSize: 32, fontWeight: 900, letterSpacing: -1.2 }}>Kueche</h2>

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
                const n = newItem.trim();
                setEinkauf(prev => prev.some(x => x.name.toLowerCase() === n.toLowerCase()) ? prev : [...prev, { id: Date.now(), name: n, done: false }]);
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
              <button onClick={() => setVorrat(prev => prev.map(x => x.id === item.id ? {...x, leer: !x.leer} : x))}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 0 }}>
                {item.leer ? "🔴" : "🟢"}
              </button>
              <div style={{ flex: 1, fontSize: 15, textDecoration: item.leer ? "line-through" : "none", color: item.leer ? C.muted : C.text }}>{item.name}</div>
              {item.leer && (
                <button onClick={() => { setEinkauf(prev => [...prev, { id: Date.now(), name: item.name, done: false }]); setVorrat(prev => prev.map(x => x.id === item.id ? {...x, leer: false} : x)); addMemory("Einkauf: " + item.name + " hinzugefuegt"); }}
                  style={{ background: C.gold + "20", border: "1px solid " + C.gold + "40", borderRadius: 8, padding: "4px 8px", color: C.gold, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Einkauf</button>
              )}
              <button onClick={() => { setVorrat(prev => prev.filter(x => x.id !== item.id)); addMemory("Vorrat: " + item.name + " entfernt"); }}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>x</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
