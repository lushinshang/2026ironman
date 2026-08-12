## 為什麼做

使用者在專案中規劃了兩個鐵人賽主題 `Security/` 與 `VibeCoding/`，各自有首頁檔案 `README.md`。為了讓這兩個大綱規劃能以最精美、好讀且 Notion 風格的靜態網頁形式部署於 GitHub Pages 上，需要建立一套自動化轉檔機制，在 `README.md` 發生更新時，自動將其轉譯為同目錄下的 `index.html` 網頁檔。

## 要改什麼

1. **建立編譯轉換腳本 `scripts/compile_docs.py`**：
   * 使用本機已安裝的 `pandoc` 作為 Markdown 轉 HTML 片段的引擎。
   * 將轉出的 HTML 片段，嵌入自訂的 Notion 風格護眼網頁模板（包含 `"Noto Sans TC"` 字型、舒適的行高、離線支援與響應式排版）。
   * 腳本執行時會批次編譯 `Security/README.md` ➡️ `Security/index.html`、`VibeCoding/README.md` ➡️ `VibeCoding/index.html` 以及根目錄的 `readme.md` ➡️ `index.html`。
   * **連結重定向與互通**：自動在生成 HTML 時，將內容中所有指向 `README.md`（或 `readme.md`）的超連結 `href` 替換為 `index.html`，以實現專案總首頁與子主題網頁間的完美點擊互通，且隱去根目錄首頁的「返回首頁」導航。
2. **部署 Git pre-commit Hook 自動化**：
   * 建立或更新 `.git/hooks/pre-commit`。
   * 在每次執行 `git commit` 時，自動檢查上述三個 `README.md` 是否有變更，若有則自動執行 `scripts/compile_docs.py` 並將產出的對應 `index.html` 自動加入（`git add`）本次提交，實現 100% 的無感編譯與發布。

## 影響範圍

| 檔案 | 動作 | 說明 |
|------|------|------|
| `sdd/md-to-html-automation/proposal.md` | 修改 | 規格書（追加連結重定向互通說明） |
| `sdd/md-to-html-automation/tasks.md` | 修改 | 任務清單與驗收條件 |
| `scripts/compile_docs.py` | 修改 | 支援連結重定向處理邏輯 |
| `.git/hooks/pre-commit` | 修改 | 無變動，繼續監控 |
| `index.html` | 修改 | 重新編譯，連結重定向後更新 |
| `Security/index.html` | 修改 | 重新編譯，連結重定向後更新 |
| `VibeCoding/index.html` | 修改 | 重新編譯，連結重定向後更新 |
