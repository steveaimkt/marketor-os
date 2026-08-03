#!/usr/bin/env node
/**
 * eval-routing.mjs · 방법론 100 라우팅 정확도 실측
 *
 * 왜: skills/_evals/README.md — "작동한다를 말이 아니라 테스트로 증명한다".
 *     routing-eval.jsonl 596케이스가 100/100 있는데 읽는 러너가 없었다 (2026-08-03 실측).
 *
 * 사용: node scripts/eval-routing.mjs [--limit N] [--batch 25] [--model claude-haiku-4-5-20251001]
 * 산출: outputs/{날짜}/eval/routing-{stamp}.json  +  콘솔 요약
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '@anthropic-ai/claude-agent-sdk';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const LIMIT = Number(arg('--limit', 0));
const BATCH = Number(arg('--batch', 25));
const MODEL = arg('--model', 'claude-haiku-4-5-20251001');

// 1) 케이스 로드
const cases = [];
for (const cat of fs.readdirSync(path.join(ROOT, '100-skills')).filter(d => /^\d\d-/.test(d))) {
  const sdir = path.join(ROOT, '100-skills', cat, 'skills');
  if (!fs.existsSync(sdir)) continue;
  for (const s of fs.readdirSync(sdir)) {
    const f = path.join(sdir, s, 'routing-eval.jsonl');
    if (!fs.existsSync(f)) continue;
    for (const ln of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!ln.trim()) continue;
      try { const c = JSON.parse(ln); if (c.intent && c.expected_skill) cases.push(c); } catch {}
    }
  }
}
const all = LIMIT ? cases.slice(0, LIMIT) : cases;
const TABLE = fs.readFileSync(path.join(ROOT, '100-skills/ROUTING.md'), 'utf8');
console.log(`케이스 ${all.length}건 · 배치 ${BATCH} · 모델 ${MODEL}`);

const SYS = `너는 마케팅 OS의 라우터다. 사용자 발화를 방법론 100개 중 하나에 배정한다.
아래가 유일한 명부다. 명부 밖 번호를 만들지 마라.

${TABLE}

규칙: 발화 하나당 가장 알맞은 ID 하나. 애매하면 산출물이 무엇인지로 판단한다.`;

async function ask(batch, bi) {
  const list = batch.map((c, i) => `${i + 1}. ${c.intent}`).join('\n');
  const prompt = `다음 발화 ${batch.length}개를 각각 방법론 ID 하나에 배정해라.
JSON 배열만 출력한다. 설명 금지. 형식: [{"n":1,"id":"001"}, ...]

${list}`;
  let text = '';
  for await (const m of query({
    prompt,
    options: { model: MODEL, systemPrompt: SYS, maxTurns: 1, allowedTools: [], settingSources: [] },
  })) {
    if (m.type === 'assistant') for (const b of m.message.content) if (b.type === 'text') text += b.text;
  }
  const j = text.match(/\[[\s\S]*\]/);
  if (!j) { console.error(`  배치 ${bi} 파싱 실패`); return batch.map(() => null); }
  let arr = []; try { arr = JSON.parse(j[0]); } catch { return batch.map(() => null); }
  const out = batch.map(() => null);
  for (const r of arr) { const n = Number(r.n) - 1; if (n >= 0 && n < batch.length) out[n] = String(r.id).padStart(3, '0'); }
  return out;
}

const results = [];
for (let i = 0; i < all.length; i += BATCH) {
  const b = all.slice(i, i + BATCH);
  const got = await ask(b, i / BATCH + 1);
  b.forEach((c, k) => results.push({ ...c, got: got[k], hit: got[k] === c.expected_skill }));
  const done = results.length, ok = results.filter(r => r.hit).length;
  process.stdout.write(`\r  ${done}/${all.length} · 정확도 ${(ok / done * 100).toFixed(1)}%   `);
}
console.log('');

// 집계
const hit = results.filter(r => r.hit).length;
const nulls = results.filter(r => !r.got).length;
const perSkill = {};
for (const r of results) {
  const s = (perSkill[r.expected_skill] ||= { n: 0, ok: 0 });
  s.n++; if (r.hit) s.ok++;
}
const confusion = {};
for (const r of results) if (!r.hit && r.got) {
  const k = `${r.expected_skill}→${r.got}`; confusion[k] = (confusion[k] || 0) + 1;
}
const day = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const dir = path.join(ROOT, 'outputs', day, 'eval');
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const file = path.join(dir, `routing-${stamp}.json`);
fs.writeFileSync(file, JSON.stringify({ model: MODEL, total: results.length, hit, nulls, perSkill, confusion, results }, null, 1));

console.log(`\n전체 정확도: ${hit}/${results.length} = ${(hit / results.length * 100).toFixed(1)}%`);
console.log(`미분류(파싱 실패): ${nulls}`);
const weak = Object.entries(perSkill).filter(([, v]) => v.ok / v.n < 0.6).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n);
console.log(`\n60% 미만 스킬: ${weak.length}개`);
for (const [id, v] of weak.slice(0, 20)) console.log(`  ${id}  ${v.ok}/${v.n}`);
console.log(`\n혼동 상위:`);
for (const [k, v] of Object.entries(confusion).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${k}  ${v}회`);
console.log(`\n산출: ${path.relative(ROOT, file)}`);
