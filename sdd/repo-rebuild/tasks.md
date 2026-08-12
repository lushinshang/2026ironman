# Tasks：砍掉 `2026ironman` repo 並乾淨重建

- [x] T1 確認 5 個未追蹤的 day3 歸檔資料夾是否納入新的第一筆 commit——使用者決定「不納入，維持未追蹤狀態」
- [ ] T2 最終確認執行 `gh repo delete lushinshang/2026ironman`（不可逆，執行前再問使用者一次）
- [ ] T3 刪除舊 repo
- [ ] T4 建立同名新 repo（`gh repo create lushinshang/2026ironman --public --source=. `或先建空 repo 再設定 remote，依實際情況擇一）
- [ ] T5 本地 `rm -rf .git && git init`，設定 remote，`git add`（依 T1 決定的範圍），建立第一筆 commit，push
- [ ] T6 在新 repo 的 Settings → Pages 選擇「GitHub Actions」為部署來源，觸發 workflow 執行
- [ ] T7 驗證：`curl -sI` 確認首頁與至少一個 DayN 頁面回應 200；確認新 repo 只有 1 筆 commit、內容與舊 repo 最新版本一致（`git status` 乾淨、檔案數量比對）

## 驗收條件

- 情境：當在 GitHub 網頁檢查新 repo 的 commit 歷史時，只會看到 1 筆 commit，不含任何舊有的真實案號內容。
- 情境：當用 `curl -sI` 檢查 `https://lushinshang.github.io/2026ironman/` 與 `https://lushinshang.github.io/2026ironman/VibeCoding/Day8/index.html` 時，最終都會回應 200（允許重新部署的等待時間）。
- 情境：當比對新 repo 工作目錄與刪除前本地工作目錄的檔案內容時，除了 `.git` 本身，其餘檔案內容應完全一致（不多不少，依 T1 決定的範圍為準）。
- 情境：當搜尋新 repo 的完整 commit 歷史時，找不到任何「PU15013」字串。
