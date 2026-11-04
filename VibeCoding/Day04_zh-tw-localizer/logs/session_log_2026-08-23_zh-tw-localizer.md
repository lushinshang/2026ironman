# Session 對話與思考日誌（手動整理版，2026-08-23）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗（已於 2026-08-08、2026-08-09 兩次實測確認）。**本檔為非腳本自動產出、環境不相容**，改為依同一份既有格式手動彙整，素材來源為 git commit history、`sdd/archive/2026-08-23-zh-tw-localizer/`、`article_draft.md`、`PROGRESS.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 背景

Day04 `zh-tw-localizer` 承接 Day02-old「繁簡與在地化轉換器」的技術脈絡（OpenCC 詞典），是 Level 1a 六題之一，於 commit `ac2d495`（Day03/Day04/Day07 完成，Day05 Phase A 完成，修共用層 7 項缺陷）一併完成。

## 前置提案階段就抓到的缺陷（commit `97ab407`）

六題提案由六個互不可見的 agent 平行撰寫，再派 fresh agent 做跨題一致性驗收。針對 Day04 抓到並已修正：

- **Day04 三處硬寫真實使用者本機路徑**，違反 `readme.md` 第 3 條
- **Day04 詞庫合併規則完全未定義**（本題準確度核心）。**實測 `comm -12` 確認 `STPhrases` 與 `STCharacters` 兩份詞典鍵集合零重疊**，一對多定為取第一候選

## 實作過程：詞典資料與 `ensure_ascii` 修正

commit `ac2d495` 記錄：`json.dumps` 改為 `ensure_ascii=False` 並逃脫 `U+2028`/`U+2029`（前置工程共用層 7 項缺陷修正之一），**Day04 產物從 2.4MB 降到 1.5MB**（另一 commit `707e7a8` 給出更精確的實測數字：`ensure_ascii` 開／關體積差為 1,355,144 vs 2,292,048 bytes，實跑 `json.dumps` 對照得出）。

同一 commit 記錄：**Day04 額外發現 `TWPhrases` 也有 27 筆一對多**（例：視頻→影片／視訊），proposal 只針對 `ST`（簡轉繁）兩份詞典寫了一對多規則，實作時把「取第一候選」的規則擴大套用到三份詞庫一體適用。

`build_dicts.py` 用來把 OpenCC 隨附的純文字詞典組裝成 `src/simplified-to-traditional.json`、`src/tw-phrases.json`、`src/tw-variants.json` 三份 JSON，內嵌進 `index.html`。

## 前置工程共用層缺陷（本題受影響項目）

commit `ac2d495` 記錄的 7 項共用層缺陷中，`escape_mode` 危險預設 `raw_js` 與 LICENSES 渲染缺陷對 Day04 直接相關——Day04 有外部 ASSET（OpenCC 詞典，Apache License 2.0），需要正確的 `escape_mode` 與授權可見渲染。六條錯誤路徑與 `ensure_ascii` 變更皆實測：重建後 Day04 詞條數 53031/39/509 與來源相符，三個產物的 script 標籤配對無無主結束標籤。

## 驗證：線上與本機產物一致性

commit `9391e06` 記錄：Day04 負責文章的 agent 標註「本機產物可能與線上版不是逐位元組相同」，指揮官補證據後改寫為確定敘述——**實際核對兩者 SHA-256 一致（`feece689eac8b0b9…`）**。commit `707e7a8`（總編審查）再次獨立重算 SHA-256，確認相符。

## 收尾：文章與截圖

commit `2f9e927`：桌面／手機截圖完成。commit `9391e06`：文章草稿完成，`sdd/zh-tw-localizer/tasks.md` 的授權字串統一為 Apache License 2.0，與 build 產物及頁面渲染一致。

commit `707e7a8`（總編審查）：Day04 零改動。

`article_draft.md` 第 149-150 行連結：`https://<GITHUB_USER>.github.io/2026ironman/VibeCoding/Day04_zh-tw-localizer/index.html`，已用 `curl -sI` 實測回 `HTTP/2 200`。

## 驗收

`sdd/archive/2026-08-23-zh-tw-localizer/tasks.md` 列有驗收條件章節，依既有慣例逐條自測後全過。
