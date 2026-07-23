---
name: bot-build
description: |
  Discord Channels 연결된 봇을 "내 업무 비서"로 발전시키는 인터랙티브 설계 스킬.
  프리셋 8개(A~H) 또는 Q1~Q4 자유 설계 → 페르소나 + 가동 에이전트 3개 + 승인 정책 + 채널 라우팅 + 설치 자동화(settings.json·launchd·cron)까지 5 PHASE.

  자동 호출 트리거:
  - "나만의 봇 구축을 시작하자" ⭐ / "내 봇 구축" / "내 봇 만들기"
  - "AI 비서 구축" / "마케팅 비서 시작" / "디스코드 봇 사용법" / "봇 운영 가이드"
  - "클로드 비서 설계" · "봇 페르소나 정하기" · "오케스트레이터 점검" · "채널 연결 후 뭐 해요"

  선행: discord-channels-setup 완료. 소요: 프리셋 5~10분 / 자유 설계 15분.
  산출물(필수): outputs/{date}/bot-design/{date}-my-bot-spec.md + ~/.claude/channels/discord/OPERATIONS.md
  산출물(옵션): agents/AI-비서-아키텍처.md + Notion 미러링. (구 ai-assistant-build · bot-build-install 흡수)
---

# 내 봇 구축 (Discord Channels 비서 설계)

> 게이트마다 사용자 입력을 받고 진행. 자동 실행 금지.
> **참조 파일은 해당 STEP 도달 시에만 Read** (전부 미리 읽지 않기):
>
> | 파일 | 읽는 시점 |
> |---|---|
> | `references/presets.md` | STEP 0.7 프리셋 선택 직후 (자동 채움 값 + MCP·에이전트 매핑 표) |
> | `references/templates.md` | STEP 5 / 5.5 산출물 박제 시 (4종 템플릿 + CLAUDE.md 패치 블록) |
> | `references/install.md` | STEP 5.7 / 6 설치·채널 연동 시 (settings.json·launchd·cron·access.json 스크립트) |
> | `references/troubleshooting.md` | 오류·막힘 발생 시 |

## 🎬 시작 멘트

```
🤖 나만의 봇 구축을 시작합니다. (5 PHASE · 5~15분)

  📋 PHASE 1 봇 기획 (인벤토리 스캔) → 💡 PHASE 2 봇 제안 (프리셋 8 + 자유 Z)
  → 🔌 PHASE 3 MCP 안내 → ⚙️ PHASE 4 봇 설치 (자동화) → 📡 PHASE 5 채널 연동

  산출물 5종: ① my-bot-spec.md ② OPERATIONS.md ③ 아키텍처.md(옵션)
             ④ settings.json 패치 ⑤ launchd/cron 자동화
  ⭐ 공통 기본: 매일 아침 07:00 알림 (모든 프리셋 탑재)

시작할까요? (y / n / 더 자세히)
```

## STEP 0 · 양방향 연결 점검 (자동 5초)

후속 스킬이므로 봇이 살아있는지 4가지 먼저 점검 :

1. 봇 토큰 : `ls ~/.claude/channels/discord/.env`
2. access 정책 : `cat ~/.claude/channels/discord/access.json | grep dmPolicy` (allowlist 권장)
3. `--channels` 세션 : `ps aux | grep "claude --channels" | grep -v grep`
4. ⭐ **양방향 도구 5개 노출** (핵심 증거) : `mcp__plugin_discord_discord__` reply · react · edit_message · fetch_messages · download_attachment

결과를 ✅/❌ 표로 출력 후 게이트. ❌ 시 :
- 토큰 없음 → `discord-channels-setup` 스킬 호출 안내
- 세션 죽음/도구 미노출 → 새 터미널에서 `claude --channels plugin:discord@claude-plugins-official` 재시작 후 본 스킬 재호출

## STEP 0.5 · 자동 인벤토리 스캔 (자동 1분 · 입력 없음)

5가지 스캔 → 표 출력 : ① OS·셸·작업 디렉토리 ② Discord 봇 상태(.env 토큰 길이만·정책·페어링·그룹 채널) ③ 에이전트 수 `find marketing-os/agents -name "*.md" | wc -l` (기대 28) ④ 스킬 수 (기대 14) ⑤ 활성 MCP (세션 도구 prefix 검사)

게이트 : `계속 (y) / 인벤토리만 박제 (skip → STEP 5.5 점프)`

## STEP 0.7 · 진입 분기 (프리셋 vs 자유 설계)

