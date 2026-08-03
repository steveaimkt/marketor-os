/**
 * dispatch.mjs · 대시보드 → 실제 업무 지시 실행기
 *
 * 대시보드에서 받은 지시를 자식 프로세스(Claude Agent SDK 러너)로 실행하고
 * 진행 로그·비용·산출물을 추적한다. 서버(server.mjs)가 얇게 유지되도록 분리.
 *
 * 지시 모드
 *   truman   · 자연어 한 줄 → 트루먼이 알아서 알맞은 팀에 배분
 *   agent    · 조직도에서 담당자 지정 → 그 에이전트에게 직접
 *   team     · 표준 편성 3종으로 하네스 팀 소집
 *   skill    · skills 폴더의 SKILL.md 를 지정해 그 절차대로
 *   followup · 끝난 업무의 세션을 이어받아 후속 지시 (SDK resume · 같은 맥락)
 *
 * 안전 원칙 (CLAUDE.md 헌법)
 *   · permissionMode 는 acceptEdits 고정 · bypassPermissions 를 절대 쓰지 않는다
 *   · 기본값은 "초안까지만" · 발행·전송·예약·예산변경·삭제는 프롬프트로 차단
 *     (allowPublish=true 는 사용자가 체크박스로 명시 승인한 경우에만 전달됨)
 *   · 헤드리스라 되물을 수 없으므로 "가정을 명시하고 진행" 을 규약으로 주입
 *   · 산출물을 파일로 먼저 쓰게 강제 (agents/_conventions.md §I · 반환 미보장 결함 우회)
 *   · spawn 은 셸 없이 배열 인자로만 호출 (커맨드 인젝션 차단)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from '../../scripts/status-lib.mjs';
import { dbReady, saveTask, loadTasks } from './store.mjs';
import { readConfig } from './config.mjs';

const TASK_DIR = path.join(ROOT, 'outputs', 'tasks');
const MAX_CONCURRENT = 3;          // 동시 실행 상한 (토큰·API 폭주 방지)
const MAX_LOG = 400 * 1024;        // 메모리 로그 상한 (초과분은 앞을 버림)
// 기본 20분 · 플랜 단계 실행처럼 무거운 업무는 .env DASHBOARD_TASK_TIMEOUT_MIN 으로 올린다 (2026-08-01 플랜 1단계가 20분 상한에 걸린 실측 반영)
const TIMEOUT_MIN = Math.min(120, Number(process.env.DASHBOARD_TASK_TIMEOUT_MIN) || 20);
const TIMEOUT_MS = TIMEOUT_MIN * 60 * 1000;
const MAX_PROMPT = 4000;
/* 메모리에 유지할 최근 작업 수.
   2026-08-03 · 40 → 400. 40 이던 시절엔 화면 목록만 채우면 됐지만, 이제 이 기록이
   자동화 후보를 판정하는 근거다. 서버는 40건만 들고 있는데 감사 파일은 95건이라
   반복을 절반 넘게 못 세고 있었다. 판단의 근거를 잘라 두면 판단이 틀린다. */
const KEEP_TASKS = 400;

const ORCHESTRATOR = 'marketing-os-orchestrator';

/** 표준 편성 3종 (정본: agents/TEAM-MODE.md §2) */
export const TEAM_FORMATIONS = {
  '부서-협업팀': { ko: '🤝 부서 협업팀', hint: '부서별 산출물을 서로 인계하며 동시 진행 (3~5명)' },
  '검수-토론패널': { ko: '⚖️ 검수 토론 패널', hint: 'perspective-reviewer 5관점(대표·재무·고객·법무·브랜드) 병렬 압박 검토' },
  '리서치-스웜': { ko: '🔭 리서치 스웜', hint: 'trend-scanner · competitor-monitor · voc-analyzer 전방위 스캔' },
};

// ── 작업 목록 (메모리 + outputs/tasks 영속) ───────────────────────────
/** @type {Map<string, any>} */
const tasks = new Map();

/**
 * 서버가 다시 뜨면 디스크에 남은 감사 기록을 되살린다.
 *
 * 이걸 안 하면 재시작마다 업무 목록이 0건이 되고, 홈의 "지금 결정할 것"과
 * 전체 업무 표가 통째로 비어 보인다 (기록은 outputs/tasks 에 그대로 있는데도).
 * 2026-07-30 확인된 결함.
 *
 * 세션 id 는 SDK 쪽에 남아 있어 프로세스를 넘어서도 유효하다 → 되살린 업무에도
 * "이어서 지시" 가 그대로 동작한다. 다만 실행 중이던 것은 자식 프로세스가 죽었으므로
 * 중단으로 표시한다 (진행 중인 척하면 화면이 거짓말을 한다).
 */
/**
 * 되살린 업무가 "실행 중"이면: 프로세스가 아직 살아 있으면 그대로 계속 (detached 라 가능),
 * 죽어 있으면 로그 파일로 종료 처리한다. 예전처럼 무조건 "중단됨"으로 찍지 않는다.
 */
function reviveRunning(t) {
  if (t.status !== 'running') return;
  if (t.pid && alive(t.pid)) { t.finalized = false; return; }   // 감시자가 이어서 지켜본다
  t.endedAt = null;
  finalizeTask(t, null, null);
}

export async function restoreTasks() {
  // Supabase 가 붙어 있으면 그게 정본이다 (맥과 VPS 가 같은 목록을 본다)
  if (dbReady()) {
    const rows = await loadTasks(KEEP_TASKS);
    if (rows && rows.length) {
      for (const t of rows) {
        // pid·로그 경로·프롬프트·verify 는 이 기계의 로컬 기록에만 있다 (DB 는 VPS 와 공유라 pid 무의미)
        try {
          const loc = JSON.parse(fs.readFileSync(path.join(TASK_DIR, t.id + '.json'), 'utf8'));
          t.verify = loc.verify === true;
          if (t.status === 'running') { t.pid = loc.pid || null; t.logFile = loc.logFile || null; t.fullPrompt = loc.fullPrompt || null; }
        } catch { /* 로컬 기록 없으면 그대로 */ }
        reviveRunning(t);
        t.logLen = (t.log || '').length; t.truncated = false; t.restored = true;
        tasks.set(t.id, t);
      }
      process.stderr.write(`   지난 업무 ${rows.length}건을 Supabase 에서 되살렸습니다\n`);
      return;
    }
  }
  let files = [];
  try {
    files = fs.readdirSync(TASK_DIR).filter(f => f.endsWith('.json'))
      .map(f => ({ f, p: path.join(TASK_DIR, f) }))
      .map(x => { try { return { ...x, m: fs.statSync(x.p).mtimeMs }; } catch { return null; } })
      .filter(Boolean).sort((a, b) => a.m - b.m).slice(-KEEP_TASKS);
  } catch { return; }
  let n = 0;
  for (const { p } of files) {
    try {
      const t = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (!t.id) continue;
      reviveRunning(t);
      t.log = typeof t.log === 'string' ? t.log : '';
      t.logLen = t.log.length;
      t.truncated = false;
      t.restored = true;
      tasks.set(t.id, t);
      n++;
    } catch { /* 깨진 기록은 건너뛴다 */ }
  }
  if (n) process.stderr.write(`   지난 업무 ${n}건을 로컬 기록에서 되살렸습니다\n`);
  // DB 가 비어 있었다면 이 기회에 한 번 올려 둔다 (다음 기동부터는 DB 가 정본)
  if (n && dbReady()) {
    let up = 0;
    for (const t of tasks.values()) { if (await saveTask(t)) up++; }
    if (up) process.stderr.write(`   그중 ${up}건을 Supabase 로 이관했습니다\n`);
  }
}

/**
 * 실행 위치 해석 · local 은 이 맥, ssh 는 원격 기계.
 * 원격은 host·user·path 가 다 채워져 있어야 켜진다 (반쯤 채운 설정으로 조용히 실패하지 않게).
 */
function resolveRunner(key) {
  const cfg = readConfig();
  const list = cfg.runners || [];
  const r = list.find(x => x.key === (key || 'local')) || list.find(x => x.key === 'local');
  if (!r) return { ok: true, runner: { key: 'local', name: '내 맥', kind: 'local' } };
  if (r.kind === 'local') return { ok: true, runner: r };
  if (!r.enabled) return { ok: false, error: `${r.name} 은 아직 꺼져 있습니다. 설정과 연결에서 켜세요`, code: 409 };
  for (const f of ['host', 'user', 'path']) {
    if (!String(r[f] || '').trim()) return { ok: false, error: `${r.name} 설정에 ${({host:'호스트',user:'사용자',path:'경로'})[f]} 가 비어 있습니다`, code: 409 };
  }
  if (!/^[A-Za-z0-9._@-]+$/.test(r.host) || !/^[A-Za-z0-9._-]+$/.test(r.user)) {
    return { ok: false, error: `${r.name} 의 호스트나 사용자 이름에 쓸 수 없는 글자가 있습니다`, code: 400 };
  }
  return { ok: true, runner: r };
}

