# Session 對話與思考日誌（手動整理版，2026-08-23）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗（已於 2026-08-08、2026-08-09 兩次實測確認）。**本檔為非腳本自動產出、環境不相容**，改為依同一份既有格式手動彙整，素材來源為 git commit history、`sdd/archive/2026-08-23-ai-text-cleaner/`、`article_draft.md`、`PROGRESS.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 背景

Day02 `ai-text-cleaner` 是 Level 1a 六題之一，在共用層（`shared/` 六模組 + `bundle.py`）與跨題驗收修正完成之後才實作，因此不像 Day01 需要返工。

## 實作與驗證（commit `efca142`）

10 條 task 全部完成並實測：

- 三種輸出模式的差異實際比對過三份輸出，node 端 word-diff 確認只有 code fence 的語言標籤被刻意移除，無句子內容遺失。
- **實作階段抓到 proposal 的一個事實錯誤**：proposal 假設 `©®™` 不屬於 `\p{Extended_Pictographic}`，實測三者皆為 `true`。已加明確碼位排除（`U+00A9`／`U+00AE`／`U+2122`），確保開啟 emoji 移除時這三個字元仍保留。
- 離線版驗證：帶著 live toast 與密文標記下載，產物中密文零命中、無 `#__shared_toast`、無 `.nav-back`、textarea 為空。
- 獨立複驗（指揮官）：重跑 build 與現有產物 diff 相同（產物未被手改）、script 標籤 6/6 配對、無 fetch/XHR/外部 URL/localStorage。

## 背景 agent 撞上電腦休眠（跨題環境陷阱）

commit `bf0ab25` 記錄暫停時三個背景 agent 的確切結果：Day02 `ai-text-cleaner` 實作**撐過休眠完成了**，10 條 task 全過，已 commit；同批的 Day05 Phase B 實作與 Day03 獨立驗收則因電腦休眠中斷 API 而確定失敗、無任何產出，需整個重派。教訓：長時間背景 agent 遇到電腦休眠會被 API 中斷，離開前若有 agent 在跑，要嘛等它回報再走，要嘛直接當作會失敗。

## 收尾：文章與連結核實的一次修正

commit `2f9e927`：Day02 文章草稿與截圖完成（本機 Python playwright 獨立實例拍攝，非 Playwright MCP）。該次記錄一個具體的誠實回報事件：**負責寫文章的 agent 誠實標註「連結實測 404」**，但它是用 `git config` 的 `user.name` 猜測 GitHub 帳號、猜錯了 host；指揮官後續用真實帳號 `curl` 實測回 200，該段錯誤的未驗證聲明已從文章中移除。

commit `9391e06` 再次記錄同一事件並確認修正方向正確：「agent 拒絕宣稱自己沒驗證過的事，方向正確；補的是它拿不到的證據，不是推翻它的判斷」。同 commit 也記錄五篇文章 Mermaid 全數驗證通過、真實 GitHub 帳號零洩漏。

commit `707e7a8`（總編審查）：Day02 零改動。審查者實測核對 `\p{Extended_Pictographic}` 對 `©®™` 回 `true`（Day02 的核心論點），並確認 GitHub Pages 連結 `curl -sI` 回 200。

`article_draft.md` 第 102 行連結：`https://<GITHUB_USER>.github.io/2026ironman/VibeCoding/Day02_ai-text-cleaner/index.html`，已實測回 `HTTP/2 200`。

## 與共用層的互動

Day02 未觸發共用層改動；直接使用已修正完成的 `shared/` 六模組與 `bundle.py`（前置工程獨立驗收抓到的 7 項缺陷已在 Day02 開工前修完，詳見 commit `ac2d495`）。

## 補記：一個吃掉大量時間的環境陷阱

驗證「複製到剪貼簿」功能時，若用 `clipboard.readText()` 讀回剪貼簿內容來比對，它會觸發瀏覽器的權限提示。自動化環境沒有人去按那個提示，於是**一路卡住約 30 分鐘**——而且不會報錯，只是不回來。

解法是改攔**寫入端**：monkey-patch `navigator.clipboard.writeText`，把傳進去的參數存起來再比對。同理，要取下載內容時攔 `window.Blob` constructor，不要用 `fetch(blob:URL)`（那個也會卡死）。

> 出處：本專案外的跨專案踩坑紀錄 `ops/LESSONS.md`（2026-08-23 條目），事件發生於本題的實作階段。此段非從本 repo 的 git 歷史考證而來，特此註明。
