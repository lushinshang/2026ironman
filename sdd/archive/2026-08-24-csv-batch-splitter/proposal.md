# 總表 → 分單位批次拆檔（csv-batch-splitter）

- PRD 對應：PRD 12（`2026-ironman-vibecoding-30-prd.md` 369-394 行）——PRD 編號 12，但開發順序為 Day10
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- 互動模式：**按鈕觸發**（上傳、選欄位、勾選群組後按「產生」/下載，非逐字打字即時運算），依 `shared/CONTRACT.md` 第 5 節——本題輸入是檔案與下拉選單，不是連續文字輸入，不適用即時模式

## 為什麼做

一份總表每月依單位、部門、地區或承辦人拆成多份檔案，是常見又重複的 Office 工作。

共用模組（`shared/*.js`、`shared/base.css`）、`scripts/bundle.py`，以及 CSV 資料層五模組
（`csv-decode.js`／`csv-parse.js`／`csv-write.js`／`csv-types.js`／`io-zip.js`）由前置工程
`sdd/shared-infra/` 與 `sdd/csv-infra/` 建立（依 `shared/CONTRACT.md` 第 7 節、`CSV_CONTRACT.md` 第 6.1 節）。
本題直接假設它們已就緒，`tasks.md` 不包含「建立 parser」「建立 ZIP 模組」之類的任務。

## 要改什麼

### 拆檔核心功能（Day10 本身）

- 上傳 CSV（`shared/io-dropzone.js` 的 `mode:'bytes'` 讀檔 + `checkCsvFileSize()` 大檔案門檻，見下方「大檔案門檻」章節 + `shared/csv-decode.js` + `shared/csv-parse.js`）
- 選擇拆分欄位（下拉選單，選項為原表 headers）
- 列出該欄位的 Unique Values 與各自筆數（依第一次出現順序排列，見下方「撞名處理」）
- 每個群組預設勾選；可個別勾選要輸出的群組
- 可勾選要排除的欄位（不影響分組依據欄位本身以外的輸出內容）
- 自動產生合法檔名（見下方「檔名生成規則」）
- 保留 Header（見下方「保留 Header」）
- 單檔下載（每個群組一個下載按鈕）
- 全部 ZIP（把目前勾選的群組打包成一個 zip 下載）
- 全程不修改原始上傳檔案，僅讀取；輸出一律是新產生的內容

### Level 1 共通 UI 基線（`CONTRACT.md` 第 6 節）

- 複製結果到剪貼簿（`io-clipboard.js`）：複製「拆分摘要」文字（各群組名稱與筆數清單），不複製 CSV 內容本身（CSV 內容用下載，不適合塞進剪貼簿）
- 下載結果檔案（`io-download.js`）：即上方「單檔下載」與「全部 ZIP」兩個路徑
- 下載本工具離線版（`buildCleanHtmlCopy()`）：清空已上傳的檔案內容、解析出的 Table、Unique Values 清單、勾選狀態，移除 `.nav-back` 與站內外連。**上傳過的 CSV 資料是本題唯一的使用者資料來源，必須確認 DOM 與 JS 變數中都不殘留**

### 規格細節（PRD 只給條列，以下鎖定為可直接實作的規則）

#### 1. 檔名生成規則

依序套用以下步驟，把「一個群組值」轉成「一個合法檔案基底名稱（不含副檔名）」：

**Step 0：空字串處理**
群組值為空字串 `''` → 直接以固定文字 `(空值)` 作為基底名稱，跳過 Step 1–4，直接進 Step 5。

**Step 1：置換 Windows 保留字元**
依 [Microsoft Learn《Naming Files, Paths, and Namespaces》](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)（2024-08-28 版本）第 "Naming Conventions" 節，以下字元逐一置換為 `_`（一對一置換，不合併相鄰底線）：

```
< > : " / \ | ? *
```

**Step 2：置換控制字元**
Unicode 碼點 `0x00`–`0x1F`（含 NUL）逐一置換為 `_`。

**Step 3：修剪頭尾空白**
去除基底名稱開頭與結尾的空白字元（半形空格、全形空格 `U+3000`、Tab、換行）。**只修剪頭尾，中間的空白保留**（例如「台北 一組」不受影響）。

