## 任務清單

- [x] 1. 設計並撰寫通用型腳本 `scripts/init_topic.py`，使其能接收 `-t` 或 `--topic` 參數，並動態產生對應主題的 `Day1` 至 `Day30` 目錄。
- [x] 2. 實作在產出的每日 `README.md` 模板頂部，動態生成正確相對路徑的極簡 AI 注意事項與根目錄 `readme.md` 規範之連結。
- [x] 3. 執行該腳本初始化 Security 目錄結構：`python3 scripts/init_topic.py -t Security`。
- [x] 4. 進行驗收檢查，確認 `Security/` 目錄、30 個 Day 子目錄與 README.md 模板檔案皆已正確建立且內容包含警告連結。

## 驗收條件

- 情境：當腳本執行後，系統會自動在 `/Users/lanss/projects/2_Practice/tools/2026ironman/Security/` 下建立 `Day1` 到 `Day30` 共 30 個資料夾。
- 情境：每個 `Security/DayX/README.md` 內都含有以當前主題 Security 命名的草稿模板，且頂部有指向根目錄 `readme.md` 的隱私防護超連結。
