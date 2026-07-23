---
name: 카드뉴스
description: |
  Figma 카드뉴스 자동 배치 · MCP 설치부터 카드 8장 완성까지 전부 한 스킬에서 인터랙티브로 진행.
  시각 레퍼런스(PDF·이미지) + 콘텐츠 원본을 받아 디자인 시스템 톤대로 자동 배치.
  자체호스팅 Cursor Talk to Figma MCP Plugin (cursor-talk-to-figma-mcp + Figma Community Plugin) 사용.
  6단계: Step 0 MCP 설치 점검 → Step 1 환경 검증 → 게이트 0 입력 → 게이트 1 토큰 → 게이트 2 카피 → 게이트 3 배치.

  자동 호출 트리거:
  - "카드뉴스 만들어줘"
  - "카드뉴스 작업하자"
  - "피그마에 카드뉴스"
  - "인스타 카드뉴스 만들어"
  - "Figma 카드뉴스 디자인"
allowed-tools: Read, Write, Bash, TodoWrite, mcp__figma__*
---

# Figma 카드뉴스 자동 배치

> 시각 레퍼런스가 디자인 시스템 역할을 하고, 콘텐츠가 카피를 채운다.
> MCP는 그걸 Figma에 옮기는 채널일 뿐. **레퍼런스 품질 = 결과 품질.**

## 진행 원칙 · 반드시 단계별로 사용자에게 묻는다 ⛔

**자동으로 끝까지 실행 금지.** 단계마다 **사용자에게 직접 질문하고, 답을 받은 뒤에만** 다음으로 넘어간다.
이전 단계가 완료/통과되지 않으면 다음 단계로 절대 점프 금지.

```
Step 0   MCP 설치 점검   → claude mcp list · plugin 설치 안내 · 모두 OK 받기      ⏸ 통과 확인
Step 1   환경 사전점검   → bun socket · Connect · join+read+write 3단 검증        ⏸ 통과 확인
게이트 0  입력 수집       → 레퍼런스·콘텐츠·카드수 묻기 (channel은 Step 1에서 처리) ⏸ 답 대기
게이트 1  토큰 승인       → 추출한 디자인 토큰 보여주고 OK?                       ⏸ 답 대기
게이트 2  카피 승인       → 카드별 카피 테이블 보여주고 OK/수정?                  ⏸ 답 대기
게이트 3  배치 직전       → 기존프레임 처리 확인 → 8장 자동 배치 → 검증           ⏸ 답 대기
```

각 단계 진입 시 명확한 헤더 출력 권장 (예: `## Step 1 / 6 · 환경 검증` 또는 `🚦 게이트 1 · 디자인 토큰 승인`).

---

## Step 0 · MCP 설치 점검 (Cursor Talk to Figma MCP Plugin)

> 이미 설치돼 있으면 자동 통과. 처음이면 4가지 설치 항목을 사용자에게 단계적으로 안내.

### 0-1. 자동 점검 (Claude 가 실행)

```bash
echo "=== MCP 등록 ===" && claude mcp list 2>&1 | grep -i "^figma" | head -3
echo "=== bun ===" && which bun && bun --version
echo "=== MCP 서버 폴더 ===" && ls ~/dev/claude-talk-to-figma-mcp/package.json 2>&1 | head -1
echo "=== Figma Desktop ===" && ls /Applications/Figma.app/Contents/Info.plist 2>&1 | head -1
```

4개 결과를 표로 정리해 사용자에게 보여준다:

