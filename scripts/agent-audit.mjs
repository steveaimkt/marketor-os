#!/usr/bin/env node
/**
 * agent-audit.mjs · 에이전트 정의 드리프트 감사
 *
 * 조직을 바꾸면 정의 파일이 뒤처진다. 사람이 눈으로 찾지 말고 이걸 돌린다.
 * 사용: node scripts/agent-audit.mjs
 *
 * 보는 것
 *   구부서명   12부서 시절 이름이 남아 있나 (5팀 편성 이후)
 *   낡은숫자   에이전트 71·75·76명, 부서 10곳 같은 옛 수치
 *   보관자언급 _archive 인원을 부르는 곳 (주석 없이 맨참조면 하네스가 깨진다)
 *   없는파일   본문이 가리키는 경로가 실제로 없는 것
 *   도구선언   tools: 는 문서일 뿐 런타임 강제 아님 (_conventions §L)
 *   트리거없음 편성된 사람 중 trigger 가 없는 것 (부서장은 위임받으므로 정상)
 */
import fs from 'node:fs'; import path from 'node:path';
const live = new Map(), arc = new Set();
(function w(d, a) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const fp = path.join(d, e.name);
  if (e.isDirectory()) { w(fp, a || e.name === '_archive'); continue; }
  if (!e.name.endsWith('.md') || /^(README|TEAM|TEAM-MODE|_conventions|_roster-status)\.md$/.test(e.name)) continue;
  const txt = fs.readFileSync(fp, 'utf8');
  const nm = (txt.match(/^name:\s*(.+)$/m) || [, e.name.replace(/\.md$/, '')])[1].trim();
  if (a) arc.add(nm); else live.set(nm, { p: path.relative('.', fp), txt });
} })('agents', false);

const OLD_DEPT = ['시장조사실','콘텐츠제작실','제품기획실','커머스실','소셜실','고객관리실','데이터분석실','광고성과실','브랜드영업실','운영실','강의사업실'];
const OLD_NUM = [/에이전트\s*7[0-9]/g, /에이전트\s*5[01]\b/g, /직원\s*7[0-9]/g, /75명/g, /71개/g, /76명/g, /부서\s*10/g, /스킬\s*100개.{0,6}에이전트/g];
const cfg = JSON.parse(fs.readFileSync('brand/dashboard.json', 'utf8'));
const teams = cfg.deptTeams.map(t => t.name);
const rostered = new Set(cfg.deptTeams.flatMap(t => [t.lead, ...t.roster]));

const issues = { 구부서명: [], 낡은숫자: [], 보관자언급: [], 없는파일: [], 도구선언: [], 트리거없음: [] };
for (const [nm, { p, txt }] of live) {
  for (const d of OLD_DEPT) if (txt.includes(d)) { issues.구부서명.push(`${p} · ${d}`); break; }
  for (const re of OLD_NUM) { const m = txt.match(re); if (m) { issues.낡은숫자.push(`${p} · ${m[0]}`); break; } }
  const arcs = [...arc].filter(a => new RegExp('\\b' + a + '\\b').test(txt));
  if (arcs.length) issues.보관자언급.push(`${p} · ${arcs.slice(0,3).join(',')}`);
  for (const f of [...txt.matchAll(/`((?:agents|skills|methods|brand|scripts|tools)\/[^`\s]+\.(?:md|mjs|json|sh))`/g)].map(m => m[1]))
    if (!fs.existsSync(f) && !f.includes('{') && !f.includes('NNN')) issues.없는파일.push(`${p} → ${f}`);
  if (/^tools:/m.test(txt)) issues.도구선언.push(p);
  if (!/^trigger:/m.test(txt) && rostered.has(nm)) issues.트리거없음.push(nm);
}
for (const [k, v] of Object.entries(issues)) {
  console.log(`\n=== ${k} · ${v.length}건 ===`);
  if (k === '도구선언' || k === '트리거없음') { console.log('  ' + v.slice(0, 8).join(' · ') + (v.length > 8 ? ` … 외 ${v.length - 8}` : '')); }
  else v.slice(0, 12).forEach(x => console.log('  ' + x));
  if (v.length > 12 && k !== '도구선언' && k !== '트리거없음') console.log(`  … 외 ${v.length - 12}건`);
}
