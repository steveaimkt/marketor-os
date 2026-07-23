# 설치 자동화 + 채널 연동 상세 (STEP 5.7 · STEP 6 에서 사용)

## STEP 5.7 · PHASE 4 봇 설치 자동화

### 1. `.claude/settings.json` 권한 패치 (자동 1분)

Q3 답변 기반으로 marketing-os 루트의 `.claude/settings.json` 자동 머지.
⚠️ 기존 파일이 있으면 **백업** (`settings.json.bak.{date}`) 후 allow/deny 머지. 덮어쓰기 X.

```json
{
  "permissions": {
    "allow": [
      "mcp__claude_ai_Gmail__search_threads",
      "mcp__claude_ai_Gmail__list_drafts",
      "mcp__ga4__*",
      "mcp__google-sheets__read_sheet",
      "mcp__claude_ai_Notion__notion-fetch",
      "mcp__meta-ads__get_insights",
      "mcp__google-ads__search"
    ],
    "deny": [
      "mcp__meta-ads__update_*budget*",
      "mcp__google-ads__update_*budget*"
    ]
  }
}
```

### 2. launchd plist 자동 작성 (macOS · 자동 2분)

Q2 의 매일·매주 업무 → launchd 등록 :

```bash
# 매일 07:00 · daily-briefing
~/Library/LaunchAgents/com.marketing-os.daily-briefing.plist
# 매주 월 07:00 · weekly-newsletter
~/Library/LaunchAgents/com.marketing-os.weekly-newsletter.plist

launchctl load ~/Library/LaunchAgents/com.marketing-os.daily-briefing.plist
launchctl load ~/Library/LaunchAgents/com.marketing-os.weekly-newsletter.plist
launchctl list | grep marketing-os   # 검증
```

**Windows 분기** : `schtasks /create ...` 작업 스케줄러 명령 자동 생성·등록.
plist 본문 작성법 : discord-channels-setup APPENDIX C 참조.

### 3. cron 등록 (즉시 알림 폴링 · 자동 1분)

```bash
# 매시간 ROAS 임계치 체크 (Discord Webhook 사용 · --channels 세션 의존 X)
( crontab -l 2>/dev/null; echo "0 * * * * cd $MARKETING_OS && claude -p 'check-ads 실행'" ) | crontab -
```

⚠️ 본 cron 은 `--channels` 세션과 별개. PC 만 켜져 있으면 동작 (Discord Webhook 발송).

### 4. 설치 검증 (자동 30초)

```bash
cat marketing-os/.claude/settings.json | python3 -m json.tool   # 1. 권한 패치
launchctl list | grep marketing-os                               # 2. launchd
crontab -l | grep check-ads                                      # 3. cron
curl -X POST $DISCORD_WEBHOOK_URL -H "Content-Type: application/json" \
  -d '{"content":"🚨 봇 설치 테스트 알림 — 무시 OK"}'             # 4. Webhook
```

---

## STEP 6 · PHASE 5 채널 연동 상세

### 1. 필요 채널 수 (Q4 답변 기반)

- 옵션 A (DM 통합) → 채널 0개, 본인 DM 만
- 옵션 B/C → Q4 라우팅 표의 채널 수만큼

### 2. 채널 생성 + ID 복사 가이드

```
Discord 앱 :
  1. 본인 서버 → '+' 또는 'Create Channel' → 텍스트 채널
  2. 이름 입력 (#광고 · #콘텐츠 · #일정 등) · 권한은 본인만 보기 권장

채널 ID 복사 (필수) :
  - Discord 설정 → 고급 → '개발자 모드' ON (1회만)
  - 채널 우클릭 (폰은 길게 누르기) → '채널 ID 복사'
  - 예: 1234567890123456789 (18~19자 숫자)
```

### 3. access.json 자동 패치

```bash
python3 -c "
import json, pathlib, sys, shutil
from datetime import datetime
p = pathlib.Path.home() / '.claude/channels/discord/access.json'
shutil.copy(p, str(p) + '.bak.' + datetime.now().strftime('%Y%m%d-%H%M%S'))

data = json.loads(p.read_text())
data['groups'][sys.argv[1]] = {
    'requireMention': True,   # 봇 멘션 시만 응답 (스팸 방지)
    'allowFrom': []           # 빈 리스트 = 본인 상속
}
p.write_text(json.dumps(data, indent=2))
print(f'✅ 채널 추가: {sys.argv[2]} ({sys.argv[1]})')
" "$CHANNEL_ID" "$CHANNEL_NAME"
```

⚠️ `--channels` 세션 **재시작 필수** (정책 갱신 반영) :
기존 세션 Ctrl+C 후 `claude --channels plugin:discord@claude-plugins-official`

### 4. 첫 가동 검증 시나리오

```
[DM 통합 (A)]   본인 DM → "오늘 매출·광고·CS 통합 알려줘" → 30초 내 답신
[채널 분리 (B/C)] 해당 채널에서 @marketing-ch 어제 ROAS 알려줘 → 30초 내 답신
[범위 외 테스트]  #광고 채널에서 "오늘 일정 알려줘"
                → "이 채널에서는 광고 분석만 가능합니다. 전체는 DM 으로." 거부
                → CLAUDE.md 라우팅 룰 정상 작동 확인
```

### 5. 사용 시작 안내 (완료 멘트)

```
🎉 5 PHASE 모두 완료. 봇 비서 가동 시작.

다음 행동:
  📖 OPERATIONS.md 확인 — 자주 쓰는 발화 15~20개 (~/.claude/channels/discord/)
  📊 첫 주 점검 — launchctl list | grep marketing-os · tail -f /tmp/daily-briefing.out.log
  🔧 새 발화 등록 — OPERATIONS.md § 2 에 1줄 추가 + 봇에게 "이런 명령 추가해줘"
  📡 채널 추가 — 본 스킬 재호출 + PHASE 5 만 진행
```
