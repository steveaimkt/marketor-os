---
name: video-duo-producer
description: |
  Part 2 클립 2-4 (영상제작 듀오) 실습 스킬. 사용자 한 줄 명령 →
  ⓪ 도구 2종 설치·점검 (Hyperframes → ElevenLabs · 미설치 항목만 골라 즉시 설치)
  → 제작 과정 설명 (2 레이어 + 전체 흐름) → 5 게이트로
  ① 작업·자료 선택 → ② 기획안 검토·쿼터 견적 → ③ 자산 준비 →
  ④ 검수·렌더 → ⑤ 피드백 루프.
  자동 실행 금지. 각 게이트마다 사용자에게 명시적으로 물은 뒤 답 받고 다음 단계.
  실전 학습 반영: 무료 쿼터 견적 선확인(ElevenLabs 월 1만자·creator 수십만자)·
  eleven_v3 한국어 모델 고정·mp3 길이 ↔ data-duration 동기·Pretendard 결정성 임베드·
  npm run check 통과 전 렌더 금지.

  자동 호출 트리거:
  - **"영상제작 실습 시작하자"** ⭐ 주요 트리거
  - **"영상 듀오 실습"** / **"듀오 실습 시작"**
  - "2-4 실습 시작" / "영상제작 시연"
  - "KPI 영상 실습" / "슬라이드 영상 변환 실습"
  - "Hyperframes 실습 시작"

  동작: 사용자 한 줄 → 5 게이트 인터랙티브 → 6초 KPI 영상 또는 53초 통합 영상 1편 +
  (옵션) 한국어 내레이션 mp3 → 결과 파일 경로 + 잔여 쿼터 + 다음 액션 5개.

  관계: 전역 /영상제작 스킬(8단계 풀 파이프라인)의 강의 시연 버전.
  본 스킬은 설치 → 과정 설명 → 게이트 진행 → 검증 산출물 재현까지 한 흐름으로 처리한다.
  (설치 상세가 더 필요하면 /mcp설치-영상제작 참조)
---

# Part 2 / 2-4 · 영상 듀오 — 설치부터 렌더까지 5 게이트 인터랙티브 흐름

> 사용자가 던진 한 줄을 그대로 렌더에 넘기지 않는다. **도구 2종 설치·점검부터 시작**해
> 제작 과정을 설명한 뒤, Claude 가 PD 로 기획하고 **5개 게이트**마다 사용자 확인을 받는다.
> 자동으로 끝까지 실행 금지.
> **사전 기획·게이트 = 무료 쿼터 절감의 핵심.** 잘못된 기획 → 재생성 → ElevenLabs 글자 낭비를 막는다.

## 무료 쿼터 제약 (항상 인지)

- **ElevenLabs Free** : 월 10,000 자 (약 10분). 유료 creator 플랜이면 수십만 자. `check_subscription` 으로 실잔여 확인.
- **Hyperframes** : 로컬 무제한 · 무료 (Apache 2.0)

> 🔑 ElevenLabs 잔여는 호출 전 `check_subscription` 으로 실잔여를 본다. creator 플랜이면 사실상 넉넉, 무료 플랜이면 10,000자가 한계.

## 🔐 보안 · API 키 노출 방지 (필수 · 모든 단계에서)

이 스킬이 ElevenLabs 키를 다룰 때 **키 문자열이 화면·파일에 절대 노출되면 안 된다.**

- ❌ **키를 `.mcp.json` 에 직접 기입 금지.** `.mcp.json` 은 강의 산출물이라 공유·커밋되면 키가 샌다. 키는 **`.env` 에만** 둔다 (`.env` 는 커밋 금지).
- ✅ **MCP 가 키를 못 받아 401 이 나면** (VSCode 확장은 `.zshrc` export 를 안 먹음) → 하드코딩 대신 **bash 래퍼로 `.env` 를 source** 한다:
  ```jsonc
  "elevenlabs": {
    "command": "bash",
    "args": ["-c", "set -a; source '/<절대경로>/marketing-os/.env'; set +a; exec /<절대경로>/uvx elevenlabs-mcp"]
  }
  ```
  → 키는 `.env` 에만 남고 `.mcp.json` 엔 0건. 변경 후 **세션 재시작 1회** 필요. [[firecrawl-mcp-env-not-exported]] 와 동일 함정·해법.
