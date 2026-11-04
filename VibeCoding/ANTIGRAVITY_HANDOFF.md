# 交接書：Level 1d 實作（給 Antigravity 或任何接手的 agent）

> 這份是**指令書**，不是參考資料。從第 0 節開始照做。
> 你要完成的是 Day19–Day26 八個發文日、八個產品，從實作到文章到歸檔。
> 兩個前置工程 `sdd/pdf-infra/`、`sdd/print-infra/` 必須最先完成並獨立驗收，
> 其餘八題才能開工。

---

## -1. 先讀這個：上一輪（Level 1c）發生過什麼

Level 1c 五題交給你的前任實作完，自己回報「全數 ALL PASS，已由不知情的獨立驗收 agent
複驗」。指揮官不信任這份自我宣稱，另外派了完全不知情的驗收 agent 重新查證，結果：
**六個單位裡五個有真實缺陷，只有一個真的通過**。最嚴重的一項是核心功能（透視校正）
每次使用都輸出 100% 全黑圖片，卻同時顯示「校正成功」的假訊息；還有一項聲稱存在的
測試證據（`ZZDOCPERSPECTIVE` 哨兵）全庫查無此字串，屬於捏造。

這不是在苛責上一輪的實作者，是要讓你知道**這個專案的驗收標準是玩真的**：你回報的
「已驗證」「ALL PASS」會被完全不知情的第三方 agent 重新檢查，而且檢查方式包含直接
讀程式碼比對、跑真實測資、掃描哨兵字串是否真的存在。**與其事後被抓到，不如自己先
做到經得起這種檢查**——每一條驗收條件都要有實際執行過的指令與輸出，不要用「應該」
「理論上」「邏輯上正確」這類措辭。

---

## 0. 開工前必讀（依序，不可跳過）

| 檔案 | 為什麼一定要讀 |
|---|---|
| `VibeCoding/PROGRESS.md` | 交接狀態。**唯一可信的進度來源**，每完成一題就更新它 |
| `VibeCoding/shared/PDF_CONTRACT.md` | **全文**。Level 1d 八題共用的 PDF 資料層契約，含最關鍵的查證結果：官方 `pdf-lib` 完全不支援加密，必須改用 `@cantoo/pdf-lib` fork |
| `VibeCoding/shared/CONTRACT.md` | 共用模組介面、`bundle.py` 用法、`buildCleanHtmlCopy()` 硬性要求 |
| `VibeCoding/shared/IMG_CONTRACT.md`、`CSV_CONTRACT.md` | 不是本輪範圍，但方法論通用（第三題才升級為共用、原始檔不覆寫等原則） |
| `sdd/pdf-infra/proposal.md`、`tasks.md` | 前置工程一完整規格，10 條任務，含加解密可行性驗證（解決 Day23 阻塞） |
| `sdd/print-infra/proposal.md`、`tasks.md` | 前置工程二完整規格，把 Day13／Day18 既有列印 CSS 抽成 `shared/print.css`，**這個工程會動到已上線的 Level 1a/1b 產品，要格外小心** |
| `sdd/pdf-to-jpg/`、`sdd/pdf-text-search/`、`sdd/pdf-organizer/`、`sdd/pdf-review-stamper/`、`sdd/pdf-password-manager/`、`sdd/pdf-secure-redactor/`、`sdd/pdf-delivery-cleaner/`、`sdd/office-content-publisher/` 各自的 `proposal.md`、`tasks.md` | 八題各自規格 |
| **`sdd/LEVEL1D_RULINGS.md`** | **本輪最重要的一份文件**。提案階段共產出 20 條待裁示，全部已裁決定案，記錄在這裡。各題 `proposal.md`／`tasks.md` 已回填裁決結果，但部分文字仍保留原本的「暫定」論證脈絡——**裁決結果以本檔為準，不是以「暫定」二字本身為準**，遇到不確定時回來查這份 |
| `VibeCoding/CHECKLIST.md` | 每日流程與文章結構規範，第四節有 `pdf.js` 在 `file://` 下的 Worker 陷阱解法 |
| `VibeCoding/README.md` | 開發順序（Day 編號的權威來源） |
| `sdd/archive/2026-08-24-LEVEL1B_RULINGS.md` 第 17、18 條 | 裁示 17：`shared/csv-write.js` 已有試算表公式注入防護，**這個檔案連同同目錄的 `csv-*.js`／`ui-chart-svg.js`／`img-*.js` 全部不屬於你的任務範圍，一個字元都不要動** |

