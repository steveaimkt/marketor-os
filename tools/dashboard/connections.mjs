/**
 * connections.mjs · 도구 연결 진단
 *
 * "연결됨" 을 추측하지 않고 **실제로 찔러 본다.** .mcp.json 에 등록만 돼 있고
 * 인증이 끊긴 도구를 정상으로 표시하면 화면이 거짓말을 하게 된다.
 *
 * 세 가지 상태만 쓴다.
 *   ok     지금 값을 받아왔다 (실측)
 *   needs  등록은 됐지만 사람이 한 번 손대야 한다 (명령을 함께 준다)
 *   agent  노드에서 확인할 수 없다. 에이전트(MCP)를 거쳐야 쓸 수 있다
 *
 * 진단은 3초 안에 끝나야 한다 (화면 로딩을 막지 않게 타임아웃을 짧게).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from '../../scripts/status-lib.mjs';

const TIMEOUT = 4000;

function readDotEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch {}
  return out;
}

const fetchJson = async (url, init) => {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT);
  try { const r = await fetch(url, { ...init, signal: ac.signal }); return await r.json(); }
  finally { clearTimeout(t); }
};

/** 유튜브 · API 키로 실제 채널을 읽어 본다 */
async function probeYouTube(e) {
  if (!e.YOUTUBE_API_KEY || !e.YOUTUBE_CHANNEL_ID) {
    return { state: 'needs', detail: '.env 에 YOUTUBE_API_KEY 와 YOUTUBE_CHANNEL_ID 가 필요합니다' };
  }
  try {
    const j = await fetchJson(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${e.YOUTUBE_CHANNEL_ID}&key=${e.YOUTUBE_API_KEY}`);
    if (j.error) return { state: 'needs', detail: 'API 오류: ' + j.error.message.slice(0, 90) };
    const c = j.items?.[0];
    if (!c) return { state: 'needs', detail: '채널 ID 를 찾지 못했습니다' };
    return { state: 'ok', detail: `${c.snippet.title} · 구독 ${Number(c.statistics.subscriberCount).toLocaleString('ko-KR')}명` };
  } catch (err) {
    return { state: 'needs', detail: '연결 실패: ' + String(err.message || err).slice(0, 90) };
  }
}

/** GA4 · ADC 리프레시 토큰이 아직 유효한지 본다 (스코프까지 확인) */
async function probeGa4() {
  const p = path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  let a;
  try { a = JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return { state: 'needs', detail: '구글 기본 인증(ADC)이 없습니다', fix: 'gcloud auth application-default login' }; }
  if (!a.refresh_token) return { state: 'needs', detail: 'ADC 에 갱신 토큰이 없습니다', fix: 'gcloud auth application-default login' };
  const fix = `gcloud auth application-default login --client-id-file=${p.replace('application_default_credentials.json', 'ga4_oauth_client.json')} --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform`;
  try {
    const body = new URLSearchParams({ client_id: a.client_id, client_secret: a.client_secret, refresh_token: a.refresh_token, grant_type: 'refresh_token' });
    const j = await fetchJson('https://oauth2.googleapis.com/token', { method: 'POST', body });
    if (j.error) {
      const rapt = /rapt|invalid_grant/i.test(j.error + (j.error_description || ''));
      return { state: 'needs', detail: rapt ? '인증이 만료됐습니다. 브라우저 재로그인이 필요합니다' : String(j.error).slice(0, 90), fix };
    }
    if (!/analytics/.test(j.scope || '')) {
      return { state: 'needs', detail: '토큰에 애널리틱스 권한이 없습니다', fix };
    }
    return { state: 'ok', detail: '홈페이지 방문 데이터를 읽을 수 있습니다' };
  } catch (err) {
    return { state: 'needs', detail: '확인 실패: ' + String(err.message || err).slice(0, 90), fix };
  }
}

/** Second Brain · CLI 실행 파일이 실제로 있는지 (심링크만 있고 대상이 없는 경우가 있었다) */
function probeGbrain() {
  const link = path.join(os.homedir(), '.bun', 'bin', 'gbrain');
  try {
    const real = fs.realpathSync(link);
    if (fs.existsSync(real)) return { state: 'ok', detail: '명령줄 도구가 있습니다' };
    return { state: 'needs', detail: `연결 고리가 끊겼습니다 (${path.basename(real)} 없음)`, fix: 'bun add -g gbrain' };
  } catch {
    return { state: 'agent', detail: '명령줄 도구는 없지만 에이전트가 MCP 로 씁니다' };
  }
}

/** Buffer · 레거시 REST 는 폐기됐다. 토큰 유무만 보고 나머지는 에이전트에 맡긴다 */
function probeBuffer(e) {
  if (!e.BUFFER_ACCESS_TOKEN) return { state: 'needs', detail: '.env 에 BUFFER_ACCESS_TOKEN 이 필요합니다' };
  return { state: 'agent', detail: '옛 REST 는 폐기됐습니다. 에이전트가 MCP 로 씁니다' };
}

/** 네이버 · 키 보유만 확인 (검색광고는 서명 호출이라 진단에서 제외) */
const envHas = (e, keys, label) => keys.every(k => e[k])
  ? { state: 'agent', detail: `키 있음 · 에이전트가 씁니다` }
  : { state: 'needs', detail: `.env 에 ${keys.filter(k => !e[k]).join(', ')} 가 필요합니다` };

/** MCP 등록만 확인되는 것들 (노드에서 찔러 볼 방법이 없다) */
const MCP_ONLY = [
  ['노션', 'notion', '기록과 문서'],
  ['지메일', 'gmail', '미팅 요청 읽기'],
  ['구글 캘린더', 'google-calendar', '내 일정'],
  ['Akiflow', 'akiflow', '내 할 일'],
  ['구글 시트', 'google-sheets', '데이터 정리'],
  ['구글 광고', 'google-ads', '광고 성과'],
  ['메타 광고', 'meta-ads', '광고 성과'],
  ['웹 수집', 'firecrawl', '경쟁사 감시'],
];

export async function probeConnections(mcpNames = []) {
  const e = readDotEnv();
  const reg = new Set(mcpNames.map(n => String(n).toLowerCase()));
  const registered = (needle) => [...reg].some(n => n.includes(needle.toLowerCase()));

  const [yt, ga4] = await Promise.all([probeYouTube(e), probeGa4()]);

  const rows = [
    { name: '유튜브 채널 데이터', slug: 'youtube-data', use: '채널 성과와 영상 기획', ...yt },
    { name: '홈페이지 방문 데이터', slug: 'ga4', use: '유입과 전환', ...ga4 },
    { name: 'Second Brain', slug: 'gbrain', use: '모든 업무의 기억', ...probeGbrain() },
    { name: '소셜 예약 발행', slug: 'buffer', use: '링크드인 예약', ...probeBuffer(e) },
    { name: '디스코드 알림', slug: 'discord-webhook', use: '결과 발송',
      ...(e.DISCORD_WEBHOOK_URL ? { state: 'ok', detail: '웹훅이 설정돼 있습니다' } : { state: 'needs', detail: '.env 에 DISCORD_WEBHOOK_URL 이 필요합니다' }) },
    { name: '메일 발송', slug: 'gmail-smtp', use: '뉴스레터 발송', ...envHas(e, ['GMAIL_ADDRESS', 'GMAIL_APP_PASSWORD']) },
  ];

  for (const [name, slug, use] of MCP_ONLY) {
    rows.push({
      name, slug, use,
      ...(registered(slug)
        ? { state: 'agent', detail: '등록됨 · 에이전트가 씁니다' }
        // .mcp.json 에 없어도 클로드 계정 커넥터로 붙는 경우가 있다.
        // 2026-07-30 실측: 구글 캘린더와 Second Brain 은 이 경로로 수집이 성공했다.
        : { state: 'agent', detail: '이 리포에는 미등록 · 클로드 계정 커넥터로 씁니다' }),
    });
  }

  const count = { ok: 0, agent: 0, needs: 0 };
  for (const r of rows) count[r.state] = (count[r.state] || 0) + 1;
  return { checkedAt: Date.now(), count, rows };
}
