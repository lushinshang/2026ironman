# Session 對話與思考日誌（手動整理版，2026-08-23）

* **記錄方式**：根目錄 `readme.md` 要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗（`CHECKLIST.md` 第四節已記錄此陷阱）。**本檔為非腳本自動產出、環境不相容**，改為依既有格式（參照 `Day07_text-diff/logs/`）手動彙整，素材來源為 git commit history（`f8c3a86`／`11a3e50`／`2584295`）、`sdd/csv-batch-splitter/{proposal,tasks}.md`、`VibeCoding/shared/CSV_CONTRACT.md`、`VibeCoding/shared/CONTRACT.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 背景：Level 1b 前置工程與提案

commit `f8c3a86`（2026-08-23 20:04）：Level 1b（CSV 系列）提案階段完成，一次產出五題的 `sdd/csv-{infra,doctor,period-diff,batch-splitter,pivot-dashboard,one-page-report}/`（`csv-batch-splitter` 即 Day10 本題）與共用契約 `shared/CSV_CONTRACT.md`。此次 commit 訊息記錄的核心原則：parser 不做任何「貼心」修正，因為常見 CSV library 的預設行為（自動改重複欄名、補齊短列、自動 trim、自動轉型）會把姊妹題 `csv-doctor` 要偵測的問題全部藏起來。

同一次 commit 的選型記錄（附實測證據）：
- 解析：Papa Parse 5.6.0（MIT）
- 編碼：TextDecoder 三段式 + 手動切換逃生口
- **ZIP：fflate 0.8.3**（jszip 近四年未發版，不選）
- 圖表：手寫 SVG（Chart.js 內嵌兩次要 417KB，不成比例）

commit `11a3e50`（2026-08-23 21:25）：提案通過 codex `-s read-only` 沙盒執行的 11 輪獨立驗收（第 4～14 輪，缺陷數收斂軌跡 6→3→2→5→3→1→1→1→1→1→0）。此輪修正五個層次的缺陷：提案彼此矛盾、提案違反契約、契約本身有洞、驗收條件本身壞掉（六次「字面上不可能通過」）、驗收工具本身壞掉。`CONTRACT.md` 第 6 節「怎麼測」與六個「不可能通過的驗收條件」對照表即此輪新增，其中第 2、3 筆就是本題與 `csv-infra` 各自的 ZIP 驗收條件（用系統內建 `unzip` 核對中文檔名——字面上不可能通過）。

`CSV_CONTRACT.md` 7.3 節同一輪已寫下 fflate 中文檔名的實機驗證結果（EFS bit 6/6 檔名一致），並記下 macOS 內建 `unzip` 不支援 EFS/UTF-8 flag、會讓正確的中文檔名 ZIP 假性失敗的陷阱，明文提醒「Day10 務必注意」。

## 實作（commit `2584295`，2026-08-24 01:05）

由 sonnet subagent 實作，指揮官（Opus）獨立複驗。commit message 完整記錄了複驗實測範圍與實作過程中發現的兩處問題。

### tasks.md 執行順序（9 條任務）

1. `src/index.html` 模板 + `bundle.json`——驗證含 5 個核心選擇器唯一性、`ASSET`/`SHARED` placeholder 與 `bundle.json` 差集為空、拖放與 input 皆走 `setupDropZone`/`setupFilePicker`（過程中把原本用 `change` 事件的綁定改成 `input`，才通過「不得自行接 `change` 事件」的驗證）
2. 上傳解析與分組核心——**過程中修正一個 bug**：`onUploadData` 原本在解析完成後把 `uploadMsgEl.className` 重設為 `''`，蓋掉 gate 剛設定的 `warn` class（警示文字有留，樣式沒了）。已移除該行，改為只在 Big5 fallback 時附加訊息、不覆蓋 class
3. 檔名生成規則 `sanitizeFilename()`——**過程中發現並裁定一處規格矛盾**：proposal.md Step1 寫「置換為 `_`」不是「移除」，字面上 `///` 會變成 `___` 而非空字串，跟 Step7 舉的「`///` → 未命名」範例矛盾。裁定「全部由底線組成」視同空字串，落入 Step7 兜底，並在程式碼加註解說明理由
4. 撞名去重 `dedupeFilenames()`——依原表出現順序，撞名附加 `_2`/`_3`……，去重比對不分大小寫
5. 保留 Header 與排除欄位——單檔與 ZIP 兩條路徑皆驗證 header/資料列同步移除被排除欄位、UTF-8 BOM 前綴
6. 總筆數守恆 UI 提示——全勾選顯示「一致」，取消勾選顯示「已排除 N 組」
7. 單檔下載——未勾選群組仍可單獨下載
8. **全部 ZIP 下載 + 中文檔名實機解壓驗證**——三層驗證（外觀 `ditto`/`bsdtar`、位元組層 `written==extracted`、struct-level 解析 general purpose bit flag bit 11）。全程未使用 `unzip`/`zipinfo`
9. `bundle.py` 打包、斷網驗證、Playwright 邊界情況（4 種邊界 CSV）與資安快速檢查（XSS 跳脫實測、離線版哨兵 `ZZSPLITCOL`/`ZZSPLITVAL` 零洩漏）

