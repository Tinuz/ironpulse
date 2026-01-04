# Google OAuth Setup voor IronPulse

## 1. Supabase Dashboard Configuratie

1. Ga naar je Supabase project dashboard: https://app.supabase.com
2. Navigeer naar **Authentication** > **Providers**
3. Zoek **Google** in de lijst en klik erop
4. Enable **Google enabled**

## 2. Google Cloud Console Setup

1. Ga naar [Google Cloud Console](https://console.cloud.google.com)
2. Maak een nieuw project of selecteer bestaand project
3. Navigeer naar **APIs & Services** > **Credentials**
4. Klik **Create Credentials** > **OAuth 2.0 Client ID**
5. Kies **Application type**: Web application
6. Voeg toe onder **Authorized redirect URIs**:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   (Vervang `<your-project-ref>` met je Supabase project ref - te vinden in Supabase dashboard URL)

7. Klik **Create**
8. Kopieer de **Client ID** en **Client Secret**

## 3. Terug naar Supabase

1. Plak de **Client ID** in het Google provider formulier
2. Plak de **Client Secret** 
3. Klik **Save**

## 4. Database Migraties Uitvoeren

Voer de volgende SQL uit in Supabase SQL Editor:

### Migration 002: Row Level Security

```sql
-- Run het bestand: supabase/migrations/002_rls_policies.sql
```

Dit zorgt ervoor dat:
- Elke user alleen zijn/haar eigen data kan zien
- Data is beveiligd op database niveau
- Auth.uid() wordt gebruikt voor user identificatie

## 5. Test de Login

1. Start de development server: `npm run dev`
2. Bezoek `http://localhost:3000`
3. Je zou automatisch naar de login pagina moeten gaan
4. Klik op "Inloggen met Google"
5. Log in met je Google account
6. Je wordt teruggestuurd naar de app

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Controleer of de redirect URI in Google Cloud Console exact matcht met je Supabase callback URL
- Zorg ervoor dat er geen trailing slash is

### "Invalid credentials"
- Dubbelcheck Client ID en Secret in Supabase dashboard
- Kopieer ze opnieuw van Google Cloud Console

### Login werkt maar data wordt niet geladen
- Controleer of Row Level Security policies zijn toegepast
- Check browser console voor errors
- Verifieer dat user_id columns bestaan in alle tabellen

## Environment Variables

Zorg ervoor dat je `.env.local` het volgende bevat:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_OPENROUTER_API_KEY=<your-openrouter-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Voor productie, pas `NEXT_PUBLIC_APP_URL` aan naar je deployed URL.
