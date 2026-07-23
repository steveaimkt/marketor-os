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

## 운영 시작 (자동화 가동)

빠른 시작이 끝났고 실제 24/7 자동화를 가동하려면:

```bash
# 1) MCP 12개 인증 상태 확인
npm run healthcheck

# 2) 운영 인프라 동작 확인 (10초)
npm run smoke
ls logs/runs/$(date +%F)/   # → smoke-test-*.jsonl 1개 적재 확인

# 3) Discord 봇 슬래시 명령 등록 (1회만)
npm run bot:register   # 길드 한정 = 즉시 반영

# 4) 봇·cron 모두 launchd로 24/7 상주 가동
npm run cron:setup     # 5개 launchd job 일괄 등록
npm run cron:status    # 현재 상태 확인
```

가동 후 Discord에서 `/ping` 을 쳐서 봇 응답 확인. 매시간 0분에 `/check-ads` 자동 실행, 매일 08:00에 `/daily-briefing`, 매주 월 09:00에 `/weekly-report`, 매일 07:55에 MCP 헬스체크.

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

### 🟡 로컬 전용 — 운영자 맥에만 (.gitignore로 배포 제외)
```
├── strategy/  vps-bot/       ← 운영자 내부 자산 (전략 문서·VPS 봇)
├── tools/  hyperframes/      ← 교육·영상 제작 (강의용)
├── automation/  discord-bot/ ← 각 회사가 자체 구축 (mcp-setup 가이드로 안내)
├── gbrain-vault/             ← 로컬 브레인 볼트
└── (심링크) curriculum·강의·msk·운영전략·유튜브-이미지제작
```

### ⚙️ 런타임 — 자동 생성 (커밋 안 함)
```
└── node_modules/  outputs/  logs/
```

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
