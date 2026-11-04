# 照片 → 工作成果附件（photo-evidence-sheet）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 16`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/photo-evidence-sheet/`
- 產品目錄：`VibeCoding/Day18_photo-evidence-sheet/`
- 資料層依據：`VibeCoding/shared/IMG_CONTRACT.md`（全文）。本題只用到其中的
  `img-decode.js`（讀圖＋依 EXIF Orientation 轉正）與 `img-canvas.js`（縮圖用的等比例
  縮放），由 `sdd/img-infra/` 前置工程建立，本提案假設其已就緒，不重複建立。
- 列印版型依據：`VibeCoding/shared/CSV_CONTRACT.md` 第 6.2 節判準——列印版型目前只有
  Day13（`csv-one-page-report`）、Day18（本題）兩題會用，**未達三題門檻**，本題參考
  `VibeCoding/Day13_csv-one-page-report/src/index.html` 的 `@media print` 寫法**自己寫
  一份**，不建議、也不在本題範圍內把列印 CSS 抽成 `shared/` 模組。
- 互動模式：**按鈕觸發**匯出／預覽動作（依 `shared/CONTRACT.md` 第 5 節精神：拖曳排序、
  圖說輸入為即時互動屬正常表單行為，但「產生 A4 預覽」「匯出列印版 HTML」屬於明確動作，
  比照 Day13 走按鈕觸發，不做 debounce 即時重排版）

## 為什麼做

活動、施工、教育訓練與設備安裝後，整理大量照片成正式成果附件很耗時：手動在 Word
裡貼圖、對齊、編號、寫圖說，20 張照片可能要花掉一兩個鐘頭且排版容易跑掉。本題定位是
**排版工具**，不是影像處理工具——跟 Day14–17 比，本題幾乎不碰像素層級運算（只需要
`img-decode.js` 讀圖＋轉正，`img-canvas.js` 做縮圖），核心工作是版面配置邏輯：拖曳排序、
每頁張數切版、分頁計算、圖說與照片的資料綁定、A4 列印版面。

系列刻意安排在最硬的 Day17（`document-perspective-corrector`，手寫透視校正）之後，
放一天工作量較輕、以 UI／資料結構設計為主的題目。

## 要改什麼

### 資料結構：照片與圖說綁成同一個物件

每張匯入的照片是一個物件，圖說是該物件的欄位，不是獨立陣列：

```js
// state.photos: PhotoItem[]
// PhotoItem = {
//   id: string,          // 匯入時配發的遞增流水號字串，拖曳排序與 DOM key 用
//   dataUrl: string,      // img-decode.js 轉正後，經 img-canvas.js resizeCanvas() 限制
//                          // 長邊後再輸出的 dataURL（見下方「待裁示」的長邊上限）
//   fileName: string,     // 原始檔名，僅顯示與除錯用
//   caption: string       // 圖說，與這張照片同一個物件，一起被移動、一起被序列化
// }
```

拖曳排序時，`state.photos` 這個陣列本身重新排列元素順序（`splice` 取出再插入新位置），
**不使用「照片陣列」與「圖說陣列」兩個平行陣列**——平行陣列排序時兩邊分別搬移，
索引一旦算錯就會出現「排序後圖說對錯照片」的典型 bug，直接違反 PRD 驗收條件
「重新排序後圖說仍與照片綁定」。頁碼與照片編號一律在渲染當下由 `state.photos` 的
陣列順序即時算出（`index + 1`），不存成物件的固定欄位，避免排序後編號沒跟著更新。

### 匯入：多檔案 + 批次／單檔大小閘門

⚠️ **本節已由指揮官在提案彙整階段更正**（原稿判斷 `io-dropzone.js` 只有本題需要多檔匯入，
決定自行繞過；但同一批提案裡 `image-batch-optimizer`（Day14）也需要，是兩題同時的已知
需求，不是投機共用，已比照 `IMG_CONTRACT.md` 6.2 節 `ui-chart-svg.js` 先例升級，
見契約第 9a 節與 `sdd/img-infra/tasks.md` 任務 10）：

本題改用 `shared/io-dropzone.js` 擴充後的 `setupDropZone(dropEl, onData, {multiple: true, ...})`／
`setupFilePicker(inputEl, onData, {multiple: true, ...})`，`onData(result, fileName, meta)` 的
`meta.index`／`meta.total` 直接用來追蹤整批匯入進度，**不自行監聽原生 `change`／`drop` 事件**。
`gate` 選項呼叫 `checkBatchSize()`（`img-file-size.js`）在讀檔前檢查整批總量；單檔閘門
`checkImageFileSize()` 另外在 `onData` 收到結果後逐檔判定，被擋下的該張略過並提示，
不中止整批匯入。

### 版面配置邏輯

- **每頁張數**：使用者可選 2／4／6 張，切版邏輯把 `state.photos` 依目前順序、依選定
  張數切成多個頁面陣列（`chunk(photos, pageSize)`），最後一頁不滿也要正確渲染（例如
  20 張、每頁 4 張＝5 頁；21 張、每頁 4 張＝6 頁、最後一頁只有 1 張）。
- **自動編號**：每頁內、跨頁連續編號，依切版後的攤平順序算，不依頁內位置歸零重來。
- **標題／日期／地點欄**：文件層級的中繼資料（非每張照片各自的欄位），輸入一次，
  顯示在每一頁列印輸出的頁首，確保單頁分開列印時仍可識別是哪次成果的附件。
