# 兩期清冊異動報告（csv-period-diff）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` PRD 09（`## PRD 09 — 兩期清冊異動報告`，行 279-305）
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- 互動模式：**按鈕觸發**（依 `shared/CONTRACT.md` 第 5 節精神類推——雙檔上傳＋Key 選取後比對，成本不低，結果需穩定不跳動，比照 Day07 `text-diff`）
- 資料層：**全程遵守 `VibeCoding/shared/CSV_CONTRACT.md`**，`csv-decode.js`／`csv-parse.js`／`csv-write.js` 視為已就緒的前置工程模組，本提案不重新設計 CSV 解析

## 為什麼做

人員、資產、設備、會員清冊常要比對前期與本期，人工 VLOOKUP 耗時且容易漏看。此題用瀏覽器端比對兩份 CSV，依使用者指定的 Primary Key 找出新增、移除、欄位異動的列。

## 為什麼不用 jsdiff（明確排除，避免下一個人以為漏了）

Day07 `text-diff` 用 `Diff.diffArrays` 做的是**序列比對**（LCS 式）：兩份輸入被視為「有順序意義」的陣列，diff 演算法找的是「最少編輯次數讓序列 A 變成序列 B」，因此順序改變會被演算法感知為刪除＋新增。

本題不是序列比對問題。CSV 清冊兩期的**列順序沒有語意**——同一筆資料在前期第 3 列、本期第 87 列是常態（新增/刪除列會讓後面所有列位移），若用 LCS 式 diff，任何列順序變動都會被誤判為大量刪除+新增，噪訊爆量且完全誤導。

正確模型是**以 Primary Key 為準的集合比對（set-based reconciliation）**：

1. 用勾選的 Key 欄位值組出 key 字串，把兩期各自的列建成 `Map<key, Row>`（O(n)）
2. 對兩個 key 集合取差集／交集：`本期 key 集合 − 前期 key 集合 = 新增`；`前期 key 集合 − 本期 key 集合 = 移除`；交集裡再逐格比對值 = 異動或無異動
3. 全程只需雜湊查找，不需要任何動態規劃式的 diff 演算法，複雜度也遠低於 LCS（O(n) vs O(n·d)）

因此本題完全不內嵌 jsdiff，也不寫任何序列比對邏輯。

## 要改什麼

### 1. Primary Key 的處理（規格細節，PRD 只給條列，以下是本提案的定義）

- **單欄或多欄組合**：UI 提供勾選清單，欄位候選 = 前期 headers ∩ 本期 headers（兩期都存在的欄才能當 Key，欄位交集判定見下方「欄位結構變化」）。允許勾選 1 至多欄；勾 1 欄就是單欄 Key，不另外做兩套 UI。
- **Key 值組成**：多欄值用 `\0`（null character，CSV 文字內容不會出現）串接各欄原始字串值（不 trim、不轉型，依 CSV_CONTRACT 第 3.1 節每格皆為 string）。與 `csv-pivot-dashboard`（Day11）的組合鍵分隔符統一使用 `\0`。
- **Key 重複**（同一份 CSV 裡出現兩筆以上相同 Key 值）：**不嘗試猜測哪筆對哪筆**（PRD「不做」明列此點）。這類列整組獨立歸入「Key 重複，略過比對」清單，不計入新增／移除／異動／無異動任何一類統計，但在結果頁與 HTML 報告中列出清單（哪個 Key、出現在前期幾筆、本期幾筆、對應原始列號 `line`）供人工檢查，UI 用明顯的警示區塊呈現，不能默默略過。
- **Key 值含空值**（勾選的 Key 欄位中有任一欄是空字串 `''`）：同樣視為無法確定對應，獨立歸入「Key 缺值，略過比對」清單，不計入統計，原因與呈現方式同上。
- 比對前的防呆：若使用者一欄都沒勾就按比對，用 `showToast()` 阻擋並提示「請至少選擇一個 Key 欄位」。

### 1b. 大檔案門檻（本題吃兩份檔，門檻比其他四題多一條）

依 `CSV_CONTRACT.md` 第 5 節：< 5MB 直接處理；5–20MB 先顯示「檔案較大，處理可能需要數秒」；> 20MB 拒絕並說明上限。門檻以 `File.size` 原始位元組計。

**本題有兩道門檻，走兩個不同機制，不要混在一起**：

