> [!IMPORTANT]
> 🤖 **給協作 AI 的寫作與開發規範：**
> 本檔案及本專案之寫作與 Debug 歷程，皆受根目錄 [README](../../readme.md) 之 AI 協作規範與「隱私安全防護（嚴禁留下真實姓名、Email、IP 與真實使用者路徑）」約束。請勿刪除已有的開發日誌，並請在使用者提及 `log` 時主動執行 `generate_log.py`。

# 2026 iThome 鐵人賽 - Vibe Coding 系列 (Day 1)

## 📝 1. 當日主題
* **本日文章主題**：字數與段落統計器 —— 用純前端 HTML 解決「投稿超字數被退件」的痛點
* **核心技術概念**：CJK Unicode 字元判定、原生 JS debounce 即時統計、Blob + `<a download>` 觸發本機下載、SDD 三階段流程（PRD → proposal/tasks → 實作 → 獨立驗收）、零依賴單檔 HTML 的資安檢測方法

* **文章標題結構規範**：正文依固定六段式撰寫，順序為「情境 → 解題思路 → 資源 → Vibe 過程 → 產品 → 心得與反思」，寫作細節見 `../CHECKLIST.md`「文章產出」一節。

---

## 📈 2. 開發與寫作進度
* [x] 本日程式碼實作與除錯已完成
* [x] 本日文章草稿已潤飾完畢（`editor-in-chief` 總編審查：語言已自然、視覺實證與連結皆已驗證，僅微調一處大綱骨架外露的段落）
* [ ] 執行並更新本 Session 的 `log` 歷程以備存

---

## 🧠 3. AI 思考與自言自語紀錄 (Vibe Coding 日誌)
> [!NOTE]
> *此區塊保留給協作 AI。當天跟 AI 共同探索、踩坑、或 Debug 的思維歷程可記錄於此，作為技術文章最重要的靈魂內容。*

### 本日 Debug 與架構思考歷程：
1. **遇到的問題**：
   * PRD 定案後，工具要不要另外開一份正式 UI 設計文件？如果照 SDLC 教科書流程直接開一份設計文件，對單日交付的鐵人賽任務會不會太重？
   * 統計邏輯完成後，「這樣寫應該是對的」能不能算完成？尤其中英文混排、全形標點、空白換行的邊界情況很容易憑直覺誤判。
   * Playwright MCP 預設擋掉 `file://` 協定，沒辦法直接開單機 HTML 檔測試。
2. **AI 的思考與解決路徑**：
   * UI 設計文件：判斷這是單頁小工具（textarea + 統計卡片 + 幾顆按鈕），PRD 第 7 節文字描述的版面資訊量已經足夠，開獨立設計文件是過度工程；改成在 `proposal.md` 裡塞一份 ASCII wireframe 草圖，桌面/手機各畫一版，低成本先把版面定案。
   * 統計邏輯驗證：不接受「應該沒問題」的自我推論，改用 Playwright `browser_evaluate` 直接對 DOM 灌入一段人工核算過的中英文混排文字，逐項比對中文字數／英文字數／總字數／段落數／標點符號數是否與手算結果一致；同時測全空白／全換行輸入，確認不會出現 `NaN`。
   * `file://` 被擋：先用 `python3 -m http.server` 起本機伺服器讓 Playwright 用 `http://127.0.0.1` 做完整自動化測試（含即時統計、超標紅字、複製摘要、匯出 Markdown/CSV 的 Blob 內容比對），最後再用系統 `open` 指令實際以 `file://` 雙擊開啟驗證「不依賴伺服器」這條驗收條件。
3. **最終解法與結論**：
   * 依 SDD 流程跑完 PRD → `sdd/archive/2026-08-08-day1-word-counter/proposal.md`＋`tasks.md`（8 條任務，⚠️ 2026-08-08 事後盤點發現原始檔案未存，已回溯重建）→ 逐條實作並用 Playwright 真實操作驗證（不自驗）→ 派 fresh agent 獨立驗收 7 條驗收條件，全數通過。
   * 額外執行資安源碼檢測（見 `SECURITY_REVIEW.md`）：因為畫面更新全程只用 `.textContent`、匯出檔案不寫入使用者原始文字、無任何外部網路請求，未發現 XSS、CSV 注入或資料外洩等高信心漏洞。

---

## 💻 4. 本日程式實作片段
```javascript
// 中英文混排字數統計核心邏輯（Day1/index.html）
var CJK_RE = /[㐀-䶿一-鿿豈-﫿]/g;
var EN_WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

function countMatches(str, re){
  var m = str.match(re);
  return m ? m.length : 0;
}

function countParagraphs(str){
  if (!str.trim()) return 0;
  var blocks = str.split(/\n\s*\n/).map(function(b){ return b.trim(); }).filter(Boolean);
  return blocks.length;
}
```
