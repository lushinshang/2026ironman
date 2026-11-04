# 交接書：Level 1b 實作（給 codex 或任何接手的 agent）

> 這份是**指令書**，不是參考資料。從第 0 節開始照做。
> 你要完成的是 Day08–Day13 六個發文日、五個產品，從實作到文章到歸檔。

---

## 0. 開工前必讀（依序，不可跳過）

| 檔案 | 為什麼一定要讀 |
|---|---|
| `VibeCoding/PROGRESS.md` | 交接狀態。**唯一可信的進度來源**，每完成一題就更新它 |
| `VibeCoding/shared/CSV_CONTRACT.md` | **全文**。Level 1b 五題共用的資料層契約，含選型定案與三個實測坑 |
| `VibeCoding/shared/CONTRACT.md` | 共用模組介面、`bundle.py` 用法、`buildCleanHtmlCopy()` 硬性要求 |
| `sdd/LEVEL1B_RULINGS.md` | 全部爭議點的裁示。**優先於各提案內既有敘述** |
| `VibeCoding/CHECKLIST.md` | 每日流程與文章結構規範 |
| `VibeCoding/README.md` | 開發順序（Day 編號的權威來源） |

衝突時的優先序：**使用者當下指示 > 契約 > 裁示檔 > 各題提案**。

---

## 1. 要做什麼

六份提案已寫好，並經 **14 輪審查**（後 11 輪由 `codex exec -s read-only` 獨立驗收），
判定「可以進入實作」。在 `sdd/` 底下，**依序實作，不要跳**：

| 順序 | SDD 目錄 | 產出目錄 | 說明 |
|:--:|---|---|---|
| 0 | `sdd/csv-infra/` | `VibeCoding/shared/`, `VibeCoding/scripts/` | **前置工程，必須最先完成並獨立驗收** |
| 1 | `sdd/csv-doctor/` | `VibeCoding/Day08_csv-doctor/` | |
| 2 | `sdd/csv-period-diff/` | `VibeCoding/Day09_csv-period-diff/` | |
| 3 | `sdd/csv-batch-splitter/` | `VibeCoding/Day10_csv-batch-splitter/` | 第一次產生 ZIP |
| 4 | `sdd/csv-pivot-dashboard/` | `VibeCoding/Day11_csv-pivot-dashboard/` | **上下篇＝Day11+Day12**，單一目錄。tasks 分 Phase A/B |
| 5 | `sdd/csv-one-page-report/` | `VibeCoding/Day13_csv-one-page-report/` | 列印版型 |

⚠️ **Day 編號與 PRD 編號不一致**，一律以 `README.md` 為準。

每一題的完整流程：**實作 → 獨立驗收 → 文章 → 開發日誌 → 更新 README 進度表 → 歸檔 sdd**。

---

## 2. 不可違反的規則

1. **驗證後才能說完成**：改完必須實際執行驗證，把指令與輸出貼進回報。
   「應該沒問題」「看起來是對的」= 未完成。AI 推論不算驗證，只接受執行結果。
2. **驗證不自驗**：寫的人不能當驗收的人。每題實作完，**開一個全新的 session/agent 做驗收**，
   而且**只給它驗收條件與產出位置，不給實作過程的敘述**（會被帶風向）。
3. **不加規格以外的東西**：不加提案沒寫的功能、錯誤處理、抽象。
4. **誠實回報**：測試失敗就說失敗；跳過的步驟明說；沒驗證的部分標「未驗證」。
5. **一次一條 task**，完成一條才動下一條，完成後自我檢查再打勾。

---

## 3. 這個專案的技術底線

- **單檔 HTML，零外部請求**。下載 `index.html` 後**斷網仍可用核心功能**
- 原始檔不覆寫，一律產生新檔供下載；資料全程留在瀏覽器，不上傳
- **不要手改 `DayNN_*/index.html`**，那是 build 產物。改 `src/` 再跑
  `python3 VibeCoding/scripts/bundle.py <src_dir> <out_dir>`
