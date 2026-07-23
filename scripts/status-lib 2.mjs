/**
 * status-lib.mjs · 마케팅 OS 현황 스캔 공용 라이브러리
 * status-scan.mjs(정적 현황판)와 tools/dashboard/server.mjs(실시간 대시보드)가 공유한다.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 공용 시간 상수 (여러 스캐너·뷰가 동일 기준을 쓰도록 한 곳에 정의)
export const DAY_MS = 24 * 3600 * 1000;       // 세션·호출 조회 창
export const ACTIVE_WINDOW_MS = 10 * 60000;   // 세션·팀 "작동 중" 판정
export const RUNNING_WINDOW_MS = 15 * 60000;  // 에이전트·스킬 호출 "작동 중" 판정
// 호출 집계 대상 세션 폴더 필터 (환경 의존 · 필요시 확장)
export const SESSION_FILTER = /marketing-os|marketing 100/i;

const sh = (cmd) => {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10000 }); }
  catch { return ''; }
};

export const ago = (ms) => {
  const m = Math.floor(ms / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 ${m % 60}분 전`;
  return `${Math.floor(h / 24)}일 전`;
};

// ── Claude Code 세션 ─────────────────────────────────────────────
export function scanSessions() {
  const projRoot = path.join(os.homedir(), '.claude', 'projects');
  const sessions = [];
  let dirs = [];
  try { dirs = fs.readdirSync(projRoot); } catch { return sessions; }
  const now = Date.now();
  for (const d of dirs) {
    const dir = path.join(projRoot, d);
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')); } catch { continue; }
    let latest = null;
    for (const f of files) {
      let st; try { st = fs.statSync(path.join(dir, f)); } catch { continue; }
      if (!latest || st.mtimeMs > latest.mtimeMs) latest = { file: path.join(dir, f), mtimeMs: st.mtimeMs };
    }
    if (!latest || now - latest.mtimeMs > DAY_MS) continue;
    let cwd = '';
    try {
      const fd = fs.openSync(latest.file, 'r');
      const buf = Buffer.alloc(16384);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);
      const m = buf.toString('utf8', 0, n).match(/"cwd"\s*:\s*"([^"]+)"/);
      if (m) cwd = m[1];
    } catch {}
    const label = cwd ? cwd.split('/').filter(Boolean).slice(-2).join('/') : d.replace(/^-Users-steve-/, '');
    sessions.push({ label, cwd, file: latest.file, mtimeMs: latest.mtimeMs, active: now - latest.mtimeMs < ACTIVE_WINDOW_MS });
  }
  return sessions.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

// ── launchd 자동화 ───────────────────────────────────────────────
export function scanLaunchd() {
  const loaded = new Map();
  for (const line of sh('launchctl list').split('\n')) {
    if (!/marketing/i.test(line)) continue;
    const [pid, status, label] = line.trim().split(/\s+/);
    if (label) loaded.set(label, { pid, status });
  }
  const jobs = [];
  const plistDirs = [
    path.join(ROOT, 'automation', 'launchd'),
    path.join(os.homedir(), 'Library', 'LaunchAgents'),
  ];
  const seen = new Set();
  for (const dir of plistDirs) {
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => f.endsWith('.plist') && /marketing/i.test(f)); } catch { continue; }
    for (const f of files) {
      let xml = '';
      try { xml = fs.readFileSync(path.join(dir, f), 'utf8'); } catch {}
      const label = (xml.match(/<key>Label<\/key>\s*<string>([^<]+)/) || [])[1] || f.replace('.plist', '');
      if (seen.has(label)) continue;
      seen.add(label);
      const hour = (xml.match(/<key>Hour<\/key>\s*<integer>(\d+)/) || [])[1];
      const minute = (xml.match(/<key>Minute<\/key>\s*<integer>(\d+)/) || [])[1];
      const schedule = hour != null ? `매일 ${String(hour).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}` : '';
      jobs.push({ label, schedule, loaded: loaded.has(label), running: loaded.has(label) && loaded.get(label).pid !== '-' });
    }
  }
  for (const [label, v] of loaded) if (!seen.has(label)) jobs.push({ label, schedule: '', loaded: true, running: v.pid !== '-' });
  return jobs;
}

// ── 디스코드 브리지(트루먼) ──────────────────────────────────────
export function scanDiscord() {
  const lines = sh('ps -axo pid,etime,command').split('\n')
    .filter(l => l.includes('claude-plugins-official/discord') && !l.includes('grep'));
  return { count: lines.length };
}

// ── 최근 산출물 ──────────────────────────────────────────────────
export function scanOutputs() {
  const outRoot = path.join(ROOT, 'outputs');
  let dirs = [];
  try { dirs = fs.readdirSync(outRoot).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse().slice(0, 3); } catch {}
  const groups = [];
  for (const d of dirs) {
    const files = [];
    const walk = (p, depth) => {
      if (depth > 2) return;
      let ents = [];
      try { ents = fs.readdirSync(p, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const fp = path.join(p, e.name);
        if (e.isDirectory()) walk(fp, depth + 1);
        else {
          let st; try { st = fs.statSync(fp); } catch { continue; }
          files.push({ rel: path.relative(path.join(outRoot, d), fp), mtimeMs: st.mtimeMs });
        }
      }
    };
    walk(path.join(outRoot, d), 0);
    files.sort((a, b) => b.mtimeMs - a.mtimeMs);
    groups.push({ date: d, files: files.slice(0, 8), total: files.length });
  }
  return groups;
}

// ── 실패 로그 ────────────────────────────────────────────────────
export function scanFailures() {
  const f = path.join(ROOT, 'logs', 'failures.jsonl');
  let lines = [];
  try { lines = fs.readFileSync(f, 'utf8').trim().split('\n').slice(-3); } catch {}
  return lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();
}

// ── git 변경사항 ─────────────────────────────────────────────────
export function scanGit() {
  const out = sh(`git -C "${ROOT}" status --porcelain`);
  const lines = out.split('\n').filter(Boolean);
  return { changed: lines.length, sample: lines.slice(0, 6).map(l => l.trim()) };
}

// ── 프론트매터 파서 (단순 YAML 부분집합) ─────────────────────────
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = Object.create(null); // 프로토타입 오염 방지 (__proto__ 키가 와도 안전)
  const BAD = new Set(['__proto__', 'constructor', 'prototype']);
  // 따옴표로 감싼 스칼라는 내부 '#'을 주석으로 보지 않는다
  const unquote = (s) => {
    const t = s.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
    return t.split(/\s+#/)[0].trim();
  };
  let curKey = null;
  for (const raw of m[1].split('\n')) {
    const item = raw.match(/^\s+-\s+(.*)$/);
    if (item && curKey) { if (!Array.isArray(out[curKey])) out[curKey] = []; out[curKey].push(unquote(item[1])); continue; }
    const kv = raw.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (kv) {
      if (BAD.has(kv[1])) { curKey = null; continue; }
      curKey = kv[1];
      const val = kv[2].trim();
      out[curKey] = val === '' ? [] : unquote(val);
    }
  }
  return out;
}

// ── 인벤토리 (에이전트·스킬·커맨드·워크플로·MCP) ─────────────────
export function scanInventory() {
  const agents = [];
  const walk = (dir, group) => {
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name.startsWith('_') || e.name === 'README.md') continue;
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) { walk(fp, group || e.name); continue; }
      if (!e.name.endsWith('.md')) continue;
      let text = '';
      try { text = fs.readFileSync(fp, 'utf8').slice(0, 6000); } catch { continue; }
      const fm = parseFrontmatter(text);
      if (!fm || !fm.name || typeof fm.name !== 'string') continue;
      agents.push({
        name: fm.name,
        group: group || '루트',
        file: path.relative(ROOT, fp),
        desc: typeof fm.description === 'string' ? fm.description : '',
        tools: Array.isArray(fm.tools) ? fm.tools : [],
        trigger: Array.isArray(fm.trigger) ? fm.trigger : (typeof fm.trigger === 'string' && fm.trigger ? [fm.trigger] : []),
        persona: typeof fm.persona === 'string' ? fm.persona : '',
        whenToUse: typeof fm.when_to_use === 'string' ? fm.when_to_use : '',
        chainsTo: typeof fm.chains_to === 'string' ? fm.chains_to : (Array.isArray(fm.chains_to) ? fm.chains_to.join(', ') : ''),
        gate: fm.gate === 'true',
      });
    }
  };
  walk(path.join(ROOT, 'agents'), null);

  const skills = [];
  try {
    for (const d of fs.readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true })) {
      if (!d.isDirectory() || d.name.startsWith('_')) continue;
      let desc = '';
      const sf = path.join(ROOT, 'skills', d.name, 'SKILL.md');
      try {
        const fm = parseFrontmatter(fs.readFileSync(sf, 'utf8').slice(0, 6000));
        if (fm && typeof fm.description === 'string') desc = fm.description;
      } catch {}
      skills.push({ name: d.name, file: path.join('skills', d.name, 'SKILL.md'), desc: desc.slice(0, 300) });
    }
  } catch {}

  const commands = [];
  try {
    for (const f of fs.readdirSync(path.join(ROOT, 'commands')).filter(f => f.endsWith('.md'))) {
      let desc = '';
      try {
        const fm = parseFrontmatter(fs.readFileSync(path.join(ROOT, 'commands', f), 'utf8').slice(0, 3000));
        if (fm && typeof fm.description === 'string') desc = fm.description;
      } catch {}
      commands.push({ name: '/' + f.replace('.md', ''), file: path.join('commands', f), desc });
    }
  } catch {}

  const listFiles = (p, ext) => { try { return fs.readdirSync(p).filter(f => f.endsWith(ext)); } catch { return []; } };
  return {
    agents,
    skills,
    commands,
    workflows: listFiles(path.join(ROOT, 'automation'), '.workflow.js'),
    cronScripts: listFiles(path.join(ROOT, 'automation', 'cron-jobs'), '.sh'),
    mcp: scanMcp(),
  };
}

// ── MCP 설정 ─────────────────────────────────────────────────────
export function scanMcp() {
  const servers = [];
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8'));
    for (const [name, v] of Object.entries(cfg.mcpServers || {})) {
      if (name.startsWith('_notes')) continue;
      servers.push({
        name,
        type: v.type || (v.command ? 'stdio(로컬)' : 'http(원격)'),
        detail: v.command ? [v.command, ...(v.args || [])].join(' ').slice(0, 90) : (v.url || '').slice(0, 90),
      });
    }
  } catch {}
  return servers;
}

// ── 에이전트·스킬 실제 호출 기록 ─────────────────────────────────
export function scanInvocations(sessions) {
  const agentCalls = [];
  const skillCalls = [];
  const targets = sessions.filter(s => SESSION_FILTER.test(s.cwd));
  // 세션 로그 각 줄을 JSON 파싱해 실제 tool_use 블록(Task/Skill)만 집계한다.
  // (예전 문자열 포함 검사는 tool_result·본문 언급까지 세어 KPI를 부풀렸다.)
  const collect = (block, t, label) => {
    if (!block || block.type !== 'tool_use' || !block.input) return;
    if ((block.name === 'Task' || block.name === 'Agent') && typeof block.input.subagent_type === 'string')
      agentCalls.push({ name: block.input.subagent_type, t, session: label });
    else if (block.name === 'Skill' && typeof block.input.skill === 'string')
      skillCalls.push({ name: block.input.skill, t, session: label });
  };
  for (const s of targets) {
    let text = '';
    try {
      if (fs.statSync(s.file).size > 80 * 1024 * 1024) continue;
      text = fs.readFileSync(s.file, 'utf8');
    } catch { continue; }
    for (const line of text.split('\n')) {
      if (!line.includes('tool_use')) continue; // 저렴한 사전 필터
      let rec; try { rec = JSON.parse(line); } catch { continue; }
      const t = rec.timestamp ? Date.parse(rec.timestamp) : NaN;
      if (!t || Date.now() - t > DAY_MS) continue;
      const content = rec.message?.content;
      if (Array.isArray(content)) for (const b of content) collect(b, t, s.label);
    }
  }
  agentCalls.sort((x, y) => y.t - x.t);
  skillCalls.sort((x, y) => y.t - x.t);
  return { agentCalls, skillCalls };
}

// ── 하네스 팀 ────────────────────────────────────────────────────
export function scanTeams() {
  const teamsRoot = path.join(os.homedir(), '.claude', 'teams');
  const teams = [];
  let dirs = [];
  try { dirs = fs.readdirSync(teamsRoot); } catch { return teams; }
  for (const d of dirs) {
    let cfg;
    try { cfg = JSON.parse(fs.readFileSync(path.join(teamsRoot, d, 'config.json'), 'utf8')); } catch { continue; }
    let active = false, lastMs = cfg.createdAt || 0;
    const cwd = cfg.members?.[0]?.cwd;
    if (cwd && cfg.leadSessionId) {
      const proj = cwd.replace(/[^a-zA-Z0-9-]/g, '-');
      try {
        const st = fs.statSync(path.join(os.homedir(), '.claude', 'projects', proj, `${cfg.leadSessionId}.jsonl`));
        lastMs = st.mtimeMs;
        active = Date.now() - st.mtimeMs < ACTIVE_WINDOW_MS;
      } catch {}
    }
    teams.push({ name: cfg.name || d, members: (cfg.members || []).map(m => m.name), createdAt: cfg.createdAt, lastMs, active });
  }
  return teams.sort((a, b) => b.lastMs - a.lastMs);
}

// ── 통합 스냅샷 ──────────────────────────────────────────────────
export function scanAll() {
  const sessions = scanSessions();
  return {
    generatedAt: Date.now(),
    sessions,
    jobs: scanLaunchd(),
    discord: scanDiscord(),
    outputs: scanOutputs(),
    failures: scanFailures(),
    git: scanGit(),
    calls: scanInvocations(sessions),
    teams: scanTeams(),
  };
}
