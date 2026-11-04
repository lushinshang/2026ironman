# Tasks — csv-infra（前置工程）

> 測試環境（Node + `vm`）、vendor 檔案位置（擴充 `bundle.py` 支援 `shared/vendor/`）、
> `checkCsvFileSize()` 簽名（契約版 `{ok, level, message}`）均已依 `sdd/LEVEL1B_RULINGS.md` 定案，
> 以下任務直接照此執行，不再是待裁示的假設。

- [x] 1. 下載 Papa Parse 5.6.0 UMD 檔與 fflate UMD 檔到 `VibeCoding/shared/vendor/`，記錄來源
  URL 與 SHA256；擴充 `VibeCoding/scripts/bundle.py` 的 `resolve_asset()`（現行
  `scripts/bundle.py:98-107` 只允許 `path` 落在 `src_dir` 內），額外允許解析後路徑落在
  `VibeCoding/shared/vendor/` 內（containment 檢查對該目錄做，兩種位置以外一律拒絕）；
  建立一份 `bundle.json` 範例片段（`papaparse` / `fflate` 兩個 ASSET，`path` 指向
  `../../shared/vendor/...`，`escape_mode: "raw_js"`，`license: "MIT"`）供 Day08–12 直接抄用。
  驗證：`ls VibeCoding/shared/vendor/` 看到兩個檔案；`sha256sum` 算出的雜湊寫進任務回報；
  用範例 `bundle.json` 對一個測試用 `src_dir` 實際跑一次 `bundle.py`，確認能成功解析
  `shared/vendor/` 內的檔案並產出內嵌內容；另外用一個 `path` 指向
  `../../../etc/hosts`（越出 `shared/vendor/`）的 `bundle.json` 跑一次，確認 `bundle.py`
  仍以非 0 exit code 拒絕並印出錯誤訊息（containment 檢查未被弱化）。

- [x] 2. 建立 `VibeCoding/shared/csv-decode.js` 的 `decodeCsvBytes(arrayBuffer)`：三段式編碼
  偵測（BOM 明示 → `TextDecoder('utf-8',{fatal:true})` 嚴格解碼 → `TextDecoder('big5')` fallback），
  回傳 `{ text, encoding, hadBom, confidence }`，`confidence` 為 `'bom'`／`'strict'`／`'fallback'`；
  同檔新增 `checkCsvFileSize(byteLength)`，回傳契約版 `{ ok: boolean, level: 'ok'|'warn'|'reject',
  message: string }`，門檻依契約第 5 節（<5MB／5–20MB／>20MB，1MB=1,048,576 bytes，於程式註解寫明）。
  驗證：情境一，輸入帶 UTF-8 BOM 的位元組 → `confidence==='bom'`、`hadBom===true`；
  情境二，輸入不帶 BOM 的合法 UTF-8 位元組 → `confidence==='strict'`；
  情境三，輸入合法 Big5 但非合法 UTF-8 的位元組 → `confidence==='fallback'` 且 `text` 正確解出
  中文字（不是亂碼）；情境四，`checkCsvFileSize(4*1024*1024)` → `{ok:true, level:'ok'}`；
  情境五，`checkCsvFileSize(10*1024*1024)` → `{ok:true, level:'warn'}` 且 `message` 含「較大」或
  「數秒」字樣；情境六，`checkCsvFileSize(25*1024*1024)` → `{ok:false, level:'reject'}` 且
  `message` 明確說明上限（非空字串）。

- [x] 3. 建立 `VibeCoding/shared/csv-parse.js` 骨架：分隔符偵測（契約 4.1 節，`,`／`\t`／`;`
  取前 10 個非空行比欄數穩定度）＋行尾正規化（契約 7.1(a)，CRLF/CR 一律轉 LF 後才交給 Papa，
  原始型態記進 `meta.lineEnding` 為 `'crlf'`／`'lf'`／`'mixed'`）。
  驗證：情境一（7.1a 陷阱重現），輸入 `"a,b\r\n1,2\n3,4\r\n"`，正規化後解析必須得到兩筆資料列
  `["1","2"]` 與 `["3","4"]`，不可被併成一列，且 `meta.lineEnding==='mixed'`。情境二，輸入
  `a;b\n1;2\n3;4` 與 `a\tb\n1\t2\n3\t4` 兩份純分號／純 Tab 檔案，分隔符偵測結果分別為 `;` 與 `\t`。

