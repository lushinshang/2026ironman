# PDF 拆分 / 合併 / 重排工作台（pdf-organizer）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 18`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/pdf-organizer/`
- 產品目錄：`VibeCoding/Day21_pdf-organizer/`
- 資料層依據：`VibeCoding/shared/PDF_CONTRACT.md`（全文）。本題直接依賴
  `pdf-decode.js` 的 `loadPdfFile()`／`renderPageToCanvas()`（縮圖）與 `pdf-build.js` 的
  `createPdfBuilder()`／`mergePdfDocs()`／`rotatePage()`／`deletePage()`，由
  `sdd/pdf-infra/` 前置工程建立，本提案假設其已就緒，不重複建立。

## 為什麼做

送件、彙整附件、投標文件常見「來源不同、順序錯亂、要刪掉某頁或某頁方向轉錯」的整理
需求。目前只能用桌面版 PDF 編輯軟體或線上工具處理，前者需要安裝、後者常要求上傳到
未知伺服器。本題定位是「跨文件的頁面編輯器」：使用者一次匯入多份 PDF，把想要的頁面
（可能來自不同來源檔案）挑出來，決定順序、旋轉方向、要不要留下，組成一份新 PDF。

## 要改什麼

### 資料結構：以「頁面」為單位，不是以「檔案」為單位

```js
// state.pages: PageItem[]
// PageItem = {
//   id: string,           // 匯入時配發的遞增流水號字串，排序與 DOM key 用
//   sourceDocIndex: number,  // 對應 state.sourceDocs 的索引，標記這頁來自哪份原始 PDF
//   sourcePageIndex: number, // 該頁在原始 PDF 中的頁碼（0-indexed）
//   thumbnailDataUrl: string, // renderPageToCanvas() 產生的縮圖
//   rotation: number,        // 0/90/180/270，使用者調整過的旋轉角度（相對原始方向）
//   deleted: boolean,         // 使用者標記刪除，但不立即從陣列移除（保留 undo 空間）
//   groupId: string           // 依裁示 2，頁面所屬的輸出群組；預設只有一個群組
// }
// state.sourceDocs: Array<{fileName, pdfDoc, pageCount}>  // 唯讀，不覆寫原始 bytes
// state.groups: Array<{id: string, label: string}>  // 依裁示 2 新增：輸出群組清單，
//   預設只有一個群組（此時效果等同單一輸出），使用者可新增群組把部分頁面分流到
//   另一份輸出 PDF
```

`state.pages` 是唯一的排序真相來源，跨文件重排時直接操作這個攤平後的陣列（不是巢狀的
「每份文件各自一個子陣列」結構）——理由與 `photo-evidence-sheet`（Day18）的「照片與
圖說綁成同一物件、不用平行陣列」相同：只要排序邏輯只需要處理一個陣列，就不會有
「跨文件搬移時算錯是哪一份來源」的典型 bug。

### 已裁示 1：排序互動方式——真正拖曳（`LEVEL1D_RULINGS.md` 裁示 2）

**裁示結果：選項 A，真正的拖曳互動**（使用者 2026-08-24）。不採用 Day18 先例的
按鈕方案。實作 HTML5 native drag events 或 pointer-based 拖曳，含觸控裝置相容性、
拖曳時的視覺回饋（插入線／佔位格）。跨文件（縮圖來自不同來源 PDF）與大量頁面
（可能上百項）的拖曳效能與觸控相容性，屬於本題任務要處理的範圍，見 `tasks.md`
任務 3。

### 已裁示 2：拆分輸出——一份或多份皆可（`LEVEL1D_RULINGS.md` 裁示 3）

**裁示結果：採用「理解 B」並泛化**（使用者 2026-08-24，「可以一份，可以多份」）。
使用者可以定義**一組或多組**頁碼範圍／頁面選取結果，每一組各自輸出一份 PDF；
只定義一組時自然只產出一份（等同原本「理解 A」的效果），定義多組時一次產出多份
（包成 ZIP 下載，複用 `io-zip.js`）。**不是理解 A 與理解 B 二選一，是用理解 B 的
介面同時涵蓋兩種情境**，見 `tasks.md` 任務 5。

### 頁面操作：旋轉／刪除／還原

- 旋轉：每個 `PageItem` 有獨立的 `rotation` 欄位，點擊縮圖上的旋轉按鈕以 90° 為單位
  遞增（`(rotation + 90) % 360`），縮圖即時反映新角度（CSS `transform: rotate()`
  即時預覽，實際輸出時才呼叫 `pdf-build.js` 的 `rotatePage()`）。
- 刪除：標記 `deleted: true` 並在畫面上以半透明／打叉樣式呈現，不立即從 `state.pages`
  移除，保留「復原」空間；只有在使用者執行「輸出」時，`deleted: true` 的頁面才真正
  被排除在 `mergePdfDocs()` 的 `pageSelections` 之外。
