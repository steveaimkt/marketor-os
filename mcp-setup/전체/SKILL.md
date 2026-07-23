---
name: mcp설치-전체
description: |
  marketing-os 의 12개 MCP 를 한 번 호출로 강의 진행 순서대로 순차 자동 설치하는 마스터 스킬. 12개를 11개 설치 스텝으로 진행(Step 7 영상 트리오 = 도구 3개 묶음, Step 9 광고 = Meta+Google 2개). 사용자는 키 발급·OAuth 클릭만 하고 Claude 에게 던지면 .env 자동 등록 + 헬스 체크 + 진행률 추적까지 자동. 총 사용자 작업 약 71분 (Google Ads 1~2일 승인 대기 별도).

  3가지 모드: A 실제 설치(미설치만) · B 교육 시연(이미 다 깔려 있어도 12개 전 과정 설명·검증, 비파괴) · C 점검만. 호출 즉시 모드부터 질문.

  자동 호출 트리거:
  - **"MCP 전체 설치하자"** ⭐ 주요 트리거
  - "MCP 12개 한 번에 설치"
  - "marketing-os 전체 환경 셋업"
  - "Part 2 전체 설치 시작"
  - "모든 MCP 셋업"
  - **"MCP 설치 전 과정 보여줘"** ⭐ (→ B 교육 시연 모드)
  - "MCP 설치 시연" / "MCP 설치 강의 녹화" / "MCP 전체 복습" / "다 깔려 있는데 설치 과정 설명해줘"

  진행 순서 (강의 클립 1-2 → 4-2 순서, ✋ 사용자 작업 · 🤖 자동):
  ✋ Step 1  Google Sheets    (10분)  · OAuth credentials              · 1-2
  ✋ Step 2  GA4              (15분)  · Service Account + 권한          · 1-3
  ✋ Step 3  Firecrawl         (2분)  · API key                         · 1-4
  ✋ Step 4  Figma             (1분)  · Claude.ai 통합 1클릭           · 2-1
  ✋ Step 5  YouTube Data      (5분)  · API key                         · 2-2
  ✋ Step 6  Higgsfield        (1분)  · Claude.ai 통합 1클릭           · 2-3
  ✋ Step 7  영상 트리오       (15분)  · Hyperframes + HeyGen + ElevenLabs · 2-4
  ✋ Step 8  Buffer            (5분)  · Access Token                    · 3-1
  ✋ Step 9  Meta + Google Ads (6분 + 1~2일 대기) · hosted + Developer Token · 3-2
  ✋ Step 10 Notion            (1분)  · Claude.ai 통합 1클릭           · 4-1
  ✋ Step 11 Discord          (10분)  · Bot Token + 서버 초대          · 4-2

  특이점: 어느 단계에서 중단해도 재호출 시 마지막 위치부터 재개. 발급 어려운 순서는 뒤로 미루기 가능.
---

# /mcp설치-전체 · 마스터 설치 스킬

> 한 번 호출로 12개 MCP 를 **강의 진행 순서**대로 순차 자동 설치. 사용자는 각 사이트에서 키 발급 또는 Claude.ai 클릭만 하고 Claude 에게 던지면 끝.
> (12개 = 11개 설치 스텝 · Step 9 광고가 Meta+Google 2개. 영상제작 Step 7 은 도구 3개 묶음.)

## 🧭 0단계 · 운영 모드 선택 (호출 즉시 가장 먼저 질문)

> ⚠️ **중요**: 본 스킬은 사용자가 이미 12개를 다 설치해 둔 상태에서도 자주 호출됩니다 (강의 녹화·복습).
> 그래서 **무엇을 스킵할지부터 정하지 말고**, 먼저 "어떤 모드로 진행할지"를 묻습니다.

호출되면 Claude 는 **사전 점검·시작 멘트보다 먼저** 다음을 출력:

```
🚀 marketing-os MCP 통합 설치 스킬입니다. 먼저 진행 모드를 골라주세요.

  A. 실제 설치 모드 (기본)
     - 아직 설치 안 된 MCP 만 골라 설치. 완료된 건 자동 스킵.
     - 처음 환경 셋업하는 분에게.

  B. 교육 시연 모드 ⭐ (전체 과정 설명) — "이미 다 깔려 있어도 전 과정을 보여줘"
     - 12개 MCP 를 강의 순서대로 하나도 빠짐없이 1개씩 설명·시연.
     - 이미 설치돼 있어도 스킵하지 않음. 발급 절차 + 설치 명령 + 검증을 전부 보여줌.
     - 비파괴: 기존 .env / .mcp.json / 인증을 덮어쓰지 않음 (명령은 "이렇게 했다"로 제시).
     - 각 단계 끝에는 실제 읽기전용 헬스체크 1개를 돌려 "지금 작동 중"임을 결과로 증명.

  C. 점검(헬스체크)만
     - 12개 현재 상태만 빠르게 표로 출력하고 종료.

어떤 모드로 할까요? (A / B / C)
```

### 모드별 분기

