# CSV 資料層契約（Level 1b，Day08–12）

> 這是 Level 1b 五題（`csv-doctor` / `csv-period-diff` / `csv-batch-splitter` /
> `csv-pivot-dashboard` / `csv-one-page-report`）**必須遵守**的共用資料層。
> 本檔是 `shared/CONTRACT.md` 的延伸，不取代它——共用模組介面、`bundle.py`
> 用法、`buildCleanHtmlCopy()` 硬性要求、Level 1 共通 UI 基線，一律仍以該檔為準。
>
> **選型結論（parser／ZIP／圖表）在第 7 節，由偵查報告決定，未定案前不得開工。**

---

## 1. 為什麼 Level 1b 要先定契約，而 Level 1a 不用

Level 1a 六個產品彼此獨立：`text-health-check` 不需要知道 `text-diff` 怎麼切字串。
共用的只有 UI 樣板（toast、下載、拖放），介面小、變動少。

Level 1b 不一樣：**五題吃同一份資料**。CSV 進來變成什麼形狀，決定了後面四題所有邏輯的寫法。
如果 Day08 的 parser 把空字串當 `null`、Day09 的當空字串，兩題對「這格有沒有值」的判定就會不一致，
而這種不一致只有在跨題比對時才會現形——正是 Level 1a 驗收時反覆抓到的那類問題。

所以：**先定資料層，再讓五題的提案都以它為準。**

---

## 2. 核心原則：parser 不做任何「貼心」的修正

這是本契約最重要的一條，其餘規定都是它的推論。

`csv-doctor`（Day08）的產品價值，就是把資料裡的髒東西**找出來給人看**：
欄名重複、欄數不一致、數值欄混入文字、前後空白、全半形混用。

**如果 parser 自作主張把這些修好了，Day08 就沒有東西可以偵測。**

常見 CSV library 的預設行為（自動改重複欄名為 `name_1`、自動補齊短列、
自動 trim、自動把 `"123"` 轉成數字）在一般情境是優點，在這裡**全部是缺陷**。

因此本層的 parser 一律：**忠實還原，不修正，不猜測，不轉型。**
所有「修正」都是上層的事，而且必須是使用者明確按下按鈕才發生（PRD 08 驗收條件：
「真正刪除前要先預覽受影響筆數」）。

---

## 3. 資料模型（五題共用，不得各自變形）

```js
// Table —— 唯一的表格表示法
{
  headers: string[],   // 欄名，原樣保留。重複欄名不改名、不去重
  rows: Row[],         // 資料列
  meta: TableMeta
}

// Row
{
  line: number,        // 原始檔案行號（1-based，header 算第 1 行）
  cells: string[]      // 一律 string。空格保留，前後空白保留
}

// TableMeta
{
  encoding: string,        // 'utf-8' | 'big5' | ...，實際用來解碼的編碼
  hadBom: boolean,         // 原始位元組是否帶 BOM
  lineEnding: string,      // 'crlf' | 'lf' | 'mixed'（統計原始文字裡的所有換行，
                           //   **含引號內換行**，僅供資訊，見 3.3）
  delimiter: string,       // ',' | '\t' | ';'
  headerCount: number,     // headers.length，方便比對
  raggedRows: number[]     // 欄數 !== headerCount 的列，其 line 值清單
}
```

### 3.1 四條不可協商的規則

| 規則 | 為什麼 |
|---|---|
| **每一格都是 `string`，永不轉型** | Day08 要抓「數值欄混入文字」。轉型後 `"abc"` 變 `NaN`，跟真正的空值分不出來 |
| **欄數不一致的列不丟棄、不補齊** | 這正是 Day08 的健檢項目。原樣保留，把行號記進 `meta.raggedRows`。⚠️ **檔案中間的空白列不算 ragged**（它的 `cells` 是 `['']`、長度 1，但它是「空白列」這個獨立的健檢項目，不是「欄數不一致」）。混在一起會讓 Day08 的欄數訊號被空行噪音淹掉 |
| **重複欄名不自動改名** | 這正是 Day08 的健檢項目。改成 `email_1` 就等於把問題藏起來 |
| **`line` 是原始檔案行號，不是列序** | PRD 08 要求「顯示重複次數與原始列號」。**引號內含換行時，一列會跨多行**，所以列序 ≠ 行號，必須各記各的 |

### 3.2 空值的唯一定義

**空值 = 空字串 `''`。沒有 `null`、沒有 `undefined`。**

`a,,b` 的中間格是 `''`；`a,"",b` 的中間格也是 `''`。
CSV 格式本身無法區分「空字串」與「無值」，所以本層不假裝做得到。

「只有空白的格」（`'  '`）**不算空值**，它是 Day08 要偵測的「前後空白」問題。
需要「視為空」的題目自行 `.trim()` 後判斷，但不得改寫 Table 內容。

### 3.3 `meta.lineEnding` 僅供資訊，不得當健檢訊號

它統計的是**原始文字裡所有的換行**，分不出「列與列之間的換行」與「引號內儲存格的換行」。
所以一份純 CRLF 的檔案，只要有任何一格內含 LF，就會被標成 `'mixed'`（實測）。

**Day08 不得把它當成「行尾不一致」的健檢項目**——那會對正常的多行儲存格檔案誤報。
真要做行尾健檢，得在 record separator 層級偵測，那超出本層範圍，目前不做。

### 3.2.1 ⚠️ 讀取儲存格一律用 `cellAt()`，禁止直接 `row.cells[i]`

