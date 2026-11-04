# 共用模組契約（v2）

> 這是 `DayNN_<short-name>/` 各題實作時**必須遵守**的共用介面。
> 建立依據：`PROGRESS.md` 第 3 節記錄的 v1 四檔全量比對證據（同一段程式碼被複製 3–4 次且已出現 drift）。
> 改這份契約 = 影響所有已完成的題目，動之前先確認影響範圍。

---

## 1. 為什麼要有這層

v1 只做了 9 題，就已經出現：

- `downloadFile()`（Day1）與 `downloadJson()`（Day3）簽名不同、各自實作，另外 8 處直接內嵌 Blob 樣板
- `showToast()` 在四個檔案裡幾乎逐字相同，但 timeout 一個 1800ms、其餘 2200ms

32 題手動同步只會更糟。所以共用邏輯只寫一次，用 build step 內嵌進各題的單檔 HTML。

**單檔 HTML 的承諾不變**：build 產物 `DayNN_<short-name>/index.html` 仍是零依賴、可下載、斷網可用。共用只發生在**建置時**，不是 runtime import。

---

## 2. 檔案配置

```text
VibeCoding/
├── shared/
│   ├── CONTRACT.md          ← 本檔
│   ├── base.css             ← 共用樣式基底
│   ├── ui-toast.js
│   ├── ui-debounce.js
│   ├── io-download.js
│   ├── io-clipboard.js
│   ├── io-dropzone.js
│   └── util-escape.js
├── scripts/
│   └── bundle.py
└── DayNN_<short-name>/
    ├── src/
    │   ├── index.html       ← 模板，含 placeholder
    │   └── bundle.json      ← 資源清單
    ├── index.html           ← build 產物，**版控要追蹤**
    ├── bundle_manifest.json ← build 產物
    ├── PRD.md
    ├── article_draft.md
    ├── logs/
    └── screenshot_*.png
```

**不要手改 `DayNN_<short-name>/index.html`**，它會被下次 build 覆蓋。改 `src/` 再重跑 build。

---

## 3. 模組介面（簽名固定，不得各題自行變動）

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

**規則**：

- 需要新行為時**加參數**，不要改既有參數的意義（既有題目會壞）
- 各題如果需要模組沒有的行為，寫在自己的 `src/index.html` 裡，**不要 fork 一份共用模組**
- 某個行為第 2 次出現在不同題時，才考慮升上來變共用模組。第 1 次不要預先抽象

---

## 4. `scripts/bundle.py` 的範圍

**做**：

- 讀 `src/index.html`，把 placeholder 換成實際內容
- placeholder 兩種：`<!--{{SHARED:模組名}}-->`、`<!--{{ASSET:資源名}}-->`
- 依 `escape_mode` 決定注入方式
- 在輸出 HTML 頂端寫入機器可讀註解：
  `<!-- BUNDLED: <name>@<version> (<license>) sha256:<前16碼> built <YYYY-MM-DD> -->`
- 產出 `bundle_manifest.json`：每個資源的來源、版本、授權、SHA256
- **每個 ASSET 都必須提供 license 字串，缺少就中止**，並把授權標示渲染到頁面上可見處

**不做**（YAGNI，v1 也沒用到）：

- minify、CDN fallback、自動抓取 npm/pip 最新版
- 資源一律先手動下載到本機固定目錄，腳本只管「拼」不管「抓」

### escape_mode

| 模式 | 用途 | 做法 |
|---|---|---|
| `raw_js` | 共用模組、library 原始碼 | 原樣貼入 `<script>` |
| `json_string` | 資料（詞庫、對照表） | `JSON.stringify` 成單一字串常數，程式端自己 parse |

**`escape_mode` 是必填**，沒有預設值。預設成 `raw_js` 對資料檔是危險預設（資料會被當程式碼直接貼進 `<script>`）。

**`json_string` 模式產出的全域變數名 = 資源名。** 例如 `{"assets": {"stPhrases": {...}}}` 會產出 `var stPhrases = "...";`，程式端用 `JSON.parse(stPhrases)` 取用。因此**資源名必須是合法的 JS 變數名**（`^[A-Za-z_$][A-Za-z0-9_$]*$`）——`my-dict` 這種會產出 `var my-dict = ...`，語法錯誤但腳本仍 exit 0，要到瀏覽器才炸，所以 `bundle.py` 會在建置時直接擋下。

### 授權必須渲染到頁面可見處

模板要放 `<!--{{LICENSES}}-->` placeholder，`bundle.py` 會把外部 ASSET 的名稱、版本、授權渲染成一個可見的 `.bundled-licenses` 區塊。

**有外部 ASSET 但模板沒有這個 placeholder → 建置中止。** 只寫進 HTML 註解與 manifest 不算數——終端使用者看不到，無法稽核。純 SHARED、沒有外部 ASSET 的題目不受此限。

