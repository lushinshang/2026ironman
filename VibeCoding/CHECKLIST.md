> [!IMPORTANT]
> 🤖 **給協作 AI 的寫作與開發規範：**
> 本檔案及本專案之寫作與 Debug 歷程，皆受根目錄 [README](../readme.md) 之 AI 協作規範與「隱私安全防護（嚴禁留下真實姓名、Email、IP 與真實使用者路徑）」約束。請勿刪除已有的開發日誌，並請在使用者提及 `log` 時主動執行 `generate_log.py`。

# Day2~30 共用工作檢查清單

> 依 Day1（字數與段落統計器）的實作與發文經驗整理，Day2 開始每天照這份清單走，不用重新回想踩過的東西。詳細歷程見 `Day1/README.md`、`Day1/article_draft.md`。

---

## 開發流程（SDD 三階段，規模比 Day1 壓縮）

- [ ] 寫精簡版 PRD（背景痛點、MVP 功能表、驗收標準、Out of Scope），不用每天都寫到 Day1 那麼細
- [ ] 單頁小工具**不需要**獨立 UI 設計文件；PRD 文字描述版面 + `proposal.md` 塞一份 ASCII wireframe 草圖即可
- [ ] `sdd/dayN-<短名稱>/proposal.md` ＋ `tasks.md`，貼重點給使用者確認「開始實作」後才動手寫程式
- [ ] 全部任務打勾後，派一個不知道實作細節的 fresh agent 重新驗收（工具太簡單、風險低時可視情況簡化，不必每天硬做）
- [ ] 完成後移到 `sdd/archive/<日期>-dayN-<短名稱>/`

## 驗證習慣（不接受「應該沒問題」）

- [ ] 有互動邏輯（表單、按鈕、警示、匯出）一律用 Playwright 實際操作一次，讀真實 DOM 狀態或攔截下載內容比對，不是憑程式碼看起來對就結案
- [ ] 邊界情況要測：空輸入／全空白／極端值，確認不出現 `NaN` 或例外
- [ ] `python3 -m html.parser <file>.html` 做語法驗證，零成本不能省
- [ ] 資安快速檢查：全篇讀一次，確認無 `innerHTML`、無對外請求、匯出內容不含使用者原始輸入（除非工具本來就需要）

## 已知環境陷阱（不用重踩）

- [ ] Playwright MCP 擋 `file://` 協定：測「雙擊開啟」情境要先 `python3 -m http.server` 起本機伺服器跑自動化，另外用 `open` 指令補測真正的 `file://`
- [ ] 提到「log」關鍵字時，`scripts/generate_log.py` 在 Claude Code 環境不相容（會報 `Transcript file not found`），直接改用同款 header/body 格式手動整理進 `logs/`，不要略過也不要假裝腳本成功（見 `ops/LESSONS.md` 2026-08-08 條目）

## 文章產出（deep-guide 風格 + 固定六節）

- [ ] 固定結構：情境 → 解題思路 → 資源 → Vibe 過程 → 產品 → 心得與反思
- [ ] 開場避免「你是否曾經…」句型，換場景/數字落差/反直覺結論等變體
- [ ] 至少 1～2 張 **Mermaid 圖**（流程或判斷邏輯），配色呼應文章底色，`mermaid_check.py` 驗證過再貼進文章
- [ ] 至少 1 組 **Playwright 實際操作截圖**（要有示範資料、能看出效果，不要空白初始狀態）
- [ ] 附 **GitHub Pages 連結**，先 `curl -sI` 實測 200 才放進文章
- [ ] 排版參考 `awesome-design-md` 風格：badge 列、目錄錨點、`👉` 引導符號，走「功能性 Markdown」不做過度裝飾

## 專案結構收尾

- [ ] `VibeCoding/index.html` 題目清單連到 `DayN/index.html`，`DayN/index.html` 加返回連結；雙向都要用瀏覽器實際點擊測試，不只是加 `<a>` 標籤
- [ ] commit 前 `git status` 檢查，排除 `.playwright-mcp/`（已進 `.gitignore`）與臨時截圖等驗證產物
- [ ] 完成後照規矩問使用者要不要一起清掉暫存檔、要不要歸檔、要不要 commit/push
