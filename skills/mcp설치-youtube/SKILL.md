---
name: mcp설치-youtube
description: |
  YouTube 채널 분석 환경 (YouTube Data API v3 + YouTube Analytics API) **2개 API**의 설치 상태를 처음에 자동 체크하고, 부족한 부분만 골라서 가이드하는 스킬. 둘 다 정상이면 곧장 분석 메뉴 5개를 제시한다.

  Phase 1 (공개 데이터) = Data API v3 + API Key → 키워드 검색·영상 KPI·댓글·트렌딩
  Phase 2 (소유자 데이터) = Analytics API + OAuth refresh_token → 구독 변동·시청자·트래픽

  자동 호출 트리거:
  - **"유튜브 mcp 시작하자"** ⭐ 주요 트리거 (Part 2 / 2-2 진입)
  - **"YouTube 분석 시작"** / "유튜브 분석하자"
  - "YouTube MCP 설치 체크" / "유튜브 API 셋업 확인"
  - "YouTube Data + Analytics 설치" / "유튜브 2개 API 체크"
  - "Part 2 / 2-2 시작"

  4단계 흐름:
  ① 자동 헬스 체크 (5초 · 사용자 입력 0) →
  ② 결과 출력 (Data ✅/❌ · Analytics ✅/❌) →
  ③ 부족한 부분만 가이드 (Phase 1 또는 Phase 2 분기) →
  ④ 둘 다 ✅면 분석 메뉴 5개 제시 (A 톱5 KPI · B 구독 변동 · C 경쟁사 비교 · D 트렌딩 · E 후킹 분석)

  특이점: 본 스킬은 "처음 진입할 때 자동 발동" 되도록 설계. 강의용 상세 가이드는 [mcp-setup/youtube-data/SKILL.md](../../../mcp-setup/youtube-data/SKILL.md) 참조.
---

# YouTube 2개 API 설치 체크 + 분석 진입

> 본 스킬은 사용자가 "유튜브 mcp 시작하자" 등으로 진입할 때 **가장 먼저 발동**. 사용자에게 묻기 전에 5초 자동 헬스 체크부터 실행 → 부족한 부분만 콕 짚어 가이드.

## 🎬 스킬 시작 시 출력

```
📺 YouTube 분석 환경을 점검합니다 (5초 자동 체크)...

본 채널 분석에는 2개 API가 필요해요:
  ① YouTube Data API v3 (공개 데이터 · API Key)
  ② YouTube Analytics API (소유자 데이터 · OAuth)

────────────────────────────────
```

그 다음 바로 STEP 1 자동 실행 (사용자 입력 받지 않음).

---

## ⚙️ STEP 1: 자동 헬스 체크 (Claude 자동 실행 · 5초)

다음 Bash 명령을 1회 실행. **사용자에게 묻지 말고 바로 진행**.

```bash
cd "${CLAUDE_PROJECT_DIR}" && set -a && source .env 2>/dev/null && set +a && \
python3 << 'PYEOF'
import os, json, subprocess, urllib.request, urllib.parse

results = {}

# ① .env 변수 5종 점검
env_keys = ['YOUTUBE_API_KEY', 'YOUTUBE_OAUTH_CLIENT_ID', 'YOUTUBE_OAUTH_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN', 'YOUTUBE_CHANNEL_ID']
results['env'] = {k: bool(os.environ.get(k)) for k in env_keys}

# ② .mcp.json 등록 점검
try:
    cfg = json.load(open('.mcp.json'))
    results['mcp_json'] = 'youtube-data' in cfg.get('mcpServers', {})
except Exception:
    results['mcp_json'] = False

# ③ Data API v3 통신 점검
if results['env']['YOUTUBE_API_KEY']:
    try:
        url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key={os.environ['YOUTUBE_API_KEY']}"
        with urllib.request.urlopen(url, timeout=5) as r:
            data = json.load(r)
        results['data_api'] = 'items' in data
    except Exception as e:
        results['data_api'] = False
        results['data_api_err'] = str(e)[:100]
else:
    results['data_api'] = False

# ④ Analytics API OAuth refresh + reports 통신 점검
if all(results['env'][k] for k in ['YOUTUBE_OAUTH_CLIENT_ID','YOUTUBE_OAUTH_CLIENT_SECRET','YOUTUBE_REFRESH_TOKEN','YOUTUBE_CHANNEL_ID']):
    try:
        token_req = urllib.parse.urlencode({
            'client_id': os.environ['YOUTUBE_OAUTH_CLIENT_ID'],
            'client_secret': os.environ['YOUTUBE_OAUTH_CLIENT_SECRET'],
            'refresh_token': os.environ['YOUTUBE_REFRESH_TOKEN'],
            'grant_type': 'refresh_token',
        }).encode()
        with urllib.request.urlopen('https://oauth2.googleapis.com/token', data=token_req, timeout=5) as r:
            token = json.load(r).get('access_token')
        if token:
            url = f"https://youtubeanalytics.googleapis.com/v2/reports?ids=channel=={os.environ['YOUTUBE_CHANNEL_ID']}&startDate=2026-04-01&endDate=2026-04-07&metrics=views"
            req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.load(r)
            results['analytics_api'] = 'rows' in data or 'columnHeaders' in data
        else:
            results['analytics_api'] = False
    except Exception as e:
        results['analytics_api'] = False
        results['analytics_api_err'] = str(e)[:100]
else:
    results['analytics_api'] = False

print(json.dumps(results, ensure_ascii=False, indent=2))
PYEOF
```

