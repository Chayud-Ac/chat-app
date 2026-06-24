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

## file placement — กฎเดียวที่ขับทุกอย่าง: **shared vs. colocated**
ก่อนวาง component ทุกตัว ถามว่า *ใช้ที่เดียวหรือหลายที่?* (Next.js ไม่บังคับชื่อ folder — นี่คือ de-facto convention ของ ecosystem)

- ใช้ **≥2 route** → shared → `components/`
- ใช้ **route เดียว** + ไม่ routable → colocate ที่ `app/<route>/_components/` (prefix `_` กัน Next ตีความเป็น route)

ข้างใน `components/` แยกตาม *ชนิดของ shared thing* (ไม่ใช่ atomic design — size ไม่บอก ownership):
- `components/ui/` — primitive ใบ้ ๆ generic (Button, Input...) = **shadcn convention** (`npx shadcn add` ลงที่นี่, import ผ่าน `@/`)
- `components/ai-elements/` — AI Elements (generated) — primitive chat เฉพาะ repo นี้
- `components/common/` — composite ที่ reuse ข้าม ≥2 feature
- `components/layout/` — app shell (sidebar, topbar, brand) — chrome รอบ ๆ ที่ persist ข้าม route

## โครงไฟล์ (apps/frontend)
```
app/                  # routing เท่านั้น
  layout.tsx          # root layout (providers wrap ที่นี่)
  page.tsx            # route '/'
  <segment>/
    page.tsx
    _components/       # component เฉพาะ route นี้ (ไม่ reuse, ไม่ routable)
components/
  ui/                 # shadcn primitive (generated)
  ai-elements/        # AI Elements (generated)
  layout/             # app shell — sidebar, topbar, brand, theme-toggle
  common/             # composite reuse ข้าม ≥2 feature
  <feature>.tsx       # feature component เดี่ยว ๆ (เช่น chat-view)
lib/                  # api client, utils, query keys — ไม่ใช่ React component
```
- provider/shell wiring (React Query, Tooltip) → `components/providers.tsx` แล้ว import ใน `app/layout.tsx`
- **query key / fetcher / non-component logic → `lib/`** (เช่น `lib/queries.ts`) — อย่า export จากไฟล์ component
- **ห้ามตั้งชื่อ folder แบบ bucket มั่ว ๆ** (เช่น `marginalia/`, `misc/`) — ใช้ axis ข้างบนเท่านั้น

### promote เป็น feature เมื่อโตพอ
เมื่อ feature เดียวสะสม component ของตัวเอง **+ hook + action + type** → ยกออกจาก technical layer ไปเป็น `features/<name>/` ที่ own ทุกอย่าง (Feature-Sliced Design):
```
features/<name>/
  components/  hooks/  actions.ts  schema.ts  types.ts
```
ตอนนี้ repo ยังเล็ก (1 route) → ยังไม่ต้อง `features/`; อยู่ที่ hybrid (`ui` + `layout` + colocated `_components`) ไปก่อน

## UI ใหม่ที่ต้องดีไซน์
ถ้าต้องสร้าง UI/หน้าใหม่ที่ต้องการ design quality → ใช้ built-in skill **frontend-design** ก่อน (กัน generic AI aesthetic) แล้วค่อย map กลับมา stack ข้างบน

## Commands
`pnpm lint` · `pnpm test` · `pnpm build`
