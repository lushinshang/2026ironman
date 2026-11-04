# Session 對話與思考日誌（手動整理版，2026-08-23）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗（已於 Day07 等既有日誌記錄過此限制）。**本檔為非腳本自動產出、環境不相容**，改為依同一份既有格式手動彙整，素材來源為 git commit history（`f7b72ff`、`11a3e50`、`8da81e7`）、`sdd/csv-period-diff/proposal.md`、`sdd/csv-period-diff/tasks.md`、`VibeCoding/shared/CSV_CONTRACT.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。
* **素材限制（先說在前面）**：Day08 `csv-doctor` 與 Day09 `csv-period-diff` 是由 sonnet subagent 併行實作、指揮官事後獨立複驗，**不是本人逐輪跟 AI 對話開發**。因此本檔能重建的是「提案審查與複驗階段留下的紀錄」，不是逐輪對話記錄；找不到對應 commit 佐證的細節一律不寫，不用推測填補。

---

## 背景：Level 1b（CSV 資料層）的前置工程

commit `f8c3a86`：Level 1b（CSV）五題（Day08–Day12）提案階段完成，含資料層契約 `CSV_CONTRACT.md` 與三輪審查。Day09 `csv-period-diff` 是這五題之一，proposal 明確假設 `shared/csv-decode.js`／`csv-parse.js`／`csv-write.js`／`csv-types.js` 與 `io-dropzone.js` 的 `mode:'bytes'` 擴充會在本題開工前就緒，若屆時未就緒本題無法開工——這是提案階段寫明的阻塞條件。

## 提案審查：十一輪獨立驗收抓到的契約層級的洞

commit `11a3e50`：Level 1b 提案通過十一輪獨立驗收（`codex exec -s read-only`，唯讀 sandbox 保證「只判定不修理」，第四～十四輪，缺陷數收斂軌跡 6→3→2→5→3→1→1→1→1→1→0）。與 Day09 直接相關的發現：

- **提案彼此矛盾**：三題（Day08/Day11/Day12）各自對「型別判準」加了不同的二次門檻，組合鍵分隔符各題各用各的——Day09 用到的 `\0` 分隔符因此被拉進契約 4.0c 統一定義，供 Day08（Group By 找重複）、Day09（多欄 Primary Key）、Day11（多欄 Group By）三題共用。
- **提案違反契約**：發現有題目自寫拖放邏輯繞過編碼偵測，因此契約收斂為「五題一律用 `io-dropzone.js` 的 `setupDropZone`／`setupFilePicker`，不自寫拖放/選取邏輯」，Day09 的 proposal 據此明文排除自寫讀檔邏輯。
- **契約本身有洞：大檔案門檻無處可掛、`dateParts()` 未定義、閘門時序靠呼叫端自律**——這條與 Day09 直接相關。閘門判定與讀檔被介面拆成兩個獨立步驟，順序沒有結構性保證，五份 CSV 題提案原本都寫成「讀完 `ArrayBuffer` 才檢查大小」，字面上沒有違反契約（契約當時沒把「之前」定義清楚），但這樣寫法讓大檔案門檻形同虛設。

`CSV_CONTRACT.md` 第 4 節留下這段紀錄佐證此事：

> ⚠️ **`gate` 必須在讀檔之前執行，這是設計要點不是實作細節。**
> 2026-08-23 複驗發現原本的寫法把閘門放在拿到 `ArrayBuffer` 之後——那等於閘門白設，
> 500 MB 的檔案照樣先整份讀進記憶體，正是第 5 節要防的無聲卡死。

修法是把 `io-dropzone.js` 的 `setupDropZone`／`setupFilePicker` 開放 `opts.gate(file)` 回呼，在讀檔之前呼叫、`!ok` 就直接 `onError` 且不建立 `FileReader`，把順序做進介面而非留給呼叫端自律。

## 契約補訂：五項內部矛盾

