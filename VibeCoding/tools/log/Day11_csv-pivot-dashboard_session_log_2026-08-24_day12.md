# Session 對話與思考日誌（手動整理版，2026-08-24）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗。**本檔為非腳本自動產出、環境不相容**，改為依同一份既有格式（見 Day08、Day11 前例）手動彙整，素材來源為 `sdd/csv-pivot-dashboard/proposal.md` B1–B6 段、`sdd/csv-pivot-dashboard/tasks.md` 任務 6–11、`sdd/LEVEL1B_RULINGS.md`、`VibeCoding/shared/CSV_CONTRACT.md` 第 6.2／7.4／7.4b 節、`VibeCoding/shared/ui-chart-svg.js` 實際原始碼、git commit `88ad63f`、`VibeCoding/Day11_csv-pivot-dashboard/logs/session_log_2026-08-24_day11.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。文中出現的哨兵字串（`ZZTESTUNIT9527`／`ZZHIDDENUNIT`／`ZZSALARYCOL`）皆為 `tasks.md` 驗收條件內定義的虛構測資字串，非真實資料。

---

## 說明：本題可考證的素材範圍

Day12 涵蓋 `sdd/csv-pivot-dashboard/tasks.md` Phase B（任務 6–11，對應「下篇」）：`shared/ui-chart-svg.js` 圖表模組建立、B5 四種退化情形、匯出靜態快照 Dashboard HTML、`buildCleanHtmlCopy()` 離線版清空、列印驗收。Phase A（任務 1–5，樞紐引擎／Group By／彙總管線／KPI）屬於昨天 Day11，本檔不重複展開，僅在需要銜接處簡短回顧。

實作與複驗集中在 commit `88ad63f`（2026-08-24），commit message 本身已是相對完整的複驗紀錄，本檔依此逐段展開，並補上契約裁示脈絡與兩個實作過程中被抓到的問題。

## 前置：為什麼圖表模組今天才建，不放進前置工程

`CSV_CONTRACT.md` 第 6.2 節明文記錄這個決定：`csv-decode.js`／`csv-parse.js`／`csv-write.js`／`csv-types.js`／`io-zip.js` 都由前置工程 `sdd/csv-infra/` 一次做完，因為它們是「規格已定、照做即可」的基礎設施；`ui-chart-svg.js` 不放進去，因為手寫 SVG 的邊界處理（軸刻度取整、標籤重疊、退化資料）需要邊做邊看實際資料才收斂得掉，關在前置工程裡做等於閉門造車。拆篇後 Day12 就是專做圖表的一天，模組在今天建立。

但它一開始就寫成 `shared/` 模組，不是先幫 `csv-pivot-dashboard` 寫一份、Day13（`csv-one-page-report`）再複製一份——契約明文標註這是對「第三題才升級為共用」規則的刻意例外：那條規則防的是「猜測未來會共用」，這裡不是猜測，是已經排定 Day13 要用同一支模組，是已知的事實。

同一輪還定案了圖表選型（`CSV_CONTRACT.md` 第 7.4 節）：決定性理由是「內嵌兩次」——Day11 匯出的 dashboard HTML 要能離線觀看（PRD 10 驗收條件），圖表能力得跟著產物走一份，`bundle.py` 不做 minify，所以：

| 方案 | 工具本體 | 匯出產物 | 合計 |
|---|---|---|---|
| Chart.js 4.5.1 | 208 KB | 208 KB | **417 KB** |
| uPlot | 51 KB | 51 KB | 102 KB（Pie 支援弱） |
| 手寫 SVG | ~0 | ~0 | **0** |

契約誠實標註這個體積數字是**推測值**（決定當下沒有實際寫程式），若做完發現遠超預期允許改用 uPlot，但不能中途換方案。

第 7.4b 節（2026-08-23 補訂）記錄一次跨題審查抓到的規格衝突：Day11 原提案打算用 CSS 百分比控制 SVG 尺寸，Day13 卻要求明確 `width`／`height` 屬性，兩者正面衝突。若不在 Day12 建模組時解決，Day13 做 A4 列印時圖表會在 Chrome 坍縮成 0×0，屆時只能 fork 模組出來單獨改，等於白做共用。裁示補訂五項硬性要求（明確 `width`／`height` + `viewBox`、支援固定像素尺寸呼叫、`fill` 屬性寫在元素上不用 CSS class、標籤截斷機制由模組決定、色盤能指定中性色）並要求 Day12 的 `tasks.md` 必須含一條列印驗收，不能等 Day13 才發現。同一節也記錄了 Pie 類別合併門檻的另一處衝突：Day11 提案訂「≤9 全畫」，Day13 提案訂「固定前 8」，同一支模組出現兩種答案，裁示採 Day11 版本（正好 9 個時不合併，否則「其他」只含 1 類沒有意義）。

## 為什麼是 11 條而不是 10 條（`sdd/LEVEL1B_RULINGS.md` 第 4 節第 13 條）

