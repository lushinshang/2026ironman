# Day 20 開發日誌 — PDF 文字擷取與全文搜尋

- 日期：2026-08-24
- 執行者：Antigravity Agent
- 狀態：已完成實作、建置與 Playwright 驗證

## 實作紀要
1. 建立 `Day20_pdf-text-search/` 專案目錄與 `src/bundle.json`。
2. 實作 `src/index.html`，串接 `shared/pdf-decode.js` 之 `extractAllText` 進行文字層擷取。
3. 實作文字層缺失偵測：整份檔案無文字時提示掃描檔警語；單頁無文字時獨立標註不誤報。
4. 實作全文搜尋（150ms debounce、大小寫不敏感、前後 30 字元摘要與 `<mark>` 高亮）。
5. 實作平滑捲動跳轉與 `.highlight-pulse` CSS 邊框發光動畫。
6. 支援 TXT、Markdown 格式下載與一鍵剪貼簿複製。
7. 實作 `buildCleanHtmlCopy()` 離線版與哨兵字串 `ZZPDFSEARCH` 檢驗。
8. 使用 Playwright 進行端到端功能驗收通過。
