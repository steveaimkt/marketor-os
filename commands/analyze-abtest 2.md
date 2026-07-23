---
description: A/B 테스트 결과 자동 해석 → Notion 라이브러리 정리
---

# /analyze-abtest

`agents/part6-ads/ab-test-analyzer.md` 에이전트를 1회 호출하는 진입점.

## 사용 시점

- **수동**: `claude -p "/analyze-abtest"` 또는 Discord에서 `/analyze-abtest`
- **자동**: 일부 명령은 `/daily-briefing`·`/weekly-report` 안에서 묶여 호출됨

## 동작

`agents/part6-ads/ab-test-analyzer.md`에 정의된 워크플로를 그대로 실행하세요. 트리거 frontmatter의 schedule을 확인하고, 사용자 승인이 필요한 액션(외부 발행·광고 변경 등)은 반드시 require-approval hook을 거치세요.

## 산출물

해당 에이전트의 `outputs` frontmatter를 따릅니다 (Discord embed · Notion 페이지 · Sheets 행 등).