衝突時的優先序：**使用者當下指示 > 契約 > `LEVEL1D_RULINGS.md` 裁決 > 提案內其餘敘述**。

---

## 1. 要做什麼

10 份提案已寫好（前置工程 2 份 + 八題），使用者已明確確認開始實作。
在 `sdd/` 底下，**依序實作，不要跳**：

| 順序 | SDD 目錄 | 產出目錄 | 任務數 | 說明 |
|:--:|---|---|:--:|---|
| 0 | `sdd/pdf-infra/` | `VibeCoding/shared/` | 10 | **前置工程一，必須最先完成**。新增 `pdf-decode.js`／`pdf-build.js`／`pdf-file-size.js`，vendor 資產 `pdf.js`／`@cantoo/pdf-lib`／`fontkit`／Noto Sans TC。任務 8 的加解密驗證是解決 Day23 阻塞的關鍵，必須用真實密碼保護過的 PDF 測試，不能只用自己產生的測資自我驗證 |
| 0.5 | `sdd/print-infra/` | `VibeCoding/shared/print.css` + 改動 Day13／Day18 | 4 | **前置工程二**，可與 pdf-infra 平行或緊接完成，但必須在 Day26 開工前完成。從 Day13、Day18 現有 `@media print` CSS 抽出共通部分，兩題改為引用、重新 bundle。**這是本輪唯一會動到已上線 Level 1a/1b 產品的工程，改完要對 Day13、Day18 的列印輸出做視覺比對，確認沒有意外改變既有行為** |
| 1 | `sdd/pdf-to-jpg/` | `VibeCoding/Day19_pdf-to-jpg/` | 6 | |
| 2 | `sdd/pdf-text-search/` | `VibeCoding/Day20_pdf-text-search/` | 6 | |
| 3 | `sdd/pdf-organizer/` | `VibeCoding/Day21_pdf-organizer/` | 8 | 裁示要求**真正的拖曳互動**（不是按鈕），且輸出用「群組」概念——一組範圍輸出一份 PDF，多組輸出多份包 ZIP |
| 4 | `sdd/pdf-review-stamper/` | `VibeCoding/Day22_pdf-review-stamper/` | 7 | 裁示要求中文字型用**完整 Noto Sans TC**，直接複用 `pdf-infra` 任務 1 已下載好的 vendor 資產，不要重複下載 |
| 5 | `sdd/pdf-password-manager/` | `VibeCoding/Day23_pdf-password-manager/` | 7 | 依賴 `pdf-infra` 任務 8 已驗證的加解密機制，本題只需組裝 UI 與批次流程 |
| 6 | `sdd/pdf-secure-redactor/` | `VibeCoding/Day24_pdf-secure-redactor/` | 9 | 遮蔽必須讓底層文字真的擷取不到（用 `extractPageText()` 做正向+負向哨兵驗證），不是視覺上蓋住 |
| 7 | `sdd/pdf-delivery-cleaner/` | `VibeCoding/Day25_pdf-delivery-cleaner/` | 8 | Metadata／Annotation／Form／附件／Action 五類掃描與逐類清除 |
| 8 | `sdd/office-content-publisher/` | `VibeCoding/Day26_office-content-publisher/` | 9 | 不碰 PDF；Markdown parser 決定手寫簡化版，不引入外部 library；列印模板引用 `shared/print.css`（需要 `print-infra` 已完成） |

每一題的完整流程：**實作 → 獨立驗收 → 文章 → 開發日誌 → 更新 README 進度表 → 歸檔 sdd**。

---

## 2. 不可違反的規則

