---
name: cross-review
description: ใช้หลัง implement เสร็จ ก่อนเปิด PR — ส่ง diff ให้ model คนละ family (DeepInfra) review แล้ว loop จน approve เพื่อจับ bug ที่ Claude มองข้าม (แก้ P3 single-model blind spot)
---

# Cross-Model Review (Claude → DeepInfra loop)

Claude เก่งฝั่ง generate — เอา model อีก family (ผ่าน DeepInfra) มา review จับ bug ที่ Claude มองข้าม
(model review ใช้ **Kimi-K2.7-Code** (Moonshot) บน DeepInfra — coding-focused, คนละ family กับ Claude ดีสุดสำหรับ review.
fallback context ใหญ่ → `deepseek-ai/DeepSeek-V4-Pro` (1M ctx). เปลี่ยน `MODEL` ด้านล่างได้)

## ข้อควรรู้

- DeepInfra เป็น **OpenAI-compatible** endpoint → เรียกด้วย `curl` ตรง (bash ของ Claude Code เป็น non-interactive)
- API key อ่านจาก env `DEEPINFRA_API_KEY` — **อย่า hardcode / commit ค่าจริง** (set ผ่าน shell หรือ secret manager)
- โค้ด sensitive (apps/ai-service ที่แตะ PII) → **อย่าส่งออก DeepInfra**; ใช้ local model ผ่าน MCP `ollama-local` แทน

## Loop

1. เก็บ diff ของงานที่เพิ่งทำ:

```bash
git diff main > /tmp/review.diff
```

2. ส่งให้ DeepInfra review (OpenAI-compatible chat completions):

```bash
MODEL="moonshotai/Kimi-K2.7-Code"
DIFF_CONTENT="$(cat /tmp/review.diff)"
jq -n --arg model "$MODEL" --arg diff "$DIFF_CONTENT" '{
  model: $model,
  messages: [
    {role: "system", content: "You are a senior code reviewer. Review the diff for bugs, security issues, and PII leaks. Be specific about file + line numbers. End with a verdict line: APPROVED or CHANGES_REQUESTED."},
    {role: "user", content: ("Review this diff:\n" + $diff)}
  ]
}' | curl -s https://api.deepinfra.com/v1/openai/chat/completions \
  -H "Authorization: Bearer $DEEPINFRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- | jq -r '.choices[0].message.content'
```

3. อ่าน finding ที่ model ส่งกลับ

4. **ถ้ามี issue (CHANGES_REQUESTED)** → แก้ตาม finding แล้ววนกลับข้อ 1 (loop-until-approved)

5. **ถ้า APPROVED (ไม่มี blocking issue)** → ไปเปิด PR ได้ (ใช้ `/open-pr`)

## หมายเหตุ

- เริ่มที่คู่ Claude + DeepInfra(DeepSeek) พอ อย่าเพิ่งกระโดดไป multi-provider
- จะเพิ่ม reviewer ตัวที่สอง (model อื่นบน DeepInfra) ทีหลังได้ — แค่เปลี่ยน `MODEL` แล้วเรียกซ้ำ
