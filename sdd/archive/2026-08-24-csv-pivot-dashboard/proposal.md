# CSV Pivot Dashboard（csv-pivot-dashboard）

- PRD 對應：**PRD 10**（`VibeCoding/2026-ironman-vibecoding-30-prd.md` 308-335 行）
- 開發順序：**Day11（上篇）+ Day12（下篇）**（使用者 2026-08-23 裁示拆篇；PRD 編號 10 ≠ 發文日 11/12，兩者不同軸）
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- 資料夾：`VibeCoding/Day11_csv-pivot-dashboard/`（產品仍是一個，只有這一個資料夾，不另建 `Day12_...`，見 `reversible-deidentifier`（Day05–06）前例）
- 互動模式：**即時（下拉 change 直接重算，文字輸入走 `debounce` 150ms）**，依據與爭議見第 D 節與「爭議點清單」第 3 條
- 資料層：`VibeCoding/shared/CSV_CONTRACT.md`（本題吃 `decodeCsvBytes()` / `parseCsv()` / `toCsv()` / `inferColumnTypes()`）

## 為什麼做

使用者想快速回答「每單位幾件、多少錢、趨勢如何」，但未必會 Excel 樞紐分析（PRD 10「為什麼做」，`VibeCoding/2026-ironman-vibecoding-30-prd.md:316`）。

本題是 Level 1b 五題裡唯一要**自己造圖表輪子**的一題：依 `CSV_CONTRACT.md` 第 7.4 節，圖表不引入 library，手寫 SVG。決定性理由是「內嵌兩次」——工具本體要內嵌一份，匯出的 dashboard HTML 為了離線觀看還要再帶一份，Chart.js 合計 417 KB 不成比例。**本提案不推翻這個決定**，而是把 7.4 節列出的成本逐一定義成可驗收的行為。

同時，本題建立 `shared/ui-chart-svg.js`（`CSV_CONTRACT.md` 第 6.2 節），且**一開始就寫成共用模組**，因為 Day13 `csv-one-page-report` 已確定要用。這是對 `CONTRACT.md` 第 3 節「第 1 次不要預先抽象」的刻意例外，契約已明文授權。

## 要改什麼

### 主要行為

1. 讀檔：拖放與檔案選取**走同一條路**——`setupDropZone(dropEl, onData, opts)` 與 `setupFilePicker(fileInput, onData, opts)` 共用同一組 `opts = { mode: 'bytes', accept: ['.csv'], gate: function (file) { return checkCsvFileSize(file.size); } }`（`CSV_CONTRACT.md` 第 4 節），**不自寫 `<input>` 的 `change` 事件處理**。`gate` 在「開始讀檔之前」執行，`!ok` 時走 `onError(message)` 且完全不讀檔——21 MB 以上的檔案在還沒進 `readAsArrayBuffer` 前就被擋下，不會有大檔案先整份載入記憶體才判斷的無聲卡死。通過閘門後 `onData` 收到 `ArrayBuffer`，依序交給 `decodeCsvBytes()` 解碼、`parseCsv()` 解析得到 Table。`decodeCsvBytes()` 回傳 `confidence === 'fallback'` 時，UI 顯示「偵測為 Big5，若顯示為亂碼請手動切換編碼」並提供手動切換編碼下拉（見版面草圖檔案資訊列）
2. `inferColumnTypes()` 推薦 Dimension／Measure 角色，使用者可覆寫
3. 選 Group By（1–2 欄）、Measure 欄、Aggregate（COUNT／SUM／AVG／MIN／MAX）
4. 日期欄可選「依年／季／月」分組
5. Filter（最多 3 條，AND）、Sort、Top N／Bottom N
6. KPI Cards、Pivot Table、Bar／Line／Pie 三種圖表
7. 匯出彙總後 CSV（`toCsv()`，帶 BOM）
8. 匯出單一 Dashboard HTML（靜態快照，見 A 節）
9. **共通 UI 基線三項**（`CONTRACT.md` 第 6 節明文規定，不視為違反共通開發規則第 3 條）：複製結果到剪貼簿（`io-clipboard.js`）、下載結果檔案（`io-download.js`）、下載本工具離線版（`buildCleanHtmlCopy()`）

### 版面草圖

```
+--------------------------------------------------------------------------+
| <- 返回作品集           CSV Pivot Dashboard                               |
+--------------------------------------------------------------------------+
| [拖曳 CSV 或選擇檔案]   sales.csv／utf-8（BOM）／逗號／12,480 列／9 欄     |
|                         編碼偵測：strict   [切換編碼 v]                    |
+--------------------------------------------------------------------------+
| Group By (1)[單位 v 建議]  (2)[（無） v]   日期粒度[（不適用） v]           |
| Measure  [金額 v 建議]     Aggregate[SUM v]                                |
| Filter   [單位 v][包含 v][      ] [+]  Sort[金額 SUM v][降冪 v]            |
| 顯示     [Top N v][ 10 ]                                                   |
+--------------------------------------------------------------------------+
| KPI（Filter 後全體，不受 Top N 影響）                                      |
| +----------+ +----------+ +----------+ +----------------+                 |
| | 總計     | | 群組數   | | 資料列數 | | 無法計算       |                 |
| | 8,420,300| | 27       | | 12,480   | | 63 筆（已排除）|                 |
| +----------+ +----------+ +----------+ +----------------+                 |
+--------------------------------------------------------------------------+
| [ Bar ] [ Line ] [ Pie ]                                                  |
| +----------------------------------------------------------------------+ |
| |  1,200,000 |- #                                                       | |
| |    800,000 |- #  #                                                    | |
| |    400,000 |- #  #  #  #                                              | |
| |          0 +----------------                                          | |
| |             教育處 工務處 財政處 民政處                                | |
| +----------------------------------------------------------------------+ |
+--------------------------------------------------------------------------+
| Pivot Table（Top 10／共 27 組；顯示前 500 列）                             |
| 單位     | 金額 SUM   | 筆數 | 無法計算                                   |
| 教育處   | 1,180,400  | 421  | 3                                          |
| (空值)   |    62,000  |  17  | 0                                          |
| ...                                                                       |
+--------------------------------------------------------------------------+
| [複製表格] [下載彙總 CSV] [匯出 Dashboard HTML（含資料）]                  |
| [下載本工具離線版（不含資料）]                                             |
+--------------------------------------------------------------------------+
```

