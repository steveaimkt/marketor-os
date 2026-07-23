#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네이버 검색광고(SearchAd) REST API 서명 호출기.

공식 MCP가 없어 REST를 직접 HMAC-SHA256 서명으로 호출한다.
.env 의 NAVER_SEARCHAD_API_KEY · NAVER_SEARCHAD_SECRET_KEY · NAVER_SEARCHAD_CUSTOMER_ID 사용.

사용 예:
  python3 scripts/naver_searchad.py GET /ncc/campaigns
  python3 scripts/naver_searchad.py GET /stats \
      --params '{"id":"nccCampaign-xxx","fields":["impCnt","clkCnt","salesAmt","ccnt"],"timeRange":{"since":"2026-06-04","until":"2026-06-10"}}'

인증 방식 (네이버 검색광고 공식):
  X-Timestamp : epoch milliseconds
  X-API-KEY   : 액세스 라이선스
  X-Customer  : CUSTOMER_ID
  X-Signature : Base64( HMAC-SHA256( SECRET_KEY, "{timestamp}.{method}.{path}" ) )
"""
import sys, os, time, hmac, hashlib, base64, json, urllib.parse, urllib.request, urllib.error

BASE_URL = "https://api.searchad.naver.com"


def load_env(path):
    env = {}
    if not os.path.exists(path):
        return env
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def sign(timestamp, method, path, secret_key):
    message = f"{timestamp}.{method}.{path}"
    digest = hmac.new(secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("utf-8")


def call(method, path, params=None, env=None):
    api_key = env["NAVER_SEARCHAD_API_KEY"]
    secret_key = env["NAVER_SEARCHAD_SECRET_KEY"]
    customer_id = env["NAVER_SEARCHAD_CUSTOMER_ID"]

    timestamp = str(int(time.time() * 1000))
    signature = sign(timestamp, method, path, secret_key)

    url = BASE_URL + path
    body = None
    if params:
        if method.upper() == "GET":
            url += "?" + urllib.parse.urlencode(
                {k: (json.dumps(v) if isinstance(v, (dict, list)) else v) for k, v in params.items()}
            )
        else:
            body = json.dumps(params).encode("utf-8")

    req = urllib.request.Request(url, data=body, method=method.upper())
    req.add_header("X-Timestamp", timestamp)
    req.add_header("X-API-KEY", api_key)
    req.add_header("X-Customer", str(customer_id))
    req.add_header("X-Signature", signature)
    req.add_header("Content-Type", "application/json; charset=UTF-8")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except urllib.error.URLError as e:
        return 0, f"URLError: {e.reason}"


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print("usage: naver_searchad.py <METHOD> <PATH> [--params '<json>']")
        sys.exit(1)
    method, path = args[0], args[1]
    params = None
    if "--params" in args:
        params = json.loads(args[args.index("--params") + 1])

    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = load_env(os.path.join(here, ".env"))
    missing = [k for k in ("NAVER_SEARCHAD_API_KEY", "NAVER_SEARCHAD_SECRET_KEY", "NAVER_SEARCHAD_CUSTOMER_ID") if k not in env]
    if missing:
        print(f"[ERROR] .env 누락 키: {missing}")
        sys.exit(2)

    status, text = call(method, path, params, env)
    print(f"HTTP {status}")
    try:
        print(json.dumps(json.loads(text), ensure_ascii=False, indent=2))
    except Exception:
        print(text)


if __name__ == "__main__":
    main()
