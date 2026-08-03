/**
 * config.mjs · 대시보드 설정 저장소 (brand/dashboard.json)
 *
 * 사람이 정하는 값(목표·예약 페이지·사업 영역·발행 계획·꺼둔 스킬·첫 세팅 답변)을
 * 한 파일에 모아 둔다. 외부 도구가 필요 없어 즉시 동작한다.
 *
 * 수집해서 얻는 값(채널 실적·일정·미팅·기억)은 여기가 아니라 collect.mjs 의 캐시로 간다.
 * 즉 이 파일은 "내가 정한 것", 캐시는 "밖에서 읽어온 것".
 *
 * 쓰기는 항상 원자적으로 (임시 파일 → rename) · 동시 저장으로 파일이 깨지지 않게.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../scripts/status-lib.mjs';
import { dbReady, saveConfigRow, loadConfigRow } from './store.mjs';

const FILE = path.join(ROOT, 'brand', 'dashboard.json');

/** 처음 열었을 때의 모양. 값이 비어 있으면 화면은 빈 상태로 안내한다. */
const DEFAULTS = {
  version: 1,
  owner: '스티브',
  /** 사업 영역 카드 (홈 3열) · rows 는 {k,v} 목록 */
  areas: [
    { name: 'AI 교육', icon: 'cap', status: '', rows: [] },
    { name: '컨설팅', icon: 'case', status: '', rows: [] },
    { name: '매체 운영', icon: 'mega', status: '', rows: [] },
  ],
  /** 채널 정의 · 발행 보드와 성과 표의 열 순서를 정한다 */
  channels: [
    { key: 'newsletter', name: '뉴스레터', goal: '', weekly: 1, manual: false },
    { key: 'youtube', name: '유튜브', goal: '', weekly: 1, manual: false },
    { key: 'linkedin', name: '링크드인', goal: '', weekly: 3, manual: false },
    { key: 'threads', name: '쓰레드', goal: '', weekly: 5, manual: true },
    { key: 'instagram', name: '인스타그램', goal: '', weekly: 2, manual: true },
  ],
  /** 발행 보드 · { '월요일': { newsletter:'done', ... } } · 상태 6종 done|draft|wait|block|empty|rest */
  publishBoard: {},
  /** 구글 약속 예약 페이지 (유형별 URL) */
  bookingPages: [
    { name: '기업 교육 상담', len: '60분', open: '', url: '' },
    { name: '컨설팅 문의', len: '30분', open: '', url: '' },
    { name: '짧은 통화', len: '15분', open: '', url: '' },
  ],
  /** 예약 페이지 공통 규칙 (표시용) */
  bookingRules: { hours: '', exclude: '', buffer: '', maxPerDay: '', notice: '' },
  /**
   * 실행 위치 · 업무를 어느 기계에서 돌릴지.
   * local 은 항상 있다. ssh 항목은 host 와 user 와 path 가 채워져야 켜진다.
   */
  runners: [
    { key: 'local', name: '내 맥', kind: 'local', enabled: true },
    { key: 'vps', name: 'VPS 봇', kind: 'ssh', host: '', user: '', port: 22, path: '', enabled: false,
      note: '밤과 주말 업무 · 24시간 대기' },
    { key: 'macmini', name: '맥미니 봇', kind: 'ssh', host: '', user: '', port: 22, path: '', enabled: false,
      note: '무거운 영상 작업' },
  ],
  /**
   * 치운 결정 카드 · [{ id, how: 'done'|'skip', at }]
   * 홈의 "지금 결정할 것" 에서 완료나 안 함으로 내린 항목. 업무 기록은 그대로 남고 카드만 숨는다.
   */
  decisionsHidden: [],
  /**
   * 전략 기둥 · 모든 지시는 이 중 하나에 묶인다 (creator-os 의 TIES TO 패턴 +
   * 방향정렬 원칙의 UI화 · 2026-08-01). 새는 지시가 눈에 보이게 하는 장치.
   */
  pillars: [
    { key: 'lecture', name: '기업 강의', tone: '#2A2A28' },
    { key: 'youtube', name: '유튜브', tone: '#D03B3B' },
    { key: 'vod', name: '온라인 강의', tone: '#4C4D59' },
    { key: 'ladder', name: '커뮤니티', tone: '#847252' },
    { key: 'ops', name: '운영', tone: '#747264' },
  ],
  /** 수입 장부 · 수동 기록 (Money Entry 패턴) [{amount(원), source, pillar, at}] */
  moneyEntries: [],
  weekGoals: [],
  deptWork: {},    // 부서별 "시킬 수 있는 일" 실업무 오버라이드 · {부서명:[{label,target,prompt,pillar}]}
  deptOff: [],
  skillMap: {},
  teamRules: {},
  flows: [    // 자주 하는 혼재 업무 · 실행 탭 칩 한 번에 팀 방·지시문·검증까지 세팅
    { label: '유튜브 영상 한 편', room: '콘텐츠팀', target: 'youtube-content-orchestrator', pillar: 'youtube', verify: false,
      prompt: '유튜브 영상 한 편을 하네스로 만들어라: 리서치(경쟁·트렌드) → 대본(my-유튜브-대본 스킬 준수) → 제목·태그·썸네일 → 6축 검수 → 규제 게이트. 각 단계 산출물은 파일 착지, 사람 결정 지점(각도 선택·업로드)은 ⏸ 승인으로 남겨라.' },
    { label: '링크드인 발행 사이클', room: '콘텐츠팀', target: 'linkedin-post-writer', pillar: 'lecture', verify: true,
      prompt: '링크드인 포스트 1편을 my-링크드인-포스트 스킬 규격(정본 스타일 위임 · 발행 직전 상태)으로 써라. 주제 후보 2개 제시 후 추천안으로.' },
    { label: '뉴스레터 한 통', room: '콘텐츠팀', target: 'email-newsletter', pillar: 'ladder', verify: true,
      prompt: '이번 주 뉴스레터를 제목·본문·발송 안내까지 발행 직전 상태로 만들어라. 발송은 사람 몫으로 명시해라.' },
    { label: '기업 강의 제안서', room: '강의사업팀', target: 'corporate-training-prep', pillar: 'lecture', verify: false,
      prompt: '기업 출강 제안서 초안을 만들어라. 대상 기업 정보가 없으면 최근 문의 패턴 기준 가정을 명시하고 커리큘럼·운영안·견적 틀까지 포함해라.' },
    { label: '방향 피드백 받기', room: '구축실', target: 'plan-reviewer', pillar: 'ops', verify: false,
      prompt: '(대시보드가 실측 데이터를 붙여 보냅니다) 나의 마케팅 리더로서 방향 피드백을 달라.' },
    { label: '주간 경영 리뷰', room: '구축실', target: 'ops-lead', pillar: 'ops', verify: false,
      prompt: '주간 경영 리뷰를 만들어라 (방법론 098 참조): ① 이번 주 TEAM 집계(마감 진행·발행·비용·승인 처리 속도) 실측 ② 인사(직원 실적·과부하·공백) ③ 잘된 것/막힌 것 각 3개 ④ 다음 주 진짜 마감 3건 제안. 결정 브리핑 규격으로 ⏸ 승인에 올려라.' },
  ],  // M(축적) · 팀별 피드백 규칙 {부서명:[{text,at}]} · 다음 지시 프롬프트에 자동 주입   // 방법론 → 내 맞춤 스킬 매핑 · {'024':'my-유튜브-대본'} · 계획 탭 '내 것으로 만들기'의 결과     // 접어 둘 부서 (강의 실습용 등 · 화면에서 흐리게)   // 이번 주 진짜 마감 · {key,name,pillar,due:'YYYY-MM-DD',status:'todo|doing|done',order:{mode,target,prompt}}
  /** 저장해 둔 요청 · 지시창에서 "저장해 두기" 를 누른 것 [{kind,id,name,prompt,at}] */
  presets: [],
  /** 꺼둔 스킬 이름 목록 · 카탈로그에서 제외된다 */
  skillsOff: [],
  /** 첫 세팅 답변 · setupDone 이 true 면 온보딩을 건너뛴다 */
  setup: { done: false, answers: {}, savedAt: null },
};

