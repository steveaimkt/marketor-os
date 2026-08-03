/**
 * jobs.mjs · 대시보드 자동화(launchd) 제어
 *
 * automation/launchd/*.plist 를 켜고(load) 끄고(unload) 즉시 실행(kickstart)한다.
 * automation/setup-launchd.sh 는 전체 일괄 처리만 하므로, 잡 1개 단위 제어를 여기서 담당한다.
 *
 * ⚠️ 알려진 한계 (memory: 백그라운드 상주 금지 · 2026-07-XX 지시)
 *   맥 로컬 launchd 는 슬립·권한(TCC/FDA)·경로 문제로 실패가 잦다.
 *   24시간 상시 가동이 필요한 작업은 이 화면이 아니라 VPS 로 올리는 게 정답이다.
 *   그래서 이 모듈은 "이미 있는 잡을 끄고/켜고/한 번 돌려보는" 데까지만 한다.
 *
 * 보안: 라벨은 스캔된 목록 화이트리스트 + /marketing/i 패턴만 · launchctl 은 셸 없이 spawn.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from '../../scripts/status-lib.mjs';

const SRC_DIR = path.join(ROOT, 'automation', 'launchd');
const AGENTS_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
const DOMAIN = `gui/${process.getuid?.() ?? ''}`;

/**
 * 이 예약이 실제로 무슨 일을 하나 (2026-08-03 지시)
 *
 * 명령줄만 보여 주면 여전히 모른다.
 *   /bin/bash ~/marketing-os-review/run-review.sh evening   ← 이게 무슨 일인지 알 수 없다
 *
 * 다행히 이 프로젝트의 스크립트는 첫머리 주석에 하는 일을 적어 둔다.
 * 그래서 **실제 파일을 읽어** 그 줄을 가져온다. 지어내지 않는다 · 못 읽으면 비운다.
 */
function describeJob(argv) {
  // 인자 중 실제 스크립트 파일을 찾는다 (bash·node 뒤에 오는 경로)
  const cand = argv.find(a => /\.(sh|mjs|js)$/.test(a) && !/^-/.test(a));
  if (!cand) return null;
  const abs = cand.replace(/^~/, os.homedir()).replaceAll('__PROJECT_DIR__', ROOT);
  let head = '';
  try { head = fs.readFileSync(abs, 'utf8').slice(0, 1200); } catch { return null; }
  const lines = head.split('\n');
  const out = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (l.startsWith('#!')) continue;                 // 셔뱅은 건너뛴다
    if (!l.startsWith('#')) { if (out.length) break; else continue; }
    const body = l.replace(/^#+\s?/, '').trim();
    if (!body) { if (out.length) break; else continue; }
    out.push(body);
    if (out.length >= 3) break;                       // 첫 주석 블록 3줄까지
  }
  return out.length ? out.join(' · ').slice(0, 240) : null;
}

/** 제어 가능한 잡: automation/launchd/ 의 plist + 이미 설치된 marketing* plist */
export function listJobs() {
  const out = new Map();
  const read = (dir, installed) => {
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => f.endsWith('.plist') && /marketing/i.test(f)); } catch { return; }
    for (const f of files) {
      let xml = '';
      try { xml = fs.readFileSync(path.join(dir, f), 'utf8'); } catch { continue; }
      const label = (xml.match(/<key>Label<\/key>\s*<string>([^<]+)/) || [])[1] || f.replace('.plist', '');
      /* 라벨만으로는 무슨 일을 하는지 모른다 (2026-08-03 지시).
         com.marketing-os.daily-briefing 을 봐도 뭘 돌리는지 알 수 없어서
         plist 안의 실제 명령·시각·로그 경로를 같이 꺼내 화면에서 펼쳐 볼 수 있게 한다. */
      const unesc = (v) => String(v).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
      const argv = [...xml.matchAll(/<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/g)]
        .flatMap(m => [...m[1].matchAll(/<string>([^<]*)<\/string>/g)].map(x => unesc(x[1])));
      const hours = [...xml.matchAll(/<key>Hour<\/key>\s*<integer>(\d+)/g)].map(x => +x[1]);
      const mins = [...xml.matchAll(/<key>Minute<\/key>\s*<integer>(\d+)/g)].map(x => +x[1]);
      const at = hours.map((h, i) => `${String(h).padStart(2, '0')}:${String(mins[i] ?? 0).padStart(2, '0')}`);
      const interval = (xml.match(/<key>StartInterval<\/key>\s*<integer>(\d+)/) || [])[1];
      const info = {
        argv,
        // 사람이 읽을 한 줄 · 홈 경로는 ~ 로 줄인다
        cmd: argv.join(' ').replace(new RegExp(os.homedir(), 'g'), '~').slice(0, 400),
        at, interval: interval ? +interval : null,
        stdout: (xml.match(/<key>StandardOutPath<\/key>\s*<string>([^<]+)/) || [])[1] || null,
        stderr: (xml.match(/<key>StandardErrorPath<\/key>\s*<string>([^<]+)/) || [])[1] || null,
        does: describeJob(argv),          // 실제로 무슨 일을 하는지 (스크립트에서 읽어 온다)
      };
      const prev = out.get(label) || { label, file: f, hasSource: false, installed: false };
      out.set(label, { ...prev, ...info, ...(installed ? { installed: true } : { hasSource: true }) });
    }
  };
  read(SRC_DIR, false);
  read(AGENTS_DIR, true);
  return [...out.values()];
}

