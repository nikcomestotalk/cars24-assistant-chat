# Cars24 AI Assistant

A standalone AI chat assistant for Cars24 — helps users buy, sell, finance and manage cars. Built as a full-page ChatGPT-style experience.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at localhost:5173 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Stack

- **React** + **TypeScript**
- **Vite** (with Cloudflare Workers plugin)
- **TanStack Router** for routing
- **Tailwind CSS v4** for styling
- **shadcn/ui** component primitives
- **Bun** as package manager

## Project structure

```
src/
  components/
    chat/
      ChatPage.tsx        # Main full-page layout (sidebar + chat area)
      Sidebar.tsx         # Left nav — brand, new chat, history
      WelcomeScreen.tsx   # Landing shown when no messages
      MessageThread.tsx   # ChatGPT-style message list
      InputBar.tsx        # Bottom input with mic + send
      CarCards.tsx        # Horizontal car listing cards
      EMIWidget.tsx       # Interactive EMI calculator widget
      FollowUpChips.tsx   # Suggested follow-up buttons
      useChatStream.ts    # Chat state, history persistence (localStorage)
      mockStream.ts       # Mock streaming responses for local dev
  routes/
    index.tsx             # Root route → renders ChatPage
    __root.tsx            # HTML shell + providers
  styles.css              # Tailwind + design tokens (Cars24 brand colors)
```

## Design

- **Brand color** — Cars24 indigo (`oklch(0.48 0.27 268)`, token `cars24-red` for historical reasons)
- **Layout** — 260px sidebar (desktop) + full-width main; sidebar collapses to a slide-in drawer on mobile
- **Chat UX** — user messages as right-aligned bubbles, assistant responses as plain text with an avatar icon
