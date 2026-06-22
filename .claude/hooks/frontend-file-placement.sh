#!/usr/bin/env bash
# PreToolUse hook — บังคับ file-placement rule ของ apps/frontend (แก้ P: rule ใน prose ถูกมองข้ามตอน session ยาว)
# กฎ: app/ = routing เท่านั้น. reusable component (.tsx) ห้ามลอยใน app/ — ต้องไป components/ หรือ app/<route>/_components/
# วางเป็น .claude/hooks/frontend-file-placement.sh, ลงทะเบียนใน settings.json matcher "Edit|Write"
# exit 2 = block (message ไป stderr), exit 0 = อนุญาต

set -euo pipefail

input="$(cat)"

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

[ -z "$target" ] && exit 0

# normalize เป็น path เทียบกับ repo (รองรับทั้ง absolute และ relative)
norm="${target#"$CLAUDE_PROJECT_DIR"/}"

# สนใจเฉพาะไฟล์ .tsx ที่อยู่ใน apps/frontend/app/
case "$norm" in
  apps/frontend/app/*.tsx)
    base="$(basename "$norm")"
    # ไฟล์ routing ที่ Next.js App Router อนุญาตให้อยู่ใน app/
    case "$base" in
      page.tsx|layout.tsx|loading.tsx|error.tsx|not-found.tsx|template.tsx|default.tsx|global-error.tsx)
        exit 0 ;;
    esac
    # อยู่ใน private folder (_components ฯลฯ) → colocation ที่อนุญาต
    case "$norm" in
      *"/_"*) exit 0 ;;
    esac
    echo "BLOCKED: '$norm' — app/ = routing เท่านั้น (page/layout/loading/error/...)." >&2
    echo "reusable component ไป 'apps/frontend/components/' ; ถ้า colocate route เดียว → 'app/<route>/_components/' (prefix _)" >&2
    echo "ดูกฎเต็มใน skill frontend-stack ข้อ 7" >&2
    exit 2 ;;
esac

exit 0