**不使用 v1 的 backtick template literal**。v1 Day3 把 TSV 詞典塞進 `` `...` ``，資料只要含反引號或 `${` 就會炸掉模板語法。

### 已知的實作陷阱

- 大檔案（Day04 詞典 1MB / 53,000 行）用 list 收集後 `''.join()`，不要 `html += data` 的 O(n²) 拼接
- 🔴 **`JSON.stringify` / `json.dumps` 不會跳脫 `</script>`**。HTML 解析器在 `<script>` 內看到 `</script` 就關閉標籤，資料會被**截斷**，殘餘內容洩漏成頁面上的可見文字。2026-08-23 實測確認：塞了 `</script>` 的資料，`html.parser` 解出來是「script 提早結束 + 一段裸露 data + 一個無主的 `</script>`」。
  - `json_string` 模式：輸出前把 `</` 換成 `<\/`（在 JS 字串裡等值於 `</`，對資料內容無影響）
  - `raw_js` 模式：**無法安全自動修補**（插跳脫字元會改變 JS 語意），偵測到就中止，由資源提供者處理
  - 測試資料要同時包含「破壞內層 JS 語法」的字元（`` ` ``、`${`、`"`、`\`）**與**「破壞外層 HTML 容器」的字元（`</script>`）。只測前者會漏掉這個坑

---

## 5. 互動模式：即時 vs 按鈕觸發（不可混用）

v1 四檔比對發現這是**刻意的設計差異，不是疏漏**：Day1 用 debounce 即時運算，Day2/3/9 一律按鈕觸發。

v2 依 PRD 各題的驗收條件決定：

| 題目 | 模式 | 依據 |
|---|---|---|
| Day01 `text-health-check` | **即時**（debounce 150ms） | PRD 03 驗收條件：「文字變更時統計即時更新」 |
| Day02 `ai-text-cleaner` | **即時**（debounce 150ms） | PRD 06 MVP：「即時預覽與一鍵複製」 |
| Day03 `filler-word-checker` | 按鈕觸發 | 詞庫比對成本高，且結果需要穩定不跳動 |
| Day04 `zh-tw-localizer` | 按鈕觸發 | 有「逐項接受／取消替換」的互動狀態，即時重算會沖掉使用者選擇 |
| Day05–06 `reversible-deidentifier` | 按鈕觸發 | 同上，Token 化後有 mapping 狀態 |
| Day07 `text-diff` | 按鈕觸發 | 雙輸入，比對成本高 |

> **`reversible-deidentifier` 佔兩個發文日**（使用者 2026-08-23 裁示）：工作量超過單日上限，實作拆成 Phase A（骨架、偵測、合併歸併、token 分配、去識別化）與 Phase B（mapping 匯出載入、還原引擎、`buildCleanHtmlCopy()`、資安檢視）。**產品仍是一個**，資料夾只有 `Day05_reversible-deidentifier/` 一個，但對應 Day05（上篇）與 Day06（下篇）兩篇文章。因此 `text-diff` 順延為 Day07，Level 1a 共 7 個發文日，系列總長 34 天。

---

## 6. Level 1 共通 UI 基線（明文規定，不是各題自行加料）

以下三個功能，**Level 1 每一題都要有**。它們不寫在各題 PRD 的 MVP 清單裡，但屬於本系列的產品慣例，由本契約統一規定，因此**不視為違反共通規則第 3 條**。

| 功能 | 用哪個共用模組 | 說明 |
|---|---|---|
| 複製結果到剪貼簿 | `io-clipboard.js` | v1 四個檔案全部都有 |
| 下載結果檔案 | `io-download.js` | 副檔名與格式依各題 PRD |
| **下載本工具離線版** | 各題自行實作 `buildCleanHtmlCopy()` | 見下方警告 |

### ⚠️ `buildCleanHtmlCopy()` 的硬性要求

這個函式把「當下整個頁面」複製成一份可分享的離線 HTML。**它的產物是設計來被分享出去的**，所以：

1. **必須清空所有使用者資料**：輸入框、結果區、以及任何存在 DOM 或 JS 變數裡、會被序列化進 outerHTML 的內容
   - ⚠️ **包含 `showToast()` 注入的 `#__shared_toast` 元素**。它是共用模組動態塞進 DOM 的，很容易漏掉；若 toast 訊息含使用者內容（例如「已複製：王小明」）就會被序列化進離線版。Day05 `reversible-deidentifier` 尤其危險
2. **必須移除返回連結（`.nav-back`）與指向本站的外連**
3. **每一題都要在驗收條件裡明確測「下載的離線版不含剛才輸入的資料」**，不能只測「檔案能開」

### ⚠️ 怎麼「測」——這一條已經寫錯六次了

驗收方式分兩種，**選錯就會寫出字面上不可能通過的條件**：

| 要驗的東西 | 用哪種 | 為什麼 |
|---|---|---|
| 使用者輸入的**內容** | 原始碼精確搜尋 = 0 筆 | 前提是用**唯一哨兵**（見下方命名規則），不能用 `1`／`2026` 這類一般值——搜到搜不到都無法歸因 |
| `#__shared_toast`、`.nav-back` 等**結構** | **DOM 層斷言** | ⚠️ 這些字串**必然存在於產物裡**：`shared/ui-toast.js:4,7` 含 `__shared_toast`、`base.css` 含 `.nav-back` 樣式規則，兩者都會被 `bundle.py` 內嵌。**grep 為 0 筆字面上不可能成立** |
| 會被**格式化**後渲染的數值 | DOM 層 `textContent` 判定 | 原始碼未必留下原字串（例如加了千分位變成 `987,654,321`） |

DOM 層判定的寫法：用 Playwright 載入下載到的離線版產物，斷言
`document.getElementById('__shared_toast') === null`、
`document.querySelectorAll('.nav-back').length === 0`、
`document.body.textContent` 不含哨兵值、以及 `pageerror` 與 console error 皆為空。

**已知犯過的六次**：

| # | 哪裡 | 寫成什麼 | 為什麼不可能通過 |
|:--:|---|---|---|
| 1 | Level 1a Day05（D-2） | `grep nav-back` = 0 | `base.css` 有 `.nav-back` 規則，且 `buildCleanHtmlCopy()` 自己的原始碼含該字串 |
| 2 | Day10 ZIP 驗收 | 用 macOS `unzip` 核對中文檔名 | 該工具不支援 EFS flag，正確的 zip 也會報 `Illegal byte sequence` |
| 3 | `csv-infra` ZIP 驗收 | 同上 | 同上 |
| 4 | Day13 離線版 | `grep __shared_toast` = 0 | `ui-toast.js:4,7` 含該字串且會被內嵌 |
| 5 | Day12 離線版 | `grep __shared_toast` = 0、`grep nav-back` = 0 | 同 1 與 4。**與第 1 次一字不差** |
| 6 | Day12 匯出 dashboard | `grep nav-back` = 0 | 這次「可能」成立，但取決於內嵌了哪些 CSS 片段——**依賴實作選擇的驗收條件同樣不可靠** |

第 5 次特別值得記：Day05 的歸檔 `tasks.md:40` **一字不差地寫了這個警告**，
就在同一個 repo 裡，但沒有被傳遞到新的題目。
**寫在某一題的 tasks 裡的教訓不會自動擴散——要寫進契約才會。** 這一節就是為此存在。

**共通病根：驗收條件寫的時候沒有真的跑過一次。**

### 哨兵的唯一性（強制）與命名（建議）

**強制的只有一條：每個哨兵只能屬於一題，跨題不得重用。**
否則全域搜尋某個哨兵時會分不清命中的是哪一題的殘留，驗收就失去歸因能力。

- 必須是**字母字串**，不得用純數字（`987654321` 這種可能是程式常數或文案的一部分）
- **建議**命名為 `ZZ` + 題目識別碼 + 用途，方便一眼看出歸屬；但這是建議，
  **可驗的是唯一性、不是格式**，既有不合格式但唯一的哨兵不需改名
- 唯一性由 `CSV_CONTRACT.md` 第 8 節的跨題一致性檢查實際驗證，不是靠自律

#### 已佔用登記表（新增哨兵前先查這張表，不得沿用）

⚠️ 這是**已被佔用的名字**，不是可以照抄的範例。
（本節先前把清單寫成「示例」，結果 `ZZSALARYCOL` 真的被兩題同時採用——
規範文件裡的具體值會被當成可抄用的東西，所以這裡改成登記表。）

| 題目 | 已佔用的哨兵 |
|---|---|
| `csv-batch-splitter` | `ZZSPLITCOL`、`ZZSPLITVAL` |
| `csv-doctor` | `ZZDOCCOL`、`ZZDOCVAL` |
| `csv-one-page-report` | `ZZCATEGORYVAL`、`ZZHIDDENCAT`、`ZZNOTE`、`ZZONEPAGECOL`、`ZZPERIOD`、`ZZTITLE`、`ZZVISIBLECAT` |
| `csv-period-diff` | `ZZDIFFCOL`、`ZZDIFFVAL` |
| `csv-pivot-dashboard` | `ZZHIDDENUNIT`、`ZZSALARYCOL`、`ZZTESTUNIT9527` |
| `image-batch-optimizer` | `ZZIMGBATCH` |
| `exif-privacy-cleaner` | `ZZEXIFTEST` |
| `screenshot-sanitizer` | `ZZSANFILE` |
| `photo-evidence-sheet` | `ZZPHOTOCAP`、`ZZPHOTOLOC` |

`document-perspective-corrector`（Day17）處理的是圖片像素而非文字內容，離線版驗收改用
**可辨識的哨兵色塊**（測試圖片裡放一塊特定顏色），不適用文字字串哨兵，不佔用本表。

⚠️ 2026-08-24 由外部工具（Antigravity）交付的報告曾宣稱對 Day17 做過文字哨兵
`ZZDOCPERSPECTIVE` 的驗收，但全庫搜尋 0 命中——**那項宣稱不成立**，Day17 的離線版
安全性要用色塊法重新驗證，不要照抄那份報告的說法。

新增前查重（六題五個 SDD 目錄已歸檔，路徑含 archive）：
```bash
grep -rho 'ZZ[A-Z0-9]*' sdd/*/tasks.md sdd/archive/*/tasks.md 2>/dev/null | sort -u
```

### 怎麼證明「產物裡沒有夾帶原始資料集」

這是**否定命題**，比前面幾種難驗：畫面上看不到，不代表沒有藏在 HTML 裡。
「匯出的東西跟畫面一致」也證明不了——一致的畫面底下照樣可以埋著整份原始表。

**方法：用一筆「畫面上一定看不到」的資料當哨兵。**

準備測資時，刻意讓某一列**不會出現在任何輸出**裡——例如它排在 Top-N 之外、
被 Filter 濾掉、或不屬於任何被勾選的群組——並在那一列放一個唯一哨兵（依上方命名規則，各題自取，不要照抄本節文字）。
然後對產物精確搜尋該哨兵，**必須 0 筆**。

同時要有正向對照：畫面上**看得到**的那些值（另取一個哨兵）在產物裡**必須存在**。
只驗「沒有」不驗「有」的話，一個空檔案也會通過。

| 哨兵 | 期望 | 證明了什麼 |
|---|---|---|
| hidden 哨兵（放在畫面看不到的那一列） | 0 筆 | 沒有夾帶完整資料集 |
| visible 哨兵（放在畫面看得到的值） | ≥ 1 筆 | 產物真的帶著該帶的資料，不是空殼 |

⚠️ 適用於：`csv-pivot-dashboard` 的「匯出 Dashboard HTML（A1 靜態快照，不夾帶原始資料集）」、
`csv-one-page-report` 的「匯出單一 HTML（不內嵌 CSV 全表）」。

⚠️⚠️ **設計 hidden 測資時要先算，確認那一列真的躲得掉所有輸出**。
`csv-one-page-report` 就踩過：它有三個輸出（分類占比取前 8 大、Top5、Bottom5），
原本用 11 類測資，第 6 名會出現在占比、第 9–11 名會落進 Bottom5，**任何名次都躲不掉**——
這條驗收會變成必定失敗的假性失敗。要滿足 `r > 8` 且 `r ≤ N-5`，得 `N > 13`，
所以最小可行解是 **14 類、hidden 放第 9 名**。

換句話說，**這個方法本身也可能寫出「不可能通過的驗收條件」**，
用它之前一定要對照該題的實際輸出規格算一遍。

**Day05 `reversible-deidentifier` 特別注意**：它的 mapping（token 對照表）就是完整個資。若 `buildCleanHtmlCopy()` 沒清乾淨，等於把個資寫進一個要分享給別人的檔案。v1 沒有這個風險（v1 沒有 mapping），**v1 的 `buildCleanHtmlCopy()` 清空範圍不足以直接沿用**，必須擴充並獨立驗收。

這個函式沒有升級成共用模組，因為各題要清空的欄位 id 不同（v1 的兩份實作也不是逐字相同）。等到有第三題出現、且能歸納出共通形狀時再考慮升級。

---

## 7. 前置工程（`sdd/shared-infra/`）

`shared/*.js`、`shared/base.css`、`scripts/bundle.py` **不屬於任何一題的產品範圍**，由獨立的前置工程建立，SDD 目錄是 `sdd/shared-infra/`。

- 它必須在 Day01 開工前完成
- 各題的 `tasks.md` **不要**包含「建立共用模組」或「建立 bundle.py」的任務，直接假設它們已就緒
- 敘事上算進 Day01 的文章（「第一天先蓋地基」），但工程上是獨立的一份 proposal / tasks

---

## 8. 每一題都適用的硬性約束

來自 `2026-ironman-vibecoding-30-prd.md` 共通開發規則與各題驗收條件：

- 下載 `index.html` 後**斷網仍可用核心功能**
- 原始檔不覆寫，一律產生新檔供下載
- 資料不上傳，全程 browser-side
- 錯誤格式的輸入不得造成整頁崩潰
- 不加 PRD 沒寫的功能、錯誤處理、抽象
