/**
 * auth.mjs · 대시보드 인증 계층 (웹 공개용)
 *
 * 두 가지 모드를 한 서버로 지원한다.
 *
 *   ① 로컬 모드 (기본 · 지금까지와 동일)
 *      127.0.0.1 바인딩 + launch별 CSRF 토큰만. 로그인 없음 · 일상 사용의 마찰 0.
 *
 *   ② 공개 모드 (웹에서 접근)
 *      비밀번호 로그인 + 세션 쿠키를 추가로 요구한다.
 *      DASHBOARD_PASSWORD(또는 DASHBOARD_PASSWORD_HASH) 가 있으면 자동 활성.
 *
 * fail-closed 원칙: 루프백이 아닌 주소에 바인딩하려는데 비밀번호가 없으면
 * 서버가 아예 뜨지 않는다 (실수로 인터넷에 무인 실행기를 노출하는 사고 차단).
 *
 * 루프백 면제: 비밀번호를 켜도 이 맥에서(127.0.0.1) 들어오는 요청은 로그인을 묻지 않는다.
 *   이 대시보드의 본래 목적이 "매일 쓰는 화면" 이라 로컬에 12시간마다 로그인을 요구하면
 *   마찰이 커진다. 반면 랜과 인터넷에서 오는 요청은 그대로 막힌다.
 *   로컬도 반드시 묻게 하려면 .env 에 DASHBOARD_REQUIRE_LOCAL_LOGIN=true 를 넣는다.
 *
 * 이 대시보드는 "명령을 실행하는" 도구다. 인증이 뚫리면 남이 내 계정으로
 * 에이전트를 돌리고 파일을 쓸 수 있다. 그래서 공개 모드는
 *   세션 쿠키(HttpOnly·SameSite=Strict) + CSRF 토큰 헤더  두 겹을 모두 요구한다.
 *
 * 비밀번호 해시 만들기:  node tools/dashboard/server.mjs --hash-password '내비밀번호'
 */
import crypto from 'node:crypto';

const SESSION_TTL = 12 * 60 * 60 * 1000;   // 12시간
const COOKIE = 'mos_dash';
const LOGIN_WINDOW = 15 * 60 * 1000;       // 브루트포스 완화: 15분당
const LOGIN_MAX = 10;                      //   IP별 10회

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

function verifyPassword(pw, stored) {
  try {
    const [alg, N, r, p, salt, key] = stored.split('$');
    if (alg !== 'scrypt') return false;
    const expect = Buffer.from(key, 'base64');
    const got = crypto.scryptSync(pw, Buffer.from(salt, 'base64'), expect.length, { N: +N, r: +r, p: +p });
    return crypto.timingSafeEqual(expect, got);
  } catch { return false; }
}

/**
 * 인증 계층 생성.
 * @param {{password?:string, passwordHash?:string, host:string, secureCookie?:boolean}} cfg
 */
