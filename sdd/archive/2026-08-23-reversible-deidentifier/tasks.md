# Tasks — reversible-deidentifier

> 前置條件：`shared/*.js`、`shared/base.css`、`scripts/bundle.py` 由前置工程 `sdd/shared-infra/` 提供，依 `shared/CONTRACT.md` 第 7 節，本題**直接假設已就緒**，不含建立共用模組或 bundle 腳本的任務。
>
> ⚠ 工時風險（提案階段就先講）：第 3、4、8 條的內容密度高於其餘各條，1 小時上限偏緊，實作時若第一條就超時請依共通開發規則第 4 條停下回報，不要硬推。
>
> 「派不知道實作細節的 fresh agent 重新驗收」依 `CHECKLIST.md` 第三節是**全部 task 打勾之後的獨立流程階段**，不是本清單的任務，故不列入。
>
> ⚠️ **兩階段拆分（使用者 2026-08-23 裁示，依據 `shared/CONTRACT.md` 第 5 節）**：本題工作量超過單日上限，拆成 **Phase A（任務 1–5，對應 Day05 發文，上篇）** 與 **Phase B（任務 6–10，對應 Day06 發文，下篇）**。**產品仍是一個**，資料夾只有 `VibeCoding/Day05_reversible-deidentifier/` 一個，任務內容本身不變，只是分兩批實作與分兩篇文章交付。Phase A 結束時骨架、偵測、合併歸併、token 分配與去識別化功能須可獨立展示；Phase B 補上還原能力與資安檢視。

## Phase A（任務 1–5，對應 Day05 上篇）

- [x] 1. 建立 `VibeCoding/Day05_reversible-deidentifier/src/index.html` 骨架與 `src/bundle.json`：兩個分頁（去識別化／還原）、去識別化分頁的原文／結果並排區、手動敏感詞 textarea、mapping 表格區、還原分頁的 mapping 載入區與文字並排區，含 `<!--{{SHARED:...}}-->` placeholder（`ui-toast`／`io-download`／`io-clipboard`／`io-dropzone`／`util-escape`）。一併寫入所有**靜態文案**（proposal 判斷 4 原則 1／2／4／6）：偵測依據標註、「本工具不偵測：地址、生日、金融帳號、內部代號…」清單、結果區「送出前請自行逐字檢查；規則式偵測必然有遺漏。」固定行、mapping 表格上方警語、還原分頁「本工具不保存 mapping…」固定文案、按鈕照實命名。**互動模式為按鈕觸發，不接 debounce；不得出現 `beforeunload`（使用者裁示不做）。**
  驗證：`python3 VibeCoding/scripts/bundle.py` 跑通產出 `index.html`；瀏覽器開啟後兩個分頁可切換、各區塊與上述每一段文案都在畫面上；`grep -c 'SHARED:' src/index.html` 的數量與 `bundle.json` 條目數一致；`grep -nE '安全|已保護|乾淨|100%|無虞|一鍵匿名|beforeunload' src/index.html` 回傳 0 筆。

- [x] 2. 移植 v1 偵測層：`PII_PATTERNS` **四條 regex**（`old/Day9/index.html:222-227`：`id`／`mobile`／`landline`／`email`，**手機與市話格式不同，兩條都要保留、都要比對**）、`SURNAMES`／`NAME_PATTERN`（229-230）、`findRegexMatches`／`detectPII`（279-286）、手動敏感詞的 `String.indexOf` 迴圈（改寫自 288-306，**去掉代換字庫側**）、`detectAll` 的 `sensitiveMatches.concat(piiMatches)` 來源優先序（324-331）。**`mobile` 與 `landline` 兩條 regex 的命中一律標成同一個 `PHONE` type**（proposal 判斷 1：6 種 token 前綴 ≠ 4 條 regex）。
  驗證：Node.js 對樣本逐一跑：`0912345678`（無分隔，只標一次、type 為 `PHONE`，不重複標成兩筆）、`02-2345-6789`（市話，type 同樣為 `PHONE`）、`A123456789`、`ming@Example.com`、`王小明`；確認 `PII_PATTERNS` 物件實際仍有 4 個鍵（`Object.keys().length === 4`），沒有被合併掉。

