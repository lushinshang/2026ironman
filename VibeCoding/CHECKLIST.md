> [!IMPORTANT]
> 🤖 **給協作 AI 的寫作與開發規範：**
> 本檔案及本專案之寫作與 Debug 歷程，皆受根目錄 [readme.md](../readme.md) 之 AI 協作規範與「隱私安全防護（嚴禁留下真實姓名、Email、IP 與真實使用者路徑）」約束。請勿刪除已有的開發日誌。

# 每日工作檢查清單（v2）

> 依 v1（`old/`）九題的實作與發文經驗整理。v2 每一題照這份走，不用重新回想踩過的東西。
> 與 v1 版的差異列在最後一節。

---

## 一、提案階段

- [ ] 讀 `2026-ironman-vibecoding-30-prd.md` 對應那一題的 PRD（為什麼做 / MVP / 不做 / 驗收條件）
- [ ] 建 `sdd/<short-name>/proposal.md`：為什麼做、要改什麼、影響範圍（新增檔案 / 修改檔案 / Library）
- [ ] `proposal.md` 塞一份 ASCII wireframe 版面草圖（單頁小工具**不需要**獨立 UI 設計文件）
- [ ] 建 `sdd/<short-name>/tasks.md`：每條 1 小時內可完成，整份**不超過 10 條**，超過先拆需求
- [ ] `tasks.md` 末尾寫驗收條件，格式為「情境：……」，直接抄 PRD 的驗收條件再視情況補充
- [ ] 貼重點給使用者，**停止**。沒收到「開始實作」不寫任何程式

## 二、實作階段

- [ ] 由上到下，**一次只完成一條 task**，完成後回報再打勾
- [ ] 不自行增加 PRD 沒寫的功能，不過度設計
- [ ] 原始檔不覆寫，一律產生新檔供下載
- [ ] 能在瀏覽器本機完成就不上傳資料
- [ ] 涉及 AI 時，介面必須明確告知資料會送往 Cloudflare AI 服務
- [ ] 規格不明、或做到一半發現方向有誤 → **停止實作並回報**，不要硬猜

### 外部 library 的處理

- [ ] 固定版本，不用 CDN
- [ ] 用 `scripts/bundle.py` 內嵌成單檔 HTML（由前置工程 `sdd/shared-infra/` 建立，見 `shared/CONTRACT.md` 第 7 節）
- [ ] 在 `PRD.md` 記下 library 名稱、版本、授權條款
- [ ] 驗證「下載 HTML 後斷網仍可用」——這是 Level 1 所有題目的硬性驗收條件

## 三、驗證習慣（不接受「應該沒問題」）

- [ ] 有互動邏輯（表單、按鈕、警示、匯出）一律用 Playwright **實際操作一次**，讀真實 DOM 或攔截下載內容比對，不是程式碼看起來對就結案
- [ ] 邊界情況必測：空輸入／全空白／極端值／格式錯誤的檔案，確認不出現 `NaN`、不整頁崩潰
- [ ] HTML 語法驗證（零成本不能省）
- [ ] 資安快速檢查：全篇讀一次，確認無 `innerHTML` 注入點、無對外請求、匯出內容不含非預期的使用者原始輸入
- [ ] 全部 task 打勾後，派一個**不知道實作細節的 fresh agent** 重新驗收——只給它 PRD + 驗收條件 + 檔案路徑，不給實作過程敘述
  - 工具極簡、風險低時可簡化，但要在回報中說明簡化理由

## 四、已知環境陷阱（不用重踩）

- [ ] **Playwright MCP 擋 `file://` 協定**：測「雙擊開啟」情境要先 `python3 -m http.server` 起本機伺服器跑自動化，`file://` 專屬的驗收條件另外用本機 Python `playwright` 套件補測
- [ ] **多個 agent 併行時，不要共用 Playwright MCP 瀏覽器**：MCP 的瀏覽器是共用實例，兩個 agent 同時操作會互相切換頁籤、互相干擾，測出來的 DOM 狀態不可信（2026-08-23 實測遇到）。併行情境一律改用本機 Python `playwright` 套件開獨立實例
- [ ] **`browser_evaluate` 對 `fetch(blob:URL)` 會卡死**：要取匯出內容改用同步手法（攔截 `window.Blob` constructor 直接抓字串），不要用 `fetch()`
- [ ] **`scripts/generate_log.py` 在 Claude Code 環境不相容**（只支援 antigravity-cli/Gemini 逐字稿格式，會報 `Transcript file not found`）。使用者提到 `log` 時，改用相同 header/body 格式**手動整理**進 `DayNN_<short-name>/logs/`，檔頭註明「非腳本自動產出、環境不相容」。不要略過，也不要假裝腳本成功
- [ ] **多階段文字轉換的比對範圍**：每個 stage 都要在**完整、未被前一 stage 切碎的文字**上重新掃描；用獨立的字元標籤陣列記錄「哪個字被哪一關改過」，標籤只影響渲染，不影響比對範圍（v1 Day3 踩過，見 `ops/LESSONS.md` 2026-08-13）
- [ ] **pdf.js 在 `file://` 下的 Worker 問題**：ES Module Worker 需經 Blob URL 處理才能在 `file://` 協定運作（v1 Day6 已解，可直接抄）

