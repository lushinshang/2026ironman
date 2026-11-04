# Tasks — pdf-delivery-cleaner（Day25）

> 前置條件：`sdd/pdf-infra/` 完成並驗收（`pdf-build.js` 就緒，本題直接操作其暴露的
> `PDFDocument` 底層物件，不新增契約模組）。六類掃描/清除邏輯是本題自己的範圍，
> 見 `sdd/pdf-delivery-cleaner/proposal.md`「技術可行性判斷」一節。
> 待裁示 1（Action 偵測不到時的 UI 呈現）、待裁示 2（附件顯示深度）尚未定案，
> 相關任務（任務 6、任務 4）先建立基礎骨架，UI 細節等裁示後再補。

- [x] 1. 建立 `Day25_pdf-delivery-cleaner/src/index.html` 版面骨架與上傳流程：上傳區
  （接 `checkPdfFileSize()` gate，讀檔前先過大小閘門）、掃描結果顯示區（六個類別各
  一個區塊）、清理前後對照表、三個共通按鈕（`CONTRACT.md` 第 6 節基線）；套用
  `shared/base.css`。
  **驗收**：情境：上傳一份超過閘門上限的 PDF，畫面顯示拒絕訊息且不進入掃描流程；
  情境：上傳一份正常大小的 PDF，畫面顯示「掃描」按鈕與空白的六個類別區塊（尚未掃描）。

- [x] 2. 實作 Metadata 掃描：讀取 `/Info` 字典（Title/Author/Subject/Producer/Creator
  等標準欄位）與是否存在 `/Metadata` XMP 串流，逐欄位列出偵測到的值。
  **驗收**：情境：對一份用 Word 另存、帶有作者/標題資訊的真實 PDF 掃描，列出的
  Author/Title 等欄位值與該 PDF 用系統「檔案內容」或其他 PDF 工具查看的結果相符；
  情境：對一份沒有填寫任何 Metadata 欄位的 PDF 掃描，該分類顯示「未偵測到 Metadata」，
  不顯示空字串或 `undefined`。

- [x] 3. 實作 Link Annotation 與 Comment/Annotation 掃描：遍歷各頁 `/Annots` 陣列，
  依 `Subtype` 分流——`/Link` 歸類到「連結」（額外解析其 `/A` action 的 `/URI` 或
  `mailto:` 目標網址）；其餘非 `/Widget` 的 Annotation（`/Text`／`/FreeText`／
  `/Popup` 等）歸類到「註解」。
  **驗收**：情境：對一份含超連結（例如指向公司內部系統的網址）與 mailto 連結的
  真實 PDF 掃描，列出的網址與該 PDF 實際的連結目標相符；情境：對一份有審閱留言的
  PDF（用任一 PDF 工具手動加過 Comment）掃描，列出的留言內容與頁碼與實際相符；
  情境：一份完全沒有 Annotation 的 PDF，兩個分類都顯示「未偵測到」，不因為
  `/Annots` 陣列不存在而拋出例外。

- [x] 4. 實作 Form 與附件掃描：Form 讀取 `/AcroForm` 字典是否存在與其欄位數量
  （`/Fields` 陣列長度）；附件遍歷 `/Names/EmbeddedFiles` 名稱樹，列出檔名與大小
  （待裁示 2 定案前先只做 (a) 檔名+大小的最小版本，UI 標註「附件詳細顯示待裁示」）。
  **驗收**：情境：對一份含表單欄位（例如文字輸入框）的 PDF 掃描，Form 分類顯示
  正確的欄位數量；情境：對一份夾帶檔案附件的真實 PDF 掃描，附件分類列出的檔名與
  該 PDF 實際內嵌的附件檔名相符；情境：兩者皆不存在時各自顯示「未偵測到」。

- [x] 5. 實作 Metadata／連結／註解／Form／附件五類的清除：使用者勾選後點擊「清理」，
  只對勾選類別執行對應的物件移除（見 proposal.md 表格的移除方式），未勾選類別的
  物件原樣保留在輸出 PDF 中。
  **驗收**：情境：只勾選 Metadata 清除，輸出 PDF 重新掃描後 Metadata 分類數量歸零，
  但連結／註解／Form／附件的數量與清理前完全相同（對應 PRD 驗收條件「只選 Metadata
  時不順便移除其他物件」）；情境：全部勾選清除，輸出 PDF 重新掃描後五個分類皆為
  零；情境：清理過程不影響頁面視覺內容（頁數、頁面渲染結果與清理前一致，用
  `renderPageToCanvas()` 清理前後各渲染一次比對）。

- [x] 6. 實作 Action/JavaScript 掃描與清除（依待裁示 1 的裁示結果決定 UI 呈現方式，
  本任務先完成技術面的偵測邏輯：讀取 `/OpenAction`／`/AA`／`/Names/JavaScript`）：
  誠實記錄 `@cantoo/pdf-lib` 對這些物件的實際讀取支援程度。
  **驗收**：情境：對一份含簡單 `/OpenAction` JavaScript 的測試 PDF（若能合成或找到
  測試樣本）掃描，能偵測到該 Action 的存在；若函式庫對此類物件的讀取有明顯限制
  （例如完全讀不到、或只能讀到部分），在回報中誠實記錄具體限制範圍，不宣稱
  「完整支援」；情境：清除功能移除偵測到的 Action 後，輸出 PDF 重新掃描該分類歸零。

- [x] 7. 實作「清理前 vs 清理後」對照表與「沒有可清理項目」的明確結果畫面。
  **驗收**：情境：一份完全乾淨（六類皆無）的 PDF 上傳掃描後，整頁顯示「掃描完成，
  未偵測到需要清理的項目」，不顯示六個空分類的勾選框（對應 PRD 驗收條件）；情境：
  清理完成後對照表逐類顯示清理前後數量，已清除類別「清理後」欄位為 0 且視覺上
  （例如打勾圖示）明確標示已清除。

- [x] 8. 實作輸出：點擊下載，輸出檔名固定為 `clean-for-delivery.pdf`（不受原始檔名
  影響）；共通 UI 基線：複製結果摘要（`shared/io-clipboard.js`）、
  `buildCleanHtmlCopy()` 清空已上傳 PDF、掃描結果、勾選狀態、對照表、
  `#__shared_toast`，移除 `.nav-back` 與站內連結；建立 `src/bundle.json` 並跑
  `scripts/bundle.py` 產出 `index.html`／`bundle_manifest.json`。
  **驗收**：情境：點擊下載，取得的檔案名稱固定為 `clean-for-delivery.pdf`（無論
  原始上傳檔名為何）；情境：完整操作一輪（上傳→掃描→勾選→清理→下載）後點擊
  「下載本工具離線版」，`file://` 開啟下載到的 `index.html`，重新走一次完整流程
  結果一致，`document.getElementById('__shared_toast') === null`、
  `document.querySelectorAll('.nav-back').length === 0`。

## 驗收條件（總結，抄 PRD 23 三項再視情況補充）

- 情境：沒有可清理項目時顯示明確結果（任務 7）。
- 情境：只選 Metadata 時不順便移除其他物件（任務 5）。
- 情境：輸出後重新掃描，已選清除項目應消失（任務 5、任務 7 對照表）。
- 情境：清理過程不影響頁面視覺內容，頁數與渲染結果與清理前一致（任務 5 補充驗收，
  對應 PRD「不做」章節「未確認就 Flatten 全文件」——本題本來就不碰頁面像素，這項
  驗收用來證明這個邊界確實沒被跨越）。