- [x] 4. 補完 `csv-parse.js`：丟棄檔尾多餘空列（契約 7.1b，僅限「最後一列、且只有一格、
  且該格為空」才丟棄，其餘位置的空列一律保留）＋用 `step` callback 的 `res.meta.cursor`
  自算 `Row.line`（契約 7.1c）＋組裝 `meta.headerCount`／`meta.raggedRows`。
  驗證：情境一，輸入 `"a,b\n1,2\n"`（結尾單一換行）解析後只有 1 筆資料列，不多一筆 `[""]`；
  輸入 `"a,b\n1,2\n\n"`（結尾兩個換行，中間額外一個空列）該中段空列仍保留。情境二（行號重現契約
  範例），輸入含「引號內換行」的 CSV（一格內容為 `"x\ny"`），使該列跨原始檔案第 2、3 行，
  下一筆資料列的 `line` 必須是 4，與契約 7.1(c) 說明的「1／2／4」一致。

- [x] 5. 補完 `csv-parse.js` 契約 3.1 節四條規則的直接驗證：每格輸出為 `string` 且不轉型
  （輸入 `"1,2\n3,4\n"`，第二列 `cells` 為 `["3","4"]`，`typeof cells[0]==='string'`）；
  欄數不一致的列不丟棄不補齊（輸入 `"a,b,c\n1,2\n3,4,5,6\n"`，兩筆資料列都保留，
  `cells.length` 分別是 2 與 4，`meta.raggedRows` 含這兩列的 `line` 值）；重複欄名不自動改名
  （輸入 headers 為 `a,a,b`，解析後 `table.headers` 仍是 `['a','a','b']`）；空值定義
  （輸入 `"a,,b\n"` 中間格為 `''`，輸入 `'a,"  ",b'` 中間格為 `'  '` 且不等於 `''`）。
  驗證：以上四個情境各寫一組斷言，全部通過。

- [x] 6. 建立 `VibeCoding/shared/csv-write.js` 的 `toCsv(table, opts)`：`opts.bom` 預設
  `true`（輸出開頭含 `﻿`）；引號規則依 RFC 4180，僅當格內含分隔符／雙引號／CR／LF 才加
  引號，格內 `"` 寫成 `""`；`opts.columns` 省略時輸出全部欄。
  驗證：情境一，`opts.bom` 省略時輸出字串開頭為 `'﻿'`；`opts.bom=false` 時開頭不含 BOM。
  情境二，格內容為 `He said "hi"` → 輸出 `"He said ""hi"""`；格內容為純數字字串 `"123"` →
  輸出不加引號的 `123`。

- [x] 7. 建立 `VibeCoding/shared/csv-types.js` 的 `inferColumnTypes(table)`：回傳每欄一個
  `{ kind: 'number'|'date'|'text', sampleSize, matched, mismatchLines }`，只回報不改寫
  `table`；`kind` 判準、`toNumber()`、`isDateLike()`、`dateParts()` 逐字依契約 4.0b 節實作（樣本數<3→text；
  數字比例≥0.9→number；否則日期白名單比例≥0.9→date；否則→text；`toNumber` 不接受千分位、
  貨幣、百分比、括號負數、全形數字；`isDateLike` 用 regex 白名單六式，禁用 `new Date()`，
  不支援民國年）。
  驗證：情境一（**剛好踩在 0.9 門檻上**），某欄 10 筆資料為
  `['1','2','abc','4','5','6','7','8','9','10']`——9 筆可解析、比例正好 `0.9`，
  依契約 4.0b 的 `≥ 0.9` 應判為 `kind==='number'`，且 `mismatchLines` 含 `'abc'` 那筆的 `line` 值，
  `sampleSize===10`、`matched===9`；原始 `table.rows` 執行前後逐一比對完全相同（未被改寫）。
  情境一之二（**門檻下緣，必須判成 text**），某欄 10 筆資料為
  `['1','2','abc','xyz','5','6','7','8','9','10']`——8 筆可解析、比例 `0.8`，
  應判為 `kind==='text'`。
  ⚠️ 這兩條要一起測：只測「通過」那條，把比較運算子寫成 `>` 或 `>=` 都會過，驗不出差別。
  情境二，`toNumber('1,234')`、`toNumber('$5')`、`toNumber('12%')`、`toNumber('(3)')`、
  `toNumber('１２３')`（全形）皆回傳 **`NaN`**（契約 4.0b 已裁示，不是 `undefined` 也不是 `null`；
  檢查用 `Number.isNaN()`，不要用全域 `isNaN()`——`isNaN('')` 是 `false`，會把空字串當數字）。
  情境三，`isDateLike('2026-08-23')`、`isDateLike('2026/8/3')`、`isDateLike('20260823')`、
  `isDateLike('2026-08')`、`isDateLike('2026')` 皆為 true；`isDateLike('115/08/23')`（民國年）
  與 `isDateLike('abc 2026')` 皆為 false。
  情境四，`dateParts()` 只做機械擷取、**不做任何範圍驗證**（契約 4.0b）：
  `dateParts('2026-08-23')` → `{y:2026,m:8,d:23}`；`dateParts('2026-08')` → `{y:2026,m:8,d:null}`；
  `dateParts('2026')` → `{y:2026,m:null,d:null}`；`dateParts('abc')` → `null`。
  缺的欄位必須是 `null`，**不得用 0 或 1 補**（那會讓「2026 年」在趨勢圖上長出不存在的 2026-01-01）。

