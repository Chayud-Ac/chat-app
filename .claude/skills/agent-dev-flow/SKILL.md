---
name: agent-dev-flow
description: ใช้เมื่อจะ dispatch issue ให้ background/async agent ทำเอง หรือเมื่อจะ implement งานจาก issue — ตัดสินใจว่า issue ไหนส่ง async ได้ ไหนต้อง interactive, และกัน loop ไม่ให้ burn token
---

# Agent Dev Flow — route by difficulty + กัน runaway loop

flow: create issue → agent implement → async background → เปิด PR อัตโนมัติ
ปัญหาที่เจอจริง: heavy/ambiguous task ทำให้ background agent ติด loop แล้ว burn token
(background agent **ถามไม่ได้** → เจอของกำกวมก็เดาแล้ววน — ขัดกับ `anti-slop` ข้อ 1)

## กฎ route-by-difficulty (ตัดสินก่อน dispatch)

**ส่ง async background ได้** เมื่อ issue ครบ 3 ข้อนี้:
1. **scoped ชัด** — รู้แน่ว่าแตะไฟล์ไหน, contract อะไร, ไม่มี API shape กำกวม
2. **verifiable** — มี test/build/lint command ที่ตัดสิน "เสร็จ" ได้โดยไม่ต้องถามคน
3. **เล็ก** — ประเมินได้ว่าจบใน turn budget (ดูข้างล่าง)

**ต้อง interactive / pair mode** (อย่าส่ง async) เมื่อ:
- requirement กำกวม / ต้องตัดสินใจ design ระหว่างทาง (เช่น เลือก router, auth strategy — ดู `stack-decisions.md`)
- แตะหลาย service พร้อมกัน หรือเปลี่ยน contract ใน `packages/contracts/`
- เป็น "heavy loop" task (migration ใหญ่, refactor ข้าม package) → **decompose เป็น subtask เล็กก่อน** แล้วค่อยส่งทีละอันถ้าเข้าเกณฑ์ async

> rule of thumb: ถ้าตอบ "ไม่แน่ใจ" กับข้อใดข้อหนึ่งใน 3 ข้อ → interactive

## กัน runaway loop (3 stopping condition — ตั้งก่อนเริ่ม)

1. **budget stop** — background invocation ต้องมี `--max-turns` เสมอ
   - เริ่มที่ `--max-turns 20` แล้วปรับขึ้นจากข้อมูลจริง (อย่าตั้งสูงไว้ก่อน)
   ```bash
   claude --max-turns 20 -p "implement issue #<n> ..."
   ```
2. **failure stop** — retry action เดิมได้ไม่เกิน 2-3 ครั้ง; ถ้ายังพัง → **หยุดแล้ว surface error** ไม่วนต่อ
3. **verification gate** — ระหว่าง subtask ให้รัน test/build/lint จริง (script ตัดสิน ไม่ใช่ agent ตัดสินเอง) แล้วค่อยไป subtask ถัดไป

## decompose heavy task

แตกเป็น subtask ที่มี checkpoint คั่น — failure ที่ step 3 จะได้ไม่เผา token ของ step 4-10
แต่ละ subtask ต้องผ่านเกณฑ์ async 3 ข้อด้านบนถึงจะ dispatch แยกได้

## เชื่อมกับของที่มี
- `anti-slop` — ข้อ 1 (ถามก่อนเดา) คือเหตุผลที่ของกำกวมห้ามส่ง async
- `/open-pr` — quality gate หลัง implement (test → cross-review → PR)
- `cross-review` — review ด้วย DeepInfra (model คนละ family) ก่อนเปิด PR