⚠️ 잘 모르겠으면 프리셋 추천. 메뉴 출력 :

```
[기본 3]                              [고도화 5 · Part 3~8 자산]
  A. 📅 일정·메일 매니저 ⭐ 추천        D. 🔬 리서치 인텔리전스 (Part 4)
  B. 📊 마케팅 매니저                   E. 📝 콘텐츠 파이프라인 (Part 3+5)
  C. ✍️ 콘텐츠 매니저                   F. 💰 광고 옵스 (Part 6)
                                        G. 📊 GA4 데이터 분석 (Part 7)
[자유 설계]                            H. 🎯 CRM 리텐션 (Part 8)
  Z. 🎨 직접 답변 (Q1~Q4 인터뷰 · 15분)

답변 (A~H / Z) :
```

각 프리셋은 메뉴에서 ▸매일/매주/즉시 업무 + 활용 MCP + 적합 대상 2~3줄로 소개 (`references/presets.md` 참조).

- **A~H 선택** → `references/presets.md` 읽고 Q1~Q4 자동 채움 → **STEP 4 점프**
- **Z 선택** → STEP 1 부터 진행

## STEP 1 · Q1 페르소나 (자유 설계 · 1분)

질문 : "봇은 누구의 비서이고, 말투는 어떻게?" (예: 나 한 명 · 부하직원 톤 · 짧게 · 한국어)

답변에서 5가지 추출 : **비서 대상** (단일/팀) · **톤** (격식/부하직원/친구) · **언어** · **길이 기본값** (3~5줄 vs 10줄+) · **강조 표현** (이모지 절제 여부). 추상적이면 예시 들어 한 번 되묻기.

게이트 : 추출 결과 5줄 표시 → `맞으면 (y), 수정 (n)`

## STEP 2 · Q2 업무 3개 (자유 설계 · 2분)

질문 : "1주일 동안 봇이 대신해줬으면 하는 일 3개?" — **매일 / 매주 / 즉시 알림** 슬롯으로 받기.

각 업무마다 5가지 도출 : **트리거** (cron 시각/임계치) · **필요 MCP** · **호출 도구** · **출력 채널** · **기존 에이전트 매핑**
→ `references/presets.md` 의 "MCP 키워드 매핑 표" + "에이전트 매핑 표" 사용. 이미 있는 에이전트면 재활용, 없으면 신규 정의 권장.

게이트 : 업무 3개 × (트리거·MCP·출력·에이전트·상태) 표시 → `맞으면 (y), 수정 (n)`
미설치 MCP 발견 시 : `mcp설치` (1개) 또는 `mcp설치-전체` 스킬 호출 안내.

## STEP 3 · Q3 권한 정책 (자유 설계 · 1분)

질문 : "어디까지 알아서 해도 되고, 뭐는 무조건 물어봐야 해?" — **자동 OK / 승인 필요 / 금지** 3슬롯.

도구 prefix 단위로 매핑 :

| 정책 | 예시 | 구현 |
|---|---|---|
| 자동 OK | `list_*` · `get_*` · `search_*` · `read_*` (조회·분석·Draft) | settings.json `allow` |
| 승인 필요 | `create_draft` · `schedule_post` · `create_event` · `notion-create-pages` | 권한 릴레이 → 폰 ✅/❌ |
| 금지 | `update_*budget*` · `delete_*` (예산 변경·삭제) | settings.json `deny` |

⚠️ 페어링된 사람이 폰 DM 으로 "광고 예산 늘려" 같은 명령 가능 — **위험 도구는 무조건 승인 또는 금지로**.

게이트 : 3 정책별 도구 목록 표시 → `맞으면 (y), 수정 (n)`

## STEP 3.5 · Q4 채널 분리 (선택 · 1분)

DM 1개로만 운영하면 `skip`. 질문 : "채널별로 기능을 분리할까요?"
**A. DM 통합 (기본) / B. 채널 분리 / C. 하이브리드 / skip**

B/C 선택 시 :
1. `access.json` 의 `groups` 에서 등록 채널 ID 자동 추출. 없으면 채널 ID 요청 (개발자 모드 ON → 우클릭 → 채널 ID 복사)
2. 라우팅 표 생성 : 채널 ID · 채널명 · 허용 기능 · 허용 MCP prefix · 매핑 에이전트 (DM = 전체)
3. Q2 의 3 업무를 채널에 자동 분배 추천

