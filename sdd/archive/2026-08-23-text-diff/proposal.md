# 文字差異比對器（text-diff）

- PRD 對應：`sdd/text-diff/PRD.md`（PRD A2，v2 需求基線漏收此題，本題補寫 PRD，格式對齊基線 PRD 03／PRD 04）
- 部署型態：單一 HTML / GitHub Pages，可離線（唯一例外：內嵌 jsdiff 函式庫）
- AI：否
- 互動模式：**按鈕觸發**（非即時），依據 `shared/CONTRACT.md` 第 5 節：「Day07 `text-diff`：按鈕觸發，雙輸入，比對成本高」

## 為什麼做

承辦人員比對合約、公文修訂版時，兩份文件內容相近但改了幾處條款，肉眼逐字比對容易漏看也容易看錯。此題是 v1 既有作品（v1 Day3，因系列重新分類移至 `old/Day7`），v2 三十題需求基線漏收，本次補回並升級到 v2 的共用模組架構。

本題是 Level 1a 目前唯一需要內嵌第三方 JS library 才能穩定運作的題目（純手刻 LCS/Myers diff 要處理空輸入、全刪、全增、句數不等長等邊界情況，穩定度不如成熟函式庫），版本選錯會讓後續開發重工，因此先於進入實作前完成版本查證。

## jsdiff 版本查證結論

**決定：內嵌 `diff@9.0.0`（2026-04-13 發布，npm 最新穩定版），取代 v1 使用的 `diff@5.2.2`（版本佐證見 `VibeCoding/old/Day7/SECURITY_REVIEW.md:10`、`:30`，v1 `index.html` 本身未留版本字串，故引用該檔）。**

查證方式：`npm view diff@9 --json` 取得 registry 中繼資料、`npm pack diff@9.0.0` 與 `npm pack diff@5` 實際下載拆包比對 `dist/` 目錄內容、閱讀套件內附的 `release-notes.md`（6.0.0／7.0.0／8.0.0／8.0.4／9.0.0 各版變更）。暫存於 `/private/tmp/.../scratchpad/diff9/`、`/private/tmp/.../scratchpad/diff5/`。

| 問題 | 結論 | 證據 |
|---|---|---|
| A1. 9.x 有沒有瀏覽器可直接用的 UMD/IIFE bundle？ | **有，且結構與 5.x 相同。** 8.0.0 把 ESM 從單一檔案改成逐檔輸出（`libesm/`），但 `dist/diff.js`、`dist/diff.min.js` 這組獨立打包的 UMD bundle 從未被移除，9.0.0 仍原樣保留，開頭是標準 UMD wrapper `(global.Diff = {})`，`exports.diffArrays`／`exports.diffChars` 皆在列。 | 實際下載檔案 `diff9/package/dist/diff.js`；`head -5` 與 `grep -n "typeof exports\|global.Diff"` 皆命中（第 1-4 行），與 `diff5/package/dist/diff.js` 的 UMD wrapper 逐行結構一致 |
| A2. 若只剩 ESM 怎麼辦？成本多高？ | **前提不成立**，9.x 仍有 UMD，內嵌方式與 v1 完全相同（`<script>` 原樣貼入 `dist/diff.js`），無額外成本。 | 同上 |
| A3. `diffArrays` 從 5.x 到 9.x 有無 breaking change？ | **無影響本題用法的 breaking change。** 唯一相關變更是 6.0.0（2024-09-02）把 `comparator(a, b)` 的參數順序固定為「舊陣列在前、新陣列在後」；`diffArrays` 本身邏輯（`tokenize=slice`、`join`/`removeEmpty=identity`）5.x→9.x 沒有語意差異，只是內部改寫成 TypeScript class。v1 `index.html` 兩處呼叫 `Diff.diffArrays(..., {comparator: function(a,b){return normKey(a)===normKey(b);}})`（2200、2375 行）用的是**對稱的相等比較**，不判斷順序，因此參數順序調整對本題零影響。`diffChars` 在 6.0.0 也有一項變更：改成比對 Unicode code point 而非 UTF-16 code unit，影響 emoji／罕見字等 surrogate pair 字元，對純中文文字（BMP 範圍內）無實質差異。 | 實際下載檔案 `diff9/package/release-notes.md`（6.0.0 段落 `#500`／`#467`）；`diff diff5/package/lib/diff/array.js diff9/package/libcjs/diff/array.js` 逐行比對確認邏輯等價；v1 呼叫點見 `VibeCoding/old/Day7/index.html:2200`、`:2375` |
| A4. 建議用哪個版本？ | **9.0.0**（npm 最新穩定版）。理由：UMD 內嵌成本與 5.2.2 完全相同（A1/A2），我方唯二用到的 API（`diffArrays`／`diffChars`）在我方實際用法下無 breaking 影響（A3），且 9.0.0 吃到 8.0.3/8.0.4 修的 `parsePatch` ReDoS／記憶體洩漏類安全性修正（雖非本題用到的函式，但屬同一支內嵌函式碼的整體風險），沒有理由停留在兩年多前的 5.2.2。唯一代價是 bundle 體積變大：未壓縮 `dist/diff.js` 從 53.7KB（5.2.2）增為 111.3KB（9.0.0），單檔 HTML 內嵌仍可接受。 | `npm view diff@9.0.0 license` → `BSD-3-Clause`；`wc -c diff9/package/dist/diff.js` → 111301 bytes；`wc -c diff5/package/dist/diff.js` → 53748 bytes |