- **單檔門檻**（≤20MB）：走 `opts.gate`，在**讀檔之前**執行，兩個上傳區各自的 `setupDropZone`／`setupFilePicker` 都帶 `gate: function(file){ return checkCsvFileSize(file.size); }`。單檔超標時 `gate` 回傳 `reject`，`onError(message)` 觸發、完全不讀那一份檔，另一份檔不受影響（各自獨立判定）。
- **合計門檻**（兩檔合計 ≤20MB）：`File` 物件在讀檔前就已經有 `.size`，不需要等 `ArrayBuffer`，合計門檻同樣走 `gate` 回呼、在**讀檔之前**判定。做法：前期／本期兩個上傳區各自維護一個模組層變數（例如 `periodASize`／`periodBSize`），初始為 `null`；某一區的 `gate(file)` 先照常檢查 `checkCsvFileSize(file.size)`（單檔門檻），單檔就 `!ok` 直接回傳、不繼續；單檔 `ok` 時，若**另一區**已經存有 size（代表另一份檔案已通過它自己的單檔 gate），再檢查 `checkCsvFileSize(該已存 size + file.size)`（合計門檻），`!ok` 就回傳這個結果並顯示「兩檔合計超過 20MB 上限」訊息，`onError(message)` 觸發、完全不建立這一份檔案的 `FileReader`；合計也通過才把 `file.size` 存進自己那個變數，並回傳 `ok`（或 `warn`）讓讀檔繼續。⚠️ **不是**兩份檔案各自讀成 `ArrayBuffer` 之後才加總檢查——那樣 12MB + 12MB 仍會先把 24MB 讀進記憶體，等於閘門白設（違反契約第 4 節「gate 必須在開始讀檔之前」）。

理由：本題同時把兩份 Table 留在記憶體，只擋單檔的話兩份各 19MB 都合法但記憶體用量翻倍，正是契約第 5 節要防的無聲卡死。

### 2. 欄位「結構」變化 vs 欄位「值」異動（PRD 只講後者，前者要交代）

PRD 條列「欄位變更」指的是**同一筆資料（同 Key）的欄位值變了**，這是本題的核心比對邏輯。但兩期 headers 本身可能不同（本期多一欄或少一欄），這是另一個層次的問題，必須分開處理、分開呈現：

- 兩期上傳解析完成後，立刻比較 `headers`（依欄名比對，不依欄位順序——CSV_CONTRACT 沒有保證兩期欄序一致，且 parser 不重排欄位）。
- 若有差異，畫面上方顯示獨立的「欄位結構差異」卡片：列出「僅前期有」「僅本期有」的欄名清單。這個資訊**不算進新增／移除／異動的列統計**，純粹提示。
- 值比對只在**兩期共同欄位**（headers 交集）上進行；僅前期有的欄不參與值比對（其值視為不存在，不當成「被清空」的異動）；僅本期有的欄同理不參與值比對，但新增列的呈現仍會顯示該欄值（因為新增列本來就是本期資料的完整快照）。
- **欄名重複**（依 CSV_CONTRACT 第 2 節，parser 不自動改名去重）：若偵測到任一份 CSV 的 `headers` 有重複欄名，直接判定「無法進行 Key 比對」，用 `showToast()` 提示「偵測到重複欄名，請先用『CSV 健檢』（Day08）清理後再比對」，中止流程。這不是本題要解決的問題（Day08 `csv-doctor` 的健檢範圍），不在此重新實作偵測與提示以外的處理。

### 3. 值比較規則

依 CSV_CONTRACT 第 3.1 節「每一格都是 string，永不轉型」：**預設逐字元比較（`===`）**。`"100"` 與 `"100.0"` 算變更，前後空白差異也算變更——這是刻意的，因為契約明文空值只有 `''` 一種定義，任何寬鬆判定都是本題自行加料。

**不提供**「忽略前後空白後比較」選項。依 `CSV_CONTRACT.md` 第 2 節精神（逐字元比較，不做貼心修正），本題僅支援逐字元比較，不加開關。

### 4. Before/After 對照與 Highlight 呈現

沿用 Day07 `text-diff` 的並排呈現模式（`.diff-row` / `.diff-old` / `.diff-new` 樣式在 `VibeCoding/Day07_text-diff/src/index.html:240-266`，`swatch-modified` 色票在 `:207-210`），但呈現單位從「一句話」換成「一筆資料的一個欄位」：

- 新增／移除／異動三個結果區塊（各自可展開的清單，不做分頁籤切換複雜互動，維持簡單卡片堆疊，比照 Day07 `#result-list` 的單一垂直清單模式）
- 異動列：Before/After 並排顯示該筆改動的欄位（欄名 + 舊值 + 新值），改動欄位套用 `swatch-modified` 黃底 highlight；未改動欄位不特別顯示，避免資訊過載
- 新增列：只顯示本期完整欄位值（無「Before」欄可比）
- 移除列：只顯示前期完整欄位值（無「After」欄可比）
- 資料筆數多時：**分頁，每頁 50 筆**，不做虛擬捲動（PRD 沒要求，虛擬捲動是沒被要求的抽象，不做）。

