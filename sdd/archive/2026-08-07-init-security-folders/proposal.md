## 為什麼做

使用者決定參加 2026 iThome 鐵人賽的「Security」組別，為了方便管理接下來連續 30 天的文章草稿、程式碼與實作紀錄，需要一次性初始化參賽專案的目錄結構。

## 要改什麼

1. **建立通用初始化腳本**：撰寫（或將既有腳本重構成）通用初始化腳本 `scripts/init_topic.py`，支援透過參數 `-t / --topic` 一鍵生成任意主題目錄及其下 `Day1` 至 `Day30` 子目錄。
2. **建立 Security 目錄結構**：使用該腳本建立 `Security/` 資料夾，並生成 30 天的 `DayX` 子資料夾。
3. **初始化每日範本**：自動在各 Day 目錄下生成帶有根目錄 AI 規範與隱私防護提醒連結的 `README.md` 文章草稿。

## 影響範圍

| 檔案 | 動作 | 說明 |
|------|------|------|
| `sdd/init-security-folders/proposal.md` | 新增 | 提案規格書 |
| `sdd/init-security-folders/tasks.md` | 新增 | 任務清單與驗收條件 |
| `scripts/init_topic.py` | 新增/修改 | 通用型主題目錄與範本初始化腳本 |
| `Security/` | 新增 | 參賽文章與程式碼主目錄 |
| `Security/Day1/` ~ `Security/Day30/` | 新增 | 30 天的每日獨立寫作與開發資料夾 |
