# Tasks：CSV Doctor & Cleaner（csv-doctor）

- [x] T1 建立 `Day08_csv-doctor/src/index.html` 版面骨架：上傳區（拖曳＋檔案選取 input，同時接 `shared/io-dropzone.js` 的 `setupDropZone(dropEl, onData, opts)` 與 `setupFilePicker(fileInput, onData, opts)`，兩者共用同一組 `opts = { mode: 'bytes', accept: ['.csv'], gate: function(file){ return checkCsvFileSize(file.size); } }`，不自行接 `<input>` 的 `change` 事件）、大檔案門檻提示區、Doctor 偵測結果區（分項清單，摺疊）、Cleaner 操作區（動作勾選＋去重複模式選擇）、預覽區、複製結果／下載結果／下載本工具離線版三個按鈕（`CONTRACT.md` 第 6 節基線）；套用 `shared/base.css`
  - 驗收：開啟頁面，畫面上可見上傳區、Doctor 結果區、Cleaner 操作區、預覽區、三個共通按鈕，`view-source` 確認 `setupDropZone` 與 `setupFilePicker` 都帶 `mode: 'bytes'` 與同一個 `gate` 函式（非省略、非舊版 `readAsText`）；`view-source` 找不到自行綁定 `fileInput.addEventListener('change', ...)` 的敘述

- [x] T2 串接 `checkCsvFileSize()` 與 `csv-decode.js`／`csv-parse.js`：`gate` 由 `setupDropZone`／`setupFilePicker` 在**讀檔之前**呼叫 `checkCsvFileSize(file.size)`；`level==='reject'` 時走 `onError(message)`，完全不讀檔、`onData` 不會被呼叫；`level==='warn'` 時顯示 `message` 後照常讀檔進 `onData`；`level==='ok'` 不提示。`onData` 收到已通過閘門的 `ArrayBuffer` 後交給 `decodeCsvBytes()` 解碼、再交給 `parseCsv()` 產出 `Table`，畫面顯示 `meta.encoding`、`meta.delimiter`、列數、欄數；`confidence: 'fallback'` 時顯示手動切換編碼的提示
  - 驗收：用拖放上傳一份 > 20MB 的 CSV，畫面顯示拒絕訊息且不解析（不出現列數/欄數等解析結果、`Table` 未建立，`decodeCsvBytes()` 未被呼叫）；改用檔案選取 input 上傳同一份 > 20MB 的 CSV，得到相同的拒絕結果（**選取路徑與拖放路徑同樣被閘門擋住**）；上傳一份 6MB 的 CSV，畫面先顯示「檔案較大，處理可能需要數秒」再完成解析並顯示列數/欄數；上傳一份 1MB 的 CSV，不出現任何大小提示，直接顯示解析結果

- [x] T3 實作 Doctor D1／D2／D2b／D3／D4：空值（`cell===''`，逐欄統計）、空白列（每格 `trim()` 後皆空字串）、空白欄（該欄所有 data rows 對應格 `trim()` 後皆空字串）、欄名重複（`headers` 逐字元完全相同）、欄數不一致（直接讀 `table.meta.raggedRows`）；逐項列出命中筆數與原始 `line` 號；點擊「開始健檢」觸發（按鈕觸發，非即時）
  - 驗收：上傳一份「有一欄全部儲存格皆為空字串」「有一列欄數少於表頭欄數」「表頭出現兩個逐字元相同的欄名」的 CSV 並點擊「開始健檢」，畫面分別列出該空白欄欄名、該列原始 `line` 號（欄數不一致）、重複的欄名與其欄位索引

- [x] T4 實作 Doctor D5：呼叫 `inferColumnTypes()`，`kind === 'number'` 且 `mismatchLines.length > 0` 才成立，直接用回傳的 `mismatchLines` 逐行列出原始值與 `line` 號，不自訂樣本數或比例門檻
  - 驗收：上傳一欄 9 成為純數字、1 成為文字 `"N/A"` 的欄位並健檢，該欄 `kind` 顯示為數值欄，`"N/A"` 所在列被列入「數值欄混入文字」並顯示其原始 `line` 號；上傳一欄 `kind` 為 `'text'` 的欄位（例如全部是英文地址），健檢結果不出現該欄在本項清單中

