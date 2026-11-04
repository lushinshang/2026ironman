# PDF_TO_JPG 重製版（pdf-to-jpg）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 02`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/pdf-to-jpg/`
- 產品目錄：`VibeCoding/Day19_pdf-to-jpg/`
- 資料層依據：`VibeCoding/shared/PDF_CONTRACT.md`（全文，`pdf-decode.js`／`pdf-file-size.js`
  由 `sdd/pdf-infra/` 前置工程建立，本提案假設其已就緒，不重複建立、不自己接 pdf.js）
- 互動模式：**按鈕觸發**（依 `CONTRACT.md` 第 5 節精神：逐頁渲染＋壓縮成本高、耗時，
  設定要先確認再整批跑，不能每動一次設定就重新轉換全部頁面）

## 為什麼做

PDF 頁面常需要放進 Word、PowerPoint、Email 或只接受圖片的系統，使用者要的是「把整份
PDF 每一頁變成一張 JPG」，不是通用的 PDF 檢視器或編輯器。這件事的技術核心——載入 PDF、
把指定頁渲染成 canvas——已經是 `pdf-infra` 的責任（`PDF_CONTRACT.md` 第 3 節
`renderPageToCanvas()`）。本題不重新接 pdf.js、不自己處理 `file://` 下的 Worker 陷阱，
產品價值在於**批次頁面轉換的佇列管理與壓縮設定**，做法上高度比照 Level 1c 的
`image-batch-optimizer`（Day14）——PRD 明講複用該題的壓縮邏輯。

## 要改什麼

- 上傳區：單一 PDF 選擇或拖放（PRD 沒有多 PDF 匯入需求，這題只吃一份 PDF），接
  `checkPdfFileSize()` gate，讀檔前先過大小閘門，`reject` 時不進入 `loadPdfFile()`。
- 上傳成功後呼叫 `getPageCount()` 顯示總頁數，逐頁呼叫 `renderPageToCanvas(pdfDoc,
  pageIndex, { scale: 0.3 或類似縮圖倍率 })` 產生縮圖網格（每頁一張小圖＋頁碼）。
- 設定區：JPG 品質滑桿或下拉（對應 PRD「可設定基本品質」），**不做目標容量二分逼近
  ——這題 PRD 只要求「基本品質設定」，沒有「壓到 Xmb 以下」的字面需求，跟 Day14
  的目標容量模式是不同的產品定位**，這屬於本提案的判斷，見下方「待裁示」第 1 項確認。
- 轉換管線：使用者按下「開始轉換」後，依序對每一頁呼叫 `renderPageToCanvas(pdfDoc,
  pageIndex, { scale: 2 或類似輸出解析度倍率 })` 取得高解析度 canvas，再呼叫既有
  `img-canvas.js` 的 `canvasToBlob(canvas, 'image/jpeg', quality)` 輸出 JPG（複用
  Day14 已驗證的函式，不重寫）；`setTimeout(0)` 逐頁排程，不在單一同步迴圈跑完整份
  PDF（比照 Day14 T5 的大批次不卡頓做法）。
- 顯示處理進度：目前第 N / 總 M 頁，每頁完成即更新該頁縮圖為轉換後的 JPG 預覽。
- 單頁下載：每張縮圖旁提供獨立下載按鈕，只下載該頁 JPG。
- 全部頁面 ZIP：轉換完成後提供「打包下載 ZIP」，複用既有 `io-zip.js` 的
  `createZipBlob()`（Level 1c 已擴充支援二進位 entry，不重寫）。
- Level 1 共通 UI 基線：複製結果摘要文字（`io-clipboard.js`）、`buildCleanHtmlCopy()`
  清空已上傳 PDF、頁面縮圖、轉換結果、`#__shared_toast`，移除 `.nav-back` 與站內連結。

## 影響範圍

**新增檔案**：
`VibeCoding/Day19_pdf-to-jpg/src/index.html`、
`VibeCoding/Day19_pdf-to-jpg/src/bundle.json`、
`VibeCoding/Day19_pdf-to-jpg/index.html`（build 產物）、
`VibeCoding/Day19_pdf-to-jpg/bundle_manifest.json`（build 產物）、
`VibeCoding/Day19_pdf-to-jpg/PRD.md`、
`sdd/pdf-to-jpg/proposal.md`（本檔）、
`sdd/pdf-to-jpg/tasks.md`。

