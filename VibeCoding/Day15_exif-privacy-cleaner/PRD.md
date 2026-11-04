# PRD 14 — EXIF 隱私檢查與清除
- **英文短名稱**：`exif-privacy-cleaner`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/exif-privacy-cleaner/`

### 為什麼做
照片可能帶有拍攝時間、裝置型號、GPS 等 Metadata，對外分享前常被忽略。

### MVP
- 讀取可支援的 EXIF/XMP。
- 顯示拍攝日期、裝置、GPS 等資訊。
- 敏感 Metadata 風險提示。
- 使用者勾選清除項目。
- 重新輸出圖片。
- 批次處理。
- 顯示清除前後差異。

### 驗收條件
- 情境：含 GPS 的圖片能提示風險。
- 情境：清除後重新讀取時已選欄位不再存在。
- 情境：沒有 EXIF 的圖片不應報錯。

### 內嵌第三方資源
- fflate 0.8.3 (MIT)
