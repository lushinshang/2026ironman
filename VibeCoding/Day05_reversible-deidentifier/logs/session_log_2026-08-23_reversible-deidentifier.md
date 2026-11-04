# Session 對話與思考日誌（手動整理版，2026-08-23）

* **記錄方式**：根目錄 `readme.md` 第 4 條要求提到 `log` 時執行 `scripts/generate_log.py`，但該腳本只相容 antigravity-cli（Gemini）的逐字稿格式，在 Claude Code 環境會直接失敗（已於 2026-08-08、2026-08-09 兩次實測確認）。**本檔為非腳本自動產出、環境不相容**，改為依同一份既有格式手動彙整，素材來源為 git commit history、`sdd/archive/2026-08-23-reversible-deidentifier/`、`article_draft_day05.md`、`SECURITY_REVIEW.md`、`PROGRESS.md`。
* **安全保護**：本檔內容不含真實姓名、Email、IP 或真實使用者本機路徑。

---

## 背景：v1 完全沒有可逆機制

`sdd/archive/2026-08-23-reversible-deidentifier/proposal.md` 明確記載：v1 對應作品（`VibeCoding/old/Day9/`）只做**單向遮蔽**——`A123456789` 蓋成 `A●●●●●●789`、機敏字庫命中換成代換詞或 `[已遮蔽]`，原文資訊當場丟棄，**沒有任何 mapping 或 token 機制**（已用 `grep -n` 全檔確認：`old/Day9/index.html` 無 `mapping`／`token`／`restore` 相關識別符）。因此「可逆」是本題全新設計，不是移植。

`PROGRESS.md` 也記錄同一判斷（原文）：「⚠️ v1 是單向遮蔽，沒有 mapping/token 機制。regex 偵測可複用，可逆化是全新設計 → 本題最重，建議派架構師（opus）」。

## 分兩天發布的決策

commit `be5e9e5`：使用者裁示把 Day05 拆兩個發文日——Phase A（骨架、偵測、合併歸併、token 分配、去識別化）對應 Day05 上篇，Phase B（mapping 匯出載入、還原引擎、`buildCleanHtmlCopy()` 資安擴充、`SECURITY_REVIEW.md`）對應 Day06 下篇。產品仍是同一個資料夾。連帶影響：text-diff 順延成 Day07，系列總長 33 → 34 天。

## Phase A 實作（commit `ac2d495`）

Day03/Day04/Day07 完成的同一次 commit 也完成 Day05 Phase A：`PRD.md`、`bundle_manifest.json`、`index.html`、`src/index.html`。前置工程共用層 7 項缺陷（詳見 shared-infra 側）修正在此之前完成，Phase A 直接使用修正後版本。

## Phase B 實作（commit `2f9e927`）

Phase A/B 對應 tasks 6-10：mapping 匯出載入、還原引擎、`buildCleanHtmlCopy()`、`SECURITY_REVIEW.md`。Node 端 37 項＋瀏覽器 84 項全過。往返（JSON/CSV 各一）逐字元相同；含 `[PERSON_001]` 字面的原文往返相同；mapping original 內含另一 token 字面不二次替換；惡意 mapping（`__proto__`/`constructor`/截斷 JSON/缺欄 CSV）全被拒且 `Object.prototype` 未污染。

實作者揭露的兩項判斷：

1. **「mapping 記憶體狀態歸零」改用等效做法**：state 是 app IIFE 的區域變數，`cloneNode(true).outerHTML` 序列化的是靜態 script 原始碼，執行期變數結構上不可能被寫進離線複本；歸零反而會清掉使用者還在用的結果。改以「基準線比對 grep」當實際防線，理由寫進 `SECURITY_REVIEW.md`。
2. **往返有一個規格內的例外**：同值不同寫法（`0912-345-678` vs `0912345678`、Email 大小寫）依 proposal 正規化成同一 token，還原會統一成第一次出現的寫法。指揮官獨立實測確認此行為屬實。

## 電腦休眠中斷背景 agent（本題受影響最重）

commit `bf0ab25`：Day05 Phase B 實作曾因電腦休眠導致 API 中斷，**確定失敗且無產出**，只讀完 code、尚未動手寫 Phase B，需整個重派。同批 Day03 獨立驗收也因休眠中斷確定失敗，Day02 則撐過休眠完成。教訓：長時間背景 agent 遇到電腦休眠會被 API 中斷，離開前若有 agent 在跑，要嘛等它回報再走，要嘛直接當作會失敗（已寫進 `PROGRESS.md`）。

