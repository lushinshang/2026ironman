# Tasks：兩期清冊異動報告（csv-period-diff）

- [x] T1 建立 `Day09_csv-period-diff/src/index.html` 版面骨架：雙 CSV 上傳區（前期／本期，各含拖放區＋檔案選取 input，皆用 `setupDropZone`／`setupFilePicker` 綁定、不自行接 `<input>` 的 `change` 事件）、Key 欄位勾選清單容器（上傳完成後動態產生）、欄位結構差異卡片容器、「開始比對」按鈕、統計摘要卡、新增／移除／異動三個結果區塊容器、Key 重複／缺值警示區塊容器、下載按鈕列（新增 CSV／移除 CSV／異動 CSV／HTML 摘要報告／下載本工具離線版）；套用 `shared/base.css`
  - 驗收：以 `file://` 開啟 `src/index.html`，畫面上可看到兩個各自獨立的上傳區塊（各含拖放區與檔案選取 input）、一個「開始比對」按鈕、五個下載按鈕，且結果區塊在未比對前顯示空狀態文字（非空白 DOM）；`view-source` 確認兩個上傳區的拖放與 input 都各自呼叫 `setupDropZone`／`setupFilePicker` 並帶同一個 `opts`（含 `mode:'bytes'` 與 `gate`），找不到自行綁定 `addEventListener('change', ...)` 的敘述。

- [x] T2 前期／本期兩個上傳區各自維護一個模組層變數（`periodASize`／`periodBSize`，初始 `null`，記錄該區已通過單檔門檻的 `File.size`）；兩區的 `setupDropZone`／`setupFilePicker` 都帶 `opts = { mode:'bytes', accept:['.csv'], gate: fn }`，`fn(file)` 內先檢查 `checkCsvFileSize(file.size)`（單檔門檻），`!ok` 直接回傳（`onError(message)`、不讀檔、也不更新自己的 size 變數）；單檔 `ok` 時，若**另一區**的 size 變數已存有值，再檢查 `checkCsvFileSize(該值 + file.size)`（合計門檻），`!ok` 就回傳這個結果（訊息含「合計」字樣）、`onError` 觸發、**完全不建立這一份檔案的 `FileReader`**；合計也通過（或另一區尚未上傳過）才把 `file.size` 存進自己的變數並回傳 `ok`/`warn` 讓讀檔繼續；`gate` 全程只用 `file.size` 與已存的 size 變數判定，不等 `ArrayBuffer`。通過兩道門檻後才執行「`ArrayBuffer` → `decodeCsvBytes()` → `parseCsv()` → Table」；`confidence === 'fallback'` 時，除了 `showToast()` 之外，還在該區狀態列下方顯示常駐橫幅「偵測為 Big5，若顯示為亂碼請手動切換編碼：」並附「切換為 UTF-8」「切換為 Big5」兩顆按鈕（比照 `Day08_csv-doctor` 的 `#encoding-fallback` 作法，`state` 保留原始 `ArrayBuffer`）；兩顆按鈕分別以指定編碼重新解碼**同一份**檔案的 `ArrayBuffer` 並重建該區的 Table，**前期／本期各自獨立切換、互不影響另一區**；手動切換後橫幅文案改為「已手動切換為 {ENCODING}，如仍為亂碼可再切換：」且兩顆按鈕仍在，可來回切換；只要曾比對過，任一區切換編碼後**立即清空既有比對結果**（統計歸零、新增／移除／異動清單與 Key 重複／缺值警示都回到「尚未比對」），因為舊結果是根據換之前的解碼文字算出的，不重算不清空會誤導使用者，需使用者手動重按「開始比對」；解析後任一份 `headers` 有重複欄名時用 `showToast()` 阻擋並提示先用 CSV 健檢清理，不繼續往下
  - 驗收：情境一，用拖放上傳一份 21MB 的 CSV（單檔超標），畫面出現拒絕提示且不產生 Table、`decodeCsvBytes()` 未被呼叫；改用檔案選取 input 上傳同一份 21MB 的 CSV，得到相同的拒絕結果（**選取路徑與拖放路徑同樣被閘門擋住**）。
  - 驗收：情境二（客觀證明合計門檻在讀檔前，FileReader 完全未被呼叫），先把全域 `FileReader` 換成一個會計數建構次數的 stub（做法比照 `sdd/csv-infra/tasks.md` 任務 9 情境三）；上傳前期 12MB 的 CSV（單檔 `ok`，`FileReader` 建構次數變成 `1`，`periodASize` 存入 `12*1024*1024`）；接著上傳本期 12MB 的 CSV（單檔 `ok`，但合計 24MB 超標）：畫面出現含「合計」字樣的拒絕提示，本期的 `Table` 不產生，且 stub 的 `FileReader` 建構次數**維持在 `1`（不變成 2）**——證明本期的 `gate` 在合計判定失敗時完全沒有建立 `FileReader`，不是「讀完 `ArrayBuffer` 才丟掉」。
  - 驗收：情境三，上傳一份 headers 有兩個 `email` 欄的 CSV，畫面出現「請先用 CSV 健檢清理」提示，不產生可用於比對的 Table。
  - 驗收：情境四（手動切換編碼，per-file 獨立），上傳一份 Big5 編碼的前期 CSV，畫面該區出現「偵測為 Big5，若顯示為亂碼請手動切換編碼」橫幅與兩顆切換按鈕，另一區（本期）不受影響、無此橫幅；點擊「切換為 UTF-8」後，該區狀態列的編碼標示變成 `utf-8`（同一份檔案改以 UTF-8 重新解碼，畫面內容可見變化），本期區的資料與橫幅狀態不變；再點「切換為 Big5」可切回、內容還原。
  - 驗收：情境五（切換後比對結果清空），先完成一次成功比對（統計列出現非零數字），再對其中一區點擊編碼切換按鈕：畫面上統計摘要全部歸零、新增／移除／異動清單與兩個警示區塊都變回「尚未比對」，須重新點擊「開始比對」才會產生新結果。

