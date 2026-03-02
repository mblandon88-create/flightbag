# Project: FLIGHTBAG ✈️🧳
# Framework: React 19 + TypeScript + Vite + Antigravity

## 🎯 The Vision (The Vibe)
- **Identity:** A high-performance, offline-ready PDF utility ("The Digital Flightbag").
- **The Vibe:** Professional-grade aviation gear. Clean, fast, and resilient.
- **Tone:** "Mission Control." Be direct, technical, and prioritize reliability over flashy UI.

## 🛠️ Tech Stack Rails
- **Frontend:** React 19 (Functional Components + Hooks).
- **State:** Zustand (Keep stores modular and under `/src/store`).
- **Storage:** localforage (For persistence of PDF metadata/settings).
- **PDF Engine:** pdfjs-dist (Strictly follow async/await patterns for worker initialization).
- **Icons:** Lucide-React.

## 📜 Pilot's Manual (Coding Standards)
- **Strict Typing:** No `any`. Use interfaces for all data structures (especially PDF metadata).
- **State Logic:** Never put business logic in components; move it into Zustand actions.
- **PWA Ready:** Since we use `vite-plugin-pwa`, always ensure new assets are listed in the service worker manifest.
- **Styling:** Use clean CSS or Tailwind (if enabled). Prioritize high-contrast readability.

## 🚀 Mission Workflow (The Antigravity Loop)
1. **Pre-Flight:** Scan `package.json` before suggesting new dependencies.
2. **Implementation Plan:** For any new feature (e.g., "Add PDF Annotation"), generate an `implementation_plan.md` artifact first.
3. **Automated Testing:** Leverage the Antigravity browser agent to verify PDF rendering after UI changes.
4. **Walkthrough:** After every task, provide a "Flight Log" (Walkthrough) showing exactly what was modified and how to test it.

## 🧠 Memory & Reasoning
- If I say **"Trim the Payload,"** find and delete unused imports, dead code, or redundant state.
- If I say **"Vibe Check,"** evaluate if the current UI components feel consistent with "Aviation Grade" professional tools.