---

## A. 匯出 Dashboard HTML：A1 靜態快照（**使用者已裁示**）

PRD 10 驗收條件第 3 條（`VibeCoding/2026-ironman-vibecoding-30-prd.md:335`）：「匯出的 Dashboard HTML 離線仍能觀看」。

把當下畫面的 KPI 數字、Pivot Table、以及**已經算好的 SVG 字串**直接寫進輸出 HTML，**輸出檔零 `<script>`，不夾帶原始資料集**。

- 體積：只跟「畫面上看得到的東西」成正比。27 組的 dashboard 約 20–60 KB，與原始 CSV 大小無關
- 資安面：輸出檔**不含原始資料列**，只含彙總結果。寄給主管的東西 = 主管在你螢幕上看到的東西，沒有多餘資料隨檔案外流
- 攻擊面：零 JS，沒有 XSS 執行路徑，只要渲染時全程 `escapeHtml()` 即可
- 代價：**收件者不能改 Group By**，看到的是一張定格的報表
- 對驗收條件的滿足：「離線仍能觀看」字面上是**觀看**，A1 完全滿足

（曾評估「可互動副本」方案——把原始 Table 與樞紐引擎一併序列化進輸出檔，讓收件者能重新樞紐——但會讓使用者在不知情的情況下把整份原始明細寄出去，是沉默的資料外洩；使用者裁示採 A1，不做該方案。）

### A 與 `buildCleanHtmlCopy()` 是兩個相反的產物

`CONTRACT.md` 第 6 節的 `buildCleanHtmlCopy()`（「下載本工具離線版」）與 A 節的匯出**目的相反、驗收方向相反**。本題兩者都要做，**絕不可共用同一份實作**：

| | 匯出 Dashboard HTML | `buildCleanHtmlCopy()` |
|---|---|---|
| 給誰 | 主管／同事看結果 | 別人拿去用這個工具 |
| 資料 | **必須含**當下彙總結果 | **必須不含**任何使用者資料 |
| 互動 | 無（零 `<script>`） | 完整工具，但是空的 |
| 檔名 | `dashboard-YYYYMMDD-HHMM.html` | `csv-pivot-dashboard-offline.html` |
| 頂端標示 | 「本檔含資料快照，分享前請確認可外流」 | 無 |
| `.nav-back` 與本站外連 | 移除（檔案會被寄出，不該帶回站連結） | 移除（`CONTRACT.md` 第 6 節硬性要求第 2 點） |
| 驗收方向 | `grep` 測試資料字串 **至少 1 筆**，且 `grep -c '<script'` **等於 0** | `grep` 測試資料字串 **等於 0 筆** |

**本題特有的清空漏點（Level 1a 各題都沒有，必須寫進驗收）**：Dimension／Measure／Filter／Sort 的下拉選單 `<option>` 是**從 CSV headers 動態產生的**，而**欄名本身就是使用者資料**（`薪資`、`身分證字號`、`王小明_備註` 都是真實會出現的欄名）。`buildCleanHtmlCopy()` 若只清輸入框與結果區，欄名會原封不動留在 `outerHTML` 裡。完整清空清單見 `tasks.md` 第 10 條。

---

## B. 手寫 SVG 圖表的邊界處理

`CSV_CONTRACT.md` 第 7.4 節明列這些必須是獨立任務。以下逐一定義行為，**不使用「妥善處理」這類措辭**。

### B1 座標映射

- 每個 `<svg>` 必須**同時**帶 `width`／`height` 屬性（明確像素值）與 `viewBox="0 0 800 400"`、`preserveAspectRatio="xMidYMid meet"`，**不得只靠 CSS 百分比控制尺寸**（`CSV_CONTRACT.md` 第 7.4b 節硬性要求；只用 CSS 百分比會讓 Day12 的 A4 列印在 Chrome 坍縮成 0×0）；預設 `width=800, height=400`，外層 `<div style="overflow-x:auto">` 讓小螢幕可橫向捲動而非把 SVG 壓扁
- `renderBarChart()`／`renderLineChart()`／`renderPieChart()` 的 `opts` 支援呼叫端**指定固定像素尺寸**（例如 `{ width: 600, height: 300 }`），非僅自適應容器一種模式，供 Day12 列印時使用固定尺寸
- padding：`{ top: 24, right: 24, bottom: 72, left: 72 }`，得繪圖區 `plotW = 704`、`plotH = 304`
  - `bottom: 72` 是為了容納旋轉 -45 度的 X 標籤；`left: 72` 容納千分位數值