**未實際驗證、標註為推測的部分**：9.0.0 在真實瀏覽器（非 Node 環境）以 `<script>` 標籤載入後，`diffArrays`／`diffChars` 的實際執行結果未經瀏覽器實測比對——上述結論僅基於原始碼閱讀與 UMD wrapper 結構比對，尚未跑 Playwright 之類的瀏覽器實測（此步驟留待 T-最後一條的 build 產物驗收階段執行，屆時若發現 9.0.0 有未預期的執行期行為，會退回 5.2.2 並在 proposal 補記原因）。

授權：**BSD-3-Clause**（`npm view diff@9.0.0 license`、套件內 `LICENSE` 檔首行皆確認），與 v1 相同版權宣告（Kevin Decker, 2009-2015）。

## 要改什麼

### 功能本身（沿用 v1 F1-F8，MVP 詳見 `PRD.md`）

- 雙欄輸入＋拖曳讀檔
- 逐句斷句（段落＋中文句尾標點）
- jsdiff `diffArrays` 差異比對（新增／刪除／修改配對）
- 並排對照顯示＋色彩圖例
- 未變動區塊摺疊（連續未變動句數 ≥3 句，達 3 句本身即觸發）
- 差異統計摘要
- 複製摘要／下載 MD 報告
- **新增（v1 缺口）**：jsdiff 版本與授權標示於頁面可見處
- **新增（Level 1 共通 UI 基線，`CONTRACT.md` 第 6 節）**：下載本工具離線版（`buildCleanHtmlCopy()`，清空雙欄輸入與比對結果、移除返回連結）

### v1 沿用與取捨（`VibeCoding/old/Day7/index.html`，行號已逐一 `sed -n` 核對）

**直接複用、改走共用模組：**

- 拖曳讀檔：v1 邏輯改用 `shared/io-dropzone.js` 的 `setupDropZone(dropEl, onText, opts)`（`opts.accept: ['.txt', '.md']`），左右兩欄各建立一個 dropzone 實例。
- 下載報告：改用 `shared/io-download.js` 的 `downloadFile(filename, content, mime)`。
- 複製摘要：改用 `shared/io-clipboard.js` 的 `copyToClipboard(text)`，呼叫端自行接 `shared/ui-toast.js` 顯示結果。
- HTML escape：畫面渲染逐句文字一律先過 `shared/util-escape.js` 的 `escapeHtml(s)`，比照 v1 全程用 `.textContent`／安全 DOM API 的既有安全模式（`SECURITY_REVIEW.md` 已確認零 `innerHTML`）。

