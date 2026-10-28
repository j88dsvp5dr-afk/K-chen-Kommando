// -- Claude API Call ----------------------------------------
// Laeuft ueber die Cloudflare Pages Function functions/claude.js (API-Key bleibt auf dem Server)
export const KI_ENDPOINT = "/claude";
export const KI_MODEL = "claude-sonnet-5-5";

export async function askClaude(systemPrompt, userMessage, history = []) {
  // Sofort abbrechen wenn offline
  if (!navigator.onLine) {
    return "📵 Offline — KI nicht verfuegbar. Deine Daten sind sicher gespeichert.";
  }
  try {
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.text })),
      { role: "user", content: userMessage }
    ];
    const res = await fetch(KI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: KI_MODEL,
        max_tokens: 800,
        system: systemPrompt,
        messages,
      }),
    });
    if (!res.ok) {
      console.log("Claude API Fehler:", res.status);
      return "KI momentan nicht erreichbar. Deine Daten bleiben gespeichert.";
    }
    const data = await res.json();
    return data.content?.[0]?.text || "Keine Antwort.";
  } catch (e) {
    console.log("Claude fetch Fehler:", e);
    return "📵 Verbindung unterbrochen. Deine Daten sind lokal gesichert.";
  }
}

// -- KI JSON sicher parsen ----------------------------------
// Gibt null zurueck wenn KI offline war oder JSON ungueltig
export function safeParseKI(reply) {
  if (!reply) return null;
  // Offline-Meldungen erkennen
  if (reply.startsWith("📵") || reply.startsWith("KI momentan") || reply.startsWith("Verbindung")) return null;
  try {
    const clean = reply.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}