- Y：`y(v) = padTop + plotH * (yMax - v) / (yMax - yMin)`（`yMin`／`yMax` 為 B2 取整後的值）
- X（Bar，類別軸）：band 寬 `B = plotW / n`，第 i 根 bar 的中心在 `padLeft + B * (i + 0.5)`，bar 寬 `min(B * 0.7, 64)`
- X（Line）：n >= 2 時 `x(i) = padLeft + plotW * i / (n - 1)`；n = 1 見 B5-2
- 所有座標輸出前 `toFixed(2)`，避免 SVG 屬性出現 17 位浮點尾數

### B2 軸刻度取整（演算法寫死：Heckbert nice numbers）

契約要求「不要出現 `0, 3.33, 6.67`」。採 Heckbert《Graphics Gems》的 loose labeling，目標刻度數 `n = 5`：

```
niceNum(x, round):
    exp = floor(log10(x))
    f   = x / 10^exp                    // 1 <= f < 10
    if round:  nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10
    else:      nf = f <= 1  ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
    return nf * 10^exp

niceScale(dataMin, dataMax, n = 5):
    range   = niceNum(dataMax - dataMin, false)
    step    = niceNum(range / (n - 1), true)
    niceMin = floor(dataMin / step) * step
    niceMax = ceil (dataMax / step) * step
    ticks   = [niceMin, niceMin + step, ..., niceMax]
```

補充規則（皆為明定，實作不得自行變動）：

- **Bar 圖的 `dataMin` 一律先夾到 `min(0, 實際最小值)`**，Y 軸必含 0。長條圖不從 0 起跳是視覺誤導
- Line 圖不強制含 0，用實際 min／max（趨勢圖看的是變化）
- `dataMax - dataMin === 0` 時**不呼叫** `niceNum`（`log10(0)` 是 `-Infinity`），改走 B5-2／B5-3 的退化路徑
- 刻度標籤小數位數 `decimals = max(0, -floor(log10(step)))`，全部刻度用同一個位數，配合 `Intl.NumberFormat('zh-TW', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })` 加千分位
- 浮點累加誤差：刻度用 `niceMin + i * step` 產生後，再 `Number(v.toFixed(10))` 去尾，避免出現 `0.30000000000000004`

### B3 標籤重疊（決策順序寫死，由上而下第一個成立者生效）

X 軸類別標籤，`fontSize = 12`：

1. **一律先截斷**：字元數 > 12 時取前 11 字加 `…`，完整值寫進該標籤的 `<title>`（hover 可見）
2. 估寬：`w(ch) = ch.codePointAt(0) > 0x2E80 ? 12 : 7.2`（CJK 全寬、ASCII 約 0.6 em），`W` = 截斷後最長標籤的估寬
3. `W <= B - 4` 則**水平置中顯示**，結束
4. `B >= 14.4`（等於 `fontSize * 1.2`，旋轉後相鄰基線不重疊的下限）則**旋轉 -45 度**，`text-anchor="end"`，錨點在該 band 中心正下方 8px，結束
5. 否則**抽稀**：`k = ceil(14.4 / B)`，只對 `i % k === 0` 的 band 畫標籤（仍旋轉 -45 度），其餘 band 只畫刻度短線；圖表下方固定一行「類別過多，每 k 個顯示 1 個標籤」

Y 軸刻度只有 5 個、垂直間距 `plotH / 4 = 76px`，恆不重疊，不需上述流程。

### B4 色盤

- **一律用 SVG `fill` 屬性直接寫死每個圖形元素的顏色，不用外部 CSS class**（`CSV_CONTRACT.md` 第 7.4b 節硬性要求；瀏覽器列印預設會移除背景色 `print-color-adjust`，用 class 上色在列印時會整片消失）
- 基準：**Okabe–Ito 色盲友善色盤**，取其 7 個彩色加 1 個補色，共 8 色，順序固定：
  `#0072B2`（藍）、`#E69F00`（橙）、`#009E73`（綠）、`#CC79A7`（粉）、`#56B4E9`（淺藍）、`#D55E00`（朱）、`#F0E442`（黃）、`#7F3C8D`（紫）
- **灰 `#999999` 不進循環**，專門保留給 Pie 的「其他」與退化狀態的佔位元素
- Bar／Line 只有一個 Measure，**全部同色 `#0072B2`**，不對每根 bar 上不同顏色（不同顏色會暗示不存在的分類語意）
- Pie 依 B5-6 合併後最多 8 個實色分片加 1 個灰色「其他」，**恰好不需要循環重複色**
- 每個分片除顏色外一律附文字標籤（Pie 用外圈標註「類別 值（百分比）」），不讓顏色成為唯一資訊通道

### B5 退化情形（四種，加 Pie 特有兩種，各有明確行為）

| # | 情形 | Bar | Line | Pie |
|---|---|---|---|---|
| 1 | **無資料**（群組數 = 0） | 三種圖一律**不輸出 SVG**，改輸出 `.chart-empty` 區塊，文字：「沒有可繪製的資料。可能是 Filter 條件把所有列都排除了。」**不畫空的座標軸**（空軸看起來像「值都是 0」，是錯誤訊息） |||
| 2 | **單一資料點**（n = 1） | 正常畫 1 根，bar 寬 `min(plotW/3, 64)`，置中 | 單點無法連線，畫 `r=4` 的實心圓點加一條穿過該點的水平虛線（`stroke-dasharray="4 4"`），圖下固定註記「僅 1 個資料點，趨勢線無意義」 | 畫整圓，標註「類別名 100%」 |
| 3 | **全部為零**（所有值 = 0） | Y 域固定 `[0, 1]`、step `0.2`；bar 高度 0，改在基線畫 2px 實心標記讓使用者知道類別存在；圖下固定文字「所有數值皆為 0」 | 同左，折線壓在 y=0 上，圖下同一行文字 | **不畫餅**，輸出 `.chart-empty`：「所有數值皆為 0，無法計算占比。」 |
| 4 | **含負值** | Y 域為 `niceScale(min(0, dataMin), max(0, dataMax))`，零線畫 1px 實線 `#666`；負值 bar 從零線**向下**畫；X 軸標籤仍固定在 `padTop + plotH` 之下，**不跟著零線跑** | 同上處理 Y 域與零線，折線正常穿越零線 | **拒絕繪製**，輸出 `.chart-empty`：「資料含負值，圓餅圖無法表達占比，請改用 Bar。」負值在圓餅圖沒有合法幾何表示，取絕對值或截為 0 都是造假 |
| 5 | Pie：**總和為 0 但有正有負** | — | — | 同 #4 拒繪（負值檢查先觸發） |
| 6 | Pie：**類別過多** | — | — | 見 B5-6 |

