#!/usr/bin/env node
/**
 * agent-runner.mjs · marketing-os 에이전트를 Claude Agent SDK 로 실행하는 러너
 *
 * 기존(스캐폴드) → 실운영 완성본 (2026-07-26)
 *   · settingSources:["project","user"]  → CLAUDE.md·.claude/agents·스킬 자동 로드
 *   · 71개 .md 에이전트를 발견해 systemPrompt(frontmatter 제거 본문)로 호출
 *   · MCP 는 .mcp.json 을 SDK 가 로드(project settings) — 별도 배선 불필요
 *   · 모델 티어(--effort low|high) · 비용/턴 리포트 · 에러 처리 · JSON 출력
 *
 * 사용:
 *   node scripts/agent-runner.mjs --list
 *   node scripts/agent-runner.mjs voc-analyzer "이번 주 VoC 분석해줘"
 *   node scripts/agent-runner.mjs voc-analyzer "..." --effort low --json
 *   node scripts/agent-runner.mjs voc-analyzer "3번만 더 자세히" --resume <sessionId>
 *   node scripts/agent-runner.mjs voc-analyzer --stdin-prompt   (프롬프트를 표준입력으로)
 *
 * --stdin-prompt 는 원격 실행용이다. SSH 로 프롬프트를 넘길 때 인자로 붙이면
 * 원격 셸이 그 문자열을 해석해 인젝션 위험이 생긴다. 표준입력은 셸을 거치지 않는다.
 *
 * 세션 이어가기: 실행이 끝나면 stderr 에 `─ session: <id>` 를 남긴다.
 *   그 id 를 --resume 으로 넘기면 같은 대화 맥락에서 후속 지시를 이어갈 수 있다
 *   (대시보드 "이어서 지시" 가 이 계약을 쓴다).
 */
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readdir, readFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const AGENTS_DIR = join(ROOT, "agents");

// ── 에이전트 발견 (agents/**/*.md, _·TEAM·README 제외) ──────────────
async function listAgents() {
  const out = [];
  async function walk(dir, prefix = "") {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) { await walk(p, `${prefix}${entry.name}/`); continue; }
      if (!entry.name.endsWith(".md")) continue;
      const b = basename(entry.name, ".md");
      if (b.startsWith("_") || /^(TEAM|README)/i.test(b)) continue;
      // 호출 이름의 정본은 frontmatter name · 파일명과 다를 수 있다
      // (예: agents/orchestrator.md → name: marketing-os-orchestrator) → 둘 다로 찾히게 한다
      let fmName = "";
      try {
        const m = (await readFile(p, "utf8")).slice(0, 2000).match(/^---\n[\s\S]*?\bname:\s*([A-Za-z0-9_-]+)/);
        if (m) fmName = m[1];
      } catch { /* 읽기 실패는 파일명으로만 매칭 */ }
      out.push({ id: `${prefix}${b}`, name: b, fmName, path: p });
    }
  }
  await walk(AGENTS_DIR);
  return out;
}

// ── frontmatter 파싱 → 본문만 systemPrompt, name/description 추출 ────
function parseAgent(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.+)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: m[2].trim() };
}

async function runAgent(agentId, userPrompt, opts = {}) {
  const agents = await listAgents();
  const agent = agents.find(a => a.id === agentId || a.name === agentId || a.fmName === agentId || a.id.endsWith(`/${agentId}`));
  if (!agent) throw new Error(`에이전트를 찾을 수 없습니다: ${agentId} (npm run agent --list 로 확인)`);

  const raw = await readFile(agent.path, "utf8");
  const { meta, body } = parseAgent(raw);

  const options = {
    // .claude/agents·CLAUDE.md·스킬·.mcp.json(MCP)을 그대로 로드 → 71개 자산 재사용
    settingSources: ["project", "user"],
    // 이 에이전트 정의(.md 본문)를 시스템 프롬프트로
    systemPrompt: body,
    cwd: ROOT,
    permissionMode: opts.permissionMode || "acceptEdits",
    ...(opts.effort ? { model: undefined } : {}),  // effort 는 아래 EffortLevel 로
  };
  if (opts.effort) options.effort = opts.effort;   // 'low' = 수집·감시 경량 티어
  if (opts.maxTurns) options.maxTurns = opts.maxTurns;
  if (opts.resume) options.resume = opts.resume;   // 이전 세션 맥락을 이어받는다

  if (!opts.json) {
    process.stderr.write(`\n▶ ${agent.id}  ${meta.description ? "· " + meta.description.slice(0, 60) : ""}\n`);
    process.stderr.write(`  요청: ${userPrompt}\n\n`);
  }

  let text = "";
  let cost = null, turns = null, isError = false, sessionId = opts.resume || null;
  for await (const msg of query({ prompt: userPrompt, options })) {
    if (msg.session_id) sessionId = msg.session_id;
    if (msg.type === "assistant") {
      for (const block of msg.message.content) {
        if (block.type === "text") { text += block.text; if (!opts.json) process.stdout.write(block.text); }
      }
    } else if (msg.type === "result") {
      cost = msg.total_cost_usd ?? null;
      turns = msg.num_turns ?? null;
      isError = msg.is_error ?? (msg.subtype && msg.subtype !== "success");
    }
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ agent: agent.id, prompt: userPrompt, output: text, cost_usd: cost, turns, session_id: sessionId, error: isError }, null, 2) + "\n");
  } else {
    process.stdout.write("\n");
    // session 줄은 호출측(대시보드)이 파싱해 "이어서 지시" 에 쓴다 · 형식을 바꾸지 말 것
    if (sessionId) process.stderr.write(`\n─ session: ${sessionId}\n`);
    process.stderr.write(`─ 완료 · 턴 ${turns ?? "?"} · 비용 $${cost?.toFixed?.(4) ?? "?"}${isError ? " · ⚠️ 오류" : ""}\n`);
  }
  if (isError) process.exitCode = 1;
}

// ── CLI ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = { effort: null, json: false, maxTurns: null, resume: null, stdinPrompt: false };
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--effort") flags.effort = argv[++i];
  else if (a === "--json") flags.json = true;
  else if (a === "--max-turns") flags.maxTurns = Number(argv[++i]);
  else if (a === "--resume") flags.resume = argv[++i];
  else if (a === "--stdin-prompt") flags.stdinPrompt = true;
  else pos.push(a);
}
const [cmd, ...rest] = pos;

if (!cmd || cmd === "--list" || cmd === "list") {
  const agents = await listAgents();
  console.log(`\n총 ${agents.length}개 에이전트:\n`);
  for (const a of agents) console.log(`  - ${a.id}${a.fmName && a.fmName !== a.name ? `  (호출명: ${a.fmName})` : ""}`);
  console.log(`\n실행: node scripts/agent-runner.mjs <에이전트> "<프롬프트>" [--effort low] [--json]\n`);
} else {
  let userPrompt;
  if (flags.stdinPrompt) {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    userPrompt = Buffer.concat(chunks).toString("utf8").trim();
    if (!userPrompt) { process.stderr.write("\n❌ 표준입력으로 받은 프롬프트가 비어 있습니다\n"); process.exit(1); }
  } else {
    userPrompt = rest.join(" ") || "오늘 할 일을 알려줘";
  }
  try {
    await runAgent(cmd, userPrompt, flags);
  } catch (e) {
    process.stderr.write(`\n❌ ${e.message}\n`);
    process.exitCode = 1;
  }
}
