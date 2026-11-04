# Tasks：Office Content Publisher（office-content-publisher）

> 前置條件：待裁示 1／2／3 已定案（見 `sdd/LEVEL1D_RULINGS.md` 第 18–20 條），
> 任務 2、5、8 已依裁示結果改寫為明確版本。**任務 8 額外前置條件**：`shared/print.css`
> 需由獨立前置工程 `sdd/print-infra/` 先建立完成，本題不負責建立該檔案，只負責引用。

- [x] 1. 建立 `Day26_office-content-publisher/src/index.html` 版面骨架：輸入模式切換
  （Markdown/TXT ⇄ CSV）、輸入區、即時預覽區、輸出按鈕列（Copy Markdown／Copy HTML／
  下載單一 HTML／三個共通按鈕），套用 `shared/base.css`。
  **驗收**：情境：切換輸入模式時輸入區與預覽區內容各自保留（切回 Markdown 模式不會
  清空剛才輸入的 CSV 狀態，反之亦然）；情境：畫面版型與 `CONTRACT.md` 第 6 節共通
  UI 基線一致（返回連結、三個共通按鈕位置）。

- [x] 2. 實作 Markdown/TXT → HTML 轉換與即時預覽：手寫簡化版 Markdown parser
  （裁示定案，不引入外部 library），只支援固定語法子集：標題 `#`–`######`、
  粗體 `**text**`、斜體 `*text*`、無序清單 `-`/`*`、有序清單 `1.`、連結
  `[text](url)`、code fence ```` ``` ````（不追求巢狀結構或 reference-style link
  的完整相容），貼上文字後即時（無需按鈕、接 `debounce()`）更新右側預覽，並在畫面
  文案上明確標示「簡化版 Markdown，非完整 CommonMark 實作」。
  **驗收**：情境：貼上含上述六種語法的 Markdown，預覽區正確渲染對應 HTML 元素；
  情境：輸入變更後預覽在合理時間內（<300ms 或視 `debounce()` 設定）更新，不需
  手動觸發；情境：純 TXT（無 Markdown 語法）貼上時，預覽顯示為純文字段落，不誤判
  成 Markdown 語法；情境：貼上語法子集以外的內容（例如表格語法、巢狀清單），
  不整頁崩潰或拋出未捕捉例外，至少降級為可讀的純文字或部分渲染。

- [x] 3. 實作「Markdown → 單一 HTML」下載：把目前預覽結果包裝成一份離線可開啟的
  HTML 檔案（含基本樣式，不依賴外部字型或 CDN）。
  **驗收**：情境：下載後用 `file://` 開啟，畫面與貼上時的即時預覽視覺一致；情境：
  下載的 HTML 不含使用者原始 Markdown 以外的內容（不夾帶本工具的 UI 元素），
  對應 PRD 驗收條件「輸出 HTML 不需重新上傳原始檔」。

- [x] 4. 實作 CSV 上傳與解析：接 `shared/csv-decode.js` 的 `checkImageFileSize()`
  （若複用同類介面）／`decodeCsvBytes()` 與 `shared/csv-parse.js` 的 `parseCsv()`，
  沿用 Level 1b `Table` 資料結構（`headers`／`rows`），不重寫解析邏輯。
  **驗收**：情境：上傳一份含中文欄名與資料的真實 CSV，畫面正確顯示所有欄位與列，
  中文無亂碼；情境：上傳一份欄數不一致或含空白列的 CSV（`CSV_CONTRACT.md` 第 2 節
  「parser 不做任何貼心修正」的測試案例），畫面忠實呈現原始資料，不擅自補齊或
  刪除；情境：上傳非 CSV 檔案，畫面顯示明確錯誤訊息，不整頁崩潰。

- [x] 5. 實作 CSV 欄位選擇與排序：勾選框列表（每欄一個 checkbox，選要輸出的欄，
  維持原始欄位順序，不做拖曳排序）+ 下拉選單選排序欄位／方向（升冪/降冪），排序
  邏輯呼叫 `csv-types.js` 的 `inferColumnTypes()` 做型別感知排序（數字欄位當數字
  排序、非數字欄位當字串排序）。選取／排序後的結果同步反映在右側預覽（Table 呈現）
  與後續匯出。
  **驗收**：情境：取消勾選部分欄位後，預覽與匯出的 Table 只包含勾選欄位，欄位順序
  維持原始 CSV 欄位順序；情境：對一個數字欄位排序，結果依數值大小排列（不是字串
  排序，例如 `2` 要排在 `10` 前面）；情境：對一個文字欄位排序，結果依字串排序；
  情境：排序不影響原始上傳的 CSV 資料本身（原始 `Table` 物件不被直接修改，排序
  只影響呈現層或建立新的排序後陣列）。

