> [!IMPORTANT]
> 🤖 **給協作 AI 的寫作與開發規範：**
> 本檔案及本專案之寫作與 Debug 歷程，皆受根目錄 [README](../../readme.md) 之 AI 協作規範與「隱私安全防護（嚴禁留下真實姓名、Email、IP 與真實使用者路徑）」約束。請勿刪除已有的開發日誌，並請在使用者提及 `log` 時主動執行 `generate_log.py`。

# 2026 iThome 鐵人賽 - Vibe Coding 系列 (Day 3)

## 📝 1. 當日主題
* **本日文章主題**：繁簡與在地化轉換器（原定「台灣用語轉換器」，併入 100 題清單 #11 繁簡轉換器）
* **核心技術概念**：內嵌 OpenCC 開源詞組級詞典（Apache 2.0）做簡體轉繁體消歧義、分信心層級的用語替換（科技/生活直接換、網路流行語僅提示）、Markdown 語法保護、SDD 規格先行流程、Playwright 實測驗證、fresh agent 獨立驗收

* **文章標題結構規範**：正文依固定六段式撰寫，順序為「情境 → 解題思路 → 資源 → Vibe 過程 → 產品 → 心得與反思」，寫作細節見 `../CHECKLIST.md`「文章產出」一節。

---

## 📈 2. 開發與寫作進度
* [x] 本日程式碼實作與除錯已完成（F1-F8 全部實作，11 條驗收標準自測＋fresh agent 獨立驗收皆全數通過，另加測 3 項邊界情況）
* [x] 本日文章草稿已潤飾完畢（`editor-in-chief` 總編審查，修正一處簡體字誤植）
* [x] 執行並更新本 Session 的 `log` 歷程以備存（Claude Code 環境 `generate_log.py` 不相容，依既有作法手動整理，見 `logs/session_log_2026-08-13_day3-tw-localization-converter.md`）

---

## 🧠 3. AI 思考與自言自語紀錄 (Vibe Coding 日誌)
> [!NOTE]
> *此區塊保留給協作 AI。當天跟 AI 共同探索、踩坑、或 Debug 的思維歷程可記錄於此，作為技術文章最重要的靈魂內容。*

### 本日 Debug 與架構思考歷程：
1. **遇到的問題**：
   * 簡體轉繁體要準確，純規則手刻的字元對照表沒辦法處理「发」「后」「干」這類一對多歧義字，需要詞組級消歧義才夠用
   * 開發階段實測發現兩個真實 bug：(1) `runStage` 呼叫時把 `{map,maxLen}` 包裝物件整個傳進去、忘記取 `.map`，導致 `dict.has is not a function`；(2) 更關鍵的架構問題——F2 簡繁轉換把文字拆成「已轉換/未轉換」片段（chunk）後，F3 用語替換只在單一 chunk 內部找詞，導致跨 chunk 邊界的詞（例如「軟」「件」被拆進不同 chunk）永遠比對不到「軟件」
2. **AI 的思考與解決路徑**：
   * 簡繁詞庫決策：跟使用者確認後，選擇內嵌 OpenCC（Apache 2.0）開源詞組級詞典（5.3 萬筆），而非手刻精簡版，準確度優先；科技用語詞庫直接沿用 OpenCC 的 TWPhrases.txt（509 筆），生活用語與網路流行語詞庫手動另外整理
   * 架構 bug 的解法：放棄「拆成 chunk、每個 chunk 各自比對」的設計，改成「每個 stage 都在完整、未被前一 stage 切碎的文字上重新掃描，用獨立的字元標籤（tags）陣列記錄哪個字元被哪個 stage 改過」——比對永遠看得到完整文字，標籤只影響最後渲染顏色，不影響比對範圍
3. **最終解法與結論**：
   * 改完架構後，「视频→視頻（簡繁）→影片（科技用語）」「链接→鏈接（簡繁）→連結（科技用語）」這類需要跨階段鏈式轉換的案例都正確運作，且後一個 stage 的分類標籤會正確覆蓋前一個 stage 的標籤（顯示「最後是被哪一關改的」，符合直覺）
   * 11 條驗收標準自測與 fresh agent 獨立驗收皆全數通過，fresh agent 額外測的鏈式轉換案例也確認無漏轉或重複轉換

---

## 💻 4. 本日程式實作片段
```javascript
// 每個 stage 都在完整文字上重新掃描，標籤（tags）獨立於文字之外，
// 避免跨 stage 邊界的多字詞比對被前一 stage 留下的片段邊界擋住
function runStage(segments, dict, maxLen, categoryLabel){
  var eventCount = 0, charCount = 0;
  if (maxLen <= 0) return { eventCount: 0, charCount: 0 };
  segments.forEach(function(seg){
    if (seg.type === 'protected') return;
    var oldText = seg.text, oldTags = seg.tags;
    var newTextParts = [], newTags = [];
    var i = 0;
    while (i < oldText.length){
      var matchedKey = null, matchedVal = null;
      var upper = Math.min(maxLen, oldText.length - i);
      for (var len = upper; len >= 1; len--){
        var sub = oldText.substr(i, len);
        if (dict.has(sub)){ matchedKey = sub; matchedVal = dict.get(sub); break; }
      }
      if (matchedKey !== null){
        eventCount++;
        if (matchedVal !== matchedKey) charCount += matchedKey.length;
        newTextParts.push(matchedVal);
        for (var c = 0; c < matchedVal.length; c++) newTags.push(categoryLabel);
        i += matchedKey.length;
      } else {
        newTextParts.push(oldText[i]);
        newTags.push(oldTags[i]);
        i++;
      }
    }
    seg.text = newTextParts.join('');
    seg.tags = newTags;
  });
  return { eventCount: eventCount, charCount: charCount };
}
```
