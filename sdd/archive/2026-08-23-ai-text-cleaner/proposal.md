# AI 回答 → Office 文字清理器（ai-text-cleaner）

## 為什麼做

AI 回答貼進 Word／Email 時，Markdown 標記（`#`、`**`、`` ` ``）、emoji、分隔線都會變成視覺垃圾，使用者得手動一個個清。這題要做到「貼上 → 選模式 → 複製乾淨文字」一步到位，即時預覽讓使用者邊調整邊確認沒有遺失內容。

## 要改什麼

以下逐項標明來源：**[PRD明訂]** 直接抄自 PRD 06；**[判斷]** 為 PRD 未寫清楚、本提案補上的判斷，理由附註於後。

### 清理規則

1. **[PRD明訂]** 移除 Markdown heading 符號（`#`～`######`），保留文字。
2. **[PRD明訂]** 移除粗體 `**x**`／`__x__`、斜體 `*x*`／`_x_` 標記，保留文字本身。
3. **[判斷]** 行內代碼 `` `x` ``：移除反引號，保留文字。PRD 只提到 code fence，未提行內代碼，視為同一類「代碼標記」處理，理由一致（見第 4 點）。
4. **[判斷] Code fence 內容保留，只移除 fence 記號與語言標籤。**
   PRD 驗收條件明寫「實質句子內容不應因格式清理而遺失」——code fence 裡的內容（範例指令、設定片段）往往是使用者要貼進文件的重點，直接砍掉會違反這條驗收條件。因此判斷為：移除 ```` ``` ```` 與語言標籤（如 `python`），**保留**區塊內文字，視模式決定是否加縮排（見下方模式差異表）。未閉合的 code fence（只有開頭 ```` ``` ```` 沒有結尾）視為到輸入結尾都算在 code 區塊內，仍保留內容、只移除開頭的 fence 記號。
5. **[判斷] 巢狀清單縮排：Word-friendly／Email-friendly 保留原階層縮排，純文字模式拉平為單層。**
   使用者提示「Word 貼上時階層有意義」——巢狀縮排在 Word／Email 裡通常對應真實的从屬關係，清掉是資訊遺失。但「純文字模式」的定位是最精簡輸出（例如貼進純文字編輯器、terminal、無格式輸入框），階層縮排在這類場景常因跳版、tab 被吃掉而失去意義，故此模式選擇拉平、不保留縮排層級，改用一致的單層 `-` 前綴。
6. **[PRD明訂]** 統一 bullet 與編號：`-`／`*`／`+` 統一符號、有序清單重新連續編號；具體符號與編號格式依模式不同（見下方差異表）。
   **[判斷] 巢狀編號規則（驗收官指出的含糊點，定案如下）：** 有序清單巢狀編號時，**每一層級各自獨立重新從 1 開始連續編號**（同一層級內的項目連續編號，不同層級間不共用計數器，子層級不延續父層級的數字，也不延續前一個同層級清單留下的計數）。這是一般 Markdown 渲染器（如 GitHub、CommonMark）的標準行為，實作者不需另外設計新規則。純文字模式因清單已拉平為單層，此規則自動退化為單一層連續編號 `1.`、`2.`、`3.`……。
7. **[PRD明訂]** 移除 emoji 是**選項**，非預設行為。**[判斷]** 預設值設為「不移除」（保留 emoji），因為 PRD 用詞是「選擇是否移除」而非「預設移除」，維持輸入原貌是較保守的預設。
   **[判斷] Emoji 判定範圍（驗收官指出的含糊點，定案如下）：** 以 Unicode `Extended_Pictographic` 屬性字元為判定基準（業界常用的「這是不是一個圖形化 emoji」判定基準，`\p{Extended_Pictographic}` 在支援 Unicode property escape 的環境可直接用正則比對）。移除時以**完整 grapheme 為單位**，而非逐碼點拆開：包含該字元本身、緊接在後的 variation selector（U+FE0F）、膚色修飾符（U+1F3FB–U+1F3FF）、以及由 ZWJ（U+200D）串接的複合序列（例如 👨‍👩‍👧‍👦 家庭 emoji，整串含 3 個 ZWJ 一次整體移除，不留下斷裂的殘餘字元）。`©`、`®`、`™` 不具 `Extended_Pictographic` 屬性，**不視為 emoji，一律保留**（即使勾選移除 emoji 也不受影響）。Dingbats 區塊（U+2700–U+27BF）中僅同時具有 `Extended_Pictographic` 屬性的字元（如 ✂️✈️）視為 emoji 移除，區塊內其餘字元不受影響。
