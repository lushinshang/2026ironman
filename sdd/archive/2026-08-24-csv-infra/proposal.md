# 前置工程：CSV 資料層（Level 1b，Day08–12 共用）

## 為什麼做

Level 1b 五題（`csv-doctor` / `csv-period-diff` / `csv-batch-splitter` / `csv-pivot-dashboard` /
`csv-one-page-report`）全部吃同一份 CSV 資料。若各題自己寫 parser，五題對「空值是什麼」
「欄數不一致怎麼辦」「重複欄名要不要改名」的判定會不一致，而這種不一致只有跨題比對時才會現形——
正是 Level 1a `shared-infra` 前置工程要解決的同一類問題（見 `sdd/archive/2026-08-23-shared-infra/`），
現在套用到資料層。

依 `VibeCoding/shared/CSV_CONTRACT.md`（下稱「契約」）第 6.1 節規定：
`csv-decode.js` / `csv-parse.js` / `csv-write.js` / `csv-types.js` / `io-zip.js` 五個模組
**不屬於任何一題的產品範圍**，必須在 Day08 開工前完成並獨立驗收。各題的 `tasks.md`
不會、也不應包含「建立 CSV parser」之類的任務。

`ui-chart-svg.js`（契約 6.2 節）**明確排除**：由 Day12（pivot 下篇）建立，不進本前置工程。
列印版型（Day12）也不在本前置工程範圍。

## 已裁示事項（依 `sdd/LEVEL1B_RULINGS.md`）

- 測試環境：**Node + `vm` 模組**手動組執行環境（候選 A），零外部依賴
- vendor 檔案：**擴充 `VibeCoding/scripts/bundle.py`**，讓 `ASSET` 的 `path` 可指向
  `VibeCoding/shared/vendor/` 這個共用目錄（不再限制只能在題目自己的 `src_dir` 內），
  containment 檢查改為「解析後路徑必須落在 `shared/vendor/` 內」，避免任意外部檔案被內嵌，
  各題 `bundle.json` 以資源名引用同一份實體檔案，不各自複製
- 拖放讀檔：**擴充既有 `VibeCoding/shared/io-dropzone.js`**，加 `{ mode: 'bytes' }` 選用參數、
  `opts.gate(file)` 選用回呼（**必須在讀檔之前呼叫**，`!ok` 時完全不讀檔）、
  以及新增 `setupFilePicker(inputEl, onData, opts)`（與 `setupDropZone` 共用同一個內部
  `handleFile`），由本工程認領實作與驗收（見下方「要改什麼」；契約第 4 節）
- `checkCsvFileSize()` 回傳值採**契約版** `{ ok, level, message }`（契約第 4 節），非本提案早前
  誤稱「契約沒定義此介面」而自訂的 `{ level, message }`

## 要改什麼

- 建立 `VibeCoding/shared/csv-decode.js`：`decodeCsvBytes(arrayBuffer)`
  三段式編碼偵測（BOM → UTF-8 嚴格解碼 → Big5 fallback），回傳含 `confidence` 欄位
  （契約 7.2 節）。另外新增 `checkCsvFileSize(byteLength)`（契約第 4 節、第 5 節），
  回傳 `{ ok: boolean, level: 'ok'|'warn'|'reject', message: string }`，門檻 5MB／20MB。
- 建立 `VibeCoding/shared/csv-parse.js`：`parseCsv(text, opts)`，內部用 Papa Parse 5.6.0，
  但**不得直接回傳 Papa 的原始輸出**，必須處理契約 7.1 節三個陷阱：
  (a) 行尾正規化（CRLF/CR → LF，原始型態記進 `meta.lineEnding`）
  (b) 丟棄「檔案結尾多出的空列」（僅限最後一列、單一空格）
  (c) 用 `step` callback 的 `res.meta.cursor` 自算行號，寫入每筆 `Row.line`
  分隔符偵測依契約 4.1 節（`,`／`\t`／`;`，取前 10 個非空行比穩定度）。
- 建立 `VibeCoding/shared/csv-write.js`：`toCsv(table, opts)`，`opts.bom` 預設 `true`，
  引號規則依 RFC 4180（契約 4.2／4.3 節）。