- [x] 3. 實作區間合併與 type 歸併（proposal 判斷 1 姓名邊界段、判斷 6）：(a) 姓名採最長匹配、token 鍵是實際匹配到的字面，`王小` 與 `王小明` 是兩個鍵不做前綴合併；(b) 改寫 v1 `mergeAndDedupe()`（308-322），重疊區間由「捨棄後者」改為「合併成單一 match，範圍取聯集、type 取優先序最高者」；(c) 去重後掃描所有 match，同一正規化字串在不同位置若得到不同 type，一律歸併到 `TERM > ID > PHONE > EMAIL > PERSON` 中最高者。
  驗證：Node.js 三組——(a) 原文同時含「王小明」與單獨的「王小」，確認產生兩個不同 PERSON 鍵、mapping 兩列；(b) 手動敏感詞填「小明」、原文為「王小明」，確認合併成單一 match、字面為 `王小明`、type 為 `TERM`（重現 M4 子字串案例）；(c) 同一字串在 A 處被手動 TERM 命中、B 處只被 PERSON 命中，歸併後兩處皆為 TERM；並確認 `start` 與長度皆相同時 `sensitiveMatches` 勝出（驗證對 `Array.sort` 穩定性的隱含假設）。

- [x] 4. 實作 token 分配器（proposal 判斷 1、2）：正規化規則（Email 小寫／手機與市話去分隔後共用同一組規則與同一個 `PHONE` 類型／身分證首字母大寫／姓名與 TERM 不正規化）、`(type, normalized)` 為鍵、6 種前綴各自獨立遞增三位補零、超過 999 進位四位；原文預掃描 token 樣式字串並收集成「已佔用字面集合」，新分配編號跳過集合內的字面；原文既有 token 字面一律轉為 `[LITERAL_NNN]`。
  驗證：Node.js 跑四組——(a) 同一 Email 大小寫不同的兩處拿到同一 token；(b) `0912-345-678` 與 `0912345678` 拿到同一個 `[PHONE_001]`，市話另拿 `[PHONE_002]`；(c) 原文含 `[PERSON_001]` 與 `[LITERAL_001]` 時，新分配的 token 不與這兩個字面相同，兩個既有字面各拿到一個 LITERAL token；(d) 建構 1000 個不同姓名確認第 1000 個為 `[PERSON_1000]`。

- [x] 5. 串接「執行去識別化」按鈕與結果區輸出：偵測 → 合併歸併 → token 分配 → 產生去識別化文字與 mapping 物件 → 並排渲染（所有寫入 `innerHTML` 的內容先經 `escapeHtml()`）→ mapping 表格渲染（Token／原文／類型／次數）→ 統計行；**共通 UI 基線兩項**（`CONTRACT.md` 第 6 節）：「複製結果」走 `copyToClipboard()` + `showToast()`、「下載結果」走 `downloadFile()`；偵測 0 筆時顯示中性的「未命中任何規則」並補「這不代表文中沒有個資」。
  驗證：Playwright 貼入含四種個資＋姓名＋手動敏感詞的樣本，執行後右欄全為 token、mapping 表格筆數與統計數字一致；按「複製結果」後讀剪貼簿內容與結果區文字相同、toast 出現；按「下載結果」攔截 Blob 內容確認為去識別化後文字（不含原始個資）；空輸入與純空白輸入各按一次，顯示中性提示、不出現 `undefined`／`NaN`、不崩潰；貼入含 `<script>alert(1)</script>` 與 `<img src=x onerror=...>` 的文字，確認 `window.__xss` 未被設定、預覽區 `querySelector('script')`／`querySelector('img')` 皆為 `null`。

## Phase B（任務 6–10，對應 Day06 下篇）

- [x] 6. 實作 mapping 匯出 JSON / CSV 與「mapping 未下載」狀態追蹤（proposal 判斷 5、3）：JSON 頂層 `_warning` 欄位放最前、CSV 第一行為警告註解列第二行才是欄位標題、檔名固定樣板 `deid-mapping-DO-NOT-SHARE-YYYYMMDD-HHMM.{json,csv}`，走 `downloadFile(filename, content, mime)`；下載按鈕為結果區 primary，「複製結果／下載結果」為次要；狀態列預設「mapping 尚未下載 — 關閉此頁面後將無法還原」，按下任一 mapping 下載按鈕後切換為「mapping 已下載（`<檔名>`）」，狀態列不可關閉。
  驗證：實際下載兩種格式，`head -3` 確認 JSON 第一個鍵是 `_warning`、CSV 第一行是註解列；`JSON.parse` 與試算表開啟 CSV 皆正常；檔名不含任何使用者輸入字元；Playwright 確認未下載時狀態列文案出現、按下下載後文案切換並顯示檔名、狀態列無關閉控制項。

