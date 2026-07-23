---
description: AX 팀 전체 가동 · 4 페이즈 (리서치 → 분석 → 합성 → 발송)
---

# /ax-team-run <시나리오>

## 시나리오
- `daily` · 매일 30분 (간단 버전)
- `weekly` · 매주 월 15~20분 (전체 가동) **← 기본**
- `monthly` · 월간 종합 (LTV + 전략 보고서 포함)
- `quarterly` · 분기 전략 보고서 모드

## /ax-team-run weekly 흐름

```
[Phase 1] 리서치 (병렬)
  ┌── trend-scanner
  ├── competitor-monitor
  ├── ad-reference-collector
  └── voc-analyzer

[Phase 2] 분석 (병렬)
  ┌── ga4-analyzer
  ├── meta-ads-analyzer
  ├── google-ads-analyzer
  ├── naver-ads-analyzer
  ├── ad-performance-checker
  └── ltv-analyzer (월요일 1회 한정 · 매주 호출 시 비용 절약)

[Phase 3] 합성 (순차)
  → 3media-integrated-reporter
  → ga4-html-report → ga4-notion-publisher
  → content-calendar (다음 주 Draft 30~50건)
  → ad-copy-ab (이번 주 핵심 메시지 10패턴)

[Phase 4] 발송 (병렬)
  → Discord #marketing-os: 종합 embed + HTML 첨부 + 노션 링크
  → Discord #marketing-approvals: content-publisher 큐잉 승인 요청
  → (선택) Gmail: 사내 stakeholder 발송
```

## 안전
- 광고비 변경·발송은 모두 사용자 reaction 후
- 한 번 실행 시 약 60건 LLM 호출 → 비용 알림

## 디스코드 종합 embed 예시

```json
{
  "title": "🏢 마케팅 OS 주간 종합 W{주차}",
  "description": "60개 에이전트 호출 완료 · 약 18분",
  "fields": [
    {"name": "🔍 리서치", "value": "트렌드 12 / 경쟁사 8 변경 / VoC TOP 3"},
    {"name": "📊 광고", "value": "ROAS 3.2 · 채널 분배 추천"},
    {"name": "📈 GA4", "value": "세션 +18% / 전환 +25%"},
    {"name": "🎯 다음 주", "value": "콘텐츠 32건 / 카피 10패턴 / 강조 페르소나 #2"},
    {"name": "🔗 산출물", "value": "[HTML 리포트](URL) · [노션 종합](URL)"}
  ]
}
```