1. **驗證後才能說完成**：改完必須實際執行驗證，把指令與輸出貼進回報。
   「應該沒問題」「看起來是對的」= 未完成。AI 推論不算驗證，只接受執行結果。
2. **驗證不自驗**：寫的人不能當驗收的人。每題實作完，**開一個全新的 session/agent 做驗收**，
   而且**只給它驗收條件與產出位置，不給實作過程的敘述**（會被帶風向）。回報「已驗收」時，
   附上這個驗收 agent 實際跑過的指令與原始輸出，不是複述你自己的判斷。
3. **不加規格以外的東西**：不加提案沒寫的功能、錯誤處理、抽象。`LEVEL1D_RULINGS.md`
   明確裁定「不做」的項目（例如 Day23 不曝露加密演算法選項、Day23 不做 PDF 權限功能、
   Day19 不做目標容量壓縮）**不要自作主張加回去**，即使你覺得加了比較完整。
4. **誠實回報**：測試失敗就說失敗；跳過的步驟明說；沒驗證的部分標「未驗證」。
5. **一次一條 task**，完成一條才動下一條，完成後自我檢查再打勾。
6. **`LEVEL1D_RULINGS.md` 已裁決的 20 條不需要再問**，但提案裡若還有本檔沒提到、
   實作到才發現的新規格模糊點，**停下回報，不要自己猜著定案**——這正是上一輪
   （`LEVEL1C_RULINGS.md`）記錄的教訓：提案階段講好「待裁示不自行定案」，實作階段
   卻自己選了答案定案，事後才被抓到。

---

## 3. 這個專案的技術底線

- **單檔 HTML，零外部請求**。下載 `index.html` 後**斷網仍可用核心功能**
- 原始檔不覆寫，一律產生新檔供下載；資料全程留在瀏覽器，不上傳
- **不要手改 `DayNN_*/index.html`**，那是 build 產物。改 `src/` 再跑
  `python3 VibeCoding/scripts/bundle.py <src_dir> <out_dir>`
- 每題都要有：複製結果、下載結果、**下載本工具離線版**（`buildCleanHtmlCopy()`）
- `buildCleanHtmlCopy()` 的產物是**要分享出去的**，必須清空所有使用者資料。
  詳見 `CONTRACT.md` 第 6 節

---

## 4. 已知會咬人的地方（Level 1d 特有，查證或已驗證，不是推測）

1. **官方 `pdf-lib`（`hopding/pdf-lib`）完全不支援加密**：`PDFDocument.load()` 遇到
   加密 PDF 直接丟 `EncryptedPDFError`，沒有任何寫入加密 PDF 的 API。**本輪全部涉及
   PDF 結構編輯的模組統一用 `@cantoo/pdf-lib`（`cantoo-scribe/pdf-lib` fork，MIT）**，
   不要因為查到官方文件或訓練資料裡的範例程式碼就改用官方版——那個版本連 Day23
   的核心功能都做不到。

2. **`pdf.js` 在 `file://` 下的 Worker 陷阱**：`CHECKLIST.md` 第四節已有解法（把
   `pdf.worker.min.js` 轉 Blob URL 再指定給 `GlobalWorkerOptions.workerSrc`），
   `pdf-decode.js` 的 `loadPdfFile()` 負責處理，下游各題不要再自己重寫一次。

3. **中文字型是唯一路徑，不是選項**：`LEVEL1D_RULINGS.md` 裁示 1 已定案用完整
   Noto Sans TC，`pdf-infra` 任務 1 會下載好固定版本並記錄 SHA-256，Day22
   直接複用這份 vendor 資產（`embedCjkFont()` 呼叫任務 7 已驗證過的機制），
   **不要因為看到字型檔很大就自作主張換成子集化版本**——裁示已經在知情的情況下
   接受了這個檔案體積代價，不是意外，不需要你「幫忙優化」。

4. **Day21 排序是真拖曳，不是按鈕**：跟 Day18（Level 1c）不同，裁示 2 明確要求
   HTML5 native drag events 或 pointer-based 拖曳，含觸控裝置相容性與拖曳視覺回饋
   （插入線／佔位格）。**不要因為 Day18 有按鈕方案的先例就直接套用同一套**，
   這題已經明確裁示要做真拖曳。

