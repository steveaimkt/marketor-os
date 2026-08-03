#!/usr/bin/env node
/**
 * sdk-p.mjs · `claude -p "<prompt>"` 의 드롭인 대체 (Claude Agent SDK)
 *
 * 목적: run-review.sh 등 기존 스크립트가 하드코딩된 `claude` CLI 경로에 의존해
 *       경로가 끊기면 실패하던 문제를 제거. 이 셔틀은 라이브러리라 CLI 경로 무관.
 *
 * 계약(= claude -p 와 동일):
 *   node scripts/sdk-p.mjs -p "프롬프트"        → 응답 텍스트를 stdout 으로
 *   옵션: --user-only (프로젝트 .mcp.json 미로드, 유저 커넥터만 = 브리핑 규약)
 *         --cwd <dir> · --effort low|high
 *         --model <id> (예: claude-opus-4-8 · claude-fable-5 · 미지정 시 세션 기본값)
 *   비어있으면 exit 1 (호출측이 '발송 건너뜀' 판정하게).
 */
import { query } from "@anthropic-ai/claude-agent-sdk";

const args = process.argv.slice(2);
let prompt = "", userOnly = false, cwd = process.cwd(), effort = null, model = null, yolo = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-p" || a === "--prompt") prompt = args[++i];
  else if (a === "--user-only") userOnly = true;
  else if (a === "--cwd") cwd = args[++i];
  else if (a === "--effort") effort = args[++i];
  else if (a === "--model") model = args[++i];
  else if (a === "--yolo") yolo = true;   // 헤드리스 자동화: 도구 승인 대기 없이 실행
  else if (!prompt) prompt = a;
}
if (!prompt) { process.stderr.write("sdk-p: 프롬프트 없음\n"); process.exit(1); }

const options = {
  // 브리핑은 프로젝트 MCP 미로드(유저 커넥터만) → settingSources 를 user 로 제한
  settingSources: userOnly ? ["user"] : ["project", "user"],
  cwd,
  // --yolo: cron/헤드리스에선 사람이 승인 못 하므로 bypassPermissions.
  //   ⚠️ 읽기 전용 조회(노션 쿼리 등)에만 쓸 것. 발행·삭제 프롬프트엔 금지.
  permissionMode: yolo ? "bypassPermissions" : "acceptEdits",
  ...(effort ? { effort } : {}),
  ...(model ? { model } : {}),
};

let text = "", isError = false;
try {
  for await (const msg of query({ prompt, options })) {
    if (msg.type === "assistant") {
      for (const b of msg.message.content) if (b.type === "text") { text += b.text; process.stdout.write(b.text); }
    } else if (msg.type === "result") {
      isError = msg.is_error ?? (msg.subtype && msg.subtype !== "success");
    }
  }
} catch (e) {
  process.stderr.write(`sdk-p error: ${e.message}\n`);
  process.exit(1);
}
process.stdout.write("\n");
if (isError || !text.trim()) process.exit(1);
