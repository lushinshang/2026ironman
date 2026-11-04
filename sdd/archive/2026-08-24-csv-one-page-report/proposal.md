# CSV 一頁式管理報告（csv-one-page-report，Day13）

## 為什麼做

資料分析完成後，主管通常不是要操作樞紐表，而是要快速看懂 KPI、排名與趨勢——一張能列印出來、帶去開會的紙，而不是一個要自己動手拉欄位的互動工具。

## 與 Day11＋Day12（`csv-pivot-dashboard`，上下篇）的分工

Level 1b 兩個產品都吃同一份 CSV、都用 `shared/ui-chart-svg.js`（該模組由 pivot 下篇 Day12 建立，本題 Day13 直接使用），但產品定位不同，**本題不是 `csv-pivot-dashboard` 的縮小版或翻版**：

| | Day11＋12 `csv-pivot-dashboard` | Day13（本題）`csv-one-page-report` |
|---|---|---|
| 使用情境 | 使用者自己探索：換 Group By、換 Aggregate、加 Filter，一直互動 | 使用者已經知道要看什麼：選一個 measure、一個 dimension，按一次「產生報告」就定稿 |
| 欄位選擇 | 多欄 Group By、多種 Aggregate 可切換 | 單一核心 measure + 單一核心 dimension（PRD 11 MVP 原文「選擇核心數值欄與分類欄」為單數） |
| 圖表 | Bar／Line／Pie 可切換、Pivot Table 可重排 | 圖表類型固定（占比＝圓餅、趨勢＝折線），不提供切換 UI |
| 列印 | 不是重點 | **技術主角**：A4 版型、分頁控制、匯出免重傳 CSV |
| 產出心智模型 | 一個可以一直玩下去的分析台 | 一張「定稿後不會再變」的報告，適合列印或存成 PDF 交出去 |

因此本題的實作要刻意做「少」：不加圖表類型切換、不加多維度 Group By、不加即時互動式 Filter——這些是 `csv-pivot-dashboard` 的範圍，本題重複做等於浪費工，也會模糊兩題的產品定位。

## 要改什麼

以下逐項標明來源：**[PRD明訂]** 直接抄自 PRD 11；**[判斷]** 為 PRD 未寫清楚、本提案補上的判斷，理由附註於後；**[已裁示]** 為原提案列為爭議點、已經指揮官裁示定案的項目（裁示依據見 `sdd/LEVEL1B_RULINGS.md`），直接寫進正文，不再另立爭議點清單。

### 0. 讀檔、空值定義與大檔案門檻

0a. **[PRD明訂延伸]** CSV 讀檔（拖放與檔案選取皆同）一律經 `shared/io-dropzone.js` 的 `setupDropZone(dropEl, onData, opts)` **與** `setupFilePicker(fileInput, onData, opts)`，兩條路徑吃同一組 `opts`（`CSV_CONTRACT.md` 第 4 節）：

   ```js
   var opts = { mode: 'bytes', accept: ['.csv'],
                gate: function (file) { return checkCsvFileSize(file.size); } };
   setupDropZone(dropEl, onData, opts);
   setupFilePicker(fileInput, onData, opts);
   ```

   `gate` 在**讀檔之前**執行，`!ok` 就走 `onError(message)`、完全不讀檔；`onData` 收到已通過閘門的 `ArrayBuffer`，交給 `shared/csv-decode.js` 的 `decodeCsvBytes(arrayBuffer)` 解碼、再交給 `parseCsv(text, opts)` 解析。本題**不自寫拖放邏輯**、不自行接 `<input type=file>` 的 `change` 事件，也不使用舊版 `onText` 簽名，不在拿到 `ArrayBuffer` 之後才檢查大小。

0b. **[PRD明訂延伸]** 空值定義直接引用 `CSV_CONTRACT.md` 第 3.2 節：**空值＝空字串 `''`**，沒有 `null`／`undefined`。只有空白的格（例如 `'  '`）**不算空值**，是前後空白問題，不在本題的「空值」判定範圍內。

