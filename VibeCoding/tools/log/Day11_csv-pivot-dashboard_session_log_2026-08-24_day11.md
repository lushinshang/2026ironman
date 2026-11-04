# Session 對話與思考日誌（手動整理版，2026-08-24）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗。**本檔為非腳本自動產出、環境不相容**，改為依同一份既有格式（見 Day08 前例）手動彙整，素材來源為 `sdd/csv-pivot-dashboard/proposal.md`、`sdd/csv-pivot-dashboard/tasks.md`、`sdd/LEVEL1B_RULINGS.md`、`VibeCoding/shared/CSV_CONTRACT.md` 第 4.0b／4.0c 節、git commit `7f6eb05`、`VibeCoding/Day11_csv-pivot-dashboard/logs/perf.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 說明：本題可考證的素材範圍

Day11 只涵蓋 `sdd/csv-pivot-dashboard/tasks.md` 的 Phase A（任務 1–5，對應本篇「上篇」）。任務 6–11（Phase B，圖表模組 `shared/ui-chart-svg.js`、匯出 Dashboard HTML、`buildCleanHtmlCopy()`、列印驗收）屬於明天下篇（Day12），本檔**不涉及**，撰寫本檔時 Day12 的實作正在另一項作業中同步進行，本檔作者未讀取、未修改該作業的產出。

Phase A 的實作與複驗集中在 commit `7f6eb05`（2026-08-24），commit message 本身已經是相對完整的複驗紀錄，本檔依此逐段展開，並補上前置的契約裁示脈絡。

## 前置：為什麼 Day11 開工前要先清一輪跨題矛盾

本題直接依賴的共用函式（`inferColumnTypes()`／`toNumber()`／`dateParts()`）由前置工程 `sdd/csv-infra/` 建立，寫在 `CSV_CONTRACT.md` 第 4.0b 節。這一節在 2026-08-23 經過一次補訂，起因是跨題審查發現 Day08、Day11、Day12 三份提案各自對「型別怎麼判」加了不同的二次門檻（Day08「非空樣本 ≥3」、Day11「比例 ≥0.9」、Day12「只看 `kind`」），而 `csv-infra` 本身根本沒有定義 `kind` 的判定演算法——結果會是同一份 CSV 在三題顯示三種欄位型態。裁示收斂為只在 4.0b 定義一次，五題一律直接用 `inferColumnTypes()` 回傳的 `kind`，不得再自行加門檻。

同一輪還補了 `dateParts()` 的裁示（`LEVEL1B_RULINGS.md` 第 4 節第 10、11、12 條）：

- 第 10 條：日期的**擷取**（不只是「是不是日期」的判定）也要統一，新增 `dateParts(s)` 為五題唯一擷取函式，不得自行 regex/capture
- 第 11 條：`dateParts()` **不做範圍驗證**——不檢查月份 1–12、不檢查每月實際天數，合法性判準只有白名單一份，擷取層再加一道驗證等於偷偷定義第二套「什麼算日期」
- 第 12 條：`YYYY` 缺月日時 `m`／`d` 回 `null`，**不得用 0 或 1 補**，理由是那會讓「2026 年」在趨勢圖上憑空長出一個不存在的 `2026-01-01`

第 14 條裁示 `toNumber()` 非數字一律回傳 `NaN`（不是 `undefined`），這條卡住了 `csv-infra` 任務 7：任務文字原本寫「`NaN` 或 `undefined`，依實作擇一」，實作者依 PRD 共通規則第 4 條（規格不明就停下回報）停下等裁示，直到 `399a984` 才定案。第 15 條同一輪還裁示了 `csv-infra` 任務 7 測資本身的矛盾——`['1','2','abc','4']` 期望判成 `number`，但 3/4 = 0.75 低於後補的 `≥0.9` 門檻——裁示保留門檻、改測資，並要求同時測 `0.9`（應為 `number`）與 `0.8`（應為 `text`）兩個邊界，只測「通過」那一條驗不出比較運算子寫 `>` 還是 `>=` 的差別。這條矛盾的成因被明文記在裁示文件裡：測資是第一輪提案時寫的，`≥0.9` 門檻是後來新增契約時才要求逐字抄回任務文字，插入新規則時沒有回頭驗證既有測資是否還成立。

