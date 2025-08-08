
---

# Puter Chat — Next.js + Puter.js (Docker)

A minimal-but-solid chat application that runs **locally** with **Next.js (App Router)** and the **Puter.js browser SDK**.  
No server-side API keys. Auth, AI, and storage happen **in the browser** via Puter.

- Hot-reload dev environment in **Docker** (WSL-friendly).
    
- Clean UI: **sidebar (threads)**, **header (auth + model)**, **scrollable messages**, **pill composer** pinned to the bottom.
    
- Persistence: **transcripts in `puter.fs`**, lightweight index + prefs in **`puter.kv`**.
    
- Client-only pattern: all calls to `puter` are strictly on the client.
    

---

## Table of Contents

- Quick Start
- What’s in the Box?
- Architecture
- Directory Layout
- Key Components
- Data Model
- How It Works (Auth → Chat → Persistence)
- Configuration
- Docker Notes
- Troubleshooting
- Roadmap
- License

---

## Quick Start

### Prereqs

- **Docker Desktop** installed and WSL integration enabled (if on Windows).
    
- Node/npm not required for dev (Docker handles it).
    

### Run (dev, hot reload)

```bash
docker compose up --build
# open http://localhost:3000
```

### Stop

```bash
# Ctrl+C
docker compose down
```

---

## What’s in the Box

- **Framework:** Next.js (App Router, TypeScript)
    
- **Styling:** Tailwind CSS
    
- **Runtime:** Node 20 (Alpine) in Docker
    
- **Puter SDK:** loaded via `<script src="https://js.puter.com/v2/">`
    
- **AI:** `puter.ai.chat` with live **streaming**
    
- **Auth:** `puter.auth.isSignedIn() / signIn() / signOut() / getUser()`
    
- **Storage:**
    
    - **`puter.fs`** — JSON transcripts under `/threads/<id>.json`
        
    - **`puter.kv`** — thread index, last model, last thread
        

---

## Architecture

### Core ideas

- **Browser-only SDK.** `puter` exists only on the client. We never call it during SSR.
    
- **Separation by responsibility.**
    
    - UI components (`Sidebar`, `Composer`)
        
    - Client helpers (`puter-client.ts` for safe access, `threads.ts` for persistence)
        
    - Root page orchestrates flow.
        
- **Streaming-first UX.** Chat streams token chunks into the last assistant bubble.
    

### Control flow

1. **App loads** → check `auth.isSignedIn()` → optionally show username.
    
2. **Load preferences** (last model), **thread index**, and **last-open thread** from `kv`.
    
3. **User types** → we ensure auth → send messages to `puter.ai.chat({ stream:true })`.
    
4. **Stream updates** → append text to the last assistant message as chunks arrive.
    
5. **Persist**:
    
    - Save full transcript to `fs`.
        
    - Update index (title + timestamp) in `kv`.
        
    - Save `lastThread` in `kv`.
        

---

## Directory Layout

```
my-app/
├─ Dockerfile
├─ docker-compose.yml
├─ .dockerignore
├─ next.config.ts
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx         # Loads Puter SDK via next/script
│  │  └─ page.tsx           # Main page: header + sidebar + messages + composer
│  ├─ components/
│  │  ├─ Sidebar.tsx        # Threads list / New Chat
│  │  └─ Composer.tsx       # Pill-shaped input bar (textarea + buttons)
│  └─ lib/
│     ├─ puter-client.ts    # getPuter(): wait for window.puter, client-only guard
│     └─ threads.ts         # KV/FS helpers (index, transcripts, prefs)
└─ public/
```

---

## Key Components

### `src/app/layout.tsx`

- Injects the Puter browser SDK:
    
    ```tsx
    <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
    ```
    
- Makes `window.puter` available **after** hydration.
    

### `src/lib/puter-client.ts`

- Safe access:
    
    ```ts
    export async function getPuter() {
      if (typeof window === "undefined") throw new Error("Puter is client-only");
      if ((window as any).puter) return (window as any).puter;
      await new Promise<void>((r) => {
        const check = () => ((window as any).puter ? r() : setTimeout(check, 20));
        check();
      });
      return (window as any).puter!;
    }
    ```
    

### `src/lib/threads.ts`

- **KV keys**:
    
    - `threads:index` — array of `{ id, title, updatedAt }`
        
    - `chat:lastModel` — string
        
    - `chat:lastThread` — id
        
- **FS paths**:
    
    - `/threads/<id>.json` — array of `{ role, content }`
        

### `src/components/Sidebar.tsx`

- Left rail for **New Chat** and **thread switching**.
    

### `src/components/Composer.tsx`

- Pill-shaped input with **auto-growing textarea**.
    
- Keyboard UX: **Enter** sends, **Shift+Enter** inserts newline.
    
