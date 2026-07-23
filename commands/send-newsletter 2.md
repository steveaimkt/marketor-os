---
description: 트렌드·자료 → 뉴스레터 → Gmail 발송 (사람 승인 후)
---

# /send-newsletter

`agents/part3-content/email-newsletter.md` 에이전트를 1회 호출하는 진입점.

## 사용 시점

- **수동**: `claude -p "/send-newsletter"` 또는 Discord에서 `/send-newsletter`
- **자동**: 일부 명령은 `/daily-briefing`·`/weekly-report` 안에서 묶여 호출됨

## 동작

`agents/part3-content/email-newsletter.md`에 정의된 워크플로를 그대로 실행하세요. 트리거 frontmatter의 schedule을 확인하고, 사용자 승인이 필요한 액션(외부 발행·광고 변경 등)은 반드시 require-approval hook을 거치세요.

## 산출물

해당 에이전트의 `outputs` frontmatter를 따릅니다 (Discord embed · Notion 페이지 · Sheets 행 등).
