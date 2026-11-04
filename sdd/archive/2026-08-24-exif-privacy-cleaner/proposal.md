# EXIF 隱私檢查與清除（exif-privacy-cleaner）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 14`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/exif-privacy-cleaner/`
- 產品目錄：`VibeCoding/Day15_exif-privacy-cleaner/`
- 資料層依據：`VibeCoding/shared/IMG_CONTRACT.md`（全文，特別是第 5 節 `img-exif.js`）由
  `sdd/img-infra/` 前置工程建立，本提案假設其已就緒，不重複建立、不重寫 EXIF 解析或
  移除邏輯
- 互動模式：**按鈕觸發**（依 `CONTRACT.md` 第 5 節精神：EXIF 讀取與清除牽涉逐張檔案的
  二進位掃描，且本題有「批次處理」與「清除前後差異對照」這種需要穩定畫面的展示，比照
  Day03/Day04/Day07/Day08 走按鈕觸發，不做即時 debounce）

## 為什麼做

照片內建的 EXIF/XMP Metadata（拍攝時間、裝置型號、GPS 座標）在社群分享、二手交易、
求職作品集等情境下常被忽略，一旦外流可反推居住地、生活作息或使用裝置。本題把「檢查」
（風險提示）與「清除」（重新輸出）分開處理：先讓使用者看懂自己的照片藏了什麼，再決定
要不要清除，不是上傳就自動靜默清掉。

本題直接依賴 `img-infra` 提供的 `readExifTags()`（讀取）與 `stripMetadataSegments()`
（清除），這兩個函式的解析與移除邏輯已在契約第 5 節定案並實測，本題**只負責**：
風險判定規則、勾選/確認的互動流程、批次處理的畫面呈現、清除前後差異的對照呈現。

## 要改什麼

### 風險判定規則（本題自訂的業務邏輯，契約未定義）

`readExifTags()` 回傳 `{ orientation, dateTimeOriginal, make, model, gpsLatitude,
gpsLongitude, hasGPS, hasXMP }`。本題依此定義三級風險：

| 風險等級 | 判定條件 | 理由 |
|---|---|---|
| **高風險** | `hasGPS === true` | 精確地理座標可直接反推住家、公司等常駐地點，是最具體的隱私外洩 |
| **中風險** | `hasGPS === false` 且（`make`／`model` 非 `null` 或 `dateTimeOriginal` 非 `null`） | 裝置型號可用於社交工程或裝置指紋比對；拍攝時間單張照片風險較低，但多張比對可拼出行程軌跡，故列中風險而非低風險 |
| **低風險** | 僅 `hasXMP === true`，其餘欄位皆為 `null`／`false` | XMP 內容多為編輯軟體資訊或版權標記，`readExifTags()` 不解析 XMP 內部欄位（見待裁示），無法判斷是否含更敏感內容，保守列低風險並提示「含 XMP，內容未逐一解析」 |
| **無風險** | 全部欄位皆為 `null`／`false` | 對應契約「沒有 EXIF 的圖片不應報錯」，畫面顯示「未偵測到 Metadata」，不出現風險徽章 |

每張圖片的風險等級是上述條件由高到低比對，命中第一個成立的等級即停止（高風險與中風險
條件不互斥時，一律顯示較高等級，中風險細項仍列出供使用者檢視）。

### 使用者流程

1. 上傳（拖放或選取，可多選）→ 逐張過 `checkImageFileSize()`／`checkBatchSize()` 閘門
   （契約第 8 節），batch 總量超限時整批拒絕並說明。
2. 逐張呼叫 `loadImageFile()`（僅用於稍後預覽轉正後的縮圖，不影響清除邏輯）與
   `readExifTags()`，列表呈現：縮圖、檔名、風險徽章、拍攝日期／裝置／GPS 摘要。
3. 使用者可展開單張查看完整 Metadata 明細（含 GPS 十進位度數與地圖連結，若
   `hasGPS`）。
4. 「清除項目」勾選區：依契約限制（見待裁示），勾選是**分類展示與確認用途**，
   不是欄位級清除的執行依據——實際清除永遠是整段 `stripMetadataSegments()`。
5. 批次層級提供「全部清除」，也可逐張用開關排除（此張不處理，保留原始檔案）。
6. 點擊「開始清除」才真正呼叫 `stripMetadataSegments()`，之前的勾選與展開只是預覽。
7. 清除完成後，逐張顯示「清除前 vs 清除後」對照表（欄位：拍攝日期、裝置、GPS，清除前
   顯示原值、清除後一律顯示「已清除」），並重新呼叫一次 `readExifTags()` 讀清除後的
   bytes，證明對應欄位確實消失（不是只憑呼叫過函式就宣稱清除成功）。
8. 下載：單張下載或批次 ZIP（`createZipBlob()` 帶 `bytes` entry，契約第 7 節）。

### Level 1 共通 UI 基線（`CONTRACT.md` 第 6 節，必要任務非額外功能）

- 複製結果到剪貼簿：`shared/io-clipboard.js`（複製風險摘要文字）。
- 下載結果檔案：`shared/io-download.js`／`shared/io-zip.js`（單張／批次 ZIP）。
- 下載本工具離線版：自行實作 `buildCleanHtmlCopy()`，清空已上傳圖片、縮圖、Metadata
  讀取結果、清除前後對照表、`#__shared_toast` 元素，移除 `.nav-back` 與站內連結。

## 影響範圍