**B5-6 Pie 的類別合併規則（門檻寫死）**

- 依 Measure 值**降冪**排序
- **類別數 <= 9：全部畫出，不合併。** 正好 9 個時若合併，「其他」只含 1 個類別，比不合併更難讀
- **類別數 >= 10：取前 8 名，其餘全部合併為第 9 片「其他（N 個類別）」**，值等於其餘之和，顏色固定 `#999999`
- 合併**只影響 Pie**。Pivot Table 與 Bar／Line 一律呈現完整結果（受 Top N 影響者除外）。圖下固定一行「已將第 9 名以後的 N 個類別合併為『其他』」
- 合併後值為 0 的分片**不輸出 path**，只在圖例列出並標 0%

### B6 `shared/ui-chart-svg.js` 介面（簽名固定，Day12 依此使用）

```js
// ui-chart-svg.js —— 回傳 SVG 字串，不碰 DOM、不依賴任何全域狀態
function renderBarChart(series, opts)    // → string（SVG 或 .chart-empty 的 HTML）
function renderLineChart(series, opts)
function renderPieChart(series, opts)

// series: { label: string, value: number }[]   value 必為有限數；呼叫端負責過濾
// opts:   { width, height, valueFormat, maxPieSlices, title }  皆選填，預設見 B1/B4/B5-6
//         width/height 省略時用 B1 預設值(800/400)；Day12 列印可傳入固定像素尺寸
```

- **三個函式一律回傳字串**，由呼叫端 `innerHTML` 一次寫入。不做逐節點 `createElementNS` 加 `append`（數百節點會明顯變慢，且無法在 A 節的靜態快照裡重用）
- `label` 一律在模組內經 `escapeHtml()`（`shared/util-escape.js`）處理後才進 SVG `<text>`／`<title>`
- 模組**不含**顏色與尺寸以外的樣式假設，配色與尺寸全部由常數表驅動，Day12 可用 `opts` 覆寫寬高
- 水平長條圖為加分項，非本題必需（`CSV_CONTRACT.md` 第 7.4b 節第 6 點），本提案不列為 task

### 對照 `CSV_CONTRACT.md` 第 7.4b 節六項硬性要求

| # | 要求 | 本提案對應處 |
|---|---|---|
| 1 | `<svg>` 同時有 `width`／`height` 屬性與 `viewBox`，不得只靠 CSS 百分比 | B1（已改） |
| 2 | 支援「指定固定像素尺寸」的呼叫方式 | B6 `opts.width`／`opts.height`，非僅自適應容器 |
| 3 | 填色用 SVG `fill` 屬性，不用外部 CSS class | B4（已改） |
| 4 | 類別標籤過長要有截斷機制，且截斷規則由模組決定 | B3（截斷／旋轉／抽稀決策鏈，全在模組內部，呼叫端不處理） |
| 5 | 色盤能指定某一類別為中性色（給「其他」用） | B4：灰 `#999999` 不進循環，專用於 Pie「其他」與退化狀態佔位 |
| 6 | 水平長條圖（加分項，非必需） | 不做，本提案明列理由 |

---

## C. 樞紐引擎

### C1 Dimension／Measure 的推薦與覆寫

推薦來源是 `inferColumnTypes(table)`（`CSV_CONTRACT.md` 第 4 節），它「回報而不改寫」，回傳 `ColumnType[]`，每項為 `{ kind, sampleSize, matched, mismatchLines }`。

| `kind` | 推薦角色 | 附加條件 |
|---|---|---|
| `number` | **Measure 候選，標「建議」** | 門檻已在 `inferColumnTypes()` 內統一定義（`CSV_CONTRACT.md` 第 4.0b 節），本題不再自加二次門檻 |
| `date` | **Dimension 候選**，並啟用「日期粒度」下拉 | 無 |
| `text` | **Dimension 候選** | distinct 值數 > `min(100, 列數 * 0.5)` 則**不標建議**（這是身分證號、流水號那類高基數欄，分組後每組 1 列，沒有意義），但仍可選 |

- **使用者可完全覆寫**：Dimension 與 Measure 兩個下拉都列出**全部欄位**，只是「建議」者排最前面並加 `建議` 標記，其餘依原始欄序排在下方
- 預設值：第一個建議 Dimension 加第一個建議 Measure 加 `SUM`。若無建議 Measure，Aggregate 預設 `COUNT`，Measure 下拉仍可選但畫面標示「COUNT 不使用 Measure 欄」
- 把 `text` 欄選為 Measure 是**被允許的**，結果會是全部「無法計算」，由 C2 的計數如實呈現。**不阻擋、不跳警告框**

