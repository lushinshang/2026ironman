# 提案：Day3 文字差異比對器

## 為什麼做

延續 Day2 的銜接情境——合約／公文改版比對。承辦人員拿到新舊兩版文件（常常是 Day2 工具從 PDF 轉出來的純文字），肉眼逐句比對容易漏看、看錯。`VibeCoding/Day3/PRD.md` 已定案，三個關鍵決策：內嵌 jsdiff 函式庫做逐句比對、輸入支援貼上文字＋拖曳 .txt/.md 檔案、並排左右對照顯示。本提案把 PRD 轉成可執行的任務清單。

技術可行性已先驗證過：用 `npm pack diff@5` 實際下載套件檢查，`dist/diff.js` 是標準瀏覽器 UMD bundle（約 53KB），直接用 `<script>` 標籤引入即可掛上 `global.Diff.diffArrays`，不像 Day2 的 pdf.js 需要處理 ESM-only 格式與 Worker 相容性問題，內嵌方式簡單許多。

## 要改什麼

- 新建 `VibeCoding/Day3/index.html`：單一 HTML 檔，內嵌 jsdiff 的 `dist/diff.js`
- 雙欄文字輸入區（舊版／新版），支援直接貼上，也支援拖曳單一 .txt/.md 檔案自動帶入內容
- 斷句邏輯：先依段落（換行）分塊，段落內再依中文句尾標點（。！？；）切句，做成獨立可測試的函式
- 呼叫 `diffArrays` 對兩份句子陣列比對，產生新增／刪除／修改（刪除＋新增視為配對修改）結果
- 並排左右顯示比對結果，新增／刪除／修改用不同底色標示並附圖例
- 連續 3 句以上未變動的區塊預設摺疊，可個別展開或一鍵全部展開／收合
- 頂部顯示差異統計摘要（新增／刪除／修改／未變動句數）
- 複製摘要、下載 Markdown 差異報告
- 更新 `VibeCoding/Day3/README.md` 開發日誌與進度勾選
- 新增 `VibeCoding/Day3/SECURITY_REVIEW.md`，比照 Day1／Day2 的方法論做資安檢測

## 影響範圍

- 新增檔案：`VibeCoding/Day3/index.html`、`VibeCoding/Day3/SECURITY_REVIEW.md`
- 更新檔案：`VibeCoding/Day3/README.md`（開發日誌、進度勾選）、`VibeCoding/README.md`（進度看板）
- 不影響 Day1、Day2 既有檔案與功能
- 唯一外部依賴：jsdiff（`diff@5` 的 `dist/diff.js`），內嵌後不觸發任何網路請求（純本機字串比對，無 fetch／XHR）