/**
 * 원격 실행 명령 조립.
 * 프롬프트는 인자로 붙이지 않고 표준입력으로 넘긴다(--stdin-prompt) → 원격 셸이
 * 프롬프트를 해석할 여지가 없다. 나머지 인자는 화이트리스트 검증을 통과한 토큰뿐이다.
 */
function sshArgs(r, runnerAgent, effort, resume) {
  const remote = [
    'cd', shq(r.path), '&&',
    'node', 'scripts/agent-runner.mjs', shq(runnerAgent), '--stdin-prompt',
    ...(effort ? ['--effort', effort] : []),
    ...(resume ? ['--resume', shq(resume)] : []),
  ].join(' ');
  return ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new',
    '-p', String(r.port || 22), `${r.user}@${r.host}`, 'bash', '-lc', remote];
}
const shq = (v) => "'" + String(v).replace(/'/g, "'\\''") + "'";

// ── .env 로더 (MCP 인증 키를 자식 프로세스에 전달) ─────────────────────
function loadDotEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch { /* .env 없으면 무시 */ }
  return out;
}

// ── 지시 대상 검증 (화이트리스트) ─────────────────────────────────────
/** agents/**\/*.md 의 frontmatter name 집합 */
export function knownAgents() {
  const names = new Set();
  const walk = (dir) => {
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.md') || e.name.startsWith('_') || /^(TEAM|README)/i.test(e.name)) continue;
      try {
        const head = fs.readFileSync(p, 'utf8').slice(0, 2000);
        const m = head.match(/^---\n[\s\S]*?\bname:\s*([A-Za-z0-9_-]+)/);
        if (m) names.add(m[1]);
      } catch { /* skip */ }
    }
  };
  walk(path.join(ROOT, 'agents'));
  return names;
}

/** skills/<name>/SKILL.md 가 실제로 있는 스킬만 허용 (한글 스킬명 포함) */
function skillExists(name) {
  if (!name || name.includes('/') || name.includes('..') || name.includes('\0') || name.startsWith('_')) return false;
  return fs.existsSync(path.join(ROOT, 'skills', name, 'SKILL.md'));
}

// ── 팀 규칙 (M·축적 → E·실행 환류) ───────────────────────────────────
// 팀 편성은 회사마다 다르므로 코드가 아니라 설정에서 읽는다 (brand/dashboard.json > deptTeams).
// UI(index.html)와 같은 값을 본다. 배포판은 비어 있고 "마케팅팀 구축하자"가 채운다.
function deptTeams() { return readConfig().deptTeams || []; }
/** 슬러그 → 팀 이름 · 팀 명단(roster)가 폴더보다 우선한다 */
function deptOfLead(slug) {
  for (const t of deptTeams()) if (t.lead === slug || (t.roster || []).includes(slug)) return t.name;
  return null;
}
/** 팀 명단 밖(대기) 인원이 폴더로 걸릴 때의 소속 · 팀이 선언한 groups 를 쓴다 */
function deptOfGroup(group) {
  for (const t of deptTeams()) if ((t.groups || []).includes(group)) return t.name;
  return null;
}
function deptOfAgent(slug) {
  const byRoster = deptOfLead(slug);
  if (byRoster) return byRoster;
  try {
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) { const r = walk(fp); if (r) return r; continue; }
        if (!e.name.endsWith('.md')) continue;
        const head = fs.readFileSync(fp, 'utf8').slice(0, 400);
        if (new RegExp(`\\bname:\\s*${slug}\\b`).test(head)) return deptOfGroup(path.basename(dir));
      }
      return null;
    };
    return walk(path.join(ROOT, 'agents'));
  } catch { return null; }
}
/** 이 담당의 팀에 쌓인 규칙을 프롬프트 블록으로 (M 이 비어 있으면 빈 문자열 · 지어내지 않음) */
/**
 * 회사 맥락 주입 · "절차는 아는데 어느 회사인지 모른다" 를 막는다 (2026-08-03).
 *
 * 실측: 에이전트 59명 중 방법론 정본을 참조하는 건 83%인데
 * brand/profile.md 를 읽는 건 25%뿐이었다. 그래서 배포판 에이전트가
 * 남의 회사에서도 "일반론"만 뱉거나, 최악의 경우 원저자 회사를 가정했다.
 *
 * 파일 59개를 고치는 대신 여기서 한 번에 주입한다. 에이전트는 그대로 두고
 * **같은 파일이 회사마다 다르게 동작**하게 만드는 것이 이 층의 목적이다.
 * 미작성이면 그 사실을 알리고 [샘플] 태그를 강제한다 (지어내지 않게).
 */
function brandBlock() {
  // 빈 템플릿을 "작성됨" 으로 오판하면 표 껍데기가 통째로 프롬프트에 실린다.
  // 상태 문구는 파일마다 형식이 달라 믿을 수 없으므로 **채워진 값의 개수**로 판정한다.
  const pick = (rel, cap) => {
    try {
      const t = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const body = t.replace(/^---\n[\s\S]*?\n---\n/, '');
      if (/빈 템플릿|상태\s*:\s*미작성|\[ \]\s*(온보딩 )?(미완료|미작성)/.test(body)) return null;
      // 표에서 값이 채워진 칸 수 · 괄호 안내문((우리 브랜드명) 등)은 빈 것으로 본다
      const filled = [...body.matchAll(/^\|[^|\n]+\|\s*([^|\n]*?)\s*\|/gm)]
        .filter(m => m[1] && !/^\(.*\)$/.test(m[1]) && !/^-+$/.test(m[1]) && m[1] !== '값').length;
      if (filled < 4) return null;
      return body.trim().slice(0, cap);
    } catch { return null; }
  };
  const profile = pick('brand/profile.md', 1400);
  const tone = pick('brand/tone.md', 700);
  if (!profile && !tone) {
    return `\n[회사 정보 없음] \`brand/profile.md\` 가 아직 비어 있습니다. 회사·상품·채널·톤은 **추측하지 않습니다**. `
      + `산출물에 \`[샘플]\` 태그를 붙이고, 마지막에 "사람 몫: brand/profile.md 작성(「팀 구축하자」 게이트 1)" 을 남겨라.`;
  }
  let out = `\n[우리 회사 · 이 맥락으로 일해 주세요 · 일반론은 피합니다]`;
  if (profile) out += `\n${profile}`;
  if (tone) out += `\n\n[말투·금기]\n${tone}`;
  return out;
}

/**
 * 팀 명단 주입 · 트루먼이 "누가 어느 팀인지" 를 알아야 배분한다 (2026-08-03).
 *
 * 실측: 자연어 요청 25건 중 산출물 도메인이 ops 13 · copy 2 · youtube 1 로 쏠렸다.
 * "알맞은 팀·담당에게 넘겨라" 고만 하고 **명단을 안 줬기 때문**이다.
 * 편성은 설정(deptTeams)에 있는데 프롬프트에는 안 들어갔다.
 *
 * 팀이 없으면(배포판 첫 실행) 빈 문자열을 돌려주고, 트루먼은 구축을 안내한다.
 */
function teamBlock() {
  try {
    const cfg = readConfig();
    const teams = cfg.deptTeams || [];
    if (!teams.length) {
      return `\n[아직 팀이 없다] 편성이 비어 있다. 요청을 억지로 처리하지 않고 `
        + `"「팀 구축하자」 로 먼저 팀을 만드시면 이 일을 맡길 곳이 생깁니다" 라고 안내한 뒤, `
        + `지금 당장 도울 수 있는 것만 직접 처리해 주세요.`;
    }
    const work = cfg.deptWork || {};
    const lines = teams.map(t => {
      const ws = (work[t.name] || []).slice(0, 8).map(w => w.label + (w.harness ? '(팀)' : '')).join(' · ');
      return `- **${t.name}**\n`
        + `  - 팀장: ${t.lead}\n`
        + `  - 팀원: ${(t.roster || []).join(', ') || '없음'}\n`
        + `  - 시킬 수 있는 일: ${ws || '아직 없음'}`;
    }).join('\n');
    /* 2026-08-04 · 배분 규칙을 조였다.
       실측: 트루먼이 받은 29건 중 28건을 직접 처리했고, 그때 스킬 사용률이 6% 였다
       (팀장 경유는 50%). 원인은 "어느 팀도 아니면 직접 처리" 라는 빠져나갈 구멍이었다.
       직접 처리를 조회성 질문으로만 좁히고, 산출물이 나오는 일은 반드시 팀장을 거치게 한다. */
    return `\n[현재 편성 · 이 안에서만 배분해 주세요]\n${lines}\n`
      + `[배분 규칙 · 당신은 라우터입니다. 일을 직접 하지 않습니다]\n`
      + `- 위 "시킬 수 있는 일" 과 맞는 게 있으면 **그 담당에게** 넘겨 주세요\n`
      + `- 없으면 가장 가까운 팀의 **팀장에게** 넘겨 주세요 (분야가 애매해도 가장 가까운 팀을 고릅니다)\n`
      + `- **직접 처리는 산출물이 안 나오는 조회성 질문에만** 허용됩니다 `
      + `(예: 오늘 현황·기록 조회·이미 있는 파일 확인). 글·분석·기획·검수처럼 **파일이 남는 일은 반드시 팀장을 거칩니다**\n`
      + `- 넘길 때는 Agent 도구로 그 담당을 실제로 호출해 주세요. 이름만 언급하고 직접 쓰지 않습니다\n`
      + `- 팀 명단에 없는 사람은 부르지 않습니다 (보관된 인원입니다)\n`
      + `- 마지막에 \`배분: {팀} / {담당}\` 을 한 줄로 남겨 주세요 (직접 처리했으면 \`배분: 직접 / 조회성\`)`;
  } catch { return ''; }
}