PRD 共通開發規則第 9 條規定整份 `tasks.md` 不超過 10 條，而契約第 7.4 節規定手寫 SVG 的邊界（座標映射、軸刻度取整、標籤重疊、色盤、四種退化情形）必須各自獨立成 task，不能塞在「畫圖表」一條裡。上一輪修正過程中曾為了湊到 10 條，把「四種退化情形」併進 Bar/Line/Pie 渲染那一條——那正是 7.4 節寫來防的事，為了滿足數量規則去違反品質規則，方向反了。

裁示：保持 11 條。PRD 第 9 條的數量上限預設「一題 = 一個發文日」，本題已由使用者拍板拆成 Day11 + Day12 兩個發文日，以「兩個發文日各 ≤10 條」衡量（Phase A 5 條、Phase B 6 條）並未超標。這是本題專屬的例外，其餘五題一律維持 ≤10 條，不得援引本條放寬。

## 實作與複驗（`88ad63f`，2026-08-24）

依 `sdd/csv-pivot-dashboard/tasks.md`，Phase B 共 6 條任務（task 6–11），由 sonnet subagent 實作，指揮官（Opus）複驗。任務 6 只建基座（三個 render 函式先回傳空骨架），任務 7 才接上實際繪製邏輯，任務 8 再獨立處理四種退化情形——這個順序本身是在落實「不把退化情形塞進畫圖表那條」的分工原則。

複驗結果（commit message 逐項確認）：

- `niceScale()` 四組期望值逐一比對：`niceScale(0,10)`＝`[0,2,4,6,8,10]`、`niceScale(0,9)`＝`[0,2,4,6,8,10]`、`niceScale(0,100)`＝`[0,20,40,60,80,100]`、`niceScale(3,17)`＝`[0,5,10,15,20]`，無任何刻度出現 `3.33`／`6.67` 這類值
- `niceScale(0, 0.3)` 的原始輸出末項為 `0.30000000000000004`，經 `Number(v.toFixed(10))` 去尾後為 `0.3`，兩者皆印出比對
- XSS 標籤測試：含 `<script>alert(1)</script>` 的測資標籤，產物 `<script` 命中 0 次，畫面顯示逃脫後的字面文字
- 匯出快照雙哨兵：畫面看得到的 `ZZTESTUNIT9527` 命中 3 次（證明不是空殼），被 Filter 排除的 `ZZHIDDENUNIT` 命中 0 次（證明沒夾帶原始資料集）
- 離線版：欄名哨兵 `ZZSALARYCOL` 與值哨兵皆 0 次；DOM 層確認無 `#__shared_toast`、無 `.nav-back`、console 無錯誤；斷網可重新上傳完成一輪 Group By + 圖表
- 列印：`print` media 下 SVG `getBoundingClientRect()` 為 `800×400`（非 0×0）；`pdftoppm` 量測非白像素邊界 `2027×912`；固定尺寸呼叫（`opts.width`／`opts.height`）跟 `getBoundingClientRect()` 讀回值誤差 0px
- 控制字元掃描 0 筆；Day08／Day09／Day10 檔案未受波及（本題只動 `shared/ui-chart-svg.js` 與 `Day11_csv-pivot-dashboard/` 目錄下檔案）

commit 附帶記錄了一項旁支發現：Day13（`csv-one-page-report`）任務書預檢時補上兩處漏接的契約要求（編碼手動切換逃生口、`cellAt()` 取格），根因與 Day09／Day10 同時期違約完全相同——任務書沒寫，實作者照著做就會違約，這條教訓在 `LESSONS.md` 已多次出現，本檔不重複展開。`LEVEL1B_RULINGS.md` 同時新增了一條待裁示 #17（`toCsv()` 無試算表公式注入防護），屬於下一輪待處理事項，不影響本題今天的完成度。

## 實作過程中發現的兩個問題

### 問題一：task 8 驗收條件字面上不可能成立

`tasks.md` task 8 原文寫「含負值時 Bar 的零線 `<line>` 存在且負值 bar 的 `y` 大於零線 `y`」。實作時發現這句話字面上不可能成立：SVG `<rect>` 元素的 `y` 屬性指的是矩形**左上角**座標。負值 bar 從零線往下延伸，矩形左上角剛好落在零線上，因此負值 bar 的 `y` 屬性值**等於**零線的 `y`，不會大於它。真正能代表「這根 bar 延伸到零線以下」的座標關係，是矩形下緣 `y + height`，這個值才會大於零線的 `y`。

實際程式碼（`shared/ui-chart-svg.js` `renderBarChart()`）：

```js
var top = v >= 0 ? y(v) : zeroY;
var bottom = v >= 0 ? zeroY : y(v);
var rectY = Math.min(top, bottom);
var rectH = Math.max(0, bottom - top);
```