- ✅ **curl / Bash 로 키를 쓸 때**는 항상 `set -a; source .env; set +a` 후 `$ELEVENLABS_API_KEY` 로 참조. 화면 출력은 반드시 마스킹: `${ELEVENLABS_API_KEY:0:8}...`
- ✅ MCP 재시작이 번거로우면 **curl 직접 REST API 호출로 우회** 가능 (키 인증은 curl 에서 정상). 단 출력은 키 마스킹 유지.
- 점검 한 줄: `grep -c "sk_" .mcp.json` → **0 이어야 정상**.

## 진행 원칙 — 설치 1 단계 + 5 게이트 인터랙티브 ⛔

자동 실행 금지. 각 단계마다 사용자에게 **명시적으로 묻고 답을 받은 뒤**에만 다음 게이트로.

```
Step 0   도구 2종 설치·점검   → ① Hyperframes ② ElevenLabs 순차 (미설치만 설치)        ⏸ 도구마다 확인
Step 0.5 제작 과정 설명       → 2 레이어 개념 + 전체 흐름 다이어그램 + 인사               ⏸ 인사
게이트 1  작업·자료 선택      → 영상 유형 A~D + 입력 자료 (숫자/슬라이드 경로/대본)        ⏸ 답 대기
게이트 2  기획안 검토·견적    → 스토리보드 + 길이·비율 + 쿼터 견적                        ⏸ 답 대기
게이트 3  자산 준비          → 내레이션 텍스트·보이스 확정 (C·D 경로만)                   ⏸ 답 대기
게이트 4  검수·렌더          → npm run check 결과 확인 → OK 후 render                    ⏸ 답 대기
게이트 5  피드백 루프         → 만족 시 마무리, 아니면 수정 재진입                         ⏸ 답 대기
Step 6   마무리              → 산출물 경로 + 쿼터 차감 + 다음 액션 5개 제안
```

---

## Step 0 · 도구 2종 설치·점검 (스킬 발동 시 가장 먼저)

스킬 호출 즉시 **2개 도구의 설치 상태를 자동 점검**하고 결과 표를 보여준다:

```bash
# 점검 (읽기 전용 · 5초) — 키 "존재"가 아니라 "실제 작동(200)"까지 확인
cd marketing-os; set -a; source .env 2>/dev/null; set +a
test -d hyperframes && echo "Hyperframes ✅ (doctor 는 npx --yes hyperframes@<버전> doctor · package.json scripts 참고)"
# ElevenLabs: 키 유효성
curl -s -o /dev/null -w "ElevenLabs 키 HTTP %{http_code}\n" https://api.elevenlabs.io/v1/user/subscription -H "xi-api-key: $ELEVENLABS_API_KEY"
```

> 🔎 **MCP 도구(`check_subscription` 등)가 401 인데 위 curl 은 200** 이면 → 키는 정상, **MCP 환경변수 미전달** 문제다. 위 🔐 보안 섹션의 bash 래퍼로 고치고 재시작. (curl 200 = 키 유효 / 401 = 키 재발급)

```
🔧 도구 2종 점검 결과

  | # | 도구 | 담당 레이어 | 상태 | 설치 시간 |
  |---|---|---|---|---|
  | ① | Hyperframes    | 그래픽 (타이틀·자막·전환) | {✅ / ❌} | 5~10분 |
  | ② | ElevenLabs MCP | 음성 (한국어 내레이션)   | {✅ / ❌} | 5~10분 |

  ❌ 항목만 골라 지금 순서대로 설치합니다. 모두 ✅ 면 바로 과정 설명으로.
```

**미설치 항목은 아래 순서로 즉시 설치 진행** (도구마다 완료 확인 받고 다음으로 ⏸):

### ① Hyperframes (로컬 · 무료 · 사용자 작업 0)

```bash
mkdir -p marketing-os/hyperframes && cd marketing-os/hyperframes
npx hyperframes@latest init .
npx skills add heygen-com/hyperframes     # 추가 스킬 15개
npx hyperframes doctor                     # 환경 점검 · ffmpeg 없으면 ~/.local/bin/ 자동 설치
```

### ② ElevenLabs MCP (사용자 작업 3분 · API key)

1. ✋ <https://elevenlabs.io> 가입 → Settings → API Keys → **Create API Key** → `sk_...` 복사 → Claude 에 붙여넣기
2. 🤖 Claude 자동: `.env` 에 `ELEVENLABS_API_KEY` 추가 → `.mcp.json` 에 `elevenlabs` 서버 등록 → `uv tool install elevenlabs-mcp` → `hyperframes/assets/audio/` 폴더 생성

