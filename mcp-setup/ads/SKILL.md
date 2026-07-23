---
name: mcp설치-ads
description: |
  Part 2 클립 3-2 (Meta·Google Ads MCP) 전용 설치 스킬. Meta 는 공식 hosted MCP (`https://mcp.facebook.com/ads` · Meta ads AI connectors) OAuth 1분 등록 + Google Ads 는 Google 공식 MCP (`github.com/googleads/google-ads-mcp` · uvx · 읽기 전용 3 도구) + Developer Token (Explorer 등급 · 보통 즉시~1-2일) + ADC 자동 인증. 후 매체 통합 헬스 체크 + 업무 카탈로그 1건을 시연. 역할 분담: 변경(예산·캠페인)은 Meta 만 가능 (승인 필수), Google 은 조회·GAQL 분석 전용. 마케터(비개발자) 기준 4단계 표준 흐름.

  자동 호출 트리거:
  - **"Meta Google Ads MCP 설치하자"** ⭐ 주요 트리거
  - "광고 MCP 설치"
  - "Meta Ads · Google Ads 연결 도와줘"
  - "광고 자동화 환경 만들자"
  - "Part 2 / 3-2 설치 시작"

  4단계 (각 MCP 마다):
  ① 소개 → ② 설치 → ③ 가능 업무 → ④ 결과물 1개

  실행 순서: ① Meta Ads hosted MCP (claude mcp add http + OAuth 1클릭) → ② Google 공식 MCP (uvx --from git+https + Developer Token 1개 + ADC) → ③ 통합 결과물 1건

  특이점: 둘 다 공식 MCP (2026-05 신규 출시). Meta 는 Meta 가 직접 운영하는 hosted MCP. Google 은 Google 이 직접 유지보수하는 GitHub MCP · 읽기 전용 강제 (캠페인 변경 불가, 실수 위험 0). ADC 는 GA4 클립과 공유.
---

# Part 2 / 3-2 Meta·Google Ads MCP 설치 (클립 전용)

> 본 스킬은 Meta + Google Ads MCP 2 종을 본인 광고 계정 기준 즉시 운영 가능한 흐름으로 설치하고 매체 통합 ROAS 비교 + 예산 재배분 시뮬레이션 1건을 시연하는 흐름. 마스터 스킬 `mcp설치` 의 4단계 표준을 2 MCP 에 순차 적용한 클립 전용 버전.

## 🎬 스킬 시작 시 메시지

본 스킬이 호출되면 Claude 는 반드시 다음과 같이 시작 멘트를 출력:

```
📈 Meta·Google Ads MCP 설치를 시작합니다.

먼저 짚고 갈 게 두 가지 있어요:

  1) Meta 는 공식 hosted MCP (mcp.facebook.com/ads · Meta ads AI connectors) 운영.
     System User Token·App·코딩 불필요 → claude mcp add 한 줄 + OAuth 1분.
     Google 은 공식 MCP (github.com/googleads/google-ads-mcp) 운영.
     ADC + Developer Token 만 (Explorer 등급 · 신규 토큰 자동 승급 가능, 미승급 시 1~2일).

  2) 역할 분담 + 안전 잠금 (중요):
     - Meta   : 조회 + 변경 모두 가능. 단, 모든 변경(생성·예산·정지)은
                에이전트를 통한 본인 승인 필수 + PAUSED 시작 원칙
     - Google : 공식 MCP 가 읽기 전용 (도구 3개 · 변경 도구 없음)
                → 예산 권장안은 "리포트"로 산출, 적용은 광고 매니저에서
     → 사고 위험 0

────────────────────────────────

총 4단계로 진행돼요 (12~17분 예상 · Meta hosted 전환으로 8분 절감):

  📖 STEP 1: MCP 소개 (2분)
       1.1 Meta + Google 한눈 정리
       1.2 역할 분담 (Meta 변경 / Google 분석) + PAUSED 패턴
       1.3 Before vs After (1시간 → 3분)

  ⚙️ STEP 2: MCP 설치 (8~12분)
       Part A · Meta Ads (1~2분) ★ hosted MCP
       Part B · Google Ads (5분 + 토큰 승급 대기) · uvx
       Step 9 · 헬스 체크

  📋 STEP 3: 작업 가능 업무 (2분)
       3.1 도구 구성 (Meta hosted 기능 5종 + Google 3 도구)
       3.2 7 시나리오 (매체 분담 표시)
       3.3 Part 6 광고 에이전트 연동

  🎯 STEP 4: 결과물 2개 (3~5분)
       4.1 2 MCP 연결 헬스 체크 (약 1분)
       4.2 작업 가능 업무 5종 미리보기 (약 2분)
  ※ 본인 활성 캠페인 없어도 OK · 캠페인 시작 시 5종 업무 즉시 자동화

사전 점검 5가지부터:
  □ Node.js 18 이상
  □ Meta Business Manager + 본인 광고 계정 1개 (캠페인 운영 안 해도 OK)
  □ Google Ads 본인 광고 계정 (Manager 모드 권장, 캠페인 불필요)
  □ Google Cloud Console 접근
  □ Chrome 또는 Safari

전체 진행할까요? (y/n)
```

사용자가 OK 하면 STEP 1 로 진행. 거부 시 본 스킬 종료.

---

## 📖 STEP 1: MCP 소개

### 1.1 표준 카드 출력