### C2 非數值格的處理：**略過，不當 0**

契約第 3 節：每一格都是 `string`，永不轉型。數值化直接用契約 4.0b 定義、由 `csv-infra` 提供的共用 `toNumber()`（`csv-types.js`），本題**不自寫、不重新定義**：先 trim，接受選用正負號、十進位小數、科學記號；**不接受**千分位逗號、貨幣符號（`$`／`NT$`／`￥`）、百分比 `%`、會計式括號負數 `(1,200)`、全形數字、中文數字、`1.2萬`，一律回 `null`，視為無法計算。理由：猜測會製造沉默錯誤（`(1,200)` 是負 1200 還是備註？`1,234` 的逗號是千分位還是本題不支援的其他分隔慣例？），而修資料是 Day08 `csv-doctor` 的職責，不是這裡。

聚合語意（**全部寫死**）：

| Aggregate | 定義 | 全組皆不可解析時 |
|---|---|---|
| `COUNT` | 該組的**列數**，與 Measure 欄無關，永遠可計算 | 不適用 |
| `SUM` | 只加總可解析的格 | 顯示 `—`，**不顯示 0**（0 是有意義的數值，不能拿來代表「沒得算」） |
| `AVG` | 可解析格之和除以**可解析格數**（分母不是總列數） | `—` |
| `MIN` / `MAX` | 只在可解析格中取 | `—` |

「有 N 筆無法計算」的 UI 呈現，**三個層級都要有，缺一不可**：

1. **每一組**：Pivot Table 多一欄「無法計算」，填該組 `nonNumeric` 計數；大於 0 時該儲存格加底色
2. **全體**：KPI Card 一張「無法計算 63 筆（已排除）」
3. **匯出**：彙總 CSV 保留「無法計算」欄；Dashboard HTML 快照保留該欄與該 KPI Card

### C3 空值在 Group By 的行為：**自成一組，不排除**

- 依契約 3.2 節，空值等於空字串 `''`，沒有 `null`
- 空字串鍵**自成一組**，Pivot Table 顯示為 `(空值)`，並加 `.is-empty-key` 樣式，與資料裡真的長成 `(空值)` 這四個字的組**視覺可區分**
- **不排除**的理由：排除會讓「群組總和」對不上「全體總和」，使用者發現不了差額從哪來。這與契約第 2 節「不做貼心修正」同源
- **不加「排除空值群組」開關**（PRD 未列，共通開發規則第 3 條）；要排除請用 Filter 的「非空」條件
- **只有空白的格（`'  '`）不 trim，自成獨立群組鍵。** 依契約 3.2 節它不算空值，而是 Day08 要偵測的問題；在這裡 trim 掉會把資料問題藏起來

### C4 多欄 Group By 的呈現：**扁平化，不做巢狀表格**

- **Dimension 上限 2 欄**（MVP 界線，見爭議點第 4 條）
- Pivot Table 每個 Dimension **各佔一欄**（不是把 `教育處｜北區` 塞成一格），後面才是 Measure 欄與「無法計算」欄
- 內部組合鍵：`d1 + '\0' + d2`，用 NUL 當分隔符，因為 CSV 的格內容不可能含 NUL，可避免 `A|B` 加 `C` 與 `A` 加 `B|C` 撞鍵
- 排序預設見 C6 管線第 3 步
- 圖表 X 軸標籤用 `d1 / d2` 組合字串（顯示用，非鍵值），再走 B3 的截斷／旋轉／抽稀流程
- **不做小計列、不做總計列、不做行列交叉表**（PRD 10 不做欄第一項：完整複製 Excel Pivot 全部功能，`VibeCoding/2026-ironman-vibecoding-30-prd.md:330`）
- 群組數 > **200** 時：**表格照列（受 500 列上限）、圖表不繪製**，顯示「群組數 200 以上，圖表不繪製。請加 Filter 或改用 Top N。」上千根 bar 既不可讀也會拖慢重繪

### C5 日期分組

**不使用 `new Date(字串)` 解析**：`new Date('2026/1/2')` 的行為隨瀏覽器地區與時區而變，同一份檔案在不同機器分到不同月份，是最難察覺的錯。改用契約 4.0b 定義、由 `csv-infra` 提供的**唯一擷取函式** `dateParts(s)`（回傳 `{ y, m, d }`，`m`／`d` 缺項為 `null`，不符白名單則整體回傳 `null`）：每一格在分組時**只呼叫一次 `dateParts()`**，不另呼叫 `isDateLike()` 分兩步判斷、**不自寫 regex 或自行 capture**。回傳 `null` 者歸入「(無法辨識日期)」；回傳非 `null` 但 `m === null`（只剩年）者只能做年分組，選了季或月粒度則歸入「(僅有年份)」；`m` 非 `null` 時季由 `Q = ceil(m/3)` 推導。`inferColumnTypes()` 的 `kind === 'date'` 只用於推薦「日期粒度」下拉的預設可用性，實際分組解析仍對每一格重跑一次 `dateParts()`（因為 `kind` 是整欄層級的推論，分組要看到「這一格」）。

