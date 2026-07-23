---
name: mcp설치-네이버
description: |
  네이버 2개 API 세계(검색광고 SearchAd + 데이터랩 DataLab)를 설치·검증·활용하는 5단계 파이프라인.
  마케터(비개발자) 기준 인터랙티브 진행. 공식 MCP가 없는 SearchAd는 REST 서명 호출, DataLab은 npm MCP로 연결.
  산출물 2종: (1) 시장 수요 리포트 · 검색량+트렌드 교차검증, (2) 광고 성과 리포트 · 브랜드/일반 ROAS 분리(CSV import). 둘 다 HTML + Discord webhook 발송.

  자동 호출 트리거:
  - **"네이버 광고 API 설치하자"** ⭐
  - **"네이버 검색광고 연동"** / "SearchAd 연동" / "네이버 데이터랩 설치"
  - "네이버 시장 리포트 만들자" / "네이버 키워드 검색량 뽑아줘"
  - "네이버 ROAS 분석" / "브랜드 일반 분리" / "네이버 광고 보고서 분석"
  - "네이버 MCP 설치"

  5단계: ① 설치 → ② 사용 가능한 기능 → ③ 활용법 → ④ 리포트 추출 → ⑤ Discord 발송
  ⛔ 자동 발송 금지: ⑤ webhook 발송은 사용자 승인 게이트 필수 (marketing-os 헌법).
---

# 네이버 API 설치·활용 파이프라인 (5단계)

> ⚠️ **핵심 구분**: 네이버는 **완전히 다른 두 API 세계**가 있다. 혼동 금지.
> - **A. 검색광고 (SearchAd)** = 광고비·ROAS·키워드 검색량·입찰가 → `manage.searchad.naver.com`
> - **B. 데이터랩 (DataLab)** = 검색 트렌드(시계열·성별·연령)·쇼핑인사이트 → `developers.naver.com`
> gpters 글의 `naver-search-mcp`(블로그/뉴스 검색)는 또 다른 B세계 도구로, 광고 분석엔 불필요.

---

## ① 설치

### A. 검색광고 SearchAd (공식 MCP 없음 → REST 서명 호출)

1. https://manage.searchad.naver.com 로그인
2. **도구 → API 사용 관리** → 3개 발급:
   - `API_KEY` (액세스 라이선스, 긴 값)
   - `SECRET_KEY` (비밀키, `AQAA...==` 형태)
   - `CUSTOMER_ID` (계정 번호, 숫자)
3. `.env`에 등록:
   ```
   NAVER_SEARCHAD_API_KEY=...
   NAVER_SEARCHAD_SECRET_KEY=...
   NAVER_SEARCHAD_CUSTOMER_ID=...
   ```
4. **인증 방식**: HMAC-SHA256. 서명 = `Base64(HMAC(SECRET, "{ms타임스탬프}.{METHOD}.{path}"))`,
   헤더 `X-Timestamp · X-API-KEY · X-Customer · X-Signature`, base URL `https://api.searchad.naver.com`.
   → 구현체 `scripts/naver_searchad.py` (의존성 0, urllib만). 별도 설치 불필요.
5. **검증**: `python3 scripts/naver_searchad.py GET /ncc/campaigns`
   → `HTTP 200` 이면 성공 (빈 `[]`는 광고 미집행 계정, 인증은 정상).

### B. 데이터랩 DataLab (npm MCP)

1. https://developers.naver.com 로그인 → **Application → 애플리케이션 등록**
2. 입력:
   - 애플리케이션 이름: 자유 (예: `craftvolt-datalab`)
   - **사용 API**: `데이터랩(검색어트렌드)` + `데이터랩(쇼핑인사이트)` 둘 다 ✅
   - 환경 추가: `WEB 설정`, 서비스 URL `https://claude.ai`
3. 발급된 **Client ID(긴 값) / Client Secret(짧은 값)** 을 `.env`에:
   ```
   NAVER_CLIENT_ID=...      # 긴 쪽
   NAVER_CLIENT_SECRET=...  # 짧은 쪽
   ```
   ⚠️ **순서 주의**: 보통 ID가 길고 Secret이 짧다. 401 인증 실패 시 두 값을 뒤집어 보라.
