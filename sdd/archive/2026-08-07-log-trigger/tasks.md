## 任務清單

- [x] 1. 新建 `scripts/generate_log.py` 骨架，確認能讀取當前 Session 的 `transcript_full.jsonl` 檔案。
- [x] 2. 實作對 JSONL 的解析邏輯，正確提取出每一輪對話的 User Input、AI Thought（思考過程）、Tool Calls & Results 及 Model Response。
- [x] 3. 實作去隱私化過濾器，自動遮蔽路徑中的帳戶名、IP、Email、密鑰等敏感資訊。
- [x] 4. 實作 Markdown 格式化，將內容寫入 `logs/session_log_YYYY-MM-DD_shortID.md`（以當前日期與 Session ID 前八碼命名，並確保建立 `logs/` 目錄），若已存在則進行續寫，並附加更新時間。
- [x] 5. 修改 `readme.md`，在 AI 協作規範中新增「Log Trigger 機制」指引，指示 AI 只要遇到使用者輸入含有關鍵字「log」，就必須執行該腳本。
- [x] 6. 進行功能測試，確認講到「log」時能正確產生或更新對應的對話日誌且內容去識別化。

## 驗收條件

- 情境：當使用者訊息中提及「log」（不限大小寫）時，系統會自動在 `/Users/lanss/projects/2_Practice/tools/2026ironman/logs/session_log_YYYY-MM-DD_shortID.md` 寫入或續寫此對話 Session 至目前為止的所有對話與 AI 思考過程。
- 情境：產出的日誌檔中不得包含任何真實敏感隱私資訊（如 `/Users/lanss/` 後方的實際使用者名稱需被替換，或 Email/IP 被遮蔽）。