### ⚠️ MCP 신규 설치했으면 세션 재시작 1회

`.mcp.json` 변경은 재시작 후 반영. 재시작 후 본 스킬 재호출 → 점검만 통과하고 **게이트 1부터 이어서 진행**.
(ElevenLabs 미설치 상태로도 A·B 경로는 진행 가능 — 건너뛰기 허용)

---

## Step 0.5 · 제작 과정 설명 + 안내 인사

설치·점검 완료 후 **쿼터를 자동 조회**하고:

```python
mcp__elevenlabs__check_subscription()
```

다음 포맷으로 **어떤 과정으로 영상이 만들어지는지** 먼저 설명한다:

```
🎬 영상 듀오 실습을 시작합니다.

본 흐름의 핵심 : "Claude 가 PD, 듀오가 제작팀 — 본인은 각 단계 OK 만"

📐 영상은 2 레이어로 만들어집니다
  ① 그래픽 (Hyperframes) : 타이틀·자막·KPI 카드·전환 효과 — HTML+CSS 코드를 Claude 가 작성
  ② 음성   (ElevenLabs)  : 한국어 내레이션 — 텍스트만 주면 mp3

🔄 전체 제작 과정 (사람이 4.5시간 → 듀오 약 15분)
  기획 (스토리보드·길이·비율 확정)
    → 자산 준비 (내레이션 mp3)
    → 컴포지션 작성 (Claude 가 장면 배치 코드 자동 작성)
    → 검수 (npm run check : lint + validate + inspect)
    → 렌더 (npm run render → mp4 · 53초 기준 약 32초)
    → 확인·수정 ("인트로 더 빠르게" 한 줄이면 재렌더)

💰 현재 상태
  · Hyperframes  : ✅ 로컬 무제한 · 무료
  · ElevenLabs   : 잔여 {N} 자 / {한도} 자

👉 게이트 1 진행 : 어떤 영상 만들까요?
```

---

## 게이트 1 · 작업·자료 선택

다음 메뉴를 표시하고 **하나 골라달라** 묻기:

| # | 영상 유형 | 비율·길이 | 도구 | 쿼터 | 소요 |
|---|---|---|---|---|---|
| **A** | 📊 데이터 KPI 영상 (ROAS·CTR 카드) ⭐ 처음이면 | 9:16 · 6초 | Hyperframes | 0 | 5~8분 |
| **B** | 🎞 슬라이드 덱 → 영상 변환 ⭐ 본 강의 검증 산출물 | 16:9 · 53초 | Hyperframes | 0 | 약 12분 |
| **C** | 🎙 한국어 내레이션 mp3 | 30초~ | ElevenLabs | ~500자 | 2~3분 |
| **D** | 🎬 통합 영상 (그래픽 + 내레이션) | 16:9 · 53초 | Hyperframes + ElevenLabs | ~800자 | 15~20분 |

함께 묻기:
1. **선택**: A / B / C / D
2. **입력 자료** (유형별):
   - A → KPI 숫자 3개 (예: ROAS 3.2x · CTR 4.8% · CPA 12,500원) 또는 Google Sheets 데이터
   - B → 변환할 slides.html 경로 (예: `curriculum/part01-입문/대본/1-1-slides/slides.html`)
   - C·D → 내레이션 대본 텍스트 (없으면 Claude 가 초안 작성)
3. **저장 위치** 확인: 기본 `marketing-os/hyperframes/renders/` (다른 곳 원하면 지정)

> 🎨 **스타일 갤러리 (실습 시연용)** : "같은 도구로 이렇게 다양한 스타일이 나온다"를 먼저 보여주고 싶으면
> [`../산출물예시/스타일갤러리/`](../산출물예시/스타일갤러리/) 의 4종(Kinetic Type · NYT Graph 차트 · Swiss Grid · Vignelli 세로)을 재생.
> 각 mp4 옆에 컴포지션 소스(.html)가 있어 "이 코드가 이 영상이 된다"까지 바로 연결 가능.

⏸ **답 받은 뒤에만 게이트 2로 이동.**

---

## 게이트 2 · 기획안 검토 + 쿼터 견적