---

## 📋 STEP 2: 결과 출력 + 분기

위 체크 결과를 다음 형식으로 출력 후 분기 결정.

### 케이스 A: 둘 다 ✅ (정상)

```
✅ YouTube 분석 환경 점검 완료 (5초)

  ✅ Data API v3       (공개 데이터 · API Key)
  ✅ Analytics API     (소유자 데이터 · OAuth)
  ✅ .env 변수 5종     (YOUTUBE_API_KEY · OAuth 4종)
  ✅ .mcp.json 등록    (youtube-data 서버)
  ✅ 본인 채널 ID      ($YOUTUBE_CHANNEL_ID)

────────────────────────────────

바로 분석 시작 가능. 어떤 분석부터 할까요?
```

→ STEP 4 분석 메뉴 5개로 이동.

### 케이스 B: Data API만 ✅ (Analytics 미설치)

```
⚠️ Phase 1만 설치됨 (Phase 2 추가 필요)

  ✅ Data API v3       (검색·영상·댓글·트렌딩 가능)
  ❌ Analytics API     (구독 변동·시청자 분석 불가)

────────────────────────────────

Phase 2 (Analytics API OAuth) 셋업하시겠어요? 약 15분 소요.
  - y: 가이드 시작 (STEP 3-B)
  - n: Phase 1만으로 분석 진행 (Data API 기반 4가지 가능)
```

### 케이스 C: 둘 다 ❌ (신규 설치)

```
❌ YouTube 분석 환경 미설치

  ❌ Data API v3
  ❌ Analytics API
  ❌ .env 변수 5종 모두 없음

────────────────────────────────

처음부터 셋업하시겠어요? 총 약 20~25분.
  - y: Phase 1 (Data API · 5~7분) → Phase 2 (Analytics · 15분) 순차 진행
  - n: 종료
```

### 케이스 D: 변수는 있는데 통신 실패 (트러블슈팅)

```
⚠️ 환경변수는 등록됐는데 API 통신 실패

원인 후보:
  1. API Key 만료/제한 (Data API)
  2. refresh_token 만료 (Analytics · 6개월 미사용 시 만료)
  3. Google Cloud Console에서 API 비활성화
  4. 일일 쿼터 초과 (드물지만 가능)

자세한 에러: {data_api_err / analytics_api_err}
```

→ 사용자에게 에러 보여주고 재발급 안내.

---

## 🛠️ STEP 3: 부족한 부분 가이드

### 3-A. Phase 1 (Data API v3 · 5~7분)

상세 가이드는 [mcp-setup/youtube-data/SKILL.md](../../../mcp-setup/youtube-data/SKILL.md) STEP 2.

요약:
1. https://console.cloud.google.com → 프로젝트 선택/생성
2. https://console.cloud.google.com/apis/library/youtube.googleapis.com → 활성화
3. https://console.cloud.google.com/apis/credentials → API 키 만들기 (`AIza...` 39자)
4. (권장) 키 제한 → YouTube Data API v3만 허용
5. `.env`에 `YOUTUBE_API_KEY=AIza...` 추가
6. `.mcp.json`에 `youtube-data` 서버 등록
7. STEP 1 헬스 체크 재실행