export function createAuth(cfg) {
  const hash = cfg.passwordHash || (cfg.password ? hashPassword(cfg.password) : null);
  const enabled = !!hash;
  const loopback = /^(127\.0\.0\.1|::1|localhost)$/.test(cfg.host);
  const requireLocal = cfg.requireLocalLogin === true;

  if (!enabled && !loopback) {
    throw new Error(
      `보안 차단: ${cfg.host} 에 바인딩하려면 비밀번호가 필요합니다.\n` +
      `  .env 에 DASHBOARD_PASSWORD=... 를 넣거나, 해시를 쓰려면\n` +
      `  node tools/dashboard/server.mjs --hash-password '비밀번호'\n` +
      `  로 만든 값을 DASHBOARD_PASSWORD_HASH=... 에 넣으세요.\n` +
      `  (이 대시보드는 명령을 실행하므로 인증 없는 외부 노출을 허용하지 않습니다)`
    );
  }

  /** @type {Map<string,{exp:number}>} */
  const sessions = new Map();
  /** @type {Map<string,{n:number, reset:number}>} */
  const attempts = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of sessions) if (v.exp < now) sessions.delete(k);
    for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
  }, 60000).unref?.();

  const parseCookie = (req) => {
    const raw = req.headers.cookie || '';
    for (const part of raw.split(';')) {
      const i = part.indexOf('=');
      if (i > 0 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim();
    }
    return null;
  };

  return {
    enabled,
    /** 이 맥에서 온 요청인가 (루프백 면제 판정용) */
    isLocal(req) {
      const a = req.socket.remoteAddress || '';
      return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
    },
    /** 인증된 요청인가 (로컬 모드는 항상 true) */
    ok(req) {
      if (!enabled) return true;
      // 이 맥에서 직접 열었으면 묻지 않는다 (원격은 아래 세션 검사를 그대로 통과해야 한다)
      if (!requireLocal && this.isLocal(req)) return true;
      const sid = parseCookie(req);
      if (!sid) return false;
      const s = sessions.get(sid);
      if (!s || s.exp < Date.now()) { if (sid) sessions.delete(sid); return false; }
      return true;
    },
    /** 로그인 시도 · 성공 시 Set-Cookie 값을 반환 */
    login(req, password) {
      const ip = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const a = attempts.get(ip) || { n: 0, reset: now + LOGIN_WINDOW };
      if (a.reset < now) { a.n = 0; a.reset = now + LOGIN_WINDOW; }
      if (a.n >= LOGIN_MAX) return { ok: false, error: '시도 횟수를 초과했습니다. 15분 후 다시 시도하세요.', code: 429 };
      a.n++; attempts.set(ip, a);

      if (typeof password !== 'string' || !verifyPassword(password, hash)) {
        return { ok: false, error: '비밀번호가 맞지 않습니다', code: 401 };
      }
      a.n = 0;
      const sid = crypto.randomBytes(32).toString('base64url');
      sessions.set(sid, { exp: now + SESSION_TTL });
      const flags = ['HttpOnly', 'SameSite=Strict', 'Path=/', `Max-Age=${Math.floor(SESSION_TTL / 1000)}`];
      if (cfg.secureCookie) flags.push('Secure');
      return { ok: true, cookie: `${COOKIE}=${sid}; ${flags.join('; ')}` };
    },
    logout(req) {
      const sid = parseCookie(req);
      if (sid) sessions.delete(sid);
      return `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
    },
    /** 로그인 화면 (의존성 없는 단일 HTML) */
    loginPage(error = '') {
      return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>마케팅 OS 대시보드 · 로그인</title>
<style>
 :root{--bg:#F3F3F2;--card:#fff;--fg:#2A2A28;--muted:#848383;--line:#EBEBEB;--warn:#D03B3B;--sand:#E0CCBE}
 *{box-sizing:border-box;margin:0}
 body{background:var(--bg);color:var(--fg);font-family:"Pretendard","Apple SD Gothic Neo",system-ui,sans-serif;
   display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
 .box{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:32px;width:100%;max-width:380px;
   box-shadow:0 4px 14px rgba(0,0,0,.04)}
 h1{font-size:17px;font-weight:700;margin-bottom:6px}
 p{font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:20px}
 label{font-size:12px;font-weight:600;display:block;margin-bottom:6px}
 input{width:100%;background:#EEEDEB;border:1px solid var(--line);border-radius:10px;padding:11px 13px;
   font-family:inherit;font-size:14px;color:var(--fg)}
 input:focus{outline:none;border-color:#747264}
 button{width:100%;margin-top:14px;background:var(--fg);color:#fff;border:none;border-radius:5px;padding:12px;
   font-family:inherit;font-size:14px;font-weight:500;cursor:pointer}
 button:hover{background:#3C3633}
 .err{color:var(--warn);font-size:12.5px;margin-top:12px}
 .note{font-size:11.5px;color:var(--muted);margin-top:18px;padding-top:14px;border-top:1px solid var(--line);line-height:1.6}
</style></head><body>
<form class="box" method="POST" action="/login">
  <h1>🖥️ 마케팅 OS 대시보드</h1>
  <p>이 화면 뒤에서는 에이전트가 실제로 실행됩니다. 본인만 들어오세요.</p>
  <label for="pw">비밀번호</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" autofocus>
  <button type="submit">들어가기</button>
  ${error ? `<div class="err">⚠️ ${error.replace(/[<>&]/g, '')}</div>` : ''}
  <div class="note">비밀번호는 <b>.env</b> 의 DASHBOARD_PASSWORD 로 관리합니다 · 세션은 12시간 유지 · 15분당 10회 이상 실패하면 잠깁니다.</div>
</form></body></html>`;
    },
  };
}
