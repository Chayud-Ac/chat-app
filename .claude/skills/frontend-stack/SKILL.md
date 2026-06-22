---
name: frontend-stack
description: ใช้เมื่อเขียน/แก้ component หรือ page ใน apps/frontend — encode stack เฉพาะของ repo: Next.js server-first, Tailwind v4, shadcn AI Elements, AI SDK v5. โหลดเมื่อทำงาน frontend เท่านั้น
---

# Frontend Stack (apps/frontend)

stack จริงของ AI chat app frontend — encode pattern ที่ repo นี้ใช้ (ไม่ใช่ generic)

## Stack (pinned — ดู stack-decisions.md)
- **Next.js 16** (App Router + Turbopack) — server-first
- **Tailwind CSS v4** — ใช้ `@theme` + design token, ไม่ใช่ config แบบ v3
- **shadcn/ui + AI Elements** (Vercel official) — primitive สำหรับ chat: conversation, message, code-block, reasoning, tool-call
- **AI SDK v5** (`ai`, `@ai-sdk/react`) — ใช้ UI primitive ได้ แต่ **ไม่ใช้ `useChat` สำหรับ streaming** (ดูเหตุผลข้อ 2 ด้านล่าง)
- **server state: React Query** (TanStack) — fetch history, list conversation
- **ไม่มี global client store** (Zustand/Redux) — YAGNI; chat-stream state อยู่ใน local React state, server state ที่ React Query พอ

## Pattern ที่บังคับ
1. **Server-first**: default เป็น Server Component; ใส่ `"use client"` เฉพาะที่ต้องการ interactivity/hook (เช่น component ที่อ่าน stream)
2. **streaming**: backend ส่ง SSE format **ของ repo เอง** (`ChatChunk` = `{type:"delta"|"done"|"error"}` ใน `packages/contracts/chat.ts`) ซึ่ง **ไม่ตรงกับ wire protocol ของ AI SDK `useChat`** → consume ด้วย **hand-rolled `fetch` + `ReadableStream`** (อ่าน `res.body.getReader()`, split `\n\n`, parse `data: <json>` → `ChatChunk`), **ไม่ใช้ `useChat`**. ยัง render token ทีละ chunk — อย่ารอ response เต็ม
2b. **state**: chat-stream → local React state (`useState`/`useReducer`) · server data → React Query · **อย่าเพิ่ม global store** จนกว่าจะมี client state ซับซ้อนจริง (multi-conversation switching, settings)
3. **design token**: สี/spacing ใช้ Tailwind v4 `@theme` token เท่านั้น อย่า hardcode hex ใน className
4. **AI Elements ก่อน**: ใช้ component จาก AI Elements (`<Conversation>`, `<Message>`...) ก่อนเขียน chat UI เอง
5. **type จาก contract**: request/response import จาก `packages/contracts/` ไม่ duplicate type
6. **ห้าม secret ฝั่ง client**: เรียก LLM ผ่าน backend เท่านั้น
7. **file placement (สำคัญ)**: `app/` = **routing เท่านั้น** (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`). **ห้ามวาง reusable component ลอย ๆ ใน `app/`** — shared code อยู่ root-level folders ของ frontend ไม่ใช่ใน `app/`

## โครงไฟล์ (apps/frontend — Next.js App Router convention)
```
app/                  # routing เท่านั้น
  layout.tsx          # root layout (providers wrap ที่นี่)
  page.tsx            # route '/'
  <segment>/page.tsx  # nested route
components/
  ui/                 # shadcn primitive (generated)
  ai-elements/        # AI Elements (generated)
  <feature>.tsx       # reusable component ที่เราเขียนเอง (เช่น sidebar, chat-view)
lib/                  # api client, utils, ไม่ใช่ React component
```
- component ที่ใช้เฉพาะ route เดียว + ไม่ routable → colocate ได้ด้วย **private folder** `app/<route>/_components/` (prefix `_` กัน Next ตีความเป็น route)
- provider/shell wiring (React Query, Tooltip) → `components/providers.tsx` แล้ว import ใน `app/layout.tsx`

## UI ใหม่ที่ต้องดีไซน์
ถ้าต้องสร้าง UI/หน้าใหม่ที่ต้องการ design quality → ใช้ built-in skill **frontend-design** ก่อน (กัน generic AI aesthetic) แล้วค่อย map กลับมา stack ข้างบน

## Commands
`pnpm lint` · `pnpm test` · `pnpm build`
