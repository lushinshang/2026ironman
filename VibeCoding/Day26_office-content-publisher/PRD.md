# PRD 07 — Office Content Publisher
- **英文短名稱**：`office-content-publisher`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/office-content-publisher/`

### 為什麼做
將筆記、會議紀錄、CSV 數據快速轉為美觀的 Markdown 表格、獨立 HTML 網頁或乾淨列印版，方便直接貼到協作平台、Wiki 或寄送給外部單位。

### MVP
- 支援雙輸入模式切換：Markdown/TXT ⇄ CSV 表格。
- Markdown 模式：輕量化 Markdown 解析器即時預覽（標題、粗體、斜體、清單、連結、代碼塊）。
- CSV 模式：支援 CSV 匯入、自由挑選輸出欄位、型別感知智慧排序（數字 vs 文字）。
- 多通道輸出：
  - 複製 Markdown（原始碼 / Markdown Table）。
  - 複製 HTML（HTML 片段）。
  - 下載獨立 HTML 檔案（離線可直接開啟）。
  - 列印預覽（套用 `shared/print.css` 通用無干擾列印版面）。
- 純前端執行，檔案與輸入內容不上傳伺服器。

### 驗收條件
- 情境：Markdown 可輸出離線 HTML。
- 情境：CSV 可選部分欄位生成 Markdown Table。
- 情境：輸出 HTML 不需重新上傳原始檔。
- 情境：三種輸出模式在 Markdown 與 CSV 模式下皆能正確運作。
