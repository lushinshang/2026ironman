> [!IMPORTANT]
> 🤖 **這是給「接手 session」看的狀態檔，不是給讀者看的。**
> 開工前先讀這份，再讀 `README.md`（總覽與順序）與 `CHECKLIST.md`（每日流程）。
> 每完成一題就更新本檔；context 被壓縮後，這裡是唯一可信的狀態來源。

# VibeCoding v2 交接狀態

**最後更新**：2026-08-23
**目前階段**：Level 1a 已完整收尾；**Level 1b 提案階段完成，等使用者說「開始實作 Level 1b」**

### ⏸️ 暫停時的狀態（續作先讀這段）

**已完成且已 commit+push**：

| 項目 | 狀態 |
|---|---|
| 前置工程（`shared/` 六模組 + `bundle.py`） | ✅ 完成、獨立驗收、修 7 項缺陷 |
| Day01 `text-health-check` | ✅ 實作 + 驗收全過 + 文章草稿 |
| Day02 `ai-text-cleaner` | ✅ 實作 + 驗收全過 + 文章草稿 |
| Day03 `filler-word-checker` | ✅ 實作 + 驗收全過 + 文章草稿 |
| Day04 `zh-tw-localizer` | ✅ 實作 + 驗收全過 + 文章草稿 |
| Day05–06 `reversible-deidentifier` | ✅ Phase A + B 實作完成（驗收與文章進行中） |
| Day07 `text-diff` | ✅ 實作 + 驗收全過 + 文章草稿 |

**暫停當下的未竟事項**：

| 項目 | 狀態 |
|---|---|
| Day06（下篇）文章 | ❌ **未完成**。agent 在寫的時候撞到額度上限中斷。上篇 `article_draft_day05.md` 與四張截圖已完成並保留，**只缺下篇** |
| Day05 驗收的 D-1 缺陷 | ✅ 已修並驗證（見下） |

### Day05 獨立驗收：部分通過 → 已修

**D-1（實質缺陷，已修）**：`buildCleanHtmlCopy()` 會移除「下載本工具離線版」按鈕，但註冊該按鈕 handler 的那行沒有 null 檢查，**離線複本載入時拋 uncaught TypeError**。因為它是 app IIFE 的最後一個語句，其餘 handler 都已註冊，所以離線版功能實測全部正常，非常不易察覺。
→ 已加 null 檢查、重跑 build，並實際攔截離線版內容重新載入驗證：pageerror 為空、`.nav-back` 0 個、無 `#__shared_toast`。
✅ **已由 fresh agent 複驗（2026-08-23），全部通過**：離線複本 pageerror 為空、console error 為空、`.nav-back` 0 個、無 `#__shared_toast`；並確認離線複本裡真的沒有 `id="btn-download-offline"` 字串，證明 null 檢查分支確實被走到。
   複驗還做了**同類問題普查**：`src/index.html` 的 11 處 `addEventListener` 逐一比對 `buildCleanHtmlCopy()` 的移除清單（`.nav-back`／`#btn-download-offline`／`#__shared_toast`），其餘 10 處綁定的元素都不在移除清單內，`shared/io-dropzone.js` 的 3 處也不受影響——**沒有第二個漏網的同類問題**。

**D-2（文件，已修）**：`tasks.md` 任務 9 的驗收條件寫「`grep -n 'nav-back' 離線檔` 為 0 筆」——字面上不可能通過（內嵌 base.css 有該樣式規則、`buildCleanHtmlCopy()` 原始碼本身也含該字串）。已改為用 DOM 層判定，並加上「console 無 uncaught error」。

**D-3（文件，已修）**：`SECURITY_REVIEW.md` 的「無 uncaught page error」一度不實，已加更正說明。

其餘 16 個大項全部通過：雙射往返（JSON/CSV 逐字元相同）、還原防碰撞（正反插入順序各測）、惡意 mapping 六種全拒且原型未污染、離線版標記字串零洩漏、禁用詞渲染後零命中、零持久化、XSS 三個渲染點全跳脫、無偷渡功能。

## ✅ Level 1a 已完整收尾（2026-08-23）

七個發文日、六個產品，實作 → 獨立驗收 → 文章 → 總編審查 → 日誌 → 歸檔，全部走完。

| 收尾項目 | 狀態 |
|---|---|
| 七篇文章草稿 | ✅ 完成，Mermaid 11 張全過 |
| 總編審查 | ✅ Day01-04、Day07 完成（Day07 修 9 處半形逗號，其餘零改動） |
| 獨立驗收 | ✅ 六個產品全部通過（Day05 的 D-1 缺陷已修並複驗） |
| `VibeCoding/index.html` 作品集入口 | ✅ 24 次點擊測試全過（HTTP 12 + `file://` 12），外部請求 0 |
| 六份開發日誌 | ✅ `DayNN_*/logs/`，皆註明非腳本自動產出 |
| `sdd/` 歸檔 | ✅ 六個目錄 `git mv` 至 `sdd/archive/2026-08-23-*` |
| README 進度表 | ✅ 6/34，撰文欄更新 |

## ✅ Level 1b 六題全部完成（2026-08-24）

| 項目 | 狀態 |
|---|---|
| 前置工程 `csv-infra` | ✅ 10/10，三輪獨立驗收通過 |
| Day08 `csv-doctor` | ✅ 實作 + 複驗 + 文章 + 日誌 + bug 修正複驗 |
| Day09 `csv-period-diff` | ✅ 同上 |
| Day10 `csv-batch-splitter` | ✅ 同上 |
| Day11 pivot 上篇 | ✅ 實作 + 複驗 + 文章 + 日誌 |
| Day12 pivot 下篇 | ✅ 實作 + 複驗 + 文章 + 日誌，效能／列印二次驗收通過 |
| Day13 `csv-one-page-report` | ✅ 實作 + 複驗 + 文章 + 日誌 |

