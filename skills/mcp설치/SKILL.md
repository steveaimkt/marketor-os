---
name: mcp설치
description: |
  Part 2 MCP 1개를 설치·검증·활용하는 4단계 표준 파이프라인. 마케터(비개발자) 기준 인터랙티브 진행. 13개 도구 지원 (Google Sheets · GA4 · Firecrawl · Figma · YouTube · Higgsfield · Hyperframes · HeyGen · ElevenLabs · Buffer · Meta/Google Ads · Notion · Discord).

  자동 호출 트리거:
  - **"X MCP 설치하자"** ⭐ (X = 도구명, 예: "Google Sheets MCP 설치하자", "HeyGen 설치")
  - "Y 연결 도와줘" + MCP 이름
  - "MCP 설치 시작"
  - "X 자동화 환경 만들자"
  - "다음 MCP 진행하자"

  4단계 흐름:
  ① MCP 소개 (한 줄 정의 · Before/After) →
  ② 설치 안내 (OAuth · API key · 로컬 CLI 분기) →
  ③ 작업 가능 업무 (도구 목록 + 사례) →
  ④ 결과물 1개 직접 만들기 (Hello World 작업)
---

# MCP 설치: 표준 4단계 파이프라인

> Part 2 12개 도구 모두 동일한 4단계 흐름으로 설치·검증·활용. 마케터가 어떤 MCP를 처음 만나도 같은 패턴으로 진입 가능.

## 🎬 스킬 시작 시 사용자에게 전달할 메시지

본 스킬이 호출되면 Claude는 **반드시 다음과 같이** 시작 멘트를 출력:

```
🔌 {MCP명} 설치를 시작합니다.

먼저 짚고 갈 게 한 가지 있어요:

  MCP는 'AI가 외부 도구에 손을 뻗는 신경'입니다.
  한 번 설치하면 모든 세션에서 자동으로 사용됩니다.
  코드 작성 안 합니다. 자연어 명령만으로 도구가 작동해요.

────────────────────────────────

총 4단계로 진행돼요 (15~25분 예상):

  📖 STEP 1: MCP 소개 (2분)
       1.1 한 줄 정의 + 제공사 + 라이선스
       1.2 마케터 관점 활용 가능성
       1.3 Before vs After 비교

  ⚙️ STEP 2: MCP 설치 (5~10분)
       2.1 사전 준비 (계정 · API key · OAuth)
       2.2 설치 명령 실행
       2.3 .env + .mcp.json 등록 (API key 방식만)
       2.4 통신 검증 + 세션 재시작 안내

  📋 STEP 3: 작업 가능 업무 (2~3분)
       3.1 노출되는 tool 목록
       3.2 마케팅 작업 예시 3~5개
       3.3 다른 MCP와 조합 시나리오

  🎯 STEP 4: 결과물 1개 직접 만들기 (5~10분)
       4.1 가장 기본적인 실용 결과물 ("Hello World")
       4.2 결과 확인 + 다음 단계 안내

STEP 1 부터 시작할까요?
```

사용자가 OK 하면 STEP 1 로 진행. 거부 시 본 스킬 종료.

---

## 📖 STEP 1: MCP 소개

### 1.1 표준 카드 출력

다음 8개 항목을 표 형태로 출력 (각 MCP 카드는 본 파일 하단 "MCP 카드 라이브러리" 참고):

| 항목 | 채울 내용 |
|---|---|
| 한 줄 정의 | "X 가 무엇을 하는 도구인지" 1문장 |
| 제공사 | 회사명 · 오픈소스 프로젝트 |
| 라이선스 | MIT · Apache · Commercial 등 |
| 인증 방식 | OAuth (Claude.ai) · API key · Local CLI |
| 무료 한도 | 월 N건, N분, N요청 등 |
| 마케터 활용 | 마케팅 작업 사례 2~3개 |
| Before X | 도구 없이 했던 작업 시간·방법 |
| After X | 도구 적용 후 변화 |

### 1.2 Before/After 비교는 구체적 수치로

