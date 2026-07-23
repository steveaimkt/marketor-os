#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네이버 시장 리포트 파이프라인 (5단계 구조)
  ① 설치   : .env (SearchAd 3키 + DataLab 2키) + Discord webhook
  ② 기능   : SearchAd /keywordstool(검색량·연관어) + DataLab 검색트렌드(계절성)
  ③ 활용   : 시드→연관어 확장→검색량 점수화→계절성·기회손실 진단
  ④ 리포트 : 단일 HTML (outputs/{날짜}/naver-market/)
  ⑤ 발송   : Discord webhook embed  (--send 플래그가 있을 때만 실제 발송)

사용:
  python3 scripts/naver_market_report.py                 # 수집+분석+HTML (발송 안 함, 미리보기)
  python3 scripts/naver_market_report.py --send          # + Discord 실제 발송
  python3 scripts/naver_market_report.py --seeds 전기톱,전동가위 --date 2026-06-19
"""
import os, json, subprocess, urllib.request, urllib.error, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEARCHAD = os.path.join(ROOT, "scripts", "naver_searchad.py")
DEFAULT_SEEDS = ["전기톱", "무선전기톱", "전동가위", "전동전지가위", "충전톱"]
BRAND = "craftvolt(크래프트볼트)"
# 관련성 토큰: 연관어 확장 노이즈(NC·무선이어폰 등) 제거용. craftvolt 전동공구 제품군 한정.
RELEVANCE = ["톱", "가위", "전동", "전지", "충전", "예초", "절단", "공구", "정원", "그라인더", "드릴"]


def load_env():
    env = {}
    p = os.path.join(ROOT, ".env")
    for line in open(p, encoding="utf-8"):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


# ── ② 기능 A: SearchAd 검색량·연관어 ──────────────────────────────
def fetch_keywords(seeds):
    params = {"hintKeywords": ",".join(seeds), "showDetail": "1"}
    r = subprocess.run(["python3", SEARCHAD, "GET", "/keywordstool", "--params", json.dumps(params)],
                       capture_output=True, text=True)
    body = r.stdout.split("\n", 1)
    if len(body) < 2:
        return []
    try:
        data = json.loads(body[1]).get("keywordList", [])
    except Exception:
        return []
    def num(v):
        try: return int(str(v).replace("<", "").strip())
        except: return 0
    rows = []
    for k in data:
        kw = k["relKeyword"]
        if not any(tok in kw for tok in RELEVANCE):   # 관련성 필터
            continue
        pc, mo = num(k.get("monthlyPcQcCnt")), num(k.get("monthlyMobileQcCnt"))
        rows.append({"kw": kw, "pc": pc, "mo": mo, "total": pc + mo,
                     "comp": k.get("compIdx", "-")})
    rows.sort(key=lambda x: x["total"], reverse=True)
    return rows


# ── ② 기능 B: DataLab 검색 트렌드(계절성) ─────────────────────────
def fetch_trend(env, seeds, start="2025-06-01", end="2026-05-31"):
    groups = [{"groupName": s, "keywords": [s]} for s in seeds[:5]]
    body = {"startDate": start, "endDate": end, "timeUnit": "month", "keywordGroups": groups}
    req = urllib.request.Request("https://openapi.naver.com/v1/datalab/search",
                                 data=json.dumps(body).encode(), method="POST")
    req.add_header("X-Naver-Client-Id", env.get("NAVER_CLIENT_ID", ""))
    req.add_header("X-Naver-Client-Secret", env.get("NAVER_CLIENT_SECRET", ""))
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())["results"]
    except urllib.error.HTTPError as e:
        print("[DataLab 오류]", e.code, e.read().decode()[:120])
        return []


# ── ③ 활용: SearchAd ↔ DataLab 교차검증 ───────────────────────────
def cross_validate(keywords, trends):
    """SearchAd 검색량 상위 키워드를 DataLab 트렌드로 검증. 검색량(수요 크기) × 모멘텀(추세)."""
    tmap = {t["title"]: t["data"] for t in trends}
    out = []
    for k in keywords:
        data = tmap.get(k["kw"])
        if not data or len(data) < 6:
            out.append({**k, "momentum": "데이터없음", "verdict": "—", "peak": None, "delta": 0})
            continue
        recent = sum(p["ratio"] for p in data[-3:]) / 3        # 최근 3개월
        prev = sum(p["ratio"] for p in data[-6:-3]) / 3        # 직전 3개월
        delta = (recent - prev) / max(1, prev) * 100
        peak = max(data, key=lambda p: p["ratio"])["period"][:7]
        if delta > 12:    mom, verdict = "📈 상승", "✅ 검증된 수요"
        elif delta < -12: mom, verdict = "📉 하락", "⚠️ 정점 지난 수요"
        else:             mom, verdict = "➡️ 유지", "🟢 안정 수요"
        out.append({**k, "momentum": mom, "verdict": verdict, "peak": peak, "delta": delta})
    return out


def build_insights(validated, trends):
    insights = []
    if not validated:
        return ["수집된 키워드가 없습니다."], None
    top = validated[0]
    insights.append(f"최대 검색 키워드 **{top['kw']}** 월 {top['total']:,}회 — 데이터랩 검증: {top['verdict']} ({top['momentum']} {top['delta']:+.0f}%).")
    # 검증 통과(상승) 키워드 = 최우선
    rising = [v for v in validated if "검증된" in v["verdict"]]
    if rising:
        insights.append(f"✅ **검증된 수요(검색량↑ + 트렌드↑)**: {', '.join(v['kw'] for v in rising[:3])} → 최우선 공략.")
    declining = [v for v in validated if "정점" in v["verdict"]]
    if declining:
        insights.append(f"⚠️ 주의(검색량은 크나 하락세): {', '.join(v['kw'] for v in declining[:3])} → 입찰 보수적.")
    mo_ratio = sum(k["mo"] for k in validated) / max(1, sum(k["pc"] for k in validated))
    insights.append(f"모바일이 PC의 **{mo_ratio:.1f}배** → 모바일 소재·랜딩 우선.")
    # 성수기: 검증 키워드들의 최빈 peak
    peaks = [v["peak"] for v in validated if v["peak"]]
    peak = max(set(peaks), key=peaks.count) if peaks else None
    if peak:
        insights.append(f"검색 성수기 **{peak}대** 집중 → 현재 {BRAND} 광고 OFF면 그 트래픽을 통째로 놓침.")
    return insights, peak


# ── ④ 리포트: 단일 HTML ───────────────────────────────────────────
def render_html(date, keywords, trends, insights, peak, validated=None):
    kw_rows = "".join(
        f"<tr><td>{i+1}</td><td><b>{k['kw']}</b></td><td>{k['pc']:,}</td><td>{k['mo']:,}</td>"
        f"<td><b>{k['total']:,}</b></td><td>{comp_badge(k['comp'])}</td></tr>"
        for i, k in enumerate(keywords[:15]))
    trend_blocks = ""
    for g in trends:
        bars = "".join(
            f"<div class='barrow'><span class='m'>{p['period'][:7]}</span>"
            f"<div class='bar' style='width:{p['ratio']}%'></div><span class='v'>{p['ratio']:.0f}</span></div>"
            for p in g["data"])
        trend_blocks += f"<div class='trend'><h3>{g['title']}</h3>{bars}</div>"
    ins = "".join(f"<li>{x}</li>" for x in insights)
    total_vol = sum(k["total"] for k in keywords)
    val_rows = "".join(
        f"<tr><td><b>{v['kw']}</b></td><td>{v['total']:,}</td><td>{comp_badge(v['comp'])}</td>"
        f"<td>{v['momentum']} {v['delta']:+.0f}%</td><td>{v['peak'] or '-'}</td><td>{v['verdict']}</td></tr>"
        for v in (validated or []))
    val_block = (f"<h2>③ SearchAd ↔ DataLab 교차검증</h2>"
                 f"<p class=sub2>검색광고 검색량(수요 크기) × 데이터랩 트렌드(추세)로 '진짜 공략할 키워드'를 검증.</p>"
                 f"<table><tr><th>키워드</th><th>월검색량</th><th>경쟁</th><th>트렌드(최근3M vs 직전3M)</th><th>성수기</th><th>검증</th></tr>{val_rows}</table>"
                 ) if validated else ""
    return f"""<!DOCTYPE html><html lang=ko><head><meta charset=utf-8>