- [x] 8. 建立 `VibeCoding/shared/io-zip.js`：包 fflate，提供函式把 `[{name, text}]` 打包成
  Blob；非 ASCII 檔名（例如含中文的 `name`）需正確設定 ZIP 的 EFS bit（0x0800），使解壓後
  檔名不亂碼。
  驗證：情境一，輸入 `[{name:'業務部.csv', text:'a,b\n1,2\n'}]` 產出 Blob 後寫成實體 `.zip`
  檔，用 `ditto -x -k`、`bsdtar -xf` 或 Python `zipfile` 三者之一實際解壓（**不得用 macOS 內建
  `unzip`／`zipinfo`**：Info-ZIP 6.00 不支援 EFS/UTF-8 flag，對正確的中文檔名 zip 仍會顯示
  亂碼並報 `Illegal byte sequence`——那是工具的限制，不是產品缺陷，契約第 7.3 節），確認解出的
  檔名正確顯示為 `業務部.csv`（不是亂碼或問號）——必須實機解壓，不能只驗證程式碼邏輯。
  另外用 Python 解析產出 zip 的 local file header 位元組，確認 `業務部.csv` 這個 entry 的
  general purpose bit flag 第 11 位（`0x0800`）為 1（EFS bit 已設）；純 ASCII 檔名的 entry
  該 bit 應為 0——只看解壓結果正常不夠，必須有這道位元組層級的檢查。情境二，輸入兩個檔案的
  陣列，解壓後兩個檔案都存在且內容與輸入的 `text` 逐字相同。

- [x] 9. 擴充 `VibeCoding/shared/io-dropzone.js`，共三件事（契約第 4 節逐字依循）：
  (a) `setupDropZone(dropEl, onData, opts)` 新增選用 `opts.mode === 'bytes'` 分支，改用
  `reader.readAsArrayBuffer(file)`，`onData` 收到 `ArrayBuffer`；`opts.mode` 省略或非
  `'bytes'` 時維持原本 `readAsText` 行為與既有的 `onText(reader.result, file.name)` 呼叫
  簽名不變。
  (b) 新增選用 `opts.gate(file)` 回呼，**在內部 `handleFile` 建立 `FileReader` 之前**呼叫；
  回傳 `{ok, level, message}`，`!ok` 時呼叫 `onError(message)` 並直接 return，不建立
  `FileReader`、不讀檔；`gate` 省略時略過此步驟，`io-dropzone.js` 不 import／依賴
  `csv-decode.js`。
  (c) 新增 `setupFilePicker(inputEl, onData, opts)`：監聽 `inputEl` 的 `change` 事件取
  `inputEl.files[0]`，與 `setupDropZone` 共用同一個內部 `handleFile(file)`，吃同一組
  `opts`（`mode`、`gate`、`accept`、`onError`）。
  驗證：
  情境一（向後相容）：對現有 7 個呼叫點（Day01–07 各自的 `setupDropZone(...)` 呼叫，皆未傳
  `opts.mode`／`opts.gate`）逐一 grep 確認呼叫語法未變動，且用一份既有題目手動觸發拖放，確認仍
  拿到文字內容（行為未受影響）。
  情境二（bytes 模式）：以 `{mode:'bytes'}` 呼叫並模擬 drop 一個檔案，`onData` 收到的第一個
  參數 `instanceof ArrayBuffer === true`（不是 string）。
  情境三（gate 擋下、讀檔完全未發生）：把全域 `FileReader` 換成一個會計數建構次數的 stub，
  以 `{gate: function(){ return {ok:false, level:'reject', message:'太大'}; }}` 呼叫並模擬
  drop／選檔一個檔案，確認 `onError` 收到 `'太大'`、`onData` 未被呼叫，且 stub 的建構次數為
  `0`（`FileReader` 完全未被呼叫，不是「讀完才丟掉」）。
  情境四（gate 放行）：`gate` 回傳 `{ok:true}` 時讀檔正常進行，`onData` 收到預期內容，且此時
  `FileReader` 建構次數為 `1`。
  情境五（setupFilePicker 與 setupDropZone 等價）：用同一個 `File` 物件，分別經
  `setupFilePicker` 觸發的 `change` 事件與 `setupDropZone` 觸發的 `drop` 事件呼叫，兩者
  `onData` 收到的結果（內容、型別）完全相同。