- [x] T5 實作 Doctor D8：呼叫 `inferColumnTypes()`，`kind === 'date'` 才進入本項判定。子項一（非日期值）：直接列出該欄 `mismatchLines` 對應的原始值與 `line` 號。子項二（格式異常）：對欄內符合白名單的格依契約 4.0b 六式分類樣式，取出現次數最多的樣式為該欄多數樣式，其餘樣式的格逐格列為「格式異常」並顯示原始值與 `line` 號；欄內僅出現單一樣式時不觸發子項二
  - 驗收：上傳一欄同時有 `2026/01/05`（多筆）與 `2026-1-5`（1 筆）的日期欄並健檢，該欄 `kind` 顯示為日期欄，`2026-1-5` 那格被列入「格式異常」並顯示 `line` 號，`2026/01/05` 各格不出現在格式異常清單；同一份資料中若日期欄裡另有一格是 `"abc"`，`"abc"` 出現在「非日期值」清單而非「格式異常」清單

- [x] T6 實作 Doctor D6／D7：前後空白（`cell.trim() !== cell`，含 header 與資料格）逐格標記；全半形差異（`/[！-～　]/`，即 `U+FF01–FF5E` + `U+3000`）逐格標記含全形字元的格，同一欄同時出現「含全形字元的格」與「純半形 ASCII 的格」時另標記該欄「全半形混用」
  - 驗收：上傳一份 header 為 `" Email "`（前後含空白）且某資料格為 `"Ａ１２３"`（全形英數字）的 CSV 並健檢，該 header 被列入「前後空白」，該資料格被列入「全半形差異」；若同一欄另有一格是純半形 `"A123"`，該欄額外標記「全半形混用」

- [x] T7 實作 Doctor D9／D10：整列完全重複（`cells.join('\0')` 組 key 比對，只比對 data rows，成員數 ≥2 才成組，列出重複組與 `line` 清單）；Group By 找重複（使用者指定一或多欄，原始字串值以 `\0` 組 key，不 trim、不做全半形正規化，只列出 count≥2 的分組，顯示重複次數與原始 `line` 清單）
  - 驗收：上傳一份含「姓名」「Email」欄、其中兩列姓名與 Email 皆相同的 CSV，在 Group By 指定「姓名＋Email」並點擊偵測，看到這兩列被列為同一個重複群組，顯示重複次數 2 與兩列的原始 `line` 號（對應 PRD 驗收條件 1）；另兩列除 Email 大小寫不同外其餘相同時，兩列不被列為同一組（因為逐字元比對，大小寫不同視為不同值）

- [x] T8 實作 Cleaner 動作與「預覽」：Trim（含「是否連同欄名一起清理」選項）／移除空白列／日期正規化（僅處理 `kind==='date'` 的欄，能解析出年月日者轉為 `YYYY-MM-DD`，無法解析者保留原樣並標記「無法自動修正」）／全半形正規化（`U+FF01–FF5E` 轉 `code point - 0xFEE0`，`U+3000` 轉 `U+0020`，含全形標點）／整列去重／Key 去重（三種保留模式：保留第一筆／保留最後一筆／只標記）。點擊「預覽」只計算受影響列數與 `line` 清單、不修改 working table；清單超過 50 筆時預設摺疊顯示前 50 筆＋「還有 N 筆」提示，可展開看到完整清單；「確認套用」在尚未執行過一次「預覽」，或預覽後又調整任何 Cleaner 選項時，維持 disabled
  - 驗收：勾選「整列去重、保留第一筆」後點擊「預覽」，看到受影響列數與 `line` 清單、working table 不變；未先點「預覽」，「確認套用」按鈕維持 disabled 無法點擊；點擊「預覽」後改動任一選項（例如切換保留模式），「確認套用」重新回到 disabled（對應 PRD 驗收條件 2 前半）

