Deployment checklist — MLSC registration app

This file contains minimal, actionable steps to prepare and run the app in a development or production environment.

1. Create and populate your `.env`

- Copy the example file and edit it with real secrets (do NOT commit `.env`):

  Copy-Item .env.example .env

  # then open and edit .env with your values

- Required/important vars (examples in `.env.example`):
  - `MONGODB_URI` — your MongoDB connection string (production credentials + TLS as needed)
  - `SESSION_SECRET` — long random string (keep private)
  - `SESSION_COOKIE_SECURE` — set to `true` when serving over HTTPS
  - `DISCORD_INVITE` — invite link used across UI and emails
  - Google Sheets service account: provide `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_FILE` or `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` and `GOOGLE_SHEET_ID`
  - SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`

2. Install dependencies

npm install

3. Build CSS (production)

- Local development (watch):

  npm run dev:css

- Production build (single-step minified CSS):

  npm run build:css

4. Run app

- Development (auto-reload with nodemon):

  npm run dev

- Production:

  NODE_ENV=production npm start

  # or when using PowerShell set env then run

  $env:NODE_ENV='production'; npm start

5. Seed admin (one-time, optional)

- Use the production admin seeder script with environment variables for security:

  npm run seed:admin

- Or manually with environment variable:

  ADMIN_PASSWORD=YourSecurePassword node scripts/seed-production-admin.js

6. Google Sheets and email

- Make sure the service account has Sheets API access and the spreadsheet is shared with the service account email if required.
- Provide SMTP credentials in `.env` for confirmation emails to work.

7. Production suggestions

- Run behind a reverse proxy (NGINX, Caddy) or a platform (Heroku, Render, Fly.io) with HTTPS.
- When using HTTPS, set `SESSION_COOKIE_SECURE=true` so cookies are only sent over secure connections.
- Use a persistent session store (Redis or MongoStore) for multi-instance deployments.
- Use cloud secret managers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, or GitHub Actions secrets) rather than storing production secrets in files on disk.

8. Safety reminders

- `.env` is listed in `.gitignore`. Do not commit real secrets.
- Rotate and protect any leaked credentials immediately.

If you want, I can add a simple startup validation that warns and exits if critical production env vars are missing (e.g., `NODE_ENV=production` and missing `SESSION_SECRET` or `MONGODB_URI`). Would you like me to add that next?