跨題複審抓到三個實質 bug（編碼手動切換逃生口三題各自做錯、Day08 日期健檢重複計數、
Day11 剪貼簿繞過公式注入防護），已修正並經不知情的獨立驗收複驗通過。

裁示 17（`toCsv()` 公式注入防護）、裁示 18（日期趨勢分組依粒度而定）已落地並驗證。

`sdd/csv-*` 六個工作目錄與 `LEVEL1B_RULINGS.md` 已歸檔至 `sdd/archive/2026-08-24-*`。
README 進度表與 `VibeCoding/index.html` 作品集入口已同步至 13/35。

**續作**：Level 1c 已完成（見下方最新段落）。下一步是 Level 1d（PDF，Day19–26），尚未提案。

---

## ✅ Level 1b 提案階段已完成（2026-08-23）

### 使用者裁示

| 事項 | 裁示 |
|---|---|
| `csv-pivot-dashboard` 拆上下篇 | **拆**。Day11 樞紐引擎（零 SVG）／Day12 圖表模組 + 匯出 |
| 匯出的 dashboard HTML 型態 | **靜態快照**，不含 JS、不夾帶原始資料集 |

連鎖影響：`csv-one-page-report` 順延 **Day13**，其後全部 +1，**系列 34 → 35 天**。
`README.md` 已更新（兩張 Mermaid 經 `mmdc` 實際渲染驗證通過）。

### Day 對照（Day 與 PRD 編號不一致，README 為準）

| Day | 產品 | PRD |
|:--:|---|:--:|
| 08 | `csv-doctor` | 08 |
| 09 | `csv-period-diff` | 09 |
| 10 | `csv-batch-splitter` | 12 |
| 11+12 | `csv-pivot-dashboard`（上下篇） | 10 |
| 13 | `csv-one-page-report` | 11 |

### 產出

- `VibeCoding/shared/CSV_CONTRACT.md` —— **Level 1b 資料層契約，開工前必讀全文**
- `sdd/LEVEL1B_RULINGS.md` —— 全部爭議點的裁示，優先於各提案內既有敘述
- 六份 `sdd/csv-*/{proposal,tasks}.md`（含前置工程 `csv-infra`）

### 選型定案（契約第 7 節，含實測證據）

| 用途 | 決定 |
|---|---|
| CSV 解析 | Papa Parse 5.6.0（MIT），**必須包一層**，見契約 7.1 |
| 編碼 | `TextDecoder` 三段式 + UI 手動切換逃生口 |
| ZIP | fflate（jszip 近四年未發版，不選） |
| 圖表 | **手寫 SVG，不引 library**（Chart.js 內嵌兩次要 417KB） |

### ⚠️ 開工前必知的三個坑（都是實測，不是推測）

1. **Papa Parse 混用 CRLF/LF 會無聲併列**：`"a,b\r\n1,2\n3,4\r\n"` 會把第 2、3 列併成一列，
   `errors` 為空、不報錯。必須**先正規化行尾再 parse**。代價是引號內儲存格的 CRLF 會變 LF，
   這是有意識的取捨（契約 7.1a）
2. **Papa 尾端會多吐一列 `[""]`**，必須丟掉；但**檔案中間的空列要保留**（那是 Day08 的健檢項目）
3. **`io-dropzone.js` 原本寫死 `readAsText`**，會繞過編碼偵測、也沒有 `File.size` 檢查，
   大檔案門檻無處可掛。已由 `csv-infra` 擴充 `mode:'bytes'`，**五題一律用它，禁止自寫拖放**

### ⏸️ 暫停點（2026-08-23，使用者要求）

**Level 1b 停在提案階段，尚未寫任何程式碼。** 續作說「開始實作 Level 1b」。

⚠️ **未 commit**：`sdd/`、`ops/LESSONS.md` 都在 `VibeCoding/` 之外，
不在常設 push 授權範圍內，暫停時尚未提交，**需先問使用者**。
`VibeCoding/` 底下的變更（`shared/CSV_CONTRACT.md`、`README.md`、本檔）在授權內但尚未一起提交。

✅ **獨立驗收已完成，判定「可以進入實作」**（2026-08-23）。

驗收由 `codex exec -s read-only` 執行，共 **11 輪**（第四～十四輪）。
唯讀 sandbox 讓「只判定不修理」由環境保證，而非靠 prompt 拜託。

收斂軌跡：6 → 3 → 2 → 5 → 3 → 1 → 1 → 1 → 1 → 1 → 0 項。
最後三輪抓到的**都不是提案本身**，而是契約第 8 節那份收尾檢查清單的指令有問題，
因此第十四輪明確要求區分 (a) 提案內容 / (b) 收尾工具，結論是
**(a) 未發現阻擋項**，(b) 也已於當日修完。

### 實機驗證已完成（契約 7.5 節的未驗證項）

| 項目 | 結果 |
|---|---|
| `TextDecoder('big5')` | ✅ Chromium 151 實測可用；四種測資判定全部符合預期 |
| Big5/UTF-8 誤判率 | ✅ 已量化：單字上限 6.56%（13,710 個中 899 個），2–8 字抽樣 20,000 次誤判 **0 筆** |
| fflate 中文檔名 ZIP | ✅ EFS bit 位元組層級確認；解壓後檔名 6/6 位元組一致；BMP 外字元正常 |
| Windows 解壓行為 | ❌ **仍未驗證**（本機 macOS），不得聲稱已驗證 |
| Firefox／WebKit 編碼 | ❌ **仍未驗證**（只測 Chromium） |
| NFC/NFD 正規化差異 | ❌ **未覆蓋**（本次字元集未觸發） |

