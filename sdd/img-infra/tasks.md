# Tasks — img-infra（Level 1c 前置工程）

> 前置條件：無（這是 Level 1c 最底層的前置工程）。完成後 Day14–18 直接引用，
> 各題 `tasks.md` **不要**包含「寫圖片解碼器」之類的任務，見 `VibeCoding/shared/IMG_CONTRACT.md`。

- [x] 1. 建立 `VibeCoding/shared/img-exif.js` 的 `readExifTags(arrayBuffer)`：手寫 JPEG marker
  掃描找到 `APP1` 中簽名為 `Exif\0\0` 的 segment，解析 TIFF header（判斷 `II`/`MM` byte order）
  與 IFD0，取出 `Orientation`（tag 0x0112）、`Make`（0x010F）、`Model`（0x0110）、
  `DateTimeOriginal`（Exif SubIFD，tag 0x9003）、GPS IFD 的緯度／經度（度分秒轉十進位度數）。
  找不到 EXIF 時全部欄位回 `null`／`false`，不拋出例外（契約第 5 節）。
  **驗收**：情境：用一張真實拍攝、含 GPS 的手機照片測試，讀出的 `Make`／`Model`／
  `DateTimeOriginal` 與該照片實際的拍攝裝置與時間相符（用其他 EXIF 檢視工具或作業系統
  內建的「檔案內容」對照一次）；情境：GPS 度分秒換算成十進位度數後，與地圖服務手動核對
  誤差在合理範圍內（同一個地點）；情境：一張完全沒有 EXIF 的 PNG 圖片，`readExifTags()`
  回傳全部欄位為 `null`／`false`，不拋出例外、不讓呼叫端當機。

- [x] 2. 建立 `readExifTags` 同檔案內的 `stripMetadataSegments(arrayBuffer)`：掃描並移除所有
  簽名符合 `Exif\0\0` 或含 `http://ns.adobe.com/xap/1.0/` 的 `APP1` segment，其餘 segment
  （含 `APP0`/JFIF）與影像壓縮資料原樣保留。
  **驗收**：情境：對一張含 EXIF 與 XMP 的真實照片跑 `stripMetadataSegments()`，輸出的
  bytes 裡搜尋不到 `Exif` 與 `xap/1.0` 字串；情境：把移除後的 bytes 組成 Blob 塞進
  `<img>` 顯示，圖片內容（像素）與原圖肉眼比對完全一致，證明只移除了 metadata、
  沒有動到影像資料；情境：對一張本來就沒有 EXIF 的圖片跑，輸出與輸入位元組數相同
  （沒東西可移除時不改動檔案）。

- [x] 3. 建立 `VibeCoding/shared/img-decode.js` 的 `loadImageFile(file, opts)`：讀檔、
  呼叫任務 1 的 `readExifTags()` 只取 Orientation 欄位、依標準 8 種 EXIF Orientation 值
  用 `canvas` 的 `translate`／`rotate`／`scale` 轉正，回傳已轉正的 canvas。`opts.maxDimension`
  存在時等比例縮小到此上限（避免超大圖片吃爆記憶體）。
  **驗收**：情境：用手機直式拍攝、EXIF Orientation 非 1 的真實照片測試，`loadImageFile()`
  回傳的 canvas 畫出來是「正的」（人臉/文字方向正確），不是原始像素排列的橫向；
  情境：Orientation 為 1（不需轉正）的圖片，轉正前後像素完全相同；情境：`opts.maxDimension`
  設為 1000 時，一張長邊 4000px 的圖片回傳的 canvas 長邊 <= 1000 且比例不失真。

- [x] 4. 建立 `VibeCoding/shared/img-canvas.js` 的 `resizeCanvas(sourceCanvas, opts)` 與
  `canvasToBlob(canvas, mimeType, quality)`：等比例縮放（長邊限制、預設不放大）、
  包裝 `canvas.toBlob()` 為 Promise。
  **驗收**：情境：`allowUpscale` 預設為 `false` 時，原圖已經小於 `maxLongEdge`，
  輸出 canvas 尺寸與輸入相同（沒有被放大）；情境：`maxLongEdge=800` 對一張 1600×1200
  的圖片縮放，輸出為 800×600（比例維持 4:3）；情境：`canvasToBlob()` 對同一個 canvas
  分別用 `image/jpeg` 與 `image/png` 輸出，兩者 MIME type 正確且都能被瀏覽器重新開啟顯示。

- [x] 5. 建立 `img-canvas.js` 的 `compressToTargetSize(canvas, opts)`：JPEG/WebP 品質二分
  逼近目標容量，逼近後仍超過時降低尺寸（長邊打七折）重試，最多 3 輪尺寸調整。
  **驗收**：情境：一張輸出後遠大於 1MB 的照片，設定 `targetBytes: 1*1024*1024`，
  最終 `blob.size <= targetBytes` 且 `achieved: true`；情境：目標容量設定極小（例如
  10KB）導致 3 輪尺寸調整後仍達不到，回傳 `achieved: false` 且仍附上當前最接近的
  `blob`（不是拒絕輸出 `undefined`）；情境：對 PNG 輸入呼叫本函式（PNG 不支援 quality
  參數），函式明確回報「PNG 不支援目標容量壓縮」而不是靜默輸出一個跟目標容量無關的結果。

