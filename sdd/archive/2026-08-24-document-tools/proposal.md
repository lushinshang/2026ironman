# 提案：Document Tools 重製版（Day27，`document-tools`）

> Level 1e 整合壓軸，對應 PRD 01。工作目錄 `sdd/document-tools/`。

## 為什麼做

PRD 01 原文：「Office 使用者常在圖片、PDF、Markdown 等不同網站間切換。既有 Document
Tools 重新建立，重點是**整合**常用文件加工，而不是無限制堆功能。」

PRD 01 的 MVP（圖片互轉/Resize/壓縮 + PDF 合併/拆分/轉圖 + Markdown 編輯預覽輸出 HTML）
是 PRD 02（`pdf-to-jpg`）、07（`office-content-publisher`）、13（`csv-one-page-report`
的圖片/列印基礎）、18（`photo-evidence-sheet`）等題底層能力的聯集。v2 開發順序把它
從舊版的 Day01 移到 Level 1 壓軸（Day27），理由是：前 26 天已經把圖片（`img-decode.js`／
`img-canvas.js`）、PDF（`pdf-decode.js`／`pdf-build.js`）、Markdown（Day26 的
`parseMarkdownToHtml()`）底層能力都做好且驗證過，Day27 不需要重新開發，主戰場是
「介面整合＋範圍砍半」——PRD 01 的 MVP 本來就比任一 Day19-26 專題題目簡單。

## 已讀證據（實際讀了現有共用模組介面，不是憑印象假設）

讀 `shared/IMG_CONTRACT.md` 第 3-4 節、`shared/PDF_CONTRACT.md` 第 3-4 節、
`Day26_office-content-publisher/src/index.html`（445 行 `parseMarkdownToHtml()`）後確認：

- **圖片**：`loadImageFile(file, opts)` 讀檔轉正 → `resizeCanvas(canvas, opts)` 縮放
  → `canvasToBlob(canvas, mimeType, quality)` 轉檔輸出。三個函式組合起來就能做「JPG/PNG/
  WebP 互轉 + Resize + 基本壓縮」，**不需要** `img-exif.js`（EXIF 清除，Day15 專用）
  或 `img-perspective.js`（透視校正，Day17 專用）——這兩個明確超出 PRD 01 MVP 範圍。
- **PDF**：`loadPdfFile(file)` 載入 → `mergePdfDocs(sourceDocs, pageSelections)` 依
  `[{docIndex, pageIndex, rotation}]` 組出新 PDF，可用於合併（多來源）也可用於拆分
  （單一來源、選子集頁碼組成新檔）；`renderPageToCanvas()` + `canvasToBlob()` 做
  PDF→圖片。三個函式覆蓋 PRD 01 的「合併、拆分、PDF→圖片」，**不需要**
  `addWatermarkText()`／`encryptPdf()`／`embedCjkFont()` 等 Day21-25 專用進階函式。
- **Markdown**：Day26 的 `parseMarkdownToHtml()` 是本系列目前唯一一份手寫簡化版
  Markdown parser，尚未升級為共用模組（`IMG_CONTRACT.md`／`CSV_CONTRACT.md` 訂下的
  「第三次使用才升級共用」判準，Day27 是第 2 次使用，未達門檻）。依既有慣例（比照
  `shared/base.css` 的逐字複製慣例），**Day27 直接從 Day26 複製 `parseMarkdownToHtml()`
  程式碼到自己的 `src/index.html`，不建立新的 shared 模組**，並在程式碼註明來源
  （比照 base.css「勿手動修改」的複製慣例）。若之後第 3 個地方要用 Markdown parser，
  再回頭升級為 `shared/md-parse.js`。

## 要改什麼

新增 `Day27_document-tools/src/index.html`，單頁三區籤：

1. **圖片區**：上傳 → 顯示原圖資訊（尺寸/格式/大小）→ 選輸出格式（JPG/PNG/WebP）+
   Resize 長邊上限（選填）+ 品質滑桿（JPEG/WebP 才顯示）→ 輸出下載。多檔批次比照
   `io-dropzone.js` 既有擴充，輸出多檔時包 ZIP（複用 `io-zip.js`）。
2. **PDF 區**：
   - 合併：多檔上傳，可調整順序（比照 Day21 有的簡化版——上移/下移按鈕，不做 Day21
     的真拖曳＋分組完整互動，那是 Day21 專題深度，Day27 範圍砍半）→ 輸出合併後單一 PDF。
   - 拆分：單檔上傳，輸入頁碼範圍（單一組，例如 `1-3,5`）→ 輸出該範圍組成的新 PDF。
     **只做單組輸出**，不做 Day21 裁示 3 的多組→多份 ZIP 輸出，PRD 01 沒有要求到這個
     深度，做了就是範圍蔓延。
   - PDF→圖片：單檔上傳，逐頁渲染 → 輸出 JPG（比照 Day19 但不做 Day19 的目標容量
     選項，只給固定品質）。
3. **Markdown 區**：文字框編輯 + 即時預覽（比照 Day26 的分頁即時預覽）→ 輸出
   `.html` 檔（純內容，不含 Day26 的 CSV→Table 功能，那是 Day26 專題範圍）。
4. 三區各自有「清除目前資料」按鈕（PRD 01 明確要求）。
5. 檔案大小把關：圖片沿用 `img-file-size.js` 既有門檻；PDF 沿用 `pdf-file-size.js`
   既有門檻（`PDF_CONTRACT.md` 第 5 節），不重新訂一組數字。

## 影響範圍

- 新增 `VibeCoding/Day27_document-tools/src/index.html`（含 `bundle.json`）
- 新增 `VibeCoding/Day27_document-tools/article_draft.md`（依系列慣例）
- `VibeCoding/index.html` 加一張 Day27 卡片（比照本次剛補回 Day13 卡片的既有格式）
- `VibeCoding/README.md` 的 Level 1e 表格「開發／撰文」欄位從 ⬜ 改 ✅
- 不修改任何既有 Day01-26 的檔案（本題只複用既有 `shared/` 模組與 Day26 的
  Markdown parser 程式碼片段，不改動它們的介面或行為）

## 待裁示（提案階段未決，需要使用者裁決或授權代為決定）

1. **PDF 合併的排頁互動**：本提案暫定「上移/下移按鈕」（比照 Day18 先例），不做
   Day21 的真拖曳。若你希望 Day27 也做真拖曳互動，會增加開發量但體驗更一致。
2. **圖片/PDF 批次上限**：暫定沿用 `img-file-size.js`／`pdf-file-size.js` 既有門檻
   數字，不另訂 Day27 專屬門檻。
3. **Markdown 輸出 HTML 的樣式**：暫定純內容（不含 CSS style），使用者貼到別處
   自己套版；或者要不要順便內嵌一份極簡 CSS（標題/段落/清單基本排版）方便直接開啟
   閱讀？PRD 沒明說，屬於暫定可加分項。

以上 3 條若使用者不裁示，將依「PRD 沒要求就不做／採最簡方案」的一貫原則自行定案
（暫定：1→按鈕、2→沿用既有門檻、3→純內容不內嵌 CSS）。
