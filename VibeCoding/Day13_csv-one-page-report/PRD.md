# PRD 11 — CSV 一頁式管理報告（csv-one-page-report）

> 來源：`2026-ironman-vibecoding-30-prd.md` PRD 11，本檔為 Day13 產品對應整理。
> 詳細規格與判斷理由見 `sdd/csv-one-page-report/proposal.md`，任務拆解見 `sdd/csv-one-page-report/tasks.md`。

- **英文短名稱**：`csv-one-page-report`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/csv-one-page-report/`
- **互動模式**：按鈕觸發（非即時，見 `CSV_CONTRACT.md` 精神延伸）

## 為什麼做

資料分析完成後，主管通常不是要操作樞紐表，而是要快速看懂 KPI、排名與趨勢——一張能列印出來、帶去開會的紙。

## 輸入

拖放或選取一份 CSV 檔案（<5MB 直接處理、5–20MB 顯示提示、>20MB 拒絕）。

## MVP

- 選擇核心數值欄（measure）與核心分類欄（dimension）。
- KPI Cards：SUM／AVG／COUNT／MAX。
- Top 5 / Bottom 5（依 dimension 分組、對 measure 做 SUM 聚合）。
- 分類占比（≤9 全畫；≥10 取前 8 + 「其他」）。
- 日期資料趨勢（月分組，範圍 < 31 天退化為日分組；無日期欄時顯示提示）。
- 自訂報告標題／期間／註記（皆需 `escapeHtml()` 跳脫，防 XSS）。
- 列印版型（A4 直式，分頁控制，SVG 列印相容）。
- 匯出單一 HTML（凍結已計算結果，不需重新上傳 CSV）。

## 不做

AI 文字結論、多頁 BI 平台、多欄 Group By、多種 Aggregate 切換、圖表類型切換、互動式 Filter、時間粒度切換（皆屬 `csv-pivot-dashboard` 的範圍）。

## Level 1 共通 UI 基線（`shared/CONTRACT.md` 第 6 節）

- 複製報告文字摘要（`io-clipboard.js`）
- 匯出單一 HTML（`io-download.js`，內含完整計算結果）
- 下載本工具離線版（`buildCleanHtmlCopy()`，清空所有使用者資料，移除 `.nav-back` 與 `#__shared_toast`）

## 判定規則（詳見 `sdd/csv-one-page-report/proposal.md` 與 `CSV_CONTRACT.md`）

- 空值定義：`CSV_CONTRACT.md` 第 3.2 節，空值 = 空字串 `''`。
- 型別判準：一律用 `inferColumnTypes()` 的 `kind`、`toNumber()`、`isDateLike()`、`dateParts()`（第 4.0b 節），不自加門檻。
- 取格：一律 `cellAt(row, i)`，不得直接 `row.cells[i]`（第 3.2.1 節）。
- 大檔案門檻：`checkCsvFileSize()`（第 5 節）。
- 編碼：`decodeCsvBytes()` 三段式（BOM／strict／fallback），fallback 時提供手動切換編碼下拉，切換後標記 `confidence: 'manual'`（第 7.2 節）。
- 分類占比合併門檻：`CSV_CONTRACT.md` 第 7.4b 節，≤9 全畫、≥10 取前 8 + 灰階「其他」。
- 日期趨勢：固定依月分組，日期範圍 < 31 天退化為日分組；`dateParts()` 回傳 `m`／`d` 為 `null` 的列排除出趨勢分組，不得用 0/1 補齊。

## 驗收條件

詳見 `sdd/csv-one-page-report/tasks.md`（PRD 驗收條件 1–3 對應 task 3–6、7、8；XSS／離線版對應 task 7、9）。

## Library / 依賴

- Papa Parse 5.6.0（CSV 解析，經 `shared/csv-parse.js` 包裝）
- `shared/ui-chart-svg.js`（Day12 建立，本題直接使用）
- 其餘見 `shared/CONTRACT.md`、`CSV_CONTRACT.md`
