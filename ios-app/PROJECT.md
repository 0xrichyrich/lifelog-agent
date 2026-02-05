# PROJECT.md — Nudge iOS (LifeLog)

## Overview
- **What:** AI life coach app — tracks habits, screen time, provides nudges
- **Stack:** Swift/SwiftUI, iOS 17+, ScreenTime API, Privy wallet
- **Status:** TestFlight (pending review)
- **Domain:** littlenudge.app

## Architecture
```
LifeLog/
├── Models/
│   ├── XPModels.swift      # XP/leveling system
│   └── User.swift          # User data model
├── Views/
│   ├── ContentView.swift   # Main tab view
│   ├── WalletView.swift    # Privy wallet integration
│   ├── SettingsView.swift  # App settings
│   └── XP/
│       ├── XPProgressView.swift      # Level progress bar
│       └── XPNotificationView.swift  # "+50 XP" toasts
├── Services/
│   ├── PrivyService.swift      # Wallet/auth
│   ├── ScreenTimeService.swift # Screen time tracking
│   └── XPService.swift         # XP calculations
└── Info.plist
```

## Key Files
| File | Purpose |
|------|---------|
| `ContentView.swift` | Main navigation, tab bar |
| `PrivyService.swift` | Privy SDK integration for wallets |
| `ScreenTimeService.swift` | Family Controls / Screen Time API |
| `XPService.swift` | Gamification logic |

## Patterns & Conventions
- **Colors:** Background #F8FAFB, Primary mint #10B981
- **Bundle ID:** `com.skynet.nudge`
- **URL Scheme:** `nudge://`
- **Emails:** privacy@, hello@, legal@littlenudge.app

## Known Gotchas
- ScreenTime API requires Family Controls entitlement
- Privy needs proper redirect URI configuration
- XP notifications should be non-blocking (overlay, auto-dismiss)

## Commands
```bash
# Open in Xcode
open LifeLog.xcodeproj

# Build
xcodebuild -scheme LifeLog -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

## Backend
- API: `~/Skynet/lifelog-agent/` (Python/FastAPI)
- Token: $NUDGE on Monad testnet
- Fee split: 80% agents, 20% treasury

## Hackathon
- **Moltiverse:** $200K pool, deadline Feb 9
- **Submission:** forms.moltiverse.dev/submit

## Recent Changes
- 2026-02-05: XP gamification UI (XPProgressView, XPNotificationView)
- 2026-02-04: Fee splitting contracts deployed
- 2026-02-04: Security audit A grade

## TODO
- [ ] Complete TestFlight review
- [ ] Demo video v3
- [ ] Moltiverse submission post
- [ ] Agent marketplace UI
