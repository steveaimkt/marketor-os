#!/bin/bash
#
# scripts/hooks/close-run.sh — Stop hook
#
# Claude Code가 메인 응답을 마무리할 때 1회 실행.
# 현재 run의 요약을 logs/runs/.../...jsonl 에 마지막 줄로 적재.
#
# 입력 (stdin JSON):
#   { "session_id": "...", "stop_hook_active": true, ... }
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

INPUT=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
RUN_ID="${MARKETING_OS_RUN_ID:-interactive-$(date +%s)}"
JOB="${MARKETING_OS_JOB:-interactive}"

SUMMARY=$(jq -n \
  --arg ts "$TS" \
  --arg run_id "$RUN_ID" \
  --arg job "$JOB" \
  '{ts:$ts, run_id:$run_id, job:$job, event:"stop_hook"}')

# cron 컨텍스트일 때만 run 로그에 적재
if [ -n "${MARKETING_OS_LOG_FILE:-}" ] && [ -w "$(dirname "$MARKETING_OS_LOG_FILE")" ]; then
  echo "$SUMMARY" >> "$MARKETING_OS_LOG_FILE"
fi

exit 0