❌ 나쁜 예: "더 빨라집니다", "편해져요"
✅ 좋은 예: "리포트 1건당 1시간 → 10분 (6배 단축)", "월 5건 × 50분 = 4시간 절감"

### 1.3 사용자 동의 확인

```
이 MCP가 본인 작업에 맞는지 확인됐어요?
- y: STEP 2 (설치) 진행
- n: 본 스킬 종료, 다른 MCP 검토
```

---

## ⚙️ STEP 2: MCP 설치

설치 방식 3가지 분기. 사용자 환경에 맞춰 선택.

### 2.A OAuth 경로 (간편)

대상 MCP: Notion · Figma · Higgsfield · Gmail · Google Drive · Google Calendar · Slack · Canva · HeyGen (검색 가능 시)

```
1. Claude Desktop 좌상단 → Settings → Connectors
   (또는 Claude.ai 웹: 프로필 → Settings → Integrations)
2. 검색창에 "{MCP명}" 입력
3. Connect 버튼 클릭
4. 브라우저 팝업 → 계정 로그인 → Authorize
5. Claude Desktop 으로 돌아오면 "{MCP명} Connected ✓" 표시
6. Claude Code 세션 재시작
7. `mcp__claude_ai_{MCP명}__*` 도구 활성화 확인
```

OAuth 검색이 안 보이면 2.B 경로로 우회.

### 2.B API key 경로 (대부분의 데이터 도구)

대상 MCP: Google Sheets · GA4 · Firecrawl · YouTube · Buffer · Meta Ads · Google Ads · Discord · ElevenLabs · HeyGen (검색 안 보일 때)

```
1. 제공사 콘솔에서 API key 발급
   - 발급 URL은 각 MCP 카드 참고

2. uv 패키지 매니저 확인 (Python 기반 MCP만 필요):
   $ which uv
   없으면: curl -LsSf https://astral.sh/uv/install.sh | sh

3. marketing-os/.env 에 API key 추가:
   {ENV_VAR_NAME}=...

4. marketing-os/.mcp.json 에 MCP 서버 등록:
   "{mcp-name}": {
     "command": "uvx" (또는 "npx"),
     "args": ["{package-name}"],
     "env": { "{ENV_VAR_NAME}": "${ {ENV_VAR_NAME} }" }
   }

5. (선택) Python 패키지 사전 설치 (재시작 시 빠른 로드):
   $ uvx --install {package-name}

6. API 통신 직접 검증 (key 유효성):
   $ curl -sS {API_TEST_ENDPOINT} -H "X-Api-Key: $..." | head -c 200

7. Claude Code 세션 재시작
8. `mcp__{mcp-name}__*` 도구 활성화 확인
```

### 2.C 로컬 CLI 경로 (npm 기반 도구)

대상: Hyperframes (영상 제작 도구. MCP 아님)

```
1. marketing-os/{tool-name}/ 폴더 생성
2. npx {tool-name}@latest init {tool-name}
3. 추가 스킬 설치: npx skills add {provider}/{tool-name}
4. package.json scripts 검증 (dev · check · render 등)
5. 사용은 Bash 도구로 `npm run {script}` 호출
6. MCP 아니므로 .mcp.json 등록 불필요
```

### 2.4 보안 점검

설치 직후 확인:
- [ ] `.env` 가 `.gitignore` 에 등록돼 있는지
- [ ] `.mcp.json` 의 값은 `${VAR}` 참조 (평문 키 직접 입력 금지)
- [ ] API key 가 git log 에 노출된 적 없는지

---

## 📋 STEP 3: 작업 가능 업무

설치 검증 후 다음 형식으로 출력:

```
✅ {MCP명} 연결 완료. 다음 작업이 가능합니다:

🔧 노출되는 도구 ({N}개):
  - {tool_1}: {역할 1줄}
  - {tool_2}: {역할 1줄}
  ...

📊 마케터가 자주 쓰는 작업 예시:
  1. {작업 1: 구체적 사례}
  2. {작업 2: 구체적 사례}
  3. {작업 3: 구체적 사례}

🤝 다른 MCP와 조합 시나리오:
  - {X + Y}: {결합 시 가능한 작업}
  - {X + Z}: {결합 시 가능한 작업}

다음으로 결과물 1개 만들어볼까요? (STEP 4)
```

