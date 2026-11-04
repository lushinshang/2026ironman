# Tasks — pdf-infra（Level 1d 前置工程）

> 前置條件：無（這是 Level 1d 最底層的前置工程）。完成後 Day19–25 直接引用，
> 各題 `tasks.md` **不要**包含「接 pdf.js」「接 pdf-lib」之類的任務，見
> `VibeCoding/shared/PDF_CONTRACT.md`。

- [x] 1. 下載並記錄五個 vendor 資產：`pdf.js`（`pdf.min.js` + `pdf.worker.min.js`，
  Apache-2.0，鎖定明確版本號，不用 CDN 最新版）、`@cantoo/pdf-lib`（MIT）、`fontkit`
  （pdf-lib 官方文件標準搭配 CJK 字型嵌入用，MIT）、**Noto Sans TC**（OFL 授權，
  `sdd/LEVEL1D_RULINGS.md` 裁示 1 已定案為 Day22 中文字型嵌入方案，本任務一併下載，
  Day22 任務 3 直接複用不重複下載）。依 `shared/vendor/README.md` 既有格式（比照
  papaparse／fflate 兩列）各自記錄版本／授權／來源 URL／SHA-256。
  **驗收**：情境：`shared/vendor/README.md` 新增五列，格式與既有兩列一致；情境：
  五個檔案的 SHA-256 與下載來源網頁公布的雜湊值（若有）或重新下載後再算一次的結果
  一致；情境：記錄五個檔案各自的原始大小（bytes），供任務 10 的總體積評估使用。

- [x] 2. 建立 `VibeCoding/shared/pdf-decode.js` 的 `loadPdfFile(file)`／`getPageCount(pdfDoc)`：
  處理 `file://` 下 pdf.js Worker 的 Blob URL 轉換（`CHECKLIST.md` 第四節已有解法可抄），
  讀取 `File` 物件（複製一份供 pdf.js 使用，不持有對原始物件的可變參照）。
  **驗收**：情境：用一份真實多頁 PDF（非空白測試檔）在本機 HTTP 伺服器環境測試，
  `loadPdfFile()` 成功回傳 `PDFDocumentProxy`，`getPageCount()` 回傳的頁數與該 PDF
  實際頁數相符；情境：改用 `python3 -m http.server` 起服務後以 `file://` 開啟同一個
  測試頁面（或依 `CHECKLIST.md` 建議另外用本機 Python `playwright` 套件補測 `file://`
  情境），Worker 正常載入不報錯；情境：上傳一個非 PDF 檔案（例如把 `.jpg` 改副檔名
  成 `.pdf`），`loadPdfFile()` 明確拋出可辨識的錯誤，不讓呼叫端卡死或顯示空白。

- [x] 3. 建立 `pdf-decode.js` 的 `renderPageToCanvas(pdfDoc, pageIndex, opts)`：
  `opts.scale` 控制渲染倍率（預設 1.5）。
  **驗收**：情境：對一份真實 PDF 的第 1 頁渲染，輸出 canvas 的視覺內容與該 PDF 用
  系統內建 PDF 檢視器開啟同一頁的畫面一致（文字位置、圖片內容肉眼比對）；情境：
  `opts.scale: 2` 時輸出 canvas 的像素尺寸約為 `scale: 1` 時的兩倍（誤差在四捨五入
  範圍內）；情境：對超出頁數範圍的 `pageIndex`（例如 10 頁 PDF 傳 `pageIndex: 99`），
  函式明確拋出錯誤，不回傳空白 canvas 讓呼叫端誤判為成功。

- [x] 4. 建立 `pdf-decode.js` 的 `extractPageText(pdfDoc, pageIndex)`／
  `extractAllText(pdfDoc)`：用 pdf.js `getTextContent()`，保留基本斷行，不做版面還原。
  **驗收**：情境：對一份文字層 PDF（例如用 Word 另存的 PDF，非掃描檔）擷取文字，
  取回的內容與該頁實際可見文字相符（含中文，確認編碼沒有亂碼）；情境：對一份純掃描
  影像 PDF（沒有文字層）擷取，回傳空字串或明確的「無文字層」訊號，不拋出未處理例外；
  情境：`extractAllText()` 回傳的陣列長度與 `getPageCount()` 相同，`pageIndex` 依序
  對應正確頁碼（0-indexed 或 1-indexed 需在函式文件與回傳值中明確一致，不要混用）。

- [x] 5. 建立 `VibeCoding/shared/pdf-build.js` 的 `createPdfBuilder(sourceBytesArray)`／
  `mergePdfDocs(sourceDocs, pageSelections)`：封裝 `@cantoo/pdf-lib`，支援從多個來源
  PDF 各自取指定頁組成一份新 PDF。
  **驗收**：情境：給定兩份真實 PDF（各自多頁），`pageSelections` 指定「第一份的第
  2 頁、第二份的第 1 頁、第一份的第 1 頁」，輸出的新 PDF 頁數為 3 且頁面內容與順序
  正確（用系統 PDF 檢視器逐頁核對）；情境：合併後兩份來源 PDF 的原始 bytes（或
  `File` 物件）未被修改（對應契約「原始檔案永遠不被覆寫」）。

