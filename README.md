# Chunk Listening Lab

Mobile-first PWA dạy English chunks (cụm từ tái sử dụng) cho frontend dev Việt — Spotify-style listening + Quizlet-inspired study modes.

## Tech stack

- **Vue 3** (Composition API) + **Vite** + **TypeScript**
- **Pinia** state management
- **Vue Router** (hash history cho GitHub Pages)
- **Tailwind CSS v4** (CSS-first config qua `@theme`)
- **vite-plugin-pwa** cho PWA + offline cache
- **IndexedDB** (qua `idb`) cho logs/progress/custom chunks
- **localStorage** cho settings nhỏ
- **Web Speech API** (`speechSynthesis`) cho TTS — không cần MP3 thật ở MVP

Local-first, không backend, anonymous.

## Quick start

```bash
npm install
npm run dev
```

## Build & deploy

```bash
npm run typecheck   # vue-tsc only
npm run build       # vue-tsc + vite build → dist/
npm run preview     # local preview dist/
```

Deploy tự động qua GitHub Actions khi push lên `main`. Xem `.github/workflows/deploy.yml`.

Production URL format: `https://lftrinn.github.io/Study-English/#/`

## Structure

```
src/
├── assets/styles/    # main.css + tokens (Tailwind v4 @theme)
├── data/             # static chunk packs (JSON)
├── types/            # TS type models
├── stores/           # Pinia stores
├── services/         # speech, playlist, storage, log, review, answer-check
├── components/       # common, chunk, player, practice, layout
├── views/            # route views
├── router/           # Vue Router setup (hash mode)
├── App.vue
└── main.ts
```

## Design reference

Spec đầy đủ ở `../Design/design_handoff_chunk_listening_lab/README.md`. JSX prototype trong cùng folder chỉ là design reference — production code chạy theo cấu trúc Vue trên.