| # | 점검 항목 | 상태 | 미설치 시 안내 |
|---|---|---|---|
| 1 | `figma` MCP 등록 (`claude mcp list`) | ✅ / ❌ | `.mcp.json` 에 `"figma": { "command": "bunx", "args": ["cursor-talk-to-figma-mcp@latest"] }` 추가 후 Claude Code 재시작 |
| 2 | `bun` 설치 | ✅ / ❌ | `curl -fsSL https://bun.sh/install \| bash` (5분) |
| 3 | `~/dev/claude-talk-to-figma-mcp` 폴더 (WebSocket 서버) | ✅ / ❌ | `git clone https://github.com/sonnybaker/cursor-talk-to-figma-mcp ~/dev/claude-talk-to-figma-mcp && cd $_ && bun install && bun run build` |
| 4 | Figma Desktop 앱 (`/Applications/Figma.app`) | ✅ / ❌ | https://www.figma.com/downloads/ 에서 다운로드 (브라우저 버전 ❌) |

### 0-2. Plugin 설치 사용자 안내 (자동 점검 불가 · 사용자만 확인 가능)

```
✋ Figma Community Plugin 설치도 한 번만 해두시면 됩니다 (이미 있으면 Skip)

1. Figma Desktop 실행
2. 상단 메뉴 Resources → Plugins → Browse plugins
3. 검색창에 "Cursor Talk to Figma MCP Plugin" 입력
4. Save (또는 Try it out) 클릭 → 설치 완료

→ 설치 완료되면 알려주세요.
```

### 0-3. 사용자 확인 게이트 ⏸

> **묻는다**: "Step 0 항목 4개 + Plugin 모두 ✅ 인가요? (또는 미설치 항목 알려주세요)"
> → 모두 OK 받으면 Step 1 로. ❌ 있으면 해당 항목 안내 후 사용자 작업 → 재점검.

---

## Step 1 · 환경 사전점검 (8장 작업 전 반드시 통과)

> 이 단계 통과 못하면 8장 작업이 전체 실패. **건너뛰지 말 것.**

### 1-1. WebSocket 서버 가동

```bash
lsof -iTCP:3055 -sTCP:LISTEN 2>&1 | head -3
```

비어있으면 백그라운드 실행 (run_in_background=true):
```bash
cd ~/dev/claude-talk-to-figma-mcp && bun socket
```
2초 후 `lsof` 재확인 → "Claude to Figma WebSocket server running on port 3055" 로그 확인.

### 1-2. 사용자 Plugin Connect 안내 (필수)

```
✋ Figma Desktop 쪽에서 4가지 확인해주세요

1. Figma Desktop 실행 중 (브라우저 ❌)
2. ⭐ 본인 소유의 새 Drafts 빈 파일 열기 (File → New)
   - 다른 사람 공유 파일 ❌ view-only ❌ → 작업 전체가 실패합니다 (이전 사고 사례)
3. Plugins → Cursor Talk to Figma MCP Plugin → Open → "Connect" 버튼 클릭
4. 화면에 표시된 channel ID (예: a1b2c3d4) 복사해서 알려주기
```

> **묻는다**: channel ID 알려달라고 명시적으로 요청 → 답 받기 전엔 1-3 진입 금지.

### 1-3. 3단 write 검증 (Claude 자동 실행)

채널 ID 받은 직후 단일 호출로 순서대로:

```
1. join_channel(channel)               → "Successfully joined" 확인
2. get_document_info()                 → page id 확인 (보통 "0:1")
3. create_frame(0, 0, 4, 4, parentId="0:1", name="env-test")
                                       → "Created frame ... with ID: X:Y" 확인
4. delete_node(X:Y)                    → 테스트 프레임 정리
```

**3번이 timeout 되면 절대 게이트 3 진행 금지.** 트러블슈팅 표로 사용자에게 다시 안내:

| 증상 | 원인 | 해결 |
|---|---|---|
| 1·2 OK, **3 timeout** | view-only 파일 또는 plugin focus 잃음 | "본인 Drafts 새 파일 + Plugin Connect 다시" → 새 channel ID |
| 1 OK, 2 timeout | plugin window 닫힘 | "Plugins → Open 다시" |
| 1 timeout | bun socket 미가동 | 1-1 다시 |

### 1-4. 통과 보고 ⏸

> **사용자에게 출력**: "✅ Step 1 환경 검증 통과. 게이트 0 (입력 수집)로 넘어갈까요?"