**依賴、不在本題範圍內建立**：`shared/pdf-decode.js`／`pdf-file-size.js` 由
`sdd/pdf-infra/` 前置工程建立，本題直接引用 `PDF_CONTRACT.md` 的簽名，**不重寫 pdf.js
封裝、不重寫 Worker Blob URL 處理**。`shared/img-canvas.js`（`canvasToBlob`）與
`shared/io-zip.js`（`createZipBlob`）皆為 Level 1c 已完成的既有模組，直接引用不修改。

**不修改**：`VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/PDF_CONTRACT.md`（沿用
既有定案，若實作時發現契約缺口，回頭修正契約而非在本題自行決定，見下方「待裁示」）。

**Library / API**：無新增外部 library、無 API 呼叫，全程 browser-side；PDF 渲染走
`pdf-infra` 提供的 pdf.js 封裝，壓縮／ZIP 走 Level 1c 既有共用資產。

## ASCII wireframe

```text
┌─────────────────────────────────────────────┐
│ PDF → JPG 轉換工具                    [複製摘要]│
├─────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐   │
│ │   拖放 PDF 到此處，或點擊選擇檔案         │   │
│ └───────────────────────────────────────┘   │
│                                               │
│ 檔名：report.pdf　總頁數：10                    │
│ JPG 品質：[====●=====] 0.8    [開始轉換]        │
│                                               │
│ 處理進度：第 4 / 10 頁 ████████░░░░░░░░ 40%      │
│                                               │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │ p1 │ │ p2 │ │ p3 │ │ p4 │ │ p5 │  ...       │
│ │[↓] │ │[↓] │ │[↓] │ │... │ │... │          │
│ └────┘ └────┘ └────┘ └────┘ └────┘          │
│                                               │
│ [打包下載全部 ZIP]                              │
├─────────────────────────────────────────────┤
│ [下載本工具離線版]                              │
└─────────────────────────────────────────────┘
```

## 待裁示

以下是撰寫本提案時發現規格不明、需要使用者裁示的缺口，先列出不自行猜著寫：

1. **「基本品質設定」是否需要目標容量二分逼近**：PRD 02 只寫「可設定基本品質」，字面上
   像是單純的 JPG quality 滑桿（0–1），跟 Day14 `image-batch-optimizer` 的「壓到目標
   容量以下」是不同層級的功能。本提案暫定**只做品質滑桿，不做目標容量逼近**——PDF
   轉圖片的使用情境通常是「要放進 Word/Email」，對精確容量的要求沒有 Day14 那麼明確
   （Email 附件限制通常是看整體，不是單張圖片）。若使用者認為仍需要目標容量模式，
   請裁示，屆時會呼叫既有 `compressToTargetSize()`（不需要新寫演算法）。

   **裁示：見 `LEVEL1D_RULINGS.md` 第 1 條，採用暫定方案（不做目標容量二分逼近，
   只做品質滑桿）。**

2. **縮圖渲染倍率與輸出渲染倍率的具體數字**：契約 `renderPageToCanvas()` 的 `opts.scale`
   沒有規定「縮圖用多少」「正式輸出用多少」，本提案暫定縮圖 `scale: 0.3`（省記憶體與
   渲染時間）、正式輸出 `scale: 2`（約等於 144 DPI，一般文件用途足夠清晰），但這是本題
   自訂的經驗值，不是契約規定或已實測的最佳值，實作時應記錄實際輸出 JPG 的像素尺寸，
   若使用者對輸出解析度有具體要求（例如「要能列印」）需要更高倍率，請裁示調整。

   **裁示：見 `LEVEL1D_RULINGS.md` 第 2 條，採用暫定方案（縮圖 `scale: 0.3`、
   輸出 `scale: 2`），實作時仍記錄實際輸出像素尺寸。**

3. **單頁下載與 ZIP 內的檔名規則**：PRD 沒有規定命名慣例，本提案暫定
   `{PDF原始檔名（不含副檔名）}_p{頁碼，補零至與總頁數位數相同}.jpg`（例如 10 頁 PDF
   的第 3 頁為 `report_p03.jpg`），若使用者有偏好的命名慣例（例如比照 Day14 的
   `_opt` 後綴風格），請裁示。

   **裁示：見 `LEVEL1D_RULINGS.md` 第 3 條，採用暫定命名規則
   `{原檔名}_p{補零頁碼}.jpg`。**
