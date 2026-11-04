# Tasks — shared-infra（前置工程）

- [ ] 1. 建立 `VibeCoding/shared/base.css`：共用樣式基底（版面、字體、按鈕、輸入區、toast 等各題共通的基礎樣式，不含任何一題專屬樣式）。
  驗證：肉眼核對不含 `DayNN` 相關 class 名稱或選字器；用一個空白 HTML 引入該 CSS，瀏覽器開啟確認無語法錯誤（devtools console 無 CSS parse error）。

- [ ] 2. 建立 `VibeCoding/shared/ui-toast.js`（`function showToast(msg, ms)`，`ms` 預設 2000）與 `VibeCoding/shared/ui-debounce.js`（`function debounce(fn, ms)`，回傳包裝後的函式，`ms` 預設 150）。
  驗證：簽名逐字對照 `shared/CONTRACT.md` 第 3 節；瀏覽器 console 手動載入後呼叫 `showToast('test')`（確認 2000ms 後消失）與 `debounce(fn,150)(...)`（確認連續呼叫只觸發最後一次）。

- [ ] 3. 建立 `VibeCoding/shared/io-download.js`（`function downloadFile(filename, content, mime)`，`mime` 預設 `'text/plain;charset=utf-8'`）與 `VibeCoding/shared/io-clipboard.js`（`function copyToClipboard(text)`，回傳 `Promise<boolean>`，不自己跳 toast）。
  驗證：簽名逐字對照 `shared/CONTRACT.md` 第 3 節；瀏覽器手動呼叫 `downloadFile('t.txt','hello')` 確認觸發下載且內容正確；呼叫 `copyToClipboard('x').then(r=>console.log(r))` 確認回傳 `true` 且剪貼簿內容為 `'x'`。

- [ ] 4. 建立 `VibeCoding/shared/io-dropzone.js`（`function setupDropZone(dropEl, onText, opts)`，`opts = { accept: [...], onError: fn }`，`onText(textContent, fileName)` 於讀檔成功後呼叫）與 `VibeCoding/shared/util-escape.js`（`function escapeHtml(s)`，`& < > " '` 五個字元、順序固定）。
  驗證：簽名逐字對照 `shared/CONTRACT.md` 第 3 節；用一個含 dropzone 元素的測試頁拖曳 `.txt` 檔案，確認 `onText` 被呼叫且內容正確，副檔名不符時觸發 `onError`；呼叫 `escapeHtml('<a>&"\'')` 確認輸出依 `& < > " '` 順序逐一轉義。

- [ ] 5. 建立 `VibeCoding/scripts/bundle.py` 核心流程：讀 `src/index.html`，將 `<!--{{SHARED:模組名}}-->` 換成對應 `shared/*.js` 內容（`escape_mode='raw_js'`，原樣貼入 `<script>`），輸出頂端寫入 `<!-- BUNDLED: <name>@<version> (<license>) sha256:<前16碼> built <YYYY-MM-DD> -->` 註解。
  驗證：建立一個只含一個 `SHARED` placeholder 的假 `src/index.html`，跑 `python3 scripts/bundle.py` 對應參數，確認輸出檔案中 placeholder 被換成實際 JS 內容、頂端註解格式與規格逐字一致。

- [ ] 6. 擴充 `bundle.py`：支援 `<!--{{ASSET:資源名}}-->` 與 `escape_mode='json_string'`（`JSON.stringify` 成單一字串常數），每個 ASSET 缺 license 字串就中止並印出明確錯誤訊息；大檔案改用 list 收集後 `''.join()`，不用 `html += data`。
  驗證：用一個含反引號與 `${` 的假資料檔案跑 `json_string` 模式，確認輸出為合法 JS 字串常數且不炸模板；刻意建立缺 license 的假資源設定，確認腳本中止並印出錯誤而非靜默略過。

- [ ] 7. 擴充 `bundle.py`：產出 `bundle_manifest.json`，每個資源記錄來源、版本、授權、SHA256（前 16 碼與註解一致、完整值寫入 manifest）。
  驗證：用任務 5、6 的假模板與假資源跑一次，確認產出的 `bundle_manifest.json` 為合法 JSON，每筆資源都含 `source`／`version`／`license`／`sha256` 四個欄位，且 SHA256 與原始資源檔案內容一致（`sha256sum` 手動核對）。

- [ ] 8. 端到端最小可驗證整合測試：建立一組完整假模板（含 `SHARED` 與 `ASSET` 各一個 placeholder，`ASSET` 一份用 `raw_js`、一份用 `json_string`）與假資源（含 license），跑一次完整 `bundle.py`，同時檢查輸出 HTML 與 `bundle_manifest.json` 的內容正確性。
  驗證：輸出 HTML 用瀏覽器（或 `python3 -m http.server`）開啟不報錯、兩個 placeholder 都被正確替換；`bundle_manifest.json` 欄位齊全且與假資源一致；此測試材料放在暫存位置，不留在 `VibeCoding/` 正式目錄下污染任何一題的檔案配置。

## 驗收條件

- 情境：當對照 `shared/CONTRACT.md` 第 3 節的六個模組簽名逐字比對 `shared/` 底下六個 `.js` 檔案的函式宣告，就簽名完全一致（函式名、參數順序、參數個數皆相同）。
- 情境：當在瀏覽器 console 手動呼叫 `showToast`、`debounce`、`downloadFile`、`copyToClipboard`、`setupDropZone`、`escapeHtml` 各一次基本輸入，就每個函式回傳型別與行為符合 `CONTRACT.md` 註解（例如 `copyToClipboard` 回傳 `Promise`、`escapeHtml` 依固定順序轉義五個字元）。
- 情境：當用假模板與假資源跑 `python3 scripts/bundle.py`，就輸出 HTML 頂端含格式正確的 `BUNDLED` 註解，且 `bundle_manifest.json` 產出且欄位齊全（來源／版本／授權／SHA256）。
- 情境：當假資源缺少 license 字串時執行 `bundle.py`，就腳本中止並印出明確錯誤訊息，不產出殘缺的 manifest 或 index.html。
- 情境：當資料內容含反引號或 `${` 字元，以 `json_string` 模式跑 `bundle.py`，就輸出為合法 JS 字串常數，不破壞頁面既有的 `<script>` 語法。
- 情境：當本前置工程全部任務完成後，`VibeCoding/DayNN_<short-name>/` 目錄與任何一題的產品程式碼皆未被建立或修改。
