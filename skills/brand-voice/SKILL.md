---
name: brand-voice
description: 본 브랜드의 톤·어휘·금기어·페르소나를 일관되게 적용하는 글쓰기 스킬. 노션 "Brand Voice" 페이지를 자동 로드해 다른 에이전트가 호출.
---

# 브랜드 톤 적용 스킬

## 언제 호출하나
- 거의 모든 카피 생성 에이전트가 출력 직전 호출 (newsletter-writing, ad-copy-ab, landing-copy 등)
- 직접 호출 가능: `claude "Skill brand-voice로 다음 글 톤 조정: ..."`

## 입력
```yaml
draft_text: "원본 글"
brand_voice_page: "노션 'Brand Voice' 페이지 ID 또는 URL"
strictness: "high"   # high / medium / low
```

## 워크플로

1. 노션에서 Brand Voice 페이지 로드
2. 입력 글을 다음 5단계로 조정:
   - **금기어 제거** · `forbidden` 목록의 단어를 동의어로 치환
   - **어휘 강화** · `vocabulary` 목록의 어휘를 자연스럽게 포함
   - **문장 길이** · 평균 길이에 맞춰 분할/병합
   - **톤 조정** · tone 가이드와 맞지 않는 표현 교정
   - **페르소나 호명** · 적절한 곳에 페르소나 호칭 (예: "당신")
3. 조정 전후 비교 표 출력

## 출력
```yaml
adjusted_text: "조정된 글"
changes_log:
  - "'미백' → '맑은 톤' (금기어 제거)"
  - "'좋아진다' → '21일 후 -38%' (어휘 강화 + 데이터 헤드라인)"
  - "긴 문장 분할: 78자 → 35자 + 32자"
strictness_score: 4.5   # 0~5
```

## 검증
- 조정 후 글이 본 글의 의도를 유지하나 (의미 손실 점검)
- 길이 변동 ±10% 이내
