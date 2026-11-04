# 前置工程：PDF 資料層（Level 1d，Day19–25 共用）

## 為什麼做

Level 1d 七題（`pdf-to-jpg` / `pdf-text-search` / `pdf-organizer` / `pdf-review-stamper` /
`pdf-password-manager` / `pdf-secure-redactor` / `pdf-delivery-cleaner`）全部吃同一種輸入：
使用者上傳的 PDF 檔。若各題自己接 pdf.js／pdf-lib，對「怎麼渲染頁面」「怎麼改頁面結構」
的判定會不一致——跟 Level 1c 的 `img-infra` 是同一個理由（見
`sdd/archive/2026-08-24-img-infra/`，若尚未歸檔則見 `sdd/img-infra/`），套用到 PDF 資料層。

依 `VibeCoding/shared/PDF_CONTRACT.md`（下稱「契約」）規定：`pdf-decode.js`／`pdf-build.js`／
`pdf-file-size.js` 三個模組，**不屬於任何一題的產品範圍**，必須在 Day19 開工前完成並獨立
驗收。各題的 `tasks.md` 不會、也不應包含「接 pdf.js」「接 pdf-lib」之類的任務。

## 提案階段已查證的關鍵技術決定（見契約第 1 節，非猜測）

- **官方 `pdf-lib`（`hopding/pdf-lib`）完全不支援加密 PDF**：`PDFDocument.load()` 遇到
  加密檔案直接丟 `EncryptedPDFError`，官方 README 明文「does not currently support
  encrypted documents」，也沒有任何寫入加密 PDF 的 API。這會讓 Day23
  （`pdf-password-manager`）整個 MVP 做不到，是本次提案階段查出的最大風險，若不查
  就直接進實作階段會在 Day23 才發現整題無法完成。
- **改用 `@cantoo/pdf-lib`（`cantoo-scribe/pdf-lib`，MIT，官方 pdf-lib 的維護中 fork）**：
  透過 context7 查證其 README／原始碼確認支援 `PDFDocument.load(bytes, {password})`
  讀取加密檔、`pdfDoc.encrypt({userPassword, ownerPassword, permissions})` 寫入加密檔，
  API 其餘部分與官方版相容。**決定 Level 1d 全部涉及 PDF 結構編輯的題目統一用這個
  fork，不混用兩個 pdf-lib 版本**。
- **`pdf.js` 的 `file://` Worker 陷阱已有解法**：`VibeCoding/CHECKLIST.md` 第四節記錄
  v1 Day6 已解過（Blob URL 轉 Worker），本次直接抄，不用重新踩雷。

## 要改什麼

- 新增 `VibeCoding/shared/pdf-decode.js`：`loadPdfFile(file)`／`getPageCount(pdfDoc)`／
  `renderPageToCanvas(pdfDoc, pageIndex, opts)`／`extractPageText(pdfDoc, pageIndex)`／
  `extractAllText(pdfDoc)`（契約第 3 節），內部處理 Worker Blob URL。
- 新增 `VibeCoding/shared/pdf-build.js`：`createPdfBuilder()`／`mergePdfDocs()`／
  `rotatePage()`／`deletePage()`／`addPageNumbers()`／`addWatermarkText()`／
  `embedCjkFont()`／`encryptPdf()`／`decryptPdf()`（契約第 4 節），封裝 `@cantoo/pdf-lib`。
  `embedCjkFont()` 只提供機制（`registerFontkit` + `embedFont`），**不內建任何中文字型檔**
  ——實際用哪個字型檔是 Day22 自己的「待裁示」問題，見契約第 1.3 節。
- 新增 `VibeCoding/shared/pdf-file-size.js`：`checkPdfFileSize()`／`checkPdfBatchSize()`
  （契約第 5 節，門檻草案，實作時可依實測微調並回頭更新契約，比照 `img-file-size.js`
  當初的做法）。
- 新增 vendor 資產：`shared/vendor/pdf.min.js`／`shared/vendor/pdf.worker.min.js`（pdf.js，
  Apache-2.0）、`shared/vendor/pdf-lib.min.js`（`@cantoo/pdf-lib`，MIT）、
  `shared/vendor/fontkit.min.js`（pdf-lib 官方文件標準搭配，供 `embedCjkFont()` 使用，
  MIT）。四個資產下載後依 `shared/vendor/README.md` 慣例記錄版本／授權／來源 URL／
  SHA-256。

## 影響範圍

**新增檔案**：`shared/pdf-decode.js`、`shared/pdf-build.js`、`shared/pdf-file-size.js`、
四個 vendor 資產、`shared/vendor/README.md` 追加四列。

**不修改任何 Level 1a／1b／1c 既有檔案**——PDF 是全新的資料型別，沒有既有模組需要擴充。

**vendor 資產體積是本次前置工程最大的未知數**：`pdf.js`＋Worker、`@cantoo/pdf-lib`、
`fontkit` 三者內嵌進單檔 HTML 後的實際大小需要在任務中實測並誠實記錄——若明顯過大
（例如單一產品 HTML 超過 5–10MB，影響「離線 HTML 可下載」的使用體驗），要回頭跟
使用者討論是否可接受，不能悶著頭做完才發現問題。

**Day25（`pdf-delivery-cleaner`）的 Metadata／Annotation／Form／Attachment／Action
掃描邏輯不在本次前置工程範圍**——只有這一題用到，未達共用門檻，留給該題自己的
`tasks.md` 處理（比照契約第 2 節）。