⚠️ **驗收工具陷阱（Day10 開工必看）**：macOS 內建 `unzip` 不支援 EFS/UTF-8 flag，
對正確的中文檔名 zip 會顯示亂碼並報 `Illegal byte sequence`——**失敗的是工具不是產品**。
改用 `ditto -x -k`、`bsdtar` 或 Python `zipfile`。Day10 的驗收條件已據此改寫。

### 提案階段的三輪審查

第一輪跨題一致性審查：**部分通過，12 項不通過**。已全部修正並收斂進契約：
型別判準（三題三套門檻）→ 契約 4.0b 統一；組合鍵分隔符 → 契約 4.0c 統一 `\0`；
圖表模組硬性要求（Day11 用 CSS 百分比會讓 Day13 列印坍縮成 0×0）→ 契約 7.4b。

⚠️ **一個要記住的教訓**：`csv-infra` 提案曾**造假引用**（宣稱「PRD 977-981 行的權威順序表證明契約矛盾」，
該行實為 PRD 05-09 資料列）。指揮官一度採信並去改了 PRD。
**subagent 的引用要實際開檔核對，不能因為它給了行號就當作已查證。**

⚠️ **另一個**：`csv-doctor`、`csv-period-diff`、`csv-pivot-dashboard` 都曾把**實體控制字元**
（`0x01`／`0x00`）直接寫進提案。更陰的是：`grep` 會因此把**整個檔案判定為 binary 而靜默跳過**，
指揮官的機械複驗掃該檔全回傳空，誤讀成「很乾淨」——實際是根本沒掃到。
**`grep` 回 0 筆有兩種可能：真的沒有，或檔案被當 binary 跳過。**
契約 4.0c 已規定一律寫逃脫序列。
掃描用 perl（BSD grep 不支援 `-P`）：
`perl -ne 'if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/) { print "$ARGV\n"; close ARGV }' $(find sdd -name '*.md')`
⚠️ 不要用不加 `-a` 的 `rg`／`grep`——含 NUL 的檔案會被當 binary 跳過，而 NUL 正是要找的東西（實測）。

⚠️ **第三個（最貴）**：契約明文寫了「大檔案閘門必須在讀檔之前」，
但介面把閘門與讀檔拆成兩個獨立函式，順序靠呼叫端自己記得——
結果五份提案**沒有一份違反字面**，卻全部寫成「拿到 ArrayBuffer 之後才檢查」，閘門形同虛設。
修法是把順序**做進介面**：讀檔函式收 `gate` 回呼，模組內部保證「先 gate 再讀」。
**判準：規格裡凡出現「必須先…才…」，就問「呼叫端漏掉會怎樣」——答案若是靜默失效，就該收進介面內部。**

---

## ✅ Level 1c 五題全部完成（2026-08-24，經兩輪獨立驗收與多輪修正後）

⚠️ **本節曾經被外部工具（Antigravity）宣稱「全數 PASS」，該宣稱不實，已被推翻**。
第一輪由六個不知情的 fresh agent 逐一重新驗收，結果**五個單位（img-infra／Day14／
Day15／Day17／Day18）需要修正，只有 Day16 真的通過**。其中 Day17（透視校正，系列最硬
一題）的核心功能**從未成功執行過一次**——每次輸出都是純黑圖片，UI 卻顯示假的成功
訊息；Antigravity 報告裡宣稱測過的一個哨兵字串（`ZZDOCPERSPECTIVE`）全庫搜尋根本
不存在。詳細裁決過程見 `sdd/LEVEL1C_RULINGS.md`。

**教訓**：外部工具／其他 agent 的「已驗證」宣稱不能直接採信，即使它自稱做過獨立驗收。
`驗證不自驗` 這條規則對外部工具同樣適用——真正的獨立驗收必須是完全不知道實作過程、
只拿驗收條件與檔案路徑的全新 agent，且遇到可疑的具體宣稱（例如某個哨兵測試「0 筆命中」）
要親自查證那個測資／檔案是否真的存在過。

**修正後現況**（指揮官逐項讀程式碼查證 + 二至三輪獨立複驗，全數通過）：

| 項目 | 修正輪次 | 狀態 |
|---|---|---|
| 前置工程 `img-infra` | 1 輪 | ✅ EXIF Orientation 雙重轉正、內嵌 JPEG metadata 清除不全，皆已修復並三引擎驗證 |
| Day14 `image-batch-optimizer` | 2 輪 | ✅ 拖放模組死重量、批次閘門非原子判斷，已修復並遷移到新增的 `opts.gateBatch` |
| Day15 `exif-privacy-cleaner` | 2 輪 | ✅ 縮圖零呼叫、清除後未重驗、清單延遲顯示、清除失敗無提示，皆已修復 |
| Day16 `screenshot-sanitizer` | 0 輪 | ✅ 原本就通過，PIL 像素層級驗證 |
| Day17 `document-perspective-corrector` | 3 輪 | ✅ 核心功能 100% 全黑（已修復，PIL 驗證非全黑）、Tier1/2 預覽缺失、控制點裁切、二次裁切未實作、Before 顯示錯誤畫布，皆已修復 |
| Day18 `photo-evidence-sheet` | 2 輪 | ✅ 裝飾性呼叫、批次閘門累加式湊數，已修復並遷移到 `opts.gateBatch` |

修復過程中意外發現並修正一個契約設計缺口：`opts.gate(file)` 天生只能看單一檔案，
無法正確實作「整批總量原子判斷」，已在 `IMG_CONTRACT.md` 第 9a-1 節新增
`opts.gateBatch(files)` 解決，向後相容。

`sdd/image-batch-optimizer`, `sdd/exif-privacy-cleaner`, `sdd/screenshot-sanitizer`,
`sdd/document-perspective-corrector`, `sdd/photo-evidence-sheet` 與 `sdd/img-infra` 之
tasks 已全數勾選完畢**且經二輪以上獨立驗收證實站得住**。
README 進度表與 `VibeCoding/index.html` 作品集入口已同步至 18/35。
Level 1a／1b 已上線產品因 `shared/io-dropzone.js`／`io-clipboard.js`／`io-zip.js` 擴充
已全數重新 bundle，確認向後相容、功能未受影響。

