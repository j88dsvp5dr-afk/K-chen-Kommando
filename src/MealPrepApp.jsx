import React, { useState, useEffect, useRef, useCallback } from "react";

// Globale CSS-Injektion fuer bessere Schrift + Touch
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
  
  body, * {
    font-family: 'DM Sans', -apple-system, sans-serif !important;
    -webkit-font-smoothing: antialiased;
  }
  
  button { touch-action: manipulation; }
  
  input, textarea {
    font-size: 16px !important;
  }
  
  ::-webkit-scrollbar { display: none; }
  * { scrollbar-width: none; }
`;

// Style-Tag einmal injizieren
if (typeof document !== "undefined" && !document.getElementById("vos-styles")) {
  const style = document.createElement("style");
  style.id = "vos-styles";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

// -----------------------------------------------------------
//  VERENA OS -- Familien-Operator
//  Architektur: 4 Modi - KI-Herz - Zero Mental Drop
// -----------------------------------------------------------

// -- Farben & Design ----------------------------------------
const C = {
  bg:      "#080808",
  surface: "#111111",
  card:    "#181818",
  border:  "#252525",
  text:    "#F2EEE8",
  muted:   "#5A5550",
  accent:  "#E8552A",
  gold:    "#C9A04A",
  sage:    "#4A6B42",
  danger:  "#C0392B",
  subtle:  "#1D1D1D",
};

// Globale Styles
const GS = {
  // Touch-optimierte Groessen fuer iPhone
  touchTarget: 52,       // Min Touch-Target iOS HIG
  fontBase: 16,          // Basis-Schriftgroesse
  fontLarge: 18,         // Grosse Schrift
  fontSmall: 13,         // Kleine Schrift
  fontTiny: 11,          // Labels
  radius: 18,            // Standard Border-Radius
  radiusSm: 12,          // Kleiner Radius
  radiusLg: 24,          // Grosser Radius
  pad: 20,               // Standard Padding
  gap: 12,               // Standard Gap
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
// -- Verena-Kontext: feste Muster die die KI kennt ----------
const VERENA_KONTEXT = `
Du bist Verenas persoenlicher Familien-Operator. Du kennst sie gut:

FAMILIE:
- Verena: arbeitet Di-Fr morgens (Teilzeit), Montag frei
- Hanna: 12 Jahre, Schule
- Timo: 10 Jahre, Schule, hatte kuerzlich Arzttermin
- Paul: Partner
- Donnerstag 17:00: Nachhilfe fuer Hanna + Timo (fixer Termin jede Woche)
- Sonntag 18:00: Familien-Meeting

ESSEN:
- IMMER laktosefrei (Verena vertraegt keine Laktose)
- Kindertauglich, einfach, max 30 Min
- Donnerstag nach Nachhilfe: besonders wenig Zeit, max 15 Min

HAUSHALT:
- Sonntags: Brot vorbereiten fuer die Woche (Hanna schmiert, Timo belegt, Verena packt)
- Waesche, Geschirrspueler, 5-Min Tidy sind Routinen

PSYCHOLOGIE:
- Verena startet stark aber verliert den Faden bei zu vielen Aufgaben
- Max 3-5 Aufgaben sichtbar
- Keine Schuldgefuehle erzeugen
- Realitaet vor Perfektion
`;


// ================================================================
//  SUPABASE — Datenpersistenz
//  Alle Daten werden in der Cloud gespeichert + localStorage Fallback
// ================================================================

const SUPABASE_URL = "https://bzxlauyqrnsyqoggndty.supabase.co";
const SUPABASE_KEY = "sb_publishable_1RrAVzXHslo1Lx81_clrSQ_tpvd9ruH";

// Eindeutige User-ID fuer diese Installation
function getUserId() {
  let id = localStorage.getItem("vos_user_id");
  if (!id) {
    id = "verena_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("vos_user_id", id);
  }
  return id;
}

async function sbSave(table, dataObj) {
  try {
    const userId = getUserId();
    const payload = {
      user_id: userId,
      table_name: table,
      data: JSON.stringify(dataObj),
      updated_at: new Date().toISOString(),
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/verena_data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch(e) {
    console.log("Supabase save error:", e);
    return false;
  }
}

async function sbLoad(table) {
  try {
    const userId = getUserId();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/verena_data?user_id=eq.${userId}&table_name=eq.${table}&select=data`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (rows && rows.length > 0) return JSON.parse(rows[0].data);
    return null;
  } catch(e) {
    console.log("Supabase load error:", e);
    return null;
  }
}

async function sbSetup() {
  // Erstelle Tabelle verena_data via Supabase SQL API
  const sql = `
    CREATE TABLE IF NOT EXISTS verena_data (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, table_name)
    );
  `;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
      },
      body: JSON.stringify({ sql }),
    });
    return res.ok;
  } catch { return false; }
}

// ================================================================
//  KI MEMORY — Stiller Lernkern
//  Beobachtet Verhalten, lernt Muster, niemals sichtbar fuer Nutzer
// ================================================================

function loadMemory() {
  try { return JSON.parse(localStorage.getItem("vos_ki_memory") || "{}"); } catch { return {}; }
}

function saveMemory(mem) {
  try { localStorage.setItem("vos_ki_memory", JSON.stringify(mem)); } catch {}
}