| 항목 | Meta Ads | Google Ads |
|---|---|---|
| 패키지 | **Meta 공식 hosted MCP** (`https://mcp.facebook.com/ads` · Meta ads AI connectors) | **Google 공식 MCP** (`github.com/googleads/google-ads-mcp` · uvx · Apache-2.0) |
| 제공 기능 | 기능 5종: 리포팅 · 광고 생성/관리 · 카탈로그 관리 · 시그널 진단 · 헬프센터 검색 (도구 목록은 인증 후 "어떤 도구 있어?" 로 질의) | 도구 3개: `customers_list_accessible_customers` · `search_search` (GAQL) · `metadata_get_resource_metadata` + 리소스 4종 (metrics·segments·discovery·release-notes) |
| 읽기/쓰기 | 조회 + **변경 가능** (모든 변경은 에이전트 통한 본인 승인 필수) | **읽기 전용** (변경 도구 없음 · 실수 위험 0) |
| 인증 방식 | OAuth 2.1 · Claude 자동 관리 (만료 시 자동 갱신) | ADC (`adwords` scope) + **Developer Token 1종만** |
| 사전 신청 | 불필요 (단, 점진 롤아웃 — 계정에 따라 아직 미제공 가능) | Developer Token **Explorer 등급** (신규 토큰 자동 승급 가능 · 미승급 시 API Center 신청 1~2일) |
| 공식 문서 | facebook.com/business/help/1456422242197840 | github.com/googleads/google-ads-mcp#setup-instructions |
| Before | 매체별 매니저 왕복 30분/회 | 같음 |
| After | "매체별 ROAS 비교" → 2분 | 자동 통합 |

### 1.2 마케터 관점 활용 가능성

- **3매체 통합 ROAS 리포트** · Meta + Google + (Part 6) Naver 한 표로 비교 (양 매체 조회)
- **예산 재배분** · 한계 ROAS 모델 — Meta 는 직접 변경 (승인 + PAUSED), Google 은 권장안 리포트 산출
- **임계치 자동 모니터링** · ROAS < 1.5 매시 감지 → Discord 알림 → 일시정지 권장 (양 매체 조회)
- **A/B 테스트** · Meta 변형 생성 (승인) + 양 매체 성과 데이터 통계 검증
- **신규 캠페인 자동 생성** · Meta 한정 (승인 필수 · PAUSED 시작) — Google 은 매니저에서 직접

### 1.3 Before/After 비교 (수치)

| 작업 | Before | After |
|---|---|---|
| Meta 광고 매니저 접속 + 조회 | 20분 | 30초 |
| Google 광고 매니저 같은 작업 | 20분 | 30초 |
| 통합 비교 표 + 인사이트 | 20분 | 1분 |
| 예산 재배분 (8 캠페인) | 30분 | 3분 (PAUSED) |
| 임계치 매니저 수동 확인 | 매일 30분 | 자동 (cron) |
| **주간 광고 점검 1회** | **1~1.5시간** | **3분** |
| **정기 운영 (매일 + 주간 + 임계치)** | **주 8~10h** | **주 30분** |

연간 환산: 약 400시간 절감 + 광고비 손실 90% ↓ + 실수 0건 (PAUSED 안전 잠금).

### 1.4 사용자 동의 확인

```
이 MCP 가 본인 작업에 맞는지 확인됐어요?
- y: STEP 2 (설치) 진행
- n: 본 스킬 종료, 다른 MCP 검토
```

---

## ⚙️ STEP 2: MCP 설치

### Part A · Meta Ads (1 단계 · 약 1~2분) ★ Meta 공식 hosted MCP

> Meta 가 **공식 hosted MCP 서버** (`https://mcp.facebook.com/ads` · "Meta ads AI connectors") 를 운영합니다. System User Token / App / 코딩 불필요. OAuth 한 번 클릭으로 끝. ChatGPT·Claude·Perplexity 등 지원 — Claude 는 remote MCP(custom connector) 방식.
>
> ⚠️ **점진 롤아웃 중**: 공식 문서에 "You may not have access to this feature yet" 명시. 본인 계정에 아직 안 열렸으면 OAuth 후에도 도구가 안 보일 수 있음 → 며칠 뒤 재시도.
> 출처: <https://www.facebook.com/business/help/1456422242197840>

#### STEP A1 · Claude Code 에 Meta hosted MCP 등록 (자동 30초)

Claude 자동 실행:

```bash
claude mcp add --transport http --scope user meta-ads https://mcp.facebook.com/ads
```

검증:
```bash
claude mcp list | grep meta-ads
# 출력 예: meta-ads: https://mcp.facebook.com/ads (HTTP) - ! Needs authentication
```

`! Needs authentication` 상태가 정상. 다음 단계에서 인증.

#### STEP A2 · 브라우저 OAuth 인증 (사용자 1회 · 1분)

Claude Code 를 완전 종료 후 재시작. 재시작 후 Claude 에게 다음 질의:

```
사용자: "내 Meta 광고 계정 캠페인 목록 보여줘"
```

→ 브라우저 자동 열림 → Facebook 로그인 → 5개 권한 허용 → 자동 닫힘 → 인증 완료.

요청되는 OAuth scope (5개):
- `ads_management` · 광고 캠페인 조회·생성·수정
- `ads_read` · 광고 성과·통계 읽기
- `catalog_management` · 카탈로그 (커머스) 관리
- `business_management` · Business Manager 접근
- `pages_show_list` · 연결된 페이지 목록

OAuth 토큰은 Claude.ai 가 자동 관리 (만료 시 자동 갱신). System User Token / .env 변수 불필요.

#### STEP A3 · 헬스 체크 (자동 30초)

```bash
claude mcp list | grep meta-ads
# 출력 예 (성공): meta-ads: https://mcp.facebook.com/ads (HTTP) - ✓ Connected
```

또는 자연어로:
```
사용자: "Meta 광고 도구 목록 보여줘"
→ Claude: mcp__meta-ads__* 또는 hosted 패턴 도구 목록 출력
```