const findJob = (label) => listJobs().find(j => j.label === label);

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err?.code ?? 0, out: (stdout || '') + (stderr || '') });
    });
  });
}

/** plist 를 ~/Library/LaunchAgents 에 설치 (setup-launchd.sh install_one 과 동일한 치환) */
function installPlist(job) {
  const src = path.join(SRC_DIR, job.file);
  if (!fs.existsSync(src)) return { ok: false, error: `원본 plist 가 없습니다: automation/launchd/${job.file}` };
  try {
    const xml = fs.readFileSync(src, 'utf8').replaceAll('__PROJECT_DIR__', ROOT);
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
    fs.mkdirSync(path.join(ROOT, 'logs', 'launchd'), { recursive: true });
    fs.writeFileSync(path.join(AGENTS_DIR, job.file), xml);
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
}

/**
 * @param {string} label 잡 라벨 (스캔 목록에 있어야 함)
 * @param {'load'|'unload'|'run'} action
 */
export async function controlJob(label, action) {
  if (!['load', 'unload', 'run'].includes(action)) return { ok: false, error: '알 수 없는 동작입니다', code: 400 };
  if (typeof label !== 'string' || !/^[A-Za-z0-9._-]+$/.test(label) || !/marketing/i.test(label)) {
    return { ok: false, error: '허용되지 않은 잡 라벨입니다', code: 400 };
  }
  const job = findJob(label);
  if (!job) return { ok: false, error: `등록되지 않은 잡입니다: ${label}`, code: 404 };

  const target = path.join(AGENTS_DIR, job.file);

  if (action === 'unload') {
    const r = await run('launchctl', ['bootout', `${DOMAIN}/${label}`]);
    // bootout 은 이미 언로드 상태면 실패 코드를 낸다 → 그 경우도 성공으로 본다
    if (!r.ok && !/not (find|loaded)|No such process/i.test(r.out)) return { ok: false, error: r.out.trim() || `exit ${r.code}`, code: 500 };
    return { ok: true, message: `${label} 끔` };
  }

  if (action === 'load') {
    if (!fs.existsSync(target)) {
      const i = installPlist(job);
      if (!i.ok) return { ok: false, error: i.error, code: 500 };
    }
    await run('launchctl', ['bootout', `${DOMAIN}/${label}`]);   // 중복 로드 방지
    const r = await run('launchctl', ['bootstrap', DOMAIN, target]);
    if (!r.ok) return { ok: false, error: r.out.trim() || `exit ${r.code}`, code: 500 };
    return { ok: true, message: `${label} 켬 (예약 등록)` };
  }

  // run: 예약 시각을 기다리지 않고 지금 한 번 실행 (동작 확인용)
  if (!fs.existsSync(target)) return { ok: false, error: '먼저 켜야(등록해야) 즉시 실행할 수 있습니다', code: 409 };
  const r = await run('launchctl', ['kickstart', '-k', `${DOMAIN}/${label}`]);
  if (!r.ok) return { ok: false, error: r.out.trim() || `exit ${r.code}`, code: 500 };
  return { ok: true, message: `${label} 즉시 실행 · 결과는 logs/launchd/ 와 실시간 현황에서 확인` };
}