---

## 🎯 STEP 4: 결과물 1개 직접 만들기

각 MCP의 "Hello World" 작업 1건 즉시 실행. 사용자의 실제 데이터·계정으로 진행해 즉시 가치 보여주기.

### 4.1 작업 선정 기준

- **5~10분 안에 완료** (짧을수록 좋음)
- **결과물이 즉시 보이는 형태** (텍스트 · 파일 · 영상 · 차트)
- **사용자의 실제 데이터** (가짜 데이터 ×)
- **다음 단계의 출발점** (이걸 기반으로 더 큰 작업 가능)

### 4.2 표준 실행 흐름

```
1. 사용자에게 필요 데이터 한 가지만 묻기
   (예: 시트 URL · 광고 계정 ID · 채널 핸들)
2. Claude 가 MCP tool 호출 (자동)
3. 결과를 사용자가 볼 수 있는 형태로 변환·출력
   (마크다운 표 · mp4 파일 · 텍스트 요약)
4. "이게 첫 결과물입니다" 안내 + 다음 단계 옵션 제시
```

### 4.3 다음 단계 제안

```
🎉 첫 결과물 완성. 이걸 발전시키는 3가지 경로:

  A. 정기 자동화: 이 작업을 매일/매주 자동 실행 (Part 10 AX 에이전트)
  B. 다른 MCP 결합: {제안 MCP} 와 함께 쓰면 {새 작업} 가능
  C. 다른 MCP 설치: 다음 Part 2 클립 진행
```

---

## 📚 MCP 카드 라이브러리

각 MCP의 STEP 1·2·3·4 데이터. Claude 가 카드 정보 보고 4단계 실행.

### 1. Google Sheets MCP (Part 2-1)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | Google 스프레드시트를 Claude 가 직접 읽고 쓰는 도구 |
| 제공사 | Anthropic 공식 MCP 서버 |
| 라이선스 | MIT |
| 인증 | API key (Google Cloud Console) |
| 무료 한도 | Google 무료 할당량 (월 1억 셀 호출) |
| Before | 시트 다운로드 → CSV 변환 → Claude 에 붙여넣기 (5분/건) |
| After | 시트 URL 한 줄 → Claude 가 실시간 읽기·쓰기 (10초) |
| 노출 도구 | `get_sheet` · `update_cell` · `append_row` · `create_sheet` |
| Hello World | 마케팅 캘린더 시트 첫 5행 읽고 다음 주 일정 요약 출력 |

### 2. GA4 MCP (Part 2-2)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | Google Analytics 4 데이터 직접 조회 |
| 제공사 | Anthropic 공식 MCP 서버 |
| 라이선스 | MIT |
| 인증 | Service Account JSON (Google Cloud) |
| 무료 한도 | GA4 무료 할당량 |
| Before | GA4 콘솔 접속 → 리포트 클릭 → CSV 내보내기 → 정리 (15분) |
| After | "지난주 PV/UV 정리해줘" → 30초 |
| 노출 도구 | `run_report` · `get_metadata` · `batch_run_reports` |
| Hello World | 지난 7일 핵심 지표(PV·UV·세션) 한 줄 요약 |

### 3. Firecrawl MCP (Part 2-3)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | 웹사이트 크롤링 → 마크다운 변환 |
| 제공사 | Mendable (firecrawl-mcp) |
| 라이선스 | MIT |
| 인증 | API key (firecrawl.dev) |
| 무료 한도 | 월 500 크레딧 |
| Before | 경쟁사 사이트 직접 방문 + 복사 붙여넣기 (10분/건) |
| After | URL 한 줄 → 마크다운 자동 추출 (15초) |
| 노출 도구 | `scrape_url` · `crawl_site` · `search` |
| Hello World | 경쟁사 메인 페이지 1개 스크랩 → 핵심 메시지 3가지 추출 |