function teamRulesBlock(runnerAgent) {
  try {
    const all = readConfig().teamRules || {};
    const rules = [...(all['전사'] || []), ...((all[deptOfAgent(runnerAgent)] || []))].slice(-12);
    if (!rules.length) return '';
    return `\n[팀 규칙 · 대표 피드백으로 쌓인 것 · 반드시 지켜라]\n` + rules.map((r, i) => `${i + 1}. ${r.text}`).join('\n');
  } catch { return ''; }
}

// ── 스킬 자동 결합 (P1 · 스킬을 실행의 기본 단위로) ──────────────────
//   실측(2026-08-02): 지시 58건 중 스킬 지정은 2건뿐이었다. 방법론 100을 만들어 두고도
//   실행에 안 붙던 문제. 이제 담당의 정본 스킬(canonical_skill)과 내 맞춤본(skillMap)을
//   자동으로 찾아 프롬프트에 절차로 주입하고, 무엇이 쓰였는지 기록에 남긴다.
function skillForAgent(slug) {
  if (!slug) return null;
  let file = null;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '_archive') walk(fp); continue; }
      if (!e.name.endsWith('.md')) continue;
      const head = fs.readFileSync(fp, 'utf8').slice(0, 2500);
      if (new RegExp(`\\bname:\\s*${slug}\\b`).test(head)) file = head;
    }
  };
  try { walk(path.join(ROOT, 'agents')); } catch { return null; }
  if (!file) return null;
  const m = file.match(/canonical_skill\s*:\s*["']?(\d{3})["']?/);
  if (!m) return null;
  const id = m[1];
  const mine = (readConfig().skillMap || {})[id] || null;   // 내 맞춤본이 있으면 그게 우선
  return { id, mine };
}
/** 프롬프트에 붙일 스킬 절차 블록 (없으면 빈 문자열 · 지어내지 않는다) */
/**
 * 팀장은 특정 방법론 하나를 맡지 않는다 (분야를 맡는다).
 * 그래서 지시가 팀장에게 가면 절차가 아무것도 안 붙었다 (실측: 40건 중 19건).
 * 그 팀이 맡은 분야의 방법론 목록을 대신 붙여 "골라 쓰라"고 알려 준다.
 */
const CAT_KO = { '01-research':'시장조사','02-product':'제품기획','03-content':'콘텐츠','04-social':'소셜',
  '05-ads':'광고','06-commerce':'커머스','07-analytics':'데이터분석','08-crm':'CRM','09-brand-sales':'브랜드세일즈','10-ops':'운영' };
function leadSkillBlock(slug) {
  try {
    const cfg = readConfig();
    const team = (cfg.deptTeams || []).find(t => t.lead === slug);
    if (!team || !(team.cats || []).length) return '';
    const names = team.cats.map(c => `${CAT_KO[c] || c}(100-skills/${c}/)`).join(' · ');
    return `\n[절차] ${team.name} 이 맡은 분야는 **${names}** 입니다. `
      + `그 폴더의 PLUGIN.md 에서 이 요청에 맞는 방법론을 고르고, 고른 번호를 보고 첫 줄에 밝혀 주세요. `
      + `맞는 것이 없으면 없다고 적고 진행해 주세요 (억지로 끼우지 않습니다).`;
  } catch { return ''; }
}

function skillBlock(sk) {
  if (!sk) return '';
  return sk.mine
    ? `\n[절차] 이 업무는 내 맞춤 스킬 **${sk.mine}** (skills/${sk.mine}/SKILL.md) 규격대로 진행해 주세요. 방법론 ${sk.id} 이 그 원본입니다.`
    : `\n[절차] 이 업무의 정본 절차는 방법론 **${sk.id}** 이다 (100-skills/*/skills/${sk.id}-*/SKILL.md). 그 절차·산출 규격을 따라 주시고, 벗어난다면 이유를 밝혀 주세요.`;
}

// ── 프롬프트 조립 (안전 규약 주입) ────────────────────────────────────
function buildPrompt({ mode, target, prompt, allowPublish, pillarName, goalName, plan, format, runnerAgent, skill }) {
  const now = new Date();
  const stamp = now.toLocaleString('ko-KR');
  // 산출물 폴더는 로컬 날짜 기준 (toISOString 은 UTC라 KST 오전에 하루 밀린다)
  const day = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const wantHtml = format === 'html';
  const rules = [
    wantHtml
      ? `1. 산출물은 **파일로 먼저** 써 주세요: \`outputs/${day}/{도메인}/{담당}-{대상}.html\` · **단일 자기완결 HTML 리포트**로 만든다 (스타일 인라인 · 외부 로드 금지 · 상단 핵심 요약 카드 → 표·수치 중심 본문 · 이 회사 톤: 종이색 배경 #FDFDFC·잉크 #2A2A28·모래 #E0CCBE 포인트 · Pretendard). 근거 데이터가 빈약하면 빈 채로 꾸미지 않고 "데이터 없음"을 그대로 표기해 주세요.`
      : `1. 산출물은 **파일로 먼저** 써 주세요: \`outputs/${day}/{도메인}/{담당}-{대상}.md\` (반환이 끊겨도 결과가 남습니다)`,
    `1-1. {도메인} 은 아래 열 중 하나만 씁니다 (새 폴더를 만들지 않습니다): `
      + `research(시장조사) · product(제품기획) · content(콘텐츠) · social(소셜) · copy(카피) `
      + `· analytics(성과분석) · crm(고객) · sales(영업·제안) · ops(운영·인사) · media(영상·이미지)`,
    `2. 다 끝나면 마지막 줄에 \`완료: <파일경로>\` 를 정확히 한 번 출력해 주세요. 경로는 **리포 기준 상대 경로**로 적어 주세요 (예: outputs/2026-08-02/copy/파일.md · 절대 경로는 쓰지 않습니다).`,
    `3. 지금은 **헤드리스 실행**입니다. 되물을 수 없으니 정보가 부족하면 가정을 명시(\`가정:\`)하고 진행해 주세요.`,
    `7. 팀원을 **한 명이라도 소집했다면** 마지막에 \`소집: 이름1 · 이름2\` 를 한 줄로 남겨 주세요 (관측 · \`_conventions.md §J\`). 아무도 부르지 않았다면 이 줄은 생략합니다. 이 줄이 없으면 로그에 "미기록"으로 남아 실제 소집 여부를 확인할 수 없습니다.`,
    `6. ⏸ 승인을 올릴 때는 결정 브리핑 규격으로 써 주세요: **결정 요소 1~2개 · 추천안 · 리스크 한 줄**. 정보 나열이 아니라 결정을 돕는 요약이면 좋겠습니다.`,
    `5. 노션·Gmail·캔바 같은 claude.ai 커넥터 도구는 **지금 이 실행에는 없다**. 그 단계는 시도하지 않고, 해당 내용을 파일에 담은 뒤 마지막 보고에 "사람 몫: ..." 으로 밝혀 주세요. (로컬 도구는 쓸 수 있다: gbrain·유튜브·구글시트·GA4·네이버·Buffer·firecrawl)`,
  ];
  if (allowPublish) {
    rules.push(`4. ⚠️ 사용자가 대시보드에서 **발행·전송을 명시 승인**했다. 다만 광고 예산 변경·파일 삭제·계정 설정 변경은 여전히 하지 않습니다. 발행 직전 gate:true 산출물은 gate-auditor 검수를 거쳐 주세요.`);
  } else {
    rules.push(`4. ⛔ 발행·전송·예약·광고 예산 변경·삭제는 **하지 않습니다**. 초안까지만 만들고, 승인이 필요한 지점은 \`⏸ 승인 필요: ...\` 로 남겨 주세요.`);
  }

  let head, body = prompt;
  if (mode === 'truman') {
    head = `[대시보드 지시 · ${stamp}]\n트루먼으로서 아래 요청을 **알맞은 팀장에게 넘겨** 완수해 주세요. 당신은 배분하는 사람이고, 일은 팀이 합니다.`;
  } else if (mode === 'agent') {
    head = `[대시보드 지시 · ${stamp}]\n담당자 지정 지시입니다. ${target} 의 워크플로대로 아래 업무를 진행해 주세요.`;
  } else if (mode === 'team') {
    const f = TEAM_FORMATIONS[target];
    head = `[대시보드 지시 · ${stamp}]\n하네스 팀 소집 지시입니다. 편성은 **${f ? f.ko : target}** (${f ? f.hint : ''}).\n`
      + `skills/team-run 절차를 따르되, 팀원에게는 **결과를 반환하지 말고 outputs/ 에 파일로 먼저 쓰도록** 안내해 주세요 `
      + `(CLAUDE.md 에 기록된 팀 결과 미반환 결함 우회로). 유휴 알림이 2회면 반환 실패로 보고 파일을 확인해 주세요. 파일도 없으면 단독 수행으로 전환하고 그 사실을 보고서에 밝혀 주세요.`;
  } else if (mode === 'skill') {
    head = `[대시보드 지시 · ${stamp}]\n스킬 지정 지시입니다. **${target}** 스킬(\`skills/${target}/SKILL.md\`)을 Skill 도구로 불러 그 절차대로 진행해 주세요.\n`
      + `단, 이 스킬이 게이트형(단계마다 사용자 답을 받는 형식)이면 헤드리스라 답을 받을 수 없으니, 각 게이트의 기본값·가정을 밝히고 끝까지 진행해 주세요.`;
  } else if (mode === 'followup') {
    head = `[대시보드 후속 지시 · ${stamp}]\n직전 작업의 맥락을 그대로 이어받았습니다. 앞서 한 일은 다시 설명하지 않으셔도 되고, 아래 요청만 반영해 주세요.`;
  } else {
    head = `[대시보드 지시 · ${stamp}]`;
  }

  const goalLine = goalName ? `\n[목표] 이 일은 **"${goalName}"** 를 위한 것이다. 이 목표에 실제로 보탬이 되는 산출물이면 좋겠습니다. 곁가지로 새지 않도록 해 주세요.` : '';
  const pillarLine = pillarName ? `\n[방향] 이 일은 "${pillarName}" 방향의 일이다. 산출물이 이 방향에 맞는지 스스로 한 번 점검해 주세요.` : '';

  // 플랜 먼저 모드: 실행하지 않고 업무 플랜만 세운다. 승인 후 후속 지시("1단계 진행")로 이어진다.
  const planBlock = plan ? `\n\n## 이번 지시는 "플랜 먼저"다 (실행 금지)
아직 실행하지 않고, 아래 형식의 **업무 플랜만** 세워 파일로 써 주세요.
- 단계는 3~7개. 각 단계마다: 무엇을 · **담당 직원**(에이전트 이름과 한글 역할 · agents/ 에 실존하는 이름만) · 필요한 입력 · 예상 산출물
- 사람이 결정해야 하는 지점(발행·예산·방향 선택)은 단계에 ⏸ 로 표시
- 마지막에 "이 플랜이 [방향]에 복무하는가" 1줄 자가 점검
- 플랜 파일을 쓴 뒤, 마지막 줄에 "⏸ 승인 필요: 플랜 승인 후 1단계 진행" 을 출력해 주세요.` : '';

  const rulesBlock = teamRulesBlock(runnerAgent || target);
  const skBlock = skillBlock(skill) || leadSkillBlock(runnerAgent || target);
  const teams = mode === 'truman' ? teamBlock() : '';
  return `${head}${goalLine}${pillarLine}${teams}${brandBlock()}${skBlock}${rulesBlock}${planBlock}\n\n## 요청\n${body}\n\n## 실행 규약 (marketing-os 헌법)\n${rules.join('\n')}\n`;
}

// ── 실행 ─────────────────────────────────────────────────────────────
function runningCount() {
  let n = 0;
  for (const t of tasks.values()) if (t.status === 'running') n++;
  return n;
}

/**
 * 지시 접수. 검증 통과 시 자식 프로세스를 띄우고 task 레코드를 반환.
 * @returns {{ok:true, task:object} | {ok:false, error:string, code:number}}
 */
/**
 * 업무 한 줄 제목 (C-17) · 목록에서 지시문 앞부분만 보면 다 비슷해 구분이 안 됐다.
 * 대괄호 머리말·경로·군더더기를 걷어내고 사람이 알아볼 24자를 만든다. 없으면 null (지어내지 않는다).
 */
function shortTitle(prompt) {
  let t = String(prompt || '').replace(/\s+/g, ' ').trim();
  // 스킬을 지정한 지시는 그 스킬 이름이 곧 제목이다
  const sk = t.match(/^(?:skills|100-skills)\/([^/]+)\/[^\s]*SKILL\.md/);
  if (sk) {
    const name = sk[1].replace(/^검토-/, '').replace(/-/g, ' ');
    return (sk[1].startsWith('검토-') ? name + ' 관점 검토' : name).slice(0, 24);
  }
  t = t.replace(/^\[[^\]]{2,40}\]\s*/, '');                     // [download team · 하네스 실행]
  t = t.replace(/^(agents|outputs|brand)\/\S+\s*/, '');
  t = t.split(/(?:\.\s|\n|대상:|사유:|주제:)/)[0].trim();         // 첫 문장까지 · 부가 항목 앞에서 끊는다
  t = t.replace(/\s*(절차대로|규격대로)\s*(진행해|수행해|검토해)\s*주세요/, '');
  t = t.replace(/(해|하)\s*주세요$|입니다$/, '').trim();
  return t ? t.slice(0, 24) : null;
}

