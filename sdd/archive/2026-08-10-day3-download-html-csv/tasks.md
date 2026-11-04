# 任務：Day3 文字差異比對器 —— 下載為 HTML、CSV

- [x] 1. 新增 `escapeHtml(str)` 輔助函式（轉義 `&`、`<`、`>`、`"`、`'`），並用手動測試案例確認含 `<script>alert(1)</script>`、`&`、`"` 的輸入字串轉義後不會被瀏覽器當標籤/實體解析
- [x] 2. 新增 `buildHtmlReport(rows, counts)`：輸出獨立可離線開啟的 HTML 字串（內嵌 CSS，重用 `type-added`/`type-removed`/`type-modified`/`type-unchanged` 配色），所有句子內容經 `escapeHtml` 處理後才拼入字串；掛到 `window.Day3App.buildHtmlReport`
- [x] 3. 新增 `escapeCsvField(field)` 輔助函式（RFC 4180：含逗號/雙引號/換行時用雙引號包住，內部雙引號轉成 `""`），新增 `buildCsvReport(rows, counts)`（欄位：類型、舊版內容、新版內容，開頭加 UTF-8 BOM），掛到 `window.Day3App.buildCsvReport`
- [x] 4. 在 UI 新增「下載差異報告 HTML」「下載差異報告 CSV」兩顆按鈕（沿用現有 MD 下載按鈕的樣式與位置邏輯），各自綁定 click handler：檢查 `window.Day3App.lastRows` 存在、呼叫對應 build 函式、包 Blob（HTML 用 `text/html;charset=utf-8`、CSV 用 `text/csv;charset=utf-8`）、觸發下載（檔名分別為 `差異比對報告.html`、`差異比對報告.csv`）、`revokeObjectURL`
- [x] 5. 用瀏覽器（Playwright，本機 http.server）實測：貼上含特殊字元（`<`、`>`、`&`、`"`、逗號、換行）的測試資料執行比對，分別點擊 HTML／CSV 下載按鈕，讀取下載內容確認：(a) HTML 檔案用瀏覽器開啟能正確顯示比對結果且沒有破版或誤執行任何腳本 (b) CSV 檔案內容欄位正確轉義、逗號/引號/換行沒有把資料錯位到別的欄位
- [x] 6. 重新執行既有回歸測試（8 組斷句測試 + Round 1/2 新增測試），確認純新增函式沒有影響既有 `computeDiff`/`splitIntoSentences`/MD 下載邏輯

### 執行紀錄（2026-08-10）

- 任務 1-3：`node --check` 語法通過；透過 `window.Day3App` 直接呼叫 `buildHtmlReport`/`buildCsvReport`，貼入含 `<script>alert(1)</script>`、`"引號"`、`,逗號` 的測試字串，確認 HTML 輸出中 `<script>` 被轉成 `&lt;script&gt;`（`htmlContainsRawScript: false`、`htmlContainsEscapedScript: true`），CSV 輸出中含逗號/引號的欄位被正確包上雙引號且內部引號轉成 `""`。
- 任務 4-5：實際用 Playwright 點擊真實按鈕觸發瀏覽器下載（非模擬），確認事件記錄「Downloading file 差異比對報告.html/csv ... Downloaded」；讀取實際下載檔案內容，HTML 檔案結構完整、GPU 表格反例正確拆分成對應列；CSV 檔案以 `xxd` 確認開頭三個位元組為 `ef bb bf`（UTF-8 BOM）。另外把 HTML 報告單獨存成檔案、用瀏覽器開啟，確認 `document.querySelectorAll('tbody script').length === 0`（DOM 內沒有真的 `<script>` 元素）、無 dialog 跳出，證實 escape 生效、內容以純文字顯示而非被解析執行。未比對就點擊兩顆新按鈕，皆正確顯示「請先執行比對」提示。
- 任務 6：重跑 6 組既有回歸案例（頁碼標記整行/行內過濾、孤立標點合併、正常散文硬換行合併、「清單多行保留」既有限制、GPU 表格 Round 2 拆分行為），結果與修改前完全一致；`buildMarkdownReport` 也重新呼叫確認輸出正常，MD 下載功能未受影響。

## 驗收條件

1. 情境：當比對完成後點擊「下載差異報告 HTML」，就會下載一份可離線用瀏覽器直接開啟的 `.html` 檔案，內容清楚呈現新增/刪除/修改/未變動的顏色區分，且原始文字中的 `<`、`>`、`&`、`"` 等字元被正確轉義、不會破壞頁面結構或被當成標籤/腳本執行。
2. 情境：當比對完成後點擊「下載差異報告 CSV」，就會下載一份 UTF-8（含 BOM）的 `.csv` 檔案，用 Excel/Google Sheets 開啟時中文正常顯示、欄位對齊正確，即使原始內容含逗號、雙引號或換行也不會錯位到其他欄位或其他列。
3. 情境：尚未執行比對就點擊這兩顆新按鈕，行為與現有 MD 下載按鈕一致（顯示「請先執行比對」提示，不產生空檔案）。
4. 情境：重新執行既有回歸測試與既有 MD 下載功能，結果與本次改動前完全一致。

## fresh agent 獨立驗收（非自驗，2026-08-10）

結論：**全部通過**。逐條附證據：

1. HTML 轉義：貼入 `<script>alert(1)</script>`、`<img src=x onerror=alert(2)>`、`&`、`"`、`'`，下載檔案內容為 `&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;test&quot; &#39;quote&#39;`；把下載檔案放到 http server 下用瀏覽器實際開啟，`document.querySelectorAll('script').length === 0`，無 dialog 跳出。
2. CSV：`xxd` 確認前 3 bytes 為 `ef bb bf`（BOM）；欄位分隔為 `\r\n`；含逗號/雙引號/`\n`/`\r` 的合成測試資料輸出為 `"a,b""c\nd\re"`，用 Python `csv`（`utf-8-sig`）解析可正確還原成 3 欄，未錯位。
3. 未比對即點擊：下載按鈕本身位於比對前隱藏的 `#result-section`；直接呼叫 `.click()` 觸發 handler，toast 顯示「請先執行比對」，monkey-patch 攔截確認未觸發任何下載。
4. 正常比對後下載：Playwright `browser_click` 回傳 "Downloading file 差異比對報告.html/.csv ... Downloaded"，檔名符合規格。
5. 迴歸：`splitIntoSentences` 硬換行合併、分頁標記過濾、清單多行合併既有限制皆與原設計一致；既有 MD 下載按鈕正常，console 無 JS error。

另檢查函式/按鈕 ID 皆以 grep 實際確認存在（`escapeHtml` index.html:2395、`buildHtmlReport` :2412、`escapeCsvField` :2404、`buildCsvReport` :2441），HTML 報告中的統計數字為程式內部計算的 `Number`，非使用者可控字串，不構成轉義風險。測試產生的暫存檔案已清除，`Day3/` 目錄下未留垃圾檔案。
