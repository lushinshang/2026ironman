> [!IMPORTANT]
> 🤖 **給協作 AI 的寫作與開發規範：**
> 本檔案及本專案之寫作與 Debug 歷程，皆受根目錄 [README](../../readme.md) 之 AI 協作規範與「隱私安全防護（嚴禁留下真實姓名、Email、IP 與真實使用者路徑）」約束。請勿刪除已有的開發日誌，並請在使用者提及 `log` 時主動執行 `generate_log.py`。

# Day 3 資安源碼檢測報告

> 🔀 **本內容原編號 Day3，因系列重新分類移至現在的 Day7。**

**檢測日期**：2026-08-10
**檢測範圍**：`Day3/index.html`（文字差異比對器，純前端，內嵌 jsdiff `diff@5.2.2` 的 `dist/diff.js`，無伺服器、無資料庫）
**方法**：讀取自撰寫的應用程式邏輯全部原始碼（排除內嵌的 jsdiff 區塊），比對 OWASP 常見類別（XSS、注入、資料外洩）；另針對內嵌的第三方函式庫 jsdiff，用關鍵字掃描（`fetch`／`XMLHttpRequest`／`eval`／`new Function`）找出所有網路能力與動態程式碼執行位置；並用 Playwright 實測完整比對流程（貼上文字→比對→下載報告）搭配 Network 面板監聽，驗證零對外請求。

## 檢測結果：無發現高信心漏洞

### 我方應用程式邏輯（app 層）

用腳本排除 `<script id="jsdiff-src">` 內嵌區塊後，對剩餘的自撰程式碼做關鍵字掃描，結果如下：

| 類別 | 檢查結果 |
|---|---|
| XSS（反射/儲存/DOM-based） | 全程僅使用 `.textContent`／`createElement` 建立畫面元素，掃描確認 `innerHTML`／`insertAdjacentHTML`／`document.write` 出現次數皆為 0；使用者貼上或拖曳檔案讀入的文字只經過 `.textContent` 顯示，不會被當 HTML 解析 |
| Code Injection | 掃描確認 `eval(`／`new Function` 出現次數為 0 |
| 資料外洩 | 掃描確認 `fetch(`／`XMLHttpRequest` 出現次數為 0；拖曳的 .txt/.md 檔案僅用 `FileReader.readAsText()` 在瀏覽器記憶體中讀取，不上傳、不送出任何網路請求 |
| 本機儲存 | 掃描確認 `localStorage`／`sessionStorage`／`document.cookie` 出現次數皆為 0，無持久化儲存使用者輸入 |
| 下載檔名 | 下載檔名為程式碼寫死的固定字串（`差異比對報告.md`），非使用者可控，無路徑穿越風險 |
| 剪貼簿 API | `navigator.clipboard.writeText` 使用方式正確，有 `typeof` feature-detect 與 `.catch()` 例外處理，不影響安全性 |

### 內嵌第三方函式庫 jsdiff（vendor 層）

對內嵌的 `dist/diff.js`（`diff@5.2.2`，約 53KB）做關鍵字掃描：

```
grep -n "fetch(\|XMLHttpRequest\|eval(\|new Function" dist/diff.js
```

掃描結果為**零匹配**——jsdiff 本身是純字串／陣列比對演算法函式庫，不含任何網路請求或動態程式碼執行能力，比 Day2 內嵌的 pdf.js（需逐一排除遠端字型下載等網路能力）更單純，無需額外的呼叫方式確認。

### 實測驗證

用 Playwright 對本機伺服器（`http://127.0.0.1:8792/Day3/index.html`，等效於 `file://` 開啟）執行完整流程：貼上新舊版文字 → 點擊「開始比對」→ 點擊「下載差異報告 MD」。全程用 `browser_network_requests` 監聽，結果僅有 1 筆請求——頁面本身的初始載入（`GET /Day3/index.html`），比對與下載過程**零額外對外請求**，與程式碼靜態分析結論一致。

## 結論

`Day3/index.html` 未發現 HIGH 或 MEDIUM 等級安全漏洞。我方應用邏輯延續 Day1／Day2 的安全模式（無 `innerHTML`、無外部請求、輸出內容經過安全的 DOM API 寫入）；內嵌的 jsdiff 函式庫本身不具備任何網路能力或動態程式碼執行能力，經關鍵字掃描零匹配與實測零對外請求雙重確認，符合 PRD 訂下的「所有比對在瀏覽器本機完成，不上傳任何內容」非功能需求。
