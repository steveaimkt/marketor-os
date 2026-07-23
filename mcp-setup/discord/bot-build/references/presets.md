# 프리셋 자동 채움 값 + 매핑 표

> STEP 0.7 에서 사용자가 A~H 선택 시 아래 표 값으로 Q1~Q4 를 자동 채우고 STEP 4 로 점프.
> Z (자유 설계) 의 Q2 분석 시에는 § MCP 키워드 매핑 · § 에이전트 매핑 표 사용.

## 프리셋 A · 📅 일정·메일 매니저 (가장 기본 ⭐)

| 항목 | 값 |
|---|---|
| **Q1 페르소나** | 단일 사용자 · 비서 보고형 · 한국어 · 5줄 이내 + 이모지 절제 |
| **Q2 매일** | 일정+메일 통합 브리핑 · 매일 07:00 · `list_events(today)` + `search_threads(newer_than:1d)` |
| **Q2 매주** | 지난주 회의 요약 + 미답신 메일 정리 · 매주 월 07:00 |
| **Q2 즉시** | VIP 메일 도착 · 일정 변경·취소 알림 (Gmail watch + Calendar push) |
| **Q3 자동 OK** | 조회·요약·Draft 작성 (`list_*` · `search_*` · `get_*` · `read_*`) |
| **Q3 승인 필요** | 메일 발송 · 일정 생성·수정 · 참석자 추가 |
| **Q3 금지** | 메일 삭제 · 일정 삭제 · 회의 취소 |
| **Q4 채널** | 옵션 A (DM 통합) |

활용 MCP : gmail + calendar · 적합 : 직장인·프리랜서·1인 사업자

## 프리셋 B · 📊 마케팅 매니저 (광고·매출 운용)

