# .claude/ — Claude Code 공식 인식 경로

이 폴더는 Claude Code의 **공식 인식 경로**입니다. `agents/`, `skills/`, `commands/`는 상위 폴더의 동일 이름 폴더로 가는 심볼릭 링크입니다.

## 왜 심볼릭 링크인가
- 사용자(학습자) 입장에서는 `marketing-os/agents/` 같은 직관적인 경로로 파일을 탐색
- Claude Code는 `.claude/agents/`만 자동 인식
- 한 폴더에 같은 파일을 두 번 두지 않으려면 심볼릭 링크가 가장 깔끔

## 검증
```bash
cd marketing-os
claude
> /agents     # 28개 에이전트 목록이 나오면 ✓
> /skills     # 5개 스킬 목록
> /commands   # 3개 슬래시 명령
```

## 새 에이전트·스킬·명령 추가 시
**상위 폴더(`agents/`)에 파일을 추가하면 자동으로 `.claude/agents/`에도 반영됨** (심볼릭 링크). 별도 작업 불필요.

## 만약 심볼릭 링크가 안 통하는 환경 (Windows 등)
링크 대신 실제 파일로 복사:
```bash
rm -rf .claude/{agents,skills,commands}
cp -r agents skills commands .claude/
```
단, 이 경우엔 원본을 수정할 때 `.claude/` 안도 동기화해야 함.
