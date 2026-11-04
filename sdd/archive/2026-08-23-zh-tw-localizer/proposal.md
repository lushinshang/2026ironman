# 繁簡與台灣在地化轉換器（zh-tw-localizer）

- PRD 對應：PRD 04（`2026-ironman-vibecoding-30-prd.md` 124-152 行）
- 資料夾名稱：`VibeCoding/Day04_zh-tw-localizer/`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- 互動模式：**按鈕觸發**，依據 `shared/CONTRACT.md` 第 5 節：「有逐項接受／取消替換的互動狀態，即時重算會沖掉使用者選擇」

## 為什麼做

AI 產文與外部資料常混入簡體字或非台灣慣用詞，需要人工逐詞修正。純規則手刻的字元對照表無法處理「发」「后」「干」這類一對多歧義字，需要詞組級消歧義才夠用；v1（`old/Day3`）已驗證內嵌 OpenCC 開源詞組級詞典（Apache 2.0）可行，但 v1 是「掃描即整批替換」，使用者無法逐項核可，也沒有前後並排對照。v2 MVP 明確要求「逐項接受／取消」與「並排對照」，這會改變核心資料流架構，值得獨立說明。

## 要改什麼

### 轉換功能

- 四階段內嵌詞庫依序轉換（前三階段對齊 OpenCC 官方 `s2twp` 轉換鏈，第四階段為本題自訂詞庫）：
  1. 簡體→繁體（詞組優先、單字回退）：`STPhrases.txt` + `STCharacters.txt`，約 53,000 筆
  2. 異體字校正：`TWVariants.txt`，約 39 筆（例：僞→偽、啓→啟）
  3. 中國大陸用語→台灣慣用語：`TWPhrases.txt`，約 509 筆，**此詞庫可在頁面上編輯**（新增／修改／刪除）
  4. 使用者自訂詞庫（獨立第四階段，見下方「自訂詞庫為獨立 stage」一節）

### 簡繁詞庫合併規則（STPhrases + STCharacters → 一份簡繁詞庫）

實測本機 OpenCC 詞典（路徑取得方式：`python3 -c "import opencc, os; print(os.path.dirname(opencc.__file__))"`，見「影響範圍」一節）：

- `STPhrases.txt`（49,051 筆，鍵長 2 字以上，無單字鍵）與 `STCharacters.txt`（3,980 筆，皆為單字鍵）**鍵集合完全不重疊**（以 `comm -12` 比對兩檔鍵集合，結果為 0 筆）。因此「同一鍵在兩檔案都出現」這個情況在目前版本的詞典資料中**不會實際發生**。
- 合併腳本仍需訂出明確、決定性的規則，以因應未來詞典更新後可能出現重疊：**同鍵衝突時，STPhrases（詞組）優先於 STCharacters（單字）**。理由：候選產生引擎本來就是「逐字元找最長比對」（沿用 `runStage()` 邏輯），詞組本就會比單字先被比對到；讓合併規則與掃描優先序一致，避免未來詞典更新後行為不可預期。
- **一對多取捨**：兩份詞典皆存在「一個簡體鍵對應多個繁體候選、以空白分隔」的情況，實測範例：
  - `STCharacters.txt`：`个\t個 箇`、`丰\t豐 丰`
  - `STPhrases.txt`：`下面\t下面 下麪`、`不干\t不幹 不乾`
  合併時**一律取第一個候選**（空白分隔後的第一欄），捨棄其餘候選。理由：OpenCC 官方轉換鏈（`s2twp`）本身的行為就是取第一個候選作為單一輸出；本題的候選 UI 設計是「每個比對到的詞組是一筆可接受/取消的候選」，不是「同一詞組提供多個候選字讓使用者挑選」——後者 PRD 04 未要求，不在本題範圍。
- 建置腳本（任務 1）需依此規則將 `STPhrases.txt` + `STCharacters.txt` 合併為單一 JSON 物件（鍵：簡體字/詞，值：取第一候選後的繁體字/詞），輸出前述兩條規則的合併結果。

