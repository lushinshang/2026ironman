# 贅詞與 AI 味檢查器（filler-word-checker）

- PRD 對應：`sdd/filler-word-checker/PRD.md`（v2 需求基線漏收此題，本題補寫 PRD，格式對齊基線 PRD 03／PRD 04）
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- 互動模式：**按鈕觸發**（非即時），依據 `shared/CONTRACT.md` 第 5 節：「Day03 `filler-word-checker`：按鈕觸發，詞庫比對成本高，且結果需要穩定不跳動」

## 為什麼做

用 AI 協作寫初稿的人，定稿前常常沒清掉贅詞（基本上、其實）與 AI 生成文字常見的過渡語／抽象動詞（不僅如此、值得一提的是、賦能、打造）。這些詞單獨看沒問題，只有整篇統計上高頻出現才刺眼，人工逐句挑錯很花時間。此題是 v1 Day2 既有作品，v2 三十題需求基線漏收，本次補回並升級到 v2 的共用模組架構。

## Day01 vs Day03 的檢查項目邊界

兩題都吃純文字、都輸出「問題清單」，容易做重疊，邊界如下：

| 檢查項目 | 屬於哪一題 | 理由 |
|---|---|---|
| 中文字數／英文字數／總字元數 | Day01 | 客觀統計，與文字風格無關 |
| 行數／段落數／中英比例 | Day01 | 客觀統計 |
| 標點與空白統計 | Day01 | 客觀統計 |
| 連續空白、重複標點、多餘空白行 | Day01 | 客觀格式問題，規則不涉及詞義 |
| 過長段落提示 | Day01 | 純長度門檻，不判斷內容好壞 |
| 贅詞／AI 慣用語／抽象名詞詞庫比對 | Day03 | 需要語意分類的詞庫，屬文字風格判斷 |
| 高頻詞警示（AI 過渡語重複） | Day03 | 判斷「這詞在全文出現太多次是否像 AI 腔」，屬風格判斷，非單純計數 |
| 段落開頭同構偵測 | Day03 | 判斷「段落開頭句式是否重複到像模板化寫作」，屬風格判斷 |
| 引號內容排除 | Day03 專屬邏輯 | Day01 沒有詞庫比對，不需要排除引用內容 |

**沒有刻意重複的檢查項目。** 兩題共同點只在「輸入純文字、輸出問題清單、標示位置」這個外殼行為，實際判斷邏輯完全不同：Day01 全部是可計算的客觀指標（字數、空白數、標點重複），Day03 全部依賴使用者可編輯的詞庫與門檻，屬主觀风格判斷。段落層級的「過長段落」（Day01，看字數）與「段落開頭同構」（Day03，看句首用字）看似都碰段落，但判斷的維度不同（長度 vs. 重複句式），刻意保留分屬兩題，不合併。

## 要改什麼

### 功能本身（沿用 v1 Day2 九項功能，MVP 詳見 `PRD.md`）

- 主詞庫比對標記（贅詞／AI 慣用語／抽象名詞三分類，精確字串比對）
- 標記逐項勾選／取消，「執行刪除」才真正移除，直接改寫輸入區當下的文字（詳見 `PRD.md` MVP 節說明，不違反共通規則第 5 條）
- 高頻監測詞庫＋門檻標紅（僅提示不可刪）；同一詞彙同時在主詞庫時，分類色與可刪除性只依主詞庫，高頻只疊加標紅提示（詳見 `PRD.md`）
- 段落開頭同構偵測（僅提示不可刪）
- 引號內容排除偵測範圍
- 詞庫可編輯＋匯入／匯出 JSON（陣列格式，schema 見 `PRD.md`，**與 Day04 `zh-tw-localizer` 的物件式詞庫格式不通用**）
- 統計摘要、複製與下載
- **Level 1 共通 UI 基線**（`CONTRACT.md` 第 6 節，三項皆為本題必要任務，不算額外功能）：複製結果到剪貼簿（`io-clipboard.js`）、下載結果檔案（`io-download.js`）、下載本工具離線版（自行實作 `buildCleanHtmlCopy()`，清空輸入區文字／偵測結果／詞庫編輯狀態、移除 `.nav-back` 與站內連結）

### v1 沿用與取捨（`VibeCoding/old/Day2/index.html`，行號已逐一 `sed -n` 核對）

**直接複用、改走共用模組（Day01 已建立 `shared/*.js`，本題延用同一份）：**

