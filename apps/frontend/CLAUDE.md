# apps/frontend (Node/Next.js)

> วางเป็น `apps/frontend/CLAUDE.md`

UI ของ AI chat app: render streaming token ทีละ chunk จาก backend (SSE)

## Stack
- Next.js, TypeScript, pnpm

## Commands
- lint: `pnpm lint`
- test: `pnpm test`
- build: `pnpm build`

## Conventions
- **stack/pattern เชิงลึก → ใช้ skill `frontend-stack`** (Next.js server-first, Tailwind v4 token, shadcn AI Elements, AI SDK v5) — โหลดอัตโนมัติเมื่อทำงานที่นี่
- **file placement**: `app/` = routing เท่านั้น (`page.tsx`/`layout.tsx`/`route.ts`). reusable component → `components/`, ไม่ใช่ลอย ๆ ใน `app/`. (โครงเต็ม + private-folder ดู skill `frontend-stack`)
- กัน XSS ตอน render markdown จาก LLM output
- type ของ request/response import จาก `packages/contracts/`

## ⚠️ Next.js 16 — breaking changes
This repo uses **Next.js 16** (App Router + Turbopack). APIs/conventions may differ from training data.
อ่าน guide ใน `node_modules/next/dist/docs/` ก่อนเขียน app code, heed deprecation notices.
