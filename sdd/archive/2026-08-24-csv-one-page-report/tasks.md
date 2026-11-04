# Tasks

- [x] 1. 建立 `VibeCoding/Day13_csv-one-page-report/src/index.html` 骨架：CSV 上傳區含拖放區＋檔案選取 input，兩者皆用 `shared/io-dropzone.js` 的 `setupDropZone(dropEl, onData, opts)` 與 `setupFilePicker(fileInput, onData, opts)` 綁定、共用同一組 `opts = { mode:'bytes', accept:['.csv'], gate: function(file){ return checkCsvFileSize(file.size); } }`，不自行接 `<input>` 的 `change` 事件；`gate` 在**讀檔之前**執行大檔案門檻判斷（<5MB 直接處理、5–20MB 顯示提示、>20MB 時 `!ok` 走 `onError` 完全不讀檔，`CSV_CONTRACT.md` 第 5 節），`onData` 收到已通過閘門的 `ArrayBuffer` 後交給 `decodeCsvBytes()`／`parseCsv()`；**檔案資訊列須顯示 `decodeCsvBytes()` 回傳的 `encoding` 與 `confidence`**，且 `confidence === 'fallback'` 時顯示「偵測為 Big5，若顯示為亂碼請手動切換編碼」提示並提供**手動切換編碼下拉**；使用者切換後以指定編碼重新 `TextDecoder` 解碼並把該次結果標記為 `confidence: 'manual'`（`CSV_CONTRACT.md` 第 4 節與 7.2 節，`'manual'` 不由 `decodeCsvBytes()` 產生，由本題自行標記）；measure/dimension/日期欄下拉；標題（maxlength 60）／期間（maxlength 40）／註記（maxlength 200）輸入框；「產生報告」按鈕；報表預覽區容器（KPI／Top5/Bottom5／分類占比／日期趨勢／無日期時的提示文字，五個區塊先放空殼）；`src/bundle.json`、`PRD.md`；套用 `shared/base.css`。
  驗收：(a) 上傳一份 <5MB 的測試 CSV，直接完成解析、不顯示大檔案提示，measure/dimension 下拉列出對應欄位。(b) 準備一份 5–20MB 的測試檔（可用重複列灌檔），上傳後畫面顯示「檔案較大，處理可能需要數秒」文字。(c) 用拖放上傳一份 >20MB 的測試檔，畫面顯示明確的上限拒絕訊息，且不進入解析流程（`decodeCsvBytes()` 未被呼叫）；改用檔案選取 input 上傳同一份 >20MB 檔案，得到相同的拒絕結果（**選取路徑與拖放路徑同樣被閘門擋住**）。(d) 標題欄輸入超過 60 字時無法再輸入（`maxlength` 生效）。(e) 上傳一份 Big5 編碼且**嚴格 UTF-8 解碼會失敗**的測試 CSV，確認檔案資訊列顯示 `confidence` 為 `fallback` 且出現手動切換提示與下拉；在下拉選 UTF-8 後畫面內容隨之改變（證明真的重新解碼、不是只改標籤），且資訊列的 `confidence` 變為 `manual`。**負向對照**：另上傳一份純 ASCII 的 CSV，確認 `confidence` 不是 `fallback`、不出現該提示——只驗「會出現」不驗「不該出現時不出現」的話，永遠顯示提示也會通過。

- [x] 2. 串接型別推論與欄位下拉：呼叫 `shared/csv-types.js` `inferColumnTypes(table)`，只把 `kind === 'number'` 的欄位列進 measure 下拉、只把 `kind === 'text'` 的欄位列進 dimension 下拉，不自加任何門檻；日期欄位處理：`kind === 'date'` 欄位數 = 0 時日期趨勢區塊隱藏並顯示「未偵測到日期欄位，此報告不含時間趨勢」，≥ 1 個時提供下拉並預設選第一個。
  驗收：準備一份含 1 個 `number` 欄、1 個 `text` 欄、1 個 `date` 欄、1 個非空樣本數 < 3 的欄（依契約 4.0b 應判定為 `text`）的測試 CSV：measure 下拉只出現該 `number` 欄；dimension 下拉只出現該 `text` 欄與樣本不足的欄，不出現 `number`／`date` 欄；日期下拉只出現該 `date` 欄且預設選中。另準備一份不含 `date` 欄的測試 CSV，畫面顯示「未偵測到日期欄位」文字而非空白或錯誤。