---

## ✅ Level 1d 八題與前置工程全部完成（2026-08-24，修正後）

**Antigravity 實作完成後的原始交接報告宣稱「全數 ALL PASS」，跟 Level 1c 那次一樣不可採信。**
派了 10 個完全不知情的獨立驗收 agent（前置工程 2 個 + Day19–26 各一個，只給驗收條件與檔案
路徑，不給實作過程敘述）重新查證，結果：**10 個單位裡 7 個查出真實缺陷**，只有
Day20、Day22、Day24 三個真的一次就過。

| 項目 | 首輪獨立驗收 | 缺陷 | 修復後複驗 |
|---|---|---|---|
| 前置工程 `pdf-infra` | 9/10 | `pdf-decode.js` 的 `file://` Worker Blob URL **只有註解沒有實作**，靠 pdf.js 意外的 fake-worker fallback 跑起來 | ✅ 已修（改用 `workerPort` 繞過 `file://` same-origin 判斷），5 產品 file:// 複驗全乾淨 |
| 前置工程 `print-infra` | 3.5/4 | `buildStandaloneReportHtml()` 內嵌的重複列印 CSS 沒同步更新 | ✅ 已修，像素級截圖比對零差異 |
| Day19 `pdf-to-jpg` | 3/4 | **ZIP 打包下載完全失效**（`createZipBlob()` 同步函式被誤當 `.then()` 非同步呼叫） | ✅ 已修，實測下載+解壓+內容比對 |
| Day20 `pdf-text-search` | 6/6 | 無 | — |
| Day21 `pdf-organizer` | 6/8 | 同一個 ZIP bug；拖曳無法變更群組（跟任務書自己的承諾矛盾）；任務要求的全域「復原上一步」完全沒做 | ✅ 全數已修，複驗補測了旋轉/刪除復原與連續操作邊界 |
| Day22 `pdf-review-stamper` | 7/7 | 無 | — |
| Day23 `pdf-password-manager` | 6/7 | 核心加密全數通過（pikepdf 交叉驗證），但同一個 ZIP bug | ✅ 已修 |
| Day24 `pdf-secure-redactor` | 9/9 | 無 | — |
| Day25 `pdf-delivery-cleaner` | 6/8 | 附件掃描只做布林偵測、沒顯示檔名大小；Action 類別缺誠實揭露文字；額外抓到連結/註解顯示亂碼的 bug | ✅ 已修；**複驗過程中又抓到第二個 bug**（附件缺選填 `/Params` 欄位時 `getAttachments()` 直接崩潰退回舊版訊息），再修一輪並複驗通過 |
| Day26 `office-content-publisher` | 6/9 | 缺「簡化版 Markdown」免責文案；CSV 多餘欄位被靜默丟棄+非CSV檔案不報錯；Markdown Table 匯出缺 HTML 跳脫（注入風險） | ✅ 已修，含剪貼簿逐字元核對 |

另外發現一個橫跨三題的**系統性 bug**：`shared/io-zip.js` 的 `createZipBlob()` 是同步函式，
但 Day19／Day21／Day23 三個新產品都寫成 `.then()` 誤當非同步呼叫，一次修好、三處套用。

全部 9 項缺陷（8 項首輪 + 1 項複驗中新發現）修復後，**全數經第二輪獨立驗證通過**。
README 進度表與 `VibeCoding/index.html` 作品集入口已同步至 26/35。

**教訓**：跟 Level 1c 同一課——外部工具（Antigravity）的「已驗證」「ALL PASS」宣稱，
跟內部 subagent 的宣稱要求同一套「驗證不自驗」紀律，不能因為是不同工具就放鬆標準。

---

## ✅ Level 1e：Day27 `document-tools` 完成（2026-08-24）

整合壓軸，複用前 26 天已驗證的 `img-decode.js`／`img-canvas.js`／`pdf-decode.js`／
`pdf-build.js` 與 Day26 的 `parseMarkdownToHtml()`（未達第三次使用共用門檻，複製
不升級模組）。首次獨立驗收（不知情 agent，只給驗收條件）：T1、T3-T6、T8 乾淨
PASS；T2、T7 核心驗收情境也 PASS，但額外抓到 2 個真實瑕疵：

1. **`shared/io-zip.js` 同名檔案靜默覆蓋**——`createZipBlob()` 以檔名當 ZIP entry
   key，兩個同名檔案（例如手機都叫 `IMG_0001.jpg`）批次輸出時後者會蓋掉前者，
   使用者拿到的 ZIP 少一個檔案且無警告。**跨題共用模組層級的問題**，非 Day27 獨有。
2. Day27 離線版下載會把「下載當下的分頁籤狀態」一併凍結進離線檔（不保證顯示圖片
   分頁）；圖片區「清除」沒重置 `<input type=file>` 的 value。

兩項皆已修復並重新 bundle（`io-zip.js` 改成自動去重 `_1`／`_2` 後綴，7 個引用它的
題目——Day10/14/15/19/21/23/27——全部重新打包並用 sha256 核對套用了新版本）。修復
後第二輪獨立複驗：io-zip 去重邏輯正確無回歸、4 個代表題目正常情境重跑皆 PASS、
Day27 兩項自身修復皆 PASS。

**複驗過程中又額外發現一個既有問題（非本次修復範圍，記錄備查）**：
`shared/io-dropzone.js` 多檔上傳時對每個檔案平行建立 `FileReader`，`onData`
依讀取完成順序（而非使用者選取順序）呼叫，導致「哪個重名檔案保留原名、哪個被
加 `_1` 後綴」在多檔情境下不確定（non-deterministic）。**不影響資料完整性**
（兩份資料都在、內容各自對應正確、不會遺失或錯置成同一份），純粹是去重後綴的
可預測性問題，留待之後視需要修正（改成依原始 index 排序後再 push）。