function beobachte(ereignis, kontext = {}) {
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

function kiMemoryAlsKontext() {
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

// -- Feste Verena-Vorlagen (werden beim Onboarding eingefuegt) --
const VERENA_VORLAGEN = {
  tasks: [
    { id: 1, text: "Brot vorbereiten", wann: "heute", kategorie: "haushalt", wiederholung: "so", priority: "normal", done: false, createdAt: Date.now(), lastCreated: "" },
    { id: 2, text: "Familienmeeting 18 Uhr", wann: "heute", kategorie: "kinder", wiederholung: "so", priority: "normal", done: false, createdAt: Date.now(), lastCreated: "" },
    { id: 3, text: "Nachhilfe vorbereiten", wann: "heute", kategorie: "kinder", wiederholung: "do", priority: "high", done: false, createdAt: Date.now(), lastCreated: "" },
    { id: 4, text: "Geschirrspueler leeren", wann: "heute", kategorie: "haushalt", wiederholung: "taeglich", priority: "normal", done: false, createdAt: Date.now(), lastCreated: "" },
    { id: 5, text: "Waesche aufhaengen", wann: "heute", kategorie: "haushalt", wiederholung: "einmalig", priority: "normal", done: false, createdAt: Date.now(), lastCreated: "" },
  ],
  vorrat: [
    { id: 10, name: "Nudeln" },
    { id: 11, name: "Reis" },
    { id: 12, name: "Olivenoel" },
    { id: 13, name: "Salz, Pfeffer, Gewuerze" },
    { id: 14, name: "Tomaten Dose" },
  ],
};

export default function VerenaOS() {
  // -- State ----------------------------------------------
  const [mode, setMode]         = useState(() => load("vos_mode", "GREEN"));
  const [tasks, setTasks]       = useState(() => load("vos_tasks", []));
  const [meal, setMeal]         = useState(() => load("vos_meal", null));
  const [memory, setMemory]     = useState(() => load("vos_memory", []));
  const [termine, setTermine]   = useState(() => { try { return JSON.parse(localStorage.getItem("vos_termine") || "[]"); } catch { return []; } });
  const [einkauf, setEinkauf]   = useState(() => { try { return JSON.parse(localStorage.getItem("vos_einkauf") || "[]"); } catch { return []; } });
  const [vorrat, setVorrat]     = useState(() => { try { return JSON.parse(localStorage.getItem("vos_vorrat") || "[]"); } catch { return []; } });
  const [tk, setTk]             = useState(() => { try { return JSON.parse(localStorage.getItem("vos_tk") || "[]"); } catch { return []; } });
  const [chatHistory, setChatHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("vos_chat") || "[]"); } catch { return []; } });
  const [autopilot, setAutopilot] = useState(null);
  const [autopilotLoading, setAutopilotLoading] = useState(false);
  const [screen, setScreen]     = useState("home");
  const [warning, setWarning]   = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Nur anzeigen wenn noch nie ongeboardet UND keine Daten vorhanden
    const onboarded = localStorage.getItem("vos_onboarded") === "true";
    const hasTasks = JSON.parse(localStorage.getItem("vos_tasks") || "[]").length > 0;
    const hasTermine = JSON.parse(localStorage.getItem("vos_termine") || "[]").length > 0;
    return !onboarded && !hasTasks && !hasTermine;
  });

  // -- Persist ---------------------------------------------
  useEffect(() => save("vos_mode", mode), [mode]);
  useEffect(() => { save("vos_tasks", tasks); sbSave("tasks", tasks); }, [tasks]);
  useEffect(() => save("vos_meal", meal), [meal]);
  useEffect(() => save("vos_memory", memory), [memory]);
  useEffect(() => { try { localStorage.setItem("vos_termine", JSON.stringify(termine)); sbSave("termine", termine); } catch {} }, [termine]);
  useEffect(() => { try { localStorage.setItem("vos_einkauf", JSON.stringify(einkauf)); sbSave("einkauf", einkauf); } catch {} }, [einkauf]);
  useEffect(() => { try { localStorage.setItem("vos_vorrat", JSON.stringify(vorrat)); sbSave("vorrat", vorrat); } catch {} }, [vorrat]);
  useEffect(() => { try { localStorage.setItem("vos_tk", JSON.stringify(tk)); sbSave("tk", tk); } catch {} }, [tk]);
  useEffect(() => { try { localStorage.setItem("vos_chat", JSON.stringify(chatHistory.slice(-30))); } catch {} }, [chatHistory]);

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

  // -- Export / Import / Onboarding -------------------------
  function getBackupData() {
    return {
      version: 1,
      ts: new Date().toISOString(),
      tasks:      JSON.parse(localStorage.getItem("vos_tasks") || "[]"),
      termine:    JSON.parse(localStorage.getItem("vos_termine") || "[]"),
      tk:         JSON.parse(localStorage.getItem("vos_tk") || "[]"),
      vorrat:     JSON.parse(localStorage.getItem("vos_vorrat") || "[]"),
      wochenplan: JSON.parse(localStorage.getItem("vos_wochenplan") || "null"),
      einkauf:    JSON.parse(localStorage.getItem("vos_einkauf") || "[]"),
      ki_memory:  JSON.parse(localStorage.getItem("vos_ki_memory") || "{}"),
    };
  }

  function doExport() {
    const data = getBackupData();
    // Intern speichern
    localStorage.setItem("vos_backup_intern", JSON.stringify(data));
    localStorage.setItem("vos_last_backup", new Date().toDateString());
    // Datei herunterladen
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verena-os-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.tasks)      { localStorage.setItem("vos_tasks", JSON.stringify(data.tasks)); setTasks(data.tasks); }
        if (data.termine)    localStorage.setItem("vos_termine", JSON.stringify(data.termine));
        if (data.tk)         localStorage.setItem("vos_tk", JSON.stringify(data.tk));
        if (data.vorrat)     localStorage.setItem("vos_vorrat", JSON.stringify(data.vorrat));
        if (data.wochenplan) localStorage.setItem("vos_wochenplan", JSON.stringify(data.wochenplan));
        if (data.einkauf)    localStorage.setItem("vos_einkauf", JSON.stringify(data.einkauf));
        localStorage.setItem("vos_onboarded", "true");
        setShowOnboarding(false);
        alert("Backup wiederhergestellt!");
      } catch { alert("Fehler beim Laden."); }
    };
    reader.readAsText(file);
  }

  function doOnboarding() {
    const now = Date.now();
    const vorlagen = VERENA_VORLAGEN.tasks.map((t, i) => ({ ...t, id: now + i, lastCreated: "" }));
    setTasks(vorlagen);
    localStorage.setItem("vos_tasks", JSON.stringify(vorlagen));
    localStorage.setItem("vos_vorrat", JSON.stringify(VERENA_VORLAGEN.vorrat));
    localStorage.setItem("vos_onboarded", "true");
    setShowOnboarding(false);
  }

  // -- PWA Service Worker + Push Notifications -----------
  useEffect(() => {
    // Service Worker registrieren
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(reg => {
        console.log("SW registriert:", reg.scope);
      }).catch(err => console.log("SW Fehler:", err));
    }
  }, []);

  // Termine an Service Worker schicken fuer lokale Benachrichtigungen
  useEffect(() => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CHECK_TERMINE",
        termine: termine,
      });
    }
  }, [termine]);

  async function pushBenachrichtigungAnfragen() {
    if (!("Notification" in window)) {
      alert("Dein Browser unterstuetzt keine Benachrichtigungen.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setWarning("Benachrichtigungen aktiviert! Du wirst an Termine erinnert.");
    } else {
      setWarning("Benachrichtigungen abgelehnt. Du kannst es in Safari-Einstellungen aendern.");
    }
  }

  // -- Cloud-Sync beim Start -----------
  const [syncStatus, setSyncStatus] = useState(null); // null | "syncing" | "ok" | "offline"

  useEffect(() => {
    async function cloudSync() {
      setSyncStatus("syncing");
      try {
        // Pruefen ob Supabase erreichbar
        const tasksCloud = await sbLoad("tasks");
        if (tasksCloud && tasksCloud.length > 0) {
          // Cloud hat Daten — vergleiche mit lokal
          const lokalTs = localStorage.getItem("vos_last_sync") || "0";
          // Laden wenn Cloud neuer oder lokal leer
          const lokalTasks = JSON.parse(localStorage.getItem("vos_tasks") || "[]");
          if (lokalTasks.length === 0 && tasksCloud.length > 0) {
            setTasks(tasksCloud);
            localStorage.setItem("vos_tasks", JSON.stringify(tasksCloud));
          }
          const termineCloud = await sbLoad("termine");
          if (termineCloud) { setTermine(termineCloud); localStorage.setItem("vos_termine", JSON.stringify(termineCloud)); }
          const vorratCloud = await sbLoad("vorrat");
          if (vorratCloud) { setVorrat(vorratCloud); localStorage.setItem("vos_vorrat", JSON.stringify(vorratCloud)); }
          const tkCloud = await sbLoad("tk");
          if (tkCloud) { setTk(tkCloud); localStorage.setItem("vos_tk", JSON.stringify(tkCloud)); }
          const einkaufCloud = await sbLoad("einkauf");
          if (einkaufCloud) { setEinkauf(einkaufCloud); localStorage.setItem("vos_einkauf", JSON.stringify(einkaufCloud)); }
          localStorage.setItem("vos_last_sync", new Date().toISOString());
        }
        setSyncStatus("ok");
      } catch {
        setSyncStatus("offline");
      }
    }
    cloudSync();
  }, []);

  // -- App-Oeffnung beobachten -----------
  useEffect(() => {
    beobachte("app_geoeffnet");

    // Sonntagsrueckblick automatisch generieren
    const istSonntag = new Date().getDay() === 0;
    const letzterRueckblick = localStorage.getItem("vos_rueckblick_datum");
    const heuteDatum = new Date().toLocaleDateString("de-DE");
    if (istSonntag && letzterRueckblick !== heuteDatum) {
      // Wird durch den Sonntagsrueckblick-Component selbst getriggert
      localStorage.removeItem("vos_rueckblick"); // Alten loeschen damit neu generiert wird
    }

    // Automatisches internes Backup
    const heute = new Date().toDateString();
    const letztesBackup = localStorage.getItem("vos_last_backup");
    if (letztesBackup !== heute) {
      setTimeout(() => {
        try {
          const data = {
            version: 1,
            ts: new Date().toISOString(),
            tasks:      JSON.parse(localStorage.getItem("vos_tasks") || "[]"),
            termine:    JSON.parse(localStorage.getItem("vos_termine") || "[]"),
            tk:         JSON.parse(localStorage.getItem("vos_tk") || "[]"),
            vorrat:     JSON.parse(localStorage.getItem("vos_vorrat") || "[]"),
            einkauf:    JSON.parse(localStorage.getItem("vos_einkauf") || "[]"),
            wochenplan: JSON.parse(localStorage.getItem("vos_wochenplan") || "null"),
            ki_memory:  JSON.parse(localStorage.getItem("vos_ki_memory") || "{}"),
          };
          localStorage.setItem("vos_backup_intern", JSON.stringify(data));
          localStorage.setItem("vos_last_backup", heute);
        } catch(e) {
          console.log("Auto-Backup fehlgeschlagen:", e);
        }
      }, 2000);
    }
  }, []);

  // -- Wiederkehrende Aufgaben automatisch erstellen -----------
  useEffect(() => {
    const heute = new Date();
    const wochentag = ["so","mo","di","mi","do","fr","sa"][heute.getDay()];
    const tagDesMonats = heute.getDate();
    const today = heute.toDateString();

    setTasks(prev => {
      const updated = [...prev];
      // Für jede wiederkehrende Aufgabe prüfen ob heute fällig
      prev.forEach(t => {
        if (!t.wiederholung || t.wiederholung === "einmalig") return;
        if (t.lastCreated === today) return; // Heute schon erstellt

        let faellig = false;
        if (t.wiederholung === "taeglich") faellig = true;
        if (t.wiederholung === wochentag) faellig = true;
        if (t.wiederholung === "monatlich" && tagDesMonats === new Date(t.createdAt).getDate()) faellig = true;

        if (faellig) {
          // Neue Instanz erstellen
          updated.push({
            ...t,
            id: Date.now() + Math.random(),
            done: false,
            createdAt: Date.now(),
            lastCreated: today,
            autoAdded: true,
          });
          // lastCreated auf Original aktualisieren
          const idx = updated.findIndex(x => x.id === t.id);
          if (idx !== -1) updated[idx] = { ...updated[idx], lastCreated: today };
        }
      });
      return updated;
    });
  }, []);

  // -- Morgen-Autopilot: laeuft einmal pro Tag beim Oeffnen --
  useEffect(() => {
    const today = new Date().toDateString();
    const lastRun = localStorage.getItem("vos_autopilot_date");
    if (lastRun === today) {
      // Bereits heute gelaufen - gespeichertes Ergebnis laden
      const saved = localStorage.getItem("vos_autopilot_result");
      if (saved) { try { setAutopilot(JSON.parse(saved)); } catch {} }
      return;
    }
    // Erster Aufruf heute - Autopilot starten
    runAutopilot();
  }, []);

  async function runAutopilot() {
    setAutopilotLoading(true);
    try {
      const now = new Date();
      const wochentage = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
      const wochentag = wochentage[now.getDay()];
      const datum = now.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
      const offeneAufgaben = tasks.filter(t => !t.done).map(t => t.text).join(", ") || "keine";
      const termine = (() => {
        try {
          const t = JSON.parse(localStorage.getItem("vos_termine") || "[]");
          const heute = new Date(); heute.setHours(0,0,0,0);
          return t.filter(x => {
            const d = new Date(x.datum); d.setHours(0,0,0,0);
            const diff = Math.round((d - heute) / 86400000);
            return diff >= 0 && diff <= 3;
          }).map(x => x.title + (x.time ? " um " + x.time : "") + " (" + (
            Math.round((new Date(x.datum) - heute) / 86400000) === 0 ? "heute" :
            Math.round((new Date(x.datum) - heute) / 86400000) === 1 ? "morgen" :
            "in " + Math.round((new Date(x.datum) - heute) / 86400000) + " Tagen"
          ) + ")").join(", ") || "keine";
        } catch { return "keine"; }
      })();

      const kiLernprofil = kiMemoryAlsKontext();
      const prompt = `${VERENA_KONTEXT}${kiLernprofil}

HEUTE: ${wochentag}, ${datum}
Offene Aufgaben: ${offeneAufgaben}
Termine naechste 3 Tage: ${termine}

Erstelle den Tagesplan fuer Verena. Antworte NUR als JSON:
{
  "fokus": "Die eine wichtigste Aufgabe heute (max 8 Worte)",
  "essen": "Heutiges Abendessen (laktosefrei, kindertauglich, mit Zeitangabe)",
  "warnung": "Wichtigste Warnung oder null wenn nichts dringend",
  "modus": "GREEN oder YELLOW oder RED je nach Tagesbelastung",
  "begruendung": "1 kurzer Satz warum dieser Plan"
}`;

      const reply = await askClaude("Antworte nur als reines JSON ohne Markdown.", prompt);
      const clean = reply.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);

      setAutopilot(data);
      localStorage.setItem("vos_autopilot_result", JSON.stringify(data));
      localStorage.setItem("vos_autopilot_date", new Date().toDateString());

      // Modus automatisch setzen wenn KI RED empfiehlt
      if (data.modus === "RED" && mode === "GREEN") setMode("RED");
      if (data.modus === "YELLOW" && mode === "GREEN") setMode("YELLOW");

      // Warnung setzen
      if (data.warnung) setWarning(data.warnung);

      // Essen vorbelegen wenn noch keins
      if (!meal && data.essen) setMeal(data.essen);

      // Fokus-Aufgabe hinzufuegen wenn nicht schon vorhanden
      if (data.fokus) {
        const exists = tasks.some(t => t.text.toLowerCase().includes(data.fokus.toLowerCase().slice(0, 10)));
        if (!exists) {
          setTasks(prev => [
            { id: Date.now(), text: data.fokus, priority: "high", done: false, createdAt: Date.now(), autoAdded: true },
            ...prev
          ]);
        }
      }

      addMemory("Autopilot: " + data.begruendung);
    } catch (e) {
      console.error("Autopilot error:", e);
    }
    setAutopilotLoading(false);
  }

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
      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
            Verena OS
          </div>
          {syncStatus === "syncing" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />}
          {syncStatus === "ok" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.sage }} />}
          {syncStatus === "offline" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted }} />}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <BackupButton doExport={doExport} doImport={doImport} />
          <ModeButton mode={mode} setMode={setMode} mc={mc} />
        </div>
      </div>

      {/* -- Onboarding Modal -- */}
      {showOnboarding && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "flex-end", padding: "0 0 32px" }}>
          <div style={{ background: "#1E1E1E", borderRadius: "24px 24px 0 0", padding: "32px 24px 24px", width: "100%", maxWidth: 480, margin: "0 auto" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>👋</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: "center", marginBottom: 8, color: C.text }}>Willkommen, Verena</h2>
            <p style={{ fontSize: 15, color: C.muted, textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
              Hast du ein Backup von vorher, oder moechtest du mit meinen Vorlagen starten?
            </p>
            <button onClick={doOnboarding} style={{
              width: "100%", padding: "15px", background: C.accent, border: "none",
              borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer", marginBottom: 10
            }}>
              Mit Vorlagen starten
            </button>
            <label style={{
              display: "block", width: "100%", padding: "15px", background: "transparent",
              border: "1px solid " + C.border, borderRadius: 14, color: C.text, fontWeight: 700,
              fontSize: 16, cursor: "pointer", textAlign: "center", boxSizing: "border-box", marginBottom: 10
            }}>
              Backup laden
              <input type="file" accept=".json" onChange={doImport} style={{ display: "none" }} />
            </label>
            <button onClick={() => { localStorage.setItem("vos_onboarded", "true"); setShowOnboarding(false); }} style={{
              width: "100%", padding: "12px", background: "transparent", border: "none",
              color: C.muted, fontSize: 14, cursor: "pointer"
            }}>
              Leer starten
            </button>
          </div>
        </div>
      )}

      {/* -- Screen Content -- */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 100px" }}>
        {screen === "home"    && <HomeScreen mode={mode} mc={mc} activeTasks={activeTasks} tasks={tasks} setTasks={setTasks} meal={meal} setMeal={setMeal} warning={warning} setWarning={setWarning} addMemory={addMemory} maxVisible={maxVisible} autopilot={autopilot} autopilotLoading={autopilotLoading} runAutopilot={runAutopilot} onPushAktivieren={pushBenachrichtigungAnfragen} termine={termine} />}
        {screen === "tasks"   && <TasksScreen tasks={tasks} setTasks={setTasks} mode={mode} maxVisible={maxVisible} addMemory={addMemory} />}
        {screen === "kueche"  && <KuecheScreen addMemory={addMemory} mode={mode} einkauf={einkauf} setEinkauf={setEinkauf} vorrat={vorrat} setVorrat={setVorrat} tk={tk} setTk={setTk} />}
        {screen === "voice"   && <VoiceScreen mode={mode} setMode={setMode} tasks={tasks} setTasks={setTasks} meal={meal} setMeal={setMeal} addMemory={addMemory} setWarning={setWarning} setScreen={setScreen} setTermine={setTermine} setEinkauf={setEinkauf} setVorrat={setVorrat} setTk={setTk} chatHistory={chatHistory} setChatHistory={setChatHistory} vorlesen={vorlesen} sprichtGerade={sprichtGerade} spracheStoppen={spracheStoppen} sprachAusgabeAn={sprachAusgabeAn} toggleSprachausgabe={toggleSprachausgabe} />}
        {screen === "termine" && <TermineScreen addMemory={addMemory} setWarning={setWarning} tasks={tasks} setTasks={setTasks} termine={termine} setTermine={setTermine} />}
      </div>

      {/* -- Bottom Nav -- */}
      <BottomNav screen={screen} setScreen={setScreen} />
    </div>
  );
}

