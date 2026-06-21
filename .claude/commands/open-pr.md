---
description: รัน test → cross-review (Codex) → เปิด PR ผูกกับ issue. ใช้ $ARGUMENTS เป็น issue number
---

# /open-pr $ARGUMENTS

เปิด PR สำหรับ issue #$ARGUMENTS แบบมี quality gate ครบ

> ⚠️ **บังคับ CWD = repo root** ก่อนรัน — Claude Code ใช้ working directory เป็นส่วนหนึ่งของ session lookup key
> ถ้ารันจาก subdir คนละตัว session จะ resolve ผิด (เคสจริง daily.dev: implementation รันจาก root แต่ PR creation รันจาก subdir → พังเงียบไม่มี error)

## ขั้นตอน

1. รัน test ของ service ที่กระทบ (ดู command ใน nested CLAUDE.md) — ถ้าไม่ผ่าน **หยุด** แจ้ง user
2. รัน skill `cross-review` (Claude → Codex loop) จน Codex approve
3. เปิด PR ผูกกับ issue:

```bash
gh pr create \
  --title "$(git log -1 --pretty=%s)" \
  --body "Closes #$ARGUMENTS

## Summary
<สรุปการเปลี่ยนแปลง + service ที่กระทบ>

## Cross-review
✅ reviewed by Codex (loop-until-approved)
" \
  --base main
```

4. แจ้ง user พร้อม PR URL และเตือนถ้า diff แตะ path ที่ต้อง CODEOWNERS review (apps/ai-service, apps/backend/internal/auth, payment)
