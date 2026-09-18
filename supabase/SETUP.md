# Supabase einrichten (Phase 2) – Schritt für Schritt

Der gesamte Client-Code ist fertig. Es fehlt nur ein Supabase-Projekt und vier Umgebungsvariablen.

## 1. Projekt anlegen
1. https://supabase.com → **New project**, Region Frankfurt (eu-central-1), starkes DB-Passwort notieren.
2. Unter **Project Settings → API** die Werte `Project URL` und `anon public key` kopieren.

## 2. Datenbank einspielen
Mit der Supabase-CLI (`npm i -g supabase`):
```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push                 # migrations/0001_schema.sql + 0002_rls.sql
npm run supabase:seed            # erzeugt supabase/seed.sql aus src/config
supabase db query < supabase/seed.sql
```
Alternativ die drei SQL-Dateien nacheinander im **SQL Editor** ausführen.

## 3. Edge Functions deployen
```bash
supabase functions deploy submit-session
supabase functions deploy delete-account
supabase functions deploy feedback
supabase secrets set ADMIN_EMAIL=deine@mail.de ALLOWED_ORIGIN=https://tqnoomaxx.github.io
# optional für Mailversand: supabase secrets set RESEND_API_KEY=re_...
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` stehen den Functions automatisch zur Verfügung.

## 4. Auth konfigurieren
**Authentication → URL Configuration**
- Site URL: `https://tqnoomaxx.github.io/GeographieWebsite/`
- Redirect URLs: `https://tqnoomaxx.github.io/GeographieWebsite/**`, `http://localhost:5173/**`

**Authentication → Providers → Email**: „Confirm email“ an lassen (die App zeigt den Hinweis). Magic Link ist automatisch aktiv.

## 5. Admin-Nutzer
Nach der ersten Registrierung im SQL Editor:
```sql
insert into public.admin_users (user_id) select id from auth.users where email = 'deine@mail.de';
```

## 6. Frontend verbinden
Lokal: `.env` mit
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```
GitHub Pages: **Settings → Secrets and variables → Actions → Variables** `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` anlegen. Der Workflow liest sie beim Build. Der anon key ist für den Client bestimmt; Sicherheit kommt aus RLS und den Edge Functions.

## Was dann passiert
- Ohne Variablen: App läuft als Gast, Login-Seite zeigt einen Hinweis.
- Mit Variablen: Registrierung, Login, Magic Link, Passwort-Reset, Kontoseite mit „Fortschritt übernehmen“ (Gast → Account), öffentliches Profil `/u/<name>`, Account-Löschung über Edge Function.
- XP, Achievements und Quests werden für eingeloggte Nutzer serverseitig in `submit-session` berechnet.