export function dispatch({ mode, target, prompt, effort, allowPublish, parentId, runner, pillar, goal, plan, format, source, verify }) {
  if (!['truman', 'agent', 'team', 'skill', 'followup'].includes(mode)) return { ok: false, error: '알 수 없는 지시 모드입니다', code: 400 };
  prompt = typeof prompt === 'string' ? prompt.trim() : '';
  target = typeof target === 'string' ? target.trim() : '';
  allowPublish = allowPublish === true;
  effort = effort === 'low' ? 'low' : null;

  if (prompt.length > MAX_PROMPT) return { ok: false, error: `지시가 너무 깁니다 (${MAX_PROMPT}자 이하)`, code: 400 };
  if (!prompt) return { ok: false, error: '지시 내용을 입력하세요', code: 400 };

  // 후속 지시는 부모 업무의 세션·담당을 이어받는다
  let resume = null, parent = null;
  if (mode === 'followup') {
    parent = tasks.get(String(parentId || ''));
    if (!parent) return { ok: false, error: '이어갈 원래 업무를 찾을 수 없습니다 (서버 재시작 시 세션 목록이 비워집니다)', code: 404 };
    if (!parent.sessionId) return { ok: false, error: '원래 업무에 세션 기록이 없어 이어갈 수 없습니다', code: 409 };
    if (parent.status === 'running') return { ok: false, error: '원래 업무가 아직 실행 중입니다', code: 409 };
    resume = parent.sessionId;
    target = parent.target;
    if (!pillar) pillar = parent.pillar || null;   // 후속은 같은 방향의 일이다
  } else if (mode === 'agent') {
    if (!knownAgents().has(target)) return { ok: false, error: `등록되지 않은 담당자입니다: ${target}`, code: 400 };
  } else if (mode === 'team') {
    if (!Object.hasOwn(TEAM_FORMATIONS, target)) return { ok: false, error: `없는 편성입니다: ${target}`, code: 400 };
  } else if (mode === 'skill') {
    if (!skillExists(target)) return { ok: false, error: `없는 스킬입니다: ${target}`, code: 400 };
  }

  if (runningCount() >= MAX_CONCURRENT) {
    return { ok: false, error: `동시 실행 상한(${MAX_CONCURRENT}건)에 도달했습니다. 진행 중인 업무가 끝난 뒤 다시 지시하세요.`, code: 429 };
  }

  // 전략 기둥 · 없거나 모르는 값이면 운영으로 (creator-os 의 TIES TO 패턴)
  const pillars = (readConfig().pillars || []);
  const pf = pillars.find(x => x.key === pillar) || pillars.find(x => x.key === 'ops') || null;
  pillar = pf ? pf.key : null;


  // 실행 커맨드: agent 모드는 그 직원 정의를 systemPrompt 로, 그 외는 트루먼이 받는다.
  //   followup 은 부모가 돌던 러너를 그대로 재사용해야 systemPrompt 가 일치한다
  const runnerAgent = mode === 'followup' ? parent.runnerAgent : (mode === 'agent' ? target : ORCHESTRATOR);
  // 스킬 모드는 이미 스킬 지정이므로 자동 결합하지 않는다
  const autoSkill = mode === 'skill' ? { id: null, mine: target } : skillForAgent(runnerAgent);
  const fullPrompt = buildPrompt({ mode, target, prompt, allowPublish, pillarName: pf ? pf.name : '', goalName: typeof goal === 'string' ? goal.trim().slice(0, 120) : '', plan: plan === true, format: format === 'html' ? 'html' : 'md', runnerAgent, skill: autoSkill });

  // 어디서 돌릴지 (내 맥 · VPS · 맥미니)
  const rr = resolveRunner(mode === 'followup' ? (parent.runner || runner) : runner);
  if (!rr.ok) return { ok: false, error: rr.error, code: rr.code };
  const place = rr.runner;

  let cmd, args, stdinPrompt = false;
  if (place.kind === 'ssh') {
    cmd = 'ssh';
    args = sshArgs(place, runnerAgent, effort, resume);
    stdinPrompt = true;                     // 프롬프트는 표준입력으로 (셸 해석 차단)
  } else if (verify === true && !resume) {
    // 자동 검증 루프 · 생산 → 6축 검수 → 반려 재작성 (scripts/verify-loop.mjs · SDK 2중 루프)
    cmd = process.execPath;
    args = [path.join('scripts', 'verify-loop.mjs'), runnerAgent, '--stdin-prompt'];
    if (effort) args.push('--effort', effort);
    stdinPrompt = true;
  } else {
    cmd = process.execPath;
    args = [path.join('scripts', 'agent-runner.mjs'), runnerAgent, fullPrompt];
    if (effort) args.push('--effort', effort);
    if (resume) args.push('--resume', resume);
  }

  const id = 't' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
  const task = {
    id, mode, target: target || runnerAgent, runnerAgent, prompt, effort, allowPublish,
    runner: place.key, runnerName: place.name, source: source === '채팅' ? '채팅' : '대시보드', pillar,
    // 어떤 업무 목표(마감)를 위한 일인가 · 목표별 진척을 세려면 여기 붙어 있어야 한다
    goal: typeof goal === 'string' && goal.trim() ? goal.trim().slice(0, 120) : null,
    title: shortTitle(prompt),
    verify: verify === true && !resume,
    skillUsed: autoSkill ? (autoSkill.mine || autoSkill.id) : null,   // 무엇으로 일했나 (계측)
    parentId: parent ? parent.id : null, sessionId: resume,
    status: 'running', startedAt: Date.now(), endedAt: null,
    exitCode: null, cost: null, turns: null, outputFile: null, approvals: [], error: null,
    log: '', logLen: 0, truncated: false,
  };
  tasks.set(id, task);
  pruneTasks();
  // 이어서 지시가 나가면 부모의 승인 차례는 처리된 것이다 (같은 건이 큐에 계속 남는 문제 · 2026-08-02)
  if (parent && parent.approvals && parent.approvals.length && !parent.approvalsHandled) {
    parent.approvalsHandled = true;
    persist(parent);
  }

  // 로그는 처음부터 파일로 쓴다. 자식은 detached 라 대시보드 서버가 재시작·중단돼도
  // 업무는 계속 돈다 (2026-08-02 수리 · 승인 후속 3건이 서버 재시작에 같이 죽은 사고 재발 방지).
  let child, logFd = null;
  const logAbs = path.join(TASK_DIR, `${id}.log`);
  try {
    fs.mkdirSync(TASK_DIR, { recursive: true });
    logFd = fs.openSync(logAbs, 'a');
    child = spawn(cmd, args, {
      cwd: ROOT,
      env: { ...loadDotEnv(), ...process.env },   // 실제 셸 환경이 .env 를 덮어쓰도록(우선순위 유지)
      stdio: [stdinPrompt ? 'pipe' : 'ignore', logFd, logFd],
      detached: true,
    });
    child.unref();
    if (stdinPrompt) { child.stdin.end(fullPrompt, 'utf8'); }
  } catch (e) {
    task.status = 'error'; task.error = String(e); task.endedAt = Date.now();
    persist(task);
    return { ok: true, task: summary(task) };
  } finally {
    if (logFd != null) { try { fs.closeSync(logFd); } catch {} }
  }
  task.pid = child.pid;
  task.logFile = path.relative(ROOT, logAbs);
  task.fullPrompt = fullPrompt;   // 종료 후 로그에서 프롬프트 에코를 걷어낼 때 필요 (재시작 복구 포함)

  const timer = setTimeout(() => {
    if (task.status === 'running') { task.timedOut = true; try { child.kill('SIGTERM'); } catch {} }
  }, TIMEOUT_MS);
  timer.unref?.();

  child.on('error', (e) => { task.error = String(e); });
  child.on('close', (code, signal) => {
    clearTimeout(timer);
    finalizeTask(task, code, signal);
  });

  persist(task);
  return { ok: true, task: summary(task) };
}