- [x] T3 兩份都載入成功後，比較兩期 `headers`：算出交集（Key 候選＋值比對欄位）、僅前期有、僅本期有三個集合；僅前期有／僅本期有非空時，在「欄位結構差異」卡片列出對應欄名清單；Key 候選清單（headers 交集）渲染成可複選 checkbox
  - 驗收：本期 CSV 比前期多一欄「備註」，兩份都上傳完成後，「欄位結構差異」卡片顯示「僅本期有：備註」，且 Key 候選 checkbox 清單不包含「備註」。

- [x] T4 「開始比對」點擊時：若一個 Key 欄位都沒勾，`showToast()` 阻擋並提示「請至少選擇一個 Key 欄位」；否則用勾選欄位的值以 `\0` 分隔字元組出每列的 key 字串
  - 驗收：不勾選任何 Key checkbox 就點擊「開始比對」，畫面出現「請至少選擇一個 Key 欄位」提示，且不產生任何比對結果（結果區塊維持未比對狀態）。

- [x] T5 建立前期／本期各自的 `Map<key, Row[]>`（同 key 可能對應多筆，用陣列裝）；分類邏輯：`Map` 中 value 陣列長度 >1 的 key 或本身 key 字串含空值判定為「略過」（Key 重複或 Key 缺值兩類分開記錄，各自記下原始 `line` 號），從主流程移除；剩餘的 key，本期有前期無 → 新增；前期有本期無 → 移除；兩期都有且都恰好 1 筆 → 進入值比對（T6）
  - 驗收：前期有 Key=A、本期沒有 Key=A（其餘 Key 相同），點擊「開始比對」，Key=A 出現在「移除」清單，不出現在新增或異動清單。
  - 驗收：本期多出前期沒有的 Key=B，點擊「開始比對」，Key=B 出現在「新增」清單。
  - 驗收：前期 CSV 裡 Key=D 出現兩筆，點擊「開始比對」，這兩筆出現在「Key 重複，略過比對」警示清單，不出現在新增／移除／異動任何一類，統計摘要的新增／移除／異動數字不含這兩筆。
  - 驗收：勾選為 Key 的欄位有一列是空字串，點擊「開始比對」，該列出現在「Key 缺值，略過比對」警示清單，不進入新增／移除／異動任何一類。

- [x] T6 值比對：對每個進入比對的 key，取 headers 交集欄位逐字元比較（`===`）；有任一欄不同 → 該筆歸入「異動」，記錄每個不同欄位的欄名＋舊值＋新值；全部相同 → 歸入「無異動」（不進結果清單，只計入統計筆數）
  - 驗收：前期與本期都有 Key=C，且某個共同欄位值不同，點擊「開始比對」，Key=C 出現在「異動」清單，並顯示該欄位的舊值與新值。
  - 驗收：上傳兩份完全相同的 CSV（同樣的 headers 與所有列），點擊「開始比對」，新增／移除／異動清單皆為空，統計摘要的新增／移除／異動數字皆為 0。