OK 받으면 게이트 0.

---

## 게이트 0 · 입력 수집 (Step 1 통과 후 진입)

Step 1 환경 검증을 통과한 직후, 분석 전에 3가지를 묻는다 (이미 메시지에 준 항목은 건너뛰기):

> 1. **시각 레퍼런스**: PDF·이미지 경로 (예: `marketing-os/curriculum/.../marketor_cards.pdf`)
> 2. **콘텐츠 원본**: Markdown·문서·URL·붙여넣기
> 3. **카드 수**: 기본 8장 (Cover 1 + Issue 1 + Point 5 + Vision/CTA 1)

> channel ID 는 Step 1 에서 이미 받았으므로 다시 묻지 않음.
> 3가지가 확정돼야 게이트 1 로 진행.

---

## 게이트 1 · 디자인 레퍼런스 분석 → 토큰 추출 후 묻는다

### PDF 분석 · Read 가 실패하면 Swift+PDFKit 우회 ⭐

`Read(file.pdf, pages="1-8")` 시도 → "pdftoppm not installed" 에러 시:

```bash
# 1. Swift CLI 있는지 (macOS 기본 포함)
which swift

# 2. 본 스킬 폴더의 pdf-to-png.swift 로 페이지별 PNG 추출
mkdir -p /tmp/cards_pdf
swift "<스킬폴더>/pdf-to-png.swift" "<PDF경로>" /tmp/cards_pdf 2.0
# → /tmp/cards_pdf/page_01.png ~ page_NN.png 생성 (2x 스케일, 1036x1296 정도)

# 3. 각 페이지를 Read 도구로 시각 분석 (병렬 호출)
```

스크립트 위치: `<스킬폴더>/pdf-to-png.swift`. 의존성 없음 (macOS 내장 PDFKit).
brew/poppler 설치 시도 금지 (시간 낭비).

### 토큰 추출 표 (마크다운으로 정리)

- **컬러 팔레트** 5종 (배경 / accent / 다크 / 그레이 / 디바이더) · RGB(0~1) + HEX
- **타이포 스케일** 5~6단계 (라벨 / 본문 / 도입 / 메가 / HERO / CTA·페이지번호) · pt
- **레이아웃 그리드** (캔버스 사이즈 · 패딩 · 카드 간격 · 헤더 underline 좌표)
- **공통 요소** (헤더 underline / 라벨 / 푸터 로고 / 페이지번호)
- **페이지 패턴** (Cover / Issue+브랜드 / Point N장 / Vision+CTA)

> **묻는다**: "이 디자인 톤으로 진행할까요? 바꿀 컬러·폰트 있나요?"
> → OK 받기 전에 게이트 2로 넘어가지 않음.

---

## 게이트 2 · 카드뉴스 내용 기획 → 테이블 보여주고 묻는다

콘텐츠 원본을 카드 수만큼 분할해 카피 테이블 (각 카드별 라벨 / 도입 / 메가 헤드라인 / 본문):

| # | 패턴 | 라벨 | 도입 | 메가 헤드라인 (강조부) | 본문 / HERO |
|---|---|---|---|---|---|
| 01 | Cover | … | … | … (마지막 줄 accent) | gray 서브 |
| 02 | Issue+브랜드 | … | … | … | gray 본문 + 브랜드 HERO |
| 03~07 | Point | … | (원형 숫자) | … | gray 3줄 |
| 08 | Vision+CTA | … | … | … | HERO 메가 |

> **묻는다**: "이대로 진행할까요?" → 수정 시 반영 후 재확인.

---

## 게이트 3 · 카드뉴스 디자인 진행 (Figma 배치)

### 3-1. 마지막 확인

- `get_document_info` → 기존 프레임 확인
- 기존 프레임 있으면 "지우고 새로 그릴까요, 옆에 추가할까요?" 물어보기