8. **[PRD明訂]** 整理多餘空白行：連續空白行收斂，收斂幅度依模式不同（見下方差異表）。
   **[判斷] 純文字模式「收斂為 0 行」的明確定義（驗收官指出的含糊點，定案如下）：** 指清除所有做為分隔用的空白行本身，段落之間的換行符號收斂為恰好 1 個（即原本兩行文字間若有 1 行以上空白行，收斂後兩行文字直接以單一 `\n` 相鄰），**不是把整篇文章黏成一行、也不是不留任何換行**。每一行原有的文字內容與行序全部保留、不刪不併字，因此仍滿足「實質句子內容不應遺失」的驗收條件——被移除的只有做為視覺留白用的空白行，不是文字本身。相對地，Word-friendly／Email-friendly 的「收斂為最多 1 行」則是保留 1 行空白行作為段落間距。
9. **[判斷]** 分隔線（獨立一行的 `---`／`***`／`___`）整行移除（不留空行替代），三種模式一致。PRD 未單獨列出分隔線規則，但「動機」段落明講分隔線是要清掉的垃圾之一，故納入 MVP。

### 三種輸出模式的具體差異（本提案的核心判斷）

**[判斷]** PRD 只寫「Word-friendly、Email-friendly、純文字模式」三個名稱與「三種模式有明確差異」的驗收條件，沒有定義各模式具體行為。以下是本提案的定案：

| 處理項目 | Word-friendly | Email-friendly | 純文字模式 |
|---|---|---|---|
| Heading | 移除 `#`，保留文字；標題前後各補 1 個空行（若原本沒有），模擬 Word 段落間距 | 移除 `#`，保留文字；不額外補空行，維持原有空行 | 移除 `#`，保留文字；不額外補空行 |
| 粗體／斜體 | 移除記號，保留文字 | 同左 | 同左 |
| 行內代碼 | 移除反引號，保留文字 | 同左 | 同左 |
| Code fence | 移除 fence 記號與語言標籤；內容保留，前綴 4 個空白縮排（視覺區隔） | 移除 fence 記號與語言標籤；內容保留，不加縮排（郵件客戶端常吃掉行首空白） | 移除 fence 記號與語言標籤；內容保留，不加縮排 |
| 無序清單符號 | 統一為 `•`，保留原巢狀縮排（每層 2 空白） | 統一為 `-`，保留原巢狀縮排 | 統一為 `-`，拉平為單層（不保留縮排） |
| 有序清單編號 | 每層級各自獨立重新從 1 開始連續編號，格式 `1.` | 每層級各自獨立重新從 1 開始連續編號，格式 `1)` | 拉平為單層後，依原順序整體重新從 1 開始連續編號 `1.` |
| 分隔線 | 整行移除 | 整行移除 | 整行移除 |
| 多餘空白行 | 連續空白行收斂為最多 1 行（保留段落間距） | 連續空白行收斂為最多 1 行（保留段落間距） | 連續空白行收斂為 0 行：段落間換行符收斂為恰好 1 個，不留空白行，但每行文字內容與行序不變、不合併不刪字（見上方規則 8 說明） |
| Emoji | 依勾選框，預設保留；判定範圍見上方規則 7 說明 | 同左 | 同左 |

### 互動

10. **[PRD明訂]** 即時預覽：輸入變更後 debounce 150ms 觸發重新清理與預覽，依 `shared/CONTRACT.md` 第 5 節 Day02 定案為即時模式，使用 `shared/ui-debounce.js` 的 `debounce(fn, ms)`。
11. **[PRD明訂]** 一鍵複製清理後文字，使用 `shared/io-clipboard.js` 的 `copyToClipboard(text)`（回傳 `Promise<boolean>`），複製成功／失敗由呼叫端用 `shared/ui-toast.js` 的 `showToast(msg, ms)` 顯示提示。
12. **[CONTRACT第6節：Level 1 共通 UI 基線，非 PRD 明訂但屬明文規定的產品慣例]** 下載清理後文字為檔案，使用 `shared/io-download.js` 的 `downloadFile(filename, content, mime)`，`mime` 用預設值 `text/plain;charset=utf-8`；下載成功／失敗同樣用 `showToast` 提示。
13. **[CONTRACT第6節]** 下載本工具離線版：自行實作 `buildCleanHtmlCopy()`，把當下整個頁面複製成一份可分享的離線 HTML，依 CONTRACT 第 6 節硬性要求：(a) 清空所有使用者資料——輸入框 textarea、預覽區內容、以及任何存在 DOM 或 JS 變數裡會被序列化進 outerHTML 的清理結果；(b) 移除返回連結（`.nav-back`）與指向本站的外連；(c) 產生的檔案透過 `downloadFile()` 供下載。驗收條件見 `tasks.md`，須明確測「下載的離線版不含剛才輸入的資料」，不能只測「檔案能開」。
14. HTML 預覽渲染清理後文字時，一律先經 `shared/util-escape.js` 的 `escapeHtml(s)`，避免使用者貼入的內容被當成 HTML 解析（含 code fence 內容）。

