# Tasks：Document Tools 重製版（`document-tools`，Day27）

> 前置條件：Level 1a-1d（Day01-26）已完成，`shared/img-decode.js`／`img-canvas.js`／
> `pdf-decode.js`／`pdf-build.js`／`io-zip.js`／`io-dropzone.js` 均已就緒可直接呼叫，
> 不含在本檔任務範圍。Markdown parser 複製自 `Day26_office-content-publisher`（見
> `proposal.md`「已讀證據」節），本檔不重寫 parser 邏輯，只搬移程式碼。

- [x] T1 建立 `Day27_document-tools/src/index.html` 版面骨架：三分頁籤（圖片／PDF／
  Markdown），套用 `shared/base.css`；每分頁各自的上傳/輸入區先留空殼，共通三按鈕
  （複製結果／下載離線版／清除）先接好但邏輯留待後續任務補。
  **驗收**：情境：開啟頁面預設顯示圖片分頁；情境：點擊「PDF」籤切到 PDF 分頁，
  圖片分頁內容隱藏；情境：三個籤互相切換時不遺失各籤內已輸入的資料（例如圖片籤
  已上傳檔案，切到 PDF 籤再切回來，圖片仍在）。

- [x] T2 圖片區：上傳（接 `io-dropzone.js` 批次匯入 + `checkImageFileSize()`／
  `checkBatchSize()` 閘門）→ `loadImageFile()` 讀檔轉正 → 顯示原圖尺寸/格式/大小 →
  選輸出格式（JPG/PNG/WebP）+ Resize 長邊上限（選填，呼叫 `resizeCanvas()`）+ 品質
  滑桿（僅 JPEG/WebP 顯示，PNG 隱藏）→ `canvasToBlob()` 輸出；單檔直接下載，多檔用
  `createZipBlob()` 打包。
  **驗收**：情境：上傳一張直式手機拍攝 JPEG（EXIF Orientation≠1），輸出圖片方向
  正確（不是躺著的）；情境：上傳 PNG 並選擇輸出 WebP，下載檔案副檔名與實際格式
  一致（用檔案 magic bytes 或副檔名對照確認）；情境：勾選 Resize 長邊 800px，輸出
  圖片長邊 ≤800 且不變形；情境：一次上傳 3 張圖並輸出，下載得到含 3 個檔案的 ZIP。

- [x] T3 PDF 區—合併：多檔上傳（接 `checkPdfFileSize()`／批次總量閘門）→
  `loadPdfFile()` 逐檔載入 → 檔案列表提供上移/下移調整順序（proposal 待裁示 1 暫定
  方案，不做真拖曳）→ 按下合併呼叫 `mergePdfDocs(sourceDocs, pageSelections)`（依
  目前排序，每份來源全部頁面依序組成 pageSelections）→ 輸出合併後單一 PDF 下載。
  **驗收**：情境：上傳 A（3 頁）、B（2 頁）兩份 PDF，未調整順序時合併結果為 5 頁
  且頁面內容依 A 全部→B 全部排列；情境：把 B 上移到 A 之前再合併，結果變成 B 全部
  →A 全部；情境：合併後的 PDF 能被系統 PDF 檢視器正常開啟，頁數與內容正確。

- [x] T4 PDF 區—拆分：單檔上傳 → 輸入頁碼範圍文字（例如 `1-3,5`，複用已有的頁碼
  範圍解析邏輯，若前面題目已有可複用的 parser 先查再決定是否重寫）→ 呼叫
  `mergePdfDocs([sourceDoc], pageSelections)`（單一來源、選子集頁碼）→ 輸出該範圍
  組成的新 PDF。**只做單組輸出**（proposal 已載明範圍界線，不做 Day21 多組→多份）。
  **驗收**：情境：10 頁 PDF 輸入範圍 `1-3,5`，輸出 PDF 恰好 4 頁，內容對應原第
  1、2、3、5 頁；情境：輸入超出範圍的頁碼（例如 `1-3,99`），畫面顯示明確錯誤
  訊息，不整頁崩潰；情境：輸入格式錯誤的範圍字串（例如 `abc`），畫面顯示明確
  錯誤訊息。