선택 유형에 맞는 **기획안을 작성해 보여주고 OK 받기**:

### A · KPI 영상 기획 표준 (6초)

| 시간 | 장면 | 효과 |
|---|---|---|
| 0–1.5 s | 타이틀 등장 ("이번 주 광고 성과") | 키네틱 타이포 |
| 1.5–4.5 s | KPI 카드 3장 순차 등장 | 스태거 + 마커 강조 |
| 4.5–6 s | 핵심 숫자 줌 + 마무리 | 게이지 차오름 |

### B · 슬라이드 변환 기획 (53초 검증 패턴)

- slides.html 읽기 → 슬라이드 N장을 **sub-composition N개**로 분리
- 장당 5~7초 배분 + 등장 애니메이션 (마커 하이라이트 · SVG 다이얼 · burst · 게이지)
- 폰트: **Pretendard 결정성 임베드** (Linux/Docker 렌더에서도 동일 결과)

### C·D · 쿼터 견적 의무 표시 🚨

호출 전 반드시 보여주기:

```
📋 쿼터 견적
  · ElevenLabs : 대본 {N}자 → 잔여 {M}자 중 차감
  이대로 진행 OK?
```

견적이 잔여의 50% 초과 → ⚠️ 경고 + 대본 축약 제안.

⏸ **"이대로 진행 OK?" 답 받기.**

---

## 게이트 3 · 자산 준비 (C·D 경로만 · A·B 는 건너뜀)

### 내레이션 (C·D) — ElevenLabs

1. 대본 확정 → 사용자에게 최종 텍스트 보여주고 OK
2. 보이스 선택: 한국어 자연스러움 기준 추천 1개 + 대안 2개 (`search_voices` 한국어 필터)
3. 🚨 **모델은 `eleven_v3` 고정** (v1·multilingual_v1 은 한국어 발음 어색)

```python
mcp__elevenlabs__text_to_speech(
  text="<확정 대본>",
  model_id="eleven_v3",
  output_directory="marketing-os/hyperframes/assets/audio/"
)
```

4. 생성 mp3 재생 → 발음 품질 확인 받기
5. 🚨 **ffprobe 로 mp3 정확한 길이 측정** → 영상 `data-duration` 을 이 길이에 맞춤 (동기 ±100ms)

⏸ **자산 확인 받은 뒤에만 게이트 4로 이동.**

---

## 게이트 4 · 검수 → 렌더 (Hyperframes 경로 A·B·D)

🚨 **check 통과 전 렌더 금지.**

```bash
cd marketing-os/hyperframes
npm run check    # lint + validate + inspect
```

- 통과 → 결과 요약 보여주고 "렌더 진행 OK?" 묻기
- 실패 → 오류 원인 설명 + 수정 후 재검수 (사용자에게 수정 내용 보고)

```bash
npm run render   # → renders/{timestamp}.mp4 (53초 기준 렌더 약 32초)
open renders/{최신}.mp4
```

⏸ **영상 재생 확인 받기.**

---

## 게이트 5 · 피드백 루프

결과 + 메타정보 표시:

```
✅ 영상 생성 완료
  · 파일 : marketing-os/hyperframes/renders/{name}.mp4
  · 스펙 : {53초 · 16:9 · 1920×1080} · {13MB}
  · 쿼터 : ElevenLabs {N}자 차감 (잔여 {M})

👉 다음 액션 :
  A. 만족 → 마무리
  B. 색감·폰트·속도 수정 ("인트로 더 빠르게" 한 줄이면 됨)
  C. 다른 비율 추가 렌더 (9:16 릴스 / 1:1 피드)
  D. 내레이션 얹기/교체 (다른 보이스 · 본인 음성 클로닝)
  E. 다른 슬라이드 덱으로 한 편 더
```

⏸ **답 받은 뒤에만 진행.** B 는 게이트 4 재진입, C 는 비율 변경 후 재렌더, D 는 게이트 3 재진입.

---

## Step 6 · 마무리

