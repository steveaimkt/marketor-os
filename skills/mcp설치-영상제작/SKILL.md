---
name: mcp설치-영상제작
description: |
  Part 2 클립 7 (영상제작) 전용 MCP 설치 스킬. HeyGen + ElevenLabs 두 MCP 를 순차로 설치하고 Hyperframes 로컬 환경까지 함께 세팅. 마케터(비개발자) 기준 4단계 표준 흐름.

  자동 호출 트리거:
  - **"영상제작 MCP 설치하자"** ⭐ 주요 트리거
  - "영상제작 환경 만들자" / "영상 자동화 환경 셋업"
  - "Hyperframes + HeyGen + ElevenLabs 설치"
  - "영상 트리오 설치"
  - "Part 2 / 2-4 설치 시작"

  4단계 (각 도구마다):
  ① 소개 → ② 설치 → ③ 가능 업무 → ④ 결과물 1개
  
  실행 순서: ① Hyperframes (로컬) → ② HeyGen MCP → ③ ElevenLabs MCP → ④ 통합 결과물 1개
---

# Part 2 / 2-4 영상제작 MCP 설치 (클립 전용)

> 본 스킬은 영상제작 클립의 3 도구 (Hyperframes, HeyGen, ElevenLabs) 를 한 번에 설치하고 통합 결과물 1개를 만드는 흐름. 마스터 스킬 `mcp설치` 의 4단계 표준을 도구 3개에 순차 적용.

## 🎬 스킬 시작 시 메시지

```
🎬 영상제작 MCP 설치를 시작합니다.

설치할 도구는 3개입니다 (총 25~35분 예상):

  ① Hyperframes (5~10분) - 그래픽 레이어. 로컬 CLI 도구
  ② HeyGen MCP (10~15분) - 사람(아바타) 레이어. API key 발급 필요
  ③ ElevenLabs MCP (5~10분) - 음성 레이어. API key 발급 필요

각 도구마다 4단계로 진행해요:
  소개 → 설치 → 작업 가능 업무 → 결과물 1개

3개 다 끝나면 통합 결과물 (53초 데이터 영상) 1개를 자동 생성하며 마칩니다.

먼저 사전 점검 5가지부터:
  □ Node.js 22 이상
  □ Chrome 브라우저
  □ ffmpeg (없으면 자동 설치 안내)
  □ uv 패키지 매니저 (없으면 자동 설치)
  □ HeyGen 무료 계정 + ElevenLabs 무료 계정

전체 진행할까요? (y/n)
```

사용자가 OK 하면 ① Hyperframes 부터 진행.

---

## ① Hyperframes 설치 (로컬 CLI)

### 1.1 소개

| 항목 | 값 |
|---|---|
| 한 줄 정의 | HTML+CSS+GSAP 으로 영상 컴포지션 자동 생성 |
| 제공사 | HeyGen (heygen-com/hyperframes) |
| 라이선스 | Apache 2.0 (상업 무제한) |
| 인증 | 없음 (로컬 도구) |
| 무료 한도 | 무제한 |
| Before | After Effects 또는 React 코드 직접 작성 |
| After | "주간 KPI 영상 만들어줘" → HTML 자동 + mp4 렌더 |

### 1.2 설치

```bash
cd "{marketing-os 경로}"
mkdir -p hyperframes
cd hyperframes
npx hyperframes@latest init .

# 추가 스킬 15개 설치 (Hyperframes 자체 스킬)
npx skills add heygen-com/hyperframes

# 환경 점검
npx hyperframes doctor
```

체크 항목 (`doctor` 결과):
- [ ] Node.js ≥ 22
- [ ] FFmpeg / FFprobe
- [ ] Chrome
- [ ] Hyperframes 0.6.26+

ffmpeg 가 없으면:

```bash
mkdir -p ~/.local/bin && cd ~/.local/bin \
  && curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o ffmpeg.zip \
  && curl -L https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip -o ffprobe.zip \
  && unzip -o ffmpeg.zip && unzip -o ffprobe.zip \
  && chmod +x ffmpeg ffprobe && rm -f *.zip \
  && echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc \
  && source ~/.zshrc
```

### 1.3 작업 가능 업무

Hyperframes 가 만들 수 있는 영상:
- 데이터 KPI 카드 (6~30초)
- 인포그래픽 릴스 (9:16)
- 슬라이드 덱 → 영상 자동 변환
- 자막 트랙 동기화
- 키네틱 타이포그래피
- 차트·다이어그램 애니메이션

호출 방식: `npm run render` (Bash 도구로) 또는 `/영상제작` 스킬.

### 1.4 결과물 1개: 6초 WeeklyKPI 영상

