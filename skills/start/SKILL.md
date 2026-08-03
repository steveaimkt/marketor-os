---
name: start
description: |
  설치한 MCP 8개 중 어떤 것이든 "작업 가능 업무 5개 메뉴" 를 보여주고, 사용자가 고른 1개를 시연하는 통합 진입점 라우터.

  흐름: /start → 설치된 MCP 자동 스캔 → MCP 선택 (1개면 자동, 2개+면 메뉴) → 해당 MCP 의 작업 가능 업무 5개 표시 → 사용자 1개 선택 → 시연 → 다음 단계 제안.

  자동 호출 트리거 (⚠️ "MCP"를 명시한 발화 전용 · 슬래시 형식 불필요):
  - **"start"** ⭐ 주요 트리거 (영문 단독 단어)
  - **"MCP 메뉴"** ⭐ / "MCP 시작"
  - "MCP 로 뭐 할 수 있어"
  - "설치된 MCP 메뉴" / "설치된 MCP 시연"
  - "MCP 도구 시연"

  ⛔ 경계 (통일 규칙 2026-07-16): "작업 가능한 업무 알려줘" · "뭐 할 수 있어" ·
  "시작(하자)" · "마케팅 시작" · "결과물 만들자" 같은 **업무 단위 질문에는 이 스킬을
  발동하지 않는다** → CLAUDE.md 시작 모드(msk 업무 지도 · 10영역+운영팀+커맨드)가 정본.
  이 스킬은 그 아래 "도구(MCP) 층" 메뉴 전용이다.

  지원 MCP 8개:
google-sheets · ga4 · firecrawl · youtube-data · buffer · meta+google-ads · notion · discord
---

# start · MCP 작업 메뉴 라우터

> 설치한 MCP 를 자동 감지해 "작업 가능 업무 메뉴" 를 보여주고, 사용자가 고른 1개를 시연합니다. 메뉴의 각 항목은 해당 mcp설치 스킬의 `## 📋 STEP 3` (작업 가능 업무) 와 1:1 매핑.

**호출 방식**: "start" / "MCP 메뉴" / "MCP로 뭐 할 수 있어" 처럼 **MCP를 명시한 발화 전용**. 업무 단위 질문("작업 가능한 업무 알려줘" 등)은 msk 업무 지도가 담당한다 (CLAUDE.md 시작 모드).

## 🎬 스킬 호출 시 흐름

```
사용자 "start" (또는 "시작" · "마케팅 시작")
  ↓
[Step 0] 설치된 MCP 스캔 (5초)
  ↓
[Step 1] MCP 선택 (자동 또는 번호 메뉴)
  ↓
[Step 2] 선택한 MCP 의 작업 가능 업무 5개 표시 + 한 줄 안내
  ↓
[Step 3] 사용자 1개 선택 → 시연
  ↓
[Step 4] 검증 + 다음 단계 제안
```

### 시작 멘트 (Step 2 진입 시)

본 라우터가 MCP 분기에 진입하면 반드시 다음 형식으로 시작:

```
🎯 {MCP 이름} · 작업 가능한 업무를 알려드릴게요.

📊 현재 상태: {기본 정보 · 잔여 크레딧/쿼터·대상 계정 등}

본 MCP 로 마케터가 자주 쓰는 작업 5가지:
{메뉴 5개 표}

어느 업무를 시연해볼까요? 번호를 알려주세요.
(또는 자연어로 본인 데이터에 맞춰 직접 명령 주셔도 됩니다)
```

### 기본 정보 안내 (필수 · 메뉴와 함께 출력)

MCP 분기 진입 시 메뉴 위에 **현재 상태(기본 정보)** 를 항상 함께 보여준다.
"무엇을 얼마나 쓸 수 있는지" 를 사용자가 메뉴를 고르기 전에 알 수 있게 한다.

| MCP | 보여줄 기본 정보 | 조회 방법 |
|---|---|---|
| firecrawl | 잔여 크레딧/토큰 + 결제 주기 | `curl -H "Authorization: Bearer $FIRECRAWL_API_KEY" https://api.firecrawl.dev/v1/team/credit-usage` (+ `/token-usage`) |
| ga4 | 대상 속성 ID + 이름 | `.mcp.json` 의 `GA_PROPERTY_ID` |
| meta-ads / google-ads | 대상 광고 계정 ID + 이름 | `list_ad_accounts` / `list_accessible_customers` |
| google-sheets / notion / discord / buffer / youtube-data | 대상 자원명 (첫 조회 시) | 각 list/search 도구 |

