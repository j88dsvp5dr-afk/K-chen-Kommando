# Küchen-Kommando (Verena OS)

Familien-Operator als Web-App (React + Vite), gehostet auf **Cloudflare Pages**.

## Lokal starten

```bash
npm install
npm run dev
```

## Struktur

```
src/
  main.jsx            Einstieg + Service Worker
  App.jsx             Haupt-App (State, Sync, Navigation)
  screens/            Ein Screen pro Tab (Home, Kueche, KI, Kinder, Master, Termine)
  components/         Wiederverwendbare Teile (Navigation, Backup, Modus, ...)
  lib/                KI (claude.js), Supabase, Speicher, Theme, KI-Memory
  data/vorlagen.js    Startvorlagen + Kalender-Import
functions/            Cloudflare Pages Functions (/claude = KI-Proxy)
public/               Icons, Manifest, Service Worker
```

## Veröffentlichen auf Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Repo `K-chen-Kommando`, Branch `main`
3. Build-Einstellungen:
   - Framework preset: **Vite** (oder „None“)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **Settings → Variables and Secrets**: `REACT_APP_ANTHROPIC_KEY` = Anthropic-API-Key (als *Secret*)
5. Deploy. Jeder Push auf `main` geht danach automatisch live.
