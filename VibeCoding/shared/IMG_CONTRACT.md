# Level 1c 圖片資料層契約（草案，待使用者確認）

> 建立：2026-08-24。角色比照 `shared/CSV_CONTRACT.md` 之於 Level 1b——
> Day14–18 五題全部吃同一種輸入（使用者上傳的 JPG/PNG/WebP 照片），
> 若各題自己寫解碼、縮放、EXIF、透視校正，五題對同一件事的判定會不一致，
> 而這種不一致只有跨題比對時才會現形。本檔把公用的部分定案一次，
> 各題 `tasks.md` 直接引用，不自行定義。

## 0. 與 `shared/CONTRACT.md` 的關係

`CONTRACT.md` 的通則（共通 UI 基線、`buildCleanHtmlCopy()`、零依賴／零外部請求、
「第三題才升級為共用」判準）全部繼續適用。本檔只定義 Level 1c 特有的圖片處理規則。

## 1. 模組總覽（前置工程 `sdd/img-infra/` 建立）

| 模組 | 提供 | 用途 |
|---|---|---|
| `shared/img-decode.js` | `loadImageFile(file, opts)` | 讀檔 → 依 EXIF Orientation 轉正 → 回傳可用的 canvas |
| `shared/img-canvas.js` | `resizeCanvas()`／`canvasToBlob()`／`compressToTargetSize()` | 縮放、輸出、目標容量二分逼近 |
| `shared/img-exif.js` | `readExifTags()`／`stripMetadataSegments()` | EXIF/XMP 讀取與移除，**手寫，不引外部函式庫** |
| `shared/img-perspective.js` | `solveHomography()`／`warpImageData()` | 四點透視校正，**手寫反向映射，不用 WebGL** |
| `shared/io-zip.js`（擴充既有） | `createZipBlob()` 支援二進位 entry | 批次下載圖片 ZIP |
| `shared/img-file-size.js` | `checkImageFileSize()`／`checkBatchSize()` | 上傳前大小閘門 |

判準沿用 `CONTRACT.md`：`img-exif.js` 被 Day15（核心功能）與 Day16（清除 Metadata，PRD 15 明文要求）
**兩題**直接依賴，是已知需求不是投機共用，比照 `CSV_CONTRACT.md` 6.2 節 `ui-chart-svg.js` 的先例，
一開始就寫成 `shared/` 模組。其餘模組（`img-decode`／`img-canvas`／`img-perspective`／ZIP 擴充）
五題或多題共用，理由同 `csv-infra`。

Day18 的 A4 版型／列印 CSS 目前只有 Day13、Day18 兩題會用，**未達三題門檻，先各做各的**，
不進本次前置工程（沿用 `CSV_CONTRACT.md` 6.2 節同款判斷）。

## 2. 核心原則

跟 `CSV_CONTRACT.md` 第 2 節同一立場：**能不轉的資料就不轉**。
使用者上傳什麼格式，處理過程不夾帶額外的隱性轉檔（例如縮放時不順便轉色域），
除非該題的 PRD 明文要求。原始檔案**永遠不被覆寫**，所有輸出走新檔案／新 Blob。

## 3. `img-decode.js`：讀檔與轉正（已驗證，見下方實測）

```js
function loadImageFile(file, opts)
// opts: { maxDimension?: number }  // 選用，超過時等比例縮小到此上限再回傳（避免超大圖片吃爆記憶體）
// → Promise<{ canvas, width, height, mimeType, orientationApplied: number }>
```

**EXIF Orientation 轉正是必要的，不是可選的**：多數手機直式拍攝的 JPEG 靠 EXIF Orientation
標記（而非實際像素排列）決定顯示方向，不轉正的話 Day16／Day17／Day18 顯示的圖會是橫的。
`loadImageFile()` 內部呼叫 `img-exif.js` 的 `readExifTags()` 只取 Orientation 一個欄位，
依標準 8 種值（1–8，含鏡像組合）用 `canvas.translate`／`rotate`／`scale` 修正後畫進回傳的 canvas。
**回傳的 canvas 已經是轉正後的結果**，下游各題不需要、也不應該再自己處理 Orientation。