```
사용자: "ROAS 3.2x 들어가는 6초 KPI 영상 만들어줘"

Claude:
  1. /hyperframes 스킬 자동 호출
  2. hyperframes/index.html 작성 (Pretendard 한국어 폰트, 9:16)
  3. npm run check (lint + validate + inspect)
  4. npm run render → mp4
  5. open renders/*.mp4 (결과 재생)
```

검증: 한국어 잘 나오는지 · 9:16 비율 맞는지 · 6초 길이 정확한지.

---

## ② HeyGen MCP 설치 (API key)

### 2.1 소개

| 항목 | 값 |
|---|---|
| 한 줄 정의 | 텍스트 스크립트 → AI 아바타 토킹헤드 영상 |
| 제공사 | HeyGen (heygen-com/heygen-mcp) |
| 라이선스 | MIT |
| 인증 | API key (`HEYGEN_API_KEY`) |
| 무료 한도 | 월 10 크레딧 (1분 영상 ≈ 1~2 크레딧) |
| Before | 모델 섭외 + 촬영 + 편집 (1~3일, 수십만 원) |
| After | 텍스트 → 1~3분 후 mp4 |

### 2.2 설치

#### 2.2.1 사전 작업 (사용자 직접)

1. <https://app.heygen.com/signup> 가입 (무료, 카드 불필요)
2. 로그인 → 좌하단 프로필 → Settings → API
3. **Create New Token** 클릭
4. 생성된 토큰 복사 (`sk_V2_...` 형식, ~60자)

#### 2.2.2 환경 등록 (Claude 자동)

`marketing-os/.env` 파일에 추가:
```
HEYGEN_API_KEY=sk_V2_...
```

`marketing-os/.mcp.json` 의 `mcpServers` 에 추가:
```json
"heygen": {
  "_part": "2 Ch 2-4 아바타 영상",
  "command": "uvx",
  "args": ["heygen-mcp"],
  "env": {
    "HEYGEN_API_KEY": "${HEYGEN_API_KEY}"
  }
}
```

#### 2.2.3 사전 설치 (선택, 첫 호출 속도 ↑)

```bash
uv tool install heygen-mcp
```

#### 2.2.4 통신 검증

```bash
curl -sS "https://api.heygen.com/v2/voices" \
  -H "X-Api-Key: $HEYGEN_API_KEY" | python3 -m json.tool | head -20
```

응답에 `voices` 배열이 있으면 OK.

#### 2.2.5 Claude Code 세션 재시작

새 세션에서 `mcp__heygen__*` 도구 6개 활성화 확인.

### 2.3 작업 가능 업무

노출 도구 6개:
- `get_remaining_credits` 잔여 크레딧
- `get_voices` 음성 목록 (한국어 SunHi 여성, InJoon 남성)
- `get_avatar_groups` / `get_avatars_in_avatar_group` 아바타 선택
- `generate_avatar_video` 영상 생성 (메인)
- `get_avatar_video_status` 생성 폴링

마케팅 작업 사례:
1. 신제품 출시 60초 아바타 광고
2. 임원 인사말 영상 (CEO 디지털 아바타)
3. 다국어 광고 (1번 촬영 → N개 언어 더빙)
4. 정기 마케팅 리포트 영상

### 2.4 결과물 1개: 60초 한국어 아바타 영상

```
사용자: "SunHi 보이스로 60초 한국어 마케팅 영상 만들어줘.
        스크립트는 마케팅 OS 강의 소개"

Claude:
  1. mcp__heygen__get_voices 호출 → SunHi voice_id 확인
  2. mcp__heygen__generate_avatar_video 호출
     - text: 강의 소개 60초 스크립트
     - voice_id: SunHi
     - avatar: 기본 아바타
  3. mcp__heygen__get_avatar_video_status 폴링 (1~3분)
  4. 완료 시 영상 링크 반환
  5. 사용자에게 mp4 다운로드 안내
```

검증: 한국어 발음 자연스러운지 · 립싱크 정확한지 · 표정 적절한지.

---

## ③ ElevenLabs MCP 설치 (API key)

### 3.1 소개

| 항목 | 값 |
|---|---|
| 한 줄 정의 | 음성 합성 + 음성 클론 + 트랜스크립션 |
| 제공사 | ElevenLabs 공식 (elevenlabs/elevenlabs-mcp) |
| 라이선스 | MIT |
| 인증 | API key (`ELEVENLABS_API_KEY`) |
| 무료 한도 | 월 10,000 크레딧 (약 10분 음성) |
| Before | 성우 섭외 또는 본인 녹음 + 편집 |
| After | 텍스트 → native급 한국어 mp3 |

### 3.2 설치

#### 3.2.1 사전 작업

1. <https://elevenlabs.io> 가입 (무료)
2. 좌측 메뉴 → API Keys 또는 <https://elevenlabs.io/app/settings/api-keys>
3. Create API Key 클릭
4. 토큰 복사 (`sk_...` 형식)

