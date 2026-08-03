#!/usr/bin/env bash
# deploy.sh · 대시보드를 VPS 에 올린다
#
# 맥에서 실행한다. VPS 에 SSH 로 붙어 코드를 내리고 상주시킨다.
#
#   bash automation/dashboard-vps/deploy.sh <user>@<host> [경로] [포트]
#   예) bash automation/dashboard-vps/deploy.sh root@1.2.3.4 /root/marketing-os 22
#
# 하는 일
#   1. 접속·전제 확인 (git · node 20+ · 리포 존재)
#   2. git pull (없으면 clone) + npm install
#   3. .env 를 맥에서 안전하게 복사 (표준입력으로 넘겨 프로세스 목록에 안 남게)
#   4. systemd 서비스 등록 + 기동
#   5. 상태 확인
#
# ⚠️ 하지 않는 일
#   · Claude 인증은 대신 못 한다. VPS 에서 한 번 로그인하거나
#     맥에서 `claude setup-token` 으로 받은 토큰을 .env 의 CLAUDE_CODE_OAUTH_TOKEN 에 넣어야 한다.
#   · HTTPS 는 씌우지 않는다. Caddyfile 예시를 참고해 따로 세운다.
set -euo pipefail

TARGET="${1:-}"
REMOTE_PATH="${2:-/root/marketing-os}"
SSH_PORT="${3:-22}"
REPO="git@github.com:steveaimkt/marketing-os.git"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -z "$TARGET" ]; then
  echo "사용: bash automation/dashboard-vps/deploy.sh <user>@<host> [경로] [포트]"
  exit 1
fi

sshx() { ssh -o BatchMode=yes -o ConnectTimeout=10 -p "$SSH_PORT" "$TARGET" "$@"; }

echo "▶ 1/5 접속과 전제 확인 ($TARGET)"
sshx 'bash -lc "
  set -e
  command -v git  >/dev/null || { echo \"git 이 없습니다\"; exit 1; }
  command -v node >/dev/null || { echo \"node 가 없습니다. Node 20 이상을 먼저 설치하세요\"; exit 1; }
  V=\$(node -p \"process.versions.node.split(String.fromCharCode(46))[0]\")
  [ \"\$V\" -ge 20 ] || { echo \"Node \$V 는 낮습니다. 20 이상 필요\"; exit 1; }
  echo \"  node \$(node -v) · git \$(git --version | cut -d\" \" -f3)\"
"'

echo "▶ 2/5 코드 내리기 (브랜치 $BRANCH)"
sshx "bash -lc '
  set -e
  if [ -d \"$REMOTE_PATH/.git\" ]; then
    cd \"$REMOTE_PATH\" && git fetch --quiet origin && git checkout --quiet \"$BRANCH\" && git pull --quiet
    echo \"  git pull 완료\"
  else
    git clone --quiet --branch \"$BRANCH\" \"$REPO\" \"$REMOTE_PATH\"
    echo \"  git clone 완료\"
  fi
  cd \"$REMOTE_PATH\" && npm install --omit=dev --silent && echo \"  npm install 완료\"
'"

echo "▶ 3/5 .env 복사"
if [ ! -f "$HERE/.env" ]; then
  echo "  ⚠️ 맥에 .env 가 없습니다. 건너뜁니다."
else
  # 인자로 넘기지 않고 표준입력으로 보낸다 (ps 에 비밀값이 노출되지 않게)
  sshx "cat > $REMOTE_PATH/.env && chmod 600 $REMOTE_PATH/.env" < "$HERE/.env"
  echo "  복사 완료 (권한 600)"
  echo "  ⚠️ VPS 는 맥과 환경이 다릅니다. 아래 값은 VPS 기준으로 다시 확인하세요."
  echo "     · DASHBOARD_ALLOWED_HOSTS  (VPS 도메인 또는 IP)"
  echo "     · DASHBOARD_SECURE_COOKIE  (HTTPS 뒤에 두면 true)"
  echo "     · CLAUDE_CODE_OAUTH_TOKEN  (없으면 VPS 에서 claude 로그인 1회)"
fi

echo "▶ 4/5 systemd 등록"
sshx "bash -lc '
  set -e
  sed -e \"s|__PATH__|$REMOTE_PATH|g\" -e \"s|__NODE__|\$(command -v node)|g\" \
    \"$REMOTE_PATH/automation/dashboard-vps/marketing-os-dashboard.service\" \
    > /etc/systemd/system/marketing-os-dashboard.service
  systemctl daemon-reload
  systemctl enable --now marketing-os-dashboard
  echo \"  서비스 등록·기동 완료\"
'"

echo "▶ 5/5 상태"
sshx 'bash -lc "systemctl --no-pager -l status marketing-os-dashboard | head -12; echo; journalctl -u marketing-os-dashboard -n 12 --no-pager"' || true

cat <<EOF

── 다음 할 일 ──────────────────────────────
1. VPS 에서 Claude 인증 확인
   ssh -p $SSH_PORT $TARGET "cd $REMOTE_PATH && node scripts/sdk-p.mjs -p '1+1은? 숫자만'"
   → 2 가 나오면 통과. 안 나오면 CLAUDE_CODE_OAUTH_TOKEN 을 넣으세요.

2. HTTPS 씌우기 (Caddy 예시)
   automation/dashboard-vps/Caddyfile.example 참고

3. 대시보드에서 이 VPS 를 실행 위치로 등록
   설정과 연결 → VPS 봇 → 연결하기 → 시험
EOF
