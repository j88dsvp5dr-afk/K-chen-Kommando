// ================================================================
//  SUPABASE — Datenpersistenz
//  Alle Daten werden in der Cloud gespeichert + localStorage Fallback
// ================================================================

export const SUPABASE_URL = "https://bzxlauyqrnsyqoggndty.supabase.co";

export const SUPABASE_KEY = "sb_publishable_1RrAVzXHslo1Lx81_clrSQ_tpvd9ruH";

// Eindeutige User-ID fuer diese Installation
export function getUserId() {
  let id = localStorage.getItem("vos_user_id");
  if (!id) {
    id = "verena_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("vos_user_id", id);
  }
  return id;
}

export async function sbSave(table, dataObj) {
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

export async function sbLoad(table) {
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
