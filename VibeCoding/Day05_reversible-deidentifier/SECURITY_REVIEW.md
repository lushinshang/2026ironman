# Day05–06 資安檢視 — 可逆式文字去識別化（reversible-deidentifier）

> 檢視日期：2026-08-23（Phase B 完成後）。方法論比照 v1（`VibeCoding/old/Day9/SECURITY_REVIEW.md`）：先做源碼檢測，再做實測驗證。
>
> 本次檢視的前提與 v1 不同：**v2 會產生一個等同還原金鑰的檔案（mapping）**。v1 的遮蔽是破壞性的、原文當場丟棄；v2 保留了完整原始個資並讓它離開頁面。所有 v1 結論都以這個前提重新檢視一次。
>
> 檢視對象：`VibeCoding/Day05_reversible-deidentifier/index.html`（build 產物，由 `src/index.html` + `shared/*.js` 經 `scripts/bundle.py` 產生）。
> 驗證腳本：Node.js 純邏輯層 37 項、獨立 Playwright 實例（本機 Python，非共用 MCP）UI 與離線版 84 項，全數通過。

---

## 1. v1 結論的適用性盤點

### 1.1 仍然適用（v2 直接繼承，本次逐項複驗）

| v1 結論 | v2 複驗結果 |
|---|---|
| 寫入 `innerHTML` 前一律經 `escapeHtml()`（v1 §1、§2） | 適用。`index.html` 共 9 處 `innerHTML` 寫入：6 處寫入常數（`PLACEHOLDER` / `EMPTY_ROW`），2 處（`renderOriginal` 1090、`renderMapping` 1109）的每個插值片段都先過 `escapeHtml()`，1 處是 `buildCleanHtmlCopy()` 內的 `setHtml()`，只被那兩個常數呼叫。0 處 `insertAdjacentHTML`、0 處 `document.write` |
| 零 `eval` / `new Function` / `fetch` / `XMLHttpRequest` / 外部資源載入（v1 §1） | 適用。`grep -nE 'localStorage\|sessionStorage\|indexedDB\|eval\(\|new Function\|fetch\(\|XMLHttpRequest\|beforeunload\|WebSocket' index.html` → 0 筆；`grep -nE '<script src\|<link \|https?://' index.html` → 0 筆 |
| 「零對外連線是核心承諾」，需用 Network 面板實測全流程（v1 §3） | 適用且加倍成立。線上頁面與隔離目錄／獨立 port 的離線版各跑一輪完整流程，攔截所有 request：除了測試 server 自身的頁面載入外，零對外請求 |
| 下載檔名為固定字串、不受使用者輸入影響（v1 §4） | 適用但不足，見 1.2 第 3 點 |
| 使用者輸入的敏感詞用 `String.indexOf` 精確比對、不編譯成 `RegExp`（v1 §1） | 適用。`detectSensitive()` 沿用 `String.indexOf` 迴圈。v2 新增的 CSV 解析也是逐字元手寫狀態機，沒有動態 `RegExp`；還原引擎的 token regex 由寫死的 `TOKEN_PREFIXES` 常數組成，不含任何使用者輸入 |
| 離線複本必須移除 `.nav-back` 與下載按鈕自己、清空所有輸入區（v1 §-1） | 適用但**遠遠不足**，見 1.2 第 2 點 |

### 1.2 因為「可逆」而失效或不足的六項 delta（逐項處理結果與證據）

#### delta 1：產出物本身是機密（v1 完全沒有這個議題）

v1 最壞情況只是遮太多或漏遮；v2 的 mapping 是完整原始個資的結構化集合。

**處理**：不加密（proposal 判斷 5 已定案理由：PRD 未要求、半調子加密製造安全錯覺、警告成本為零且脈絡持久），改為**讓警告跟著檔案走**，三層：

- 檔名：`deid-mapping-DO-NOT-SHARE-YYYYMMDD-HHMM.{json,csv}`
- JSON：頂層第一個鍵是 `_warning`，開檔即見
- CSV：第一行是註解列 `# 本檔含完整原始個資，等同還原金鑰，請勿外傳`，第二行才是欄位標題

**證據**：Playwright 攔 `Blob` constructor 取下載內容 —— 檔名符合 `^deid-mapping-DO-NOT-SHARE-\d{8}-\d{4}\.(json|csv)$`；`JSON.parse` 後 `Object.keys()[0] === "_warning"`；CSV 首行第一個字元為 `#`、次行為 `token,original,type,count`。

#### delta 2：`buildCleanHtmlCopy()` 的清空範圍不夠（本題最高風險項）

v1 只清 7 個 id。v2 若照搬，離線 HTML 會內嵌上一次的 mapping 表格、拖入的檔名、還原分頁內容 —— 而這個檔案正是設計來被分享的。

