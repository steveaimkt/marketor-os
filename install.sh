#!/usr/bin/env bash
# install.sh · 마케팅 OS를 한 번에 세운다
#
#   git clone https://github.com/steveaimkt/marketor-os.git
#   cd marketor-os
#   bash install.sh
#
# 하는 일
#   1. 전제 확인   node 20+ · git · claude CLI (없으면 설치 방법만 안내하고 멈춤)
#   2. 의존성      npm install
#   3. .env 준비   .env.example 복사 (이미 있으면 절대 덮어쓰지 않음)
#   4. 설치 검증   node scripts/doctor.mjs (무엇이 되고 안 되는지 정직하게 표)
#   5. 첫 실행 안내
#
# 하지 않는 일
#   · API 키를 대신 발급하지 않는다 → 각 도구 안내는 mcp-setup/{도구}/
#   · Claude 로그인을 대신 하지 않는다 → claude 명령 첫 실행 시 로그인
#   · 필수가 아닌 키가 비어 있어도 멈추지 않는다 (그 도구만 꺼진 채 동작)
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"
FAIL=0

echo ""
echo "════════════════════════════════════════"
echo "  마케팅 OS 설치"
echo "════════════════════════════════════════"
echo ""
echo "▶ 1/4 전제 확인"

if command -v node >/dev/null 2>&1; then
  V="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$V" -ge 20 ]; then echo "  ✅ node $(node -v)"
  else echo "  ❌ node $V 는 낮습니다. 20 이상이 필요합니다 → https://nodejs.org (LTS)"; FAIL=1; fi
else
  echo "  ❌ node 없음 → https://nodejs.org 에서 LTS 설치"; FAIL=1
fi

command -v git >/dev/null 2>&1 && echo "  ✅ git $(git --version | cut -d' ' -f3)" || { echo "  ❌ git 없음 → xcode-select --install (맥) 또는 apt install git"; FAIL=1; }

if command -v claude >/dev/null 2>&1; then
  echo "  ✅ claude CLI $(claude --version 2>/dev/null | head -1)"
else
  echo "  ❌ claude CLI 없음 → npm install -g @anthropic-ai/claude-code"
  echo "     설치 후 터미널에서 claude 를 한 번 실행해 로그인하세요"; FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo "⛔ 전제가 빠져 있습니다. 위 ❌ 를 해결한 뒤 다시 실행하세요: bash install.sh"
  exit 1
fi

echo ""
echo "▶ 2/4 의존성 설치 (npm install)"
npm install --silent --no-fund --no-audit && echo "  ✅ 완료" || { echo "  ❌ npm install 실패 · 네트워크를 확인하고 다시 실행하세요"; exit 1; }

echo ""
echo "▶ 3/4 환경 파일 (.env)"
if [ -f .env ]; then
  echo "  ✅ .env 이미 있음 · 건드리지 않습니다"
else
  cp .env.example .env
  echo "  ✅ .env.example → .env 복사"
  echo "     지금 채우지 않아도 됩니다. 키가 비면 그 도구만 꺼진 채 동작합니다."
  echo "     도구별 발급 안내: mcp-setup/{도구}/ 폴더"
fi

echo ""
echo "▶ 4/4 설치 검증"
node scripts/doctor.mjs || true

echo ""
echo "════════════════════════════════════════"
echo "  설치 끝 · 첫 실행"
echo "════════════════════════════════════════"
echo ""
echo "  1) 이 폴더에서 claude 를 열고 이렇게 말하세요:"
echo ""
echo "       \"마케팅팀 구축하자\""
echo ""
echo "     → 회사 인터뷰로 우리 팀에 맞는 사람+AI 팀을 구성합니다 (최초 1회)"
echo ""
echo "  2) 구성이 끝나면:  \"팀 실행하자\"  → 배선·대시보드·첫 업무 시동"
echo ""
echo "  3) 대시보드(선택):  npm run dashboard  →  http://localhost:3737"
echo ""
echo "  상태가 이상할 땐 언제든:  npm run doctor"
echo ""