這些裁示（`8f80986`、`399a984`、`cf7c08c`、`8da81e7`）全部發生在 Day11 正式開工之前，是 Day11 能在單一 session 內把 Phase A 五條 task 做完的前提——如果這批矛盾留到 Day11 實作階段才發現，會變成實作中途被迫停下等裁示。

## 實作與複驗（`7f6eb05`，2026-08-24）

依 `sdd/csv-pivot-dashboard/tasks.md`，Phase A 共 5 條任務（task 1–5），由 sonnet subagent 實作，指揮官（Opus）複驗。

複驗結果：

- 打勾 5 勾／6 未勾，範圍正確（Phase A 完成、Phase B 未動）
- `shared/` 未被任一 agent 動到；manifest 11 個資源全部與現行 `shared/` 相符
- 實體控制字元 0 筆（`perl` 掃描）
- 禁用項目 grep 檢查：`new Date(`（用於分組的呼叫）0 命中、`.cells[`（繞過 `cellAt()` 直接存取）0 命中；`dateParts(` 3 命中，證明日期分組確實走共用擷取這一條路徑

實作者實測記錄的重點：

- 21 MB 檔案經拖放與檔案選取兩條路徑皆被拒，並以 monkey-patch `window.parseCsv` 證明呼叫次數為 0，證明閘門在讀檔之前就擋下，不是先整份讀進記憶體才判斷
- `AVG` 分母只算可解析的格：`150 = (100+200)/2` 而非除以 3；全組不可解析時顯示 `—`，不顯示 `0`
- 空字串／`'  '`（兩空白）／字面上真的叫 `(空值)` 的字串，分成三個不同群組，只有真空值那組帶 `.is-empty-key`
- 雙欄 Group By 測資 `A|B` + `C` 與 `A` + `B|C` 正確分成 2 組（NUL 分隔鍵生效，不是被可見字元分隔符撞在一起）
- 日期 7 列測資分組結果完全符合預期，且 grep 確認無 `isDateLike(`／`new Date(`／自寫 regex 用於分組
- 50,000 列 × 6 欄實測 7.3–18.4ms，遠低於 500ms 目標門檻（見下節）
- 群組數 600 時渲染上限生效（表格僅顯示前 500 列並提示），下載的彙總 CSV 有 601 行且帶 BOM

## 效能實測（task 5，`logs/perf.md`）

測資：程式產生 50,000 列 × 6 欄 CSV（`單位`／`部門`／`日期`／`金額`／`備註`／`編號`，`單位` 20 個 unique 值、`部門` 4 個 unique 值、`日期` 隨機 2020–2026 年、`金額` 約 3% 為 `N/A`）。

量測方式：不使用手動操作 DevTools Performance 面板錄影，改用等效但可重跑驗證的 `performance.now()` 埋點（`window.__pivotPerfHook`，`src/index.html` 內建）：在觸發 `change` 事件的同一個巨集任務前後量測，並在兩個 `requestAnimationFrame` 之後（確保已完成一次 paint）才停表，語意等同 DevTools「change 到最後一次 paint」。工具為本機 `python3` + `playwright`（非 Playwright MCP，避免共享實例分頁被搶）。

操作：Group By ② 從（無）改為第二個 Dimension（`部門`），觸發 `dispatchEvent(new Event('change'))`。

4 次獨立執行（各自重新載入頁面與檔案）：

| 次數 | 耗時 (ms) |
|---|---|
| 1 | 18.40 |
| 2 | 7.30 |
| 3 | 13.10 |
| 4 | 17.70 |

通過門檻 < 500ms：全部 4 次皆遠低於上限，最慢 18.40ms，約為門檻的 3.7%。切換後渲染群組數為 80 組（20 個單位 × 4 個部門），符合預期。

