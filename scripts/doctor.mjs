/**
 * doctor.mjs · 설치 주치의 (의존성 0)
 *
 * 마케팅 OS가 지금 이 컴퓨터에서 어디까지 동작하는지 정직하게 표로 보여준다.
 * 원칙: 비어 있는 키는 "고장"이 아니다 · 그 도구만 꺼진 상태다. 없는 값을 문제로 부풀리지 않는다.
 *
 * 사용:  node scripts/doctor.mjs        (npm run doctor)
 * 종료:  0 = 핵심 통과 (선택 항목 미비는 0)  ·  1 = 핵심 결함 (node/claude/에이전트 레지스트리)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ok = (m) => console.log('  ✅ ' + m);
const bad = (m) => { console.log('  ❌ ' + m); hardFail = true; };
const opt = (m) => console.log('  ▫️  ' + m);
let hardFail = false;

const sh = (cmd) => { try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };

console.log('\n── 마케팅 OS 설치 검진 ──────────────────');

// 1. 핵심 실행기
console.log('\n[핵심] 이게 없으면 아무것도 안 됩니다');
const nodeMajor = Number(process.versions.node.split('.')[0]);
nodeMajor >= 20 ? ok(`node ${process.versions.node}`) : bad(`node ${process.versions.node} · 20 이상 필요`);
const claudeV = sh('claude --version');
claudeV ? ok(`claude CLI ${claudeV.split('\n')[0]}`) : bad('claude CLI 없음 → npm install -g @anthropic-ai/claude-code');
fs.existsSync(path.join(ROOT, 'node_modules')) ? ok('npm 의존성 설치됨') : bad('node_modules 없음 → npm install');

// 2. 팀 자산 (파일 실측)
console.log('\n[팀] 파일에서 직접 센 숫자입니다');
const countAgents = () => {
  let n = 0, badFm = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) { if (f.name !== '_archive') walk(p); continue; }
      if (!f.name.endsWith('.md') || /^(README|TEAM|TEAM-MODE|_)/.test(f.name)) continue;
      n++;
      const head = fs.readFileSync(p, 'utf8').slice(0, 200);
      if (!head.startsWith('---')) badFm.push(path.relative(ROOT, p));
    }
  };
  walk(path.join(ROOT, 'agents'));
  return { n, badFm };
};
try {
  const { n, badFm } = countAgents();
  badFm.length ? bad(`에이전트 ${n}명 중 frontmatter 없는 파일 ${badFm.length}: ${badFm.join(', ')}`) : ok(`에이전트 ${n}명 (전원 frontmatter 있음)`);
} catch (e) { bad('agents/ 폴더를 읽지 못함: ' + e.message); }

const methodsDir = path.join(ROOT, '100-skills');
if (fs.existsSync(methodsDir)) {
  let m = 0;
  for (const cat of fs.readdirSync(methodsDir)) {
    const sk = path.join(methodsDir, cat, 'skills');
    if (fs.existsSync(sk)) m += fs.readdirSync(sk).filter((x) => fs.existsSync(path.join(sk, x, 'SKILL.md'))).length;
  }
  m >= 100 ? ok(`방법론 ${m}개 (일 시키기의 기준)`) : opt(`방법론 ${m}개 · 100개 미만이면 100-skills/ 동기화 확인 (scripts/sync-methods.sh)`);
} else opt('100-skills/ 없음 · 방법론은 "팀 구축하자" 첫 실행에서 안내');

// 3. 환경 파일 · 도구 키 (비어 있어도 고장 아님)
console.log('\n[도구] 키가 빈 도구는 꺼진 채 동작합니다 · 필요할 때만 채우세요');
const envPath = path.join(ROOT, '.env');
if (!fs.existsSync(envPath)) {
  opt('.env 없음 → cp .env.example .env (install.sh가 해 줍니다)');
} else {
  const env = fs.readFileSync(envPath, 'utf8');
  const keys = [...env.matchAll(/^([A-Z][A-Z0-9_]+)=(.*)$/gm)].map((m) => [m[1], m[2].trim()]);
  const filled = keys.filter(([, v]) => v && !v.startsWith('#'));
  ok(`.env 있음 · 채운 키 ${filled.length}개 / 전체 ${keys.length}개`);
  const dollar = keys.filter(([, v]) => v.includes('$') && !v.startsWith("'") && !v.startsWith('"'));
  if (dollar.length) opt(`값에 따옴표 없는 $ 포함: ${dollar.map(([k]) => k).join(', ')} · bash 가 변수로 확장해 값이 깨질 수 있으니 작은따옴표로 감싸세요`);
  if (filled.length === 0) opt('키가 하나도 없어도 에이전트·방법론·대시보드는 동작합니다');
}
try {
  const mcp = JSON.parse(fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8'));
  const servers = Object.keys(mcp.mcpServers || {}).filter((k) => !k.startsWith('_'));
  ok(`.mcp.json 정상 · 도구 ${servers.length}개 정의`);
  const raw = JSON.stringify(mcp);
  const vars = [...raw.matchAll(/\$\{([A-Z_]+)\}/g)].map((m) => m[1]);
  const unresolved = [...new Set(vars)].filter((v) => v !== 'CLAUDE_PROJECT_DIR' && !process.env[v] && !(fs.existsSync(envPath) && fs.readFileSync(envPath, 'utf8').match(new RegExp(`^${v}=.+`, 'm'))));
  if (unresolved.length) opt(`미설정 변수 ${unresolved.join(', ')} · 해당 도구만 안 뜹니다 (mcp-setup/ 참조)`);
} catch (e) { bad('.mcp.json 파싱 실패: ' + e.message); }

// 4. 선택 장치
console.log('\n[선택] 없어도 됩니다');
// ⚠️ 파일이 있는지만 보면 안 된다 · 2026-08-04
//    배포판은 **빈 템플릿을 함께 보낸다.** "있음 = 구축 완료" 로 읽으면 처음 받은 사람에게
//    거짓말이 되고, 정작 해야 할 「팀 구축하자」를 건너뛰게 만든다. 채워졌는지를 본다.
const orgMap = path.join(ROOT, 'brand', 'org-map.md');
if (!fs.existsSync(orgMap)) {
  opt('brand/org-map.md 없음 · claude 에서 "팀 구축하자" 로 시작하세요');
} else {
  // ⚠️ 2026-08-04 실측으로 두 번 헛짚었다. 기록해 둔다.
  //    ① 파일 존재만 보면 배포판의 **빈 템플릿**이 "구축 완료"로 읽힌다.
  //    ② 표 행을 세면 라벨(「회사명」)과 안내(「(예: …)」)가 값으로 잡힌다.
  //    → **첫 칸은 라벨이니 빼고, 둘째 칸부터가 사람이 적는 자리다.** 거기가 찼는지만 본다.
  //    ③ 괄호로 시작하는 안내(「(발행·예산 승인권자 …)」)와 표 머리행도 값이 아니다.
  const HEAD = /^(항목|값|질문|답변|반복 업무|현재 담당|빈도|소요시간|쓰는 도구|매핑|채널\/도구|사용 중|계정·인증|우선순위)/;
  const isGuide = v => !v || v.length < 2 || /^[(（]/.test(v) || v.startsWith('←')
                       || v === '—' || v === '?' || HEAD.test(v);
  const filled = fs.readFileSync(orgMap, 'utf-8').split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('|') && !/^\|[\s|:-]+\|?$/.test(l))     // 표 구분선 제외
    .filter(l => {
      const cells = l.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length < 2) return false;
      if (isGuide(cells[0])) return false;                            // 예시 행 자체
      return cells.slice(1).some(c => !isGuide(c));                   // 값 칸이 찼나
    });
  filled.length > 2
    ? ok(`brand/org-map.md 채워짐 (${filled.length}행) · 팀 구축을 마쳤습니다`)
    : opt('brand/org-map.md 는 아직 빈 템플릿 · claude 에서 "팀 구축하자" 로 시작하세요');
}
const port = sh(`lsof -ti :3737 2>/dev/null`);
port ? ok('대시보드 떠 있음 · http://localhost:3737') : opt('대시보드 꺼짐 · npm run dashboard 로 켭니다');

console.log('\n──────────────────────────────────────');
if (hardFail) { console.log('⛔ 핵심 결함이 있습니다. 위 ❌ 를 해결하세요.\n'); process.exit(1); }
console.log('✅ 핵심 통과 · claude 를 열고 "팀 구축하자"라고 말하면 시작됩니다.\n');
