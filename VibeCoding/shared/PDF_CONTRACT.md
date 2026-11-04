# Level 1d PDF 資料層契約（草案，待使用者確認）

> 建立：2026-08-24。角色比照 `shared/IMG_CONTRACT.md` 之於 Level 1c——
> Day19–26 八題（含 `office-content-publisher`，該題不碰 PDF，見第 0 節排除說明）中
> 有 7 題全部吃同一種輸入（使用者上傳的 PDF 檔），若各題自己接 pdf.js／pdf-lib，
> 對「怎麼讀頁面」「怎麼改頁面」的判定會不一致。本檔把公用的部分定案一次。

## 0. 範圍界定

Level 1d 共 8 題，其中 **7 題碰 PDF**（Day19–25），本契約只管這 7 題：

| Day | 短名稱 | 是否吃本契約 |
|---|---|---|
| 19 | `pdf-to-jpg` | ✅ |
| 20 | `pdf-text-search` | ✅ |
| 21 | `pdf-organizer` | ✅ |
| 22 | `pdf-review-stamper` | ✅ |
| 23 | `pdf-password-manager` | ✅ |
| 24 | `pdf-secure-redactor` | ✅ |
| 25 | `pdf-delivery-cleaner` | ✅ |
| 26 | `office-content-publisher` | ❌ 不碰 PDF（Markdown/CSV→HTML），不受本契約約束 |

## 1. 關鍵技術決定：library 選型（已查證，不是猜測）

### 1.1 讀取 / 渲染：`pdf.js`（Mozilla，Apache-2.0）

負責「載入 PDF、渲染頁面成 canvas、擷取文字層」。所有讀取類操作統一走這裡。

**已知陷阱**（`VibeCoding/CHECKLIST.md` 第四節已記錄，v1 Day6 踩過解法可直接抄）：
`file://` 協定下 ES Module Worker 無法直接載入，必須把 `pdf.worker.min.js` 內容轉成
Blob URL 再指定給 `pdfjsLib.GlobalWorkerOptions.workerSrc`。

### 1.2 讀寫 / 結構編輯：`@cantoo/pdf-lib`（非官方 fork，MIT），**不用官方 `pdf-lib`**

這是本次提案階段最重要的一個查證結果：官方 `hopding/pdf-lib` **完全不支援加密 PDF**——
`PDFDocument.load()` 遇到加密檔案直接丟 `EncryptedPDFError`，官方 README 明文寫
「The library does not currently support encrypted documents」，也沒有任何 API 可以對
輸出的 PDF 設定密碼。這會讓 Day23（`pdf-password-manager`）整個 MVP 做不到。

查證後找到 `@cantoo/pdf-lib`（`cantoo-scribe/pdf-lib`，MIT 授權，官方 pdf-lib 的維護中
fork）：
- 讀取加密 PDF：`PDFDocument.load(bytes, { password: '正確密碼' })`
- 寫入加密 PDF：`pdfDoc.encrypt({ userPassword, ownerPassword, permissions })`
- API 其餘部分與官方 `pdf-lib` 相容（同樣的 `addPage`／`copyPages`／`drawText`／
  `embedFont` 等）。

**決定：Level 1d 全部涉及 PDF 結構編輯的題目（Day21/22/23/24/25）統一用
`@cantoo/pdf-lib`，不混用兩個 fork**——避免同一個 vendor 資產分裂成兩份、
行為認知不一致。

**待驗證（不是本次查證範圍，實作前需再次確認）**：`@cantoo/pdf-lib` 的確切版本號、
授權條款全文、npm 套件實際下載內容的 SHA-256（依 `CONTRACT.md` vendor 慣例，下載時
記錄）；瀏覽器端 bundle 後的實際檔案大小（fork 可能比官方版更大，需要在前置工程
任務中實測並誠實記錄，若過大需回頭跟使用者討論是否可接受）。

### 1.3 中文字型嵌入（Day22 專用坑，README 已標記「已知大坑」，本契約不代為定案）

`@cantoo/pdf-lib`／官方 `pdf-lib` 內建的 `StandardFonts`（Helvetica 等）不含中文字形。
在 PDF 上畫「草稿」「密件」「僅供參考」「未核定」等浮水印預設文字，或使用者自訂的
中文浮水印文字，需要透過 `pdfDoc.registerFontkit(fontkit)` + `pdfDoc.embedFont(中文字型檔bytes)`
嵌入真實中文字型。這牽涉到字型檔授權（例如思源黑體 Noto Sans TC 是 OFL）與檔案大小
（完整字型檔可能數 MB 到十幾 MB，需要子集化，但子集化又跟「使用者可自訂任意浮水印
文字」衝突——不可能預先知道使用者要打什麼字）。**這是需要使用者裁示的開放問題，
留給 `sdd/pdf-review-stamper/proposal.md` 的「待裁示」段落處理，本契約只提供
`pdf-build.js` 裡通用的 `embedCjkFont(pdfDoc, fontBytes)` 工具函式，不指定用哪個字型檔**。

## 2. 模組總覽（前置工程 `sdd/pdf-infra/` 建立）