0c. **[PRD明訂延伸]** 大檔案門檻依 `CSV_CONTRACT.md` 第 5 節，透過 0a 的 `opts.gate` 在**讀檔之前**呼叫 `checkCsvFileSize(file.size)`（回傳 `{ok, level, message}`）判斷：
   - `< 5MB`：直接處理，不提示。
   - `5–20MB`：處理，但先顯示「檔案較大，處理可能需要數秒」提示（`showToast()`）。
   - `> 20MB`：`gate` 回傳 `!ok`，走 `onError(message)`，完全不讀檔、不進入解析流程。
   門檻以 `File.size`（原始位元組）判定，不是解碼後字元數。

### 1. 欄位選擇與資料型態

1. **[PRD明訂]** 選擇核心數值欄（measure）與核心分類欄（dimension）。
2. **[判斷]** 依 `CSV_CONTRACT.md` 第 4.0b 節 `inferColumnTypes(table)` 取得每欄的 `kind`（`'number'` | `'date'` | `'text'`），UI 只把 `kind === 'number'` 的欄位列進 measure 下拉、`kind === 'text'` 的欄位列進 dimension 下拉。不額外自訂門檻、不做「這欄適不適合當 dimension」的智慧判斷（型別判準只在 `inferColumnTypes()` 定義一次，五題直接用 `kind`，不得自加規則——契約第 4.0b 節硬性要求）。
3. **[判斷]** 日期欄位：若 `inferColumnTypes()` 判定結果中 `kind === 'date'` 的欄位數 = 0，日期趨勢區塊整段隱藏，改顯示一行提示文字「未偵測到日期欄位，此報告不含時間趨勢」，不留空白區塊、不報錯。若有 1 個以上日期欄位，提供下拉選擇（預設選第一個判定為 `date` 的欄位）。

### 2. KPI Cards

4. **[判斷][已裁示]** 固定 4 張卡，不可自訂：**加總（SUM）、平均（AVG）、筆數（COUNT）、最大值（MAX）**，全部基於使用者選定的核心 measure 欄計算。理由：PRD 只寫「KPI Cards」沒給數量或指標，四項是管理報表最常見的四個彙總指標，且都能直接用型態推論後的數值欄算出。是否讓使用者勾選顯示指標已由指揮官裁示為「不可自訂」，不再開放勾選 UI。
5. 計算前先過濾：該欄位中 `inferColumnTypes()` 標記為 `mismatchLines` 的儲存格（非數值）**不納入計算**，且在畫面上顯示納入計算的筆數與總筆數（例如「128 / 130 筆」），讓使用者知道有資料被排除，不悄悄跳過（呼應 `CSV_CONTRACT.md` 第 2 節「parser 不做貼心修正」的精神延伸到聚合層——排除規則要讓使用者看得到）。

### 3. Top 5 / Bottom 5

6. **[判斷]** 依核心 dimension 分組、對核心 measure 做 SUM 聚合，取聚合後數值排序前 5 / 後 5。（PRD 只寫「Top 5 / Bottom 5」，管理報表脈絡下通常指「依分類彙總後的排名」而非逐列排序，逐列排序對已有 groupby 情境的使用者意義不大。）
7. **[判斷]** 並列（tie）：不特別標注「並列」語意，用穩定排序（stable sort，原始分組出現順序為次要鍵）決定名次先後，超出名額的並列項目不額外顯示。理由：PRD 未要求呈現並列語意，加上去會是未要求的功能。
8. **[判斷]** 分組數不足 5 筆時：Top 5 / Bottom 5 各自顯示實際筆數（例如只有 3 個分類就顯示 3 筆），不補空白列、不重複顯示、表格標題仍寫「Top 5」但內容列數隨資料量變動。

### 4. 分類占比

9. **[契約 7.4b 硬性要求]** 類別數 ≤ 9 時全部畫出；類別數 ≥ 10 時取前 8 大（依核心 measure 加總排序）+ 其餘全部併為「其他」一類。門檻與判定方式一律沿用 `CSV_CONTRACT.md` 第 7.4b 節，本題不得另訂固定「前 8」或其他門檻。
10. 「其他」類別固定使用中性色（灰階），不從一般色盤挑色，避免使用者誤以為「其他」是某個有意義的獨立分類（`ui-chart-svg.js` 提供「指定某一類為中性色」的參數，見文末對 Day12（pivot 下篇）圖表模組的需求 4，已被契約 7.4b 採納為硬性要求）。

