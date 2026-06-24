# TideNote

**An infinite space for your thoughts.**  
Block-based note editor and infinite canvas whiteboard — combined in one modern app.

**Web:** [tidenote-22fde.web.app](https://tidenote-22fde.web.app)

---

## Features

**Block Editor**  
Notion-style editor with slash commands, drag & drop blocks, headings, lists, checklists, code blocks, tables, callouts and more.

**Infinite Canvas**  
Excalidraw-powered whiteboard with a custom draggable toolbar that snaps to any screen edge.

**Cloud Sync**  
Real-time synchronization across all devices via Firebase Firestore.

**Organization**  
Tags, favorites, archive, full-text search, sorting, note templates, journal mode.

**Export**  
Markdown, PNG, JPG, PDF, SVG, Word (.docx) — with free and premium tiers.

**Multilingual**  
Turkish and English with automatic browser language detection.

---

## Platforms

| Platform | Status |
|---|---|
| Web | Live |
| Windows | Electron (.exe) |
| Android | Capacitor (in testing) |
| iOS / macOS | Coming soon |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Block Editor | BlockNote |
| Canvas | Excalidraw |
| State | Zustand |
| Backend | Firebase (Firestore + Auth) |
| Mobile | Capacitor |
| Desktop | Electron |
| Hosting | Firebase Hosting |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/Labryse/tidenote.git
cd tidenote
npm install
```

### Environment

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Development

```bash
# Web
npm run dev

# Desktop (Electron)
npm run electron:dev
```

### Build

```bash
# Web — deploy to Firebase Hosting
npm run build
firebase deploy --only hosting

# Windows installer
npm run electron:build:win

# Android — requires Android Studio
npm run build:android
```

---

## Pricing

| | Free | Premium |
|---|---|---|
| Price | $0 | $2.99 / month |
| Storage | 1 GB | 10 GB |
| Notes & canvases | Unlimited | Unlimited |
| PNG export | White/black bg | + Transparent |
| PDF export | First 3 pages | Unlimited |
| SVG export | — | Included |
| Word (.docx) | — | Included |

---

## Project Structure

```
tidenote/
├── electron/           # Electron main process
│   ├── main.cjs
│   └── preload.cjs
├── public/             # Static assets
├── src/
│   ├── components/     # UI components
│   ├── lib/            # Firebase, utilities
│   ├── pages/          # Route pages
│   ├── store/          # Zustand store
│   └── i18n/           # Translations (TR / EN)
├── capacitor.config.ts
├── firebase.json
└── vite.config.ts
```

---

## Legal

[Privacy Policy](https://tidenote-22fde.web.app/#/privacy) · [Terms of Service](https://tidenote-22fde.web.app/#/terms)

---

## Contact

ulkartal@gmail.com
