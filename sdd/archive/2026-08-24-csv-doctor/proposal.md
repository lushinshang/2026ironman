# CSV Doctor & Cleaner（csv-doctor）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 08`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/csv-doctor/`
- 產品目錄：`VibeCoding/Day08_csv-doctor/`
- 資料層依據：`VibeCoding/shared/CSV_CONTRACT.md`（全文，`csv-decode.js`／`csv-parse.js`／`csv-write.js`／`csv-types.js` 由 `sdd/csv-infra/` 前置工程建立，本提案假設其已就緒，不重複建立）
- 互動模式：**按鈕觸發**（依 `shared/CONTRACT.md` 第 5 節精神：CSV 健檢牽涉多欄逐格掃描，成本高且結果須穩定，比照 Day03/Day04/Day07 走按鈕觸發，非即時 debounce）

## 為什麼做

CSV 常見問題不是不能開，而是空值、重複、日期與型別問題藏在資料內，Excel 開檔看不出來。本題把「找問題」（Doctor）與「修問題」（Cleaner）分離：Doctor 只偵測、不動資料；Cleaner 的每個動作都對應明確的 Doctor 項目，且刪除前一律先預覽。

本題是 Level 1b 五題之首，Doctor 的偵測規則若定義含糊，後面四題（`csv-period-diff`／`csv-batch-splitter`／`csv-pivot-dashboard`／`csv-one-page-report`）都會跟著歪，因此以下每一項判定規則寫死到可以直接照著實作，不留「視情況」。

## 與 CSV_CONTRACT.md 第 2 節的關係

契約第 2 節規定 parser「忠實還原，不修正，不猜測，不轉型」，理由直接點名本題：「`csv-doctor`（Day08）的產品價值，就是把資料裡的髒東西找出來給人看……如果 parser 自作主張把這些修好了，Day08 就沒有東西可以偵測。」

也就是說：`parseCsv()` 回傳的 `Table` 保留了重複欄名、欄數不一致的列、原始空白、原始全半形字元、未轉型的字串——這些「未修正」正是 Doctor 要偵測的原始素材。Doctor 的偵測邏輯建立在「parser 絕不搶先修正」這個前提上；若哪天 parser 改行為（例如自動 trim），本題的偵測項目會直接失效，這是刻意的耦合，不是巧合。

## Doctor：每個偵測項目的精確判定規則

以下規則的輸入一律是契約第 3 節定義的 `Table`（`headers: string[]`、`rows: {line, cells}[]`、`meta`）。「逐格」指同時掃描 `headers` 與每個 `row.cells`，除非特別註明只限資料格。

### D1 空值
- 定義依契約第 3.2 節：`cell === ''`（空字串，不含只有空白的格）。
- 逐欄統計空值數與空值所在的 `line` 清單；逐列統計含空值的欄位數。

### D2 空白列
- 判定：該列 `cells` 中每一格 `trim()` 後皆為空字串（涵蓋真空字串與純空白格），且 `cells.length >= 1`。
- 與「欄數不一致」（D3）各自獨立判定、可同時成立（一列若只有 1 格且是空字串，`cells.length !== headers.length` 時，同時出現在 D2 與 D3 的清單，兩份清單不互斥合併）。

### D2b 空白欄
- 判定：該欄（含 header 對應的資料欄，不含 header 本身）所有 data rows 的對應格，`trim()` 後皆為空字串。
- 逐欄列出是否為空白欄；空白欄仍計入 D1 的欄空值統計，兩項不互斥。

### D3 欄數不一致（ragged rows）
- **來源**：`CSV_CONTRACT.md` 第 3.1 節明文列為 Day08 健檢項目（「這正是 Day08 的健檢項目」）。已裁示列入，不再是爭議點。
- 判定：直接讀 `table.meta.raggedRows`（`cells.length !== headerCount` 的列，其 `line` 清單），不重新計算。

