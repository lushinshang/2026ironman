# Session 對話與思考日誌（手動整理版，2026-08-23）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗。**本檔為非腳本自動產出、環境不相容**，改為依同一份既有格式手動彙整，素材來源為 git commit history（`f7b72ff`、`11a3e50`、`f8c3a86`、`8da81e7`、`399a984`、`5db327d`）、`sdd/csv-doctor/proposal.md`、`sdd/csv-doctor/tasks.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 說明：本題可考證的素材範圍

Day08 `csv-doctor` 與 Day09 `csv-period-diff` 在同一個 commit（`f7b72ff`，2026-08-24）由 sonnet subagent 併行實作完成，commit message 集中記錄兩題共通的複驗結果與踩坑，沒有逐題拆開的開發歷程細節（例如哪一條 task 花了多久、哪個判定式改過幾版）。以下依 git 歷史與 `tasks.md` 逐段記錄，**素材不足的部分在對應段落明確標註，不用推測填滿**。

## 前置：契約定案階段（先於本題開工，但直接決定本題能不能正確運作）

Level 1b 五題共用同一份 `shared/CSV_CONTRACT.md`，在 Day08 開工前經過三個階段：

1. `f8c3a86`（2026-08-23）：契約首次定案，核心原則「parser 不做任何貼心修正」，理由直接點名 Day08：「如果 parser 自作主張把這些修好了，Day08 就沒有東西可以偵測。」選型附實測證據：Papa Parse 5.6.0、TextDecoder 三段式編碼偵測、fflate 0.8.3、圖表手寫 SVG。
2. `11a3e50`（2026-08-23）：提案階段由 `codex exec -s read-only` 跑十一輪獨立驗收，收斂軌跡 6→3→2→5→3→1→1→1→1→1→0。抓到的缺陷分五層：提案彼此矛盾（型別門檻、組合鍵分隔符、Pie 門檻）、提案違反契約（自寫拖放繞過編碼偵測）、契約本身有洞（大檔案門檻無處可掛、`dateParts()` 未定義）、**驗收條件本身壞掉（六次字面上不可能通過）**、驗收工具本身壞掉（`grep -P` 在 BSD grep 跑不起來）。
3. `399a984`（2026-08-23）：`toNumber()` 非數字回傳值裁示為 `NaN`（不用 `undefined`），理由是與 `parseFloat` 一致、`NaN` 會一路傳播比較容易被發現、檢查一律用 `Number.isNaN()` 不得用全域 `isNaN()`。這條寫進契約 4.0b，Day08 的 D5（數值欄混文字）直接依賴這個判定。

## 契約補訂：`cellAt()` 與內部矛盾修正（`8da81e7`，2026-08-23）

fresh agent（opus）獨立驗收 `csv-infra`，抓到契約自己的內部矛盾：§3.1「短列不補齊」與 §3.2「空值只有空字串」在交界處對撞——短列缺的那格實測是 `undefined`，不是 `''`。

實測記錄：
```js
parseCsv('a,b,c\n1,2\n').rows[0].cells      // ["1","2"]，length 2
  .cells[2]            // undefined
  .cells[2] === ''     // false  ← Day08 的空值判定會整批漏掉 ragged 列
  .cells[2].trim()     // TypeError，整頁掛掉
```

裁示：`cells` 維持不補齊（`length` 與 `raggedRows` 才誠實），但讀取一律透過 `cellAt()`，五題不得直接寫 `row.cells[i]`。同輪還補了：raggedRows 排除空白列（避免空行噪音混進 D3）、`parseCsv` 需回傳 `encoding`／`hadBom`、`toCsv` 的 `columns` 明定為欄索引、`parseCsv` 需自己剝 BOM。

## 契約再補：`toCsv` 匯出補齊、`lineEnding` 僅供資訊（`5db327d`，2026-08-24）

第二輪獨立驗收（56 條斷言 + zip 位元組驗證 + `bundle.py` exit code 六組）全過，但明確化兩個觀察：
- `toCsv` 匯出一律補齊到 `headerCount`，理由是「欄數不齊的 CSV 本身是壞檔，下游打不開」；這不違反 §3.1，因為匯出是產生新檔案的行為，原始問題仍看得到 `raggedRows` 裡。
- `meta.lineEnding` 不得當 Day08 的健檢訊號：它統計原始文字所有換行、分不出引號內換行，一份純 CRLF 檔只要有一格內含 LF 就會被標成 `'mixed'`，拿它做「行尾不一致」健檢會對正常多行儲存格誤報。