#### 3.2.2 환경 등록

`marketing-os/.env`:
```
ELEVENLABS_API_KEY=sk_...
```

`marketing-os/.mcp.json`:
```json
"elevenlabs": {
  "_part": "2 Ch 2-4 음성·오디오",
  "command": "uvx",
  "args": ["elevenlabs-mcp"],
  "env": {
    "ELEVENLABS_API_KEY": "${ELEVENLABS_API_KEY}",
    "ELEVENLABS_MCP_BASE_PATH": "${PWD}/hyperframes/assets/audio"
  }
}
```

#### 3.2.3 사전 설치

```bash
uv tool install elevenlabs-mcp
mkdir -p marketing-os/hyperframes/assets/audio
```

#### 3.2.4 통신 검증

```bash
curl -sS "https://api.elevenlabs.io/v1/voices" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" | python3 -m json.tool | head -10
```

#### 3.2.5 세션 재시작

`mcp__elevenlabs__*` 도구 활성화 확인.

### 3.3 작업 가능 업무

ElevenLabs MCP 도구 카테고리:
- 음성 합성 (Text → mp3, 한국어 포함 다국어)
- 음성 클로닝 (본인 1분 샘플 → 영구 디지털 트윈)
- 트랜스크립션 (음성 → 텍스트, Whisper 대체)
- 오디오 처리 (사운드스케이프, 음성 변환)

마케팅 작업 사례:
1. KPI 영상에 한국어 내레이션 자동 합성
2. 본인 목소리 클론 → 모든 영상에 본인 톤
3. 광고 영상 효과음 자동 생성
4. 영상 자막을 음성에서 자동 추출

### 3.4 결과물 1개: 30초 한국어 내레이션 mp3

```
사용자: "다음 텍스트로 30초 한국어 내레이션 만들어줘:
        '이번 주 광고 성과를 정리합니다. ROAS 3.2배, CTR 4.8%...'"

Claude:
  1. mcp__elevenlabs__list_voices 호출 → 한국어 보이스 선택
  2. mcp__elevenlabs__text_to_speech 호출
     - text: 위 스크립트
     - voice_id: 선택된 ID
     - model: eleven_v3
     - language: ko
  3. mp3 파일을 hyperframes/assets/audio/narration.mp3 로 저장
  4. 사용자에게 파일 경로 + 길이 안내
```

검증: 받침·외래어 발음 자연스러운지 · 톤 일관성 · 0.5초 무음 갭 적절한지.

---

## ④ 통합 결과물: 53초 데이터 영상 자동 생성

3개 도구 모두 설치된 직후, 통합 시연 1건:

```
사용자: "주간 ROAS 3.2배 데이터로 53초 영상 만들어줘.
        한국어 내레이션은 본인 음성으로."

Claude:
  1. /영상제작 스킬 자동 호출
  2. STEP 1~3: 기획·자산·작성
     - Hyperframes index.html 작성 (8 sub-comp)
     - ElevenLabs 한국어 내레이션 생성 → assets/audio/narration.mp3
     - index.html 에 <audio> 트랙 추가 (mp3 동기화)
  3. STEP 4: npm run check (lint + validate + inspect)
  4. STEP 5: npm run render → renders/integrated-{timestamp}.mp4
  5. 자동 재생 + 통계 출력
```

성공 기준:
- mp4 53초·1920×1080·30fps 출력
- 한국어 자막·내레이션 동기화
- 마커 효과·SVG 애니메이션 적용
- WCAG AA 대비 통과

이 결과물이 나오면 영상 자동화 환경 구축 완료. Part 10 에서 이걸 매주 자동 실행하는 에이전트 (`video-renderer`) 로 확장.

---

## 설치 후 다음 단계 안내

```
🎉 영상제작 트리오 설치 완료. 다음 가능합니다:

  A. 다른 영상 시나리오 시도:
     - "60초 인스타 광고 만들어줘" (Case B: HeyGen + Hyperframes)
     - "이 영상 영어로 더빙해줘" (Case C: HeyGen translate)
     - "본격 3분 마케팅 영상" (Case D: 트리오 + Higgsfield)
     
  B. 정기 자동화 설정 (Part 10):
     - "매주 월요일 자동 영상 발송" → video-renderer 에이전트 등록
     
  C. 다른 MCP 클립 진행:
     - "Buffer MCP 설치하자" (Part 2-8)
     - "Notion MCP 설치하자" (Part 2-10)
```

---

## 📝 강의 실습 (실습.md 통합)

> 클립 2-4 실습.md 와 본 스킬을 함께 운영. 본 섹션은 강의 진행 시 시연용 명령·5패턴.

