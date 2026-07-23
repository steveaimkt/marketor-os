# 산출물 템플릿 (STEP 5 · 5.5 에서 사용)

> Q1~Q4 답변 + STEP 0.5 인벤토리 결과로 `{...}` 자리를 자동 채움.

## ① my-bot-spec.md (필수)

저장 위치 : `marketing-os/outputs/{YYYY-MM-DD}/bot-design/{date}-my-bot-spec.md`

```markdown
# 내 클로드 비서 — 설계서 ({YYYY-MM-DD})

## 1. 페르소나
- 이름: marketing-ch
- 비서 대상: {Q1} (예: 1인 마케터)
- 톤: {Q1} (예: 부하직원 보고형)
- 언어: {Q1} (예: 한국어 · 영문 데이터 그대로)
- 길이: {Q1} (예: 5줄 이내 기본)
- 강조: {Q1} (예: ✅ ⚠️ 🚨 만 · 이모지 절제)
- 시그니처 어구 예: "사장님, 어제 광고 ..."

## 2. 우선 가동 에이전트 3개
### 2-1. {업무명 1}
- 트리거 · MCP · 출력 · 에이전트 매핑 · 구현 방식 (cron/launchd/Webhook)
### 2-2. {업무명 2}
### 2-3. {업무명 3}

## 3. 승인 정책
| 영역 | 정책 | 구현 |
|---|---|---|
| 자동 OK | {Q3} | 권한 프롬프트 자동 허용 (settings.json allow) |
| 승인 필요 | {Q3} | 권한 릴레이 → 폰 ✅/❌ |
| 금지 | {Q3} | settings.json deny |

## 4. 채널 라우팅 (Q4 옵션 B/C 시만 · A 면 생략)
| 채널 ID | 채널명 | 허용 기능 | 허용 MCP prefix | 매핑 에이전트 |
|---|---|---|---|---|
→ marketing-os/CLAUDE.md 에 자동 패치됨 (아래 § CLAUDE.md 패치 블록).

## 5. 필요 MCP 매트릭스
| MCP | 활성 | 용도 | 비고 |
|---|---|---|---|

## 6. 구현 우선순위
- 오늘 (즉시 가동): daily-briefing 첫 실행 + 폰 DM 결과 확인
- 1주 (백그라운드): launchd plist + cron 등록 + settings.json 권한 적용
- 1개월 (확장): orchestrator 가동 (Part 10) + 새 에이전트 + 노션 비서 일지 DB

## 7. 첫 가동 명령
폰 Discord DM → "daily-briefing 한 번 실행해줘"

## 8. 다음 단계
- launchd plist 등록 (discord-channels-setup APPENDIX C)
- 권한 정책 settings.json 적용
- orchestrator 가동 (Part 10)
```

## ② OPERATIONS.md (봇 발화 매뉴얼 · 필수)