### 3-2. 베이스 프레임 N장 일괄 생성 (병렬 호출 OK)

- N장을 가로로 정렬 (x = i × (width + gap))
- 모든 호출에 `parentId="0:1"` (또는 `get_document_info` 응답의 page id) **반드시 명시**
- 배경색 + 이름 (`01 · Cover`, `02 · Issue`, ...)
- 이름 변경 후 추가 rename 불가 (cursor-talk-to-figma-mcp 에 `set_node_name` 미노출)
  → 베이스 프레임 만들 때 정확한 이름으로 한 번에 정해두기

**병렬 호출 한계**: 단일 응답 검증 후 14개 정도까지 동시 OK. 30개 이상은 위험. 카드 단위로 묶어 호출.

### 3-3. 카드 단위 콘텐츠 채우기 (순차 + 카드 내부는 병렬)

각 카드는 **카드 내부 노드들을 한 번에 병렬 호출**, 카드 간은 순차:

```
카드 01 (parentId=15:623) → 10~14개 노드 병렬 호출 → 응답 받기
카드 02 (parentId=15:624) → 14개 노드 병렬
카드 03 (parentId=15:625) + 카드 02 보강 → 14개 + 2개 병렬
...
카드 08 (parentId=15:630) → 17개 노드 병렬
```

### 3-4. 페이지별 콘텐츠 패턴 (4 종)

**A. Cover/Hook 카드 (1장)**
- 도입 (38pt dark) → 메가 헤드라인 2줄 (78pt, 마지막 줄 accent) → 서브카피 gray → 짧은 디바이더 → `다음 →` accent CTA

**B. Issue/브랜드 카드 (1장)**
- 도입 → 메가 2~3줄 (dark + accent 강조) → 본문 3줄 gray → 짧은 디바이더 → 작은 라벨 → 브랜드 HERO (110pt accent ExtraBold) → gray 서브

**C. Point 카드 (N장)**
- accent 원형(170×170) + 흰 숫자(110pt) → 메가 2줄(78pt, 마지막 accent) → 짧은 디바이더 → 본문 3줄 gray → 우하단 짧은 accent 라인
- **원형은 2-step**: `create_frame(170, 170, fillColor=accent)` → `set_corner_radius(nodeId, 85)`. 한 번에 안 됨.

**D. Vision/CTA 카드 (1장)**
- 작은 원형 (90×90) + "6" (60pt 흰색) → 메가 2줄 dark (66pt) → 본문 3줄 gray → **와이드 디바이더 (920×2)** → JOIN 라벨 → 도입 → HERO 메가 accent (130~150pt) → 마무리 dark

### 3-5. 검증

- `get_document_info` → 8장 모두 `currentPage.childCount: 8` 확인
- 각 자식 frame 의 이름이 정확한지 확인
- 사용자에게 Figma 캔버스 직접 확인 요청

---

## 트러블슈팅 (작업 중 만나는 패턴 모음)

### A. `create_frame` 등 write 명령 timeout

| 원인 | 진단 | 해결 |
|---|---|---|
| **View-only 파일** ⭐ 가장 흔함 | read 응답은 OK, write 만 무응답 | 본인 소유 Drafts 새 파일에서 Plugin Connect 재시도 → 새 channel ID 받아 재진입 |
| **parentId 누락** | v1.0.0+ silent fail | 모든 write 호출에 `parentId="0:1"` (또는 페이지 ID) 명시 |
| **동시 호출 과다** | socket queue depth max 1 · blockedCommands 누적 | 카드 단위 14개 이하로 묶어 호출 |
| **Plugin window 닫힘** | read 조차 timeout | Plugins → Open 다시 |

### B. PDF 분석 안 됨

- `Read(file.pdf)` "pdftoppm not installed" → 본 스킬의 `pdf-to-png.swift` 사용 (macOS 표준 PDFKit, brew 불필요)
- 페이지가 너무 많은 경우 처음 1장만 분석 + 대본 패턴으로 보완 가능

