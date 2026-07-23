---
name: quality-review-6axis
description: 카피를 6축(명확성·타겟·차별성·CTA·브랜드일관성·규제안전성)으로 점수화. quality-reviewer-6axis 에이전트가 호출.
---

# 6축 카피 검수 스킬

## 6축 정의

### 1. 명확성 (Clarity)
첫 문장에 핵심 메시지가 있는가? 7초 안에 이해되나?
- 0: 핵심을 찾을 수 없음
- 5: 첫 5단어에 핵심이 명확

### 2. 타겟 적합성 (Relevance)
페르소나·고민에 정확히 닿는가?
- 0: 일반론
- 5: 페르소나의 정확한 고민 단어 사용

### 3. 차별성 (Differentiation)
경쟁사 평균 카피와 구분되나?
- 0: 어디서나 볼 수 있는 카피
- 5: 본 브랜드만의 메커니즘·표현

### 4. CTA 강도 (Action)
- 0: CTA 없음 또는 약함
- 5: 명령형 + 긴급성 + 혜택

### 5. 브랜드 일관성 (Voice)
- brand-voice 가이드의 톤 준수
- 어휘·금기어 점검
- 0~5

### 6. 규제 안전성 (Compliance)
- 화장품: 식약처 광고 가이드
- 일반: 표시광고법, 소비자보호법
- **2점 이하 = 자동 차단**

## 입력
```yaml
copy:
  headline: "..."
  body: "..."
  cta: "..."
context:
  channel: "Meta"
  audience: "..."
  brand_voice: "(자동 로드)"
```

## 출력
```yaml
scores:
  clarity: 4.5
  relevance: 4.0
  differentiation: 3.0
  action: 4.5
  voice: 3.5
  compliance: 3.5
average: 3.83
verdict: "OK" | "REVISION_RECOMMENDED" | "BLOCKED"
issues:
  - axis: "differentiation"
    reason: "경쟁사 평균이 '21일 챌린지' · 본 카피는 숫자만 다름"
    suggestion: "구체적 메커니즘 1줄 추가"
revision_draft:    # verdict가 REVISION_RECOMMENDED일 때만
  headline: "..."
  body: "..."
  cta: "..."
```
