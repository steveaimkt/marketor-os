#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네이버 검색광고 '대용량 다운로드 보고서' CSV → 브랜드/일반 ROAS 분리 리포트 (6-3 핵심).

본인이 실제 집행한 광고 데이터(광고주센터 → 보고서 → 대용량 다운로드 보고서)를 받아
브랜드 키워드 vs 일반 키워드로 분리 집계해 '합산 ROAS 착시'를 해부한다.

사용:
  python3 scripts/naver_ad_report.py <보고서.csv>
  python3 scripts/naver_ad_report.py <보고서.csv> --brand 크래프트볼트,craftvolt --date 2026-06-19
  python3 scripts/naver_ad_report.py <보고서.csv> --send --webhook <url>

특징: 인코딩(utf-8-sig/cp949) · 구분자(tab/comma) · 컬럼명 자동 감지.
"""
import os, sys, csv, json, argparse, urllib.request, urllib.error, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND_DEFAULT = ["크래프트볼트", "craftvolt", "크래프트 볼트"]

# 컬럼 자동 매핑: 표준화키 → 가능한 헤더 토큰들
COLMAP = {
    "keyword":  ["키워드", "keyword"],
    "campaign": ["캠페인", "campaign"],
    "adgroup":  ["광고그룹", "그룹", "adgroup", "ad group"],
    "imp":      ["노출수", "노출", "impression", "impcnt"],
    "clk":      ["클릭수", "클릭", "click", "clkcnt"],
    "cost":     ["총비용", "비용", "광고비", "cost", "salesamt"],
    "conv":     ["전환수", "전환", "conversion", "ccnt"],
    "rev":      ["전환매출액", "전환매출", "매출", "revenue", "convamt", "전환금액"],
}


def read_table(path):
    raw = open(path, "rb").read()
    text = None
    for enc in ("utf-8-sig", "cp949", "euc-kr", "utf-8"):
        try:
            text = raw.decode(enc); break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = raw.decode("utf-8", "replace")
    # 구분자 감지
    sample = text[:2000]
    delim = "\t" if sample.count("\t") >= sample.count(",") else ","
    rows = list(csv.reader(io.StringIO(text), delimiter=delim))
    rows = [r for r in rows if any(c.strip() for c in r)]
    return rows


def find_header(rows):
    """헤더 행 찾기: COLMAP 토큰이 가장 많이 매칭되는 행."""
    best, best_i = -1, 0
    for i, r in enumerate(rows[:15]):
        joined = " ".join(r).lower()
        score = sum(any(tok in joined for tok in toks) for toks in COLMAP.values())
        if score > best:
            best, best_i = score, i
    return best_i, best


def map_columns(header):
    idx = {}
    for std, toks in COLMAP.items():
        for j, h in enumerate(header):
            hl = h.strip().lower()
            if any(tok in hl for tok in toks):
                idx[std] = j; break
    return idx


def to_num(s):
    s = str(s).replace(",", "").replace("₩", "").replace("원", "").replace("%", "").strip()
    try: return float(s)
    except: return 0.0


def aggregate(rows, idx, brand_tokens):
    def grp():
        return {"imp": 0, "clk": 0, "cost": 0.0, "conv": 0, "rev": 0.0, "kws": []}
    brand, general = grp(), grp()
    for r in rows:
        if "keyword" not in idx or idx.get("cost") is None:
            continue
        if max(idx.values()) >= len(r):
            continue
        kw = r[idx["keyword"]].strip()
        if not kw:
            continue
        rec = {"kw": kw,
               "imp": int(to_num(r[idx.get("imp", -1)]) if "imp" in idx else 0),
               "clk": int(to_num(r[idx.get("clk", -1)]) if "clk" in idx else 0),
               "cost": to_num(r[idx["cost"]]),
               "conv": int(to_num(r[idx.get("conv", -1)]) if "conv" in idx else 0),
               "rev": to_num(r[idx.get("rev", -1)]) if "rev" in idx else 0.0}
        tgt = brand if any(b.lower() in kw.lower() for b in brand_tokens) else general
        for f in ("imp", "clk", "cost", "conv", "rev"):
            tgt[f] += rec[f]
        tgt["kws"].append(rec)
    return brand, general


def roas(g):
    return (g["rev"] / g["cost"] * 100) if g["cost"] else 0.0


def render_html(date, brand, general, brand_tokens):
    blended = {f: brand[f] + general[f] for f in ("imp", "clk", "cost", "conv", "rev")}
    def card(name, g, color):
        return (f"<div class=card><div class=k>{name}</div>"
                f"<div class=v style='color:{color}'>ROAS {roas(g):.0f}%</div>"
                f"<div class=s>광고비 {int(g['cost']):,} → 매출 {int(g['rev']):,}</div></div>")
    def kw_table(g, title):
        rows = "".join(
            f"<tr><td>{k['kw']}</td><td>{k['imp']:,}</td><td>{k['clk']:,}</td>"
            f"<td>{int(k['cost']):,}</td><td>{k['conv']}</td><td>{int(k['rev']):,}</td>"
            f"<td>{(k['rev']/k['cost']*100 if k['cost'] else 0):.0f}%</td></tr>"
            for k in sorted(g["kws"], key=lambda x: x["cost"], reverse=True)[:20])
        return (f"<h2>{title} 키워드</h2><table><tr><th>키워드</th><th>노출</th><th>클릭</th>"
                f"<th>광고비</th><th>전환</th><th>매출</th><th>ROAS</th></tr>{rows}</table>")
    # 적자 키워드 (일반 중 ROAS<100%)
    losers = sorted([k for k in general["kws"] if k["cost"] > 0 and (k["rev"]/k["cost"]) < 1.0],
                    key=lambda x: x["cost"], reverse=True)[:5]
    loser_html = "".join(f"<li><b>{k['kw']}</b> 광고비 {int(k['cost']):,} · ROAS {(k['rev']/k['cost']*100 if k['cost'] else 0):.0f}% → 입찰↓/소재/LP 점검</li>" for k in losers)
    insight = (f"합산 ROAS {roas(blended):.0f}%는 흑자처럼 보이나, 분리하면 "
               f"브랜드 {roas(brand):.0f}% vs 일반 {roas(general):.0f}%. "
               + ("일반 키워드 적자 = 브랜드가 평균을 끌어올린 착시." if roas(general) < 100 <= roas(blended) else "분리해야 실제 광고 실력이 보임."))
    return f"""<!DOCTYPE html><html lang=ko><head><meta charset=utf-8>