- **A 실제 설치** → 아래 `## 🔍 자동 사전 점검` 실행 → 완료 Step 자동 스킵 → 미완료만 안내 (기존 동작).
- **B 교육 시연** → `## 🎓 교육 시연 모드 동작 규칙` 으로 진행 (**스킵 금지**).
- **C 점검만** → `## 🛠️ 일괄 헬스 체크` 만 실행 후 종료.

> 사용자가 "전체 과정 보여줘 / 다 설명해줘 / 강의 녹화 / 시연 / 복습" 등으로 호출하면 **B 교육 시연 모드**로 간주하고 위 질문 없이 바로 B 로 진입해도 됨.

---

## 🎓 교육 시연 모드 동작 규칙 (B 모드)

> **목적**: 이미 12개가 다 설치된 PC 에서도, **설치하는 모든 과정을 처음부터 끝까지** 화면에 보여준다 (강의 녹화용).

핵심 원칙 4가지:

1. **스킵 금지** — `.env` 에 키가 이미 있거나 `claude mcp list` 가 Connected 여도 **건너뛰지 않는다**. 12개 전부 1개씩 진행.
2. **비파괴(read-only)** — 기존 키·인증을 덮어쓰지 않는다. `.env` 수정·`mv`·`npm install` 같은 변경 명령은 **"설치 시에는 이렇게 합니다"** 라고 코드블록으로 *보여주기만* 하고 실제 실행하지 않는다. 실제로 실행하는 건 **읽기 전용 검증 명령**뿐.
3. **각 단계 4토막 고정 포맷**으로 설명한다:
   ```
   [N/12] {MCP 이름}  · [클립 X-Y] · 패턴 {A/B/C}

   ① 무엇·왜       — 이 MCP 가 마케터에게 뭘 해주나 (1~2줄)
   ② 발급 절차     — 사이트·클릭 순서 (설치 안 된 사람이 따라할 수 있게 전부)
   ③ 설치 방법     — .env 등록 / claude mcp add / Claude.ai Connect 중 무엇인지 + 정확한 명령
   ④ 작동 증명     — 지금 이 PC 에서 읽기전용 헬스체크 1개 실행 → 결과로 "이미 작동 중" 확인
   ```
   → 설치 안 된 학습자는 ②③ 을 따라하면 되고, 이미 설치한 사용자는 ④ 로 "내 환경에서 진짜 된다"를 확인.
4. **현재 상태를 숨기지 않는다** — ④ 에서 이미 Connected 면 "이미 설치돼 있어 바로 검증됩니다 ✅", 안 돼 있으면 "여기서 ③ 을 실제 실행하면 됩니다" 로 안내.

12개 순서(=가이드 문서와 동일): ① Sheets → ② GA4 → ③ Firecrawl → ④ Figma → ⑤ YouTube → ⑥ Higgsfield → ⑦ 영상제작(Hyperframes+HeyGen+ElevenLabs) → ⑧ Buffer → ⑨ Meta Ads → ⑩ Google Ads → ⑪ Notion → ⑫ Discord.

각 단계 ④ 작동 증명용 **읽기 전용** 헬스체크 예 (실제 실행 OK):

```
① Sheets     : google-sheets 로 내 스프레드시트 목록 1개만 읽어줘 (get_spreadsheet_info)
② GA4        : ga4 로 지난 7일 활성 사용자 수
③ Firecrawl  : firecrawl 로 example.com 스크랩 (1페이지)
④ Figma      : TalkToFigma get_document_info  (또는 claude.ai Figma 연결 확인)
⑤ YouTube    : youtube-data 로 영상 1건 검색
⑥ Higgsfield : higgsfield 크레딧 잔액 조회
⑦ 영상제작   : hyperframes --version · elevenlabs 음성 모델 목록 · heygen 크레딧 조회
⑧ Buffer     : buffer 연결 채널 목록
⑨ Meta Ads   : 내 Meta 광고 계정 목록
⑩ Google Ads : google-ads list_accessible_customers
⑪ Notion     : notion 워크스페이스 검색
⑫ Discord    : claude mcp list | grep discord (또는 폰 DM 왕복 1회)
```

> 변경(쓰기) 도구는 시연에서 호출하지 않는다. 새 시트 생성·예약 발행·페이지 생성 등은 "설치 후 `start` 스킬에서"로 미룬다.

진행 끝에는 `## 🛠️ 일괄 헬스 체크` 표 1장으로 마무리 + "12개 모두 작동 확인" 선언.

---

## 🎬 스킬 시작 시 메시지 (A 실제 설치 모드 진입 시)

A 모드를 고른 뒤 Claude 는 다음과 같이 시작 멘트를 출력:

```
🚀 marketing-os MCP 전체 설치를 시작합니다.

먼저 짚고 갈 게 한 가지 있어요:

  본 스킬은 12개 MCP 를 강의 진행 순서 (1-2 → 4-2) 대로 셋업합니다.

  사용자 작업: 각 사이트에서 키 발급 + Claude.ai 클릭 + Claude 에게 붙여넣기
  Claude 작업: .env 자동 등록 + .mcp.json 검증 + 헬스 체크 + 진행률 추적

────────────────────────────────

총 11단계(=12개 MCP · Step 9 가 Meta+Google 2개)로 진행돼요 (사용자 작업 약 71분, Google Ads 1~2일 대기 별도):

  Ch 1. 데이터 분석 3개
  ✋ Step 1  Google Sheets    (10분)  OAuth credentials              [1-2]
  ✋ Step 2  GA4              (15분)  Service Account + 권한          [1-3]
  ✋ Step 3  Firecrawl         (2분)  API key                         [1-4]

  Ch 2. 콘텐츠·영상·디자인 4개
  ✋ Step 4  Figma             (1분)  Claude.ai 통합 1클릭           [2-1]
  ✋ Step 5  YouTube Data      (5분)  API key                         [2-2]
  ✋ Step 6  Higgsfield        (1분)  Claude.ai 통합 1클릭           [2-3]
  ✋ Step 7  영상 트리오       (15분)  Hyperframes+HeyGen+ElevenLabs  [2-4]

  Ch 3. 배포와 광고 2개
  ✋ Step 8  Buffer            (5분)  Access Token                    [3-1]
  ✋ Step 9  Meta + Google Ads (6분+대기) hosted + Developer Token   [3-2]

  Ch 4. 협업과 관리 2개
  ✋ Step 10 Notion            (1분)  Claude.ai 통합 1클릭           [4-1]
  ✋ Step 11 Discord          (10분)  Bot Token + 서버 초대          [4-2]

⚡ 빠른 설치를 위한 사전 준비 확인:

먼저 `curriculum/part02-MCP12개/00-사전준비물.md` 의 체크리스트를 완료하셨나요?
사전 준비 완료 시 본 영상 안의 설치 작업은 약 30~40분.
미완료 시 약 71~90분 (사이트 이동·대기 포함).

사전 준비물 핵심 (영상 시작 전 책상 옆에 정리):
  [환경]
  □ Node 22+ · Python 3.10+ · uv · ffmpeg · Chrome · Claude Code
  □ marketing-os 깃 클론 + .env 파일 생성
  □ Claude.ai 웹사이트 로그인 상태

  [파일 2개]
  □ oauth_credentials.json    (Step 1 Google Sheets)
  □ marketing-os-*.json       (Step 2 GA4 Service Account)

  [메모장에 적어둘 키 8개]
  □ GA4 속성 ID · FIRECRAWL_API_KEY · YOUTUBE_API_KEY
  □ HEYGEN_API_KEY · ELEVENLABS_API_KEY · BUFFER_ACCESS_TOKEN
  □ GOOGLE_ADS_DEVELOPER_TOKEN (1~2일 전 신청 필수)
  □ DISCORD_BOT_TOKEN + DISCORD_CHANNEL_ID

  [Claude.ai 통합 3개]
  □ Figma · Higgsfield · Notion (영상 안에서 클릭 1번씩)

사전 준비 상태:
  · 완료 → "준비 완료" 입력 → 빠른 설치 모드 (30~40분)
  · 일부만 → "일부 완료" 입력 → 미준비 항목 함께 발급 (60~90분)
  · 미완료 → 00-사전준비물.md 먼저 확인 권장

전체 진행할까요? 아니면 일부만? (준비 완료 / 일부 완료 / 일부 Step 번호 / n)
```

### 사용자 선택지

- `준비 완료` → **빠른 설치 모드** · 사전 준비물 다 받아둔 상태로 가정 → 키 붙여넣기 + 자동화만 (30~40분)
- `일부 완료` → 미준비 항목 자동 감지 후 발급부터 함께 진행 (60~90분)
- `y` → Step 1 부터 11까지 전체 순차 (사전 준비 묻지 않음)
- `1,2,3` 같은 번호 → 해당 Step 만 진행
- `Ch1` 또는 `Ch2` 등 → 챕터 단위 진행
- `claude.ai만` → Step 4·6·10 (figma·higgsfield·notion 통합 3종, 가장 빠름)
- `급한것만` → Step 3 firecrawl + Step 4 figma (1분 이내 2개)
- `n` → 본 스킬 종료

### 빠른 설치 모드 (`준비 완료`) 의 단계별 처리

사용자가 `준비 완료` 입력 시 Claude 는 각 Step 을 다음 패턴으로 단축:

```
[N/11] {MCP 이름}

준비해두신 {파일 경로 또는 키} 를 알려주세요:
  → (사용자 1줄 입력)

🤖 자동 처리 중...
  ✓ .env 등록 (또는 파일 이동)
  ✓ 헬스 체크 통과
  ✓ Step {N} 완료 · 다음 Step 진행

(각 Step 약 30초~2분 소요. 발급 안내 페이지 출력 생략.)
```

발급 안내 (URL·클릭 절차) 출력 생략 → 영상 시간 60% 단축.

---

## 🔍 자동 사전 점검 (A 실제 설치 모드 전용 · Claude 자동 · 30초)

> ⚠️ **B 교육 시연 모드에서는 이 점검의 "자동 스킵"을 적용하지 않는다** — 감지는 하되 12개 전부 진행하고, 감지 결과는 각 단계 ④ 작동 증명에만 활용.