## 4. `img-canvas.js`：縮放與目標容量二分逼近

```js
function resizeCanvas(sourceCanvas, opts)
// opts: { maxLongEdge?: number, allowUpscale?: boolean }  // allowUpscale 預設 false（契約 3.2）
// → canvas（等比例縮放，長邊不超過 maxLongEdge；allowUpscale=false 時原圖已小於目標一律不放大）

function canvasToBlob(canvas, mimeType, quality)
// → Promise<Blob>（包 canvas.toBlob() 的 callback 版本）

function compressToTargetSize(canvas, opts)
// opts: { targetBytes: number, mimeType: 'image/jpeg'|'image/webp', maxIterations?: number }
// → Promise<{ blob: Blob, quality: number, achieved: boolean, iterations: number }>
```

**二分逼近演算法**：`quality` 在 `[0.1, 0.95]` 區間二分搜尋，每次呼叫 `canvasToBlob()`
量實際 Blob 大小，逼近 `targetBytes`。**PNG 不支援 quality 參數**（`canvas.toBlob` 對 `image/png`
會忽略 quality），目標容量模式**只對 JPEG／WebP 有意義**；PNG 輸入若選了目標容量模式，
先問使用者是否轉檔成 JPEG／WebP（PRD 13「格式轉換」本來就是 MVP 項目之一，非額外范圍）。

**品質二分逼近仍達不到目標時**（`maxIterations` 用完、quality 已到下限 0.1 仍超過 `targetBytes`）：
**降低尺寸**（`resizeCanvas` 長邊打七折）再重新二分逼近一輪，最多 3 輪尺寸調整。
三輪都達不到 → `achieved: false`，UI 依 PRD 13 驗收條件「無法達成時明確提示」顯示告知使用者，
**輸出當前最接近的結果，不是拒絕輸出**（使用者仍可能想要那個「盡力而為」的檔案）。

## 5. `img-exif.js`：手寫 EXIF/XMP 解析與移除（已驗證，見下方實測）

**決定：不引外部函式庫，手寫 JPEG marker 掃描**。EXIF/XMP 都藏在 JPEG 的 `APP1`（`0xFFE1`）
segment 裡，segment 結構是標準 TIFF／簡單簽名比對，掃描與移除是**機械性**工作，
跟第 7.4 節「手寫 SVG 優於引入 Chart.js」是同一個判斷邏輯。

```js
function readExifTags(arrayBuffer)
// → { orientation: number|null, dateTimeOriginal: string|null, make: string|null,
//     model: string|null, gpsLatitude: number|null, gpsLongitude: number|null,
//     hasGPS: boolean, hasXMP: boolean }
// 找不到 APP1(Exif) segment 時，全部欄位為 null／false，不拋錯誤（PRD 14 驗收條件：
// 「沒有 EXIF 的圖片不應報錯」）

function stripMetadataSegments(arrayBuffer)
// → ArrayBuffer（移除所有 APP1 中簽名為 "Exif\0\0" 或含 "http://ns.adobe.com/xap/1.0/" 的
//   segment，其餘 segment／影像資料原樣保留）
```

**移除策略是整段拿掉，不是逐一 tag 編輯**：EXIF 的 IFD 結構要「改一個 tag」得重新計算
所有 offset，複雜且容易做錯；PRD 14／15 的需求是「清除」不是「編輯部分欄位」，
整段 APP1 移除語意上完全等價且實作簡單十倍。**已用合成 JPEG byte stream 實測**：
掃描器正確識別並移除 `Exif\0\0` 與 XMP 簽名的 APP1 segment，保留 `APP0`(JFIF) 與影像資料，
移除後緩衝區不再含任一簽名字串。

**讀取（`readExifTags`）需要真正走 TIFF IFD**（tag/type/count/value-offset 逐一解析），
移除（`stripMetadataSegments`）**只需要 marker 掃描，不需要理解 IFD 內容**——兩者複雜度不同，
`tasks.md` 要分開列成不同任務（同一精神：手寫 SVG 的邊界情況要各自獨立成 task，見契約 7.4）。