### 自訂詞庫為獨立 stage（非合併進 TW 用語詞庫）

- 使用者自訂詞庫是**獨立的第四個轉換 stage**（簡繁→異體字→TW 用語→自訂詞庫），**不是**把匯入內容合併進內建 TW 用語詞庫後一起跑第三 stage。
- 理由：兩者是鏈式轉換，合併成一關 vs. 獨立跑一關會產生不同結果。例如使用者自訂「視頻→影片」，若與 TW 用語詞庫合併成同一關，`runStage()` 在該關掃描時兩筆規則互相競爭同一次掃描機會；獨立成第四關，則可保證「先跑完整個 TW 用語詞庫的掃描與鏈式效果，自訂詞庫再對最終結果做最後一輪覆寫」，行為單純、可預期，且候選記錄的 `stage` 標籤能明確標示「這筆是自訂詞庫改的」，符合驗收條件「使用者知道被哪個來源詞庫改過」。若合併成同一關，`stage` 就無法區分該筆候選來自內建詞庫還是自訂詞庫。
- 因此自訂詞庫**優先權**改為：以「執行順序在後」的方式體現優先——同一段文字若已被 TW 用語 stage 轉換過，自訂詞庫 stage 仍可再次比對並覆寫（沿用 v1 每個 stage 在完整文字上重新掃描的教訓），效果等同「自訂詞庫優先」，但技術實作是獨立 stage 而非合併字典。
- 使用者自訂詞庫：JSON 匯入／匯出，可重複載入

### 自訂詞庫 JSON schema

- 格式為**物件（鍵值對）**：`{ "原詞": "替換詞", ... }`，例如 `{"視頻": "影片", "鼠標": "滑鼠"}`。鍵與值皆須為非空字串，不允許巢狀物件或非字串值。
- **JSON 陣列視為錯誤格式**（例如 `[{"原詞":"視頻","替換詞":"影片"}]` 會被拒絕，顯示格式錯誤提示）。
- **此格式與 Day03 `filler-word-checker` 的自訂詞庫格式（陣列 `[{ "word": string, "type": string }]`）不通用，兩者用途不同**（Day04 是一對一替換對照表，Day03 是分類標記詞庫），不得預期兩題匯出檔互通。
- 按下「產生候選」按鈕才執行掃描（不即時），輸出「候選替換清單」而非直接改寫
- 轉換前／後並排顯示（左：原文，右：套用目前已勾選候選後的結果）
- 每個候選替換在兩欄中都高亮標示，並標出來源階段（簡繁／異體字／TW用語／自訂詞庫）
- 候選清單逐項核取方塊，勾選／取消即時切換該筆是否套用到右欄結果與最終輸出（此切換本身可即時反應，不算違反「按鈕觸發」——按鈕觸發指的是「重新掃描產生候選」這個成本較高的動作，勾選切換是純本地渲染，不重新掃描）
- 下載結果為 TXT / MD（僅套用已勾選的候選，未勾選的維持原文）
- **Level 1 共通 UI 基線**（`CONTRACT.md` 第 6 節，三項皆為本題必要任務，不算額外功能）：複製結果到剪貼簿（`io-clipboard.js`）、下載結果檔案（`io-download.js`，即上述 TXT/MD）、下載本工具離線版（自行實作 `buildCleanHtmlCopy()`，清空輸入區文字／候選清單／並排結果／自訂詞庫匯入狀態，移除 `.nav-back` 與站內連結）
- 授權標示（OpenCC Apache License 2.0，含版本與來源連結）渲染在頁面可見處（頁尾或詞庫說明區）

### 不做（沿用 PRD 04「不做」）

- AI 改寫、整句重寫、語氣潤飾
- v1 的「網路流行語僅提示不替換」分信心層級設計（見下方「設計判斷」一節，說明為何不保留）

## 逐項接受／取消的架構設計（與 v1 `runStage()` 的差異）

### v1 架構回顧

`old/Day3/index.html:53955-53993` 的 `runStage(segments, dict, maxLen, categoryLabel)`：

