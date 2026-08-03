/**
 * lib/ask.mjs · Agent SDK 심부름 래퍼 (공용 부품)
 *
 * quality-loop.mjs에서 검증된 패턴을 공용으로 승격한 것.
 * 어떤 SDK 스크립트든 이 한 줄이면 된다:
 *   import { ask } from "./lib/ask.mjs";
 *   const { text, cost } = await ask("프롬프트", { label: "무슨 심부름" });
 *
 * query()가 주는 메시지 스트림에서 텍스트만 모아 돌려주고,
 * 실패하면 label을 붙여 에러를 던진다. cost는 환산 추정치(구독이라 실청구 아님).
 */
import { query } from "@anthropic-ai/claude-agent-sdk";

export async function ask(prompt, opts = {}) {
  const {
    label = "SDK 호출",
    model = null,          // 예: "claude-fable-5" · 미지정 시 세션 기본값
    maxTurns = 1,          // 1 = 한 번 생각하고 답. 도구를 여러 번 쓰게 하려면 올린다
    settingSources = [],   // [] = 가볍게(프로젝트 미로드) · ["project","user"] = 자산 전체 로드
    allowedTools = [],     // [] = 순수 글쓰기 · 필요 시 ["Read","WebSearch"] 등 열어준다
  } = opts;

  let text = "";
  let cost = 0;
  for await (const msg of query({
    prompt,
    options: { settingSources, allowedTools, maxTurns, ...(model ? { model } : {}) },
  })) {
    if (msg.type === "assistant") {
      for (const b of msg.message.content) if (b.type === "text") text += b.text;
    } else if (msg.type === "result") {
      cost = msg.total_cost_usd ?? 0;
      if (msg.is_error) throw new Error(`${label} 실패: ${msg.subtype}`);
    }
  }
  return { text: text.trim(), cost };
}