負值時 `rectY === zeroY`，`rectY + rectH === y(v)` 才是真正落在零線下方的座標。這是本專案第八次抓到「驗收條件字面上寫不通」這類問題，前幾次多半是驗收工具本身的行為跟預期不符（例如 Day10 macOS 內建 `unzip` 不支援 EFS bit、Day05／Day06 的 `.nav-back` 因 CSS 內嵌而不可能 grep 歸零），這次不同——是驗收條件對 SVG 座標系統的語意本身有誤解，而且是本專案第一次由**實作者自己在寫程式碼、對照屬性實際定義時**主動發現，不是靠獨立驗收的另一雙眼睛抓出來的。修正後的驗收判準改為量測 `y + height`，實測負值 bar 確實延伸到零線以下，方向正確。

### 問題二：離線版驗收出現假陽性，命中源頭是程式碼註解

task 10 要求對下載的離線版跑 `grep -c 'ZZSALARYCOL'`（欄名哨兵）等於 0，證明清空徹底。第一次執行時得到 1 次命中，但逐項檢查畫面（下拉選單、Pivot Table 表頭、Filter 欄位選單）都確認清空乾淨，看不到這個欄名的痕跡。追查後發現命中的位置是**程式碼裡的一段註解**：寫驗收流程說明或程式碼註解時，把測資裡真實使用的哨兵字串原樣寫進去當作範例文字，而不是用一個不會被誤判的敘述性描述。程式碼字面裡的字串一樣會被 `grep` 命中，跟畫面實際殘留資料是兩回事，但字面比對工具分辨不出這個差異。

修法是把該處範例文字改寫成不重複使用真實哨兵字面的敘述。這件事跟本檔一開始（記錄方式段落）已經強調過的守則是同一種風險：任何拿來做字面比對驗收的哨兵字串，只能出現在真實資料流路徑裡，不能同時出現在程式碼、註解或文件範例中，否則驗收指令的結果無法反映它原本要驗證的事。本檔撰寫時已依此檢查，未在正文任何位置把測資哨兵字串當作程式碼片段的範例值重複寫出（僅作為敘述性文字提及）。

## Mermaid 圖驗證

本檔對應的文章草稿（`article_draft_day12.md`）內含兩張 Mermaid 圖：

1. B3 標籤重疊決策鏈（截斷 → 估寬 → 水平／旋轉／抽稀三選一）
2. 匯出靜態快照雙哨兵驗證流程（Filter 排除 `ZZHIDDENUNIT` → 渲染 → 正負向 grep 對照）

驗證方式：分別存成 `.mmd` 檔，用本機 `mmdc`（`@mermaid-js/mermaid-cli` 11.12.0，`/opt/homebrew/bin/mmdc`）渲染成 SVG，確認無語法錯誤。

```
$ mmdc --version
11.12.0
$ mmdc -i label-layout.mmd -o label-layout.svg
Generating single mermaid chart
$ mmdc -i export-sentinel.mmd -o export-sentinel.svg
Generating single mermaid chart
$ ls -la label-layout.svg export-sentinel.svg
-rw-r--r-- 1 lanss wheel 16793  8月 24 02:15 label-layout.svg
-rw-r--r-- 1 lanss wheel 19926  8月 24 02:15 export-sentinel.svg
```

兩張圖皆成功產出 SVG，無錯誤訊息，語法驗證通過。暫存的 `.mmd`／`.svg` 檔放在 scratchpad 目錄，非版控範圍。

## 控制字元與帳號洩漏檢查

```
$ perl -ne 'print "$ARGV:$.\n" if /[\x00-\x08\x0b\x0c\x0e-\x1f]/' \
    VibeCoding/Day11_csv-pivot-dashboard/article_draft_day12.md \
    VibeCoding/Day11_csv-pivot-dashboard/logs/session_log_2026-08-24_day12.md
(無輸出)

$ grep -rn "<真實帳號檢查字串>" \
    VibeCoding/Day11_csv-pivot-dashboard/article_draft_day12.md \
    VibeCoding/Day11_csv-pivot-dashboard/logs/session_log_2026-08-24_day12.md
(exit code 1，無輸出)
```

## 範圍界線確認

本篇（Day12）文章與本檔僅涵蓋 `tasks.md` Phase B（任務 6–11）：`shared/ui-chart-svg.js` 圖表模組建立與繪製、B5 四種退化情形、匯出靜態快照 Dashboard HTML、`buildCleanHtmlCopy()`、列印驗收。**不重寫** Phase A（任務 1–5：樞紐引擎、型別推薦、Group By、彙總管線、KPI、Pivot Table）——那是昨天 Day11 的範圍，本檔僅在必要處簡短回顧銜接。撰寫本檔時未修改 `VibeCoding/Day11_csv-pivot-dashboard/src/index.html`、`index.html`、`bundle_manifest.json`、`sdd/csv-pivot-dashboard/` 下任何檔案、`VibeCoding/shared/ui-chart-svg.js` 或其他 `shared/` 檔案，僅讀取查證內容。

## 驗收

`sdd/csv-pivot-dashboard/tasks.md` 全部 11 條任務（task 1–11）於文件中標記為已完成（`[x]`），對應 commit `7f6eb05`（Phase A）與 `88ad63f`（Phase B）。至此 csv-pivot-dashboard 上下篇（Day11＋Day12）完整交付 PRD 10 全部範圍。
