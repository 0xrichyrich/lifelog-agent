# LifeLog iOS App

Native iOS app for the LifeLog personal life logging system. Built with SwiftUI for iOS 17+.

## Features

### 🗒️ Quick Check-ins
- Large text field for quick thoughts
- Voice note recording (with Whisper transcription)
- Camera button for workspace snapshots
- Haptic feedback on actions
- View recent check-ins history

### 📅 Timeline View
- Today's activities displayed in hour blocks
- Color-coded categories:
  - 🟢 Green = Focus/Deep Work
  - 🟡 Yellow = Collaboration/Meetings
  - 🔴 Red = Distractions
  - ⚫ Gray = Breaks/Idle
- Tap blocks to see details
- Pull to refresh

### 🎯 Goals Tracking
- Goal cards with progress bars
- 🔥 Streak counters for active goals
- Daily/Weekly/Monthly goal types
- Visual progress indicators

### 📱 Home Screen Widgets (WidgetKit)
- **Medium Widget**: Focus time, goals completed, streak count
- **Lock Screen Widget (Circular)**: Streak counter with fire emoji
- Updates every 15 minutes

### ⚙️ Settings
- API endpoint configuration
- Notification preferences
- Privacy controls (screenshots, audio, camera)
- Data export

## Requirements

- iOS 17.0+
- Xcode 16.0+
- Swift 6.0

## Setup

1. **Open the project in Xcode:**
   ```bash
   cd ios-app
   open LifeLog.xcodeproj
   ```

2. **Configure signing:**
   - Select the LifeLog target
   - Go to Signing & Capabilities
   - Select your development team
   - Xcode will automatically manage signing

3. **Set up App Groups (for widgets):**
   - The app uses `group.com.skynet.lifelog` for shared data
   - This is already configured in the entitlements files

4. **Run the app:**
   - Select iPhone 15 Pro simulator (or your device)
   - Press ⌘R to build and run

## API Configuration

By default, the app connects to `http://localhost:3000`. To change this:

1. Open the app
2. Go to Settings tab
3. Update the API Endpoint field
4. Tap "Test Connection" to verify

### Required API Endpoints

The app expects these endpoints from the LifeLog dashboard:

- `GET /api/activities?date=YYYY-MM-DD` - Fetch activities for a date
- `GET /api/goals` - Fetch all goals
- `GET /api/checkins?limit=N` - Fetch recent check-ins
- `POST /api/checkins` - Create a new check-in
  - Body: `{ "message": "string", "timestamp": "ISO8601" }`

## Architecture

```
LifeLog/
├── LifeLogApp.swift         # App entry point
├── ContentView.swift        # Tab-based navigation
├── Models/
│   ├── AppState.swift       # @Observable app state
│   └── Models.swift         # Data models (Activity, Goal, CheckIn)
├── Views/
│   ├── CheckInView.swift    # Home screen - check-in flow
│   ├── TimelineView.swift   # Daily timeline visualization
│   ├── GoalsView.swift      # Goal tracking
│   └── SettingsView.swift   # App settings
├── Services/
│   └── APIClient.swift      # REST API client
└── Assets.xcassets/         # App icons and colors

LifeLogWidget/
├── LifeLogWidget.swift      # Widget extension
└── WidgetAssets.xcassets/   # Widget colors
```

## Theme Colors

The app uses a dark theme matching the web dashboard:

- Background: `#0a0a0a`
- Card Background: `#1a1a1a`
- Text: `#e5e5e5`
- Accent (Blue): `#3b82f6`
- Success (Green): `#10b981`
- Warning (Yellow): `#f59e0b`
- Danger (Red): `#ef4444`

## Testing

### Simulator Testing
1. Build and run on iPhone 15 Pro simulator
2. Test check-in flow: type message → tap "Log It"
3. Test voice recording (mic button)
4. Verify timeline loads and displays correctly
5. Check goals view shows progress bars

### Widget Testing
1. Build and run the app
2. Go to Home screen
3. Long press → tap "+" → search "LifeLog"
4. Add medium widget and lock screen widget
5. Verify they display data from the app

### Offline Mode
1. Stop the API server (or use airplane mode)
2. Verify app loads gracefully with cached/mock data
3. Verify check-ins queue locally (future enhancement)

## Known Limitations

- Voice transcription requires OpenAI Whisper API key (not yet integrated in UI)
- Camera captures save to check-in metadata but don't upload yet
- Widget data shares via App Groups (requires both targets signed with same team)

## Future Enhancements

- [ ] Whisper API key management in Settings
- [ ] Image upload for camera snapshots
- [ ] Push notifications from coaching system
- [ ] Apple Watch companion app
- [ ] Offline queue for check-ins
- [ ] Health kit integration

## License

Part of the LifeLog Agent project for the Moltiverse Hackathon.