⚠️ **이전 npm 방식 사용자**: `@getscaleforge/mcp-meta-ads` 항목이 `.mcp.json` 에 남아있으면 충돌 가능. `.mcp.json` 에서 해당 항목 제거 (이미 마스터 스킬 `/mcp설치-전체` 가 자동 정리).



### Part B · Google Ads (2 단계 · 약 5분 + 토큰 승급 대기) ⭐ Google 공식 MCP

> Google 이 직접 운영하는 공식 MCP (`github.com/googleads/google-ads-mcp` · Python · FastMCP · Apache-2.0) 사용. **읽기 전용** (도구 3개 · 변경 도구 없음) + ADC 자동 인증 + 환경변수 2개만. 이전 5종 환경변수 발급 절차 (OAuth Client ID/Secret/Refresh Token/Customer ID) 모두 **불필요**.
> 공식 설치 가이드: <https://github.com/googleads/google-ads-mcp#setup-instructions>
>
> 공식 README 4단계 요약: ① Developer Token (Explorer 등급 이상) → ② GCP 프로젝트에 Google Ads API 활성화 → ③ ADC 인증 (`adwords` scope) → ④ MCP 클라이언트 등록 (README 는 pipx, 본 강의는 동등한 uvx 사용)

#### STEP B1 · Developer Token 확보 (사용자 직접 · 5분 · 등급은 Explorer 이상)

```
① ads.google.com → wmbb.kr 계정 로그인
② Manager 계정 필요 (없으면 무료 생성)
   상단 ⚙ "관리자 계정 만들기"
   또는 https://ads.google.com/intl/ko_kr/home/tools/manager-accounts/

③ Manager 계정 안에서:
   상단 ⚙ "도구" > "설정" > "API 센터"
   또는 https://ads.google.com/aw/apicenter

④ API 센터에 Developer Token 표시됨 (22자) → 복사

⑤ 등급 확인 (중요):
   - Production 계정 조회에는 "Explorer access" 이상 필요
   - 신규 토큰은 자동으로 Explorer 승급되는 경우가 많음
   - "The developer token is only approved for use with test accounts"
     에러가 나면 아직 Test 등급 → API Center 에서 등급 신청
     (양식: 사용 목적 "Internal marketing analytics for our own
      Google Ads accounts. Read-only." · 보통 즉시~1-2 영업일)

⑥ 승인 알림: steve@wmbb.kr
```

⚠️ **등급 승급이 비동기일 수 있음**. 대기 중에도 본 스킬 다른 부분 그대로 진행 가능.

#### STEP B2 · MCP 등록 (Claude 자동 · 1분 · ADC 활용)

> ADC 는 GA4 클립과 같은 파일 공유 (`~/.config/gcloud/application_default_credentials.json`). 단, **`adwords` scope 가 포함돼 있어야** 합니다. GA4 때 analytics scope 만으로 로그인했다면 아래 한 줄로 재로그인 (공식 README 권장 명령):

```bash
gcloud auth application-default login \
  --scopes https://www.googleapis.com/auth/adwords,https://www.googleapis.com/auth/cloud-platform \
  --client-id-file=<본인 OAuth 데스크톱 클라이언트 JSON>   # GA4 클립에서 만든 파일 재사용
```

GCP 프로젝트에 **Google Ads API 활성화**도 필요 (1클릭):
<https://console.cloud.google.com/apis/library/googleads.googleapis.com>

`.env` 에 1줄만 추가:

```bash
# Developer Token 만 명시 (Project ID 는 .mcp.json 에 하드코딩)
echo "GOOGLE_ADS_DEVELOPER_TOKEN=발급받은_22자_토큰" >> .env
```

`.mcp.json` 의 `google-ads` 항목 확인 (이미 등록됨):

```json
"google-ads": {
  "_part": "2 Ch3-2 Google 광고 분석 (Google 공식 MCP)",
  "command": "uvx",
  "args": [
    "--from",
    "git+https://github.com/googleads/google-ads-mcp.git",
    "google-ads-mcp"
  ],
  "env": {
    "GOOGLE_PROJECT_ID": "marketing-os-497122",
    "GOOGLE_ADS_DEVELOPER_TOKEN": "${GOOGLE_ADS_DEVELOPER_TOKEN}"
  }
}
```

Manager(MCC) 계정 경유로 하위 계정에 접근한다면 `env` 에 한 줄 추가 (공식 README):

```json
"GOOGLE_ADS_LOGIN_CUSTOMER_ID": "매니저_계정_Customer_ID_숫자만"
```

JSON 검증:
```bash
python3 -c "import json; json.load(open('.mcp.json'))"
```

⚠️ **uv 가 없으면 먼저 설치** (마케팅os 다른 MCP 와 공유):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Google 공식 MCP 의 도구 (3개)

| 도구 | 역할 |
|---|---|
| `list_accessible_customers` | 인증된 사용자가 액세스 가능한 Google Ads 고객 ID + 계정 이름 목록 |
| `search` | GAQL (Google Ads Query Language) 요청 실행 |
| `get_resource_metadata` | 리소스 유형 (예: campaign) 의 메타데이터 조회 |

→ Customer ID 발급 절차 **불필요**: `list_accessible_customers` 도구로 자동 조회.

#### STEP 9 · Claude Code 재시작 + 헬스 체크 (자동 1분)

```
"내 Meta·Google 광고 계정 보여줘"
```

성공 응답:

```
✅ Meta Ads 연결 확인:
  - 광고 계정: act_1234567890 ("My Brand Ad Account")
  - 활성 캠페인: 5개
  - 통화: KRW

✅ Google Ads 연결 확인:
  - Customer ID: 123-456-7890
  - 활성 캠페인: 8개
  - 통화: KRW

도구: Meta hosted 세트 (인증 후 노출 · 리포팅+관리) + Google 3개 (조회 전용)
```