- [x] 7. 實作 mapping 載入與欄位驗證（proposal 資安 delta 第 4 點）：接受 `.json` / `.csv`（走 `setupDropZone()` 並以 `opts.accept` 擴充），`JSON.parse` 後逐筆驗證 token 格式、原文為字串、拒絕 `__proto__`／`constructor`／`prototype` 鍵；CSV 自行解析（處理引號與逗號），不使用 `eval` 或動態 `RegExp`；渲染表格前一律 `escapeHtml()`。格式錯誤顯示明確訊息且不整頁崩潰。
  驗證：載入正常 JSON／CSV 各一次成功；載入截斷的 JSON、欄位缺漏的 CSV、含 `"__proto__"` 鍵的 JSON、原文值為 `<img src=x onerror=...>` 的 mapping 各一次，確認皆顯示錯誤或安全渲染、`Object.prototype` 未被污染、無 XSS 觸發、「執行還原」維持 disabled。

- [x] 8. 實作 single-pass 還原引擎與「執行還原」按鈕（proposal 判斷 2、3）：一條 token regex（`/\[(ID|PHONE|EMAIL|PERSON|TERM|LITERAL)_\d{3,}\]/g`）掃一次去識別化文字，命中即查 mapping 並把結果寫入輸出緩衝區，**輸出緩衝區不再參與掃描**；mapping 內找不到的 token 原樣保留，並在結果區列出清單與「不在 mapping 內，已原樣保留」文案；未載入 mapping 時按鈕 `disabled`，且畫面上**不存在**任何「嘗試還原／智慧還原／猜測原文／部分還原」入口。
  驗證：Node.js 往返測試——含 `[PERSON_001]`／`[LITERAL_001]` 字面的原文，去識別化後再還原，與原文**逐字元相同**（`===` 比對）；另構造 mapping 原文值本身含 `[EMAIL_002]` 字面的案例，確認該字面在輸出中未被二次替換；Playwright 確認未載入 mapping 時按鈕 `disabled`，且 `document.body.innerText` 不含「嘗試還原」「智慧還原」「猜測」「部分還原」等字樣。

- [x] 9. **擴充 `buildCleanHtmlCopy()` 的清空範圍（本題最高風險的資安修改，獨立成條）**：v1 版本（`old/Day9/index.html:515-549`）只清 `text-input`／`sensitive-input`／`substitute-input`／`file-name`／`detect-stats`／`detect-preview`／`toast`，**不足以直接沿用**（`CONTRACT.md` 第 6 節對 Day05 的專門警告：mapping 就是完整個資，離線複本是設計來被分享的檔案）。v2 必須額外清空：mapping 表格 DOM、mapping 的**記憶體狀態變數**（序列化進 `outerHTML` 前先歸零）、已佔用 token 字面集合、還原分頁的兩個 textarea 與已載入的 mapping 檔名、未下載狀態列文字、還原結果與未知 token 清單；並沿用 v1 移除 `.nav-back`、指向本站的外連、下載工具按鈕自己。
  驗證（本條自己的驗收，不併入其他條）：在頁面上跑一輪含**可辨識測試字串**的完整流程（去識別化 + 匯出 mapping + 載入 mapping + 還原），再下載離線 HTML，對下載檔逐一 `grep` 每一個測試字串（原文個資、token 字面、mapping 原文值、檔名）確認**全部 0 筆命中**；離線檔的 `document.querySelectorAll('.nav-back').length === 0`（**用 DOM 層判定，不要用 `grep`**——內嵌的 base.css 有 `.nav-back` 樣式規則、`buildCleanHtmlCopy()` 自己的原始碼也含該字串，字面 grep 為 0 是不可能達成的條件）；離線檔載入時 **console 無任何 uncaught error**；離線檔在瀏覽器開啟後 mapping 表格為空、兩個分頁所有輸入框為空、狀態列回到初始文案，且去識別化與還原功能仍可正常操作。

- [x] 10. 全檔邊界情況與資安檢視，並撰寫 `VibeCoding/Day05_reversible-deidentifier/SECURITY_REVIEW.md`：逐項記錄 proposal「v1 `SECURITY_REVIEW.md` 結論的適用性盤點」六項 delta 的處理結果與證據。
  驗證：`grep -nE 'localStorage|sessionStorage|indexedDB|eval\(|new Function|fetch\(|XMLHttpRequest|beforeunload' index.html` 全部 0 筆；`grep -nE '安全|已保護|乾淨|100%|完全|全部|無虞' index.html` 逐筆人工確認無過度承諾用法；邊界情況重跑一輪（空輸入／全空白／超長單行／格式錯誤 mapping／原文含大量 token 樣式字串）確認不出現 `NaN`、不崩潰；離線 HTML 放到隔離目錄另一個 port 開啟，去識別化與還原行為與線上頁面一致；Network 面板全程零對外請求。

## 驗收條件

