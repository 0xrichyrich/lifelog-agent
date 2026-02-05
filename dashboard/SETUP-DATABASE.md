# Database Setup for Nudge

Nudge uses [Turso](https://turso.tech) (SQLite on the edge) for persistent storage on Vercel.

## Quick Setup

### 1. Create a Turso Account

Go to [turso.tech/app](https://turso.tech/app) and sign up with GitHub or Google.

### 2. Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### 3. Login

```bash
turso auth login
```

### 4. Create Database

```bash
# Create database in Chicago (ord) for low latency to Vercel
turso db create nudge-prod --location ord
```

### 5. Get Credentials

```bash
# Get database URL
turso db show nudge-prod --url
# Output: libsql://nudge-prod-yourusername.turso.io

# Create auth token
turso db tokens create nudge-prod
# Output: eyJhbGci... (long JWT token)
```

### 6. Add to Vercel

Option A: Via CLI
```bash
# Replace with your actual values
echo -n "libsql://nudge-prod-yourusername.turso.io" | npx vercel env add TURSO_DATABASE_URL production
echo -n "your-token-here" | npx vercel env add TURSO_AUTH_TOKEN production
```

Option B: Via Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/richyrichs-projects/dashboard/settings/environment-variables)
2. Add `TURSO_DATABASE_URL` = your database URL
3. Add `TURSO_AUTH_TOKEN` = your auth token
4. Click "Save"

### 7. Redeploy

Push any commit to trigger a redeploy, or:
```bash
npx vercel --prod
```

## Verify Setup

Test the API:
```bash
# Create a check-in
curl -X POST https://www.littlenudge.app/api/checkins \
  -H "Content-Type: application/json" \
  -d '{"message": "Testing persistence!", "timestamp": "2026-02-05T12:00:00Z"}'

# Fetch check-ins
curl https://www.littlenudge.app/api/checkins
```

If you see your check-in in the response, persistence is working! 🎉

## Troubleshooting

### "Database not configured" error
- Check that both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set in Vercel
- Make sure you redeployed after adding the env vars

### "TURSO_DATABASE_URL is not set"
- The env var name must be exact (case-sensitive)
- URL should start with `libsql://`

### Connection errors
- Ensure the auth token is valid (tokens can expire)
- Generate a new token: `turso db tokens create nudge-prod`

## Local Development

For local development, create `.env.local`:
```env
TURSO_DATABASE_URL=libsql://nudge-prod-yourusername.turso.io
TURSO_AUTH_TOKEN=your-token-here
```

Or use Turso's local dev server:
```bash
turso dev
# Creates a local SQLite at http://localhost:8080
```

Then set:
```env
TURSO_DATABASE_URL=http://localhost:8080
```