### 실습 한 줄 요약

`/mcp설치-영상제작` 스킬을 호출해 3 도구를 25~35분 안에 설치하고 53초 통합 영상 1개를 자동 생성.

### 실습 단계별 결과물 명령

**Step 1 결과물 · 6초 WeeklyKPI 영상**

```
ROAS 3.2x 들어가는 6초 KPI 영상 만들어줘
```

→ Hyperframes 자동 작성 + 렌더 → `renders/weekly-kpi-{시각}.mp4` → open 명령 자동 재생.

**Step 2 결과물 · 60초 한국어 아바타 영상**

```
SunHi 보이스로 60초 한국어 마케팅 영상 만들어줘
```

→ `mcp__heygen__generate_avatar_video` → 1~3분 폴링 → mp4 링크.

**Step 3 결과물 · 30초 한국어 내레이션 mp3**

```
다음 텍스트로 30초 한국어 내레이션 만들어줘:
"이번 주 광고 성과를 정리합니다. ROAS 3.2배 ..."
```

→ `mcp__elevenlabs__text_to_speech` → `hyperframes/assets/audio/narration.mp3`.

**Step 4 통합 결과물 · 53초 데이터 영상**

```
주간 ROAS 3.2배 데이터로 53초 영상 만들어줘.
한국어 내레이션은 본인 음성으로.
```

→ `/영상제작` 스킬 자동 호출 (8단계) → Hyperframes HTML + ElevenLabs 내레이션 + npm run render → 1920×1080 mp4.

### 마케터 5패턴 · 정기 운영 결합

```
[역할]
퍼포먼스 마케터의 영상 자동화 어시스턴트

[입력]
Google Sheets 의 지난주 광고 데이터 (광고비, ROAS, CTR, CPA)

[산출물]
53초 영상 (1920×1080 mp4) + 본인 음성 한국어 내레이션
→ Discord #marketing 채널 자동 발송
→ Notion "주간 광고 보고" 페이지 임베드

[제약]
- 폰트·색상은 본 브랜드 가이드 (Pretendard, 다크 + 그린 액센트)
- 한국어 발음 자연스러움 최우선
- 재현 가능한 결정성 임베드 (Linux 렌더에서도 동일 결과)

[검증]
- npm run check 전 단계 통과
- 영상 길이 53초 ± 1초
- 한국어 자막 동기화 ± 100ms
- 렌더 시간 32초 이내
```

---

## 트러블슈팅 (영상제작 트리오 한정)

| 증상 | 원인 | 해결 |
|---|---|---|
| Hyperframes `npm run render` 시 한국어 깨짐 | Pretendard CDN URL 잘못됨 | URL을 `cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2/` 패턴으로 |
| HeyGen 1~3분 폴링 대기 너무 길음 | 비디오 큐 적체 | 시간대를 한국 새벽으로 옮기거나 짧은 길이로 테스트 |
| ElevenLabs 한국어 받침 어색 | model 이 `multilingual_v2` 또는 `eleven_v3` 가 아님 | `model_id=eleven_v3` 명시, `language=ko` 지정 |
| Hyperframes + ElevenLabs 음성 트랙 동기 안 맞음 | 영상 길이와 mp3 길이 불일치 | 영상 `data-duration` 을 mp3 실제 길이로 맞춤 |
| `uvx heygen-mcp` 첫 실행 너무 느림 | 패키지 다운로드 | `uv tool install heygen-mcp` 사전 캐싱 |

## 강의 연결

- 본 스킬은 [클립 2-4 영상제작 대본](../../curriculum/part02-MCP12개/07-영상제작/대본/2-4-영상제작.md) 의 슬라이드 06 "설치 실습" 시연에서 호출됩니다.
- 마스터 스킬 [skills/mcp설치/SKILL.md](../mcp설치/SKILL.md) 의 일반 4단계 흐름을 본 클립의 3 도구에 순차 적용한 형태.
- 결과물(통합 53초 영상) 은 [skills/영상제작/SKILL.md](../영상제작/SKILL.md) 의 8단계 파이프라인이 이어받음.

## 사전 검증된 설정값

| 항목 | 값 |
|---|---|
| Hyperframes 버전 | 0.6.26 |
| HeyGen MCP 패키지 | `heygen-mcp` (uvx) |
| ElevenLabs MCP 패키지 | `elevenlabs-mcp` (uvx) |
| Pretendard CDN | `cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2/` |
| 검증된 한국어 보이스 (HeyGen) | SunHi (여, `bef4755ca1f442359c2fe6420690c8f7`) / InJoon (남, `9d81087c3f9a45df8c22ab91cf46ca89`) |
| 검증된 한국어 보이스 (ElevenLabs) | 한성국 음원 (음성 클론), model `eleven_v3`, language `ko` |
