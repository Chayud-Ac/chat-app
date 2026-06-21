#!/usr/bin/env bash
# PreToolUse hook — block agent ไม่ให้แตะ path ต้องห้าม (แก้ P6)
# วางเป็น .claude/hooks/block-sensitive-paths.sh, ลงทะเบียนใน settings.json matcher "Edit|Write"
# Claude Code ส่ง JSON ของ tool call เข้า stdin; exit 2 = block (message ไป stderr), exit 0 = อนุญาต

set -euo pipefail

input="$(cat)"

# ดึง path ที่ agent จะแก้ออกจาก JSON (รองรับ field file_path / path)
target="$(printf '%s' "$input" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print("")
    sys.exit(0)
ti = d.get("tool_input", d)
print(ti.get("file_path") or ti.get("path") or "")
')"

# ไม่รู้ path → ปล่อยผ่าน (ไม่ block แบบมั่ว)
[ -z "$target" ] && exit 0

# pattern ต้องห้าม — ปรับตาม policy
case "$target" in
  */auth/*|*/payment/*)
    echo "BLOCKED: '$target' อยู่ใน auth/payment — ต้องให้คนแก้ผ่าน PR + CODEOWNERS" >&2
    exit 2 ;;
  *.env|*/secrets/*|*.pem|*.key)
    echo "BLOCKED: '$target' เป็นไฟล์ secret — agent ห้ามแก้" >&2
    exit 2 ;;
esac

# (ทางเลือก strict สำหรับ apps/ai-service ที่แตะ PII — เปิดถ้าต้องการ)
# case "$target" in
#   apps/ai-service/*)
#     echo "BLOCKED: apps/ai-service แตะ PII — แก้ผ่าน human-gated PR เท่านั้น" >&2
#     exit 2 ;;
# esac

exit 0