### 5. 匯出

- **三份 CSV**（新增／移除／異動）：**分開下載**，各自一個按鈕，各自呼叫 `shared/csv-write.js` 的 `toCsv(table, opts)` 產生內容、`shared/io-download.js` 的 `downloadFile(filename, content, mime)` 下載。
  - **不使用 `io-zip.js` 打包成單一 zip**（已裁示）。依 `CSV_CONTRACT.md` 第 6 節模組歸屬表，`io-zip.js` 只有 Day10 欄位打勾，Day09 沒有；Day10（`csv-batch-splitter`）才是 ZIP 主場，本題不提前做成 ZIP 題。
  - 異動 CSV 的欄位設計：Key 欄 + 依欄名列出「欄位、舊值、新值」的長格式（一列 = 一個異動欄位），而不是把所有欄位攤成寬表——理由是異動筆數多時欄位數不固定，長格式較穩定好處理，也方便使用者在 Excel 直接篩選「欄位＝X」。
- **HTML 摘要報告**：獨立於 CONTRACT 第 6 節「下載本工具離線版」（`buildCleanHtmlCopy()`，清空使用者輸入、供分享空白工具）。這是**兩個不同的功能**：
  - `buildCleanHtmlCopy()`：工具本身的離線版，比對資料要清空（沿用 Day07 模式，`VibeCoding/Day07_text-diff/src/index.html:691-716`）
  - HTML 摘要報告：PRD 09 明列的產品功能，內容**含統計數字＋全部明細**（新增／移除／異動每一筆的完整清單，含 Key 重複／缺值警示清單，已裁示），是靜態組字串產生的獨立 HTML 檔（不含比對用的 script 邏輯，只是結果快照），透過 `downloadFile()` 下載，離線可看（符合 CONTRACT 第 8 節「下載 index.html 後斷網仍可用」的精神，但這裡是報告產物本身要離線可看，不是工具介面）

## v1 沿用與取捨

無 v1 版本（PRD 09 是 v2 新題，`2026-ironman-vibecoding-30-prd.md` 未列出對應 v1 舊題）。

**沿用 Day07 `text-diff` 的部分**（明確列出，`檔案:行號`）：

- 共用基底樣式：`VibeCoding/Day07_text-diff/src/index.html:8-144`（`shared/base.css` 內嵌區塊，`<style>` 標籤內、`/* ---- 本題（text-diff）專屬樣式 ---- */` 註解之前）直接複製，不改。
- **注意**：`html:145-299` 是 text-diff **專屬**樣式（含下列 swatch／diff-row／stat-row class），不是共用基底，本題不整段複製，只挑選下面列出的個別 class 沿用。
- 色票：`.swatch-added` / `.swatch-removed` / `.swatch-modified` / `.swatch-unchanged`（`VibeCoding/Day07_text-diff/src/index.html:207-210`），沿用色彩語意（綠=新增、紅=移除、黃=異動）。
- 並排呈現的 CSS 類別命名慣例：`.diff-row` / `.diff-old` / `.diff-new`（`VibeCoding/Day07_text-diff/src/index.html:240-266`，含 `.diff-added`/`.diff-removed`/`.diff-modified` 修飾類別），欄位 highlight 直接複用同一組色票，不重新設計色彩系統。
- 統計摘要卡片版面：`.stat-row` / `.stat-value`（`VibeCoding/Day07_text-diff/src/index.html:212-227`，`:342-348`）。
- `buildCleanHtmlCopy()` 的實作模式（clone `documentElement`、清空欄位、移除 `#__shared_toast` 與 `.nav-back`、`downloadFile()` 輸出）：`VibeCoding/Day07_text-diff/src/index.html:691-716`，欄位 id 改為本題的上傳/結果欄位。
- 共用模組呼叫方式：`escapeHtml()`、`showToast()`、`downloadFile()`、`copyToClipboard()` 的引用寫法（`VibeCoding/Day07_text-diff/src/index.html:369-373`）。

### 讀檔：拖放與檔案選取走同一條路，用 `io-dropzone.js` 的 `mode:'bytes'` + `gate`，不自寫拖放/選取邏輯

發現的問題是真的：`io-dropzone.js:31` 的預設行為呼叫 `FileReader.readAsText(file)`，瀏覽器會直接以 UTF-8 解碼成文字字串再交給 `onText` callback，這會**繞過** `csv-decode.js` 的 BOM／Big5 判定（CSV_CONTRACT 第 7.2 節）——Big5 編碼的 CSV 檔用 `readAsText` 讀會直接變亂碼，且沒有 `confidence` 資訊可回報給使用者做手動切換編碼的逃生口。CSV 上傳必須拿到原始 `ArrayBuffer` 交給 `decodeCsvBytes()`。

