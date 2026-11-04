# Session 對話與思考日誌（手動整理版，2026-08-23）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗（已於 2026-08-08、2026-08-09 兩次實測確認）。**本檔為非腳本自動產出、環境不相容，改為依同一份既有格式手動彙整**，素材來源為 git commit history、`sdd/archive/2026-08-23-text-health-check/`、`article_draft.md`、`PROGRESS.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 背景

Day01 `text-health-check` 是 Level 1a 六題之一。實作先於共用層（`shared/` 六模組 + `bundle.py`）修正完成之前完成，因此用的是舊版 `io-dropzone.js` 與 `bundle.py`，後續需要一次返工（見下）。

## 前置工程：跨題共用層獨立驗收

Level 1a 六題共用 `shared/` 六模組（`base.css`、`ui-toast`、`ui-debounce`、`io-download`、`io-clipboard`、`io-dropzone`、`util-escape`）與 `scripts/bundle.py`。commit `ac2d495` 記錄前置工程獨立驗收（opus、fresh agent）判定「部分通過」，抓到會擴散到全部 33 題的 7 項缺陷：

1. `setupDropZone` 的 `accept` 預設是全收，契約寫的是 `['.txt','.md']`——方向是放寬，照契約寫的人會誤判為安全
2. `json_string` 模式的全域變數名＝資源名，資源名含連字號會產出 `var my-dict = ...`，語法錯誤但 exit 0，要到瀏覽器才會炸
3. `showToast()` 注入的 `#__shared_toast` 會被序列化進 `buildCleanHtmlCopy()` 的離線版產物——該產物設計為分享用途，尤其危險
4. 授權只寫進 HTML 註解與 manifest，沒渲染到頁面可見處（契約明訂要可見）
5. `escape_mode` 預設 `raw_js`，對資料檔是危險預設
6. `bundle.json` 的 `path` 可寫 `../` 穿越出 `src_dir`
7. 契約沒寫 `json_string` 的變數名規則，下游只能讀原始碼才知道

另外還額外修正兩項：`asset_licenses` 判斷方式改用明確 `kind` 欄位；`json.dumps` 改 `ensure_ascii=False` 並逃脫 `U+2028`/`U+2029`。

commit `be5e9e5`（前置工程完成）另記錄一個實作階段測試沒抓到的獨立 bug：**`json.dumps` 不會跳脫 `</script>`**，HTML 解析器在 `<script>` 內看到 `</script` 就會關閉標籤，資料被截斷、殘餘內容洩漏成頁面可見文字；用 node 抽出 JS 單獨跑會通過（JS 語法本身合法），只有 HTML parser 或真瀏覽器才看得出來。修法：`json_string` 模式序列化後把 `</` 換成 `<\/`；`raw_js` 模式無法安全自動修補，偵測到就中止。

## 返工：`#__shared_toast` 離線版洩漏

commit `feb9ff6`：Day01 因為在共用層修正前就完成，實測發現風險是真實存在而非理論——舊的 `buildCleanHtmlCopy()` 只清 toast 元素的 `textContent` 與 `className`，`id="__shared_toast"` 屬性仍留在 DOM，確認會被序列化進離線版產物。**返工前先驗舊行為證明缺陷是真的，才動手修**，改為整個移除節點。

Day01 的 `accept` 原本就已顯式傳入 `['.txt','.md']`，不受缺陷 1 的預設值變更影響；Day01 無外部 ASSET，不受 `escape_mode` 與 LICENSES 新規則影響。

返工後實測：`.exe` 拖曳走 `onError` 不載入內容；先觸發 toast 再下載離線版，產物無 toast 元素、無 `.nav-back`、無剛才輸入的字串；即時統計與四項偵測正常；console 無錯誤；無對外請求。未驗證項目：`copyToClipboard` 的成功路徑（headless 環境無剪貼簿權限，走的是失敗分支）。

## 驗收

`sdd/archive/2026-08-23-text-health-check/tasks.md` 列有驗收條件章節，依既有慣例逐條自測後全過。

## 收尾：文章與截圖

commit `2f9e927`：Day01 文章草稿 `article_draft.md` 與桌面／手機截圖完成（本機 Python playwright 獨立實例拍攝，非 Playwright MCP，避免共用瀏覽器實例被其他併行 agent 干擾）。

commit `9391e06`：五篇文章草稿（含 Day01）Mermaid 全數驗證通過，真實 GitHub 帳號零洩漏（一律用 `<GITHUB_USER>` 佔位符）。

commit `707e7a8`（總編審查）：Day01 零改動。審查者實跑核對 AI 味詞彙 grep 零命中、Mermaid 全過、截圖實際開圖確認有示範資料、真實 GitHub 帳號零洩漏、GitHub Pages 連結 `curl -sI` 回 200。

`article_draft.md` 第 5 行連結：`https://<GITHUB_USER>.github.io/2026ironman/VibeCoding/Day01_text-health-check/index.html`，已實測回 `HTTP/2 200`。

## 環境陷阱（影響本題與其餘五題）

- Playwright MCP 是共用瀏覽器實例，併行 agent 同時操作會互相切換頁籤，讀到的 DOM 可能是別人的頁面且不報錯（已寫進 `CHECKLIST.md` 與 `ops/LESSONS.md`，後續一律改用本機 Python playwright 獨立實例）
- 電腦休眠會中斷背景 agent（commit `bf0ab25` 記錄實測踩過，Day05 Phase B 與 Day03 獨立驗收因此確定失敗且無產出，需整個重派）