### 2.X 보안 점검

설치 직후 확인:
- [ ] `.env` 가 `.gitignore` 에 등록됨
- [ ] `.mcp.json` 의 값은 `${VAR}` 참조 (Developer Token 평문 직접 입력 금지)
- [ ] Google Developer Token 이 git log 에 노출된 적 없는지 (Meta 는 토큰 저장 자체가 없음 — OAuth 를 Claude 가 관리)
- [ ] Meta OAuth 는 본인 광고 계정 계정으로만 인증 (공용 PC 에서 인증 금지)
- [ ] Meta 변경 작업(캠페인 생성·예산)은 항상 에이전트 승인 단계 거치는지 1회 테스트

---

## 📋 STEP 3: 작업 가능 업무

### 3.1 노출 도구 (Meta hosted 기능 5종 + Google 3 도구)

#### Meta Ads · hosted 기능 5종 (공식 문서 기준 · 도구 목록은 인증 후 "어떤 도구 있어?" 로 질의)

| 기능 | 읽기/쓰기 | 예 |
|---|---|---|
| 리포팅 ★ | 읽기 | 캠페인 성과 (ROAS·CPA·CTR·노출·클릭) 상세 조회 + 트렌드·업종 벤치마크·이상 감지 |
| **광고 라이브러리 검색** ⭐ | 읽기 | 키워드·페이지·국가별 **경쟁사 집행 중 광고 검색** (`ads_library_search`) — 본인 캠페인 0개여도 동작 |
| 광고 생성·관리 ★ | **쓰기 (본인 승인 필수)** | 캠페인·광고세트·광고 생성/수정/예산/정지 + 기회 점수 (`ads_get_opportunity_score`) |
| 카탈로그 생성·관리 | 쓰기 (승인 필수) | 커머스 카탈로그·상품 피드·노출 문제 해결 |
| 시그널 진단 | 읽기 | 픽셀·CAPI 시그널 품질 점검 + 우선 투자처 |
| 헬프센터 검색 | 읽기 | 정책·기능 질문을 Meta 공식 문서에서 검색 |

> 2026-06-11 실연결 기준 hosted 도구 **58개** 노출 확인 (`ads_get_ad_accounts` · `ads_get_ad_entities` · `ads_insights_*` 5종 · `ads_library_search` · `ads_create_*` · 카탈로그 13종 · 픽셀 8종 등).

#### Google Ads · 공식 도구 3개 (읽기 전용 고정)

| 도구 | 기능 |
|---|---|
| `customers_list_accessible_customers` | 접근 가능한 Customer ID + 계정 이름 목록 (Customer ID 발급 절차 불필요) |
| `search_search` ★ | GAQL (Google Ads Query Language) 쿼리 — 캠페인·키워드·검색어 성과 전부 이걸로 |
| `metadata_get_resource_metadata` | 리소스(예: campaign) 구조·필드 메타데이터 — GAQL 작성 보조 |

+ MCP 리소스 4종: `discovery-document` · `metrics` · `segments` · `release-notes` (GAQL 필드 탐색용)

### 3.2 마케터가 자주 쓰는 7 시나리오 (매체 분담 표시)

| 시나리오 | 자연어 명령 | 매체 | 소요 |
|---|---|---|---|
| A. 광고 계정 조회 | "내 광고 계정 보여줘" | 양쪽 | 10초 |
| B. ROAS 분석 ★ | "지난 7일 매체별 ROAS 비교" | 양쪽 (조회) | 1~2분 |
| C. Top/Bottom | "상위 5 + 하위 5 캠페인" | 양쪽 (조회) | 30초 |
| D. 예산 재배분 ★ | "ROAS 4x 이상 30% 증액 (PAUSED)" | **Meta 만 변경** · Google 은 권장안 리포트 | 1~3분 |
| E. 캠페인 일시정지 | "ROAS 1.0 이하 모두 PAUSE" | **Meta 만** | 30초 |
| F. 신규 캠페인 생성 | "신규 캠페인 PAUSED 로 초안" | **Meta 만** (승인 필수) | 2~3분 |
| G. 임계치 자동 알림 | (cron) ROAS < 1.5 → Discord | 양쪽 (조회) | 자동 |
| H. 경쟁사 광고 검색 ⭐ | "지금 한국에서 돌고 있는 화장품 광고 검색" | Meta 라이브러리 (본인 캠페인 불필요) | 30초 |

> 🔒 **분담 원칙**: Google 공식 MCP 는 읽기 전용 → 변경이 필요한 결론은 "권장안 리포트"로 산출하고, 적용은 Google Ads 매니저에서 본인이 직접. Meta 는 MCP 로 직접 변경하되 항상 승인 + PAUSED.

### 3.3 Part 6 광고 에이전트 연동

본 MCP 는 Part 6 의 광고 에이전트들이 자동 호출:

| 에이전트 | 사용 도구 |
|---|---|
| `meta-ads-analyzer` | Meta hosted 리포팅 |
| `google-ads-analyzer` | Google `search_search` (GAQL) + 검색어 보고서 |
| `naver-ads-analyzer` | (별도 · 본 MCP 외 · WebFetch) |
| `ad-performance-checker` | 양 매체 조회 + 임계치 감지 → Discord |
| `3media-integrated-reporter` | 양 매체 + 네이버 통합 → HTML + Notion + Discord |
| `ab-test-analyzer` | 양 매체 성과 + 통계 검증 → Notion |

### 3.4 다른 MCP 와 조합 시나리오

