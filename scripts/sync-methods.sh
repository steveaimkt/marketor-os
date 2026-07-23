#!/usr/bin/env bash
# sync-methods.sh · msk(정본)에서 methods(배포용 복사본)를 재생성한다.
# msk/plugins 스킬을 수정하면 이 스크립트로 methods를 갱신한다.
set -eo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
[ -d "$SRC/msk/plugins" ] || { echo "❌ msk 정본 없음 (심링크 확인)"; exit 1; }
rm -rf "$SRC/methods"; mkdir -p "$SRC/methods"
cp -R "$SRC/msk/plugins/." "$SRC/methods/"
[ -f "$SRC/msk/brand/compliance.md" ] && cp "$SRC/msk/brand/compliance.md" "$SRC/methods/compliance.md"
echo "✓ methods 갱신: $(find "$SRC/methods" -name SKILL.md|wc -l|tr -d ' ')스킬"