**Step 4：修剪尾端句點**
去除基底名稱**結尾**的連續句點 `.`。

> ⚠️ 查證更正：使用者提示中寫「開頭或結尾的空白與句點」都要處理，但依 Microsoft 官方文件原文：
> `Do not end a file or directory name with a space or a period. ... it is acceptable to specify a period as the first character of a name. For example, ".temp".`
> **只有結尾的句點不合法，開頭句點是合法的**（Windows 檔案總管本身也允許 `.temp` 這類檔名）。因此本規則**不修剪開頭句點**，只修剪結尾句點；空白則頭尾都修剪（官方文件只禁止「結尾」空白，但為避免 UI 顯示與比對上的困擾，本題頭尾空白一併修剪，此為主動加嚴，非官方強制）。

**Step 5：Windows 保留裝置名稱檢查（不分大小寫）**
若此時的基底名稱（整串，不含副檔名）完全等於以下清單中任一項（不分大小寫比對）：

```
CON, PRN, AUX, NUL,
COM1, COM2, COM3, COM4, COM5, COM6, COM7, COM8, COM9,
LPT1, LPT2, LPT3, LPT4, LPT5, LPT6, LPT7, LPT8, LPT9
```

→ 在基底名稱後加上 `_group` 後綴（例如 `CON` → `CON_group`，`nul` → `nul_group`）。

清單來源：[Microsoft Learn《Naming Files, Paths, and Namespaces》](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file) "Naming Conventions" 節，2024-08-28 版本，原文列出 `CON, PRN, AUX, NUL, COM1–COM9, COM¹COM²COM³, LPT1–LPT9, LPT¹LPT²LPT³`，並註明「這些名稱加副檔名（如 `NUL.txt`）仍視為保留字」。

**已查證但決定 MVP 不處理的邊界**：官方文件另外提到 Windows 把 ISO-8859-1 上標數字 `¹²³` 也視為 `COM`/`LPT` 系列數字的合法部分（例如 `COM¹` 也是保留字），使其在任何路徑層級都保留。本題群組值來自使用者上傳的中文 Office 表格（單位、部門、地區、承辦人名稱），出現這三個特殊上標字元的機率視為零，**MVP 不檢查此邊界**（已裁示採納，見下方「已裁示事項」第 3 項）。

**Step 6：長度上限**
基底名稱（不含副檔名 `.csv`）字元數超過 **100** 時，從第 100 個字元處截斷。此為主動訂定的安全值（遠低於 NTFS 單一路徑分量 255 字元上限），保留空間給後續「撞名處理」附加的序號後綴。此數字已裁示採納（見下方「已裁示事項」第 2 項）。

**Step 7：截斷為空的兜底**
若 Step 1–6 執行完畢後基底名稱變成空字串、**或全部由底線組成**，基底名稱改為固定文字 `未命名`。

⚠️ **2026-08-23 補訂（原文自相矛盾）**：Step 1 是「置換為 `_`」不是「移除」，所以 `///` 實際會變成 `___` 而非空字串，本節原本的 `///` → `未命名` 範例字面上不成立。實作階段由實作者發現並裁定「全部由底線組成視同空字串」，方向與本節範例的原意一致，予以採納並在此明文化。
（實測：`///` → `未命名.csv`、空字串 → `(空值).csv`，兩者行為不同，不要混為一談。）

以上七步驟輸出「單一群組的候選基底名稱」，副檔名固定為 `.csv`。

#### 2. 撞名處理（兩個不同群組值 sanitize 後相同）

**必要情境**：例如「A/B 組」與「A:B 組」都被 Step 1 換成 `A_B 組`；或「NUL」與「nul」都落入 Step 5 變成 `NUL_group`/`nul_group`（比對時視為相同，因為 Windows／macOS 預設檔案系統對副檔名前的名稱大小寫不敏感）。