### 5. 日期資料趨勢

11. **[判斷][已裁示]** 時間粒度固定為「依月分組」，不提供切換（互動式粒度選擇是 `csv-pivot-dashboard` 的範圍）。若資料的日期範圍不足一個月（例如全部集中在同一天，或最大最小日期差 < 31 天），退化為「依日分組」，避免整條趨勢線只有一個資料點。指揮官已裁示固定粒度、不提供切換 UI，此點不再列入爭議。
12. 日期欄位判定：直接沿用 `inferColumnTypes()` 的 `kind === 'date'` 判定，本題不額外做日期格式猜測。**年月日拆解一律用 `CSV_CONTRACT.md` 第 4.0b 節共用的 `dateParts(s)`**（回傳 `{y, m, d}`，不符白名單回 `null`，由 `csv-infra` 統一實作），本題不自行寫 regex/capture 另擷取年月日——三題各寫一套擷取規則正是契約 4.0b 節明文點名要避免的重演。`dateParts()` 對 `YYYY`（如僅 `2026`）或 `YYYY-MM`（缺日）這類不完整日期，`m`／`d` 回傳 `null`；呼叫端（月分組／日分組退化判斷）**不得用 0 或 1 補齊缺欄位**，否則會讓「2026 年」在趨勢圖上憑空長出「2026-01-01」這種不存在的日期點。

### 6. 自訂報告標題、期間、註記（XSS 風險，硬性要求）

13. 三個欄位皆為使用者輸入的自由文字，會被寫進報表預覽 DOM、也會被寫進「匯出單一 HTML」（第 8 節）。**渲染前一律先經 `shared/util-escape.js` 的 `escapeHtml(s)`**，不得直接用字串拼接或 `innerHTML =` 未跳脫內容，避免使用者輸入 `<script>` 等內容造成 XSS。
14. **[判斷][已裁示]** 三欄位加 `maxlength` 上限：標題 60、期間 40、註記 200。理由見第 7 節「一頁式是否為硬性保證」——這是防止版面被文字撐爆的第一道防線。上限數值已由指揮官裁示採用建議值，不再列入爭議。

### 7. 列印版型（本題技術主角）

#### 7.1 尺寸與邊界

15. **[判斷][已裁示] A4 直式（portrait）**，`@page { size: A4; margin: 2cm; }`。理由：管理報表 A4 直式是最常見的列印慣例，且「一頁式」的直覺對應直式紙張；邊界 2cm 是列印排版常見預設（來源：MDN `@page` 說明與多份業界 print CSS 指南建議用實體單位如 `cm`/`mm` 而非 `px`，因為列印的目標裝置是實體紙張，`px` 在不同印表機 DPI 下不可靠）[^1]。指揮官已裁示採直式，不再列入爭議。

#### 7.2 `@media print` 要處理的事

16. **隱藏 UI 控件**：欄位選擇下拉、拖放上傳區、「產生報告」按鈕、toast 等一律套 `.no-print { display: none }`，只有報表本體（標題／期間／註記／KPI／排名／占比／趨勢）在列印時顯示。
17. **背景色與圖表配色必須列印**：瀏覽器預設 `print-color-adjust: economy`（Baseline 2025 年 5 月起主流瀏覽器支援）會為了省墨自動拿掉背景色與部分配色，這對本報告是問題——KPI 卡片底色、占比圖色塊、「其他」類別的灰階都是資訊本身而非裝飾。因此報表容器要顯式設定 `print-color-adjust: exact`（並保留 `-webkit-print-color-adjust: exact` 相容舊版 Chrome/Safari），強制列印。使用者不提供關閉此項的選項（PRD 未要求，且本報告的顏色是內容而非裝飾，關掉沒有意義）[^2]。
18. **分頁控制**：KPI 卡片列、Top5/Bottom5 各自的表格、占比圖、趨勢圖，四個區塊各自套 `break-inside: avoid`，避免被硬切一半（`break-inside` 已是 Baseline 廣泛支援的標準屬性，取代舊版 `page-break-inside`）[^3]。
19. **連結 URL 不展開**：本報告內部沒有需要在列印時展開的外部連結（一般 print CSS 教學常提到的 `a[href]::after { content: " (" attr(href) ")" }` 情境不適用），**明確不做**，避免流於形式套用不相關的最佳實務。
20. **不加頁碼／頁首頁尾**：PRD 未要求，「一頁式」報告的預設情境本來就不需要頁碼。