- [x] T9 實作「確認套用」：真正修改 working table（依 T8 已預覽的設定執行對應動作），套用後清空舊的 Doctor 結果並顯示「請重新偵測」提示，不自動重跑健檢
  - 驗收：完成一次「預覽」後點擊「確認套用」，working table 列數依保留模式正確減少（例如保留第一筆去重 2 筆重複列後，總列數少 1）；套用後畫面上原本的 Doctor 偵測結果清空並顯示「請重新偵測」提示，重新點擊「開始健檢」才會出現新結果（對應 PRD 驗收條件 2 後半）

- [x] T10 實作匯出與離線版：清理後 CSV（`{原檔名}_cleaned.csv`，走 `toCsv()` 預設 BOM）與問題資料報告 CSV（`{原檔名}_issues.csv`，欄位含問題類型、原始 `line` 號、欄位名稱、原始值、備註），兩者皆走 `shared/io-download.js`，檔名一律與上傳檔案不同；複製結果接 `shared/io-clipboard.js`；實作 `buildCleanHtmlCopy()` 清空已上傳 CSV 內容／working table／Doctor 偵測結果／Cleaner 預覽狀態／`#__shared_toast`，移除 `.nav-back` 與站內連結
  - 驗收：完成 Cleaner 套用後點擊「下載清理後 CSV」，下載檔名為 `{原檔名}_cleaned.csv`，與原始上傳檔名不同（對應 PRD 驗收條件 3）；點擊「下載問題資料報告」，下載的 CSV 內每一列對應一筆偵測到的問題，欄位含問題類型／`line`／欄位名稱／原始值／備註。
  - 驗收（`buildCleanHtmlCopy()` 離線版，`CONTRACT.md` 第 6 節硬性要求）：測試 CSV 一律改用哨兵值——資料格的值 `ZZDOCVAL`、欄名 `ZZDOCCOL`。完整操作一輪（上傳→健檢→Cleaner 預覽→套用，含觸發一次 toast）後點擊「下載本工具離線版」。分兩種判定方式，**不可混用**：
    **(甲) 原始碼精確搜尋，各須 0 筆**（這兩個字串不可能出現在工具程式／CSS／文案裡）：`ZZDOCVAL`、`ZZDOCCOL`。
    **(乙) DOM 層判定**（用 Playwright 載入下載到的離線版產物後斷言，⚠️ 不可用 grep）：
    (b1) `document.getElementById('__shared_toast') === null`；
    (b2) `document.querySelectorAll('.nav-back').length === 0`；
    (b3) 載入離線版時 `pageerror` 與 console error 皆為空。
    ⚠️ **`__shared_toast` 與 `.nav-back` 不可用原始碼 grep 判定**：`shared/ui-toast.js:4,7` 本來就含 `__shared_toast` 字串、`base.css` 本來就含 `.nav-back` 樣式規則，兩者都會被 `bundle.py` 內嵌進產物（`base.css` 若被字面搜尋 `.nav-back` 也會誤判命中），grep 為 0 筆字面上不可能成立，見 `CONTRACT.md` 第 6 節。

## T10 附帶的建置與整合驗收（非獨立任務，收尾時與 T10 一併完成）

建立 `src/bundle.json`，跑 `scripts/bundle.py` 產出 `index.html`／`bundle_manifest.json`；準備一份含「姓名+Email 重複」「數值欄混文字」「日期格式混用」「全半形混用」「空白欄」「欄數不一致」測試資料的 CSV，以 `file://` 與本機伺服器各測一次完整流程（上傳→健檢→預覽→確認套用→匯出→下載離線版）。

驗收：`scripts/bundle.py` 執行後產出 `index.html`，`file://` 開啟與本機伺服器開啟兩種方式，上傳測試 CSV 後健檢結果一致；另準備 4MB、6MB、21MB 三份 CSV，分別驗證「不提示直接處理」「顯示『檔案較大』提示後處理」「拒絕並顯示上限說明、不解析」三種門檻行為。
