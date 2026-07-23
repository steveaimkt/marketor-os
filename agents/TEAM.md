# TEAM.md · marketing-os 에이전트 조직 헌장 (2계층)

> "부조종사가 아니라 팀이다." 2026-07-16 MSK(marketing 100 skills) 부서장 조직을 결합해 2계층으로.
> 방법론(스킬·게이트 룰)은 MSK 참조·복사 금지 / **브랜드 데이터(profile·tone·my-playbook)는 `marketing-os/brand/` 소유**(WMBB 배치 정본 · MSK 촬영 리셋과 무관) / 실행력(gbrain·MCP·도구)은 marketing-os.
> MSK 접근은 `marketing-os/msk` 심링크 경유(폴더 이동 시 링크 1개만 갱신) · 건강검진: `scripts/check-org-drift.sh`

## 조직도
```
사용자 (CEO · 모든 ⏸승인의 최종 결재권자)
   │
트루먼 (오케스트레이터 · agents/orchestrator.md · SSOT)
   │
   ├─ 부서장 10 (agents/leads/)
   │   research(001~010)·product(011~020)·content(021~030)·social(031~040)·ads(041~050)
   │   ·commerce(051~060)·analytics(061~070)·crm(071~080)·brand-sales(081~090)·ops(091~100)
   │      └ 각 부서장은 담당 Part 실행 에이전트를 도구로 사용
   │
   ├─ 스태프 3 (agents/staff/)
   │   perspective-reviewer (5관점 병렬·sonnet) · gate-auditor (유일 ⛔) · skill-builder (제작 전담)
   │
   ├─ Part0 운영팀 (agents/part0-ops/) · steve 일상 운영 (채널브리핑·기획·감사 등)
   └─ Part3~9 실행 에이전트 28 (부서장이 지휘하는 실행자, canonical_skill 배선)
```

## 부서장 → Part 실행 에이전트 매핑
| 부서장 | 담당 Part 실행 에이전트 | 직속 없는 스킬(정본 직접 실행) |
|---|---|---|
| research-lead | part4-research 5종 | 004·007·008·009·010 |
| product-lead | · | 011~020 전부 (신규 도메인) |
| content-lead | part3(2)·part5 content-calendar·linkedin | 022·024·025·026·029·030 |
| social-lead | · | 031~040 전부 |
| ads-lead | part6-ads 6종·ad-copy-ab | 044·048·049·050 |
| commerce-lead | landing-copy(051) | 052~060 |
| analytics-lead | part7-ga4 3종·ltv-analyzer | 061·062·065·066·068·069·070 |
| crm-lead | part8-crm 3종 | 074·075·076·077·079·080 |
| brand-sales-lead | brand-guidelines·strategy-report | 083·084·085·086·087·088·089·090 |
| ops-lead | part10 2종·marketing-calendar | 091·093~100 (092=skill-builder) |

## 운영 규약 (정본: agents/_conventions.md)
- **업무 브리핑 게이트**(§E): 실행 전 부서장 명의 1화면 계획→⏸ / **결과확인+개선 루프**(§F)
- **실데이터 우선**(§G): 측정 도구 있으면 추정 금지 / **권한 분리**(§H): 제작·품질·규제 상호 대행 불가
- **핸드오프 계약**(§B) · **gbrain 복리**(§A) · **게이트 기본 반려**(§D)

## 협업 5원칙
1. 피드포워드(앞 산출물=다음 입력) 2. 단일 보고선(부서장→트루먼만, 사용자 대면은 트루먼 조립)
3. 권한 분리(⛔ 번복은 사용자만) 4. 병렬 우선 5. 기록 의무(build-log 1행/산출물)

## 확장·모델
- 부서장·스태프 추가는 이 문서 + agents/leads|staff/ 동시 등록(한쪽만=유령 조직)
- perspective-reviewer = `model: sonnet`(판정 전용·5병렬, 비용 최적화). 나머지 = 세션 모델 상속

## 드리프트 룰 (MSK 원본 13과의 관계)
- leads/·staff/ 13 = MSK `.claude/agents/` 13의 **WMBB 배치판** (각 파일 frontmatter `origin:` 참조)
- 조직 **설계** 변경(역할·권한·브리핑 규칙) → **MSK에서 먼저** 수정(제품 정본) 후 여기 재적용
- WMBB **배선** 변경(Part 매핑·gbrain·도구) → 여기서만, MSK 역류 금지 (상품 순수성)
- MSK/release·수강생 배포판은 빌드 산출물/동결 · 직접 수정 금지
- **드리프트 감시**: `scripts/check-org-drift.sh` (심링크·브랜드 허브·13쌍 mtime·정족수) · 주간 회고 때 1회 실행 권장