> 分階段標注：不涉及「還原」的條件在 **Phase A（Day05）** 結束時就該通過；凡驗收內容含「還原」「載入 mapping」「離線版含 mapping/還原狀態」的，要等 **Phase B（Day06）** 完成才成立。

### Phase A 結束時應通過（不涉及還原）

- 情境：當同一個 Email（含大小寫不同的寫法）在文中出現多次並執行去識別化，就全部替換為同一個 Token，mapping 中只有一筆對應紀錄、次數欄顯示實際出現次數。（PRD 05 原有）
- 情境：當文中同時出現手機（`0912-345-678`）與市話（`02-2345-6789`），就兩者都被偵測到（兩條格式不同的 regex 各自命中），但 Token 類型同為 `PHONE`，分別得到 `[PHONE_001]` 與 `[PHONE_002]`。
- 情境：當原文輸入區為空字串就按下「執行去識別化」，就顯示中性提示（如「請先輸入文字」），不產生空 mapping、不整頁崩潰、不出現 `undefined` 或 `NaN`。
- 情境：當輸入一段完全不含個資也未命中手動敏感詞的文字，就顯示「未命中任何規則」並補述「這不代表文中沒有個資」，結果區文字與原文相同，mapping 為 0 筆且下載 mapping 按鈕不產生空檔案假象。
- 情境：當使用者手動指定的敏感詞是自動偵測結果的子字串（手動「小明」、自動偵測到「王小明」），就兩者合併為單一 match，字面取聯集「王小明」、類型取優先序較高的 `TERM`，全文所有出現位置拿到同一個 `[TERM_NNN]`，mapping 不出現重複列也不留下未被替換的「王」。
- 情境：當使用者完成去識別化但尚未下載 mapping，就結果區持續顯示「mapping 尚未下載 — 關閉此頁面後將無法還原」；按下任一 mapping 下載按鈕後，文案切換為已下載並顯示檔名。
- 情境：當使用者按下「複製結果」與「下載結果」，就剪貼簿內容與下載檔內容均為去識別化後的文字，不含任何原始個資，也不含 mapping 內容。
- 情境：當輸入文字或 mapping 原文值含 `<script>`、`onerror` 等 HTML 特殊字元，就並排預覽區與 mapping 表格皆顯示為純文字、不被瀏覽器解析執行。

### Phase B 結束時才成立（涉及還原／mapping 載入）

- 情境：當載入正確的 mapping 並對去識別化後的文字執行還原，就還原結果與原始文字逐字元相同。（PRD 05 原有）
- 情境：當使用者在還原分頁尚未載入 mapping，就「執行還原」按鈕為 disabled，畫面明確說明工具不保存 mapping、缺少 mapping 時無法推回原文，且畫面上不存在任何「嘗試還原」「智慧還原」之類的替代入口。（PRD 05 原有）
- 情境：當原文中同一個人被截出不同長度的姓名（A 處「王小明」、B 處單獨出現「王小」），就兩者各自成為一個 Token（不做前綴合併），mapping 出現兩列，且還原後兩處皆與原文逐字元相同。
- 情境：當原文本身就含有 `[PERSON_001]`、`[LITERAL_001]` 這類 token 樣式字串，就這些字面被偵測並替換為新的 `[LITERAL_NNN]` token（且新分配的 token 不與原文既有字面相同），畫面提示「原文含 N 處 token 樣式字串，已一併處理」；後續用該 mapping 還原的結果與原文逐字元相同。
- 情境：當還原時文中出現 mapping 內不存在的 Token，就該 Token 原樣保留不被替換也不被刪除，結果區列出這些 Token 並標示「不在 mapping 內，已原樣保留」，其餘 Token 正常還原。
- 情境：當載入的 mapping 檔格式錯誤（JSON 截斷、CSV 欄位缺漏、含 `__proto__` 鍵），就顯示明確錯誤訊息、`Object.prototype` 未被污染、頁面不崩潰，且「執行還原」維持 disabled。
- 情境：當 mapping 的原文值本身包含另一個 Token 的字面（例如原文值為 `聯絡 [EMAIL_002]`），就還原時該字面原樣輸出、不被二次替換。
- 情境：當使用者在頁面上處理過含個資的文字（含匯出與載入 mapping、執行還原）後下載本工具離線版，就下載出的檔案不含任何原文、Token 字面、mapping 內容與已載入檔名，也不含返回作品集連結與下載工具按鈕本身；該檔開啟後所有欄位為初始空白狀態。
- 情境：當在斷網／隔離環境開啟下載的離線 HTML，就去識別化與還原兩項核心功能行為與線上頁面一致，Network 面板全程零對外請求。
