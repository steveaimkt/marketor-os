#!/bin/bash
# scripts/check-links.sh — 프로젝트 내부 경로 참조 실존 검사 (죽은 참조 검출)
#
# 배경: md/json/sh가 참조하는 프로젝트 파일 경로가 리팩토링·이동 후 깨져도
# 아무도 모른다 (2026-07-16 정리 때 존재하지 않는 파일을 가리키는 유령 참조 발견).
# 대상: agents/ skills/ commands/ automation/ scripts/ discord-bot/ 루트 문서
# 제외: curriculum(강의 스냅샷) · msk(외부 정본) · node_modules · outputs · logs
# 오탐 방지: 로컬에 없어도 동일 꼬리 경로가 msk/ 아래 실존하면 msk 참조로 간주하고 통과
#
# 사용: bash scripts/check-links.sh
# 종료 코드: 0=깨진 참조 없음 · 1=발견
set -u
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

BROKEN=0; CHECKED=0
# 프로젝트 상대 경로 패턴: 알려진 최상위 폴더로 시작 + 확장자로 끝나는 토큰
PATTERN='(agents|skills|commands|automation|scripts|tools|mcp-server|brand|discord-bot|sample-data)/[A-Za-z0-9_./가-힣-]+\.(py|sh|mjs|js|json|md|plist|cron|csv|html|yaml)'

while IFS=: read -r file _line ref; do
  [ -z "${ref:-}" ] && continue
  CHECKED=$((CHECKED+1))
  if [ ! -e "$PROJECT_DIR/$ref" ]; then
    # msk 정본 참조 오탐 방지 (긴 msk 경로의 꼬리만 매칭된 경우)
    if [ -n "$(find -L "$PROJECT_DIR/msk" -path "*/$ref" -print -quit 2>/dev/null)" ]; then
      continue
    fi
    BROKEN=$((BROKEN+1))
    echo "🔴 $file:$_line → $ref (없음)"
  fi
done < <(grep -rnoE "$PATTERN" \
    agents skills commands automation scripts discord-bot \
    CLAUDE.md README.md 0.여기서-시작하세요.md package.json .mcp.json 2>/dev/null \
  | grep -v "예:\|예시\|<\|{" \
  | sort -u)

echo "── check-links: 참조 ${CHECKED}건 검사 / 🔴 깨진 참조 ${BROKEN}건"
[ "$BROKEN" -eq 0 ]
