# Part 2. 자동화 — 마케터 업무에 손발이 되어주는 12개 MCP 마스터

> 이 Part에서 배우는 것: **AI에 12개 손발을 다는 법** — 마케팅 사무실 전체(시트·노션·광고·SNS·디자인·영상)를 Claude Code가 직접 만지게 만든다.

## 왜 필요한가

- ChatGPT는 답을 알려줄 뿐, 직접 노션 페이지를 만들지도, 광고비를 점검하지도 못함
- 그래서 답을 받아 **사람이 손으로 옮기는 시간**이 결국 가장 큼
- MCP는 그 다리를 표준화한 규격. 한 번 설치하면 평생 재사용

## 12개 MCP 한눈에 보기

| Ch | # | MCP | 마케터에게 의미 | API 키 |
|---|---|---|---|---|
| **Ch 1. MCP 이해 + 데이터 분석 3개 MCP 활용** | | | | |
| | 1-1 | [MCP란 무엇인가](00-MCP란-무엇인가/) | AI에게 손발 달아주기 | - |
| | 1-2 | [Google Sheets MCP](01-google-sheets/) | 스프레드시트 업무 자동화 | OAuth |
| | 1-3 | [GA4 MCP](02-ga4/) | 웹사이트 성과 자동 리포트 | GCP 서비스 계정 |
| | 1-4 | [Firecrawl MCP](03-firecrawl/) | 경쟁사·시장 정보 자동 수집 | API 키 |
| **Ch 2. 콘텐츠·영상·디자인 4개 MCP 활용** | | | | |
| | 2-1 | [Figma MCP](04-figma/) | 디자인 시안 기획·수정 지시 | Personal Token |
| | 2-2 | [YouTube Data MCP](05-youtube-data/) | 유튜브 채널 분석·댓글 관리 | API 키 |
| | 2-3 | [Higgsfield MCP](06-higgsfield/) | 이미지 생성·편집 자동화 | OAuth (Claude.ai) |
| | 2-4 | [영상제작](07-영상제작/) | 클로드코드로 영상 기획 및 제작 (Hyperframes + HeyGen + ElevenLabs) | 로컬 + MCP 2종 |
| **Ch 3. 배포와 광고 2개 MCP 활용** | | | | |
| | 3-1 | [Buffer MCP](08-buffer/) | SNS 다채널 자동 발행·예약 | Access Token |
| | 3-2 | [Meta·Google Ads MCP](09-ads/) | 광고 성과 분석·집행·수정 | 광고주 토큰 |
| **Ch 4. 협업과 관리 2개 MCP 활용** | | | | |
| | 4-1 | [Notion MCP](10-notion/) | 콘텐츠 캘린더·기획서 자동 관리 | OAuth (Claude.ai) |
| | 4-2 | [Discord MCP](11-discord/) | 자동화 알림·승인 AI 봇 | Bot Token + Webhook |

## 핵심 개념

### MCP = "이 서비스에 이렇게 접근하라"는 명세서
- Claude Code는 MCP 서버를 시작 → 해당 서비스의 함수들이 도구로 노출
- 예: Notion MCP 설치 → `mcp__notion__create_page`, `mcp__notion__search` 등 사용 가능

### 두 가지 설치 방식
1. **`claude mcp add` 명령** — 로컬에 직접 설치, `.mcp.json`에 자동 등록
2. **Claude.ai 통합 (OAuth)** — Notion / Gmail / Higgsfield / Google Calendar 등은 클로드 계정에서 한 번 인증하면 자동 사용 가능

### `.mcp.json`의 역할
프로젝트 루트의 `.mcp.json`에 적힌 MCP는 **해당 폴더에서 Claude를 실행할 때 자동 로드**됩니다.
글로벌 설치(`~/.claude.json`)와 달리, 팀원에게 폴더만 공유하면 동일한 MCP 구성이 재현됩니다.

## 한 영상으로 몰아 설치하기 (설치 마라톤)

12개를 클립별로 나누지 않고 **단일 영상**으로 한 번에 설치할 때 → [`MCP-통합설치/`](MCP-통합설치/) 폴더 하나로 끝:

1. [`00-사전준비물.md`](00-사전준비물.md) — 영상 보기 **전** 키·파일 발급 (75분)
2. [`MCP-통합설치/통합설치-가이드.md`](MCP-통합설치/통합설치-가이드.md) — **영상이 따라가는 단일 워크스루** (30~40분)
3. [`MCP-통합설치/mcp설치-전체/`](MCP-통합설치/mcp설치-전체/) (= `/mcp설치-전체` 스킬) — 위 가이드를 Claude 가 인터랙티브로 자동 시연 (진행률 추적·중단 시 재개)

> 개념·왜 필요한가 요약은 [`MCP-12개-종합정리.md`](MCP-12개-종합정리.md).

## 사전 준비물

- Part 1 완료 (`claude` 명령 작동)
- 각 MCP별 계정 (강의 진행하며 하나씩 생성, 본인이 안 쓰는 채널은 건너뛰어도 됨)
- 결제 정보: Firecrawl·Buffer·일부 광고 계정은 유료 (스타터 플랜으로 충분)

## 체크리스트 (Part 2 종료 후)

- [ ] `claude mcp list` 명령으로 12개 MCP가 모두 보인다
- [ ] 각 MCP에 대해 최소 1개 명령으로 헬스 체크 통과
- [ ] `.env` 파일에 모든 API 키 입력 완료
- [ ] `.mcp.json` 한 번 열어 12개 서버 구성 이해
- [ ] Part 3로 진행 준비 완료 (콘텐츠 파이프라인)

## 클립 진행 순서

각 클립 폴더(`01-google-sheets/` 등)에 다음 3가지가 있습니다:
- `README.md` — 이 MCP가 무엇이고, 마케터에게 왜 필요한가
- `실습.md` — 3분 안에 설치하고 헬스 체크 하는 명령
- `산출물예시/` — 실습 결과 예시 (시트 스크린샷, 노션 페이지 등)

→ 시작: [`00-MCP란-무엇인가/README.md`](00-MCP란-무엇인가/)
