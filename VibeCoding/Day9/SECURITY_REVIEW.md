# Day4 資安檢測 — 文件去識別化工具

> 🔀 **本內容原編號 Day4，因系列重新分類移至現在的 Day9，後續將延伸為「可逆式去識別化工具」。**

> 檢測日期：2026-08-11（初版）／2026-08-11 更新（新增個資規則式遮蔽＋機敏字庫／代換字庫拆分後複測）／2026-08-12 更新（新增單一 HTML 離線下載功能後複測）。方法論比照 Day1～Day3：先做我方邏輯源碼檢測，再做實測驗證。本工具處理的內容本身就是個資，「零對外連線」是核心承諾，需比前三天更嚴格驗證。

## -1. 本次更新重點（單一 HTML 離線下載）

新增「下載本工具（離線使用）」按鈕，`buildCleanHtmlCopy()` 複製整份 DOM 產生離線副本。這次直接吸收 Day3 曾經事後才補修的教訓：實作當下就把下載按鈕自己（`#btn-download-tool`）與 `.nav-back`（連回首頁的外部連結）從複製出的 DOM 移除，不等上線後被回報。用 Playwright 下載實體檔案、放到完全隔離的目錄與獨立 port 開啟測試：
- `grep` 確認下載出的 HTML 裡沒有 `<div class="nav-back">` 元素、沒有 `<button id="btn-download-tool">` 元素、沒有任何 `../index.html` 字串
- 隔離環境下貼上含個資與機敏字庫關鍵字的文字，偵測與代換功能正常運作，結果跟原始頁面一致
- 用真正的 `DragEvent('drop', {dataTransfer})` 對隔離環境的離線複本測試拖曳 .txt 檔案，正確讀取並帶入
- Network 面板監看隔離環境操作全程，僅出現本機測試 server 的頁面載入本身，零額外對外請求

結論：未發現漏洞，離線複本行為與原始頁面一致。

## 0. 本次更新重點（代換字庫 XSS 覆核）

新增的「代換字庫」欄位內容一樣是使用者輸入、一樣會被寫進 `renderPreview` 的 `innerHTML`。實測貼入 `<script>window.__xss=true;</script><img src=x onerror="window.__xss2=true">` 作為代換字庫的代換值，並讓對應的機敏字庫關鍵字命中：`window.__xss`／`window.__xss2` 皆未被設為 `true`，`detect-preview` 內的 `querySelector('script')`／`querySelector('img')` 皆為 `null`，畫面上正確顯示逸出後的純文字（`computeReplacementText()` 回傳的代換值一樣會經過 `escapeHtml()` 才寫入）。結論與初版一致：未發現漏洞。

## 1. 我方邏輯（app 層）源碼檢測

`Day4/index.html` 全文（含 `<script>` 區塊）逐行檢查 OWASP 常見類別：

| 檢查項目 | 出現次數 | 說明 |
|---|---|---|
| `innerHTML` / `insertAdjacentHTML` | 2 處 `innerHTML`（`renderPreview`、`renderStats`），0 處 `insertAdjacentHTML` | 兩處寫入前皆先經 `escapeHtml()` 轉義（`&`/`<`/`>`/`"`/`'`），或內容為純數字（統計筆數），非直接插入未過濾的使用者輸入 |
| `document.write` | 0 | 未使用 |
| `eval` / `new Function` | 0 | 未使用；機敏字庫比對使用 `String.indexOf`，個資偵測使用固定寫死的 `RegExp` 常數，使用者輸入的關鍵字不會被當成程式碼或正規表示式樣式執行 |
| `fetch` / `XMLHttpRequest` | 0 | 未使用；整份工具無任何網路請求邏輯 |
| 外部資源載入（`<script src>`、`<link>`、CDN） | 0 | 全部樣式與邏輯內嵌於單一 HTML 檔案，無任何外部依賴 |

## 2. XSS 實測驗證

用 Playwright 貼入攻擊字串測試 `renderPreview` 的 `innerHTML` 寫入路徑：

- 輸入文字內容：`<script>window.__xss=true;</script><img src=x onerror="window.__xss2=true">test@example.com`
- 機敏字庫：`<img src=x onerror=alert(1)>`
- 執行偵測後確認：
  - `window.__xss` 與 `window.__xss2` 皆未被設為 `true`（代表 `<script>` 與 `onerror` 均未被瀏覽器解析執行）
  - `document.getElementById('detect-preview').querySelector('script')` 與 `querySelector('img')` 皆為 `null`（DOM 內沒有真的生成這些元素）
  - 畫面內容以純文字顯示原始標籤字元（如 `&lt;script&gt;`），符合 `escapeHtml()` 的預期行為

## 3. 零對外連線實測驗證

用 Playwright 的 Network 面板（含 `static:true` 顯示所有請求）跑完整套操作流程：貼上文字、貼機敏字庫／代換字庫、執行偵測、取消勾選、執行遮蔽、複製、下載 .txt、拖曳 .txt 檔案讀取。全程僅出現本機測試用 `http.server` 提供的頁面載入本身（`Day4/index.html` 的 GET 請求）與瀏覽器自動觸發的同源 `favicon.ico`（404，非工具程式碼主動發出、非第三方請求），無任何額外的外部請求、無分析或追蹤請求。

## 4. 下載檔名與內容檢查

「下載處理後 .txt」按鈕的檔名為固定字串 `處理後文字.txt`，不受使用者輸入內容影響，不存在路徑穿越（path traversal）風險；下載內容使用 `Blob` 由前端記憶體直接產生，未經任何伺服器或第三方處理。

## 5. 重疊比對去重邏輯的正確性覆核（非資安項目，實作階段發現並修正）

`detectAll` 把機敏字庫比對結果放在 `mergeAndDedupe` 的優先順位前段，讓使用者明確指定的機敏字庫命中優先於自動偵測的個資（例如姓名字典可能跟機敏字庫填的人名重疊）。原始版本順序寫反，導致機敏字庫項目被自動偵測的姓名覆蓋、代換設定失效——這不是資安漏洞，但會讓使用者以為某個詞已經代換掉，實際上卻沒有，屬於嚴重的功能正確性問題，已在實作階段用真實案例（「李永昌」同時符合姓氏字典與機敏字庫）發現並修正，修正後重新驗證通過。

## 6. 結論

- 我方邏輯排除後掃描，`innerHTML` 出現的 2 處皆有對應的轉義處理，未發現未過濾的動態內容插入
- 實測 XSS payload（`<script>`、`onerror` 屬性）均未觸發，DOM 結構符合預期的純文字轉義
- 全程操作（含拖曳、偵測、遮蔽、下載）Network 面板零額外對外請求
- 未發現已知資安疑慮
