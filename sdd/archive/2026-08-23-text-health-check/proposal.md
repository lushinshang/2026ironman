# 文字健檢工作台（text-health-check）

- PRD 對應：PRD 03（`2026-ironman-vibecoding-30-prd.md` 92-123 行）
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- 互動模式：**即時**（debounce 150ms），依據 `shared/CONTRACT.md` 第 5 節、PRD 03 驗收條件「文字變更時統計即時更新」

## 為什麼做

公文、投稿、公告、報告有字數與格式要求，人工檢查很容易漏連續空白、重複標點、過長段落這類格式問題。

共用模組（`shared/*.js`、`shared/base.css`）與 `scripts/bundle.py` 由前置工程 `sdd/shared-infra/` 建立（依 `shared/CONTRACT.md` 第 7 節），必須在 Day01 開工前完成。本題直接假設它們已就緒，不重複建立。

## 要改什麼

### 文字健檢功能（Day01 本身）

- 貼上文字或拖曳 TXT / MD 檔案，即時（debounce 150ms）顯示：
  - 中文字數、英文字數、總字元數
  - 行數、段落數、中英文比例
  - 標點與空白統計
- 偵測並標示問題位置：連續空白、重複標點、多餘空白行、過長段落
- 一鍵複製健檢摘要
- 下載健檢結果檔案（`io-download.js`）
- 下載本工具離線版（`buildCleanHtmlCopy()`，見下方 Level 1 共通 UI 基線）
- 全程不修改原文，僅讀取顯示；下載輸出另存新檔，不覆寫來源

### Level 1 共通 UI 基線（`CONTRACT.md` 第 6 節）

依契約第 6 節，以下三項是本系列產品慣例，不算違反共通規則第 3 條「不自行增加功能」：

- 複製結果到剪貼簿（`io-clipboard.js`）
- 下載結果檔案（`io-download.js`，副檔名／格式：健檢摘要純文字 `.txt`）
- 下載本工具離線版（各題自行實作 `buildCleanHtmlCopy()`）：把當下整頁複製成可分享的離線 HTML，**必須清空 textarea 輸入內容、統計摘要、問題清單等所有使用者資料**，並移除 `.nav-back` 返回連結與站內外連。此函式不做輸入驗證以外的額外抽象，清空範圍僅限本題實際存在的欄位 id。

### 四個含糊點的明確定義（跨題驗收指出的落差，此處鎖定為可據以實作的規則）

- **過長段落門檻**：段落字元數（不含換行符）超過 **300** 字即觸發提示。此為固定預設值，**MVP 不提供使用者調整介面**（PRD 03 MVP 清單未列「門檻設定」，依共通規則第 3 條不新增未要求功能）。
- **連續空白判定**：同一行內，**連續 2 個以上（≥2）** 空白字元視為「連續空白」。空白字元集合包含半形空格 `U+0020`、全形空格 `U+3000`（`　`）、Tab `\t`，三者相鄰混用（例如半形接全形）也算連續。
- **中英文比例分母**：以「中文字元數 + 英文單字數」為分母（不含標點、空白、數字），公式為 `中文字元數 / (中文字元數 + 英文單字數) * 100`，四捨五入到整數。英文單字數採用與 `computeStats()` 相同的 `/[A-Za-z]+(?:'[A-Za-z]+)?/g` 切詞規則（一個單字算一個單位，非逐字母計算）。wireframe 的「73/27」即依此公式計算之範例值。
- **多餘空白行門檻**：連續 **2 行以上（≥2）** 的空白行（僅含空白字元或完全空字串的行）視為「多餘空白行」，即文字中出現連續 3 個以上換行符（`\n\n\n`）才觸發。
- **重複標點門檻**：同一標點字元**連續出現 2 次以上（≥2）** 視為「重複標點」（例如「！！」觸發，單一「！」不觸發）。判定範圍**僅限完全相同的字元**，不同標點相鄰（如「！?」「，。」）不算重複標點。

### v1 沿用與取捨

**可複用邏輯**（`VibeCoding/old/Day1/index.html`，行號已逐一 `sed` 核對）：