- Buttons for attach/voice placeholders (easy to wire later).
    

### `src/app/page.tsx`

- Orchestrates auth, model select, streaming, persistence, and layout:
    
    - Header: title, **username + Sign out** (if signed in), model dropdown, **“…thinking”** indicator (clears correctly).
        
    - Main: **messages** scroll area.
        
    - Footer: **Composer** (sticky).
        

---

## Data Model

```ts
type Msg = { role: "system" | "user" | "assistant"; content: string };

type ThreadMeta = {
  id: string;        // crypto.randomUUID()
  title: string;     // derived from last user message (40 chars)
  updatedAt: number; // ms since epoch
};
```

- **Transcript file** (`/threads/<id>.json`): `Msg[]`
    
- **Threads index** (`kv: "threads:index"`): `ThreadMeta[]`
    
- **Prefs**:
    
    - `kv: "chat:lastModel"` → string
        
    - `kv: "chat:lastThread"` → string
        

---

## How It Works (Auth → Chat → Persistence)

### Auth

- We **don’t** need server tokens. Puter handles sign-in with a popup:
    
    ```ts
    const puter = await getPuter();
    const signed = await puter.auth.isSignedIn();
    if (!signed) await puter.auth.signIn();
    const user = await puter.auth.getUser(); // username in header
    ```
    

### Chat (streaming)

```ts
const stream = await puter.ai.chat(messages, { model, stream: true });
setMessages(m => [...m, { role: "assistant", content: "" }]);

let acc = "";
for await (const part of stream) {
  acc += part?.text ?? "";
  setMessages(m => {
    const copy = [...m];
    copy[copy.length - 1] = { role: "assistant", content: acc };
    return copy;
  });
}
```

### Persistence

- After streaming finishes:
    
    ```ts
    await puter.fs.write(`/threads/${id}.json`, JSON.stringify(messages));
    const index = await listThreads(); // from kv
    // upsert/reshuffle thread meta, then:
    await writeThreadIndex(updatedIndex);
    await saveLastThread(id);
    await saveModel(model); // on change
    ```
    

---

## Configuration

No env files required for Puter. The SDK is loaded via a `<script>` tag in `layout.tsx`.

**Model selection**: controlled via dropdown in the header. We persist it in `kv` so it sticks across sessions.

If you want to force a default model, change:

```ts
const [model, setModel] = useState("claude-3-5-sonnet");
```

---

## Docker Notes

### Files

- **`.dockerignore`** keeps context small (`node_modules`, `.next`, `.git`, `.env*`).
    
- **`Dockerfile`** uses multi-stage build:
    
    - `dev` target → `npm run dev` for hot reload
        
    - `build` → `npm run build`
        
    - `prod` → `npm start` with `.next/` artifacts
        
- **`docker-compose.yml`** mounts the project directory:
    
    - `.:/app` (live edits)
        
    - `/app/node_modules` as an anonymous volume (so container deps aren’t clobbered)
        

### Commands

```bash
# Dev (hot reload)
docker compose up --build

# Rebuild clean if deps get weird
docker compose build --no-cache
docker compose up

# Logs
docker compose logs -f
```

---

## Troubleshooting

- **Docker permission denied (WSL):**
    
    ```bash
    sudo usermod -aG docker $USER
    newgrp docker
    docker ps
    ```
    
- **Compose warns `version` is obsolete:** We removed `version:` from `docker-compose.yml`. Safe to ignore if you still see it.
    
- **Hot reload not detecting changes (WSL):**
    
    - We set `CHOKIDAR_USEPOLLING=true` in the Dockerfile dev stage.
        
    - If still flaky, add `CHOKIDAR_INTERVAL=200` in `docker-compose.yml` env and re-up.
        
- **“window.puter is undefined”:** Ensure you only call `puter` inside `"use client"` components and wait with `getPuter()`.
    
- **Auth popup blocked:** Allow popups for `http://localhost:3000`.
    
- **“…thinking” stuck:** We now manage a `busy` **state** (not a ref). If you reintroduce refs for busy flags, the UI won’t update.
    

---

## Roadmap



- **Tool / Function Calling:** add `tools` to `puter.ai.chat` (e.g., `getTime`, `listFiles`) and loop on `tool_calls`.
    
- **File Attachments & Vision:** upload via `puter.fs.write`, then include `{ type: "file", puter_path }` in messages.
    
- **Markdown Rendering:** support code blocks and tables (e.g., `react-markdown` + syntax highlighting).
    
- **Thread management:** rename/delete, pin, export transcript. **Fix chat history/threads persistence, saved history in each chat, properly loads past chat when that thread is selected. etc. 
    
- **UI polish:** avatars, timestamps, system prompt editor, keyboard shortcuts, toasts.
    

---

## License

MIT 

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.






