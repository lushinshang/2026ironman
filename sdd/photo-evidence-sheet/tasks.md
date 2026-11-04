# Tasks：照片 → 工作成果附件（photo-evidence-sheet）

> 前置條件：`sdd/img-infra/`（`img-decode.js`／`img-canvas.js`／`img-file-size.js`）已完成並
> 獨立驗收。本題不包含「寫圖片解碼器」之類的任務，直接引用 `VibeCoding/shared/IMG_CONTRACT.md`
> 的簽名。列印版型自己寫一份，不抽 `shared/`（見 `proposal.md`「列印版型依據」段落）。

- [x] T1 建立 `Day18_photo-evidence-sheet/src/index.html` 版面骨架：匯入區（`<input
  type="file" multiple accept="image/*">` ＋拖放區）、文件中繼資料輸入（標題／日期／地點）、
  每頁張數選擇（2/4/6 單選）、照片清單區（縮圖＋圖說輸入框，逐張顯示）、A4 預覽區、
  複製摘要／匯出列印版 HTML／列印／下載本工具離線版四個按鈕；套用 `shared/base.css`
  - 驗收：情境：開啟頁面，畫面上可見匯入區、標題／日期／地點三個輸入框、2/4/6 張頁面
    大小選擇、照片清單區、A4 預覽區、四個按鈕；`view-source` 確認 file input 帶
    `multiple` 屬性（非單檔限定）。

- [x] T2 實作多照片匯入：用 `setupDropZone()`／`setupFilePicker()`（`shared/io-dropzone.js`，
  `opts.multiple: true`，見 `IMG_CONTRACT.md` 第 9a 節）取得完整批次，**不自行監聽原生
  `change`／`drop` 事件**；`opts.gate` 呼叫 `checkBatchSize()`（`img-file-size.js`）在
  讀檔前檢查整批總量，`level==='reject'` 時整批擋下並顯示訊息、不處理任一檔；
  `onData(result, fileName, meta)` 收到結果後逐檔呼叫 `checkImageFileSize()`，被擋下的
  單檔略過並提示檔名，其餘照常處理；每張通過閘門的照片呼叫 `loadImageFile()`
  （`img-decode.js`）讀取＋依 EXIF Orientation 轉正，再用 `resizeCanvas()`
  （`img-canvas.js`，長邊上限依 `proposal.md`「待裁示」1 的暫定值）輸出 `dataUrl`，
  依 `meta.index` 建立 `PhotoItem` 物件 `{ id, dataUrl, fileName, caption: '' }`
  依原始選取順序加入 `state.photos`（不依賴非同步讀取完成順序）
  - 驗收：情境：用拖放一次選取 20 張手機直式拍攝的照片匯入，清單區出現 20 張縮圖，
    每張顯示方向正確（不是原始像素排列的橫向，證明轉正生效）；情境：批次總量超過
    `checkBatchSize()` 的 reject 門檻時，畫面顯示拒絕訊息，`state.photos` 不新增任何項目；
    情境：批次內有一張超過單檔 reject 門檻的照片，該張被略過並提示檔名，其餘照片正常匯入。

- [x] T3 實作上移／下移排序（2026-08-24 使用者裁示，見 `sdd/LEVEL1C_RULINGS.md` 裁示 2：
  接受按鈕方案，不補做拖曳互動）：`state.photos` 陣列元素（含 `caption`）整個隨
  上移／下移按鈕移動到新位置（`splice` 取出插入，不使用平行陣列），排序後立即
  重新渲染縮圖清單與 A4 預覽
  - 驗收：情境：匯入 3 張照片並各自填入不同圖說後，對第 3 張連按兩次「上移」，清單與
    預覽區顯示的順序變成「原第 3 張、原第 1 張、原第 2 張」，且每張顯示的圖說內容仍是
    該照片原本填入的內容（對應 PRD 驗收條件「重新排序後圖說仍與照片綁定」，透過按鈕
    達成同等效果）。**已於 2026-08-24 獨立驗收通過**：三張照片分填哨兵圖說，對第 3
    張連按兩次上移，`.caption-input` 值變成 `[ZZPHOTOCAP, CAP_A_first, CAP_B_second]`，
    資料綁定正確。

- [x] T4 實作圖說輸入綁定：清單區每張縮圖旁的圖說輸入框直接綁定該 `PhotoItem.caption`，
  輸入即時寫回物件（不需按鈕確認）
  - 驗收：情境：在第 2 張照片的圖說輸入框打字，A4 預覽區對應位置的圖說文字同步更新；
    情境：清空某張圖說輸入框，預覽區該張圖說區塊顯示空白，不報錯、不影響其他照片。