### 5.1 PNG／WebP 支援擴充（2026-08-26，sdd `day15-png-webp-exif`）

**背景**：`img-exif.js` 原本只認得 JPEG（SOI `0xFFD8`），Day15 對 PNG/WebP 是「誠實擋下不清除」，
但底層根本讀不到這兩種格式的 metadata——PNG 的 `eXIf` chunk（2017 年後規格）與 WebP RIFF 容器
的 `EXIF`/`XMP ` chunk，都能攜帶跟 JPEG 同等敏感的 GPS/裝置/時間資訊。已補上兩種格式的讀取與
清除能力，`readExifTags()`／`stripMetadataSegments()` 對外簽章不變，內部依檔案開頭 magic bytes
（JPEG SOI／PNG 簽章 `89 50 4E 47`／RIFF+WEBP）dispatch，JPEG 既有邏輯完全不動。

**共用核心**：IFD0／Exif SubIFD／GPS IFD 的 TIFF 解析邏輯抽成 `_parseTiffTags(view)`，JPEG/PNG/WebP
三種格式各自找出自己的 TIFF/EXIF blob 後丟進同一個函式，不重複三份解析器。

```
PNG：_pngChunkWalker(dataView, callback) — 從簽章之後第 8 byte 開始走訪
  4 bytes 長度 + 4 bytes chunk type + data + 4 bytes CRC32 的 chunk 序列。
  讀取／移除 eXIf chunk（丟進 _parseTiffTags）與 iTXt（keyword 為 XML:com.adobe.xmp 視為 XMP）。
  移除策略跟 JPEG 一樣是整個 chunk 跳過不寫回，其餘 chunk 含 CRC32 原樣保留，不用重算。

WebP：_riffChunkWalker(dataView, callback) — 從 RIFF header(8 bytes)+"WEBP"(4 bytes) 之後
  第 12 byte 開始走訪 4 bytes FourCC + 4 bytes little-endian 長度 + data（+ 奇數長度補 1 byte
  padding）的 chunk 序列。讀取／移除 EXIF chunk（丟進 _parseTiffTags）與 XMP chunk（FourCC 為
  "XMP "，含尾端空白）。
  VP8X chunk（畫布尺寸／Alpha／Animation 旗標）本身不刪，只在有移除 EXIF/XMP 時，把 flags byte
  裡對應的 Exif(0x08)／XMP(0x04) 旗標位元清掉，避免解碼器依旗標去找一個已經不存在的 chunk；
  同時要重算並寫回 RIFF 檔案總長度欄位（bytes 4-7，little-endian，值為檔案總長減 8）。
```

`isSupportedImageFormat(arrayBuffer)` 是新增的公開輔助函式，只做 magic bytes 判斷（JPEG/PNG/WebP
三選一），給呼叫端（Day15）判斷要不要當「支援清除」處理，取代原本各自寫一份格式判斷邏輯。

**已驗證**（見 `sdd/archive/2026-08-27-day15-png-webp-exif/`）：
- 用 Python piexif 產生帶真實 GPS/Make/Model/DateTimeOriginal 的 PNG 與 WebP 測資，
  `readExifTags()` 讀值正確，`stripMetadataSegments()` 清除後欄位全部歸零
- 清除後的 PNG/WebP 用 PIL `verify()` 與瀏覽器 `<img>` 實際載入，圖片本身（像素資料）完整未壞
- **JPEG regression**：跟改動前的版本逐位元組比對 `stripMetadataSegments()` 輸出，帶 EXIF、
  無 EXIF、非圖片三種情境完全相同，`_parseTiffTags()` 抽取重構對 JPEG 既有行為零影響
- Day15 UI 端對端（Playwright，對照 bundled `index.html`）：JPEG+PNG+WebP 同時上傳，正確顯示
  風險等級與欄位、清除後驗證表格皆「✓ 已清除」；GIF 等未支援格式仍正確擋下顯示「不支援的格式」

**範圍外**：PDF／DOCX／PPTX／XLSX 的 metadata 處理未涵蓋在本次擴充，另案評估。