## 補漏：選擇檔案按鈕與正規化說明文案（commit `7ed4118`）

兩項變更：

1. 還原區補 `<input type="file">` 觸發的「選擇檔案」按鈕（proposal 的 wireframe 有畫但實作漏了，只能拖曳對部分使用者是實質障礙）。讀檔後的處理抽成 `handleMappingFileContent` / `handleMappingFileError` 兩個具名函式，拖曳與按鈕共用，副檔名清單抽成 `MAPPING_ACCEPT` 常數。
2. 依使用者裁示（選項 A），把「還原會統一成第一次出現的寫法」講在介面上，不再只藏在 `SECURITY_REVIEW.md`。文案遵守 proposal 的不過度承諾原則，主詞是「本工具依正規化後的結果配對 Token」而非「你的資料會被完整還原」。

同 commit 也修一個實作者自己造成的問題：commit `9391e06` 的 `git add -A` 在 agent 工作到一半時把 Day05 的中途狀態掃了進去，導致產物落後於模板。已重跑 `bundle.py` 使兩者一致。教訓寫進 `ops/LESSONS.md`：有 agent 在跑時只 `git add` 明確已回報完成的路徑，不要用 `-A`。

## 獨立驗收：部分通過，抓到 D-1（commit `e81837c`）

獨立驗收（opus，17 項判定）判定「部分通過」，抓到一個很不易察覺的缺陷：

**D-1**：`buildCleanHtmlCopy()` 會移除「下載本工具離線版」按鈕，但註冊該按鈕 handler 的那行沒有 null 檢查，導致離線複本載入時拋 `uncaught TypeError`。因為它是 app IIFE 的最後一個語句，其餘 handler 都已註冊完畢，所以離線版的功能實測全部正常——只有去看 console 才會發現。

修法是加 null 檢查並重跑 build。驗證方式是攔截 Blob 取得離線版內容、寫成檔案後重新載入：`pageerror` 為空、`.nav-back` 元素 0 個、無 `#__shared_toast`。⚠️ 此修正與驗證由指揮官自己執行，`PROGRESS.md` 記錄續作時應派 fresh agent 複驗——後續確實已由 fresh agent 複驗（2026-08-23）並全部通過：離線複本 `pageerror` 為空、console error 為空、`.nav-back` 0 個、無 `#__shared_toast`；並確認離線複本裡真的沒有 `id="btn-download-offline"` 字串，證明 null 檢查分支確實被走到。複驗還做了同類問題普查：`src/index.html` 的 11 處 `addEventListener` 逐一比對 `buildCleanHtmlCopy()` 的移除清單，其餘 10 處綁定的元素都不在移除清單內，`shared/io-dropzone.js` 的 3 處也不受影響——沒有第二個漏網的同類問題。

兩處文件不符也一併修正：

- `tasks.md` 任務 9 寫「`grep 'nav-back'` 為 0 筆」，字面上不可能通過（內嵌 `base.css` 有該樣式規則、`buildCleanHtmlCopy()` 原始碼本身也含該字串）。改為用 DOM 層判定，並加上「console 無 uncaught error」。
- `SECURITY_REVIEW.md` 的「無 uncaught page error」一度不實，已加更正說明。

## 收尾：文章

- 上篇 `article_draft_day05.md` 與四張截圖（`screenshot_day05_desktop.png`、`screenshot_day05_mobile.png`、`screenshot_day06_desktop.png`、`screenshot_day06_mobile.png`）完成。
- **下篇（Day06）文章因 agent 撞到額度上限中斷，`PROGRESS.md` 記錄暫停時尚未完成，只缺下篇**（截至記錄時間點）。

`article_draft_day05.md` 第 111-112 行連結：`https://<GITHUB_USER>.github.io/2026ironman/VibeCoding/Day05_reversible-deidentifier/index.html`，已用 `curl -sI` 實測回 `200`。

commit `707e7a8`（總編審查）涵蓋五篇文章，未含 Day06 下篇（當時尚未撰寫）。

## 驗收

Phase A 結束時、Phase B 結束時各有一組驗收條件（見 `sdd/archive/2026-08-23-reversible-deidentifier/tasks.md`），Phase A 全過；Phase B 獨立驗收部分通過（D-1 已修並複驗通過，D-2 為文件修正）。

## 與共用層的互動

Day05 是前置工程共用層設計時特別點名的高風險案例：`shared/CONTRACT.md` 第 6 節記載 `buildCleanHtmlCopy()` 對 Day05 的個資外洩風險（見 commit `97ab407`）。D-1 缺陷即直接命中這個已被記載的風險點。
