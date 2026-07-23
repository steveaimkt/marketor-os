#!/bin/bash
# gbrain put 감지 → 노션 "gbrain 로그" 미러 대기열에 적재 + 리더에게 상기
#
# 배경: orchestrator.md 규약에 "gbrain put 시 노션 gbrain 로그 DB에 동시 미러"가
#       있으나 자동 훅이 아니라 규약이라 계속 누락됐다 (2026-07-20 확인).
#       훅은 노션 API를 직접 못 부르므로, 대기열에 남기고 additionalContext 로 강제한다.
#
# 입력: PostToolUse stdin JSON
# 출력: JSON (hookSpecificOutput.additionalContext)
set -euo pipefail

QUEUE="${CLAUDE_PROJECT_DIR:-.}/outputs/.gbrain-notion-queue.jsonl"
payload="$(cat)"

cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")"

# gbrain put 이 아니면 조용히 통과
case "$cmd" in
  *"cli.ts"*" put "*|*"gbrain"*" put "*) ;;
  *) exit 0 ;;
esac

# 슬러그 추출: put 다음 인자
slug="$(printf '%s' "$cmd" | sed -nE 's/.*put[[:space:]]+"?([^"[:space:]]+)"?.*/\1/p' | head -1)"
[ -z "$slug" ] && exit 0

mkdir -p "$(dirname "$QUEUE")"
printf '{"slug":"%s","ts":"%s","mirrored":false}\n' "$slug" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$QUEUE"

pending="$(grep -c '"mirrored":false' "$QUEUE" 2>/dev/null || echo 0)"

jq -n --arg slug "$slug" --arg n "$pending" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("⚠️ gbrain put 감지: \($slug)\n노션 `gbrain 로그` DB(data_source_id bbde499f-0035-4266-9f5d-4744e21b95cb)에 미러 1행을 넣어라. 필드: 항목·요약(1~3줄)·유형(결정/인사이트/산출물/업무/이벤트)·태그·gbrain슬러그·일시(now)·읽음=신규. 의미 없는 항목이면 건너뛰고 대기열에서 지워라. 현재 미처리 \($n)건.")
  }
}'