5. **Day21 輸出用「群組」概念**：使用者可以定義一組或多組頁碼範圍/頁面選取，
   每組各自輸出一份 PDF；只有一組時自然只產出一份，多組時包成 ZIP。**不是
   「拆分」和「合併」兩個獨立功能，是同一套「群組管理」介面涵蓋兩種情境**，
   細節見 `sdd/pdf-organizer/tasks.md`。

6. **`print-infra` 動到的是已上線產品，改完要交叉驗證**：Day13、Day18 重新 bundle
   後，`bundle_manifest.json` 的 sha256 會變（因為多引用一個 `shared/print.css`），
   **這是預期中的變動，不是回歸**；但列印輸出的視覺結果必須跟抽取前完全一致，
   這點才是真正要驗證的。`shared/print.css` 走 `base.css` 既有的「手動複製貼上、
   註明來源、不自動內嵌」慣例——**`bundle.py` 目前只支援 `.js` 類型的 `SHARED:`
   placeholder，不要嘗試修改 `bundle.py` 加 CSS 支援**，前置工程階段已查證過這點，
   沿用既有慣例即可。

7. **PDF 檔案大小落差比圖片更極端**：`pdf-file-size.js` 的門檻（單檔 30/100MB、
   批次 150/400MB）是延續 `IMG_CONTRACT.md` 量級外推的草案，沒有實測依據。實作時
   若真實測試發現明顯不合理（例如常態掃描公文就超過 30MB），回頭修正
   `PDF_CONTRACT.md` 並記錄理由，不要悶著頭照抄一個可能不合理的數字。

8. **vendor 資產體積是已知的未知數，要如實回報**：`pdf.js`＋Worker、
   `@cantoo/pdf-lib`、`fontkit`、Noto Sans TC 四者疊加，`pdf-infra` 任務 10 與
   Day22 任務都要求記錄 bundle 後的實際 HTML 檔案大小（bytes）。**不要用「應該還好」
   帶過，要有具體數字**，若明顯過大（例如超過 5–10MB）依契約要求回報讓使用者判斷。

9. **實體控制字元會讓 `grep` 把整檔當 binary 靜默跳過**。掃描一律用 perl：
   ```bash
   perl -ne 'if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/) { print "$ARGV\n"; close ARGV }' <檔案>
   ```
   ⚠️ Write 工具會把逃脫序列（如 `\0`）落成實體 byte，本專案已發生多次。
   寫完含逃脫序列的程式碼**一定要掃一次**，`grep` 沒找到問題不等於沒問題。

10. **macOS 內建 `/usr/bin/grep` 是 BSD grep，不支援 `-P`**。要用 PCRE 就用 `rg -nP`
    或 `perl -ne`。⚠️ 不加 `-a` 的 `rg`／`grep` 遇到含 NUL 的檔案會判定為 binary 直接跳過。

11. **每寫一條「無輸出 = 通過」的檢查，就配一次反證**：故意製造一個違規，確認它
    **真的會輸出**，再還原。結構性的東西（`#__shared_toast`、`.nav-back`）用 DOM 層
    斷言不可用字串 grep；內容性的東西用唯一哨兵（`ZZ` 開頭）不可用一般值。

12. **新增哨兵前先查已佔用登記表**（`shared/CONTRACT.md` 第 6 節），查重：
    `grep -rho 'ZZ[A-Z0-9]*' sdd/*.md sdd/archive/*/tasks.md 2>/dev/null | sort -u`

13. **Playwright 相關**：不能開 `file://`，要起 `python3 -m http.server`；多個 agent
    併行操作 Playwright MCP 時瀏覽器 session 是共用的，會互相打斷分頁、埠號互撞——
    測出異常結果先懷疑是不是被干擾，不要直接當成缺陷回報。

