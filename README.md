# marketor-os · 마케팅 OS

> **AI 에이전트 71 + 방법론 100스킬**로 우리 회사에 맞는 마케팅팀을 구축하는 오픈 시스템

71명을 그대로 쓰는 게 아니라, **조직을 진단하고 우리 회사에 맞는 팀으로 새로 짭니다.** 사람과 AI가 함께 일하는 하이브리드 마케팅팀을 구성하고, 필요한 스킬·도구는 더하고 안 쓰는 건 뺍니다. Claude Code 플러그인 한 줄로 설치 · **MIT License**.

---

## 빠른 시작

Claude Code가 설치되어 있다면, 다음 두 줄로 끝납니다:

```bash
/plugin marketplace add steveaimkt/marketor-os
/plugin install marketor-os
```

설치가 끝나면 이렇게 시작하세요:

```
마케팅팀 구축하자
```

→ 조직을 진단하고 우리 회사에 맞는 팀을 구성합니다. 완료 후 **"마케팅팀 시작하자"**로 사용법을 안내받습니다.

Claude Code가 없다면 먼저 설치하세요: https://docs.claude.com/claude-code

---

## 무엇이 들어 있나

- **AI 에이전트 71** · 트루먼(총괄) 1 + 부서장 10 + 오케스트레이터 6 + 스태프 4 + 실무 50
- **방법론 100스킬** (`methods/`) · 리서치·제품·콘텐츠·소셜·광고·커머스·분석·CRM·브랜드세일즈·운영 (10영역 × 10)
- **MCP 설치 가이드** (`mcp-setup/`) · Google Sheets·GA4·Firecrawl·YouTube·Buffer·Meta/Google Ads·Notion·Discord·영상 등
- **회사셋업 온보딩** · "마케팅팀 구축하자"(조직 진단→팀 구성) + "마케팅팀 시작하자"(팀별 사용 가이드)
- **팀 명부** (`brand/team.md`) · 실제 직원(사람) + AI 에이전트를 함께 관리
- **CLAUDE.md** · 모든 에이전트가 따르는 프로젝트 헌법

---

## 도구 연결 확인 (선택)

MCP 도구를 연결했다면 상태를 점검할 수 있습니다:

```bash
npm install          # mcp-server 등 의존성 설치 (최초 1회)
npm run healthcheck  # 연결된 MCP 상태 확인
```

> Discord 봇·자동 스케줄(cron) 같은 24/7 상주 운영은 별도 설정이 필요합니다. **"마케팅팀 구축하자"** 가 우리 회사에 그게 필요한지부터 진단해 안내합니다.

---

## 업데이트

```
/plugin update marketor-os
```

새 버전이 나오면 위 한 줄로 최신화합니다.

---

## 폴더 지도

폴더는 **배포 코어 / 로컬 전용 / 런타임** 세 층으로 나뉩니다. `git clone` 하면 **배포 코어만** 내려갑니다 (로컬 전용·런타임은 `.gitignore`로 제외).

### 🟢 배포 코어 — clone하면 이것만 (마케팅팀 구축에 필요한 전부)
```
marketing-os/
├── agents/         ← 에이전트 71 (트루먼1·부서장10·오케스트레이터6·스태프4·실무50)
├── skills/         ← 재사용 스킬
├── commands/       ← 슬래시 명령 진입점
├── mcp-setup/      ← MCP 12개 설치 가이드 (도구 연결)
├── mcp-server/     ← 로컬 MCP 소스 (설치 시 npm install · 토큰은 각자 발급)
├── brand/          ← 회사별 설정 seam (org-map·roster·profile·marketer)
├── scripts/        ← 운영 스크립트 (+hooks = 예산·발행 승인 안전장치)
├── .mcp.json       ← MCP 설정 (env 참조 방식)
├── .claude-plugin/ ← 플러그인 매니페스트
├── CLAUDE.md       ← 프로젝트 헌법 (모든 에이전트 공통 규칙)
└── .env.example    ← API 키 템플릿
```
> `.claude/agents·skills·commands`는 위 폴더로의 **심링크**입니다 (Claude Code 규약 · 건드리지 마세요).

### ⚙️ 런타임 — 실행 시 자동 생성
```
└── node_modules/ (npm install)  ·  outputs/ (산출물)  ·  logs/
```

> 이 배포판은 위 **배포 코어**만 포함합니다. 운영자 내부 자산·교육/영상 도구·봇·자동화 같은 로컬 전용 파일은 배포에서 제외됩니다.

---

## 사전 준비물

| 항목 | 필요 | 어떻게 얻나 |
|---|---|---|
| Claude Code (CLI) | 필수 | https://docs.claude.com/claude-code |
| Anthropic 계정 | 필수 | https://console.anthropic.com |
| Notion·GA4·광고·SNS 등 도구 | **쓰는 것만** | `mcp-setup/` 가이드 |

> MCP 도구는 한 번에 다 붙일 필요 없습니다. **"마케팅팀 구축하자"** 가 우리 회사가 실제 쓰는 것만 골라 안내합니다.

---

## 운영 패턴: 사람 + AI 하이브리드 (71+1)

```
사용자 (터미널 / 디스코드)
  ↓
트루먼 (agents/orchestrator.md)  ← 라우팅·기획, 도구는 최소
  ↓ 자연어 분기
부서장 10 · 실무 50 · 스태프 4 · 오케스트레이터 6
  ↓
산출물 → 로컬 파일 · Notion · Discord
```

큰 업무는 **"팀으로 돌려줘"** 로 여러 에이전트가 협업합니다(하네스). 발행·예산·집행은 반드시 사람 승인(⏸).

---

## 도움이 필요할 때

- 채팅에 **"매뉴얼 보여줘"** / **"뭐 할 수 있어"** — 상황별 사용법
- **GitHub Issues**: https://github.com/steveaimkt/marketor-os/issues
- **CLAUDE.md** — 모든 에이전트가 따르는 규칙·원칙

---

## 라이선스

**MIT License** · © 2026 WMBB (Steve / 한성국)

누구나 자유롭게 사용·수정·배포·상업 이용할 수 있습니다. 저작권 표시만 유지하면 됩니다. 전문은 [LICENSE](LICENSE) 참조.

> 일부 스킬(`skills/pm-*`)은 [phuryn/pm-skills](https://github.com/phuryn/pm-skills)(MIT)에서 각색했으며 원저작자 표시를 유지합니다.