- 建立 `VibeCoding/shared/csv-types.js`：`inferColumnTypes(table)`，
  回傳 `{ kind, sampleSize, matched, mismatchLines }[]`，只回報不改寫。**判準逐字依契約
  4.0b 節**，不得自訂門檻：
  - 樣本 = 該欄所有「非空字串」的格（空字串不計入分母）
  - 樣本數 < 3 → `kind = 'text'`
  - 可解析為數字的比例 ≥ 0.9 → `kind = 'number'`
  - 否則符合日期白名單的比例 ≥ 0.9 → `kind = 'date'`
  - 否則 → `kind = 'text'`
  - `matched` = 符合該 `kind` 的格數；`sampleSize` = 樣本數；
    `mismatchLines` = 樣本中不符合該 `kind` 的格所在的 `line`
  - `toNumber()`：先 trim，接受選用正負號、十進位小數、科學記號；**不接受**千分位逗號、
    貨幣符號、百分比、會計式括號負數 `(123)`、全形數字，不接受一律視為非數字
  - `isDateLike()`：一律用 regex 白名單比對，**禁止 `new Date()`**；白名單六式為
    `YYYY-MM-DD`、`YYYY/MM/DD`、`YYYY-M-D`／`YYYY/M/D`（不補零）、`YYYYMMDD`（8 碼數字且月日合法）、
    `YYYY-MM`／`YYYY/MM`、`YYYY` 單獨四碼；不支援民國年
- 建立 `VibeCoding/shared/io-zip.js`：包 fflate，把 `[{name, text}]` 打包成 Blob，
  中文檔名需正確設定 EFS bit（契約 7.3 節，Day10 需要）。
- 下載 Papa Parse 5.6.0 與 fflate 的 UMD 檔到專案內固定位置（見「vendor 檔案與 bundle.json
  引用慣例」一節），並記錄 SHA256。
- **擴充 `VibeCoding/scripts/bundle.py`**：`resolve_asset()` 的路徑沙盒檢查（現行
  `scripts/bundle.py:98-107` 只允許 `path` 落在該題 `src_dir` 內）改為額外允許落在
  `VibeCoding/shared/vendor/` 內，並對該目錄做 containment 檢查（解析後路徑必須真的在
  `shared/vendor/` 底下，防止 `../../../secret.txt` 之類的路徑穿越）。
- **擴充 `VibeCoding/shared/io-dropzone.js`**，共三件事（契約第 4 節逐字依循）：
  (a) `setupDropZone(dropEl, onData, opts)` 新增選用 `opts.mode === 'bytes'` 分支，改用
  `reader.readAsArrayBuffer(file)`，`onData` 收到 `ArrayBuffer`；`opts.mode` 省略時維持原本
  `readAsText` 行為，現有 7 個呼叫點（Day01–07）不傳 `mode`，行為不變。
  (b) 新增選用 `opts.gate(file)` 回呼，**在 `handleFile` 內、建立 `FileReader` 之前**呼叫；
  回傳 `{ok, level, message}`，`!ok` 時呼叫 `onError(message)` 並直接 return，不建立
  `FileReader`、不讀檔；`gate` 省略時略過此步驟。`io-dropzone.js` 本身不 import／依賴
  `csv-decode.js`——`gate` 純粹是呼叫端傳入的函式，CSV 五題呼叫時才會把
  `checkCsvFileSize` 包成 `gate` 傳進來。
  (c) 新增 `setupFilePicker(inputEl, onData, opts)`：監聽 `inputEl` 的 `change` 事件，
  取 `inputEl.files[0]`，與 `setupDropZone` 共用同一個內部 `handleFile(file)`，吃同一組
  `opts`（含 `mode`、`gate`、`accept`、`onError`）。**檔案選取與拖放兩條路徑因此走同一份
  閘門與編碼判斷邏輯**，不會發生「閘門只擋拖放、選檔案繞過去」的情形。
- 建立一份可獨立執行（非瀏覽器手測）的測試，涵蓋契約 3.1 節四條規則與 7.1 節三個陷阱、
  7.2 節三段編碼與 `confidence`、第 5 節大檔案門檻，用 Node + `vm` 模組載入。

## 影響範圍

- 新增檔案：
  - `VibeCoding/shared/csv-decode.js`
  - `VibeCoding/shared/csv-parse.js`
  - `VibeCoding/shared/csv-write.js`
  - `VibeCoding/shared/csv-types.js`
  - `VibeCoding/shared/io-zip.js`
  - `VibeCoding/shared/vendor/papaparse-5.6.0.min.js`（或 unminified，視下載到的實際檔名而定）
  - `VibeCoding/shared/vendor/fflate.umd.js`
  - 測試檔案：`sdd/csv-infra/test/`
- 修改檔案：
  - `VibeCoding/scripts/bundle.py`（擴充 `resolve_asset()` 允許 `shared/vendor/` 路徑）
  - `VibeCoding/shared/io-dropzone.js`（新增 `mode: 'bytes'` 選用參數）
  - `VibeCoding/shared/CSV_CONTRACT.md` 為既有規格來源，本工程只依其實作，不修改契約本身。
