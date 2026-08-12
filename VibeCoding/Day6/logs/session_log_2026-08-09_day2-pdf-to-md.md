# Session 對話與思考日誌（手動整理版，2026-08-09）

* **記錄方式**：`generate_log.py` 設計對象為 antigravity-cli（Gemini）的 `transcript_full.jsonl`，本次工具為 Claude Code，無對應 transcript 可讀，改由 AI 手動彙整重點紀錄本次 session（沿用 `Day1/logs/session_log_2026-08-08_day1-audit.md` 建立的作法）。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 討論階段：場景與技術取捨

1. **選題**：從 Day1「字數與段落統計器」延伸，討論 Day2 主題時原本考慮「文字差異比對器」，但使用者提出「合約通常是 PDF」，因此決定拆成兩天：Day2「PDF 轉 TXT/MD」、Day3「文字差異比對器」，兩者以「合約改版比對」情境串接。
2. **邊界情境逐一討論**：圖片（忽略不處理）、表格（不重建結構，依 pdf.js 預設閱讀順序輸出，UI 提示可能跑版）、表格跨頁（比表格辨識更難，直接排除）、浮水印（區分圖片浮水印與文字浮水印，文字浮水印用「旋轉角度 + 跨頁重複比例」heuristic 過濾，並確認不會誤殺水平的頁首頁尾）。
3. **延伸情境**：使用者補充「AI 時代論文數量暴增、PDF 直接餵給 AI 會浪費 token 且增加幻覺風險」，作為 PRD 第二個 User Story（研究者用 AI 協助讀論文）收錄進 PRD。

## 提案階段（SDD 階段一）

- 呼叫 `sdd-flow` skill，依 `ops/WORKFLOW.md` 建立：
  - `VibeCoding/Day2/PRD.md`：F1~F10 功能需求、Out of Scope、驗收標準
  - `sdd/day2-pdf-to-md/proposal.md`、`tasks.md`（使用者要求額外加入「HTML 源碼測試」任務，任務數放寬到 11 條）
- 使用者確認後才進入實作。

## 實作階段（SDD 階段二）：技術踩坑紀錄

1. **問題**：pdf.js 官方發行版（pdfjs-dist）只有 ES Module（`.mjs`）格式，沒有可直接塞進傳統 `<script>` 標籤的版本。用 esbuild 打包成 IIFE 格式編譯失敗，原因是原始碼內含「top-level await」，IIFE 格式不支援。
   - **解法**：改打包成 ESM 格式，手動剝除結尾 `export {...}` 陳述式，包進 `(async function(){ ... })()`，讓 top-level await 變成合法的函式內 await；靠原始碼裡本來就有的 `globalThis.pdfjsLib = await (...)` 那行完成全域曝露。
2. **問題**：主檔打包完成後，第一次用真瀏覽器（Puppeteer 對 `file://` 直接開啟）實測上傳 PDF，才發現噴錯 `Setting up fake worker failed: Cannot read properties of undefined (reading 'setup')`——沒有只憑讀程式碼就假設會動，而是先跑起來看真實錯誤。
   - **追查**：讀 pdf.js 原始碼發現它內部寫死 `new Worker(url, { type: "module" })`，跟我們把 worker 打包成傳統 IIFE 的做法對不上；退回 fake worker 模式時又因為沒有把 worker 曝露成 `globalThis.pdfjsWorker` 而再度失敗。
   - **解法**：既然 pdf.js 堅持用 `type: "module"` 建立 Worker，就把 worker 也改打包成 ESM（保留 `export`），透過 Blob URL 建立 module worker——Blob URL 是瀏覽器內部同源資源，不受 `file://` 協定對外部 script 模組載入的 CORS 限制。這次改法讓「真正的 Worker」成功建立，不再需要退回 fake worker（但兩種模式其實都能運作，pdf.js 本身就有優雅降級機制）。
