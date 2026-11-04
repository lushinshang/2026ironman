# Tasks：EXIF 隱私檢查與清除（exif-privacy-cleaner）

> 前置條件：`sdd/img-infra/` 已完成並驗收（`img-decode.js`／`img-exif.js`／
> `img-file-size.js`／`io-zip.js` 擴充就緒）。本 `tasks.md` **不包含**寫 EXIF 解析或
> 移除邏輯的任務，直接呼叫 `img-infra` 提供的函式，見 `VibeCoding/shared/IMG_CONTRACT.md`
> 第 5 節。

- [x] 1. 建立 `Day15_exif-privacy-cleaner/src/index.html` 版面骨架：上傳區（拖放＋檔案
  選取，可多選，接 `checkImageFileSize()`／`checkBatchSize()` 閘門）、批次列表區
  （逐張縮圖＋檔名＋風險徽章 placeholder）、單張明細展開區 placeholder、清除前後對照表
  placeholder、複製結果／下載結果／下載本工具離線版三個按鈕；套用 `shared/base.css`。
  **驗收**：情境：開啟頁面，畫面可見上傳區、批次列表區、三個共通按鈕；`view-source`
  確認上傳有接批次大小閘門的呼叫（非省略）；情境：一次選取 3 個檔案，列表區出現 3 筆
  項目（尚未讀取內容也要能先顯示檔名，避免使用者以為只選到 1 張）。

- [x] 2. 串接批次讀取：逐張呼叫 `checkImageFileSize()`，超過閘門的單張標記「已略過」
  並顯示原因、不中止其餘檔案的讀取；批次總量超過 `checkBatchSize()` 上限時整批拒絕並
  顯示上限說明，不讀取任何一張。通過閘門的檔案呼叫 `loadImageFile()` 取得轉正後縮圖
  顯示在列表。
  **驗收**：情境：批次中有一張 90MB（超過單檔 80MB 閘門）、其餘 5 張正常，畫面上該張
  標記「已略過」並附原因，其餘 5 張正常顯示縮圖；情境：批次總量超過 500MB，畫面顯示
  拒絕訊息且列表區沒有任何一張圖片被讀取（`loadImageFile()` 完全未被呼叫）。

- [x] 3. 逐張呼叫 `readExifTags()`，依 proposal.md 定義的規則計算風險等級（高：`hasGPS`；
  中：無 GPS 但有 `make`／`model`／`dateTimeOriginal`；低：僅 `hasXMP`；無：全部
  `null`／`false`），在列表項目顯示風險徽章；點擊單張可展開完整明細（拍攝日期、裝置、
  GPS 十進位度數、是否含 XMP）。
  **驗收**：情境：上傳一張含 GPS 的真實照片，該張徽章顯示「高風險」，展開明細看到
  GPS 座標數值；情境：上傳一張只有 `Make`／`Model`（無 GPS）的照片，徽章顯示「中風險」；
  情境：上傳一張完全沒有 EXIF 的 PNG，徽章區顯示「未偵測到 Metadata」（無風險），
  且畫面不報錯、其餘流程可繼續。

- [x] 4. 實作「清除項目」勾選區（依 proposal.md「待裁示 1」的建議設計：勾選為分類確認
  用途，例如「GPS」「裝置資訊」「拍攝日期」「XMP」核取方塊）與批次層級「全部清除」／
  逐張「此張不處理」開關；勾選狀態變動時不觸發任何清除動作，只更新畫面上「即將清除：
  N 張」的統計。
  **驗收**：情境：批次 5 張圖，使用者對其中 2 張切換「此張不處理」後點擊統計區，畫面
  顯示「即將清除：3 張」；情境：切換任一勾選框或開關後，尚未點擊「開始清除」按鈕前，
  所有圖片的 Metadata 讀取結果維持原樣未被修改（純預覽，不提前執行清除）。

