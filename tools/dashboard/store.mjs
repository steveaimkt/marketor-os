/**
 * store.mjs · 대시보드 저장 계층 (Supabase Postgres 우선 · 로컬 파일 폴백)
 *
 * 왜 필요한가
 *   업무 기록·수집 캐시가 로컬 파일에만 있으면 맥과 VPS 가 서로 다른 목록을 본다.
 *   웹으로 열려면 한 곳에 모여 있어야 한다. 그래서 Supabase 를 정본으로 쓴다.
 *
 * 설계 원칙
 *   · **선택 백엔드다.** 접속 정보가 없으면 지금까지처럼 로컬 파일로 동작한다.
 *     키가 없다고 대시보드가 죽으면 안 된다 (auth.mjs 의 fail-closed 와 다른 판단 ·
 *     저장은 인증과 달리 없으면 로컬로 낮춰도 위험하지 않다).
 *   · **로컬 파일 쓰기는 유지한다.** DB 가 정본이어도 outputs/tasks 는 감사 기록으로 남긴다.
 *     DB 가 죽은 순간에도 무엇을 시켰는지는 디스크에 남아야 한다.
 *   · **격리된 스키마를 쓴다.** 이 Postgres 의 public 에는 gbrain 테이블이 74개 있다.
 *     섞이면 서로를 망가뜨리므로 dashboard 스키마만 만들고 그 밖은 건드리지 않는다.
 *
 * 접속 정보 (둘 중 먼저 있는 것)
 *   1. .env 의 DASHBOARD_DATABASE_URL
 *   2. ~/.gbrain/config.json 의 database_url  ← 이미 있는 것을 재사용 (기본)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from '../../scripts/status-lib.mjs';

const SCHEMA = 'dashboard';
let pool = null, ready = false, initErr = null, Pg = null;

function connectionString() {
  // 1) 이 리포의 .env 가 우선 (다른 DB 로 옮길 때 여기만 고치면 된다)
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?DASHBOARD_DATABASE_URL\s*=\s*(.*)$/);
      if (m) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (v) return { url: v, from: '.env DASHBOARD_DATABASE_URL' };
      }
    }
  } catch {}
  if (process.env.DASHBOARD_DATABASE_URL) return { url: process.env.DASHBOARD_DATABASE_URL, from: '환경변수' };
  // 2) gbrain 이 쓰는 접속 정보를 재사용 (비밀번호를 여러 파일에 복사하지 않으려는 의도)
  try {
    const c = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.gbrain', 'config.json'), 'utf8'));
    if (c.database_url) return { url: c.database_url, from: '~/.gbrain/config.json' };
  } catch {}
  return null;
}

const DDL = `
create schema if not exists ${SCHEMA};

create table if not exists ${SCHEMA}.tasks (
  id           text primary key,
  mode         text,
  target       text,
  runner_agent text,
  prompt       text,
  effort       text,
  allow_publish boolean default false,
  parent_id    text,
  session_id   text,
  status       text,
  started_at   bigint,
  ended_at     bigint,
  exit_code    integer,
  cost         double precision,
  turns        integer,
  output_file  text,
  approvals    jsonb default '[]'::jsonb,
  error        text,
  log          text,
  updated_at   timestamptz default now()
);
create index if not exists tasks_started_idx on ${SCHEMA}.tasks (started_at desc);
alter table ${SCHEMA}.tasks add column if not exists pillar text;
alter table ${SCHEMA}.tasks add column if not exists output_files jsonb default '[]'::jsonb;
alter table ${SCHEMA}.tasks add column if not exists result_summary text;
alter table ${SCHEMA}.tasks add column if not exists approvals_handled boolean default false;
alter table ${SCHEMA}.tasks add column if not exists source text;
alter table ${SCHEMA}.tasks add column if not exists skill_used text;
alter table ${SCHEMA}.tasks add column if not exists published_at bigint;
alter table ${SCHEMA}.tasks add column if not exists published_url text;
-- 2026-08-03 · 마무리 분류 (전략 1단계) · 자동화 판정의 근거라 반드시 살아남아야 한다
alter table ${SCHEMA}.tasks add column if not exists automation text;
alter table ${SCHEMA}.tasks add column if not exists used boolean;
alter table ${SCHEMA}.tasks add column if not exists outcome_at bigint;
alter table ${SCHEMA}.tasks add column if not exists outcome_note text;
alter table ${SCHEMA}.tasks add column if not exists opened_at bigint;

create table if not exists ${SCHEMA}.cache (
  target       text primary key,
  data         jsonb not null,
  collected_at timestamptz,
  updated_at   timestamptz default now()
);

create table if not exists ${SCHEMA}.config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);
`;

/** 서버 기동 시 한 번 호출. 실패해도 예외를 던지지 않는다 (로컬 폴백으로 계속 간다). */
export async function initStore() {
  const conn = connectionString();
  if (!conn) return { ok: false, mode: 'local', reason: '접속 정보가 없습니다' };
  try {
    ({ default: Pg } = await import('pg'));
  } catch (e) {
    initErr = 'pg 모듈 없음';
    return { ok: false, mode: 'local', reason: initErr };
  }
  try {
    pool = new Pg.Pool({
      connectionString: conn.url,
      max: 4,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
      // Supabase 풀러는 TLS 를 쓰되 사설 CA 체인이라 검증을 끈다 (호스트는 고정된 풀러 도메인)
      ssl: { rejectUnauthorized: false },
    });
    pool.on('error', (e) => { console.error('⚠️  DB 풀 오류 ·', String(e.message || e).slice(0, 120)); });
    await pool.query(DDL);
    ready = true;
    return { ok: true, mode: 'supabase', from: conn.from, schema: SCHEMA };
  } catch (e) {
    initErr = String(e.message || e).slice(0, 160);
    try { await pool?.end(); } catch {}
    pool = null;
    return { ok: false, mode: 'local', reason: initErr };
  }
}

