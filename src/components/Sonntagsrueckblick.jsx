import { useState, useEffect } from "react";
import { askClaude } from "../lib/claude";
import { C, GS } from "../lib/theme";

// -----------------------------------------------------------
//  SONNTAGSRUECKBLICK
// -----------------------------------------------------------
export function Sonntagsrueckblick({ tasks, termine, addMemory }) {
  const [loading, setLoading] = useState(false);
  const [rueckblick, setRueckblick] = useState(() => {
    try { return localStorage.getItem("vos_rueckblick") || null; } catch { return null; }
  });
  const [datum, setDatum] = useState(() => {
    try { return localStorage.getItem("vos_rueckblick_datum") || null; } catch { return null; }
  });

  const istSonntag = new Date().getDay() === 0;

  // Automatisch generieren wenn Sonntag und noch kein Rueckblick heute
  useEffect(() => {
    if (istSonntag && !rueckblick) {
      generieren();
    }
  }, []);

  async function generieren() {
    setLoading(true);
    try {
      const erledigte = tasks.filter(t => t.done && t.doneAt);
      const offene = tasks.filter(t => !t.done);
      const dieseWoche = erledigte.filter(t => {
        const d = new Date(t.doneAt);
        const heute = new Date();
        return (heute - d) < 7 * 86400000;
      });

      const naechsteTermine = termine.filter(t => {
        const d = new Date(t.datum);
        const heute = new Date();
        return d > heute && (d - heute) < 14 * 86400000;
      });

      const reply = await askClaude(
        `Du bist Verenas Familien-Operator. Erstelle einen kurzen Wochenrueckblick.
Ton: warm, ehrlich, keine Schuld, realistisch.
Max 5 Saetze. Deutsch.
Format:
✅ Was gut lief diese Woche
⚠️ Was offen blieb (ohne Vorwurf)
📅 Wichtiges naechste Woche
💡 1 konkreter Tipp fuer die kommende Woche`,
        `Erledigte Aufgaben diese Woche: ${dieseWoche.map(t => t.text).join(", ") || "keine"}
Noch offen: ${offene.slice(0,5).map(t => t.text).join(", ") || "nichts"}
Naechste Termine: ${naechsteTermine.map(t => t.title + " am " + t.datum).join(", ") || "keine"}`
      );

      setRueckblick(reply);
      setDatum(new Date().toLocaleDateString("de-DE"));
      localStorage.setItem("vos_rueckblick", reply);
      localStorage.setItem("vos_rueckblick_datum", new Date().toLocaleDateString("de-DE"));
      addMemory("Sonntagsrueckblick generiert");
    } catch {}
    setLoading(false);
  }

  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: GS.radius, padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
            Wochenrueckblick
          </div>
          {datum && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{datum}</div>}
        </div>
        <button onClick={generieren} disabled={loading} style={{
          background: loading ? C.border : C.gold, border: "none",
          borderRadius: 12, padding: "8px 16px", color: loading ? C.muted : "#000",
          fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer"
        }}>
          {loading ? "..." : istSonntag ? "Jetzt generieren" : "Vorschau"}
        </button>
      </div>

      {!rueckblick && !loading && (
        <div style={{ fontSize: 14, color: C.muted, textAlign: "center", padding: "16px 0" }}>
          {istSonntag ? "Sonntag ist Rückblick-Tag. Lass uns schauen wie die Woche war." : "Jeden Sonntag generiert die KI deinen Wochenrückblick automatisch."}
        </div>
      )}

      {rueckblick && (
        <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-line", color: C.text }}>
          {rueckblick}
        </div>
      )}
    </div>
  );
}