**處理**（`src/index.html` 的 `buildCleanHtmlCopy()`）：

- 移除節點：`.nav-back`、`#btn-download-offline`（按鈕自己）、**`#__shared_toast`（整個節點移除，不是只清文字）**
- 清空 textarea：`#text-input`、`#sensitive-input`、`#restore-input`（同時 `value` / `textContent` / `value` 屬性）
- 回復初始文案：`#file-name`（拖入的檔名，v1 沒有的洩漏面之一）、`#deid-stats`、`#mapping-status`（回到「mapping 尚未下載」）、`#mapping-file-name`、`#restore-stats`、`#dropzone`、`#restore-dropzone`
- 清空渲染區：`#view-original`、`#view-result`、`#view-restored`、`#mapping-body`（回到「（尚無 mapping）」）、`#literal-notice`
- 回復控制項狀態：`#btn-export-json` / `#btn-export-csv` / `#btn-restore` 設回 `disabled`；分頁回到「去識別化」

**關於「mapping 的記憶體狀態變數」**：`state = {resultText, entries}` 與 `restoreState = {lookup, entries}` 是 app IIFE 內的區域變數。`documentElement.cloneNode(true).outerHTML` 序列化的是 DOM，`<script>` 節點序列化出去的是**靜態原始碼**，不是執行期的變數值，因此記憶體狀態在結構上就不可能被寫進離線複本。**這裡刻意不去歸零線上頁面的 `state`** —— 那會在使用者按下「下載離線版」時清掉他還在用的工作結果，是 UX 破壞而非資安改善。程式碼內留有註解說明此判斷，並以下述 grep 作為實際防線（若日後有人改成把 mapping 寫進 `data-*` 屬性，grep 會立刻抓到）。

**證據**（先觸發 toast、拖入檔名 `SECRET-FILENAME-王小明.txt`、跑完「去識別化 → 匯出 JSON/CSV → 載入 mapping → 還原」整輪，**再**下載離線版）：

- 逐字串 grep 離線 HTML，並以**未跑過任何資料的 build 產物為基準線**比對出現次數（用來區分「使用者資料洩漏」與「Phase A 靜態文案／共用模組原始碼本來就有的字串」）：原文個資（`Ming@Example.com`、`a123456789`、`0912-345-678`、`李永昌`）、拖入的檔名、兩個 mapping 檔名、還原輸出的 `BOLD`、已下載狀態文案 —— **全部 `offline <= baseline`，零新增命中**
- 所有本次產生的 token 字面（`[TERM_001]`、`[TERM_002]`、`[EMAIL_001]`、`[ID_001]`、`[PHONE_002]`）→ 0 筆
- `grep 'id="__shared_toast"'` → 0 筆；`grep 'class="nav-back"'` → 0 筆；`grep '../index.html'` → 0 筆；`grep 'id="btn-download-offline"'` → 0 筆
- 離線 HTML 放進隔離目錄、以另一個 port 開啟：三個 textarea 皆空、mapping 表為「（尚無 mapping）」、`#file-name` 空、狀態列回到「mapping 尚未下載 — 關閉此頁面後將無法還原」、`#btn-restore` / `#btn-export-json` 皆 `disabled`、`document.getElementById('__shared_toast') === null`、`document.querySelector('.nav-back') === null`
- 離線版功能一致性：同一份輸入的去識別化結果與線上**逐字元相同**，匯出的 mapping entries 與線上相同，載入後還原結果與原文**逐字元相同**；全程零對外請求

#### delta 3：v1「下載檔名固定」的結論在 v2 不足

v2 有三種下載（去識別化文字 `deid-result.txt`、mapping JSON、mapping CSV、加上離線版 HTML）。路徑穿越風險仍為零（檔名全為固定樣板 + 時間戳，**不含任何使用者輸入字元**，Playwright 已驗證），但新增了**使用者混淆**風險：把 mapping 誤當成去識別化結果寄出。

**處理**：靠檔名自我區分（`DO-NOT-SHARE` 字樣）與檔案內建警語（delta 1）處理，不是靠 UI 提示 —— 因為檔案會離開頁面脈絡（被拖進郵件附件、丟進 Slack），那時 UI 警語已經看不到。

**額外驗證**：「複製結果」與「下載結果」的內容為去識別化後的文字，不含原始個資、也不含 mapping。剪貼簿一律攔**寫入端**（monkey-patch `navigator.clipboard.writeText`）驗證，不呼叫 `readText()`。

#### delta 4：新增輸入面 —— 使用者載入的 mapping 檔（v1 完全沒有）

mapping 檔可能是別人給的，內容既會進入還原輸出，也會被顯示在畫面上。v1 的 XSS 檢視只涵蓋三個 textarea。