- `escapeHtml(str)`（279-286 行）：5 個字元、順序固定（`& < > " '`），與 `CONTRACT.md` 第 3 節 `util-escape.js` 簽名完全一致，直接改用 `shared/util-escape.js`。
- `showToast(msg)`（520-525 行，硬編 2200ms）：改用 `shared/ui-toast.js` 的 `showToast(msg, ms)`，`ms` 用共用模組預設值（2000ms，Day01 已定案），v1 的 2200ms 不特別保留。
- 下載邏輯（596-628 行，三處手刻 `Blob` + `createElement('a')` + `revokeObjectURL`，用於「下載處理後 .txt」「匯出主詞庫」「匯出高頻詞庫」）：三處合併改用 `shared/io-download.js` 的 `downloadFile(filename, content, mime)`，`mime` 對 txt 用預設值、對 JSON 匯出傳 `application/json;charset=utf-8`。
- 拖曳讀檔（470-500 行，`setupDropZone(colId, textareaId, fileNameId)`）：**簽名要改**。v1 是「傳三個 DOM id、內部自己查找元素」；`CONTRACT.md` 第 3 節的 `shared/io-dropzone.js` 簽名是 `setupDropZone(dropEl, onText, opts)`（傳元素本身、讀檔成功時呼叫 `onText(textContent, fileName)`，`opts.accept` 限制副檔名、`opts.onError` 處理錯誤）。呼叫端要跟著改寫，但「拖曳僅接受 .txt/.md、非法副檔名時提示」這個行為原樣保留，改用 `opts.accept: ['.txt', '.md']` 表達。

**邏輯保留、不升級為共用模組（只在本題內部用，未達到「第 2 次出現才升級」門檻）：**

- 引號範圍偵測 `findQuoteRanges`（308-315 行，v1 正則 `/「[^」]*」|『[^』]*』|"[^"]*"/g`）：**v2 補上彎引號 “ ”**，正則改為 `/「[^」]*」|『[^』]*』|"[^"]*"|“[^”]*”/g`，共四組成對符號。未閉合引號（只有開頭符號、掃描到文字結尾找不到對應結尾符號）視為不成對、不產生 match，其後文字照常參與偵測（正則本身天然行為，不需額外分支處理）
- 詞庫比對 `findDictMatches`（326-351 行，`indexOf` 精確比對＋重疊範圍去重＋依起點排序）
- 高頻詞統計 `computeFreqWarnings`（355 行起，`indexOf` 迴圈計數＋門檻比對）
- 段落開頭同構 `computeParaWarnings`（384 行起，先 `stripQuotes` 排除引號區再切段比對）

以上四個函式是 Day03 專屬的風格判斷邏輯，非通用工具，維持寫在 `Day03_filler-word-checker/src/index.html` 內，不進 `shared/`。

**v1 沒有、本題新寫或需補強：**

- 匯入 JSON 詞庫時的格式錯誤處理：v1 已有 try/catch＋`showToast('匯入失敗：檔案格式錯誤')`（631-660 行附近），但只做到「JSON.parse 失敗」的錯誤，**沒有驗證匯入內容的資料結構**（例如匯入的 JSON 是陣列但物件缺 `word`/`type` 欄位、或匯入的是不相關的 JSON 也會被當成詞庫吃進去）。本題會補上結構驗證：每筆需有詞彙與合法分類（分類需屬三選一），不符合格式的項目忽略並提示筆數，而非整包失敗或整包吃進去當空字串比對。

### 資料格式（依 `CONTRACT.md` 第 4 節 `escape_mode`）

- 內建初始詞庫（主詞庫、高頻監測詞庫）在 build 時走 `json_string` 模式：`JSON.stringify` 成單一字串常數，程式端自己 `JSON.parse`。**不使用 v1 的 backtick template literal**（`CONTRACT.md` 明文警告：資料含反引號或 `${` 會炸模板語法；主詞庫詞彙如「賦能」本身不含特殊字元，但使用者自訂詞庫沒有這個保證，一律走 `json_string` 才安全）。
- 詞庫 JSON schema（匯入／匯出／內建初始值一致）：主詞庫為 `[{ "word": string, "type": "贅詞"|"AI 慣用語"|"抽象名詞" }]` 陣列；高頻監測詞庫為 `[{ "word": string }]` 陣列。**此格式與 Day04 `zh-tw-localizer` 的自訂詞庫格式（物件鍵值對 `{"原詞":"替換詞"}`）不通用，兩者用途不同**（本題是分類標記詞庫，Day04 是一對一替換對照表），不得預期兩題匯出檔互通。

## 影響範圍

### 新增檔案

- `VibeCoding/Day03_filler-word-checker/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day03_filler-word-checker/src/bundle.json`（資源清單）
- `VibeCoding/Day03_filler-word-checker/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day03_filler-word-checker/bundle_manifest.json`（build 產物）
- `VibeCoding/Day03_filler-word-checker/PRD.md`（複製 `sdd/filler-word-checker/PRD.md` 內容，依既有題目慣例放在作品資料夾內）
- `sdd/filler-word-checker/PRD.md`（本次已建立）
- `sdd/filler-word-checker/proposal.md`（本檔）
- `sdd/filler-word-checker/tasks.md`

### 修改檔案

- `VibeCoding/README.md`、`VibeCoding/index.html`（進度表與作品集清單加入本題，**收尾階段才動，不在本題實作範圍**）

### 不修改

- `VibeCoding/old/Day2/index.html`（v1 原始檔，只讀取參考，不覆寫）
- `VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/*.js`（沿用 Day01 已建立的既有簽名，不變動）

### Library / API

無外部 library、無 API 呼叫，全程 browser-side 原生 JS。
