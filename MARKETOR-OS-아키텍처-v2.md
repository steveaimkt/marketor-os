# Marketor OS · 100 Skills 오케스트레이터 아키텍처 **v2**
> 2026.07.05 | v1(2026.07.04) + **agency-agents(msitarzewski, ★127k) `strategy/` 계층 이식**
> v1 대비 델타만 이 문서에 정리. v1의 §1·§5·§6·§7(상업모델·로드맵·해자)은 유효 · 여기선 **오케스트레이션 배선**을 채운다.

---

## v2가 채우는 것 · v1의 약점은 "배선"이었다
v1은 **부품 규격(스킬 헤더)**은 최상급인데 **부품을 잇는 배선(오케스트레이션)**이 선언만 있고 규격이 없었다.
agency-agents의 `strategy/` 폴더가 정확히 그 배선의 완성품이다. 아래 5개를 이식했다.

| # | 이식 항목 | v1 상태 | v2 반영 | 실제 구현 위치 |
|---|---|---|---|---|
| ⓵ | **핸드오프 계약** | `chains_to`(방향만) | 계약 4블록(화물) | `agents/_conventions.md` §B + orchestrator §3.6 |
| ⓶ | **가동 모드** Micro/Sprint/Full | 없음 | 스코프→로스터 선택 | `_conventions.md` §C + orchestrator §3.5 |
| ⓷ | **공유 메모리** | build-log(쓰기전용) | 태그드 recall + 롤백 | **이미 gbrain 구현** · §A로 강화 |
| ⓸ | **게이트 모델** | compliance 1종 | 기본값=반려 + 게이트키퍼 | `_conventions.md` §D + orchestrator §8 |
| ⓹ | **CI 오리지널리티** | 사람 심사 | 자동 lint(백로그) | 미구현 · 아래 로드맵 |

---

## ⓵ 핸드오프 계약 · "no agent starts cold"
스킬 A→B 위임 시 프롬프트가 아니라 **계약**을 넘긴다:
```
HANDOFF → <받는 스킬>
- Context     : 완료한 것 / 산출물 경로·gbrain 태그 / 브랜드=profile / 제약
- Deliverable : 다음이 만들 것 + 측정 인수기준(□ 체크박스)
- Quality     : 완료 증명(수치·근거). 주관 판정 금지.
- Gate        : 발행물이면 통과할 게이트 명시
```
`chains_to`가 방향, 이 4블록이 화물. **이것이 "스킬 모음이 아니라 OS"의 증거** · v1 §7 해자 ③(스킬 간 체인·핸드오프)의 실제 구현.

## ⓶ 가동 모드 · 100개 중 몇 개를 켜나 (= 상업 층)
| 모드 | 범위 | 상업 층 매핑 |
|---|---|---|
| **Micro** | 1개 | 오픈코어 무료 10 / 스킬샵 단건 |
| **Sprint** | 3~6개(플러그인 팩 로스터) | 플러그인 팩 |
| **Full** | 전체 4페이즈 | Marketor OS Full 구독 |

가동 모드가 곧 가격 티어다 · v1 §5 상업모델과 1:1. 오케스트레이터가 intake에서 모드부터 확정.

## ⓷ 공유 메모리 = 이미 gbrain (강화만)
v1의 build-log는 카운터(쓰기 전용)였다. agency-agents `workflow-with-memory` 패턴 = **태그드 recall + 세션 넘는 지속 + last-known-good 롤백**.
→ 실제 시스템은 이미 gbrain(로컬 PGLite)으로 이 패턴을 갖고 있다. v2는 **브랜드명 태그 필수 + 롤백**을 공통규약 §A에 명문화.
`profile.md`(정적 브랜드) + `gbrain`(동적 산출물 태그드) = **재질문 제로**. build-log는 gbrain의 부산물로 자동 집계.

## ⓸ 게이트 모델 · defaults to NEEDS WORK
- 품질 게이트 **기본값 = 반려**. 수치·근거 있어야 통과(Reality Checker "defaults to NEEDS WORK" 이식).
- 커맨드(워크플로 10종)마다 **게이트키퍼 + 통과요건** 지정 · 예: `광고닥터`는 "ROAS 개선폭 근거데이터" 없으면 다음 단계 불가.
- 대외 발행물 = compliance 게이트 의무. 최대 3회 재시도 후 에스컬레이션.

## ⓹ CI 오리지널리티 (백로그)
agency-agents `scripts/check-agent-originality.sh` + `lint-agents.sh` + GitHub Actions = **템플릿 복붙 스킬을 PR 단계에서 자동 차단**.
→ v1 §4 "인증 빌더 심사"를 사람이 아니라 **CI 게이트**로. 오리지널리티 자동검사 = v1 §7 해자 ④의 자동 방어.
지금은 git 리포가 아니라 미구현 · **오픈코어 공개 시점에 도입**(2단계).

---

## 2차 이식 (짧게)
- **의존성 매트릭스**: `chains_to`(국소) → routing.json에 producer→consumer **전역 그래프** → 다중 스킬 체인 자동설계.
- **i18n = 번역이 아니라 현지 오리지널**: zh 포크 "141 번역 + 46 중국시장 전용 신규". v1 Stage 3 "○○ OS 포크"는 `agent-names-*.json` 카탈로그 + 스크립트 + **시장 전용 스킬**로.
- **온보딩 = install.sh 인터랙티브 로스터 선택**: `/마케터OS셋업`을 "도구 감지→체크박스 선택" UX로.
- **RICE 스코어링**: 콘텐츠/캠페인 백로그 우선순위 프레임(v1에 없음) → `콘텐츠공장`·`월간결산`에 삽입.
- **참고**: agency-agents `examples/workflow-book-chapter.md` = 책집필 파이프라인 레퍼런스.

---

## 실제 시스템 반영 현황 (marketing-os, 29 에이전트)
| 계층 | 파일 | 상태 |
|---|---|---|
| 공통 규약(⓵⓶⓷⓸) | `agents/_conventions.md` | ✅ 신설 |
| 오케스트레이터 배선 | `agents/orchestrator.md` §2·§3.5·§3.6·§8 | ✅ 반영 |
| 개별 에이전트 헤더 규격 | `agents/part*/*.md` | 🔄 진행 · persona·when_to_use·success_metrics·chains_to·gate + 핸드오프 계약 |

> 설계서(marketor-os, 100 스킬)는 **목표 아키텍처**. 실제 자산(marketing-os, 29)의 재구조화가 1단계 · v1 §6 로드맵과 동기.