- **+ Discord MCP** · 임계치 위반 자동 알림 + 승인 reaction 워크플로
- **+ Google Sheets MCP** · 광고 데이터 시트 자동 적재 + 시계열 추적
- **+ Notion MCP** · 주간 종합 리포트 Notion 페이지 자동 게시
- **+ GA4 MCP** · 광고 + 전환 데이터 통합 분석
- **+ Gmail MCP** · 광고 성과 이메일 자동 발송 (Claude.ai 통합)

---

## 🎯 STEP 4: 시연 3개 · 헬스 체크 + 경쟁사 광고 검색 + 캠페인 인벤토리

본 STEP 의 핵심: **활성 캠페인이 없어도 연결 자체는 정상 작동** 검증 + 본인 캠페인 데이터 없이도 보여줄 수 있는 와우 모먼트 (경쟁사 광고 라이브러리) + 캠페인 시작하는 날 즉시 자동화 가능하도록 도구·쿼리 학습. Part 6 광고 에이전트로 이어지는 진입점.

> 📌 **실측 검증 노트 (2026-06-11 · 본 계정 기준)** — 시연 기대값:
> - 시연 A 헬스 체크 ✅ : **WMBB 한정 조회** — Meta "WMBB 마케팅" (활성·queryable·KRW) · Google "WMBB" MCC + 일반 계정 (KRW)
> - 시연 B 라이브러리 ✅ : "화장품" KR 검색 → 약 2,900건 · 아토팜·딘토·무신사 실광고 + 스냅샷 URL
> - 시연 C GAQL ✅ : WMBB Google 계정 GAQL 쿼리 실행 (캠페인 0건 응답도 정상 — 연결 검증)
> - ⚠️ 성과 지표 (spend·CTR·ROAS) 와 기회 점수는 **활성 캠페인이 없어 "Not available"** → 본 계정으로는 시연 불가. ROAS 표 시연은 캠페인 활성화 이후로 약속할 것.
>
> 🔒 **녹화 프라이버시 규칙 (필수)**: 연결된 Meta 계정에 **타사(클라이언트) 광고 계정 다수 포함** → 녹화에서 "내 광고 계정 전부 보여줘" 류의 **전체 조회 명령 금지**. 반드시 "**WMBB 광고 계정만 보여줘**" 로 한정하고, Claude 는 시연 중 WMBB 외 계정명·ID 를 화면에 출력하지 않는다.

### 4.1 시연 A · 2 MCP 연결 헬스 체크 (약 1분)

```
사용자: "WMBB 광고 계정만 보여줘. Meta·Google 둘 다.
        통화 + 캠페인 수 + 사용 가능 도구 확인. 다른 계정은 출력하지 마."
```

자동 실행 (🔒 WMBB 외 계정명·ID 는 결과에서 필터링):

```
1. Meta hosted · 광고 계정 조회 → business_name == "WMBB" 만 추려서 표시
   → "WMBB 마케팅" · 통화 KRW · 활성 캠페인 (0개여도 정상 응답)

2. mcp__google-ads__customers_list_accessible_customers
   → Customer 목록 중 WMBB 관련만 표시 (MCC + 일반 계정)

3. mcp__google-ads__search_search (검증 GAQL · WMBB 일반 계정):
   SELECT customer.id, customer.descriptive_name
   FROM customer LIMIT 1
   → 권한·접근 확인 (Developer Token 등급도 여기서 검증됨)

4. 결과 표 출력:
   ✅ Meta Ads · WMBB 마케팅 · 통화 KRW · 캠페인 0개
   ✅ Google Ads · WMBB (MCC) + 일반 계정 · 통화 KRW · 캠페인 0개
   ✅ 도구 호출 가능: Meta hosted 세트 + Google 3개 (조회 전용)
```

성공 기준:
- [ ] 양 매체 응답 정상 (캠페인 0개여도 연결 OK)
- [ ] 통화·계정 정보 확인
- [ ] Google GAQL 1건 실제 실행됨 (토큰 등급 검증)
- [ ] 🔒 WMBB 외 계정명·ID 화면 노출 0건

핵심 메시지: **활성 캠페인 0개여도 연결 성공**. 캠페인 시작하는 날 즉시 자동화 가능.

### 4.2 시연 B · 경쟁사 광고 라이브러리 검색 ⭐ 와우 모먼트 (약 1.5분)

> **본인 캠페인 0개여도 무조건 성공하는 시연.** 광고 안 돌리는 수강생도 따라할 수 있어 시연 가치 최고.

```
사용자: "지금 한국에서 돌고 있는 화장품 광고 검색해줘"
```

자동 실행:

```
1. mcp__meta-ads__ads_library_search
   search_terms="화장품", countries=["KR"], limit=10

2. 결과 출력 (실측: 약 2,900건):
   - 총 건수 + 브랜드별 광고 (페이지명·카피·집행 시작일)
   - 각 광고의 ad_snapshot_url

3. 스냅샷 URL 1개를 브라우저로 열어 실제 광고 소재 보여주기
   → "경쟁사가 지금 이 순간 돌리는 소재를 채팅으로 검색했다"
```

변형 멘트:
- "무신사 페이지가 지금 돌리는 광고만" (page_ids 필터)
- "우리 업종 키워드로 최근 시작된 광고" (ad_active_status=ACTIVE)
- Part 4 `research-ad-references` 에이전트 (광고 소재 수집 → Sheets) 와 연결되는 진입점이라고 안내

성공 기준:
- [ ] 총 건수 + 실브랜드 광고 5개 이상 출력
- [ ] 스냅샷 URL 1개 브라우저 오픈
- [ ] "본인 캠페인 없어도 가능" 메시지 전달

