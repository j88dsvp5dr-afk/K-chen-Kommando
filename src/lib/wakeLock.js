// Wake Lock — Bildschirm bleibt an (z.B. beim Einkaufen)
export async function requestWakeLock(ref) {
  if ("wakeLock" in navigator) {
    try { ref.current = await navigator.wakeLock.request("screen"); } catch {}
  }
}

export function releaseWakeLock(ref) {
  try { if (ref.current) { ref.current.release(); ref.current = null; } } catch {}
}
