# Session 對話與思考日誌（手動整理版，2026-08-23）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗（已於 2026-08-08、2026-08-09 兩次實測確認）。**本檔為非腳本自動產出、環境不相容**，改為依同一份既有格式手動彙整，素材來源為 git commit history、`sdd/archive/2026-08-23-text-diff/`、`article_draft.md`、`PROGRESS.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 背景：因 Day05 拆兩天而順延

commit `be5e9e5`：使用者裁示把 Day05 `reversible-deidentifier` 拆成兩個發文日（Phase A 對應 Day05、Phase B 對應 Day06），原本排在 Day06 的 `text-diff` 因此順延成 Day07，系列總長從 33 天變成 34 天。

## 版本查證：jsdiff 選哪個版本

`PROGRESS.md` 記錄查證過程：v1（`old/Day7/`）內嵌 jsdiff major version 5（BSD-3-Clause），**檔內連版本註解都沒有**，得回查 README 才知道是 v5——這個缺口由前置工程的 bundle.py 腳本結構性解決（強制寫入機器可讀的版本／授權註解）。

npm 上 jsdiff 最新版本是 9.0.0（2026-04-13），中間有 6.0.0、8.0.0 兩次 breaking change：6.0.0 改 comparator 參數順序；8.0.0 移除 `merge`、改寫 TS、ESM 打包方式改變。`PROGRESS.md` 記錄 Day07 開工前的待決事項：**9.x 是否還提供瀏覽器可用的 UMD bundle？若否，內嵌成本可能高於留在 5.x。**

查證結果（`PROGRESS.md`）：已定案 **9.0.0**（BSD-3-Clause）。**實測 `npm pack` 拆包確認 9.0.0 仍有 UMD bundle `dist/diff.js`**，8.0.0 只是新增 `libesm/`、未移除 UMD；6.0.0 的 comparator 參數順序變更對本題的對稱比較無影響。bundle 大小 53.7KB → 111.3KB，換取 8.0.3/8.0.4 的安全性修正。commit `707e7a8`（總編審查）再次獨立核對：jsdiff bundle 111,301 bytes。

## 實作（commit `ac2d495`）

與 Day03、Day04 同一次 commit 完成：`PRD.md`、`bundle_manifest.json`、`index.html`、`src/index.html`、`src/diff.js`（jsdiff 9.0.0 UMD bundle，2313 行）。共用前置工程已修正的 `shared/` 六模組與 `bundle.py`（7 項缺陷詳見 shared-infra 側日誌）。

## 前置工程共用層缺陷（本題受影響項目）

Day07 內嵌 jsdiff 屬於外部 ASSET，直接受前置工程共用層 7 項缺陷中「授權未渲染到頁面可見處」「`escape_mode` 危險預設 `raw_js`」「`bundle.json` path 可路徑穿越」三項規則約束；`PROGRESS.md` 也提到 Day04（OpenCC 1MB 詞典）、Day07（jsdiff）用來擴充驗證 `escape_mode` 邏輯的遞進式擴充過程。

## 收尾：文章與總編審查的一次修正

commit `9391e06`：Day07 文章草稿完成，與其餘四篇一併驗證 Mermaid、真實 GitHub 帳號零洩漏。

commit `707e7a8`（總編審查）：**Day07 修正 9 處中文句子夾半形逗號**（Day01-04 零改動）。審查者實測核對項目包括 AI 味詞彙 grep 零命中、九張 Mermaid 全過、十張截圖實際開圖確認有示範資料、真實 GitHub 帳號零洩漏、五個 Pages 連結 `curl` 200，以及 jsdiff bundle 111,301 bytes 這項技術數字重新核算。

`article_draft.md` 第 128 行連結：`https://<GITHUB_USER>.github.io/2026ironman/VibeCoding/Day07_text-diff/index.html`，已用 `curl -sI` 實測回 `HTTP/2 200`。

## 驗收

`sdd/archive/2026-08-23-text-diff/tasks.md` 列有驗收條件章節，依既有慣例逐條自測後全過。
