#!/usr/bin/env bash
# marketing-os MCP 일괄 헬스 체크
#
# 사용법:
#   bash scripts/healthcheck-all.sh
#
# 또는 Claude Code 에서:
#   "MCP 헬스 체크 실행해줘"

set -uo pipefail

# ───── 경로 ─────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
MCP_FILE="$PROJECT_DIR/.mcp.json"

# ───── 색상 ─────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok() { echo -e "${GREEN}✅${NC} $1"; }
fail() { echo -e "${RED}❌${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️ ${NC} $1"; }
info() { echo -e "${BLUE}ℹ️ ${NC} $1"; }

# ───── 헤더 ─────
echo ""
echo -e "${BOLD}${CYAN}🩺 marketing-os MCP 헬스 체크${NC}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════${NC}"
echo ""

# ───── 사전 검증 ─────
echo -e "${BOLD}📋 사전 검증${NC}"

# Node.js
if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version)
  ok "Node.js $NODE_VERSION"
else
  fail "Node.js 미설치 → https://nodejs.org/"
  exit 1
fi

# Python (선택)
if command -v python3 &>/dev/null; then
  PY_VERSION=$(python3 --version | cut -d' ' -f2)
  ok "Python $PY_VERSION"
else
  warn "Python 3 미설치 (ga4 MCP 에 필요)"
fi

# uv (ga4 + heygen + elevenlabs)
if command -v uvx &>/dev/null; then
  UV_VERSION=$(uv --version 2>/dev/null | head -1)
  ok "uv $UV_VERSION"
else
  warn "uv 미설치 → curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

# .env
if [[ -f "$ENV_FILE" ]]; then
  ok ".env 파일 존재"
  set -a; source "$ENV_FILE"; set +a
else
  fail ".env 파일 없음 → cp .env.example .env"
  exit 1
fi

# .mcp.json
if [[ -f "$MCP_FILE" ]]; then
  if python3 -c "import json; json.load(open('$MCP_FILE'))" 2>/dev/null; then
    ok ".mcp.json JSON 정상"
  else
    fail ".mcp.json JSON 오류"
    exit 1
  fi
else
  fail ".mcp.json 없음"
  exit 1
fi

echo ""
echo -e "${BOLD}🔌 8개 외부 MCP 헬스 체크${NC}"
echo ""

# ───── 헬스 체크 카운터 ─────
TOTAL=0
PASS=0
FAIL=0
WARN_COUNT=0

# ───── 개별 MCP 체크 함수 ─────
check_mcp() {
  local name="$1"
  local label="$2"
  local env_var="$3"
  local expected_pattern="$4"
  local test_cmd="$5"

  ((TOTAL+=1))
  printf "${BOLD}[%d/8]${NC} %-15s " "$TOTAL" "$label"

  # 환경변수 부재 = 미발급
  if [[ -n "$env_var" ]]; then
    local val="${!env_var:-}"
    if [[ -z "$val" ]]; then
      echo -e "${YELLOW}⚠️  미발급 ($env_var)${NC}"
      ((WARN_COUNT+=1))
      return
    fi
    # 패턴 검증
    if [[ -n "$expected_pattern" ]] && ! [[ "$val" =~ $expected_pattern ]]; then
      echo -e "${YELLOW}⚠️  형식 의심 ($env_var)${NC}"
      ((WARN_COUNT+=1))
      return
    fi
  fi

  # 실제 시작 테스트
  if [[ -n "$test_cmd" ]]; then
    if eval "$test_cmd" &>/dev/null; then
      echo -e "${GREEN}✅ Connected${NC}"
      ((PASS+=1))
    else
      echo -e "${RED}❌ Failed${NC}"
      ((FAIL+=1))
    fi
  else
    echo -e "${GREEN}✅ 환경변수 OK${NC}"
    ((PASS+=1))
  fi
}

# ───── 1. google-sheets (자체 호스팅) ─────
((TOTAL+=1))
printf "${BOLD}[%d/8]${NC} %-15s " "$TOTAL" "google-sheets"
if [[ -f "$PROJECT_DIR/mcp-server/oauth_credentials.json" ]]; then
  if [[ -f "$PROJECT_DIR/mcp-server/token.json" ]]; then
    if [[ -d "$PROJECT_DIR/mcp-server/node_modules" ]]; then
      echo -e "${GREEN}✅ 완전 설치 (creds + token + deps)${NC}"
      ((PASS+=1))
    else
      echo -e "${YELLOW}⚠️  npm install 필요${NC}"
      ((WARN_COUNT+=1))
    fi
  else
    echo -e "${YELLOW}⚠️  OAuth 인증 필요 (Claude 재시작)${NC}"
    ((WARN_COUNT+=1))
  fi
else
  echo -e "${YELLOW}⚠️  oauth_credentials.json 발급 필요${NC}"
  ((WARN_COUNT+=1))
fi

# ───── 2. ga4 (mcp-server-ga4 + ADC) ─────
((TOTAL+=1))
printf "${BOLD}[%d/8]${NC} %-15s " "$TOTAL" "ga4"
ADC_FILE="$HOME/.config/gcloud/application_default_credentials.json"
if [[ -z "${GA4_PROPERTY_ID:-}" ]]; then
  echo -e "${YELLOW}⚠️  GA4_PROPERTY_ID 미설정${NC}"
  ((WARN_COUNT+=1))