## 實作與複驗（`f7b72ff`，2026-08-24）

依 `sdd/csv-doctor/tasks.md`，共 10 條任務（T1-T10），由 sonnet subagent 併行完成 Day08 與 Day09，指揮官獨立複驗改用本機 Python playwright（非 MCP——MCP 瀏覽器是共享實例，併行 session 會互搶分頁，`CHECKLIST.md` 已記錄此陷阱）。

複驗結果：
- manifest 十個雜湊全部與現行 `shared/` 相符（含剛修的 `csv-write.js`，非內嵌舊版）
- `shared/` 未被任一 agent 動到
- 執行期外部請求 0、`pageerror` 0
- 實體控制字元 0 筆

離線版洩漏測試（Level 1a 唯一外洩過的地方，本次沿用同一套測法）：
- Day08：上傳含哨兵 CSV → 開始健檢 → 哨兵確實渲染在畫面上 → 下載離線版 → `ZZDOCVAL`／`ZZDOCCOL`／檔名全 0 筆、`toast===null`、`nav-back=0`、載入無錯誤

測試設計本身修了三次才有效（跨 Day08／Day09 共通經驗）：
1. 檢查全域 `buildCleanHtmlCopy` → 錯，它在 IIFE 內
2. 用乾淨值當哨兵 → Doctor 只列出「有問題的格」，哨兵不會被渲染，等於沒帶資料就測清空
3. Day09 點「複製」在 headless 下沒觸發 toast → 改直接注入才測得到 toast 訊息路徑

commit 明文記錄：「資料沒進去就測清空」會得到假通過。

實作者自己抓到、與 Day08 直接相關的一件事：**修掉 `onData()` 會清掉 `onGate()` 剛設好的 warn 訊息**。commit message 對此僅一句話帶過，沒有更多前後脈絡（例如具體觸發情境、修正方式），**素材不足，本檔僅如實記錄此事實存在，不補寫推測細節**。

## 驗收條件本身壞掉：與 Day08 直接相關的一例

`CONTRACT.md` 第 6 節記錄的六個「字面上不可能通過的驗收條件」實例中，有一條直接影響 Day08 的離線版測試設計：原本擬定「離線版原始碼 `grep .nav-back` 為 0 筆」，但 `base.css` 本來就含 `.nav-back` 的樣式規則、會被 `bundle.py` 內嵌進產物，這條件字面上不可能成立。`shared/ui-toast.js:4,7` 的 `__shared_toast` 字串同理。

裁示：原始碼 grep 判定（哨兵值 `ZZDOCVAL`／`ZZDOCCOL`）與 DOM 層判定（`__shared_toast` 元素是否存在、`.nav-back` 元素是否還在畫面上，用 Playwright 斷言）分開、不可混用。T10 的驗收條件即依此重寫，`tasks.md` 裡明確標註「不可用 grep」。

## 環境陷阱（跨題，本批次記錄）

commit `f7b72ff` 記錄：多個 agent 併行時不共用 Playwright MCP 瀏覽器（互搶分頁會讀到別人頁面的 DOM 且不報錯），已寫進 `CHECKLIST.md` 第四節。`Write` 工具會把 `\0` 寫成實體 NUL byte（Day09 踩到，需自行改回逃脫序列，契約 4.0c），Day08 本身commit 未記錄是否踩到同一問題。

## 驗收

`sdd/csv-doctor/tasks.md` 全部 10 條任務（T1-T10）於 git 歷史中標記為已完成（`[x]`）。T10 附帶的建置與整合驗收（`bundle.py` 產出、`file://` 與本機伺服器雙路徑測試、4MB/6MB/21MB 三階大檔案門檻）未在 commit message 中逐項列出實測數字，**此部分素材不足，僅依 `f7b72ff` 的複驗記錄（大檔案門檻相關的具體 MB 數測試結果未見）與整體 manifest／離線版洩漏測試結果佐證任務完成**。
