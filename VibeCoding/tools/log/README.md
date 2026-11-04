# 📚 Vibe Coding 歷史研發與交鋒日誌庫（Log Archive）

本目錄收錄 **Vibe Coding 31 款純前端離線工具** 在歷次迭代、架構重構與資安攻防驗收中，所沉澱下來的 **47 份真實研發日誌（Session Logs）**。

依據 **PERSONA 2.4「真實筆觸引擎」** 與 **「Prompt 敘事價值閘門」** 律法，這些日誌是撰寫 2026 iThome 鐵人賽故事連載時的**最真實思維彈藥庫**：
- **還原動念**：還原當初面對需求時，人類掌舵者的第一手思考與邊界設定。
- **還原人機對撞**：記錄當初下的原始 Prompt、AI 踩到的致命地雷（如 `</script>` 截斷、`#__shared_toast` 靜態外洩、正則誤殺註解）。
- **還原工程驗收**：記錄實體 `curl`、二進位檔頭檢查、DOM 清理與 Playwright 截圖的真實驗證手感。

---

## 📑 日誌索引目錄

### 1. ✍️ 第一階段：純文字與基礎設施（Day 01 - Day 07）
- [`Day01_text-health-check_session_log_2026-08-23_text-health-check.md`](Day01_text-health-check_session_log_2026-08-23_text-health-check.md)：共用層獨立驗收、`#__shared_toast` 離線洩漏返工、`</script>` 解析器截斷地雷。
- [`Day02_ai-text-cleaner_session_log_2026-08-23_ai-text-cleaner.md`](Day02_ai-text-cleaner_session_log_2026-08-23_ai-text-cleaner.md)：正則剝離 Markdown 標記、程式碼區塊保留邊界。
- [`Day03_filler-word-checker_session_log_2026-08-23_filler-word-checker.md`](Day03_filler-word-checker_session_log_2026-08-23_filler-word-checker.md)：繁體中文贅詞庫、AI 腔特徵庫偵測。
- [`Day04_zh-tw-localizer_session_log_2026-08-23_zh-tw-localizer.md`](Day04_zh-tw-localizer_session_log_2026-08-23_zh-tw-localizer.md)：內嵌 OpenCC 字典與多階段詞彙替換審查。
- [`Day05_reversible-deidentifier_session_log_2026-08-23_reversible-deidentifier.md`](Day05_reversible-deidentifier_session_log_2026-08-23_reversible-deidentifier.md)：可逆式 Token 替換、對照表匯出與雙向還原。
- [`Day07_text-diff_session_log_2026-08-23_text-diff.md`](Day07_text-diff_session_log_2026-08-23_text-diff.md)：內嵌 jsdiff 引擎、中文斷句優化與雙欄比對。

### 2. 📊 第二階段：表格攻防戰（Day 08 - Day 13）
- [`Day08_csv-doctor_session_log_2026-08-23_csv-doctor.md`](Day08_csv-doctor_session_log_2026-08-23_csv-doctor.md)：Big5 / UTF-8 編碼修復、防禦試算表公式注入（Formula Injection）。
- [`Day09_csv-period-diff_session_log_2026-08-23_csv-period-diff.md`](Day09_csv-period-diff_session_log_2026-08-23_csv-period-diff.md)：兩期清冊唯一主鍵對照、數值異動報告。
- [`Day10_csv-batch-splitter_session_log_2026-08-23_csv-batch-splitter.md`](Day10_csv-batch-splitter_session_log_2026-08-23_csv-batch-splitter.md)：大總表分類拆檔、fflate 瀏覽器端即時打包 ZIP。
- [`Day11_csv-pivot-dashboard_session_log_2026-08-24_day11.md`](Day11_csv-pivot-dashboard_session_log_2026-08-24_day11.md)：手寫 SVG 圖表渲染、多欄 Group By 與樞紐彙總。
- [`Day11_csv-pivot-dashboard_session_log_2026-08-24_day12.md`](Day11_csv-pivot-dashboard_session_log_2026-08-24_day12.md)：圖表效能調校與邊界優化。
- [`Day11_csv-pivot-dashboard_perf.md`](Day11_csv-pivot-dashboard_perf.md)：樞紐圖表效能基準測試。
- [`Day13_csv-one-page-report_session_log_2026-08-24_day13.md`](Day13_csv-one-page-report_session_log_2026-08-24_day13.md)：A4 直橫自適應排版、單頁摘要報表。

### 3. 🖼️ 第三階段：影像處理與鑑識（Day 14 - Day 18）
- [`Day14_image-batch-optimizer_log_day14.md`](Day14_image-batch-optimizer_log_day14.md)：二分逼近純前端壓縮、批次尺寸調整。
- [`Day15_exif-privacy-cleaner_log_day15.md`](Day15_exif-privacy-cleaner_log_day15.md)：二進位解析 JPEG/TIFF、抹除 GPS 經緯度與相機中繼資料。
- [`Day16_screenshot-sanitizer_log_day16.md`](Day16_screenshot-sanitizer_log_day16.md)：杜絕前端 CSS 假遮蔽、像素級燒結（Rasterize）。
- [`Day17_document-perspective-corrector_log_day17.md`](Day17_document-perspective-corrector_log_day17.md)：四點錨點單應性矩陣（Homography Matrix）透視拉直。
- [`Day18_photo-evidence-sheet_log_day18.md`](Day18_photo-evidence-sheet_log_day18.md)：2x2/2x3 工作照片成果清冊、A4 浮水印列印輸出。

### 4. 📑 第四階段：PDF 專業工具集（Day 19 - Day 25）
- [`Day19_pdf-to-jpg_log_day19.md`](Day19_pdf-to-jpg_log_day19.md)：pdf.js 逐頁解碼高解析渲染、批次打 ZIP。
- [`Day20_pdf-text-search_log_day20.md`](Day20_pdf-text-search_log_day20.md)：深入 PDF 文字層、全文正則即時檢索與結構分析。
- [`Day21_pdf-organizer_log_day21.md`](Day21_pdf-organizer_log_day21.md)：卡片視覺化拖曳旋轉、抽換與重新分割。
- [`Day22_pdf-review-stamper_log_day22.md`](Day22_pdf-review-stamper_log_day22.md)：內嵌思源黑體、審查章與騎縫浮水印。
- [`Day23_pdf-password-manager_log_day23.md`](Day23_pdf-password-manager_log_day23.md)：User/Owner 密碼管理、解除限制與再加密。
- [`Day24_pdf-secure-redactor_log_day24.md`](Day24_pdf-secure-redactor_log_day24.md)：物理移除文字流物件、杜絕反白選取洩密。
- [`Day25_pdf-delivery-cleaner_log_day25.md`](Day25_pdf-delivery-cleaner_log_day25.md)：剝離歷史註解、表單暫存與作者資訊。

### 5. 📦 第五階段：內容發布與終極審查（Day 26 - Day 30）
- [`Day26_office-content-publisher_log_day26.md`](Day26_office-content-publisher_log_day26.md)：Markdown/CSV 富文字轉排版輸出。
- [`Day30_ooxml-privacy-cleaner_1150904_review.md`](Day30_ooxml-privacy-cleaner_1150904_review.md)：雙重理事會（Codex + Claude）黑箱安全深度審查報告，揭露 OOXML 隱私盲區與修復全歷程。

### 6. 🕰️ 早期原型探索（old/ 歷史歸檔）
- 收錄 `old_Day1` ~ `old_Day9` 等 19 份早期開發的思考原稿與重構日誌。