```bash
# 1) marketing-os 루트 확인
test -f "${CLAUDE_PROJECT_DIR}/.mcp.json" || echo "✗ marketing-os 디렉토리가 아닙니다"

# 2) Node.js 22+
node --version | grep -E "v(2[2-9]|[3-9][0-9])\." || echo "⚠ Node 22+ 필요 (Hyperframes)"

# 3) Python + uv (ga4·google-ads 용)
python3 --version | grep -E "3\.(1[0-9]|[2-9][0-9])\." || echo "⚠ Python 3.10+ 권장"
which uv || echo "⚠ uv 미설치 → 'curl -LsSf https://astral.sh/uv/install.sh | sh'"

# 4) ffmpeg (영상 트리오용)
which ffmpeg || echo "⚠ ffmpeg 미설치 → macOS: 'brew install ffmpeg'"

# 5) .env 존재
test -f "${CLAUDE_PROJECT_DIR}/.env" || cp "${CLAUDE_PROJECT_DIR}/.env.example" "${CLAUDE_PROJECT_DIR}/.env"

# 6) 기존 발급 상태 (.env 현재 값으로 진행률 추정)
grep -c "^[A-Z_]*=." "${CLAUDE_PROJECT_DIR}/.env" 2>/dev/null

# 7) Claude.ai 통합 3종 현황
claude mcp list 2>&1 | grep -E "claude\.ai (Figma|Notion)|Higgsfield" | head -3
```

결과 출력 예시:
```
✓ marketing-os 디렉토리 확인
✓ Node v22.10.0
✓ Python 3.11.4 + uv 0.4.18
✓ ffmpeg 6.1.1
✓ .env 파일 존재 (이미 발급된 키 3개 감지)
✓ Claude.ai 통합: Figma·Higgsfield 이미 연결됨

이미 완료된 Step (자동 스킵):
  ✓ Step 3  FIRECRAWL_API_KEY
  ✓ Step 4  Claude.ai Figma 통합
  ✓ Step 6  Claude.ai Higgsfield 통합

남은 작업: Step 1·2·5·7·8·9·10·11 (예상 65분)
```

---

## ✋ Step 1 · Google Sheets OAuth (10분 · ★★ · [클립 1-2])

사용자에게:
```
[1/11] Google Sheets OAuth Credentials

1. https://console.cloud.google.com 접속 → 프로젝트 'marketing-os' 선택
   (없으면 새로 생성. Step 2·5·9 와 같은 프로젝트로 통합 추천)

2. APIs & Services > Library > "Google Sheets API" 검색 > 사용

3. APIs & Services > OAuth 동의 화면
   - User Type: 외부 > 만들기
   - 앱 이름: "Sheets MCP" > 이메일 입력 > 저장 후 계속
   - 테스트 사용자 탭 > 본인 이메일 추가 ⚠️ 필수

4. APIs & Services > 사용자 인증 정보 > "+ 사용자 인증 정보 만들기"
   > "OAuth 클라이언트 ID" > 애플리케이션 유형: "데스크톱 앱" ⚠️ 필수
   > 만들기 > JSON 다운로드

5. 다운로드된 JSON 파일명을 "oauth_credentials.json" 으로 변경
6. 다운로드 폴더 경로를 알려주세요 (Enter 면 ~/Downloads/oauth_credentials.json):
```

자동 처리:
```bash
mv ~/Downloads/oauth_credentials.json "${CLAUDE_PROJECT_DIR}/mcp-server/"
cd "${CLAUDE_PROJECT_DIR}/mcp-server" && npm install

# 검증
grep -q '"installed"' "${CLAUDE_PROJECT_DIR}/mcp-server/oauth_credentials.json" \
  && echo "✓ Desktop App credentials" \
  || echo "✗ 'web' credentials — Step 1.4 데스크톱 앱 재선택"
```

브라우저 인증은 마지막 Claude 재시작 시 일괄 진행.

---

## ✋ Step 2 · GA4 Service Account (15분 · ★★ · [클립 1-3])

```
[2/11] GA4 Service Account + 권한 부여

GCP 콘솔 (Step 1 과 같은 프로젝트):

1. APIs & Services > Library > "Google Analytics Data API" > 사용

2. APIs & Services > Credentials > "+ CREATE CREDENTIALS" > "Service account"
   - 이름: "marketing-os-ga4"
   - CREATE AND CONTINUE > Grant access 비워두고 CONTINUE > DONE

3. 생성된 서비스 계정 클릭 > KEYS 탭 > ADD KEY > Create new key > JSON > CREATE
   → JSON 자동 다운로드

4. analytics.google.com > 좌하단 ⚙ 관리 > 본인 속성 선택
   > 속성 액세스 관리 > "+ 사용자 추가"
   > 이메일: JSON 파일 안의 client_email 값
   > 권한: 뷰어 > 저장
   > ⚠ 권한 인식까지 5~10분 대기 가능

5. GA4 속성 ID (9자리 숫자): 관리 > 속성 설정 > 우상단 "속성 ID"

다음 정보 알려주세요:
  - 다운로드된 JSON 경로 (Enter 면 ~/Downloads/ 자동 검색)
  - GA4 속성 ID (9자리 숫자):
```

