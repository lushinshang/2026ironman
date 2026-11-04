# Tasks

- [x] 1. 建立 `VibeCoding/Day02_ai-text-cleaner/src/index.html` 骨架（textarea 輸入區、模式單選、emoji 勾選框、預覽區、「複製」「下載結果檔案」「下載本工具離線版」三個按鈕）、`src/bundle.json`、`PRD.md`，套用 `shared/base.css`
- [x] 2. 實作 heading（`#`～`######`）、粗體 `**x**`／`__x__`、斜體 `*x*`／`_x_`、行內代碼 `` `x` `` 的移除記號但保留文字函式
- [x] 3. 實作 code fence 清理函式：移除 fence 記號與語言標籤、保留內容；含未閉合 fence（無結尾 ```）邊界處理
- [x] 4. 實作清單與空白格式規則函式：無序清單符號依模式（`•`／`-`／`-`）、有序清單編號（Word/Email 模式每層級各自獨立重新從 1 開始編號 `1.`／`1)`；純文字模式拉平為單層後整體重新編號 `1.`）、巢狀縮排依模式保留或拉平；分隔線（獨立行 `---`／`***`／`___`）整行移除；多餘空白行收斂（Word/Email 收斂為最多 1 行；純文字模式收斂為 0 行＝段落間換行符收斂為恰好 1 個、不留空白行，但每行文字內容與行序不變、不合併不刪字）
- [x] 5. 實作 emoji 移除選項函式（勾選框控制，預設不勾選＝保留）：判定範圍以 Unicode `Extended_Pictographic` 屬性字元為準，移除單位為完整 grapheme（含 variation selector U+FE0F、膚色修飾符 U+1F3FB–U+1F3FF、ZWJ 序列整體移除）；`©`／`®`／`™` 不視為 emoji 一律保留
- [x] 6. pipeline 組裝：把 task 2–5 的函式組成單一清理 function，依所選模式（Word-friendly／Email-friendly／純文字）套用 proposal.md 的九列差異規則表，輸入單一文字、輸出單一清理後文字
- [x] 7. 串接即時預覽：輸入變更用 `shared/ui-debounce.js` `debounce(fn, 150)` 觸發 pipeline，預覽 HTML 渲染前先經 `shared/util-escape.js` `escapeHtml(s)`
- [x] 8. 串接三項共通輸出動作：複製（`shared/io-clipboard.js` `copyToClipboard(text)`）、下載結果檔案（`shared/io-download.js` `downloadFile(filename, content, mime)`）、下載本工具離線版（實作 `buildCleanHtmlCopy()`：清空輸入框、預覽區與任何會被序列化進 outerHTML 的清理結果，移除 `.nav-back` 與指向本站的外連，再用 `downloadFile()` 供下載）；三者成功／失敗皆用 `shared/ui-toast.js` `showToast(msg, ms)` 提示
- [x] 9. 執行 `scripts/bundle.py` 產出 `index.html`／`bundle_manifest.json`，用 `python3 -m http.server` 與 `file://` 雙擊各測一次，確認斷網仍可用
- [x] 10. Playwright 實測 PRD 與 CONTRACT 驗收條件（含複製、下載結果檔案、下載離線版不含輸入資料）+ 邊界情況（空輸入、純 emoji、巢狀清單、未閉合 code fence），並跑資安快速檢查（確認 `escapeHtml` 有覆蓋預覽渲染、無對外請求）

## 驗收條件

- 情境：當輸入含 `##`、`**`、emoji 的內容時，就輸出移除格式符號、保留原文字（emoji 依勾選狀態決定去留）的乾淨文字。
- 情境：當輸入內容經格式清理後，就其中的實質句子文字（非標記符號本身）不應遺失或被截斷，包括 code fence 內的內容；純文字模式的空白行收斂也不得刪除或合併任何一行文字內容，只收斂空白行本身。
- 情境：當切換 Word-friendly／Email-friendly／純文字三種模式處理同一份輸入時，就三者輸出結果彼此不同（至少 bullet 符號、縮排或空白行處理有差異）。
- 情境：當輸入為空字串時，就預覽區顯示空字串，不出現錯誤訊息或整頁崩潰。
- 情境：當輸入只有 emoji（含 variation selector 與 ZWJ 複合序列，如 👨‍👩‍👧‍👦）、無其他文字時，未勾選移除就原樣保留、已勾選就整串（含 ZWJ 與 variation selector）一次移除、輸出空字串，兩種情況都不崩潰；輸入含 `©®™` 時，即使勾選移除 emoji，這三個字元仍須保留。
- 情境：當輸入含兩層以上巢狀有序清單時，Word-friendly／Email-friendly 輸出保留原巢狀縮排層級、每層級各自獨立從 1 開始編號；純文字模式輸出拉平為單層、整體重新從 1 開始編號。
- 情境：當輸入含未閉合的 code fence（只有開頭 ``` 沒有結尾）時，就從開頭到輸入結尾的內容視為 code 內容保留、只移除開頭 fence 記號，不拋出例外或截斷後續文字。
- 情境：當使用者停止輸入超過 150ms 時，就預覽區自動更新為清理後文字，不需按鈕觸發。
- 情境：當使用者點擊複製按鈕且複製成功時，就顯示成功 toast，且系統剪貼簿內容與當下預覽區文字一致。
- 情境：當使用者點擊「下載結果檔案」時，就下載內容與當下預覽區文字一致的文字檔。
- 情境：當使用者點擊「下載本工具離線版」時，就下載的 HTML 檔案不含使用者剛才輸入的原始文字與清理結果（檢查下載檔案內容，不能只測「檔案能開」），且不含 `.nav-back` 返回連結與指向本站的外連。
