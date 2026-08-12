# 提案：Day4 單一 HTML 離線下載

## 為什麼做

使用者要求 Day4 比照 Day1～Day3，支援「下載本工具（離線使用）」——把整份工具複製成一個沒有外部連結、可以直接雙擊在瀏覽器開啟的獨立 HTML 檔案，且下載出來的檔案要能繼續拖曳 .txt/.md 檔案進去使用。

Day3 曾經在同一功能上出過兩輪狀況，這次要一次到位吸收兩個教訓：
1. **命名衝突**：Day3 第一輪實作時發現既有的「下載差異報告 HTML」按鈕跟新的「下載本工具」按鈕差點共用 id，Day4 目前已有 `btn-download-masked`（下載處理後 .txt），新按鈕需確認不會撞名。
2. **下載複本裡不該再有下載按鈕本身**：Day3 上線後使用者回饋，下載出來的離線版打開後，畫面上還留著「下載本工具」按鈕，點下去只會再下載一份一模一樣的檔案——當時是事後才補修的 bugfix。Day4 這次在 `buildCleanHtmlCopy()` 一開始寫的時候就要把這顆按鈕自己從複製出的 DOM 移除，不等上線後才被回報。

## 要改什麼

- `Day4/index.html`：
  - 新增 `buildCleanHtmlCopy()` 函式：複製 `document.documentElement`，移除 `.nav-back`（離線版不需要、也不該有連回首頁的外部連結）、移除下載按鈕本身（`#btn-download-tool`，吸收 Day3 教訓）、清空 `#text-input`／`#sensitive-input`／`#substitute-input` 的值（含 `.value` 與 `.textContent` 雙重清空）、確保 `#result-section` 維持 `hidden`、reset toast
  - 新增按鈕「下載本工具（離線使用）」，id 定為 `btn-download-tool`（跟既有 `btn-download-masked` 不同 id，避免撞名），放在 `btn-detect` 旁邊的常駐可見區塊
  - 確認下載出的複本裡，拖曳 .txt/.md 檔案到 `#col-text` 的功能依然正常（同一份 JS 邏輯會被完整複製，理論上自動可用，但要實測驗證，不能只憑推論）
- 更新 `Day4/README.md`、`Day4/SECURITY_REVIEW.md`（新增這個功能的源碼檢測）

## 影響範圍

- 只新增/修改 `Day4/index.html` 的下載相關邏輯，不動個資偵測、機敏字庫等既有功能
- 不影響 Day1、Day2、Day3
- 無新增外部依賴
