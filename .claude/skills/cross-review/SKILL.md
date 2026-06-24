---
name: cross-review
description: ใช้หลัง implement เสร็จ ก่อนเปิด PR — ส่ง diff ให้ Claude subagent ที่ context สะอาด (ไม่เห็นบทสนทนาตอน implement) review แล้ว loop จน approve เพื่อจับ bug ที่ผู้เขียนมองข้าม (แก้ P3 single-pass blind spot)
---

# Clean-Context Review (Claude subagent loop)

ผู้เขียน (agent ที่เพิ่ง implement) มี blind spot จากการ "เห็นเหตุผลตัวเองตอนเขียน" — dispatch Claude subagent
ตัวใหม่ที่ **context สะอาด เห็นแค่ diff** มา review เหมือนตาคู่ใหม่ จับ bug ที่ผู้เขียนมองข้าม

> **เปลี่ยนจาก DeepInfra → Claude subagent:** เดิมใช้ DeepInfra (Kimi-K2.7-Code) เพื่อได้ model คนละ family.
> แต่ model บน DeepInfra คุณภาพไม่พอ → กลับมาใช้ Claude subagent ที่ context สะอาดแทน.
> ตัว reviewer **ไม่เห็นบทสนทนาตอน implement** (fresh dispatch = cold start) → ได้ "fresh eyes" จริง.

## ข้อควรรู้

- reviewer = **Claude subagent ที่ dispatch ใหม่** (cold start) — ไม่ inherit context ของ session ที่ implement
  - **อย่าใช้** `subagent_type: "fork"` (fork จะ inherit context ทั้งหมด = เสีย fresh-eyes)
  - ใช้ `general-purpose` (หรือ `code-reviewer` agent ถ้าอยาก reuse house-style lens)
- reviewer ได้ **แค่ diff** เป็น input — ไม่เล่า rationale ตอนเขียนให้ฟัง (นั่นคือจุดประสงค์)
- โค้ด sensitive (apps/ai-service ที่แตะ PII) → อยู่ในเครื่อง ไม่ส่งออก third-party แล้ว (Claude subagent local ต่อ session) ✅

## Loop

1. เก็บ diff ของงานที่เพิ่งทำ:

```bash
git diff main > /tmp/review.diff
```

2. dispatch Claude subagent ที่ context สะอาด (ผ่าน Agent tool) ด้วย prompt ประมาณนี้
   — subagent อ่าน `/tmp/review.diff` เอง ไม่ต้อง paste diff เข้า context หลัก:

   > You are a senior code reviewer with NO prior context on how this change was written.
   > Read the diff at `/tmp/review.diff`. Review ONLY for: correctness bugs, security issues,
   > and PII leaks (logged/exported user messages, tokens, emails). Be specific about
   > file + line numbers. Do not comment on style. End with exactly one verdict line:
   > `APPROVED` or `CHANGES_REQUESTED`.

3. อ่าน finding ที่ subagent ส่งกลับ (final message ของ subagent = ผล review)

4. **ถ้า `CHANGES_REQUESTED`** → แก้ตาม finding แล้ววนกลับข้อ 1 (loop-until-approved)

5. **ถ้า `APPROVED` (ไม่มี blocking issue)** → ไปเปิด PR ได้ (ใช้ `/open-pr`)

## หมายเหตุ

- จุดสำคัญคือ **context สะอาด** ไม่ใช่ model คนละ family — reviewer ที่ไม่เห็น rationale ตอนเขียน
  คือสิ่งที่จับ bug ที่ผู้เขียน "มั่นใจว่าถูก" ได้
- ต่างจาก `code-reviewer` agent: cross-review เป็น loop gate ก่อน PR (วนจน approve);
  `code-reviewer` เป็น review รอบเดียวเชิง house-style/quality. ใช้คู่กันได้ ไม่ทับ