- [x] 6. 建立 `VibeCoding/shared/img-perspective.js` 的 `solveHomography(srcQuad, dstQuad)`：
  4 組對應點解 8 元線性方程組求 3x3 homography matrix。
  **驗收**：情境：給定 4 組已知對應點求出 H，把 4 個來源點代入 H 還原，算出的座標與
  目標點誤差 < 0.5px（浮點誤差範圍內）；情境：4 個點中有 3 點共線（退化情況）時，
  函式不會靜默回傳錯誤結果或讓呼叫端卡死——明確拋出錯誤或回傳訊號讓 UI 提示使用者
  重新選點。

- [x] 7. 建立 `img-perspective.js` 的 `warpImageData(sourceImageData, inverseHomography,
  outWidth, outHeight)`：對輸出每個像素反向映射回來源座標，雙線性取樣。
  **驗收**：情境：對一張已知內容的測試圖（例如四角各放一個不同顏色色塊），用對應到
  該四色塊角點的 homography 校正成矩形，校正後圖片四個角落的顏色與預期的色塊顏色相符；
  情境：4032×3024 解析度的完整校正在瀏覽器（非 Node）實測耗時記錄下來，若明顯超出
  Node 實測的 192ms 量級（例如超過 1 秒），在回報中誠實記錄並評估是否要調整契約
  第 6 節「純 JS 可行」的判斷。

- [x] 8. 擴充既有 `VibeCoding/shared/io-zip.js` 的 `createZipBlob(files)`：支援
  `{ name, bytes: Uint8Array }` entry（原有 `{ name, text }` 不動）。
  **驗收**：情境：混合傳入一個 `text` entry 與一個 `bytes`（例如一張圖片的
  `Uint8Array`）entry，產出的 ZIP 用系統內建解壓工具能正確解出兩個檔案，圖片檔案
  用圖片檢視器能正常開啟（證明二進位資料沒有被字串轉換破壞）；情境：呼叫既有的
  純文字用法（Level 1b 沒有用到這個函式，但驗證介面向後相容），行為與擴充前完全一致。

- [x] 9. 擴充既有 `VibeCoding/shared/io-clipboard.js` 新增 `pasteImageFromClipboard()`；
  建立 `VibeCoding/shared/img-file-size.js` 的 `checkImageFileSize()`／`checkBatchSize()`。
  **驗收**：情境：複製一張圖片到系統剪貼簿後呼叫 `pasteImageFromClipboard()`，
  回傳的 Blob 的 `type` 是 `image/*` 且能正常畫進 canvas 顯示；情境：剪貼簿裡是純文字
  （沒有圖片）時呼叫，回傳 `null`，不拋出未捕捉的例外；情境：`checkImageFileSize()`
  對 30MB 以下回 `ok`、30–80MB 回 `warn`、80MB 以上回 `reject`，門檻邊界值（正好
  30MB、正好 80MB）各測一次確認落在哪一邊。

- [x] 10. 擴充既有 `VibeCoding/shared/io-dropzone.js` 的 `setupDropZone()`／
  `setupFilePicker()`：新增 `opts.multiple`（預設 `false`），為 `true` 時讀取全部檔案
  （不再只取 `files[0]`），對每個檔案呼叫既有的 `ioDropzoneHandleFile()`（本身簽名與
  邏輯不動），`onData` 擴充為 `onData(result, fileName, meta)`，`meta = {index, total}`
  依檔案在 `FileList` 中的**原始順序**（不依賴非同步讀取完成順序）。這條是 Level 1c
  提案階段發現的缺口——`image-batch-optimizer`（Day14）與 `photo-evidence-sheet`（Day18）
  兩題在同一批提案裡各自獨立需要多檔匯入，見 `IMG_CONTRACT.md` 第 9a 節。
  **驗收**：情境：`opts.multiple: true` 時一次選取 5 個檔案（拖放與檔案選取 input
  各測一次），`onData` 被呼叫 5 次，`meta.index` 依序為 0–4、`meta.total` 皆為 5，
  且 `index` 與檔案選取當下的原始順序一致（不因為某個檔案讀取比較慢而錯位）；
  情境：`opts.multiple` 未傳（或 `false`）時，行為與擴充前完全相同，只處理
  `files[0]`，`onData` 只收到 2 個參數的呼叫端（Level 1a／1b 全部既有產品）不受影響；
  情境：Level 1a／1b 任一既有產品重新 bundle，`bundle_manifest.json` 記錄的
  `shared/io-dropzone.js` sha256 之外的行為（實際功能）逐一手動測試一次，確認未受影響。

## 驗收條件（總結）

- 情境：Level 1a／1b 任何一個既有產品重新 bundle 後，`bundle_manifest.json` 記錄的
  `shared/io-zip.js`／`shared/io-clipboard.js`／`shared/io-dropzone.js` sha256 與磁碟現況
  一致（本次擴充沒有意外改變既有行為，向後相容）。
- 情境：五個新模組各自用 Node 直接 `require`／`vm` 載入即可跑純函式測試，不需要
  瀏覽器環境（比照 `csv-infra` 的驗收慣例，Canvas 相關函式在瀏覽器另外用 Playwright
  補測）。