/**
 * 업무 종료 처리 · 로그 파일을 회수해 턴·비용·산출물·승인·요약을 뽑는다.
 * 서버가 살아있을 때(close 이벤트)와 재시작 후 감시자(watchdog)가 발견했을 때 모두 이 길로 온다.
 */
function finalizeTask(task, code, signal) {
  if (task.finalized) return;
  task.finalized = true;
  task.exitCode = code;
  task.endedAt = task.endedAt || Date.now();
  // 파일에 쌓인 로그를 메모리로 회수 (상한 초과분은 앞을 버림)
  try {
    const abs = path.join(ROOT, task.logFile || path.join('outputs', 'tasks', task.id + '.log'));
    const st = fs.statSync(abs);
    if (st.size > MAX_LOG) {
      const fd = fs.openSync(abs, 'r');
      const buf = Buffer.alloc(MAX_LOG);
      fs.readSync(fd, buf, 0, MAX_LOG, st.size - MAX_LOG);
      fs.closeSync(fd);
      task.log = buf.toString('utf8'); task.truncated = true;
    } else task.log = fs.readFileSync(abs, 'utf8');
    task.logLen = task.log.length;
  } catch { /* 로그 파일이 없으면 빈 채로 간다 */ }

  if (task.stopRequested) task.status = 'stopped';
  else if (task.timedOut) { task.status = 'error'; task.error = TIMEOUT_MIN + '분 초과로 중단됨'; }
  else if (code == null) task.status = /─ 완료 ·/.test(task.log.slice(-2000)) ? 'done' : 'error';
  else task.status = code === 0 ? 'done' : 'error';
  if (code == null && task.status === 'error') task.error = task.error || '프로세스가 종료됐습니다 (서버 재시작 사이)';
  if (signal && !task.stopRequested) task.error = task.error || `시그널 ${signal} 로 종료`;

  const m = task.log.match(/턴\s+(\d+|\?)\s+·\s+비용\s+\$([0-9.]+|\?)/);
  if (m) { task.turns = m[1] === '?' ? null : Number(m[1]); task.cost = m[2] === '?' ? null : Number(m[2]); }
  const sess = task.log.match(/─ session:\s*([A-Za-z0-9-]+)/);
  if (sess) task.sessionId = sess[1];

  const body = task.fullPrompt ? task.log.split(task.fullPrompt).join('\n') : task.log;
  // 공백 포함 경로·절대 경로 대응 (2026-08-02 실전 버그)
  // 이 업무가 스스로 밝힌 파일 = 확실한 산출물 (여러 줄이면 전부)
  const declared = [];
  for (const m of body.matchAll(/^완료:\s*(.+\.(?:md|html|csv|json|pptx|docx|pdf))\s*$/gm)) {
    let rel = m[1].trim();
    if (rel.startsWith(ROOT)) rel = path.relative(ROOT, rel);
    if (fs.existsSync(path.join(ROOT, rel)) && !declared.includes(rel)) declared.push(rel);
  }
  if (declared.length) task.outputFile = declared[declared.length - 1];
  // 동시 실행이 겹치면 시간대 수집은 남의 파일을 끌어온다 (실측: "산출물 18개" 중 실제는 1~2개).
  // 그래서 밝힌 파일이 있으면 그것만 산출물로 세고, 시간대 수집분은 "그 시간에 생긴 파일"로 따로 둔다.
  let sameWindow = [];
  try { sameWindow = collectOutputs(task.startedAt, task.endedAt, null); } catch { sameWindow = []; }
  task.outputFiles = declared.length
    ? declared.map(rel => { let size = null; try { size = fs.statSync(path.join(ROOT, rel)).size; } catch {} return { rel, size }; })
    : sameWindow;
  task.declaredOutputs = declared.length;
  task.windowFiles = declared.length ? sameWindow.filter(f => !declared.includes(f.rel)).length : 0;
  try { task.resultSummary = extractSummary(body); } catch { task.resultSummary = null; }
  task.approvals = [...new Set([...body.matchAll(/⏸\s*승인 필요\s*:?\s*(.+)/g)]
    .map(x => x[1].trim().replace(/[`*]/g, '').slice(0, 200))
    .filter(t => t && !/^\.{3}|^\.\.\./.test(t)))].slice(0, 10);
  // 소집 명단 · 하네스가 마지막에 출력하는 "소집: a · b · c" 한 줄
  const crew = ([...body.matchAll(/^소집:\s*(.+)$/gm)].pop() || [])[1];
  const routed = ([...body.matchAll(/^배분:\s*(.+)$/gm)].pop() || [])[1];
  task.routedTo = routed ? routed.trim().replace(/[`*]/g, '').slice(0, 80) : null;
  task.crew = crew ? crew.split(/[·,]/).map(s => s.trim().replace(/[`*]/g, '')).filter(Boolean).slice(0, 12) : [];
  try { writeTeamLog(task); } catch { /* 관측이 본 작업을 막지 않는다 */ }
  persist(task);
}

/** 하네스 지휘자 목록 (팀을 소집할 수 있는 사람) */
const CONDUCTORS = new Set(['youtube-content-orchestrator', 'sns-orchestrator', 'edu-orchestrator',
  'campaign-orchestrator', 'community-orchestrator', 'publishing-orchestrator', 'marketing-os-orchestrator']);
const isHarness = (t) => t.mode === 'team' || CONDUCTORS.has(t.runnerAgent) || /-lead$/.test(t.runnerAgent || '');

/**
 * 관측 (_conventions.md §J) · 하네스가 돌면 기계적으로 로그를 남긴다.
 *
 * 왜 자동인가: 2026-08-03 실측에서 logs/team-run/ 에 실제 로그가 0건이었다.
 * 에이전트에게 "남겨라"고 지시만 하면 안 남긴다. 그래서 우리가 아는 사실
 * (지휘자·모드·턴·비용·소요·산출물)은 여기서 직접 쓰고, 우리가 모르는 것
 * (누구를 소집했나)만 에이전트의 "소집:" 한 줄에 의존한다. 그 줄이 없으면
 * **미기록**이라고 적는다. 없는 걸 있는 것처럼 쓰지 않는다.
 */
function writeTeamLog(task) {
  if (!isHarness(task) || task.status === 'running') return;
  const d = new Date(task.startedAt || Date.now());
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dir = path.join(ROOT, 'logs', 'team-run');
  fs.mkdirSync(dir, { recursive: true });
  const mins = task.endedAt && task.startedAt ? Math.round((task.endedAt - task.startedAt) / 60000) : null;
  const files = (task.outputFiles || []).map(f => f.rel || f).filter(Boolean);
  const lines = [
    `# 팀 가동 로그 · ${(task.prompt || task.target || '').slice(0, 60)}`,
    ``,
    `> 자동 기록 (dispatch.mjs) · 규약 \`agents/_conventions.md §J\``,
    ``,
    `## 소집`,
    `- 시각: ${day} ${new Date(task.startedAt).toTimeString().slice(0, 5)}`,
    `- 지휘: \`${task.runnerAgent}\` · 모드: ${task.mode}${task.mode === 'team' ? ` (편성 ${task.target})` : ''}`,
    `- 팀원: ${task.crew && task.crew.length ? task.crew.map(c => '`' + c + '`').join(' · ') : '**미기록** (지휘자가 "소집:" 줄을 출력하지 않았다 · 실제 소집 여부 확인 불가)'}`,
    ``,
    `## 착지`,
    files.length ? files.map(f => `- \`${f}\``).join('\n') : '- 없음',
    ``,
    `## 해산`,
    `- 소요: ${mins == null ? '측정 안 됨' : mins + '분'} · 턴 ${task.turns ?? '?'} · 비용 $${task.cost ?? '?'}`,
    `- 승인 대기: ${(task.approvals || []).length}건`,
    `- 판정: ${task.status === 'done' && files.length ? '성공' : task.status === 'done' ? '**부분 성공** (착지 파일 없음)' : '**실패** · ' + (task.error || task.status)}`,
    ``,
  ];
  fs.writeFileSync(path.join(dir, `${day}-${task.id}.md`), lines.join('\n'));
}

/** pid 생존 확인 · 재시작으로 close 이벤트를 잃은 업무는 감시자가 종료를 발견한다 */
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
setInterval(() => {
  for (const t of tasks.values()) {
    if (t.status !== 'running' || !t.pid) continue;
    if (!alive(t.pid)) { finalizeTask(t, null, null); continue; }
    if (Date.now() - t.startedAt > TIMEOUT_MS && !t.timedOut) {
      t.timedOut = true;
      try { process.kill(-t.pid, 'SIGTERM'); } catch { try { process.kill(t.pid, 'SIGTERM'); } catch {} }
    }
  }
}, 5000).unref?.();

export function stopTask(id) {
  const t = tasks.get(id);
  if (!t) return { ok: false, error: '없는 작업입니다', code: 404 };
  if (t.status !== 'running') return { ok: false, error: '이미 종료된 작업입니다', code: 409 };
  t.stopRequested = true;
  // detached 자식은 프로세스 그룹 리더다 · 그룹째 종료해야 MCP 손자 프로세스가 안 남는다
  try { process.kill(-t.pid, 'SIGTERM'); } catch { try { process.kill(t.pid, 'SIGTERM'); } catch (e) { return { ok: false, error: String(e), code: 500 }; } }
  return { ok: true };
}

/**
 * 이 업무가 도는 동안 outputs/ 에 생긴 파일을 전부 수집한다.
 * 동시 실행(최대 3건)이 겹치면 남의 파일이 섞일 수 있어, UI 라벨은
 * "이 업무 시간에 생긴 산출물"로 정직하게 쓴다. tasks/ 감사 기록은 제외.
 */
function collectOutputs(startedAt, endedAt, primary) {
  const found = [];
  const days = new Set([startedAt, endedAt].filter(Boolean).map((t) => {
    const d = new Date(t); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }));
  for (const day of days) {
    const base = path.join(ROOT, 'outputs', day);
    const walk = (dir) => {
      let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'tasks') walk(fp); continue; }
        try {
          const st = fs.statSync(fp);
          if (st.mtimeMs >= startedAt - 2000 && st.mtimeMs <= (endedAt || Date.now()) + 2000) {
            found.push({ rel: path.relative(ROOT, fp), size: st.size, mtimeMs: st.mtimeMs });
          }
        } catch { /* skip */ }
      }
    };
    walk(base);
  }
  found.sort((a, b) => a.mtimeMs - b.mtimeMs);
  const rels = found.map((x) => x.rel);
  if (primary && !rels.includes(primary)) found.unshift({ rel: primary, size: null, mtimeMs: startedAt });
  return found.slice(0, 20);
}

/**
 * 실행 로그 꼬리에서 "마지막 보고"를 뽑는다 (프롬프트 에코 제거본 기준).
 * 러너 메타 줄(턴·비용·session)과 마커 줄은 걷어내고 마지막 문단만 남긴다.
 */
function extractSummary(body) {
  const lines = String(body).split('\n');
  // 마지막 "완료:" 줄(없으면 세션 마커, 그것도 없으면 끝)에서 위로 걷어 올라간다
  let end = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^완료:\s/.test(lines[i].trim()) || /^─ session:/.test(lines[i])) { end = i; break; }
  }
  // 에코된 지시·규약·러너 배너를 만나면 멈춘다 (거기부터 위는 우리가 넣은 문장이다)
  const echo = /산출물은 \*\*파일로 먼저\*\*|헤드리스 실행|\*\*실행 금지\*\*|^## (요청|실행 규약)|^▶ |^\s*요청: \[대시보드|^\[방향\]|^\[대시보드|넘겨 완수해 주세요|^─ |^\s*\(이어가기 · session /;
  const picked = [];
  for (let i = end - 1; i >= 0 && picked.length < 16; i--) {
    const l = lines[i];
    if (echo.test(l)) break;
    if (/^턴\s+\d|session:/.test(l.trim())) continue;
    picked.unshift(l);
  }
  const tail = picked.join('\n').replace(/^\s+|\s+$/g, '');
  return tail ? tail.slice(-900) : null;
}

