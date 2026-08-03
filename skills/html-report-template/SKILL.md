---
name: html-report-template
description: 광고·GA4·VoC 리포트의 표준 HTML 템플릿. 모든 에이전트가 호출하면 일관된 디자인의 단일 파일 HTML(.html) 생성.
---

# HTML 리포트 표준 템플릿 스킬

## 디자인 원칙
- **단일 파일** · CSS/JS 인라인 → 디스코드 첨부 후 바로 열림
- **모바일 우선** · 1인 마케터는 폰에서 자주 확인
- **인쇄 가능** · `@media print` 포함
- **다크 모드 자동** · `prefers-color-scheme`

## 표준 섹션

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{리포트 제목} · {날짜}</title>
  <style>{인라인 CSS · Pretendard 폰트, 미니멀}</style>
</head>
<body>
  <header>
    <h1>{제목}</h1>
    <p class="meta">{기간} · {매체} · 생성: {타임스탬프}</p>
  </header>

  <section class="kpi">
    {KPI 카드 4개 · 총 광고비, 매출, ROAS, 전환}
  </section>

  <section class="highlights">
    <h2>이번 주 핵심 3가지</h2>
    {텍스트 3개}
  </section>

  <section class="charts">
    <h2>차트</h2>
    {Chart.js inline 또는 SVG 직접}
  </section>

  <section class="tables">
    <h2>상세 데이터</h2>
    {정렬·필터 가능한 표 (HTML + 가벼운 JS)}
  </section>

  <section class="actions">
    <h2>다음 액션</h2>
    {권장 액션 3~5개 · 체크박스 형식}
  </section>

  <footer>marketing-os · 자동 생성</footer>
</body>
</html>
```

## 입력
```yaml
report_type: "meta-ads" | "google-ads" | "3media" | "ga4" | "voc"
title: "Meta 광고 주간 리포트 W20"
period: "2026-05-08 ~ 05-14"
kpis:
  - label: "광고비", value: "₩2.35M", delta: "+5%"
  - label: "매출", value: "₩7.5M", delta: "+12%"
  - label: "ROAS", value: "3.2", delta: "+0.4"
  - label: "전환", value: "184", delta: "+18"
highlights:
  - "신학기 모공 케어 캠페인 ROAS 4.8"
  - "광고비 ROI는 +12% 개선"
  - "조치 필요: 2개 캠페인 ROAS < 2"
charts:
  - type: "line", title: "일별 ROAS", data: [...]
tables:
  - title: "캠페인별 상세"
    columns: ["캠페인", "광고비", "ROAS"]
    rows: [...]
actions:
  - "ROAS<2 캠페인 2개 점검 (어디서/얼마)"
  - "TOP 캠페인 예산 +20% 검토"
output_path: "outputs/{날짜}/{report_type}-{날짜}.html"
```

## 출력
- 단일 .html 파일
- 디스코드 webhook으로 첨부 (다음 단계는 다른 에이전트가)

## 검증
- 파일 크기 < 500KB
- 모바일 가로 폭 360px에서 가로 스크롤 없음
- 다크 모드 자동 전환