### D4 欄名重複
- 判定：`headers` 陣列中，兩個以上元素**逐字元完全相同**（含大小寫、含前後空白，不做任何正規化比對）。
- 刻意不做大小寫不敏感或 trim 後比對——那屬於「模糊比對」，PRD「不做」段落已排除。若 `"Email"` 與 `"Email "` 兩欄名不同（因為有無空白），各自視為獨立欄名，不算重複；但會被 D6「前後空白」單獨標出。

### D5 數值欄混入文字
- 使用契約第 4 節 `inferColumnTypes(table)`，逐欄取 `{ kind, sampleSize, matched, mismatchLines }`。
- **是否為「數值欄」直接採用回傳的 `kind === 'number'`**，判定門檻（樣本數 < 3 視為 `text`、可解析比例 ≥ 0.9 才判為 `number`）已在契約第 4.0b 節統一定義，本題不自訂、不重算。
- 成立條件：`kind === 'number'` 且 `mismatchLines.length > 0`。
- 呈現：逐行列出 `mismatchLines` 對應的原始值與 `line` 號（`mismatchLines` 由 `inferColumnTypes()` 直接提供，不在本題重新計算哪些格不符合）。
- `kind !== 'number'`（含 `'text'`、`'date'`）則不觸發本項；本題不偵測「文字欄混入數字」這種相反情況。

### D6 前後空白
- 範圍：**同時涵蓋 header 與資料格**（PRD 未限定範圍，本提案採廣義認定，因為欄名前後空白在 Excel 複製貼上時同樣常見）。
- 判定：`cell.trim() !== cell`。逐格列出（header 用欄位索引標示，資料格用 `line` + 欄位索引標示）。

### D7 全半形差異
- **全形字元定義**：Unicode 範圍 `U+FF01–FF5E`（全形 ASCII 對應區，含全形英數字、全形標點）與 `U+3000`（全形空白）。正則：`/[！-～　]/`。
- 格層級判定：儲存格（含 header）只要含一個以上上述字元，即標記「含全形字元」，列出比對到的字元。
- 欄層級判定：同一欄中，若同時存在「含全形字元的格」與「內容為純半形 ASCII（`/^[\x21-\x7E\x20]*$/`）的格」，額外標記該欄「全半形混用」。
- 不判定「全形與半形哪個才正確」，只回報「有沒有混用」，修正判斷交給 Cleaner。

### D8 日期格式異常
D8 只處理「該欄已判定為日期欄」的情況，是否為日期欄與「格式不符合日期」是兩個不同問題，依契約第 4.0b 節末段分開處理，不合併成一項：

- **是否為日期欄**：直接用 `inferColumnTypes(table)` 回傳的 `kind === 'date'`，判定門檻（樣本數、比例、白名單六式）已在契約第 4.0b 節統一定義，本題不自訂、不重算。
- **欄內有格子不符合日期白名單**（例如日期欄裡混了一格 `"abc"` 或民國年 `115/08/23`）：這屬於「日期欄混入非日期值」，資料來源是 `mismatchLines`（`inferColumnTypes()` 直接提供），呈現方式與 D5 相同——逐行列出 `mismatchLines` 對應的原始值與 `line` 號，歸類在本項的「非日期值」子清單。
- **日期格式異常（本項的核心，重新定義）**：欄位已判定為 `kind === 'date'`，且**該欄符合白名單、但彼此樣式不同**的格同時存在。判定法：
  1. 對該欄每一個符合白名單的格，依契約 4.0b 六式判定其所屬樣式類別（`YYYY-MM-DD`／`YYYY/MM/DD`／`YYYY-M-D` 或 `YYYY/M/D`／`YYYYMMDD`／`YYYY-MM` 或 `YYYY/MM`／`YYYY` 四碼，共 6 類，`-` 與 `/` 版本視為同一大類、不同分隔符）
  2. 若同一欄出現 2 種以上樣式類別，該欄標記「格式異常」；欄內所有符合白名單、但樣式類別不等於該欄「多數樣式」（出現次數最多的類別，同票時取欄內第一次出現者）的格，逐格列為異常，顯示原始值與 `line` 號
  3. 例：同一欄同時有 `2026/01/05`（`YYYY/MM/DD` 類）與 `2026-1-5`（`YYYY-M-D` 類），兩種樣式都出現，該欄標記格式異常；假設 `YYYY/MM/DD` 類出現次數較多，則 `2026-1-5` 這格列為異常
