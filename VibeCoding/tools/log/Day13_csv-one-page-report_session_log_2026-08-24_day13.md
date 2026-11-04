# Session 對話與思考日誌（手動整理版，2026-08-24）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗。**本檔為非腳本自動產出、環境不相容**，改為依同一份既有格式（見 Day08、Day11 前例）手動彙整，素材來源為 `sdd/csv-one-page-report/proposal.md`、`sdd/csv-one-page-report/tasks.md`、`sdd/LEVEL1B_RULINGS.md`（裁示 12、15、17、18）、`VibeCoding/shared/CSV_CONTRACT.md` 第 4.0b／7.4b 節、git commit `48dd876`、`VibeCoding/Day13_csv-one-page-report/src/index.html`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 說明：本題可考證的素材範圍

Day13 是 Level 1b（CSV 系列）五題裡的最後一題，對應 `sdd/csv-one-page-report/tasks.md` 全部 10 條任務，於 commit `48dd876`（2026-08-24）一次完成並複驗，未拆篇。本檔依 commit message 與任務文件逐段展開，並補上前置的契約裁示脈絡。

## 前置：這題直接繼承的兩個前置決定

1. **圖表模組**：`shared/ui-chart-svg.js` 由 Day12（pivot 下篇）建立，`CSV_CONTRACT.md` 第 7.4b 節（2026-08-23 補訂）在 Day12 動工前就已把「明確 `width`/`height`/`viewBox`」「支援固定尺寸呼叫」「`fill` 屬性上色（列印相容）」「標籤截斷」「色盤中性色參數」列為硬性要求——這些要求全部是因為契約起草時已經算進 Day13 也要用同一個模組，不是 Day12 自己需要卻用不到的功能。Day13 開工後未回頭修改 `shared/ui-chart-svg.js` 本身，只在報表容器層加列印 CSS。
2. **試算表公式注入防護**：裁示 17（`toCsv()` 對 `=`／`+`／`-`／`@` 開頭儲存格的防護，見契約第 4.2a 節）於 commit `dee3052` 併入 `shared/csv-write.js`，時間點早於 Day13 開工（`48dd876`）。Day13 使用 `toCsv()` 匯出彙總資料時自動繼承這項防護，本題未另外處理。

## 開工前的裁示脈絡：`YYYY-MM` 該不該納入趨勢分組

`CSV_CONTRACT.md` 裁示 12（2026-08-23）規定 `dateParts()` 回傳 `m`／`d` 為 `null` 時不得用 0 或 1 補齊，理由是避免在趨勢圖上憑空長出不存在的日期點（例如把 `2026` 補成 `2026-01-01`）。這條規則講的是「缺項不能補」，但沒有明講「`YYYY-MM`（`m` 有值、`d` 為 `null`）這種介於中間的情況該怎麼處理」。

`sdd/csv-one-page-report/proposal.md` 第 5 節（第 12 點）在提案階段就寫了「呼叫端不得用 0 或 1 補齊缺欄位」，但延伸到「`YYYY-MM` 該不該整列排除」時沒有給出明確答案，把判斷留給實作階段。

## 實作與複驗（`48dd876`，2026-08-24）

依 `sdd/csv-one-page-report/tasks.md`，全部 10 條任務由 sonnet subagent 實作，指揮官（Opus）複驗，commit message 記錄任務 1–10 全數完成並驗收。

### 裁示 18：日期趨勢排除規則依粒度而定，不是一律排除

實作者面對「`m` 有值但 `d` 為 `null`」的列該不該排除時，採取的第一版寫法是「`m` 或 `d` 任一為 `null` 就整列排除」——這是套用裁示 12「缺項不能補」邏輯的直接延伸，看起來合理。但實作者**主動標註「此子情境未經裁示，僅有間接依據」**，這個回報行為被指揮官認定為對的做法：規格覆蓋不到的地方誠實承認不確定，而不是自信地選一個看起來合理的方向後不再說明。

