---
name: cross-review
description: ใช้หลัง implement เสร็จ ก่อนเปิด PR — ส่ง diff ให้ Codex (คนละ model family) review แล้ว loop จน approve เพื่อจับ bug ที่ Claude มองข้าม (แก้ P3 single-model blind spot)
---

# Cross-Model Review (Claude → Codex loop)

Claude เก่งฝั่ง generate, Codex เก่งฝั่ง review — เอามา review กันแล้วจับ bug ที่อีกตัวมองข้าม

## ข้อควรรู้

bash ของ Claude Code เป็น **non-interactive** — ต้องเรียก Codex ด้วย `codex exec` (ไม่ใช่ interactive `codex`)

## Loop

1. เก็บ diff ของงานที่เพิ่งทำ:

```bash
git diff main > /tmp/review.diff
```

2. ส่งให้ Codex review (non-interactive):

```bash
codex exec "Review this diff for bugs, security issues, and PII leaks. Be specific about line numbers. Diff:\n$(cat /tmp/review.diff)"
```

3. อ่าน finding ที่ Codex ส่งกลับ

4. **ถ้ามี issue** → แก้ตาม finding แล้ววนกลับข้อ 1 (loop-until-approved)

5. **ถ้า Codex approve (ไม่มี blocking issue)** → ไปเปิด PR ได้ (ใช้ `/open-pr`)

## หมายเหตุ

- เริ่มที่คู่ Claude+Codex พอ อย่าเพิ่งกระโดดไป multi-provider
- โค้ด sensitive (apps/ai-service) → ใช้ local model ผ่าน MCP (Ollama) แทน Codex cloud ถ้า compliance ห้าม code ออก org
