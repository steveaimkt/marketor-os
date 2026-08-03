#!/usr/bin/env node
/**
 * build-routing.mjs · 100-skills/ROUTING.md 생성 (방법론 100 라우팅 테이블)
 *
 * 왜: 오케스트레이터가 상시 보유하는 명부. 개별 SKILL.md 는 매칭된 것만 연다
 *     (Progressive Disclosure). 100-skills/ROUTING.md 는 손으로 관리돼 드리프트가 생기므로,
 *     배포용 100-skills/ROUTING.md 는 실제 SKILL.md frontmatter 에서 **생성**한다.
 *
 * 사용: node scripts/build-routing.mjs   (sync-methods.sh 가 자동 호출)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const M = path.join(ROOT, '100-skills');
const CAT = {
  '01-research': '시장조사', '02-product': '제품기획', '03-content': '콘텐츠', '04-social': 'SNS',
  '05-ads': '광고', '06-commerce': '이커머스', '07-analytics': '데이터', '08-crm': 'CRM',
  '09-brand-sales': '브랜딩·세일즈', '10-ops': '운영',
};
const fmOf = t => (t.match(/^---\n([\s\S]*?)\n---\n/) || [, ''])[1];
const fld = (f, k) => ((f.match(new RegExp(`^${k}:\\s*(.*)$`, 'm')) || [, ''])[1] || '').trim().replace(/^"|"$/g, '');

const rows = [];
for (const cat of fs.readdirSync(M).filter(d => /^\d\d-/.test(d)).sort()) {
  const sdir = path.join(M, cat, 'skills');
  if (!fs.existsSync(sdir)) continue;
  for (const s of fs.readdirSync(sdir).sort()) {
    const p = path.join(sdir, s, 'SKILL.md');
    if (!fs.existsSync(p)) continue;
    const f = fmOf(fs.readFileSync(p, 'utf8'));
    rows.push({
      id: fld(f, 'id'), name: fld(f, 'name'), cat,
      gate: fld(f, 'gate') === 'true', mut: fld(f, 'mutating') === 'true',
      chains: fld(f, 'chains_to').replace(/[[\]"]/g, ''),
      trg: [...f.matchAll(/^\s*-\s+"(.+?)"\s*$/gm)].map(m => m[1]),
      desc: fld(f, 'description').split('.')[0].slice(0, 52),
    });
  }
}
const gates = rows.filter(r => r.gate).length;
const muts = rows.filter(r => r.mut).length;
const day = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

let out = `# 방법론 100 · 라우팅 테이블 (정본)

> 트루먼이 상시로 들고 있는 명부. **본문은 매칭된 순간에만 연다** (Progressive Disclosure).
> 자동 생성 · \`node scripts/build-routing.mjs\` · **손으로 고치지 않는다** (SKILL.md frontmatter 가 정본).
> 생성 ${day} · ${rows.length}개 · 게이트 ${gates}개 · 상태변경 ${muts}개
`;
let cur = null;
for (const r of rows) {
  if (r.cat !== cur) {
    cur = r.cat;
    out += `\n## ${cur} · ${CAT[cur] || cur}\n\n| ID | 스킬 | 부르는 말 | 다음 | G |\n|---|---|---|---|---|\n`;
  }
  const g = (r.gate ? 'G' : '') + (r.mut ? '!' : '');
  const trg = r.trg.map(x => `"${x}"`).join(' · ') || r.desc;
  out += `| ${r.id} | ${r.name} | ${trg} | ${r.chains} | ${g} |\n`;
}
out += `
---

**G** = 대외 발행물 · 컴플라이언스 게이트 필수 · **!** = 바깥 상태를 바꿈(발송·발행) · 승인 필수
**다음** = 이 일이 끝나면 보통 이어지는 스킬 (\`chains_to\`)
`;

// ── 체인 표 ─────────────────────────────────────────────
// ⚠️ 이 절은 생성물이다. 여기 표를 손으로 고치면 다음 실행에서 지워진다 · 2026-08-04
//   카테고리 체인 10 = 각 팀 PLUGIN.md 의 chain·chain_steps·chain_desc
//   교차 체인 5      = 100-skills/CHAINS.md
//   (체인 표가 build 에 없어 sync-methods.sh 한 번에 15종이 통째로 날아가던 것을 고쳤다)
const catChains = [];
for (const cat of fs.readdirSync(M).filter(d => /^\d\d-/.test(d)).sort()) {
  const p = path.join(M, cat, 'PLUGIN.md');
  if (!fs.existsSync(p)) continue;
  const f = fmOf(fs.readFileSync(p, 'utf8'));
  const name = fld(f, 'chain');
  if (!name) continue;
  catChains.push({ cat, name, steps: fld(f, 'chain_steps'), desc: fld(f, 'chain_desc') });
}
const xPath = path.join(M, 'CHAINS.md');
const xChains = fs.existsSync(xPath)
  ? [...fs.readFileSync(xPath, 'utf8').matchAll(/^\|\s*\*\*(.+?)\*\*\s*\|\s*`(.+?)`\s*\|(.+?)\|\s*$/gm)]
      .map(m => ({ name: m[1].trim(), steps: m[2].trim(), desc: m[3].trim() }))
  : [];

out += `
## 체인 ${catChains.length + xChains.length}종 (여러 스킬을 한 번에 잇는 말)

한 스킬만 부르는 대신 **한 줄로 한 바퀴를 도는** 말이다.
카테고리마다 하나씩 ${catChains.length}종, 카테고리를 넘나드는 것이 ${xChains.length}종이다.

| 체인 | 부를 말 | 순서 | 무엇을 하나 |
|---|---|---|---|
`;
for (const c of catChains) {
  out += `| **${c.name}** | 「${c.name} 돌려줘」 · 「${c.name}」 | \`${c.steps}\` | ${c.desc} |\n`;
}
out += `
**교차 체인 ${xChains.length}종** · 카테고리를 넘나든다 (정본 \`100-skills/CHAINS.md\`)

| 체인 | 부를 말 | 순서 | 무엇을 하나 |
|---|---|---|---|
`;
for (const c of xChains) {
  out += `| **${c.name}** | 「${c.name} 돌려줘」 | \`${c.steps}\` | ${c.desc} |\n`;
}
out += `
> ⚠️ **슬래시 명령이 아니다.** \`commands/\` 폴더는 2026-08-04 에 없앴다.
> 그냥 말하면 오케스트레이터가 순서대로 태운다. 중간에 ⏸ 가 뜨면 답을 주고 이어 간다.
> 정본은 각 카테고리의 \`PLUGIN.md\` 와 \`CHAINS.md\` 다.


경로: \`100-skills/{카테고리}/skills/{ID}-{slug}/SKILL.md\`
`;
fs.writeFileSync(path.join(M, 'ROUTING.md'), out);
console.log(`✓ 100-skills/ROUTING.md · ${rows.length}스킬 · 게이트 ${gates} · ${out.split('\n').length}줄`);