### 4.3 시연 C · GAQL 쿼리 + 안전 잠금 (약 1분)

```
사용자: "WMBB Google Ads 계정에서 캠페인 목록을 GAQL 로 조회해줘"
```

자동 실행: `search_search` (resource=campaign, fields=[campaign.id, campaign.name, campaign.status]) → 실측: **0건 응답 (정상)**.

핵심 메시지: "빈 응답도 시연 포인트 — 쿼리가 실제 광고 서버까지 갔다 왔다는 증거. 캠페인을 만드는 날 같은 한 줄이 ROAS 표가 됩니다." 이어서 안전 잠금 한 줄:
> "변경은 어떻게 되냐 — Meta 는 생성·예산 변경이 가능하지만 **항상 본인 승인을 먼저 요구**하고 PAUSED 로 시작합니다. Google 은 아예 읽기 전용이라 사고 자체가 불가능합니다." (말로만 · 실제 생성은 시연하지 않음)

### 4.4 (옵션) 시연 D · 작업 가능 업무 5종 미리보기 (약 2분)

```
사용자: "본 MCP 로 마케터가 할 수 있는 업무 정리해줘.
        각 업무별 사용자 명령 예시 한 줄 + 다른 MCP 와 조합도 함께."
```

자동 실행:

```
마케터 작업 5종 카테고리별 출력:

🔍 1. 모니터링 · 매체별 성과 자동 회수 (양 매체 조회)
   명령 예시: "지난 7일 Meta·Google ROAS·CPA·CTR 비교 표"
   호출: Meta hosted 리포팅 + Google search_search (GAQL)
   소요: 약 1~2분 (수동 1시간)
   조합: + Notion (리포트 게시) · + Discord (요약 알림)

⚖️ 2. 예산 최적화 · 한계 ROAS 모델 (Meta 변경 + Google 권장안)
   명령 예시: "ROAS 4x 이상 30% 증액, 1.5 이하 정지 (PAUSED)"
   호출: Meta hosted 예산 변경 (본인 승인) · Google 은 GAQL 분석 → 권장안 리포트
   소요: 약 1~3분 (수동 30분)
   안전: Meta 변경은 승인 + PAUSED 시작 · Google 적용은 매니저에서 직접

🚨 3. 임계치 자동 알림 · ROAS·CPA 매시 감지 (양 매체 조회)
   명령 예시: "ROAS < 1.5 매시 감지 → #marketing 멘션"
   호출: cron + Meta 리포팅 + Google GAQL + Discord
   소요: 자동 (cron 매시)
   효과: 광고비 손실 평균 90% ↓

🆕 4. 신규 캠페인 자동 생성 (Meta 한정)
   명령 예시: "Meta 신규 캠페인 PAUSED 로 초안 (봄 신학기 컨셉)"
   호출: Meta hosted 광고 생성·관리 (본인 승인 필수)
   소요: 약 2~3분
   안전: PAUSED 시작 · 매니저 검토 후 enable · Google 은 매니저에서 직접

🧪 5. A/B 테스트 · 변형 + 통계적 유의성
   명령 예시: "이 캠페인 A/B 변형 3개 생성 + 유의성 검증"
   호출: Meta hosted 변형 생성 (승인) + 양 매체 성과 조회 + Sheets MCP (통계)
   소요: 약 5분
   결과: 통계적 승자 자동 선택

다른 MCP 와 조합 시나리오:
+ Discord MCP · 임계치 알림 + 승인 reaction 워크플로
+ Sheets MCP · 광고 데이터 시계열 적재
+ Notion MCP · 주간 리포트 자동 게시
+ GA4 MCP · 광고 + 전환 통합 분석
+ Gmail MCP · 광고 성과 이메일 자동 발송
```

성공 기준:
- [ ] 5종 작업이 각각 카테고리·명령 예시·소요·조합 정리됨
- [ ] 안전 잠금 (PAUSED) 강조됨
- [ ] 다른 MCP 조합 5종 이상 포함
- [ ] 캠페인 시작 시 그대로 호출 가능한 형태로 제시

### 4.5 다음 단계 제안

```
🎉 Meta·Google Ads MCP 설치 + 헬스 체크 + 학습 완성.
   캠페인 시작하는 날 즉시 자동화 가능. 다음 가능합니다:

  A. 캠페인 없을 때 학습 (지금 가능):
     - GAQL 쿼리 5종을 본인 Customer ID 로 직접 호출 (빈 응답 정상)
     - Meta 신규 캠페인 PAUSED 초안 테스트 (승인 게이트 체험 · 즉시 삭제 가능)
     - 도구 학습 + 역할 분담 (Meta 변경 / Google 조회) 검증

  B. 캠페인 시작 후 시나리오 (자동 호출):
     - "지난 7일 매체별 ROAS 비교" (한 줄 · 양 매체 조회)
     - "Meta ROAS 4x 이상 30% 증액 PAUSED" (한 줄 + 승인 + 매니저 enable)
     - "ROAS < 1.5 캠페인 자동 알림 등록" (cron + Discord)
     - "Google 예산 권장안 리포트 만들어줘" (조회 → 권장안 · 적용은 매니저)

  C. 정기 자동화 (Part 6 광고 에이전트):
     - ad-performance-checker · 매시 임계치 자동 감지
     - 3media-integrated-reporter · 매주 종합 리포트
     - meta-ads-analyzer · Meta 단독 깊은 분석
     - google-ads-analyzer · Google 단독 깊은 분석
     - ab-test-analyzer · A/B 통계 검증
     - naver-ads-analyzer · Naver 보조 (별도)

  D. 다른 MCP 결합:
     - "Discord MCP 설치하자" → 임계치 알림 + 승인 워크플로
     - "Sheets MCP 설치하자" → 광고 데이터 시계열 적재
     - "Notion MCP 설치하자" → 주간 리포트 자동 게시
```

