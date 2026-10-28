// ================================================================
//  KI MEMORY — Stiller Lernkern
//  Beobachtet Verhalten, lernt Muster, niemals sichtbar fuer Nutzer
// ================================================================

export function loadMemory() {
  try { return JSON.parse(localStorage.getItem("vos_ki_memory") || "{}"); } catch { return {}; }
}

export function saveMemory(mem) {
  try { localStorage.setItem("vos_ki_memory", JSON.stringify(mem)); } catch {}
}

export function beobachte(ereignis, kontext = {}) {
  const mem = loadMemory();
  const jetzt = new Date();
  const wochentag = ["so","mo","di","mi","do","fr","sa"][jetzt.getDay()];
  const stunde = jetzt.getHours();

  switch(ereignis) {
    case "essen_abgelehnt":
      if (!mem.essen_ablehnungen) mem.essen_ablehnungen = {};
      mem.essen_ablehnungen[wochentag] = (mem.essen_ablehnungen[wochentag] || 0) + 1;
      break;
    case "modus_rot":
      if (!mem.stress_muster) mem.stress_muster = [];
      mem.stress_muster.push({ tag: wochentag, stunde, datum: jetzt.toISOString().split("T")[0] });
      mem.stress_muster = mem.stress_muster.slice(-20);
      break;
    case "aufgabe_erledigt":
      if (!mem.aufgaben_muster) mem.aufgaben_muster = {};
      const kat = kontext.kategorie || "sonstiges";
      mem.aufgaben_muster[kat] = (mem.aufgaben_muster[kat] || 0) + 1;
      break;
    case "ueberfordert":
      if (!mem.krisen) mem.krisen = [];
      mem.krisen.push({ tag: wochentag, stunde, datum: jetzt.toISOString().split("T")[0] });
      mem.krisen = mem.krisen.slice(-10);
      break;
    case "app_geoeffnet":
      if (!mem.oeffnungszeiten) mem.oeffnungszeiten = [];
      mem.oeffnungszeiten.push({ tag: wochentag, stunde });
      mem.oeffnungszeiten = mem.oeffnungszeiten.slice(-30);
      break;
    case "termin_eingetragen":
      if (!mem.termin_kategorien) mem.termin_kategorien = {};
      const tkat = kontext.titel ? kontext.titel.toLowerCase().includes("arzt") ? "medizin" :
                   kontext.titel.toLowerCase().includes("schule") ? "schule" : "sonstiges" : "sonstiges";
      mem.termin_kategorien[tkat] = (mem.termin_kategorien[tkat] || 0) + 1;
      break;
  }

  mem.letzte_aktualisierung = jetzt.toISOString();
  mem.beobachtungen_gesamt = (mem.beobachtungen_gesamt || 0) + 1;
  saveMemory(mem);
}

export function kiMemoryAlsKontext() {
  const mem = loadMemory();
  if (!mem.beobachtungen_gesamt || mem.beobachtungen_gesamt < 3) return "";

  const teile = [];

  if (mem.stress_muster && mem.stress_muster.length >= 3) {
    const tage = mem.stress_muster.map(m => m.tag);
    const haeufig = [...new Set(tage)].sort((a,b) =>
      tage.filter(t=>t===b).length - tage.filter(t=>t===a).length)[0];
    teile.push("Beobachtet: Stress tritt haeufig am " + haeufig + " auf.");
  }
  if (mem.essen_ablehnungen) {
    const maxTag = Object.entries(mem.essen_ablehnungen).sort((a,b)=>b[1]-a[1])[0];
    if (maxTag && maxTag[1] >= 2) teile.push("Beobachtet: Essensvorschlaege werden am " + maxTag[0] + " oft abgelehnt — einfachere Option bevorzugen.");
  }
  if (mem.aufgaben_muster) {
    const bevorzugt = Object.entries(mem.aufgaben_muster).sort((a,b)=>b[1]-a[1])[0];
    if (bevorzugt) teile.push("Beobachtet: Aufgaben der Kategorie '" + bevorzugt[0] + "' werden am haeufigsten erledigt.");
  }
  if (mem.krisen && mem.krisen.length >= 2) {
    const krisenTage = mem.krisen.map(k => k.tag);
    const krisenTag = [...new Set(krisenTage)].sort((a,b) =>
      krisenTage.filter(t=>t===b).length - krisenTage.filter(t=>t===a).length)[0];
    teile.push("Beobachtet: Krisen treten haeufig am " + krisenTag + " auf — proaktiv reduzieren.");
  }

  return teile.length > 0 ? "\n\nPERSONALISIERTES LERNPROFIL (still beobachtet):\n" + teile.join("\n") : "";
}