자동 처리:
```bash
mkdir -p ~/.config/gcp && chmod 700 ~/.config/gcp
mv ~/Downloads/marketing-os-*.json ~/.config/gcp/ga4-service-account.json
chmod 600 ~/.config/gcp/ga4-service-account.json

sed -i.bak "s|^GA4_SERVICE_ACCOUNT_JSON=.*|GA4_SERVICE_ACCOUNT_JSON=${HOME}/.config/gcp/ga4-service-account.json|" .env
sed -i.bak "s|^GA4_PROPERTY_ID=.*|GA4_PROPERTY_ID=${USER_PROPERTY_ID}|" .env

# 서버는 npx -y mcp-server-ga4 (.mcp.json 에 이미 등록). 속성 ID 는 .mcp.json 의
# GA_PROPERTY_ID 평문 값을 교체 (서브폴더 실행 시 ${VAR} 치환 누락 방지 — 속성 ID 는 비밀값 아님).
npx -y mcp-server-ga4 --version 2>&1 | head -2

# ⚠ Workspace 정책이 서비스 계정 키 발급을 막는 경우(예: wmbb.kr) → ADC 경로:
#   gcloud auth application-default login
#   → .mcp.json 의 GOOGLE_APPLICATION_CREDENTIALS 가 ~/.config/gcloud/application_default_credentials.json 참조
#   invalid_rapt/scope blocked 시 자체 OAuth 데스크톱 클라이언트로 ADC 재로그인 + Claude Code 재시작
```

---

## ✋ Step 3 · Firecrawl (2분 · ★★★ · [클립 1-4])

```
[3/11] Firecrawl API key

1. https://firecrawl.dev/app/api-keys 접속 → Google 로그인
2. "Create new API Key" 클릭
3. 발급된 키 (fc-xxx 형식) 복사
4. 여기에 붙여넣어주세요:
```

자동 처리:
```bash
sed -i.bak "s/^FIRECRAWL_API_KEY=.*/FIRECRAWL_API_KEY=${USER_KEY}/" .env
FIRECRAWL_API_KEY="${USER_KEY}" npx -y firecrawl-mcp --version 2>&1 | head -2
```

---

## ✋ Step 4 · Figma (1분 · ★★★ · [클립 2-1])

> Claude.ai 통합. Personal Access Token / WebSocket / Desktop 플러그인 모두 불필요.

```
[4/11] Figma (Claude.ai 통합 1클릭)

1. Claude.ai 웹사이트 로그인 (claude.ai)
2. Settings > Integrations 또는 Connectors 탭
3. "Figma" 카드 찾기 > "Connect" 클릭
4. 브라우저 팝업에서 Figma 로그인 + "Authorize Claude" 클릭
5. 자동 닫힘 → 연결 완료

검증:
  claude mcp list | grep "claude.ai Figma"
  → "✓ Connected" 표시되면 성공
```

자동 처리:
```bash
claude mcp list 2>&1 | grep "claude.ai Figma" | head -1
```

별도 .env 변수 등록 불필요. OAuth 토큰은 Claude.ai 가 자동 관리.

---

## ✋ Step 5 · YouTube Data API (5분 · ★★★ · [클립 2-2])

```
[5/11] YouTube Data API key

1. https://console.cloud.google.com/apis/library/youtube.googleapis.com
2. "사용" 클릭 (Step 1·2 와 같은 프로젝트 가능)
3. https://console.cloud.google.com/apis/credentials > "+ 사용자 인증 정보 만들기" > "API 키"
4. 발급된 키 (AIza... 형식) 복사
5. (선택) "키 제한" 으로 IP/API 제한 설정 (보안)
6. 여기에 붙여넣어주세요:
```

자동 처리:
```bash
sed -i.bak "s/^YOUTUBE_API_KEY=.*/YOUTUBE_API_KEY=${USER_KEY}/" .env
YOUTUBE_API_KEY="${USER_KEY}" npx -y youtube-data-mcp-server --version 2>&1 | head -2
```

---

## ✋ Step 6 · Higgsfield (1분 · ★★★ · [클립 2-3])

> Claude.ai 통합. API key 발급 불필요.

```
[6/11] Higgsfield (Claude.ai 통합 1클릭)

1. Claude.ai 웹사이트 > Settings > Integrations
2. "Higgsfield" 카드 > "Connect"
3. 브라우저 팝업 OAuth 진행
4. 자동 닫힘 → 연결 완료

검증:
  claude mcp list | grep Higgsfield
  → "✓ Connected" 표시되면 성공

크레딧 확인: 무료 50 크레딧 (이미지 50장 또는 영상 10편 분량)
```

자동 처리:
```bash
claude mcp list 2>&1 | grep "Higgsfield" | head -1
```

---

## ✋ Step 7 · 영상 트리오: Hyperframes + HeyGen + ElevenLabs (15분 · ★★ · [클립 2-4])

> 영상제작 클립 전용 스킬 (`/mcp설치-영상제작`) 을 본 스킬에서 위임 호출. 3 도구를 순차로 설치.