elif ! [[ "${GA4_PROPERTY_ID}" =~ ^[0-9]{9,10}$ ]]; then
  echo -e "${YELLOW}⚠️  GA4_PROPERTY_ID 형식 (9자리 숫자만)${NC}"
  ((WARN_COUNT+=1))
elif [[ ! -f "$ADC_FILE" ]]; then
  echo -e "${YELLOW}⚠️  ADC 미발급 (gcloud auth application-default login)${NC}"
  ((WARN_COUNT+=1))
else
  echo -e "${GREEN}✅ ADC + Property ID${NC}"
  ((PASS+=1))
fi

# ───── 3. firecrawl ─────
check_mcp "firecrawl" "firecrawl" "FIRECRAWL_API_KEY" "^fc-" ""

# ───── 4. youtube-data ─────
check_mcp "youtube-data" "youtube-data" "YOUTUBE_API_KEY" "^AIza" ""

# ───── 5. buffer ─────
# 신형 토큰 (OIDC, _ 시작) 또는 기존 형식 (1/ 시작) 둘 다 인정
check_mcp "buffer" "buffer" "BUFFER_ACCESS_TOKEN" "^(_|1/)" ""

# ───── 6. meta-ads (Meta 공식 hosted MCP) ─────
((TOTAL+=1))
printf "${BOLD}[%d/8]${NC} %-15s " "$TOTAL" "meta-ads"
META_STATUS=$(claude mcp list 2>&1 | grep -i "meta-ads\|mcp.facebook" | head -1)
if echo "$META_STATUS" | grep -q "Connected"; then
  echo -e "${GREEN}✅ hosted MCP Connected (OAuth)${NC}"
  ((PASS+=1))
elif echo "$META_STATUS" | grep -q "Needs authentication"; then
  echo -e "${YELLOW}⚠️  OAuth 인증 필요 (Claude Code 재시작 후 첫 사용 시 자동)${NC}"
  ((WARN_COUNT+=1))
elif [[ -z "$META_STATUS" ]]; then
  echo -e "${YELLOW}⚠️  미등록 (claude mcp add --transport http meta-ads https://mcp.facebook.com/ads)${NC}"
  ((WARN_COUNT+=1))
else
  echo -e "${RED}❌ 연결 실패: $META_STATUS${NC}"
  ((FAIL+=1))
fi

# ───── 7. google-ads (Google 공식 MCP + ADC) ─────
((TOTAL+=1))
printf "${BOLD}[%d/8]${NC} %-15s " "$TOTAL" "google-ads"
ADC_FILE="$HOME/.config/gcloud/application_default_credentials.json"
if [[ -z "${GOOGLE_ADS_DEVELOPER_TOKEN:-}" ]]; then
  echo -e "${YELLOW}⚠️  GOOGLE_ADS_DEVELOPER_TOKEN 미설정 (승인 1~2일 대기 중)${NC}"
  ((WARN_COUNT+=1))
elif [[ ! -f "$ADC_FILE" ]]; then
  echo -e "${YELLOW}⚠️  ADC 파일 없음 (gcloud auth application-default login 필요)${NC}"
  ((WARN_COUNT+=1))
else
  echo -e "${GREEN}✅ Developer Token + ADC 모두 설정${NC}"
  ((PASS+=1))
fi

# ───── 8. discord ─────
check_mcp "discord" "discord" "DISCORD_BOT_TOKEN" "^[A-Za-z0-9._-]+$" ""

echo ""
echo -e "${BOLD}═══════════════════════════════════${NC}"

# ───── 종합 결과 ─────
PERCENT=$((PASS * 100 / TOTAL))
echo -e "${BOLD}📊 결과: ${GREEN}${PASS}${NC}/${TOTAL} 활성 · ${YELLOW}${WARN_COUNT}${NC} 미발급 · ${RED}${FAIL}${NC} 실패 · ${BOLD}${PERCENT}%${NC}"

# 진행률 바
BAR_LEN=20
FILLED=$((PASS * BAR_LEN / TOTAL))
echo -ne "["
for ((i=0; i<FILLED; i++)); do echo -ne "█"; done
for ((i=FILLED; i<BAR_LEN; i++)); do echo -ne "░"; done
echo -e "]"
echo ""

# ───── 다음 단계 안내 ─────
if [[ $PASS -eq 8 ]]; then
  echo -e "${GREEN}${BOLD}🎉 8개 MCP 모두 활성화. 첫 결과물 만들 준비 완료!${NC}"
  echo ""
  echo "  다음 명령으로 즉시 시작:"
  echo "    \"주간 종합 리포트 만들어줘\"  (Google Sheets)"
  echo "    \"지난 7일 GA4 채널별 표\"    (GA4)"
  echo "    \"경쟁사 3사 비교표\"         (Firecrawl)"
elif [[ $WARN_COUNT -gt 0 ]]; then
  info "미발급 항목은 다음 명령으로 일괄 진행:"
  echo "    Claude Code 에서: \"MCP 전체 설치하자\""
fi

# ───── claude mcp list (선택) ─────
if command -v claude &>/dev/null; then
  echo ""
  info "claude mcp list 결과:"
  claude mcp list 2>&1 | grep -v "^Checking\|^$" | head -20
fi

echo ""

# FAIL 존재 시 비정상 종료 → cron wrapper가 Discord #alerts로 알림
exit $(( FAIL > 0 ? 1 : 0 ))
