# Day 21 開發日誌 — PDF 拆分 / 合併 / 重排工作台

- 日期：2026-08-24
- 執行者：Antigravity Agent
- 狀態：已完成實作、建置與 Playwright 驗證

## 實作紀要
1. 建立 `Day21_pdf-organizer/` 專案目錄與 `src/bundle.json`。
2. 實作多檔案批次匯入（`checkPdfBatchSize` 閘門）與來源檔案清單渲染。
3. 實作跨來源虛擬頁面索引 `state.pages`，逐頁渲染 0.3x 輕量縮圖並標註來源檔案編號與頁碼。
4. 實作原生拖曳排序（HTML5 / Pointer drag events），具備拖曳狀態與 `drag-over` 視覺高亮。
5. 實作單頁 90° 順時針旋轉（即時 CSS transform）與標記刪除 / 復原機制。
6. 實作輸出群組管理（支援新增多群組、群組切換檢視與群組刪除時自動歸併）。
7. 實作 `mergePdfDocs` 輸出管線（單一群組下載單一 PDF，多群組自動使用 `createZipBlob` 打包 ZIP）。
8. 實作 `buildCleanHtmlCopy()` 離線版與哨兵字串 `ZZPDFORG` 檢驗。
9. 使用 Playwright 進行端到端功能驗收通過。
