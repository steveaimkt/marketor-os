---
description: 보이스·톤·페르소나 추출 → Notion 가이드 페이지
---

# /research-brand

`agents/part5-copy/brand-guidelines.md` 에이전트를 1회 호출하는 진입점.

## 사용 시점

- **수동**: `claude -p "/research-brand"` 또는 Discord에서 `/research-brand`
- **자동**: 일부 명령은 `/daily-briefing`·`/weekly-report` 안에서 묶여 호출됨

## 동작

`agents/part5-copy/brand-guidelines.md`에 정의된 워크플로를 그대로 실행하세요. 트리거 frontmatter의 schedule을 확인하고, 사용자 승인이 필요한 액션(외부 발행·광고 변경 등)은 반드시 require-approval hook을 거치세요.

## 산출물

해당 에이전트의 `outputs` frontmatter를 따릅니다 (Discord embed · Notion 페이지 · Sheets 행 등).