commit `8da81e7`：另一輪 fresh agent（opus）獨立驗收 `csv-infra`，判定契約自己有三項問題並補訂：`cellAt()` 統一短列讀取（不得直接寫 `row.cells[i]`）、`raggedRows` 排除空白列、`parseCsv` 的 `meta` 六欄不得缺、`toCsv` 的 `columns` 明定為欄索引、`parseCsv` 自剝 BOM。這幾項屬於五題共用的資料層基礎設施，Day09 依賴但未參與這輪審查本身。

## 實作：Day08、Day09 併行完成（commit `f7b72ff`）

commit 訊息記錄：「兩題由 sonnet subagent 併行實作，指揮官獨立複驗（本機 playwright，非 MCP——MCP 瀏覽器是共享實例，併行 session 會互搶分頁）」。

**複驗項目與結果**：
- manifest 十個雜湊全部與現行 `shared/` 相符（含剛修的 `csv-write.js`，非內嵌舊版）
- `shared/` 未被任一 agent 動到
- 執行期外部請求 0、pageerror 0（XMLHttpRequest 命中是 papaparse 的 download 功能，不觸發）
- 實體控制字元 0 筆

**離線版洩漏測試（Level 1a 系列唯一外洩過的地方，本輪最關鍵的複驗項目）**：

commit 訊息記錄測試設計本身修了三次才有效：
1. 檢查全域 `buildCleanHtmlCopy` → 錯，它在 IIFE 內（Day01 也一樣的教訓）
2. 用乾淨值當哨兵 → 錯，Doctor 只列出「有問題的格」，哨兵不會被渲染，等於沒帶資料就測清空
3. Day09 點「複製」在 headless 下沒觸發 toast → 改直接注入 `showToast('已複製：ZZTOASTLEAK')` 才測得到 toast 訊息路徑

commit 訊息原句：「『資料沒進去就測清空』會得到假通過」。

最終測法：兩份 CSV 比對 + 注入 toast 哨兵 → 下載離線版 → 五個哨兵（含 toast 訊息）全 0 筆，DOM 斷言（`__shared_toast === null`、`.nav-back` 長度 0、載入無錯誤）全過。

**實作者自己在打勾過程抓到的坑**：Day09 的 Write 工具把 `\0`（契約 4.0c 定義的多欄組合鍵分隔符）寫成實體 NUL byte，自行改回逃脫序列。這是 tasks.md 打勾過程中發現並修正，commit 訊息明確歸類為「實作者自己抓到」而非複驗抓到，本檔按此區分。

（Day08 也有一項對應的自行發現：修掉 `onData()` 會清掉 `onGate()` 剛設好的 warn 訊息——與 Day09 無直接關係，此處僅供對照，不展開。）

## 未能重建的部分（誠實列出）

- Day09 的 sonnet subagent 實作過程中，逐條 task（T1–T10）的具體對話內容、中途調整、AI 提出的方案與被打回的方案——**這些沒有留下 commit 層級以外的紀錄**，本檔不編造。
- `tasks.md` 全部十條 task 均已打勾，但每條驗收條件實際被跑過幾次、輸出內容為何，未見獨立於 commit message 之外的紀錄，本檔僅能依 commit `f7b72ff` 摘要的複驗結果轉述，無法逐條列出每一條 task 的原始驗證輸出。
- Playwright 複驗腳本的原始碼與截圖產物，本次撰寫日誌與文章時查無可讀取的檔案，未附截圖，於文章 `article_draft.md` 文末已標註「未驗證項目誠實揭露」。

## 驗收

`sdd/csv-period-diff/tasks.md` 十條 task 於 commit `f7b72ff` 全部標記完成；commit 訊息記錄的複驗結果詳見上方「離線版洩漏測試」一節。收尾階段（`VibeCoding/README.md`、`VibeCoding/index.html` 進度表與雙向連結測試）依 `CHECKLIST.md` 第六節屬另一階段工作，本檔不涉及。