指揮官複驗時給出裁示（`sdd/LEVEL1B_RULINGS.md` 裁示 18）：排除規則依「當下粒度」而定。

| 當下粒度 | 需要的欄位 | `YYYY-MM`（`d === null`） |
|---|---|---|
| 月分組（`y`／`m`） | `y` + `m` | 納入 |
| 日分組（`y`／`m`／`d`） | `y` + `m` + `d` | 排除 |

理由：裁示 12 要防的是「捏造出不存在的日期點」，把 `2026-08` 放進「2026-08」這個月桶沒有捏造任何東西，那就是它本來的粒度；一律排除反而是無故丟掉真實資料。

**這條裁示之所以值得記錄，不只是規則本身，是它被抓出來的方式**：`tasks.md` 任務 5 原本準備的測資跨度不到 31 天，依規則本來就會退化成日分組——而在日分組底下，「一律排除」跟「依粒度而定」兩種寫法算出的結果完全相同，測資本身沒有能力區分兩種寫法的對錯。裁示文件明確把這件事與裁示 15（`csv-infra` 任務 7 測資與 `0.9` 門檻矛盾）歸為同一類問題，並在裁示 18 原文寫下這句話：「驗收測資必須能區分正解與誤解，否則驗了等於沒驗。」補測方式是另外準備一份跨度超過 31 天、含 `YYYY-MM` 列的測資，逼這一列必須出現在月分組結果裡，兩種寫法才會分出高下。

### 裁示落地後的修正與三項回歸測試

commit message 記錄，`calcDateTrend()` 改為兩階段收集：

- `monthRows`：收集 `m !== null` 的列（月分組所需最低粒度），`d` 可能為 `null`（即 `YYYY-MM` 情況）
- `fullDateRows`：從 `monthRows` 中再篩出 `d !== null` 的列，用來量測日期範圍以決定粒度，也是日分組時實際要用的資料

月分組用 `monthRows`（`YYYY-MM` 自然被涵蓋），日分組用 `fullDateRows`（`YYYY-MM` 自然被排除），不需要另外寫一條特例判斷。修正後跑了三項測試：

1. 新測資（跨度 2026-01～08，含一列 `YYYY-MM`）→ 月分組得到 4 個資料點，`YYYY-MM` 成功納入
2. 原測資回歸（跨度 < 31 天）→ 日分組 2 個資料點，`YYYY` 與 `YYYY-MM` 皆排除，確認舊行為未被改壞
3. 兩次輸出皆未出現非原始輸入的日期字串（無虛構的 `2026-01-01`／`2026-08-01`），確認裁示 12「不得補 0/1」的底線未被裁示 18 的放寬鬆動

## 其他驗收重點（`48dd876`，皆 Playwright 實跑）

- **XSS**：標題／期間／註記三個注入點分別打入 `<script>window.__xss=1</script>` 與 `<img src=x onerror="window.__xss2=1">`；`window.__xss`／`window.__xss2` 皆為 `undefined`；預覽容器內查無被注入的 `script`／`img` 元素
- **列印**：PDF 頁數收斂為 1 頁（commit 記錄提到最初版本為 3 頁，逐步收斂列印版型才達成）
- **匯出單一 HTML（雙哨兵法）**：14 類測資，哨兵 `ZZHIDDENCAT` 置於依 measure 排序的第 9 名（占比圖前 8 大與 Bottom5 最後 5 名皆躲得掉的唯一可行位置，11 類時無解），匯出後精確搜尋得 0 命中；哨兵 `ZZVISIBLECAT` 置於 Top5 名次內，精確搜尋得 ≥1 命中；並有正向對照證明 grep 指令本身有效
- **離線版清空**：5 個哨兵字串（分類值／欄名／標題／期間／註記）原始碼精確搜尋皆 0 命中；DOM 層斷言 `document.getElementById('__shared_toast') === null`、`.nav-back` 元素數為 0；並驗證前置狀態——toast 確實在操作過程中觸發過、欄名哨兵確實曾出現在 live DOM 的 `<option>` 中，排除「本來就沒資料」的假性通過
- **邊界情況**：空 CSV、僅 1 個分類、類別數恰為 9（不合併）、類別數 = 10（前 8 + 其他）、缺日期欄、註記欄位打滿字數上限、5–20MB 大檔案提示、>20MB 大檔案拒絕，拖放與檔案選取兩條路徑分別測過，皆不崩潰