- **A4 預覽與「照片不超出版面」**：這是 CSS 版面設計的責任，不是影像處理——每頁固定
  A4 尺寸容器，格線用 CSS Grid 依張數（2/4/6）分配等分格，每張照片 `max-width: 100%;
  max-height: 100%; object-fit: contain`，圖說文字區塊高度另外預留、不與照片搶版位，
  避免文字被裁切或照片溢出格線。

### 列印／匯出：比照 Day13，不用 PDF 函式庫

`Day13_csv-one-page-report/src/index.html` 的做法是：預覽區套用 `@media print` CSS
（`@page { size: A4; margin: 2cm; }`、`break-inside: avoid` 避免區塊被硬切、
`print-color-adjust: exact` 保留底色），且提供「匯出單一 HTML」把當下已算好的內容
連同同一份列印 CSS 組成獨立 HTML 檔案下載，使用者拿到這份檔案後用瀏覽器原生的
「列印」功能（Ctrl/Cmd+P → 另存為 PDF）產出 PDF——全程沒有任何 PDF 函式庫，
「匯出 PDF」這個能力是靠瀏覽器原生列印對話框達成的。

本題直接複用這個模式，不重新發明：
- 預覽區本身即套用 `@media print` CSS，頁面上提供「列印」按鈕呼叫 `window.print()`，
  使用者可直接在目前頁面列印或另存 PDF。
- 另外提供「匯出列印版 HTML」按鈕，比照 Day13 的 `buildReportHtml()`，把 `state.photos`
  目前的排序、圖說、切版結果與文件中繼資料，連同內嵌的 `dataUrl` 照片與同一份列印 CSS
  組成一份獨立 HTML 字串後下載，離線也能重新打開、重新列印。

### 不覆寫原始照片

匯入後的處理鏈（`loadImageFile()` 轉正 → `resizeCanvas()` 限制長邊 → 輸出 `dataUrl`）
全程只讀取使用者選取的 `File`，不寫回、不修改瀏覽器端持有的原始檔案物件；所有下游
操作（排序、切版、匯出）都只作用在 `state.photos` 這份複本資料上。

## Level 1 共通 UI 基線（`CONTRACT.md` 第 6 節，必要任務非額外功能）

- 複製結果到剪貼簿：`shared/io-clipboard.js`（複製文件中繼資料＋張數等摘要文字）。
- 下載結果檔案：已由「匯出列印版 HTML」滿足（PRD 明文要求的匯出格式）。
- 下載本工具離線版：自行實作 `buildCleanHtmlCopy()`，清空 `state.photos`（含全部
  `dataUrl`／`caption`）、標題／日期／地點輸入框、預覽區內容、`#__shared_toast` 元素，
  移除 `.nav-back` 與站內連結。

## 影響範圍

### 新增檔案
- `VibeCoding/Day18_photo-evidence-sheet/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day18_photo-evidence-sheet/src/bundle.json`
- `VibeCoding/Day18_photo-evidence-sheet/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day18_photo-evidence-sheet/bundle_manifest.json`（build 產物）
- `VibeCoding/Day18_photo-evidence-sheet/PRD.md`（複製 PRD 16 段落內容，依既有題目慣例）
- `sdd/photo-evidence-sheet/proposal.md`（本檔）
- `sdd/photo-evidence-sheet/tasks.md`

### 依賴、不在本題範圍內建立或修改
- `shared/img-decode.js`／`img-canvas.js`：由 `sdd/img-infra/` 前置工程建立，本題直接
  引用其契約簽名，不重新實作讀圖／轉正／縮放邏輯。
- `shared/img-file-size.js` 的 `checkImageFileSize()`／`checkBatchSize()`：同上，直接引用。
- `shared/io-dropzone.js`：由 `img-infra` 任務 10 擴充 `opts.multiple`，本題**直接引用**
  擴充後的介面，不自行監聽原生事件（見上方更正說明）。

### 不修改
- `VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/CSV_CONTRACT.md`、
  `VibeCoding/shared/IMG_CONTRACT.md`（沿用既有定案，不變動；本題不把列印 CSS 抽成
  `shared/` 模組，理由見上方「列印版型依據」段落）。
- `VibeCoding/README.md`、`VibeCoding/index.html`（進度表更新留待收尾階段）。

### Library / API
無外部 library、無 API 呼叫，全程 browser-side；PDF 產出走瀏覽器原生
`window.print()`／使用者手動「另存為 PDF」，不內嵌任何 PDF 函式庫。

## 待裁示

1. **縮圖／匯出用 `dataUrl` 的長邊像素上限**：`img-canvas.js` 的 `resizeCanvas()` 需要
   一個 `maxLongEdge` 數值。本提案暫定 **1600px**（A4 每頁 6 張版型下單張照片實際印刷
   尺寸遠小於 1600px，肉眼列印品質足夠；20 張 × 1600px 長邊的 JPEG dataURL 組成的
   「匯出列印版 HTML」檔案大小預估在可接受範圍），但這是草案數字，未經實測，
   實作時要用真實手機照片（20 張、常見 8–15MB／張）跑一次匯出，確認產出的 HTML
   檔案大小與瀏覽器開啟／列印的流暢度可接受，數字不合適時回頭調整。
2. ~~多檔案匯入不經過 `setupDropZone()`／`setupFilePicker()` 標準路徑~~
   **已解決，不再是待裁示項**：`io-dropzone.js` 已擴充支援 `opts.multiple`，見上方
   「匯入：多檔案」段落與 `IMG_CONTRACT.md` 第 9a 節。