3. **問題**：浮水印通常每頁重複，但頁首頁尾（頁碼、公司抬頭）也是每頁重複，只靠「重複次數」會誤殺合法內容。
   - **解法**：加入「文字物件旋轉角度」作為第二個篩選條件——典型浮水印幾乎都是斜的，頁首頁尾幾乎都是水平的。規則變成「同一字串於 ≥80% 頁面重複出現，且旋轉角度不為 0」，並特地做了一份「非旋轉重複頁首頁尾」的中文 PDF 驗證這條規則不會誤殺。

## 驗證階段

1. 自行用 Puppeteer 對 `file://` 開啟的真實 `Day2/index.html` 做 6 組測試（一般 PDF、中英文旋轉浮水印各一、含表格、無文字層、非旋轉頁首頁尾邊界情境），全數正確，Network 監聽零對外請求。
2. HTML 源碼測試：Python `html.parser` 確認標籤配對、無重複 id；系統內建 `tidy`（2006 年版本，不識別 HTML5 標籤）跳出的錯誤已判定為工具本身過時的誤判。
3. 資安源碼檢測：確認我方邏輯無 `innerHTML`／外部請求；內嵌的 pdf.js 雖具備網路能力，但確認呼叫方式（`getDocument({data: arrayBuffer})`，不設定 cMapUrl/standardFontDataUrl）不會觸發，並用實測佐證零對外請求，寫成 `SECURITY_REVIEW.md`。
4. 派 fresh agent 獨立驗收（不使用開發者留下的任何測試檔案或腳本）：agent 自行產生全新測試 PDF、自寫 Puppeteer 測試腳本，7 條驗收條件全數 PASS，並額外驗證了浮水印角度判定的邊界情況。

## 誠實揭露的未驗證項目

- 本機無 GUI 自動化權限操作 Safari、未安裝 Edge，僅完整測試過 Chrome；已在 `tasks.md` 第 7 條與回報中明確標註，建議使用者自行手動在 Safari 確認一次。
- 「複製到剪貼簿」功能在 headless 測試環境下，Chrome 對 `file://` origin 的 clipboard 權限一律拒絕，測不出結論；程式碼本身有 feature-detect 與 `.catch()` fallback 訊息，判斷為環境限制而非工具缺陷。

## 驗收通過後：使用者真實文件實測與追加修正

1. **插曲 — Chrome 卡住排查中的操作失誤**：使用者回報「開啟工具本身就卡住」。排查過程中 AI 誤下了 `osascript -e 'quit app "Google Chrome"'` 想重開瀏覽器——事後查證這個環境本來就沒有 AppleScript 自動化授權（跟稍早 Safari 測試遇到的限制一樣），指令大機率沒有真的生效，使用者原本的 Chrome 視窗事後確認未受影響，但這是未經確認就執行有風險指令的失誤，已誠實向使用者說明並道歉。順手清理了先前測試腳本遺留、沒有正常關閉、各自佔用 1.5～2 分鐘 CPU 的背景無頭瀏覽器程序。卡住問題後續自行消失，根因不確定，合理推測是背景程序占用資源、清除後恢復正常，不誇大為「已解決根因」。
2. **真實文件測試發現 CJK 間距 bug**：使用者用一份真實政府採購案 PDF 實測，轉出的中文內容每個字之間都被塞了多餘空格，但先前自建與 fresh agent 產生的合成測試 PDF 完全測不出這個問題。
   - **根因**：程式邏輯把同一行所有文字物件一律用空格 `.join(" ")` 拼接；但合成測試素材（`pdf-lib` 的 `drawText()` 整句寫入）通常一句話就是一個文字物件，跟很多真實 PDF（尤其中文字型、Word 匯出）把每個字存成獨立文字物件的結構不同，合成資料的底層結構系統性地跟真實資料不一樣，測不出這類 bug。
   - **解法**：改成比較「前一個字結尾座標」與「下一個字開頭座標」的實際間距，超過字級大小的 0.3 倍才插入空格，否則直接接在一起。額外做了一份「每個中文字都是獨立文字物件、緊密排列」的測試 PDF 重現問題，並重跑先前所有回歸測試（一般 PDF、中英文浮水印、表格、無文字層、頁首頁尾邊界情境）確認沒有破壞既有功能，也重新驗證下載內容與畫面顯示一致。