### 新增檔案
- `VibeCoding/Day15_exif-privacy-cleaner/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day15_exif-privacy-cleaner/src/bundle.json`
- `VibeCoding/Day15_exif-privacy-cleaner/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day15_exif-privacy-cleaner/bundle_manifest.json`（build 產物）
- `VibeCoding/Day15_exif-privacy-cleaner/PRD.md`（複製 PRD 14 段落內容）
- `sdd/exif-privacy-cleaner/proposal.md`（本檔）
- `sdd/exif-privacy-cleaner/tasks.md`

### 依賴、不在本題範圍內建立
- `shared/img-decode.js`／`img-exif.js`／`img-file-size.js`／`io-zip.js`（擴充）：由
  `sdd/img-infra/` 前置工程建立，本題直接引用其契約簽名，不重寫解析或移除邏輯。

### 不修改
- `VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/IMG_CONTRACT.md`（沿用既有定案）
- `VibeCoding/README.md`、`VibeCoding/index.html`（進度表更新留待收尾階段）

### Library / API
無外部 library、無 API 呼叫，全程 browser-side。

## 待裁示

以下規則衝突與規格未定義之處，交由指揮官裁示，本提案不自行定案：

### 1.（核心衝突）「使用者勾選清除項目」vs 契約的整段移除

PRD 14 MVP 明文「使用者勾選清除項目」，字面上暗示欄位級選擇（例如「只清除 GPS，保留
拍攝日期」）。但 `IMG_CONTRACT.md` 第 5 節 `stripMetadataSegments()` 的移除策略是
**整段拿掉 APP1 segment，不是逐一 tag 編輯**，理由是 EXIF 的 IFD 結構要改單一 tag 得
重算所有 offset，複雜且容易做錯；契約原文也寫明「PRD 14／15 的需求是『清除』不是
『編輯部分欄位』，整段 APP1 移除語意上完全等價」。

也就是說：**技術上做不到「保留拍攝日期、只清除 GPS」這種選擇性清除**。

本提案的建議做法（未定案，供裁示參考）：勾選項目改為**分類展示與確認清單**——使用者
勾選「我知道這張圖含 GPS／裝置資訊／XMP，要清除」，按下「開始清除」後，實際動作永遠是
整段移除該圖的所有 Metadata（不是只移除勾選的類別）。若使用者只想留下某類 Metadata，
唯一選項是「此張不處理」（整張跳過），而非欄位級保留。

需要裁示：
- (a) 是否接受上述「勾選=確認用途，清除=整段」的簡化設計？
- (b) 若不接受，是否要回頭修改 `IMG_CONTRACT.md` 第 5 節，要求 `img-infra` 額外提供
  欄位級移除（例如只清 GPS IFD 但保留其餘 EXIF）？這會大幅增加 `img-infra` 的複雜度
  （需要重算 IFD offset），且會影響已定案並實測過的契約，不是本題能單方面決定的範圍。

✅ **已裁示（2026-08-24，見 `sdd/LEVEL1C_RULINGS.md` 裁示 1）：接受 (a)**。
勾選=分類展示與確認用途，清除永遠整段移除，不做欄位級選擇性清除。

### 2. GPS 座標的呈現格式

`readExifTags()` 回傳 `gpsLatitude`／`gpsLongitude` 是十進位度數，但契約未定義正負號
代表方向的規則（例如南緯／西經是否回傳負值，或是否需要額外的 N/S/E/W 標記欄位）。
本題的風險提示與地圖連結呈現依賴這個格式，待 `img-infra` 該欄位實測完成（契約第 10 節
列為「待實測驗證的假設」）後才能定案顯示格式，本提案先假設回傳值為帶正負號的十進位度數
（北緯／東經為正）。

### 3. XMP 內容的可見度

`readExifTags()` 只回傳 `hasXMP: boolean`，不解析 XMP 內部欄位（可能含編輯軟體、作者、
版權、甚至地理位置的重複記錄）。PRD 14「顯示…資訊」與「敏感 Metadata 風險提示」的範圍
是否要求本題進一步解析 XMP 內容（而不只是「有/沒有」），還是維持契約現狀只顯示布林值？
本提案傾向維持現狀（XMP 解析不在契約範圍，追加等於本題自行擴充 `img-infra` 職責），但
待裁示確認。

### 4. 批次中個別檔案清除失敗的處理

批次處理多張圖片時，若某張圖片的 `stripMetadataSegments()` 執行失敗（例如非標準 JPEG
結構），是否中止整批、或該張標記失敗但其餘照常完成？PRD 未明文規範批次的錯誤處理策略，
本提案傾向「單張失敗不中斷整批」，待裁示。

## 契約不夠清楚之處（附帶記錄，非本題待裁示範圍，供 `img-infra` 或後續契約修訂參考）

- 第 5 節只定義 `readExifTags()` 回傳欄位型別，未定義 GPS 正負號語意（見待裁示 2）。
- 第 5 節 `hasXMP` 只是布林值，未說明是否未來會擴充成結構化欄位；Day16
  `screenshot-sanitizer` 若也需要更細的 XMP 資訊，屆時可能要回頭修訂契約。
- 契約未定義 `readExifTags()` 對「檔案不是合法 JPEG（例如偽裝副檔名）」的行為是拋錯誤
  還是回傳全 `null`——與「沒有 EXIF」是否算同一種情況，本題在待裁示 4 的批次錯誤處理
  設計上依賴這個行為，需要 `img-infra` 實作時一併明確。
