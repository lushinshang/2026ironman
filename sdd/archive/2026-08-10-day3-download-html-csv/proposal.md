# 提案：Day3 文字差異比對器 —— 新增下載為 HTML、CSV 功能

## 為什麼做

目前 `Day3/index.html` 比對結果只能下載為 Markdown（`buildMarkdownReport` + `btn-download-report`，見 `index.html:2367`、`index.html:2493`）。使用者提出需要再新增「下載為 HTML」與「下載為 CSV」兩種格式：

- **HTML**：可直接雙擊在瀏覽器開啟、保留顏色（新增/刪除/修改）視覺區分，不像 MD 純文字要另外找工具渲染，適合分享給不寫程式的人（例如採購案的其他承辦）。
- **CSV**：可直接用 Excel／Google Sheets 開啟，方便逐列篩選、排序、加註記，符合合約比對常見的後續工作流程（例如只看「修改」列）。

## 要改什麼

在既有 `buildMarkdownReport`（`index.html:2367`）旁新增兩個對應函式，並各自掛一個下載按鈕，沿用既有 `Blob` + `URL.createObjectURL` 下載模式（`index.html:2493-2505`）：

1. **`buildHtmlReport(rows, counts)`**：組出一份獨立、可離線開啟的 HTML 字串（含最基本內嵌 CSS，重用現有 `.type-added`/`.type-removed`/`.type-modified`/`.type-unchanged` 的配色邏輯，不依賴外部檔案）。**每一句原文都必須做 HTML escape**（`&`、`<`、`>`、`"`、`'`）再拼進字串——貼上的文字是使用者輸入，可能包含尖括號等字元，沒 escape 會讓下載出來的 HTML 檔案本身結構跑掉，甚至讓瀏覽器把使用者文件裡的內容當成標籤/腳本解讀。新增一個 `escapeHtml` 輔助函式做這件事，其餘既有的 `renderDiff`（畫面渲染用 `textContent`/`createElement`）不受影響、不修改。
2. **`buildCsvReport(rows, counts)`**：輸出 UTF-8 CSV，欄位為「類型、舊版內容、新版內容」，每列對應一筆 `rows[]`。依 RFC 4180 規則處理欄位轉義（內容含逗號、雙引號、換行時要用雙引號包住，欄位內雙引號要 double 成 `""`），新增 `escapeCsvField` 輔助函式。開頭加 UTF-8 BOM（`﻿`）避免 Excel 開啟中文亂碼。
3. **UI**：在現有「下載差異報告 MD」按鈕（`index.html:271` 一帶）旁新增「下載差異報告 HTML」「下載差異報告 CSV」兩顆按鈕，各自綁定 click handler，邏輯與現有 MD 下載 handler 同構（檢查 `window.Day3App.lastRows` 是否存在、组字串、包 Blob、觸發下載、`revokeObjectURL`）。
4. 兩個新函式都掛到 `window.Day3App`（比照 `buildMarkdownReport` 已掛的做法），方便測試時直接呼叫驗證輸出內容，不必真的觸發瀏覽器下載。

## 影響範圍

- **只改**：新增 `buildHtmlReport`、`buildCsvReport`、`escapeHtml`、`escapeCsvField` 四個函式，新增兩顆下載按鈕與對應 click handler。
- **不改**：`computeDiff`、`splitIntoSentences`、`normalizeForCompare`、`sentenceSimilarity`、`renderDiff`、`renderStats`、既有 MD 下載邏輯、既有配色/CSS class 命名。
- **資安**：延續 `SECURITY_REVIEW.md` 既有原則——畫面渲染不用 `innerHTML`；但這次新增的 HTML **報告內容**本質上就是要產生一段 HTML 字串供下載（不是寫進當前頁面 DOM），所以必須額外做 `escapeHtml` 逐字轉義，防止使用者貼上的文字污染輸出檔案結構，這點会在任務中特別驗證（貼入含 `<script>`、`&`、`"` 的測試字串，確認輸出檔案中該字元被正確轉義而非原樣輸出）。
- **需要重新驗證**：現有 MD 下載按鈕與既有 8 組回歸測試不受影響（純新增，不動既有函式），但仍需跑一次既有回歸測試確認没有意外破壞。