2026-08-23 獨立驗收發現本契約的一個**內部矛盾**：
第 3.1 節說「短列不補齊」，第 3.2 節說「空值只有空字串」——
那麼短列缺的那一格讀出來是什麼？實測是 **`undefined`**，兩條規則在交界處對撞。

後果（實測）：
```js
parseCsv('a,b,c\n1,2\n').rows[0].cells      // ["1","2"]，length 2
  .cells[2]            // undefined
  .cells[2] === ''     // false  ← Day08 的空值判定會整批漏掉 ragged 列
  .cells[2].trim()     // TypeError，整頁掛掉
```

**裁示：`cells` 維持不補齊**（第 3.1 節不變，`length` 與 `raggedRows` 才誠實），
**但讀取一律透過共用取值函式**：

```js
// csv-parse.js
function cellAt(row, i)   // 索引超出範圍時回傳 ''，永不回傳 undefined
```

五題**不得直接寫 `row.cells[i]`**。要判斷「這一列有幾格」用 `row.cells.length`（那是真實欄數），
要取值一律 `cellAt(row, i)`。兩者用途不同，不要混。

---

## 4. 介面（簽名固定，不得各題自行變動）

```js
// csv-decode.js —— 位元組 → 文字
function decodeCsvBytes(arrayBuffer)
// → { text: string, encoding: string, hadBom: boolean, confidence: string }
// confidence: 'bom'（BOM 明示）| 'strict'（嚴格解碼判定）| 'fallback'（猜的）
//             | 'manual'（使用者手動指定，見 7.2 的逃生口）
// ⚠️ 'manual' 不由 decodeCsvBytes() 產生，是各題在使用者按下切換後自行標記的狀態。
//    Day08 與 Day09 各自獨立想出同一個名字，2026-08-23 追認為契約值，後續一律用它。

// csv-parse.js —— 文字 → Table
function parseCsv(text, opts)
// opts.delimiter 省略時自動偵測（見 4.1）
// opts.encoding / opts.hadBom：由 decodeCsvBytes() 的回傳值原樣傳入，
//   parseCsv 只是把它們放進 meta，不自己偵測編碼。省略時預設 'utf-8' / false
// ⚠️ 回傳的 meta **必須六欄齊全**（見第 3 節 TableMeta），缺一不可——
//   缺了 encoding／hadBom，五題就會各自發明一套傳遞方式

function cellAt(row, i)
// 取儲存格；索引超出範圍回 ''，永不回 undefined（見 3.2.1，五題一律用它）

// csv-write.js —— Table → 文字
function toCsv(table, opts)
// opts.bom 預設 true（見 4.2）
// opts.columns 省略時輸出全部欄

// csv-types.js —— 型別推論（Day08 / Day11 / Day12 用）
function inferColumnTypes(table)
// → ColumnType[]，每欄一個
// ColumnType: { kind: 'number'|'date'|'text', sampleSize, matched, mismatchLines }
```

```js
// csv-decode.js —— 檔案大小閘門（見第 5 節）
function checkCsvFileSize(byteLength)
// → { ok: boolean, level: 'ok'|'warn'|'reject', message: string }

// io-dropzone.js（擴充既有共用模組，非新增）
setupDropZone(dropEl, onData, opts)
setupFilePicker(inputEl, onData, opts)   // 同一組 opts，共用內部 handleFile
// opts.mode: 'bytes' → 用 readAsArrayBuffer，onData 收到 ArrayBuffer
// opts.mode 省略    → 維持原本 readAsText 行為，Day01–07 不受影響
// opts.gate(file)   → 選用。回傳 { ok, level, message }。
//                     在「開始讀檔之前」呼叫；!ok 就走 onError(message) 並且完全不讀檔
```

⚠️ **`gate` 必須在讀檔之前執行，這是設計要點不是實作細節。**
2026-08-23 複驗發現原本的寫法把閘門放在拿到 `ArrayBuffer` 之後——那等於閘門白設，
500 MB 的檔案照樣先整份讀進記憶體，正是第 5 節要防的無聲卡死。

CSV 五題一律這樣接（**不要自己寫大小判斷**）：
```js
var opts = { mode: 'bytes', accept: ['.csv'],
             gate: function (file) { return checkCsvFileSize(file.size); } };
setupDropZone(dropEl, onData, opts);
setupFilePicker(fileInput, onData, opts);   // 兩條路徑吃同一組 opts
```

`gate` 用回呼傳入、不讓 `io-dropzone.js` 直接依賴 `csv-decode.js`：
拖放模組是 Level 1 全系列共用的，不該為了 CSV 五題長出 CSV 的相依。

⚠️ **檔案選取 `<input type="file">` 也要走同一條路**。各題提案原本把它跟拖放分開處理，
那會讓閘門與編碼偵測只擋住拖放、選檔案就繞過去——所以本契約要求 `io-dropzone.js`
同時提供 `setupFilePicker()`，兩者共用同一個內部 `handleFile`，**不得各題自行接 input 事件**。

`inferColumnTypes()` **回報而不改寫**：它給出「這欄看起來是數值，但第 17、42 行不是」，
由上層決定要顯示成健檢問題（Day08）還是當作 Measure 候選（Day11）。
`mismatchLines` 就是 Day08 「數值欄混入文字」那條健檢的資料來源。

### 4.0b 型別判準：只在這裡定義一次

⚠️ **2026-08-23 補訂。** 跨題審查發現三題各自加了不同的二次門檻
（Day08「非空樣本 ≥3」、Day11「比例 ≥0.9」、Day12「只看 `kind`」），
而 `csv-infra` 根本沒定義 `kind` 怎麼判。結果會是**同一份 CSV 在三題顯示三種欄位型態**。