契約合規快掃（grep 全檔案）：`row.cells[` 0 筆、全域 `isNaN(` 0 筆、實體控制字元 0 筆；唯一一處 `new Date()`（`src/index.html:1145`）為報表產生時間戳，不涉及 CSV 日期欄解析，不違反契約「禁止用 `new Date(字串)` 判斷日期」的規定（已用 `grep -n "calcDateTrend\|new Date" src/index.html` 交叉確認，該行不在 `calcDateTrend()` 函式範圍內）。

## 實作者誠實標註的未驗證項（原樣轉述）

commit message 明確標註以下限制，本檔不做額外聲稱：

- PDF 頁數判定方式為推算 `/Type /Page` 物件數，非完整 PDF 結構解析
- 版面元素邊界框（bounding box）為近似量測，非逐像素比對
- 未測 Firefox／WebKit 與 Windows 平台（本機為 macOS + Chromium），此為契約既有的平台限制，非本題新增缺口

## Mermaid 圖驗證

本檔對應的文章草稿（`article_draft.md`）內含一張 Mermaid 圖：裁示 18 的日期分組決策流程（`m` 是否為 `null` → 粒度判定 → `YYYY-MM` 在兩種粒度下的納入／排除路徑）。

驗證方式：存成 `.mmd` 檔，用本機 `mmdc`（`@mermaid-js/mermaid-cli` 11.12.0）渲染成 SVG，確認無語法錯誤。

```
$ mmdc --version
11.12.0
$ mmdc -i ruling18.mmd -o ruling18.svg
Generating single mermaid chart
$ ls -la ruling18.svg
-rw-r--r-- 1 lanss wheel 21447  8月 24 09:42 ruling18.svg
```

渲染成功產出 SVG，無錯誤訊息，語法驗證通過。暫存的 `.mmd`／`.svg` 檔放在 scratchpad 目錄，非版控範圍。

## 控制字元與帳號洩漏檢查

```
$ perl -ne 'print "$ARGV:$.\n" if /[\x00-\x08\x0b\x0c\x0e-\x1f]/' \
    VibeCoding/Day13_csv-one-page-report/article_draft.md \
    VibeCoding/Day13_csv-one-page-report/logs/session_log_2026-08-24_day13.md
(無輸出)

$ grep -rn "<真實帳號檢查字串>" VibeCoding/Day13_csv-one-page-report/article_draft.md \
    VibeCoding/Day13_csv-one-page-report/logs/session_log_2026-08-24_day13.md
(無輸出)
```

## 範圍界線確認

本篇（Day13）文章與本檔涵蓋 `sdd/csv-one-page-report/tasks.md` 全部 10 條任務：讀檔與大檔案門檻、欄位型別推論、KPI 計算、Top5/Bottom5、分類占比與日期趨勢、UI 串接與複製摘要、XSS 跳脫與列印版型、匯出單一 HTML、`buildCleanHtmlCopy()`、整體 bundle 與 Playwright 驗收。撰寫本檔時未讀取、未修改 `VibeCoding/Day13_csv-one-page-report/index.html`、`bundle_manifest.json`、`sdd/csv-one-page-report/proposal.md`／`tasks.md`、`VibeCoding/shared/` 下任何檔案。

## 驗收

`sdd/csv-one-page-report/tasks.md` 全部 10 條任務於文件中標記為已完成（`[x]`）。Level 1b（CSV 系列）五題（Day08–13，Day11/12 為上下篇）至此全部完成實作。
