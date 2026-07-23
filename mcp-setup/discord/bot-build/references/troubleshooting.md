# 트러블슈팅 (자주 막히는 곳)

| 증상 | 원인 | 해결 |
|---|---|---|
| 답변이 너무 추상적 ("아무거나") | 사용자 선호 미정 | 한 번 되묻기 (예시 2~3개 보여주기) |
| MCP 미설치라 매핑 실패 | Q2 답변에 필요한 MCP 없음 | `mcp설치` 또는 `mcp설치-전체` 스킬 호출 |
| 권한 너무 넓음 ("다 자동 OK") | 위험 도구도 자동 허용 위험 | 강제 안내: "예산 변경·발송·삭제는 무조건 승인 또는 금지" |
| outputs 폴더 없음 | marketing-os 신규 환경 | `mkdir -p outputs/{date}/bot-design/` 자동 생성 |
| 노션 페이지 생성 실패 | Notion MCP 미활성 | Claude.ai → Settings → Connectors → Notion 연결 |
| 첫 가동 검증 시 봇 응답 없음 | `--channels` 세션 종료됨 | `claude --channels plugin:discord@claude-plugins-official` 재시작 |
| 채널 라우팅이 무시됨 (소프트) | CLAUDE.md 패치 누락 또는 Claude 가 룰 무시 | CLAUDE.md 라우팅 섹션 강조·재명시 (예시 응답 문구 포함). 위험 작업은 Q3 의 deny 로 보강 |
| 채널 ID 모름 | Discord 개발자 모드 OFF | 사용자 설정 → 고급 → '개발자 모드' ON → 채널 우클릭 → '채널 ID 복사' |
| 채널 라우팅 100% 차단 필요 | 소프트 라우팅 한계 (90%) | 봇 N개 발급 + 채널마다 별도 `--channels` 세션 가동 (호스팅 부담) |

## 봇이 답 안 할 때 (3분 진단)

1. Discord 멤버 리스트에서 봇 🟢 온라인 확인
2. PC 의 `--channels` 세션 살아있는지 (`ps aux | grep channels`)
3. `/discord:access list` 로 본인 페어링 확인
4. `~/.claude/channels/discord/.env` 토큰 존재 확인

## 응급 명령 카드

```bash
# 봇 재시작
claude --channels plugin:discord@claude-plugins-official
# 정책 확인
cat ~/.claude/channels/discord/access.json | python3 -m json.tool
# 페어링 재요청 / 정책 잠금
/discord:access pair <코드>
/discord:access policy allowlist
```
