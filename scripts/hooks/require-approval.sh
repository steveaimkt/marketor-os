#!/bin/bash
#
# scripts/hooks/require-approval.sh — PreToolUse hook
#
# 위험 도구 호출 시 Discord에 승인 요청을 보내고 reaction을 기다림.
# reaction이 ✅면 통과, ❌면 차단, 5분 무응답이면 차단 (기본값).
#
# 위험 도구 매처 예 (settings.json에서 적용):
#   - mcp__(meta_ads|google_ads)__.*update.*    (광고 변경)
#   - mcp__(meta_ads|google_ads)__.*pause.*     (광고 중지)
#   - mcp__buffer__create_post                  (콘텐츠 발행)
#   - mcp__gmail__send_message                  (이메일 발송)
#
# 입력 (stdin JSON):
#   { "tool_name": "...", "tool_input": {...}, "session_id": "...", ... }
#
# 출력 (PreToolUse hook 규약):
#   {"permissionDecision": "allow"|"deny", "permissionDecisionReason": "..."}
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

INPUT=$(cat)

# jq 또는 환경변수 부재 시 안전 측면에서 deny
if ! command -v jq >/dev/null 2>&1; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"jq not installed — cannot run approval check"}'
  exit 0
fi

# .env 로드
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
fi

TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}')

# Discord webhook 없으면 deny (안전 측면)
if [ -z "${DISCORD_WEBHOOK_APPROVALS:-}" ]; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"DISCORD_WEBHOOK_APPROVALS not set in .env — cannot request approval"}'
  exit 0
fi

# Discord에 승인 요청 메시지 전송
PAYLOAD=$(jq -n \
  --arg tool "$TOOL" \
  --arg input "$TOOL_INPUT" \
  --arg run_id "${MARKETING_OS_RUN_ID:-interactive}" \
  '{
    "embeds": [{
      "title": "⚠️ 승인 요청",
      "description": "위험 도구 호출을 승인해 주세요.",
      "color": 16776960,
      "fields": [
        {"name": "Tool", "value": $tool, "inline": false},
        {"name": "Input", "value": ("```json\n" + $input + "\n```"), "inline": false},
        {"name": "Run ID", "value": ("`" + $run_id + "`"), "inline": false}
      ],
      "footer": {"text": "이 메시지에 ✅ 또는 ❌ 반응하세요 (5분 타임아웃)"}
    }]
  }')

# Webhook 전송 후 응답에서 message_id 추출
RESPONSE=$(curl -fsS -X POST "${DISCORD_WEBHOOK_APPROVALS}?wait=true" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" 2>/dev/null || echo "{}")

MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.id // empty')

if [ -z "$MESSAGE_ID" ]; then
  # webhook 전송 실패 → 안전하게 deny
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Failed to send approval request to Discord"}'
  exit 0
fi

# 현재는 polling 미구현 — Discord 봇이 완성된 후 추가 예정.
# 임시: 사람이 채팅에서 reaction 확인 후 수동으로 진행하라는 메시지.
# (Phase 2 Discord 인바운드 봇에서 reaction polling 추가 후 자동화)

echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Approval requested in Discord (msg_id: $MESSAGE_ID). Currently manual — re-run after acknowledgment. Phase 2 봇 가동 후 자동화 예정.\"}"

exit 0