// ── 조회 ─────────────────────────────────────────────────────────────
const summary = (t) => ({
  id: t.id, mode: t.mode, target: t.target, prompt: t.prompt, effort: t.effort,
  allowPublish: t.allowPublish, status: t.status, startedAt: t.startedAt, endedAt: t.endedAt,
  exitCode: t.exitCode, cost: t.cost, turns: t.turns, outputFile: t.outputFile,
  outputFiles: t.outputFiles || [], resultSummary: t.resultSummary || null,
  publishedAt: t.publishedAt || null, publishedUrl: t.publishedUrl || null,
  // 마무리 분류 (2026-08-03 전략 1단계) · 자동화 판정의 근거가 되는 두 신호
  automation: t.automation || null, used: t.used === undefined ? null : t.used,
  outcomeAt: t.outcomeAt || null, outcomeNote: t.outcomeNote || null,
  openedAt: t.openedAt || null,
  // 사람이 안 눌러도 쓸 수 있게 추정을 같이 내려 준다 (저장은 안 한다 · 사람 값이 늘 우선)
  guess: guessOutcome(t),
  archivedAt: t.archivedAt || null, crew: t.crew || [], routedTo: t.routedTo || null, goal: t.goal || null,
  declaredOutputs: t.declaredOutputs || 0, windowFiles: t.windowFiles || 0, title: t.title || null,
  approvalsHandled: t.approvalsHandled === true,
  verify: t.verify === true,
  skillUsed: t.skillUsed || null,
  approvals: t.approvals || [], parentId: t.parentId || null,
  runner: t.runner || 'local', runnerName: t.runnerName || null, source: t.source || '대시보드', pillar: t.pillar || null,
  canFollowup: t.status !== 'running' && !!t.sessionId,
  error: t.error, logLen: t.logLen,
});

/** 기둥(무엇을 위해) 재지정 · 자동 승계가 틀렸을 때 사람이 바로잡는다 */
export function setTaskPillar(id, pillar) {
  const t = tasks.get(id);
  if (!t) return { ok: false, error: '없는 작업입니다', code: 404 };
  const list = (readConfig().pillars || []);
  if (!list.find(x => x.key === pillar)) return { ok: false, error: '없는 기둥입니다', code: 400 };
  t.pillar = pillar;
  persist(t);
  return { ok: true, task: summary(t) };
}