function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch;                    // 배열은 통째로 교체
  if (patch === null || typeof patch !== 'object') return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = (base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]))
      ? deepMerge(base[k], v) : (Array.isArray(v) || typeof v !== 'object' || v === null ? v : deepMerge({}, v));
  }
  return out;
}

/** 메모리 사본 · DB 는 비동기라 매 요청마다 기다리지 않게 기동 시 한 번 당겨 둔다 */
let cached = null;

export function readConfig() {
  if (cached) return cached;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return deepMerge(DEFAULTS, raw);
  } catch {
    return { ...DEFAULTS };
  }
}

/** 기동 시 1회 · DB 에 저장된 설정이 있으면 그것을 정본으로 삼는다 */
export async function primeConfig() {
  if (!dbReady()) return { from: 'file' };
  const row = await loadConfigRow();
  if (row) { cached = deepMerge(DEFAULTS, row); return { from: 'supabase' }; }
  // DB 가 비어 있으면 파일 내용을 올려 둔다 (첫 이관)
  const local = readConfig();
  await saveConfigRow(local);
  cached = local;
  return { from: 'file→supabase' };
}

/** 부분 갱신 (patch 만 병합) → 저장된 전체를 반환 */
export function writeConfig(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, error: '설정은 객체여야 합니다', code: 400 };
  }
  const next = deepMerge(readConfig(), patch);
  next.version = 1;
  next.savedAt = Date.now();
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
    fs.renameSync(tmp, FILE);                                 // 원자적 교체
    cached = next;
    if (dbReady()) saveConfigRow(next).catch(() => {});       // DB 가 정본 · 파일은 git 이력용
    return { ok: true, config: next };
  } catch (e) {
    return { ok: false, error: String(e), code: 500 };
  }
}