### C. 노출 안 된 도구 우회

| 미노출 도구 | 우회 |
|---|---|
| `create_ellipse` / `create_polygon` | `create_frame` + `set_corner_radius` 2-step |
| `set_node_name` (rename) | 베이스 프레임 만들 때 한 번에 정확한 이름. 사후 변경은 Figma Desktop 우클릭 → Rename |
| `set_font_name` / `load_font_async` | 시스템 기본 폰트 진행 + 안내 |
| `set_line_height` / `set_letter_spacing` | 디폴트 + 안내 |
| `group_nodes` / `set_auto_layout` | 좌표로 절대 배치 |

### D. 카드 8장 한 번에 만들기

8장을 100% 자동 한 번에 만드는 건 **사전점검(write 검증) 통과** 가 핵심. 통과한 뒤엔:
1. 베이스 프레임 8장 한 번에 (parentId 명시)
2. 카드별로 14개 안팎 노드 병렬 (카드 03~07 은 원형 cornerRadius 추가 1회 포함)
3. 카드 08 (HERO 메가 17개 노드) 마무리
4. `get_document_info` 검증

**환경 사전점검만 통과하면 본 작업은 약 5~8분에 마무리.** 검증 안 하고 시작하면 1~2시간 낭비.

---

## 디자인 토큰 검증된 기본값 (marketor 톤 · 레퍼런스 없을 때 사용)

```js
const TOKENS = {
  bg:      { r: 0.937, g: 0.918, b: 0.878 },  // #EFEAE0 베이지
  accent:  { r: 0.788, g: 0.329, b: 0.137 },  // #C95423 벽돌 오렌지
  dark:    { r: 0.102, g: 0.102, b: 0.102 },  // #1A1A1A
  gray:    { r: 0.478, g: 0.455, b: 0.439 },  // #7A7470
  line:    { r: 0.71,  g: 0.69,  b: 0.65  },  // #B5AFA6
  white:   { r: 1,     g: 1,     b: 1     },
};
const SIZE = {
  width: 1080, height: 1350, gap: 100,
  padX: 80, padY: 80,
  underline: { x: 80, y: 80, w: 80, h: 4 },
  label:     { x: 80, y: 110 },
  footerY:   1238,
  footerLogoX: 80, footerPageX: 900,
};
const FONT = {
  label: 22,   // 헤더 라벨 · 푸터 · CTA
  body: 26,    // gray 본문
  intro: 38,   // 도입 한 줄 (Cover/Issue)
  mega: 78,    // 메가 헤드라인 (ExtraBold)
  brand: 110,  // Issue 카드 브랜드 HERO + Point 원형 숫자
  hero: 130,   // Vision 카드 마지막 메가 CTA
};
const POINT = {  // Point 카드 5장 좌표
  circle:   { x: 80, y: 230, w: 170, h: 170, radius: 85 },
  num:      { x: 122, y: 258, size: 110, color: 'white' },
  mega1:    { x: 80, y: 540 },
  mega2:    { x: 80, y: 640 },
  divider:  { x: 80, y: 770, w: 200, h: 2 },
  body:     [{x: 80, y: 830}, {x: 80, y: 870}, {x: 80, y: 910}],
  decoAccent:{x: 920, y: 1130, w: 80, h: 4},
};
```

---

## 외부 자산

- **PDF 추출 스크립트**: `<스킬폴더>/pdf-to-png.swift` (macOS Swift + PDFKit, 의존성 없음)
- **레퍼런스 예시**: `marketing-os/curriculum/part02-MCP12개/04-figma/디자인 레퍼런스/marketor_cards.pdf`

## 연결 스킬

| 시점 | 스킬 | 역할 |
|---|---|---|
| 설치 단계 | `/mcp설치-figma` | talk-to-figma 5단계 설치 |
| 카드뉴스 제작 | 본 스킬 (`/카드뉴스`) | 레퍼런스 분석 → 기획 → 디자인 |
