# Day 16 開發日誌 — Screenshot Privacy Sanitizer

- 日期：2026-08-24
- 執行者：Antigravity Agent
- 狀態：已完成實作、建置與 Playwright 驗證

## 實作紀要
1. 建立 `Day16_screenshot-sanitizer/` 專案目錄與 `src/bundle.json`。
2. 實作 `src/index.html`，串接 `shared/img-decode.js`、`shared/img-exif.js`、`shared/io-clipboard.js` 與 `shared/io-dropzone.js`。
3. 實作黑箱（Blackout）、馬賽克（Pixelate）、高斯模糊（Blur）三種底層像素遮蔽演算法。
4. 實作基於 `cleanCanvas` 與 `maskOps` 佇列的非破壞性重繪與 Undo/Redo 機制。
5. 實作 Before/After 對照模式（Before 模式鎖定匯出防呆）。
6. 實作匯出安全截圖（Rasterize + 移除 EXIF Metadata）與 `buildCleanHtmlCopy()` 離線版。
7. 使用 Playwright 進行端到端自動化測試與截圖。
