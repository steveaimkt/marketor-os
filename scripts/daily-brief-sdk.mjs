#!/usr/bin/env node
/**
 * daily-brief-sdk.mjs · 데일리 브리핑을 Claude Agent SDK 로 실행
 *
 * 목적: 기존 run-review.sh 의 하드코딩 `claude` CLI 경로 의존을 제거한다.
 *   (claude 실행 파일 경로가 끊기면 브리핑 실패 → 2026-07-22 저녁 미발송 사고)
 *   SDK 는 라이브러리라 CLI 경로에 의존하지 않는다 → 근본 해결.
 *
 * 사용:
 *   node scripts/daily-brief-sdk.mjs morning
 *   node scripts/daily-brief-sdk.mjs evening --json
 *
 * 인증: ANTHROPIC_API_KEY 필요 (헤드리스). 없으면 CLI 로그인 세션에 폴백 시도.
 * 발송: 결과 텍스트를 stdout + last-<mode>.md 로. 디스코드 발송은 기존 훅/webhook 재사용.
 */
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REVIEW_DIR = join(process.env.HOME, "marketing-os-review");

const MODE = (process.argv[2] || "morning").replace(/^--/, "");
const JSON_OUT = process.argv.includes("--json");

// 브리핑 에이전트 정의(.md) = daily-marketing-brief
const AGENT_PATH = join(ROOT, "agents", "part0-ops", "daily-marketing-brief.md");

function stripFrontmatter(raw) {
  const m = raw.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return m ? m[1].trim() : raw;
}

async function main() {
  // 1) 시스템 프롬프트 = 브리핑 에이전트 본문
  let systemPrompt = "";
  if (existsSync(AGENT_PATH)) systemPrompt = stripFrontmatter(await readFile(AGENT_PATH, "utf8"));

  // 2) 컨텍스트(전일 로그 등) 있으면 프롬프트에 붙임 — 기존 run-review 규약 유지
  const ctxFile = join(REVIEW_DIR, `context-${MODE}.txt`);
  let ctx = "";
  if (existsSync(ctxFile)) ctx = await readFile(ctxFile, "utf8");

  const userPrompt =
    MODE === "morning"
      ? `아침 브리핑을 작성하라. 오늘 우선순위·경쟁/트렌드 급상승·광고 임계 점검을 간결히. 디스코드 발송용 마크다운.\n\n[전일 컨텍스트]\n${ctx}`
      : `저녁 업무 리뷰를 작성하라. 오늘 처리한 일·효율·내일 이월을 간결히. 디스코드 발송용 마크다운.\n\n[오늘 컨텍스트]\n${ctx}`;

  const options = {
    settingSources: ["project", "user"],   // CLAUDE.md·MCP·에이전트 자동 로드
    systemPrompt: systemPrompt || undefined,
    cwd: ROOT,
    permissionMode: "acceptEdits",
    effort: "low",                          // 브리핑 = 경량 티어
  };

  let text = "", cost = null, turns = null, isError = false;
  for await (const msg of query({ prompt: userPrompt, options })) {
    if (msg.type === "assistant") {
      for (const b of msg.message.content) if (b.type === "text") { text += b.text; if (!JSON_OUT) process.stdout.write(b.text); }
    } else if (msg.type === "result") {
      cost = msg.total_cost_usd ?? null; turns = msg.num_turns ?? null;
      isError = msg.is_error ?? (msg.subtype && msg.subtype !== "success");
    }
  }

  // 3) 산출물 파일 (기존 run-review 와 동일 경로 → 디스코드 발송 훅 재사용)
  try { await writeFile(join(REVIEW_DIR, `last-${MODE}.md`), text); } catch {}

  if (JSON_OUT) process.stdout.write(JSON.stringify({ mode: MODE, output: text, cost_usd: cost, turns, error: isError }, null, 2) + "\n");
  else process.stderr.write(`\n─ ${MODE} 브리핑 완료 · 턴 ${turns ?? "?"} · $${cost?.toFixed?.(4) ?? "?"}${isError ? " · ⚠️" : ""}\n`);
  if (isError || !text.trim()) process.exitCode = 1;   // 빈 결과 = 실패 (발송 훅이 건너뛰게)
}

main().catch(e => { process.stderr.write(`\n❌ ${e.message}\n`); process.exitCode = 1; });