- [x] 6. 實作 CSV → Markdown Table／HTML Table 匯出：依目前的欄位選擇與排序狀態
  產生對應格式字串。
  **驗收**：情境：3 欄 5 列的 CSV 選取全部欄位輸出 Markdown Table，貼到任一
  Markdown 渲染器（或本工具自己的預覽）能正確顯示為表格；情境：只選 2 個欄位時，
  輸出的 Markdown/HTML Table 只包含這 2 欄，對應 PRD 驗收條件「CSV 可選部分欄位
  生成 Markdown Table」；情境：欄位值含 `|`（Markdown Table 分隔符）或 `<`/`>`
  等 HTML 特殊字元時，輸出結果正確逸出，不破壞表格格式或造成 HTML 注入。

- [x] 7. 實作 Copy Markdown／Copy HTML：接 `shared/io-clipboard.js` 既有的
  `copyToClipboard()`，依目前分頁（Markdown 模式或 CSV 模式）複製對應格式的內容。
  **驗收**：情境：Markdown 模式下點擊「Copy Markdown」，剪貼簿內容為使用者輸入的
  原始 Markdown 文字；情境：CSV 模式下點擊「Copy HTML」，剪貼簿內容為目前欄位
  選擇／排序狀態下的 HTML Table 字串，貼到瀏覽器或文書軟體能正確顯示為表格。

- [x] 8. 實作「至少一種乾淨列印模板」：**前置條件——`shared/print.css` 必須已由
  `sdd/print-infra/` 前置工程建立完成**。本任務只需把 `shared/print.css` 的內容
  逐字複製進 `src/index.html` 的 `<style>` 區塊（比照 `base.css` 現有的內嵌慣例，
  註明來源與「勿手動修改」），不重新設計版面規則。
  **驗收**：情境：瀏覽器列印預覽（`window.print()` 或直接開發者工具的列印模擬）
  顯示乾淨版面，不含本工具的操作按鈕與導覽列；情境：CSV Table 與 Markdown 內容
  兩種模式各自列印預覽一次，確認版面合理（不因為欄位過多而超出紙張寬度崩版）；
  情境：`src/index.html` 內複製的 `print.css` 內容與 `shared/print.css` 源頭逐字
  一致（可用簡單 diff 或人工比對確認，避免複製時手改走樣）。

- [x] 9. 共通 UI 基線與整合驗收：`buildCleanHtmlCopy()` 清空目前輸入內容、欄位
  選擇／排序狀態、`#__shared_toast` 元素，移除 `.nav-back` 與站內連結；建立
  `src/bundle.json` 並跑 `scripts/bundle.py` 產出 `index.html`／`bundle_manifest.json`。
  **驗收**：情境：完整操作一輪（貼 Markdown → 下載 HTML → 切換 CSV → 上傳 → 選欄位
  → 排序 → Copy → 列印預覽）後點擊「下載本工具離線版」，`file://` 開啟下載到的
  `index.html`，重新走一次完整流程結果一致；情境（比照既有慣例，測試資料使用
  可辨識的哨兵字串）：離線版載入後 `document.getElementById('__shared_toast') ===
  null`、`document.querySelectorAll('.nav-back').length === 0`、載入時 `pageerror`
  與 console error 皆為空（Playwright 斷言，非原始碼 grep）。

## 驗收條件（總結，抄自 PRD 07 並補充）

- 情境：Markdown 可輸出離線 HTML。
- 情境：CSV 可選部分欄位生成 Markdown Table。
- 情境：輸出 HTML 不需重新上傳原始檔。
- 情境：三種輸出模式（Copy Markdown／Copy HTML／下載單一 HTML）在 Markdown 與 CSV
  兩種輸入模式下皆能正確運作，不因切換模式而失效。
