#!/usr/bin/env python3
"""VibeCoding/index.html 驗收檢查。用法：python3 check.py [axe.min.js 路徑]

每條檢查輸出 PASS/FAIL；結尾輸出 FAIL 總數。http 與 file:// 各跑一次。
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3] / "VibeCoding"
INDEX = ROOT / "index.html"
BACKUP = Path(__file__).resolve().parent / "backup" / "index.html"
AXE = Path(sys.argv[1]) if len(sys.argv) > 1 else None
PORT = 8771
CARD_RE = re.compile(r'href="(Day\d+_[^"/]+/index\.html)"')
results = []


def rec(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS" if ok else "FAIL"), name, detail)


def card_hrefs(html):
    seen, out = set(), []
    for h in CARD_RE.findall(html):
        if h not in seen:
            seen.add(h)
            out.append(h)
    return out


def run(mode, p):
    base = f"http://localhost:{PORT}/index.html" if mode == "http" else f"file://{INDEX}"
    b = p.chromium.launch()
    tag = f"[{mode}] "

    # 1 外部請求 / console error
    ctx = b.new_context(viewport={"width": 1280, "height": 800})
    pg = ctx.new_page()
    ext, errs = [], []
    pg.on("request", lambda r: ext.append(r.url) if not re.match(r"^(file:|data:|blob:|about:|http://localhost)", r.url) else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(base)
    pg.wait_for_timeout(1500)
    rec(tag + "外部請求為 0", not ext, str(ext[:3]))
    rec(tag + "console/page error 為 0", not errs, str(errs[:3]))

    # 2 href 與備份一致 + 目標存在
    new_html = pg.content()
    new_h = card_hrefs(INDEX.read_text(encoding="utf8"))
    old_h = card_hrefs(BACKUP.read_text(encoding="utf8"))
    rec(tag + "28 條卡片 href 與備份順序內容相同", new_h == old_h and len(new_h) == 28, f"new={len(new_h)} old={len(old_h)}")
    rec(tag + "href 目標檔案皆存在", all((ROOT / h).is_file() for h in new_h))

    # 3 水平捲軸
    bad = []
    for w in (320, 768, 1280, 1920):
        pg.set_viewport_size({"width": w, "height": 900})
        pg.wait_for_timeout(200)
        sw = pg.evaluate("document.documentElement.scrollWidth")
        if sw > w:
            bad.append((w, sw))
    rec(tag + "320/768/1280/1920 無水平捲軸", not bad, str(bad))
    ctx.close()

    # 4 對比（axe）亮/暗
    for scheme in ("light", "dark"):
        c = b.new_context(viewport={"width": 1280, "height": 800}, color_scheme=scheme)
        q = c.new_page()
        q.goto(base)
        q.wait_for_timeout(1500)
        bg = q.evaluate("getComputedStyle(document.body).backgroundColor")
        m = re.findall(r"\d+", bg)[:3]
        lum = sum(int(x) for x in m) / 3
        rec(tag + f"{scheme} 主題背景亮度正確", (lum > 128) == (scheme == "light"), bg)
        if AXE:
            q.add_script_tag(path=str(AXE))
            r = q.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','best-practice']})")
            v = [(x["id"], len(x["nodes"])) for x in r["violations"]]
            rec(tag + f"{scheme} axe 違規為 0", not v, str(v))
        c.close()

    # 5 減少動態
    c = b.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
    q = c.new_page()
    q.goto(base)
    q.wait_for_timeout(1500)
    n = q.evaluate("document.getAnimations().filter(a=>a.playState==='running').length")
    rec(tag + "reduced-motion 下無執行中動畫", n == 0, f"running={n}")
    c.close()

    # 6 鍵盤：skip link 先、全部 28 卡可達、焦點可見
    c = b.new_context(viewport={"width": 1280, "height": 800})
    q = c.new_page()
    q.goto(base)
    q.wait_for_timeout(1000)
    reached, no_ring, first = set(), [], None
    for i in range(160):
        q.keyboard.press("Tab")
        info = q.evaluate("""()=>{const e=document.activeElement;if(!e||e===document.body)return null;
          const s=getComputedStyle(e);return {href:e.getAttribute('href')||'',txt:(e.innerText||'').slice(0,12),
          ring:(s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0)||s.boxShadow!=='none'}}""")
        if not info:
            continue
        if first is None:
            first = info
        if not info["ring"]:
            no_ring.append(info["href"] or info["txt"])
        reached.add(info["href"])
    rec(tag + "第一個 Tab 焦點是 skip link", bool(first) and first["href"].startswith("#"), str(first))
    rec(tag + "鍵盤可達全部 28 張卡片", all(h in reached for h in new_h), f"missing={[h for h in new_h if h not in reached][:3]}")
    rec(tag + "所有焦點元素有可見焦點樣式", not no_ring, str(no_ring[:3]))
    c.close()

    # 7 停用 JS
    c = b.new_context(java_script_enabled=False, viewport={"width": 1280, "height": 800})
    q = c.new_page()
    q.goto(base)
    links = q.locator('a[href^="Day"][href$="index.html"]')
    vis = sum(1 for i in range(links.count()) if links.nth(i).is_visible())
    rec(tag + "停用 JS 仍可見 28 張卡片", vis >= 28, f"visible={vis}")
    inert = [i for i in ("#theme", "#controls") if q.locator(i).count() and q.locator(i).is_visible()]
    rec(tag + "停用 JS 時沒有顯示無作用的控制項（主題、篩選列）", not inert, str(inert))
    c.close()

    # 8 互動功能：篩選、搜尋、空結果、主題切換與記憶
    c = b.new_context(viewport={"width": 1280, "height": 800}, color_scheme="light")
    q = c.new_page()
    q.goto(base)
    q.wait_for_timeout(800)
    q.click('.chip[data-f="csv"]')
    vis = q.evaluate("[...document.querySelectorAll('.rows li')].filter(l=>!l.hidden).length")
    on = q.evaluate("[...document.querySelectorAll('.chip')].filter(x=>x.getAttribute('aria-pressed')==='true').map(x=>x.dataset.f)")
    rec(tag + "點「CSV」只剩 5 個作品且僅該 chip 為 pressed", vis == 5 and on == ["csv"], f"vis={vis} pressed={on}")
    q.click('.chip[data-f="all"]')
    q.fill("#q", "pdf")
    n = q.evaluate("[...document.querySelectorAll('.rows li')].filter(l=>!l.hidden).length")
    st = q.inner_text("#status")
    rec(tag + "搜尋 pdf 有結果且 status 數字與實際相符", n > 0 and f"顯示 {n} 個" in st, f"n={n} status={st}")
    q.fill("#q", "zzzzqqq")
    rec(tag + "搜尋無結果時顯示空狀態", q.is_visible("#empty") and "顯示 0 個" in q.inner_text("#status"))
    q.fill("#q", "")
    q.click("#theme")
    t1 = q.evaluate("document.documentElement.getAttribute('data-theme')")
    q.click("#theme")
    t2 = q.evaluate("document.documentElement.getAttribute('data-theme')")
    bg = q.evaluate("getComputedStyle(document.body).backgroundColor")
    rec(tag + "主題按鈕依序切換 light→dark 並實際改變背景", t1 == "light" and t2 == "dark" and bg != "rgb(237, 239, 241)", f"{t1}->{t2} bg={bg}")
    q.reload()
    q.wait_for_timeout(500)
    lab = q.evaluate("(()=>{const b=document.getElementById('theme');return [b.innerText.trim(), b.getAttribute('aria-label')]})()")
    rec(tag + "主題按鈕 aria-label 包含可見文字（WCAG 2.5.3）", lab[0] in lab[1], str(lab))
    rec(tag + "重新整理後記住主題", q.evaluate("document.documentElement.getAttribute('data-theme')") == "dark")
    c.close()
    b.close()


def static_checks():
    h = INDEX.read_text(encoding="utf8")
    size = INDEX.stat().st_size
    rec("檔案大小 ≤ 80 KB", size <= 80 * 1024, f"{size} bytes")
    rec("有 meta description", bool(re.search(r'<meta\s+name="description"', h)))
    rec("有 favicon link", bool(re.search(r'<link[^>]+rel="icon"', h)))
    rec("有 Open Graph", 'property="og:title"' in h)
    rec("有 skip link", bool(re.search(r'href="#[^"]+"[^>]*>[^<]*(跳|skip)', h, re.I)))
    rec("有 :focus-visible 樣式", ":focus-visible" in h)
    rec("有 prefers-color-scheme: dark", "prefers-color-scheme: dark" in h or "prefers-color-scheme:dark" in h)
    rec("有 prefers-reduced-motion", "prefers-reduced-motion" in h)
    rec("Day29 文案不含「每 6 小時」", "每 6 小時" not in h)
    rec("導言不含「文字處理小工具」", "文字處理小工具" not in h)


if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--directory", str(ROOT)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        static_checks()
        with sync_playwright() as p:
            for mode in ("http", "file"):
                run(mode, p)
    finally:
        srv.terminate()
    fails = [r for r in results if not r[1]]
    print(f"\nTOTAL {len(results)} 項，FAIL {len(fails)} 項")
    sys.exit(1 if fails else 0)
