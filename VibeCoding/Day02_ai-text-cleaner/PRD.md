# PRD 06 — AI 回答 → Office 文字清理器（ai-text-cleaner）

> 展開自 `2026-ironman-vibecoding-30-prd.md` 第 183–212 行 PRD 06。

- **英文短名稱**：`ai-text-cleaner`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否；只處理 AI 產出的文字
- **SDD**：`sdd/ai-text-cleaner/`

## 為什麼做

AI 回答常含 Markdown、emoji、分隔線與不適合 Word/Email 的格式，使用者貼進 Word 或 Email 時得手動一個個清。這題要做到「貼上 → 選模式 → 複製乾淨文字」一步到位，即時預覽讓使用者邊調整邊確認沒有遺失內容。

## MVP

- 移除 Markdown heading 符號（`#`～`######`），保留文字。
- 移除粗體 `**x**`／`__x__`、斜體 `*x*`／`_x_` 標記，保留文字。
- 行內代碼 `` `x` ``：移除反引號，保留文字。
- Code fence 清理：移除 fence 記號與語言標籤，保留內容；未閉合 fence 視為到輸入結尾都算 code 內容。
- 統一 bullet 與有序清單編號：符號／編號格式依模式不同，巢狀編號每層級各自獨立從 1 開始。
- 選擇是否移除 emoji（預設不移除）；判定範圍以 Unicode `Extended_Pictographic` 屬性為準，以完整 grapheme（含 VS16、膚色修飾符、ZWJ 序列）為移除單位；`©`／`®`／`™` 一律保留。
- 整理多餘空白行：Word/Email 收斂為最多 1 行；純文字模式收斂為 0 行（段落間換行符收斂為恰好 1 個，不留空白行，但每行文字內容與行序不變）。
- 分隔線（獨立行 `---`／`***`／`___`）整行移除。
- Word-friendly、Email-friendly、純文字三種輸出模式，彼此有明確可觀察差異（詳見下方差異表）。
- 即時預覽（debounce 150ms）與一鍵複製。

### 三種模式差異表

| 處理項目 | Word-friendly | Email-friendly | 純文字模式 |
|---|---|---|---|
| Heading | 移除 `#`，標題前後各補 1 空行（若原本沒有） | 移除 `#`，不額外補空行 | 移除 `#`，不額外補空行 |
| Code fence | 內容保留，前綴 4 空白縮排 | 內容保留，不加縮排 | 內容保留，不加縮排 |
| 無序清單符號 | 統一為 `•`，保留原巢狀縮排（每層 2 空白） | 統一為 `-`，保留原巢狀縮排 | 統一為 `-`，拉平為單層 |
| 有序清單編號 | 每層級各自獨立從 1 開始，格式 `1.` | 每層級各自獨立從 1 開始，格式 `1)` | 拉平為單層後整體重新從 1 開始，格式 `1.` |
| 分隔線 | 整行移除 | 整行移除 | 整行移除 |
| 多餘空白行 | 收斂為最多 1 行 | 收斂為最多 1 行 | 收斂為 0 行（換行收斂為恰好 1 個） |
| Emoji | 依勾選框，預設保留 | 同左 | 同左 |

## 不做

內容改寫、事實修改、AI 語氣判斷。

## 驗收條件

見 `sdd/ai-text-cleaner/tasks.md` 驗收條件（提案定案於 `sdd/ai-text-cleaner/proposal.md`）。

## 共用模組（依 `shared/CONTRACT.md` 第 3 節，無新增／變動）

- `shared/base.css`
- `shared/ui-debounce.js` — `debounce(fn, ms)`，互動模式為即時預覽（150ms）
- `shared/io-clipboard.js` — `copyToClipboard(text)`
- `shared/io-download.js` — `downloadFile(filename, content, mime)`
- `shared/ui-toast.js` — `showToast(msg, ms)`
- `shared/util-escape.js` — `escapeHtml(s)`

不使用 `shared/io-dropzone.js`（MVP 沒有拖放檔案需求）。

## Library／API

無，純前端字串處理，不依賴第三方 library，不呼叫任何 API，全程 browser-side。