- [x] T5 實作每頁張數切版與分頁計算：依選定的 2/4/6 張，把 `state.photos` 目前順序切成
  多個頁面陣列（`chunk(photos, pageSize)`），每頁內、跨頁連續自動編號（依切版後的攤平
  順序算，不在渲染當下重新排序原陣列）
  - 驗收：情境：匯入 20 張照片、選「每頁 4 張」，A4 預覽區產生 5 頁，每頁 4 張；情境：
    改選「每頁 6 張」，同一批 20 張照片重新切成 4 頁（3 頁各 6 張、最後 1 頁 2 張），
    最後一頁只顯示 2 張、格線不留白破版；情境：切換頁面張數選項後，照片編號 1–20
    保持與目前排序一致，不因切版重新歸零或跳號。

- [x] T6 實作 A4 預覽與列印版面 CSS：比照 `Day13_csv-one-page-report` 的
  `@media print`／`@page { size: A4; margin: 2cm; }` 寫法自建一份（不共用模組），
  每頁固定 A4 尺寸容器，依張數用 CSS Grid 分格，每張照片套用 `max-width: 100%;
  max-height: 100%; object-fit: contain`，圖說文字區塊獨立預留高度；文件標題／日期／
  地點顯示在每頁頁首；分頁區塊加 `break-inside: avoid` 避免被硬切成兩半
  - 驗收：情境：匯入 6 張明顯長寬比不同（直式、橫式混合）的照片、選「每頁 6 張」，
    A4 預覽區每張照片完整顯示在自己的格線內，沒有任何一張超出格線或被裁切變形；
    情境：用瀏覽器列印預覽（Ctrl/Cmd+P）檢視，每頁完整對應一張 A4，頁首標題／日期／
    地點在每一頁都出現，區塊沒有被硬生生從中間切成兩頁。

- [x] T7 實作「列印」按鈕與「匯出列印版 HTML」：「列印」按鈕呼叫 `window.print()`
  （沿用 T6 已套用在頁面上的 `@media print` CSS，不需另外生成頁面）；「匯出列印版 HTML」
  比照 Day13 的 `buildReportHtml()`，把目前排序、圖說、切版結果、文件中繼資料與內嵌的
  `dataUrl` 照片、同一份列印 CSS 組成獨立 HTML 字串後用 `shared/io-download.js` 下載
  - 驗收：情境：點擊「列印」，瀏覽器列印對話框開啟，預覽畫面版面與 T6 驗收一致；情境：
    點擊「匯出列印版 HTML」下載檔案，用瀏覽器另開該檔案（不連網），照片、圖說、排序、
    標題／日期／地點與匯出當下的畫面內容一致，且該檔案本身也能被瀏覽器直接列印出
    同樣的 A4 版面（對應 PRD MVP「匯出列印版 HTML/PDF」）。

- [x] T8 收尾：複製摘要接 `shared/io-clipboard.js`（複製標題／日期／地點與張數等文字
  摘要）；實作 `buildCleanHtmlCopy()` 清空 `state.photos`（含全部 `dataUrl`／`caption`）、
  標題／日期／地點輸入框、預覽區內容、`#__shared_toast` 元素，移除 `.nav-back` 與站內連結
  - 驗收（`buildCleanHtmlCopy()`，`CONTRACT.md` 第 6 節硬性要求）：測試資料一律改用哨兵值
  ——圖說 `ZZPHOTOCAP`、地點欄 `ZZPHOTOLOC`。完整操作一輪（匯入照片→排序→填圖說與
  標題／日期／地點→產生預覽）後點擊「下載本工具離線版」。原始碼精確搜尋 `ZZPHOTOCAP`、
  `ZZPHOTOLOC` 須各 0 筆，且不可含任何匯入照片的 `dataUrl`（搜尋 `data:image` 須 0 筆）；
  另用 Playwright 載入下載到的離線版產物，斷言 `document.getElementById('__shared_toast')
  === null`、`document.querySelectorAll('.nav-back').length === 0`、載入時 `pageerror`
  與 console error 皆為空。

## 附帶的建置與整合驗收（非獨立任務，收尾時與 T8 一併完成）

建立 `src/bundle.json`，跑 `scripts/bundle.py` 產出 `index.html`／`bundle_manifest.json`；
準備 20 張真實手機拍攝照片（含直式／橫式混合、部分含 EXIF Orientation 非 1），以
`file://` 與本機伺服器各測一次完整流程（匯入→排序→圖說→切版 2/4/6→A4 預覽→列印／
匯出 HTML→下載離線版）。

驗收：兩種開啟方式下匯入與排版結果一致；20 張照片匯入到出現完整縮圖清單的耗時記錄下來，
若主執行緒明顯卡頓（例如超過 2–3 秒無回應），評估是否需要 `requestIdleCallback`／分批
`setTimeout(0)` 讓出主執行緒（`IMG_CONTRACT.md` 第 10 節列為待實測假設，本題 20 張批次
匯入直接命中這個情境，要在此一併驗證並誠實記錄結果）。