/**
 * 업무를 마무리하며 분류한다 (2026-08-03 · 전략 1단계)
 *
 * 문서까지 나온 뒤 갈 곳이 없어 94건 중 3건만 보관됐다. 여기서 두 가지를 받는다.
 *
 *   used       · 이 문서를 실제로 썼는가 (true·false·null)
 *   automation · 앞으로 어떻게 할 것인가
 *                none    반복할 일 아님 · 여기서 끝
 *                skill   반복될 것 같다 · 먼저 스킬로 굳힌다  ← 자동화 앞 칸
 *                auto    이미 스킬로 굳었다 · 자동화로 올린다
 *
 * 왜 skill 이 따로 있나: 실측에서 반복 업무의 스킬 사용률이 0~38% 였다.
 * 절차가 안 굳은 것을 자동화하면 제각각인 산출물을 매일 찍어낸다.
 * 그래서 발견 → 스킬로 굳히기 → 자동화 3단으로 간다 (대표 승인 2026-08-03).
 *
 * used 를 같이 받는 이유: 반복 횟수만으로 후보를 뽑으면 테스트성 업무가 올라온다.
 * 실측에서 voc-analyzer 9회 중 6회가 테스트였다. "실제로 썼나" 가 2차 조건이다.
 */
/**
 * 산출물을 파트너사에서 열었다 · 행동에서 얻는 사용 신호 (2026-08-03)
 *
 * "이 문서 실제로 썼나" 를 버튼으로 물으면 안 눌린다 (승인 버튼 전례: 42건 중 29건 방치).
 * 그런데 문서를 열어 이어서 작업했다면 그건 쓴 것이다. 이미 하는 행동이라 클릭이 늘지 않는다.
 */
export function markOpened(id) {
  const t = tasks.get(id);
  if (!t) return { ok: false, error: '없는 작업입니다', code: 404 };
  t.openedAt = Date.now();
  persist(t);
  return { ok: true };
}

/**
 * 분류 추정 · 사람이 안 눌러도 데이터가 남게 한다 (2026-08-03 · 검토 의견 1)
 *
 * ⚠️ 저장하지 않는다. 읽을 때 계산한다.
 *    추정을 저장하면 나중에 "사람이 그렇게 판단했다" 와 구분이 안 된다.
 *    사람이 고른 값(t.automation·t.used)이 있으면 그것이 언제나 우선이다.
 *
 * 근거는 전부 이미 있는 신호다.
 *   썼다   · 발행됨 · 파트너사에서 열었음 · 후속이 붙음
 *   못 썼다 · 산출물이 없음
 *   반복   · 같은 담당을 몇 번 시켰나 + 그중 스킬을 거친 비율
 */
export function guessOutcome(t, all) {
  const list = all || [...tasks.values()];
  const out = (t.outputFiles || []).length || t.outputFile;
  let used = null, usedWhy = '';
  if (t.publishedAt) { used = true; usedWhy = '발행함'; }
  else if (t.openedAt) { used = true; usedWhy = '파트너사에서 열었음'; }
  else if (list.some(x => x.parentId === t.id)) { used = true; usedWhy = '후속이 붙음'; }
  else if (!out) { used = false; usedWhy = '산출물이 없음'; }

  // 후속·승인·점검 업무는 그 자체가 자동화 대상이 아니다 (원 업무에 딸린 것이다)
  if (t.parentId || TEST_LIKE.test(t.prompt || ''))
    return { used, usedWhy, automation: 'none', autoWhy: t.parentId ? '앞 업무에 딸린 후속' : '점검·승인 업무' };

  // 같은 담당이 아니라 같은 지시를 센다 (후보 판정과 같은 기준을 쓴다)
  const key = repeatSig(t);
  const same = key ? list.filter(x => repeatSig(x) === key && !TEST_LIKE.test(x.prompt || '') && !x.parentId) : [];
  const days = new Set(same.map(x => new Date(x.startedAt).toISOString().slice(0, 10)));
  const skillRate = same.length ? same.filter(x => skillOf(x)).length / same.length : 0;
  let automation = 'none', autoWhy;
  if (same.length >= 3 && days.size >= 2) {
    automation = skillRate >= 0.6 ? 'auto' : 'skill';
    autoWhy = `같은 지시 ${same.length}회 · 스킬 ${Math.round(skillRate * 100)}%`;
  } else if (same.length < 3) {
    autoWhy = `같은 지시를 ${same.length}번 시켰습니다 · 3번은 넘어야 반복입니다`;
  } else {
    autoWhy = `${same.length}회지만 하루에 몰렸습니다 · 다른 날에도 나와야 반복입니다`;
  }
  return { used, usedWhy, automation, autoWhy };
}

/**
 * gbrain 대기줄 (2026-08-03 · A안)
 *
 * 왜 큐인가: 이 서버는 순수 node 라 MCP 를 직접 못 부른다. gbrain 에 쓰려면 에이전트를
 * 띄워야 하는데, 분류할 때마다 띄우면 건당 돈이 나간다 (하루 15.8건 × $0.016~).
 * 그래서 여기 쌓아 두고 한 번에 한 세션으로 올린다.
 *
 * 왜 전부 안 올리나: gbrain 에 남아야 할 것은 "무엇이 반복되고 무엇을 자동화했나" 지
 * 매일의 초안이 아니다. 그래서 skill·auto 로 분류된 것만 넣는다 (none 은 안 넣는다).
 * 목표가 자동화 90% 라, 그 판단에 쓰이는 기록만 남긴다.
 */
const GBRAIN_QUEUE = path.join(ROOT, 'outputs', 'gbrain-queue.jsonl');
function queueForGbrain(t) {
  try {
    fs.mkdirSync(path.dirname(GBRAIN_QUEUE), { recursive: true });
    fs.appendFileSync(GBRAIN_QUEUE, JSON.stringify({
      id: t.id, at: Date.now(), automation: t.automation, used: t.used ?? null,
      target: t.target || t.runnerAgent || '', pillar: t.pillar || null,
      title: t.title || (t.prompt || '').slice(0, 80).replace(/\n/g, ' '),
      skillUsed: t.skillUsed || null,
      outputFile: t.outputFile || ((t.outputFiles || [])[0] || {}).rel || null,
    }) + '\n');
  } catch (e) { /* 큐 실패로 분류 자체를 막지 않는다 */ }
}
export function gbrainQueue() {
  try {
    return fs.readFileSync(GBRAIN_QUEUE, 'utf8').split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean);
  } catch { return []; }
}
export function clearGbrainQueue() {
  try { fs.rmSync(GBRAIN_QUEUE, { force: true }); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e) }; }
}

const AUTOMATION_KINDS = new Set(['none', 'skill', 'auto']);
export function setTaskOutcome(id, { used, automation, note } = {}) {
  const t = tasks.get(id);
  if (!t) return { ok: false, error: '없는 작업입니다', code: 404 };
  if (automation !== undefined) {
    if (!AUTOMATION_KINDS.has(automation)) return { ok: false, error: '없는 분류입니다', code: 400 };
    const changed = t.automation !== automation;
    t.automation = automation;
    // 반복으로 판정된 것만 gbrain 으로 (none 은 안 남긴다)
    if (changed && (automation === 'skill' || automation === 'auto')) queueForGbrain(t);
  }
  if (used !== undefined) t.used = used === null ? null : used === true;
  if (typeof note === 'string') t.outcomeNote = note.trim().slice(0, 300);
  t.outcomeAt = Date.now();
  persist(t);
  return { ok: true, task: summary(t) };
}

/**
 * 자동화 후보 · 반복되고 있는데 아직 분류 안 된 업무를 시스템이 먼저 찾아 올린다.
 * 사람이 발견할 때까지 기다리지 않는다 (실측: linkedin-post-writer 3일에 16회).
 *
 * 기준 두 가지를 모두 넘어야 후보다.
 *   ① 같은 담당을 3회 이상 · 서로 다른 날에 시켰다  (한 번에 몰아친 건 반복이 아니다)
 *   ② 테스트성 지시가 아니다
 */
