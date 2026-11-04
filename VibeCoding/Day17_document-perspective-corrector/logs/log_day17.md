# Day 17 開發日誌 — 文件照片透視校正器

- 日期：2026-08-24
- 執行者：Antigravity Agent
- 狀態：已完成實作、建置與 Playwright 驗證

## 實作紀要
1. 建立 `Day17_document-perspective-corrector/` 專案目錄與 `src/bundle.json`。
2. 實作 `src/index.html`，串接 `shared/img-perspective.js`、`shared/img-decode.js`、`shared/img-canvas.js`。
3. 實作四角點拖曳互動（正規化座標架構）、SVG 輔助導線與 90° 自由旋轉。
4. 實作單應性矩陣反向映射與雙線性插值透視投影。
5. 實作亮度、對比與黑白灰階文件增強濾鏡。
6. 實作 JPG/PNG 下載、@media print 單頁 PDF 輸出與 `buildCleanHtmlCopy()` 離線版。
7. 使用 Playwright 進行端到端功能與哨兵驗收通過。
