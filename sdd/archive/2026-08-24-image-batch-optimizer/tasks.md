# Tasks：圖片批次最佳化工作台（image-batch-optimizer）

> 前置條件：`sdd/img-infra/` 已完成並驗收（`img-decode.js`／`img-canvas.js`／
> `img-file-size.js`／`io-zip.js` 擴充皆就緒）。本檔**不包含**寫壓縮演算法、EXIF 轉正、
> ZIP 打包本身的任務，只呼叫既有函式，見 `VibeCoding/shared/IMG_CONTRACT.md`。

- [x] T1 建立 `Day14_image-batch-optimizer/src/index.html` 版面骨架：批次上傳區
  （`<input type=file multiple>` ＋拖放，接 `setupDropZone()`／`setupFilePicker()`
  並傳 `opts.multiple: true`——見 `IMG_CONTRACT.md` 第 9a 節，這是本題與 Day18 共同
  促成 `io-dropzone.js` 擴充的原因，`onData(result, fileName, meta)` 用 `meta.index`／
  `meta.total` 追蹤批次進度，`gate` 呼叫 `checkBatchSize()` 檢查整批總位元組數與張數）、設定區（長邊限制輸入、
  目標容量選擇 1MB／2MB／自訂／不限、輸出格式下拉：保留原格式／JPEG／WebP／PNG）、
  佇列進度區（逐列：檔名、狀態、原始容量、輸出容量）、下載方式選擇（個別／ZIP）、
  共通三按鈕（複製摘要／下載結果／下載本工具離線版）；套用 `shared/base.css`
  - 驗收：情境：一次選取 5 張圖片（拖放與檔案選取 input 各測一次），畫面佇列列出 5 個
    項目，檔名與原始容量正確顯示；情境：`view-source` 確認 `gate` 呼叫的是
    `checkBatchSize()`，不是自行重算的位元組加總邏輯

- [x] T2 串接批次大小閘門：`checkBatchSize()` 在讀檔前對整批（總位元組數、張數）判定，
    `level==='reject'` 時整批被擋下、不進入佇列並顯示明確訊息；`level==='warn'` 時提示
    後照常繼續。通過整批閘門後，逐檔另呼叫 `checkImageFileSize()`，單檔 `reject` 時該檔
    不進入佇列（其餘檔案不受影響），單檔 `warn` 時該檔進佇列並標示提示
  - 驗收：情境：整批總量超過 500MB（可用小型測試檔搭配直接單元呼叫 `checkBatchSize()`
    驗證邊界值），上傳被整批擋下，不出現任何佇列項目；情境：一批 5 張圖片中有 1 張
    超過 80MB，其餘 4 張正常，該 1 張不進入佇列並標示原因，其餘 4 張正常出現在佇列中

- [x] T3 實作逐張處理管線：依序對佇列每個檔案呼叫 `loadImageFile()` 取得轉正後 canvas，
    有設定長邊限制時呼叫 `resizeCanvas({ maxLongEdge, allowUpscale: false })`，有設定
    目標容量時再對結果呼叫 `compressToTargetSize()`，兩者都沒設定時直接呼叫
    `canvasToBlob()` 依選定格式輸出；每張處理完成即更新該列的輸出容量與 `achieved` 狀態
  - 驗收：情境：上傳一張長邊 4000px 的圖片並設定長邊限制 1200px，處理完成後該列輸出
    容量小於原始容量，下載後的圖片實際長邊 <=1200px；情境：一張長邊只有 800px 的圖，
    設定長邊限制 1200px，輸出圖片長邊仍是 800px（不放大，對應 PRD 驗收條件「預設不
    拉伸圖片比例」）；情境：設定目標容量 1MB 對一張 3MB 的照片，最終輸出 <=1MB 且該列
    顯示 `achieved: true`（對應 PRD 驗收條件「目標 1MB 時盡力產出 <=1MB」）

