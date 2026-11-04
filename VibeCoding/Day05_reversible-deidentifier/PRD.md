# PRD 05 — 可逆式文字去識別化（reversible-deidentifier）

> 來源：`2026-ironman-vibecoding-30-prd.md` 第 153-182 行（PRD 05），本檔為 Day05／Day06 產品對應整理。
> 設計判斷的完整理由見 `sdd/reversible-deidentifier/proposal.md`「六個關鍵設計判斷」。

- **英文短名稱**：`reversible-deidentifier`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/reversible-deidentifier/`
- **互動模式**：按鈕觸發（`shared/CONTRACT.md` 第 5 節：Token 化後有 mapping 狀態，即時重算會沖掉狀態）
- **實作階段**：Phase A（任務 1–5，Day05 上篇）已完成；Phase B（任務 6–10，Day06 下篇）未實作

## 為什麼做

文件交給外部人員或 AI 前，常要移除姓名、電話、Email 等資訊；工作完成後又可能要在本機把處理結果還原成原本的人名與聯絡方式。

## 輸入

貼上文字、拖曳 TXT / MD 檔案；手動指定姓名／敏感詞（一行一個）。

## MVP

- 規則辨識 Email、手機、市話、身分證字號；姓名為姓氏字典啟發式。
- 使用者手動指定姓名／敏感詞。
- Token 化，如 `[PERSON_001]`。
- 產生 mapping（Token ／原文／類型／次數）。
- mapping 匯出 JSON / CSV。（Phase B）
- 以 mapping 還原。（Phase B）
- 原文／結果並排。
- 全程 browser-side。

## 不做

宣稱找出文中每一處個資、雲端保存 mapping、自動送 AI、mapping 加密、逐項勾選確認、`beforeunload` 離開確認、任何「嘗試還原／智慧還原／猜測原文／部分還原」入口。

## Level 1 共通 UI 基線（`shared/CONTRACT.md` 第 6 節）

- 複製結果到剪貼簿（`io-clipboard.js`）
- 下載結果檔案（`io-download.js`，輸出去識別化後文字 `deid-result.txt`）
- 下載本工具離線版（`buildCleanHtmlCopy()`）——**Phase B**，清空範圍必須涵蓋 mapping 表格 DOM、mapping 記憶體狀態、已佔用 token 字面集合、還原分頁欄位與已載入檔名、`#__shared_toast`

## 判定規則（`sdd/reversible-deidentifier/proposal.md` 明確定義）

- **偵測器 4 條 regex**：`id` / `mobile` / `landline` / `email`。手機與市話格式不同、兩條都比對，但命中後歸同一個 `PHONE` token 類型。
- **Token 前綴 6 種**：`ID`、`PHONE`、`EMAIL`、`PERSON`、`TERM`（手動指定）、`LITERAL`（原文既有的 token 樣式字面）。格式 `[<PREFIX>_<NNN>]`，各前綴獨立遞增、三位補零，超過 999 進位為四位。
- **Token 分配鍵是 `(類型, 正規化字串)`**，不是「實體」。同名合併、同一人的不同 Email 不合併——可逆的前提是字面雙射。
- **正規化規則**（不得自行擴充）：Email 全轉小寫；手機與市話移除 `-`、`(`、`)`、半形與全形空白後共用同一組規則；身分證首字母轉大寫；姓名與手動敏感詞不正規化。mapping 保存第一次出現的原始寫法。
- **姓名採最長匹配（貪婪）**，token 鍵是實際匹配到的字面，不做前綴合併：`王小` 與 `王小明` 是兩個鍵、兩個 token。
- **重疊合併**：兩個 match 區間只要有任何重疊（含包含與部分重疊）就合併成單一 match，範圍取聯集、type 取優先序最高者。這是對 v1 `mergeAndDedupe()`「丟掉重疊者」的行為變更。
- **型別優先序**：`TERM > ID > PHONE > EMAIL > PERSON`；`LITERAL` 置於 `TERM` 之後、`ID` 之前（與 `TERM` 同屬「字面已確定」的來源，優先於任何啟發式偵測）。
- **type 歸併一致性檢查**：區間層合併後再掃一次，同一字面在不同位置若得到不同 type，一律歸併到優先序最高者，避免同一字串拿到兩個 token。
- **原文既有 token 樣式字面**收編為 `[LITERAL_NNN]`，且新分配的編號跳過原文已佔用的字面。
- 手動指定的敏感詞用 `String.indexOf` 精確比對，不編譯成 `RegExp`（避開 ReDoS 與樣式注入）。

## 文案原則（proposal 判斷 4）

主詞是「工具做了什麼」而非「資料變成什麼狀態」；偵測依據與其限制同框顯示；責任歸屬寫在結果區；明列不偵測什麼；不使用安全語彙的視覺符號；動作按鈕照實命名。禁用詞：安全、已保護、乾淨、完全、100%、全部、無虞。

## 驗收條件

### Phase A（已完成）

- 情境：同一 Email（含大小寫不同的寫法）多次出現時使用同一 Token，mapping 只有一筆、次數欄顯示實際出現次數。
- 情境：兩個不同 Email 拿到不同 Token。
- 情境：手機（`0912-345-678`）與市話（`02-2345-6789`）都被偵測到，Token 類型同為 `PHONE`，分別得到 `[PHONE_001]` 與 `[PHONE_002]`。
- 情境：手動敏感詞是自動偵測結果的子字串（手動「小明」、自動「王小明」），合併為單一 match，字面取聯集「王小明」、類型取 `TERM`。
- 情境：原文本身含 `[PERSON_001]`、`[LITERAL_001]` 這類字面時被收編為新的 `[LITERAL_NNN]`，且新分配的 token 不與原文既有字面相同。
- 情境：空輸入或純空白輸入顯示中性提示，不產生空 mapping、不崩潰、不出現 `undefined` 或 `NaN`。
- 情境：不含個資的文字顯示「未命中任何規則」並補述「這不代表文中沒有個資」。
- 情境：複製結果與下載結果的內容均為去識別化後的文字，不含原始個資，也不含 mapping 內容。
- 情境：輸入含 `<script>`、`onerror` 時，並排預覽區與 mapping 表格皆顯示為純文字。
- 情境：`scripts/bundle.py` 產出的 `index.html` 斷網開啟，去識別化功能仍可用。

### Phase B（未實作）

見 `sdd/reversible-deidentifier/tasks.md`「Phase B 結束時才成立」一節。

## Library / 依賴

無外部 library、無 API 呼叫、無 AI，全程 browser-side 原生 JS。共用模組：`shared/util-escape.js`、`shared/ui-toast.js`、`shared/io-download.js`、`shared/io-clipboard.js`、`shared/io-dropzone.js`（皆為 `internal / project-internal`，見 `bundle_manifest.json`）。無外部 ASSET。