// -----------------------------------------------------------
//  MODE BUTTON
// -----------------------------------------------------------
function BackupButton({ doExport, doImport }) {
  const [open, setOpen] = useState(false);
  const letztes = localStorage.getItem("vos_last_backup");
  const internVorhanden = !!localStorage.getItem("vos_backup_intern");
  const importRef = useRef();

  function wiederherstellen() {
    const intern = localStorage.getItem("vos_backup_intern");
    if (!intern) { alert("Kein internes Backup vorhanden."); return; }
    try {
      const data = JSON.parse(intern);
      if (data.tasks)      { localStorage.setItem("vos_tasks", JSON.stringify(data.tasks)); }
      if (data.termine)    localStorage.setItem("vos_termine", JSON.stringify(data.termine));
      if (data.tk)         localStorage.setItem("vos_tk", JSON.stringify(data.tk));
      if (data.vorrat)     localStorage.setItem("vos_vorrat", JSON.stringify(data.vorrat));
      if (data.wochenplan) localStorage.setItem("vos_wochenplan", JSON.stringify(data.wochenplan));
      if (data.einkauf)    localStorage.setItem("vos_einkauf", JSON.stringify(data.einkauf));
      if (data.ki_memory)  localStorage.setItem("vos_ki_memory", JSON.stringify(data.ki_memory));
      alert("Wiederhergestellt vom " + (data.ts ? new Date(data.ts).toLocaleDateString("de-DE") : "?") + ". Seite wird neu geladen.");
      window.location.reload();
    } catch { alert("Fehler beim Wiederherstellen."); }
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: "transparent", border: "1px solid " + C.border, borderRadius: 20,
        padding: "5px 10px", color: C.muted, fontSize: 11, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 4
      }}>
        💾 {letztes === new Date().toDateString() ? "Heute" : letztes || "Backup"}
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          background: C.card, border: "1px solid " + C.border,
          borderRadius: 16, overflow: "hidden", zIndex: 100, minWidth: 200,
        }}>
          <button onClick={() => { doExport(); setOpen(false); }} style={{
            display: "block", width: "100%", padding: "14px 16px", background: "transparent",
            border: "none", borderBottom: "1px solid " + C.border, color: C.text,
            fontSize: 14, cursor: "pointer", textAlign: "left"
          }}>💾 Backup speichern + herunterladen</button>
          {internVorhanden && (
            <button onClick={() => { wiederherstellen(); setOpen(false); }} style={{
              display: "block", width: "100%", padding: "14px 16px", background: "transparent",
              border: "none", borderBottom: "1px solid " + C.border, color: C.gold,
              fontSize: 14, cursor: "pointer", textAlign: "left"
            }}>↩ Letztes Backup wiederherstellen</button>
          )}
          <label style={{
            display: "block", width: "100%", padding: "14px 16px", background: "transparent",
            borderBottom: "none", color: C.muted, fontSize: 14, cursor: "pointer",
            boxSizing: "border-box"
          }}>
            📂 Backup-Datei laden
            <input ref={importRef} type="file" accept=".json" onChange={(e) => { doImport(e); setOpen(false); }} style={{ display: "none" }} />
          </label>
        </div>
      )}
    </div>
  );
}

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
function HomeScreen({ mode, mc, activeTasks, tasks, setTasks, meal, setMeal, warning, setWarning, addMemory, maxVisible, autopilot, autopilotLoading, runAutopilot, onPushAktivieren, termine }) {
  const [aufgabenOffen, setAufgabenOffen] = useState(false);
  const [quickVal, setQuickVal] = useState("");
  const [quickWann, setQuickWann] = useState("diese-woche");
  const [quickKat, setQuickKat] = useState("sonstiges");
  const offeneAufgaben = tasks.filter(t => !t.done);
  const isDark = mode === "DARK_RED";

  return (
    <div style={{ paddingTop: 28 }}>
      {/* Hero */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
          {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 style={{
          fontSize: isDark ? 32 : 38,
          fontWeight: 900,
          lineHeight: 1.05,
          margin: 0,
          letterSpacing: -1.5,
          color: isDark ? C.danger : C.text,
        }}>
          {isDark ? "Nur das Noetigste." : mode === "RED" ? "Ich uebernehme." : mode === "YELLOW" ? "Fokus." : "Guten Morgen."}
        </h1>
      </div>

      {/* Autopilot Banner */}
      {autopilotLoading && (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.muted }}>Autopilot plant deinen Tag...</div>
        </div>
      )}
      {autopilot && !autopilotLoading && (
        <div style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #1E1E1E 100%)",
          border: "1px solid " + C.accent + "40",
          borderRadius: 18, padding: "16px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
            Autopilot aktiv
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            {autopilot.begruendung}
          </div>
          <button onClick={() => { localStorage.removeItem("vos_autopilot_date"); runAutopilot(); }} style={{
            marginTop: 10, background: "transparent", border: "1px solid " + C.border,
            borderRadius: 8, padding: "5px 10px", color: C.muted, fontSize: 11, cursor: "pointer"
          }}>Neu planen</button>
        </div>
      )}

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
          addMemory("Erledigt: " + activeTasks[0].text);
          beobachte("aufgabe_erledigt", { kategorie: activeTasks[0].kategorie });
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

      {/* Aufgaben-Block */}
      {mode !== "DARK_RED" && (
        <div style={{ marginBottom: 16 }}>
          {/* Header mit Anzahl und Aufklapp-Button */}
          <button onClick={() => setAufgabenOffen(o => !o)} style={{
            width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "transparent", border: "none", cursor: "pointer", padding: "4px 0 10px",
          }}>
            <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
              Alle Aufgaben ({offeneAufgaben.length} offen)
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>{aufgabenOffen ? "▲" : "▼"}</div>
          </button>

          {aufgabenOffen && (
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: GS.radius, padding: 16 }}>
              {/* Quick Add */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input value={quickVal} onChange={e => setQuickVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && quickVal.trim()) {
                    const t = { id: Date.now(), text: quickVal.trim(), wann: quickWann, kategorie: quickKat, priority: quickWann === "heute" ? "high" : "normal", done: false, createdAt: Date.now() };
                    setTasks(prev => [...prev, t]);
                    addMemory("+ " + quickVal.trim());
                    setQuickVal("");
                  }}}
                  placeholder="+ Aufgabe..."
                  style={{ flex: 1, background: C.surface, border: "1px solid " + C.border, borderRadius: GS.radiusSm, padding: "11px 14px", color: C.text, fontSize: 15, outline: "none" }} />
                <button onClick={() => { if (quickVal.trim()) {
                  const t = { id: Date.now(), text: quickVal.trim(), wann: quickWann, kategorie: quickKat, priority: "normal", done: false, createdAt: Date.now() };
                  setTasks(prev => [...prev, t]); addMemory("+ " + quickVal.trim()); setQuickVal("");
                }}} style={{ background: C.accent, border: "none", borderRadius: GS.radiusSm, padding: "11px 16px", color: "#fff", fontSize: 18, cursor: "pointer" }}>+</button>
              </div>

              {/* Wann-Auswahl */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {[{id:"heute",l:"Heute",c:C.accent},{id:"diese-woche",l:"Woche",c:C.gold},{id:"diesen-monat",l:"Monat",c:C.sage},{id:"irgendwann",l:"Irgendwann",c:C.muted}].map(w => (
                  <button key={w.id} onClick={() => setQuickWann(w.id)} style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                    border: "1px solid " + (quickWann === w.id ? w.c : C.border),
                    background: quickWann === w.id ? w.c + "25" : "transparent",
                    color: quickWann === w.id ? w.c : C.muted, fontWeight: quickWann === w.id ? 700 : 400,
                  }}>{w.l}</button>
                ))}
              </div>

              {/* Aufgabenliste */}
              {offeneAufgaben.slice(0, maxVisible).map((t, i) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < offeneAufgaben.slice(0,maxVisible).length-1 ? "1px solid " + C.border : "none" }}>
                  <button onClick={() => { setTasks(prev => prev.map(x => x.id === t.id ? {...x, done: true, doneAt: Date.now()} : x)); addMemory("✓ " + t.text); beobachte("aufgabe_erledigt", {kategorie: t.kategorie}); }} style={{
                    width: 26, height: 26, borderRadius: 8, border: "2px solid " + (i === 0 ? C.accent : C.border),
                    background: "transparent", cursor: "pointer", flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: i === 0 ? 600 : 400 }}>{t.text}</div>
                    {t.wann && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{t.wann}</div>}
                  </div>
                  <button onClick={() => setTasks(prev => prev.filter(x => x.id !== t.id))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>x</button>
                </div>
              ))}
              {offeneAufgaben.length > maxVisible && (
                <div style={{ textAlign: "center", padding: "10px 0 0", fontSize: 13, color: C.muted }}>
                  + {offeneAufgaben.length - maxVisible} weitere versteckt
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sonntagsrueckblick */}
      <Sonntagsrueckblick tasks={tasks} termine={termine || []} addMemory={addMemory} />

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <StatPill label="Heute erledigt" value={tasks.filter(t => t.done && isToday(t.doneAt)).length} />
        <StatPill label="Offen" value={offeneAufgaben.length} />
      </div>

      {/* Push aktivieren */}
      {typeof Notification !== "undefined" && Notification.permission === "default" && (
        <button onClick={onPushAktivieren} style={{
          width: "100%", padding: "13px", background: "transparent",
          border: "1px solid " + C.gold + "60", borderRadius: GS.radius,
          color: C.gold, fontSize: 14, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8
        }}>
          🔔 Terminerinnerungen aktivieren
        </button>
      )}
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
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, marginBottom: 18 }}>
        {task.text}
      </div>
      {task.note && (
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>{task.note}</div>
      )}
      <button onClick={onDone} style={{
        background: C.accent, border: "none", borderRadius: GS.radius,
        padding: "16px 20px", color: "#fff", fontWeight: 800,
        fontSize: 17, cursor: "pointer", width: "100%",
        minHeight: GS.touchTarget,
      }}>
        ✓ Erledigt
      </button>
    </div>
  );
}

