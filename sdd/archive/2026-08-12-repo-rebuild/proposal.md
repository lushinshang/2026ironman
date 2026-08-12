# 提案：砍掉 `2026ironman` repo 並乾淨重建

## 為什麼做

真實招標文件案號「PU15013L」曾誤植進多份已 commit 並 push 的檔案（文章、session log、SDD 歸檔文件），雖然最新版本（HEAD）已全數改為虛構案號「AB12345C」，但舊 commit（`ac763b7`、`8e4ba22`、`ab4d9e4` 等）裡的原始內容仍留在 git 歷史紀錄中，只要 repo 是公開的，任何人都能透過 GitHub 網頁的 commit 歷史或 `git clone` 翻到。

已與使用者確認：這個 repo 是 iThome 鐵人賽 30 天挑戰的工作 repo，但使用者計畫寫完全部 30 天內容後才「切換參賽」、屆時逐日分享——也就是說 git commit 的時間戳記不會被拿來當「每日進度」的證明，逐日 commit 歷史對這個特定用途沒有保留價值。在這個前提下，比起用 `git filter-repo` 精細清洗歷史（保留逐日 commit 但操作複雜、有誤刪風險），直接砍掉整個 repo、本地重建一份全新歷史再 push，是最乾淨且風險最低的做法——新 repo 是全新的物件資料庫，沒有任何舊 commit 存在過的痕跡。

## 要改什麼

1. 確認本地工作目錄狀態（已完成）：真實案號已從所有追蹤與未追蹤檔案清除，`.git` 完整備份至 `/Users/lanss/projects/2_Practice/tools/2026ironman_git_backup_20260812`（供緊急救援用，非新 repo 的一部分）
2. 確認新的第一筆 commit 要包含哪些內容：目前 `git status` 顯示 5 個未追蹤的 day3 歸檔資料夾（`sdd/archive/2026-08-09-day3-text-diff/` 等），需要使用者確認是否一併納入
3. 刪除 GitHub 上的 `lushinshang/2026ironman` repo（`gh repo delete`，不可逆，會清空 Issues／Stars／Forks／Actions 執行紀錄／GitHub Pages 設定；此 repo 目前為個人專案，預期沒有他人 Star/Fork/Issue）
4. 重新建立同名公開 repo（`gh repo create lushinshang/2026ironman --public`）
5. 本地端 `rm -rf .git && git init`，設定 remote，將目前工作目錄狀態當成第一筆 commit，push 到新 repo
6. 重新啟用 GitHub Pages（現有設定為 `build_type: workflow`，來源 `.github/workflows/static.yml`，push 到 main 分支後由 GitHub Actions 自動部署，但新 repo 需要先在 Settings → Pages 手動選擇「GitHub Actions」為來源才會生效）
7. 驗證：`curl -sI` 確認幾個關鍵頁面（首頁、Day1、Day8）恢復 200

## 影響範圍

- **不可逆**：`gh repo delete` 一旦執行無法復原（GitHub 官方也未保證刪除後的寬限期）
- 舊 repo 的 45 筆 commit 歷史、所有 commit hash 全部消失；任何外部引用舊 commit URL 的連結會失效（目前沒有已知的外部引用）
- GitHub Pages 會有一段時間的服務中斷（刪除 repo 到新 repo 重新部署完成之間），預期數分鐘內恢復
- 逐日開發的 commit 時間戳記錄會消失，改成單一「初始化」commit——已與使用者確認這不影響鐵人賽參賽方式（寫完 30 天後才切換參賽並逐日分享，不依賴 git commit 日期作為進度證明）
- `.git` 歷史備份保留在專案目錄外的 `2026ironman_git_backup_20260812`，此備份**含真實案號**，不會被清除，僅供本機緊急還原用，不會再被 push 到任何地方
- 執行前會在真正跑 `gh repo delete` 那一步再次跟使用者做最終確認（即使本提案已核准）
