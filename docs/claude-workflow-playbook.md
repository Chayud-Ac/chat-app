# Claude Workflow Playbook — foundation-first, async-later

> ตอบคำถาม: "เริ่ม project ใหม่กับ Claude ควรทำอะไรก่อน-หลัง? ตอนไหนค่อยเขียน skill/agent/hook? ตอนไหนค่อยปล่อย async agent?"
> **กฎเดียว:** วาง foundation (structure + convention) ให้เป็นของจริงก่อน → แล้วค่อย encode เป็น tooling → async เป็นอันสุดท้าย
> note นี้ project-agnostic — reuse ตอนเริ่ม project ถัดไปได้เลย

## ทำไมต้อง foundation-first

- เขียน skill/agent/hook ที่ดี **ไม่ได้** ถ้ายังไม่มี pattern ที่ "พิสูจน์แล้ว" — encode convention ที่ยังเดาอยู่ = lock ทางผิด
- async agent ต้องการ 2 อย่างที่ "วันแรกยังไม่มี": (a) convention ชัดให้เดินตาม (b) issue ที่คมพอจะอ่าน standalone
- ดังนั้นลำดับจึงเป็น: **design → pair foundation → encode tooling → async** — foundation-first แก้ทั้ง (a) และ (b) ในคราวเดียว

---

## Part A — The Playbook (4 phase)

| Phase | ทำอะไร | Claude บทบาท | ผู้ใช้บทบาท | output |
|-------|--------|-------------|-----------|--------|
| **1. Design / prototype** | คุยจนได้ทิศ + ลอง prototype | เสนอ pattern / ทางเลือก | ตัดสินว่า fit ไหม | prototype + candidate structure (ยังไม่ใช่ production code) |
| **2. Pair foundation** (interactive) | วาง structure + convention จน solid และผู้ใช้เข้าใจจริง | senior pair: recall best practice, flag gap | taste/judgment, ดัน back เมื่อ over-build | convention ที่ established จริง |
| **3. Encode tooling** | เขียน skill/agent/hook จาก convention ที่พิสูจน์แล้ว | ช่วย encode | review ว่าตรงกับที่ทำจริง | skill/agent/hook/nested CLAUDE.md |
| **4. Async last** | ปล่อยงานให้ background agent | ทำตาม convention + issue | เขียน issue ให้คม, route งาน | async dispatch |

### division of labor (สำคัญที่สุดของ note นี้)

- **งานผู้ใช้:** judgment, taste, "fit กับ project ไหม", จับ over-build
- **งาน Claude:** recall current best-practice pattern, surface สิ่งที่ขาด, เสนอ structure
- **rusty ไม่ใช่ blocker** — skill ที่ฝึกคือ "รู้ว่า proposal ไหนดี และดัน back ตัวที่แย่" ไม่ใช่ต้องรู้ structure สมบูรณ์ล่วงหน้า

### ผูกกับ skill/convention ที่มีจริงใน repo นี้

- phase 2 ดัน back over-engineering → `anti-slop` **rule 2** (minimal solution first / YAGNI)
- phase 4 ตัดสินว่า issue ไหน async ได้ → `agent-dev-flow` (route-by-difficulty: scoped + verifiable + small → async; กำกวม / ข้ามหลาย service / แตะ `packages/contracts/` → interactive)
- ก่อนเปิด PR → `cross-review` (Claude context สะอาดดู diff อย่างเดียว, loop จน approve)
- convention ที่ encode แล้วอยู่ใน nested `apps/*/CLAUDE.md` + `docs/stack-decisions.md`

---

## Part B — The Foundation Checklist (เคาะให้จบใน phase 2)

> วิธีใช้ — **prompt-per-pattern**: แต่ละ pattern paste prompt ด้านล่างให้ Claude เสนอ + วิจารณ์ แล้วผู้ใช้ตัดสิน
> **template:** "เสนอ current best-practice **[pattern]** approach สำหรับ stack นี้, เทียบ tradeoff กับ 1 ทางเลือก, และ flag สิ่งที่ถือว่า over-engineering สำหรับ project ขนาดนี้"

### Frontend

| pattern | เคาะอะไร | ตัวอย่าง established ใน repo นี้ |
|---------|----------|------------------------------|
| state management | global store จำเป็นไหม / server state แยกจาก client state ยังไง | React Query (server state), **ไม่มี global Redux/Zustand** (YAGNI) |
| hooks structure | custom hook อยู่ไหน, แบ่งยังไง | colocate ตาม scope การใช้ |
| component structure | atomic layering / boundary | `components/{ui,ai-elements,layout,common}/` |
| props handling | drilling vs context, shape ของ props | — เคาะตอน foundation |
| API fetching layer | centralized client / query layer | fetcher + query key ใน `lib/` |
| reusable component | เส้นแบ่ง shared vs colocated | shared (≥2 routes) → `components/`; single-route → `app/<route>/_components/` |
| design system + tokens | token, theme | Tailwind v4 |
| file placement | routing vs shared vs colocated | routing ใน `app/` เท่านั้น; non-component → `lib/` |

> reference เต็ม: `apps/frontend/CLAUDE.md`

### Backend

| pattern | เคาะอะไร | ตัวอย่าง established ใน repo นี้ |
|---------|----------|------------------------------|
| middleware | logging, recovery, auth | request-id + access log + recovery (PR #27) |
| API/route handling | structure ของ route ↔ handler | `routes.go` แยกจาก `handlers.go` |
| error handling | handle-once, wrap | skill `golang-error-handling` (sentinel, `%w`, `errors.Is/As`) |
| response helper | รวมศูนย์หรือ re-roll ต่อ package | รวมที่ `internal/platform/httputil` (`WriteJSON`, `WriteError`) |
| package layout | per-domain vs per-layer | package-per-domain `internal/{domain}/` |
| data/contract layer | shared type อยู่ไหน | `packages/contracts/` (single source of truth) |

> reference เต็ม: `apps/backend/CLAUDE.md`, `docs/stack-decisions.md`

---

## TL;DR

1. อย่ารีบเขียน skill/agent/hook — รอจน convention เป็นของจริง (phase 3 ไม่ใช่ phase 1)
2. phase 2 คือหัวใจ: pair กับ Claude แบบ interactive, ใช้ checklist Part B ไล่ทีละ pattern
3. async (phase 4) ปล่อยเมื่อมี convention + เขียน issue คมพอ standalone
4. ตลอดทาง: Claude เสนอ, ผู้ใช้ตัดสิน — rusty ไม่ใช่ blocker