- 可得粒度由 `dateParts()` 的回傳決定：`m` 非 `null` 者可得年／季／月；`m` 為 `null`（只剩 `y`）者僅得年。何種原始樣式對應哪種結果由契約 4.0b 定義，本題不重複列舉
- 年／月／日**直接取自 `dateParts()` 的回傳值，本題不自行 regex／capture、不另做二次範圍驗證**（不驗年份範圍、不驗月日範圍、不驗每月實際天數——例如 2 月 30 日照樣歸進 2 月），**`m`／`d` 為 `null` 時不得用 0 或 1 補**（那會把「2026 年」變成「2026-01-01」，在趨勢圖上憑空長出不存在的日期）。合法性判準只有契約 4.0b 的白名單一份，本題不重複定義，日期正確性是 Day08 的職責，不是本題
- **含時間部分的字串（例如 `2026-08-23 10:00:00`）不做截斷處理**：4.0b 白名單所列樣式皆不含時間部分，這類字串本來就不符合白名單，直接視為不符合，和其他格式不符的格一樣歸入下方「(無法辨識日期)」群組，不特別解析
- **民國年不支援**（`115/08/23` 認不出）。理由：`115` 與西元 `0115` 無法從字面區分，猜測會出錯；明說不支援比猜錯好。見爭議點第 7 條
- 分組標籤：年 `2026`；季 `2026-Q3`（`Q = ceil(m / 3)`）；月 `2026-08`（月份補零，確保字典序等於時序）
- **認不出來的格歸入 `(無法辨識日期)` 群組，不丟棄**，並在 KPI 區顯示該組筆數。理由同 C3：總計要對得上
- **只解析到年、卻選了季或月粒度的格，歸入 `(僅有年份)` 群組**，與「無法辨識」分開。兩者原因不同，混在一起使用者無從判斷該修什麼
- 日期粒度下拉只在「Group By ① 選中的欄有至少 1 格通過白名單」時啟用；否則 disabled 並顯示「此欄無可辨識的日期」

### C6 管線順序（**寫死，不可調整**）

順序不同結果不同，所以固定為：

```
1. Filter               作用於原始「列」
2. Group By + Aggregate 產生「群組列」
3. Sort                 作用於群組結果
4. Top N / Bottom N     作用於已排序的群組結果
5. 渲染                 Pivot Table 與圖表用第 4 步結果；KPI 用第 2 步結果
```

- **Filter 在最前面**：先篩再算，才符合「這份資料裡我只看某某」的直覺。先算再篩的話，被篩掉的列已經混進 SUM 裡，數字是錯的
- **Sort 在 Top N 之前**：Top N 的定義就是「排序後取前 N」，順序反過來沒有意義
- **Bottom N 等於取排序後的最後 N 筆**，並**維持當前排序方向顯示**（降冪排序取 Bottom 5，畫面上仍是由大到小的那 5 個最小值），不做二次反轉。反轉會讓使用者以為排序方向被偷改了
- Sort 預設：**Measure 值降冪**；第二排序鍵固定為 Dimension 組合鍵的字典序（`localeCompare('zh-Hant')`），確保值相同時**每次重算順序一致**，不依賴引擎的 sort 穩定性
- Sort 可選欄位：任一 Dimension 欄、Measure 聚合值、筆數。值為 `—`（全組不可計算）者**不參與大小比較，升冪降冪一律沉底**
- **KPI Cards 用第 2 步（Filter 後、Top N 前）的完整結果**，卡片標題固定加註「Filter 後全體，不受 Top N 影響」。若 KPI 跟著 Top N 走，使用者選 Top 5 就會看到「總計」暴跌，那是誤導
- Filter MVP 範圍（**不擴充**）：最多 3 條，一律 AND；運算子為 `包含`／`不包含`／`等於`／`不等於`／`大於`／`小於`／`非空`。`大於`／`小於` 用 C2 的 `toNumber()`，**不可解析的格一律不通過**（既不是通過也不是報錯）
- 匯出的彙總 CSV 等於**第 4 步之後的結果**（所見即所得），用 `toCsv()`，`opts.bom` 用預設 `true`（契約 4.2）；**不在 CSV 裡加註解行**（會破壞 CSV 結構）

---

## D. 效能

契約第 5 節的門檻已管住輸入端（< 5 MB 直接處理；5–20 MB 先提示；> 20 MB 拒絕）。本節處理的是**門檻內、但重算很頻繁**的場景：20 MB 上限下約 15 萬列乘十餘欄，每動一次下拉就要重跑一次管線。

### D1 互動模式：**即時**（已裁示採納，見爭議點第 3 條）

`CONTRACT.md` 第 5 節規定「即時 vs 按鈕觸發**不可混用**」，且各題依 PRD 驗收條件決定。PRD 10 驗收條件第 2 條字面寫著「**Group By 或 Aggregate 改變時圖表同步更新**」（`VibeCoding/2026-ironman-vibecoding-30-prd.md:334`），這是明文要求即時。

因此本題選**即時**，具體是：

- Dimension／Measure／Aggregate／日期粒度／圖表型別／Sort 這些**下拉**：`change` 事件直接重算（一次操作等於一次重算，本來就不會連發）
- Filter 的文字輸入、Top N 的數字輸入：`debounce(fn, 150)`（`shared/ui-debounce.js`）
- **debounce 仍屬即時模式**，與 Day01 `text-health-check`、Day02 `ai-text-cleaner` 的做法一致（`CONTRACT.md` 第 5 節表格），**不算混用**
- **不加「套用」按鈕**

### D2 「改一個下拉就凍住三秒」的具體防線