- [x] T7 渲染結果：新增／移除／異動三區塊各自分頁顯示（每頁 50 筆，超過一頁時提供「上一頁／下一頁」）；異動列 Before/After 並排，改動欄位套用 `swatch-modified` 黃底樣式（沿用 `Day07_text-diff/src/index.html:207-210` 的 class 命名）；Key 重複／缺值警示區塊列出對應 key 與原始列號；統計摘要卡顯示新增／移除／異動／無異動／略過（重複）／略過（缺值）六個數字
  - 驗收：異動清單有 120 筆時，第一頁顯示 50 筆並出現「下一頁」按鈕，點擊後顯示第 51–100 筆。
  - 驗收：異動列中改動的欄位（例如「部門」）套用 `swatch-modified` 黃底樣式，未改動的欄位不套用該樣式。

- [x] T8 三個「下載 CSV」按鈕：各自把對應清單轉成 `shared/csv-write.js` 的 `toCsv(table, opts)` 輸入格式（異動 CSV 用長格式：Key 欄＋欄位名＋舊值＋新值，一列一個異動欄位），呼叫 `downloadFile()` 下載，檔名分別為 `added.csv`／`removed.csv`／`modified.csv`
  - 驗收：點擊「下載異動 CSV」，下載的 `modified.csv` 內容（欄位名、舊值、新值）與畫面顯示的異動清單一致。

- [x] T9 實作「下載 HTML 摘要報告」：組裝一份獨立靜態 HTML 字串（不含比對用 JS），內容含統計數字、Key 重複／缺值警示清單、新增／移除／異動**全部明細**（每筆 Before/After），透過 `downloadFile()` 下載為 `period-diff-report.html`；另外實作 `buildCleanHtmlCopy()`（工具本身離線版，清空兩份上傳資料與比對結果、移除 `.nav-back`、`#__shared_toast`，沿用 `Day07_text-diff/src/index.html:691-716` 模式），下載為 `period-diff-offline.html`
  - 驗收：點擊「下載 HTML 摘要報告」，以 `file://` 開啟下載的 `period-diff-report.html`，統計數字與新增／移除／異動每一筆明細皆正確顯示，不需連網。
  - 驗收（`buildCleanHtmlCopy()` 離線版，`CONTRACT.md` 第 6 節硬性要求）：前期／本期測試 CSV 一律改用哨兵值——資料格的值 `ZZDIFFVAL`、欄名 `ZZDIFFCOL`。完整操作一輪（上傳兩份→勾選 Key→開始比對，含觸發一次 toast）後點擊「下載本工具離線版」。分兩種判定方式，**不可混用**：
    **(甲) 原始碼精確搜尋，各須 0 筆**（這兩個字串不可能出現在工具程式／CSS／文案裡）：`ZZDIFFVAL`、`ZZDIFFCOL`。
    **(乙) DOM 層判定**（用 Playwright 載入下載到的 `period-diff-offline.html` 後斷言，⚠️ 不可用 grep）：
    (b1) `document.getElementById('__shared_toast') === null`；
    (b2) `document.querySelectorAll('.nav-back').length === 0`；
    (b3) 載入離線版時 `pageerror` 與 console error 皆為空。
    ⚠️ **`__shared_toast` 與 `.nav-back` 不可用原始碼 grep 判定**：`shared/ui-toast.js:4,7` 本來就含 `__shared_toast` 字串、`base.css` 本來就含 `.nav-back` 樣式規則，兩者都會被 `bundle.py` 內嵌進產物，grep 為 0 筆字面上不可能成立，見 `CONTRACT.md` 第 6 節。

- [x] T10 跑 `scripts/bundle.py` 產出 `Day09_csv-period-diff/index.html` 與 `bundle_manifest.json`；確認產出的 `index.html` 為單一檔案、以 `file://` 開啟可用
  - 驗收：以 `file://` 方式開啟 `Day09_csv-period-diff/index.html`，上傳兩份小型 CSV 並完成比對，瀏覽器開發者工具 Network 面板無對外請求。