**處理**（`DeidCore.parseMappingFile()`）：

- `JSON.parse` 失敗 → 明確錯誤訊息，不整頁崩潰
- `assertNoForbiddenKeys()` 遞歸檢查每一層的自有屬性名（`Object.getOwnPropertyNames`），命中 `__proto__` / `constructor` / `prototype` 就**整份拒收**（不是靜默忽略）；深度上限 16 層
- 逐筆驗證：`token` 必須是字串且符合 `^\[(ID|PHONE|EMAIL|PERSON|TERM|LITERAL)_\d{3,}\]$`；`original` 必須是字串。任一不符即拋錯
- CSV 自行逐字元解析（處理雙引號跳脫與欄位內逗號／換行），**不用 `eval`、不用動態 `RegExp`**；欄位標題缺 `token` 或 `original`、資料列欄位數不足皆拋錯
- 錯誤訊息可能含檔案內的字串，一律用 `textContent` 寫入 `#mapping-file-name`，不進 `innerHTML`
- 查表用 `Object.create(null)`，不會撞到 `Object.prototype` 上的既有屬性
- 任一錯誤路徑都會 `clearLoadedMapping()`，`#btn-restore` 維持／回到 `disabled`

**證據**：

- 含 `"__proto__"` 鍵的 JSON → 顯示「mapping 載入失敗：mapping 檔含有不允許的欄位名稱：__proto__」、`({}).polluted === undefined`、`#btn-restore` 為 `disabled`
- 含 `"constructor"` 鍵、截斷的 JSON、`token` 格式不符、`original` 非字串、CSV 缺 `original` 欄、CSV 欄位數不足、副檔名 `.exe` —— 皆顯示明確錯誤、頁面不崩潰、還原鈕維持 `disabled`
- `original` 值為 `<img src=x onerror=window.__xss=1><b>BOLD</b>` 的**合法** mapping：載入成功並執行還原後，`window.__xss` / `window.__xss2` 皆 `undefined`、`#view-restored` 的 `querySelector('img')` 與 `querySelector('b')` 皆為 `null`、畫面以純文字顯示原始標籤字元

#### delta 5：本機持久化的壓力

「重整就失去 mapping」會產生加 `localStorage` 的誘惑。

**處理**：明確禁止任何持久化。mapping 只存在 app IIFE 的區域變數（`state.entries`、`restoreState.lookup`），頁面重整即消失。介面上以常駐狀態列處理風險（見 delta 6 的文案），**不做** `beforeunload` 攔截（使用者裁示）。

**證據**：`grep -nE 'localStorage|sessionStorage|indexedDB|beforeunload' index.html` → **0 筆**。

#### delta 6：承諾措辭需擴充

從 v1 的「零對外連線」擴充為 **「零對外連線 + 零本機持久化 + mapping 不進入任何可分享產物（離線 HTML 複本、去識別化結果檔）」**。三個部分分別由 1.1 的 Network 實測、delta 5 的 grep、delta 2 的離線版 grep 佐證。

---

## 2. 不過度承諾的文案檢查

依 proposal 判斷 4 的六條原則自查。禁用詞 grep 全檔：

```
$ grep -nE '安全|已保護|乾淨|100%|完全|全部|無虞|一鍵匿名|保護我的文件|安心送出' index.html
62:  width: 100%;
258:  width: 100%;
```

僅 CSS `width: 100%` 兩筆，**頁面可見文案零命中**。

Phase B 新增文案的逐項核對：

| 文案 | 對應原則 | 說明 |
|---|---|---|
| 「mapping 尚未下載 — 關閉此頁面後將無法還原」 | 原則 1、3 | 主詞是狀態事實，不宣稱資料安全；出現在結果區、使用者複製結果的視線範圍內 |
| 「mapping 已下載（`<檔名>`）」 | 原則 1 | 只陳述動作發生，不說「已備份」「已保存」 |
| 「還原 N 處，另有 M 個 Token 不在 mapping 內，已原樣保留：…」 | 原則 1、3 | 不寫「還原失敗」也不寫「已略過」；未知 token **原樣保留不刪除**，使用者可換一份 mapping 再跑一次，不做二次破壞 |
| 「mapping 載入失敗：<原因>」 | 原則 1 | 講失敗原因，不含補救承諾 |
| 動作按鈕：「匯出 mapping JSON」「匯出 mapping CSV」「執行還原」「下載本工具離線版」 | 原則 6 | 照實命名 |

