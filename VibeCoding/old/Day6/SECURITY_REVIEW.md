> [!IMPORTANT]
> 🤖 **給協作 AI 的寫作與開發規範：**
> 本檔案及本專案之寫作與 Debug 歷程，皆受根目錄 [README](../../readme.md) 之 AI 協作規範與「隱私安全防護（嚴禁留下真實姓名、Email、IP 與真實使用者路徑）」約束。請勿刪除已有的開發日誌，並請在使用者提及 `log` 時主動執行 `generate_log.py`。

# Day 2 資安源碼檢測報告

> 🔀 **本內容原編號 Day2，因系列重新分類移至現在的 Day6。**

**檢測日期**：2026-08-09
**檢測範圍**：`Day2/index.html`（PDF 轉 TXT/MD 工具，純前端，內嵌 pdf.js 4.0.379 函式庫，無伺服器、無資料庫）
**方法**：讀取自撰寫的應用程式邏輯全部原始碼，比對 OWASP 常見類別（XSS、注入、資料外洩）；另針對內嵌的第三方函式庫 pdf.js，用關鍵字掃描（`fetch`／`XMLHttpRequest`／`eval`／`new Function`）找出所有網路能力與動態程式碼執行位置，逐一確認我方呼叫方式是否會觸發；並用 6 組真實瀏覽器測試（一般 PDF、含旋轉浮水印 PDF 中英各一、含表格 PDF、無文字層 PDF）搭配 Network 請求監聽，實測驗證零對外請求。

## 檢測結果：無發現高信心漏洞

### 我方應用程式邏輯（app 層）

| 類別 | 檢查結果 |
|---|---|
| XSS（反射/儲存/DOM-based） | 全程僅使用 `.textContent` 或 `<textarea>.value` 寫入畫面，無任何 `innerHTML`／`insertAdjacentHTML`／`document.write`；使用者上傳的檔名（可能含惡意字元）只經過 `.textContent` 顯示，不會被當 HTML 解析 |
| Code Injection | 我方程式碼無 `eval`、`Function()`、動態 `<script>` 注入 |
| 資料外洩 | 我方程式碼無任何 `fetch`／`XMLHttpRequest`；PDF 檔案內容僅在瀏覽器記憶體中以 `ArrayBuffer` 處理，不上傳、不送出任何網路請求 |
| 下載檔名 | 下載檔名依原始 PDF 檔名去除副檔名並過濾 `\ / : * ? " < > \|` 等字元，非直接可控的路徑穿越風險；副檔名固定為 `.txt`／`.md` |
| 剪貼簿 API | `navigator.clipboard.writeText` 使用方式正確，有 feature-detect 與 `.catch()` 例外處理，不影響安全性 |
| 儲存敏感資料 | 無 `localStorage`／`cookie`／任何持久化儲存 |

### 內嵌第三方函式庫 pdf.js（vendor 層）

pdf.js 原生支援從遠端 URL 載入 PDF、下載 cMap／標準字型資料等網路功能，程式碼內確實存在 `fetch`／`XMLHttpRequest`／`new Function`（PDF 內建 PostScript 計算函式的直譯器，屬 pdf.js 標準架構的一部分，用來執行 PDF 內容流裡的色彩轉換函式，非任意外部程式碼）。逐一確認後：

- 本工具呼叫方式固定為 `pdfjsLib.getDocument({ data: arrayBuffer })`，傳入的是使用者選取檔案讀出的本機 `ArrayBuffer`，**不是 URL**，不會觸發 pdf.js 內建的網路載入路徑。
- 本工具未設定 `cMapUrl`／`standardFontDataUrl` 等選項，pdf.js 內部對應的 `fetch` 呼叫（載入補充字型／CJK 對照表）不會被觸發。
- 已用 6 組不同 PDF（一般文件、中英文旋轉浮水印、表格、無文字層）搭配 Puppeteer 監聽全部網路請求，**每一組測試對外請求數皆為 0**，與程式碼靜態分析結論一致。

## 結論

`Day2/index.html` 未發現 HIGH 或 MEDIUM 等級安全漏洞。我方應用邏輯延續 Day1 的安全模式（無 `innerHTML`、無外部請求、輸出內容經過安全的 DOM API 寫入）；內嵌的 pdf.js 函式庫雖具備網路能力，但經程式碼檢視與 6 組實測皆確認我方呼叫方式不會觸發任何對外連線，符合 PRD 訂下的「所有轉換在瀏覽器本機完成，不上傳任何內容」非功能需求。
