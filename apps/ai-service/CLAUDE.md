# apps/ai-service (Python)

> วางเป็น `apps/ai-service/CLAUDE.md`

LLM call + RAG pipeline (ingest / index / retrieve / generate) + embedding

## Stack
- Python 3.1x, FastAPI, vector DB (pgvector/Pinecone)

## Commands
- test: `pytest`
- lint: `ruff check`
- types: `mypy .`

## Conventions
- **stack/pattern เชิงลึก → ใช้ skill `ai-service-stack`** (FastAPI, Pydantic v2, async, RAG stages) — โหลดอัตโนมัติเมื่อทำงานที่นี่
- **service นี้แตะ PII — ทุก PR ต้องผ่าน human gate (CODEOWNERS = security-team)**
- **ห้าม embedding/prompt/model output ออกนอก org** — โค้ด sensitive ใช้ local model ผ่าน MCP (Ollama)
- contract import จาก `packages/contracts/`

> หมายเหตุ: ถ้า compliance บังคับ git แยกขาด → service นี้คือตัวที่ดีดออกเป็น repo แยก (escape hatch)
