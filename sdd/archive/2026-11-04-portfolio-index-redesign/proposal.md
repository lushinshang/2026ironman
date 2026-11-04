# 提案：VibeCoding 作品集入口頁 `index.html` 視覺與互動重製

類型：重構（只動單一檔案的呈現層）

## 為什麼做

現況（唯讀盤點 `VibeCoding/index.html`，362 行、11,944 bytes、sha256 `f09d9976…01a1`，工作區與 HEAD 一致）：

- 28 張卡片是同一個樣板的 2 欄方格，無層級、無視覺重點；沒有分群（Level 1a–1e／Actions／Office），讀者看不出系列的技術遞進。
- 純 CSS、零 JS：無進場／hover 以外的動態、無篩選搜尋、無深色模式（只有淺色 token）。
- 無障礙缺口：沒有 skip link、沒有 `:focus-visible` 樣式、沒有 `<meta name="description">`／Open Graph／favicon。
- 內容過期：Day29 卡片寫「每 6 小時巡一次」，但 `.github/workflows/day29-radar.yml:7` 的 cron 是 `23 * * * *`（每小時）；導言寫「零依賴、單檔 HTML 的**文字處理**小工具」，實際已含 CSV、圖片、PDF、Office、Actions。
- 使用者要求把品質標準提高到 awwwards／Webby／FWA 的水準，並以自我檢查反覆提升。

**誠實界線**：這三個獎項都是評審主觀評分，沒有可執行的「達標測試」，我無法保證或自行認證得獎等級。本案把「達標」拆成可實跑的代理指標（見驗收條件）加上自評評分表；通過代理指標 ≠ 得獎，最後的美感判斷在使用者。

## 要改什麼

只改 `VibeCoding/index.html`（仍是單一檔案、零外部請求、`file://` 與 http 皆可用）：

1. **備份**：改動前把舊版複製到 `sdd/portfolio-index-redesign/backup/index.html`，記錄 sha256 並與 git HEAD 版本 `cmp` 比對。（歸檔時會隨案移入 `sdd/archive/`。）
2. **版面**：Hero 區（系列主張「想 → 說 → 對 → 做」做成視覺焦點）→ 依 Level 分群的作品區 → 方法論／進度區 → 頁尾；28 張卡片的 href 與順序不變。
3. **視覺系統**：CSS 變數 token（亮／暗兩套，跟隨 `prefers-color-scheme`，另提供手動切換）、系統字型堆疊（**不引入網路字型**，維持離線）、層次分明的字級與間距。
4. **動態與互動**：進場與捲動揭露、卡片 hover／focus 動態、依 Level 篩選與關鍵字搜尋；全部尊重 `prefers-reduced-motion`；**無 JS 時 28 張卡片仍完整顯示可點**（漸進增強）。
5. **無障礙與 SEO**：skip link、`:focus-visible`、語意地標、對比 ≥ WCAG AA、meta description／OG／內嵌 SVG favicon。
6. **內容校正（僅事實錯誤）**：Day29 改「每小時」、導言「文字處理小工具」改為涵蓋實況的說法。其餘卡片文案不動。

**不做**：不改 28 個工具本身、不改任何卡片的 href、不引入框架／CDN／網路字型／圖片資產、不動根目錄 `index.html`。

## 影響範圍

(a) 不會弄壞別處，靠的是：`VibeCoding/index.html` 只被根目錄 `index.html:318` 以 `<a href="VibeCoding/index.html">` 連結，且各工具頁不引用它（指到檔案:行號，另以 `grep -rIn 'VibeCoding/index.html'` 在 repo 內只命中根 `index.html` 與 `PROGRESS.md` 的敘述文字）。28 個工具以相對路徑從這頁被連出，反向無依賴。驗證級別：**grep 級（推論加指行號）**；改動後以腳本比對 28 條 href 與備份逐一相同、目標檔案皆存在，列入驗收條件。

(b) grep 看不到的地方：
- 部署：`.github/workflows/static.yml` 以 `path: '.'` 上傳整個 repo，沒有對 `index.html` 做建置步驟，不受影響。
- 先前 `PROGRESS.md` 記錄過該頁「24 次點擊測試（HTTP 12＋`file://` 12）、外部請求 0」，本案沿用同一標準，改動後要重跑。
- Playwright MCP 不能開 `file://`（見 `PROGRESS.md` 第 7 節），`file://` 驗證改用本機 Python `playwright`；本機已確認可 import，Lighthouse／axe **未安裝**，能否取得（`npx` 可用但需下載）列為任務 2 的先決檢查，取不到就用自寫檢查替代並在報告標註「未驗證」。
- 公開 repo：改動會 push 到 GitHub Pages，上傳前依 `readme.md` 第 5 條與常設授權確認；頁面內不得出現真實路徑、案號、帳號以外的個資。

## 修訂紀錄

- 2026-11-04（任務 2 基準測量時）：原文「30 張卡片／30 個工具」有誤，實測頁面為 **28 張**（Day06、Day12 分別併入 Day05–06、Day11–12 同一張卡片）。已全文更正為 28；方向與範圍不變。