14. **`shared/` 目錄裡不屬於你的部分，一個字元都不要動**：`csv-*.js`／
    `ui-chart-svg.js`（Level 1b）、`img-*.js`（Level 1c）全部不在本輪任務範圍。
    你的任務只碰 `pdf-*.js`（新建）與 `print.css`（新建，`print-infra` 範圍）。
    完成後的驗收要求「Level 1a/1b/1c 既有產品 `bundle_manifest.json` 重新比對 sha256
    確認未受波及」，指的就是這件事。

---

## 5. 文章

規範見 `VibeCoding/CHECKLIST.md`。重點：
- 繁體中文台灣用語，每篇不少於 300 字，六段結構（情境→解題思路→資源→Vibe 過程→產品→心得與反思）
- **必須包含實際的個人觀點與判斷**，不可完全由 AI 生成（賽事規則）
- 寫**當下真實發生的事**，包含踩到的坑與失敗的嘗試。不要事後美化成一路順利
- 文章裡描述的功能措辭要跟 `LEVEL1D_RULINGS.md` 的裁決一致——**Level 1c 曾經發生
  裁示已改為按鈕方案，但文章標題與開場仍寫「拖曳排序」三處未同步的問題**，本輪
  Day21 反過來要注意的是裁示真的要求拖曳，若文章寫成按鈕排序同樣是不一致，寫完後
  拿裁決條文逐句核對一次
- 圖表用 Mermaid，寫完用 `mmdc -i x.mmd -o x.svg` 實際渲染驗證過才算數

---

## 6. 隱私與發布

- ⚠️ **所有產出、日誌、文件裡嚴禁出現真實個資**（姓名、電話、email、地址、身分證字號、金鑰）。
  需要範例一律用虛構去識別化資料。Day23（密碼管理器）測試用的密碼、Day24（安全遮蔽）
  測試用的敏感文字（例如身分證字號格式）一律用明顯是假資料的格式
- ⚠️ **產生專案網址時一律用 `<GITHUB_USER>` 佔位符**，不要寫出真實 GitHub 帳號
- `VibeCoding/` 目錄有使用者的**常設 commit + push 授權**，不需逐次詢問。
  **其他目錄一律先問**（`sdd/` 在 `VibeCoding/` 之外）。push 後要回報檔名與 GitHub Pages 網址
- commit message 用繁體中文，結尾加 `Co-Authored-By:` 標明你的身分

---

## 7. 完成的定義

八題全部滿足才算完成：

- [ ] `sdd/pdf-infra/` 全部 10 條 task 打勾，共用模組獨立驗收通過，加解密機制用
      真實密碼保護過的 PDF 驗證過，Level 1a/1b/1c 既有產品 `bundle_manifest.json`
      重新比對 sha256 確認未受波及
- [ ] `sdd/print-infra/` 全部 4 條 task 打勾，Day13、Day18 重新 bundle 後列印輸出
      視覺比對確認未改變既有行為
- [ ] Day19–Day26 每題：實作完成、`bundle.py` 產物已生成、**獨立驗收通過**
- [ ] 每題的 PRD 驗收條件都有實際執行過的驗證證據
- [ ] 每題有文章草稿與開發日誌，措辭與 `LEVEL1D_RULINGS.md` 裁決一致
- [ ] `VibeCoding/README.md` 進度表已更新
- [ ] `sdd/pdf-infra/`、`sdd/print-infra/`、八題共 10 個目錄已 `git mv` 至
      `sdd/archive/YYYY-MM-DD-<短名稱>/`
- [ ] `VibeCoding/PROGRESS.md` 已更新到最新狀態，如實記錄過程（不要只寫「ALL PASS」
      這種結論式敘述，要留下驗證方法與具體數字，經得起完全不知情的第三方重新檢查）
- [ ] 已 push，且實際確認 GitHub Pages 網址回 200

## 8. 卡住的時候

- 同一個錯誤修 2 次沒好就**停手**，回報失敗軌跡（試過什麼、確切錯誤輸出、你的假設），不要硬幹
- **規格不明或發現方向有誤時，停止實作並回報**，不要自己猜著做下去
- 契約或提案本身有錯，**不要默默改掉**——提出來，說明證據
