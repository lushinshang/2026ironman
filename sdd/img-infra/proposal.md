# 前置工程：圖片資料層（Level 1c，Day14–18 共用）

## 為什麼做

Level 1c 五題（`image-batch-optimizer` / `exif-privacy-cleaner` / `screenshot-sanitizer` /
`document-perspective-corrector` / `photo-evidence-sheet`）全部吃同一種輸入：使用者上傳的
JPG/PNG/WebP 照片。若各題自己寫讀檔、縮放、EXIF 處理、透視校正，五題對「EXIF Orientation
要不要轉正」「圖片超過多大要擋」這類判定會不一致——跟 Level 1b 的 `csv-infra` 是同一個
理由（見 `sdd/archive/2026-08-24-csv-infra/`），套用到圖片資料層。

依 `VibeCoding/shared/IMG_CONTRACT.md`（下稱「契約」）規定：`img-decode.js` / `img-canvas.js` /
`img-exif.js` / `img-perspective.js` / `img-file-size.js` 五個模組與 `io-zip.js`／`io-clipboard.js`
的擴充，**不屬於任何一題的產品範圍**，必須在 Day14 開工前完成並獨立驗收。
各題的 `tasks.md` 不會、也不應包含「寫圖片解碼器」之類的任務。

## 已驗證的技術決定（實測見契約第 5、6 節）

- **EXIF/XMP 手寫解析與移除，不引外部函式庫**：用合成 JPEG byte stream 實測過 marker
  掃描與 APP1 segment 移除邏輯正確（保留 APP0/JFIF 與影像資料，移除簽名字串完全消失）。
- **透視校正純 JS 反向映射，不用 WebGL**：4032×3024（1219 萬像素）完整反向映射＋雙線性
  取樣，Node V8 單執行緒實測 192ms；4 組對應點的 homography 正確性也已驗證（誤差 <0.001px）。
- **`io-zip.js` 只需擴充既有模組**，`fflate.zipSync` 原生接受 `Uint8Array`，不需要新 vendor 資產。

## 要改什麼

- 新增 `VibeCoding/shared/img-decode.js`：`loadImageFile(file, opts)`，讀檔並依 EXIF
  Orientation 轉正後回傳 canvas（契約第 3 節）。內部呼叫 `img-exif.js` 的 `readExifTags()`
  只取 Orientation 一個欄位。
- 新增 `VibeCoding/shared/img-canvas.js`：`resizeCanvas()`／`canvasToBlob()`／
  `compressToTargetSize()`（品質二分逼近 + 尺寸降階 fallback，契約第 4 節）。
- 新增 `VibeCoding/shared/img-exif.js`：`readExifTags()`（TIFF IFD 解析）／
  `stripMetadataSegments()`（APP1 marker 掃描移除，契約第 5 節）。
- 新增 `VibeCoding/shared/img-perspective.js`：`solveHomography()`／`warpImageData()`
  （契約第 6 節）。
- 擴充既有 `VibeCoding/shared/io-zip.js`：`createZipBlob()` 支援 `{ name, bytes }` 二進位
  entry（契約第 7 節），既有 `{ name, text }` 用法不受影響（向後相容）。
- 擴充既有 `VibeCoding/shared/io-clipboard.js`：新增 `pasteImageFromClipboard()`
  （契約第 9 節），既有 `copyToClipboard()` 不動。
- 新增 `VibeCoding/shared/img-file-size.js`：`checkImageFileSize()`／`checkBatchSize()`
  （契約第 8 節，門檻草案，實作時可依實測微調並回頭更新契約）。

## 影響範圍

**新增檔案**：`shared/img-decode.js`、`shared/img-canvas.js`、`shared/img-exif.js`、
`shared/img-perspective.js`、`shared/img-file-size.js`。

**修改既有檔案**：`shared/io-zip.js`（擴充，向後相容）、`shared/io-clipboard.js`（擴充，
向後相容）。**不影響 Level 1a／1b 任何已上線產品**——兩個擴充都是新增函式／新增選用參數，
既有呼叫端的行為不變（已在契約明文要求向後相容，實作完成後要對 Level 1a/1b 既有產品
的 `bundle_manifest.json` 重新比對 sha256，確認真的沒被波及）。

**不新增外部 vendor 資產**：EXIF、透視校正、ZIP 擴充都不需要新的第三方函式庫。

**沒有 Library 需要記錄授權**（契約決定全部手寫）。
