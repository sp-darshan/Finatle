# Finatle Deployment

Deploy the `client` folder to Vercel and the `server` folder to Render. The database can remain in Supabase or another PostgreSQL provider.

## Render API

Create a Web Service from this repository with:

- Root Directory: `server`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

Set these environment variables in Render:

```text
DATABASE_URL=your_transaction_pooler_connection_string
DIRECT_URL=your_direct_postgres_connection_string
JWT_SECRET=a_long_random_production_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-app.vercel.app
APP_URL=https://your-api.onrender.com
GEMINI_API_KEY=your_gemini_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notify.projects@gmail.com
SMTP_PASS=your_16_char_google_app_password
SMTP_FROM=Finatle Reminders <notify.projects@gmail.com>
```

After deployment, verify `https://your-api.onrender.com/api/health` returns JSON with `status: "online"`.

## Vercel client

Import the same repository into Vercel and set:

- Root Directory: `client`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Add this Vercel environment variable for Production (and Preview if needed):

```text
VITE_API_URL=https://your-api.onrender.com
```

Redeploy after adding the variable. Replace the placeholder in Render's `CLIENT_URL` with the final Vercel domain, including `https://` and without a trailing slash.

The local Vite proxy remains available for development, so local `.env` files can use `VITE_API_URL=http://localhost:5000`.