```
[7/11] 영상 트리오 (Hyperframes 로컬 + HeyGen MCP + ElevenLabs MCP)

3 도구 순차 설치 (총 15분):
  7.1 Hyperframes (로컬 CLI · 5분)
      - npm install -g hyperframes
      - Chrome 의존성 자동 확인

  7.2 HeyGen MCP (API key · 5분)
      - https://app.heygen.com/settings > API 탭 > "Generate Token"
      - 무료 10 크레딧 (3분 영상 가능)
      - 키 (HG_xxx 형식) 입력

  7.3 ElevenLabs MCP (API key · 5분)
      - https://elevenlabs.io/app/settings/api-keys > "Create API Key"
      - 무료 10,000 자/월 (한국어 TTS 가능)
      - 키 (xi_xxx 형식) 입력

→ 본 스킬 내부에서 /mcp설치-영상제작 호출 (4단계 표준 흐름 자동 실행)
```

자동 처리:
```bash
# Hyperframes 글로벌 설치
npm install -g hyperframes 2>&1 | tail -2

# HeyGen MCP uvx 등록 (이미 .mcp.json 에 있음)
sed -i.bak "s/^HEYGEN_API_KEY=.*/HEYGEN_API_KEY=${HEYGEN_KEY}/" .env

# ElevenLabs MCP uvx 등록
sed -i.bak "s/^ELEVENLABS_API_KEY=.*/ELEVENLABS_API_KEY=${ELEVENLABS_KEY}/" .env

# 헬스 체크
hyperframes --version 2>&1 | head -1
HEYGEN_API_KEY="${HEYGEN_KEY}" uvx heygen-mcp --version 2>&1 | head -1
ELEVENLABS_API_KEY="${ELEVENLABS_KEY}" uvx elevenlabs-mcp --version 2>&1 | head -1
```

---

## ✋ Step 8 · Buffer (5분 · ★★★ · [클립 3-1])

```
[8/11] Buffer Access Token

사전 준비: buffer.com 가입 + LinkedIn/Twitter/Instagram/Facebook 4채널 연결

1. https://publish.buffer.com/account/apps 접속
2. "Create Access Token" 클릭
3. 발급된 토큰 (1/xxx 형식) 복사
4. 여기에 붙여넣어주세요:
```

자동 처리:
```bash
sed -i.bak "s/^BUFFER_ACCESS_TOKEN=.*/BUFFER_ACCESS_TOKEN=${USER_KEY}/" .env
BUFFER_ACCESS_TOKEN="${USER_KEY}" npx -y @damusix/buffer-mcp --version 2>&1 | head -2
```

---

## ✋ Step 9 · Meta + Google Ads (6분 + 1~2일 대기 · ★★ → ★ · [클립 3-2])

> 두 광고 MCP 를 한 Step 으로 묶음. Meta 는 1분 OAuth, Google 은 신청 후 1~2일 승인 대기.

### 9.1 Meta Ads hosted MCP (1분)

```
[9.1/11] Meta Ads (hosted MCP)

Claude 자동 실행:
  claude mcp add --transport http --scope user meta-ads https://mcp.facebook.com/ads

→ 즉시 등록 완료 (상태: ! Needs authentication)

사용자 작업 (1분):
  1. Claude Code 완전 종료 후 재시작
  2. Claude 에게: "내 Meta 광고 캠페인 목록 보여줘"
  3. 자동으로 열린 브라우저에서 Facebook 로그인
  4. 5개 OAuth scope 허용
     (ads_management · ads_read · catalog_management · business_management · pages_show_list)
  5. 자동 브라우저 닫힘 → 인증 완료

OAuth 토큰은 Claude.ai 자동 관리 (만료 시 자동 갱신).
.env 변수 등록 불필요.
```

### 9.2 Google Ads Developer Token (5분 신청 + 1~2일 승인 대기)

```
[9.2/11] Google Ads (Google 공식 MCP + ADC)

9.2.a Developer Token 신청 (5분, 승인 대기 1~2일)
  1) https://ads.google.com/aw/apicenter (Manager Account 필요)
  2) "Developer Token 신청" / "Apply for Basic access"
  3) 회사 정보 + 사용 목적 + 예상 호출량 입력 > 제출
  4) ✋ 1~2일 승인 대기 (이메일 알림)

9.2.b 승인 받은 후 본 스킬 재호출 (또는 1줄 입력):
  사용자: "google-ads 토큰: 22자_토큰"
  Claude 자동:
    - .env 에 GOOGLE_ADS_DEVELOPER_TOKEN 등록
    - Claude Code 재시작 안내
    - 첫 호출 검증

⚡ ADC 는 Step 2 GA4 와 동일하게 이미 발급된 상태.
   별도 OAuth Client ID/Secret/Refresh Token 발급 작업 불필요.
```

---

## ✋ Step 10 · Notion (1분 · ★★★ · [클립 4-1])

> Claude.ai 통합. Integration Token 발급 불필요.