以下是唯一定義，由 `csv-infra` 實作在 `inferColumnTypes()` 裡。
**五題一律直接用回傳的 `kind`，不得再自加門檻、不得自寫判定。**

```
對每一欄：
  樣本 = 該欄所有「非空字串」的格（空字串不計入分母）
  若 樣本數 < 3          → kind = 'text'（樣本太少，不猜）
  若 可解析為數字的比例 ≥ 0.9 → kind = 'number'
  否則若 符合日期白名單的比例 ≥ 0.9 → kind = 'date'
  否則                    → kind = 'text'
  matched      = 符合該 kind 的格數
  sampleSize   = 樣本數
  mismatchLines = 樣本中「不符合該 kind」的格所在的 line（Day08 靠這個報「數值欄混入文字」）
```

**數字的認定**（`toNumber()`，由 `csv-infra` 提供，五題共用）：
先 trim，接受選用正負號、十進位小數、科學記號。
**不接受**千分位逗號、貨幣符號、百分比、會計式括號負數 `(123)`、全形數字。
不接受的一律視為非數字——**不要「聰明地」剝掉 `$` 或 `,`**，那違反第 2 節，
而且 Day08 的職責正是把這種欄位報給使用者看。

**非數字一律回傳 `NaN`**（2026-08-23 裁示，不是 `undefined`、不是 `null`）：
- `NaN` 是 JS 對「不是數字」的慣用表示，與 `parseFloat` 一致
- 檢查一律用 `Number.isNaN(v)`，**不要用 `v !== v` 或 `isNaN(v)`**
  （全域 `isNaN` 會先做型別轉換，`isNaN('')` 是 `false`，會把空字串當數字）
- 選 `NaN` 而不是 `undefined` 的理由：`undefined` 進到算術會安靜地變成 `undefined`，
  而 `NaN` 一路傳播下去仍是 `NaN`，比較容易在下游被發現

五題一律用共用的 `toNumber()`，**不得自行判斷「這格是不是數字」**。

**日期白名單**（`isDateLike()`，由 `csv-infra` 提供，五題共用）：

| 樣式 | 例 |
|---|---|
| `YYYY-MM-DD` | `2026-08-23` |
| `YYYY/MM/DD` | `2026/08/23` |
| `YYYY-M-D` / `YYYY/M/D`（不補零） | `2026-8-3` |
| `YYYYMMDD`（8 碼數字，且月日合法） | `20260823` |
| `YYYY-MM` / `YYYY/MM` | `2026-08` |
| `YYYY` 單獨四碼 | `2026` |

⚠️ **一律用 regex 白名單比對，禁止用 `new Date(字串)` 判斷**——
它會把 `"abc 2026"` 之類的東西解析成日期，各瀏覽器行為還不一致。
**不支援民國年**（`115/08/23`）：它與西元 `YYYY/MM/DD` 在格式上無法區分，
硬猜會把 2026 年的資料誤判成民國 2026 年。Day08 把它報成「日期格式異常」即可。

**日期的擷取也只定義一次**（2026-08-23 補訂）：

```js
// csv-types.js —— 與 isDateLike() 同一組，五題共用
function dateParts(s)
// → { y: number, m: number|null, d: number|null } ；不符合白名單則回傳 null
```

`isDateLike()` 只回答「是不是日期」，但 Day11 要做年／季／月分組、Day13 要做趨勢，
都需要把年月日拆出來。若各題自己寫一套 regex capture，
就會重演「三題三套規則」那個缺陷——只是這次藏在擷取而不是判定。

⚠️ **`dateParts()` 不做任何範圍驗證**（不檢查 `1900 ≤ y ≤ 2199`、`1 ≤ m ≤ 12` 之類）。
合法性的判準只有白名單一份：白名單過了就是日期，過不了 `dateParts()` 直接回 `null`。
在擷取層再加一道驗證，等於偷偷定義了第二套「什麼算日期」。

`YYYY-MM` 沒有日 → `d` 為 `null`；`YYYY` 沒有月日 → `m`、`d` 皆為 `null`。
呼叫端要自己處理 `null`，**不要用 0 或 1 補**（那會讓「2026 年」變成「2026-01-01」，
在趨勢圖上憑空長出一個不存在的日期）。

⚠️ **Day08 的「日期格式異常」不等於「不在白名單」**：
白名單是「這欄是不是日期欄」的判準；Day08 要報的是「這欄已判定為日期欄，
但**欄內混用多種樣式**」（例如同一欄同時有 `2026/01/05` 與 `2026-1-5`）。
兩者是不同的問題，Day08 的提案要分開寫。

### 4.0c 多欄組合鍵的分隔符

Day08（Group By 找重複）、Day09（多欄 Primary Key）、Day11（多欄 Group By）
都要把多欄的值串成一個組合鍵。**分隔符統一用 `\0`（U+0000）。**

理由：它不可能出現在 CSV 的儲存格內容裡（`csv-decode.js` 解碼出的文字若含 NUL，
該檔案本來就不是合法 CSV）。用 `-` 或 `|` 之類的可見字元，
「`A|B` + `C`」與「`A` + `B|C`」會產生同一個鍵，變成無聲的錯誤分組。

⚠️ 2026-08-23 跨題審查發現三題各用各的（Day08 與 Day09 用 `\x01`、Day11 用 `\0`），
其中 Day09 提案裡那個字元是**直接寫進檔案的實體控制字元**，肉眼與 grep 都看不出來。
統一為 `\0`，且提案與程式碼一律寫成**逃脫序列**，不得寫入實體控制字元。

