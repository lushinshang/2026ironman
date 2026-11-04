## 為什麼做

使用者希望能在對話中透過關鍵字「log」隨時觸發一個自動化機制，將當前 Session 中的所有對話（包含使用者輸入、AI 的思考過程 Thought、工具呼叫與回應、以及 AI 的最終回覆）進行完整去隱私化的整理，並寫入（或續寫）至專案的日誌檔案中。為避免單一檔案過大，且能區分同一天開啟的多個不同對話（session），紀錄將以「每日與 Session ID」為單位存成獨立檔案（例如 `logs/session_log_YYYY-MM-DD_shortID.md`）。這能幫助使用者隨時備份並追蹤 AI 的決策脈絡，同時嚴防隱私洩漏。

## 要改什麼

1. **設計 Log 產生腳本**：撰寫 `scripts/generate_log.py` 腳本，能自動讀取當前 Session 的 `transcript_full.jsonl`，解析對話鏈並進行去隱私化處理（過濾真實路徑中的敏感使用者名稱、Email、IP、Key 等資訊），然後將格式化後的對話與思考過程寫入對應日誌檔（如 `logs/session_log_YYYY-MM-DD_shortID.md`）。
2. **AI 協作規則宣告**：在 `readme.md` 的「AI 協作紀律」中加入「Log Trigger 條款」，指示後續接手的 AI 當偵測到使用者輸入含「log」時，必須優先執行 `scripts/generate_log.py`。

## 影響範圍

| 檔案 | 動作 | 說明 |
|------|------|------|
| `sdd/log-trigger/proposal.md` | 新增 | 提案規格書 |
| `sdd/log-trigger/tasks.md` | 新增 | 任務清單與驗收條件 |
| `readme.md` | 修改 | 在 AI 協作規範中新增 Log Trigger 觸發條款 |
| `scripts/generate_log.py` | 新增 | 對話紀錄解析、去隱私化與 Markdown 產生腳本 |
| `logs/session_log_YYYY-MM-DD_shortID.md` | 新增/修改 | 儲存去隱私化特定對話日誌的目標檔案 |
