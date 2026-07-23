---
description: 주간 종합 리포트 · GA4 + 3대 매체 광고 + LTV
---

# /weekly-report

매주 월 09:00 자동 또는 수동.

## 동작 (체인)
1. `ga4-analyzer` → 데이터 추출
2. `ga4-html-report` → HTML 생성
3. `3media-integrated-reporter` → 광고 통합
4. `ltv-analyzer` → 월 1회 (월요일이면)
5. `ga4-notion-publisher` → 노션·디스코드 발송

## 결과
- 노션: GA4 페이지 + 3매체 페이지
- 디스코드: HTML 첨부 + 종합 embed
- 시간: 약 8~12분
