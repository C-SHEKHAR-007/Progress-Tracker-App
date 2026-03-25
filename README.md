# Progress Tracker Mobile

A React Native mobile app for tracking your learning progress with videos and PDFs. Built with Expo and SQLite for fully offline, local-first data storage.

## Features

- 📱 **Local-first**: All data stored on device using SQLite
- 🎥 **Video Player**: Full-featured player with progress tracking, seek, fullscreen
- 📄 **PDF Viewer**: Read PDFs with completion tracking
- 📁 **Collections**: Organize content into customizable collections
- 📊 **Progress Tracking**: Track progress, resume where you left off
- 🔍 **Search & Filter**: Find content quickly
- 🌙 **Dark Theme**: Easy on the eyes

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React Native + Expo                                    │
├─────────────────────────────────────────────────────────┤
│  Navigation (React Navigation)                          │
│           ↓                                             │
│  Context (ItemsContext - state management)              │
│           ↓                                             │
│  Services                                               │
│  ├── database.js (SQLite)                               │
│  └── fileService.js (expo-file-system)                  │
│           ↓                                             │
│  Device Storage (SQLite DB + Local Files)               │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── FilterChips.js
│   ├── ItemCard.js
│   ├── PDFViewer.js
│   └── StatsCard.js
├── context/             # React Context for state
│   ├── DatabaseContext.js
│   └── ItemsContext.js
├── navigation/          # Navigation configuration
│   └── AppNavigator.js
├── screens/             # Screen components
│   ├── AddFiles.js
│   ├── CollectionDetail.js
│   ├── Collections.js
│   ├── Dashboard.js
│   ├── Library.js
│   ├── Manage.js
│   └── Player.js
└── services/            # Business logic
    ├── database.js      # SQLite operations
    └── fileService.js   # File picking & management
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Navigate to project
cd Progress-app-mobile

# Install dependencies
npm install

# Start Expo
npm start
```

### Running on Device

```bash
# iOS
npm run ios

# Android
npm run android
```

## Key Technologies

| Technology | Purpose |
|------------|---------|
| Expo | Development framework |
| expo-sqlite | Local database |
| expo-file-system | File access |
| expo-document-picker | File selection |
| expo-av | Video playback |
| React Navigation | Navigation |
| Ionicons | Icons |

## Data Flow

### Adding Files
1. User picks files via `expo-document-picker`
2. File metadata extracted by `fileService.js`
3. Metadata saved to SQLite via `database.js`
4. UI updates via `ItemsContext`

### Playing Content
1. User taps item in Library/Dashboard
2. Navigate to Player screen with item data
3. Load file from device URI
4. Track progress, save to SQLite periodically
5. Resume from `last_position` on next open

## Comparison with Web App

| Feature | Web App | Mobile App |
|---------|---------|------------|
| Database | PostgreSQL (server) | SQLite (device) |
| File Storage | Server filesystem | Device storage |
| File Access | HTTP streaming | Direct file URI |
| Offline | ❌ Requires server | ✅ Fully offline |
| Cross-device sync | ✅ Via server | ❌ Local only |

## Future Enhancements

- [ ] Cloud sync (optional)
- [ ] Background downloads
- [ ] Video thumbnails
- [ ] Playlist support
- [ ] Notes per item
- [ ] Export/import data

## License

MIT
