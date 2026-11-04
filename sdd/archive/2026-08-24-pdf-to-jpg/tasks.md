# Tasks：PDF_TO_JPG 重製版（pdf-to-jpg）

> 前置條件：`sdd/pdf-infra/` 已完成並驗收（`pdf-decode.js`／`pdf-file-size.js` 皆就緒）。
> 本檔**不包含**接 pdf.js、處理 Worker Blob URL 的任務，只呼叫既有函式，見
> `VibeCoding/shared/PDF_CONTRACT.md`。品質設定範圍（不做目標容量二分逼近）、渲染
> 倍率（縮圖 0.3／輸出 2）與檔名規則已依 `sdd/LEVEL1D_RULINGS.md` 第 1–3 條裁示定案，
> 本檔即依裁示結果撰寫，非暫定骨架。

- [x] T1 建立 `Day19_pdf-to-jpg/src/index.html` 版面骨架：上傳區（接
  `checkPdfFileSize()` gate + `loadPdfFile()`，讀檔前先過大小閘門，`reject` 時不進入
  `loadPdfFile()`）、頁數與檔名顯示、品質滑桿、「開始轉換」按鈕、頁面縮圖網格、進度條、
  「打包下載 ZIP」按鈕、共通三按鈕；套用 `shared/base.css`。
  **驗收**：情境：上傳一份超過 `pdf-file-size.js` 拒絕門檻的大型 PDF，畫面顯示拒絕
  訊息且不進入 `loadPdfFile()`；情境：上傳一份 10 頁正常大小的 PDF，畫面顯示檔名與
  「總頁數：10」。

- [x] T2 實作縮圖渲染：上傳成功後逐頁呼叫 `renderPageToCanvas(pdfDoc, pageIndex, {
  scale: 0.3 })`（倍率依 `LEVEL1D_RULINGS.md` 第 2 條裁示定案）產生縮圖網格，每個
  縮圖標示頁碼。
  **驗收**：情境：10 頁 PDF 上傳後，畫面出現 10 個縮圖項目，順序與頁碼對應正確；
  情境：縮圖內容與該頁 PDF 實際版面（用系統 PDF 檢視器對照）肉眼一致，不是空白或
  錯位。

- [x] T3 實作轉換管線：使用者按下「開始轉換」後，依序對每頁呼叫
  `renderPageToCanvas(pdfDoc, pageIndex, { scale: 2 })` 取得高解析度 canvas，再呼叫
  `img-canvas.js` 的 `canvasToBlob(canvas, 'image/jpeg', quality)` 輸出 JPG；
  `setTimeout(0)` 逐頁排程，不在單一同步迴圈跑完整份 PDF；每頁完成即更新進度條與該頁
  縮圖為轉換後的 JPG 預覽。
  **驗收**：情境：10 頁 PDF 轉換過程中進度條依序顯示「第 1/10 頁」到「第 10/10 頁」；
  情境：轉換過程中頁面仍可捲動、其他按鈕仍可點擊（主執行緒未長時間 block）；情境：
  轉換完成後每個縮圖顯示的是轉換後的 JPG，非原始 PDF 渲染畫面。

- [x] T4 實作單頁下載：每個已完成轉換的縮圖項目提供獨立下載按鈕，依
  `LEVEL1D_RULINGS.md` 第 3 條裁示命名（`{原始檔名}_p{補零頁碼}.jpg`），尚未轉換
  完成的項目下載按鈕 disabled。
  **驗收**：情境：轉換完成後點擊第 3 頁的下載按鈕，只下載該頁 JPG，檔名符合命名規則；
  情境：尚未轉換完成的項目下載按鈕不可點擊。

- [x] T5 實作 ZIP 打包下載：全部頁面轉換完成後，把每頁輸出 Blob 轉為 `Uint8Array`
  交給 `io-zip.js` 的 `createZipBlob()`，檔名沿用 T4 的命名規則。
  **驗收**：情境：10 頁 PDF 全部轉換完成後點擊「打包下載 ZIP」，下載的 zip 解壓後含
  10 個 JPG 檔案，順序與命名對應各頁頁碼，個別檔案能被圖片檢視器正常開啟；情境：
  ZIP 內容與逐頁單獨下載的檔案內容一致（同一頁下載兩種方式取得的圖片相同）。

- [x] T6 共通 UI 基線與整合驗收：複製結果（`shared/io-clipboard.js`，複製「檔名／
  總頁數／已轉換頁數」摘要文字）；`buildCleanHtmlCopy()` 清空已上傳 PDF、頁面縮圖、
  轉換結果、`#__shared_toast`，移除 `.nav-back` 與站內連結；建立 `src/bundle.json` 並
  跑 `scripts/bundle.py` 產出 `index.html`／`bundle_manifest.json`。
  **驗收**：情境：完整操作一輪（上傳→開始轉換→單頁下載→打包 ZIP）後點擊「下載本
  工具離線版」，`file://` 開啟下載到的 `index.html`，重新走一次完整流程結果一致；
  情境（測試 PDF 內文含可辨識的哨兵文字，例如 `ZZPDFTOJPG`）：離線版載入後
  `document.getElementById('__shared_toast') === null`、
  `document.querySelectorAll('.nav-back').length === 0`、載入時 `pageerror` 與
  console error 皆為空（Playwright 斷言，非原始碼 grep）；情境：`scripts/bundle.py`
  執行後產出的 `index.html` 用 `file://` 與本機伺服器各測一次完整流程，上傳同一份
  測試 PDF 後轉換結果一致。

## 驗收條件（總結，抄自 PRD 02 並補充）

- 情境：10 頁 PDF 產生 10 張 JPG。
- 情境：可只下載指定頁。
- 情境：全部下載時得到含所有頁面的 ZIP。
- 情境：離線 HTML 仍可轉換。
- 情境：上傳一個非 PDF 檔案（例如把 `.jpg` 改副檔名成 `.pdf`），畫面顯示明確錯誤
  訊息，不整頁崩潰、不顯示空白頁面縮圖。