| 항목 | 값 |
|---|---|
| **Q1 페르소나** | 마케터·1인 사업자 · 부하직원 보고형 · 한국어 + 영문 데이터 · 5줄 + 숫자 강조 |
| **Q2 매일** | `daily-briefing` · 매일 07:00 · 어제 광고 ROAS + 매출 시트 + 새 CS 메일 |
| **Q2 매주** | `weekly-report` + `integrated-ad-report` · 매주 월 07:00 · GA4 + 3매체 광고 + LTV |
| **Q2 즉시** | `check-ads` · 매시간 cron · ROAS < 2.0 또는 -30% 급락 시 디스코드 푸시 |
| **Q3 자동 OK** | 조회·분석 (광고 인사이트 · 시트 read · 메일 search) |
| **Q3 승인 필요** | 메일 발송 · CS 답신 · 일정 생성 |
| **Q3 금지** | 광고 예산 변경 · 캠페인 일시중지·삭제 |
| **Q4 채널** | 옵션 A (DM 통합) 또는 옵션 B (#광고·#CS 분리) |

활용 MCP : meta-ads + google-ads + google-sheets + gmail · 적합 : 광고비 월 100만원+ 마케터·사업자

## 프리셋 C · ✍️ 콘텐츠 매니저 (트렌드·뉴스레터·SNS)

| 항목 | 값 |
|---|---|
| **Q1 페르소나** | 콘텐츠 제작자 · 친근한 어시스턴트 (브랜드 보이스 적용) · 한국어 · 본문은 길게 |
| **Q2 매일** | `research-trend` + `research-competitor` · 매일 07:00 · 트렌드 키워드 + 경쟁사 변경 |
| **Q2 매주** | `email-newsletter` + `send-newsletter` · 매주 월 07:00 · Gmail Draft → 승인 → 발송 |
| **Q2 즉시** | `research-competitor` · 매시간 cron · 경쟁사 사이트·SNS 큰 변경 감지 |
| **Q3 자동 OK** | 트렌드 조회 · 콘텐츠 Draft 작성 · 노션 fetch |
| **Q3 승인 필요** | 발송 · SNS 게시 (Buffer) · 노션 페이지 생성 |
| **Q3 금지** | 브랜드 보이스 변경 · 콘텐츠 삭제 |
| **Q4 채널** | 옵션 B (#콘텐츠 채널 전용 + DM 백업) |

활용 MCP : firecrawl + gmail + notion + buffer · 적합 : 뉴스레터·블로그·SNS 운영자

## 프리셋 D · 🔬 리서치 인텔리전스 (Part 4)

| 항목 | 값 |
|---|---|
| **Q1 페르소나** | 시장 리서치 담당·CMO · 분석가형 (인사이트 중심) · 한국어 + 영문 출처 · 표 + 5줄 |
| **Q2 매일** | `competitor-monitor` + `trend-scanner` · 매일 07:00 · 경쟁사 변경 + 트렌드 키워드 |
| **Q2 매주** | `voc-analyzer` + `seo-keyword-research` + `ad-reference-collector` · 매주 월 07:00 |
| **Q2 즉시** | `competitor-monitor` · 매시간 cron · 가격 변경·신상품 출시·SNS 큰 변경 |
| **Q3 자동 OK** | 경쟁사·트렌드·VoC 조회·분석 |
| **Q3 승인 필요** | 노션 페이지 생성 · 보고서 게시 |
| **Q3 금지** | 외부 사이트 자동 액션·구매 |
| **Q4 채널** | 옵션 B (#리서치 채널 + DM) |

활용 MCP : firecrawl + youtube-data + google-sheets + notion · 적합 : 시장 리서치·신상품 기획·CMO

## 프리셋 E · 📝 콘텐츠 파이프라인 (Part 3+5)

| 항목 | 값 |
|---|---|
| **Q1 페르소나** | 콘텐츠 마케터 · 브랜드 보이스 적용 · 한국어 · 본문 길게 + 카피 짧게 |
| **Q2 매일** | `content-calendar` · 매일 07:00 · 오늘·내일 예약 콘텐츠 + 어제 발행 성과 |
| **Q2 매주** | `email-newsletter` + `ad-copy-ab` + `quality-reviewer-6axis` · 매주 월 07:00 |
| **Q2 즉시** | `quality-reviewer-6axis` · 발행 직전 폴링 · 품질 < 3.5 또는 브랜드 가이드라인 위반 |
| **Q3 자동 OK** | 콘텐츠 Draft·캘린더 조회·6축 점수 |
| **Q3 승인 필요** | 발송·SNS 게시 (Buffer)·노션 페이지 생성·Figma 디자인 작업 |
| **Q3 금지** | 브랜드 가이드 변경·콘텐츠 삭제 |
| **Q4 채널** | 옵션 B (#콘텐츠 + #발행 분리) |

활용 MCP : gmail + notion + buffer + figma + canva + higgsfield · 적합 : 콘텐츠 마케터·뉴스레터 기획자

## 프리셋 F · 💰 광고 옵스 (Part 6)

| 항목 | 값 |
|---|---|
| **Q1 페르소나** | 퍼포먼스 마케터 · 데이터 보고형 (숫자 중심) · 한국어 + 영문 캠페인명 · 3줄 + 표 |
| **Q2 매일** | `analyze-meta` + `analyze-google-ads` + `analyze-naver-ads` · 매일 07:00 · 3매체 ROAS + CPA |
| **Q2 매주** | `integrated-ad-report` + `analyze-abtest` · 매주 월 07:00 · 3매체 통합 HTML + A/B 결과 |
| **Q2 즉시** | `check-ads` · 매시간 cron · ROAS < 2.0 · -30% 급락 · CPA 초과 |
| **Q3 자동 OK** | 광고 조회·분석·인사이트·A/B 통계 |
| **Q3 승인 필요** | 광고 콘셉트 변경·A/B 테스트 시작·신규 캠페인 생성 |
| **Q3 금지** | 예산 변경·캠페인 일시중지·삭제 |
| **Q4 채널** | 옵션 B (#광고 + #알림 분리) |

활용 MCP : meta-ads + google-ads + naver-ads (WebFetch) + notion · 적합 : 광고비 월 500만원+ 퍼포먼스 마케터

## 프리셋 G · 📊 GA4 데이터 분석 (Part 7)

| 항목 | 값 |
|---|---|
| **Q1 페르소나** | 데이터 분석가·이커머스 운영자 · 분석가형 (이상치 강조) · 한국어 + 영문 메트릭명 · 표 + 차트 |
| **Q2 매일** | `ga4-analyzer` · 매일 07:00 · 어제 트래픽·전환·이탈률 + 경로별 분석 |
| **Q2 매주** | `ga4-html-report` + `ga4-notion-publisher` · 매주 월 07:00 · 주간 HTML 리포트 + 노션 게시 |
| **Q2 즉시** | `ga4-analyzer` · 매시간 cron · 전환율 -50% 급락·트래픽 급증/급감·결제 이탈 |
| **Q3 자동 OK** | GA4 모든 조회·리포트 작성 |
| **Q3 승인 필요** | 노션 페이지 게시·HTML 리포트 외부 공유 |
| **Q3 금지** | GA4 설정 변경·이벤트 삭제 |
| **Q4 채널** | 옵션 B (#분석 + DM) |

활용 MCP : ga4 + notion + google-sheets · 적합 : 데이터 분석가·이커머스 운영자·그로스 해커

## 프리셋 H · 🎯 CRM 리텐션 (Part 8)

| 항목 | 값 |
|---|---|
| **Q1 페르소나** | CS 매니저·고객 성공 · 친절한 보고형 · 한국어 · 5줄 + 발신자 강조 |
| **Q2 매일** | `cs-responder` · 매일 07:00 · 새 CS 메일 분류 (긴급/환불/일반/스팸) + 답신 Draft + VIP 알림 |
| **Q2 매주** | `ltv-analyzer` + `customer-data-unifier` · 매주 월 07:00 · LTV 세그먼트 + 이탈 위험 + 리텐션 추천 |
| **Q2 즉시** | `cs-responder` · 메일 도착 즉시 · 컴플레인·VIP 컴플레인·결제 오류 (사용자 승인 게이트) |
| **Q3 자동 OK** | CS 메일 조회·분류·LTV 분석·Draft 작성 |
| **Q3 승인 필요** | 메일 발송·VIP 컴플레인 답신·환불 처리 |
| **Q3 금지** | 고객 데이터 삭제·메일 일괄 발송 (10건+) |
| **Q4 채널** | 옵션 B (#CS + #VIP 분리) |

활용 MCP : gmail + google-sheets + notion · 적합 : 이커머스 CS 매니저·고객 성공·VIP 관리자

---

## MCP 키워드 매핑 표 (Q2 답변 키워드 → 필요 MCP)

| 키워드 | 필요 MCP | 활용 도구 |
|---|---|---|
| 광고 · ROAS · CPA · 캠페인 | meta-ads · google-ads | `get_insights` |
| 매출 · 시트 · 재고 | google-sheets | `read_sheet` |
| 일정 · 미팅 · 캘린더 | calendar | `list_events` · `create_event` |
| 메일 · CS · 받은편지함 | gmail | `search_threads` · `create_draft` |
| 트래픽 · GA4 · 전환 | ga4 | `run_report` |
| SNS · 인스타 · X · LinkedIn | buffer | `schedule_post` |
| 유튜브 · 채널 KPI · 댓글 | youtube-data | `getChannelStatistics` |
| 노션 · 캘린더 DB · 페이지 | notion | `notion-create-pages` |
| 경쟁사 · 트렌드 · 크롤링 | firecrawl | `scrape` · `search` |
| 이미지 · 광고 소재 | higgsfield | `generate_image` |
| 영상 · 인트로 | hyperframes · heygen · elevenlabs | (트리오) |

## marketing-os 기존 에이전트 매핑 표

| 사용자 답변 패턴 | 기존 에이전트 |
|---|---|
| "매일 07시 광고/매출/CS 통합" | `daily-briefing` |
| "ROAS 임계치 알림" | `check-ads` (cron 매시간) |
| "CS 메일 자동 응답" | `cs-responder` |
| "주간 뉴스레터" | `email-newsletter` + `send-newsletter` |
| "주간 종합 리포트" | `weekly-report` |
| "콘텐츠 캘린더" | `content-calendar` |
| "콘텐츠 자동 발행" | `content-publisher` |
| "광고 통합 리포트" | `3media-integrated-reporter` |

→ **이미 있는 에이전트면 추가 작성 불필요. 없으면 신규 정의 권장.**
