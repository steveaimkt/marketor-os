# marketor-os

> **마케터를 위한 클로드코드** · 30개 에이전트로 24시간 가동되는 마케팅 자동화 OS

패스트캠퍼스 강의 **「24시간 Full 가동 마케팅 자동화! 30개 에이전트로 완성하는 클로드코드」** 의 공식 실습 패키지입니다. Claude Code 플러그인으로 한 줄 명령에 모든 자산이 설치됩니다.

---

## 빠른 시작

Claude Code가 설치되어 있다면, 다음 두 줄로 끝납니다:

```bash
/plugin marketplace add steveaimkt/marketor-os
/plugin install marketor-os
```

설치가 끝나면 환영 명령을 실행하세요:

```bash
/marketor-os-welcome
```

Claude Code가 없다면 먼저 설치하세요: https://docs.claude.com/claude-code

---

## 무엇이 들어 있나

- **30개 마케팅 에이전트** · 리서치 5, 카피 5, 광고 6, GA4 3, CRM 3, 확장 3, 콘텐츠 3, 오케스트레이터 1, 슬라이드 감사 1
- **5개 핵심 스킬** · 뉴스레터 작성, 브랜드 톤, 광고 카피 A/B, 6축 품질 검수, HTML 리포트
- **12개 MCP 연결 설정** (v0.2부터 활성화) · Google Sheets / GA4 / Firecrawl / YouTube / Buffer / Meta Ads / Google Ads / Discord 등
- **슬래시 명령 22개** · `/marketor-os-welcome`, `/daily-briefing`, `/weekly-report`, `/ax-team-run`, `/check-ads`, `/research-competitor`, `/research-trend`, `/research-voc`, `/research-seo`, `/research-brand`, `/research-ad-references`, `/ad-copy-ab`, `/landing-copy`, `/plan-next-week`, `/quality-check`, `/publish-this-week`, `/send-newsletter`, `/analyze-meta`, `/analyze-google-ads`, `/analyze-naver-ads`, `/integrated-ad-report`, `/analyze-abtest`
- **커리큘럼 Part 01~10** · 강의 대본, 슬라이드, 실습 자료
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

## 현재 진도: v0.1.0 (Preview)

이 OS는 **강의와 함께 성장합니다**. 강의 진행에 맞춰 매주 새로운 Part가 추가되며, 학생은 `/plugin update marketor-os` 한 줄로 최신화합니다.

| 버전 | 추가 내용 | 상태 |
|---|---|---|
| **v0.1** | Part 01 (입문 7클립) + 오케스트레이터 + 환영 명령 | ✅ 현재 |
| v0.2 | Part 02 (12 MCP 설정) + `.mcp.json` 활성화 + API 키 setup 스크립트 | 다음 |
| v0.3 | Part 03 (콘텐츠 파이프라인) + 3개 에이전트 본문 | 예정 |
| v0.4~ | Part 04~09 점진적 채움 | 예정 |
| v1.0 | Part 10 (AX 시스템) + 디스코드 봇 + cron + Agent SDK | 예정 |

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

## 사전 준비물 (v0.1은 Claude Code만 있으면 됩니다)

| 항목 | 필요 시점 | 어떻게 얻나 |
|---|---|---|
| Claude Code (CLI) | **v0.1 (지금)** | https://docs.claude.com/claude-code |
| Anthropic 계정 | v0.1 | https://console.anthropic.com |
| Notion 계정 | v0.2 | notion.so |
| 디스코드 서버 | v0.2 | discord.com |
| Google Cloud 프로젝트 | v0.2 | console.cloud.google.com |
| Buffer 계정 | v0.2 | buffer.com |
| Firecrawl 계정 | v0.2 | firecrawl.dev |
| Meta · Google Ads 계정 | v0.3+ (광고주만 필요) | 광고주 계정 |

---

## 운영 패턴: AX 팀 (단일 에이전트가 아닌 30+1 구조)

```
사용자 (디스코드 / 터미널)
  ↓
오케스트레이터 (agents/orchestrator.md)  ← 라우팅·기획만, 도구는 최소
  ↓ 자연어 분기
서브에이전트 (agents/part{3~9}-*/...)   ← 도메인 전문가, 각자 MCP 권한
  ↓
산출물 → Discord webhook + Notion 페이지 + 로컬 파일
```

자세한 비교는 [`curriculum/part10-AX팀/`](curriculum/part10-AX팀/) 참조 (v1.0에서 완성).

---

## 업데이트 받기

```bash
/plugin update marketor-os
```

강의 진도가 나갈 때마다 새 버전이 푸시됩니다. 위 명령으로 최신화하세요.

---

## 도움이 필요할 때

- **GitHub Issues**: https://github.com/steveaimkt/marketor-os/issues
- **강의 페이지**: 패스트캠퍼스 「24시간 Full 가동 마케팅 자동화」
- **CLAUDE.md** 읽기: 프로젝트의 모든 규칙·원칙이 들어 있음

---

## 라이선스

**MIT License** · © 2026 WMBB (Steve / 한성국)

누구나 자유롭게 사용·수정·배포·상업 이용할 수 있습니다. 저작권 표시만 유지하면 됩니다. 전문은 [LICENSE](LICENSE) 참조.

> 일부 스킬(`skills/pm-*`)은 [phuryn/pm-skills](https://github.com/phuryn/pm-skills)(MIT)에서 각색했으며 원저작자 표시를 유지합니다.
