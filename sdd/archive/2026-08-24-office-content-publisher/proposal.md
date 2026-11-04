# 提案：Office Content Publisher（Day26）

> 對應 PRD 07（`2026-ironman-vibecoding-30-prd.md` 213–239 行）。
> 這題不碰 PDF，不依賴 `PDF_CONTRACT.md`／`pdf-infra`——README 路線圖把它排在
> Level 1d 只是題號順序安排，技術上跟前面七題的 PDF 資料層無關。

## 為什麼做

Markdown、TXT、CSV 要放到 HackMD、GitHub 或正式網頁時，常需要重新轉格式。使用者想要
「貼上內容 → 直接拿到乾淨的 HTML 或 Markdown Table」，不想開 Office 軟體另存或手動改標籤。

## 要改什麼

- 建立 `Day26_office-content-publisher/src/index.html`：左側輸入（Markdown/TXT 貼上區、
  或 CSV 上傳），右側即時預覽；輸出區提供 Copy Markdown／Copy HTML／下載單一 HTML 三種
  管道。
- Markdown/TXT → HTML：即時預覽 + 轉換為離線可用的單一 HTML（含基本樣式）。
- CSV → Markdown Table／HTML Table：**複用 Level 1b 既有的 `shared/csv-decode.js`
  （`decodeCsvBytes()`／`checkCsvFileSize()`）與 `shared/csv-parse.js`
  （`parseCsv()`）**，不重寫 CSV 解析邏輯——這是 README 標註的新技術點「複用 Day08
  parser」的具體所指。`csv-types.js` 的型別推斷（`inferColumnTypes()`）視待裁示 3
  的結果決定要不要用。
- 提供欄位選擇（勾選要輸出的欄）與排序（依現有欄位值排序後再輸出），套用在
  `parseCsv()` 回傳的 `Table` 資料結構上，不修改 `csv-parse.js` 本身。
- 至少一種乾淨列印模板（供「輸出單一 HTML」使用，待裁示 2）。
- 套用 `shared/base.css`、三個共通按鈕（`CONTRACT.md` 第 6 節基線）、
  `buildCleanHtmlCopy()`。

## 裁示結果（見 `sdd/LEVEL1D_RULINGS.md`，本提案原「待裁示」段落保留供脈絡參考）

### 待裁示 1：Markdown→HTML 轉換要引入外部 library 還是手寫簡化版 parser

**裁示：見 `LEVEL1D_RULINGS.md` 第 18 條——方案 B，手寫簡化版 parser 定案**，
不引入 `marked` 或同類 library。語法子集固定為：標題 `#`–`######`、粗體 `**`、
斜體 `*`、無序／有序清單、連結 `[text](url)`、code fence。實作時需在畫面文案上
明確告知使用者這是簡化版語法子集，不是完整 CommonMark 實作。

專案目前 `shared/` 底下沒有任何 Markdown parser（已確認：`base.css`／`CONTRACT.md`／
`CSV_CONTRACT.md`／`csv-*.js`／`img-*.js`／`io-*.js`／`ui-*.js`／`util-escape.js`／
`PDF_CONTRACT.md`／`vendor/`，皆與 Markdown 無關），這是這題獨有的新技術點，需要
從頭決定。

- **方案 A：引入輕量 Markdown library（例如 `marked`，MIT 授權）**
  - 優點：CommonMark 相容度高，table／巢狀清單／程式碼區塊等邊界情況不用自己處理，
    開發時間短、風險低。
  - 缺點：需要走 `bundle.py` 的 vendor 資產流程（下載固定版本、記錄 SHA-256），
    library 本體會讓輸出 HTML 增加數十 KB。
- **方案 B：手寫簡化版 parser，只支援 PRD 實際需要的語法子集**（標題 `#`–`######`、
  粗體 `**`、斜體 `*`、無序／有序清單、連結 `[text](url)`、code fence）
  - 優點：零依賴、零授權疑慮、輸出檔案最小、與專案「手寫優先，第三方 library 需明確
    理由」的既有慣例一致（`IMG_CONTRACT.md`／`img-exif.js`／`img-perspective.js`
    都是這個方向）。
  - 缺點：不追求完整 CommonMark 相容，遇到巢狀結構（例如清單內夾 code block）或
    使用者貼上邊界語法（HTML 混寫、reference-style link）容易出現與標準 Markdown
    渲染器不一致的結果，需要在文案上明確告知使用者這是「簡化版」，不是完整
    Markdown 實作。