```
🎉 영상 듀오 실습 완료

📦 산출물
  · {6초 KPI / 53초 통합} 영상 1편 → renders/{name}.mp4
  · (옵션) 한국어 내레이션 mp3 → assets/audio/
  · 쿼터 소진 : Hyperframes 0 · ElevenLabs {N}자

💡 쿼터 절감 핵심 5가지 (오늘 학습)
  1. 게이트마다 사용자 확인 → 재생성 0
  2. 호출 전 쿼터 견적 의무 표시 — ElevenLabs 는 `check_subscription` 실잔여 확인
  3. 한국어 TTS 는 eleven_v3 고정 (재생성 방지)
  4. mp3 길이 ffprobe 측정 → data-duration 동기 (음성 어긋남 재렌더 방지)
  5. npm run check 통과 전 렌더 금지 (렌더 32초 낭비 방지)

🚀 다음 단계 후보
  A. Buffer MCP 결합 → 영상 SNS 5채널 자동 예약 (클립 3-1)
  B. Discord 로 렌더 완료 자동 발송 (Part 10)
  C. Google Sheets 광고 데이터 → 매주 KPI 영상 자동화 (Part 6 결합)
  D. Higgsfield 모델 컷 → 영상 인서트 합성 (클립 2-3 결합)
  E. 본인 음성 클로닝으로 내레이션 교체 (ElevenLabs voice_clone)
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `npx hyperframes doctor` 가 "could not determine executable" | 버전 미고정 npx 가 패키지 못 찾음 | `package.json` scripts 의 `npx --yes hyperframes@<버전>` 형태로 호출 (예: `npm run check`) |
| `npx hyperframes doctor` 가 ffmpeg 없다고 표시 | macOS 기본 ffmpeg 미설치 | `~/.local/bin/` 정적 바이너리 자동 설치 |
| **MCP `check_subscription`/`text_to_speech` 가 401** 인데 curl 은 200 | `.mcp.json` 의 `${KEY}` 가 VSCode 확장에 미전달 (`.zshrc` export 안 먹음) | 🔐 보안 섹션의 **bash 래퍼로 `.env` source** (키 하드코딩 금지) + 세션 재시작. [[firecrawl-mcp-env-not-exported]] |
| ElevenLabs 한국어 발음 어색 | model 이 v1 / multilingual_v1 | `model_id="eleven_v3"` 명시 |
| 세션 재시작 후 `mcp__elevenlabs__*` 안 보임 | `.env` 미로드 또는 `.mcp.json` 문법 오류 | JSON 검증 + `.env` 변수 확인 후 재시작 |
| 통합 영상 음성 트랙 동기 안 맞음 | mp3 길이 ↔ `data-duration` 불일치 | ffprobe 로 mp3 길이 측정 후 duration 맞춤 |
| 렌더 결과 폰트 깨짐 (한글 □□) | 폰트 미임베드 | Pretendard `@font-face` woff2 결정성 임베드 한 줄 추가 |
| `npm run check` validate 실패 | sub-comp 시간 합계 ≠ 전체 duration | 장면별 시간 재배분 후 재검수 |
| 쿼터 부족 (ElevenLabs) | 월 무료 한도 소진 | A·B 경로 (Hyperframes 단독·무료) 로 전환 |

---

## 호출되는 도구

| 도구 | 단계 | 쿼터 |
|---|---|---|
| `npx hyperframes doctor` (Bash) | Step 0 | 0 |
| `mcp__elevenlabs__check_subscription` | Step 0 | 0 |
| `mcp__elevenlabs__search_voices` | 게이트 3 | 0 |
| `mcp__elevenlabs__text_to_speech` | 게이트 3 | 글자 수만큼 |
| `npm run check` → `npm run render` (Bash) | 게이트 4 | 0 |

---

## 참고 자료

- 설치 스킬 : [skills/mcp설치-영상제작/SKILL.md](../../../../skills/mcp설치-영상제작/SKILL.md)
- 풀 파이프라인 스킬 : [skills/영상제작/SKILL.md](../../../../skills/영상제작/SKILL.md) · 8단계 상세
- 실습 가이드 (수동) : [`../실습.md`](../실습.md)
- 결과물 예시 : [`../결과물-예시.md`](../결과물-예시.md)
- 검증 산출물 : [`../산출물예시/`](../산출물예시/) · 6초 KPI + 53초 변환 mp4
- 스타일 갤러리 : [`../산출물예시/스타일갤러리/`](../산출물예시/스타일갤러리/) · Kinetic Type · NYT Graph 차트 · Swiss Grid · Vignelli 4종 (mp4 + 소스)
- 공식 예시 가이드 : <https://hyperframes.heygen.com/quickstart> · `npx hyperframes init --example <name>` (warm-grain·play-mode·product-promo 등 8종)