| 手段 | 做法 | 消滅的成本 |
|---|---|---|
| 數值欄快取 | Measure 欄第一次數值化後，把結果存成 `Float64Array(列數)` 加 `Uint8Array(列數)` 的 `isValid` 旗標。**切 Group By／Aggregate／Sort／Top N 都不重新解析**，只有換 Measure 欄才重建 | `toNumber()` 的 regex 測試（最貴的一環）從「每次重算 15 萬次」降為「換欄才 15 萬次」 |
| Filter 結果快取 | Filter 條件未變時重用上一輪算出的 `passIndex`（`Int32Array` 的列索引清單） | 一趟全表掃描 |
| 單趟分組 | 用一個 `Map<string, Acc>` 一次掃過 `passIndex`，同一趟內就把 sum／count／min／max／nonNumeric 全部累加完。**不為每種 aggregate 各掃一次** | (aggregate 種類減 1) 趟掃描 |
| 一次性 DOM 寫入 | Pivot Table 與 SVG 都先在記憶體裡拼成字串（陣列 `push` 加 `join('')`，不用 `+=`），最後各 `innerHTML` 一次 | 數百到數千次 reflow |
| 渲染上限 | Pivot Table 最多渲染 **500 列**，超過顯示「僅顯示前 500 列，完整結果請下載彙總 CSV」（**匯出不受此限**）；圖表群組數上限 **200**（C4） | DOM 節點數量從無上限降為常數級 |

### D3 可驗收的效能承諾

不寫「不會卡」，寫可測數字（進 `tasks.md` 第 5 條驗收條件）：

- 測資：程式產生 **50,000 列 × 6 欄** 的 CSV（含日期欄、數值欄、20 個 unique 單位、3% 的格為非數值髒值）
- 量測：在 Chrome DevTools Performance 錄一次「切換 Group By ② 從（無）改為第二個 Dimension」，記錄 `change` 事件到最後一次 paint 的耗時
- **通過門檻：小於 500 ms（未實測的目標值，非已知事實）**，實測數字寫進 `logs/`
- 若實測超過 500 ms：**停下回報**（共通開發規則第 4 條），由使用者裁示是否改為「套用」按鈕，**不自行改互動模式**

---

## 爭議點清單（**已由使用者裁示**，見 `sdd/LEVEL1B_RULINGS.md`）

| # | 爭議點 | 裁示 | 影響 |
|---|---|---|---|
| 1 | **A 節：匯出 Dashboard 是靜態快照（A1）還是可互動副本（A2）** | **A1 靜態快照** | 不含 JS、不夾帶原始資料集 |
| 2 | **是否拆成上下兩個發文日** | **拆**（見下方專節） | 全系列順延 1 天（34 到 35 天），Day13 起全部後移 |
| 3 | **互動模式：即時（debounce）還是加「套用」按鈕** | **即時**（PRD 10 驗收條件第 2 條字面要求「同步更新」） | 已採納 |
| 4 | **Dimension 上限 2 欄** | **上限 2**（已裁示採納） | PRD 只寫「多欄」未定數；3 欄以上組合爆炸且圖表無法表達 |
| 5 | **Pie 合併門檻：類別數 >= 10 時取前 8 加「其他」** | **維持 8**（契約 7.4b 已採本題原訂法） | 門檻已定死，Day13 不得另訂 |
| 6 | **渲染上限：表格 500 列、圖表 200 組** | **維持**（已裁示採納） | 數字已定死；上限本身不可取消 |
| 7 | **民國年日期不支援** | **不支援**（已裁示採納） | `115` 與 `0115` 無法從字面區分，猜測會出錯 |
| 8 | **`toNumber()` 不接受貨幣／百分比／括號負數** | **不接受**（已裁示採納，寫入契約 4.0b） | 這些資料在本題會顯示為「無法計算」；修資料是 Day08 的職責 |

## 是否拆篇：**使用者已裁示拆**（爭議點第 2 條詳述）

### 為什麼放不進單日

依 `tasks.md` 規則（`VibeCoding/2026-ironman-vibecoding-30-prd.md:18`，共通開發規則第 9 條）：每條 1 小時內、整份不超過 10 條，單日上限約 10 小時的工作量。本題的實際內容：

- **樞紐引擎**：型態推薦與覆寫、數值解析、5 種 aggregate 的無法計算語意、單／雙欄 Group By、空值群組、日期白名單三粒度、Filter/Sort/TopN 四段管線、KPI 兩種口徑——已經是 5 條的量
- **`shared/ui-chart-svg.js`**：契約 7.4 節**明文列舉**座標映射、軸刻度取整、標籤重疊、色盤、四種退化情形「必須當成獨立任務」，加上 Bar／Line／Pie 三型——至少 3 到 4 條
- **兩個相反的產物**：匯出 Dashboard HTML（含資料）與 `buildCleanHtmlCopy()`（清空資料），各自有相反的資安驗收——2 條
- **效能**：快取層加 5 萬列實測——併入引擎的渲染條

單日塞不下（見 `tasks.md`）：拆成兩階段後，Phase A 5 條、Phase B 6 條，**第 3、7、8、10 條的密度仍明顯超過 1 小時**，硬塞進單日會讓每條都超時，違反規則第 9 條的精神；偷偷放寬單日上限則違反字面。兩條路都不對，所以提出拆篇。

⚠️ 整份 `tasks.md` 共 **11 條**，超過共通開發規則第 9 條字面的單份 10 條上限——本題已由使用者裁示拆成 Day11／Day12 兩個發文日，以「兩個發文日各 ≤10 條」衡量（Phase A 5 條、Phase B 6 條）並未超標，且契約第 7.4 節明文規定 B5 四種退化情形須獨立成 task，不得併入渲染任務。裁示與理由見 `sdd/LEVEL1B_RULINGS.md` 第 4 節第 13 條，**這是本題專屬例外，其餘五題維持 ≤10 條**。