## 6. `img-perspective.js`：手寫透視校正（已驗證效能，見下方實測）

**決定：純 JS 反向映射 + 雙線性取樣，不用 WebGL**。Canvas 2D Context 原生只支援仿射變換
（`setTransform`），不支援真正的透視（projective）變換，所以「四角拖曳校正」必須自己算：

```js
function solveHomography(srcQuad, dstQuad)
// srcQuad/dstQuad: [[x,y],[x,y],[x,y],[x,y]]（四個對應點，順序需一致，建議左上/右上/右下/左下）
// → number[9]（3x3 homography matrix，row-major，dst = H * src 方向）

function warpImageData(sourceImageData, inverseHomography, outWidth, outHeight)
// → ImageData（對每個輸出像素反向映射回來源座標，雙線性取樣；映射落在來源範圍外的像素填 0）
```

**已用 Node 實測驗證**：
- 正確性：4 組已知對應點反解出的 H，代入後精確還原全部 4 個角點（誤差 < 0.001px）。
- 效能：4032×3024（約 1219 萬像素，常見手機拍照解析度）的完整反向映射＋雙線性取樣，
  純 JS 單執行緒（Node V8）耗時 **192ms**。瀏覽器主執行緒量級應相近。
  **結論：一次性「套用校正」在使用者點擊後跑，192ms 級別完全可接受，不需要 WebGL。**

**互動與效能的分工**：拖曳四個角點的**即時預覽**不能每次都跑 192ms 的全解析度重算
（會卡頓）。預覽用 CSS `transform: matrix3d(...)` 或縮小尺寸（如長邊 800px）跑
`warpImageData` 做近似即時預覽即可；**真正的輸出**（下載／套用）才用原始解析度跑一次
完整的 `warpImageData`。這個分工要寫進 `document-perspective-corrector` 的 `tasks.md`，
不能省略「小尺寸預覽 vs 原始解析度輸出」這個區分。

## 7. `io-zip.js` 擴充：支援二進位 entry

既有 `createZipBlob(files)` 只接受 `{ name, text }`（字串，內部轉 `fflate.strToU8`）。
Level 1c 要打包的是圖片二進位資料，**擴充**（不是新建模組）：

```js
function createZipBlob(files)
// files: Array<{ name: string, text?: string, bytes?: Uint8Array }>
// 每個 entry 有 text 就走原本的 strToU8 路徑，有 bytes 就直接傳給 fflate.zipSync
// （fflate.zipSync 原生接受 Uint8Array，不需要額外轉換），二者都沒有時丟錯誤
```

`fflate.zipSync` 底層本來就直接吃 `Uint8Array`，`strToU8` 只是「字串轉 bytes」的輔助函式，
**擴充不需要新的 vendor 資產或新的授權條款**，`bundle.json` 不受影響。

### 7.1 補匯出 `unzipSync`／`strFromU8`（2026-08-27，sdd `day30-ooxml-privacy-cleaner`）

Day30 需要**解開**現有 zip（DOCX/XLSX/PPTX 都是 OOXML zip 容器），不只是打包。
`shared/vendor/fflate.umd.js` 本來就內建 `unzipSync`／`strFromU8`，只是 `io-zip.js`
之前只包出打包方向的 API，補上讀取方向：

```js
function unzipToEntries(bytesOrArrayBuffer)
// bytesOrArrayBuffer: Uint8Array | ArrayBuffer
// → Object<string, Uint8Array>（entry 路徑 → 內容 bytes，例如 "docProps/core.xml"）
// 非 zip 格式（例如加密 Office 檔的 CFB/OLE 容器）會讓 fflate.unzipSync 直接丟出例外，
// 呼叫端要自己 try/catch，不能把「解不開」誤判成「沒有內容」。

function zipEntryToText(bytes)
// bytes: Uint8Array → string（UTF-8 解碼），給 DOMParser 解析 docProps/*.xml 用
```

