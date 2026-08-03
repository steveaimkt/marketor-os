#!/bin/bash
# scripts/check-links.sh — 프로젝트 내부 경로 참조 실존 검사 (죽은 참조 검출)
#
# 배경: md/json/sh가 참조하는 프로젝트 파일 경로가 리팩토링·이동 후 깨져도
# 아무도 모른다 (2026-07-16 정리 때 존재하지 않는 파일을 가리키는 유령 참조 발견).
# 대상: agents/ skills/ commands/ automation/ scripts/ discord-bot/ 루트 문서
# 제외: curriculum(강의 스냅샷) · msk(외부 정본) · node_modules · outputs · logs
# 오탐 방지: 로컬에 없어도 동일 꼬리 경로가 msk/ 아래 실존하면 msk 참조로 간주하고 통과
# 오탐 방지 2 (2026-08-04): `100-skills` 를 목록 앞에 넣는다.
#   빠져 있으면 100-skills 로 시작하는 경로 안쪽이 부분 일치로 잡혀
#   멀쩡한 참조 40여 건이 "깨짐"으로 뜬다. methods/ → 100-skills/ 개명 때 여기가 안 따라왔다.
#   ⚠️ 최상위 폴더를 새로 만들면 이 목록에도 넣어야 한다.
#
# 사용: bash scripts/check-links.sh
# 종료 코드: 0=깨진 참조 없음 · 1=발견
set -u
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

BROKEN=0; CHECKED=0
# 프로젝트 상대 경로 패턴: 알려진 최상위 폴더로 시작 + 확장자로 끝나는 토큰
PATTERN='(agents|100-skills|skills|commands|automation|scripts|tools|mcp-servers|mcp-setup|brand|discord-bot|sample-data|workbook)/[A-Za-z0-9_./가-힣-]+\.(py|sh|mjs|js|json|md|plist|cron|csv|html|yaml)'

while IFS=: read -r file _line ref; do
  [ -z "${ref:-}" ] && continue
  CHECKED=$((CHECKED+1))
  # 실행 중 생성되는 산출물은 "아직 없는 것"이지 "죽은 참조"가 아니다 (2026-08-04)
  #   brand/schedule.json  ← 일정-관리 가 첫 실행에서 만든다
  #   brand/team-cards.md  ← 팀-실행 게이트 3 이 만든다
  #   ⚠️ 여기에 넣기 전에 **정말 스킬이 만드는지** 확인할 것. 빠뜨린 파일을 숨기는 데 쓰면 안 된다.
  case "$ref" in
    brand/schedule.json|brand/team-cards.md) continue ;;
  esac
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
  | grep -v "예:\|예시\|<\|{\|XXX\|NN-category\|NNN-slug\|ROUTING.md 안의" \
  | sort -u)

echo "── check-links: 참조 ${CHECKED}건 검사 / 🔴 깨진 참조 ${BROKEN}건"
[ "$BROKEN" -eq 0 ]