- [x] T4 實作目標容量模式下 PNG 的轉檔詢問：批次含 PNG 且使用者選了目標容量模式時，
    處理前先提示「PNG 需先轉檔為 JPEG／WebP 才能設定目標容量」，使用者確認後才對批次內
    全部 PNG 檔套用轉檔＋`compressToTargetSize()`；不確認則該批次所有 PNG 維持原格式，
    只套用長邊限制（若有設定），不套用目標容量壓縮
  - 驗收：情境：批次含一張 PNG，設定目標容量 2MB，畫面出現轉檔提示；確認轉 JPEG 後，
    該 PNG 項目最終輸出格式為 `.jpg` 且容量符合目標；情境：不確認轉檔，該項目維持
    `.png` 且輸出容量不受目標容量限制（僅受長邊限制影響，若有設定的話）

- [x] T5 大批次不卡頓 UI：佇列處理用 `setTimeout(0)` 逐張排程，處理完一張才排程下一張，
    不在單一同步迴圈裡處理整批
  - 驗收：情境：一次上傳 20 張以上圖片，處理過程中頁面仍可捲動、其他按鈕仍可點擊
    （手動操作或 Playwright 確認主執行緒未長時間 block）；情境：若實測發現仍有明顯卡頓
    （例如單張處理超過 1 秒累積造成停頓），在回報中誠實記錄並評估是否需要進一步分批，
    對應 `IMG_CONTRACT.md` 第 10 節「待實測驗證的假設」

- [x] T6 實作個別下載：批次處理完成（或單張處理完成）後，佇列中每一列提供獨立的
    「下載」按鈕，只下載該張輸出圖片，檔名依輸出格式調整副檔名，尚未處理完成的項目
    「下載」按鈕維持 disabled
  - 驗收：情境：批次處理完成後，點擊佇列中第 2 張的「下載」按鈕，只下載該張圖片，
    檔名與副檔名對應輸出格式（例如原 PNG 轉 JPEG 輸出為 `xxx.jpg`）；情境：尚未處理
    完成的項目，「下載」按鈕不可點擊

- [x] T7 實作 ZIP 打包下載：批次全部完成後，使用者可點擊「打包下載 ZIP」，把每個已完成
    項目的輸出 Blob 轉為 `Uint8Array` 交給擴充後的 `createZipBlob()`，同名檔案（含轉檔
    後副檔名相同）自動加序號避免衝突
  - 驗收：情境：批次 5 張圖片全部完成後點擊「打包下載 ZIP」，下載的 zip 解壓後含 5 個
    檔案，個別檔案能被圖片檢視器正常開啟（對應契約第 7 節二進位 entry 未被破壞）；
    情境：批次中兩張輸出檔名相同（例如都轉成 `photo.jpg`），ZIP 內檔名自動加序號
    不衝突

- [x] T8 實作批次總結、保持原檔對應關係、共通按鈕與離線版：佇列每列顯示原始／輸出
    容量並列（例如「3.2MB → 0.9MB」），全部完成後顯示批次總結（總張數／成功張數／
    達成目標容量張數／無法達成張數，`achieved:false` 的項目有明確視覺標示）；下載結果
    （個別／ZIP）與 `#__shared_toast`、working 佇列狀態經非同步處理仍與原始上傳順序
    正確對應；接 `io-clipboard.js` 複製摘要文字；實作 `buildCleanHtmlCopy()` 清空已上傳
    佇列、處理結果、`#__shared_toast`，移除 `.nav-back` 與站內連結
  - 驗收：情境：其中 1 張因 3 輪尺寸調整仍無法達成目標容量，該列視覺標示與成功項目
    不同，批次總結顯示「無法達成：1 張」（對應 PRD 驗收條件「無法達成時明確提示」）；
    情境：上傳 3 張檔名分別為 A.jpg／B.png／C.webp 的圖片，即使處理過程中 B 比 A 晚
    完成（非同步順序不定），最終佇列顯示順序仍是 A/B/C，下載的每個檔案內容對應正確
    原圖（對應 PRD 驗收條件「批次輸出保持原檔對應關係」）；情境（離線版，哨兵值）：
    用檔名含哨兵 `ZZIMGBATCH` 的測試圖片跑完整流程（上傳→設定→處理→下載）後點擊
    「下載本工具離線版」，原始碼精確搜尋 `ZZIMGBATCH` 為 0 筆；DOM 層斷言（Playwright
    載入離線版產物）`document.getElementById('__shared_toast') === null`、
    `document.querySelectorAll('.nav-back').length === 0`、`pageerror` 與 console error
    皆為空