- 계정 기반 MCP 는 Step 3 의 "대상 계정/속성 우선 확인" 게이트와 연결된다.

---

## Step 0 / 4 · 설치된 MCP 스캔 (5초)

```bash
claude mcp list 2>&1
```

다음 8개 MCP 이름 중 `✓ Connected` 인 것만 카운트:

| MCP 이름 | 매칭 패턴 |
|---|---|
| google-sheets | `google-sheets.*Connected` |
| ga4 | `ga4.*Connected` |
| firecrawl | `firecrawl.*Connected` |
| youtube-data | `youtube-data.*Connected` |
| buffer | `buffer.*Connected` |
| meta-ads + google-ads | 둘 다 `Connected` 시 1세트로 묶음 |
| notion | `Notion` (Claude.ai 통합) |
| discord | `discord.*Connected` |

### 스캔 결과별 분기

| 감지 수 | 처리 |
|---|---|
| 0개 | "MCP 가 아직 하나도 설치되지 않았어요. `/mcp설치-google-sheets` 부터 시작할까요?" |
| 1개 | Step 1 생략 → 자동으로 Step 2 진입 |
| 2개+ | Step 1 선택 메뉴 출력 |

---

## Step 1 / 4 · MCP 선택 메뉴

감지된 MCP 가 2개 이상이면 표 형식으로 표시:

```
🔍 설치된 MCP 3개 감지됨

번호 MCP 한 줄 정의
─────────────────────────────────────────────────────────
  1 google-sheets 스프레드시트 자동 읽기·쓰기·서식
  2 ga4 웹사이트 트래픽·전환 자동 리포트
  3 notion 페이지·DB·캘린더 자동 관리

어느 MCP 로 시작할까요? (번호 입력 또는 MCP 이름)
```

사용자가 선택하면 Step 2 해당 MCP 분기 진입.

---

## Step 2 / 4 · 선택한 MCP 의 작업 가능 업무 5개 표시

> 각 분기의 5개 시나리오는 해당 mcp설치 스킬의 `## 📋 STEP 3.2` 와 동일. ★ 표시는 그 MCP 의 대표 시나리오 (시연 추천).

### 분기 1 · google-sheets

```
🎯 google-sheets · 작업 가능한 업무를 알려드릴게요.

번호 시나리오 자연어 명령 예시 소요
─────────────────────────────────────────────────────────────────────────
  1 시트 탐색            "어떤 시트가 있어?"                              5초
  2 매출 분석            "채널별 매출 비교해줘"                           30초
  3 ROAS 분석            "플랫폼별 ROAS + 예산 재배분 안 만들어줘"        1~2분
  4 재고 알림            "긴급 상품 빨간 배경으로 강조"                   30초
  5 ★ 자동 리포트          "주간 리포트 스프레드시트 새로 만들어줘"         3~5분

어느 업무를 시연해볼까요? (1~5 또는 자연어 명령)
```

각 번호별 시연 흐름:
- **1·2·3·4** → 사용자에게 스프레드시트 ID 확인 → 해당 자연어 명령 자동 입력 → `mcp__google-sheets__read_sheet` 등 호출 → 결과 출력
- **5 (대표 시연)** → 5단계 자동 리포트 (Step A~E):
  - A. `get_spreadsheet_info` (5초)
  - B. `batch_read_sheet` (10초)
  - C. `read_sheet` × 3 + 분석 (30~60초)
  - D. `add_sheet` + `write_sheet` + `format_cells` (30초)
  - E. `create_spreadsheet` + 4 `write_sheet` + `format_cells` (1~2분)
  - 결과: 신규 4시트 스프레드시트 URL

