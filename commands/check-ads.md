---
description: 광고 임계치 1회 점검 (A17 ad-performance-checker 호출). 매시간 cron으로도 자동 실행됨.
---

# /check-ads

광고 24/7 워치독을 1회 호출. 임계치 위반이 발견되면 디스코드 #marketing-alerts 채널에 embed 알림이 발송되고, 위반이 없으면 조용히 로그만 남깁니다.

## 사용 시점

- **자동**: `launchctl`로 매시간 0분에 자동 실행 (automation/launchd/com.marketing-os.hourly-ad-check.plist)
- **수동**: 광고 캠페인 변경 직후 검증할 때 `claude -p "/check-ads"` 또는 Discord `/check-ads`

## 동작

`ad-performance-checker` 서브에이전트를 호출. 시스템 프롬프트에 정의된 임계치(ROAS·CPA·CTR·예산 초과)를 따라 Meta·Google 광고 데이터를 조회·비교.

## 시스템 프롬프트 (오케스트레이터에게)

```
당신은 광고 워치독 호출자입니다.

1. agents/part6-ads/ad-performance-checker.md 의 워크플로를 1회 실행
2. 임계치 위반이 1건이라도 있으면 디스코드 #marketing-alerts 에 embed 발송
3. 위반이 없으면 아무것도 발송하지 않음 (스팸 방지) · 결과 요약은 stdout으로만 출력
4. 모든 도구 호출은 메타·구글·디스코드 MCP만 사용 (다른 MCP 호출 금지)
5. 5분 안에 완료. 늦어지면 부분 결과라도 알림

위반 시 embed 포맷:
- title: "🚨 광고 임계치 위반 알림"
- color: 15158332 (빨강)
- fields: 위반 캠페인 1줄씩 + 조치 후보 박스

위반 없을 때 stdout:
- "✅ 광고 점검 완료 · 위반 0건 · 검사 캠페인 {N}개"
```

## 환경변수 (.env)

| 변수 | 기본값 | 의미 |
|---|---|---|
| `THRESHOLD_ROAS_WARN` | 2.0 | ROAS 경고 임계치 |
| `THRESHOLD_ROAS_BLOCK` | 1.0 | ROAS 차단 임계치 (Critical) |
| `THRESHOLD_CPA_WARN` | 30000 | CPA 경고 (원) |
| `THRESHOLD_CPA_BLOCK` | 50000 | CPA 차단 |
| `THRESHOLD_CTR_WARN` | 0.01 | CTR 경고 (1%) |
| `THRESHOLD_DAILY_BUDGET_WARN` | 1.1 | 예산 초과율 경고 (110%) |
| `THRESHOLD_DAILY_BUDGET_BLOCK` | 1.3 | 예산 초과율 차단 (130%) |

## 위반 시뮬레이션 (테스트용)

```bash
# 모든 ROAS가 위반으로 잡히게 강제
THRESHOLD_ROAS_BLOCK=99 bash automation/cron-jobs/hourly-ad-check.sh
# → #marketing-alerts에 위반 embed 도착 확인
```

## 관련 자산

- 호출 대상: `agents/part6-ads/ad-performance-checker.md`
- cron wrapper: `automation/cron-jobs/hourly-ad-check.sh`
- launchd: `automation/launchd/com.marketing-os.hourly-ad-check.plist`
- 진입점: `automation/run-cron.sh "hourly-ad-check" "/check-ads"`