게이트 : 라우팅 표 + CLAUDE.md 패치 위치 표시 → `맞으면 (y), 수정 (n), skip`
⚠️ 소프트 라우팅 한계 90% (Claude 룰 준수 의존). 위험 작업은 Q3 deny 로 보강.

## STEP 4 · 종합 분석

Q1~Q4 (또는 프리셋 값) 종합해 6 섹션 도출 :

1. **페르소나 카드** — 이름·대상·톤·언어·길이·강조·시그니처 어구
2. **우선 가동 에이전트 3개** — 트리거·MCP·산출물·기존 매핑·구현 방식 (cron/launchd/Webhook)
3. **승인 정책 표** — allow/deny prefix + settings.json 예시
4. **채널 라우팅 표** (Q4 B/C 시만) — CLAUDE.md 자동 패치 (`references/templates.md` § ④ 블록)
5. **필요 MCP 매트릭스** — MCP · 활성 여부 · 용도
6. **구현 우선순위** — 오늘 (daily-briefing 첫 실행) / 1주 (launchd+cron+권한) / 1개월 (orchestrator · Part 10)

## STEP 5 · 산출물 저장

기본 : `marketing-os/outputs/{YYYY-MM-DD}/bot-design/{date}-my-bot-spec.md` (`references/templates.md` § ① 템플릿)

추가 저장 게이트 : `A. 로컬만 (기본) / B. +노션 / C. +Discord DM 푸시 / D. +Gmail Draft` (복수 선택)

## STEP 5.5 · 추가 산출물 박제

`references/templates.md` 의 템플릿으로 자동 채움 :
- **② OPERATIONS.md** (필수) — `~/.claude/channels/discord/` · 발화 매뉴얼 15~20개 + 권한 흐름 + 3분 진단 + 응급 명령 + 호스팅
- **③ AI-비서-아키텍처.md** (옵션) — `marketing-os/agents/` · 다이어그램 + 7 도메인 팀 매트릭스 + 진단·한계·보강
- **⑤ Notion 미러링** (옵션 · Notion MCP 활성 시)

게이트 : `A. OPERATIONS.md 만 / B. +아키텍처.md / C. +Notion 미러링`

## STEP 5.7 · PHASE 4 봇 설치 자동화 (자동 + 확인 · 5분)

⚠️ 문서만 박제하면 비서는 동작 안 함. `references/install.md` 따라 4단계 :

1. **settings.json 권한 패치** — Q3 기반 allow/deny 머지. 기존 파일은 백업 (`settings.json.bak.{date}`) 후 머지, 덮어쓰기 X
2. **launchd plist** (macOS) — Q2 매일·매주 업무 등록 / Windows 는 `schtasks` 분기
3. **cron** — 즉시 알림 매시간 폴링 (Discord Webhook 사용 · 세션 의존 X)
4. **설치 검증** — 권한·launchd·cron·Webhook 테스트 4종

게이트 : 4종 ✅ 표시 → `PHASE 5 진행? (y / n)`

## STEP 6 · PHASE 5 채널 연동 + 첫 가동 검증

`references/install.md` § STEP 6 따라 :

1. 필요 채널 도출 (Q4 기반 · DM 통합이면 0개) → 채널 생성 + ID 복사 가이드
2. `access.json` `groups` 자동 패치 (백업 후) → ⚠️ `--channels` 세션 **재시작 필수**
3. 첫 가동 검증 : ① DM/채널에서 30초 내 응답 ② 범위 외 요청 거부 (B/C 만) ③ 응급 명령 동작

게이트 : `모두 정상? (y / 일부 / n)` — `일부`/`n` → STEP 5.7 검증 재실행 + `references/troubleshooting.md`
정상이면 사용 시작 안내 출력 (install.md § 5).

## 🔄 재호출 시 PHASE 점프

```
어느 PHASE 만 다시 진행할까요?
  1. 처음부터  2. PHASE 3 (새 MCP)  3. PHASE 4 (권한·자동화 갱신)
  4. PHASE 5 (새 채널 추가)  5. OPERATIONS.md 갱신만
```

## 메모리·강의 연결

- 페르소나 결과는 메모리 `bot-persona.md` 저장 권장 → 다른 에이전트 톤 통일. Q1~Q3 원본은 `{date}-bot-design-raw.md` 보존
- `discord-channels-setup` STEP 11-3 직후가 자연스러운 호출 시점. 도출된 3개 에이전트 = 학습자의 첫 "AX 팀" (Part 10 게이트 역할)