#### 7.3 SVG 列印的瀏覽器實際坑（查證，非憑印象）

21. Chrome 在列印時**不支援 viewport 相對單位**（`vw`/`vh`），若 SVG 尺寸依賴這類單位會被壓縮成 0×0；正確做法是 SVG 要有明確的 `width`/`height` 屬性（配合 `viewBox` 定義內部座標），不能只靠外部 CSS 百分比或 viewport 單位撐出尺寸[^4]。這點直接影響 `shared/ui-chart-svg.js` 的輸出格式要求，見文末「對 Day12（pivot 下篇）圖表模組的需求清單」第 1、2 項；此二項已被契約 7.4b 節採納為硬性要求。
22. Firefox 有長年未修復的 bug（Bugzilla #600207）：SVG **當作 `<img>` 使用**、且被縮放或列印時會模糊／像素化（觸發 tiling codepath）[^5]。本題與 `csv-pivot-dashboard` 都是**內嵌 `<svg>` 元素**而非 `<img src="data:image/svg+xml...">`，所以此 bug 不適用，但列為已查證的排除項，避免未來有人為了「效能」把圖表改包成 `<img>` 而踩到這個坑。

#### 7.4 「一頁式」是硬性保證還是盡力而為（明確答案）

23. **答案：以一頁為設計目標，用兩道有界（bounded）防線讓正常情境下必為一頁，但不對瀏覽器渲染差異做 100% 數學保證。**
    - 防線一：內容筆數有界。Top 5 / Bottom 5 固定最多 5 筆（第 3 節）、分類占比類別數 ≤ 9 全畫、≥ 10 取前 8 + 其他（第 4 節，契約 7.4b）、KPI 卡片固定 4 張（第 2 節）——這些區塊的版面高度不會隨資料筆數增加而無限增長。
    - 防線二：自由文字有界。標題／期間／註記三個使用者輸入欄位設 `maxlength`（第 6 節第 14 點），從輸入端就阻止文字撐爆版面，而不是等排版完再用 `overflow: hidden` 截斷——因為 `overflow: hidden` 在列印時的實際生效行為在不同瀏覽器不一致，**不能拿來當防線**，必須在資料源頭限制。
    - 例外（無法保證的部分）：分類占比圖的「分類名稱字串長度」本身不可控（例如某筆分類值是 50 字的長字串），這會撐開圖表區的標籤寬度。此邊界要求圖表模組自己做標籤截斷，列入對 Day12（pivot 下篇）的需求（第 3 項，已被契約 7.4b 採納為硬性要求）。
    - 也無法保證的部分：不同作業系統／使用者手動調整的預設列印字級、字型度量差異，理論上可能讓內容多出一兩行溢到第二頁，這是瀏覽器渲染環境決定，非本題程式碼可完全控制。
    - **因此驗收條件不能用「看起來是一頁」這種主觀敘述**，而是用 Playwright 產生 PDF 後客觀檢查頁數與元素座標（見 `tasks.md` 第 6、10 條）。

### 8. 兩種匯出產物：報告 HTML vs 離線空白版（資安要求相反，分別驗收）