## 五、文章產出

### 固定六節結構

情境 → 解題思路 → 資源 → Vibe 過程 → 產品 → 心得與反思

- [ ] 開場**避免**「你是否曾經…」句型，換成場景描述、數字落差、或反直覺結論
- [ ] 「Vibe 過程」要寫真實的對齊落差：這次是哪一層沒對齊？怎麼發現的？
- [ ] 「心得與反思」回扣四層對齊框架（想↔表達 / 表達↔AI 理解 / AI 規劃↔腦中藍圖 / 規格↔實際產品）
- [ ] 至少 1～2 張 **Mermaid 圖**（流程或判斷邏輯），配色呼應文章底色，`mermaid_check.py` 驗過再貼
- [ ] 至少 1 組 **Playwright 實際操作截圖**：要有示範資料、看得出效果，不要空白初始狀態
- [ ] 附 **GitHub Pages 連結**，`curl -sI` 實測回 `HTTP/2 200` **之後**才寫進文章
- [ ] 排版走「功能性 Markdown」：badge 列、目錄錨點、`👉` 引導符號，不做過度裝飾
- [ ] 交給 `editor-in-chief` skill 做總編審查（去 AI 味、驗視覺證據、檢查連結）

### 誠實原則（v1 踩過的線）

- [ ] 連結沒驗證過就**留白**，不要先寫上去再補驗證
- [ ] 交給 `editor-in-chief` 時，陳述的已驗證項目必須是**真的已經驗證過**
- [ ] 測試失敗就說失敗；跳過的步驟明說；沒驗證的部分標註「未驗證」

### 補回題目的額外規矩

Day03 `filler-word-checker`、Day07 `text-diff` 沿用 v1 的**演算法與踩坑經驗**，但：

- [ ] 文章**完全重寫**，依 v2 當下的實作狀況寫，不複製 `old/` 的草稿
- [ ] 若這次沒踩到 v1 那個坑（因為已經知道解法），就誠實寫「這題我直接跳過了某個坑，因為 v1 踩過」，不要假裝重新發現一次

## 六、收尾

- [ ] `VibeCoding/index.html` 作品集清單連到 `DayNN_<short-name>/index.html`，工具頁加返回連結；**雙向都用瀏覽器實際點擊測試**，不只是加 `<a>` 標籤
- [ ] 更新 `README.md` 進度表：該題的「開發」「撰文」欄位，以及最上方的總覽數字與 badge
- [ ] 真正的踩坑（>15 分鐘或 2 次重試才解決）寫進 `ops/LESSONS.md`
- [ ] `sdd/<short-name>/` 移到 `sdd/archive/YYYY-MM-DD-<short-name>/`
- [ ] commit 前 `git status` 檢查，排除 `.playwright-mcp/`（已在 `.gitignore`）與臨時驗證產物
- [ ] 問使用者要不要清暫存檔、要不要 commit/push（**push 前必須取得明確同意**）
- [ ] push 後回報檔案名稱與 GitHub Pages 網址

---

## 附錄：與 v1 CHECKLIST 的差異

| 項目 | v1 | v2 |
|---|---|---|
| SDD 路徑 | `sdd/dayN-<短名稱>/` | `sdd/<short-name>/`（PRD v2.0 規定） |
| 資料夾 | `DayN/` | `DayNN_<short-name>/` |
| PRD 來源 | 每天現寫 | `2026-ironman-vibecoding-30-prd.md` 已有需求基線，提案時展開 |
| library 內嵌 | 每題各自處理 | 統一走 `scripts/bundle.py` |
| 文章「心得」 | 自由發揮 | 必須回扣四層對齊框架 |
| 誠實原則 | 隱含 | 獨立成節（v1 有過「連結先寫後驗」的落差） |
