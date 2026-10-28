import { useState, useEffect, useCallback } from "react";
import MasterTasksScreen from "./screens/MasterTasksScreen";
import { BackupButton } from "./components/BackupButton";
import { BottomNav } from "./components/BottomNav";
import { ModeButton } from "./components/ModeButton";
import { ScreenGuard } from "./components/ScreenGuard";
import { KALENDER_IMPORT, VERENA_VORLAGEN } from "./data/vorlagen";
import { askClaude, safeParseKI } from "./lib/claude";
import { VERENA_KONTEXT } from "./lib/kontext";
import { beobachte, kiMemoryAlsKontext } from "./lib/memory";
import { load, save } from "./lib/storage";
import { sbLoad, sbSave } from "./lib/supabase";
import { C, MODE_CONFIG } from "./lib/theme";
import { HomeScreen } from "./screens/HomeScreen";
import { KinderScreen } from "./screens/KinderScreen";
import { KuecheScreen } from "./screens/KuecheScreen";
import { TasksScreen } from "./screens/TasksScreen";
import { TermineScreen } from "./screens/TermineScreen";
import { VoiceScreen } from "./screens/VoiceScreen";

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
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Offline-Erkennung
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

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

  function kalenderImportieren() {
    const jetzt = Date.now();
    // Termine mergen (keine Duplikate)
    setTermine(prev => {
      const vorhandeneIds = prev.map(t => t.id);
      const neu = KALENDER_IMPORT.termine.filter(t => !vorhandeneIds.includes(t.id));
      return [...prev, ...neu].sort((a,b) => new Date(a.datum) - new Date(b.datum));
    });
    // Aufgaben mergen
    setTasks(prev => {
      const vorhandeneIds = prev.map(t => t.id);
      const neu = KALENDER_IMPORT.tasks.filter(t => !vorhandeneIds.includes(t.id));
      return [...prev, ...neu];
    });
    localStorage.setItem("vos_kalender_importiert", "true");
    setWarning("Import abgeschlossen: " + KALENDER_IMPORT.termine.length + " Termine + " + KALENDER_IMPORT.tasks.length + " Aufgaben");
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

  // Termine an Service Worker schicken — nur einmal pro Tag + nur zwischen 7-21 Uhr
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
    const jetzt = new Date();
    const stunde = jetzt.getHours();
    // Kein Spam: nur zwischen 7 und 21 Uhr
    if (stunde < 7 || stunde >= 21) return;
    // Kein Spam: max einmal pro App-Oeffnung (Key pro Tag+Stunde)
    const spamKey = "vos_push_sent_" + jetzt.toDateString() + "_" + stunde;
    if (sessionStorage.getItem(spamKey)) return;
    sessionStorage.setItem(spamKey, "1");
    navigator.serviceWorker.controller.postMessage({
      type: "CHECK_TERMINE",
      termine: termine,
    });
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

    // Automatisches internes Backup mit Rotation (3 Slots: heute, gestern, vorgestern)
    const heute = new Date().toDateString();
    const letztesBackup = localStorage.getItem("vos_last_backup");
    if (letztesBackup !== heute) {
      setTimeout(() => {
        try {
          const snap = {
            version: 2,
            ts: new Date().toISOString(),
            tasks:      JSON.parse(localStorage.getItem("vos_tasks")    || "[]"),
            termine:    JSON.parse(localStorage.getItem("vos_termine")  || "[]"),
            tk:         JSON.parse(localStorage.getItem("vos_tk")       || "[]"),
            vorrat:     JSON.parse(localStorage.getItem("vos_vorrat")   || "[]"),
            einkauf:    JSON.parse(localStorage.getItem("vos_einkauf")  || "[]"),
            wochenplan: JSON.parse(localStorage.getItem("vos_wochenplan") || "null"),
            ki_memory:  JSON.parse(localStorage.getItem("vos_ki_memory") || "{}"),
          };
          // Gesundheitscheck: nur speichern wenn sinnvolle Daten vorhanden
          const hatDaten = snap.tasks.length > 0 || snap.termine.length > 0 || snap.vorrat.length > 0;
          if (!hatDaten) return;
          // Rotation: slot0=heute, slot1=gestern, slot2=vorgestern
          const slot1 = localStorage.getItem("vos_backup_slot0");
          const slot2 = localStorage.getItem("vos_backup_slot1");
          if (slot1) localStorage.setItem("vos_backup_slot1", slot1);
          if (slot2) localStorage.setItem("vos_backup_slot2", slot2);
          localStorage.setItem("vos_backup_slot0", JSON.stringify(snap));
          // Kompatibilitaet: vos_backup_intern bleibt als alias
          localStorage.setItem("vos_backup_intern", JSON.stringify(snap));
          localStorage.setItem("vos_last_backup", heute);
          console.log("Auto-Backup OK:", snap.tasks.length, "Tasks,", snap.termine.length, "Termine");
        } catch(e) {
          console.log("Auto-Backup fehlgeschlagen:", e);
        }
      }, 3000); // nach 3s — nach Cloud-Sync
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
      const data = safeParseKI(reply);

      // KI offline oder Fehler — App laeuft trotzdem normal weiter
      if (!data) {
        setAutopilot({ fokus: null, essen: null, warnung: null, offline: true });
        setAutopilotLoading(false);
        return;
      }

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
          <BackupButton doExport={doExport} doImport={doImport} kalenderImportieren={kalenderImportieren} />
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

      {/* -- Offline Banner -- */}
      {!isOnline && (
        <div style={{
          background: "#1a1200",
          borderBottom: "1px solid #C9A04A40",
          padding: "8px 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: C.gold,
        }}>
          <span>📵</span>
          <span>Offline — Deine Daten sind lokal gespeichert. KI nicht verfuegbar.</span>
        </div>
      )}

      {/* -- Screen Content -- */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 100px" }}>
        <ScreenGuard name="Home">
          {screen === "home"    && <HomeScreen mode={mode} mc={mc} activeTasks={activeTasks} tasks={tasks} setTasks={setTasks} meal={meal} setMeal={setMeal} warning={warning} setWarning={setWarning} addMemory={addMemory} maxVisible={maxVisible} autopilot={autopilot} autopilotLoading={autopilotLoading} runAutopilot={runAutopilot} onPushAktivieren={pushBenachrichtigungAnfragen} termine={termine} />}
        </ScreenGuard>
        <ScreenGuard name="Aufgaben">
          {screen === "tasks"   && <TasksScreen tasks={tasks} setTasks={setTasks} mode={mode} maxVisible={maxVisible} addMemory={addMemory} />}
        </ScreenGuard>
        <ScreenGuard name="Kueche">
          {screen === "kueche"  && <KuecheScreen addMemory={addMemory} mode={mode} einkauf={einkauf} setEinkauf={setEinkauf} vorrat={vorrat} setVorrat={setVorrat} tk={tk} setTk={setTk} />}
        </ScreenGuard>
        <ScreenGuard name="KI">
          {screen === "voice"   && <VoiceScreen mode={mode} setMode={setMode} tasks={tasks} setTasks={setTasks} meal={meal} setMeal={setMeal} addMemory={addMemory} setWarning={setWarning} setScreen={setScreen} setTermine={setTermine} setEinkauf={setEinkauf} setVorrat={setVorrat} setTk={setTk} chatHistory={chatHistory} setChatHistory={setChatHistory} />}
        </ScreenGuard>
        <ScreenGuard name="Kinder">
          {screen === "kinder"  && <KinderScreen addMemory={addMemory} setWarning={setWarning} termine={termine} setTermine={setTermine} setScreen={setScreen} />}
        </ScreenGuard>
        <ScreenGuard name="Termine">
          {screen === "termine" && <TermineScreen addMemory={addMemory} setWarning={setWarning} tasks={tasks} setTasks={setTasks} termine={termine} setTermine={setTermine} />}
          {screen === "master"  && <MasterTasksScreen onCreateTermine={(newTermine) => { setTermine([...termine, ...newTermine]); setScreen("termine"); }} />}
        </ScreenGuard>
      </div>

      {/* -- Bottom Nav -- */}
      <BottomNav screen={screen} setScreen={setScreen} />
    </div>
  );
}
