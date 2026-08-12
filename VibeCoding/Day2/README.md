> [!IMPORTANT]
> 🤖 **給協作 AI 的寫作與開發規範：**
> 本檔案及本專案之寫作與 Debug 歷程，皆受根目錄 [README](../../readme.md) 之 AI 協作規範與「隱私安全防護（嚴禁留下真實姓名、Email、IP 與真實使用者路徑）」約束。請勿刪除已有的開發日誌，並請在使用者提及 `log` 時主動執行 `generate_log.py`。

# 2026 iThome 鐵人賽 - Vibe Coding 系列 (Day 2)

## 📝 1. 當日主題
* **本日文章主題**：贅詞與 AI 味檢查器（原定中英文排版工具，經場景腦力激盪與需求強度檢視後換題）
* **核心技術概念**：純規則式文字比對（詞庫比對＋全文詞頻統計＋段落開頭同構偵測＋引號範圍排除）、SDD 規格先行流程、Playwright 實測驗證、fresh agent 獨立驗收

* **文章標題結構規範**：正文依固定六段式撰寫，順序為「情境 → 解題思路 → 資源 → Vibe 過程 → 產品 → 心得與反思」，寫作細節見 `../CHECKLIST.md`「文章產出」一節。

---

## 📈 2. 開發與寫作進度
* [x] 本日程式碼實作與除錯已完成（F1-F9 全部實作，11 條驗收標準自測＋fresh agent 獨立驗收皆全數通過）
* [x] 本日文章草稿已潤飾完畢（`editor-in-chief` 總編審查，修正錯字與一處重複修辭）
* [x] 執行並更新本 Session 的 `log` 歷程以備存（Claude Code 環境 `generate_log.py` 不相容，依既有作法手動整理，見 `logs/session_log_2026-08-12_day2-filler-ai-checker.md`）

---

## 🧠 3. AI 思考與自言自語紀錄 (Vibe Coding 日誌)
> [!NOTE]
> *此區塊保留給協作 AI。當天跟 AI 共同探索、踩坑、或 Debug 的思維歷程可記錄於此，作為技術文章最重要的靈魂內容。*

### 本日 Debug 與架構思考歷程：
1. **遇到的問題**：
   * 原定 Day2 題目是「中英文排版工具」，寫 PRD 前先被質疑「這功能真的有需要嗎」——市面已有 pangu.js 等成熟方案，純規則式準確度天花板也不高
   * F6「引號內容排除」要同時套用到 F2（詞庫比對）／F4（高頻詞統計）／F5（段落開頭偵測）三個功能，容易漏掉「整段都在引號裡」這種邊界情況（不是引號夾在句子中間）
2. **AI 的思考與解決路徑**：
   * 先做場景腦力激盪，再逐項檢視每個場景在「純前端零依賴」限制下是否可行，篩掉「自動改寫句子」「AI 味百分比評分」這類做不到的功能，收斂成「標記不改寫」的定位；接著重新檢視整條 Day1-5 流程，換成「贅詞與 AI 味檢查器」
   * 引號排除採「先挖空引號範圍、再對挖空後的文字做比對與段落切分」的做法，讓引號內容從資料源頭就不會進入任何偵測邏輯，而不是在各功能內各自寫一次排除判斷
3. **最終解法與結論**：
   * PRD.md 明確排除自動改寫、語法對稱判斷、AI 味評分三項功能，只做「詞庫比對＋門檻標記」的純規則機制
   * 測試資料故意寫成「整段包在引號裡且開頭重複」的案例，驗證挖空後比對的做法能正確避免誤判；11 條驗收標準與 fresh agent 額外測的 3 個邊界情況（詞彙重疊解析、空白輸入、詞庫格式容錯）皆全數通過

---

## 💻 4. 本日程式實作片段
```javascript
// 引號範圍排除：先找出所有「」『』""範圍，供 F2/F4/F5 共用判斷
function findQuoteRanges(text){
  var ranges = [];
  var re = /「[^」]*」|『[^』]*』|"[^"]*"/g;
  var m;
  while ((m = re.exec(text)) !== null){
    ranges.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) re.lastIndex++;
  }
  return ranges;
}

function isInsideRanges(start, end, ranges){
  for (var i = 0; i < ranges.length; i++){
    if (start >= ranges[i][0] && end <= ranges[i][1]) return true;
  }
  return false;
}

// 段落開頭同構偵測：先挖空引號內容，再切段比對開頭字元
function stripQuotes(text, quoteRanges){
  var out = '';
  var cursor = 0;
  quoteRanges.forEach(function(r){
    out += text.slice(cursor, r[0]);
    cursor = r[1];
  });
  out += text.slice(cursor);
  return out;
}
```
