# Tasks — print-infra（`shared/print.css` 前置工程）

> 前置條件：無，但必須在 Day26（`office-content-publisher`）任務 8 開工前完成。
> 依 `sdd/LEVEL1D_RULINGS.md` 裁示 19 建立。

- [x] 1. 建立 `VibeCoding/shared/print.css`：收錄 `.no-print { display: none
  !important; }`、`body { background: #fff; }`（print context）、
  `@page { size: A4 portrait; margin: 10mm; }`、`.print-page-break {
  page-break-after: always; break-inside: avoid; }` 四條規則，全部包在
  `@media print { ... }` 內（`@page` 例外，`@page` 不需要包在 `@media print`
  內，是獨立的 at-rule）。檔案開頭加註來源說明（比照 `base.css` 開頭的說明樣式）。
  **驗收**：情境：檔案內容只含上述通用規則，不含任何 Day13／Day18 專屬的 class
  名稱（`.report-section`／`.kpi-grid`／`.rank-table`／`.a4-page`／`.a4-header`
  一個都不該出現在這個檔案）；情境：用瀏覽器開發者工具的「列印模擬」載入一個
  只含 `<div class="no-print">測試</div>` 與這份 CSS 的最小 HTML，確認該 div
  在列印模式下不顯示。

- [x] 2. 修改 `VibeCoding/Day13_csv-one-page-report/src/index.html`：把現有
  `@media print` 區塊中的 `.no-print`、`body { background }` 規則替換為引用
  `shared/print.css` 對應內容（逐字複製到檔案內既有的 `<style>` 區塊，緊接在
  `base.css` 複製內容之後，並加註來源），`.report-section`／`.kpi-grid`／
  `.rank-table` 等 Day13 專屬規則保持原樣不動。同步檢查 `EXPORT_CSS`
  （1132–1133 行內嵌字串常數，供「下載本工具離線版」的獨立輸出頁面使用）是否也
  含重複規則，若有一併同步。
  **驗收**：情境：修改前後用瀏覽器「列印預覽」比對，視覺輸出（版面、隱藏的按鈕、
  背景色）完全一致，肉眼比對截圖無差異；情境：`.no-print` 元素在列印模式下依然
  正確隱藏；情境：`EXPORT_CSS` 產出的獨立離線報告頁面列印預覽同樣不變。

- [x] 3. 修改 `VibeCoding/Day18_photo-evidence-sheet/src/index.html`：把現有
  `@page`／`.no-print`／`body { background }` 規則替換為引用 `shared/print.css`
  對應內容，`page-break-after`／`break-inside` 若套用在 `.a4-page` 上就改用
  `.print-page-break`（需要同步在 HTML 結構加上這個 class，或維持 `.a4-page`
  自己定義但改為 `@extend`-style 手動複製共用規則值——選較不易破版的做法，
  以「修改前後列印輸出視覺一致」為準，不強求 class 名稱一定要換）。同步檢查
  `buildStandaloneReportHtml()` 內嵌的字串常數版列印 CSS（690–703 行附近）是否
  也含重複規則，若有一併同步。
  **驗收**：情境：修改前後用瀏覽器「列印預覽」比對 A4 多頁排版（至少測 5 張照片
  跨 2 頁的情境），版面、分頁位置、隱藏的按鈕完全一致；情境：獨立離線 HTML
  （`buildStandaloneReportHtml()` 產出）的列印預覽同樣不變。

- [x] 4. 兩題重新 bundle：`python3 scripts/bundle.py
  VibeCoding/Day13_csv-one-page-report/src VibeCoding/Day13_csv-one-page-report`、
  `python3 scripts/bundle.py VibeCoding/Day18_photo-evidence-sheet/src
  VibeCoding/Day18_photo-evidence-sheet`。
  **驗收**：情境：兩題重新 bundle 後 `bundle_manifest.json` 的 sha256 有變動
  （因為 `<style>` 內容改變），這是預期中的變動；情境：重新 bundle 後的
  `index.html` 用 `file://` 開啟，分別完整走一次各自既有的核心操作流程
  （Day13：上傳 CSV → 產生報告 → 列印預覽；Day18：匯入照片 → 排版 → 列印預覽），
  結果與 bundle 前一致，console 無新增錯誤。

## 驗收條件（總結）

- 情境：`shared/print.css` 只包含跨題共通的印表機版面機制，不含任何單一產品的
  內容排版規則。
- 情境：Day13、Day18 抽取共用邏輯前後，列印輸出視覺完全一致（這是本前置工程
  最核心的不可回歸要求——**抽取共用不代表可以順便調整既有已上線產品的列印版面**，
  若抽取過程中發現原本的規則其實有問題想順便修正，停下來回報，不要在這個前置
  工程裡夾帶額外修改）。
- 情境：Day26 開工前 `shared/print.css` 已存在且內容穩定，Day26 任務 8 可以
  直接引用不需要等待。