---

## 📝 강의 실습 (실습.md 통합)

> 클립 3-2 실습.md 와 본 스킬을 함께 운영. 본 섹션은 강의 진행 시 시연용 명령·5패턴·응용 과제.

### 실습 한 줄 요약

`/mcp설치-ads` 스킬을 호출해 Meta + Google 2 MCP 를 15~25분 안에 설치하고 **연결 헬스 체크 + 도구·GAQL 학습** 으로 마무리. 본인 활성 캠페인 없어도 OK.

### 실습 첫 결과물 명령 · 2 MCP 연결 헬스 체크

```
내 Meta·Google 광고 계정 정보 보여줘.
활성 캠페인 + 권한 + 통화 + 사용 가능 도구 수 모두 확인.
```

→ 약 1분. **활성 캠페인 0개여도 연결은 성공**. 캠페인 시작하는 날 즉시 자동화 가능.

> 🔒 강사 녹화 시에는 이 전체 조회 명령 대신 **"WMBB 광고 계정만 보여줘"** 사용 (타사 계정 노출 방지 · STEP 4 프라이버시 규칙 참조). 수강생은 본인 계정뿐이므로 전체 조회 그대로 OK.

### 실습 두 번째 결과물 · 경쟁사 광고 라이브러리 검색 ⭐

```
지금 한국에서 돌고 있는 화장품 광고 검색해줘
```

→ 약 30초. 집행 중 실광고 수천 건 + 브랜드·카피·스냅샷 URL. **본인 캠페인 0개여도 동작** — 광고 안 돌리는 수강생의 첫 성공 경험으로 최적.

### 실습 세 번째 결과물 · 작업 가능 업무 5종 미리보기

```
본 MCP 로 마케터가 할 수 있는 업무 정리해줘.
각 업무별 사용자 명령 예시 한 줄 + 다른 MCP 와 조합 시나리오도 함께.
```

→ 5종 업무 (모니터링 / 예산 최적화 / 임계치 알림 / 신규 캠페인 / A/B 테스트) 카탈로그 자동 출력.

### 마케터 5패턴 · 정기 운영 결합

```
[역할]
1인 마케터의 광고 통합 매니저 어시스턴트

[입력]
- Meta + Google 광고 계정 (Naver 는 Part 6 클립에서 추가)
- 한계 ROAS 목표: 3.0 (이상이면 예산 증액 · 이하면 정지 검토)
- 일 총 예산: ₩200,000

[산출물]
매일 자동:
  ① 09:00 · 어제 매체별 성과 표 → Discord #marketing
  ② 18:00 · 오늘 마감 임박 광고 점검 → 임계치 위반 시 알림

매주 월요일 09:00:
  ③ 지난주 3매체 통합 ROAS 리포트 (HTML 첨부) → Discord
  ④ 예산 재배분 권장안 (PAUSED 적용 + Discord reaction 승인)

임계치 자동 (매시간):
  ⑤ ROAS < 1.5 즉시 알림 + 일시정지 권장

[제약]
- 변경(예산·정지·생성)은 Meta 만 MCP 로 실행 · 항상 승인 + PAUSED 시작
- Google 은 읽기 전용 → 변경 결론은 권장안 리포트로, 적용은 매니저에서 직접
- 캠페인 일 한도: 매체별 ₩50,000 (총 ₩100,000)
- Naver 광고는 Part 6 추가 후 통합
- 통화 KRW 통일

[검증]
- 매체별 ROAS 합계 = 일 광고비 × 평균 ROAS
- 예산 변경 후 PAUSED 상태 100%
- 임계치 알림 누락 0건
```

### 응용 과제

1. 본인 Meta + Google 광고 계정 1개씩 연결 후 "내 광고 계정 정보" 1회 시연 (캠페인 없어도 OK)
2. GAQL 쿼리 5종 본인 Google Ads Customer ID 로 직접 호출 (캠페인 없으면 빈 응답 정상)
3. **Meta 신규 캠페인 PAUSED 초안 시도** (테스트용 · 승인 게이트 체험 · 즉시 삭제 가능) → 안전 잠금 검증
4. **Part 6 광고 에이전트들 (`meta-ads-analyzer` 등) 이 본 MCP 를 자동 호출** · 캠페인 시작하는 날 즉시 자동화 시작

---

## 트러블슈팅 (Meta·Google Ads MCP 한정)

