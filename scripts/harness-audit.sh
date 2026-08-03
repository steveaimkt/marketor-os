#!/bin/bash
# harness-audit.sh · 하네스 자가 감사 (Phase 0 현황 감사)
#
# 배경: 산출물은 gate-auditor가 검사하지만 "하네스 자신"을 검사하는 층이 없었다.
#       실제로 에이전트 수(문서마다 37/71/75 불일치) 같은 drift를 사람이 뒤늦게 발견했다.
#
# 기존 점검과의 분담 (중복 금지)
#   validate-agents.sh   = frontmatter YAML 유효성 (레지스트리 등록 가능한가)
#   check-org-drift.sh   = msk 심링크·브랜드 허브·정본↔배치판 경계면
#   harness-audit.sh     = 이 파일. 정원·가드레일·사용률·문서 수치 일치 (하네스 자체 건강)
#
# 사용: bash scripts/harness-audit.sh          # 요약
#       bash scripts/harness-audit.sh --full   # 미보완 목록 전체 출력
# 권장 주기: 월 1회 (또는 에이전트를 5명 이상 늘린 직후)

set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FULL=0; [ "${1:-}" = "--full" ] && FULL=1

CAP=80          # 에이전트 정원 상한 (_conventions §K)
STALE_DAYS=90   # 미사용 판정 기준

echo "── 하네스 자가 감사 · $(date '+%Y-%m-%d %H:%M')"
echo

# ── 1. 정원 ──────────────────────────────────────────────
TOTAL=$(find agents -name "*.md" ! -name "_*" ! -name "TEAM*" ! -name "README*" | wc -l | tr -d ' ')
echo "① 정원"
echo "   에이전트 $TOTAL명 / 상한 $CAP명"
if [ "$TOTAL" -gt "$CAP" ]; then
  echo "   🔴 정원 초과 · 폐기 대상을 골라 agents/_archive/ 로 이동할 것"
elif [ "$TOTAL" -gt $((CAP - 10)) ]; then
  echo "   ⚠️ 정원 임박 · 새 에이전트를 만들기 전에 폐기 후보부터 검토"
else
  echo "   ✅ 여유 $((CAP - TOTAL))명"
fi
echo

# ── 2. 가드레일 커버리지 ─────────────────────────────────
echo "② 가드레일 (금지·안티패턴 섹션 보유)"
NOGUARD=$(grep -rLi "금지\|하지 않는다\|안티패턴\|Anti-Pattern\|⛔" agents --include="*.md" 2>/dev/null | grep -v "/_\|TEAM\|README" || true)
NG_CNT=$(echo "$NOGUARD" | grep -c . || true)
COV=$(( (TOTAL - NG_CNT) * 100 / (TOTAL > 0 ? TOTAL : 1) ))
echo "   커버리지 ${COV}% (미보유 ${NG_CNT}명)"
if [ "$NG_CNT" -gt 0 ]; then
  echo "   ⚠️ 가드레일 없는 에이전트는 '할 수 없는 것'이 파일에 없어 폭주 위험"
  if [ "$FULL" = "1" ]; then echo "$NOGUARD" | sed 's/^/      /'; else echo "$NOGUARD" | head -5 | sed 's/^/      /'; [ "$NG_CNT" -gt 5 ] && echo "      ... --full 로 전체 보기"; fi
fi
echo

# ── 3. 산출물 착지 배선 ──────────────────────────────────
echo "③ 산출물 착지 규약 (_conventions §I)"
NOLAND=$(grep -rL "산출물 착지" agents --include="*.md" 2>/dev/null | grep -v "/_\|TEAM\|README" || true)
NL_CNT=$(echo "$NOLAND" | grep -c . || true)
echo "   배선 $((TOTAL - NL_CNT))/$TOTAL 명"
if [ "$NL_CNT" -gt 0 ]; then
  echo "   ⚠️ 미배선 에이전트는 팀으로 스폰 시 결과가 증발할 수 있음"
  if [ "$FULL" = "1" ]; then echo "$NOLAND" | sed 's/^/      /'; fi
fi
echo

