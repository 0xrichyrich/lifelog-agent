# LifeLog Marketing Site

Static landing page for LifeLog - the AI life coach with crypto rewards.

## Preview Locally

```bash
cd marketing
python3 -m http.server 8080
# Visit http://localhost:8080
```

Or just open `index.html` in your browser.

## Deploy

Deploy to Vercel/Netlify/GitHub Pages - it's a static HTML file with Tailwind CDN, no build step needed.

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=.

# GitHub Pages
# Just push to gh-pages branch
```

## Features

- ✅ Hero section with animated brain icon
- ✅ Feature showcase (Quick Logging, AI Insights, Token Rewards)
- ✅ How It Works (3-step flow)
- ✅ iOS app screenshots
- ✅ Token info & reward structure
- ✅ CTA sections
- ✅ Dark theme matching iOS app
- ✅ Mobile responsive
- ✅ SEO optimized

## Assets

- Screenshots: `../screenshots/` (automatically loaded)
- App icon: visible in hero section
- All styling via Tailwind CDN (no build required)