### 4.1 分隔符偵測

只支援 `,`、`\t`、`;` 三種。偵測法：取前 10 個非空行，
比較各候選分隔符切出的欄數**穩定度**（眾數出現比例），取最高者。
無法判定時預設 `,`，並在 UI 顯示實際採用的分隔符讓使用者可改。

不做：自動偵測固定寬度、自動偵測多字元分隔符。

### 4.2 匯出：一律寫 UTF-8 BOM

`toCsv()` 的 `opts.bom` 預設 `true`。

**`opts.columns` 是欄「索引」陣列，不是欄名。** 因為第 3.1 節允許重複欄名，
用欄名定位在有重複欄名的檔案上無法唯一決定要哪一欄。
⚠️ **必須驗證**：非整數、負數、超出 `headerCount` 的索引一律**明確報錯中止**，
不得靜默產出 `undefined`——實測傳欄名進去會得到 `"undefined,undefined\r\n,\r\n,"`，
那是無聲的資料損毀，而且 Day10／Day13 一定會用到這個參數。

### 4.2a 匯出：試算表公式注入防護（2026-08-24 使用者裁示，見裁示 17）

`csvCell()` 在**同時滿足**下列三條時，於值前面加一個單引號 `'`：

1. 第一個字元是 `=`／`+`／`-`／`@`／TAB(0x09)／CR(0x0D) 之一
2. 字串長度 ≥ 2
3. `Number.isNaN(toNumber(text))` 為真（**不是我們認定的數字**）

⚠️ **第 3 條是重點，不可省略。** Papa Parse 自己的 `escapeFormulae` 預設 regex 是
`^[=+\-@\t\r].*$`，**會把 `-5.6` 逃脫成 `'-5.6`**——對一套主打 CSV 數值處理的工具，
那是把負數欄整欄變成文字：防掉一個中低風險，換來一個**必然發生**的資料損毀。
我們有唯一權威的 `toNumber()`（4.0b 節），正好用來區分「看起來像公式」與「就是個負數」。

⚠️ **第 2 條的理由**：單一字元構不成公式，而 `-` 單獨一格是中文報表常見的「無資料」標記。

**依賴**：`csv-write.js` 因此依賴 `csv-types.js` 的 `toNumber()`。
檢查放在**呼叫時**（`needsFormulaGuard()` 內）而非載入時，因為 `bundle.py` 內嵌 `csv-write`
的位置可能早於 `csv-types`；函式宣告會提升到全域，執行期呼叫不受內嵌順序影響。
五題的 `src/index.html` 都必須同時內嵌 `<!--{{SHARED:csv-types}}-->`。

**已知取捨（誠實記錄）**：被逃脫的格再匯入時會多一個 `'`，**不是位元組層級的往返一致**。
接受這個取捨，因為 §4.2 已明定「匯出的目的是給 Excel 開」；而會觸發逃脫的格
（非數字、且以公式字元開頭）在真實資料裡本來就罕見。

**`toCsv()` 不接受 `opts.delimiter`，輸出一律用 `,`。** 匯出的目的是給 Excel 開，
沿用來源檔的分號只會讓使用者拿到另一個難開的檔案。

**匯出一律補齊到 `headerCount`**（2026-08-23 裁示）：短列缺的欄補 `''`，
取值一律經 `cellAt()`。**有沒有傳 `columns` 都一樣**——
複驗發現原本 `columns` 模式會補、不傳則不補，同一份 table 兩種輸出，
那是「規格沒寫到就各做各的」的起點。

⚠️ **這不違反第 3.1 節**。3.1 管的是**解析出來的 Table 要忠實**（`length` 與 `raggedRows` 誠實，
Day08 才抓得到欄數不一致）；匯出是「產生一個新檔」這個不同的行為，
而欄數不齊的 CSV 本身就是壞檔，下游打不開。原始問題不會被藏起來——它在 `raggedRows` 裡。

理由：本系列使用者是 Office 場景。不帶 BOM 的 UTF-8 CSV 在 Windows 繁體中文
環境的 Excel 直接開啟會顯示亂碼——這是使用者最容易踩、也最難自己診斷的坑。
提供關閉選項（餵給其他程式時可能不要 BOM），但**預設打開**。

### 4.3 引號規則（RFC 4180）

`toCsv()` 對一格加引號，若且唯若該格含：分隔符、雙引號、CR 或 LF。
格內的 `"` 寫成 `""`。**不做**「所有格都加引號」或「數字不加引號」的變體。

---

## 5. 大檔案的行為（明文規定，不由各題自行決定）

CSV 可能很大，五題必須用同一套規則，否則同一份檔案在 Day08 能開、Day11 當掉。

| 門檻 | 行為 |
|---|---|
| < 5 MB | 直接處理，不提示 |
| 5–20 MB | 處理，但先顯示「檔案較大，處理可能需要數秒」 |
| > 20 MB | **拒絕並明確說明上限**，不要讓瀏覽器無聲卡死 |

門檻以**原始位元組**計（`File.size`），不是解碼後的字元數。

⚠️ **Day09 `csv-period-diff` 同時吃兩份檔案**：門檻是**單檔 ≤ 20 MB「且」兩檔合計 ≤ 20 MB**。
只擋單檔的話，兩份各 19 MB 都合法，但記憶體用量翻倍——這正是本節要防的無聲卡死。