function MiniTask({ task, onDone }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 0", borderBottom: "1px solid " + C.border,
    }}>
      <button onClick={onDone} style={{
        width: 28, height: 28, borderRadius: 9,
        border: "2px solid " + C.border,
        background: "transparent", cursor: "pointer", flexShrink: 0,
        minWidth: 28,
      }} />
      <div style={{ fontSize: 16, color: C.text, lineHeight: 1.3 }}>{task.text}</div>
      {task.priority === "high" && (
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.accent, fontWeight: 800 }}>!</div>
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
      flex: 1, background: C.surface, border: "1px solid " + C.border,
      borderRadius: GS.radius, padding: "16px 12px", textAlign: "center",
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 3, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// -----------------------------------------------------------
//  TASKS SCREEN
// -----------------------------------------------------------
function TasksScreen({ tasks, setTasks, mode, maxVisible, addMemory }) {
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

function TaskRow({ task, index, onDone, onDelete }) {
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

// -----------------------------------------------------------
//  KUECHE SCREEN — TK + Vorrat + Wochenplan + Einkauf
// -----------------------------------------------------------
function KuecheScreen({ addMemory, mode, einkauf, setEinkauf, vorrat, setVorrat, tk, setTk }) {
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
      const plan = JSON.parse(clean);
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
                setEinkauf(prev => [...prev, { id: Date.now(), name: newItem.trim(), done: false }]);
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
              <div style={{ fontSize: 18 }}>🥫</div>
              <div style={{ flex: 1, fontSize: 15 }}>{item.name}</div>
              <button onClick={() => { setVorrat(prev => prev.filter(x => x.id !== item.id)); addMemory("Vorrat: " + item.name + " entfernt"); }}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>x</button>
            </div>
          ))}
        </div>
      )}
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
      <h2 style={{ margin: "0 0 24px", fontSize: 32, fontWeight: 900, letterSpacing: -1.2 }}>Essen & Einkauf</h2>

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
function VoiceScreen({ mode, setMode, tasks, setTasks, meal, setMeal, addMemory, setWarning, setScreen, setTermine, setEinkauf, setVorrat, setTk, chatHistory, setChatHistory, vorlesen, sprichtGerade, spracheStoppen, sprachAusgabeAn, toggleSprachausgabe }) {
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
      vorlesen(cleanReply);
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
      const res = await fetch("/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
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

  // -- Sprachausgabe --
  const [sprichtGerade, setSprichtGerade] = useState(false);
  const [sprachAusgabeAn, setSprachAusgabeAn] = useState(() => {
    return localStorage.getItem("vos_sprache_an") !== "false";
  });

  function vorlesen(text) {
    if (!sprachAusgabeAn) return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    // Aktionen entfernen
    const sauber = text.replace(/\[.*?\]/g, "").replace(/[\n]+/g, ". ").trim();
    const utterance = new SpeechSynthesisUtterance(sauber);
    utterance.lang = "de-DE";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    // Deutsche Stimme bevorzugen
    const stimmen = window.speechSynthesis.getVoices();
    const deutsch = stimmen.find(s => s.lang === "de-DE") || stimmen.find(s => s.lang.startsWith("de"));
    if (deutsch) utterance.voice = deutsch;
    utterance.onstart = () => setSprichtGerade(true);
    utterance.onend = () => setSprichtGerade(false);
    utterance.onerror = () => setSprichtGerade(false);
    window.speechSynthesis.speak(utterance);
  }

  function spracheStoppen() {
    window.speechSynthesis.cancel();
    setSprichtGerade(false);
  }

  function toggleSprachausgabe() {
    const neu = !sprachAusgabeAn;
    setSprachAusgabeAn(neu);
    localStorage.setItem("vos_sprache_an", neu ? "true" : "false");
  }

  return (
    <div style={{ paddingTop: 28, display: "flex", flexDirection: "column", height: "calc(100dvh - 160px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -1.2 }}>Frag mich</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {sprichtGerade && (
            <button onClick={spracheStoppen} style={{
              background: C.accent, border: "none", borderRadius: 20,
              padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer"
            }}>⏹ Stop</button>
          )}
          <button onClick={toggleSprachausgabe} style={{
            background: "transparent", border: "1px solid " + C.border, borderRadius: 20,
            padding: "6px 12px", color: sprachAusgabeAn ? C.sage : C.muted,
            fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}>{sprachAusgabeAn ? "🔊 An" : "🔇 Aus"}</button>
        </div>
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

// -----------------------------------------------------------
//  KINDER SCREEN — Hanna & Timo
// -----------------------------------------------------------
function KinderScreen({ addMemory, setWarning, termine, setTermine, setScreen }) {
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

// -----------------------------------------------------------
//  TERMINE SCREEN
// -----------------------------------------------------------
function TermineScreen({ addMemory, setWarning, tasks, setTasks, termine, setTermine }) {
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

// -----------------------------------------------------------
//  SONNTAGSRUECKBLICK
// -----------------------------------------------------------
function Sonntagsrueckblick({ tasks, termine, addMemory }) {
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

// -----------------------------------------------------------
//  MEMORY SCREEN -- Externes Gehirn
// -----------------------------------------------------------
function MemoryScreen({ memory, setMemory }) {
  return (
    <div style={{ paddingTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -1.2 }}>Gedaechtnis</h2>
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
    { id: "home",    label: "Home",    icon: "⌂" },
    { id: "kueche",  label: "Kueche",  icon: "🧊" },
    { id: "voice",   label: "KI",      icon: "◎" },
    { id: "termine", label: "Termine", icon: "📅" },
  ];

  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: C.bg + "ee",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid " + C.border,
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 12px)",
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => setScreen(item.id)} style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", gap: 4,
          padding: "14px 4px 10px",
          background: "transparent", border: "none",
          color: screen === item.id ? C.accent : C.muted,
          cursor: "pointer", transition: "color 0.15s",
        }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
          <span style={{ fontSize: 10, letterSpacing: 0.3, fontWeight: screen === item.id ? 700 : 400 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
