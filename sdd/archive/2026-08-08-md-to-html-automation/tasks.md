## 任務清單

- [x] 1. 建立 `scripts/compile_docs.py` 編譯腳本，內嵌 Notion 護眼風格模板，並透過 Pandoc 執行 Markdown 轉檔。
- [x] 2. 修改 `scripts/compile_docs.py`，支援連結重定向轉換邏輯，將 HTML 內所有指向 `README.md` / `readme.md` 的超連結自動替換為對應目錄下的 `index.html`。
- [x] 3. 測試手動轉檔，確認成功生成 `Security/index.html` 與 `VibeCoding/index.html` 的 HTML 網頁。
- [x] 4. 修改並部署 `.git/hooks/pre-commit` Git 鉤子，新增對根目錄 `readme.md` 變更的偵測，並將其轉出的根目錄 `index.html` 也自動 `git add` 加入提交。
- [x] 5. 進行整合功能測試與驗收，修改根目錄 `readme.md` 並進行 Commit，驗證 `index.html` 能自動編譯且自動提交，且連結替換正確（互通良好），無個資洩漏。

## 驗收條件

- 情境：當我們在 `Security/` 下修改並儲存 `README.md` 後，若執行 `git commit`，Git 會自動在背後將 `Security/index.html` 重新編譯出來，且該 `index.html` 也會被一同 Commit 提交。
- 情境：用瀏覽器打開生成出的 `index.html` 網頁時，背景呈現溫和的 Off-white 底色，表格有精緻邊框與圓角，文字排版易讀且美觀。
