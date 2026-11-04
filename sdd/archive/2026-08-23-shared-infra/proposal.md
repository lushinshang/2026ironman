# 前置工程：共用模組與 bundle.py

## 為什麼做

v1 只做 9 題就出現同一段程式碼被複製 3–4 次且已經 drift 的情況（`downloadFile()` 與 `downloadJson()` 簽名不同、`showToast()` timeout 各檔不一致）。v2 有 32 題，手動同步只會更糟，因此共用邏輯只寫一次，用 build step 內嵌進各題的單檔 HTML。

`shared/*.js`、`shared/base.css`、`scripts/bundle.py` 依 `shared/CONTRACT.md` 第 7 節規定，**不屬於任何一題的產品範圍**，必須在 Day01 開工前獨立完成，避免像 v1 草案那樣把整支建置工具塞進 Day01 的一條 task。

## 要改什麼

- 建立 `VibeCoding/shared/base.css`：共用樣式基底
- 建立 6 個共用 JS 模組，簽名固定、逐字對照 `shared/CONTRACT.md` 第 3 節（見下方「模組簽名比對」）
- 建立 `VibeCoding/scripts/bundle.py`：
  - 讀 `src/index.html`，把 `<!--{{SHARED:模組名}}-->`、`<!--{{ASSET:資源名}}-->` 換成實際內容
  - 依 `escape_mode`（`raw_js` / `json_string`）決定注入方式，不使用 backtick template literal
  - 輸出頂端寫入 `<!-- BUNDLED: <name>@<version> (<license>) sha256:<前16碼> built <YYYY-MM-DD> -->`
  - 產出 `bundle_manifest.json`（每個資源的來源、版本、授權、SHA256）
  - 每個 ASSET 缺 license 字串就中止
  - 大檔案（如 Day04 詞典 1MB / 53,000 行）用 list 收集後 `''.join()`，不用 `html += data`
- 用最小假模板 + 假資源實跑一次 `bundle.py`，確認產物與 manifest 正確，不等到 Day01 才第一次跑

## 影響範圍

- 新增檔案：
  - `VibeCoding/shared/base.css`
  - `VibeCoding/shared/ui-toast.js`
  - `VibeCoding/shared/ui-debounce.js`
  - `VibeCoding/shared/io-download.js`
  - `VibeCoding/shared/io-clipboard.js`
  - `VibeCoding/shared/io-dropzone.js`
  - `VibeCoding/shared/util-escape.js`
  - `VibeCoding/scripts/bundle.py`
- 修改檔案：無（`shared/CONTRACT.md` 為既有規格來源，本工程只依其實作，不修改契約本身）
- Library / API：無外部 library，`bundle.py` 只用 Python 標準庫（`hashlib`、`json`、`re`/字串處理）
- 明確排除：任何一題的產品程式碼、任何 `DayNN_<short-name>/` 目錄下的檔案

## 模組簽名比對（逐字對照 `shared/CONTRACT.md` 第 3 節）

以下六個簽名為**強制規格**，實作時不得改動：

```js
// ui-toast.js
function showToast(msg, ms)            // ms 預設 2000

// ui-debounce.js
function debounce(fn, ms)              // 回傳包裝後的函式；ms 預設 150

// io-download.js
function downloadFile(filename, content, mime)   // mime 預設 'text/plain;charset=utf-8'

// io-clipboard.js
function copyToClipboard(text)         // 回傳 Promise<boolean>，不自己跳 toast，由呼叫端決定

// io-dropzone.js
function setupDropZone(dropEl, onText, opts)
// opts = { accept: ['.txt','.md'], onError: fn }
// onText(textContent, fileName) 於讀檔成功後呼叫

// util-escape.js
function escapeHtml(s)                 // & < > " ' 五個字元，順序固定
```

上列文字為 `sed -n '55,75p' shared/CONTRACT.md` 直接複製，逐字比對後確認一致（比對紀錄見任務回報）。

## bundle.py 的範圍邊界（避免範圍蔓延）

依 `shared/CONTRACT.md` 第 4 節，明確**不做**：

- minify
- CDN fallback
- 自動抓取 npm/pip 最新版本
- 資源一律先手動下載到本機固定目錄，腳本只管「拼」不管「抓」

兩種 `escape_mode`：

| 模式 | 用途 | 做法 |
|---|---|---|
| `raw_js` | 共用模組、library 原始碼 | 原樣貼入 `<script>` |
| `json_string` | 資料（詞庫、對照表） | `JSON.stringify` 成單一字串常數，程式端自己 parse |

不使用 v1 的 backtick template literal（資料含反引號或 `${` 會炸掉模板語法）。
