#!/usr/bin/env node
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readdir, readFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const AGENTS_DIR = join(ROOT, "agents");

async function listAgents() {
  const out = [];
  async function walk(dir, prefix = "") {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) await walk(p, `${prefix}${entry.name}/`);
      else if (entry.name.endsWith(".md")) {
        out.push({ id: `${prefix}${basename(entry.name, ".md")}`, path: p });
      }
    }
  }
  await walk(AGENTS_DIR);
  return out;
}

async function runAgent(agentId, userPrompt) {
  const agents = await listAgents();
  const agent = agents.find(a => a.id === agentId || a.id.endsWith(`/${agentId}`));
  if (!agent) throw new Error(`에이전트를 찾을 수 없습니다: ${agentId}`);

  const systemPrompt = await readFile(agent.path, "utf8");

  const result = query({
    prompt: userPrompt,
    options: {
      systemPrompt,
      cwd: ROOT,
    },
  });

  for await (const msg of result) {
    if (msg.type === "assistant") {
      for (const block of msg.message.content) {
        if (block.type === "text") process.stdout.write(block.text);
      }
    }
  }
  process.stdout.write("\n");
}

const [, , cmd, ...rest] = process.argv;

if (!cmd || cmd === "--list" || cmd === "list") {
  const agents = await listAgents();
  console.log(`\n총 ${agents.length}개 에이전트:\n`);
  for (const a of agents) console.log(`  - ${a.id}`);
  console.log("\n실행: npm run agent <에이전트명> <프롬프트>\n");
} else {
  const userPrompt = rest.join(" ") || "오늘 할 일을 알려줘";
  await runAgent(cmd, userPrompt);
}