- 欄位若非日期欄（`kind !== 'date'`），完全不觸發本項（不論是「非日期值」子項或「格式異常」子項）。
- **本項不等於「不在白名單」**：不在白名單的格是上面第二點的「非日期值」問題，屬於資料錯誤；本項「格式異常」是白名單內部的樣式不一致，屬於格式一致性問題，兩者分開列出，不合併成單一清單。

### D9 整列完全重複
- 判定：兩個以上 data rows 的 `cells` 陣列長度相同，且逐格 `===` 完全相同（不 trim、不忽略大小寫）。
- 實作用 `cells.join('\0')` 組 key 比對（`\0` 不會出現在 CSV 文字內容中，避免 `["a,b"]` 與 `["a","b"]` 這類邊界誤判）。
- 只比對 data rows，不含 header（header 重複是 D4）。
- 每組重複列出全部成員的原始 `line` 號與重複次數（成員數 ≥ 2 才算一組）。

### D10 Group By 找重複
- 使用者指定一或多欄（依欄名或欄索引）。
- Key 組成：指定欄位的原始字串值（**不 trim、不做全半形正規化**——若使用者想先清乾淨再抓重複，應先跑 Cleaner 的對應動作再重新 Doctor，Doctor 本身不做任何隱性修正，理由同契約第 2 節）。
- 多欄 key 用同樣的 `\0` 分隔符（契約第 4.0c 節統一規定）組合，避免欄位值本身含逗號造成的誤判。
- 只回報 count ≥ 2 的分組；每組顯示：Key 值、重複次數、成員的原始 `line` 號清單（依契約第 3.1 節，`line` 是原始檔案行號，不是列序，因為引號內含換行時一列可能跨多行）。

## Cleaner：每個動作對應的 Doctor 項目

| Cleaner 動作 | 對應 Doctor 項目 | 說明 |
|---|---|---|
| Trim | D6 前後空白 | 逐格 `trim()`，提供選項「是否連同欄名一起清理」（預設開啟，可關閉） |
| 移除空白列 | D2 空白列 | 直接從 working table 移除判定為空白列的列 |
| 日期基本正規化 | D8 日期格式異常 | 只處理已判定為「日期欄」的欄位；能以寬鬆格式解析出年/月/日三個成分的格，正規化為標準格式 `YYYY-MM-DD`（月日補零）；**完全無法解析寬鬆格式的格保留原樣，標記「無法自動修正」**，不猜測 |
| 全半形正規化 | D7 全半形差異 | 逐格把 `U+FF01–FF5E` 範圍字元轉回半形（`code point - 0xFEE0`），`U+3000` 轉半形空白 `U+0020`；不做語意判斷，純字元對映 |
| 整列去重 | D9 整列完全重複 | 保留規則見下方三模式 |
| 依指定 Key 去重 | D10 Group By 找重複 | 保留規則見下方三模式 |
| 匯出問題資料與清理後 CSV | 全部 | 見下方「匯出」 |

**故意不提供自動修的 Doctor 項目**（PRD「不做」段落已排除「模糊比對後自動合併」與「AI 猜正確值」，以下都屬於同一類風險）：