- [x] 3. 實作 KPI 計算函式：**取格一律用 `cellAt(row, i)`（`shared/csv-parse.js` 提供），不得直接寫 `row.cells[i]`**（`CSV_CONTRACT.md` 第 3.2.1 節：短列缺格直接取會拿到 `undefined`，`cell === ''` 為 `false`、`cell.trim()` 直接 TypeError）。本規則同樣適用任務 4、5。對核心 measure 欄計算 SUM/AVG/COUNT/MAX，計算前排除 `inferColumnTypes()` 標記為 `mismatchLines` 的格（非數值）與空值格（依 `CSV_CONTRACT.md` 第 3.2 節，空值＝空字串 `''`；僅含空白字元的格 `'  '` 不算空值，會被 `mismatchLines` 標記為非數值一併排除），並回傳「納入計算筆數 / 總筆數」。
  驗收：準備一份測試 CSV，其核心 measure 欄含正常數值、1 格空字串、1 格混入文字：人工手算 SUM/AVG/COUNT/MAX（排除該 2 格）與程式輸出比對一致，且畫面顯示的納入筆數 = 總筆數 − 2。另在同一份測資中加入一列**短列**（欄數少於 header，measure 欄整格缺席）：確認計算不拋例外、該列被當成空值排除、納入筆數再少 1；並 `grep -c 'row\.cells\[' src/index.html` 為 **0**（負向對照：故意改寫一處成 `row.cells[` 確認該指令會叫出來，再改回）。

- [x] 4. 實作 Top5/Bottom5 計算函式：依核心 dimension 分組、對核心 measure 做 SUM 聚合，穩定排序取前 5 / 後 5；分組數 < 5 時回傳實際筆數，不補空列。
  驗收：準備一份分類數 = 3 的測試 CSV，Top5/Bottom5 各自只回傳 3 筆且無空白列；另準備分類數 > 10 的測試 CSV，人工核對排序前 3 名與程式輸出一致。

- [x] 5. 實作分類占比計算函式：依核心 dimension 分組加總，依 `CSV_CONTRACT.md` 第 7.4b 節門檻——類別數 ≤ 9 時全部畫出，類別數 ≥ 10 時取前 8 大 + 其餘併為「其他」（固定灰階）；實作日期趨勢計算函式：對核心 `date` 欄位每一格一律呼叫 `CSV_CONTRACT.md` 第 4.0b 節共用的 `dateParts(s)` 取得 `{y, m, d}`（不符白名單回 `null`）取得年月日，**不得自行寫 regex/capture 另擷取年月日**；依 `y`／`m` 分組（月分組），日期範圍 < 31 天時退化為依 `y`／`m`／`d` 分組（日分組）；`dateParts()` 回傳 `m` 或 `d` 為 `null`（例如來源字串只有 `YYYY` 或 `YYYY-MM`）時，該列**不得用 0 或 1 補齊**，需視為缺日期粒度並排除出趨勢分組（不得倒推出不存在的日期點）；無 `date` 欄位時回傳「無日期」旗標供 UI 顯示提示文字。
  驗收：準備分類數 = 9 的測試 CSV，程式輸出恰為 9 個具名分類、不產生「其他」類；準備分類數 = 10 的測試 CSV，程式輸出恰為 8 個具名分類 + 1 個「其他」（其餘 2 類加總值）；準備不含可辨識日期欄的測試 CSV，計算函式回傳「無日期」旗標而非拋出例外；另準備一份 `date` 欄混有 `YYYY`（如 `2026`）與 `YYYY-MM`（如 `2026-08`）兩種缺欄位格式的測試 CSV：人工核對程式輸出，這兩列不得被補成 `2026-01-01` 或 `2026-08-01` 等虛構完整日期出現在趨勢分組結果裡，`dateParts()` 對這兩格回傳的 `m`／`d` 維持 `null`。

