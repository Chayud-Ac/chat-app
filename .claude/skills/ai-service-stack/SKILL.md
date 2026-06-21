---
name: ai-service-stack
description: ใช้เมื่อเขียน/แก้โค้ดใน apps/ai-service หรือ apps/worker — encode stack: FastAPI, Pydantic v2, async. โหลดเมื่อทำงาน Python AI service เท่านั้น
---

# AI Service Stack (apps/ai-service, apps/worker)

stack จริงของ RAG/LLM service — encode pattern เฉพาะ repo

## Stack (pinned — ดู stack-decisions.md)
- **FastAPI** — async endpoint
- **Pydantic v2** — schema/validation (ใช้ `model_validate`, `model_dump`; ไม่ใช่ v1 `.dict()`/`.parse_obj()`)
- **async/await** — LLM/vector DB call เป็น I/O-bound ทั้งหมด
- **vector store: pgvector** — embedding เก็บใน Postgres เดียวกับ backend (ไม่แยก vector DB). query ด้วย `<->` / `<=>` operator
- 🔵 *ปล่อย:* chunk size/overlap, embedding model id, top-k — ปรับตอน implement

## Pattern ที่บังคับ
1. **async ทุก I/O**: LLM call, embedding, vector DB query, queue → `async def` + `await` อย่า block event loop
2. **Pydantic v2 syntax**: `BaseModel` + type hints; validate input/output ด้วย model; ใช้ `Field()` สำหรับ constraint
3. **contract**: schema ที่ backend/worker ใช้ร่วม sync กับ `packages/contracts/` (อย่าให้ drift)
4. **RAG แยก stage**: chunk → embed → store (pgvector) → retrieve → generate เป็นฟังก์ชันแยก test ได้อิสระ
5. **PII**: ห้าม log/ส่งออก embedding/prompt/user content นอก org; โค้ด sensitive ใช้ local model ผ่าน MCP (Ollama)
6. **worker**: job ต้อง idempotent (queue redelivery)

## Commands
`pytest` · `ruff check` · `mypy .`
