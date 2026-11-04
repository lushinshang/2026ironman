# 圖片批次最佳化工作台（image-batch-optimizer）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 13`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/image-batch-optimizer/`
- 產品目錄：`VibeCoding/Day14_image-batch-optimizer/`
- 資料層依據：`VibeCoding/shared/IMG_CONTRACT.md`（全文，`img-decode.js`／`img-canvas.js`／
  `img-file-size.js`／`io-zip.js`（擴充）由 `sdd/img-infra/` 前置工程建立，本提案假設其已就緒，
  不重複建立、不重寫壓縮演算法）
- 互動模式：**按鈕觸發**（依 `CONTRACT.md` 第 5 節精神：批次逐張處理成本高、耗時，且處理結果
  要在使用者確認設定後才開始跑，不能每次改一個滑桿就重新處理整批）

## 為什麼做

Email、LINE、上傳系統常限制圖片容量，使用者真正想要的是「壓到 1MB 以下」，不是研究
quality slider。這件事本身 `img-canvas.js` 的 `compressToTargetSize()` 已經解決了（品質二分
逼近 + 尺寸降階 fallback，見 `IMG_CONTRACT.md` 第 4 節）；本題要做的是把這個已驗證的單張
壓縮能力包成一個**批次**工作台——使用者手機相簿裡要處理的通常不是一張，而是一整批。

本題不重新設計壓縮演算法、不重寫 EXIF 轉正、不重寫 ZIP 打包，這些都是 `img-infra` 的責任
（`IMG_CONTRACT.md` 第 1 節模組總覽）。本題的產品價值在於**批次佇列管理與進度呈現**：
一次選一批圖、設定共通條件（目標容量／長邊限制／輸出格式）、看著逐張跑完、確認每張的
原始／輸出容量對照、最後選擇個別下載或整包 ZIP。

## 要改什麼

- 批次上傳／佇列 UI：`<input type=file multiple>` ＋拖放，接 `setupDropZone()`／
  `setupFilePicker()`，`gate` 呼叫 `checkBatchSize()` 檢查整批總位元組數與張數
  （`IMG_CONTRACT.md` 第 8 節門檻，>500MB 拒絕、200–500MB 警示），通過後對每個檔案
  再各自呼叫 `checkImageFileSize()`（單檔 >80MB 拒絕、30–80MB 警示）。
- 設定區：長邊限制輸入（選填）、保持比例（固定行為，`allowUpscale` 固定 `false`，UI 上
  標示「不放大小圖」）、目標容量選擇（1MB／2MB／自訂 bytes，或「不限容量，只限尺寸」）、
  輸出格式下拉（保留原格式／統一轉 JPEG／統一轉 WebP／統一轉 PNG）。
- 逐張處理管線：依序對佇列每個檔案呼叫 `loadImageFile()` 取得轉正後 canvas，再依使用者
  設定呼叫 `resizeCanvas()`（長邊限制）、`compressToTargetSize()`（目標容量模式）或
  `canvasToBlob()`（僅尺寸限制、不設目標容量時），每張處理完立即更新該列的原始／輸出
  容量與 `achieved` 狀態。
- 目標容量模式下若批次含 PNG：依 `IMG_CONTRACT.md` 第 4 節規定，先提示使用者是否轉檔為
  JPEG／WebP（PNG 不支援 quality 參數），使用者確認後才對該檔套用目標容量壓縮，不確認則
  維持 PNG、只套用尺寸限制（若有設定）。
- 大批次處理分批用 `setTimeout(0)` 讓出主執行緒，逐張排程處理，不在單一同步迴圈跑完整批
  （對應 `IMG_CONTRACT.md` 第 10 節「待實測驗證的假設」——大量圖片在主執行緒逐張處理是否
  卡頓 UI，本題要在任務中實測並依結果採用對應寫法）。
- 完成後下載：個別下載（佇列每列各自的下載按鈕）／打包下載 ZIP（呼叫擴充後的
  `createZipBlob()`，傳入 `{ name, bytes }` entry），**二選一呈現**，不強迫使用者一定要
  兩種都用。
- Level 1 共通 UI 基線：複製結果摘要文字（`io-clipboard.js`）、`buildCleanHtmlCopy()`
  清空已上傳佇列、處理結果、`#__shared_toast`，移除 `.nav-back` 與站內連結。

