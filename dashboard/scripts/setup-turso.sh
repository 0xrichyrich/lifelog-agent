#!/bin/bash
# Setup Turso database for Nudge/LifeLog

set -e

echo "🐢 Turso Database Setup for Nudge"
echo "=================================="

# Check if turso is installed
if ! command -v turso &> /dev/null; then
    echo "Installing Turso CLI..."
    curl -sSfL https://get.tur.so/install.sh | bash
    source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null || true
fi

# Check if logged in
if ! turso auth whoami &> /dev/null; then
    echo ""
    echo "Please login to Turso:"
    turso auth login
fi

echo ""
echo "Creating database 'nudge-prod'..."
turso db create nudge-prod --location ord 2>/dev/null || echo "Database may already exist"

echo ""
echo "Getting database URL..."
DB_URL=$(turso db show nudge-prod --url)
echo "Database URL: $DB_URL"

echo ""
echo "Creating auth token..."
AUTH_TOKEN=$(turso db tokens create nudge-prod)

echo ""
echo "=========================================="
echo "✅ Turso database created successfully!"
echo ""
echo "Add these environment variables to Vercel:"
echo ""
echo "TURSO_DATABASE_URL=$DB_URL"
echo "TURSO_AUTH_TOKEN=$AUTH_TOKEN"
echo ""
echo "Commands to add to Vercel:"
echo ""
echo "echo -n \"$DB_URL\" | npx vercel env add TURSO_DATABASE_URL production --token=\$VERCEL_TOKEN"
echo "echo -n \"$AUTH_TOKEN\" | npx vercel env add TURSO_AUTH_TOKEN production --token=\$VERCEL_TOKEN"
echo ""
echo "Or add them in the Vercel dashboard: https://vercel.com/richyrichs-projects/dashboard/settings/environment-variables"
echo "=========================================="