**演算法**：
1. 依「Unique Values 清單顯示順序」（即群組在原始檔案中第一次出現的順序，由上到下）逐一產生候選基底名稱（依上方七步驟）。
2. 維護一個「已使用檔名」集合，比對時**不分大小寫**。
3. 依序處理每個群組：若候選基底名稱尚未被使用 → 直接採用，加入集合。若已被使用 → 在基底名稱後附加 `_2`、`_3`、`_4`……（從 2 開始遞增，取第一個未被使用的數字）再加入集合。
4. 附加序號後，若總長度超過 Step 6 的 100 字元上限，從基底名稱本體（不含新加的序號）處往前截斷，確保「本體 + 序號」不超過上限。

**範例**：「A/B 組」先出現 → `A_B 組.csv`；「A:B 組」後出現 → 候選同為 `A_B 組`，已被使用 → 改為 `A_B 組_2.csv`。

**排序依據**：採用「原始出現順序」決定誰拿到未加序號的名稱、誰被加序號，而非依字母或筆畫排序（已裁示採納，見下方「已裁示事項」第 1 項）。

#### 3. 分組比對規則（逐字元比對，不 trim、不忽略大小寫）

依 `CSV_CONTRACT.md` 第 2 節「parser 不做任何貼心修正」的精神，分組依據**逐字元完全相等**：`"台北市"`、`"台北市 "`（尾端多一個空白）、`"台北市"`（全形）視為三個不同群組，各自產生一份輸出。這不是疏漏，而是與整份契約的「不猜測、不修正」原則一致——若使用者的原始資料本身有這類不一致，那正是資料品質問題的呈現，不該被工具悄悄合併掉。

因為此規則可能讓「肉眼看起來一樣」的群組值產生同樣的 sanitize 後檔名，上方「撞名處理」機制必須確實生效以避免互相覆蓋。不提供「忽略前後空白」選項（已裁示採納，見下方「已裁示事項」第 4 項）。

#### 4. 保留 Header 與「可排除指定欄位」的交互

每份輸出 CSV 的第一列都是 header。若使用者勾選要排除某些欄位，則所有輸出檔案（單檔與 ZIP 內的每一份）的 header **與資料列都同步移除**該欄位，欄位順序維持原表順序不變。排除欄位**不影響**分組依據欄位本身以外的邏輯——若使用者排除的欄位剛好是拆分依據欄位，仍允許（該欄位只是不出現在輸出內容中，分組仍照該欄位的值進行，因為分組發生在排除之前）。

#### 5.「未排除群組時拆分後總筆數等於原表」的 UI 呈現

在 Unique Values 清單下方常駐顯示：

```
原表總筆數：312　|　目前已選 X 組，合計 298 筆
```

- 「原表總筆數」固定等於上傳檔案的資料列數（不含 header），不受任何勾選影響。
- 「目前已選 N 組，合計 M 筆」即時反映使用者勾選群組的加總（純算術加總，不重新讀檔）。
- 當使用者**全部勾選**（等同 PRD 驗收條件的「未排除群組」情境）時，`M` 必須恆等於「原表總筆數」，並在畫面上以文字明確標示「已包含全部群組，筆數一致」；只要有任何群組被取消勾選，明確改標示「已排除 N 組（合計 X 筆未輸出）」，不讓使用者誤以為總筆數守恆在部分勾選時仍成立。
- 「可排除指定欄位」只影響**欄**，不影響列，因此不影響這條筆數等式；「可勾選要輸出的群組」才會影響列，故上述文案明確區分兩者對筆數的不同作用。

#### 6. 大檔案門檻（`CSV_CONTRACT.md` 第 5 節）

讀檔一律透過 `shared/io-dropzone.js` 擴充後的 `setupDropZone(dropEl, onData, opts)` **與** `setupFilePicker(fileInput, onData, opts)`，兩條路徑吃同一組 `opts`，不自寫拖放邏輯、不自行接 `<input type=file>` 的 `change` 事件：

```js
var opts = { mode: 'bytes', accept: ['.csv'],
             gate: function (file) { return checkCsvFileSize(file.size); } };
setupDropZone(dropEl, onData, opts);
setupFilePicker(fileInput, onData, opts);
```

`gate` 在**讀檔之前**執行：