/** 스킬 켜기·끄기 · skillsOff 목록을 토글한다 */
export function toggleSkill(name, on) {
  if (typeof name !== 'string' || !name.trim()) return { ok: false, error: '스킬 이름이 필요합니다', code: 400 };
  const cfg = readConfig();
  const off = new Set(cfg.skillsOff || []);
  if (on) off.delete(name); else off.add(name);
  return writeConfig({ skillsOff: [...off] });
}

/**
 * 첫 세팅 답변을 brand/ 정본 파일에 사람이 읽을 수 있게 덧붙인다.
 * team.md·org-map.md·roster.md 는 템플릿이므로 덮어쓰지 않고 "세팅 기록" 절을 추가한다.
 */
export function applySetup(answers) {
  const stamp = new Date().toLocaleString('ko-KR');
  const lines = Object.entries(answers || {}).map(([k, v]) => `| ${k} | ${String(v).replace(/\n/g, ' ')} |`);
  if (!lines.length) return { ok: false, error: '기록할 답변이 없습니다', code: 400 };

  const block = `\n\n## 대시보드 첫 세팅 기록 (${stamp})\n> 대시보드 온보딩에서 받은 답변이다. 이 값을 근거로 위 표를 채운다.\n\n| 질문 | 답변 |\n|---|---|\n${lines.join('\n')}\n`;
  const written = [];
  for (const f of ['team.md', 'org-map.md']) {
    const p = path.join(ROOT, 'brand', f);
    try { fs.appendFileSync(p, block); written.push('brand/' + f); } catch { /* 없으면 건너뜀 */ }
  }
  const r = writeConfig({ setup: { done: true, answers, savedAt: Date.now() } });
  if (!r.ok) return r;
  return { ok: true, config: r.config, written };
}
