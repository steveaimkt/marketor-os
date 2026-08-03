#!/usr/bin/env node
/**
 * verify-loop.mjs · 범용 자동 검증 루프 (Agent SDK 2중 루프)
 *
 * 구조: 생산자 실행 → 6축 검수 → 기준 미달이면 반려 사유와 함께 같은 세션 재작성 → 반복.
 * linkedin-loop.mjs 로 실증된 패턴을 아무 담당·아무 지시에나 쓰도록 일반화한 것.
 *
 * 사용 (대시보드 dispatch 가 부른다 · 직접 실행도 동일):
 *   node scripts/verify-loop.mjs <생산자-에이전트> --stdin-prompt [--effort low] [--rounds 2] [--min 3.5]
 *
 * 출력 계약 (dispatch 파싱과 호환):
 *   · 자식 러너들의 로그를 정리해 흘려보내되, 세션/비용 요약 줄은 걷어낸다
 *   · 마지막에 정확히 한 번씩:  ─ session: <생산자 세션>  /  ─ 완료 · 턴 N · 비용 $합계
 *   · 최종 산출물:  완료: <경로>   (생산자 마지막 라운드 기준)
 *
 * 정직 원칙: 검수 점수·판정을 지어내지 않는다. 파싱 실패는 "판정 해석 실패"로 그대로 보고한다.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(DIR, 'agent-runner.mjs');
const REVIEWER = 'quality-reviewer-6axis';

// ── 인자 ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const producer = argv[0];
const flag = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const has = (name) => argv.includes(name);
const ROUNDS = Math.min(4, Number(flag('--rounds', 2)) || 2);   // 재작성 최대 횟수 (총 실행 = 1 + 반려 수)
const MIN = Number(flag('--min', 3.5)) || 3.5;
const EFFORT = flag('--effort', null);
if (!producer || producer.startsWith('--')) { console.error('사용: verify-loop.mjs <에이전트> --stdin-prompt [--rounds N] [--min 3.5]'); process.exit(2); }

const readStdin = () => new Promise((res) => {
  let b = ''; process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => b += c); process.stdin.on('end', () => res(b));
});

/** 자식 러너 1회 실행 · 로그를 모으고 세션·비용·산출 경로를 뽑는다 */
function runChild(agent, prompt, { resume, effort } = {}) {
  return new Promise((resolve) => {
    const args = [RUNNER, agent, '--stdin-prompt'];
    if (effort) args.push('--effort', effort);
    if (resume) args.push('--resume', resume);
    const child = spawn(process.execPath, args, { cwd: path.join(DIR, '..'), env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.end(prompt, 'utf8');
    let log = '';
    child.stdout.on('data', (c) => { log += c; });
    child.stderr.on('data', (c) => { log += c; });
    child.on('close', (code) => {
      const session = (log.match(/─ session:\s*([A-Za-z0-9-]+)/) || [])[1] || null;
      const cost = Number((log.match(/비용 \$([0-9.]+)/) || [])[1] || 0);
      // 경로에 공백이 있을 수 있다(iCloud 경로) · 줄 단위로 잡고 절대경로는 리포 기준 상대로 (2026-08-02 실전 버그 수리)
      const raw = ([...log.matchAll(/^완료:\s*(.+\.(?:md|html|csv|json))\s*$/gm)].pop() || [])[1];
      let file = raw ? raw.trim() : null;
      if (file) {
        const root = path.join(DIR, '..');
        if (file.startsWith(root)) file = path.relative(root, file);
        if (!fs.existsSync(path.join(root, file))) file = null;   // 실재하지 않으면 못 찾은 것으로
      }
      resolve({ code, log, session, cost, file });
    });
  });
}

/** 러너 요약 줄을 걷어낸 본문만 흘려보낸다 (최종 계약 줄과 중복되지 않게) */
const relay = (label, log) => {
  const body = log.split('\n').filter((l) => !/^─ session:|^─ 완료 · 턴/.test(l)).join('\n').trim();
  process.stdout.write(`\n══ ${label} ══\n${body}\n`);
};

const prompt = has('--stdin-prompt') ? await readStdin() : argv[1] || '';
let totalCost = 0, producerSession = null, finalFile = null, verdictLine = '판정 해석 실패 (검수 응답에서 점수를 찾지 못함)';
let passed = false;

for (let round = 1; round <= ROUNDS + 1; round++) {
  // ① 생산
  const ask = round === 1 ? prompt
    : `방금 산출물이 검수에서 반려됐다. 아래 반려 사유를 반영해 같은 파일을 고쳐 다시 완성해라. 마지막 줄에 완료: <경로> 를 다시 출력해라.\n${verdictLine}`;
  const p = await runChild(producer, ask, { resume: producerSession, effort: EFFORT });
  totalCost += p.cost; producerSession = p.session || producerSession; finalFile = p.file || finalFile;
  relay(`생산 ${round}회차 (${producer})`, p.log);
  if (!finalFile) { verdictLine = '생산자가 산출 파일 경로를 남기지 않아 검수를 진행하지 못함'; break; }

  // ② 검수 (매회 새 세션 · 자기 답 옹호 방지)
  const r = await runChild(REVIEWER,
    `파일 ${finalFile} 을 읽고 6축(명확성·타깃·차별성·CTA·브랜드일관성·규제안전성)으로 채점해라.\n` +
    `마지막 두 줄에 정확히 이 형식으로만 써라:\n점수: <평균 소수1자리>\n판정: 통과 또는 반려 · 반려면 고칠 점 3개 이내를 한 줄로.`,
    { effort: 'low' });
  totalCost += r.cost;
  relay(`검수 ${round}회차 (${REVIEWER})`, r.log);
  // 지시문 에코가 먼저 나오므로 항상 '마지막' 매치가 실제 판정이다
  const score = Number(([...r.log.matchAll(/점수:\s*([0-9.]+)/g)].pop() || [])[1]);
  const verdict = ([...r.log.matchAll(/판정:\s*(.+)/g)].pop() || [])[1] || '';
  if (Number.isFinite(score)) {
    verdictLine = `점수 ${score} · ${verdict.trim().slice(0, 300)}`;
    if (score >= MIN && /통과/.test(verdict)) { passed = true; break; }
    if (round === ROUNDS + 1) break;   // 라운드 소진 · 마지막 판정 그대로 보고
  } else {
    // 점수를 못 읽으면 지어내지 않고 종료 (미검증 상태로 정직 보고)
    verdictLine = '판정 해석 실패 · 검수 응답에 점수 형식이 없음 (산출물은 미검증 상태)';
    break;
  }
}

// ── 최종 계약 출력 ──────────────────────────────────────────────
process.stdout.write(`\n══ 자동 검증 결과 ══\n${passed ? '✅ 검수 통과' : '⚠️ 검수 미통과'} · ${verdictLine}\n`);
if (!passed) process.stdout.write(`⏸ 승인 필요: 검수 ${Number.isFinite(Number((verdictLine.match(/점수 ([0-9.]+)/) || [])[1])) ? '미통과' : '미확정'} 산출물 검토 (${verdictLine.slice(0, 120)})\n`);
if (finalFile) process.stdout.write(`완료: ${finalFile}\n`);
if (producerSession) process.stderr.write(`\n─ session: ${producerSession}\n`);
process.stderr.write(`─ 완료 · 턴 ? · 비용 $${totalCost.toFixed(4)}\n`);
process.exit(finalFile ? 0 : 1);