- [x] 6. 串接 UI：KPI 卡片（4 張）、Top5/Bottom5 表格渲染；串接 `shared/ui-chart-svg.js` 產生分類占比圓餅圖（「其他」類固定灰階、SVG 帶明確 `width`/`height` 屬性與 `viewBox`、填色用 SVG `fill` 屬性）與日期趨勢折線圖（無日期時顯示提示文字取代圖表區）。所有數值與 SVG 由 task 3–5 的計算結果驅動，按「產生報告」按鈕觸發（非即時）。另外實作「複製報告摘要」按鈕（`CONTRACT.md` 第 6 節 Level 1 共通 UI 基線）：把標題、期間、4 項 KPI 數值（SUM／AVG／COUNT／MAX）、Top 5 / Bottom 5 各筆分類名稱與數值組成一段純文字，呼叫 `shared/io-clipboard.js` 的 `copyToClipboard(text)`，成功後 `showToast()` 顯示「已複製報告摘要」；尚未按過「產生報告」時按鈕停用或點擊提示「請先產生報告」，不嘗試複製空內容。
  驗收：完整跑一次「上傳 CSV → 選欄位 → 產生報告」，畫面出現 4 張 KPI 卡、兩個排名表格、圓餅圖、趨勢圖（或無日期提示），且卡片與表格數字與 task 3–5 單獨執行的計算結果一致；檢視圓餅圖 SVG 原始碼，`<svg>` 元素同時帶有 `width`、`height`、`viewBox` 屬性，色塊的 `fill` 值直接寫在元素 attribute 上（非外部 CSS class）。點擊「複製報告摘要」後，讀取 `navigator.clipboard`（或 Playwright 的 clipboard 權限 API）取得的文字內容含標題、期間字串、與 4 項 KPI 的數值（與畫面卡片上顯示的數字逐字相符），且畫面出現「已複製報告摘要」toast；在尚未產生報告的狀態下點擊該按鈕，剪貼簿內容不變、畫面顯示「請先產生報告」提示。

- [x] 7. 實作標題／期間／註記渲染前一律經 `shared/util-escape.js` `escapeHtml(s)` 跳脫；實作列印 CSS：`@page { size: A4; margin: 2cm; }`、`.no-print` 隱藏所有非報表 UI（上傳區、下拉、按鈕列）、報表容器設 `print-color-adjust: exact` 與 `-webkit-print-color-adjust: exact`、KPI 卡片列／Top5 表格／Bottom5 表格／占比圖／趨勢圖各自套 `break-inside: avoid`；「匯出單一 HTML」按鈕旁加一行機敏資料提示文字「此檔案包含完整報告資料，請確認分享對象」（僅提示，不阻擋下載）。
  驗收 (a)：用 Playwright 執行期斷言驗證（JS 賦值不會產生任何 console 訊息，僅檢查 console 輸出無法證明跳脫是否生效，故改用下列執行期斷言）：在標題／期間／註記欄分別輸入 `<script>window.__xss=1</script>` 與 `<img src=x onerror="window.__xss2=1">`，按「產生報告」後：(1) `page.evaluate(() => window.__xss)` 與 `window.__xss2` 皆為 `undefined`；(2) DOM 查詢確認預覽區內沒有被注入的 `<script>` 或 `<img>` 元素；(3) 預覽區畫面顯示的是這兩段字面文字（含 `<`／`>` 符號），而非被解析成的空白或圖片。寫法比照 `sdd/csv-batch-splitter/tasks.md` 已改好的同類驗收。
  驗收 (b)：用 Playwright 對含完整資料（含類別數 10、有日期欄）的測試 CSV 產生報告後輸出 PDF，確認 PDF 頁數 = 1，且 KPI 卡片列、Top5 表格、Bottom5 表格、占比圖、趨勢圖五個區塊的邊界框（bounding box）皆完整落在第 1 頁範圍內（無跨頁截斷）。
  驗收 (c)：用 Playwright 抓取「匯出單一 HTML」按鈕周圍的畫面文字，包含「請確認分享對象」字串；點擊按鈕仍能正常觸發下載，不彈出需要額外互動的確認對話框。

