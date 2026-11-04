# Tasks：Screenshot Privacy Sanitizer（screenshot-sanitizer）

> 前置條件：`sdd/img-infra/` 已完成並驗收通過（`img-decode.js`／`img-canvas.js`／
> `img-exif.js`／`img-file-size.js`／`io-clipboard.js` 的 `pasteImageFromClipboard()`
> 皆已就緒）。本題不重寫任何底層圖片解碼／EXIF／剪貼簿邏輯，見
> `VibeCoding/shared/IMG_CONTRACT.md`。

- [x] 1. 建立 `Day16_screenshot-sanitizer/src/index.html` 版面骨架：上傳區（拖曳＋檔案選取，
  接 `shared/io-dropzone.js` 的 `setupDropZone`／`setupFilePicker`，`gate` 呼叫
  `checkImageFileSize(file.size)`）、「從剪貼簿貼上」按鈕、圖片顯示區（canvas）、遮蔽
  工具列（黑箱／Pixelate／Blur 三個選項）、Undo／Redo 按鈕、Before/After 切換、匯出按鈕、
  複製結果／下載本工具離線版（`CONTRACT.md` 第 6 節基線）；套用 `shared/base.css`。
  - 驗收：情境：開啟頁面，畫面上可見上傳區、「從剪貼簿貼上」按鈕、canvas 顯示區、三個
    遮蔽工具選項、Undo/Redo 按鈕（初始為 disabled，尚無操作可撤銷）、Before/After 切換、
    匯出按鈕；`view-source` 確認 `gate` 函式呼叫的是 `checkImageFileSize`，不是自訂大小
    判斷邏輯。

- [x] 2. 串接圖片載入路徑：檔案上傳與剪貼簿貼圖**共用同一條處理函式**——上傳走
  `loadImageFile(file, opts)`，剪貼簿走 `pasteImageFromClipboard()` 取得 `Blob` 後同樣
  交給 `loadImageFile()`；成功後建立 `cleanCanvas`（`loadImageFile()` 回傳的轉正後
  canvas，全程唯讀）、初始化空的 `maskOps: []` 與 `redoStack: []`，並把 `cleanCanvas`
  複製到 `workCanvas` 顯示。
  - 驗收：情境：上傳一張 EXIF Orientation 非 1 的手機直式照片，畫面顯示的圖片方向正確
    （轉正生效）；情境：複製一張圖片到系統剪貼簿後點擊「從剪貼簿貼上」，圖片正確顯示在
    canvas 上；情境：剪貼簿沒有圖片內容時點擊「從剪貼簿貼上」，畫面顯示「剪貼簿沒有圖片
    內容」提示，不拋出未捕捉例外；情境：上傳超過 `checkImageFileSize` reject 門檻的圖片，
    畫面顯示拒絕訊息，不進入 `loadImageFile()`。

- [x] 3. 設計並實作「操作紀錄 + 重繪」核心管線：定義 `maskOps` 陣列的資料結構
  （`{ type: 'box'|'pixelate'|'blur', x, y, w, h }`，座標為 canvas 實際像素座標，非
  CSS 顯示座標）與 `redrawFromOps()` 函式——每次呼叫先把 `cleanCanvas` 完整
  `drawImage()` 複製到 `workCanvas`（蓋掉前一輪殘留像素），再依序對 `maskOps` 每個
  操作呼叫對應的遮蔽函式（此任務先提供三個函式的空殼／黑箱最簡實作，Pixelate／Blur
  的實際演算法留給任務 4、5）直接改寫 `workCanvas` 對應區域的像素。同時實作滑鼠框選
  互動：使用者在 canvas 上拖曳出矩形，放開滑鼠時把顯示座標換算成 canvas 實際像素座標，
  push 一筆 `{ type: 目前選中的工具, x, y, w, h }` 進 `maskOps`，`redoStack` 清空，
  呼叫 `redrawFromOps()`。
  - 驗收：情境：canvas 顯示尺寸被 CSS 縮小（例如原圖 2000px 寬、畫面只顯示 800px 寬）
    時框選一個區域，換算後存進 `maskOps` 的 `x/y/w/h` 對應到原圖實際像素範圍（用瀏覽器
    console 印出 `maskOps` 內容核對，不是顯示座標的數值）；情境：連續框選 3 個不重疊
    區域套用黑箱，`maskOps.length === 3` 且三個區域在畫面上都變黑；情境：框選一個區域
    套用黑箱後，再次呼叫 `redrawFromOps()`（例如手動觸發一次），畫面結果不變（重繪是
    冪等的，不會疊加出比預期更深的顏色或重複偏移）。