同樣不需要新 vendor 資產（fflate 早就內建這兩個函式），`createZipBlob()` 函式本體逐字元
比對跟擴充前完全一致（regression 已驗證）。**已驗證**：用真實 python-docx 產生的 docx
測過 `unzipToEntries()` 正確解出全部 entry、`zipEntryToText()` 讀出的 `docProps/core.xml`
內容正確。

## 8. 檔案大小閘門（`img-file-size.js`）

沿用 `CSV_CONTRACT.md` 第 5 節「gate 在讀檔之前執行」的介面精神，但**門檻數字要重新定案**，
不可比照 CSV 的 5MB／20MB 直接套用——照片天生就比 CSV 文字檔大很多，照抄會把合法照片
（現代手機一張 8–15MB 很常見）誤擋成「超限」。

```js
function checkImageFileSize(byteLength)
// → { ok: boolean, level: 'ok'|'warn'|'reject', message: string }
// 門檻（草案，待各題實作時依實際測試手機照片大小微調）：
//   單檔 <= 30MB：ok
//   30MB < 單檔 <= 80MB：warn（提示處理可能需要數秒）
//   單檔 > 80MB：reject

function checkBatchSize(totalByteLength, fileCount)
// → { ok: boolean, level: 'ok'|'warn'|'reject', message: string }
// 批次總量（Day14／Day15 的批次處理、Day18 的多照片匯入）：
//   總量 <= 200MB：ok；200–500MB：warn；> 500MB：reject
```

## 9. 剪貼簿貼圖（Day15「剪貼簿貼圖」MVP 項目）

既有 `shared/io-clipboard.js` 只支援文字（`copyToClipboard(text)` 寫入）。
Day15 需要**讀取**剪貼簿裡的圖片（`navigator.clipboard.read()` 取得 `ClipboardItem`，
篩選 `image/*` MIME type 的 blob）。這是**新能力**，不是既有函式的自然延伸，
`io-clipboard.js` 要新增 `pasteImageFromClipboard()`：

```js
function pasteImageFromClipboard()
// → Promise<Blob|null>（成功貼上圖片回傳 Blob；剪貼簿無圖片內容或使用者拒絕權限回傳 null，
//   不拋出未捕捉的例外）
```

## 9a. `io-dropzone.js` 擴充：多檔批次匯入（2026-08-24 補訂）

**背景**：Level 1c 五題提案階段發現，`setupDropZone()`／`setupFilePicker()`
（`shared/io-dropzone.js`）目前**無條件只處理 `files[0]`**——即使 `<input>` 有
`multiple` 屬性、即使拖放同時丟進多個檔案，也只有第一個會被讀取。
`image-batch-optimizer`（Day14）與 `photo-evidence-sheet`（Day18）**兩題在同一批提案裡
各自獨立需要多檔匯入**，寫提案的兩個 agent 分別做了不同判斷——一個假設它已經支援、
一個發現不支援後決定繞過自己寫。**這正是契約沒把橫向的事定案一次會發生的漂移**，
跟 Level 1b `confidence:'manual'` 三題各自做法不同是同一種病。

⚠️ 這不是「等第三題出現才升級」的投機共用——是這批提案裡已經有兩題同時需要，
比第三題門檻的標準更強，理由同 `CSV_CONTRACT.md` 6.2 節 `ui-chart-svg.js` 先例：
不是猜測，是已知。

**決定：擴充 `setupDropZone()`／`setupFilePicker()`，`ioDropzoneHandleFile()` 本身不動**：

```js
function setupDropZone(dropEl, onData, opts)
function setupFilePicker(inputEl, onData, opts)
// opts.multiple: boolean，預設 false（不傳等同現行行為，完全向後相容）
// opts.multiple === true 時：
//   - 讀取全部檔案（drop 事件的 e.dataTransfer.files／input 的 inputEl.files），
//     不再只取 [0]
//   - 對每個檔案呼叫既有的 ioDropzoneHandleFile(file, wrappedOnData, opts)，
//     ioDropzoneHandleFile() 本身簽名與內部邏輯完全不變
//   - onData 的呼叫簽名擴充為 onData(result, fileName, meta)，
//     meta = { index: number, total: number }（依檔案在 FileList 中的原始順序，
//     不是依非同步讀取完成的順序——用閉包在呼叫端固定 index，不依賴 FileReader
//     完成順序，避免 Day18「排序後圖說仍綁定照片」這類需求因非同步讀取順序不穩定而出錯）
//   - opts.multiple 未設定或 false 時，onData 只收到 (result, fileName) 兩個參數，
//     現有呼叫端（Level 1a／1b 全部產品）不受影響
```

