#!/bin/bash
#
# scripts/hooks/log-cost.sh — PostToolUse hook
#
# Claude Code가 도구 호출 후 매번 실행. stdin으로 JSON event를 받아서
# logs/cost/YYYY-MM.jsonl에 추가하고, 동시에 현재 run의 runs/*.jsonl에도 적재.
#
# 입력 (stdin JSON):
#   {
#     "session_id": "...",
#     "tool_name": "mcp__meta_ads__get_insights",
#     "tool_input": {...},
#     "tool_response": {...},
#     "tool_use_id": "..."
#   }
#
# 환경변수 (run-cron.sh에서 export):
#   MARKETING_OS_RUN_ID
#   MARKETING_OS_JOB
#   MARKETING_OS_LOG_FILE
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 입력 JSON 읽기
INPUT=$(cat)

# jq 없으면 graceful skip
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
RUN_ID="${MARKETING_OS_RUN_ID:-interactive-$(date +%s)}"
JOB="${MARKETING_OS_JOB:-interactive}"

TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')

# 비용·토큰 정보는 stream-json output에서 추출되지만, hook 입력엔 없음.
# 여기서는 도구 호출 사실만 적재. 정확한 비용은 stream-json을 별도 파싱.
COST_ENTRY=$(jq -cn \
  --arg ts "$TS" \
  --arg run_id "$RUN_ID" \
  --arg job "$JOB" \
  --arg tool "$TOOL" \
  '{ts:$ts, run_id:$run_id, job:$job, tool:$tool, event:"tool_used"}')

# 월별 cost 파일에 적재
COST_FILE="$PROJECT_DIR/logs/cost/$(date +%Y-%m).jsonl"
mkdir -p "$(dirname "$COST_FILE")"
echo "$COST_ENTRY" >> "$COST_FILE"

# 현재 run의 로그 파일에도 적재 (cron 컨텍스트일 때만)
if [ -n "${MARKETING_OS_LOG_FILE:-}" ] && [ -w "$(dirname "$MARKETING_OS_LOG_FILE")" ]; then
  echo "$COST_ENTRY" >> "$MARKETING_OS_LOG_FILE"
fi

# hook은 반드시 valid JSON으로 응답 (또는 빈 출력)
exit 0