- 還原：提供「復原上一步」按鈕，回復最近一次刪除／排序（拖曳）／旋轉操作（用簡單
  的操作歷史堆疊，不需要做到無上限 undo/redo，PRD 沒有明文要求；拖曳排序本身的 undo
  記為本題內部技術決定，不另外裁示）。

### 匯入：多份 PDF，來源檔案清單獨立顯示

匯入區支援一次選取／拖放多個 PDF 檔案（複用 `io-dropzone.js` 的 `opts.multiple`，
Level 1c 已擴充過，見 `IMG_CONTRACT.md` 第 9a 節）。每份成功匯入的來源 PDF 顯示在
「來源檔案」清單（檔名＋頁數），縮圖區則是攤平後的全部頁面（依匯入順序＋原始頁碼
排列，等待使用者調整）。單檔與批次總量閘門套用 `pdf-file-size.js` 的
`checkPdfFileSize()`／`checkPdfBatchSize()`。

### 輸出：依群組數量輸出一份或多份 PDF，不覆寫來源

點擊「輸出」時，對 `state.groups` 逐一處理：每個群組把 `deleted: false` 且
`groupId` 相符的頁面依目前順序、各自的 `rotation` 組成 `pageSelections`，呼叫
`mergePdfDocs()` 產生一份 PDF。只有 1 個群組時，透過 `shared/io-download.js`
直接下載這一份 PDF；有多個群組時，用 `io-zip.js` 的 `createZipBlob()` 把多份
PDF 包成一個 ZIP 一次下載（比照 Level 1c 圖片批次下載的模式）。檔名不與任何
來源檔名相同（例如 `organized-<群組序號或遞增計數，不用 Date.now()>.pdf`，
實作階段再定）。來源 PDF 的原始 `File`／bytes 全程不被修改（`pdf-build.js`
契約已保證）。

## ASCII Wireframe（依裁示 1、2 定案內容繪製）

```
┌────────────────────────────────────────────────────────┐
│  PDF 拆分 / 合併 / 重排工作台                    [返回]  │
├────────────────────────────────────────────────────────┤
│  [ 拖放或選擇多個 PDF 檔案 ]         總頁數：42          │
│  來源檔案：report_A.pdf(12頁) report_B.pdf(30頁)         │
├────────────────────────────────────────────────────────┤
│  輸出群組：[ 群組 1 ● ] [ 群組 2 ] [ ＋新增群組 ]         │
│  （只有 1 個群組時＝輸出一份 PDF；多個群組時每組各自輸出  │
│   一份，全部一起下載時包成 ZIP）                          │
├────────────────────────────────────────────────────────┤
│  群組 1 的頁面清單（可拖曳排序，跨文件皆可拖入同一群組）  │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐               │
│  │ [縮圖] │ │ [縮圖] │ │ [縮圖] │ │ [縮圖] │  ...        │
│  │ A p.1  │ │ A p.3  │ │ B p.1  │ │ B p.2  │             │
│  │  ⠿拖曳 │ │  ⠿拖曳 │ │  ⠿拖曳 │ │  ⠿拖曳 │             │
│  │   ⟳ ✕  │ │   ⟳ ✕  │ │   ⟳ ✕  │ │   ⟳ ✕  │             │
│  └───────┘ └───────┘ └───────┘ └───────┘               │
│  （拖曳手把調整順序／跨群組移動，⟳旋轉90° ✕刪除）         │
├────────────────────────────────────────────────────────┤
│  [復原上一步]              保留頁數：40（2 頁已標記刪除） │
│  [輸出（1 群組→單一 PDF；多群組→ZIP 包多份 PDF）]         │
└────────────────────────────────────────────────────────┘
```

## 影響範圍

**新增檔案**：`VibeCoding/Day21_pdf-organizer/`（`src/index.html`、`PRD.md`、
`article_draft.md`、`logs/`）。

**不修改任何既有檔案**——完全依賴 `pdf-infra` 前置工程與既有 `io-dropzone.js`／
`io-download.js`／`io-zip.js`（依裁示 2，多群組輸出需要用到既有的 ZIP 打包能力，
`createZipBlob()` 簽名不需要擴充，`{name, bytes}` 二進位 entry Level 1c 已支援），
沒有需要擴充的既有共用模組。

**風險**：
- 頁數量體大時（多份大型 PDF）縮圖渲染與拖曳排序互動的效能未經實測，實作階段
  需要用真實的多份多頁 PDF（不是空白測試檔）測過，若明顯卡頓在回報中誠實記錄並
  評估是否需要虛擬捲動（virtual scroll）等優化——但這類優化不在 MVP 範圍，除非
  實測證明不做的話工具不可用。
- 依裁示 1，真拖曳互動＋跨文件＋大量頁面（可能上百項）三者疊加，是本題目前已知
  複雜度最高的互動需求，觸控裝置相容性與拖曳時的視覺回饋需要額外的實作與測試
  時間，任務數量因此比照 `tasks.md` 的調整可能超出原估計。
- 依裁示 2，多群組輸出屬於範圍擴增，任務 5 的驗收範圍變大，見 `tasks.md` 開頭的
  任務量說明。