24. **匯出單一 HTML（PRD 驗收條件 3：「輸出 HTML 不需重新上傳 CSV」）**：這份匯出物件的目的是「把算好的報告帶著走」，因此必須把當下 KPI／Top5／Bottom5／占比／趨勢的**已計算完成的數值與 SVG 內容**直接寫進匯出的 HTML（不是保留原始 CSV 全表讓開啟時重新運算，而是把運算結果「凍結」進去），也包含使用者輸入的標題／期間／註記（皆已 `escapeHtml()` 跳脫）。**這份匯出物件的資安前提是：它會被當成報告分享出去，內容本身就是要給人看的資料**，因此第 6 節的 XSS 跳脫是唯一要求，**不清空任何資料**——清空了就違反 PRD「不需重新上傳 CSV」這條驗收條件本身。
24a. **[已裁示] 機敏資料警示**：按下「匯出單一 HTML」時，於下載前顯示一行提示文字「此檔案包含完整報告資料，請確認分享對象」（`showToast()` 或按鈕旁靜態文字皆可，UI 細節由 task 實作時決定），**僅提示、不做攔截**——不彈確認對話框、不要求二次點擊、不阻擋下載。理由：匯出物件內嵌完整計算結果與使用者輸入的期間／註記文字，若資料本身敏感，使用者可能不自覺地分享出去；但攔截會與 PRD「不需重新上傳 CSV 即可使用」的順暢匯出體驗衝突，指揮官裁示採提示不攔截。
25. **下載本工具離線版（`CONTRACT.md` 第 6 節 `buildCleanHtmlCopy()`，Level 1 共通 UI 基線）**：這是完全不同的產物，目的是分享「這個空白工具」給別人用，**必須清空所有使用者資料**——上傳過的 CSV 內容、已選的 measure/dimension、標題／期間／註記輸入、任何已算出的 KPI/排名/圖表結果，一律清空，並移除 `.nav-back` 與指向本站的外連；**同時必須移除 `showToast()` 動態插入 DOM 的 `#__shared_toast` 元素**（此元素不在表單欄位裡，不寫進清空清單就會被漏掉，Level 1a Day05 `reversible-deidentifier` 已踩過同一類缺陷）。此項已明確列入 `tasks.md` task 9 的驗收條件，可客觀檢查（產物不含 `__shared_toast` 字串）。
26. **兩者絕不能共用同一份「複製當下頁面」邏輯而只是事後補救式清空**：`buildCleanHtmlCopy()` 要清空的欄位與匯出報告要保留的欄位剛好互斥，實作時是兩條獨立路徑（各自組字串／各自決定要不要內嵌資料），不要先呼叫「匯出報告」邏輯再事後刪資料，容易漏刪（`CONTRACT.md` 第 6 節已明確警告這類疏漏，例如 `showToast()` 動態插入的 `#__shared_toast` 元素常被漏清——本題不只是提及此風險，已將其寫進 task 9 的具體驗收步驟）。

### 9. 互動模式

27. **[判斷]** 按鈕觸發（非即時）：選定 measure/dimension/日期欄與輸入標題等文字後，按「產生報告」才計算與渲染。依 `CONTRACT.md` 第 5 節精神類比：本題資料聚合成本不像 Day01 純文字統計那麼低，且是「定稿」情境不需要邊打字邊看報告跳動，故採按鈕觸發。

### 不做（PRD 明訂 + 本提案延伸排除）

AI 文字結論、多頁 BI 平台（PRD 明訂）。此外依「與 Day11＋12 的分工」段落，本題**不做**：多欄 Group By、多種 Aggregate 切換、圖表類型切換、互動式 Filter、時間粒度切換——這些是 `csv-pivot-dashboard` 的產品範圍，本題重做等於模糊兩題定位。

---

## 對 Day12（pivot 下篇）圖表模組（`shared/ui-chart-svg.js`）的需求清單

`ui-chart-svg.js` 由 **Day12（pivot 下篇）建立**（`CSV_CONTRACT.md` 第 6.2 節），本題是使用者不是建立者。以下是本題基於列印場景，對該模組提出的具體需求。**下列第 1、2、3、4、5 項已被 `CSV_CONTRACT.md` 第 7.4b 節採納為 `ui-chart-svg.js` 的硬性要求（Day12 實作時必須全部滿足）**，第 6 項為加分項、未被契約採納為硬性要求：

