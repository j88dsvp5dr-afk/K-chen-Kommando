import { useState, useEffect, useRef } from "react";
import { KI_ENDPOINT, KI_MODEL, askClaude } from "../lib/claude";
import { beobachte, kiMemoryAlsKontext } from "../lib/memory";
import { C } from "../lib/theme";

// -----------------------------------------------------------
//  VOICE SCREEN -- KI-Kommandozentrale
// -----------------------------------------------------------
export function VoiceScreen({ mode, setMode, tasks, setTasks, meal, setMeal, addMemory, setWarning, setScreen, setTermine, setEinkauf, setVorrat, setTk, chatHistory, setChatHistory }) {
  const [input, setInput] = useState("");
  const DEFAULT_MSG = { role: "assistant", text: "Bereit. Sag mir was du brauchst.\n- Milch leer\n- Termin eintragen\n- Was jetzt?\n- Vorrat: Nudeln hinzufuegen" };
  const [messages, setMessages] = useState(chatHistory.length > 0 ? chatHistory : [DEFAULT_MSG]);
  const [loading, setLoading] = useState(false);
  const bottomRef               = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const heute = new Date();
  const heuteDatum = heute.toISOString().split("T")[0];
  const wochentage = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
  const wochentag = wochentage[heute.getDay()];

  function datumBerechnen(beschreibung) {
    // Hilfsfunktion um relative Datumsangaben aufzuloesen
    const h = new Date();
    if (beschreibung.includes("morgen")) { h.setDate(h.getDate()+1); return h.toISOString().split("T")[0]; }
    if (beschreibung.includes("uebermorgen")) { h.setDate(h.getDate()+2); return h.toISOString().split("T")[0]; }
    return heuteDatum;
  }

  const kiLernprofil = kiMemoryAlsKontext();
  const SYSTEM = `Du bist Verenas Familien-Operator. Aktueller Modus: ${mode}.
Heutiges Datum: ${heuteDatum} (${wochentag})

Aufgaben offen: ${tasks.filter(t => !t.done).map(t => t.text).join(", ") || "keine"}${kiLernprofil}
Essen heute: ${meal?.split("\n")[0] || "noch nicht geplant"}

Regeln:
- Antworte KURZ, KLAR, FUeHREND (max 3 Saetze)
- Keine Rueckfragen wenn moeglich
- Wenn Nutzer "ueberfordert" oder "heute schlimm" sagt - schlage Modus-Wechsel zu RED vor und gib [MODUS:RED] aus
- Wenn "was jetzt?" - nenne NUR die 1 wichtigste Aufgabe
- Wenn Artikel leer (z.B. "Milch leer") - bestaetige und lege Einkaufsartikel an
- Kein Smalltalk
- Deutsch

ABSOLUT VERBOTEN:
- Sage NIEMALS "ich bin kein Experte", "ich bin kein Handwerker", "ich bin kein Arzt", "konsultiere einen Fachmann" oder aehnliches
- Verweigere KEINE Fragen — egal ob Handwerk, Gesundheit, Recht, Technik, Haushalt
- Sage NIEMALS "das kann ich nicht beantworten" oder "dafuer bin ich nicht zustaendig"
- Leite NIEMALS an andere KIs weiter

STATTDESSEN:
- Beantworte JEDE Frage direkt und praktisch — wie ein kluger Freund der alles weiss
- Bei Handwerk: erklaere konkret Schritt fuer Schritt was zu tun ist
- Bei Gesundheit: gib praktische Einschaetzung, nenne wann ein Arzt wirklich noetig ist
- Bei Technik: erklaere verstaendlich und loesungsorientiert
- Verena ist erwachsen und kann selbst entscheiden was sie mit der Information macht

WICHTIG bei Terminen: Berechne das Datum IMMER relativ zu heute (${heuteDatum}).
Beispiele:
- "naechsten Dienstag" = naechster Dienstag nach ${heuteDatum}
- "am 5. Juni" = 2026-06-05
- "in zwei Wochen" = ${new Date(heute.getTime() + 14*86400000).toISOString().split("T")[0]}
- "morgen" = ${new Date(heute.getTime() + 86400000).toISOString().split("T")[0]}

Spezielle Aktionen (im Format [AKTION]) - IMMER einfuegen wenn relevant:
- [MODUS:RED] wenn du Modus wechseln empfiehlst
- [AUFGABE:text] wenn du eine neue Aufgabe hinzufuegst
- [TERMIN:titel|datum|uhrzeit] IMMER wenn ein Datum/Termin erwaehnt wird
  datum MUSS als YYYY-MM-DD Format sein, uhrzeit als HH:MM oder leer lassen
  Beispiel: "Arzt Timo am 5. Juni um 10 Uhr" -> [TERMIN:Arzt Timo|2026-06-05|10:00]
  Beispiel: "Elternabend naechste Woche" -> [TERMIN:Elternabend|${new Date(heute.getTime() + 7*86400000).toISOString().split("T")[0]}|]
- [EINKAUF:artikel] IMMER wenn etwas fehlt oder gekauft werden soll
  Beispiel: "Milch leer" -> [EINKAUF:Milch]
- [VORRAT:artikel] wenn etwas in den Vorrat eingetragen werden soll
  Beispiel: "trag Nudeln in den Vorrat ein" -> [VORRAT:Nudeln]
- [TK:artikel] wenn etwas in den TK-Schrank eingetragen werden soll
  Beispiel: "trag Hackfleisch ins TK ein" -> [TK:Hackfleisch]

WICHTIG: Wenn der Nutzer mehrere Artikel nennt, gib MEHRERE Aktionen aus:
"trag Nudeln, Reis und Tomaten in den Vorrat" -> [VORRAT:Nudeln] [VORRAT:Reis] [VORRAT:Tomaten]`;

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => { const updated = [...prev, { role: "user", text: msg }]; setChatHistory(updated); return updated; });
    setLoading(true);

    try {
      const history = messages.slice(-6);
      const reply = await askClaude(SYSTEM, msg, history);

      // Parse actions
      let cleanReply = reply;
      if (reply.includes("[MODUS:RED]")) {
        setMode("RED");
        beobachte("modus_rot");
        cleanReply = reply.replace("[MODUS:RED]", "").trim();
        addMemory("Modus auf RED gesetzt");
      }
      const taskMatch = reply.match(/\[AUFGABE:(.+?)\]/);
      if (taskMatch) {
        const t = { id: Date.now(), text: taskMatch[1], done: false, priority: "high", wann: "diese-woche", kategorie: "sonstiges", createdAt: Date.now() };
        setTasks(prev => [...prev, t]);
        cleanReply = cleanReply.replace(taskMatch[0], "").trim();
        addMemory("+ " + taskMatch[1]);
      }

      // Termin-Erkennung
      const terminMatch = reply.match(/\[TERMIN:\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^\]]*?)\s*\]/);
      if (terminMatch) {
        const [, titel, datum, uhrzeit] = terminMatch;
        const neuerTermin = {
          id: Date.now() + 1,
          title: titel.trim(),
          datum: datum.trim() || new Date().toISOString().split("T")[0],
          time: uhrzeit.trim(),
          note: "Ueber KI eingetragen",
        };
        if (setTermine) {
          setTermine(prev => [...prev, neuerTermin].sort((a, b) => new Date(a.datum) - new Date(b.datum)));
        }
        addMemory("Termin: " + titel.trim() + (datum ? " am " + datum : ""));
        beobachte("termin_eingetragen", { titel: titel.trim() });
        setWarning("Termin gespeichert: " + titel.trim());
        cleanReply = cleanReply.replace(terminMatch[0], "").trim();
      }

      // Einkauf (alle Matches)
      const einkaufMatches = [...cleanReply.matchAll(/\[EINKAUF:\s*([^\]]+?)\s*\]/g)];
      einkaufMatches.forEach(m => {
        if (setEinkauf) setEinkauf(prev => [...prev, { id: Date.now() + Math.random(), name: m[1].trim(), done: false }]);
        addMemory("Einkauf: " + m[1].trim());
        cleanReply = cleanReply.replace(m[0], "").trim();
      });

      // Vorrat (alle Matches)
      const vorratMatches = [...cleanReply.matchAll(/\[VORRAT:\s*([^\]]+?)\s*\]/g)];
      vorratMatches.forEach(m => {
        if (setVorrat) setVorrat(prev => [...prev, { id: Date.now() + Math.random(), name: m[1].trim() }]);
        addMemory("Vorrat: " + m[1].trim());
        cleanReply = cleanReply.replace(m[0], "").trim();
      });

      // TK (alle Matches)
      const tkMatches = [...cleanReply.matchAll(/\[TK:\s*([^\]]+?)\s*\]/g)];
      tkMatches.forEach(m => {
        if (setTk) setTk(prev => [...prev, { id: Date.now() + Math.random(), name: m[1].trim() }]);
        addMemory("TK: " + m[1].trim());
        cleanReply = cleanReply.replace(m[0], "").trim();
      });

      const newMsg = { role: "assistant", text: cleanReply };
      setMessages(prev => { const updated = [...prev, newMsg]; setChatHistory(updated); return updated; });
    } catch {
      setMessages(prev => { const updated = [...prev, { role: "assistant", text: "Verbindungsfehler." }]; setChatHistory(updated); return updated; });
    }
    setLoading(false);
  }

  const QUICK = ["Was jetzt?", "Stress", "Essen?", "Hilfe"];
  const [bildLoading, setBildLoading] = useState(false);
  const bildInputRef = useRef();

  async function bildAnalysieren(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBildLoading(true);

    try {
      // Bild zu base64 konvertieren
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const mediaType = file.type || "image/jpeg";

      // Nachricht anzeigen
      const userMsg = { role: "user", text: "📷 Bild hochgeladen — analysiere..." };
      setMessages(prev => { const u = [...prev, userMsg]; setChatHistory(u); return u; });

      // An Claude senden mit Vision
      const res = await fetch(KI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: KI_MODEL,
          max_tokens: 1000,
          system: `Du bist Verenas Familien-Operator. Analysiere das Bild und extrahiere ALLE relevanten Informationen.

Heute: ${new Date().toISOString().split("T")[0]} (${["So","Mo","Di","Mi","Do","Fr","Sa"][new Date().getDay()]})

Erkenne automatisch was im Bild ist:
- Kalender/Termine -> gib [TERMIN:titel|datum|uhrzeit] fuer jeden Termin aus
- Einkaufsliste/Notizen -> gib [EINKAUF:artikel] fuer jeden Artikel
- Aufgabenliste -> gib [AUFGABE:text] fuer jede Aufgabe  
- Medikamente/Vorrat -> gib [VORRAT:artikel]

Antworte zuerst kurz was du siehst, dann die Aktionen.
Datum immer als YYYY-MM-DD. Jahreszahl 2026 wenn nicht anders erkennbar.`,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: "Was ist auf diesem Bild? Extrahiere alle Termine, Aufgaben und Einkaufsartikel." }
            ]
          }]
        })
      });

      const data = await res.json();
      const reply = data.content?.[0]?.text || "Konnte Bild nicht lesen.";

      // Aktionen parsen (gleiche Logik wie bei Text)
      let cleanReply = reply;

      // Termine
      const terminMatches = [...reply.matchAll(/\[TERMIN:\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^\]]*?)\s*\]/g)];
      terminMatches.forEach(m => {
        const neuerTermin = { id: Date.now() + Math.random(), title: m[1].trim(), datum: m[2].trim() || new Date().toISOString().split("T")[0], time: m[3].trim(), note: "Aus Bild erkannt" };
        if (setTermine) setTermine(prev => [...prev, neuerTermin].sort((a,b) => new Date(a.datum) - new Date(b.datum)));
        addMemory("Termin aus Bild: " + m[1].trim());
        cleanReply = cleanReply.replace(m[0], "").trim();
      });

      // Aufgaben
      const aufgabeMatches = [...reply.matchAll(/\[AUFGABE:\s*([^\]]+?)\s*\]/g)];
      aufgabeMatches.forEach(m => {
        setTasks(prev => [...prev, { id: Date.now() + Math.random(), text: m[1].trim(), wann: "diese-woche", kategorie: "sonstiges", priority: "normal", done: false, createdAt: Date.now() }]);
        addMemory("Aufgabe aus Bild: " + m[1].trim());
        cleanReply = cleanReply.replace(m[0], "").trim();
      });

      // Einkauf
      const einkaufMatches = [...reply.matchAll(/\[EINKAUF:\s*([^\]]+?)\s*\]/g)];
      einkaufMatches.forEach(m => {
        if (setEinkauf) setEinkauf(prev => [...prev, { id: Date.now() + Math.random(), name: m[1].trim(), done: false }]);
        addMemory("Einkauf aus Bild: " + m[1].trim());
        cleanReply = cleanReply.replace(m[0], "").trim();
      });

      // Vorrat
      const vorratMatches = [...reply.matchAll(/\[VORRAT:\s*([^\]]+?)\s*\]/g)];
      vorratMatches.forEach(m => {
        if (setVorrat) setVorrat(prev => [...prev, { id: Date.now() + Math.random(), name: m[1].trim() }]);
        cleanReply = cleanReply.replace(m[0], "").trim();
      });

      const summary = [
        terminMatches.length > 0 ? terminMatches.length + " Termin(e) eingetragen" : "",
        aufgabeMatches.length > 0 ? aufgabeMatches.length + " Aufgabe(n) hinzugefuegt" : "",
        einkaufMatches.length > 0 ? einkaufMatches.length + " Einkaufsartikel" : "",
        vorratMatches.length > 0 ? vorratMatches.length + " Vorratsartikel" : "",
      ].filter(Boolean).join(", ");

      const finalReply = cleanReply.trim() + (summary ? "\n\nEingetragen: " + summary : "");
      setMessages(prev => { const u = [...prev, { role: "assistant", text: finalReply }]; setChatHistory(u); return u; });

    } catch(err) {
      setMessages(prev => { const u = [...prev, { role: "assistant", text: "Fehler beim Lesen des Bildes." }]; setChatHistory(u); return u; });
    }
    setBildLoading(false);
    // Input zuruecksetzen
    if (bildInputRef.current) bildInputRef.current.value = "";
  }

  // -- Spracherkennung --
  const [hoert, setHoert] = useState(false);
  const recognitionRef = useRef(null);

  function startSprache() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Spracherkennung wird von diesem Browser nicht unterstuetzt. Bitte Safari auf iPhone nutzen.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setHoert(true);
    recognition.onend = () => setHoert(false);
    recognition.onerror = () => setHoert(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sprachEingabeAktiv.current = true;
      setInput(transcript);
      setTimeout(() => send(transcript), 100);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopSprache() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setHoert(false);
    }
  }


  return (
    <div style={{ paddingTop: 28, display: "flex", flexDirection: "column", height: "calc(100dvh - 160px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -1.2 }}>Frag mich</h2>

      </div>

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
              border: m.role === "assistant" ? "1px solid " + C.border : "none",
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingBottom: 10 }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} style={{
            flexShrink: 0, background: C.surface, border: "1px solid " + C.border,
            borderRadius: 20, padding: "7px 14px", color: C.text,
            fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
          }}>{q}</button>
        ))}
      </div>

      {/* Foto / Bild hochladen */}
      <label style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", padding: "13px", marginBottom: 10,
        background: bildLoading ? C.border : C.surface,
        border: "1px solid " + C.border, borderRadius: 16,
        color: bildLoading ? C.muted : C.text, fontWeight: 600,
        fontSize: 15, cursor: bildLoading ? "default" : "pointer",
        boxSizing: "border-box",
      }}>
        {bildLoading ? "KI liest Bild..." : "📷 Foto / Screenshot einlesen"}
        <input
          ref={bildInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={bildAnalysieren}
          disabled={bildLoading}
          style={{ display: "none" }}
        />
      </label>

      {/* Mikrofon-Knopf gross */}
      {!hoert ? (
        <button onClick={startSprache} style={{
          width: "100%", padding: "16px", marginBottom: 10,
          background: "linear-gradient(135deg, " + C.accent + " 0%, #c0392b 100%)",
          border: "none", borderRadius: 16, color: "#fff",
          fontWeight: 800, fontSize: 17, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          🎤 Sprechen
        </button>
      ) : (
        <button onClick={stopSprache} style={{
          width: "100%", padding: "16px", marginBottom: 10,
          background: C.accent, border: "none", borderRadius: 16, color: "#fff",
          fontWeight: 800, fontSize: 17, cursor: "pointer",
          animation: "pulse 1s infinite",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          ⏹ Ich hoere... (Tippen zum Stoppen)
        </button>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Oder hier tippen..."
          style={{
            flex: 1, background: C.surface, border: "1px solid " + C.border,
            borderRadius: 14, padding: "13px 16px", color: C.text, fontSize: 15, outline: "none",
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          background: input.trim() ? C.accent : C.border, border: "none",
          borderRadius: 14, padding: "13px 18px", color: "#fff", fontSize: 18, cursor: "pointer",
        }}>➤</button>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
    </div>
  );
}