4. `.mcp.json`에 등록 (이미 추가됨):
   ```json
   "naver-datalab": {
     "command": "bash",
     "args": ["-c", "set -a; source '<프로젝트>/.env'; set +a; exec npx -y naver-datalab-mcp-server"]
   }
   ```
   → Claude Code 재시작 시 도구 자동 노출. (직접 호출은 재시작 없이도 가능)
5. **검증** (재시작 없이): `POST https://openapi.naver.com/v1/datalab/search`,
   헤더 `X-Naver-Client-Id · X-Naver-Client-Secret`. → `HTTP 200` 이면 성공.

---

## ①-V 연동 점검 (실행 전 health check · 한 번에)

설치 후 / 실습·리포트 실행 전 항상 먼저 돌린다. 5개 키 + 2개 API 인증 + MCP 등록 + webhook 을 한 번에 검증.

```bash
cd <프로젝트>
echo "① .env 키"; grep -oE '^NAVER_[A-Z_]+=' .env | sed 's/=$//'
grep -q '^DISCORD_WEBHOOK_URL=' .env && echo "  DISCORD_WEBHOOK_URL ✅" || echo "  ❌"
echo "② SearchAd 인증"; python3 scripts/naver_searchad.py GET /ncc/campaigns | head -1   # HTTP 200 = OK
echo "③ DataLab 인증"; python3 - <<'PY'
import json,urllib.request,urllib.error
e={l.split('=',1)[0].strip():l.split('=',1)[1].strip() for l in open(".env",encoding="utf-8") if "=" in l and not l.startswith("#")}
b={"startDate":"2026-05-01","endDate":"2026-05-31","timeUnit":"month","keywordGroups":[{"groupName":"t","keywords":["전기톱"]}]}
r=urllib.request.Request("https://openapi.naver.com/v1/datalab/search",data=json.dumps(b).encode(),method="POST")
r.add_header("X-Naver-Client-Id",e.get("NAVER_CLIENT_ID","")); r.add_header("X-Naver-Client-Secret",e.get("NAVER_CLIENT_SECRET","")); r.add_header("Content-Type","application/json")
try: urllib.request.urlopen(r,timeout=20); print("  HTTP 200 ✅")
except urllib.error.HTTPError as x: print("  ❌",x.code,x.read().decode()[:60])
PY
echo "④ MCP 등록"; grep -q '"naver-datalab"' .mcp.json && echo "  ✅" || echo "  ❌"
```

판정 기준:
| 항목 | 정상 | 실패 시 |
|---|---|---|
| ② SearchAd | `HTTP 200` (빈 `[]`도 정상=광고 미집행) | 401 → SearchAd 3키 재확인 |
| ③ DataLab | `HTTP 200 ✅` | 401 → Client ID/Secret **순서 뒤집기** |
| ④ MCP | `✅` | `.mcp.json`에 `naver-datalab` 추가 |

→ ②③ 모두 200이면 **연동 정상, 실행 진행**. 하나라도 실패면 ① 설치의 해당 항목으로 복귀.

---

## ② 사용 가능한 기능

| 세계 | 엔드포인트 / 도구 | 주는 것 | 광고 없어도? |
|---|---|---|---|
| A | `/keywordstool` | 연관어 + **월 검색량(PC/모바일)** + 경쟁도 | ✅ 가능 |
| A | `/estimate/*` | 예상 입찰가 · 예상 노출/클릭/비용 | ✅ 가능 |
| A | `/stats` | 광고 성과(노출·클릭·비용·전환·ROAS) | ⚠️ **최근 92일만** |
| A | `/ncc/*` | 캠페인·그룹·키워드 구조 (쓰기=승인 게이트) | · |
| A | `/billing/bizmoney` | 잔액·충전이력 | ✅ |
| B | 검색어 트렌드 | 시계열·성별·연령·디바이스 상대지수 | ✅ |
| B | 쇼핑인사이트 | 분야별·키워드별 쇼핑 트렌드 | ✅ |

> 🧱 **92일 벽**: SearchAd `/stats`는 최근 92일만. 그 이전 과거 성과는 API로 복원 불가
> → 광고주센터 웹 **「대용량 다운로드 보고서」** 로만 (보고서 → 대용량 다운로드 보고서 → 기간 지정 → CSV).

---

## ③ 활용법 · 검색광고 분석 → 데이터랩 교차검증 (핵심)