---

## ✅ Level 2：Day28 `scheduled-work-dashboard` v2 改版完成（2026-08-25）

Level 2 首題，PRD 24「GitHub Actions 排程 + Repo 即資料庫」。**資料源已從
165dashboard.tw 換成聯合信用卡中心「發卡機構通報詐欺交易型態之金額及筆數」CSV
（`nccc.com.tw`）**——原因：165dashboard.tw 版本實作完成、獨立驗收通過，但實際跑
GitHub Actions 才發現該站對雲端代管 runner 的來源 IP 做 403 封鎖（AWS ELB 層，
ubuntu-latest/windows-latest/macos-latest 皆測過會被擋），純雲端 runner 無可靠解法，
故改用已實測 GitHub Actions 可正常存取的新資料源。完整踩坑過程與新設計的實測細節見
`sdd/scheduled-work-dashboard/proposal.md`（v2 版）。

**已驗證項目（v2）**：

1. `scripts/fetch_monthly_stats.py` 實際執行下載真實資料：`data/monthly-stats.csv`
   涵蓋 `201401` ~ `202605`（149 個月），對已知月份 `201401` 遺失卡核對為 180 筆／
   2,256,414 元，與 proposal.md 記錄的實測值一致。完整性檢查（每月應有 8 種信用卡
   詐欺型態）實跑時揪出一個真實資料特性：**「多刷帳單之詐欺」型態自 2021-01 起已
   不再出現於來源資料**（僅 2014-01~2020-12 有此型態），完整性檢查如實標記這 65 個
   月為「缺筆」但不中斷腳本；另外做了故意刪筆/複製造成多筆的模擬測試，腳本正常記錄
   異常且不崩潰。開發過程中也在此腳本抓到一個真實 bug（`sorted(extra) | duplicated`
   型別錯誤，list 不能與 set 做聯集），實跑才發現，已修正並重跑驗證。
2. Dashboard 頁面（`index.html`，純前端讀 CSV，無 build step）：用
   `python3 -m http.server` + 獨立 Playwright instance（非共用 MCP browser tool）
   實測，console 無 error；KPI 卡片本月/上月數字與獨立用 Python 手算的月度加總逐位
   吻合（如 `202605`：44,718 件／170,742,420 元；`201401`：24,902 件／48,544,726
   元）；最舊月份 `201401` 時「無上月資料」優雅顯示，不報錯；趨勢圖資料點與明細表
   同月同型態數字一致（實測 `202605` 遺失卡 376 筆／4,078,717 元，兩處一致）；149
   個月的趨勢圖改用 `<path>` 畫線＋月數 >36 時省略逐點 `<circle>`，頁面渲染時間約
   0.56 秒，未見卡頓。
3. Semgrep（`--config auto`）對改版後程式碼（含新腳本、新頁面）掃描 0 findings。

**已知限制**：

- `.github/workflows/daily-stats.yml` 已改寫（`runs-on: ubuntu-latest`，已實測此站
  對 Azure IP 無封鎖）並通過 YAML 語法驗證，但「手動觸發一次確認 Actions 綠勾、
  CSV 實際 commit 進 repo」需要 push 到 GitHub 遠端才能測，本次**未經遠端實跑驗證**
  （repo 未授權自動 push，待使用者確認後才能驗這一段）。
- 來源資料通報作業約有 1-2 個月延遲（`last-modified` 顯示 2026-07-31，但資料最新
  只到 202605），頁面如實顯示「資料最新到 YYYY-MM」，不假裝有更新的月份。

---

## （歷史記錄，已棄用）Level 2：Day28 v1 165dashboard.tw 版本（2026-08-25）

v1 版以 165dashboard.tw 為資料源，實作完成、獨立驗收通過，但 T4 實際跑 GitHub
Actions 才發現該站對雲端代管 runner 403 封鎖，已於同日改版換源（見上方 v2 記錄）。
v1 版驗證細節（gap-fill、月度交叉驗證、`Month` 欄位位移 bug 等）保留於 git history
（`44a2c77` 之後、v2 改版之前的 commit），此處不重複貼出。

---

## ✅ Level 2：Day29 `public-data-snapshot` v3「公開資訊變更雷達」完成（2026-08-26）

PRD 25。提案階段歷經兩次推翻（v1 CWA API 需金鑰 → v2 CWA 免金鑰雨量網頁，技術驗證
通過但被使用者質疑「快照對 user 沒什麼太大意義」且跟 Day28 機制撞題 → v3 改為
iThome RSS「有變化才通知」的 Schedule + State + Diff + Notification 設計），過程見
`sdd/public-data-snapshot/proposal.md`。裁示定案：排程每 6 小時、不加關鍵字篩選、
單一 iThome RSS 來源（2026-08-26 事後改為每 30 分鐘一次）。

**已驗證項目（T1-T3，`scripts/check_feed.sh`）**：

1. 首次執行（`seen.json` 不存在）：只建立 baseline（10 筆 guid），不產生
   `pending-issue.md`、不寫 `history.jsonl`。
2. 模擬 `seen.json` 缺 3 筆 guid：正確偵測出 3 篇新文章，`pending-issue.md` 內容
   含正確標題/連結，`history.jsonl` 新增一行，`seen.json` 補齊回 10 筆。
3. 模擬 `seen.json` 已含全部 guid：不產生 `pending-issue.md`，`seen.json`
   內容（md5）不變，`history.jsonl` 行數不變。
4. 用 `guid`（非標題）做識別依據，避免文章標題被編輯後誤判成新文章。