**驗收要求**：擴充後，Level 1a／1b 任一既有產品重新 bundle，行為不得有任何變化
（既有呼叫端都沒有傳 `opts.multiple`，等同關閉這個新分支）。

### 9a-1. `opts.gateBatch`：整批總量檢查（2026-08-24 補訂，修正 9a 的設計遺漏）

⚠️ **9a 節本身有一個沒想清楚的地方**：`opts.gate(file)` 天生只能看到單一檔案，
但 `checkBatchSize()` 需要的是**整批的總位元組數**，兩者介面對不上。第一版擴充完全
沒處理這件事，導致 `image-batch-optimizer`（Day14）與 `photo-evidence-sheet`（Day18）
的修正各自用「逐檔同步累加、逾時歸零」去湊——這只能做到「累加到超過門檻才開始擋」，
不是任務書要求的「讀檔前檢查整批總量，超過就整批擋下、不處理任一檔」的原子判斷。

**決定：新增 `opts.gateBatch(files)`，與既有 `opts.gate(file)` 並存，各司其職**：

```js
function setupDropZone(dropEl, onData, opts)
function setupFilePicker(inputEl, onData, opts)
// opts.gateBatch: function(files) => {ok, level, message}，選用。
// 當 opts.multiple === true 且提供了 opts.gateBatch 時：
//   - 在讀取「全部檔案」的迴圈開始之前，先用完整的 FileList（或等效的類陣列物件）
//     呼叫一次 opts.gateBatch(files)
//   - !ok 時：呼叫 opts.onError(gateBatchResult.message) 一次，
//     完全不進入逐檔迴圈、不呼叫任何 ioDropzoneHandleFile()、onData 一次都不會被呼叫
//   - ok 時（含 level==='warn'）：照常進入既有的逐檔迴圈，每個檔案仍然各自經過
//     opts.gate(file) 的單檔判定（兩層閘門不互斥，各自負責整批／單檔）
// opts.gateBatch 未提供時，行為與 9a 原本的設計完全相同（向後相容）
```

`checkBatchSize()`（`img-file-size.js`）不用改，呼叫端把完整 FileList 的位元組加總後
傳給它即可——加總這件事現在由 `setupDropZone`／`setupFilePicker` 內部在呼叫
`opts.gateBatch` 之前完成，不需要各題自己維護累加器。

**驗收要求**：`opts.gateBatch` 未提供時，行為與 9a 原本的設計完全相同（向後相容，
Level 1a/1b 與已經用 9a 版本的呼叫端都不受影響）。

## 10. 待實測驗證的假設（實作時要驗，不是我猜的就直接採信）

以下是撰寫本契約時**推論但未實測**的部分，各題實作到對應功能時要補實測，
發現不成立要回頭修正本契約（比照 `LEVEL1B_RULINGS.md` 教訓：不要插入新規則不回頭驗）：

- `canvas.toBlob()` 對 `image/webp` 的瀏覽器支援度與品質參數行為（Safari 過去對 WebP 支援較晚，
  需要在 Day14 任務中實測目標瀏覽器的實際行為，必要時退化為只提供 JPEG/PNG）
- 大量圖片（Day14／Day15 批次 20+ 張、Day18 匯入 20 張）在瀏覽器主執行緒逐張處理是否會
  明顯卡頓 UI；若會，`tasks.md` 要考慮 `requestIdleCallback` 或分批 `setTimeout(0)` 讓出主執行緒
- EXIF GPS 座標的原始格式是度分秒（degrees/minutes/seconds，以有理數 rational 表示），
  `readExifTags()` 換算成十進位度數的公式需要用真實拍攝的 GPS 照片實測校驗，不能只靠規格文件推導