> 단순 병렬 표시가 아니라 **두 소스를 교차검증**한다: SearchAd 검색량(수요 크기)을 DataLab 트렌드(추세)로 검증해 '진짜 공략할 키워드'를 가려낸다.

```
[A. 검색광고 데이터 추출]
  시드 키워드 (예: 전기톱, 전동가위)
   → /keywordstool 연관어 확장 (수백 개)
   → 관련성 필터 (제품군 토큰: 톱·가위·전동·전지·충전·예초·공구 …) ← 노이즈 제거 필수
   → 월 검색량 기준 정렬 → TOP N
        ↓
[B. 데이터랩 교차검증]
  TOP5 키워드 각각을 DataLab 검색트렌드로 조회
   → 모멘텀 = (최근 3개월 평균) vs (직전 3개월 평균) 변화율
   → 판정:
        검색량 大 + 모멘텀 +12%↑  = ✅ 검증된 수요 (최우선 공략)
        검색량 大 + 모멘텀 -12%↓  = ⚠️ 정점 지난 수요 (입찰 보수적)
        그 외                      = 🟢 안정 수요
   → 성수기 월 = 검증 키워드들의 최빈 peak
        ↓
[C. 검증된 인사이트]
  ✅ 검증 통과 키워드 + 성수기 + 광고 ON/OFF 대조 → 기회손실 진단
```

핵심 원칙:
- **검색량 1위 ≠ 추천.** 반드시 DataLab 트렌드로 상승세를 확인한 키워드만 '검증된 수요'로 추천.
- **연관어 확장은 반드시 관련성 필터링.** 안 하면 'NC·무선이어폰' 같은 고검색량 무관어가 1위로 올라옴.
- **모바일/PC 비율** 확인 → 전동공구는 보통 모바일이 3~6배 → 모바일 우선.
- **계절성**: 전동공구는 가을(9~12월)·예초류는 초여름 성수기. 비수기에 광고 켜는 건 비효율.

---

## ④ 리포트 추출 (검색광고 데이터 추출 → 작성)

두 가지 입력 경로가 있다:

**경로 1 · 시장 수요 리포트 (검색량 + 트렌드, 광고 없어도 가능)**
```bash
python3 scripts/naver_market_report.py                      # 수집+검증+HTML (발송 안 함)
python3 scripts/naver_market_report.py --seeds 전기톱,전동가위 --date 2026-06-19
```

**경로 2 · 내 광고 성과 리포트 (브랜드 vs 일반 ROAS 분리, 6-3 핵심)**

CSV 임포터 `scripts/naver_ad_report.py` 사용. 인코딩·구분자·컬럼명 자동 감지.
```bash
# 실습(데모) = 샘플 데이터 (결로아 픽스처 → 합산 154% / 브랜드 741% / 일반 71%)
python3 scripts/naver_ad_report.py sample-data/naver-ads-sample-report.csv --brand 결로아
# 실전 = 본인 다운로드 CSV (광고주센터 → 보고서 → 대용량 다운로드 보고서)
python3 scripts/naver_ad_report.py <본인보고서.csv> --brand 크래프트볼트,craftvolt
```
> 📌 **실습 때는 샘플 데이터로 진행** (실계정 수치 비노출 + 재현성). 실전은 본인 CSV import.

**경로 2-live · 광고 집행 중일 때 (API 직접, stats)**
```
[검색광고 데이터 추출 과정]
  GET /ncc/campaigns                → 내 캠페인 목록
   → GET /ncc/adgroups?nccCampaignId=… → 광고그룹
   → GET /ncc/keywords?nccAdgroupId=…  → 키워드
   → GET /stats (id=…, fields=[impCnt,clkCnt,salesAmt,ccnt,convAmt], timeRange) → 성과
  [리포트 작성]
   → 브랜드 vs 일반 키워드 분리 (자사명 포함 여부)
   → 그룹별 ROAS 집계 + 합산 착시 해부 (6-3 핵심)
   → 키워드별 광고비·전환·ROAS 표 + 적자 키워드 진단
```
⚠️ **92일 벽**: `/stats`는 최근 92일만. 광고가 OFF면 0건 → 그땐 광고주센터 웹
**「보고서 → 대용량 다운로드 보고서」** 로 과거 CSV를 받아 import 한다.