- [x] 4. 實作 Pixelate（馬賽克）演算法：對遮蔽區域 `getImageData(x, y, w, h)`，切成
  `N × N`（預設 `N=10`）格子，每格內所有像素 RGB 平均後整格填成該平均色，`putImageData()`
  寫回 `workCanvas`；接進任務 3 的 `redrawFromOps()` 管線（`type === 'pixelate'` 時呼叫
  本函式）。
  - 驗收：情境：對一個已知內容的測試區域（例如放一張左半紅色、右半藍色的圖）套用
    Pixelate，區域內像素被替換成一格一格的純色塊，用 `getImageData` 檢查同一格內所有
    像素 RGB 值完全相同（不是漸層或原圖殘留）；情境：框選區域寬或高不是 `N` 的整數倍
    （例如 w=23, N=10）時，最後一個不完整格子仍正確處理（不拋出例外、不留下未處理的
    像素帶）。

- [x] 5. 實作 Blur（模糊）演算法：對遮蔽區域手寫 box blur（每個像素取 `k × k`
  （預設 `k=8`）鄰域 RGB 平均值），純 JS 運算 `ImageData`，不使用 CSS `filter`；接進
  任務 3 的 `redrawFromOps()` 管線（`type === 'blur'` 時呼叫本函式）。
  - 驗收：情境：對含清晰文字或邊緣的測試區域套用 Blur，`putImageData()` 寫回後畫面上
    該區域文字/邊緣明顯模糊、無法辨識原始內容，用 `getImageData` 抽查區域內相鄰像素的
    RGB 值差異明顯小於套用前（證明真的做了平均運算，不是只換了顏色）；情境：框選範圍
    貼近圖片邊緣（例如 `x=0` 或 `x+w === canvas.width`）時，鄰域取樣不會存取超出
    `ImageData` 範圍的索引而拋出例外（邊界像素用夾取或鏡像處理）。

- [x] 6. 實作 Undo／Redo：Undo 把 `maskOps` 最後一筆 `pop()` 移入 `redoStack`，呼叫
  `redrawFromOps()`；Redo 把 `redoStack` 最後一筆 `pop()` 移回 `maskOps` 尾端，呼叫
  `redrawFromOps()`；新增任何遮蔽操作時清空 `redoStack`。`maskOps` 為空時 Undo 按鈕
  disabled，`redoStack` 為空時 Redo 按鈕 disabled。
  - 驗收：情境：套用 3 個遮蔽操作後點擊 Undo 兩次，畫面回到只有第 1 個操作生效的狀態
    （對應 PRD 驗收條件「Undo 可取消上一個操作」）；情境：Undo 兩次後點擊 Redo 一次，
    第 2 個操作重新出現，畫面與 Undo 前第 2 步的狀態一致；情境：Undo 後（`redoStack`
    非空）再框選一個新的遮蔽區域，原本可 Redo 的操作消失（`redoStack` 被清空），Redo
    按鈕變回 disabled；情境：全部操作都 Undo 完畢後，畫面回到與 `cleanCanvas` 完全
    相同的乾淨圖片，Undo 按鈕 disabled。