- [x] 8. 實作「匯出單一 HTML」：把已計算完成的 KPI／Top5/Bottom5／占比／趨勢數值與圖表 SVG（含已跳脫的標題／期間／註記文字）寫死進匯出的 HTML，不內嵌原始 CSV 全表、不需重新執行運算即可顯示完整報告。
  驗收 (a)：以 `file://` 雙擊開啟匯出的 HTML（不透過 `python3 -m http.server`、不重新上傳任何 CSV），畫面顯示的 KPI／排名／占比／趨勢與匯出當下的預覽畫面截圖比對一致。
  驗收 (b)（證明「不內嵌原始 CSV 全表」，`CONTRACT.md` 第 6 節「怎麼證明『產物裡沒有夾帶原始資料集』」）：準備一份 dimension 相異值達 **14 類**的測資，哨兵 `ZZHIDDENCAT` 放在**依 measure 排序的第 9 名**。⚠️ **名次不是隨便挑的**：分類占比在類別數 ≥10 時只畫前 8 大（契約 7.4b），Top5 蓋住第 1–5 名，Bottom5 蓋住最後 5 名（14 類時為第 10–14 名）。因此要同時躲開三個輸出，名次 `r` 必須滿足 `r > 8` 且 `r ≤ N-5`，解得 `N > 13`——**14 類、第 9 名是最小可行解**。（11 類時無解：第 6 名會出現在占比的前 8 大，第 9–11 名會落進 Bottom5，任何名次都躲不掉，這條驗收會變成必定失敗的假性失敗。）該分類名稱設為哨兵 `ZZHIDDENCAT`（畫面上一定看不到）；另取一個會進入 Top5 的分類，名稱設為哨兵 `ZZVISIBLECAT`（畫面上看得到）。產生報告並匯出單一 HTML 後：**(1)** 對匯出檔精確搜尋 `ZZHIDDENCAT`，**必須 0 筆**（證明中段分類的原始列沒有被整份夾帶進去）；**(2)** 對匯出檔精確搜尋 `ZZVISIBLECAT`，**必須 ≥ 1 筆**（證明 Top5 資料真的有寫進去，不是空殼）。只驗 (1) 不驗 (2) 的話，一個空檔案也會通過。

- [x] 9. 實作 `buildCleanHtmlCopy()`：清空所有使用者資料（上傳過的 CSV 內容、已選 measure/dimension/日期欄、標題／期間／註記輸入、已算出的 KPI/排名/圖表結果）、移除 `.nav-back` 與指向本站的外連，**依 `CONTRACT.md` 第 6 節「`buildCleanHtmlCopy()` 的硬性要求」，一併移除 `shared/ui-toast.js` 動態插入 DOM 的 `#__shared_toast` 元素**（此元素不在表單欄位裡，容易被漏清，Level 1a Day05 已踩過同類缺陷）。此函式與 task 8 的匯出邏輯各自獨立實作，不共用「複製當下頁面再清空」的路徑。
  驗收：測試 CSV 與輸入欄位一律改用哨兵值——分類值 `ZZCATEGORYVAL`、欄名 `ZZONEPAGECOL`、數值欄的值 `987654321.4242`、標題 `ZZTITLE`、期間 `ZZPERIOD`、註記 `ZZNOTE`。分兩種判定方式，**不可混用**：
  **(甲) 原始碼精確搜尋，各須 0 筆**（這些字串不可能出現在工具程式／CSS／文案裡）：`ZZCATEGORYVAL`、`ZZONEPAGECOL`、`ZZTITLE`、`ZZPERIOD`、`ZZNOTE`。
  **(乙) DOM 層判定**（用 Playwright 載入下載到的離線版產物後斷言）：
  (b1) `document.getElementById('__shared_toast') === null`；
  (b2) `document.querySelectorAll('.nav-back').length === 0`；
  (b3) `document.body.textContent` 不含 `987654321` 也不含千分位形式 `987,654,321`；
  (b4) 載入離線版時 `pageerror` 與 console error 皆為空。
  ⚠️ **`__shared_toast` 與 `nav-back` 不可用原始碼 grep 判定**：`shared/ui-toast.js:4,7` 本來就含 `__shared_toast` 字串、`base.css` 本來就含 `.nav-back` 樣式規則，兩者都會被 `bundle.py` 內嵌進產物，**grep 為 0 筆字面上不可能成立**。數值哨兵同理——渲染時可能被加上千分位，原始碼未必留下原字串。Level 1a Day05 的 D-2 就是踩到這一條（見 `CONTRACT.md` 第 6 節）。

- [x] 10. 執行 `scripts/bundle.py` 產出 `index.html`／`bundle_manifest.json`；用 `python3 -m http.server` 與 `file://` 雙擊各測一次「上傳 CSV → 產生報告 → 匯出單一 HTML → 下載離線版」完整流程；Playwright 整體驗收 PRD 11 三條驗收條件（一份 CSV 產生一頁式摘要／列印主要區塊可讀／匯出 HTML 免重傳 CSV）+ `CONTRACT.md` 硬性約束（斷網可用、原始檔不覆寫、資料不上傳、錯誤格式不崩潰）+ 邊界情況（空 CSV、只有 1 個分類、類別數恰為 9、類別數 = 10、缺日期欄、註記欄位滿字數上限、5–20MB 大檔案提示、>20MB 大檔案拒絕）。
  驗收：兩種開啟方式（`http.server` 與 `file://`）皆能完整跑完流程，瀏覽器 console 無 error（`file://` 模式下允許因 CORS 導致的非必要資源載入警告，但不允許功能性 JS 例外）；貼出 Playwright 測試腳本執行結果（pass/fail 清單），全數 pass；上傳空 CSV 或缺日期欄的 CSV 時頁面不崩潰、顯示對應提示而非空白或錯誤堆疊；上傳 >20MB 測試檔時被拒絕且不崩潰。

