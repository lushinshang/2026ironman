# PDF 文字擷取與全文搜尋（pdf-text-search）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 19`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/pdf-text-search/`
- 產品目錄：`VibeCoding/Day20_pdf-text-search/`
- 資料層依據：`VibeCoding/shared/PDF_CONTRACT.md`（全文，`pdf-decode.js`／`pdf-file-size.js`
  由 `sdd/pdf-infra/` 前置工程建立，本提案假設其已就緒，不重複建立、不重寫 pdf.js 封裝）
- 互動模式：即時輸入即搜（關鍵字搜尋是本題核心互動，非批次耗時處理，不需要按鈕觸發）

## 為什麼做

有文字層的 PDF（例如 Word 另存的公文、合約）雖然能開啟閱讀，但要在裡面找一個關鍵字、或
把內容搬到筆記系統整理，仍然要逐頁翻找或另外用其他工具轉檔。這件事本身不需要 AI、不需要
伺服器——`pdf.js` 的文字層 API 就能做到，只是需要一個好用的介面把「擷取＋搜尋＋定位＋匯出」
串起來。

本題不重新寫 PDF 載入、渲染、文字擷取的底層邏輯，這些都是 `pdf-infra` 的責任
（`PDF_CONTRACT.md` 第 3 節 `pdf-decode.js`）。本題的產品價值在於**全文檢索體驗**：
上傳後立即看到每頁文字、輸入關鍵字即時看到命中頁碼與片段、點擊結果跳到該頁、把整理好的
文字內容匯出成 TXT 或 Markdown。

## 要改什麼

- 上傳區：接 `checkPdfFileSize()` gate + `loadPdfFile()`，讀檔前先過大小閘門。
- 載入後立即呼叫 `extractAllText(pdfDoc)`，逐頁快取純文字到記憶體（`state.pages =
  [{pageIndex, text}]`），不用每次搜尋都重新呼叫 pdf.js。
- 文字層偵測：`extractAllText()` 回傳後，若**每一頁**的 `text.trim()` 都是空字串，
  判定為「無可擷取文字（可能是掃描 PDF）」並在畫面明確提示這個限制，不嘗試 OCR
  （PRD 明文「不做」）。若只有部分頁面是空字串（例如封面頁、空白頁本來就沒文字），
  不觸發整份文件的限制提示，只在該頁的逐頁顯示區標示「本頁無可擷取文字」。
- 逐頁顯示：畫面顯示頁碼＋該頁文字內容，可捲動瀏覽全部頁面。
- 全文搜尋：輸入框即時（`debounce()` 150ms）搜尋 `state.pages`，命中時列出頁碼與
  片段（片段長度與大小寫/全半形規則見下方「待裁示」）。
- 點擊搜尋結果：捲動到該頁對應的顯示區塊（或呼叫 `renderPageToCanvas()` 顯示該頁
  縮圖輔助定位，視待裁示 2 的裁決而定）。
- 匯出：TXT（全文字，依頁碼分段標示）、Markdown（同樣內容但用 `## 第 N 頁` 分節）、
  Copy All（複製全文字到剪貼簿，接 `io-clipboard.js`）。
- Level 1 共通 UI 基線：`buildCleanHtmlCopy()` 清空已上傳 PDF、擷取的文字快取、搜尋
  狀態、`#__shared_toast`，移除 `.nav-back` 與站內連結。

## 影響範圍

**新增檔案**：
`VibeCoding/Day20_pdf-text-search/src/index.html`、
`VibeCoding/Day20_pdf-text-search/src/bundle.json`、
`VibeCoding/Day20_pdf-text-search/index.html`（build 產物）、
`VibeCoding/Day20_pdf-text-search/bundle_manifest.json`（build 產物）、
`VibeCoding/Day20_pdf-text-search/PRD.md`、
`sdd/pdf-text-search/proposal.md`（本檔）、
`sdd/pdf-text-search/tasks.md`。

**依賴、不在本題範圍內建立**：`shared/pdf-decode.js`／`pdf-file-size.js` 由 `sdd/pdf-infra/`
前置工程建立，本題直接引用 `PDF_CONTRACT.md` 的簽名，**不重寫 pdf.js Worker 處理、不重寫
文字擷取邏輯本身**。`pdf-build.js`（`@cantoo/pdf-lib` 封裝）本題**不需要**——這題全程只讀
不寫，不修改 PDF 結構。

**不修改**：`VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/PDF_CONTRACT.md`（沿用既有
定案，若實作時發現契約缺口，回頭修正契約而非在本題自行決定）。

**Library / API**：無新增 vendor 資產（沿用 `pdf-infra` 已內嵌的 `pdf.js`），無 API 呼叫，
全程 browser-side。

## 待裁示

以下是撰寫本提案時發現規格未講清楚、需要使用者裁示的缺口，先列出不自行猜著寫：

1. **搜尋片段（snippet）的長度與呈現規則未定義**：PRD 只寫「顯示命中頁碼與片段」，
   沒定義片段要顯示關鍵字前後多少字元、多個命中詞在同一頁時是否要各自列一則片段還是
   合併成一則。本提案暫定：**關鍵字前後各 30 個字元（不足則到頁首/頁尾為止），同一頁
   有多個命中時每個命中各自列一則片段**（比較容易定位，缺點是同一頁命中很多次時結果
   列表會很長）。

   **裁示：見 `LEVEL1D_RULINGS.md` 第 4 條**，採用暫定方案。

2. **搜尋是否要模糊匹配（大小寫、全半形、簡繁）未定義**：PRD 沒提到這點。本提案暫定
   **只做大小寫不敏感（case-insensitive）比對英文字母，全半形與簡繁不轉換**（PDF 文字
   內容通常跟使用者輸入的關鍵字用同一套繁體全形慣例，過度模糊匹配反而可能導致誤判）。
   若使用者需要更寬鬆的比對（例如比照 `zh-tw-localizer` 的詞庫轉換概念），需要額外裁示
   是否要接入現有的簡繁轉換邏輯，本提案不預設要做。

   **裁示：見 `LEVEL1D_RULINGS.md` 第 5 條**，採用暫定方案。

3. **多關鍵字搜尋的邏輯未定義**：使用者輸入多個詞（例如用空白分隔）時，要當成
   AND（全部詞都要出現在同一頁才算命中）、OR（任一詞出現就算命中）、還是整串當成一個
   完整片語搜尋？本提案暫定 MVP 階段**只支援單一片語搜尋（整個輸入框內容視為一個搜尋
   字串，不拆詞）**，多關鍵字邏輯留待使用者確認是否為 MVP 必要功能，若需要則屬於本題
   下一輪迭代，不阻塞本次 8 條以內的 tasks.md。

   **裁示：見 `LEVEL1D_RULINGS.md` 第 6 條**，採用暫定方案。

4. **「點結果定位頁面」的呈現方式未定義**：PRD 只寫「點結果定位頁面」，沒定義定位後
   畫面要呈現什麼——本提案暫定跳轉／捲動到該頁的「逐頁文字顯示」區塊並高亮該頁區塊
   的邊框（不需要额外呼叫 `renderPageToCanvas()` 顯示縮圖，因為本題核心是文字而非
   版面視覺）。若使用者希望同時看到該頁的縮圖畫面輔助核對，需另外裁示，這會讓本題
   多依賴 `renderPageToCanvas()`（原本規劃為 Day19/21/24 三題共用，非必要不擴大依賴）。

   **裁示：見 `LEVEL1D_RULINGS.md` 第 7 條**，採用暫定方案。