| 증상 | 원인 | 해결 |
|---|---|---|
| Meta OAuth 후에도 도구 안 보임 | hosted MCP 점진 롤아웃 — 계정에 아직 미제공 | 며칠 뒤 재시도 (공식 문서: "You may not have access to this feature yet") |
| Meta `! Needs authentication` 지속 | OAuth 미완료 또는 세션 만료 | Claude Code 재시작 → Meta 관련 질문 1회 → 브라우저 OAuth 재인증 |
| Meta 변경 작업이 바로 실행될까 불안 | — | 모든 쓰기 작업은 에이전트가 승인을 먼저 요청 (공식 정책) · PAUSED 시작 요청을 명령에 포함 |
| Google `developer token is only approved for use with test accounts` | 토큰이 Test 등급 | API Center 에서 Explorer 등급 신청 (보통 즉시~1-2일) |
| Google `PERMISSION_DENIED` / scope 오류 | ADC 에 `adwords` scope 없음 (GA4 때 analytics 만 로그인) | `gcloud auth application-default login --scopes adwords,cloud-platform --client-id-file=<본인 클라이언트 JSON>` 재로그인 + Claude Code 재시작 |
| Google `API not enabled` | GCP 프로젝트에 Google Ads API 미활성화 | console.cloud.google.com/apis/library/googleads.googleapis.com 에서 활성화 |
| Manager(MCC) 경유인데 하위 계정 조회 실패 | `GOOGLE_ADS_LOGIN_CUSTOMER_ID` 누락 | `.mcp.json` env 에 매니저 Customer ID (숫자만) 추가 |
| `Customer ID format` 오류 | 하이픈·공백 혼재 | 숫자만 (`1234567890`) 사용 · 프롬프트에 Customer ID 직접 포함이 가장 확실 |
| 두 매체 통화 불일치 | Meta KRW · Google USD 같은 경우 | 광고 계정 통화 통일 또는 Claude 가 자동 환율 변환 |
| `mcp__google-ads__*` 안 보임 | `.mcp.json` 문법 오류 · uv 미설치 · 재시작 안 함 | JSON 검증 + `curl -LsSf https://astral.sh/uv/install.sh \| sh` + 완전 재시작 |
| Meta 메트릭이 매니저와 다름 | Attribution Setting 불일치 | 리포팅 요청 시 기여 설정(예: 7일 클릭) 명시 |
| Google GAQL 쿼리 오류 | 잘못된 필드명 | `metadata_get_resource_metadata` 도구 또는 `metrics`·`segments` 리소스로 필드 확인 |

## 강의 연결

- 본 스킬은 [클립 3-2 Meta·Google Ads MCP 대본](../대본/3-2-ads-5min.md) 과 연동 — 클립은 이론(작동 원리)만 다루고, 설치는 Part 2 마지막 "설치 마라톤" 영상(`/mcp설치-전체` Step 9)에서 본 스킬이 호출됩니다.
- 마스터 스킬 [skills/mcp설치/SKILL.md](../../../../skills/mcp설치/SKILL.md) 의 4단계 표준 흐름을 2 광고 MCP 에 순차 적용한 클립 전용 버전.
- 본 스킬로 설치된 MCP 는 **Part 6 광고 에이전트들이 자동 호출**:
  - `meta-ads-analyzer` · `google-ads-analyzer` · `ad-performance-checker` · `3media-integrated-reporter` · `ab-test-analyzer` · (보조) `naver-ads-analyzer`
- Part 10 의 광고 자동화 에이전트가 매시 cron 으로 임계치 모니터링 + 매주 월요일 통합 리포트.
- 본 스킬은 클립 폴더 내부에 위치 (`curriculum/part02-MCP12개/09-ads/mcp설치-ads/`) · 클립과 함께 자체 보관.

## 사전 검증된 설정값 (2026-06 · 공식 MCP 기준)

| 항목 | 값 |
|---|---|
| Meta MCP | **공식 hosted** `https://mcp.facebook.com/ads` (Meta ads AI connectors · ChatGPT/Claude/Perplexity 지원) |
| Meta 등록 명령 | `claude mcp add --transport http --scope user meta-ads https://mcp.facebook.com/ads` |
| Meta 인증 | OAuth 2.1 (scope 5: ads_management·ads_read·catalog_management·business_management·pages_show_list) · Claude 자동 갱신 · 토큰 저장 없음 |
| Meta 쓰기 작업 | 가능 (광고·카탈로그) · **모든 액션은 에이전트 통한 본인 승인 필수** |
| Meta 롤아웃 | 점진 적용 중 — 계정에 따라 미제공 가능 (며칠 뒤 재시도) |
| Google MCP | **공식** `github.com/googleads/google-ads-mcp` (Python · FastMCP · Apache-2.0) |
| Google 실행 | `uvx --from git+https://github.com/googleads/google-ads-mcp.git google-ads-mcp` (공식 README 는 pipx · 동등) |
| Google 필수 env | `GOOGLE_PROJECT_ID` + `GOOGLE_ADS_DEVELOPER_TOKEN` (옵션: `GOOGLE_ADS_LOGIN_CUSTOMER_ID` — MCC 경유 시) |
| Google 인증 | ADC (`~/.config/gcloud/application_default_credentials.json`) · scope 에 `https://www.googleapis.com/auth/adwords` 필수 |
| Google 사전 작업 | GCP 프로젝트에 Google Ads API 활성화 (1클릭) |
| Developer Token 등급 | **Explorer 이상** (Production 조회 가능 · 신규 토큰 자동 승급 多 · 미승급 시 API Center 신청) |
| Google 도구 | 3개 고정: `customers_list_accessible_customers` · `search_search` · `metadata_get_resource_metadata` (읽기 전용 · tools_config.yaml 로 prefix 변경 가능) |
| Google 리소스 | `discovery-document` · `metrics` · `segments` · `release-notes` |
| Customer ID 형식 | 숫자만 (`1234567890`) 권장 · 프롬프트에 직접 포함이 가장 확실 |
| 공식 문서 | Meta: facebook.com/business/help/1456422242197840 · Google: github.com/googleads/google-ads-mcp#setup-instructions |

## 메모리·문서 연결

- 사용자의 Meta Ad Account ID + Google Customer ID 매핑은 메모리로 저장 (자주 사용)
- 한계 ROAS 모델 임계치 (예: 3.0 / 1.5) 도 메모리 저장 (재사용)
- 본 스킬 종료 후 사용자가 "매시 임계치 알림 자동" 이라고 하면 Part 6 의 `ad-performance-checker` 에이전트 (`/check-ads`) 또는 Part 10 cron 구성으로 전달
- Google Ads GAQL 쿼리 패턴은 메모리로 저장 가능 (자주 변형해서 재사용)