**T4（`.github/workflows/news-radar.yml`）**：`workflow_dispatch` 實跑 3 次，成功
建立 baseline、成功偵測新文章並建立真實 GitHub Issue（
[#1](https://github.com/lushinshang/2026ironman/issues/1)）、`seen.json`／
`history.jsonl` 正確 commit 回 repo。`permissions` 僅 `contents: write` +
`issues: write`，未過度授權。cron 已改為 `*/30 * * * *`（每 30 分鐘），尚未等到
真正自動觸發，僅驗證過手動觸發路徑（GitHub Actions 排程準時性本身即非官方保證，
屬已知限制）。

**T5（`index.html`）**：全程 `textContent`/`href` 賦值渲染 RSS 來源文字，Playwright
實測空狀態與有資料狀態皆正常、console 無錯誤。

**獨立驗收（T7）發現並已修正的 2 個問題**：
1. `index.html` 的連結 `href` 原本只擋了 `innerHTML` 拼接型 XSS，沒擋 `javascript:`
   等危險 scheme 直接賦值給 `.href`——已加上 `safeHttpUrl()` 白名單，只放行
   http/https，其餘降級為 `#`（commit `ddfbf9e`）。
2. `news-radar.yml` 的 commit 步驟 `[ -f "$f" ] && git add "$f"` 在 `set -e` 下，
   遇到「`seen.json` 完全不存在 + 當次 RSS 抓取剛好失敗」的邊界情境會讓整個
   step 以 exit 128 中止（已有真實失敗紀錄 run `32868934688` 為證）。目前因
   `seen.json` 已存在於 repo 而不會再發作，但已改成 `if [ -f "$f" ]; then
   git add "$f"; fi` 更穩健的寫法（一併修正）。

**已知未驗證項目**：shellcheck 本機未安裝，腳本僅靠人工審閱與實跑驗證，未過靜態
掃描；cron 自動觸發準時性未實測（見上）。

---

## 2. 進度

| Level | 範圍 | 狀態 |
|---|---|---|
| 前置工程 | `sdd/archive/2026-08-23-shared-infra/` | ✅ 完成、獨立驗收、修正 7 項缺陷 |
| Day01 `text-health-check` | | ✅ 實作完成 |
| Day02 `ai-text-cleaner` | | ✅ 實作完成 |
| Day03 `filler-word-checker` | | ✅ 實作完成 |
| Day04 `zh-tw-localizer` | | ✅ 實作完成 |
| Day05–06 `reversible-deidentifier` | | ✅ Phase A+B 完成 |
| Day07 `text-diff` | | ✅ 實作完成 |
| 1b CSV | Day08–13 | ✅ 全部完成 |
| 1c 圖片 | Day14–18 | ✅ 全部完成 |
| 1d PDF | Day19–26 | ✅ **全部完成**：2 前置工程 + Day19–26 全數獨立驗收通過 |
| 1e 整合 | Day27 | ⬜ 未開始 |
| 2 Actions | Day28–29 | 🟡 Day28 開發完成（遠端 Actions 執行未驗證）；Day29 v3 ✅ 完成、獨立驗收通過（修正 2 項缺陷） |
| Office 文件 | Day30 `ooxml-privacy-cleaner` | ✅ 開發+撰文+資安複驗完成（2026-08-27 初版；2026-09-12 依 `1150904_review.md` 完成安全補丁：`buildCleanHtmlCopy()` 離線版防外洩、DOCX 本機路徑/app.xml 擴充、XLSX 外部連結精準移除、PPTX 裁切防呆；經方案 C 雙重獨立理事會驗收——`codex exec` 56/56 PASS、`claude -p` Playwright 實機 DOM 斷言全 PASS，正式解除 CONDITIONAL REJECT） |
| 3 Workers | Day31 | ⏸️ 等 Cloudflare 帳號 |
| 4 Workers AI | Day32–35 | ⏸️ 等 Cloudflare 帳號 |
| 收尾 | Day36 方法論 | ⬜ 未開始 |

逐題進度表在 `README.md`，本檔不重複。

---

## 3. 共用元件登記簿

跨題複用的東西記在這裡，避免下一題重造輪子。**每建立一個就登記，用了也登記。**

| 元件 | 位置 | 建立於 | 被哪些題用到 |
|---|---|---|---|
| `base.css` ＋ 六個 JS 模組 | `shared/` | 前置工程 `sdd/shared-infra/` | Day01–07 全部 |
| `bundle.py` | `scripts/` | 前置工程 `sdd/shared-infra/` | Day01–07 全部 |
| `buildCleanHtmlCopy()` | 各題自行實作 | — | Day01–07 各一份（**不升級為共用模組**，見 `shared/CONTRACT.md` 第 6 節） |

### ✅ 已拍板：採 build step（選項 B），從 Day01 開始

**證據**（`scratchpad/recon-v1-assets.md` 第 6 節，四檔全量比對，非抽樣）：

| 樣板 | 出現檔數 | v1 的實際狀況 |
|---|:---:|---|
| `setupDropZone()` | 3 / 4 | 三份**逐字相同**，複製貼上三次 |
| Blob 下載 | 4 / 4 | 共 8 處呼叫，只有 Day1／Day3 各自封裝，**簽名不同、彼此獨立** |
| 複製到剪貼簿 | 4 / 4 | 四處**逐字相同** |
| `showToast()` | 4 / 4 | 四份幾乎相同，**但 timeout 一個 1800ms、其餘 2200ms** |
| `escapeHtml()` | 3 / 4 | 三份**逐字相同** |

決定 B 而非「複製貼上 + `shared/` 純文件」的理由：v1 只做了 9 題就已經出現 drift（`downloadFile` vs `downloadJson` 簽名不一致、toast 時長不一致）。32 題手動同步必然更糟。這不是假想需求，是已觀察到的事實。

**範圍嚴格限縮（避免過度設計）**：

- 做：讀 HTML 模板 → 依資源清單把 `shared/*.js` 與外部資源填進 placeholder → 產出單檔 `index.html` + `bundle_manifest.json`
- 做：強制在輸出 HTML 寫入機器可讀的版本／授權註解（v1 的 Day7 內嵌 jsdiff **連版本註解都沒有**，得回查 README 才知是 v5——這個缺口由腳本結構性解決）
- **不做**：minify、CDN fallback、自動抓取最新版。資源先手動下載到固定目錄，腳本只管「拼」不管「抓」
- 資料內嵌改用 `JSON.stringify` 包字串，**不用 v1 的 backtick template literal**（詞典內容若含反引號或 `${` 會炸模板）

Day01 只用到 shared 樣板、無外部 library，所以第一版腳本很小；Day04（OpenCC 1MB 詞典）、Day07（jsdiff）再擴充 escape_mode。遞進式擴充，不一次造大機器。

### ⚠️ 互動模式不可混用（v1 的刻意設計，別當成疏漏）

`recon-v1-assets.md` 6f 查證：v1 只有 Day1 用 debounce 即時運算，Day2/3/9 一律「按鈕觸發」。

- **即時（debounce 150ms）**：v2 Day01 `text-health-check`
- **按鈕觸發**：v2 Day03 / Day04 / Day05

---

## 4. 團隊編制（`ops/DISPATCH.md` 門檻表）

| 角色 | Agent 類型 | Model | 出動時機 |
|---|---|:---:|---|
| 指揮官（不下場） | — | opus | 決策、寫規格、與使用者溝通 |
| 技術偵查 | `general-purpose` | sonnet | 該題要用新 library |
| 架構師 | `Plan` | opus | 演算法硬題（Day16/23/33 等） |
| 工程師 | `general-purpose` | sonnet | 每題必派 |
| QA | `general-purpose` | sonnet | 每題必派，與資安同批併行 |
| 資安 | `general-purpose` | sonnet | 每題必派 |
| 驗收官（fresh） | `general-purpose` | sonnet／opus | 每題必派，**不給實作敘述** |
| 寫手 | `general-purpose` | sonnet | 與驗收併行起草 |
| 總編 | `editor-in-chief` skill | — | 每題必派 |
| 批次工 | `general-purpose` | **haiku** | 機械式套用已定案模式、進度表勾選、格式統一、log 整理 |

### ⚠️ 模型分級校準（使用者 2026-08-23 提醒）

**複雜的執行才用 opus，單純的執行用 sonnet 或 haiku。**

之前 opus 用得太寬（Day04 實作、Day04 驗收都派了 opus，但規格已經寫得很細，sonnet 足夠）。校準如下：

| 用 opus | 用 sonnet | 用 haiku |
|---|---|---|
| 架構設計、規格有多個互相牽動的判斷 | 依已定案規格實作 | 套用已定案模式的機械式改檔 |
| 高風險驗收（個資、資安、會擴散到多題的基礎設施） | 一般驗收 | 進度表勾選、編號統一、格式對齊 |
| 除錯深水區（sonnet 同一問題錯 2 次後升級） | 文章草稿、研究查證 | 檔案搬移、批次重跑建置 |

判斷法：**規格已經寫死、只剩照做 → 不需要 opus**。opus 的價值在「規格沒寫到的地方要做判斷」。

派工 prompt 一律用 `ops/TEMPLATES.md` 的模板，三件套（目標與動機／驗收條件／回報格式）缺一不派。
升降級照 `ops/DISPATCH.md` 第 5 節，不自創：haiku 錯 1 次直接升 sonnet；sonnet 同一子任務錯 2 次升 opus 並附完整失敗軌跡；同層級不凹第 3 次。

### 已驗證的環境事實

- **`Agent` 工具沒有 `effort` 參數**（參數只有 `description` / `isolation` / `model` / `prompt` / `subagent_type`），subagent 一律繼承 session 的 effort。只有 `Workflow` 腳本裡的 `agent()` 有 `opts.effort`。
  → 要拉高難題品質只能靠 **model 分級**，不能靠 effort 分級。
  → 這條修正了 `ops/DISPATCH.md` 第 2 節標記為「未驗證」的項目，**尚未回寫進該檔**（待辦）。

---

## 5. 偵查已確認的事實（Level 1a）

報告全文：`scratchpad/recon-level1a-libs.md`、`scratchpad/recon-v1-assets.md`（scratchpad 是 session 暫存，重點已摘錄於此檔，不要依賴那兩個路徑長期存在）。

### 各題的 v1 資產底數

| v2 題目 | v1 來源 | 可複用程度 |
|---|---|---|
| Day01 `text-health-check` | Day1 | 統計核心可用；**問題位置標示、連續空白/重複標點偵測全部要新寫** |
| Day02 `ai-text-cleaner` | 無 | **全新開發**，v1 沒有任何對應 |
| Day03 `filler-word-checker` | Day2 | 幾乎全套可複用（詞庫比對、引號排除、詞頻、段落開頭同構偵測） |
| Day04 `zh-tw-localizer` | Day3 | `runStage` segment+tags 架構可複用（`old/Day3/index.html:53955-53993`）；**「逐項接受/取消替換」v1 完全沒有，要新增** |
| Day05 `reversible-deidentifier` | Day9 | ⚠️ **v1 是單向遮蔽，沒有 mapping/token 機制**。regex 偵測可複用，可逆化是全新設計 → 本題最重，建議派架構師（opus） |
| Day07 `text-diff` | Day7 | 未在本次盤點範圍，另行偵查 |

### 外部資源

- **OpenCC**：pip `opencc-python-reimplemented` v0.1.7，Apache License。v1 Day3 內嵌 4 份詞典共 53,031+39+509 行，行數與本機詞典檔完全吻合。純文字 1,049,630 bytes，佔 Day3 檔案 96%+
- **jsdiff**：v1 用 major version 5（BSD-3-Clause），**檔內無版本註解**，靠 README 反推。npm 最新 9.0.0（2026-04-13），中間有 6.0.0、8.0.0 兩次 breaking change（6.0.0 改 comparator 參數順序；8.0.0 移除 `merge`、改寫 TS、ESM 打包方式改變）
  - ⚠️ **Day07 待決**：9.x 是否還提供瀏覽器可用的 UMD bundle？若否，內嵌成本可能高於留在 5.x。Day07 開工前要先查證
- v1 **沒有任何打包腳本**，兩個檔案都是人工下載後手動貼上

---

## 5b. Day05 使用者已拍板（2026-08-23）

提案 agent 提出的三個爭議點，使用者裁示：

| 爭議點 | 裁示 | 備註 |
|---|---|---|
| 保留 v1 的逐項勾選確認流程？ | **不做** | v2 可逆，做錯能還原，勾選閘門必要性下降；PRD 05 MVP 也未列 |
| 加 `beforeunload` 離開確認（mapping 未下載時攔截關分頁）？ | **不做** | PRD 未要求，違反共通規則第 3 條「不自行增加未要求功能」 |
| Token 前綴 `MOBILE`/`TEL` 分開還是統一？ | **統一 `PHONE`** | mapping 可讀性優先；偵測器仍可分兩種 regex，但 token 類型合併為一 |

⚠️ 第 3 項要回頭改 `sdd/reversible-deidentifier/proposal.md` 與 `tasks.md`：型別優先序原本是 `TERM > ID > MOBILE > TEL > EMAIL > PERSON`，合併後變 `TERM > ID > PHONE > EMAIL > PERSON`。

---

## 6. 待辦

- [x] ~~寫 Day01–07 的 `proposal.md` + `tasks.md`~~ 已完成，**等使用者說「開始實作」**
- [x] ~~查證 jsdiff 版本~~ 已定案 **9.0.0**（BSD-3-Clause）。實測 `npm pack` 拆包確認 9.0.0 仍有 UMD bundle `dist/diff.js`，8.0.0 只是新增 `libesm/`、未移除 UMD；6.0.0 的 comparator 參數順序變更對本題的對稱比較無影響。bundle 53.7KB→111.3KB，換取 8.0.3/8.0.4 安全性修正
- [ ] **實作前先跑前置工程 `sdd/shared-infra/`**，它必須在 Day01 開工前完成
- [x] ~~把「`Agent` 工具無 `effort` 參數」回寫進 `ops/DISPATCH.md` 第 2 節~~ 已完成 2026-08-23（屬事實修正，依 `MAINTENANCE.md` 第 1 節可自行做；備份在 `ops/backup/2026-08-23/DISPATCH.md`）
- [ ] 建 `VibeCoding/index.html` 作品集入口（第一題完成後再做）

---

## 7. 環境陷阱速查

完整版在 `CHECKLIST.md` 第四節，這裡只放最容易忘的：

- Playwright MCP **不能開 `file://`**，要起 `python3 -m http.server`；`file://` 專屬驗收另用本機 Python `playwright` 套件
- `browser_evaluate` 對 `fetch(blob:URL)` **會卡死**，取匯出內容改攔截 `window.Blob` constructor
- `scripts/generate_log.py` 在 Claude Code **必失敗**，改手動整理進 `DayNN_<short-name>/logs/`，檔頭註明環境不相容

---

## 8. Level 1b 提案階段的完整審查紀錄（2026-08-23）

共 14 輪：前 3 輪由 Claude subagent（opus）執行，第 4–14 輪由 `codex exec -s read-only` 執行。

### 為什麼跑到 14 輪

不是因為提案很爛，是因為**每一輪都在更深的層次找到同一種病**：

| 層次 | 抓到什麼 |
|---|---|
| 提案彼此矛盾 | 三題三套型別門檻、組合鍵分隔符各用各的、Pie 門檻兩種答案 |
| 提案違反契約 | 自寫拖放繞過編碼偵測、one-page 漏掉共通 UI 基線 |
| 契約本身有洞 | 大檔案門檻無處可掛、`dateParts()` 沒定義、閘門時序靠呼叫端自律 |
| **驗收條件本身壞掉** | 六次「字面上不可能通過」、一次「永遠會通過」 |
| **驗收工具本身壞掉** | 檢查指令數錯東西、pattern 太窄／太寬、`grep -P` 在 BSD grep 上跑不起來 |

### 最後三輪的教訓（都打在指揮官身上）

1. **我寫了驗收指令卻沒跑過** —— `sort | uniq -c` 數的是出現次數，驗不到「只屬於一題」；
   `for` 迴圈裡還留著 `...` 省略號。**這正是我自己寫進 `LESSONS.md` 的那條**。
2. **示例會被照抄** —— 契約拿 `ZZSALARYCOL` 當「唯一哨兵」示例，結果兩題同時採用了它。
   改成「已佔用登記表」：列出已佔用的名字是禁止複製，不是邀請複製。
3. **「我這裡跑得起來」不等於「這條指令可用」** —— 我的 shell 走到 `ugrep`（支援 `-P`），
   codex 的環境是 BSD `/usr/bin/grep`（不支援）。同一條指令，我通過、它報錯。

### 收尾檢查清單（`CSV_CONTRACT.md` 第 8 節）

三條指令都已實測、且都做過**反證**（故意製造違規確認指令真的會輸出）：

- 哨兵跨題唯一
- 正向：每個驗 `buildCleanHtmlCopy()` 的 tasks 都有 DOM 斷言
- 負向：沒有人把結構性字串交給 `grep` 當判定（限定同一 inline code span 內比對）

⚠️ **一條「永遠不輸出」的指令和一條「通過所以不輸出」的指令，從結果上看一模一樣。**
所以每條檢查都要配一次反證。