- [x] 6. 建立 `pdf-build.js` 的 `rotatePage(pdfDoc, pageIndex, degrees)`／
  `deletePage(pdfDoc, pageIndex)`。
  **驗收**：情境：對一頁呼叫 `rotatePage(..., 90)`，輸出 PDF 用系統檢視器開啟該頁
  旋轉方向正確（非鏡像、非顛倒）；情境：連續呼叫四次 `rotatePage(..., 90)`，頁面
  方向回到原始狀態；情境：`deletePage()` 後輸出 PDF 頁數減一，且被刪除頁之後的頁面
  依序遞補、內容正確。

- [x] 7. 建立 `pdf-build.js` 的 `addPageNumbers(pdfDoc, opts)`／`addWatermarkText(pdfDoc,
  text, opts)`／`embedCjkFont(pdfDoc, fontBytes)`：頁碼用內建 `StandardFonts`（純數字
  與 `/` 不需要中文字型）；浮水印文字函式簽名需接受外部傳入的 `PDFFont`（可能是
  `embedCjkFont()` 回傳的中文字型，也可能是英數字的 `StandardFonts`），本模組**不
  預設任何中文字型檔**。
  **驗收**：情境：`addPageNumbers()` 指定頁碼範圍第 2–5 頁，輸出 PDF 只有這 4 頁
  出現頁碼，其餘頁不受影響；情境：`format: 'X/Y'` 的 `Y` 值等於輸出 PDF 的實際總頁數
  （不是輸入時的頁數，若合併/刪頁後頁數有變化要反映最新值）；情境：`embedCjkFont()`
  用 **Noto Sans TC**（`sdd/LEVEL1D_RULINGS.md` 裁示 1 已定案，方案 A，不再是暫定
  測試字型；下載固定版本並依 `shared/vendor/README.md` 慣例記錄版本／OFL 授權／
  來源 URL／SHA-256）嵌入後，`addWatermarkText()` 用該字型畫出中文浮水印文字，
  輸出 PDF 該文字正確顯示（非缺字方框），驗證 `registerFontkit` 機制與實際選用字型
  一次到位，Day22（`pdf-review-stamper`）任務 3 直接複用本任務下載好的字型檔，
  不必重新下載。

- [x] 8. 建立 `pdf-build.js` 的 `encryptPdf(pdfDoc, opts)`／`decryptPdf(bytes, password)`：
  這是本次前置工程解決 Day23 阻塞的關鍵任務，需要用**真實的、非本次測試自產的**
  PDF 樣本驗證相容性（例如手動用 Adobe Reader 或 macOS 內建工具替一份 PDF 設密碼，
  再用本函式讀取）。
  **驗收**：情境：對一份未加密 PDF 呼叫 `encryptPdf({userPassword: '1234'})`，輸出
  bytes 組成的 PDF 用系統 PDF 檢視器開啟時要求輸入密碼，輸入 `1234` 才能開啟；
  情境：對上一步輸出的加密 PDF 呼叫 `decryptPdf(bytes, '1234')`，成功回傳可讀取內容
  的 `PDFDocument`；情境：`decryptPdf(bytes, '錯誤密碼')` 明確拋出錯誤，不回傳看似
  成功但內容為空或損毀的 `PDFDocument`；情境：用一份**非本工具產生**、已有密碼保護
  的真實 PDF 樣本測試讀取，若相容性有問題（例如某些加密演算法版本不支援），在回報
  中誠實記錄限制範圍，不得宣稱「全部相容」。

- [x] 9. 建立 `VibeCoding/shared/pdf-file-size.js` 的 `checkPdfFileSize()`／
  `checkPdfBatchSize()`：門檻依契約第 5 節草案（單檔 30/100MB、批次 150/400MB）。
  **驗收**：情境：邊界值（正好 30MB、正好 100MB）各測一次確認落在哪一邊；情境：
  找一份真實的大型掃描 PDF（若手邊沒有，用多頁高解析度圖片組成的測試 PDF模擬）
  跑過一次，記錄實際檔案大小是否落在門檻的合理範圍內，若草案門檻明顯不合理
  （例如正常掃描公文常態超過 30MB）在回報中提出並回頭修正契約。

- [x] 10. 整體體積與環境驗收：把四個 vendor 資產與三個新模組實際 bundle 進一個最小
  測試用 `index.html`（不對應任何一題產品，只是驗證前置工程本身），確認整體可運作。
  **驗收**：情境：記錄 bundle 後單檔 HTML 的總大小（bytes），與契約提出的擔憂
  （5–10MB 是否過大）對照，在回報中給出具體數字讓使用者判斷是否可接受；情境：
  `file://` 開啟這個測試 HTML，完整走一次「上傳 PDF → 渲染第一頁 → 擷取文字 →
  旋轉頁面 → 加密輸出」流程，全部成功且瀏覽器 console 無錯誤。

## 驗收條件（總結）

- 情境：三個新模組各自用 Node 直接 `require`／`vm` 載入即可跑純函式測試（`pdf.js`／
  `@cantoo/pdf-lib` 皆有 Node 相容用法），不需要瀏覽器環境；渲染／Canvas 相關函式
  在瀏覽器另外用 Playwright 補測（比照 `img-infra` 的驗收慣例）。
- 情境：Day23（`pdf-password-manager`）的核心可行性（加密／解密）在本次前置工程
  就已用真實 PDF 驗證過，不是留到該題實作階段才第一次發現做不到。