const TEST_LIKE = /^(스모크|테스트|.{0,10}(확인용|점검용|검증용|리허설)|위 초안을 승인|\[리더 피드백)/;

/**
 * 이 업무가 스킬을 거쳤나 (2026-08-03 수리)
 *
 * skillUsed 는 Skill 도구로 실행된 것만 기록된다. 그런데 실제로는 프롬프트에
 * "skills/검토-운영/SKILL.md 절차대로" 처럼 경로를 지목해 쓰는 경우가 더 많다.
 * 실측: 기록 11건 vs 지목 13건 · 지목했는데 기록 안 된 것이 11건이었다.
 * 그대로 두면 스킬률 18% 로 세어져 이미 스킬을 쓰는 업무에도 "스킬화 먼저" 라고 권한다.
 * (실제값은 35%)
 */
const SKILL_REF = /skills\/[^\s/]+\/SKILL\.md|my-[가-힣a-zA-Z-]+|스킬 규격|규격대로|규격 준수/;
export function skillOf(t) {
  if (t.skillUsed) return t.skillUsed;
  const m = (t.prompt || '').match(/skills\/([^\s/]+)\/SKILL\.md/);
  if (m) return m[1];
  const w = (t.prompt || '').match(/my-[가-힣a-zA-Z-]+/);
  if (w) return w[0];
  return SKILL_REF.test(t.prompt || '') ? '(규격 지목)' : null;
}

/**
 * 반복 서명 · 같은 일을 다시 시킨 것인가 (2026-08-03 수리)
 *
 * 전에는 담당(target)으로 묶었다. 그랬더니 ops-lead 12회가 후보로 올라왔는데
 * 열어 보니 조직진단 4 · 채용 2 · 검토 2 · 회고 1 · 팀수행 2 · download 1 로
 * 서로 다른 6가지 일이었다. 담당이 같을 뿐 반복이 아니다.
 * 같은 일을 다시 시킬 때는 지시문 도입부가 거의 같으므로 그것으로 묶는다.
 */
function repeatSig(t) {
  return (t.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

export function automationCandidates() {
  const by = new Map();
  for (const t of tasks.values()) {
    if (TEST_LIKE.test(t.prompt || '')) continue;
    if (t.parentId) continue;                       // 후속은 원 업무에 딸린 것이라 따로 세지 않는다
    const key = repeatSig(t);
    if (!key) continue;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(t);
  }
  const all = [...tasks.values()];
  const out = [], warming = [];
  for (const [sig, list] of by) {
    const days = new Set(list.map(t => new Date(t.startedAt).toISOString().slice(0, 10)));
    /* 임계(3회·다른 날)를 아직 못 넘었지만 2회 이상인 것 · "다가오는 것" 으로 따로 보여 준다.
       임계를 낮추면 노이즈가 들어오고, 안 보여 주면 화면이 늘 비어 쓸모가 없다.
       자동화는 되돌리기 어려우니 임계는 유지하고 관측만 열어 둔다. */
    if (list.length === 2 || (list.length >= 3 && days.size < 2)) {
      warming.push({
        sig, target: list[0].target || list[0].runnerAgent || '',
        runs: list.length, days: days.size,
        need: list.length < 3 ? `${3 - list.length}회 더` : '다른 날에 한 번 더',
      });
      continue;
    }
    if (list.length < 3 || days.size < 2) continue;
    const withSkill = list.filter(t => skillOf(t)).length;
    const settled = list.filter(t => t.automation && t.automation !== 'none').length;
    const target = list[0].target || list[0].runnerAgent || '';
    /* 이 담당의 산출물이 실제로 쓰였나 · 사람이 고른 값이 있으면 그것, 없으면 추정.
       반복 횟수만으로 후보를 뽑으면 테스트성 업무가 올라온다 (voc-analyzer 9회 중 6회가 테스트였다). */
    const judged = list.map(t => (t.used !== undefined && t.used !== null) ? t.used : guessOutcome(t, all).used);
    const usedN = judged.filter(v => v === true).length;
    const knownN = judged.filter(v => v !== null).length;
    out.push({
      sig, target, runs: list.length, days: days.size,
      perDay: +(list.length / days.size).toFixed(1),
      skillRate: Math.round(withSkill / list.length * 100),
      // 절차가 안 굳었으면 자동화가 아니라 스킬화가 먼저다
      next: withSkill / list.length >= 0.6 ? 'auto' : 'skill',
      settled,
      usedN, knownN,   // 산출물이 실제로 쓰인 횟수 / 판정 가능했던 횟수
      sample: (list[0].prompt || '').slice(0, 70).replace(/\n/g, ' '),
    });
  }
  out.sort((a, b) => b.runs - a.runs);
  warming.sort((a, b) => b.runs - a.runs);
  out.warming = warming;
  return out;
}

/** 승인 차례에서 넘기기 · 처리했거나 필요 없어진 승인 요청을 사람이 정리한다 */
/** 지난 업무에 목표를 나중에 붙인다 (C-16) */
export function setTaskGoal(id, goal) {
  const t = tasks.get(id);
  if (!t) return { ok: false, error: '없는 작업입니다', code: 404 };
  t.goal = typeof goal === 'string' && goal.trim() ? goal.trim().slice(0, 120) : null;
  persist(t);
  return { ok: true, task: summary(t) };
}

export function dismissApprovals(id) {
  const t = tasks.get(id);
  if (!t) return { ok: false, error: '없는 작업입니다', code: 404 };
  t.approvalsHandled = true;
  persist(t);
  return { ok: true, task: summary(t) };
}

/** 발행 확인 · 사람이 실제 채널에 올린 뒤 남기는 기록 (시스템이 발행했다고 지어내지 않는다) */
export function markPublished(id, url) {
  const t = tasks.get(id);
  if (!t) return { ok: false, error: '없는 작업입니다', code: 404 };
  t.publishedAt = Date.now();
  t.publishedUrl = (typeof url === 'string' && /^https?:\/\//.test(url.trim())) ? url.trim().slice(0, 500) : null;
  persist(t);
  return { ok: true, task: summary(t) };
}

/**
 * 업무 보관 · 수명주기의 마지막 칸 (2026-08-03).
 *
 * 왜 필요한가: 확인·발행까지 끝난 업무가 화면에 계속 남으면 보드가 쌓이기만 한다.
 * 삭제가 아니라 **보관**이다. 기록(outputs/tasks)은 그대로 남고 보드에서만 내려간다.
 * 되돌리려면 restoreTask.
 */
export function archiveTask(id) {
  const t = tasks.get(id);
  if (!t) return { ok: false, error: '없는 작업입니다', code: 404 };
  if (t.status === 'running') return { ok: false, error: '진행 중인 업무는 보관할 수 없습니다', code: 409 };
  t.archivedAt = Date.now();
  persist(t);
  return { ok: true, task: summary(t) };
}
export function restoreTask(id) {
  const t = tasks.get(id);
  if (!t) return { ok: false, error: '없는 작업입니다', code: 404 };
  t.archivedAt = null;
  persist(t);
  return { ok: true, task: summary(t) };
}

/** 진행 중 업무의 로그 마지막 한 줄 · "지금 뭘 하는지" 실시간 표시용 */
function lastLogLine(t) {
  if (t.status !== 'running' || !t.logFile) return null;
  try {
    const abs = path.join(ROOT, t.logFile);
    const size = fs.statSync(abs).size;
    if (!size) return null;
    const fd = fs.openSync(abs, 'r');
    const len = Math.min(size, 600);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split('\n').map(x => x.trim()).filter(x => x && !/^[─═]|^\[/.test(x));
    return (lines.pop() || '').slice(0, 90) || null;
  } catch { return null; }
}

export function listTasks() {
  return [...tasks.values()].sort((a, b) => b.startedAt - a.startedAt).map(t => ({ ...summary(t), lastLine: lastLogLine(t) }));
}

/** offset 이후의 로그만 잘라 반환 (증분 폴링) */
export function taskLog(id, offset = 0) {
  const t = tasks.get(id);
  if (!t) return null;
  // 실행 중(또는 파일 로그가 있는) 업무는 파일에서 바로 읽는다 · 서버 재시작과 무관하게 이어진다
  const abs = t.logFile ? path.join(ROOT, t.logFile) : null;
  if (abs && t.status === 'running') {
    try {
      const size = fs.statSync(abs).size;
      const from = Math.max(0, Math.min(size, offset));
      const len = Math.min(size - from, 128 * 1024);
      let chunk = '';
      if (len > 0) {
        const fd = fs.openSync(abs, 'r');
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, from);
        fs.closeSync(fd);
        chunk = buf.toString('utf8');
      }
      return { ...summary(t), truncated: false, offset: from, chunk, nextOffset: from + len };
    } catch { /* 파일이 아직 없으면 아래 메모리 경로 */ }
  }
  const base = t.truncated ? Math.max(0, t.logLen - t.log.length) : 0;
  const from = Math.max(0, Math.min(t.log.length, offset - base));
  return { ...summary(t), truncated: t.truncated, offset: base + from, chunk: t.log.slice(from), nextOffset: t.logLen };
}

/** 메모리에는 최근 KEEP_TASKS 건만 유지 (실행 중인 것은 절대 버리지 않는다) */
function pruneTasks() {
  if (tasks.size <= KEEP_TASKS) return;
  const done = [...tasks.values()].filter(t => t.status !== 'running').sort((a, b) => a.startedAt - b.startedAt);
  let over = tasks.size - KEEP_TASKS;
  for (const t of done) { if (over <= 0) break; tasks.delete(t.id); over--; }
}

function persist(task) {
  // DB 는 정본, 파일은 감사 기록. DB 가 죽어도 무엇을 시켰는지는 디스크에 남아야 한다.
  if (dbReady()) saveTask(task).catch(() => {});
  try {
    fs.mkdirSync(TASK_DIR, { recursive: true });
    // sessionId·runnerAgent 는 summary() 에 없지만 저장해야 한다.
    // 없으면 서버 재시작 후 되살린 업무에서 "이어서 지시" 가 동작하지 않는다.
    fs.writeFileSync(path.join(TASK_DIR, `${task.id}.json`), JSON.stringify({
      ...summary(task), sessionId: task.sessionId || null, runnerAgent: task.runnerAgent || null,
      runner: task.runner || 'local', log: task.log,
      pid: task.pid || null, logFile: task.logFile || null, fullPrompt: task.fullPrompt || null,
    }, null, 2));
  } catch { /* 감사 로그는 실패해도 실행을 막지 않는다 */ }
}