- 每題都要有：複製結果、下載結果、**下載本工具離線版**（`buildCleanHtmlCopy()`）
- `buildCleanHtmlCopy()` 的產物是**要分享出去的**，必須清空所有使用者資料。
  詳見 `CONTRACT.md` 第 6 節，那裡列了兩個踩過的坑

---

## 4. 已知會咬人的地方（都是實測，不是推測）

1. **Papa Parse 混用 CRLF/LF 會無聲併列**：`"a,b\r\n1,2\n3,4\r\n"` 會把第 2、3 列併成一列，
   `errors` 為空、不報錯。必須**先正規化行尾再 parse**（契約 7.1a）
2. **Papa 尾端會多吐一列 `[""]`** 要丟掉；但**檔案中間的空列必須保留**（那是 Day08 的健檢項目）
3. **大檔案閘門必須在讀檔之前**，走 `opts.gate` 回呼。寫成「拿到 ArrayBuffer 後才檢查」等於白設
4. **macOS 內建 `unzip` 不支援 EFS/UTF-8 flag**：對正確的中文檔名 zip 會顯示亂碼並報
   `Illegal byte sequence`。**失敗的是工具不是產品**。改用 `ditto -x -k` / `bsdtar` / Python `zipfile`
5. **實體控制字元會讓 `grep` 把整檔當 binary 靜默跳過**。掃描一律用
   ⚠️ 掃描要用 **perl**（macOS 內建），不要用 `grep -rlP`——BSD grep 不支援 `-P`：
   ```bash
   perl -ne 'if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/) { print "$ARGV\n"; close ARGV }' $(find sdd -name '*.md')
   ```
   ⚠️⚠️ **不要用不加 `-a` 的 `rg`／`grep`**：它們遇到含 NUL 的檔案會判定為 binary 而**直接跳過**——
   而 NUL 正是你要找的東西。實測 `rg -l` 抓得到 `0x01` 卻漏掉 `0x00`，`rg -a -l` 才兩個都抓到。
   **`grep` 回 0 筆不等於沒問題**
6. **Playwright 相關**：不能開 `file://`，要起 `python3 -m http.server`；
   `browser_evaluate` 對 `fetch(blob:URL)` 會卡死，取匯出內容改攔截 `window.Blob` constructor；
   不要碰 `clipboard.readText()`，會卡約 30 分鐘
7. **寫驗收條件之前先跑一次**。本專案累積踩了 **7 次**「驗收條件本身壞掉」：
   - 六次**字面上不可能通過**（`grep nav-back` = 0，但內嵌的 `base.css` 本來就有該規則；
     `grep __shared_toast` = 0，但內嵌的 `ui-toast.js` 本來就有；用 macOS `unzip` 驗中文檔名 zip）
   - 一次**永遠會通過**（`console 不出現 window.__xss 被設值`——JS 賦值本來就不產生 console 訊息）

   **規則**（完整版見 `shared/CONTRACT.md` 第 6 節那張六個實例的表）：
   - 結構性的東西（`#__shared_toast`、`.nav-back`）→ **DOM 層斷言**，不可用字串 grep
   - 內容性的東西 → **唯一哨兵**（`ZZ` 開頭字母字串），不可用 `1`／`2026` 這種一般值
   - 斷言要驗**行為**不要驗**原始碼長相**（`grep innerHTML` 證明不了執行時有沒有跳脫）

8. ⚠️ **Write 工具會把 `\0` 落成實體 NUL byte**（已發生 3 次：Day09、Day11、以及提案階段一次）。
   寫完含逃脫序列的程式碼後**一定要掃一次**：
   ```bash
   perl -ne 'if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/) { print "$ARGV\n"; close ARGV }' <檔案>
   ```
   有命中就用位元組層級取代修掉。⚠️ 實體 NUL 會讓 `grep` 把整個檔案判定為 binary 而**靜默跳過**，
   所以「grep 沒找到問題」不等於「沒問題」。