- **D1 空值**：不提供「自動填值」，填什麼值必然是猜測。
- **D3 欄數不一致**：不自動補齊或截斷，補什麼值、丟哪個值都是猜測，且契約第 2 節明文「欄數不一致的列不丟棄、不補齊」。
- **D4 欄名重複**：不自動改名（例如加 `_1` 後綴），改名等於系統代替使用者決定新名字，且會把問題藏起來，違反契約第 2 節精神。
- **D5 數值欄混入文字**：不自動刪除或轉換該格，刪除或轉型都是猜測使用者意圖。

## 去重複的三種保留模式（D9 整列去重、D10 Key 去重共用定義）

- **保留第一筆**：同一組（重複列組 / 相同 Key 組）內，`line` 號最小的一筆保留，其餘從 working table 移除。
- **保留最後一筆**：`line` 號最大的一筆保留，其餘移除。
- **只標記**：不移除任何列；working table 不變，僅在預覽與匯出的「問題資料報告」中標出每組成員與重複次數，供人工檢視後自行處理。此模式下「清理後 CSV」與原始 CSV 筆數相同（因為沒有真的刪除），只有「問題資料報告」會列出標記結果。

## 刪除前預覽（PRD 驗收條件第 2 條）—— UI 流程

這是本題最重要的安全設計，流程拆成「預覽」與「套用」兩個獨立步驟，中間必須使用者手動確認：

1. 使用者在 Cleaner 區勾選要執行的動作（可複選 Trim／移除空白列／日期正規化／全半形正規化），或在去重複區選擇模式（整列去重 / Key 去重）與保留規則（第一筆／最後一筆／只標記）。
2. 點擊「**預覽**」：**不修改 working table**，只計算並顯示「這次套用會影響幾筆」——受影響列數、以及受影響列的原始 `line` 號清單。清單超過 **50 筆**時預設摺疊，只顯示前 50 筆與「還有 N 筆」提示，並提供「展開全部」可看到完整清單，不做截斷省略導致看不到全部。
3. 使用者檢視預覽結果後，點擊「**確認套用**」按鈕才會真正修改 working table。「確認套用」按鈕在尚未執行過一次「預覽」前維持 disabled，防止跳過預覽直接刪除。
4. 若使用者在預覽後又調整了任何 Cleaner 選項，「確認套用」重新回到 disabled，必須重新「預覽」一次才能再次啟用——避免使用者看的預覽跟實際套用的設定不一致。
5. 套用後，working table 更新，Doctor 結果需要重新掃描才會反映最新狀態（不自動重跑，避免「動了資料還沒重新健檢」跟「已經重新健檢」兩種狀態混淆——由使用者主動點「重新偵測」）。

## 匯出（PRD 驗收條件第 3 條：不覆寫原始 CSV）

- **清理後 CSV**：working table 目前狀態，走 `toCsv()`（`opts.bom` 用預設 `true`），檔名固定為 `{原檔名}_cleaned.csv`（原檔名去副檔名後綴接尾碼），絕不使用與上傳檔案相同的檔名下載。
- **問題資料報告**：CSV 格式，每一列對應一筆偵測到的問題（欄位含：問題類型、原始 line 號、欄位名稱、原始值、備註），檔名 `{原檔名}_issues.csv`。
- 兩份匯出各自獨立觸發下載，互不影響、皆不覆寫使用者原始上傳的檔案（瀏覽器端本來就無法覆寫本機檔案，但檔名與下載提示文案要明確傳達「這是新檔案」）。

## Level 1 共通 UI 基線（`CONTRACT.md` 第 6 節，必要任務非額外功能）

- 複製結果到剪貼簿：`shared/io-clipboard.js`（複製 Doctor 摘要文字或問題清單文字）。
- 下載結果檔案：`shared/io-download.js`（承載上方兩份 CSV 匯出）。
- 下載本工具離線版：自行實作 `buildCleanHtmlCopy()`，清空已上傳的 CSV 內容、working table、Doctor 偵測結果、Cleaner 預覽狀態、`#__shared_toast` 元素、移除 `.nav-back` 與站內連結。

