## 為什麼做

2026 iThome 鐵人賽 Vibe Coding 系列 Day2，選定 100 題清單第 4 題「PDF 轉 TXT」並擴充 Markdown 輸出。主情境是承辦人員收到 PDF 格式的合約／公文修訂版，無法直接複製貼上做比對；延伸情境是研究者用 AI 協助讀論文時，PDF 直接餵給 AI 會浪費 token、增加幻覺風險，需要先轉成乾淨文字。完整背景、情境與功能範圍已定案於 `VibeCoding/Day2/PRD.md`。Day2 產出的文字/MD 也是 Day3「文字差異比對器」的輸入來源，兩篇文章故事線互相銜接。

## 要改什麼

依 `PRD.md` 定案的功能（F1～F10）：

1. 建立 `Day2/index.html`：內嵌 pdf.js，支援 PDF 上傳／拖曳、文字擷取、TXT/Markdown 輸出切換、複製與下載。
2. 無文字層 PDF（掃描件）明確錯誤提示，不當機、不空白。
3. 浮水印過濾：偵測「同一字串於 ≥80% 頁面重複出現，且旋轉角度不為 0」的文字物件並排除。
4. 表格不重建結構，依 pdf.js 預設閱讀順序輸出，並在 UI 提示可能跑版。
5. 完成後執行資安源碼檢測（比照 Day1 `SECURITY_REVIEW.md` 的方法，因這次有內嵌第三方函式庫 pdf.js，需額外確認函式庫本身未挾帶對外請求）。

## 影響範圍

| 檔案 | 動作 | 說明 |
|------|------|------|
| `sdd/day2-pdf-to-md/proposal.md` | 新增 | 提案規格書 |
| `sdd/day2-pdf-to-md/tasks.md` | 新增 | 任務清單與驗收條件 |
| `VibeCoding/Day2/PRD.md` | 新增 | Day2 功能需求定案文件（已完成） |
| `VibeCoding/Day2/index.html` | 新增 | PDF 轉 TXT/MD 工具 |
| `VibeCoding/Day2/SECURITY_REVIEW.md` | 新增 | 資安源碼檢測報告 |
| `VibeCoding/Day2/README.md` | 修改 | 填入當日主題、開發日誌 |
| `VibeCoding/README.md` | 修改 | Dashboard 進度更新為已完成 |