- [x] 5. 實作「開始清除」：對每張標記為「要處理」的圖片呼叫 `stripMetadataSegments()`
  取得新 bytes，「此張不處理」的圖片略過、保留原始 bytes 不變；單張清除失敗時標記該張
  「清除失敗」並顯示原因，不中斷其餘圖片的清除（依待裁示 4 的建議行為）。
  **驗收**：情境：批次 3 張都選「要處理」，點擊「開始清除」後 3 張都完成，畫面顯示
  完成狀態；情境：批次中 1 張標記「此張不處理」，清除完成後該張下載出來的檔案與原始
  上傳檔案位元組數相同（bytes 未被改動）。

- [x] 6. 清除完成後，對每張「要處理」的圖片重新呼叫一次 `readExifTags()` 讀取清除後的
  bytes，建立「清除前 vs 清除後」對照表（欄位：拍攝日期、裝置、GPS；清除前顯示原值，
  清除後顯示「已清除」）；「此張不處理」的圖片不出現在對照表或標記「未變更」。
  **驗收**：情境：一張清除前 GPS／裝置／日期皆有值的圖片，清除後對照表同一列三欄全部
  顯示「已清除」，且對該圖清除後 bytes 重新呼叫 `readExifTags()` 得到的 `hasGPS` 為
  `false`（不是只顯示文字「已清除」但實際還在）；情境：一張清除前就沒有 EXIF 的圖片
  被誤勾選「要處理」，對照表顯示「原本就無 Metadata」而非「已清除」（避免誤導使用者
  以為做了什麼）。

- [x] 7. 實作下載：單張下載（`shared/io-download.js`，檔名 `{原檔名}_cleaned.{副檔名}`，
  不覆寫原檔名）與批次 ZIP 下載（`shared/io-zip.js` 的 `createZipBlob()` 帶 `bytes`
  entry，「此張不處理」的圖片以原始 bytes 一併打包，讓使用者拿到完整批次）。
  **驗收**：情境：批次 3 張（2 張清除、1 張不處理）點擊「批次下載 ZIP」，解壓後得到
  3 個檔案，清除過的 2 個檔名含 `_cleaned` 後綴且與原檔名不同，不處理的 1 個檔名與
  原始檔名相同、內容位元組數相同；情境：單張下載一張已清除的圖片，用其他 EXIF 檢視
  工具或系統「檔案內容」對照，確認拍攝日期／GPS 資訊已不存在。

- [x] 8. 實作複製結果（`shared/io-clipboard.js` 複製風險摘要文字，例如「共 5 張，2 張
  高風險含 GPS，已清除 3 張」）與 `buildCleanHtmlCopy()` 離線版：清空已上傳圖片、縮圖、
  Metadata 讀取結果、清除前後對照表、`#__shared_toast` 元素，移除 `.nav-back` 與站內
  連結。
  **驗收**：情境：完整跑一輪（上傳→讀取→勾選→清除→對照表，含觸發一次 toast）後點擊
  「下載本工具離線版」，用 Playwright 載入產物斷言 `document.getElementById(
  '__shared_toast') === null`、`document.querySelectorAll('.nav-back').length === 0`、
  `pageerror` 與 console error 皆為空；情境：測試圖片使用哨兵檔名（例如
  `ZZEXIFTEST.jpg`），原始碼精確搜尋 `ZZEXIFTEST` 在離線版產物中為 0 筆。

## 附帶的建置與整合驗收（非獨立任務，收尾時與 T8 一併完成）

建立 `src/bundle.json`，跑 `scripts/bundle.py` 產出 `index.html`／`bundle_manifest.json`；
準備一組含「有 GPS」「只有裝置資訊」「只有 XMP」「完全無 EXIF」四種真實測試照片的批次，
以 `file://` 與本機伺服器各測一次完整流程（上傳→風險提示→勾選→清除→對照表→下載）。

驗收：`scripts/bundle.py` 執行後產出 `index.html`，`file://` 開啟與本機伺服器開啟兩種
方式，上傳同一批測試照片後風險判定與清除結果一致。