**「不得宣稱缺少 mapping 仍可還原」的介面驗證**：未載入 mapping 時 `#btn-restore` 為 `disabled`；`document.body.innerText` 不含「嘗試還原」「智慧還原」「猜測」「部分還原」任一字樣（Playwright 實測 0 命中）；載入不屬於這段文字的 mapping 時，狀態文字為「還原 0 處，另有 10 個 Token 不在 mapping 內，已原樣保留：…」，不含「成功」「完成」字樣。

---

## 3. 還原正確性的資安意涵（proposal 判斷 2）

還原引擎的正確性在這題有資安意涵：錯誤的二次替換會把 mapping 裡的個資插到不該出現的位置。

`restoreText()` 用**一條 token regex 對輸入掃一次**，命中即把 mapping 值寫入輸出緩衝區，**輸出緩衝區不再參與掃描**。程式碼內留有註解禁止改回 `String.replace` 全域反覆取代。

**證據**（Node.js，`t_roundtrip.js` 37 項）：

- 往返逐字元相同：原文 → 去識別化 → 匯出 mapping → 還原，JSON 與 CSV 各一次，`diff` 比對**完全相同**
- 原文本身含 `[PERSON_001]` 與 `[LITERAL_001]` 字面：被收編成 `[LITERAL_002]` / `[LITERAL_003]`（新分配編號跳過原文既有字面），往返後仍**逐字元相同**
- mapping 的 `original` 值本身含另一個 token 字面（`[EMAIL_001] → "聯絡 [EMAIL_002]"`）：該字面原樣輸出，**未被二次替換**；把插入順序反過來（`[PERSON_001] → "[PERSON_002]"`）結果相同，證明輸出與 mapping 順序無關
- CSV 欄位含雙引號、逗號、換行的往返：逐字元相同
- 匯出與還原一律以 `token → original`（**不是 `normalized`**）為準

**已知的有損處（設計行為，非 bug）**：同一個值的不同寫法（`0912-345-678` 與 `0912345678`、Email 大小寫不同）依 proposal 判斷 1 的正規化規則共用同一個 token，mapping 保存「第一次出現的原始寫法」，因此還原會把所有出現位置都寫成第一種寫法。這是正規化的必然代價，已在測試中獨立列為具名案例（`A2/還原成第一次出現的寫法`）而非當成失敗。

---

## 4. 邊界情況複驗

| 情況 | 結果 |
|---|---|
| 空輸入 | 「請先輸入文字。」，不產生空 mapping、匯出鈕維持 `disabled` |
| 純空白輸入 | 同上 |
| 未命中任何規則 | 「未命中任何規則。這不代表文中沒有個資。」，匯出鈕 `disabled`（不產生空檔案假象） |
| 超長單行（12,000 字 + 電話） | 不崩潰，正常輸出 |
| 大量 token 樣式字串（500 個 `[PERSON_001]`） | 不崩潰，正常收編為 LITERAL |
| 格式錯誤 mapping（截斷 JSON / 缺欄 CSV / 錯副檔名） | 明確錯誤訊息，還原鈕維持 `disabled` |
| 全流程畫面文字 | 無 `NaN`、無 `undefined`、無 uncaught page error |

> ⚠️ 更正（2026-08-23，獨立驗收發現）：上表「無 uncaught page error」一度**不成立**。
> `buildCleanHtmlCopy()` 會移除「下載本工具離線版」按鈕，但註冊該按鈕 handler 的那行沒有 null 檢查，
> 導致**離線複本載入時拋出 uncaught TypeError**（`Cannot read properties of null`）。
> 因為它是 app IIFE 的最後一個語句，其餘 handler 都已註冊完畢，所以離線版功能實測仍全部正常，
> 不易被察覺。已加上 null 檢查修正。此欄的通過狀態以修正後版本為準。

---

## 5. 結論

- v1 的六項結論在 v2 全數仍然成立，並已逐項複驗
- 六項因「可逆」而產生的 delta 全部處理完畢並有實測證據；其中風險最高的 `buildCleanHtmlCopy()` 以「基準線比對」方式驗證，離線複本相對於未使用過的 build 產物**零新增字串**
- mapping 檔作為 v1 沒有的新輸入面，已加上型別驗證、原型污染鍵拒收、手寫 CSV 解析與 `textContent` 渲染，實測未發現 XSS 或原型污染
- 零 `localStorage` / `sessionStorage` / `indexedDB` / `eval` / `fetch` / `XMLHttpRequest` / `beforeunload` / 外部資源
- 全程操作（線上與隔離環境離線版）零對外請求
- 未發現已知資安疑慮

**本次檢視未涵蓋**：mapping 檔離開本機之後的保護（工具能做的只有檔名與檔內警語，實際保護取決於使用者如何保存與傳遞）；瀏覽器層面的風險（惡意擴充套件讀取頁面 DOM、系統剪貼簿被其他程式讀取）不在單檔前端工具的可控範圍內。