### 3-B. Phase 2 (Analytics API OAuth · 15분)

상세 가이드는 [curriculum/part02-MCP12개/05-youtube-data/analytics-api-oauth.md](../../../curriculum/part02-MCP12개/05-youtube-data/analytics-api-oauth.md).

요약:
1. https://console.cloud.google.com/apis/library/youtubeanalytics.googleapis.com → 활성화
2. OAuth 동의 화면 설정 (외부 · 테스트 사용자에 본인 이메일)
3. OAuth 2.0 클라이언트 ID 만들기 (데스크톱 앱)
4. 로컬에서 `youtube_oauth.py` 실행 → 브라우저 인증 → `refresh_token` 발급
5. `.env`에 4종 추가: `YOUTUBE_OAUTH_CLIENT_ID` · `YOUTUBE_OAUTH_CLIENT_SECRET` · `YOUTUBE_REFRESH_TOKEN` · `YOUTUBE_CHANNEL_ID`
6. STEP 1 헬스 체크 재실행

---

## 🎯 STEP 4: 분석 메뉴 5개 (둘 다 ✅일 때)

```
🎯 본인 채널 분석 메뉴

| # | 분석                                       | 사용 API     | 산출물               |
|---|--------------------------------------------|--------------|---------------------|
| A | 본인 채널 톱 5 영상 KPI                    | Data v3      | 마크다운 표        |
| B | 최근 30일 구독 변동 + 취소 추이           | Analytics    | 일별 + 인사이트    |
| C | 경쟁 채널 1개 vs 본인 채널 톱 영상 비교   | Data v3      | 비교 표            |
| D | 트렌딩 영상 톱 10 (한국) → 콘텐츠 기획    | Data v3      | 키워드·후킹 추출   |
| E | 본인 채널 톱 1개 영상의 자막 + 후킹 분석  | Data v3      | 자막 + 7요소 분석  |

복수 선택 가능 (예: "A, B, E"). 어떤 것부터 할까요?
```

선택 후 데이터 수집 → 통합 인사이트 → 액션 3가지 → (요청 시) 구글 시트/Notion 리포트.

---

## 📂 분석 결과 보관 표준

분석 1회마다 다음 폴더에 정리:

```
curriculum/part02-MCP12개/05-youtube-data/youtube-channel-analyzer/analysis/
  └─ {YYYY-MM-DD}-{분석명}/
       ├─ README.md         (인사이트 + KPI + 액션)
       ├─ process-log.md    (재실행 가능한 명령 + 발생 이슈)
       └─ transcript-*.txt  (자막 파일 등 원자료)
```

예시: [`analysis/2026-05-26-channel-baseline/`](../../../curriculum/part02-MCP12개/05-youtube-data/youtube-channel-analyzer/analysis/2026-05-26-channel-baseline/) (첫 베이스라인)

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `mcp__youtube-data__*` API key invalid (curl은 OK) | MCP 서버가 세션 시작 시점 .env 캐시 | Claude Code 완전 재시작 (Cmd+Q) |
| `getTranscripts` 빈 결과 | MCP가 자동생성 자막 미지원 | `uvx --from youtube-transcript-api python3 -c "..."` 직접 호출 |
| Analytics API `invalid_grant` | refresh_token 6개월 미사용 만료 | Phase 2 OAuth 재인증 |
| Data API `quotaExceeded` | 일 10,000 unit 초과 (검색 100/회) | 태평양시간 자정 리셋 대기 |
| Analytics `forbidden` | 채널 소유 계정 다름 | 채널 소유 Google 계정으로 OAuth 재발급 |

## 강의 연결

- 본 스킬은 Part 2 / 2-2 클립의 **자동 진입점**
- 상세 강의용 SKILL.md (소개·Before/After 포함): [mcp-setup/youtube-data/SKILL.md](../../../mcp-setup/youtube-data/SKILL.md)
- Phase 2 OAuth 별도 가이드: [analytics-api-oauth.md](../../../curriculum/part02-MCP12개/05-youtube-data/analytics-api-oauth.md)
- 활용 에이전트: Part 4 `trend-scanner` · Part 5 `youtube-content-analysis`