<title>네이버 시장 리포트 · {BRAND} · {date}</title><style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,'Pretendard',sans-serif;background:#0f1115;color:#e8eaed;padding:32px;line-height:1.6}}
.wrap{{max-width:920px;margin:0 auto}}
h1{{font-size:24px;margin-bottom:4px}} .sub{{color:#9aa0a6;font-size:13px;margin-bottom:24px}}
.sub2{{color:#9aa0a6;font-size:12px;margin:-4px 0 10px}}
.cards{{display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap}}
.card{{flex:1;min-width:160px;background:#1a1d23;border:1px solid #2a2e36;border-radius:12px;padding:18px}}
.card .k{{color:#9aa0a6;font-size:12px}} .card .v{{font-size:22px;font-weight:700;margin-top:4px}}
h2{{font-size:16px;margin:24px 0 12px;border-left:3px solid #5865f2;padding-left:10px}}
table{{width:100%;border-collapse:collapse;font-size:13px}}
th,td{{padding:8px 10px;text-align:right;border-bottom:1px solid #23262d}}
th:nth-child(2),td:nth-child(2){{text-align:left}} th{{color:#9aa0a6;font-weight:500}}
.badge{{padding:2px 8px;border-radius:6px;font-size:11px}}
.b-high{{background:#3a1d22;color:#f28b82}} .b-mid{{background:#3a331d;color:#fdd663}} .b-low{{background:#1d3a26;color:#81c995}}
.trend{{margin-bottom:18px}} .trend h3{{font-size:13px;margin-bottom:6px;color:#c8cdd3}}
.barrow{{display:flex;align-items:center;gap:8px;margin:2px 0;font-size:11px}}
.barrow .m{{width:56px;color:#9aa0a6}} .barrow .v{{width:28px;color:#9aa0a6}}
.bar{{height:12px;background:linear-gradient(90deg,#5865f2,#7c4dff);border-radius:3px;min-width:2px}}
ul.ins{{background:#1a1d23;border:1px solid #2a2e36;border-radius:12px;padding:16px 16px 16px 34px}}
ul.ins li{{margin:6px 0}} .ft{{color:#6b7280;font-size:11px;margin-top:28px;text-align:center}}
b{{color:#fff}}</style></head><body><div class=wrap>
<h1>📊 네이버 시장 리포트 — {BRAND}</h1>
<div class=sub>{date} · SearchAd 검색량 + DataLab 검색트렌드 · 데이터 출처: 네이버 검색광고/데이터랩 API</div>
<div class=cards>
  <div class=card><div class=k>분석 키워드</div><div class=v>{len(keywords)}개</div></div>
  <div class=card><div class=k>월 총 검색량</div><div class=v>{total_vol:,}</div></div>
  <div class=card><div class=k>검색 성수기</div><div class=v>{peak or '-'}</div></div>
  <div class=card><div class=k>현재 광고</div><div class=v style='color:#f28b82'>OFF</div></div>
</div>
<h2>① 검색광고 키워드 검색량 TOP 15 (월간)</h2>
<table><tr><th>#</th><th>키워드</th><th>PC</th><th>모바일</th><th>합계</th><th>경쟁</th></tr>{kw_rows}</table>
<h2>② 데이터랩 검색 트렌드 (최근 12개월 · 상대지수)</h2>{trend_blocks}
{val_block}
<h2>④ 검증된 인사이트 & 액션</h2><ul class=ins>{ins}</ul>
<div class=ft>marketing-os · naver_market_report.py · 자동 생성</div>
</div></body></html>"""


def comp_badge(c):
    return {"높음": "<span class='badge b-high'>높음</span>",
            "중간": "<span class='badge b-mid'>중간</span>",
            "낮음": "<span class='badge b-low'>낮음</span>"}.get(c, c)


# ── ⑤ 발송: Discord webhook ───────────────────────────────────────
def send_discord(env, date, keywords, insights, peak, html_path, override_url=None):
    url = override_url or env.get("DISCORD_WEBHOOK_URL", "")
    if not url:
        print("[발송 생략] DISCORD_WEBHOOK_URL 없음")
        return False
    top3 = " · ".join(f"{k['kw']}({k['total']:,})" for k in keywords[:3])
    embed = {
        "title": f"📊 네이버 시장 리포트 · {BRAND}",
        "description": f"**{date}** 자동 분석 완료",
        "color": 5793266,
        "fields": [
            {"name": "🔑 검색량 TOP 3", "value": top3 or "-", "inline": False},
            {"name": "📈 검색 성수기", "value": peak or "-", "inline": True},
            {"name": "🚦 현재 광고", "value": "OFF (기회손실)", "inline": True},
            {"name": "💡 핵심 인사이트", "value": "\n".join("• " + i.replace("**", "") for i in insights[:3]), "inline": False},
            {"name": "📄 리포트", "value": f"`{html_path}`", "inline": False},
        ],
        "footer": {"text": "marketing-os · naver_market_report"},
    }
    payload = {"username": "네이버 시장분석", "embeds": [embed]}
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json",
                                          "User-Agent": "marketing-os-naver-report/1.0 (+https://craftvolt.kr)"},
                                 method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print(f"[발송 완료] Discord HTTP {r.status}")
            return True
    except urllib.error.HTTPError as e:
        print("[발송 실패]", e.code, e.read().decode()[:120])
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", default=",".join(DEFAULT_SEEDS))
    ap.add_argument("--date", default="2026-06-19")
    ap.add_argument("--send", action="store_true", help="Discord 실제 발송 (없으면 미리보기만)")
    ap.add_argument("--webhook", default=None, help="webhook URL override (.env 대신 이 URL로 발송)")
    a = ap.parse_args()
    seeds = [s.strip() for s in a.seeds.split(",") if s.strip()]
    env = load_env()

    print(f"① 설치 확인 · ② 검색광고 수집 (시드 {len(seeds)}개)…")
    keywords = fetch_keywords(seeds)
    top5 = [k["kw"] for k in keywords[:5]] or seeds
    print(f"   → SearchAd 키워드 {len(keywords)}개 (TOP5: {', '.join(top5)})")

    print("③ 데이터랩 교차검증 (TOP5 키워드의 트렌드 조회)…")
    trends = fetch_trend(env, top5)
    validated = cross_validate(keywords[:5], trends)
    for v in validated:
        print(f"   · {v['kw']:10s} 검색량 {v['total']:>7,} | {v['momentum']} {v['delta']:+5.0f}% → {v['verdict']}")
    insights, peak = build_insights(validated, trends)

    print("④ HTML 리포트 생성…")
    outdir = os.path.join(ROOT, "outputs", a.date, "naver-market")
    os.makedirs(outdir, exist_ok=True)
    html_path = os.path.join(outdir, f"craftvolt-naver-report-{a.date}.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(render_html(a.date, keywords, trends, insights, peak, validated))
    print(f"   → {html_path}")

    print("⑤ Discord 발송…")
    if a.send:
        send_discord(env, a.date, keywords, insights, peak, html_path, override_url=a.webhook)
    else:
        print("   [미리보기 모드] --send 없음 → 실제 발송 안 함.")
        print("   발송될 요약:")
        for i in insights[:3]:
            print("     •", i.replace("**", ""))
    print("\n완료.")


if __name__ == "__main__":
    main()