### 不做（PRD明訂）

內容改寫、事實修改、AI 語氣判斷。複製、下載結果檔案、下載本工具離線版三項屬 `shared/CONTRACT.md` 第 6 節規定的 Level 1 共通 UI 基線，明文規定「不視為違反共通規則第 3 條」，故納入本題範圍；PRD 06 原文只寫「即時預覽與一鍵複製」，其餘為 CONTRACT 補上的產品慣例，非本題自行加料。

## 版面草圖（單頁小工具，不另立 UI 設計文件）

```
桌面版（≥768px）                                手機版（375px）
┌───────────────┬───────────────┐              ┌─────────────────┐
│               │ 模式：●Word   │              │  模式：○Word     │
│  原始文字輸入  │      ○Email   │              │   ○Email ●純文字 │
│  (textarea)   │      ○純文字   │              ├─────────────────┤
│               │ □移除 emoji   │              │  □移除 emoji     │
│               ├───────────────┤              ├─────────────────┤
│               │  清理後預覽    │              │  原始文字輸入     │
│               │  (即時更新)    │              │  (textarea)      │
│               ├───────────────┤              ├─────────────────┤
│               │ [複製][下載]   │              │  清理後預覽       │
│               │ [下載離線版]   │              ├─────────────────┤
└───────────────┴───────────────┘              │ [複製][下載]     │
                                                 │ [下載離線版]     │
                                                 └─────────────────┘
```

## 影響範圍

| 檔案 | 動作 | 說明 |
|---|---|---|
| `VibeCoding/Day02_ai-text-cleaner/src/index.html` | 新增 | 模板原始碼，含 `<!--{{SHARED:模組名}}-->` placeholder |
| `VibeCoding/Day02_ai-text-cleaner/src/bundle.json` | 新增 | 資源清單，列出需內嵌的 shared 模組 |
| `VibeCoding/Day02_ai-text-cleaner/index.html` | 新增（build 產物） | `scripts/bundle.py` 產出，版控追蹤 |
| `VibeCoding/Day02_ai-text-cleaner/bundle_manifest.json` | 新增（build 產物） | 內嵌資源來源、版本、SHA256 |
| `VibeCoding/Day02_ai-text-cleaner/PRD.md` | 新增 | 展開 PRD 06 為本題規格文件 |
| `VibeCoding/Day02_ai-text-cleaner/article_draft.md` | 新增（實作階段後期） | 發文草稿，本提案階段不寫 |
| `VibeCoding/Day02_ai-text-cleaner/logs/` | 新增 | 開發日誌目錄 |
| `sdd/ai-text-cleaner/proposal.md` | 新增 | 本檔 |
| `sdd/ai-text-cleaner/tasks.md` | 新增 | 任務清單與驗收條件 |
| `VibeCoding/README.md` | 修改 | 更新進度表（該題「開發」「撰文」欄位、總覽數字與 badge）；**收尾階段才動，不在本題實作範圍** |
| `VibeCoding/index.html` | 修改 | 作品集清單加連到本題 `index.html`、工具頁加返回連結，雙向瀏覽器實測；**收尾階段才動，不在本題實作範圍** |

使用的共用模組（`VibeCoding/shared/`，簽名依 `CONTRACT.md` 第 3 節，不新增／不變動既有簽名）：

- `shared/base.css`
- `shared/ui-debounce.js` — `debounce(fn, ms)`
- `shared/io-clipboard.js` — `copyToClipboard(text)`
- `shared/io-download.js` — `downloadFile(filename, content, mime)`（`CONTRACT.md` 第 6 節 Level 1 共通 UI 基線，用於下載結果檔案與 `buildCleanHtmlCopy()` 產出的離線版）
- `shared/ui-toast.js` — `showToast(msg, ms)`
- `shared/util-escape.js` — `escapeHtml(s)`

不使用 `shared/io-dropzone.js`（PRD 06 MVP 沒有拖放檔案需求，不預先加）。

Library／API：無，純前端字串處理，不依賴第三方 library，不呼叫任何 API。