```
[10/11] Notion (Claude.ai 통합 1클릭)

1. Claude.ai 웹사이트 > Settings > Integrations
2. "Notion" 카드 > "Connect"
3. 브라우저 팝업에서 Notion 로그인 > 워크스페이스 선택 > "Allow access"
4. 페이지·DB 접근 권한 부여 > "Authorize"
5. 자동 닫힘 → 연결 완료

검증:
  claude mcp list | grep "claude.ai Notion"
  → "✓ Connected" 표시되면 성공
```

자동 처리:
```bash
claude mcp list 2>&1 | grep "claude.ai Notion" | head -1
```

---

## ✋ Step 11 · Discord Channels (10분 · ★★★ · [클립 4-2])

> ⚠ **2026-05-26 단독 노선 전환**: Anthropic 공식 `discord@claude-plugins-official` **단독**.
> 서드파티 `mcp-discord`(barryyip0625) / `@v-3/discordmcp` **폐기**. 폰 DM ↔ 세션 양방향 연결.
> 요건: Claude Code v2.1.80+ · Bun 설치 · Anthropic 인증(claude.ai 또는 Console API 키).

```
[11/11] Discord Channels (공식 플러그인 + Bot Token)

A. Bot 발급 (Discord Developer Portal):
  1. https://discord.com/developers/applications > "New Application" > 이름 "marketing-os"
  2. 좌측 "Bot" > "Reset Token" > 토큰 (MTxxx, 한 번만 표시됨) 복사
  3. Privileged Gateway Intents 3개 모두 ON (PRESENCE / SERVER MEMBERS / MESSAGE CONTENT)
  4. "OAuth2" > "URL Generator" > Scopes: bot
     > Permissions: Send Messages · Embed Links · Read Messages
  5. 생성된 URL 로 본인 서버에 봇 초대

B. Claude Code 안에서 연결:
  /discord:configure
  → Bot 토큰 붙여넣기 + 접근 정책(누가 봇에게 DM 가능한지) 검토

  (단계별 안내가 필요하면 "디스코드 세팅하자" → discord-channels-setup 스킬 STEP 0~9)

C. 검증: 폰 디스코드에서 봇에게 DM 한 줄 → PC 의 Claude 가 같은 채팅으로 회신
```

자동 처리:
```bash
# /discord:configure 가 토큰 저장·정책을 관리 (access.json). 본 스킬은 직접 토큰을 쓰지 않음.
# Bot Token 을 .env 에도 보관하려면 (webhook 발송 등 보조 용도):
sed -i.bak "s/^DISCORD_BOT_TOKEN=.*/DISCORD_BOT_TOKEN=${USER_TOKEN}/" .env
sed -i.bak "s/^DISCORD_CHANNEL_ID_MARKETING_OS=.*/DISCORD_CHANNEL_ID_MARKETING_OS=${CHANNEL_ID}/" .env
claude mcp list 2>&1 | grep -i discord | head -1
```

> 후속: 봇을 업무 비서로 키우려면 "나만의 봇 구축을 시작하자" (bot-build 스킬).

---

## 🔄 최종 단계 · Claude Code 재시작 + 일괄 헬스 체크

모든 단계 완료 후:

```
모든 키 발급·인증 완료. 마지막 한 가지 작업:

1. Claude Code 를 완전 종료 (⌘Q on macOS, 작업관리자 종료 on Windows)
2. marketing-os 디렉토리에서 Claude Code 재시작
3. 재시작 후 자동으로 12개 MCP 활성화됨
   - google-sheets 는 브라우저 자동 열림 → OAuth 인증 1회
   - 나머지 10개는 즉시 작동

재시작 후 검증 명령:
  bash scripts/healthcheck-all.sh

또는 본 스킬 재호출 시 자동 검증 진행.
```

---

## ✅ 진행률 자동 추적

스킬이 .env 채워짐 + `claude mcp list` 의 Connected 상태로 자동 진행률 계산:

```
📊 marketing-os MCP 설치 진행률

[████████░░░░░░░░] 6/11 (55%) · 약 32분 남음

  Ch 1. 데이터 분석
  [✓] 1/11  Google Sheets      [1-2]
  [✓] 2/11  GA4                [1-3]
  [✓] 3/11  Firecrawl          [1-4]

  Ch 2. 콘텐츠·영상·디자인
  [✓] 4/11  Figma              [2-1]
  [✓] 5/11  YouTube Data       [2-2]
  [✓] 6/11  Higgsfield         [2-3]
  [○] 7/11  영상 트리오         [2-4]  ← 다음 단계

  Ch 3. 배포와 광고
  [○] 8/11  Buffer             [3-1]
  [○] 9/11  Meta + Google Ads  [3-2]

  Ch 4. 협업과 관리
  [○] 10/11 Notion             [4-1]
  [○] 11/11 Discord            [4-2]
```

각 Step 완료 시 자동 갱신.

---

## 🛠️ 일괄 헬스 체크 (Claude 자동 또는 사용자 명령)

```bash
bash "${CLAUDE_PROJECT_DIR}/scripts/healthcheck-all.sh"
```