| 模組 | 提供 | 用途 |
|---|---|---|
| `shared/pdf-decode.js` | `loadPdfFile()`／`renderPageToCanvas()`／`extractPageText()` | pdf.js 封裝：載入、渲染、文字層擷取 |
| `shared/pdf-build.js` | `createPdfBuilder()`／`mergePdfDocs()`／`rotatePage()`／`deletePage()`／`addPageNumbers()`／`addWatermarkText()`／`embedCjkFont()`／`encryptPdf()`／`decryptPdf()` | `@cantoo/pdf-lib` 封裝：結構編輯與加解密 |
| `shared/pdf-file-size.js` | `checkPdfFileSize()`／`checkPdfBatchSize()` | 上傳前大小閘門，門檻草案見第 5 節 |
| `shared/io-zip.js`（既有，Level 1c 已擴充支援二進位） | 沿用 | 批次輸出 PDF/JPG ZIP |

判準比照 `IMG_CONTRACT.md`：`pdf-decode.js` 被 Day19／Day21（縮圖）／Day24（rasterize）
**三題**直接依賴；`pdf-build.js` 被 Day21／Day22／Day23／Day24／Day25 **五題**直接依賴。
兩者都遠超過「第三題才升級為共用」的門檻，一開始就寫成 `shared/` 模組。

Day25（`pdf-delivery-cleaner`）需要的 Metadata／Annotation／Form／Attachment／Action
掃描邏輯**只有這一題用到**，未達共用門檻，留在該題自己的 `src/index.html` 內，
不進本次前置工程（比照 `IMG_CONTRACT.md` 對 Day18 A4 版型的判斷）。

## 3. `pdf-decode.js`：載入與渲染

```js
loadPdfFile(file): Promise<PDFDocumentProxy>
  // 內部處理 file:// 下的 Worker Blob URL 問題，呼叫端不需要知道這個坑

getPageCount(pdfDoc): number

renderPageToCanvas(pdfDoc, pageIndex, opts): Promise<{canvas, width, height}>
  // opts.scale：渲染倍率（預設 1.5，供高解析度輸出用）

extractPageText(pdfDoc, pageIndex): Promise<string>
  // 用 pdf.js getTextContent()，回傳該頁純文字（保留基本斷行邏輯，不做版面還原）

extractAllText(pdfDoc): Promise<Array<{pageIndex, text}>>
```

**原始檔案永遠不被覆寫**：`loadPdfFile()` 內部把 `File`／`ArrayBuffer` 複製一份供
pdf.js 使用，不持有對原始物件的可變參照（比照 `IMG_CONTRACT.md` 第 2 節同一立場）。

## 4. `pdf-build.js`：結構編輯與加解密

```js
createPdfBuilder(sourceBytesArray): Promise<builder>
  // sourceBytesArray：一個或多個來源 PDF 的 Uint8Array，供合併/取頁用

mergePdfDocs(sourceDocs, pageSelections): Promise<Uint8Array>
  // pageSelections：[{docIndex, pageIndex, rotation}]，依序組成新 PDF

rotatePage(pdfDoc, pageIndex, degrees)   // degrees: 90 的倍數
deletePage(pdfDoc, pageIndex)

addPageNumbers(pdfDoc, opts)
  // opts: {position: 'header'|'footer', format: 'X'|'X/Y', pageRange}

addWatermarkText(pdfDoc, text, opts)
  // opts: {opacity, angle, position, pageRange, font}
  // font 由呼叫端先用 embedCjkFont() 或內建 StandardFonts 準備好傳入

embedCjkFont(pdfDoc, fontBytes): Promise<PDFFont>
  // 封裝 pdfDoc.registerFontkit(fontkit) + pdfDoc.embedFont(fontBytes)
  // 不內建任何字型檔，字型檔案由呼叫端（各題）提供

encryptPdf(pdfDoc, opts): void
  // opts: {userPassword, ownerPassword, permissions}
decryptPdf(bytes, password): Promise<PDFDocument>
  // 密碼錯誤時明確拋出錯誤，不得回傳看似成功但內容損毀的結果
```

**待驗證（實作時需實測，不是本契約假設）**：`@cantoo/pdf-lib` 的 `encrypt()`／
`decrypt` 對常見 PDF 產生器（Word 另存 PDF、掃描器軟體、其他 pdf-lib 工具產生的 PDF）
的相容性，需要用真實檔案（不是空白測試 PDF）測過才能寫進契約當作已驗證的事實。

## 5. `pdf-file-size.js`：大小閘門（門檻草案，待實測微調）

比照 `IMG_CONTRACT.md` 第 8 節的模式，PDF 檔案大小落差比圖片更極端（掃描本可能
數十到數百頁），草案門檻：

- 單檔：< 30MB 通過、30–100MB 警告、> 100MB 拒絕
- 批次總量（Day21 多檔匯入、Day23 批次密碼處理）：< 150MB 通過、150–400MB 警告、
  > 400MB 拒絕

這組數字沒有實測依據，是延續 `IMG_CONTRACT.md` 的量級外推，**實作時若真實測試發現
明顯不合理（例如 30MB 的正常掃描 PDF 很常見），回頭修正本契約並記錄理由**。

## 6. 與 `CONTRACT.md`／`IMG_CONTRACT.md` 的關係

通則（共通 UI 基線、`buildCleanHtmlCopy()`、零依賴／零外部請求、「第三題才升級為共用」
判準）全部繼續適用，不在本檔重複。本檔只定義 Level 1d 特有的 PDF 處理規則。
