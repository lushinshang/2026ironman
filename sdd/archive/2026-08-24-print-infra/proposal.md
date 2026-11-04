# 前置工程：列印樣式共用模組（`shared/print.css`）

> 依 `sdd/LEVEL1D_RULINGS.md` 裁示 19 建立。Day26（`office-content-publisher`）
> 開工前必須完成，不放進 Day26 自己的 `tasks.md`——Day26 只需要引用本工程的產出，
> 不負責抽取既有程式碼。

## 為什麼做

`IMG_CONTRACT.md` 訂下「第三題才升級為共用」的判準（列印／版面類邏輯 v.s.
EXIF／homography 這種資料正確性邏輯門檻不同，版面允許各做各的直到第三次出現）。
到 Day26 為止，需要 `@media print` 版型的產品累積到三題：

- Day13（`csv-one-page-report`）：單頁 KPI 報告列印
- Day18（`photo-evidence-sheet`）：A4 多頁照片附件列印
- Day26（`office-content-publisher`）：Markdown/CSV 內容列印

第三題出現，達到門檻，這次真的要抽取成 `shared/print.css`，不是提前投機共用。

## 已讀證據（實際讀了 Day13、Day18 現有列印 CSS，不是憑印象假設）

讀 `VibeCoding/Day13_csv-one-page-report/src/index.html`（390–430 行 `@media print`
區塊）與 `VibeCoding/Day18_photo-evidence-sheet/src/index.html`（206–208、281–290 行）
後確認：

- **兩者共通、且真正跟「印表機版面機制」有關的部分很薄**：`.no-print { display:none
  !important }` 隱藏操作按鈕、`body { background:#fff }` 避免深色背景印出灰底、
  `@page { size: A4 portrait; margin: 10mm }`（Day18 有明確設定，Day13 沒有設定
  `@page`，因為 Day13 是單頁報表不需要強制 A4 分頁）。
- **兩者各自的內容排版部分高度綁定各自的 class 名稱**：Day13 的 `.report-section`／
  `.kpi-grid`／`.rank-table`，Day18 的 `.a4-page`／`.a4-header`／`.a4-title`；這些
  是各題自己的內容結構，**不屬於共用範圍**，抽取時不要硬拉近兩者的版面語意。
- **`bundle.py` 目前沒有 CSS 類型的 `SHARED:` placeholder**——`resolve_shared()`
  （`scripts/bundle.py` 第 66 行）硬編碼只解析 `SHARED_DIR / (name + ".js")`。
  `shared/base.css` 現有的內嵌方式是「逐字複製貼進各題 `src/index.html` 的
  `<style>` 區塊，並註明來源與『勿手動修改』」，是純手動同步慣例，不是自動 build
  流程。**`shared/print.css` 沿用同一個慣例，不修改 `bundle.py`**——這不是本次
  提案階段查出的技術缺口需要補，只是確認既有模式適用。

## 要改什麼

- 新增 `VibeCoding/shared/print.css`：只收錄跨題真正共通的印表機版面機制，範圍
  暫定：
  - `.no-print { display: none !important; }`
  - `body { background: #fff; }`（print context 下）
  - `@page { size: A4 portrait; margin: 10mm; }`（可選用，需要強制 A4 分頁的題目
    才引用這條；Day13 這種單頁報表可以只引用 `.no-print` 與 `body` 兩條，不強制
    套用 `@page`）
  - 具名的分頁工具 class（例如 `.print-page-break { page-break-after: always;
    break-inside: avoid; }`），供 Day18／未來需要多頁分頁的產品使用，Day13 目前
    用不到這條
- 修改 `VibeCoding/Day13_csv-one-page-report/src/index.html`：把現有
  `@media print` 區塊裡跟 `shared/print.css` 重複的規則（`.no-print`、
  `body { background }`）改為引用（逐字複製）共用版本，Day13 專屬的
  `.report-section`／`.kpi-grid`／`.rank-table` 規則留在原地不動。
- 修改 `VibeCoding/Day18_photo-evidence-sheet/src/index.html`：把現有
  `@page`／`.no-print`／`body { background }` 改為引用共用版本，`.a4-page`／
  `.a4-header` 等 Day18 專屬規則留在原地不動。
- 兩題重新 `python3 scripts/bundle.py` 各自的 `src/ 目錄` 產出 `index.html`／
  `bundle_manifest.json`。

## 影響範圍

**新增檔案**：`shared/print.css`。

**修改既有已上線產品**：`Day13_csv-one-page-report/src/index.html`、
`Day18_photo-evidence-sheet/src/index.html`（皆為抽取共用邏輯，視覺輸出不應改變）
及兩者重新 bundle 後的 `index.html`／`bundle_manifest.json`（sha256 會變動，
這是預期中的變動，因為引用內容改變，不是回歸）。

**不影響 Level 1a／1c 任何產品**（列印樣式只有 Day13、Day18、Day26 用到）。

**不修改 `bundle.py`**（沿用既有 `base.css` 手動複製慣例，已在上方確認）。

## ASCII wireframe

無（本前置工程不改變任何產品的畫面呈現，只是把既有 CSS 規則搬家，wireframe 不適用）。