### 4. Figma MCP (Part 2-4) · cursor-talk-to-figma-mcp@latest

| 항목 | 값 |
|---|---|
| 한 줄 정의 | Claude가 Figma Desktop 캔버스에 도형·텍스트·프레임을 직접 그리는 자동화 다리 |
| 제공사 | sonnybaker/cursor-talk-to-figma-mcp (npm @latest) |
| 라이선스 | MIT |
| 인증 방식 | 로컬 WebSocket (port 3055) + Figma Desktop Plugin (Community) |
| 무료 한도 | 무제한 (로컬 실행) |
| .mcp.json command | `bunx cursor-talk-to-figma-mcp@latest` (server 이름 `figma` 유지) |
| Before | Figma에서 마우스로 도형 일일이 배치 (카드뉴스 8장 = 1~2시간) |
| After | "카드뉴스 만들어줘" 자연어 → Figma 캔버스에 8장 자동 배치 (5~10분) |
| 노출 도구 | 약 35개 (`join_channel` · `get_document_info` · `create_frame` · `create_text` · `set_fill_color` · `set_layout_mode` · `set_padding` 등) |
| Hello World | 본인 Figma 파일에 "Hello marketing-os" 텍스트 프레임 1개 자동 생성 |

**사용 전 3가지 ritual (매 세션):**
1. WebSocket 서버 가동 · `cd ~/dev/claude-talk-to-figma-mcp && bun socket` (port 3055 · 백그라운드)
2. Figma Desktop → Plugins → "Cursor Talk to Figma MCP Plugin" 실행 → **Connect 클릭** → channel ID 발급
3. Claude에 channel ID 전달 → 자동으로 `mcp__figma__join_channel` 호출

**왜 hosted(Claude.ai 공식 Figma) 안 쓰나?**
- hosted Figma는 읽기 위주 (View seat 월 6회 rate limit · 디자인 생성 미지원)
- 본 MCP는 쓰기 가능 (도형·텍스트·레이아웃 자동 작성). 카드뉴스 스킬의 채널.

**히스토리 (2026-05-26)**
- arinspunk/claude-talk-to-figma-mcp (자체 빌드 `bun run ~/dev/.../dist/server.js`) → sonnybaker/cursor-talk-to-figma-mcp (npm @latest, bunx) 로 교체.
- 사유: 자체 빌드 dist 서버가 plugin에 `ping` 명령으로 verify 시도 → Figma Community Plugin은 ping 미지원 → "Failed to verify connection" 에러 반복.
- 교체 후: plugin과 동일한 패키지 라인업으로 handshake 매칭 성공.

### 5. YouTube Data MCP (Part 2-5)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | YouTube 채널·동영상·댓글 데이터 조회 |
| 제공사 | Anthropic 공식 |
| 라이선스 | MIT |
| 인증 | API key (Google Cloud) |
| 무료 한도 | 일 10,000 단위 (충분) |
| Before | YouTube Studio 수동 확인 (10분/일) |
| After | "지난주 우리 채널 상위 5개 영상 분석해줘" → 30초 |
| 노출 도구 | `search_videos` · `get_channel` · `get_comments` |
| Hello World | 본인 채널 최근 5개 영상 조회수·댓글 수 표 |

### 6. Higgsfield MCP (Part 2-6)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | AI 영상·이미지 생성 (3D 인트로·B-roll 클립) |
| 제공사 | Higgsfield |
| 라이선스 | 상업 (크레딧) |
| 인증 | OAuth (Claude.ai) |
| 무료 한도 | 무료 크레딧 (가입 시 부여) |
| Before | After Effects 또는 Blender 직접 작업 (반나절) |
| After | 텍스트 묘사 → 5초 AI 영상 클립 (1~3분) |
| 노출 도구 | `generate_video` · `generate_image` · `virality_predictor` |
| Hello World | "쿠팡 광고 인트로용 3초 클립" 자연어 묘사 → 영상 생성 |

