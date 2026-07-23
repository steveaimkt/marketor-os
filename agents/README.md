# agents/ · 에이전트 정본 폴더 (여기서만 수정)

> 2026-07-15 정리. 호출은 frontmatter `name:` 기반이라 폴더 이동이 라우팅에 영향 없음.

## 구조

| 폴더 | 팀 | 수 |
|---|---|---|
| `orchestrator.md` | 🧠 트루먼 · 단일 두뇌 (SSOT) | 1 |
| `TEAM.md` | 조직 헌장 (2계층: 부서장10+스태프3+실행28) | 1 |
| `_conventions.md` | 공통 규약 A~H (핸드오프·가동모드·게이트·브리핑·결과확인·실데이터·권한분리) | 1 |
| `leads/` | 부서장 10 (카테고리 위임·방법론 결정, Part를 도구로) · 2026-07-16 MSK 결합 | 10 |
| `staff/` | 스태프 3 (perspective-reviewer·gate-auditor·skill-builder) | 3 |
| `../brand/` | 🏷 **WMBB 브랜드 허브** (profile·tone·my-playbook · 배치 정본, MSK 리셋 무관) | 3 |
| `part0-ops/` | 운영팀 · 채널브리핑·강의제작·기획·성장감사·데일리브리프·유튜브브리프·슬라이드검수 | 7 |
| `part3-content/` | 콘텐츠 발행 | 2 |
| `part4-research/` | 리서치 | 5 |
| `part5-copy/` | 카피 | 6 |
| `part6-ads/` | 광고 분석 | 6 |
| `part7-ga4/` | GA4 | 3 |
| `part8-crm/` | CRM | 3 |
| `part9-expansion/` | 전략·확장 | 3 |
| `part10-production/` | 제작·검토 (gstack 연동) · design-producer·plan-reviewer | 2 |
| `_archive/` | 옛 백업(.bak) 격리 | · |

**Part3~9 = 28개** · v2 규격 적용 (persona·when_to_use·success_metrics·chains_to·gate + 핸드오프 계약 + canonical_skill 20개).

## 다른 곳에 있는 "에이전트"와의 관계

| 위치 | 정체 | 규칙 |
|---|---|---|
| **여기 (agents/)** | 실행팀 정본 · 리드10·스태프3·실행28·운영7·제작2 | ✏️ 수정은 여기서만 |
| `curriculum/part03~09/*/agent.md` | 강의 실습 자료 | 심링크 → 본체 자동 동기 (건드리지 않음) |
| `curriculum/marketing-team/agents/` | 교육 배포 스냅샷 (7/6판, gbrain 제외 단순판) | 🧊 의도적 동결 · 덮어쓰지 말 것 |
| `MSK/.claude/agents/` (13) | **제품 원본** · 판매 번들의 조직 부품. 여기 `leads/`·`staff/`의 출처 | 📦 상품 · WMBB 특화 넣지 말 것 |
| `MSK/release/…/agents/` (13) | 릴리스 빌드 산출물 | 🤖 릴리스 프로세스가 재생성 · 직접 수정 금지 |
| `MSK/plugins/·brand/·gates/` | 방법론·브랜드·게이트 정본 | 📚 참조 전용 · 복사 금지 (orchestrator §3.7) |
| `../../marketing-os-수강생-에이전트스킬/` | 수강생 배포판 (7/13) | 🧊 배포 동결 |

**드리프트 룰 (13쌍 조직 에이전트)**: `leads/`·`staff/` = MSK 13의 **WMBB 배치판**(Part 지휘·gbrain·절대경로 배선 추가).
조직 **설계** 변경(역할·권한·브리핑 규칙)은 **MSK에서 먼저**(제품 정본) → 여기 재적용. WMBB **배선** 변경(Part 매핑·도구)은 여기서만 · MSK로 역류 금지.
