#!/usr/bin/env node
/**
 * server.mjs · 마케팅 OS 실시간 대시보드 서버
 *
 * 의존성 없는 로컬 전용(127.0.0.1) HTTP 서버.
 *   GET  /                → 대시보드 UI (CSRF 토큰 주입)
 *   GET  /api/status      → 실시간 현황 (백그라운드 캐시에서 즉시 응답)
 *   GET  /api/structure   → 전체 구조 (에이전트·스킬·커맨드·MCP·워크플로·하네스)
 *   GET  /api/file?path=  → 정의 파일 읽기 (agents/skills/commands 내부 .md만)
 *   POST /api/file        → 정의 파일 저장 (자동 백업 후 덮어쓰기)
 *   POST /api/task        → 업무 지시 실행 (트루먼·담당지정·커맨드·팀 소집)
 *   GET  /api/tasks       → 진행 중·최근 업무 목록
 *   GET  /api/task?id=&offset= → 특정 업무의 증분 로그
 *   POST /api/task/stop   → 실행 중 업무 중단
 *   GET  /api/outputs     → 산출물 목록 (날짜 폴더 → 파일)
 *   GET  /api/output?path= → 산출물 텍스트 (드로어 표시)
 *   GET  /api/output/raw?path=&t= → 산출물 원본 (새 탭 · sandbox CSP)
 *   GET  /api/jobs        → 자동화 잡 목록
 *   POST /api/job         → 자동화 켜기·끄기·즉시실행
 *   GET  /api/config      → 대시보드 설정 (목표·예약페이지·영역·발행보드·꺼둔스킬·세팅)
 *   POST /api/config      → 설정 부분 갱신
 *   POST /api/skills/toggle → 스킬 켜기·끄기
 *   POST /api/setup       → 첫 세팅 답변을 brand/ 파일에 기록
 *   GET  /api/collect?target= → 수집 캐시 읽기 (channels·schedule·meetings·brain·mail)
 *   POST /api/collect     → 수집 실행 (scripts/collect.mjs · MCP 는 에이전트가 부른다)
 *   GET  /api/connections → 도구 연결 진단 (실제로 찔러 본다 · 30초 캐시)
 *   POST /api/runner/test → 실행 위치(VPS·맥미니) SSH 접속 시험
 *
 * 보안: 127.0.0.1 바인딩 + Host 헤더 화이트리스트(DNS 리바인딩 차단)
 *      + /api 전체에 launch별 토큰 헤더 요구(CSRF 차단) + safePath realpath(심링크 차단).
 *      실행은 셸 없는 spawn + 대상 화이트리스트 + acceptEdits 고정 (dispatch.mjs 참조).
 * 성능: scanAll()을 백그라운드 인터벌로 1회만 돌려 캐시 → 각 폴링은 캐시를 즉시 반환.
 *
 * 실행: npm run dashboard   (= node tools/dashboard/server.mjs)
 * 옵션: --port 3737 (기본) · --host 127.0.0.1 (기본) · --hash-password '<pw>'
 *
 * 로컬 모드(기본)는 지금까지와 동일하게 로그인 없이 쓴다.
 * 웹 공개는 .env 의 DASHBOARD_PASSWORD 를 넣고 --host 0.0.0.0 으로 띄운다 (auth.mjs 참조).
 * 자세한 절차·리버스프록시 예시는 tools/dashboard/README.md.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, scanAll, scanInventory } from '../../scripts/status-lib.mjs';
import { dispatch, listTasks, taskLog, stopTask, restoreTasks, TEAM_FORMATIONS , markPublished, archiveTask, restoreTask, setTaskPillar, setTaskGoal, dismissApprovals, setTaskOutcome, automationCandidates, markOpened, gbrainQueue, clearGbrainQueue } from './dispatch.mjs';
import { listJobs, controlJob } from './jobs.mjs';
import { createAuth, hashPassword } from './auth.mjs';
import { readConfig, writeConfig, toggleSkill, applySetup, primeConfig } from './config.mjs';
import { initStore, dbReady, saveCache, loadCacheRow } from './store.mjs';
import { probeConnections } from './connections.mjs';
import { spawn } from 'node:child_process';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argOf = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

// --hash-password: 비밀번호 해시만 출력하고 종료 (서버를 띄우지 않는다)
if (args.includes('--hash-password')) {
  const pw = argOf('--hash-password');
  if (!pw) { console.error("사용: node tools/dashboard/server.mjs --hash-password '비밀번호'"); process.exit(1); }
  console.log(`\n.env 에 아래 한 줄을 넣으세요:\n\nDASHBOARD_PASSWORD_HASH=${hashPassword(pw)}\n`);
  process.exit(0);
}

const parsedPort = parseInt(argOf('--port'), 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536 ? parsedPort : 3737;
const BACKUP_DIR = path.join(ROOT, 'outputs', 'status', 'backups');
const TOKEN = crypto.randomBytes(16).toString('hex'); // launch별 CSRF 토큰

// ── 바인딩·인증 설정 (.env 도 읽는다 · 공개 모드용) ──
const dotenv = readDotEnv();
if (dotenv.DASHBOARD_TASK_TIMEOUT_MIN && !process.env.DASHBOARD_TASK_TIMEOUT_MIN) process.env.DASHBOARD_TASK_TIMEOUT_MIN = dotenv.DASHBOARD_TASK_TIMEOUT_MIN;
const HOST = argOf('--host') || dotenv.DASHBOARD_HOST || '127.0.0.1';
let auth;
try {
  auth = createAuth({
    host: HOST,
    password: dotenv.DASHBOARD_PASSWORD || process.env.DASHBOARD_PASSWORD,
    passwordHash: dotenv.DASHBOARD_PASSWORD_HASH || process.env.DASHBOARD_PASSWORD_HASH,
    secureCookie: (dotenv.DASHBOARD_SECURE_COOKIE || process.env.DASHBOARD_SECURE_COOKIE) === 'true',
    requireLocalLogin: (dotenv.DASHBOARD_REQUIRE_LOCAL_LOGIN || process.env.DASHBOARD_REQUIRE_LOCAL_LOGIN) === 'true',
  });
} catch (e) {
  console.error(`\n⛔ ${e.message}\n`);
  process.exit(1);
}
// Host 헤더 화이트리스트 (DNS 리바인딩 차단) · 공개 도메인은 DASHBOARD_ALLOWED_HOSTS 로 추가
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);
for (const h of String(dotenv.DASHBOARD_ALLOWED_HOSTS || process.env.DASHBOARD_ALLOWED_HOSTS || '').split(',')) {
  const v = h.trim(); if (v) { ALLOWED_HOSTS.add(v); ALLOWED_HOSTS.add(`${v}:${PORT}`); }
}

/** md → HTML (서버측 · 전부 이스케이프 후 변환이라 산출물 안 스크립트는 실행 불가) */
function mdToHtml(src) {
  const escH = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = String(src).replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
  const out = []; let inCode = false, inList = null, inTable = false;
  const closeList = () => { if (inList) { out.push(inList === 'ol' ? '</ol>' : '</ul>'); inList = null; } };
  const closeTable = () => { if (inTable) { out.push('</table></div>'); inTable = false; } };
  const inline = (t) => escH(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  for (const raw of lines) {
    if (/^\s*```/.test(raw)) { closeList(); closeTable(); inCode = !inCode; out.push(inCode ? '<pre><code>' : '</code></pre>'); continue; }
    if (inCode) { out.push(escH(raw) + '\n'); continue; }
    const h = raw.match(/^(#{1,4})\s+(.*)/);
    if (h) { closeList(); closeTable(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(raw)) { closeList(); closeTable(); out.push('<hr>'); continue; }
    if (/^\s*\|.*\|\s*$/.test(raw)) {
      closeList();
      if (/^\s*\|[\s:|-]+\|\s*$/.test(raw)) continue;
      const cells = raw.trim().replace(/^\||\|$/g, '').split('|');
      if (!inTable) { out.push('<div class="tbl"><table>'); inTable = true;
        out.push('<tr>' + cells.map(c => `<th>${inline(c.trim())}</th>`).join('') + '</tr>'); }
      else out.push('<tr>' + cells.map(c => `<td>${inline(c.trim())}</td>`).join('') + '</tr>');
      continue;
    }
    closeTable();
    const li = raw.match(/^\s*[-*]\s+(.*)/), oli = raw.match(/^\s*\d+[.)]\s+(.*)/);
    if (li || oli) { const want = oli ? 'ol' : 'ul';
      if (inList !== want) { closeList(); out.push(want === 'ol' ? '<ol>' : '<ul>'); inList = want; }
      out.push(`<li>${inline((li || oli)[1])}</li>`); continue; }
    closeList();
    const q = raw.match(/^\s*>\s?(.*)/);
    if (q) { out.push(`<blockquote>${inline(q[1])}</blockquote>`); continue; }
    if (!raw.trim()) continue;
    out.push(`<p>${inline(raw)}</p>`);
  }
  closeList(); closeTable(); if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

function readDotEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch { /* .env 없으면 로컬 모드 */ }
  return out;
}

// ── 저장 계층 (Supabase 우선 · 없으면 로컬 파일) ──
//    업무 기록·수집 캐시·설정이 한 곳에 모여야 맥과 VPS 와 웹이 같은 것을 본다.
const store = await initStore();
if (store.ok) console.log(`🗄️  저장: Supabase ${store.schema} 스키마 (접속 정보 ${store.from})`);
else console.log(`🗄️  저장: 로컬 파일 (${store.reason})`);
await primeConfig();
await restoreTasks();

// ── 백그라운드 스캔 캐시 (이벤트 루프 블로킹 · 반복 대용량 read 완화) ──
let statusCache = null, structureCache = null;
function refreshStatus() { try { statusCache = scanAll(); } catch (e) { statusCache = { error: String(e) }; } }
function refreshStructure() { try { structureCache = { generatedAt: Date.now(), teamFormations: TEAM_FORMATIONS, ...scanInventory() }; } catch (e) { structureCache = { error: String(e) }; } }
refreshStatus(); refreshStructure();
setInterval(refreshStatus, 10000).unref();
setInterval(refreshStructure, 30000).unref();

// 산출물 열람 범위: outputs/ 내부만 (읽기 전용) + 심링크 이탈 차단
const OUTPUTS_DIR = path.join(ROOT, 'outputs');
const VIEWABLE = /\.(md|txt|csv|json|html|log)$/i;
/**
 * 읽기 전용 참고 문서 경로 · 방법론 정본과 스킬 절차만 (2026-08-03).
 *
 * outputs/ 와 분리한 이유: outputs 는 산출물(쓰기도 일어남)이고, 이쪽은 정본 참고 자료다.
 * 허용 범위를 100-skills/**.md 와 skills/**\/SKILL.md 로 못박고 상위 탈출을 이중으로 막는다.
 * 여기서 범위를 넓히지 마라. 넓히면 저장소 전체가 웹으로 읽힌다.
 */
function safeDocPath(rel) {
  if (!rel || rel.includes('\0') || rel.includes('..')) return null;
  if (!/^((?:100-skills|methods)\/[^\0]+\.md|skills\/[^/\0]+\/SKILL\.md)$/.test(rel)) return null;
  const abs = path.resolve(ROOT, rel);
  const base = path.resolve(ROOT, rel.startsWith('100-skills/') ? '100-skills' : 'skills');
  if (!abs.startsWith(base + path.sep)) return null;
  try {
    const real = fs.realpathSync(abs);
    if (!real.startsWith(fs.realpathSync(base) + path.sep)) return null;
  } catch { return null; }
  return abs;
}

function safeOutputPath(rel) {
  if (!rel || rel.includes('\0') || rel.includes('..') || !VIEWABLE.test(rel)) return null;
  if (!/^outputs\//.test(rel)) return null;
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(OUTPUTS_DIR + path.sep)) return null;
  try {
    const real = fs.realpathSync(abs);
    const rootReal = fs.realpathSync(OUTPUTS_DIR);
    if (!real.startsWith(rootReal + path.sep)) return null;
  } catch { return null; }
  return abs;
}

// 편집 허용 범위: 리포 내 agents/ skills/ 100-skills/ 의 .md 파일만 + 심링크 이탈 차단
function safePath(rel, { mustExist = false } = {}) {
  if (!rel || rel.includes('\0') || rel.includes('..') || !rel.endsWith('.md')) return null;
  if (!/^(agents|skills|100-skills|commands|methods)\//.test(rel)) return null;   // 100-skills = 방법론 100 정본 (읽기·수정 대상)
  const abs = path.resolve(ROOT, rel);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null;
  // 심링크로 리포 밖을 가리키는 경우 차단: 존재하면 파일 자체를, 없으면 상위 폴더를 realpath
  try {
    const real = fs.existsSync(abs) ? fs.realpathSync(abs) : fs.realpathSync(path.dirname(abs));
    const rootReal = fs.realpathSync(ROOT);
    if (real !== rootReal && !real.startsWith(rootReal + path.sep)) return null;
  } catch { if (mustExist) return null; }
  return abs;
}

const json = (res, code, obj) => {
  // no-store: 폴링 API 다. 브라우저가 캐시하면 화면이 옛 값에 멈춘다.
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
};

// ── 수집 캐시 (scripts/collect.mjs 가 채우고 서버는 읽는다) ──────────
//    서버는 순수 node 라 MCP 를 못 부른다. 그래서 수집은 SDK 자식 프로세스에 맡긴다.
const COLLECT_TARGETS = ['channels', 'schedule', 'meetings', 'brain', 'mail'];
const CACHE_DIR = path.join(ROOT, 'outputs', 'cache');
let connCache = null;    // 연결 진단 결과 (30초 캐시 · 매 렌더마다 외부를 찌르지 않게)
const collecting = {};   // target → child process
const collectErr = {};   // target → 마지막 실패 메시지

const cacheMem = {};   // DB 에서 당겨 온 사본 (요청마다 기다리지 않게)

function readCacheFile(target) {
  try { return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, `${target}.json`), 'utf8')); }
  catch { return null; }
}
/** DB 사본이 있으면 그것을, 없으면 로컬 파일을 준다 */
function readCache(target) {
  return cacheMem[target] || readCacheFile(target);
}
/** 기동 시 · 수집 완료 시 DB 와 파일을 맞춘다 */
async function syncCache(target) {
  if (!dbReady()) return;
  const file = readCacheFile(target);
  const row = await loadCacheRow(target);
  const fileAt = file && file.collectedAt ? Date.parse(file.collectedAt) : 0;
  const rowAt = row && row.collectedAt ? Date.parse(row.collectedAt) : 0;
  if (fileAt > rowAt) { await saveCache(target, file); cacheMem[target] = file; }   // 로컬이 더 새 것 → 올린다
  else if (row) cacheMem[target] = row;                                            // DB 가 정본 → 내려받는다
}
for (const t of COLLECT_TARGETS) await syncCache(t);

function startCollect(target) {
  if (collecting[target]) return { ok: false, error: '이미 수집 중입니다', code: 409 };
  collectErr[target] = null;
  let child;
  try {
    child = spawn(process.execPath, [path.join('scripts', 'collect.mjs'), target], {
      cwd: ROOT, env: process.env, stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (e) { return { ok: false, error: String(e), code: 500 }; }
  collecting[target] = child;
  let err = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (c) => { err += c; if (err.length > 8000) err = err.slice(-8000); });
  const timer = setTimeout(() => { try { child.kill('SIGTERM'); } catch {} }, 8 * 60 * 1000);
  timer.unref?.();
  child.on('close', (code) => {
    clearTimeout(timer);
    delete collecting[target];
    if (code !== 0) {
      const m = err.match(/❌.*$/m);
      collectErr[target] = (m ? m[0] : err.trim().split('\n').pop() || `exit ${code}`).slice(0, 300);
      console.error(`⚠️  ${target} 수집 실패 · ${collectErr[target]}`);
    } else {
      console.log(`✓ ${target} 수집 완료`);
      syncCache(target).catch(() => {});   // 방금 만든 파일을 DB 로 올린다
    }
  });
  console.log(`▶ ${target} 수집 시작`);
  return { ok: true };
}

/** JSON 본문 수집 (2MB 상한) → cb(payload) · 실패 시 스스로 응답하고 cb 호출 안 함 */
function readJson(req, res, cb) {
  let body = '', tooBig = false;
  req.on('data', (c) => { body += c; if (body.length > 2 * 1024 * 1024) { tooBig = true; req.destroy(); } });
  req.on('close', () => { if (tooBig && !res.writableEnded) json(res, 413, { error: '본문이 너무 큽니다 (2MB 초과)' }); });
  req.on('end', () => {
    let payload;
    try { payload = JSON.parse(body); } catch { return json(res, 400, { error: 'JSON 파싱 실패' }); }
    cb(payload);
  });
}

// DNS 리바인딩 차단: Host 헤더가 화이트리스트가 아니면 거부
const hostOk = (req) => ALLOWED_HOSTS.has(req.headers.host);
// CSRF 차단: /api 요청은 페이지에 주입된 토큰 헤더를 반드시 포함해야 함
const tokenOk = (req) => req.headers['x-dashboard-token'] === TOKEN;

/** 폼 인코딩 본문 읽기 (로그인 전용 · 작게 제한) */
function readForm(req, res, cb) {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
  req.on('end', () => cb(new URLSearchParams(body)));
}

const server = http.createServer((req, res) => {
  if (!hostOk(req)) return json(res, 403, { error: 'invalid host' });
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  // ── 로그인 (공개 모드에서만 의미 있음) ──
  if (auth.enabled) {
    if (req.method === 'GET' && url.pathname === '/login') {
      if (auth.ok(req)) { res.writeHead(302, { location: '/' }); return res.end(); }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(auth.loginPage());
    }
    if (req.method === 'POST' && url.pathname === '/login') {
      return readForm(req, res, (form) => {
        const r = auth.login(req, form.get('password'));
        if (!r.ok) {
          res.writeHead(r.code === 429 ? 429 : 401, { 'content-type': 'text/html; charset=utf-8' });
          return res.end(auth.loginPage(r.error));
        }
        res.writeHead(302, { location: '/', 'set-cookie': r.cookie });
        res.end();
      });
    }
    if (url.pathname === '/logout') {
      res.writeHead(302, { location: '/login', 'set-cookie': auth.logout(req) });
      return res.end();
    }
    // 그 외 전부 로그인 필수 · 페이지는 로그인으로 보내고 API는 401
    if (!auth.ok(req)) {
      if (url.pathname.startsWith('/api/')) return json(res, 401, { error: '로그인이 필요합니다', login: true });
      res.writeHead(302, { location: '/login' });
      return res.end();
    }
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8')
        .replace('__DASHBOARD_TOKEN__', TOKEN)
        .replace('__DASHBOARD_AUTH__', String(auth.enabled));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) { json(res, 500, { error: String(e) }); }
    return;
  }

  // 산출물 원본 보기: 새 탭으로 열리므로 헤더를 못 실어 ?t= 쿼리 토큰을 허용한다 (localhost 전용)
  //   sandbox CSP 로 별도 오리진에 격리 → 이 페이지의 스크립트가 /api 를 건드릴 수 없다
  // 문서 리더 · md 산출물을 읽기 좋은 페이지로 (서버에서 렌더 · 클라이언트 스크립트 불필요)
  if (req.method === 'GET' && url.pathname === '/api/output/view') {
    if (url.searchParams.get('t') !== TOKEN && !tokenOk(req)) return json(res, 403, { error: 'missing or invalid token' });
    const rel = url.searchParams.get('path');
    const abs = safeOutputPath(rel) || safeDocPath(rel);   // 산출물 또는 방법론·스킬 정본
    if (!abs || !/\.(md|markdown|txt|log)$/i.test(rel)) return json(res, 400, { error: 'md·txt 문서만 리더로 열 수 있습니다' });
    let text = '';
    try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { return json(res, 404, { error: String(e) }); }
    if (text.length > 900 * 1024) text = text.slice(0, 900 * 1024) + '\n\n… (앞부분 900KB만 표시)';
    const name = rel.split('/').pop().replace(/[<>&]/g, '');
    const rawUrl = '/api/output/raw?t=' + encodeURIComponent(TOKEN) + '&path=' + encodeURIComponent(rel);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:", 'x-content-type-options': 'nosniff' });
    res.end(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title>
<style>
 :root{--ink:#2A2A28;--muted:#747264;--line:#EBEBEB;--paper:#F7F6F4;--sand:#E0CCBE}
 *{box-sizing:border-box;margin:0}
 body{background:#FDFDFC;color:var(--ink);font-family:"Pretendard","Apple SD Gothic Neo",system-ui,sans-serif;
   font-size:16.5px;line-height:1.75;padding:52px 22px 90px}
 .doc{max-width:760px;margin:0 auto}
 .meta{font-size:13px;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:26px;
   display:flex;gap:14px;flex-wrap:wrap;align-items:center}
 .meta a{margin-left:auto;color:var(--ink);font-size:13px;border:1px solid var(--line);background:#fff;border-radius:6px;padding:7px 14px;text-decoration:none}
 .meta a:hover{background:var(--paper)}
 h1{font-size:27px;line-height:1.35;letter-spacing:-.015em;margin:30px 0 12px}
 h2{font-size:21px;line-height:1.4;letter-spacing:-.01em;margin:34px 0 10px;padding-top:18px;border-top:1px solid var(--line)}
 h3{font-size:17.5px;margin:24px 0 8px} h4{font-size:16px;margin:18px 0 6px}
 p{margin:10px 0} ul,ol{margin:10px 0 10px 26px} li{margin:5px 0}
 code{background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:1px 6px;font-size:.88em}
 pre{background:#2A2A28;color:#EDEDEB;border-radius:10px;padding:16px 18px;overflow-x:auto;font-size:13.5px;line-height:1.6;margin:14px 0}
 pre code{background:none;border:none;color:inherit;padding:0}
 .tbl{overflow-x:auto;margin:14px 0}
 table{border-collapse:collapse;font-size:14.5px;min-width:60%}
 th,td{border:1px solid var(--line);padding:9px 13px;text-align:left;vertical-align:top}
 th{background:var(--paper);font-weight:600}
 blockquote{border-left:3px solid var(--sand);padding:4px 16px;color:var(--muted);margin:12px 0}
 hr{border:none;border-top:1px solid var(--line);margin:26px 0}
 a{color:inherit}
 @media print{ .meta a{display:none} body{padding:0;font-size:12.5pt} pre{white-space:pre-wrap} }
</style></head><body><div class="doc">
<div class="meta"><span>📄 ${name}</span><span>${rel.replace(/[<>&]/g, '')}</span><a href="${rawUrl}" target="_blank">원문 보기</a></div>
${mdToHtml(text)}
</div></body></html>`);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/output/raw') {
    if (url.searchParams.get('t') !== TOKEN && !tokenOk(req)) return json(res, 403, { error: 'missing or invalid token' });
    const rel = url.searchParams.get('path');
    const abs = safeOutputPath(rel);
    if (!abs) return json(res, 400, { error: 'outputs/ 내부의 md·txt·csv·json·html·log 만 열 수 있습니다' });
    try {
      const isHtml = /\.html$/i.test(rel);
      res.writeHead(200, {
        'content-type': isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
        'content-security-policy': "sandbox allow-scripts allow-popups",
        'x-content-type-options': 'nosniff',
      });
      fs.createReadStream(abs).pipe(res);
    } catch (e) { json(res, 404, { error: String(e) }); }
    return;
  }

  // 이하 /api 는 토큰 필수 (CSRF·리바인딩 방어)
  if (url.pathname.startsWith('/api/')) {
    if (!tokenOk(req)) return json(res, 403, { error: 'missing or invalid token' });
  }

  // 산출물 텍스트 읽기 (드로어에 표시)
  if (req.method === 'GET' && url.pathname === '/api/output') {
    const rel = url.searchParams.get('path');
    const abs = safeOutputPath(rel);
    if (!abs) return json(res, 400, { error: 'outputs/ 내부의 md·txt·csv·json·html·log 만 열 수 있습니다' });
    try {
      const st = fs.statSync(abs);
      const MAX = 512 * 1024;
      const content = fs.readFileSync(abs, 'utf8');
      json(res, 200, {
        path: rel, size: st.size, mtimeMs: st.mtimeMs,
        truncated: content.length > MAX,
        content: content.length > MAX ? content.slice(0, MAX) : content,
      });
    } catch (e) { json(res, 404, { error: '파일을 찾을 수 없습니다: ' + String(e) }); }
    return;
  }

  // 산출물 목록 (날짜 폴더 → 파일)
  if (req.method === 'GET' && url.pathname === '/api/outputs') {
    try {
      const dirs = fs.readdirSync(OUTPUTS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'tasks' && d.name !== 'status')
        .map(d => d.name).sort().reverse().slice(0, 30);
      const groups = dirs.map(name => {
        const files = [];
        const walk = (dir, prefix) => {
          let ents = [];
          try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
          for (const e of ents) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) { walk(p, `${prefix}${e.name}/`); continue; }
            if (!VIEWABLE.test(e.name)) continue;
            let mtimeMs = 0, size = 0;
            try { const st = fs.statSync(p); mtimeMs = st.mtimeMs; size = st.size; } catch {}
            files.push({ rel: path.relative(ROOT, p), label: prefix + e.name, mtimeMs, size });
          }
        };
        walk(path.join(OUTPUTS_DIR, name), '');
        files.sort((a, b) => b.mtimeMs - a.mtimeMs);
        return { name, total: files.length, files: files.slice(0, 60) };
      }).filter(g => g.total);
      json(res, 200, { groups });
    } catch (e) { json(res, 500, { error: String(e) }); }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, statusCache || { error: 'scanning' });
  if (req.method === 'GET' && url.pathname === '/api/structure') return json(res, 200, structureCache || { error: 'scanning' });

  if (req.method === 'GET' && url.pathname === '/api/file') {
    const abs = safePath(url.searchParams.get('path'), { mustExist: true });
    if (!abs) return json(res, 400, { error: 'agents/ · skills/ · 100-skills/ 내부 .md 파일만 열 수 있습니다' });
    try {
      const st = fs.statSync(abs);
      json(res, 200, { path: url.searchParams.get('path'), content: fs.readFileSync(abs, 'utf8'), mtimeMs: st.mtimeMs });
    } catch (e) { json(res, 404, { error: '파일을 찾을 수 없습니다: ' + String(e) }); }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/file') {
    let body = '', tooBig = false;
    req.on('data', (c) => { body += c; if (body.length > 2 * 1024 * 1024) { tooBig = true; req.destroy(); } });
    req.on('close', () => { if (tooBig && !res.writableEnded) json(res, 413, { error: '본문이 너무 큽니다 (2MB 초과)' }); });
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); } catch { return json(res, 400, { error: 'JSON 파싱 실패' }); }
      const abs = safePath(payload.path);
      if (!abs) return json(res, 400, { error: 'agents/ · skills/ · 100-skills/ 내부 .md 파일만 저장할 수 있습니다' });
      if (typeof payload.content !== 'string' || !payload.content.trim()) return json(res, 400, { error: '내용이 비어 있습니다' });
      try {
        let backup = '';
        if (fs.existsSync(abs)) {
          // 낙관적 동시성: GET 때 받은 mtime과 디스크가 다르면 충돌 (외부/타 기기 편집 보호)
          const cur = fs.statSync(abs).mtimeMs;
          if (payload.baseMtimeMs != null && Math.abs(cur - payload.baseMtimeMs) > 1) {
            return json(res, 409, { error: '파일이 그새 외부에서 변경됐습니다. 다시 열어 확인하세요.', currentMtimeMs: cur });
          }
          fs.mkdirSync(BACKUP_DIR, { recursive: true });
          const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23); // ms 단위 → 초당 충돌 방지
          backup = path.join(BACKUP_DIR, `${stamp}__${payload.path.replace(/\//g, '__')}`);
          fs.copyFileSync(abs, backup);
        }
        fs.writeFileSync(abs, payload.content);
        const mtimeMs = fs.statSync(abs).mtimeMs;
        refreshStructure(); // 저장 즉시 구조 캐시 갱신
        json(res, 200, { ok: true, backup: backup ? path.relative(ROOT, backup) : null, mtimeMs });
      } catch (e) { json(res, 500, { error: String(e) }); }
    });
    return;
  }

  // ── 업무 지시 (실행) ─────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/api/task') {
    readJson(req, res, (p) => {
      const r = dispatch({ mode: p.mode, target: p.target, prompt: p.prompt, effort: p.effort, allowPublish: p.allowPublish, parentId: p.parentId, runner: p.runner, pillar: p.pillar, goal: p.goal, plan: p.plan === true, format: p.format, source: p.source, verify: p.verify === true });
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      console.log(`▶ 지시 접수 [${r.task.mode}] ${r.task.target} · ${String(p.prompt || '').slice(0, 60)}`);
      json(res, 200, { ok: true, task: r.task });
    });
    return;
  }

  // 팀원 보관 · agents/ 안의 정의를 agents/_archive/ 로 이동 (삭제가 아니라 보관 · 되돌리기 가능)
  if (req.method === 'POST' && url.pathname === '/api/agent/archive') {
    readJson(req, res, (p) => {
      const name = String(p.name || '').trim();
      if (!/^[a-z0-9-]+$/.test(name)) return json(res, 400, { error: '이름 형식이 올바르지 않습니다' });
      if (name === 'marketing-os-orchestrator') return json(res, 400, { error: '트루먼(총괄)은 보관할 수 없습니다' });
      // 파일 탐색 (frontmatter name 기준 · dispatch.knownAgents 와 같은 규칙)
      let found = null;
      const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const fp = path.join(dir, e.name);
          if (e.isDirectory()) { if (e.name !== '_archive') walk(fp); continue; }
          if (!e.name.endsWith('.md') || e.name.startsWith('_') || /^(TEAM|README)/i.test(e.name)) continue;
          const head = fs.readFileSync(fp, 'utf8').slice(0, 2000);
          if (new RegExp(`\\bname:\\s*${name}\\b`).test(head)) found = fp;
        }
      };
      try { walk(path.join(ROOT, 'agents')); } catch (e) { return json(res, 500, { error: String(e) }); }
      if (!found) return json(res, 404, { error: '그 이름의 직원을 찾지 못했습니다' });
      try {
        const dest = path.join(ROOT, 'agents', '_archive', path.basename(found));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.renameSync(found, fs.existsSync(dest) ? dest.replace(/\.md$/, '-' + Date.now() + '.md') : dest);
        console.log(`▤ 팀원 보관: ${name} (${path.relative(ROOT, found)} → agents/_archive/)`);
        json(res, 200, { ok: true, archived: name });
      } catch (e) { json(res, 500, { error: String(e) }); }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/task/goal') {
    readJson(req, res, (p) => {
      const r = setTaskGoal(String(p.id || ''), p.goal);
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      json(res, 200, r);
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/task/approvals-done') {
    readJson(req, res, (p) => {
      const r = dismissApprovals(String(p.id || ''));
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      json(res, 200, r);
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/task/pillar') {
    readJson(req, res, (p) => {
      const r = setTaskPillar(String(p.id || ''), String(p.pillar || ''));
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      json(res, 200, r);
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/task/archive') {
    readJson(req, res, (p) => {
      const r = p.restore ? restoreTask(String(p.id || '')) : archiveTask(String(p.id || ''));
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      json(res, 200, r);
    });
    return;
  }

  /**
   * 산출물을 편집기에서 열기 (2026-08-03 지시)
   *
   * 이 대시보드가 맡는 범위는 초안에서 완성 문서까지다. 문서가 확정된 뒤의 추가 작업은
   * 그 문서를 입력으로 삼아 클로드 코드에서 한다. 그래서 여기서 새 실행을 걸지 않고
   * 편집기만 열어 준다 (붙여넣을 한 줄은 화면 쪽에서 클립보드에 담는다).
   *
   * 안전: 경로는 safeOutputPath 의 realpath 검증을 통과한 것만 · 셸 없이 배열 인자로 spawn.
   * 편집기는 파트너사다 (3면 분담에서 개선·후속 작업을 맡는 면).
   * DASHBOARD_EDITOR_APP 으로 바꿀 수 있고, 못 열면 다음 후보로, 끝내 안 되면 기본 앱으로 떨어진다.
   */
  const EDITOR_APPS = [process.env.DASHBOARD_EDITOR_APP, 'Antigravity IDE', 'Antigravity'].filter(Boolean);
  if (req.method === 'POST' && url.pathname === '/api/open-in-code') {
    readJson(req, res, (p) => {
      const rel = String(p.path || '');
      const abs = safeOutputPath(rel);
      if (!abs) return json(res, 400, { error: 'outputs/ 안의 산출물만 열 수 있습니다' });
      // 열었다는 사실을 기록한다 · "이 문서 썼나" 를 버튼으로 묻지 않기 위한 행동 신호
      if (p.id) markOpened(String(p.id));
      const tryOpen = (args, cb) => {
        const c = spawn('open', args, { stdio: 'ignore' });
        c.on('error', () => cb(false));
        c.on('exit', (code) => cb(code === 0));
      };
      // 후보를 차례로 시도하고, 다 안 되면 기본 앱 (없는 것을 있다고 하지 않는다)
      const step = (i) => {
        if (i >= EDITOR_APPS.length) {
          return tryOpen([abs], (ok) => ok
            ? json(res, 200, { ok: true, app: '기본 앱' })
            : json(res, 500, { error: `${EDITOR_APPS[0]} 도 기본 앱도 열지 못했습니다` }));
        }
        tryOpen(['-a', EDITOR_APPS[i], abs], (ok) => ok
          ? json(res, 200, { ok: true, app: EDITOR_APPS[i] })
          : step(i + 1));
      };
      step(0);
    });
    return;
  }

  /**
   * 업무 마무리 분류 (2026-08-03 · 전략 1단계)
   * 문서가 나온 뒤 갈 곳이 없어 94건 중 3건만 보관됐다. 여기서 끝을 맺는다.
   * 받는 것: used(실제로 썼나) · automation(none·skill·auto)
   */
  if (req.method === 'POST' && url.pathname === '/api/task/outcome') {
    readJson(req, res, (p) => {
      const r = setTaskOutcome(String(p.id || ''), {
        used: p.used === undefined ? undefined : (p.used === null ? null : p.used === true),
        automation: p.automation === undefined ? undefined : String(p.automation),
        note: typeof p.note === 'string' ? p.note : undefined,
      });
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      // "반복 안 함" 으로 끝낸 업무는 바로 보관한다 (끝맺음을 두 번 누르게 하지 않는다)
      if (p.automation === 'none' && p.archive !== false) archiveTask(String(p.id || ''));
      json(res, 200, r);
    });
    return;
  }

  /** 자동화 후보 · 반복되는데 아직 분류 안 된 것을 시스템이 먼저 찾아 올린다 */
  if (req.method === 'GET' && url.pathname === '/api/automation/candidates') {
    const c = automationCandidates();
    return json(res, 200, { candidates: c, warming: c.warming || [], gbrainPending: gbrainQueue().length });
  }

  /**
   * gbrain 에 올리기 (2026-08-03 · A안)
   *
   * 이 서버는 MCP 를 못 부른다. 그래서 쌓아 둔 것을 에이전트 한 세션이 한 번에 올린다.
   * 건마다 띄우면 하루 15.8건 × $0.016~ 이 나간다 · 모아서 한 번이면 하루 한 번이다.
   * 사람이 눌러야 돈다 (자동으로 돈을 쓰지 않는다).
   */
  if (req.method === 'POST' && url.pathname === '/api/automation/gbrain') {
    const rows = gbrainQueue();
    if (!rows.length) return json(res, 200, { ok: true, count: 0, message: '올릴 것이 없습니다' });
    const lines = rows.map(r => `- ${r.title} · 담당 ${r.target} · 분류 ${r.automation}`
      + `${r.pillar ? ` · 방향 ${r.pillar}` : ''}${r.skillUsed ? ` · 스킬 ${r.skillUsed}` : ''}`
      + `${r.used === true ? ' · 실제로 씀' : r.used === false ? ' · 안 씀' : ''}`
      + `${r.outputFile ? ` · ${r.outputFile}` : ''}`).join('\n');
    const r = dispatch({
      mode: 'agent', target: 'ops-lead', effort: 'low', source: '대시보드',
      prompt: `대시보드에서 "반복 업무" 로 분류된 항목을 gbrain 에 기록해 주세요.\n`
        + `쓰기만 하고 다른 작업은 하지 마세요. 새 업무를 만들지 마세요.\n\n`
        + `${lines}\n\n`
        + `mcp__gbrain__put_page 로 "마케팅OS 자동화 후보 기록" 페이지에 오늘 날짜 절을 추가해 주세요.\n`
        + `각 항목에 담당·분류(skill=스킬로 굳힐 것 / auto=자동화 대상)·방향·실사용 여부를 적습니다.\n`
        + `목적은 자동화 90% 달성 과정을 남기는 것입니다. 추정하지 말고 위에 준 값만 씁니다.`,
    });
    if (!r.ok) return json(res, r.code || 400, { error: r.error });
    clearGbrainQueue();
    return json(res, 200, { ok: true, count: rows.length, taskId: r.id || null });
  }

  if (req.method === 'POST' && url.pathname === '/api/task/publish') {
    readJson(req, res, (p) => {
      const r = markPublished(String(p.id || ''), p.url);
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      json(res, 200, r);
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/task/stop') {
    readJson(req, res, (p) => {
      const r = stopTask(String(p.id || ''));
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      json(res, 200, { ok: true });
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/tasks') return json(res, 200, { tasks: listTasks() });

  if (req.method === 'GET' && url.pathname === '/api/task') {
    const r = taskLog(String(url.searchParams.get('id') || ''), Number(url.searchParams.get('offset')) || 0);
    if (!r) return json(res, 404, { error: '없는 작업입니다' });
    return json(res, 200, r);
  }

  // ── 설정 (사람이 정하는 값 · brand/dashboard.json) ────────────────
  if (req.method === 'GET' && url.pathname === '/api/config') return json(res, 200, readConfig());

  if (req.method === 'POST' && url.pathname === '/api/config') {
    readJson(req, res, (p) => {
      const r = writeConfig(p);
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      json(res, 200, { ok: true, config: r.config });
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/skills/toggle') {
    readJson(req, res, (p) => {
      const r = toggleSkill(String(p.name || ''), p.on === true);
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      json(res, 200, { ok: true, skillsOff: r.config.skillsOff });
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/setup') {
    readJson(req, res, (p) => {
      const r = applySetup(p.answers);
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      console.log(`✓ 첫 세팅 기록 · ${r.written.join(', ')}`);
      json(res, 200, { ok: true, written: r.written, config: r.config });
    });
    return;
  }

  // ── 수집 (밖에서 읽어오는 값 · 에이전트 경유 캐시) ──────────────
  if (req.method === 'GET' && url.pathname === '/api/collect') {
    const t = String(url.searchParams.get('target') || '');
    if (!COLLECT_TARGETS.includes(t)) return json(res, 400, { error: '알 수 없는 수집 대상입니다' });
    json(res, 200, { target: t, running: !!collecting[t], error: collectErr[t] || null, data: readCache(t) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/collect') {
    readJson(req, res, (p) => {
      const t = String(p.target || '');
      if (!COLLECT_TARGETS.includes(t)) return json(res, 400, { error: '알 수 없는 수집 대상입니다' });
      const r = startCollect(t);
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      json(res, 200, { ok: true, target: t });
    });
    return;
  }

  // ── 도구 연결 진단 ───────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/connections') {
    const fresh = url.searchParams.get('fresh') === '1';
    if (!fresh && connCache && Date.now() - connCache.checkedAt < 30000) return json(res, 200, connCache);
    probeConnections((structureCache?.mcp || []).map(m => m.name))
      .then(r => { r.store = store.ok ? { mode: 'supabase', detail: `${store.schema} 스키마 · ${store.from}` } : { mode: 'local', detail: store.reason };
        connCache = r; json(res, 200, r); })
      .catch(e => json(res, 500, { error: String(e) }));
    return;
  }

  // ── 실행 위치 접속 시험 ──────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/api/runner/test') {
    readJson(req, res, (p) => {
      const cfg = readConfig();
      const r = (cfg.runners || []).find(x => x.key === String(p.key || ''));
      if (!r) return json(res, 404, { error: '없는 실행 위치입니다' });
      if (r.kind === 'local') return json(res, 200, { ok: true, detail: '이 맥입니다. 항상 준비돼 있습니다.' });
      for (const f of ['host', 'user', 'path']) if (!String(r[f] || '').trim()) return json(res, 409, { error: '접속 정보가 덜 채워졌습니다' });
      if (!/^[A-Za-z0-9._-]+$/.test(r.host) || !/^[A-Za-z0-9._-]+$/.test(r.user)) return json(res, 400, { error: '호스트나 사용자 이름에 쓸 수 없는 글자가 있습니다' });
      // node 와 리포 경로가 있는지만 확인한다 (아무것도 실행하지 않는다)
      const remote = `cd ${JSON.stringify(r.path)} && node -v && test -f scripts/agent-runner.mjs && echo REPO_OK`;
      const child = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-o', 'StrictHostKeyChecking=accept-new',
        '-p', String(r.port || 22), `${r.user}@${r.host}`, 'bash', '-lc', remote],
        { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', c => { out += c; });
      child.stderr.on('data', c => { out += c; });
      const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 15000);
      child.on('close', (code) => {
        clearTimeout(timer);
        json(res, 200, { ok: code === 0 && /REPO_OK/.test(out), detail: out.slice(-1200).trim() || `exit ${code}` });
      });
      child.on('error', (e) => { clearTimeout(timer); json(res, 200, { ok: false, detail: String(e.message || e) }); });
    });
    return;
  }

  // ── 자동화(launchd) 제어 ────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/jobs') return json(res, 200, { jobs: listJobs() });

  if (req.method === 'POST' && url.pathname === '/api/job') {
    readJson(req, res, async (p) => {
      const r = await controlJob(String(p.label || ''), String(p.action || ''));
      if (!r.ok) return json(res, r.code || 400, { error: r.error });
      console.log(`⏰ 자동화 ${p.action} · ${p.label}`);
      refreshStatus();
      json(res, 200, { ok: true, message: r.message });
    });
    return;
  }

  json(res, 404, { error: 'not found' });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { console.error(`⚠️  포트 ${PORT} 이미 사용 중 · 대시보드가 이미 떠 있거나 --port 로 다른 포트를 지정하세요.`); process.exit(1); }
  throw e;
});

server.listen(PORT, HOST, () => {
  const local = /^(127\.0\.0\.1|::1|localhost)$/.test(HOST);
  console.log(`🖥️  마케팅 OS 대시보드 · http://${local ? 'localhost' : HOST}:${PORT}`);
  console.log(`   루트: ${ROOT}`);
  console.log(`   모드: ${auth.enabled ? '🔐 공개 (원격은 비밀번호 로그인 · 이 맥에서는 바로 열림)' : '🏠 로컬 전용 (127.0.0.1 · 로그인 없음)'}`);
  if (!local && !dotenv.DASHBOARD_SECURE_COOKIE) {
    console.log(`   ⚠️  HTTPS 뒤에 두는 것을 권장합니다 (리버스 프록시 + DASHBOARD_SECURE_COOKIE=true) · README.md 참조`);
  }
  console.log(`   종료: Ctrl+C`);
});
