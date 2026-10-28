import { useState, useEffect } from "react";
import { C, GS } from "../lib/theme";

// -----------------------------------------------------------
//  KLAMMERN SYSTEM — Belohnungspunkte
// -----------------------------------------------------------
export function KlammernSystem({ aktiv, kind }) {
  const [punkte, setPunkte] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vos_klammern") || '{"hanna":0,"timo":0}'); } catch { return {hanna:0,timo:0}; }
  });

  const EINZEL_ZIEL  = 10;  // 10 Klammern = 30 Min Bildschirmzeit
  const GESAMT_ZIEL1 = 40;  // 40 zusammen = Filmabend
  const GESAMT_ZIEL2 = 70;  // 70 zusammen = Familienausflug

  function aendern(delta) {
    setPunkte(prev => {
      const neu = { ...prev, [aktiv]: Math.max(0, (prev[aktiv] || 0) + delta) };
      try { localStorage.setItem("vos_klammern", JSON.stringify(neu)); } catch {}
      return neu;
    });
  }

  const eigene   = punkte[aktiv] || 0;
  const gesamt   = (punkte.hanna || 0) + (punkte.timo || 0);
  const prozent  = Math.min(100, (eigene / EINZEL_ZIEL) * 100);
  const gProzent = Math.min(100, (gesamt / GESAMT_ZIEL2) * 100);

  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: GS.radius, padding: 18, marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>
        🪢 Wäscheklammern
      </div>

      {/* Eigene Punkte */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <button onClick={() => aendern(-1)} style={{
          width: 44, height: 44, borderRadius: 22, background: C.surface,
          border: "1px solid " + C.border, color: C.text, fontSize: 22, cursor: "pointer"
        }}>−</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{kind.name}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: eigene >= EINZEL_ZIEL ? C.gold : C.text }}>
              {eigene} / {EINZEL_ZIEL} 🪢
            </span>
          </div>
          <div style={{ height: 8, background: C.surface, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: prozent + "%", background: eigene >= EINZEL_ZIEL ? C.gold : C.accent, borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          {eigene >= EINZEL_ZIEL && (
            <div style={{ fontSize: 12, color: C.gold, marginTop: 6, fontWeight: 700 }}>🎉 30 Min Bildschirmzeit verdient!</div>
          )}
        </div>
        <button onClick={() => aendern(1)} style={{
          width: 44, height: 44, borderRadius: 22, background: C.accent,
          border: "none", color: "#fff", fontSize: 22, cursor: "pointer", fontWeight: 700
        }}>+</button>
      </div>

      {/* Gemeinsam */}
      <div style={{ borderTop: "1px solid " + C.border, paddingTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Zusammen</span>
          <span style={{ fontSize: 13, color: C.muted }}>{gesamt} Klammern</span>
        </div>
        <div style={{ height: 6, background: C.surface, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", width: gProzent + "%", background: C.sage, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, padding: "8px", background: gesamt >= GESAMT_ZIEL1 ? C.sage + "30" : C.surface, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted }}>Filmabend</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: gesamt >= GESAMT_ZIEL1 ? C.sage : C.muted }}>{GESAMT_ZIEL1} 🎬</div>
          </div>
          <div style={{ flex: 1, padding: "8px", background: gesamt >= GESAMT_ZIEL2 ? C.gold + "30" : C.surface, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted }}>Ausflug</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: gesamt >= GESAMT_ZIEL2 ? C.gold : C.muted }}>{GESAMT_ZIEL2} 🎡</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
//  KINDER SCREEN — Hanna & Timo
// -----------------------------------------------------------
export function KinderScreen({ addMemory, setWarning, termine, setTermine, setScreen }) {
  const [aktiv, setAktiv] = useState("hanna");
  const [medikamente, setMedikamente] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vos_medikamente") || "{}"); } catch { return {}; }
  });
  const [notizen, setNotizen] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vos_kindnotizen") || "{}"); } catch { return {}; }
  });
  const [showMedForm, setShowMedForm] = useState(false);
  const [showTerminForm, setShowTerminForm] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDosis, setMedDosis] = useState("");
  const [medZeit, setMedZeit] = useState("");
  const [terminTitel, setTerminTitel] = useState("");
  const [terminDatum, setTerminDatum] = useState("");
  const [terminZeit, setTerminZeit] = useState("");
  const [notiz, setNotiz] = useState(() => notizen[aktiv] || "");

  useEffect(() => {
    try { localStorage.setItem("vos_medikamente", JSON.stringify(medikamente)); } catch {}
  }, [medikamente]);

  useEffect(() => {
    try { localStorage.setItem("vos_kindnotizen", JSON.stringify(notizen)); } catch {}
  }, [notizen]);

  useEffect(() => {
    setNotiz(notizen[aktiv] || "");
  }, [aktiv]);

  const KINDER = [
    { id: "hanna", name: "Hanna", alter: "12 Jahre", emoji: "👩" },
    { id: "timo",  name: "Timo",  alter: "10 Jahre", emoji: "👦" },
  ];

  const kind = KINDER.find(k => k.id === aktiv);
  const kindMeds = medikamente[aktiv] || [];
  const kindTermine = termine.filter(t =>
    t.title.toLowerCase().includes(aktiv) ||
    (t.note && t.note.toLowerCase().includes(aktiv))
  );

  function addMedikament() {
    if (!medName.trim()) return;
    const med = { id: Date.now(), name: medName.trim(), dosis: medDosis.trim(), zeit: medZeit.trim() };
    setMedikamente(prev => ({ ...prev, [aktiv]: [...(prev[aktiv] || []), med] }));
    addMemory("Medikament " + kind.name + ": " + medName.trim());
    setMedName(""); setMedDosis(""); setMedZeit("");
    setShowMedForm(false);
  }

  function addTermin() {
    if (!terminTitel.trim() || !terminDatum) return;
    const t = {
      id: Date.now(),
      title: terminTitel.trim() + " (" + kind.name + ")",
      datum: terminDatum,
      time: terminZeit,
      note: "Fuer " + kind.name,
    };
    setTermine(prev => [...prev, t].sort((a, b) => new Date(a.datum) - new Date(b.datum)));
    addMemory("Termin " + kind.name + ": " + terminTitel.trim());
    setTerminTitel(""); setTerminDatum(""); setTerminZeit("");
    setShowTerminForm(false);
  }

  function daysUntil(d) {
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(d); target.setHours(0,0,0,0);
    return Math.round((target - today) / 86400000);
  }

  function formatDatum(d) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return day + "." + m + "." + y;
  }

  const inputStyle = {
    width: "100%", background: C.surface, border: "1px solid " + C.border,
    borderRadius: GS.radiusSm, padding: "13px", color: C.text,
    fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 8
  };

  return (
    <div style={{ paddingTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -1.2 }}>Kinder</h2>
        <button onClick={() => setScreen("termine")} style={{
          background: "transparent", border: "1px solid " + C.border,
          borderRadius: 20, padding: "7px 14px", color: C.muted, fontSize: 13, cursor: "pointer"
        }}>📅 Alle Termine</button>
      </div>

      {/* Kind-Auswahl */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {KINDER.map(k => (
          <button key={k.id} onClick={() => setAktiv(k.id)} style={{
            flex: 1, padding: "16px 12px", borderRadius: GS.radius,
            border: "1px solid " + (aktiv === k.id ? C.accent + "60" : C.border),
            background: aktiv === k.id ? C.card : "transparent",
            cursor: "pointer", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{k.emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{k.name}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{k.alter}</div>
          </button>
        ))}
      </div>

      {/* Medikamente */}
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: GS.radius, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
            Medikamente
          </div>
          <button onClick={() => setShowMedForm(s => !s)} style={{
            background: showMedForm ? C.border : C.accent, border: "none",
            borderRadius: 10, padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>{showMedForm ? "Abbrechen" : "+ Neu"}</button>
        </div>

        {showMedForm && (
          <div style={{ marginBottom: 14 }}>
            <input value={medName} onChange={e => setMedName(e.target.value)}
              placeholder="Medikament (z.B. Ibuprofen)" style={inputStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={medDosis} onChange={e => setMedDosis(e.target.value)}
                placeholder="Dosis (z.B. 400mg)" style={{ ...inputStyle, flex: 1 }} />
              <input value={medZeit} onChange={e => setMedZeit(e.target.value)}
                placeholder="Wann?" style={{ ...inputStyle, flex: 1 }} />
            </div>
            <button onClick={addMedikament} style={{
              width: "100%", padding: "13px", background: C.accent, border: "none",
              borderRadius: GS.radiusSm, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer"
            }}>Speichern</button>
          </div>
        )}

        {kindMeds.length === 0 ? (
          <div style={{ fontSize: 14, color: C.muted, textAlign: "center", padding: "12px 0" }}>
            Keine Medikamente eingetragen.
          </div>
        ) : (
          kindMeds.map(med => (
            <div key={med.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 0", borderBottom: "1px solid " + C.border
            }}>
              <div style={{ fontSize: 20 }}>💊</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{med.name}</div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  {med.dosis}{med.zeit ? " — " + med.zeit : ""}
                </div>
              </div>
              <button onClick={() => setMedikamente(prev => ({
                ...prev, [aktiv]: prev[aktiv].filter(m => m.id !== med.id)
              }))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>x</button>
            </div>
          ))
        )}
      </div>

      {/* Termine fuer dieses Kind */}
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: GS.radius, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
            Termine
          </div>
          <button onClick={() => setShowTerminForm(s => !s)} style={{
            background: showTerminForm ? C.border : C.sage, border: "none",
            borderRadius: 10, padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>{showTerminForm ? "Abbrechen" : "+ Termin"}</button>
        </div>

        {showTerminForm && (
          <div style={{ marginBottom: 14 }}>
            <input value={terminTitel} onChange={e => setTerminTitel(e.target.value)}
              placeholder={"Termin fuer " + kind.name} style={inputStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" value={terminDatum} onChange={e => setTerminDatum(e.target.value)}
                style={{ ...inputStyle, flex: 2 }} />
              <input type="time" value={terminZeit} onChange={e => setTerminZeit(e.target.value)}
                style={{ ...inputStyle, flex: 1 }} />
            </div>
            <button onClick={addTermin} style={{
              width: "100%", padding: "13px", background: C.sage, border: "none",
              borderRadius: GS.radiusSm, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer"
            }}>Speichern</button>
          </div>
        )}

        {kindTermine.length === 0 ? (
          <div style={{ fontSize: 14, color: C.muted, textAlign: "center", padding: "12px 0" }}>
            Keine Termine fuer {kind.name}.
          </div>
        ) : (
          kindTermine.filter(t => daysUntil(t.datum) >= 0).map(t => {
            const diff = daysUntil(t.datum);
            return (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 0", borderBottom: "1px solid " + C.border
              }}>
                <div style={{
                  background: diff === 0 ? C.accent : diff <= 3 ? C.gold : C.sage,
                  borderRadius: 8, padding: "4px 8px", fontSize: 10, fontWeight: 800,
                  color: "#fff", flexShrink: 0
                }}>
                  {diff === 0 ? "HEUTE" : diff === 1 ? "morgen" : "in " + diff + "d"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title.replace(" (" + kind.name + ")", "")}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{formatDatum(t.datum)}{t.time ? " " + t.time : ""}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Wäscheklammern-Punkte */}
      <KlammernSystem aktiv={aktiv} kind={kind} />

      {/* Notizen */}
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: GS.radius, padding: 18 }}>
        <div style={{ fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>
          Notizen zu {kind.name}
        </div>
        <textarea
          value={notiz}
          onChange={e => {
            setNotiz(e.target.value);
            setNotizen(prev => ({ ...prev, [aktiv]: e.target.value }));
          }}
          placeholder={"Allergien, Besonderheiten, Schularzt-Infos..."}
          rows={4}
          style={{
            width: "100%", background: C.surface, border: "1px solid " + C.border,
            borderRadius: GS.radiusSm, padding: "13px", color: C.text,
            fontSize: 15, outline: "none", resize: "none", boxSizing: "border-box",
            lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  );
}