산출: `outputs/{날짜}/naver-market/craftvolt-naver-report-{날짜}.html`
- KPI 카드 (키워드 수·총검색량·성수기·광고상태/ROAS)
- 검색광고 키워드 검색량 TOP 15 (PC/모바일/합계/경쟁)
- 데이터랩 검색 트렌드 12개월 바 차트
- **SearchAd ↔ DataLab 교차검증 표** (검색량×모멘텀→판정)
- (경로 2) 내 광고 성과: 브랜드/일반 ROAS 분리 + 적자 진단
- 검증된 인사이트 & 액션
- 단일 HTML · 다크 테마 · 인라인 스타일 (html-report-template 표준 정렬)

---

## ⑤ Discord 발송 (⛔ 승인 게이트)

```bash
python3 scripts/naver_market_report.py --send                              # .env 메인 채널로
python3 scripts/naver_market_report.py --send --webhook <URL>              # 특정 webhook으로
python3 scripts/naver_ad_report.py <csv> --brand 결로아 --send --webhook <URL>  # ROAS 리포트 발송
```

- `--send` 없으면 **미리보기만** (발송될 embed 요약을 콘솔에 출력).
- `--send` 있으면 embed POST. `--webhook`으로 `.env` 기본값 대신 특정 채널 지정 가능.
- embed 내용: (시장) 검색량 TOP3·성수기·광고상태·인사이트 / (ROAS) 합산·브랜드·일반 ROAS.
- 발송 성공 = **HTTP 204**.
- **헌법 준수**: 외부 발행이므로 첫 발송은 반드시 사용자에게 확인받은 뒤 `--send` 실행.

---

## 진행 흐름 (인터랙티브)

```
1. ①-V 연동 점검 health-check 먼저 실행 (키 5종 + SearchAd/DataLab 인증 200 + MCP + webhook) → 실패분만 ① 설치로 안내
2. ② 사용 가능 기능 메뉴 제시
3. ③ 시드 키워드 입력 받기 (기본: craftvolt 전동공구군)
4. ④ 리포트 생성 → 경로 안내 + 미리보기
5. ⑤ "디스코드로 보낼까요?" ⏸ 승인 → --send
```

각 단계마다 사용자 답을 받은 뒤 다음으로. 자동 실행·자동 발송 금지.

## 함정·디버깅 메모 (실전에서 부딪힌 것)

| 증상 | 원인 | 해결 |
|---|---|---|
| DataLab **401** 인증 실패 | Client ID/Secret **순서 바뀜** | ID=긴 값, Secret=짧은 값. 뒤집어 재시도 |
| Discord **403 / 에러 1010** | Cloudflare가 기본 `python-urllib` UA 봇 차단 | 요청에 **User-Agent 헤더** 추가 (스크립트 반영됨) |
| 키워드 1위가 'NC·무선이어폰' | 연관어 확장이 과도하게 넓음 | **관련성 필터**(제품군 토큰)로 무관어 제거 |
| `/stats` 과거 데이터 0 | **92일 벽** + 광고 OFF(노출 0) | 웹 「대용량 다운로드 보고서」 CSV → `naver_ad_report.py` import |
| 브랜드/일반 분리 안 맞음 | **쇼핑검색**은 키워드광고 아님(상품 기반) | 브랜드/일반 분리는 **파워링크(검색광고)** 기준. 쇼핑은 광고그룹(상품군)별 집계 |
| `SECRET_KEY` 노출 우려 | `.env`는 git 제외되나 채팅 노출 시 | 노출됐으면 **재발급** 권장 |

## 관련 자산
- `scripts/naver_searchad.py` · SearchAd REST 서명 호출기(HMAC, 의존성 0)
- `scripts/naver_market_report.py` · 시장 리포트 5단계 오케스트레이터(검색량+트렌드 교차검증)
- `scripts/naver_ad_report.py` · 광고 성과 CSV → 브랜드/일반 ROAS 분리 리포트(컬럼 자동 감지)
- `sample-data/naver-ads-sample-report.csv` · 실습용 샘플(결로아 → 합산154/브랜드741/일반71%)
- `agents/part6-ads/naver-ads-analyzer.md` · 6-3 분석 에이전트
- 메모리 `naver-api-integration.md` · 2세계 구분·92일 한계·craftvolt 계정 사실
