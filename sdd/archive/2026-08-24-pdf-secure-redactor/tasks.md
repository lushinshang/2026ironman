# Tasks：PDF 安全遮蔽 / Flatten（pdf-secure-redactor）

> 前置條件：`sdd/pdf-infra/` 完成並驗收（`pdf-decode.js`／`pdf-build.js`／
> `pdf-file-size.js` 就緒）。本檔不包含「接 pdf.js」「接 pdf-lib」之類的任務，直接引用
> 契約簽名，見 `VibeCoding/shared/PDF_CONTRACT.md`。待裁示結果套用後再開工，見
> `proposal.md`「待裁示」段落。

- [x] 1. 建立 `Day24_pdf-secure-redactor/src/index.html` 版面骨架與上傳流程：上傳區
  （接 `checkPdfFileSize()` gate + `loadPdfFile()`，讀檔前先過大小閘門）、頁面縮圖列表
  （呼叫 `renderPageToCanvas()` 逐頁產生縮圖）、三個共通按鈕（`CONTRACT.md` 第 6 節
  基線）；套用 `shared/base.css`。
  **驗收**：情境：上傳一份超過大小閘門上限的 PDF，畫面顯示拒絕訊息且不進入
  `loadPdfFile()`；情境：上傳一份正常大小的多頁 PDF，畫面依序顯示每一頁的縮圖，
  縮圖數量與 `getPageCount()` 相符。

- [x] 2. 實作框選互動：使用者在任一頁縮圖／預覽畫面上用滑鼠拖曳出矩形框選區域，
  支援同一頁多個框選區域；畫面座標換算成 `renderPageToCanvas()` 輸出的 canvas 實際
  像素座標（比照 Day16 的座標系換算慣例），存進 `redactBoxes: Array<{pageIndex, x, y,
  w, h, color}>`。
  **驗收**：情境：在同一頁框選兩個不重疊的矩形區域，`redactBoxes` 陣列正確記錄兩筆、
  `pageIndex` 相同；情境：框選區域的視覺位置與滑鼠拖曳範圍一致（非偏移、非縮放錯誤）。

- [x] 3. 實作移除單一框選區域（點擊框選框上的移除按鈕，或框選列表逐項刪除）。
  **驗收**：情境：框選 3 個區域後移除中間那個，`redactBoxes` 剩下 2 筆且對應到正確的
  剩餘兩個區域，畫面同步更新不再顯示被移除的框。

- [x] 4. 實作 Rasterize 邏輯：對每個至少有一筆 `redactBoxes` 的頁面，呼叫
  `renderPageToCanvas(pdfDoc, pageIndex, {scale: 2})`（固定值，依 `LEVEL1D_RULINGS.md`
  第 13 條裁示，不做畫質可選 UI）取得該頁 canvas，依序對該頁的每個框選區域
  `fillRect()` 填滿對應顏色，`canvasToBlob()` 輸出 PNG，透過 `pdf-build.js` 的
  `embedPng()` 建立與原頁同尺寸的新頁面取代原頁。
  **驗收**：情境：對一頁套用兩個黑色框選區域後 Rasterize，輸出的該頁畫面在兩個框選
  位置顯示純黑色塊，其餘畫面內容與原頁一致；情境：框選使用非黑色（例如白色）遮蔽色，
  輸出頁面對應位置顯示該顏色。

- [x] 5. 實作未框選頁面的原樣保留：沒有任何 `redactBoxes` 的頁面透過 `pdf-build.js` 的
  `copyPages()` 直接複製，不經過 Rasterize，與任務 4 的 Rasterize 頁面依原始頁碼順序
  組裝成最終 PDF。
  **驗收**：情境：一份 5 頁 PDF 只框選第 3 頁，輸出 PDF 仍為 5 頁，第 1/2/4/5 頁的文字
  仍可被 `extractPageText()` 正確擷取（未被轉成圖片）；情境：輸出 PDF 頁面順序與原始
  PDF 一致，第 3 頁在正確位置被替換成 Rasterize 結果。

- [x] 6. 實作 UI「顯示哪些頁被 Rasterize」：畫面針對每一頁顯示標籤區分「已轉換為圖片
  （不可還原文字）」與「原樣保留」，下載前即可檢視。
  **驗收**：情境：框選第 2、4 頁後，畫面上第 2、4 頁標示為已轉換、其餘頁標示為原樣
  保留，標示與任務 4/5 的實際輸出結果一致（不是獨立算出來的另一套判斷邏輯）。

- [x] 7. 實作輸出下載：`canvasToBlob()`／`pdf-build.js` 產出最終合成 PDF 的
  `Uint8Array`，經 `shared/io-download.js` 下載，檔名與原始檔名不同。
  **驗收**：情境：點擊「下載遮蔽後 PDF」，下載的檔名與原始上傳檔名不同；情境：下載
  的檔案能被系統內建 PDF 檢視器正常開啟，頁數與畫面預覽一致。

- [x] 8. 核心驗收（哨兵測試，對應 PRD 三條驗收條件）：準備一份含有明確可辨識敏感格式
  假資料（例如身分證字號格式的合成測試字串，非真實個資）的真實 PDF 作為測試素材。
  **驗收**：情境（正向哨兵，證明測試素材有效）：遮蔽前對含假資料的頁呼叫
  `extractPageText()`，能擷取到該假資料字串；情境（負向哨兵，核心驗收）：框選蓋住該
  假資料所在區域並完成 Rasterize、輸出後，對輸出 PDF 同一頁重新呼叫
  `extractPageText()`，**擷取不到**該假資料字串（理想情況下該頁擷取結果為空字串）；
  情境：對輸出 PDF 用文字工具嘗試框選複製該頁任意位置，複製不到任何文字內容（若
  Playwright 或工具限制無法直接模擬「文字選取複製」，改用 `extractPageText()` 的結果
  作為等價證明，並在回報中說明用哪種方式驗證）；情境：未框選的頁面重新擷取文字，
  內容與原始 PDF 完全一致（未被意外波及）。

- [x] 9. 共通 UI 基線與整合驗收：複製結果（`shared/io-clipboard.js`，複製處理狀態摘要
  文字，例如「共 5 頁，其中第 2、4 頁已遮蔽」）；`buildCleanHtmlCopy()` 清空已上傳
  PDF、框選狀態、頁面標籤、`#__shared_toast` 元素，移除 `.nav-back` 與站內連結；建立
  `src/bundle.json` 並跑 `scripts/bundle.py` 產出 `index.html`／`bundle_manifest.json`。
  **驗收**：情境：完整操作一輪（上傳→框選→Rasterize→下載）後點擊「下載本工具離線版」，
  `file://` 開啟下載到的 `index.html`，重新走一次完整流程結果一致；情境：離線版載入後
  `document.getElementById('__shared_toast') === null`、
  `document.querySelectorAll('.nav-back').length === 0`，載入時 `pageerror` 與
  console error 皆為空（Playwright 斷言，非原始碼 grep）。