| `level` | 行為 |
|---|---|
| `'ok'`（< 5 MB） | 直接處理，不提示 |
| `'warn'`（5–20 MB） | 顯示 `checkCsvFileSize()` 回傳的 `message`（「檔案較大，處理可能需要數秒」），照常讀檔並繼續處理 |
| `'reject'`（> 20 MB） | `gate` 回傳 `!ok`，`onError(message)` 觸發，**完全不讀那份檔案**，`onData` 不會被呼叫，不呼叫 `decodeCsvBytes`/`parseCsv`，不進入分組流程 |

`onData` 拿到的是已通過閘門的 `ArrayBuffer`，才交給 `decodeCsvBytes`/`parseCsv`。本題只吃單一檔案（不像 Day09 需要「單檔且合計」雙重判斷），門檻以 `File.size`（原始位元組）計。**不在拿到 `ArrayBuffer` 之後才檢查大小**——那等於閘門白設，超標檔案照樣先整份讀進記憶體。

#### 7. 中文檔名與 ZIP（`CSV_CONTRACT.md` 第 7.3、7.5 節的未驗證項）

✅ **fflate 0.8.3 的中文檔名行為已於 2026-08-23 實機驗證**（契約第 7.3 節）：EFS bit 確實有設（位元組層級證據），解壓後檔名 6/6 位元組一致，BMP 外字元正常。本題 `tasks.md` 第 8 條仍要在**實際產品**上重跑一次驗證（先前驗的是 fflate 本身，不是本題的打包流程），但已知方案可行，不會卡住。⚠️ 驗證**不得**用系統內建 `unzip`／`zipinfo`，它不支援 EFS flag、會假性失敗。驗證平台限於本機可用的 macOS（`ditto` / `bsdtar` / Python `zipfile`；**不可用系統內建 `unzip`／`zipinfo`**，見契約 7.3 節的工具陷阱），無 Windows 機器可實機驗證 Windows 檔案總管的解壓行為——此限制在 tasks.md 中明記為已知落差。

#### 8. 單檔下載 vs 全部 ZIP

- **單檔下載**：Unique Values 清單每一列（群組）旁邊有一個「下載此份」按鈕，直接用 `shared/io-download.js` 下載該群組的 CSV，檔名為該群組 sanitize＋去重後的基底名稱 + `.csv`。未勾選的群組**仍可**單獨下載（勾選框只控制「全部 ZIP」納入哪些檔案，不限制單檔下載——PRD 沒有限制未勾選群組不能單獨下載，依共通規則第 3 條不額外限制）。
- **全部 ZIP**：「全部下載 ZIP」按鈕把**目前勾選**的群組各自轉成 CSV 內容，交給 `shared/io-zip.js` 打包成一個 zip 檔案下載。zip 內各檔案的檔名使用「撞名處理」演算法產生的最終檔名（依全部群組——不只是勾選的群組——的順序計算撞名序號，確保同一個群組不論最終是否被勾選，其單檔下載檔名與 zip 內檔名一致）。
- `shared/io-zip.js` 的確切函式簽名尚未由 `sdd/csv-infra/` 前置工程定案（`CSV_CONTRACT.md` 第 6 節只列模組名稱與歸屬，未列簽名）。本提案的 `tasks.md` 只描述「打包目前勾選群組的 CSV 內容成一個 zip」這個行為，不預先假設函式簽名；開工時需先讀 `shared/io-zip.js` 實際 export 再串接。此為已知依賴風險，維持現狀的做法已裁示採納（見下方「已裁示事項」第 6 項）。

## 影響範圍

### 新增檔案

共用模組（`shared/*.js`、`shared/base.css`）、`scripts/bundle.py`，以及 CSV 資料層五模組
不屬於本題新增範圍，本題只讀取／引用（依 `CONTRACT.md` 第 7 節、`CSV_CONTRACT.md` 第 6.1 節）。

- `VibeCoding/Day10_csv-batch-splitter/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day10_csv-batch-splitter/src/bundle.json`（資源清單）
- `VibeCoding/Day10_csv-batch-splitter/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day10_csv-batch-splitter/bundle_manifest.json`（build 產物）
- `VibeCoding/Day10_csv-batch-splitter/PRD.md`
- `sdd/csv-batch-splitter/proposal.md`（本檔）
- `sdd/csv-batch-splitter/tasks.md`

