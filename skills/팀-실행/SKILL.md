---
name: 팀-실행
description: |
  「팀 실행하자」 트리거. 승인된 **편성안을 실제로 도는 팀으로** 바꾼다.
  1단계 구축(`download team` 게이트 6)과 3단계 운영(대시보드) 사이의 다리다.
  **대시보드가 처음 뜨는 곳이 여기다.**

  **왜 독립 단계인가** (2026-08-03 실측): 구축만 하고 넘겼더니 편성 46명·업무 32건 중
  한 번이라도 돌아 본 업무가 10건뿐이었다. 지어 놓고 실행을 안 하면 안 쓴다.

  하는 일: 배선 → 배선 검증(대시보드 오픈) → 팀별 사용 카드 → **첫 업무 시동**
  끝나는 조건: 팀마다 첫 업무 1건이 **실제로 돌아 산출물이 나옴**

  자동 호출 트리거:
  - **"팀 실행하자"** ⭐ 주요 트리거
  - "팀 켜줘" / "시동 걸어줘" / "편성안 배선해줘" / "구축한 팀 시작하자"
  - `download team` 게이트 6 승인 직후 (이어서 진행)
  - 팀은 있는데 한 번도 안 돌린 업무가 절반을 넘을 때 (시동만 다시)

  ⚠️ 경계: "이 업무 실행해줘" 같은 **개별 업무 실행은 이 스킬이 아니다.**
  이 스킬은 팀 전체를 처음 가동하는 1회성 단계다. 일상 실행은 대시보드 라우터가 받는다.

  경계: 「팀 구축하자」는 **짓고**, 이 스킬은 **켜고**, 「팀 피드백하자」는 **점검한다**.
  구 「마케팅팀 시작하자」의 팀별 사용 카드를 이 스킬 게이트 3이 흡수했다 (2026-08-04 보관).
---

# 팀 실행하자 · 팀 명단를 돌아가는 팀으로

> **"첫 업무를 한 번 시켜 본다. 안 돌면 받은 게 아니다."** (`download` 공통 원칙 3)
> 이 문장이 이 스킬의 전부다. 배선은 수단이고, **시동이 목적**이다.

## 진행 규칙

1. 게이트 4개를 **순서대로**. 앞 게이트가 통과 못 하면 다음으로 안 간다.
2. 게이트 2(배선 검증)에서 막히면 **되돌아가서 고친다.** 다음으로 밀지 않는다.
3. 게이트 4(시동)는 **실제 실행**이다. "돌릴 수 있습니다"로 넘어가지 않는다.
4. 팀이 5개면 첫 업무도 5건이다. 하나라도 빠지면 실행이 끝난 게 아니다.

---

## 게이트 1 · 배선 (7곳)

승인된 편성안을 파일과 설정에 옮긴다.

| # | 어디에 | 무엇을 |
|---|---|---|
| 1 | `brand/my-team.md` | 편성 정본 (팀별 명부·처리 방식·팀 경계·성장 트리거) |
| 2 | `brand/dashboard.json > deptTeams` | **화면이 읽는 곳** · `{ lead, name, groups, roster, cats }` |
| 3 | `> deptWork` | 팀별 "시킬 수 있는 일" · **`harness: true/false` 반드시 명시** |
| 4 | `> pillars` · `flows` | 전략 축 · 자주 하는 일 |
| 5 | `agents/leads/*.md` | 팀장 정의에 **내 팀 명부 + 소집 규칙** 주입 |
| 6 | `agents/_roster-status.md` | 판정 원장 한 줄 |
| 7 | `agents/_archive/` | 안 쓰는 인원 보관 (삭제 아님) |

**지킬 것**
- `roster`·`target` 슬러그는 **`agents/` 에 실존하는 이름만.** 오타 하나면 그 사람이 화면에서 사라진다.
- `deptWork` 의 `label` 은 **그 회사가 실제로 하는 일** 이름으로. 방법론 이름을 베끼지 않습니다.
- 처리 방식 미지정을 남기지 않습니다. 단일이면 `harness: false` 라고 **명시**한다.

## 게이트 2 · 배선 검증 (여기서 막히면 되돌아간다)

```bash
node -e "
const fs=require('fs'),path=require('path');
const d=JSON.parse(fs.readFileSync('brand/dashboard.json','utf8'));
const live=new Set();
(function w(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const fp=path.join(dir,e.name);
 if(e.isDirectory()){if(e.name==='_archive')continue;w(fp);continue;}
 if(!e.name.endsWith('.md'))continue;
 const nm=(fs.readFileSync(fp,'utf8').match(/^name:\s*(.+)\$/m)||[,''])[1].trim(); if(nm)live.add(nm);}})('agents');
let bad=0;
for(const t of d.deptTeams||[]){
  const miss=[t.lead,...t.roster].filter(s=>!live.has(s));
  const w=(d.deptWork||{})[t.name]||[];
  const badT=w.filter(x=>!live.has(x.target)).map(x=>x.target);
  const noMode=w.filter(x=>typeof x.harness!=='boolean').length;
  const f=[];
  if(miss.length){f.push('명부 오타 '+miss.join(','));bad++;}
  if(badT.length){f.push('업무 대상 오타 '+badT.join(','));bad++;}
  if(noMode){f.push('처리 방식 미지정 '+noMode+'건');bad++;}
  if(!t.roster.length){f.push('팀원 없음');bad++;}
  if(!w.length){f.push('시킬 수 있는 일 0건');bad++;}
  console.log((f.length?'🔴 ':'✅ ')+t.name+' · 팀원 '+t.roster.length+' · 업무 '+w.length+(f.length?' · '+f.join(' / '):''));
}
console.log(bad?('\n🔴 '+bad+'건 · 게이트 1로 돌아가 고친다'):'\n✅ 배선 정상 · 게이트 3으로');
"
```

