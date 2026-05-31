const SUPABASE_URL = "https://bzxlauyqrnsyqoggndty.supabase.co";
const SUPABASE_KEY = "sb_publishable_1RrAVzXHslo1Lx81_clrSQ_tpvd9ruH";

export async function onRequestPost(context) {
  try {
    const { action, table, data, user_id } = await context.request.json();

    const headers = {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
    };

    let response;

    if (action === "upsert") {
      // Upsert — insert or update
      response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(data),
      });
    } else if (action === "select") {
      response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?user_id=eq.${user_id}&select=*`, {
        method: "GET",
        headers,
      });
    } else if (action === "setup") {
      // Tabellen anlegen via SQL
      response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/setup_verena_os`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
    }

    const result = await response.json();
    return new Response(JSON.stringify({ ok: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