9. **新增哨兵前先查已佔用登記表**（`shared/CONTRACT.md` 第 6 節）。
   哨兵跨題重用會讓「離線版不含使用者資料」的驗收失去歸因能力——命中了也不知道是哪一題殘留的。
   查重：`grep -rho 'ZZ[A-Z0-9]*' sdd/csv-*/tasks.md | sort -u`

10. **macOS 內建 `/usr/bin/grep` 是 BSD grep，不支援 `-P`**。要用 PCRE 就用 `rg -nP` 或 `perl -ne`。
   ⚠️ 你的 shell 可能走到 homebrew 的 `ggrep`／`ugrep`（支援 `-P`）而以為沒問題——
   **「我這裡跑得起來」不等於「這條指令可用」**，這個坑本專案剛踩過。

11. **每寫一條「無輸出 = 通過」的檢查，就配一次反證**：故意製造一個違規，
    確認它**真的會輸出**，再還原。一條「永遠不輸出」的指令和一條「通過所以不輸出」的指令，
    從結果上看一模一樣。

12. **`scripts/generate_log.py` 在非 antigravity 環境必失敗**。開發日誌改手動整理進
   `DayNN_*/logs/`，檔頭註明「非腳本自動產出、環境不相容」

---

## 5. 文章

規範見 `VibeCoding/CHECKLIST.md`。重點：
- 繁體中文台灣用語，每篇不少於 300 字，六段結構（情境→解題思路→資源→Vibe 過程→產品→心得與反思）
- **必須包含實際的個人觀點與判斷**，不可完全由 AI 生成（賽事規則）
- 寫**當下真實發生的事**，包含踩到的坑與失敗的嘗試。不要事後美化成一路順利
- 圖表用 Mermaid，寫完用 `mmdc -i x.mmd -o x.svg` 實際渲染驗證過才算數

---

## 6. 隱私與發布

- ⚠️ **所有產出、日誌、文件裡嚴禁出現真實個資**（姓名、電話、email、地址、身分證字號、金鑰）。
  需要範例一律用虛構去識別化資料
- ⚠️ **產生專案網址時一律用 `<GITHUB_USER>` 佔位符**，不要寫出真實 GitHub 帳號
- `VibeCoding/` 目錄有使用者的**常設 commit + push 授權**，不需逐次詢問。
  **其他目錄一律先問**。push 後要回報檔名與 GitHub Pages 網址
- commit message 用繁體中文，結尾加：
  `Co-Authored-By: <你的模型名稱> <noreply@anthropic.com>`

---

## 7. 完成的定義

六題全部滿足才算完成：

- [ ] `sdd/csv-infra/` 全部 task 打勾，共用模組獨立驗收通過
- [ ] Day08–Day13 每題：實作完成、`bundle.py` 產物已生成、**獨立驗收通過**
- [ ] 每題的 PRD 驗收條件（各三條）都有實際執行過的驗證證據
- [ ] 每題有文章草稿與開發日誌
- [ ] `VibeCoding/README.md` 進度表已更新
- [ ] `sdd/csv-*/` 已 `git mv` 至 `sdd/archive/YYYY-MM-DD-<短名稱>/`
- [ ] `VibeCoding/PROGRESS.md` 已更新到最新狀態
- [ ] **跑完 `shared/CSV_CONTRACT.md` 第 8 節的跨題一致性檢查**（三條指令，皆須無輸出），
      並各做一次反證
- [ ] 已 push，且實際確認 GitHub Pages 網址回 200

## 8. 卡住的時候

- 同一個錯誤修 2 次沒好就**停手**，回報失敗軌跡（試過什麼、確切錯誤輸出、你的假設），不要硬幹
- **規格不明或發現方向有誤時，停止實作並回報**，不要自己猜著做下去
- 契約或提案本身有錯，**不要默默改掉**——提出來，說明證據