- [x] 7. 實作 Before/After：切換或並排顯示 `cleanCanvas`（Before，未遮蔽原圖）與
  `workCanvas`（After，套用目前 `maskOps` 後的結果）；Before 畫面**不提供下載/複製
  功能**（只能檢視，避免使用者誤把未遮蔽原圖傳出去）。
  - 驗收：情境：套用至少一個遮蔽操作後切換到 Before 檢視，畫面顯示完全未遮蔽的原圖；
    切回 After，遮蔽區域正確顯示；情境：`view-source` 或畫面檢查確認 Before 檢視畫面
    上沒有任何下載或複製按鈕可以匯出當下顯示的內容。

- [x] 8. 實作最終輸出：`workCanvas.toBlob()` → 讀成 `ArrayBuffer` → 呼叫
  `stripMetadataSegments(arrayBuffer)` 移除 Metadata → 用回傳的 `ArrayBuffer` 組成
  最終 Blob，走 `shared/io-download.js` 下載，檔名固定為 `{原檔名}_sanitized.{副檔名}`
  （不覆蓋原檔名）。
  - 驗收：情境：對一張套用了黑箱＋Pixelate 兩種遮蔽操作的圖片點擊匯出並下載，**重新
    開啟下載的檔案**（用作業系統內建圖片檢視器，不是本工具），兩個遮蔽區域仍然存在
    （對應 PRD 驗收條件「下載後重新開啟仍保持遮蔽」）；情境：對一張下載的成品檔案跑
    `readExifTags()`（來自 `img-infra`，僅用於驗收，非本題功能）確認 Metadata 已被
    清除（`hasGPS === false`、`hasXMP === false`）；情境：上傳一張含 GPS/相機資訊
    EXIF 的真實照片，全程不套用任何遮蔽操作、直接匯出，下載的檔案同樣不含原始 EXIF
    （Metadata 清除不依賴是否有套用遮蔽操作）。

- [x] 9. 實作複製結果、下載本工具離線版：複製結果接 `shared/io-clipboard.js`（複製匯出
  狀態文字或提示，非圖片本身，圖片走任務 8 的下載）；實作 `buildCleanHtmlCopy()` 清空
  已上傳圖片、`cleanCanvas`／`workCanvas` 內容、`maskOps`／`redoStack`、
  `#__shared_toast` 元素，移除 `.nav-back` 與站內連結。
  - 驗收（`CONTRACT.md` 第 6 節硬性要求，⚠️ 依契約規定分兩種判定，不可混用）：上傳一張
    測試圖片（哨兵：檔名含唯一字串 `ZZSANFILE`）、套用至少一個遮蔽操作、觸發一次 toast
    後點擊「下載本工具離線版」。**(甲) 原始碼精確搜尋**：離線版原始碼中搜尋
    `ZZSANFILE` 須為 0 筆。**(乙) DOM 層判定**（Playwright 載入離線版產物斷言，不可用
    grep）：`document.getElementById('__shared_toast') === null`；
    `document.querySelectorAll('.nav-back').length === 0`；離線版載入時 canvas 為初始
    空白狀態（無殘留圖片）；`pageerror` 與 console error 皆為空。

- [x] 10. 建置與整合驗收：建立 `src/bundle.json`，跑 `scripts/bundle.py` 產出
  `index.html`／`bundle_manifest.json`；用一張含真實 EXIF/GPS 的手機照片，以 `file://`
  與本機伺服器各測一次完整流程（上傳→框選套用三種遮蔽→Undo/Redo→Before/After 檢視→
  匯出下載→重新開啟確認遮蔽與 Metadata 清除皆生效）。
  - 驗收：情境：`scripts/bundle.py` 執行後產出 `index.html`，`file://` 開啟與本機伺服器
    開啟兩種方式，完整流程結果一致（無 console error、遮蔽與 Metadata 清除行為相同）；
    情境：用剪貼簿貼圖路徑（非檔案上傳）跑一次同樣的完整流程，結果與上傳路徑一致，
    證明兩條輸入路徑共用同一套核心管線沒有分岔出不同行為。