- CJK 判定 regex `/[㐀-䶿一-鿿豈-﫿]/g`（290 行）、英文單字 regex `/[A-Za-z]+(?:'[A-Za-z]+)?/g`（291 行）、標點集合（292 行）、非換行空白 regex（293 行）、`computeStats()` 統計核心（306-323 行）
- debounce 即時更新模式，150ms（380-387 行），與 `CONTRACT.md` 第 5 節要求一致
- `downloadFile(filename, content, mime)`（426-436 行），簽名與 `CONTRACT.md` 的 `io-download.js` 一致，直接升級為共用模組
- 複製剪貼簿邏輯（401-409 行），升級為 `io-clipboard.js` 的 `copyToClipboard(text)`（回傳 Promise<boolean>，不自跳 toast，改由呼叫端決定文案）
- `showToast(msg)`（342-347 行，固定 1800ms）——升級為共用模組時依 `CONTRACT.md` 簽名 `showToast(msg, ms)`，`ms` 預設改為 2000（既有 v1 檔案不動，此為新模組的預設值選擇）

**v1 沒有、本題新寫**：

- 連續空白／重複標點／多餘空白行偵測
- 過長段落提示
- 問題位置標示（新邏輯，非移植）
- 拖曳讀檔（TXT / MD），走 `shared/io-dropzone.js`（v1 Day1 僅支援貼上）

**資安取捨（需在此明確記錄）**：v1 Day1 全程用 `textContent`，不用 `innerHTML`（如 355-361、472 行）。本題「問題位置標示」需要在文字中標出高亮片段，若用純文字方式無法呈現高亮效果，因此改用 `innerHTML` 渲染高亮區塊。**所有渲染進 `innerHTML` 的內容，必須先經過 `shared/util-escape.js` 的 `escapeHtml()` 逐字轉義**，再插入 `<mark>` 之類的標籤，避免使用者輸入的文字被當成 HTML 解析執行。這一點會在 tasks.md 中列為獨立驗收項。

## 影響範圍

### 新增檔案

共用模組（`VibeCoding/shared/*.js`、`VibeCoding/shared/base.css`）與 `VibeCoding/scripts/bundle.py` 由前置工程 `sdd/shared-infra/` 建立，**不屬於本題新增範圍**，本題只讀取／引用（依 `shared/CONTRACT.md` 第 7 節）。

- `VibeCoding/Day01_text-health-check/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day01_text-health-check/src/bundle.json`（資源清單）
- `VibeCoding/Day01_text-health-check/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day01_text-health-check/bundle_manifest.json`（build 產物）
- `VibeCoding/Day01_text-health-check/PRD.md`
- `sdd/text-health-check/proposal.md`（本檔）
- `sdd/text-health-check/tasks.md`

### 修改檔案

- `VibeCoding/README.md`（進度表：本題「開發」「撰文」欄位，收尾階段才動，本次提案不動）
- `VibeCoding/index.html`（作品集清單加入本題連結，收尾階段才動）

以上兩項屬「六、收尾」階段工作，本提案僅列出以利後續 tasks 追蹤，不在本題實作範圍內先行變更。

### 不修改

- `VibeCoding/old/Day1/index.html`（v1 原始檔，只讀取參考，不覆寫）
- `VibeCoding/shared/CONTRACT.md`（本題遵守既有契約，不變動簽名）

### Library / API

無外部 library、無 API 呼叫，全程 browser-side 原生 JS。

## 版面草圖（ASCII wireframe）

```
+----------------------------------------------------------------+
| ← 返回作品集              文字健檢工作台                        |
+----------------------------------------------------------------+
| [ 拖曳 TXT / MD 檔案到此，或直接貼上文字 ]                       |
| +--------------------------------------------------------------+
| |                                                              |
| |  <textarea 輸入區，即時 debounce 150ms 更新>                  |
| |                                                              |
| +--------------------------------------------------------------+
+----------------------------------------------------------------+
| 統計摘要                          | 問題清單（位置標示）          |
| 中文字數：123   英文字數：45      | 1. 第 3 行：連續空白 x2      |
| 總字元數：456   行數：12          | 2. 第 7 行：重複標點「！！」  |
| 段落數：3       中英比例：73/27   | 3. 第 9 段：段落過長（320字）|
| 標點數：20      空白數：15        |                              |
+----------------------------------------------------------------+
| [複製健檢摘要]  [下載結果檔案]  [下載本工具離線版]                  |
+----------------------------------------------------------------+
```

問題清單項目點擊或 hover 時，輸入區對應片段以 `<mark>` 高亮（經 `escapeHtml()` 處理）。三個按鈕依 `CONTRACT.md` 第 6 節 Level 1 共通 UI 基線：複製（`io-clipboard.js`）、下載結果檔案（`io-download.js`，輸出健檢摘要 `.txt`）、下載本工具離線版（`buildCleanHtmlCopy()`，產物不含目前輸入的資料）。
