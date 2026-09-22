# Supabase sicher einrichten – Schritt für Schritt

Der Client und die gehärtete Backend-Schicht sind vorbereitet. Für Produktion müssen Projekt, Auth-Einstellungen, Verträge und Secrets bewusst konfiguriert werden.

## 1. Projekt anlegen
1. https://supabase.com → **New project**, Region Frankfurt (eu-central-1), starkes DB-Passwort notieren.
2. Unter **Project Settings → API** die Werte `Project URL` und `anon public key` kopieren.

## 2. Datenbank einspielen
Mit der Supabase-CLI (`npm i -g supabase`):
```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push                 # alle Migrationen in Reihenfolge
npm run supabase:seed            # erzeugt supabase/seed.sql aus src/config
supabase db query < supabase/seed.sql
```
Alternativ alle SQL-Dateien aus `migrations/` in aufsteigender Reihenfolge im **SQL Editor** ausführen.

## 3. Edge Functions deployen
```bash
supabase functions deploy submit-session
supabase functions deploy delete-account
supabase functions deploy export-account
supabase functions deploy feedback
RATE_LIMIT_SALT="$(openssl rand -hex 32)"
supabase secrets set ADMIN_EMAIL=deine@mail.de ALLOWED_ORIGINS=https://deine-domain.example RATE_LIMIT_SALT="$RATE_LIMIT_SALT"
# optional für Mailversand: supabase secrets set RESEND_API_KEY=re_... SENDER_EMAIL=mail@deine-domain.example
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` stehen den Functions automatisch zur Verfügung.

## 4. Auth konfigurieren
**Authentication → URL Configuration**
- Site URL: `https://tqnoomaxx.github.io/GeographieWebsite/`
- Redirect URLs: `https://tqnoomaxx.github.io/GeographieWebsite/**`, `http://localhost:5173/**`

**Authentication → Providers → Email**
- „Confirm email“ und „Secure password change“ aktivieren.
- Mindestlänge 12 Zeichen und die stärkste Zeichenanforderung wählen.
- Schutz vor kompromittierten Passwörtern aktivieren, sofern der Tarif ihn unterstützt.
- Eigenen SMTP-Anbieter mit SPF, DKIM und DMARC verwenden; keine Produktionsmails über den Testversand schicken.

**Authentication → Sessions**
- JWT-Laufzeit: 15 Minuten.
- Session-Timebox: 7 Tage, Inaktivitätslimit: 24 Stunden.
- Refresh-Token-Rotation aktiv lassen. Für besonders sensible Installationen zusätzlich nur eine Sitzung pro Nutzer erlauben.

**Authentication → Multi-Factor Authentication**
- TOTP Enrollment und Verification aktivieren. Die App erzwingt anschließend AAL2 für alle Nutzer, die einen Faktor hinterlegt haben.

**Authentication → Bot and Abuse Protection**
- Auth-Rate-Limits prüfen und CAPTCHA für Anmeldung, Registrierung und Passwort-Reset aktivieren. CAPTCHA benötigt einen projektspezifischen Site-Key im Frontend und darf erst produktiv aktiviert werden, wenn dieser UI-Schritt ergänzt wurde.

Die lokale `config.toml` bildet Passwort-, Token-, Sitzungs-, MFA- und Rate-Limit-Werte bereits ab. Gehostete Einstellungen nach Änderungen mit `supabase config push` beziehungsweise im Dashboard abgleichen.

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

Für ein öffentliches Deployment zusätzlich `VITE_SUPABASE_REGION` und `VITE_SUPABASE_DPA_URL` dokumentieren. Mit Supabase einen Auftragsverarbeitungsvertrag abschließen, die ausgewählte EU-Region und Unterauftragsverarbeiter prüfen und `ALLOWED_ORIGINS` exakt auf die veröffentlichte HTTPS-Domain begrenzen. Mehrere erlaubte Ursprünge werden kommasepariert angegeben. `RATE_LIMIT_SALT` muss zufällig und geheim bleiben; niemals als `VITE_`-Variable setzen.

## 7. Verbindliche Produktionsprüfung

- `supabase db lint --linked` und der Security Advisor melden keine offenen RLS-/Function-Probleme.
- Service-Role-Key und Rate-Limit-Salt liegen nur in Supabase-Secrets; im Frontend steht ausschließlich der Publishable-/Anon-Key.
- Point-in-Time-Recovery beziehungsweise regelmäßige verschlüsselte Backups sind aktiviert und eine Wiederherstellung wurde getestet.
- Auth- und Function-Logs haben eine begrenzte, dokumentierte Aufbewahrung; Warnungen für ungewöhnliche Fehlerraten sind aktiv.
- DPA, EU-Projektregion, Datenschutzerklärung, Kontaktadresse und Lösch-/Exportfluss wurden mit der tatsächlichen Produktionskonfiguration abgeglichen.
- Die veröffentlichende Plattform setzt die Header aus `public/_headers`. GitHub Pages ignoriert diese Datei; dort schützt nur die CSP-Meta-Regel. Für vollständige HSTS-, Frame- und Permissions-Policy-Header ist ein vorgeschalteter CDN/Host mit Header-Unterstützung erforderlich.

## Was dann passiert
- Ohne Variablen: App läuft als Gast, Login-Seite zeigt einen Hinweis.
- Mit Variablen: Registrierung, Login, Magic Link, Passwort-Reset, TOTP-MFA, Kontodatenexport, Kontoseite mit „Fortschritt übernehmen“ (Gast → Account), öffentliches Profil `/u/<name>`, bestätigte Account-Löschung über Edge Function.
- XP, Achievements und Quests werden für eingeloggte Nutzer serverseitig in `submit-session` berechnet.