### 7. Hyperframes (Part 2 / 2-4a, **MCP 아님**)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | HTML+CSS+GSAP 으로 영상 컴포지션 자동 생성 (코드 자동 작성) |
| 제공사 | HeyGen |
| 라이선스 | Apache 2.0 |
| 인증 | 없음 (로컬 도구) |
| 무료 한도 | 무제한 |
| Before | After Effects 또는 직접 React 코드 작성 |
| After | "주간 KPI 영상 만들어줘" → HTML 자동 작성 + mp4 렌더 |
| 노출 방식 | Bash 로 `npm run render` (MCP 아님). Claude Code 스킬 15개 자동 호출 |
| Hello World | 6초 WeeklyKPI 영상 (ROAS·CTR·CPA 카드) |

**주의**: Hyperframes 는 MCP 가 아닌 로컬 CLI 도구. 본 스킬의 STEP 2 는 2.C 경로 사용.

### 8. HeyGen MCP (Part 2 / 2-4b)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | 텍스트 스크립트 → AI 아바타 토킹헤드 영상 |
| 제공사 | HeyGen (heygen-com/heygen-mcp) |
| 라이선스 | MIT |
| 인증 | API key (`HEYGEN_API_KEY`) |
| 무료 한도 | 월 10 크레딧 (1분 영상 ≈ 1~2 크레딧) |
| Before | 모델 섭외 + 촬영 + 편집 (1~3일, 수십만 원) |
| After | 텍스트 입력 → 1~3분 후 mp4 도착 |
| 노출 도구 | `get_voices` · `get_avatar_groups` · `get_avatars_in_avatar_group` · `generate_avatar_video` · `get_avatar_video_status` · `get_remaining_credits` |
| API key 발급 | <https://app.heygen.com/settings?nav=Subscriptions> → API |
| 패키지 | `uvx heygen-mcp` |
| Hello World | 60초 한국어 마케팅 영상 (SunHi 보이스, 기본 아바타) |

### 9. ElevenLabs MCP (Part 2 / 2-4c)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | 음성 합성 + 음성 클론 + 트랜스크립션 + 오디오 처리 |
| 제공사 | ElevenLabs 공식 |
| 라이선스 | MIT |
| 인증 | API key (`ELEVENLABS_API_KEY`) |
| 무료 한도 | 월 10,000 크레딧 (약 10분 음성) |
| Before | 성우 섭외 또는 본인 녹음 + 편집 (시간/건당 수만 원) |
| After | 텍스트 → 한국어 mp3 (native급 발음, 즉시) |
| 노출 도구 | 음성 합성·클론·트랜스크립션·오디오 처리 (카테고리 4종) |
| API key 발급 | <https://elevenlabs.io/app/settings/api-keys> |
| 패키지 | `uvx elevenlabs-mcp` |
| Hello World | 30초 한국어 내레이션 mp3 (본인 음성 클론 또는 기본 음성) |

### 10. Buffer MCP (Part 2-8)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | 인스타·페이스북·트위터·링크드인 등 멀티 채널 자동 발행 |
| 제공사 | Buffer 공식 |
| 라이선스 | 상업 (Buffer 플랜) |
| 인증 | Access Token |
| 무료 한도 | Buffer Free 플랜 (3 채널 · 10 예약) |
| Before | 각 SNS 앱 수동 로그인 + 게시 (5분 × 채널 수) |
| After | 1개 명령 → 5개 채널 동시 예약 게시 |
| 노출 도구 | `create_update` · `list_profiles` · `schedule_post` |
| Hello World | 본인 Buffer 계정의 첫 채널에 "테스트 포스트" 즉시 발행 |

