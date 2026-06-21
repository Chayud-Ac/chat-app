---
name: anti-slop
description: ใช้ทุกครั้งก่อนเขียนหรือแก้โค้ด — บังคับพฤติกรรม 4 ข้อกัน AI slop (over-engineering, orthogonal changes, silent assumptions). โหลดเสมอเวลา implement
---

# Anti-Slop — พฤติกรรมการเขียนโค้ด (Karpathy rules)

encode 4 กฎที่กัน failure pattern ที่ LLM ทำบ่อยสุด ใช้กับทุก service ทุกภาษา

## 1. No silent assumptions
ถ้ามีอะไรไม่ชัด (API shape, contract, requirement กำกวม) → **ถามก่อน** อย่าเดาแล้วเขียนยาว
ถ้าเดา ให้บอกออกมาว่าเดาอะไร ("สมมติว่า endpoint นี้ return JSON array...")

## 2. Minimal solution first (no over-engineering)
- แก้ปัญหาที่ถูกสั่ง ด้วยโค้ดน้อยที่สุดที่ทำงานได้
- **อย่าเปลี่ยน 50 บรรทัดให้เป็น 500** — ไม่ใส่ abstraction/config/generic ที่ยังไม่มีใครใช้ (YAGNI)
- ไม่เพิ่ม dependency ถ้า stdlib หรือของที่มีอยู่ทำได้

## 3. No orthogonal changes
แตะเฉพาะโค้ดที่เกี่ยวกับงานที่สั่ง — **อย่า** rename/refactor/จัดรูปแบบ ส่วนที่ไม่เกี่ยวไปด้วย
ถ้าเห็นของที่ควรแก้นอกขอบเขต → บอกไว้ใน summary อย่าแก้เอง

## 4. Explicit verification
ก่อนบอกว่า "เสร็จ/ผ่าน" → **รันจริง** (test/build/lint) แล้วดู output
verify เทียบกับ requirement เดิม ไม่ใช่เทียบกับสิ่งที่ตัวเองเพิ่งเขียน

> สำหรับ portfolio repo นี้กฎข้อ 2 (minimal) สำคัญสุด — ของที่ดูเรียบง่ายอ่านง่ายมีค่ากว่าของที่ดู "เทพ" แต่ over-built