⚠️ **閘門必須在讀檔之前**。既有的 `shared/io-dropzone.js:31` 直接呼叫 `readAsText(file)`，
沒有大小檢查、也寫死用 UTF-8 解碼——CSV 五題**不能沿用它的預設行為**，
否則編碼偵測（第 7.2 節）與本節的門檻都無處可掛。
解法是擴充該模組加 `mode: 'bytes'`（見第 4 節），**不是各題自己複製一份拖放邏輯**——
那正是 `CONTRACT.md` 第 1 節要防的 drift，而且會複製五份。

「拒絕」而不是「截斷」：截斷會產出看似正確、實則少資料的報告，
比明確失敗危險得多。這條與 `CONTRACT.md` 第 8 節「錯誤格式的輸入不得造成整頁崩潰」同源。

---

## 6. 模組歸屬（誰進 `shared/`）

> 欄位是**開發日次 Day**，不是 PRD 編號。對照（2026-08-23 拆篇後）：
> Day08=`csv-doctor`(PRD 08)、Day09=`csv-period-diff`(PRD 09)、**Day10=`csv-batch-splitter`(PRD 12)**、
> **Day11+Day12=`csv-pivot-dashboard`(PRD 10，上下篇)**、**Day13=`csv-one-page-report`(PRD 11)**。
> Day 與 PRD 編號不一致，`README.md` 的開發順序表才是權威。
> 下表的 Day11/12 合併為一欄（同一個產品）。

| 模組 | Day08 | Day09 | Day10 | Day11–12 | Day13 | 歸屬 |
|---|:--:|:--:|:--:|:--:|:--:|---|
| `csv-decode.js` | ✅ | ✅ | ✅ | ✅ | ✅ | `shared/` |
| `csv-parse.js` | ✅ | ✅ | ✅ | ✅ | ✅ | `shared/` |
| `csv-write.js` | ✅ | ✅ | ✅ | ✅ | ✅ | `shared/` |
| `csv-types.js` | ✅ | — | — | ✅ | ✅ | `shared/` |
| `io-zip.js`（包 fflate） | — | — | ✅ | — | — | `shared/`（Level 1c 的 Day13／Day18 也要用） |
| `ui-chart-svg.js` | — | — | — | ✅ | ✅ | `shared/`，但**由 Day12（pivot 下篇）建立**，見 6.2 |
| 列印版型 CSS | — | — | — | — | ✅ | Day12 自行實作，Day17 再考慮升級 |

判準沿用 `CONTRACT.md` 第 6 節末段：**出現第三題、且能歸納出共通形狀時才升級為共用**。
列印版型目前只有 Day12 一題，先各做各的。

### 6.1 前置工程 `sdd/csv-infra/`

`csv-decode.js`／`csv-parse.js`／`csv-write.js`／`csv-types.js`／`io-zip.js` 五個模組
**不屬於任何一題的產品範圍**，比照 Level 1a 的 `sdd/shared-infra/` 由獨立前置工程建立，
必須在 Day08 開工前完成並獨立驗收。各題的 `tasks.md` **不要**包含「建立 CSV parser」之類的任務。

敘事上算進 Day08 的文章（「先把地基打好」），工程上是獨立的一份 proposal／tasks。

### 6.2 `ui-chart-svg.js` 是例外：由 Day12（pivot 下篇）建立

圖表模組不放進前置工程，因為它不是「規格已定、照做即可」的基礎設施——
手寫 SVG 的邊界處理（軸刻度取整、標籤重疊、退化資料）需要邊做邊看實際資料才收斂得掉，
關在前置工程裡做等於閉門造車。

拆篇後 pivot 的下篇（Day12）就是專做圖表的一天，模組在該日建立。

但它**一開始就寫成 `shared/` 模組**（不是 pivot 自己一份、`csv-one-page-report` 再複製），
因為已經確定 Day13 要用。這是對 `CONTRACT.md`「第三題才升級」的**刻意例外**：
那條規則防的是「猜測未來會共用」，而這裡不是猜測，是已知。

---

## 7. 選型（已定案，2026-08-23）

三份偵查報告 + 指揮官獨立實測後定案。實測腳本與輸出見本節各小節。

| 用途 | 決定 | 版本／授權 | 體積 |
|---|---|---|---|
| CSV 解析 | **內嵌 Papa Parse** | 5.6.0 / MIT（2026-08-13 發布） | **18.1 KB**（上游 `papaparse.min.js`） |
| 編碼偵測 | **`TextDecoder` 嚴格解碼 + fallback** | 瀏覽器內建，無外部依賴 | 0 |
| ZIP 打包 | **內嵌 fflate** | **0.8.3** / UMD / MIT | 32.3 KB（`fflate.umd.js`） |
| 圖表 | **手寫 SVG，不引入 library** | — | 0 |

### 7.1 CSV 解析：Papa Parse 5.6.0，但必須包一層

實測確認 Papa 的預設行為**符合**第 2 節「不做貼心修正」原則——數字不轉型、前後空白保留、
重複欄名保留、短列不補齊、長列不截斷、空白列保留、引號內逗號與跳脫雙引號都正確。
`raw_js` 內嵌安全（原始碼不含 `</script`），純同步 `Papa.parse(字串)` 不觸發 Worker/XHR。

但 `parseCsv()` **不得直接把 Papa 的輸出當成 Table 回傳**，必須處理以下三件事：

