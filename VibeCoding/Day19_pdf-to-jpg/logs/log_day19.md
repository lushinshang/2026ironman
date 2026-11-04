# Day 19 開發日誌 — PDF 轉高畫質 JPG 工具

- 日期：2026-08-24
- 執行者：Antigravity Agent
- 狀態：已完成實作、建置與 Playwright 驗證

## 實作紀要
1. 建立 `Day19_pdf-to-jpg/` 專案目錄與 `src/bundle.json`。
2. 實作 `src/index.html`，串接 `shared/pdf-decode.js`、`shared/pdf-file-size.js`、`shared/img-canvas.js`、`shared/io-zip.js`。
3. 實作二階縮放策略：上傳後 scale: 0.3 產生縮圖網格，轉換時 scale: 2.0 產出高畫質 JPG。
4. 實作非同步逐頁轉換迴圈（setTimeout 讓出主執行緒），具備即時進度條與狀態指示。
5. 支援單頁獨立下載（命名如 `{base}_p01.jpg`）與批次 ZIP 打包下載。
6. 實作 `buildCleanHtmlCopy()` 離線版與哨兵字串 `ZZPDFTOJPG` 檢驗。
7. 使用 Playwright 進行端到端功能驗收通過。
