---
name: slide-audit
description: |
  강의 슬라이드(slides.html) 3 라운드 자동 검수 + 1 라운드 체크리스트. HTML 구조·폰트·SVG·strap 침범·bottom: 위치 패턴·top:>=900 추정 높이 등 자동 검출 + Critical 발견 시 자동 수정 가이드 제공.

  자동 호출 트리거:
  - **"슬라이드 검수"** ⭐ 주요 트리거
  - "레이아웃 깨지는 문제 체크"
  - "레이아웃 겹침 점검" / "레이아웃 검수"
  - "strap 침범" / "strap 영역 침범"
  - "slides.html 검수"
  - "촬영 전 슬라이드 점검"
  - 슬라이드 신규 작성·큰 수정 직후 자동

  3 라운드 자동 + 1 라운드 수동:
  ① Round 1 · HTML 구조·좌표·페이지 번호 (audit-slides.py)
  ② Round 2 · 폰트·grid 자동 확장·SVG viewBox (audit-slides-round2.py)
  ③ Round 3 · eyebrow↔title↔content↔strap 간격 + bottom: 침범 + top:>=900 추정 (audit-slides-round3-layout.py)
  ④ Round 4 · 정합성·시각겹침·개념·흐름 (사람 체크리스트)
---

# 슬라이드 검수 스킬 (slide-audit)

## 언제 호출하나

- 슬라이드 신규 작성 직후
- 슬라이드 큰 폭 수정(레이아웃·콘텐츠 추가) 후
- 강의 촬영 시작 전 최종 점검
- 학습자에게 공개하기 전

다른 에이전트(`slide-auditor`)와의 관계: 본 스킬은 **자동 실행 가능한 검수 로직**을, `slide-auditor` 에이전트는 **사람과 대화하며 보고서를 작성하는 워크플로**를 담는다. 자동 검출은 본 스킬, 종합 판단은 에이전트.

## 입력

```yaml
target_path: "curriculum/part01-입문/대본/1-2-slides/slides.html"   # 단일 파일 또는 폴더
script_path: "curriculum/part01-입문/대본/1-2-답하는AI-vs-일하는AI.md"  # (선택) 대본 정합성 검사용
mode: "all" | "round1" | "round2" | "round3"   # 기본 all
strict: true | false   # true면 Warning도 종합 결과 실패로 처리
```

## 워크플로 (3 라운드 자동 + 1 라운드 수동)

### Round 1 · 기술 검수 (자동, 5초 이내)

`tools/audit-slides.py` 실행. 다음을 검출:

1. **HTML 구조** · `<section>`/`<div>`/`<svg>`/`<style>` 열림·닫힘 균형
2. **메타 정합성** · `<section>` 개수, `<span class="page">` 연속성·중복
3. **좌표 영역** · `top + height ≤ 970` (strap 980 위 10px 여유), `left + width ≤ 1820`
4. **SVG viewBox 침범** · rect/path가 viewBox 안에 있는지
5. **페이지 번호 ↔ 위치 매칭** · N번째 섹션의 `<span class="page">`가 `printf("%02d", N)`인지

**실행**:
```bash
python3 tools/audit-slides.py <target_path>
```

### Round 2 · 시각 검수 (자동, 5초 이내)

`tools/audit-slides-round2.py` 실행. 다음을 검출:

1. **카드 자동 확장** · `height` 없는 grid 카드의 콘텐츠 분량 추정
2. **작은 폰트** · 12px 미만(Critical), 14px 미만(Info)
3. **grid strap 침범** · 자동 확장 grid가 strap 영역(980) 넘는지
4. **SVG viewBox 침범** · rect/path 좌표가 viewBox 밖으로 그려지는지 (잘려서 안 보이는 경우)

**실행**:
```bash
python3 tools/audit-slides-round2.py   # 전체
python3 tools/audit-slides-round2.py <target_path>   # 단일
```

> **한계**: SVG 내부의 `<g transform>` 중첩 좌표계는 자동 검출 어려움. 텍스트-도형 좌표 겹침은 round 3 사람 검수에서 잡는다.

### Round 3 · 페이지별 레이아웃 검수 (자동, 5초 이내)

`tools/audit-slides-round3-layout.py` 실행. 각 슬라이드의 주요 좌표 요소 (eyebrow ↔ title ↔ content ↔ strap)간 간격을 분석:

1. **eyebrow ↔ title 간격** · 30px 미만 ⚠️ (겹침 위험) / 30~50px 🔵 (좁음) / 50px+ ✅
2. **title ↔ 첫 콘텐츠 간격** · 20px 미만 🔵 / 음수 ⚠️ (겹침)
3. **마지막 콘텐츠 ↔ strap (980) 간격** · 10px 미만 🔵 / 침범 ⚠️
4. **title-block 높이 추정** · 클래스(`cover`/`h1`/`h2`/`hero`)와 폰트·줄 수로 계산
5. **eyebrow 기본 위치** · top:60, height ~25 (deck.css 기본값 가정)
6. ⭐ **bottom:N 으로 배치된 요소** · `1080 - N > 980` 이면 strap 침범 ⚠️ (top:N 으로 변환 권장)
7. ⭐ **top:>=900 요소의 추정 끝점** · padding + font × 1.4 로 추정 → strap 침범 시 ⚠️

**실행**:
```bash
python3 tools/audit-slides-round3-layout.py <target_path>     # 단일 파일
python3 tools/audit-slides-round3-layout.py --all              # 전체 Part 1
```

**출력 예시**:
```
[05 MD File Walkthrough]
  · eyebrow                   top:  60  (60~85)
  · title-block.h2            top: 160  (160~256) · font 88px × 1줄
  · content (absolute)        top: 300
  · content (absolute)        top: 900
  · content (bottom-pos)      top:1000  bottom:80px (y≈1000)
  · [strap]                   top: 980  · 침범 금지
  ⚠️ bottom:80px 요소 (y≈1000) · strap(980) 영역 침범. top:N 으로 변환 권장
```

**strap 침범 패턴 (자주 발생)**:
- `position:absolute; bottom:80px; ...` → `1080-80=1000 > 980` 침범. **수정 패턴**: `top:850~870px` 로 변환
- `position:absolute; top:960px; padding:18px; font-size:24px` → `960 + 18 + 24×1.4 = 1011 > 980` 침범. **수정 패턴**: `top:910px` 로 + padding/font 축소

**왜 필요한가**:
- Round 1·2는 HTML 구조·SVG viewBox 침범 등 기계적 오류를 잡지만, **시각적 균형**(eyebrow와 title이 너무 가까워서 답답함, title 직후 subtitle이 4px 간격으로 겹쳐 보임 등)은 못 잡음.
- Round 3는 페이지별로 좌표 다이어그램을 출력해 강사가 "어디가 좁은가"를 즉시 파악.

> **한계**: title-block의 line-height와 폰트 ascender 영역을 추정하므로 ±10px 오차 가능. 시각적 최종 검증은 브라우저에서.

### 자동 수정 가이드 (Critical 발견 시)

Round 3 가 ⚠️ Critical 을 출력하면 Claude 는 다음 패턴으로 자동 수정:

| 발견 패턴 | 수정 방법 |
|---|---|
| `bottom:80px` 가 strap 침범 (y≈1000) | `top:870px` 로 변환 (1080-80-30 ≈ 970, 30px 안전 마진) |
| `bottom:65~75px` 가 strap 침범 | `top:920~930px` 로 변환 (작은 텍스트 1줄 가정) |
| `top:920px + 큰 font` (예: 32px+) | `top:870~880px` 로 옮기고 font 축소 (32px → 26px) |
| `top:960px + padding:18px` | `top:910px + padding:14px` 로 + font 축소 |
| 카드 콘텐츠가 strap 침범 | grid 위치를 위로 올리거나 카드 높이 축소 |

**수정 후 반드시 재검수**: `python3 tools/audit-slides-round3-layout.py <path>` → `Critical 0` 확인.

### Round 4 · 콘텐츠·정합성 검수 (사람 + 체크리스트)

자동으로 못 잡는 것을 체크리스트로 점검:

#### 4.1 슬라이드 ↔ 대본 정합성
- [ ] 대본의 `〔슬라이드: NN ...〕` 표기가 실제 slides.html의 페이지 번호와 일치
- [ ] 대본의 `〔슬라이드 전환 → NN ...〕` 다음 슬라이드 번호 일치
- [ ] 시간 마커 `[X:XX~Y:YY]` 가 연속·증가 (역행 없음)
- [ ] 슬라이드 구성 표의 시간 합계 = 클립 총 시간

#### 4.2 시각적 겹침 (의도되지 않은 layering)
- [ ] 텍스트가 도형(rect·circle) 밖으로 튀어나오지 않음
- [ ] 우상단 아이콘이 카드 헤더 텍스트와 겹치지 않음
- [ ] SVG 내부 `<g transform>` 그룹 간 좌표 충돌 없음 (특히 large font 텍스트)
- [ ] 영상 슬롯의 라벨이 슬롯 경계 안에 있음