⚠️ **用上游的 `papaparse.min.js`（18.1 KB），不是未壓縮的 `papaparse.js`（50.6 KB）。**
`bundle.py` 不做 minify，但那不代表非得內嵌未壓縮版——直接取上游已壓縮的發行檔即可。
本層要內嵌進**五題**，差額乘以 5 才是真正的代價。
✅ 已實測 min 版行為與未壓縮版一致：數字不轉型、前後空白保留、重複欄名保留，
以及 7.1c 的 `meta.cursor` 行號推導（含引號內換行的檔案，得 1／2／4，正確）。

實際檔案與雜湊記錄在 `shared/vendor/README.md`，`bundle_manifest.json` 也會帶 SHA-256。

**(a) 行尾必須先正規化，否則會無聲併列（實測）**

```
輸入   "a,b\r\n1,2\n3,4\r\n"        ← CRLF 與 LF 混用
Papa   [["a","b"],["1","2\n3","4"]]   ← 第 2、3 列被併成一列，errors 為空
```

Papa 先猜行尾是 `\r\n`，之後單獨的 `\n` 就被當成欄位內容。**不報錯**。
改用 `newline:'\n'` 更糟（`\r` 會留在欄位值裡變成 `"b\r"`）。

→ 正解：**先把 `\r\n` 與 `\r` 一律正規化為 `\n`，再交給 Papa。**
原始行尾型態記進 `meta.lineEnding`（`'crlf'`／`'lf'`／`'mixed'`），資訊不遺失。

⚠️ **這是一個有意識的取捨，不是疏漏**：若某個「引號內含換行」的儲存格原本用 CRLF，
正規化後會變成 LF，等於改動了資料內容。代價是真實的，但另一邊是**整列被無聲併掉**，
輕重懸殊。此行為要在 Day08 的 `tasks.md` 驗收條件裡明測，不能只寫在契約裡。

**(b) 尾端會多一列空列，必須丟掉**

檔案結尾的換行會讓 Papa 多吐一列 `[""]`。它不是資料、也不是第 3.1 節說的
「空白列」（那種在檔案中間、要保留給 Day08 偵測的才是）。
判定：**位於最後一列、且只有一格、且該格為空** → 丟棄。其餘位置的空列一律保留。

**(b2) 開頭的 U+FEFF 必須先剝掉，否則行號全部少 1**

Papa 內部會剝掉 BOM，但 `meta.cursor` 是對「已剝 BOM」的字串計位移；
若拿它去切**未剝 BOM** 的原字串，位移差 1 個字元，導致行號整體少 1（實測）：

```
parseCsv('\ufeffa,b\n1,2\n3,4\n')  → line [1,2]，應為 [2,3]
```

`decodeCsvBytes()` 已經剝過，正常路徑不會觸發——但 `parseCsv()` 是公開介面，
**單獨呼叫時錯得無聲**。所以 `parseCsv()` 自己也要剝一次，並據此設 `meta.hadBom`。

**(b3) 全域依賴要有存在性檢查**

`csv-parse.js` 依賴全域 `Papa`、`io-zip.js` 依賴全域 `fflate`，都由 `bundle.py` 內嵌。
若 `bundle.json` 的順序錯了，這兩個模組會在**使用者拖檔的當下**才炸，而且訊息難懂。
兩者都要在檔案開頭檢查依賴是否存在，不存在就拋出說得清楚的錯誤。

**(c) 行號要自己算**

Papa 回傳純陣列，沒有行號。用 `step` callback 的 `res.meta.cursor`（該列結束的字元位移），
對 `text.slice(前一個 cursor, 本次 cursor)` 數換行數累加。
實測含「引號內換行」的檔案，行號為 1／2／4，正確（第 2 列佔第 2、3 行）。

### 7.2 編碼偵測

順序：**BOM 明示 → UTF-8 嚴格解碼 → Big5 fallback**。

1. 檔頭有 UTF-8 BOM → `utf-8`，`confidence: 'bom'`
2. `new TextDecoder('utf-8', { fatal: true })` 解碼成功 → `utf-8`，`confidence: 'strict'`
3. 解碼拋錯 → 改用 `new TextDecoder('big5')`，`confidence: 'fallback'`

`big5` 是 WHATWG Encoding Standard 明列的必備 legacy 編碼。
✅ **已實機驗證（2026-08-23，Chromium 151）**：`new TextDecoder('big5')` 可用不拋錯；
四種測資（UTF-8 帶／不帶 BOM、Big5、含「許功蓋」「賈鍵」等經典易混淆字的 Big5）
判定結果全部符合預期。含混淆字的 Big5 檔**沒有**被 `fatal:true` 誤判成功
（正確拋 `The encoded data was not valid.` 並 fallback）。
⚠️ 只測過 Chromium，未涵蓋 Firefox／WebKit。

⚠️ 第 3 步是**猜的**，所以 `confidence` 要一路傳到 UI：
`'fallback'` 時必須顯示「偵測為 Big5，若顯示為亂碼請手動切換編碼」並提供手動切換。
**誤判風險已量化（2026-08-23 實測）**：窮舉全部 13,710 個合法 Big5 雙位元組，
其中 **899 個（6.56%）恰好也是合法 UTF-8**——這是「單一中文字」這種極短字串的風險上限。
但用 2–8 字的常見繁體字組合隨機抽樣 20,000 次，**誤判 0 筆**：
字數一多，位元組序列要同時滿足兩套編碼規則的機率就塌下去了。

結論：實務上 CSV 至少有一整欄的字，誤判機率趨近於零；
殘餘風險由手動切換逃生口涵蓋即可，**不需要再加更複雜的偵測演算法**。

### 7.3 ZIP：fflate