1. **SVG 輸出必須帶明確 `width`/`height` 屬性 + `viewBox`**，不能僅靠外部 CSS 百分比或 viewport 相對單位（`vw`/`vh`）撐出尺寸。理由：Chrome 列印時不支援 viewport 單位，會讓 SVG 坍縮為 0×0（第 7.3 節第 21 點，已查證）。（契約 7.4b 第 1 項）
2. 需要能接受「列印用固定尺寸」的呼叫方式（例如傳入以 `mm` 或 `cm` 為單位的目標尺寸，或至少保證螢幕版與列印版共用同一份 SVG 在兩種情境下都不失真），而不是只針對螢幕上的響應式容器設計。（契約 7.4b 第 2 項）
3. **類別標籤過長時要有截斷機制**：分類名稱字串長度不可控，過長會撐開圖表版面（第 7.4 節「例外」）。截斷規則由模組決定、不由呼叫端各自處理；建議標籤超過 N 字元加省略號，並用 `<title>` 子元素提供 hover/完整文字。（契約 7.4b 第 4 項）
4. **色盤需要支援「指定某一類為中性色」的能力**：本題把小分類彙總為「其他」時，該類別要固定用灰階而非從一般色盤隨機分配（第 4 節第 10 點），需要 `ui-chart-svg.js` 提供類似「自訂單一類別顏色覆蓋」的參數，而不是純粹依 index 從色盤取色。（契約 7.4b 第 5 項）
5. **填色一律用 SVG `fill` 屬性，不用外部 CSS class**：列印時瀏覽器預設會拿掉背景色與外部樣式表的顏色規則（`print-color-adjust: economy`，第 7.2 節第 17 點），用 class 上色會在列印時整片消失；直接寫在 SVG 元素的 `fill` attribute 上，Day12 驗收時須實測列印/PDF 輸出確認顏色有保留。（契約 7.4b 第 3 項）
6. **Bar chart 若支援水平方向（horizontal bar）會對本題有幫助**：Top5/Bottom5 若改用長條圖呈現（非必要，本提案第 3 節目前只規劃純表格），水平長條圖對「分類名稱在左、不用轉 90 度」的管理報表更好讀。此為加分項，非本題 MVP 必需，僅供 Day12 評估時參考，不影響 Day12 是否要做（契約 7.4b 明列此項為加分項，非必需）。

---

## 版面草圖（單頁列印報告，不另立 UI 設計文件）

```
編輯模式（螢幕，含 .no-print 控件）              列印 / 匯出 HTML（A4 直式，僅報表本體）
┌─────────────────────────────┐                ┌───────────────────┐
│ [上傳CSV][measure▾][dim▾]    │ ← .no-print    │  報告標題           │
│ [日期欄▾][標題____][期間____]│                │  期間：____         │
│ [註記__________________]    │                ├───────────────────┤
│ [產生報告]                   │                │ KPI KPI KPI KPI    │ ← break-inside:avoid
├─────────────────────────────┤                ├─────────┬─────────┤
│  報告標題 / 期間 / 註記        │                │ Top 5   │ Bottom5 │ ← break-inside:avoid
├─────────────────────────────┤                ├─────────┴─────────┤
│ KPI KPI KPI KPI              │                │   分類占比（圓餅）   │ ← break-inside:avoid
├─────────┬─────────────────┤                ├───────────────────┤
│ Top 5   │ Bottom 5          │                │   日期趨勢（折線）    │ ← break-inside:avoid
├─────────┴─────────────────┤                │   （無日期欄則顯示提示）│
│   分類占比（圓餅）             │                └───────────────────┘
├─────────────────────────────┤                註記：____________
│   日期趨勢（折線）              │
├─────────────────────────────┤
│ [複製][匯出報告HTML]           │ ← .no-print
│ [下載本工具離線版]              │ ← .no-print
└─────────────────────────────┘
```

## 影響範圍

| 檔案 | 動作 | 說明 |
|---|---|---|
| `VibeCoding/Day13_csv-one-page-report/src/index.html` | 新增 | 模板原始碼，含 `<!--{{SHARED:模組名}}-->` placeholder |
| `VibeCoding/Day13_csv-one-page-report/src/bundle.json` | 新增 | 資源清單 |
| `VibeCoding/Day13_csv-one-page-report/index.html` | 新增（build 產物） | `scripts/bundle.py` 產出，版控追蹤 |
| `VibeCoding/Day13_csv-one-page-report/bundle_manifest.json` | 新增（build 產物） | 內嵌資源來源、版本、SHA256 |
| `VibeCoding/Day13_csv-one-page-report/PRD.md` | 新增 | 展開 PRD 11 為本題規格文件 |
| `VibeCoding/Day13_csv-one-page-report/logs/` | 新增 | 開發日誌目錄 |
| `sdd/csv-one-page-report/proposal.md` | 新增 | 本檔 |
| `sdd/csv-one-page-report/tasks.md` | 新增 | 任務清單與驗收條件 |
| `VibeCoding/README.md` / `VibeCoding/index.html` | 修改 | 收尾階段才動，不在本題實作範圍 |