## 驗收條件

- 情境：當使用者上傳一份含數值欄與分類欄的 CSV、選定核心 measure 與 dimension 並按下「產生報告」時，就畫面產生一頁式管理摘要——4 張 KPI 卡片、Top5/Bottom5 排名表、分類占比圖、日期趨勢圖（或無日期提示），數字與人工核算一致。**（對應 PRD 驗收條件 1，對應 task 3–6）**
- 情境：當使用者對產生好的報告執行瀏覽器列印或用 Playwright 輸出 PDF 時，就 KPI 卡片列、Top5 表格、Bottom5 表格、占比圖、趨勢圖五個區塊都完整落在第 1 頁、沒有元素被跨頁截斷，且背景色與圖表配色有列印出來（未被瀏覽器省墨機制拿掉）。**（對應 PRD 驗收條件 2，對應 task 7）**
- 情境：當使用者點擊「匯出單一 HTML」並用 `file://` 雙擊開啟該檔案時，就不需要重新上傳 CSV，畫面直接顯示與匯出當下一致的完整報告（KPI／排名／占比／趨勢／標題／期間／註記皆在）。**（對應 PRD 驗收條件 3，對應 task 8）**
- 情境：當標題／期間／註記欄位輸入含 `<script>` 或其他 HTML 標籤的字串時，就無論是預覽畫面或匯出的 HTML，該字串都以跳脫後的文字顯示、不會被瀏覽器當成 HTML／JS 執行。**（對應 task 7）**
- 情境：當使用者點擊「下載本工具離線版」時，就下載的 HTML 不含任何剛才上傳的 CSV 資料、不含標題／期間／註記輸入內容、不含 CSV 原始欄名、不含 `showToast()` 動態插入的 `#__shared_toast` 元素、不含 `.nav-back` 與指向本站的外連——此驗收與「匯出單一 HTML」（內含完整資料是設計目的）分開測試，兩者資料是否保留的期望完全相反。**（對應 `CONTRACT.md` 第 6 節硬性要求，對應 task 9）**
- 情境：當分類欄的相異值數量達到或超過 10 時，就分類占比圖只顯示前 8 大分類 + 1 個「其他」（固定灰階）；相異值數量 ≤ 9 時全部畫出，不合併。**（對應 task 5）**
- 情境：當 CSV 中沒有任何欄位被 `inferColumnTypes()` 判定為 `date` 時，就日期趨勢區塊顯示「未偵測到日期欄位」提示文字，不留空白、不拋出例外。**（對應 task 2、5）**
- 情境：當日期欄的某些值只有 `YYYY` 或 `YYYY-MM`（缺月／日）時，就共用 `dateParts(s)` 回傳的 `m`／`d` 維持 `null`，該列不得被補成 `01` 月／`01` 日後納入趨勢分組，避免圖上長出不存在的日期點。**（對應 `CSV_CONTRACT.md` 第 4.0b 節，對應 task 5）**
- 情境：當 Top5 或 Bottom5 對應的分類分組數少於 5 時，就表格只顯示實際筆數，不補空白列。**（對應 task 4）**
- 情境：當上傳檔案介於 5–20MB 時顯示處理較慢提示，超過 20MB 時直接拒絕並說明上限。**（對應 PRD `CONTRACT.md` 大檔案門檻，對應 task 1、10）**
- 情境：分別用拖放與檔案選取 input 上傳同一份超過 20MB 的 CSV，兩條路徑都被閘門擋住、都顯示拒絕訊息且都不進入解析——**檔案選取與拖放走同一條路**。**（對應 task 1）**
- 情境：當使用者產生報告後點擊「複製報告摘要」時，就剪貼簿內容含標題、期間、4 項 KPI 數值與 Top5/Bottom5 分類名稱，且與畫面顯示的數字一致；未產生報告前點擊該按鈕不複製任何內容並提示先產生報告。**（`CONTRACT.md` 第 6 節 Level 1 共通 UI 基線，對應 task 6）**
