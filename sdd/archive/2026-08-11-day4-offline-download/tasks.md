# 任務：Day4 單一 HTML 離線下載

- [x] 1. `grep` 全文確認 `btn-download-tool` 這個 id 目前沒有被使用，避免跟既有的 `btn-download-masked`、`btn-mask`、`btn-detect` 等 id 衝突
- [x] 2. 實作 `buildCleanHtmlCopy()`：複製 DOM、移除 `.nav-back`、**移除下載按鈕自己**（一開始就做，不是事後補）、清空三個文字輸入區、確保 `#result-section` 隱藏、reset toast
- [x] 3. 新增「下載本工具（離線使用）」按鈕與對應的 `addEventListener`（含元素存在性防呆），觸發下載 `.html` 檔案
- [x] 4. 端對端驗證：起本機 server 下載出檔案，把檔案放到完全隔離的另一個目錄、另一個 port 開啟，確認：
   - 個資偵測、機敏字庫代換、執行遮蔽等既有功能正常運作
   - 用真正的 `DragEvent('drop', {dataTransfer})` 測試拖曳 .txt 檔案到輸入區，確認離線複本裡拖曳依然可用
   - 下載出的 HTML 內容裡沒有 `<button id="btn-download-tool">` 這個元素（用 `grep`／DOM 查詢確認，不是只看畫面）
   - 下載出的 HTML 內容裡沒有 `.nav-back` 或任何指向外部（`../index.html`）的連結
   - Network 面板監看整個操作流程，零對外請求
- [x] 5. 更新 `Day4/SECURITY_REVIEW.md`（新增這個功能的源碼檢測）、`Day4/README.md` 開發日誌與進度勾選

## 驗收條件

1. 情境：當點擊「下載本工具（離線使用）」，就會下載一個 `.html` 檔案。
2. 情境：當把下載出的檔案放到完全隔離的另一個目錄、另一個 port 開啟，貼上文字並執行偵測與遮蔽，就會正常運作、結果跟原始頁面一致。
3. 情境：當檢查下載出的 HTML 內容，就不會有 `#btn-download-tool` 這個按鈕元素。
4. 情境：當檢查下載出的 HTML 內容，就不會有 `.nav-back` 或任何指向 `../index.html` 的外部連結。
5. 情境：當對下載出的 HTML 用真正的 `DragEvent('drop', {dataTransfer})` 拖曳一個 .txt 檔案到輸入區，就會正確讀取內容並帶入。
6. 情境：當用瀏覽器開發者工具監看 Network 面板操作下載出的 HTML，就不會出現任何對外請求。