使用的共用模組（`VibeCoding/shared/`，簽名依 `CONTRACT.md` 第 3 節與 `CSV_CONTRACT.md` 第 4 節，不新增／不變動既有簽名）：

- `shared/base.css`
- `shared/csv-decode.js` / `csv-parse.js` / `csv-write.js` / `csv-types.js`（由 `sdd/csv-infra/` 前置工程建立，本題直接使用，不重做）
- `shared/ui-chart-svg.js`（由 **Day12（pivot 下篇）建立**，本題直接使用，不重做——見上方「對 Day12（pivot 下篇）圖表模組的需求清單」）
- `shared/io-download.js` — `downloadFile(filename, content, mime)`
- `shared/io-clipboard.js` — `copyToClipboard(text)`（複製報告文字摘要，`CONTRACT.md` 第 6 節 Level 1 共通 UI 基線）
- `shared/io-dropzone.js` — `setupDropZone(dropEl, onData, opts)` 與 `setupFilePicker(fileInput, onData, opts)`（CSV 上傳，拖放與檔案選取共用同一組含 `gate` 的 `opts`，見第 0 節 0a 點，由 `csv-infra` 前置工程擴充實作，本題不自寫）
- `shared/ui-toast.js` — `showToast(msg, ms)`
- `shared/util-escape.js` — `escapeHtml(s)`（第 6、8 節 XSS 跳脫，硬性要求）

不使用 `shared/ui-debounce.js`（本題按鈕觸發，非即時，見第 9 節）。

**使用 `shared/io-clipboard.js`**：`CONTRACT.md` 第 6 節規定「複製結果到剪貼簿」是 Level 1 每一題都要有的共通 UI 基線，**不寫在各題 PRD 的 MVP 清單裡，但由該節統一規定，不視為違反共通規則第 3 條**——PRD 11 沒寫「複製」正是這條契約預先擋掉的誤讀，不能當成排除理由。本題複製的內容是**報告的文字摘要**：標題、期間、4 項 KPI 數值（SUM／AVG／COUNT／MAX）、Top 5 / Bottom 5 各筆的分類名稱與數值，組成一段純文字，呼叫 `copyToClipboard(text)`，成功後用 `showToast()` 提示「已複製報告摘要」。「產生報告」前（尚無結果）按鈕停用或提示先產生報告。實作與驗收併入 `tasks.md` task 6（串接 UI，該任務本來就在渲染報表結果，複製摘要的文字組裝直接沿用同一批已計算數值）。

Library／API：無，純前端運算與手寫 SVG（透過 `ui-chart-svg.js`），不依賴第三方 library，不呼叫任何 API。

---

## 查證來源

[^1]: [`@page` CSS at-rule — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page)；印刷邊界建議用實體單位（`cm`/`mm`/`in`）而非 `px` 的說明見同頁與 [CSS for printing to paper — voussoir.net](https://voussoir.net/writing/css_for_printing)。
[^2]: [`print-color-adjust` — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/print-color-adjust)：預設值 `economy`（瀏覽器可自行拿掉背景色/圖片以省墨），`exact` 值強制保留設計配色；該屬性 Baseline 為 2025 年 5 月起主流瀏覽器可用。
[^3]: [`break-inside` — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside)：`avoid` 值防止該元素內部被插入分頁；已是 Baseline 廣泛支援（自 2019 年 1 月起），取代舊版 `page-break-inside`。
[^4]: Chrome 列印不支援 viewport 相對單位、SVG 尺寸需明確定義 `width`/`height`/`viewBox` 才能正確列印，來源：搜尋彙整自 [Dividing a Large SVG for Printing — GitHub Gist](https://gist.github.com/asizer/dc0279aa47abbc3a19a70f514dab765b) 與相關實務討論。
[^5]: Firefox SVG-as-`<img>` 於縮放/列印時模糊/像素化的長年已知問題：[Bugzilla #600207](https://bugzilla.mozilla.org/show_bug.cgi?id=600207)（本題與 `csv-pivot-dashboard` 皆內嵌 `<svg>` 元素而非 `<img>`，此 bug 不適用，列為已查證排除項）。