# ── 4. 사용률 (세션 기록 기반) ───────────────────────────
echo "④ 사용률 (최근 ${STALE_DAYS}일 호출 이력)"
PROJ_DIR="$HOME/.claude/projects"
if [ -d "$PROJ_DIR" ]; then
  USED=$(find "$PROJ_DIR" -name "*.jsonl" -mtime -${STALE_DAYS} -exec grep -oh '"subagent_type":"[^"]*"' {} + 2>/dev/null | sed 's/.*:"//;s/"//' | sort -u)
  U_CNT=$(echo "$USED" | grep -c . || true)
  echo "   호출된 적 있는 에이전트: ${U_CNT}종"
  STALE=""
  while IFS= read -r f; do
    n=$(basename "$f" .md)
    case "$n" in README|orchestrator|TEAM-MODE) continue;; esac
    echo "$USED" | grep -qx "$n" || STALE="$STALE$n\n"
  done < <(find agents -name "*.md" ! -name "_*" ! -name "TEAM*")
  S_CNT=$(printf "$STALE" | grep -c . || true)
  # 보존 판정된 것과 새로 유휴가 된 것을 구분 (_roster-status.md)
  NEW_STALE=""
  if [ -f "agents/_roster-status.md" ]; then
    while IFS= read -r n; do
      grep -q "\`$n\`" agents/_roster-status.md || NEW_STALE="$NEW_STALE$n\n"
    done < <(printf "$STALE")
    NEW_CNT=$(printf "$NEW_STALE" | grep -c . || true)
    echo "   ${STALE_DAYS}일간 미호출: ${S_CNT}명 (보존 판정됨 $((S_CNT - NEW_CNT)) · 신규 ${NEW_CNT})"
    if [ "$NEW_CNT" -gt 0 ]; then
      echo "   ⚠️ 신규 유휴 ${NEW_CNT}명 · 보존/폐기 판정 후 agents/_roster-status.md 에 기록"
      printf "$NEW_STALE" | sed 's/^/      /'
    else
      echo "   ✅ 신규 유휴 없음 (전원 판정 완료 · 다음 재검토 2027-01-31)"
    fi
    STALE="$NEW_STALE"; S_CNT=$NEW_CNT
  else
    echo "   ${STALE_DAYS}일간 미호출: ${S_CNT}명"
  fi
  if [ "$S_CNT" -gt 0 ] && [ "$FULL" = "1" ]; then printf "$STALE" | sed 's/^/      /'; fi
  [ "$S_CNT" -gt 0 ] && [ "$FULL" = "0" ] && echo "      (--full 로 목록 · 폐기 판단은 사람이 · 계절성 업무 주의)"
else
  echo "   ⏭ 세션 기록 없음 · 건너뜀"
fi
echo

# ── 5. 문서 수치 일치 ────────────────────────────────────
echo "⑤ 문서에 적힌 인원수 vs 실측 (${TOTAL}명)"
MIS=0
while IFS= read -r hit; do
  f="${hit%%:*}"; num="${hit##*:}"
  [ "$num" = "$TOTAL" ] || { echo "   ⚠️ $f → ${num}명 (실측 ${TOTAL})"; MIS=$((MIS+1)); }
done < <(grep -rEoh --include="*.md" "에이전트 ?([0-9]{2,3})명|직원 ?([0-9]{2,3})명" CLAUDE.md agents/ brand/ 2>/dev/null \
         | grep -oE "[0-9]{2,3}" | sort -u | sed 's|^|문서:|' | head -6)
[ "$MIS" = "0" ] && echo "   ✅ 불일치 없음 (또는 표기 없음)"
echo "   ※ 대외 표기는 라운딩을 허용한다. 내부 정본만 실측과 맞추면 된다"
echo

# ── 6. 관측 로그 ─────────────────────────────────────────
echo "⑥ 팀 가동 로그 (_conventions §J)"
if [ -d "logs/team-run" ]; then
  LOGS=$(find logs/team-run -name "*.md" -mtime -30 2>/dev/null | wc -l | tr -d ' ')
  echo "   최근 30일 팀 로그 ${LOGS}건"
  [ "$LOGS" = "0" ] && echo "   ⏭ 팀을 안 돌렸거나, 로그 규약이 지켜지지 않음"
else
  echo "   🔴 logs/team-run/ 없음 · 관측 층 미설치"
fi
echo


# ── 7. 방법론 정본 배선 ──────────────────────────────────
echo "⑦ 방법론 정본 배선 (canonical_skill)"
WIRED=$(grep -rl 'canonical_skill: "[0-9]' agents --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
NOCANON=$(grep -rl 'canonical_skill: "none"' agents --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
# 지휘·스태프는 카테고리 전체를 담당하므로 단일 정본 대상이 아니다
LEADERS=$(find agents/leads agents/staff -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
LEADERS=$((LEADERS + $(grep -rl "orchestrator" agents --include="*orchestrator*.md" 2>/dev/null | wc -l | tr -d ' ')))
EXEC=$((TOTAL - LEADERS))
echo "   실행 직원 ${EXEC}명 중 · 정본 연결 ${WIRED} · 정본없음 명시 ${NOCANON}"
UNMARKED=$((EXEC - WIRED - NOCANON))
if [ "$UNMARKED" -gt 0 ]; then
  echo "   ⚠️ 미표기 ${UNMARKED}명 · 정본을 연결하거나 canonical_skill: \"none\" + 사유를 남길 것"
  if [ "$FULL" = "1" ]; then
    grep -rL "canonical_skill" agents --include="*.md" 2>/dev/null | grep -v "/_\|TEAM\|README\|leads/\|staff/\|orchestrator" | sed 's/^/      /'
  fi
else
  echo "   ✅ 실행 직원 전원 표기 완료 (지휘 17·스태프 4는 단일 정본 대상 아님)"
fi
echo

echo "── 감사 종료 · 조치가 필요하면 위 ⚠️🔴 항목부터"
echo "   보완 후 CLAUDE.md '하네스' 절 변경 이력에 1행 남길 것"