- [x] 10. 依裁示（Node + `vm`）建立測試 harness，跑完整套契約驗收：涵蓋任務 2–9 所有情境
  （3.1 四條規則、7.1(a)(b)(c) 三陷阱、7.2 三段編碼與 `confidence`、第 5 節大檔案門檻、
  4.0b 型別判準、io-zip 實機解壓、setupDropZone/setupFilePicker 的 bytes 模式、gate
  在讀檔前擋下、setupFilePicker 與 setupDropZone 等價、舊簽名向後相容），單一指令執行、
  有明確的通過／失敗輸出（exit code 0 代表全過、非 0 代表有失敗，並印出失敗項目名稱）。
  驗證：執行該指令一次，終端輸出列出全部測試項目與各自 PASS／FAIL，且全部為 PASS，
  exit code 為 0；故意改壞其中一個模組（例如讓 `checkCsvFileSize` 的門檻寫錯）重跑一次，
  確認該項目正確回報 FAIL 且 exit code 非 0。

## 驗收條件

- 情境：當對照契約第 4 節函式簽名逐字比對 `shared/csv-decode.js`／`csv-parse.js`／
  `csv-write.js`／`csv-types.js` 的函式宣告，就簽名（函式名、參數、回傳欄位含
  `checkCsvFileSize` 的 `ok` 欄位）完全一致。
- 情境：當跑任務 10 建立的測試指令，就 3.1 節四條規則、7.1(a)(b)(c) 三陷阱、7.2 節三段編碼、
  第 5 節大檔案門檻、4.0b 型別判準全部有對應測項且全部 PASS。
- 情境：當用契約 7.1(a) 給的混行尾範例 `"a,b\r\n1,2\n3,4\r\n"` 跑 `parseCsv()`，就得到
  兩筆未被併列的資料列，且 `meta.lineEnding==='mixed'`。
- 情境：當用一個含中文檔名分組的資料跑 `io-zip.js` 產出 zip 並用 `ditto -x -k`／`bsdtar -xf`／
  Python `zipfile` 之一實機解壓（不用 macOS 內建 `unzip`／`zipinfo`），就檔名正確顯示不亂碼；
  且解析該 zip 的 local file header 位元組，中文檔名 entry 的 general purpose bit flag
  第 11 位（`0x0800`）為 1。
- 情境：當用一個指向 `shared/vendor/` 之外的路徑跑修改後的 `bundle.py`，就以非 0 exit code
  拒絕，containment 檢查未被弱化。
- 情境：當本前置工程全部任務完成後，`VibeCoding/DayNN_<short-name>/` 目錄與任何一題的產品
  程式碼、`ui-chart-svg.js`、列印版型 CSS 皆未被建立或修改。
- 情境：當以會計數 `FileReader` 建構次數的 stub 呼叫 `setupDropZone`／`setupFilePicker`，
  並傳入 `gate` 回傳 `{ok:false, ...}`，就 `FileReader` 建構次數為 `0`（完全未被呼叫，
  不是「讀完才丟掉」），`onError` 收到 `gate` 給的 `message`，`onData` 未被呼叫。
- 情境：當用同一個 `File` 物件分別經 `setupFilePicker`（`change` 事件）與 `setupDropZone`
  （`drop` 事件）觸發，就兩者 `onData` 收到的結果（內容、型別）完全相同。
- 情境：當對 Day01–07 現有 7 個 `setupDropZone(...)` 呼叫點逐一 grep，就呼叫語法未變動
  （未傳 `mode`／`gate`），且手動觸發拖放仍拿到 `readAsText` 的文字內容，行為與擴充前完全一致。