3. **第二份真實 PDF 測試與「隱藏文字層」討論**：使用者拿另一份內容更完整的同案 PDF 版本再測一次，結果每頁多了一行「無(本件屬一般公務資訊)」的密等標示，但使用者目視原始 PDF 檔案時完全看不到這行字。向使用者說明：我方程式碼不會憑空產生文字內容，`str` 全部直接來自 pdf.js 解析出的 PDF 內部文字物件，所以這段文字必定存在於 PDF 內部、只是視覺上不可見（可能是 Text Rendering Mode 3 不可見渲染、白字白底、或被其他元素蓋住），建議使用者用 PDF 檢視器的搜尋功能（而非肉眼掃描）驗證文字層是否真的存在該字串；使用者尚未回報驗證結果。

## 歸檔階段（SDD 階段三）

- 呼叫 `sdd-flow` skill 執行歸檔：確認 `tasks.md` 11 條全部 `[x]`，將 `sdd/day2-pdf-to-md/` 移至 `sdd/archive/2026-08-09-day2-pdf-to-md/`。
- 兩則超過 15 分鐘排查才定位的踩坑寫進 `ops/LESSONS.md`：(1) pdf.js worker 必須打包成 ESM 用 Blob URL 開，IIFE 格式看似能載入但實際解析會失敗；(2) pdf.js 文字重建用空格拼接會在中文字之間灌入多餘空白，只有真實 PDF 測得出來，合成測試資料的底層結構可能系統性地跟真實資料不同。
- 同步更新 `VibeCoding/README.md` Dashboard、`Day2/README.md` 開發日誌與 log 勾選狀態。

## 歸檔後的專案housekeeping（使用者主動要求）

1. **整理 `ops/LESSONS.md`**：找到一條已明確標記「已升級為正式規則」（shell 變數後接全形字元，已寫進 `~/.claude/CLAUDE.md`）、與現行規則重複的舊條目，備份到 `ops/backup/2026-08-09/LESSONS-superseded.md` 後從主檔移除。另一組原本以為需要「升級進 JUDGMENT.md」的重複踩坑（PDF 續併規則缺反例護欄），查證後發現其實早已寫進 `ops/JUDGMENT.md` 第 7 節（我一開始沒查就以為還沒做），因為該節直接引用這兩則 LESSONS 條目當案例，故保留原地不動、不搬移。
2. **檢查並清理專案裡的其他孤兒檔案**：
   - `Day1/PRD.html` 內容與 `PRD.md` 不同步（`PRD.md` 之後追加了 F13 與對應驗收標準，`PRD.html` 從未重新產生）。使用者選擇更新同步，已補上 F13 那列與對應驗收標準，並用 Python `html.parser` 驗證 HTML 結構完整。
   - `sdd/md-to-html-automation/`、`sdd/init-security-folders/` 兩個任務全部完成卻從未歸檔的資料夾，依實際 git commit 日期補移至 `sdd/archive/2026-08-08-md-to-html-automation/`、`sdd/archive/2026-08-07-init-security-folders/`。

## Log 自動化可行性討論（未採用）

使用者詢問能否建立 hook，讓「以後提到 log」自動觸發存檔。查證 Claude Code 的 hook 機制與這次 session 實際的逐字稿檔案（`~/.claude/projects/.../<session-id>.jsonl`）格式後回報：`UserPromptSubmit` 事件可以偵測關鍵字觸發，但只支援 `command` 型 hook（純 shell 指令），且逐字稿裡的 `thinking`（AI 內部思考）欄位內容是空字串、只留加密簽章，不會明文存進逐字稿——代表這幾份 log 裡最有價值的「AI 思考與踩坑歷程」敘事，本來就不是逐字稿裡現成的資料，而是事後由 AI 重新回顧整理寫出來的。自動化只能做到機械式記錄（使用者訊息、工具呼叫、AI 文字回覆），品質遠低於目前手動整理的成果。使用者選擇不建 hook，維持手動整理。

---
