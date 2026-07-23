#!/bin/bash
# check-org-drift.sh — 결합 조직 건강검진 (MSK 정본 ↔ 배치판 13 + 경로·브랜드 허브)
# 사용: 수동 실행 or 트루먼이 주간 회고 때. 문제 시만 출력이 길어짐.
MOSB="$(cd "$(dirname "$0")/.." && pwd)"
MSK="$MOSB/msk"
ok=0; warn=0
echo "── 결합 조직 건강검진 $(date '+%Y-%m-%d %H:%M')"
# 1. msk 심링크
if [ -d "$MSK/plugins" ] && [ -f "$MSK/gates/compliance-gate.md" ]; then echo "✅ msk 심링크 정상"; ok=$((ok+1))
else echo "🔴 msk 심링크 깨짐 — MSK 폴더 이동됨? ln -sfn <새경로> \"$MOSB/msk\" 로 복구"; warn=$((warn+1)); fi
# 2. 브랜드 허브 (WMBB 배치 정본)
if grep -q "WMBB" "$MOSB/brand/profile.md" 2>/dev/null; then echo "✅ 브랜드 허브(WMBB) 정상"; ok=$((ok+1))
else echo "🔴 brand/profile.md 비었거나 유실 — MSK/logs/archive 백업에서 복원 필요"; warn=$((warn+1)); fi
# 3. 조직 드리프트: MSK 원본 13이 배치판보다 최신인가
drift=0
for f in "$MSK/.claude/agents/"*.md; do
  n=$(basename "$f")
  for d in "$MOSB/agents/leads/$n" "$MOSB/agents/staff/$n"; do
    if [ -f "$d" ] && [ "$f" -nt "$d" ]; then echo "🟡 드리프트: MSK $n 이 배치판보다 최신 (설계 변경? 재적용 검토)"; drift=$((drift+1)); fi
  done
done
[ "$drift" -eq 0 ] && { echo "✅ 조직 13쌍 드리프트 없음"; ok=$((ok+1)); } || warn=$((warn+1))
# 4. 배치판 13 정족수
cnt=$(ls "$MOSB/agents/leads/"*.md "$MOSB/agents/staff/"*.md 2>/dev/null | wc -l | tr -d ' ')
[ "$cnt" = "13" ] && { echo "✅ 배치판 13/13"; ok=$((ok+1)); } || { echo "🔴 배치판 ${cnt}/13"; warn=$((warn+1)); }
# 5. 에이전트 frontmatter YAML (위반 시 레지스트리 미등록 = 호출 불가)
VA_OUT=$(bash "$MOSB/scripts/validate-agents.sh" 2>&1); VA_RC=$?
[ $VA_RC -eq 0 ] && { echo "✅ ${VA_OUT##*── }"; ok=$((ok+1)); } || { echo "$VA_OUT"; warn=$((warn+1)); }
# 6. 죽은 경로 참조 (리팩토링 후 깨진 링크)
CL_OUT=$(bash "$MOSB/scripts/check-links.sh" 2>&1); CL_RC=$?
[ $CL_RC -eq 0 ] && { echo "✅ ${CL_OUT##*── }"; ok=$((ok+1)); } || { echo "$CL_OUT"; warn=$((warn+1)); }
echo "── 결과: 정상 $ok · 경고 $warn"
exit $warn