- jszip **已近四年未發版**，不選
- client-zip 體積最小（6.5 KB）但是純 ESM、無 UMD，塞不進 `bundle.py` 的 `raw_js` 機制
- 自寫 store-only writer 約 80–150 行，體積更小，但要自負 CRC32 與 ZIP 結構的維護風險；
  fflate 只多 33 KB 就免掉這個風險，且順帶有壓縮（CSV 壓縮率很好）

**中文檔名**：✅ **已實機驗證（2026-08-23，fflate 0.8.3）**。
位元組層級確認：6 個非 ASCII 檔名的 local file header 全部設了 EFS bit
（general purpose bit flag `0x0800`，bit 11 = 1）；純 ASCII 檔名不設（`0x0000`），屬正常。
解壓後檔名 UTF-8 位元組比對 6/6 完全一致，BMP 外字元（`𠮷`）正常。

⚠️⚠️ **驗收工具的陷阱（會造成假性失敗，Day10 務必注意）**：
**macOS 內建的 `unzip` 不支援 EFS/UTF-8 flag**（Info-ZIP 6.00，2009 年 Apple 修改版）。
即使 locale 是 `zh_TW.UTF-8`，`unzip -l` 顯示亂碼、`unzip -d` 直接報
`Illegal byte sequence` 全部失敗——**但 ZIP 檔本身是正確的**。

→ 驗證中文檔名 zip **不要用系統內建 `unzip`／`zipinfo`**，改用以下任一：
`ditto -x -k`（Finder 雙擊解壓縮走的就是這條路徑，最接近使用者實際情境）、
`bsdtar -xf`、或 Python `zipfile`。三者實測皆正確。

這跟 Level 1a Day05 的 D-2 是同一類缺陷：**驗收條件本身不可能通過**，
而失敗的是驗證工具、不是產品。

### 7.4 圖表：手寫 SVG

決定性理由是**「內嵌兩次」**：Day11 匯出的 dashboard HTML 要能離線觀看（PRD 10 驗收條件），
等於圖表能力得跟著產物走一份。`bundle.py` 不做 minify，所以：

| 方案 | 工具本體 | 匯出產物 | 合計 |
|---|---|---|---|
| Chart.js 4.5.1 | 208 KB | 208 KB | **417 KB** |
| uPlot | 51 KB | 51 KB | 102 KB（但 Pie 支援弱） |
| 手寫 SVG | ~0 | ~0 | **0** |

需求只有 Bar／Line／Pie 三種、資料點數十到數百、不需要動畫與互動 tooltip。
為此背 417 KB 不成比例。

⚠️ **手寫 SVG 的成本是真的**，Day11 的 `tasks.md` 必須把這些邊界當成獨立任務，不能塞在「畫圖表」一條裡：
座標映射、軸刻度取整（不要出現 `0, 3.33, 6.67`）、標籤重疊、色盤、
以及**無資料／單一資料點／全部為零／含負值**四種退化情形。
偵查報告對手寫 SVG 的體積是**推測值**（沒有實際寫程式），若 Day11 做完發現遠超預期，
Day12 再評估是否改用 uPlot——但不要在 Day11 中途換方案。

### 7.4b `ui-chart-svg.js` 的硬性要求（2026-08-23 補訂）

跨題審查發現 Day12 對圖表模組提的六項需求，Day11 的提案只涵蓋一項，
且第一項正面衝突：Day11 打算用 CSS 百分比控制 SVG 尺寸，Day12 要求明確的
`width`/`height` 屬性。**這個衝突若不現在解，Day12 做 A4 列印時圖表會在 Chrome 坍縮成 0×0，
屆時只能 fork 模組**——那就等於白做共用。

以下是 `ui-chart-svg.js` 的硬性要求，Day11 實作時必須全部滿足：

1. **每個 `<svg>` 必須同時有 `width`、`height` 屬性與 `viewBox`**，不得只靠 CSS 百分比控制尺寸
2. **必須支援「指定固定像素尺寸」的呼叫方式**（Day12 列印用），不是只有自適應容器一種模式
3. **填色一律用 SVG `fill` 屬性，不用外部 CSS class**——列印時瀏覽器預設會拿掉背景色（`print-color-adjust`），
   用 class 上色會在列印時整片消失
4. **類別標籤過長要有截斷機制**，且截斷規則由模組決定、不由呼叫端各自處理
5. **色盤要能指定某一類別為中性色**（給「其他」用）
6. 水平長條圖是加分項，非必需

**Pie 的類別合併門檻統一為**：類別數 ≤ 9 全畫；≥ 10 取前 8 名 + 灰色「其他」。
（審查發現 Day11 訂 ≤9 全畫、Day12 訂固定前 8，同一個模組兩種答案。採 Day11 版：
正好 9 個時不合併，否則「其他」只含 1 類，沒有意義。）

⚠️ **pivot 下篇（Day12）的 `tasks.md` 必須包含一條列印驗收**（用 Playwright 產 PDF，確認圖表未坍縮），
不能等到 Day13 才發現。模組是 Day12 建的，列印壞掉就是 Day12 的缺陷。

### 7.5 偵查報告的未驗證項（開工時要補）

這些是偵查明確標示「未驗證」的部分，**不可當成已確認的事實引用**：