## 大檔案門檻（`CSV_CONTRACT.md` 第 5 節，直接套用不自訂）

- 門檻：< 5MB 直接處理，不提示；5–20MB 處理，但先顯示「檔案較大，處理可能需要數秒」；> 20MB **拒絕並明確說明上限**，不解析。門檻以原始位元組（`File.size`）計，本題不自行放寬或收緊。
- 實作流程：拖放與檔案選取皆接 `shared/io-dropzone.js` 的 `setupDropZone(dropEl, onData, opts)` 與 `setupFilePicker(fileInput, onData, opts)`，**兩條路徑吃同一組 `opts`**，不自寫拖放邏輯、不自行接 `<input type=file>` 的 `change` 事件：
  ```js
  var opts = { mode: 'bytes', accept: ['.csv'],
               gate: function (file) { return checkCsvFileSize(file.size); } };
  setupDropZone(dropEl, onData, opts);
  setupFilePicker(fileInput, onData, opts);
  ```
  `gate` 在**讀檔之前**執行：`!ok` 時走 `onError(message)`，中止流程、完全不讀檔，不進入 `decodeCsvBytes()`／`parseCsv()`；`ok` 為 `true` 但 `level === 'warn'` 時顯示 `message` 後繼續；`level === 'ok'` 不提示直接繼續。
- `onData` 收到的是已通過閘門的 `ArrayBuffer`，交給 `decodeCsvBytes()` 解碼、再交給 `parseCsv()` 產出 `Table`。本題不在拿到 `ArrayBuffer` 之後才檢查大小。

## 影響範圍

### 新增檔案
- `VibeCoding/Day08_csv-doctor/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day08_csv-doctor/src/bundle.json`
- `VibeCoding/Day08_csv-doctor/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day08_csv-doctor/bundle_manifest.json`（build 產物）
- `VibeCoding/Day08_csv-doctor/PRD.md`（複製 PRD 08 段落內容，依既有題目慣例放在作品資料夾內）
- `sdd/csv-doctor/proposal.md`（本檔）
- `sdd/csv-doctor/tasks.md`

### 依賴、不在本題範圍內建立
- `shared/csv-decode.js`／`csv-parse.js`／`csv-write.js`／`csv-types.js`：由 `sdd/csv-infra/` 前置工程建立，本題直接引用其契約第 4 節簽名。

### 不修改
- `VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/CSV_CONTRACT.md`（沿用既有定案，不變動）
- `VibeCoding/README.md`、`VibeCoding/index.html`（進度表更新留待收尾階段，不在本題實作範圍）

### Library / API
無外部 library、無 API 呼叫，全程 browser-side；CSV 解析走 `shared/csv-parse.js`（內嵌 Papa Parse 5.6.0，由 csv-infra 提供）。

## 爭議點（已由 `sdd/LEVEL1B_RULINGS.md` 裁示，記錄裁定結果，不再是開放問題）

- Doctor 偵測項目：**一次全跑，不做勾選**。效能問題交給契約第 5 節大檔案門檻擋（> 20MB 直接拒絕），不在本題另做分批執行。
- D3「欄數不一致」：**列入**偵測項目（`CSV_CONTRACT.md` 第 3.1 節明列為本題健檢項目）。
- D5／D8 判定「數值欄」「日期欄」的門檻：**不自訂**，直接採用 `inferColumnTypes()` 回傳的 `kind`，門檻定義統一在契約第 4.0b 節。
- D8「日期格式異常」的定義：**不是「不在白名單」**，已重新定義為「該欄已判定為 `kind='date'`，但欄內混用多種樣式」，見上方 D8 說明。
- D7 全半形範圍：**採納** `U+FF01–FF5E` + `U+3000`（含全形標點）。
- Cleaner 全半形正規化：**包含全形標點**，不限定僅轉全形英數字。