**指揮官暫定建議：方案 B**。理由：這題 MVP 明確排除「AI 內容生成」等進階需求，
且 PRD 場景是「HackMD、GitHub 或正式網頁」——這些目標平台本身就有各自的 Markdown
渲染器，本工具的角色是「快速轉出一份能用的 HTML／Table」，不是要取代完整
Markdown 生態；跟專案至今手寫優先的技術路線（EXIF／透視校正／CSV parser 皆手寫）
一致。但這是主觀判斷，**請使用者明確裁示**，不因為建議寫在這裡就視為定案。

### 待裁示 2：「至少一種乾淨列印模板」要不要複用 Day13／Day18 已有的列印 CSS

**裁示：見 `LEVEL1D_RULINGS.md` 第 19 條——選 (C) 定案**，列印 CSS 正式升級為
`shared/print.css`（Day13／Day18／Day26 三題出現，達到共用門檻）。

**這件事不是本題（Day26）的任務範圍**：`shared/print.css` 的建立、從 Day13／Day18
既有程式碼抽取共通部分、以及這兩個既有產品的回頭修改／重新 bundle／視覺比對，
是獨立的小型前置工程 `sdd/print-infra/`，比照 `sdd/pdf-infra/` 對 Day19–25 的角色，
必須在 Day26 開工前完成。**Day26 自己只需要在 `<style>` 內引用（逐字複製）已經
存在的 `shared/print.css` 內容**——依 `bundle.py` 現況（見下方「影響範圍」的技術
澄清），`base.css` 的內嵌方式是「逐字複製貼進各題 `src/index.html` 的 `<style>`
區塊」，不是透過 `bundle.py` 的 `SHARED:` placeholder 自動內嵌（`resolve_shared()`
硬編碼只解析 `.js` 副檔名，沒有 CSS 支援）。`shared/print.css` 沿用這個既有慣例，
不需要修改 `bundle.py`。

### 待裁示 3：CSV 欄位選擇／排序的 UI 型態

**裁示：見 `LEVEL1D_RULINGS.md` 第 20 條——定案**：簡單勾選框列表（選要輸出的欄）
+ 下拉選單選排序欄位／方向（升冪/降冪），不做表格標頭直接點擊排序、不做可拖曳
排序的欄位選擇清單。排序邏輯**採用 `csv-types.js` 的 `inferColumnTypes()` 做
型別感知排序**（數字欄位當數字排序、非數字欄位當字串排序），複用 Day08
（`csv-doctor`）已驗證的能力，不重寫。

## 影響範圍

**新增檔案**：`Day26_office-content-publisher/src/index.html`、`PRD.md`、
`article_draft.md`（後續階段）。

**不修改任何既有 `shared/` 模組**——複用 `csv-decode.js`／`csv-parse.js`／
`csv-types.js` 是只讀引用，不擴充介面。裁示 1 定案方案 B（手寫），**不新增任何
vendor 資產**。裁示 2 定案 (C)，但 `shared/print.css` 的建立與 `CONTRACT.md`
記錄新模組屬於 `sdd/print-infra/` 前置工程的範圍，不在本題（Day26）之內——
本題只在 `src/index.html` 的 `<style>` 內逐字複製 `shared/print.css` 的內容
（比照 `base.css` 現有的內嵌慣例，`bundle.py` 的 `SHARED:` placeholder 目前
只解析 `.js` 副檔名，沒有 CSS 自動內嵌機制，這不是本題要解決的技術缺口）。

## 版面草圖（ASCII wireframe）

```
+--------------------------------------------------------------+
| Office Content Publisher                    [返回列表]       |
+--------------------------------------------------------------+
| [Markdown/TXT] [CSV]  <- 分頁切換輸入模式                     |
+----------------------------+-----------------------------------+
| 輸入區                      | 即時預覽區                        |
| (textarea 貼上 Markdown/TXT | (渲染後的 HTML 畫面，              |
|  或拖放/選取 CSV 檔)         |  CSV 模式顯示 Table +              |
|                              |  欄位勾選框 + 排序控制)            |
|                              |                                    |
+----------------------------+-----------------------------------+
| [Copy Markdown] [Copy HTML] [下載單一 HTML]  [下載本工具離線版] |
+--------------------------------------------------------------+
```