### 拆點：**任務 1–5 為上篇、任務 6–11 為下篇**

| 階段 | 任務 | 發文日 | 範圍 | 階段結束時可獨立展示 |
|---|---|---|---|---|
| Phase A | 1–5 | Day11（上篇） | 骨架、角色推薦、彙總引擎、Group By 與日期分組、管線順序、Pivot Table、KPI、效能 | **完全不含 SVG**：一個可用的「Excel 樞紐分析替代品」，有表格有 KPI，能匯出彙總 CSV |
| Phase B | 6–11 | Day12（下篇） | `shared/ui-chart-svg.js` 全部（基座、三型圖渲染、B5 四種退化情形各自獨立成 task）、匯出 Dashboard HTML、`buildCleanHtmlCopy()`、列印驗收 | 圖表上線，加兩個產物的匯出與資安驗收，以及列印不坍縮的驗證 |

**拆點選在「算對」與「畫對」之間**，理由：

1. **技術邊界乾淨**：Phase A 零 SVG，Phase B 全 SVG。沒有一條 task 需要跨階段
2. **敘事天然**：上篇「先把數字算對」（樞紐引擎與那堆邊界情形），下篇「再自己造圖表輪子」（為什麼不用 Chart.js、手寫 SVG 踩了哪些坑）。這正好是契約 7.4 節那段選型論述的最佳載體
3. **上篇可獨立交付**：Phase A 結束時產品本身就有用（表格加 KPI 加匯出 CSV），不是半成品
4. **與 Day05 前例一致**：`reversible-deidentifier` 也是產品一個、資料夾一個（只有 `Day05_...`）、對應兩篇文章（`CONTRACT.md` 第 5 節末段）

### 拆篇的代價（已裁示接受）

- 產品仍是一個，**資料夾只有 `VibeCoding/Day11_csv-pivot-dashboard/` 一個**，不另建 `Day12_...`
- 原 Day12 `csv-one-page-report` 順延為 **Day13**，Level 1c 起全部後移一天，系列總長 **34 到 35 天**（已完成：`README.md` 已更新並通過 `mmdc` 驗證，`CSV_CONTRACT.md` 第 6 節對照表已更新）
- `shared/ui-chart-svg.js` 在 Phase B（Day12）結束時完成，仍早於順延後的 `csv-one-page-report`（Day13），**不影響其依賴**（契約 6.2 節的前提成立）

---

## PRD 驗收條件對應到 task

| PRD 10 驗收條件 | 對應 task |
|---|---|
| 情境：「單位 + 金額 SUM」能得到每單位總額（`VibeCoding/2026-ironman-vibecoding-30-prd.md:333`） | **task 2**（SUM 語意與非數值格）、**task 3**（Group By）、**task 5**（Pivot Table 呈現） |
| 情境：Group By 或 Aggregate 改變時圖表同步更新（`VibeCoding/2026-ironman-vibecoding-30-prd.md:334`） | **task 4**（管線與即時重算）、**task 7**（Bar／Line／Pie 繪製）、**task 5**（效能實測，證明「同步」不是三秒後） |
| 情境：匯出的 Dashboard HTML 離線仍能觀看（`VibeCoding/2026-ironman-vibecoding-30-prd.md:335`） | **task 9**（靜態快照，含斷網開啟驗收） |

## 影響範圍

### 新增檔案

- `VibeCoding/Day11_csv-pivot-dashboard/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day11_csv-pivot-dashboard/src/bundle.json`（資源清單：Papa Parse 為 ASSET，需 license 字串）
- `VibeCoding/Day11_csv-pivot-dashboard/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day11_csv-pivot-dashboard/bundle_manifest.json`（build 產物）
- `VibeCoding/Day11_csv-pivot-dashboard/PRD.md`
- **`VibeCoding/shared/ui-chart-svg.js`**（本題建立，依 `CSV_CONTRACT.md` 第 6.2 節；Day13 `csv-one-page-report` 會直接引用）
- `sdd/csv-pivot-dashboard/proposal.md`（本檔）、`sdd/csv-pivot-dashboard/tasks.md`

### 修改檔案（收尾階段才動，**不在 tasks 內**）

- `VibeCoding/README.md`（Level 1b 進度欄；拆篇後的 Level 1b／1c 全表順延已完成，本題只需在完工時打勾）
- `VibeCoding/index.html`（作品集清單新增項目）
- `VibeCoding/PROGRESS.md`（階段狀態）
- `VibeCoding/shared/CSV_CONTRACT.md` 第 6 節表格（`ui-chart-svg.js` 由「規劃」改為「已建立」）。僅在本題完成後標註，**不改變任何簽名**

### 不修改

- `VibeCoding/shared/csv-decode.js`／`csv-parse.js`／`csv-write.js`／`csv-types.js`（前置工程 `sdd/csv-infra/` 建立，依 `CSV_CONTRACT.md` 第 6.1 節，本題**直接假設已就緒**，不含建立 CSV parser 之類的任務）
- `VibeCoding/shared/io-zip.js`（本題不需要 ZIP）
- `VibeCoding/shared/CONTRACT.md`、其餘 `shared/*.js`、`scripts/bundle.py`（遵守既有簽名，不變動）

### Library / API

- **CSV 解析**：內嵌 Papa Parse 5.6.0（MIT），透過 `shared/csv-parse.js` 使用，本題不直接呼叫 `Papa`
- **圖表**：**無 library，手寫 SVG**（`CSV_CONTRACT.md` 第 7.4 節）
- 無 API 呼叫、無 AI、無外部網路請求，全程 browser-side
