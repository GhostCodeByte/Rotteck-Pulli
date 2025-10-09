# Rotteck Pulli Shop

Eine React/Vite Single-Page-Anwendung für den Verkauf des Rotteck-Pullis. Der Warenkorb läuft vollständig im Browser, bis der Nutzer auf „Kaufen“ klickt. Anschließend werden die Bestellinformationen über eine Vercel-Serverless-Funktion sicher in einer Supabase-Datenbank gespeichert und es wird ein eindeutiger Bestellcode erzeugt.

## Features

- Moderne Produktansicht mit Varianten (Farben, Größen) und Warenkorb-Verwaltung im Local Storage.
- Checkout-Flow mit E-Mail-Eingabe und serverseitiger Validierung.
- Supabase-Integration über eine geschützte API-Funktion (`/api/create-order`), die den Service-Role-Key nutzt und einen Hash-basierten Bestellcode erzeugt.
- Vollständig konfigurierbar über Umgebungsvariablen – keine geheimen Schlüssel im Browser.

## Voraussetzungen

- Node.js ≥ 18
- npm (im Repository bereits verwendet)
- Supabase-Projekt
- Optional: Vercel-Account für das Hosting

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Die Anwendung ist anschließend unter [http://localhost:5173](http://localhost:5173) erreichbar.

Für einen Produktions-Build:

```bash
npm run build
npm run preview
```

## Umgebungsvariablen

| Variable | Kontext | Beschreibung |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Client (Vite) | Supabase Projekt-URL. |
| `VITE_SUPABASE_ANON_KEY` | Client (Vite) | Public Anon Key für Lesezugriffe. |
| `SUPABASE_URL` | Serverless Funktion | Supabase Projekt-URL (identisch zur Client-URL). |
| `SUPABASE_SERVICE_ROLE_KEY` | Serverless Funktion | Service Role Key für Schreibzugriffe – **nur** auf dem Server speichern! |

### `.env.local` (lokal)

```bash
VITE_SUPABASE_URL=<deine-supabase-url>
VITE_SUPABASE_ANON_KEY=<dein-anon-key>
```

### Vercel (Production/Staging)

Im Vercel-Dashboard unter *Settings → Environment Variables* hinterlegen:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

> Tipp: `SUPABASE_SERVICE_ROLE_KEY` niemals im Client ausliefern. Er gehört ausschließlich in die Serverless-Funktion.

## Supabase Setup

1. **Tabelle anlegen** (`orders`):

   ```sql
   create table if not exists orders (
     id uuid primary key default gen_random_uuid(),
     created_at timestamp with time zone default now(),
     email text not null,
     items jsonb not null,
     order_hash text not null unique,
     status text not null default 'pending'
   );
   ```

2. **Row Level Security aktivieren** und Regeln nach Bedarf definieren (z. B. nur für Service-Role Inserts zulassen). Bei ausschließlich serverseitigen Zugriffen kann auch komplett auf RLS verzichtet werden.

3. **Service Role Key** aus dem Supabase-Dashboard kopieren und als `SUPABASE_SERVICE_ROLE_KEY` bei Vercel hinterlegen.

4. Optional: E-Mail- oder Storage-Policies ergänzen, wenn zukünftige Features darauf aufbauen.

## API: `/api/create-order`

- Erwartet `POST` mit JSON `{ email: string, items: Array<{ product, color, size, quantity, studentName }> }`.
- Validiert E-Mail-Adresse und Produkte, cappt Menge auf 30 pro Eintrag und maximal 50 Einträge.
- Schreibt die Bestellung in Supabase und gibt `{ orderCode, createdAt }` zurück. Der `orderCode` ist ein Hash (12-stellig, Großbuchstaben), den Nutzer bei der Überweisung angeben sollen.
- Liefert aussagekräftige Fehlermeldungen und HTTP-Statuscodes (400 für ungültige Daten, 500 bei Serverfehlern).

### Manuell testen (optional)

```bash
curl -X POST http://localhost:3000/api/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "email": "max@example.com",
    "items": [
      { "color": "rot", "size": "L", "quantity": 2, "studentName": "Max" }
    ]
  }'
```

> Hinweis: Bei lokalem Vite-Entwicklungsserver ohne Vercel-Adapter kann die Funktion auch über ein separates Node-Skript oder mit `vercel dev` getestet werden.

## Sicherheit & Datenfluss

1. Warenkorb, Schülernamen und E-Mail leben bis zum Kauf ausschließlich im Browser (Local Storage).
2. Erst beim Klick auf „Kaufen“ sendet der Client die Daten an `/api/create-order`.
3. Die Serverless-Funktion nutzt den Service-Role-Key, validiert alle Felder und schreibt in Supabase.
4. Der generierte Bestellcode wird sofort an den Client zurückgegeben und zusätzlich in Supabase gespeichert.
5. Dank getrenntem Client-/Server-Setup bleiben alle sensiblen Informationen (Keys, Backoffice-Status) serverseitig geschützt.

## Nächste Schritte / Ideen

- Admin-Oberfläche zum Abhaken eingegangener Überweisungen (Filter per `order_hash`).
- Automatisierte E-Mail-Benachrichtigung über Supabase Functions oder Resend.
- Export (CSV/Excel) für die Schulverwaltung.

Viel Spaß beim Anpassen und Erweitern! 🚀
