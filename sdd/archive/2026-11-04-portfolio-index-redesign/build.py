#!/usr/bin/env python3
"""從備份擷取 28 張卡片資料，套入新版模板，輸出 VibeCoding/index.html。

用法：python3 build.py
卡片的 href／順序／名稱／說明來自 backup/index.html；僅 Day29 說明做事實校正。
"""
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[2] / "VibeCoding" / "index.html"
BACKUP = (HERE / "backup" / "index.html").read_text(encoding="utf8")

CARD = re.compile(
    r'<a class="card tool-card" href="([^"]+)">\s*<span class="day">(.*?)</span>\s*<h2>(.*?)</h2>\s*<p>(.*?)</p>',
    re.S,
)
cards = CARD.findall(BACKUP)
assert len(cards) == 28, len(cards)

# 事實校正：Day29 排程為每小時（.github/workflows/day29-radar.yml 的 cron "23 * * * *"）
FIXES = {"每 6 小時巡一次": "每小時巡一次"}

GROUPS = [
    ("text", "純文字", "Day01–07", "從純字串統計，到可逆的個資去識別化", range(1, 8)),
    ("csv", "CSV", "Day08–13", "解析、比對、拆檔，到圖表與一頁報告", range(8, 14)),
    ("img", "圖片", "Day14–18", "壓縮、隱私清除、透視校正與列印版面", range(14, 19)),
    ("pdf", "PDF 與發布", "Day19–26", "擷取、重排、加密、遮蔽、清理，與 Markdown 發布", range(19, 27)),
    ("all", "整合", "Day27", "把前 26 天的模組組成一個工具", range(27, 28)),
    ("act", "自動化", "Day28–29", "GitHub Actions 排程，Repo 即資料庫", range(28, 30)),
    ("ooxml", "Office", "Day30", "DOCX、XLSX、PPTX 的隱私 metadata 清除", range(30, 31)),
]
GID_FIX = {"all": "int"}  # 避免與「全部」篩選值衝突


def group_of(href):
    n = int(re.match(r"Day(\d+)_", href).group(1))
    for g in GROUPS:
        if n in g[4]:
            return g
    raise ValueError(href)


sections = []
for gid, name, rng, blurb, days in GROUPS:
    gkey = GID_FIX.get(gid, gid)
    rows = []
    for href, day, title, desc in cards:
        if group_of(href)[0] != gid:
            continue
        for a, b in FIXES.items():
            desc = desc.replace(a, b)
        rows.append(
            f'        <li data-g="{gkey}"><a class="row" href="{href}">'
            f'<span class="day">{day}</span>'
            f'<span class="name">{title}</span>'
            f'<span class="desc">{desc}</span></a></li>'
        )
    sections.append(
        f'    <section class="grp" data-g="{gkey}" aria-labelledby="h-{gkey}">\n'
        f'      <div class="grp-head"><h2 id="h-{gkey}">{name}</h2><p>{rng}。{blurb}</p></div>\n'
        f'      <ul class="rows">\n' + "\n".join(rows) + "\n      </ul>\n    </section>"
    )

chips = ['<button type="button" class="chip" data-f="all" aria-pressed="true">全部</button>']
for gid, name, *_ in GROUPS:
    chips.append(f'<button type="button" class="chip" data-f="{GID_FIX.get(gid, gid)}" aria-pressed="false">{name}</button>')

TEMPLATE = (HERE / "template.html").read_text(encoding="utf8")
html = TEMPLATE.replace("@@SECTIONS@@", "\n".join(sections)).replace("@@CHIPS@@", "\n          ".join(chips))
OUT.write_text(html, encoding="utf8")
print(f"OK: {OUT} ({OUT.stat().st_size} bytes), {len(cards)} 張卡片")