### 踩坑：`clipboard.readText()` 卡死約 30 分鐘

task 9 的「過程記錄」明確寫下：一開始用 MCP 共用的 Playwright 瀏覽器實例驗證，途中發生兩個問題——
1. 分頁被其他並行 session 搶走（`browser_snapshot` 回傳到別的 Day08 頁面）
2. `navigator.clipboard.readText()` 卡死，最終在 1800 秒（30 分鐘）被系統中止

這兩條坑**都已經寫在 `CHECKLIST.md` 第四節「已知環境陷阱」裡**（「`browser_evaluate` 對 `fetch(blob:URL)` 會卡死」「多個 agent 併行時，不要共用 Playwright MCP 瀏覽器」），仍在本題被重新踩到。commit message 明確標註「本題耗時 45 分鐘，主因是踩到 `clipboard.readText()` 卡 1800 秒（交接書第 4 節第 6 點已記錄該坑）」。

改用本機 `pip` 安裝的 Playwright（`playwright==1.55.0`，獨立 Chromium context，不共用瀏覽器）之後，XSS、斷網六動作、clipboard、network 檢查才全部順利跑完。

### 指揮官對「規格矛盾自行裁定」的評語

commit `2584295` 訊息裡指揮官對 task 3 的裁定方式留下明確評語：內容正確故採納，但**程序上要註記**——依 PRD 共通規則第 4 條「規格不明就停下回報」，實作者本應停下，卻自己解掉了規格矛盾。已記入 `sdd/LEVEL1B_RULINGS.md` 第 16 條，評語原文：「派工 prompt 已寫『規格不明就停下回報』仍發生，代表當矛盾看起來有明顯正解時，實作者傾向自己解掉。」

## 驗收

複驗由指揮官（Opus）本機 Playwright 攔截 Blob（非 MCP）實測，commit message 記錄的複驗項目：
- 中文檔名 zip 三個 entry 的 EFS bit 全部 SET（struct 層級解析 local file header）
- Python `zipfile` 解出檔名與內容正確
- 拆分後總筆數等於原表（PRD 12 驗收條件第 3 條）
- 檔名邊界六種：`///` → `未命名.csv`、空字串 → `(空值).csv`、`CON` → `CON_group.csv`、
  `A/B 組` → `A_B 組.csv`、`A:B 組` → `A_B 組_2.csv`（撞名加序號）
- bundle 順序正確：fflate 位移 977 在 io-zip 的 73056 之前，不觸發依賴守衛
- `pageerror` 0、無直接 `.cells[` 取值、無實體控制字元

`sdd/csv-batch-splitter/tasks.md` 的驗收條件章節共 12 條情境，逐條對照 task 1–9 的「實跑結果」段落，全部有對應的實測記錄。

## 缺口說明（本檔未涵蓋的部分）

- git history 中未見獨立於 commit message 之外的逐輪對話紀錄（例如完整的 codex 驗收輸出、或 subagent 執行過程的完整 transcript），本檔的細節皆整理自 commit message 與 `tasks.md` 的「實跑結果」欄位，非逐字對話記錄
- `sdd/csv-batch-splitter/` 尚未歸檔至 `sdd/archive/`（依 `CHECKLIST.md` 第六節，歸檔為文章與驗收完成後的收尾動作，本篇撰寫時點尚未執行）