#### 4.3 개념 이해 충분성
- [ ] 새로운 용어 → 슬라이드/대본에서 정의 있음
- [ ] 추상 개념 → 구체 예시(시연 또는 시나리오) 흐름
- [ ] 비유 의존도 낮음 (사용자 지시: "비유보다 개념")
- [ ] 마케터 일상 시나리오와 연결됨

#### 4.4 흐름 자연스러움
- [ ] 슬라이드 N → N+1 전환 시 맥락 끊김 없음
- [ ] Cover → 본문 → Multiplier → Summary → Closing 흐름
- [ ] Closing이 다음 클립 흥미 유발

## 출력

```markdown
# {클립명} 슬라이드 검수 보고서

> Audit Date: 2026-05-17 · Mode: all · Strict: false

## 요약
- 슬라이드 수: 8
- 발견 이슈: Critical 0 · Warning 1 · Info 2

## Round 1 · 기술 검수 (audit-slides.py)
✅ 통과 · 이슈 없음

## Round 2 · 시각 검수 (audit-slides-round2.py)
🟡 [05 Before After] grid 예상 끝 980px · strap 침범 가능
🔵 [07 Login Demo] 가장 작은 폰트 13px (보조 텍스트로만 사용 권장)

## Round 3 · 레이아웃 검수 (audit-slides-round3-layout.py)
⚠️ [03 2 MCP] bottom:80px 요소 (y≈1000) · strap(980) 영역 침범
→ 수정: `bottom:80px` → `top:860px`

## Round 4 · 콘텐츠 (사람 체크리스트)
정합성·겹침·개념·흐름 4개 카테고리 통과 여부를 슬라이드별로 확인 필요.

## 권장 조치
1. [Critical] 03 슬라이드의 bottom:80px 박스를 top:860px 로 변환 (Round 3 자동 수정 가이드 참고)
2. [Warning] 05 카드 높이를 명시적 height 로 고정
3. [Info] 13px 폰트가 본문이면 16px+ 권장. 강조 라벨이면 OK.
```

## 사용 예시

### 단일 클립 검수 (자동 트리거)
사용자가 다음 중 하나로 말하면 본 스킬 자동 호출:
- "슬라이드 검수해줘"
- "1-2 슬라이드 audit"
- "레이아웃 깨지는 거 잡아줘"
- "strap 침범 체크"

### 수동 호출 (3 라운드 순차)
```bash
SLIDE="curriculum/part02-MCP12개/04-figma/대본/2-1-slides/slides.html"
python3 tools/audit-slides.py "$SLIDE"
python3 tools/audit-slides-round2.py "$SLIDE"
python3 tools/audit-slides-round3-layout.py "$SLIDE"
```

### 모든 Part 일괄 (Part 1 전용 wrapper)
```bash
python3 tools/audit-part1-final.py
```

### 다른 에이전트가 호출
```python
# slide-auditor 에이전트가 본 스킬을 내부 호출
result = invoke_skill("slide-audit", target=clip_path, mode="all")
```

## 의존 자산

| 파일 | 역할 |
|---|---|
| `tools/audit-slides.py` | Round 1 · HTML 구조·페이지 번호·좌표 |
| `tools/audit-slides-round2.py` | Round 2 · 시각 (폰트·grid·SVG viewBox 침범) |
| `tools/audit-slides-round3-layout.py` ⭐ NEW | Round 3 · 페이지별 레이아웃 (eyebrow ↔ title ↔ content ↔ strap) |
| `agents/part0-ops/slide-auditor.md` | 대화형 검수 에이전트 정의 |
| `curriculum/_design-system/README.md` | "겹침 금지" 원칙 + 좌표 룰 + 레이아웃 권장 간격 |

## 관련 디자인 원칙 (요약)

1. **캔버스 1920×1080** 고정 · 모든 좌표는 절대값(px)
2. **strap 영역** · `top:980` 이상은 푸터. 본문은 `top + height ≤ 970`
3. **겹침 금지** · 텍스트와 도형은 시각적으로 겹치면 안 됨. 의도된 layering(그라디언트 위 텍스트)은 예외
4. **SVG 내부 좌표** · `<g transform>` 중첩 시 절대좌표 = 부모 transform 누적
5. **카드 자동 확장 방지** · grid는 `grid-template-rows:repeat(N, XXXpx)` 명시
6. **우상단 아이콘** · `top:24 right:24` 표준. 카드 폭 <400px일 때 헤더와 충돌 위험

자세한 룰은 `curriculum/_design-system/README.md` 의 **겹침 방지 체크리스트** 표 참조.
