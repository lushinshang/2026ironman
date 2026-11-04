# PRD 17 — 文件照片透視校正器
- **英文短名稱**：`document-perspective-corrector`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/document-perspective-corrector/`

### 為什麼做
手機斜拍公文、白板、表格、發票、證書時，透視變形會降低閱讀與後續 OCR 品質。

### MVP
- JPG/PNG/WebP 上傳。
- 四個可拖曳角點。
- Perspective Transform。
- 旋轉、裁切。
- 基本亮度、對比、灰階文件模式。
- Before / After。
- JPG / PNG 輸出。
- 可選單頁 PDF。

### 驗收條件
- 情境：四角調整後可把斜拍矩形校正成近似正面。
- 情境：原始圖片不被改動。
- 情境：校正結果可獨立下載。
