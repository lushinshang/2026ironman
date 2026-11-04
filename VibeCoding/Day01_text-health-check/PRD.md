# PRD 03 — 文字健檢工作台（text-health-check）

> 來源：`2026-ironman-vibecoding-30-prd.md` 第 92-123 行（PRD 03），本檔為 Day01 產品對應整理。

- **英文短名稱**：`text-health-check`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/text-health-check/`
- **互動模式**：即時（debounce 150ms）

## 為什麼做

公文、投稿、公告、報告有字數與格式要求，人工檢查很容易漏連續空白、重複標點、過長段落這類格式問題。

## 輸入

貼上文字、拖曳 TXT / MD 檔案。

## MVP

- 中文字數、英文字數、總字元數。
- 行數、段落數、中英文比例。
- 標點與空白統計。
- 連續空白、重複標點、多餘空白行偵測。
- 過長段落提示。
- 問題位置標示。
- 複製健檢摘要。

## 不做

AI 改寫、文法重寫、自動修改原文。

## Level 1 共通 UI 基線（`shared/CONTRACT.md` 第 6 節）

- 複製結果到剪貼簿（`io-clipboard.js`）
- 下載結果檔案（`io-download.js`，輸出健檢摘要 `.txt`）
- 下載本工具離線版（`buildCleanHtmlCopy()`，清空 textarea、統計摘要、問題清單，移除 `.nav-back`）

## 判定規則（`sdd/text-health-check/proposal.md` 明確定義）

- 過長段落門檻：單段（不含換行符）超過 300 字。
- 連續空白：同一行內連續 ≥2 個空白字元（半形空格、全形空格 `U+3000`、Tab 皆算，可混用）。
- 中英文比例分母：`中文字元數 / (中文字元數 + 英文單字數) * 100`，四捨五入到整數。英文單字採 `/[A-Za-z]+(?:'[A-Za-z]+)?/g` 切詞。
- 多餘空白行：連續 ≥2 行空白行（`\n\n\n` 以上）。
- 重複標點：同一字元連續出現 ≥2 次，不同標點相鄰不算。

## 驗收條件

- 情境：文字變更時統計即時更新（debounce 150ms）。
- 情境：連續空白或重複標點能指出位置（行號／段落序號，輸入區內 `<mark>` 高亮）。
- 情境：健檢操作（統計、標示、複製、下載）不會偷偷改動原始輸入內容。
- 情境：空輸入或全空白輸入，所有統計欄位為 0，不出現 `NaN`，不崩潰。
- 情境：只有標點符號的輸入，中英文字數為 0，標點統計與重複標點偵測正常運作。
- 情境：拖曳 `.txt` / `.md` 檔案，內容載入輸入區並觸發統計，不上傳到任何伺服器。
- 情境：`scripts/bundle.py` 產出的 `index.html` 斷網開啟，全部功能仍可用。
- 情境：輸入含 `<`、`>`、`&` 等 HTML 特殊字元，問題位置標示不會被當成 HTML 解析執行。
- 情境：下載本工具離線版，內容不含剛才輸入的任何文字，且不含 `.nav-back` 或站內外連連結。

## Library / 依賴

無外部 library、無 API 呼叫，全程 browser-side 原生 JS。共用模組：`shared/util-escape.js`、`shared/ui-toast.js`、`shared/ui-debounce.js`、`shared/io-download.js`、`shared/io-clipboard.js`、`shared/io-dropzone.js`（皆為 `internal / project-internal`，見 `bundle_manifest.json`）。