## 影響範圍

**新增檔案**：
`VibeCoding/Day14_image-batch-optimizer/src/index.html`、
`VibeCoding/Day14_image-batch-optimizer/src/bundle.json`、
`VibeCoding/Day14_image-batch-optimizer/index.html`（build 產物）、
`VibeCoding/Day14_image-batch-optimizer/bundle_manifest.json`（build 產物）、
`VibeCoding/Day14_image-batch-optimizer/PRD.md`、
`sdd/image-batch-optimizer/proposal.md`（本檔）、
`sdd/image-batch-optimizer/tasks.md`。

**依賴、不在本題範圍內建立**：`shared/img-decode.js`／`img-canvas.js`／`img-file-size.js`／
`io-zip.js`（擴充）由 `sdd/img-infra/` 前置工程建立，本題直接引用 `IMG_CONTRACT.md` 的簽名，
**不重寫二分逼近演算法、不重寫 EXIF 轉正、不重寫 ZIP 打包本身**。

**不修改**：`VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/IMG_CONTRACT.md`（沿用既有
定案，若實作時發現契約缺口，回頭修正契約而非在本題自行決定，見下方「待裁示」）。

**Library / API**：無外部 library、無 API 呼叫，全程 browser-side；ZIP 走 `shared/io-zip.js`
（內嵌 fflate，由 img-infra／既有共用資產提供）。

## 待裁示

以下是撰寫本提案時發現 `IMG_CONTRACT.md` 未講清楚、需要使用者裁示的缺口，先列出不自行猜著寫：

1. **目標容量與長邊限制同時設定時的整合順序未定義**：契約第 4 節只講
   `compressToTargetSize()` 內部「品質逼近不夠時，長邊打七折重試」，但沒講當使用者
   **同時**設定了明確的長邊限制（例如限制 1200px）與目標容量（例如 1MB）時，兩者該如何
   配合——是先用使用者設定的長邊限制 `resizeCanvas()` 一次，再對結果跑
   `compressToTargetSize()`（此時 `compressToTargetSize()` 內部若仍需要降尺寸重試，
   降的是「已經被限制過一次」的尺寸）？還是使用者設定的長邊限制只是「上限」，
   `compressToTargetSize()` 內部降尺寸不能超過這個上限但也不必先跑一次？本提案暫採前者
   （先套用使用者長邊限制，再跑目標容量逼近），但這是本題的假設，非契約明文規定。

2. **PNG 需要轉檔的「詢問」UI 型態未定義**：契約第 4 節寫「先問使用者是否轉檔成
   JPEG／WebP」，但沒定義這個「問」在批次情境下怎麼問——是每張 PNG 各自跳一次確認，
   還是批次一開始偵測到含 PNG 就整批問一次（套用同一個決定到所有 PNG 檔）？批次情境下
   逐張詢問可能非常擾民，本提案傾向整批問一次，但這屬於本題自訂的 UX 決定，未見契約
   規定，請裁示是否要把這個「批次層級 vs 逐檔層級」的決定寫回契約供後續題目參考。

3. **「輸出格式：保留原格式」與批次內混合格式的下載檔名規則未定義**：例如批次同時有
   `a.jpg`（保留原格式）與 `b.png`（使用者確認轉 JPEG），ZIP 內兩者副檔名不同但都要能
   對應回原檔名，契約未規定副檔名衝突（例如同名不同格式）時的具體命名規則，本提案採
   「輸出副檔名依實際輸出格式決定，同名時加序號」，但這是本題自訂，非契約規定。

✅ **已裁示（2026-08-24，見 `sdd/LEVEL1C_RULINGS.md` 裁示 3）：接受本提案上述三項暫定方案，
追認為定案**（指揮官提議、使用者未表示反對，依默認同意判準接受）：
1. 先套用使用者設定的長邊限制 `resizeCanvas()` 一次，再對結果跑 `compressToTargetSize()`
2. PNG 轉檔詢問：批次層級問一次，不逐檔詢問
3. 同名檔案下載：`baseName + '_opt' + ext`，衝突時加序號後綴

實作現況（`src/index.html`）已經是這樣做，本次裁示是回填紀錄，不需要改動程式碼。