**邏輯保留、不升級為共用模組（僅本題用到，未達「第 2 次出現」升級門檻）：**

- 逐句斷句規則（空行切段落，段落內單一 `\n` 正規化為空白＋中文句尾標點 `。！？；`分句，詳見 PRD.md）
- 刪除＋新增配對成「修改」的規則（含 `normKey`／`normalizeForCompare` 比對正規化）：連續 N 句刪除緊接連續 M 句新增時，依序逐一配對成「修改」直到 `min(N,M)` 對，剩餘 `|N-M|` 句維持純刪除或純新增，詳見 PRD.md
- 未變動區塊摺疊 UI 邏輯（門檻：連續未變動句數 ≥3 句，達 3 句本身即觸發）

以上三者是本題專屬的文字比對邏輯，非通用工具，維持寫在 `Day07_text-diff/src/index.html` 內，不進 `shared/`。

**明確不沿用 v1 Round 2-13 的迭代精修（`README.md` 第 6-13 節）：**

v1 經過真實文件測試後追加了頁碼標記過濾、bigram 相似度門檻、字元級標示、階層式細分、resplit LCS 序列對齊、HTML/CSV 下載等多輪修正，這些是「驗收通過後用真實文件實測才發現要修」的精修，不是 MVP 必要功能。本次 MVP 對齊 v1 原始 PRD 的 F1-F8（`old/Day7/PRD.md` 第 4 節），验收通過後若使用者拿真實文件測試發現同類問題，再開新的 sdd 提案追加（比照 v1 `sdd/archive/2026-08-10-day3-text-diff-round2/` 等既有前例）。

### jsdiff 內嵌（依 `CONTRACT.md` 第 4 節 `raw_js` 模式）

- 版本：`diff@9.0.0`，來源 `npm pack diff@9.0.0` 後取 `dist/diff.js`（未壓縮版，53.7KB→111.3KB，選未壓縮版是延續 v1 SECURITY_REVIEW 的方法論：資安檢測需要用關鍵字掃描 `fetch`／`eval`／`XMLHttpRequest`，未壓縮版可讀性與可稽核性較高）
- 授權：BSD-3-Clause，需在 `bundle.json` 標註 `license` 字串，`bundle.py` 依契約規定在輸出 HTML 頂端寫入 `<!-- BUNDLED: diff@9.0.0 (BSD-3-Clause) sha256:<前16碼> built <日期> -->`，並在頁面可見處（例如頁尾或「關於」區塊）渲染授權標示，補回 v1 缺漏的授權揭露

### 資料格式

本題無詞庫／對照表資料，僅有 jsdiff library 本體走 `raw_js` 模式，不涉及 `json_string` escape_mode。

## 影響範圍

### 新增檔案

- `VibeCoding/Day07_text-diff/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day07_text-diff/src/bundle.json`（資源清單，含 jsdiff `raw_js` 資源＋license）
- `VibeCoding/Day07_text-diff/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day07_text-diff/bundle_manifest.json`（build 產物）
- `VibeCoding/Day07_text-diff/PRD.md`（複製 `sdd/text-diff/PRD.md` 內容，依既有題目慣例放在作品資料夾內）
- `sdd/text-diff/PRD.md`（本次已建立）
- `sdd/text-diff/proposal.md`（本檔）
- `sdd/text-diff/tasks.md`

### 修改檔案

- `VibeCoding/README.md`、`VibeCoding/index.html`（進度表與作品集清單加入本題，**收尾階段才動，不在本題實作範圍**）

### 不修改

- `VibeCoding/old/Day7/index.html`（v1 原始檔，只讀取參考，不覆寫）
- `VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/*.js`（沿用既有簽名，不變動）

### Library / API

- `diff@9.0.0`（BSD-3-Clause），內嵌 `dist/diff.js`（未壓縮版），僅使用 `diffArrays`／`diffChars` 兩個匯出函式；無 API 呼叫，全程 browser-side。