예상 출력:
```
🩺 marketing-os MCP 헬스 체크 (12개 MCP · 서버 13개)

Ch 1. 데이터 분석
  ✅ google-sheets     Connected · 10 tools · token.json valid
  ✅ ga4               Connected · 5 tools  · property 471063826
  ✅ firecrawl         Connected · 4 tools  · API key valid

Ch 2. 콘텐츠·영상·디자인
  ✅ claude.ai Figma   Connected · 17 tools
  ✅ youtube-data      Connected · 6 tools  · API key valid
  ✅ claude.ai Higgsfield Connected · 28 tools · credits 48
  ✅ 영상 트리오:
      ✅ hyperframes  (local) v2.3.1
      ✅ heygen-mcp   Connected · 12 tools · credits 8
      ✅ elevenlabs-mcp Connected · 8 tools · 9230 chars left

Ch 3. 배포와 광고
  ✅ buffer            Connected · 2 tools · 4 channels linked
  ✅ meta-ads          Connected · 32 tools · account act_xxx
  ⚠️  google-ads       Pending   · developer token under review

Ch 4. 협업과 관리
  ✅ claude.ai Notion  Connected · 16 tools
  ✅ discord           Connected · 30 tools · server "marketing-os"

총 10/11 활성 · google-ads 승인 대기 중
```

---

## 🚨 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| Step N 에서 키 형식 오류 | 잘못된 키 붙여넣기 | 키 형식 안내 다시 출력 후 재입력 |
| Claude Code 재시작 후 MCP 안 보임 | marketing-os 가 아닌 곳에서 실행 | `cd "${CLAUDE_PROJECT_DIR}" && claude` |
| google-sheets 브라우저 자동 안 열림 | 방화벽/자동실행 차단 | 터미널 출력 URL 수동 복사 |
| ga4 PERMISSION_DENIED | 권한 부여 직후 | 10분 대기 후 재시도 |
| Claude.ai 통합 (figma·higgsfield·notion) 안 보임 | Claude.ai 웹 미로그인 또는 Connect 안 함 | Claude.ai > Settings > Integrations 재확인 |
| Hyperframes 렌더 실패 | Chrome/ffmpeg 미설치 | `brew install ffmpeg` + Chrome 설치 |
| HeyGen "Insufficient credits" | 무료 크레딧 소진 | 유료 플랜 또는 다음 달 갱신 대기 |
| Meta 토큰 자동 갱신 안 됨 | Claude.ai 세션 만료 | Claude.ai 웹에 재로그인 |
| Discord Bot "Invalid Token" | 토큰 잘못 복사 | Reset Token 후 새로 발급 |
| Discord Channels 연결 안 됨 | v2.1.80 미만 또는 Bun 미설치 | Claude Code 업데이트 + Bun 설치 후 `/discord:configure` |
| google-ads developer token 승인 거절 | 사용 목적 불명확 | Test Account 사용 또는 재신청 |

---

## 📁 다음 단계 (설치 완료 후)

```
🎉 MCP 12개 모두 활성화. 이제 가능한 일:

  A. 첫 결과물 즉시 만들기 ("start" 단어 호출)
     - 라우터가 설치된 MCP 자동 감지 → 작업 가능 업무 5개 메뉴 표시
     - 1개 선택 → 시연 (3~5분)
     - 상세: skills/start/SKILL.md

  B. Part 3~9 에이전트 활성화
     - 30개 에이전트가 본 MCP 들을 자동 호출
     - 예: weekly-sheets-reporter, ga4-html-report, ads-daily-monitor

  C. Part 10 자동화
     - cron 으로 매일/매주 자동 실행
     - Discord 채널로 자동 알림
     - 마케터는 검수만
```

---

## 🔁 본 스킬 다시 호출 시

본 스킬은 .env 키 채워짐 + `claude mcp list` Connected 상태로 자동 감지해서:
- 이미 완료된 Step 은 자동 스킵
- 미완료 Step 만 안내
- 헬스 체크 실패한 MCP 는 재발급·재인증 권유

→ 중간에 멈춰도 다시 호출하면 마지막 위치부터 재개.

---

## 🎬 강의 촬영 활용

본 스킬은 **Part 2 설치 마라톤 영상 1편** 으로 시연 가능:

- 강의 진행 순서 (1-2 → 4-2) 와 정확히 일치
- 각 Step 의 사용자 작업 시간 명시 → 영상 편집 시 발급 단계 빨리감기 처리 기준
- Claude.ai 통합 3종 (Step 4·6·10) 은 클릭 1번 시연 (각 30초~1분)
- Google Ads 승인 대기 (Step 9.2) 는 신청만 시연 + "1~2일 후 토큰 받으면 재호출" 안내
- 영상 합계 추정: 35~45분 (키 발급 빨리감기 + 자동화 부분 정상 속도)

→ 영상 끝에 "start" 단어 호출 → MCP 메뉴 한 번 보여주기 (다음 강의 진입)

> 📄 **사람이 읽는 단일 영상 워크스루**(시연 대본 겸 학습자 따라하기):
> `curriculum/part02-MCP12개/MCP-통합설치/통합설치-가이드.md`
> 본 스킬 = 그 가이드를 Claude 가 인터랙티브로 자동 시연하는 버전 (B 교육 시연 모드).