- [x] T5 PDF 區—PDF→圖片：單檔上傳 → 逐頁呼叫 `renderPageToCanvas(pdfDoc,
  pageIndex, { scale: 2 })` → `canvasToBlob(canvas, 'image/jpeg', 固定品質 0.85)` →
  單頁下載或全部打包 ZIP（比照 Day19 既有模式，但不做目標容量選項，只給固定品質，
  proposal 已載明範圍界線）。
  **驗收**：情境：5 頁 PDF 轉換後產生 5 張 JPG，逐頁下載內容與該頁 PDF 版面肉眼
  一致；情境：全部下載得到含 5 個 JPG 的 ZIP。

- [x] T6 Markdown 區：從 `Day26_office-content-publisher/src/index.html` 複製
  `parseMarkdownToHtml()` 函式到本題（程式碼上方註明來源與複製日期，比照
  `shared/base.css` 的複製慣例）；文字框編輯 + 即時預覽（呼叫複製來的函式）→
  輸出 `.html` 檔（純內容，proposal 待裁示 3 暫定不內嵌 CSS）。
  **驗收**：情境：輸入含標題/粗體/斜體/清單/連結/code fence 的 Markdown，即時
  預覽區顯示對應 HTML 元素且與 Day26 相同輸入的預覽結果一致（用同一段測試文字
  跟 Day26 現有頁面比對）；情境：點擊輸出，下載 `.html` 檔案用瀏覽器開啟，內容
  與預覽區一致。

- [x] T7 三區共通收尾：每區「清除目前資料」按鈕各自清空該區狀態（不影響其他兩區）；
  `buildCleanHtmlCopy()` 清空三區全部資料與 `#__shared_toast`，移除 `.nav-back`；
  建立 `src/bundle.json` 並跑 `scripts/bundle.py` 產出 `index.html`／
  `bundle_manifest.json`。
  **驗收**：情境：圖片區已上傳檔案，點擊圖片區「清除」，圖片區恢復初始狀態且 PDF/
  Markdown 區資料不受影響；情境：三區都有資料時點擊「下載本工具離線版」，
  `file://` 開啟下載到的 `index.html`，三區功能各自重新走一輪都正常；情境（測試
  哨兵文字如 `ZZDOCTOOLS`）：離線版載入後 `document.getElementById('__shared_toast')
  === null`、`document.querySelectorAll('.nav-back').length === 0`、載入時
  `pageerror` 與 console error 皆為空（Playwright 斷言）。

- [x] T8 首頁與文件收尾：`VibeCoding/index.html` 加 Day27 卡片（比照既有格式，含
  `href`/`day`/`h2`/`p`）；`VibeCoding/README.md` 的 Level 1e 表格「開發」欄從 ⬜
  改 ✅。
  **驗收**：情境：本機開啟 `VibeCoding/index.html`，Day27 卡片出現在 Level 1e 對應
  位置，連結可正確導向 `Day27_document-tools/index.html`；情境：`grep -c
  "Day27_document-tools/index.html" VibeCoding/index.html` 回傳 1（不重複）。

## 驗收條件（總結）

- 情境：圖片格式互轉（JPG↔PNG↔WebP）、Resize、品質壓縮皆可正常運作，輸出圖片
  可被一般圖片檢視器開啟。
- 情境：PDF 合併多檔成功、拆分指定範圍成功、PDF→圖片逐頁轉換成功。
- 情境：Markdown 即時預覽與 Day26 使用同一段測試文字結果一致，輸出 HTML 可正確
  開啟顯示。
- 情境：離線版（`file://` 開啟下載的 `index.html`）三區功能與線上版一致，無
  `.nav-back`、無 `__shared_toast` 殘留、無 console error。
- 情境：上傳非預期格式檔案（例如把 `.txt` 改副檔名成 `.jpg`/`.pdf`）時，畫面顯示
  明確錯誤訊息，不整頁崩潰。
