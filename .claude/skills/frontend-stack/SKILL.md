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
- **AI SDK v5** (`ai`, `@ai-sdk/react`) — `useChat` จัดการ chat state
- **server state: React Query** (TanStack) ถ้าจำเป็น (fetch history, list conversation)
- **ไม่มี global client store** (Zustand/Redux) — YAGNI; chat state อยู่ที่ `useChat`, server state ที่ React Query พอ

## Pattern ที่บังคับ
1. **Server-first**: default เป็น Server Component; ใส่ `"use client"` เฉพาะที่ต้องการ interactivity/hook (เช่น `useChat`)
2. **streaming**: ใช้ `useChat` ของ AI SDK v5 render token ทีละ chunk — อย่ารอ response เต็ม
2b. **state**: chat → `useChat` · server data → React Query · **อย่าเพิ่ม global store** จนกว่าจะมี client state ซับซ้อนจริง (multi-conversation switching, settings)
3. **design token**: สี/spacing ใช้ Tailwind v4 `@theme` token เท่านั้น อย่า hardcode hex ใน className
4. **AI Elements ก่อน**: ใช้ component จาก AI Elements (`<Conversation>`, `<Message>`...) ก่อนเขียน chat UI เอง
5. **type จาก contract**: request/response import จาก `packages/contracts/` ไม่ duplicate type
6. **ห้าม secret ฝั่ง client**: เรียก LLM ผ่าน backend เท่านั้น

## UI ใหม่ที่ต้องดีไซน์
ถ้าต้องสร้าง UI/หน้าใหม่ที่ต้องการ design quality → ใช้ built-in skill **frontend-design** ก่อน (กัน generic AI aesthetic) แล้วค่อย map กลับมา stack ข้างบน

## Commands
`pnpm lint` · `pnpm test` · `pnpm build`