- ~~`TextDecoder('big5')` 未在真實瀏覽器實測~~ ✅ **已於 2026-08-23 在 Chromium 151 實測完成**（見 7.2 節）。仍未涵蓋 Firefox／WebKit
- ~~中文檔名 zip 未做實機解壓驗證~~ ✅ **已於 2026-08-23 完成**（見 7.3 節，含 EFS bit 位元組證據與 macOS `unzip` 陷阱）。**Windows 內建解壓縮行為仍未驗證**（本機為 macOS），不得聲稱已驗證；NFC/NFD 正規化差異亦未覆蓋（本次字元集未觸發）
- Chart.js 是否零外部網路呼叫未逐行審查（已不採用，不影響）
- ~~UTF-8／Big5 誤判率未統計實測~~ ✅ **已量化**：單字上限 6.56%，2–8 字抽樣 20,000 次誤判 0 筆（見 7.2 節）

## 8. 跨題一致性檢查（Level 1b 收尾時必做）

Level 1a 的教訓：六個 agent 平行寫提案，跨題驗收才抓到不一致。
本層的風險更高（共用資料模型），所以五題全部完成後，必須派一個 fresh agent 做橫向檢查：

- [ ] 五題對「空值」的判定是否一致（第 3.2 節）
- [ ] 五題匯出的 CSV 是否都帶 BOM、引號規則是否一致（第 4.2／4.3 節）
- [ ] 五題是否都套用同一組大檔案門檻（第 5 節）
- [ ] 有沒有哪一題偷偷在 parser 層做了「修正」（第 2 節）
- [ ] 五題的 `csv-*.js` 是否都用 `shared/` 的版本，沒有各自複製一份改
- [ ] **哨兵跨題唯一**（下列指令**無輸出**才算通過）：

```bash
grep -rho 'ZZ[A-Z0-9]*' sdd/csv-*/tasks.md | sort -u | while read -r t; do
  n=$(grep -rl "$t" sdd/csv-*/tasks.md | wc -l | tr -d ' ')
  [ "$n" -gt 1 ] && echo "❌ 重用：$t 出現在 $n 題"
done
```

  重用會讓「離線版不含使用者資料」的驗收失去歸因能力——命中了也不知道是哪一題殘留的。
  ⚠️ **不要用 `sort | uniq -c`**：每個哨兵本來就會在同一題出現 2–4 次，
  數出現次數驗不到「只屬於一題」，要數的是**含有它的檔案數**。

- [ ] **結構性字串一律 DOM 斷言**。分兩段，第一段機械驗、第二段要人判斷：

**(甲) 正向要求，可完全機械化**（**無輸出**才算通過）：

```bash
for f in sdd/csv-*/tasks.md; do
  grep -q 'buildCleanHtmlCopy' "$f" || continue
  grep -q "getElementById('__shared_toast')" "$f" || echo "❌ $f 缺 __shared_toast 的 DOM 斷言"
  grep -q "querySelectorAll('.nav-back')" "$f" || echo "❌ $f 缺 .nav-back 的 DOM 斷言"
done
```

**(乙) 負向掃描：抓「把結構字串交給 `grep`／`rg` 當判定」**（**無輸出**才算通過）：

```bash
rg -nP '`(?:grep|rg)\b[^`]*(?:__shared_toast|nav-back)[^`]*`' sdd/csv-*/tasks.md
```

沒有 `rg` 時的備援（只依賴系統內建 perl）：

```bash
perl -ne 'print "$ARGV:$.:$_" if /`(?:grep|rg)\b[^`]*(?:__shared_toast|nav-back)[^`]*`/' sdd/csv-*/tasks.md
```

  ⚠️ **不要寫成 `grep -rnP`**：macOS 內建的 `/usr/bin/grep` 是 BSD grep，
  **不支援 `-P`**，會直接報 `invalid option -- P`。
  本節原本就寫成 `grep -rnP` 並標了「已實測通過」——那是因為當時的 shell 走到
  homebrew 的 `ugrep`（支援 `-P`），**在乾淨的 macOS 上根本跑不起來**。
  獨立驗收者換一個環境跑就爆了。**「我這裡跑得起來」不等於「這條指令可用」。**

  關鍵是把比對**限制在同一個 inline code span 內**（backtick 之間）。
  這樣「同一行前段有針對內容哨兵的合法 `grep`、後段有 DOM 斷言」的合格寫法不會被誤中——
  backtick 把兩者隔開了。

  已實測（`rg` 與 `perl` 兩種寫法結果一致）：
  - 現況 0 命中
  - 注入 `grep -c '__shared_toast' out.html`、`grep -q "nav-back" offline.html`、
    `rg -q '__shared_toast' out.html` 三種違規寫法，全部抓到
  - 同一行同時含合法內容哨兵 `grep` 與 DOM 斷言的寫法，**未被誤中**

  ⚠️ **不要用「同一行同時出現 grep 與結構字串」這種寬鬆 pattern**——實測會把
  五題合格的 DOM 驗收條件全部誤列為違規。
  ⚠️ 也**不要**用 `grep -c '__shared_toast'` 這種精確字面去掃——實測過，
  `grep -q`、雙引號寫法、`rg` 全都逃得掉，會給出假的安全感。
  ⚠️ 本指令只掃 inline code span。若日後有人把指令寫進 fenced code block，要另外比照掃描。

⚠️ **上面兩條指令跑完後，各做一次反證**：故意製造一個違規
（例如把某題的哨兵複製到另一題、或把某題的 DOM 斷言字串改掉），
確認指令**真的會輸出**，再還原。
一條「永遠不輸出」的指令和一條「通過所以不輸出」的指令，從結果上看一模一樣——
這正是本專案反覆踩到的坑，連本節的檢查指令自己都踩過一次
（原本用 `sort | uniq -c` 數出現次數，驗不到「只屬於一題」）。