export const dbReady = () => ready;
export const dbError = () => initErr;

const q = async (text, values) => {
  if (!ready) return null;
  try { return await pool.query(text, values); }
  catch (e) { console.error('⚠️  DB 질의 실패 ·', String(e.message || e).slice(0, 140)); return null; }
};

// ── 업무 기록 ───────────────────────────────────────────────────────
export async function saveTask(t) {
  return q(`insert into ${SCHEMA}.tasks
      (id,mode,target,runner_agent,prompt,effort,allow_publish,parent_id,session_id,
       status,started_at,ended_at,exit_code,cost,turns,output_file,approvals,error,log,pillar,output_files,result_summary,published_at,published_url,approvals_handled,source,skill_used,automation,used,outcome_at,outcome_note,opened_at,updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,now())
    on conflict (id) do update set
      status=$10, ended_at=$12, exit_code=$13, cost=$14, turns=$15, output_file=$16,
      approvals=$17, error=$18, log=$19, session_id=$9, pillar=$20, output_files=$21, result_summary=$22, published_at=$23, published_url=$24, approvals_handled=$25, source=$26, skill_used=$27,
      automation=$28, used=$29, outcome_at=$30, outcome_note=$31, opened_at=$32, updated_at=now()`,
    [t.id, t.mode, t.target, t.runnerAgent || null, t.prompt || '', t.effort || null,
     t.allowPublish === true, t.parentId || null, t.sessionId || null,
     t.status, t.startedAt, t.endedAt, t.exitCode, t.cost, t.turns,
     t.outputFile || null, JSON.stringify(t.approvals || []), t.error || null, t.log || '', t.pillar || null,
     JSON.stringify(t.outputFiles || []), t.resultSummary || null, t.publishedAt || null, t.publishedUrl || null, t.approvalsHandled === true, t.source || '대시보드', t.skillUsed || null,
     t.automation || null, t.used === undefined ? null : t.used, t.outcomeAt || null, t.outcomeNote || null, t.openedAt || null]);
}

/** 최근 업무를 내려온 순서(오래된 것 먼저)로 반환 · 복원용 */
export async function loadTasks(limit = 40) {
  const r = await q(`select * from ${SCHEMA}.tasks order by started_at desc limit $1`, [limit]);
  if (!r) return null;
  return r.rows.map(x => ({
    id: x.id, mode: x.mode, target: x.target, runnerAgent: x.runner_agent, prompt: x.prompt,
    effort: x.effort, allowPublish: x.allow_publish, parentId: x.parent_id, sessionId: x.session_id,
    status: x.status, startedAt: Number(x.started_at), endedAt: x.ended_at == null ? null : Number(x.ended_at),
    exitCode: x.exit_code, cost: x.cost, turns: x.turns, outputFile: x.output_file,
    approvals: Array.isArray(x.approvals) ? x.approvals : [], error: x.error, log: x.log || '',
    pillar: x.pillar || null,
    outputFiles: Array.isArray(x.output_files) ? x.output_files : [], resultSummary: x.result_summary || null,
    publishedAt: x.published_at == null ? null : Number(x.published_at), publishedUrl: x.published_url || null,
    approvalsHandled: x.approvals_handled === true,
    source: x.source || '대시보드',
    skillUsed: x.skill_used || null,
    // 마무리 분류 (2026-08-03) · 재기동해도 살아남아야 자동화 판정이 이어진다
    automation: x.automation || null,
    used: x.used === null || x.used === undefined ? undefined : x.used === true,
    outcomeAt: x.outcome_at == null ? null : Number(x.outcome_at),
    outcomeNote: x.outcome_note || null,
    openedAt: x.opened_at == null ? null : Number(x.opened_at),
  })).reverse();
}

// ── 수집 캐시 ───────────────────────────────────────────────────────
export async function saveCache(target, data) {
  const at = data && data.collectedAt ? new Date(data.collectedAt) : new Date();
  return q(`insert into ${SCHEMA}.cache (target,data,collected_at,updated_at)
    values ($1,$2,$3,now())
    on conflict (target) do update set data=$2, collected_at=$3, updated_at=now()`,
    [target, JSON.stringify(data), at]);
}
export async function loadCacheRow(target) {
  const r = await q(`select data from ${SCHEMA}.cache where target=$1`, [target]);
  return r && r.rows[0] ? r.rows[0].data : null;
}

// ── 설정 ────────────────────────────────────────────────────────────
export async function saveConfigRow(value) {
  return q(`insert into ${SCHEMA}.config (key,value,updated_at) values ('dashboard',$1,now())
    on conflict (key) do update set value=$1, updated_at=now()`, [JSON.stringify(value)]);
}
export async function loadConfigRow() {
  const r = await q(`select value from ${SCHEMA}.config where key='dashboard'`);
  return r && r.rows[0] ? r.rows[0].value : null;
}

export async function closeStore() { try { await pool?.end(); } catch {} }