상세: [01-google-sheets/mcp설치-google-sheets/SKILL.md `STEP 4`](../../mcp-setup/google-sheets/SKILL.md#L430)

---

### 분기 2 · ga4

```
🎯 ga4 · 작업 가능한 업무를 알려드릴게요.

번호 시나리오 자연어 명령 예시 소요
─────────────────────────────────────────────────────────────────────────
  1 ★ 채널별 성과          "지난 7일 채널별 세션·전환·전환율"                30초
  2 랜딩 TOP 10          "지난 28일 랜딩 페이지 TOP 10 + 이탈률"           30초
  3 신규 vs 재방문        "newVsReturning 차원 전환율 비교"                20초
  4 ★ 기간 비교            "이번 주 vs 지난 주 오가닉 변화율"                1분
  5 실시간 활성          "지금 활성 사용자 몇 명, 어떤 페이지?"            5초

어느 업무를 시연해볼까요? (1~5 또는 자연어 명령)
```

각 번호별 시연 흐름:
- **1 (대표 시연)** → `mcp__ga4__run_report` (차원 `sessionDefaultChannelGroup` · 지표 `sessions·conversions` · 기간 `last_7_days`) → 마크다운 표
- **2·3** → `run_report` 차원·지표만 변경
- **4** → `batch_run_reports` (이번주·지난주 동시) → 변화율 계산
- **5** → `get_realtime_data`

상세: [02-ga4/mcp설치-ga4/SKILL.md `STEP 4`](../../mcp-setup/ga4/SKILL.md#L264)

---

### 분기 3 · firecrawl

```
🎯 firecrawl · 작업 가능한 업무를 알려드릴게요.

번호 시나리오 자연어 명령 예시 소요
─────────────────────────────────────────────────────────────────────────────────
  1 ★ 본인 쿠팡 리뷰 추출        "본인 쿠팡 상품 리뷰 20건 표로"                  1분
  2 ★ 본인+경쟁사 리뷰 비교       "본인+경쟁사 2곳 리뷰 60건 긍·부정 비교"         2분
  3 광고 랜딩 카피 분석         "경쟁 광고 페이지 헤드라인·CTA·USP 추출"        30초
  4 시장 트렌드 기사 수집       "K뷰티 D2C 최신 기사 10개 → 트렌드 3개"          2분
  5 구조화 추출 + 시트          "리뷰 JSON 추출 후 1page 시트 보고서로"           3분

어느 업무를 시연해볼까요? (1~5 또는 자연어 명령)
```

각 번호별 시연 흐름:
- **1 (대표 시연)** → `coupang-review-analyzer` 스킬 호출 → 쿠팡 URL 1개 입력 → `firecrawl_scrape` (waitFor=5000, mobile=true) → 별점·작성일·본문 표
- **2 (대표 시연)** → `coupang-review-analyzer` 스킬 호출 → 쿠팡 URL 3개 → `firecrawl_scrape` × 3 → 긍·부정 키워드 + 카피 개선 4표
- **3** → `firecrawl_scrape` 1회 → 헤드라인·CTA·USP 추출
- **4** → `firecrawl_search` (키워드) → 상위 10개 → 트렌드 요약
- **5** → `firecrawl_extract` (스키마 지정) → Google Sheets 1page 보고서 자동 적재 (SDK batchUpdate 방식)

상세: `100-skills/01-research/` · 설치는 [03-firecrawl/mcp설치-firecrawl/SKILL.md `STEP 4`](../../mcp-setup/firecrawl/SKILL.md#L279)

---

### 분기 4 · youtube-data (2개 API 통합 · Data API + Analytics API)

> 본 MCP (`youtube-data-mcp-server`) 는 **2개 API** 를 한 패키지에 노출합니다.
> 분기 진입 즉시 **두 API 의 연결 상태를 각각 체크** → **비교·분석 가능 항목 표 출력** → **분석 시작 제안** 순으로 진행.

**Step A · 분기 진입 즉시 2개 API 연결 체크** (사용자 확인 없이 자동 실행):

```bash
# ① MCP 서버 연결 확인
claude mcp list 2>&1 | grep -iE "youtube"

# ② .mcp.json 환경변수 확인 (Phase 1·Phase 2 각각 활성 판정)
cat .mcp.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
env=d.get('mcpServers',{}).get('youtube-data',{}).get('env',{})
p1 = bool(env.get('YOUTUBE_API_KEY'))
p2 = all(bool(env.get(k)) for k in ['YOUTUBE_OAUTH_CLIENT_ID','YOUTUBE_OAUTH_CLIENT_SECRET','YOUTUBE_REFRESH_TOKEN'])
ch = env.get('YOUTUBE_CHANNEL_ID','(미설정)')
print(f'Phase1_DataAPI={p1}, Phase2_AnalyticsAPI={p2}, ChannelID={ch}')
"
```

**Step B · 연결 체크 결과 표 출력**:

```
🔌 YouTube MCP · 2개 API 연결 상태

┌──────────────────────────────┬──────────────────────────┬────────────┐
│ API                          │ 인증 변수                  │ 상태       │
├──────────────────────────────┼──────────────────────────┼────────────┤
│ ① Data API v3 (API Key)      │ YOUTUBE_API_KEY          │ {✅/❌}    │
│ ② Analytics API (OAuth)      │ OAUTH_CLIENT_ID/SECRET   │ {✅/❌}    │
│                              │ + REFRESH_TOKEN          │            │
│ 대상 채널 (Analytics 용)       │ YOUTUBE_CHANNEL_ID       │ {UC… / ❌} │
└──────────────────────────────┴──────────────────────────┴────────────┘
```

**Step C · 두 API 비교·분석 가능 항목 표** (메뉴 위에 항상 함께 출력):

```
📊 두 API 비교

| 구분         | Data API v3 (API Key)     | Analytics API (OAuth)        |
|-------------|---------------------------|------------------------------|
| 대상 채널     | 🌐 모든 공개 채널 (본인+남)  | 🔒 본인 채널만                 |
| 데이터 성격   | 콘텐츠 메타·집계 통계·댓글   | 시청자 행동·유입·인구통계        |
| 시계열       | 누적 스냅샷                 | 일별/주별 분해                  |
| 쿼터         | 10,000 units/일 (검색 100u) | 별도 (사실상 넉넉)              |
| 마케터 활용  | 시장·경쟁사·SEO 분석         | 본인 채널 운영 PDCA             |

📋 분석 가능 항목

▼ Data API v3 (모든 공개 채널)
   a. 채널 통계 구독수·총조회수·총영상수
   b. 영상별 성과 조회·좋아요·댓글·길이·태그
   c. 채널 TOP 영상 본인/경쟁사 인기 순위
   d. 관련/추천 영상 알고리즘 발견 경로
   e. 트렌딩 영상 국가별 인기 TOP
   f. 키워드 검색 SEO 경쟁도·정렬
   g. 참여율 좋아요/조회·댓글/조회
   h. 자막·스크립트 transcript 다국어

▼ Analytics API (본인 채널만)
   i. 시청자 규모 시청 시간·평균 지속·평균 시청 비율
   j. 구독 변동 일별 추가·취소·순증감·유발 영상
   k. 트래픽 소스 추천·홈·검색·외부·재생목록 비율
   l. 참여 행동 좋아요·공유·노출수·노출 CTR
   m. 잠재고객 연령·성별·국가·기기 비중
   n. 재생 위치 본인 사이트 vs YouTube vs 모바일
   o. 수익 (수익화 채널) 예상 수익·CPM·RPM
   p. 카드·최종 화면 클릭률·전환 영상
```

**Step D · 시연 메뉴 7개 + 추천 시나리오**:

```
🎯 youtube-data · 작업 가능한 업무 7가지

▼ Phase 1 · Data API v3 (공개 데이터 · 모두 활성 시 1~4 가능)
  1 ★ 채널 영상별 성과    "우리 채널 최근 30일 영상 조회·좋아요·댓글 표"   30초
  2 ★ 댓글 분류·답글      "최근 영상 5개 댓글 분류 + 답글 우선순위"        1분
  3 키워드 검색 트렌드   "'클로드코드 마케팅' 최근 30일 TOP 10"           20초
  4 경쟁사 채널 모니터링 "경쟁 채널 UCxxx 최근 7일 신작"                  30초

▼ Phase 2 · Analytics API (본인 채널 · OAuth 활성 시 5~7 가능)
  5 ★ 주간 구독 변동      "내 채널 지난 7일 구독자 증감 + 일별 그래프"      30초
  6 ★ 이탈 영상 TOP 5    "구독 취소 가장 많은 영상 TOP 5 + 가설"           1분
  7 트래픽 소스 분석    "최근 30일 시청 유입 경로 비율 + 변화"            30초

💡 추천 (현재 활성 상태에 따라 자동 분기):
  · 두 API 모두 ✅  → "1번 (시장 위치 파악) → 5번 (구독 동력) → 6번 (이탈 원인)" 3콤보
  · Phase 1 만 ✅  → "1번 (본인 채널 헬스체크) → 3번 (시장 트렌드) → 4번 (경쟁사)" 3콤보
  · Phase 2 만 ✅  → 거의 없는 케이스, OAuth 인증 우선
  · 둘 다 ❌      → "Phase 1 부터 활성화 · YOUTUBE_API_KEY 발급 안내"

어느 업무를 시연해볼까요? (1~7 번호 또는 자연어 명령 / "추천 콤보" 라고 답하면 위 3콤보 자동 실행)
```

각 번호별 시연 흐름:
- **1 (대표 시연)** → `YOUTUBE_CHANNEL_ID` 사용 (없으면 입력받기) → `getChannelTopVideos` + `getVideoDetails` × N → 마크다운 표
- **2** → `getChannelTopVideos` (5개) + 댓글 도구 → 분류·우선순위
- **3** → `searchVideos` (order: viewCount, maxResults: 10) → 마크다운 표
- **4** → 경쟁 채널 ID 입력받기 → `getChannelStatistics` + `getChannelTopVideos`
- **5·6·7** → Analytics API (OAuth 활성 필수) · 일별 시계열 + 구독·트래픽 분해

⚠️ **두 API 연결 체크 게이트 필수** · Step A·B·C 를 건너뛰고 곧장 메뉴 출력 금지. 사용자가 "어느 API 가 켜져 있는지" 모르면 메뉴를 골라도 실패함.

상세: [05-youtube-data/mcp설치-youtube/SKILL.md `STEP 4`](../../mcp-setup/youtube-data/SKILL.md#L326)

---

### 분기 5 · buffer

```
🎯 buffer · 작업 가능한 업무를 알려드릴게요.

번호 시나리오 자연어 명령 예시 소요
─────────────────────────────────────────────────────────────────────────
  1 채널 조회            "내 채널 보여줘"                                 5초
  2 단일 예약            "내일 09시 Instagram 캐러셀"                    30초
  3 ★ 다채널 동시 발행    "신제품 5채널 동시 예약"                         5분
  4 큐 상태             "이번 주 예약 보여줘"                            10초
  5 채널별 성과         "지난주 좋아요·도달 비교"                        1~2분

어느 업무를 시연해볼까요? (1~5 또는 자연어 명령)
```

각 번호별 시연 흐름:
- **1** → `listChannels`
- **2** → `listChannels` + `createPost` × 1 (텍스트 + scheduled_at)
- **3 (대표 시연)** → `listChannels` + Claude 5채널 톤 변환 + `createPost` × 5
- **4** → `listScheduled`
- **5** → `listAnalytics`

상세: [08-buffer/mcp설치-buffer/SKILL.md `STEP 4`](../../mcp-setup/buffer/SKILL.md#L269)

---

### 분기 6 · meta-ads + google-ads (2 MCP 세트)

```
🎯 meta-ads + google-ads · 작업 가능한 업무를 알려드릴게요.

번호 시나리오 자연어 명령 예시 소요
─────────────────────────────────────────────────────────────────────────
  1 ★ 광고 계정 헬스 체크  "내 Meta·Google 광고 계정 정보 보여줘"           1분
  2 ★ ROAS 분석           "지난 7일 매체별 ROAS·CPA·CTR 비교"              1~2분
  3 Top/Bottom          "상위 5 + 하위 5 캠페인"                         30초
  4 ★ 예산 재배분 (PAUSED) "ROAS 4x 이상 30% 증액 (PAUSED 안전 모드)"      1~3분
  5 캠페인 일시정지     "ROAS 1.0 이하 모두 PAUSE"                       30초

어느 업무를 시연해볼까요? (1~5 또는 자연어 명령)
```

각 번호별 시연 흐름:
- **1 (대표 시연)** → `list_ad_accounts` (Meta) + `list_accounts` + `search_gaql` (Google) → 헬스 체크 표
- **2** → `get_campaign_insights` (Meta) + `get_campaign_performance` (Google) → 비교 표
- **3** → 위 + Claude 정렬
- **4** → 위 + `update_campaign_budget` (PAUSED 기본)
- **5** → `pause_campaign`

⚠️ 4·5 는 광고 집행에 영향. **PAUSED 안전 모드 + 사용자 명시 승인** 필수 (CLAUDE.md 보안 원칙).

상세: [09-ads/mcp설치-ads/SKILL.md `STEP 4`](../../mcp-setup/ads/SKILL.md#L361)

---

### 분기 7 · notion

```
🎯 notion · 작업 가능한 업무를 알려드릴게요.

번호 시나리오 자연어 명령 예시 소요
─────────────────────────────────────────────────────────────────────────
  1 워크스페이스 검색    "봄 캠페인 페이지 찾아줘"                        5초
  2 페이지 조회         "콘텐츠 캘린더 DB 이번 주 카드"                  10초
  3 ★ 페이지 생성         "주간 리포트 페이지 만들어줘"                    30초
  4 ★ DB 카드 일괄 등록   "5월 캘린더 30개 카드 등록"                      5분
  5 새 DB 생성          "광고 리포트 DB 만들어줘"                        1분

어느 업무를 시연해볼까요? (1~5 또는 자연어 명령)
```

각 번호별 시연 흐름:
- **1** → `notion-search`
- **2** → `notion-fetch` + `notion-query-database-view`
- **3 (대표 시연 · 짧음)** → `notion-create-pages` × 1
- **4 (대표 시연 · 일괄)** → `notion-search` ('콘텐츠 캘린더') + `notion-fetch` (스키마) + Claude 30개 데이터 생성 + `notion-create-pages` × 30 (100ms 간격)
- **5** → `notion-create-database`

상세: [10-notion/mcp설치-notion/SKILL.md `STEP 4`](../../mcp-setup/notion/SKILL.md#L272)

---

### 분기 8 · discord

```
🎯 discord · 작업 가능한 업무를 알려드릴게요.

번호 시나리오 자연어 명령 예시 소요
─────────────────────────────────────────────────────────────────────────
  1 ★ 알림 발송           "#marketing 에 주간 리포트 발송"                  5초
  2 메시지 읽기         "지난 24시간 #cs-inbox 가져와줘"                  10초
  3 메시지 검색         "#marketing 에서 campaign 검색"                   5초
  4 ★ 자동 응답 (이벤트 트리거) FAQ 매칭 → 답변 자동 30초
  5 ★ 승인 워크플로       "예산 변경 reaction 받아줘"                       1~5분

어느 업무를 시연해볼까요? (1~5 또는 자연어 명령)
```

각 번호별 시연 흐름:
- **1 (대표 시연)** → 채널 ID 확인 → `send_message` (embed 형식)
- **2** → `read_messages` (limit: N)
- **3** → `list_messages` (query: "campaign")
- **4** → `read_messages` + Claude 매칭 + `send_message` (이벤트 패턴 시연)
- **5** → `send_message` + `add_reaction` + `read_reactions` 폴링

상세: [11-discord/mcp설치-discord/SKILL.md `STEP 4`](../../mcp-setup/discord/SKILL.md#L346)

---

## Step 3 / 4 · 시연 실행

사용자가 번호 또는 자연어로 1개 선택하면:

1. **사전 확인 메시지** 출력 (필요한 입력값 안내):
   ```
   📌 시연 전 확인:
      - 🏷️ 대상 계정/속성: {분석이 향할 계정 · 아래 표 참조}
      - 사용할 MCP 도구: {도구 이름 1~N}
      - 예상 소요: {시간}
      - 예상 비용: {크레딧·쿼터 등 해당 시}

   진행할까요? (y/n 또는 입력값 제공)
   ```

   ⚠️ **대상 계정/속성 안내는 필수 게이트입니다.** 데이터를 1건이라도 읽기 전에
   "지금 어느 계정·속성의 데이터를 보는지" 를 반드시 먼저 명시하고 사용자 확인을 받습니다.
   (잘못된 계정 분석 후 뒤늦게 알아차리는 사고 방지)

   **계정/속성 출처 매핑** · 계정에 매인 MCP 는 시연 전 다음에서 대상을 확인해 표기:

   | MCP | 대상 식별값 | 확인 위치 |
   |---|---|---|
   | ga4 | Property ID + 속성 이름 | `.mcp.json` 의 `ga4.env.GA_PROPERTY_ID` (현재 `${GA4_PROPERTY_ID}` = 이 회사 뉴스레터 플랫폼) |
   | meta-ads | Ad Account ID + 이름 | `list_ad_accounts` 결과 (OAuth 계정) |
   | google-ads | Customer ID + 이름 | `list_accessible_customers` 결과 |
   | google-sheets | 스프레드시트 제목 + ID | `get_spreadsheet_info` 결과 (사용자 제공 ID) |
   | youtube-data | 채널명 + 채널 ID | `getChannelStatistics` 결과 |
   | buffer | 연결 채널명 목록 | `listChannels` 결과 |
   | notion | 워크스페이스 + 대상 페이지/DB | `notion-search` 결과 |
   | discord | 서버명 + 채널명 | `discord_get_server_info` 결과 |

   ga4·ads 처럼 식별값이 설정에 고정되어 있으면 **도구 호출 없이 바로 표기**하고,
   나머지는 첫 조회 결과에서 계정명을 뽑아 사용자에게 보여준 뒤 진행합니다.

2. **자동 실행** · 위 분기별 시나리오 흐름 따라 도구 호출

3. **결과 출력** · 마크다운 표·URL·이미지·요약 (해당 분기 형식)

---

## Step 4 / 4 · 검증 + 다음 단계 제안

각 분기 시연 완료 시 공통 출력:

```
🎉 {MCP 이름} · {선택 시나리오 이름} 시연 완성

📊 산출물:
   {URL 또는 결과 요약}

🔁 다음 단계 3가지:
   A. 같은 MCP 의 다른 업무 시연
      "start" → 같은 분기에서 다른 번호 선택

   B. 다른 MCP 와 조합 (지금 추가 설치 가능)
      현재 미설치 MCP: {Step 0 결과 활용}
      "/mcp설치-{이름}" 으로 즉시 추가

   C. 정기 자동화 (cron)
      매주 자동 실행 + Discord 채널에 결과 자동 발송
      → 'agents/part10-ax/' 폴더 참고

🔄 다른 MCP 결과물 만들기:
   "start" 또는 "시작" 다시 입력 → MCP 선택 메뉴 재진입
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `claude mcp list` 빈 결과 | MCP 미설치 | `/mcp설치-google-sheets` 부터 진행 |
| 감지 MCP 목록에 누락 | 패턴 매칭 누락 | Step 0 매칭 패턴 표 확인 + Claude 재시작 |
| 메뉴 번호가 아닌 자연어 응답 | 사용자가 자유롭게 명령 | 자연어를 그대로 해석해 가장 가까운 시나리오로 진입 |
| 사전 확인에서 필요 입력값 없음 | 시트 ID·URL 등 미보유 | 기본 예시 데이터 (예: 샘플 시트) 안내 |
| 시연 중 도구 호출 실패 | 인증 토큰 만료 | 해당 mcp설치 스킬의 트러블슈팅 섹션 참고 |
| `Permission denied` | 자원 소유권 문제 | 본인 소유 자원으로 시작 |

---

## 정기 운영 결합 (cron)

본 라우터는 강의·시연용. 실제 정기 운영은 각 분기를 개별 에이전트로 분리해 스케줄:

```
매주 월요일 09:00 → /start · google-sheets · 5번 (5단계 자동 리포트)
매일 18:00       → /start · ga4 · 1번 (채널별 표) → Discord 발송
매주 금요일 10:00 → /start · notion · 4번 (다음주 카드 7개)
```

상세는 `agents/part10-ax/` 폴더 각 에이전트 정의 참고.

---

## 설계 원칙

1. **단일 진입점** · 사용자는 `/start` 하나만 외우면 됨
2. **메뉴 패턴** · 즉시 실행이 아닌 "작업 가능 업무 5개 → 1개 선택 → 시연" 흐름. 사용자가 가능한 업무를 한눈에 학습
3. **위임 패턴** · 정본은 각 mcp설치 스킬에, 라우터는 호출만
4. **확장성** · 새 MCP 추가 시 Step 0 매칭 패턴 + 새 분기 1개 추가만
6. **광고 안전 모드** · 분기 6 의 4·5 (예산 변경·PAUSE) 는 사용자 명시 승인 필수 (CLAUDE.md 보안 원칙)
7. **대상 계정 우선 확인** · 계정에 매인 MCP (ga4·ads·sheets·youtube·buffer·notion·discord) 는 데이터를 읽기 전에 "어느 계정·속성인지" 를 반드시 먼저 명시하고 사용자 확인을 받는다 (Step 3 사전 확인 게이트). 다계정 환경에서 잘못된 대상 분석을 원천 차단