- 輸入是一組 `segments`（`{type, text, tags}`），每個 stage 呼叫時**在每個 segment 的完整 `text` 上重新掃描**（`while (i < oldText.length)` 逐字元往前找最長比對），不是在前一 stage 切碎後的片段內各自比對
- 找到比對就**直接把 `newTextParts` 換成新詞**，寫回 `seg.text`；`tags` 陣列只記錄「這段字元最後被哪個 stage 改過」，純粹用於渲染顏色，不影響下一 stage 的掃描範圍
- 這個設計是為了修一個真實 bug：如果讓每個 stage 只在前一 stage 產生的片段邊界內找詞，「軟」「件」被拆進不同片段後就永遠比對不到「軟件」這種跨階段詞。改成「每個 stage 都在完整文字上重新掃描」後，`视频→視頻（簡繁）→影片（科技用語）` 這類鏈式轉換才會正確運作
- 但 v1 的替換是**立即且不可逆**的：`seg.text` 一旦被某 stage 改寫，原字就從資料結構中消失，沒有「候選」的概念，使用者無法逐項取消

### v2 的兩階段設計

**保留 v1 的核心教訓**（每個 stage 必須在完整、未被前一 stage 切碎的文字上重新掃描），**但把「掃描」與「套用」拆成兩個階段**：

1. **產生階段（按鈕觸發，成本較高）**：沿用 `runStage()` 的掃描邏輯（逐字元找最長比對），但**不是直接覆寫 `seg.text`**，而是把每次比對包成一筆「候選紀錄」`{id, stage, rangeIndex, before, after, accepted: true}`，並把 segment 結構升級為「候選 segment 清單」：
   - 未比對到的字元維持原樣（`type: 'plain'`）
   - 比對到的區段變成 `{type: 'candidate', id, stage, before, after, accepted: true}`
   - 掃描完當前 stage 後，**用「若該候選 accepted 則用 after、否則用 before」組出的文字**作為下一 stage 掃描用的輸入文字（因為預設 `accepted` 都是 `true`，所以下一 stage 看到的仍是「完整套用上一 stage 後的文字」，鏈式轉換行為與 v1 完全一致）
   - 四個 stage（簡繁、異體字、TW 用語、自訂詞庫）依序跑完後，得到最終的候選 segment 清單
2. **渲染／套用階段（純本地、不重新掃描）**：候選 segment 清單本身就是最終資料結構，不再變動範圍或順序。使用者勾選／取消某個候選時，只是切換該 segment 的 `accepted` 布林值，重新算一次「組出最終文字」（segment 清單依序取 `accepted ? after : before` 串接），不需要重新掃描、不需要處理位置位移——因為每個候選已經是清單中獨立的一個元素，不是絕對字元位移（offset/length）記錄，切換一個候選不會影響其他候選的邊界。

### 兩者取捨與已知限制

- 取消一個鏈式候選（例如「TW 用語」stage 把簡繁 stage 已轉換的「視頻」→「影片」）只會退回到**上一 stage 的輸出**（「視頻」），不是退回最原始的簡體「视频」。如果使用者想連簡繁那一步都取消，需要在候選清單中連同簡繁那一筆一起取消。這是刻意的簡化：候選清單用「每個 stage 各自的候選」呈現，符合「使用者知道哪些詞被改過、被哪個詞庫改過」的驗收條件，UI 上會標示來源 stage，使用者可自行判斷要取消到哪一層
- 空的候選清單（無比對、或全部取消）等於原文不變，右欄與左欄相同

## 設計判斷：v1「網路流行語僅提示不替換」的分信心層級不保留

v1（`old/Day3/README.md`）曾設計「科技/生活用語直接換、網路流行語僅提示」的分信心層級，用意是：**信心較低的替換不該被自動套用，只提示給使用者看**。

v2 判斷：**不保留這個獨立機制**。理由：