### 修改檔案

- `VibeCoding/README.md`（進度表，收尾階段才動，本次提案不動）
- `VibeCoding/index.html`（作品集清單，收尾階段才動）

### 不修改

- `VibeCoding/shared/CSV_CONTRACT.md`、`VibeCoding/shared/CONTRACT.md`（本題遵守既有契約，不變動簽名）
- `VibeCoding/shared/*.js`（前置工程產物，本題只呼叫不修改）

### Library / API

無外部 library、無 API 呼叫，全程 browser-side。ZIP 打包透過 `shared/io-zip.js`（包 fflate，前置工程建立）。

## 版面草圖（ASCII wireframe）

```
+----------------------------------------------------------------+
| ← 返回作品集              總表 → 分單位批次拆檔                  |
+----------------------------------------------------------------+
| [ 拖曳 CSV 檔案到此，或點擊選擇檔案 ]                             |
+----------------------------------------------------------------+
| 拆分欄位：[ 下拉選單：單位 ▾ ]                                    |
| 排除欄位：[ ] 身分證字號  [ ] 備註   （複選 checkbox）             |
+----------------------------------------------------------------+
| Unique Values（依原表出現順序）                                  |
| [x] 台北市      82 筆   檔名：台北市.csv           [下載此份]     |
| [x] 高雄市      76 筆   檔名：高雄市.csv           [下載此份]     |
| [x] A/B 組      54 筆   檔名：A_B 組.csv           [下載此份]     |
| [x] A:B 組      50 筆   檔名：A_B 組_2.csv         [下載此份]     |
| [ ] (空值)      50 筆   檔名：(空值).csv           [下載此份]     |
+----------------------------------------------------------------+
| 原表總筆數：312　|　目前已選 4 組，合計 262 筆                    |
| ⚠ 已排除 1 組（合計 50 筆未輸出）                                |
+----------------------------------------------------------------+
| [複製拆分摘要]  [全部下載 ZIP]  [下載本工具離線版]                 |
+----------------------------------------------------------------+
```

三個按鈕依 `CONTRACT.md` 第 6 節 Level 1 共通 UI 基線：複製（拆分摘要文字）、全部下載 ZIP（`io-zip.js` + `io-download.js`）、下載本工具離線版（`buildCleanHtmlCopy()`）。

## 已裁示事項（`sdd/LEVEL1B_RULINGS.md`，2026-08-23）

1. **撞名時「誰保留原名、誰加序號」的排序依據**：採納「群組在原始檔案中第一次出現的順序」，不改依字母／注音／筆畫排序。同一份檔案內容不變時，撞名結果穩定。
2. **檔名長度上限 100 字元**：採納，不額外要求 UI 提示「已截斷」（提案未主動加此提示，PRD 與裁示均未要求）。
3. **保留字清單不納入 ISO-8859-1 上標數字變體**（`COM¹`／`COM²`／`COM³`／`LPT¹`／`LPT²`／`LPT³`）：MVP 不處理，理由見上方「檔名生成規則」Step 5 之後的查證註記（中文商務 CSV 群組值出現此三個特殊上標字元的機率視為零）。
4. **分組比對不提供「忽略前後空白」選項**：維持逐字元完全比對（不 trim、不忽略大小寫），依 `CSV_CONTRACT.md` 第 2 節「parser 不做貼心修正」精神，依賴撞名機制吸收檔名相同但群組不同的情況。
5. **空字串群組值的檔名文字用 `(空值)`**：採納，維持提案原案不改文案。
6. **`shared/io-zip.js` 函式簽名**：維持本提案「只描述行為、不假設簽名」的寫法，簽名由 `sdd/csv-infra/` 前置工程定案，開工前先讀該檔案實際 export 再串接。
7. **Windows 保留檔名清單查證**：已查證 Microsoft 官方文件，開頭句點合法（如 `.temp`），只有結尾句點不合法；提案 Step 3／Step 4 已依此區分處理，查證來源見「檔名生成規則」Step 4 之後的訂正註記。

## 爭議點（需裁示，本提案不自行決定）

無。以上事項已由 `sdd/LEVEL1B_RULINGS.md` 全數裁示。