解法**不是**本題自寫一份拖放邏輯，也不是自己接 `<input type=file>` 的 `change` 事件——那正是 `shared/CONTRACT.md` 第 1 節要防的 drift，而且 Level 1b 五題會各複製一份，還會讓「拖放走閘門、選檔案繞過去」這種漏洞發生。依裁示（`LEVEL1B_RULINGS.md` 第 1 節第 2 項）與 CSV_CONTRACT 第 4 節，`io-dropzone.js` 已擴充 `mode:'bytes'` 與 `setupFilePicker()`，兩者共用同一組 `opts`（由前置工程 `csv-infra` 認領實作）：

```js
var opts = { mode: 'bytes', accept: ['.csv'],
             gate: function (file) { return checkCsvFileSize(file.size); } };
setupDropZone(dropEl, onArrayBuffer, opts);
setupFilePicker(fileInput, onArrayBuffer, opts);
```

`gate` 在**讀檔之前**執行，`!ok` 就走 `onError(message)`、完全不讀那份檔案；本題前期／本期兩個上傳區、拖放與檔案選取共四個進入點，全部套用同一組 `opts`（`gate` 各自綁各自上傳區對應的判定，兩區獨立，且互相讀取對方已存的 `size` 變數以判定合計門檻，見上方「1b. 大檔案門檻」）。單檔與合計兩道門檻都在 `gate` 回呼裡、於**讀檔之前**判定完畢；`onData` 只會在兩道門檻都通過後才被呼叫，拿到的 `ArrayBuffer` 才交給 `decodeCsvBytes()` → `parseCsv()`。**不自寫拖放/檔案選取邏輯。**

**明確不沿用**：

- jsdiff 相關的一切邏輯（見上方「為什麼不用 jsdiff」）。
- Day07 的「未變動摺疊」概念——本題結果清單本來就只列新增／移除／異動三類，不會出現「未變動」列（無異動的列本來就不進清單），沒有摺疊的必要。

## 影響範圍

### 新增檔案

- `VibeCoding/Day09_csv-period-diff/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day09_csv-period-diff/src/bundle.json`（資源清單；本題無需內嵌第三方 library，`shared/*.js` 走 `SHARED` 模式）
- `VibeCoding/Day09_csv-period-diff/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day09_csv-period-diff/bundle_manifest.json`（build 產物）
- `sdd/csv-period-diff/proposal.md`（本檔）
- `sdd/csv-period-diff/tasks.md`

### 修改檔案

- `VibeCoding/README.md`、`VibeCoding/index.html`（進度表與作品集清單加入本題，**收尾階段才動，不在本題實作範圍**）

### 不修改

- `VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/CSV_CONTRACT.md`、`VibeCoding/shared/*.js`（沿用既有簽名，不變動）
- `VibeCoding/Day07_text-diff/`（只讀取參考，不覆寫）

### 前提依賴（不在本題 tasks 範圍）

- `shared/csv-decode.js`／`csv-parse.js`／`csv-write.js`／`csv-types.js`（CSV_CONTRACT 第 6.1 節，前置工程 `sdd/csv-infra/`，本題開工前必須已完成並獨立驗收）
- `shared/io-dropzone.js` 的 `mode:'bytes'` 擴充（CSV_CONTRACT 第 4 節，由 `csv-infra` 認領實作，本題開工前必須已完成）
- 目前檢查 `VibeCoding/shared/` 尚未看到上述模組就緒，**本提案假設它們會在本題實作前就緒，若屆時仍未就緒，本題無法開工，須回報阻塞**

## 已裁示事項（`sdd/LEVEL1B_RULINGS.md`，不再列為爭議點）

- 三份匯出 CSV 分開下載，不打包 ZIP（Day10 是 ZIP 主場）
- 不提供「忽略前後空白」比較選項，逐字元比較
- Key 重複／Key 缺值只警示不阻擋
- 結果分頁每頁 50 筆
- HTML 摘要報告含統計＋全部明細
- Primary Key 支援多欄複選
- 拖放與檔案選取皆用 `io-dropzone.js` 的 `setupDropZone`／`setupFilePicker`（`mode:'bytes'` + `gate`），不自寫拖放/選取邏輯
- 組合鍵分隔符統一用 `\0`
- 大檔案門檻：單檔 ≤20MB 且兩檔合計 ≤20MB