## 環境陷阱：第三次踩到 Write 工具把 `\0` 落成實體 NUL byte

契約 4.0c 規定多欄組合鍵一律用 `\0`（U+0000）分隔，且提案與程式碼一律寫成逃脫序列，不得寫入實體控制字元。commit `7f6eb05` 記錄：這次是第三次踩到「`Write` 工具把逃脫序列 `\0` 落成實體 NUL byte」——Day09 已踩過一次（`csv-period-diff` 提案），Day11 是第二次在同一個系列裡發生。兩次都是實作者自己發現、用位元組層級的方式取代掉才修好，沒有靠事先提醒避開。commit message 明確標註「這已經不是個案，是 Write 工具對逃脫序列的處理方式，應寫進交接書」。

本檔沿用同一個教訓：撰寫本檔與文章草稿時，涉及 `\0` 的敘述一律以「逃脫序列」文字描述（如「NUL 分隔」「`\0` 分隔符」），不直接在檔案中寫入實體控制字元，並在下方驗證步驟中用 `perl` 掃描確認。

## Mermaid 圖驗證

本檔撰寫的文章草稿（`article_draft.md`）內含兩張 Mermaid 圖：

1. 樞紐管線流程圖（Filter → Group By/Aggregate → Sort → Top N → 渲染，KPI 分支自 Group By 之後）
2. `dateParts()` 日期分組決策樹（null／僅年份／完整年月的三條路徑）

驗證方式：分別存成 `.mmd` 檔，用本機 `mmdc`（`@mermaid-js/mermaid-cli` 11.12.0，`/opt/homebrew/bin/mmdc`）渲染成 SVG，確認無語法錯誤。

```
$ mmdc --version
11.12.0
$ mmdc -i pipeline.mmd -o pipeline.svg
Generating single mermaid chart
$ mmdc -i dateparts.mmd -o dateparts.svg
Generating single mermaid chart
$ ls -la *.svg
-rw-r--r-- 1 lanss wheel 18163  8月 24 02:04 dateparts.svg
-rw-r--r-- 1 lanss wheel 14733  8月 24 02:04 pipeline.svg
```

兩張圖皆成功產出 SVG，無錯誤訊息，語法驗證通過。暫存的 `.mmd`／`.svg` 檔放在 scratchpad 目錄，非版控範圍。

## 控制字元與帳號洩漏檢查

```
$ perl -ne 'print "$ARGV:$.\n" if /[\x00-\x08\x0b\x0c\x0e-\x1f]/' \
    VibeCoding/Day11_csv-pivot-dashboard/article_draft.md \
    VibeCoding/Day11_csv-pivot-dashboard/logs/session_log_2026-08-24_day11.md
(無輸出)

$ grep -rn "<真實帳號檢查字串>" VibeCoding/Day11_csv-pivot-dashboard/article_draft.md \
    VibeCoding/Day11_csv-pivot-dashboard/logs/session_log_2026-08-24_day11.md
(無輸出)
```

## 範圍界線確認

本篇（Day11）文章與本檔僅涵蓋 `tasks.md` Phase A（任務 1–5）：型別推薦與覆寫、彙總引擎（`toNumber()` 五種 aggregate）、Group By 與日期分組、管線順序與即時重算、Pivot Table／KPI 渲染與五道效能防線。**不涉及**圖表模組 `shared/ui-chart-svg.js`、匯出 Dashboard HTML、`buildCleanHtmlCopy()`、列印驗收——這些屬於 Phase B（任務 6–11），對應 Day12 下篇，另案處理。撰寫本檔時未讀取、未修改 `VibeCoding/Day11_csv-pivot-dashboard/src/index.html`、`index.html`、`bundle_manifest.json`、`sdd/csv-pivot-dashboard/` 下任何檔案。

## 驗收

`sdd/csv-pivot-dashboard/tasks.md` Phase A 全部 5 條任務（task 1–5）於文件中標記為已完成（`[x]`）。Phase B（task 6–11）標記為未完成（`[ ]`），對應下篇範圍，本檔不予評述。