저장 위치 : `~/.claude/channels/discord/OPERATIONS.md` (Windows: `%USERPROFILE%\.claude\channels\discord\`)

```markdown
# 봇 운영 매뉴얼 — OPERATIONS.md ({date})

## 1. 봇 호출 시작
- 폰 Discord 앱 → marketing-ch 봇 DM (또는 페어링한 채널)
- 정책: allowlist (본인 1명 + 그룹 채널 N)

## 2. 자주 쓰는 발화 (15~20개 · Q2 답변 + 활성 MCP 기반 자동 채움)
- "오늘 일정 알려줘"          → Calendar list_events
- "어제 광고 ROAS 알려줘"      → meta-ads + google-ads get_insights
- "이번주 매출 시트 분석"      → google-sheets read_sheet
- "받은편지함 새 메일 분류"    → gmail search_threads
- "이 답변 노션에 저장"        → notion-create-pages
- "지난주 유튜브 채널 KPI"     → youtube-data getChannelStatistics
- "경쟁사 사이트 신상품 변경"  → firecrawl scrape
- ... ({Q2 기반 자동 추가})

## 3. 권한 승인 흐름 (Q3 기반)
| 영역 | 동작 |
|---|---|
| 자동 OK   | 즉시 실행 + 결과 답신 |
| 승인 필요 | 폰 권한 릴레이로 ✅ 클릭 후 실행 |
| 금지      | "이 작업은 금지" 응답 후 사용자에게 위임 |

## 4. 봇이 답 안 할 때 (3분 진단)
1. Discord 멤버 리스트에서 봇 🟢 온라인 확인
2. PC 의 `--channels` 세션 살아있는지 (`ps aux | grep channels`)
3. `/discord:access list` 로 본인 페어링 확인
4. `~/.claude/channels/discord/.env` 토큰 존재 확인

## 5. 응급 명령 카드
- 봇 재시작 : `claude --channels plugin:discord@claude-plugins-official`
- 정책 확인 : `cat ~/.claude/channels/discord/access.json | python3 -m json.tool`
- 페어링 재요청 : `/discord:access pair <코드>`
- 정책 잠금 : `/discord:access policy allowlist`

## 6. 호스팅 (노트북 닫으면 봇 죽음)
- macOS : `caffeinate -dis &` + `claude --channels ...` 또는 launchd plist 영구 등록
- Windows : 작업 스케줄러 + `Start-Process`
- 참고: discord-channels-setup APPENDIX C

## 7. 다음 단계
- 새 발화 등록: § 2 에 1줄 추가 + 봇에게 "이런 명령 추가해줘"
- 새 에이전트 정의: marketing-os/agents/<이름>.md + orchestrator 라우팅
- 채널 라우팅 갱신 (Q4): CLAUDE.md 라우팅 표 수정
```

## ③ AI-비서-아키텍처.md (옵션)

저장 위치 : `marketing-os/agents/AI-비서-아키텍처.md`

```markdown
# AI 비서 아키텍처 — 진단 시점: {date}

## 1. 한 줄 요약
"폰 DM 1개 입구 → orchestrator 라우팅 → 28 에이전트 + 14 스킬 + N MCP 결합"

## 2. 다이어그램 (ASCII)
폰 Discord ──DM──> 봇 (marketing-ch · --channels 세션)
                    ├─ chat_id 확인 (Q4 채널 라우팅)
                    └─> Claude
                         ├─ Q1 페르소나 적용 (톤·언어·길이)
                         ├─ Q3 권한 게이트 (자동/승인/금지)
                         └─> orchestrator (또는 직접 에이전트)
                              ├─ 데이터 분석 팀 (ga4 + sheets + ads)
                              ├─ 콘텐츠 팀 (gmail + notion + buffer)
                              ├─ 리서치 팀 (firecrawl + youtube)
                              ├─ 광고 팀 (meta + google + naver-ads)
                              ├─ CRM 팀 (gmail + ltv)
                              ├─ 디자인 팀 (notion + figma)
                              └─ 운영 팀 (discord-channels + scheduler)

## 3. 7 도메인 팀 매트릭스
| 팀 | 대표 에이전트 | 주력 MCP | Q2 매칭 |
|---|---|---|---|
| 데이터 분석 | weekly-report · ga4-html-report | ga4·sheets | "매주 종합" |
| 콘텐츠 | email-newsletter · content-publisher | gmail·notion·buffer | "매주 뉴스레터" |
| 리서치 | research-trend · research-voc | firecrawl·youtube | "트렌드 추적" |
| 광고 | check-ads · analyze-meta · analyze-google-ads | meta-ads·google-ads | "ROAS 알림" |
| CRM | cs-responder · ltv-analyzer | gmail·sheets | "CS 자동 응답" |
| 디자인 | landing-copy · brand-voice | notion·figma | "상세페이지" |
| 운영 | orchestrator · daily-briefing | discord-channels·scheduler | "매일 브리핑" |

## 4. 진단 결과 ({date})
- 활성 MCP: N / N · 가동 우선 에이전트 3개 (Q2) · 채널 라우팅 모드 (Q4) · CLAUDE.md 패치 여부

## 5. 한계 5가지
- 세션 의존 (`--channels` 활성) · `fetch_messages` 100개 한도 · 무인 cron 발송 불가 → Webhook 별도
- 채널 라우팅 90% (소프트) · 권한 릴레이 페어링 발신자가 도구 승인 가능

## 6. 보강 권장
- [ ] 미설치 MCP 추가  - [ ] 미정의 에이전트 작성  - [ ] CLAUDE.md 라우팅 적용  - [ ] 호스팅 옵션 적용
```

## ④ CLAUDE.md 라우팅 패치 블록 (Q4 옵션 B/C 시)

`marketing-os/CLAUDE.md` 말미에 자동 추가 :

```markdown
## Discord 채널별 봇 라우팅 (소프트 라우팅)

봇이 메시지를 받으면 `<channel source="discord" chat_id="...">` 의 chat_id 를 확인하고,
아래 표에 정의된 범위 내에서만 도구를 호출합니다.

| 채널 ID | 채널명 | 허용 기능 | 허용 MCP prefix | 매핑 에이전트 |
|---|---|---|---|---|
| {ID} | #{채널명} | {Q2 매핑} | `mcp__xxx__*` | {에이전트} |
| (DM) | 본인 DM | 전체 | 전체 | 모든 에이전트 |

위반 시 응답: "이 채널에서는 {허용 기능} 만 가능합니다. 전체 기능은 DM 으로 요청해주세요."
```

⚠️ 소프트 라우팅 한계 (90% · Claude 의 룰 준수 의지에 의존). 위험 작업은 Q3 의 deny 로 보강.
100% 결정적 차단은 봇 N개 + 세션 N개 분리 필요 (현 스킬 범위 밖).

## ⑤ Notion 미러링 (옵션 · Notion MCP 활성 시)

3 산출물 (my-bot-spec · OPERATIONS · 아키텍처) 을 노션 페이지 3개로 미러링.
- 위치 : 사용자 노션의 "Marketing OS / Bot Design" DB
- 자동 백링크 : 3개 페이지 상호 참조
