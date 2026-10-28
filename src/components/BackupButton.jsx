import { useState, useRef } from "react";
import { C } from "../lib/theme";

// -----------------------------------------------------------
//  MODE BUTTON
// -----------------------------------------------------------
export function BackupButton({ doExport, doImport, kalenderImportieren }) {
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
          {!localStorage.getItem("vos_kalender_importiert") && (
            <button onClick={() => { kalenderImportieren(); setOpen(false); }} style={{
              display: "block", width: "100%", padding: "14px 16px", background: "transparent",
              border: "none", borderBottom: "1px solid " + C.border, color: C.accent,
              fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left"
            }}>📅 Kalender-Import laden (einmalig)</button>
          )}
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
