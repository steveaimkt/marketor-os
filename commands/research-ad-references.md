---
description: 국내외 광고 소재 수집 → Google Sheets 저장
---

# /research-ad-references

`agents/part4-research/ad-reference-collector.md` 에이전트를 1회 호출하는 진입점.

## 사용 시점

- **수동**: `claude -p "/research-ad-references"` 또는 Discord에서 `/research-ad-references`
- **자동**: 일부 명령은 `/daily-briefing`·`/weekly-report` 안에서 묶여 호출됨

## 동작

`agents/part4-research/ad-reference-collector.md`에 정의된 워크플로를 그대로 실행하세요. 트리거 frontmatter의 schedule을 확인하고, 사용자 승인이 필요한 액션(외부 발행·광고 변경 등)은 반드시 require-approval hook을 거치세요.

## 산출물

해당 에이전트의 `outputs` frontmatter를 따릅니다 (Discord embed · Notion 페이지 · Sheets 행 등).
