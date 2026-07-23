#!/usr/bin/env bash
# build-dist.sh · 정본(marketing-os)에서 깃허브 배포용 폴더를 재생성한다.
# 손으로 복사하지 않는다 — git 추적 파일(=배포 코어)만 골라 복사하므로 정본과 절대 어긋나지 않는다.
# 사용: bash scripts/build-dist.sh
set -eo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"          # marketing-os 루트
DIST="${1:-$(cd "$SRC/.." && pwd)/marketing-os-dist}"   # 기본: 형제 폴더

echo "정본: $SRC"
echo "배포: $DIST"

# 1) git 추적 파일 목록 = 배포 코어 (gitignore된 로컬/런타임은 자동 제외)
cd "$SRC"
LIST="$(mktemp)"
# 한글 파일명 이스케이프 방지 + 인덱스엔 있으나 워킹트리에서 삭제된 파일 제외
git -c core.quotepath=false ls-files | while IFS= read -r f; do [ -e "$f" ] && printf '%s\n' "$f"; done > "$LIST"
COUNT="$(wc -l < "$LIST" | tr -d ' ')"
echo "배포 코어 파일: ${COUNT}개"

# 2) 배포 폴더 비우고 재구성 (.git은 보존 — 배포 저장소 이력 유지)
mkdir -p "$DIST"
find "$DIST" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# 3) 추적 파일만 구조 유지하며 복사
rsync -a --files-from="$LIST" "$SRC/" "$DIST/"
rm -f "$LIST"

# 3.5) 배포판 .mcp.json 플레이스홀더화 (정본 절대경로 → 이식 가능 변수 · 정본은 안 건드림)
if [ -f "$DIST/.mcp.json" ]; then
  python3 - "$DIST/.mcp.json" "$SRC" <<'PYEOF'
import sys, re
f, src = sys.argv[1], sys.argv[2]
t = open(f, encoding='utf-8').read()
t = t.replace(src, "${CLAUDE_PROJECT_DIR}")                       # 프로젝트 경로 → 표준 변수
t = t.replace("/Users/steve/.local/bin/uvx", "uvx")              # 홈 도구 → PATH
t = t.replace("/Users/steve/.bun/bin/bun", "bun")
t = re.sub(r'/Users/steve/[^"]*ax project/gbrain', '${GBRAIN_DIR}', t)  # gbrain(WMBB 전용) → env
t = t.replace('"427641480"', '"${GA4_PROPERTY_ID}"')            # WMBB GA4 속성 → env
t = t.replace('marketing-os-497122', '${GOOGLE_PROJECT_ID}')    # WMBB GCP 프로젝트 → env
open(f, 'w', encoding='utf-8').write(t)
print("  ✓ .mcp.json 플레이스홀더화 (절대경로 제거)")
PYEOF
fi

# 4) 배포 안전 게이트 검사 (통과 못 하면 push 금지 항목 경고)
echo ""
echo "=== 배포 전 게이트 (push 전 반드시 통과) ==="
GATE_FAIL=0
grep -q "상업적 재배포" "$DIST/.claude-plugin/plugin.json" 2>/dev/null && { echo "🔴 라이선스: '상업적 재배포 금지' 잔존 → 교체 필요 (로드맵 0단계)"; GATE_FAIL=1; } || echo "✓ 라이선스 문구 정리됨 (MIT)"
[ -f "$DIST/LICENSE" ] && echo "✓ LICENSE 파일 포함" || { echo "🔴 LICENSE 파일 누락"; GATE_FAIL=1; }
grep -rq "/Users/steve" "$DIST/.mcp.json" 2>/dev/null && { echo "🔴 .mcp.json: 절대경로(/Users/steve) 잔존 → 플레이스홀더화 필요 (로드맵 1단계)"; GATE_FAIL=1; } || echo "✓ .mcp.json 절대경로 없음"
[ -f "$DIST/.env" ] && { echo "🔴 .env 유출!"; GATE_FAIL=1; } || echo "✓ .env 미포함"
grep -rlq "WMBB\|한성국\|steve@wmbb" "$DIST/agents/orchestrator.md" 2>/dev/null && echo "🟡 오케스트레이터 하드코딩 잔존 → 접점 치환 권장 (로드맵 1단계)" || echo "✓ 오케스트레이터 하드코딩 없음"

echo ""
if [ "$GATE_FAIL" -eq 1 ]; then
  echo "⛔ 게이트 미통과 · 배포 폴더는 만들어졌으나 GitHub push 금지. 위 🔴 해결 후 재실행."
else
  echo "✅ 게이트 통과 · push 가능 상태."
fi
echo "배포 폴더: $DIST ($COUNT 파일)"