**그다음 눈으로 확인한다. ★ 대시보드가 처음 뜨는 순간이다.**

```bash
npm run dashboard    # http://localhost:3737
```

팀 탭에 팀 카드가 뜨는가. 안 뜨면 **슬러그 오타**를 먼저 의심한다.
설정 정본이 Supabase 인 환경은 저장 후 화면을 새로고침한다.

> 여기까지 오면 사용자는 **처음으로 자기 팀을 화면에서 본다.** 그 순간을 그냥 넘기지 않는다.
> 팀 카드 5장을 짚어 주고 게이트 3으로 간다.

## 게이트 3 · 팀별 사용 카드

팀마다 한 장. **부를 때 쓸 문장**이 핵심이다. 사람은 명령어를 외우지 않는다.

```
## {팀 이름} · {인원}명
- 하는 일: {한 줄}
- 부를 때: "{실제로 입력할 문장}"   예: "이번 주 링크드인 초안 써줘"
- 사람 몫: {승인·발행·판단 중 무엇}
- AI 몫: {초안·조사·정리 중 무엇}
- 검토받을 때: "{분야} 관점으로 검토받기"   ← 그 팀에 배선된 검토층
- 첫 업무: {게이트 4에서 돌릴 것}
```

카드를 다 만들면 **공통 사용법 4줄**을 한 번만 덧붙인다 (팀마다 반복하지 않는다).

```
· 자연어로 부른다      명령어를 외울 필요 없다. "경쟁사 뭐 하나 봐줘" 처럼
· 안전장치            발행·예산·집행은 반드시 사람 승인(⏸). 그냥 안 나간다
· 큰 업무             "팀으로 돌려줘" 하면 여러 명이 붙는다 (하네스)
· 막히면              "뭐 할 수 있어" / "우리 팀 사용법"
```

착지: `brand/team-cards.md` (팀이 바뀌면 여기부터 고친다)

## 게이트 4 · 시동 ★ 이 단계의 존재 이유

**팀마다 첫 업무 1건을 실제로 돌린다.** 말로 "가능합니다"가 아니라 산출물이 나와야 한다.

**첫 업무 고르는 법**
1. 게이트 4 대조(1단계)에서 나온 **공백**(○ 인데 담당 없음)을 우선한다.
   지금 아무도 안 하던 일이 처음 돌아가는 것이라 효과가 바로 보인다.
2. 공백이 없으면 그 팀에서 **가장 자주 할 일**을 고른다.
3. 발행이 필요한 일은 고르지 않는다. **초안까지만** 나오는 것으로 시작한다.

**돌리는 법**: 각 팀의 `deptWork` 첫 업무를 그대로 실행한다. 하네스면 하네스로.

**확인**
```bash
node -e "
const fs=require('fs');
const d=JSON.parse(fs.readFileSync('brand/dashboard.json','utf8'));
const T=fs.readdirSync('outputs/tasks').filter(f=>f.endsWith('.json'))
  .map(f=>{try{return JSON.parse(fs.readFileSync('outputs/tasks/'+f,'utf8'))}catch(e){return null}}).filter(Boolean);
let ok=0;
for(const t of d.deptTeams||[]){
  const ss=[t.lead,...t.roster];
  const run=T.filter(x=>ss.includes(x.runnerAgent||x.target));
  const out=run.filter(x=>x.outputFile||(x.outputFiles||[]).length);
  const done=out.length>0;
  if(done)ok++;
  console.log((done?'✅ ':'🔴 ')+t.name+' · 실행 '+run.length+'건 · 산출물 '+out.length+'건');
}
console.log('\n'+ok+'/'+(d.deptTeams||[]).length+' 팀 시동 완료'+(ok===(d.deptTeams||[]).length?' · 팀 실행 끝':' · 남은 팀을 마저 돌린다'));
"
```

**전 팀이 ✅ 가 되어야 실행이 끝난다.** 하나라도 🔴 면 그 팀 첫 업무를 마저 돌린다.

## 끝나면

```
✅ 팀 실행 완료 · {N}팀 전부 첫 업무 1건 완주 · 산출물 {M}건
   이제 대시보드에서 매일 쓰시면 됩니다. (npm run dashboard)
   주 1회 「팀 피드백하자」 로 일이 돌았는지 보고, 월 1회는 편성까지 점검합니다.
```

**첫 주 추천 루틴 3개**를 함께 준다. 1단계 게이트 4 진단에서 나온 공백을 우선한다.

```
□ {공백1 해소}   "{부를 때 문장}"    (사람 몫: {승인·판단})
□ {공백2 해소}   "{부를 때 문장}"
□ 주간 점검      "팀 피드백하자"     (금요일)
```

## 하지 말 것

- 게이트 2를 건너뛰지 않습니다. **오타 하나로 사람이 통째로 사라진다.**
- 시동을 "다음에"로 미루지 않습니다. 그 "다음"이 안 온다는 게 실측 결과다.
- 첫 업무로 발행물을 고르지 않습니다. 승인 게이트에 걸려 시동이 안 끝난다.
- 산출물이 안 나왔는데 ✅ 로 적지 않습니다. **안 돌면 받은 게 아니다.**

---

## 산출물 착지 (필수)

결과를 반환하지 않고 **파일로 먼저 쓴다**: `outputs/{YYYY-MM-DD}/ops/팀실행-{YYYY-MM-DD}.md`
반환이 끊겨도 파일은 남는다 (`agents/_conventions.md §I`). 마지막 줄에 `완료: <리포 기준 상대 경로>` 를 한 번 출력한다.