### 11. Meta·Google Ads MCP (Part 2-9)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | Meta(페이스북·인스타) + Google 광고 매니저 직접 제어 |
| 제공사 | Anthropic 공식 |
| 라이선스 | MIT |
| 인증 | 광고주 OAuth + Developer Token |
| 무료 한도 | 광고 API 한도 (개발자 토큰) |
| Before | 광고 매니저 UI 수동 확인 (매일 30분) |
| After | "어제 ROAS 가장 좋은 캠페인 5개" → 30초 |
| 노출 도구 | `get_campaigns` · `update_budget` · `pause_ad` · `get_insights` |
| Hello World | 지난 7일 광고 성과 표 1개 출력 |

### 12. Notion MCP (Part 2-10)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | Notion 페이지·DB 읽기·쓰기·검색 |
| 제공사 | Notion 공식 |
| 라이선스 | 상업 (Notion 플랜) |
| 인증 | OAuth (Claude.ai) |
| 무료 한도 | Notion Free 플랜 |
| Before | Notion 웹 접속 + 수동 작성 (5분/페이지) |
| After | "이번 주 회의록 노션에 정리해줘" → 페이지 자동 생성 |
| 노출 도구 | `notion-create-pages` · `notion-search` · `notion-update-page` |
| Hello World | 본인 워크스페이스에 "마케팅 OS 시작" 페이지 자동 생성 |

### 13. Discord MCP (Part 2-11)

| 항목 | 값 |
|---|---|
| 한 줄 정의 | 디스코드 채널 메시지·webhook 자동화 |
| 제공사 | Discord 공식 |
| 라이선스 | MIT |
| 인증 | Bot Token |
| 무료 한도 | Discord 무료 (개발자 봇) |
| Before | 수동 발송 또는 별도 봇 코딩 |
| After | "주간 리포트 디스코드 #marketing 채널에 발송" → 즉시 |
| 노출 도구 | `send_message` · `read_channel` · `create_webhook` |
| Hello World | 본인 서버의 #general 채널에 "마케팅 OS 봇 가동" 메시지 발송 |

---

## 트러블슈팅 (모든 MCP 공통)

| 증상 | 원인 | 해결 |
|---|---|---|
| 새 세션에서도 `mcp__*` 도구 안 보임 | `.mcp.json` 문법 오류 또는 env var 미설정 | `python3 -c "import json; json.load(open('.mcp.json'))"` 로 JSON 검증. `cat .env` 로 변수 확인 |
| OAuth 검색에 MCP 안 나옴 | Claude.ai Integrations 디렉토리 미등록 | 2.B 자체 호스팅 경로로 우회 |
| API key 401 응답 | key 오타·만료·권한 부족 | 콘솔에서 key 재발급. 권한 스코프 확인 |
| `uvx X-mcp` 실행 실패 | uv 미설치 또는 PATH 누락 | `curl -LsSf https://astral.sh/uv/install.sh \| sh` 재실행 |
| 첫 호출 시 패키지 다운로드 시간 길음 | uvx 캐시 미생성 | `uvx --install {package}` 로 사전 캐싱 |
| 한국어 결과 깨짐 | 인코딩 또는 한국어 모델 미사용 | MCP 별 한국어 옵션 확인 (예: ElevenLabs 의 `language=ko`) |

## 강의 연결

- 본 스킬은 Part 2 의 12개 클립 모두에서 호출되는 공통 설치 파이프라인입니다.
- 각 Part 2 클립의 후반부 "설치 실습" 섹션에서 이 스킬을 호출.
- 영상제작 클립(Part 2 / 2-4)은 HeyGen + ElevenLabs 두 MCP 를 순차 설치 (Hyperframes 는 별도 로컬 CLI 경로).
- Part 10 의 video-renderer 같은 자동화 에이전트가 본 스킬로 설치된 MCP 들을 활용.

## 메모리·문서 연결

- 사용자가 새 MCP 추가 시 본 파일의 "MCP 카드 라이브러리" 섹션에 카드 1개 추가
- 카드 데이터를 자동 메모리(`~/.claude/projects/.../memory/`) 에 별도 저장하지 말기 (본 스킬에서 항상 확인 가능)
- API key 는 `.env`, MCP 등록은 `.mcp.json` 만 사용
