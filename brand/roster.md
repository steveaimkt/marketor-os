# 에이전트 편성표 (roster.md) · 이식 파일럿용

> **이 파일의 정체**: 71명 전체를 그대로 얹지 않고, 그 회사가 **실제로 하는 업무**(org-map.md §2)에 해당하는 에이전트만 켜는 편성표.
> 판단 기준(패널 결론): **"이 업무를 실제로 하는가"** 하나. 사람 수와 1:1 매핑하지 않는다.
> 비활성 = 삭제가 아니라 "이번 회사에선 안 씀" 표시. 나중에 그 업무가 생기면 켠다.

## 상태
- [ ] 미작성 (템플릿) — org-map.md를 먼저 채운 뒤, 그 §2 업무표를 보고 아래를 사람이 표시한다.
- 채우는 법: 각 행 `켤까?`에 ✅(활성) / ⬜(비활성) / 🔧(업종 맞춤 필요) 표시.

## 항상 켜짐 (코어 · 회사 무관)
| 에이전트 | 역할 | 비고 |
|---|---|---|
| orchestrator (트루먼) | 단일 두뇌·라우팅 | 회사명·페르소나명은 이식 시 치환 |
| gate-auditor | 규제 발행 차단 ⛔ | **금기어 세트를 업종별로 교체** 🔧 |
| quality-reviewer-6axis | 품질 6축 채점 | |
| perspective-reviewer | 관점 검수 5인 | |
| skill-builder | 스킬 제작 | |

## 부서장 10 (업무 카테고리 존재 시 켬)
| 부서장 | 담당 스킬 | 켤까? | 근거(org-map §2 어느 업무) |
|---|---|---|---|
| research-lead | 001~010 시장조사 | ⬜ | |
| product-lead | 011~020 제품기획 | ⬜ | |
| content-lead | 021~030 콘텐츠 | ⬜ | |
| social-lead | 031~040 소셜 | ⬜ | |
| ads-lead | 041~050 광고 | ⬜ | **광고 미집행이면 끔** |
| commerce-lead | 051~060 커머스 | ⬜ | |
| analytics-lead | 061~070 데이터 | ⬜ | |
| crm-lead | 071~080 CRM | ⬜ | |
| brand-sales-lead | 081~090 브랜드세일즈 | ⬜ | |
| ops-lead | 091~100 운영 | ⬜ | |

## 실무 에이전트 50 (해당 업무 있을 때만)
> 아래는 카테고리별 대표만. org-map §2 "매핑 후보" 열과 대조해 켠다.

| 영역 | 에이전트 | 켤까? |
|---|---|---|
| 리서치 | competitor-monitor · trend-scanner · voc-analyzer · seo-keyword-research · ad-reference-collector | ⬜ |
| 콘텐츠 | email-newsletter · content-publisher | ⬜ |
| 카피 | brand-guidelines · ad-copy-ab · landing-copy · content-calendar · linkedin-post-writer | ⬜ |
| 광고 | meta/google/naver-ads-analyzer · 3media-integrated · ad-performance-checker · ab-test-analyzer | ⬜ ⚠️미검증 |
| 데이터 | ga4-analyzer · ga4-html-report · ga4-notion-publisher | ⬜ |
| CRM | cs-responder · customer-data-unifier · ltv-analyzer | ⬜ |
| 확장 | claude-design-prototype · marketing-calendar-builder · strategy-report-generator | ⬜ |
| SNS | threads-writer · instagram-cardnews · sns-reaction-monitor | ⬜ |
| 커뮤니티 | community-onboarder · community-engagement | ⬜ |
| 오케스트레이터 | youtube · campaign · sns · community · edu · publishing | ⬜ |

## ⚠️ 검증 딱지 (패널 고객사 요구 · 필수)
켜는 각 에이전트에 상태를 표시한다 — 뭘 믿고 뭘 검증할지 회사가 알아야 한다.
- **[검증됨]**: WMBB 실전 투입 확인 (예: acquiring-editor·voc-analyzer 계열)
- **[템플릿]**: 구조만 있고 실데이터 미검증 (예: 광고 에이전트 6개 — 반드시 실전 검증 후 투입)

---
> 다음 단계: 이 표가 확정되면 이식판 배포 시 ⬜ 에이전트는 `agents/`에서 제외하거나 비활성 폴더로 내린다.
> 반복 편성 패턴이 쌓이면(파일럿 2~3건) 자동 편성 스킬(`회사셋업`)로 승격.
