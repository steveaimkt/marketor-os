#!/usr/bin/env node
/**
 * quality-loop.mjs · 품질 루프 에이전트 (Agent SDK 입문용 · 주석이 곧 설명서)
 *
 * ┌─ 무엇을 하나 ─────────────────────────────────────────────┐
 * │ 카피 생성 → 6축 채점 → 평균 3.5 미만이면 피드백을 넣어   │
 * │ 재작성 → 통과(또는 3회 시도)까지 자동 반복.               │
 * │ 사람은 "통과한 결과"만 받아본다.                           │
 * └───────────────────────────────────────────────────────────┘
 *
 * 사용법:
 *   node scripts/quality-loop.mjs "유튜브 제목+훅: 프리미어 컷편집 자동화"
 *   (과제를 안 주면 기본 과제로 시연 실행)
 *
 * 과금: Max 구독 인증으로 돈다 (API 키 불필요 · 별도 청구 없음).
 *       출력되는 $ 숫자는 환산 추정치일 뿐이다.
 */

// ── SDK 사용법 1 · 가져오기 ─────────────────────────────────
// Agent SDK의 전부는 사실상 query() 함수 하나다.
// 그 query()를 감싼 심부름 함수 ask()는 검증 후 공용 부품으로 승격했다.
// (원형과 상세 주석은 scripts/lib/ask.mjs 참고 · 다른 스크립트도 이걸 재사용)
import { ask } from "./lib/ask.mjs";
import { writeFileSync, mkdirSync } from "node:fs";

// ── 루프의 안전핀 (필수) ────────────────────────────────────
// 통과선 기본 3.5 (6축 스킬 정본 기준) · 환경변수로 조절 가능: QL_THRESHOLD=4.2 node ...
const THRESHOLD = Number(process.env.QL_THRESHOLD ?? 3.5); // 정지 조건 1: 통과선
const MAX_TRIES = 3;   // 정지 조건 2: 아무리 못 넘어도 3회에서 멈춤 (폭주 방지)

const task = process.argv[2] ??
  "유튜브 영상 제목 1개 + 첫 문장 훅 1개: 프리미어 프로 컷편집을 클로드가 자동으로 해주는 MCP 시연 영상";

// ── 심부름 A · 카피 생성 ────────────────────────────────────
function writePrompt(feedback) {
  return `당신은 마케팅 카피라이터다. 아래 과제로 카피 1안을 작성하라.

과제: ${task}

브랜드 톤 (대표 · 우리 채널):
- 결과를 먼저 말한다. 숫자·전후 대조를 활용한다
- 전문용어 최소화. 마케터의 언어로 쓴다
- 과장·검증 불가 표현 금지. em-dash(—) 사용 금지
${feedback ? `\n직전 검수 피드백 (반드시 반영):\n${feedback}\n` : ""}
출력: 카피 본문만. 설명·서론 금지.`;
}

// ── 심부름 B · 6축 채점 ─────────────────────────────────────
// 코드가 점수로 분기해야 하므로 "JSON만 출력"을 강제한다.
// 이것이 SDK 활용의 두 번째 핵심 패턴: 다음 단계가 기계라면 출력도 기계용으로.
function scorePrompt(copy) {
  return `당신은 카피 품질 검수관이다. 아래 카피를 6축으로 채점하라 (각 1~5점, 냉정하게).

카피:
${copy}

과제 맥락: ${task}

6축: 명확성 / 타겟적합성 / 차별성 / CTA / 브랜드일관성 / 규제안전성

출력은 아래 JSON 한 개만. 다른 텍스트 절대 금지.
{"scores":{"명확성":0,"타겟적합성":0,"차별성":0,"CTA":0,"브랜드일관성":0,"규제안전성":0},"피드백":"개선 지시 3문장 이내"}`;
}

// ── 본체 · 품질 루프 ────────────────────────────────────────
console.log(`\n■ 품질 루프 시작 · 과제: ${task}`);
console.log(`■ 통과선: 6축 평균 ${THRESHOLD} / 최대 ${MAX_TRIES}회 시도\n`);

const rounds = [];
let copy = "", feedback = "", avg = 0, totalCost = 0;

for (let round = 1; round <= MAX_TRIES; round++) {
  // 1단계: 쓴다 (이전 라운드 피드백이 있으면 반영)
  const gen = await ask(writePrompt(feedback), { label: `${round}라운드 생성` });
  copy = gen.text;
  totalCost += gen.cost;

  // 2단계: 채점한다
  const rev = await ask(scorePrompt(copy), { label: `${round}라운드 채점` });
  totalCost += rev.cost;

  // 3단계: 코드가 점수를 읽고 계속할지 멈출지 결정한다 (여기가 "루프 에이전트"의 심장)
  const json = rev.text.match(/\{[\s\S]*\}/);
  if (!json) throw new Error("채점 결과 JSON 파싱 실패: " + rev.text.slice(0, 200));
  const parsed = JSON.parse(json[0]);
  const scores = parsed.scores;
  avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
  feedback = parsed.피드백 ?? "";

  rounds.push({ round, copy, scores, avg: +avg.toFixed(2), feedback });
  console.log(`── ${round}라운드: 평균 ${avg.toFixed(2)}점 · ` +
    Object.entries(scores).map(([k, v]) => `${k} ${v}`).join(" · "));

  if (avg >= THRESHOLD) { console.log(`   → 통과 ✅\n`); break; }
  console.log(`   → 미달, 피드백 반영 재작성: ${feedback}\n`);
}

// ── 산출물 착지 (marketing-os 표준: 로컬 파일) ──────────────
// 한국 시간 기준 날짜 (toISOString은 UTC라 새벽에 하루 어긋남)
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const dir = `outputs/${today}/quality-loop`;
mkdirSync(dir, { recursive: true });
const report = [
  `# 품질 루프 결과 · ${today}`,
  `- 과제: ${task}`,
  `- 결과: ${avg >= THRESHOLD ? `통과 (평균 ${avg.toFixed(2)})` : `${MAX_TRIES}회 미통과 · 사람 검토 필요`}`,
  `- 비용 환산치: $${totalCost.toFixed(4)} (Max 구독 한도 내 · 실청구 아님)`,
  ``,
  `## 최종 카피`,
  copy,
  ``,
  `## 라운드 기록`,
  ...rounds.map(r =>
    `### ${r.round}라운드 · 평균 ${r.avg}\n` +
    `점수: ${Object.entries(r.scores).map(([k, v]) => `${k} ${v}`).join(" · ")}\n` +
    (r.avg >= THRESHOLD ? `판정: 통과` : `판정: 미달 · 피드백: ${r.feedback}`) +
    `\n\n카피:\n${r.copy}`),
].join("\n");
const outPath = `${dir}/${today}-품질루프-카피.md`;
writeFileSync(outPath, report);

console.log(`■ 완료 · 최종 평균 ${avg.toFixed(2)}점 · 총 비용 환산 $${totalCost.toFixed(4)}`);
console.log(`■ 산출물: ${outPath}\n`);
console.log(`===== 최종 카피 =====\n${copy}`);