- Library／API：Papa Parse 5.6.0（MIT）、fflate（MIT），皆內嵌，無 CDN、無執行期網路呼叫。
- 明確排除：任何一題的產品程式碼、`ui-chart-svg.js`、列印版型 CSS、`VibeCoding/DayNN_*/` 目錄下的任何檔案。

## vendor 檔案與 bundle.json 引用慣例

契約第 7 節選型已定案：Papa Parse 5.6.0（MIT）、fflate（MIT）。這兩個是**外部函式庫**，
不是本專案寫的共用模組，所以不能用 `bundle.py` 的 `SHARED` 型別
（`resolve_shared()` 固定寫死 `version="internal"`、`license="project-internal"`，
見 `VibeCoding/scripts/bundle.py:28-29`，不適合掛真實的第三方版本／授權字串）。

必須用 `ASSET` 型別，`escape_mode: "raw_js"`（原始碼是程式而非資料），並在各題自己的
`src/bundle.json` 宣告，資源鍵名與欄位結構比照 `VibeCoding/Day04_zh-tw-localizer/src/bundle.json`
已有的寫法（該範例的 `escape_mode` 是 `json_string`，因為它包的是 JSON 資料，Papa Parse／fflate
是程式碼要用 `raw_js`）：

```json
{
  "assets": {
    "papaparse": {
      "path": "../../shared/vendor/papaparse-5.6.0.min.js",
      "version": "5.6.0",
      "license": "MIT",
      "escape_mode": "raw_js"
    },
    "fflate": {
      "path": "../../shared/vendor/fflate.umd.js",
      "version": "<下載到的實際版本號>",
      "license": "MIT",
      "escape_mode": "raw_js"
    }
  }
}
```

`bundle.py` 的授權會自動渲染到頁面的 `.bundled-licenses` 區塊（`CONTRACT.md` 第 4 節），
所以每一題只要在 `bundle.json` 正確宣告，Papa Parse／fflate 的授權標示會自動出現，不用各題自己動手寫。

`path` 能指向 `shared/vendor/` 是因為本工程**依裁示擴充了 `bundle.py`**（見「要改什麼」節）：
`resolve_asset()` 原本的沙盒檢查（`scripts/bundle.py:98-107`，`asset_path.relative_to(src_dir)`）
只允許 `src_dir` 內的路徑；擴充後額外允許解析後路徑落在 `VibeCoding/shared/vendor/` 內，
兩種位置以外一律拒絕，containment 檢查維持、只是多開一個白名單目錄，不是移除檢查。

## 測試涵蓋範圍對照表（避免漏測）

| 契約條款 | 內容 | 對應模組 |
|---|---|---|
| 3.1 規則 1 | 每格 string，不轉型 | csv-parse.js |
| 3.1 規則 2 | 欄數不一致列不丟棄不補齊，記進 `meta.raggedRows` | csv-parse.js |
| 3.1 規則 3 | 重複欄名不自動改名 | csv-parse.js |
| 3.1 規則 4 | `line` 是原始行號非列序（含引號內換行跨行） | csv-parse.js |
| 7.1(a) | 混行尾（CRLF/LF）不正規化會無聲併列 | csv-parse.js |
| 7.1(b) | 檔尾多餘空列丟棄，中間空列保留 | csv-parse.js |
| 7.1(c) | 行號用 cursor 自算，含引號內換行的案例 | csv-parse.js |
| 7.2 | BOM／strict／fallback 三段偵測，`confidence` 正確標示 | csv-decode.js |
| 第 5 節 | <5MB 直接處理／5–20MB 提示／>20MB 拒絕，以原始位元組計 | csv-decode.js（`checkCsvFileSize`） |
| setupDropZone bytes 模式 | `mode:'bytes'` 用 `readAsArrayBuffer`，舊呼叫點不受影響 | io-dropzone.js |
| gate 在讀檔之前 | `gate(file)` 回傳 `!ok` 時 `FileReader` 完全未被呼叫、不讀檔 | io-dropzone.js |
| setupFilePicker 與 setupDropZone 等價 | 同一個 `File`，經 `change` 事件與 `drop` 事件走到的 `onData` 結果相同 | io-dropzone.js |

（測試怎麼跑、vendor 檔案放哪裡、`checkCsvFileSize()` 簽名等原本待裁示事項，已依
`sdd/LEVEL1B_RULINGS.md` 定案，見前面「已裁示事項」節，不再列為爭議點。）