<title>네이버 검색광고 ROAS 분리 리포트 · {date}</title><style>
*{{box-sizing:border-box;margin:0;padding:0}}body{{font-family:-apple-system,'Pretendard',sans-serif;background:#0f1115;color:#e8eaed;padding:32px;line-height:1.6}}
.wrap{{max-width:920px;margin:0 auto}}h1{{font-size:23px}}.sub{{color:#9aa0a6;font-size:13px;margin-bottom:22px}}
.cards{{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}}.card{{flex:1;min-width:180px;background:#1a1d23;border:1px solid #2a2e36;border-radius:12px;padding:16px}}
.card .k{{color:#9aa0a6;font-size:12px}}.card .v{{font-size:21px;font-weight:700;margin:4px 0}}.card .s{{color:#9aa0a6;font-size:11px}}
h2{{font-size:15px;margin:22px 0 10px;border-left:3px solid #5865f2;padding-left:10px}}
table{{width:100%;border-collapse:collapse;font-size:12px}}th,td{{padding:7px 9px;text-align:right;border-bottom:1px solid #23262d}}
th:first-child,td:first-child{{text-align:left}}th{{color:#9aa0a6;font-weight:500}}
.box{{background:#1a1d23;border:1px solid #2a2e36;border-radius:12px;padding:14px 14px 14px 30px;margin-top:8px}}
b{{color:#fff}}.ft{{color:#6b7280;font-size:11px;margin-top:26px;text-align:center}}</style></head><body><div class=wrap>
<h1>📊 네이버 검색광고 — 브랜드 vs 일반 ROAS 분리</h1>
<div class=sub>{date} · 실집행 데이터(대용량 다운로드 보고서) · 브랜드 판별: {', '.join(brand_tokens)}</div>
<div class=cards>{card('합산(전체)', blended, '#fdd663')}{card('브랜드', brand, '#81c995')}{card('일반', general, '#f28b82')}</div>
<div class=box><b>💡 해부:</b> {insight}</div>
{('<h2>⚠️ 일반 키워드 적자 TOP 5</h2><div class=box><ul>'+loser_html+'</ul></div>') if loser_html else ''}
{kw_table(brand, '🟢 브랜드')}
{kw_table(general, '🔴 일반')}
<div class=ft>marketing-os · naver_ad_report.py · 실집행 데이터 기반</div></div></body></html>"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", help="대용량 다운로드 보고서 CSV 경로")
    ap.add_argument("--brand", default=",".join(BRAND_DEFAULT), help="브랜드 키워드 토큰(쉼표)")
    ap.add_argument("--date", default="2026-06-19")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--webhook", default=None)
    a = ap.parse_args()

    brand_tokens = [b.strip() for b in a.brand.split(",") if b.strip()]
    print(f"① CSV 읽기: {a.csv}")
    rows = read_table(a.csv)
    hi, score = find_header(rows)
    header = rows[hi]
    idx = map_columns(header)
    print(f"② 헤더 감지(행 {hi}, 매칭 {score}/7): {[header[j] for j in idx.values()]}")
    print(f"   매핑: {idx}")
    if "keyword" not in idx or "cost" not in idx:
        print("[중단] 키워드/비용 컬럼을 못 찾음. 헤더 행을 확인하세요:")
        print("   ", header)
        sys.exit(1)

    print("③ 브랜드/일반 분리 집계…")
    brand, general = aggregate(rows[hi+1:], idx, brand_tokens)
    print(f"   브랜드 {len(brand['kws'])}개 ROAS {roas(brand):.0f}% · 일반 {len(general['kws'])}개 ROAS {roas(general):.0f}%")

    print("④ HTML 리포트…")
    outdir = os.path.join(ROOT, "outputs", a.date, "naver-market")
    os.makedirs(outdir, exist_ok=True)
    out = os.path.join(outdir, f"craftvolt-ad-roas-{a.date}.html")
    open(out, "w", encoding="utf-8").write(render_html(a.date, brand, general, brand_tokens))
    print(f"   → {out}")

    if a.send:
        print("⑤ Discord 발송…")
        send(a.webhook, a.date, brand, general, out)
    print("완료.")


def send(url, date, brand, general, path):
    if not url:
        print("   [생략] --webhook 없음"); return
    blended_cost = brand["cost"] + general["cost"]; blended_rev = brand["rev"] + general["rev"]
    embed = {"title": "📊 네이버 검색광고 ROAS 분리 리포트", "color": 5793266,
             "description": f"**{date}** 실집행 데이터",
             "fields": [
                 {"name": "합산 ROAS", "value": f"{(blended_rev/blended_cost*100 if blended_cost else 0):.0f}%", "inline": True},
                 {"name": "브랜드", "value": f"{roas(brand):.0f}%", "inline": True},
                 {"name": "일반", "value": f"{roas(general):.0f}%", "inline": True},
                 {"name": "📄 리포트", "value": f"`{path}`", "inline": False}]}
    req = urllib.request.Request(url, data=json.dumps({"embeds": [embed]}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "marketing-os-naver-report/1.0"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print(f"   [발송] HTTP {r.status}")
    except urllib.error.HTTPError as e:
        print("   [실패]", e.code, e.read().decode()[:100])


if __name__ == "__main__":
    main()