1. PRD 04 的 MVP 本來就要求「逐項接受／取消替換」——這已經是比 v1 分信心層級更通用、更細粒度的機制。v1 用「整批分兩級」處理信心問題，v2 用「每一筆都能單獨取消」處理，後者涵蓋前者的需求（低信心的詞使用者一樣可以逐項取消，不需要額外的「僅提示」狀態）
2. PRD 04 沒有列出網路流行語詞庫（`不做`一節也未提及），MVP 詞庫範圍明確只有簡繁 + 可編輯 TW 用語詞庫 + 自訂匯入，不含 v1 手動整理的 LIFE/SLANG 詞庫，沒有素材可套用分級
3. 若未來要加回網路流行語詞庫，只要在候選紀錄的 `stage` 欄位多一個來源分類，UI 用同一套「逐項核取」呈現即可，不需要另外的「僅提示」UI 狀態——因此不做是避免重複造輪子，不是遺漏

## 影響範圍

### 新增檔案

- `VibeCoding/Day04_zh-tw-localizer/src/index.html`（模板，含 SHARED / ASSET placeholder）
- `VibeCoding/Day04_zh-tw-localizer/src/bundle.json`（資源清單：三份詞典 ASSET，皆標記 `escape_mode: json_string`、`license: Apache-2.0`、來源 `opencc-python-reimplemented v0.1.7`；ASSET 份數說明見下方「ASSET 資源清單」一節）
- `VibeCoding/Day04_zh-tw-localizer/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day04_zh-tw-localizer/bundle_manifest.json`（build 產物）
- `VibeCoding/Day04_zh-tw-localizer/PRD.md`（記錄 library 名稱、版本、授權條款，依 `CHECKLIST.md` 二、實作階段規定）
- 四份詞典資料檔（放在 `src/` 或指定的資源目錄，供 `bundle.py` 讀取；來源為 `<PYTHON_SITE_PACKAGES>/opencc/dictionary/` 的 `STPhrases.txt`、`STCharacters.txt`、`TWVariants.txt`、`TWPhrases.txt`，轉製為 `bundle.py json_string` 模式可用的 JSON 格式。實際路徑由實作時以 `python3 -c "import opencc, os; print(os.path.dirname(opencc.__file__))"` 之類的方式取得，不寫死在版控檔案中）

### 修改檔案

- `VibeCoding/README.md`、`VibeCoding/index.html`：收尾階段才動（更新進度表、作品集清單連結），不在本題實作範圍
- `shared/*.js`、`scripts/bundle.py` 由前置工程 `sdd/shared-infra/` 建立（`shared/CONTRACT.md` 第 7 節），且規定必須在 Day01 開工前完成；本題直接假設它們已就緒，不重新建立、不修改

### ASSET 資源清單（三份）

三階段轉換詞庫（簡繁合併詞庫、異體字表、TW 用語表）各自獨立成一份 ASSET，而非合併：

1. `simplified-to-traditional`（`STPhrases.txt` + `STCharacters.txt` 合併，依上方「簡繁詞庫合併規則」產生）
2. `tw-variants`（`TWVariants.txt`）
3. `tw-phrases`（`TWPhrases.txt`）

上述**共三份**資源檔案（原始四個 txt 因簡繁詞庫在建置時合併為一份 JSON，故產出的 ASSET 是三份，不是四份）。之所以合併簡繁二詞庫成單一 ASSET 而非各自獨立，是因為它們在轉換邏輯上本來就是同一階段（簡體→繁體）的一體兩面，沒有「單獨只更新 STCharacters」的實際需求；若未來真的需要單獨更新，可再拆分，不影響本題其餘設計。

### Library / API

- 詞典資料來源：pip 套件 `opencc-python-reimplemented` v0.1.7，Apache License 2.0，本機詞典目錄 `<PYTHON_SITE_PACKAGES>/opencc/dictionary/`（已於提案階段確認存在，含 `STPhrases.txt`、`STCharacters.txt`、`TWVariants.txt`、`TWPhrases.txt` 等 14 個檔案；`<PYTHON_SITE_PACKAGES>` 實際路徑由 `python3 -c "import opencc, os; print(os.path.dirname(opencc.__file__))"` 取得）
- 不使用 CDN、不使用第三方 JS library；全部邏輯與資料內嵌於單一 HTML
