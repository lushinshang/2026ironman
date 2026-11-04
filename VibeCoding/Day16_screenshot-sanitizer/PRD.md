# PRD 15 — Screenshot Privacy Sanitizer
- **英文短名稱**：`screenshot-sanitizer`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/screenshot-sanitizer/`

### 為什麼做
截圖寄給外部前，姓名、帳號、Email、IP、QR Code 等敏感資訊容易漏掉。

### MVP
- JPG/PNG/WebP 上傳。
- 剪貼簿貼圖。
- 框選多個遮蔽區域。
- 黑箱、Pixelate、Blur 至少支援兩種。
- Undo / Redo。
- 最終輸出 Rasterized 圖片。
- 清除 Metadata。
- Before / After。

### 驗收條件
- 情境：遮蔽必須寫入最終像素，不只是 UI Overlay。
- 情境：下載後重新開啟仍保持遮蔽。
- 情境：Undo 可取消上一個操作。
