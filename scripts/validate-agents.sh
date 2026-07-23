#!/bin/bash
# scripts/validate-agents.sh — agents/**/*.md frontmatter YAML 검증
#
# 배경: frontmatter가 strict YAML 파싱에 실패하면 그 에이전트는 서브에이전트
# 레지스트리에 등록되지 않아 Agent 도구로 호출 불가가 된다 (에러 없이 조용히 빠짐).
# 2026-07-16 감사에서 37명 중 17명이 이 문제로 미등록 상태였다.
#
# 사용: bash scripts/validate-agents.sh        # 전체 검사
#       bash scripts/validate-agents.sh <파일>  # 단일 파일
# 종료 코드: 0=전부 통과 · 1=위반 발견
set -u
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_DIR="$PROJECT_DIR/agents"

if [ $# -ge 1 ]; then
  FILES=("$@")
else
  FILES=()
  while IFS= read -r -d '' f; do FILES+=("$f"); done \
    < <(find "$AGENTS_DIR" -name "*.md" -not -path "*/_archive/*" -not -name "README.md" -not -name "TEAM.md" -not -name "TEAM-MODE.md" -not -name "_conventions.md" -print0)
fi

FAIL=0; PASS=0
for f in "${FILES[@]}"; do
  RESULT=$(python3 - "$f" <<'PY'
import re, sys
try:
    import yaml
except ImportError:
    print("SKIP: pyyaml 미설치 (pip3 install pyyaml)"); sys.exit(0)
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
m = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
if not m:
    print("FAIL: frontmatter 블록(---) 없음"); sys.exit(1)
try:
    data = yaml.safe_load(m.group(1))
except yaml.YAMLError as e:
    line = getattr(getattr(e, "problem_mark", None), "line", "?")
    print(f"FAIL: YAML 파싱 실패 (frontmatter {line}행 근처) — {getattr(e, 'problem', e)}")
    sys.exit(1)
if not isinstance(data, dict) or "name" not in data or "description" not in data:
    print("FAIL: name/description 필드 누락"); sys.exit(1)
print("OK")
PY
)
  if [[ "$RESULT" == OK ]]; then
    PASS=$((PASS+1))
  elif [[ "$RESULT" == SKIP* ]]; then
    echo "⚠️  $RESULT"; exit 0
  else
    FAIL=$((FAIL+1))
    echo "🔴 ${f#$PROJECT_DIR/} — ${RESULT#FAIL: }"
    echo "   힌트: ① 리스트 항목의 닫는 따옴표 뒤 텍스트 금지 (- \"A\" · \"B\" → 항목 분리)"
    echo "         ② 따옴표로 시작한 값에 내용 이어붙이기 금지 (- notion: \"페이지\"에 1행 → 전체를 단일 인용)"
  fi
done

echo "── validate-agents: ✅ $PASS 통과 / 🔴 $FAIL 위반"
[ $FAIL -eq 0 ]
