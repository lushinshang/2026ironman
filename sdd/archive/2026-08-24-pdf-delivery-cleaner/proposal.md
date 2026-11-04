# PDF 送件清理器（pdf-delivery-cleaner）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 23`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/pdf-delivery-cleaner/`
- 產品目錄：`VibeCoding/Day25_pdf-delivery-cleaner/`
- 資料層依據：`VibeCoding/shared/PDF_CONTRACT.md`（全文，特別是第 4 節 `pdf-build.js`）
  由 `sdd/pdf-infra/` 前置工程建立，本提案假設其已就緒。**Metadata／Annotation／Form／
  附件／Action 的掃描與清除邏輯，契約第 2 節明文排除在前置工程之外**（只有這一題用到，
  未達共用門檻），本題自己負責這部分實作，直接操作 `@cantoo/pdf-lib` 的
  `PDFDocument.catalog`／`context` 底層物件存取 API，不透過 `pdf-build.js` 的高階封裝函式
  （那些函式是為 Day21/22/23/24 的頁面級操作設計的，不是為物件級掃描設計）
- 互動模式：**按鈕觸發**（掃描與清除都是明確的一次性動作，比照 Day15 EXIF 清除的模式，
  不做即時 debounce）

## 為什麼做

PDF 送出前常帶著使用者沒意識到的物件：文件 Metadata（作者、公司、軟體版本、修改
歷程）、指向內部系統的 URL/mailto 連結、審閱留下的 Comment、忘記移除的表單欄位、
夾帶的附件檔案，極端情況下甚至有 JavaScript Action。這些東西不會出現在 PDF 檢視器
的正常畫面上，肉眼看不出來，但用文字編輯器打開或用專業工具檢查就會發現。

本題的核心原則跟 Day15（`exif-privacy-cleaner`）一致：**先掃描、後清理，讓使用者
自己決定要不要清**，不是上傳就靜默清空。

## 技術可行性判斷：類別級選擇性清除是否可行

PRD MVP 寫「使用者逐類勾選清除」，字面上要求**類別級**選擇性清除（例如「只清 Metadata，
保留 Comment」）。Day15 遇過字面規格與底層機制衝突的先例（JPEG EXIF/XMP 綁在同一個
APP1 segment，做不到欄位級選擇，見 `sdd/LEVEL1C_RULINGS.md` 裁示 1）——本題先查證
是否有同樣的落差，不能照抄 Day15 的結論。

**判斷：PDF 物件模型跟 JPEG APP1 segment 結構不同，類別級選擇性清除技術上可行**：

| 類別 | PDF 物件位置 | 移除方式 |
|---|---|---|
| Metadata | 文件目錄 `/Info` 字典（Title/Author/Producer 等）＋（若存在）`/Metadata` XMP 串流 | 個別清空 `/Info` 各欄位字串；刪除 `/Metadata` 物件參照 |
| Link Annotation（URL/mailto） | 各頁 `/Annots` 陣列中 `Subtype = /Link` 的項目 | 依 Subtype 過濾後從 `/Annots` 陣列移除該項目 |
| Comment/Annotation | 各頁 `/Annots` 陣列中 `Subtype` 為 `/Text`／`/FreeText`／`/Popup` 等非 Link、非 Widget 的項目 | 同上，依 Subtype 過濾移除 |
| Form | 文件目錄 `/AcroForm` 字典＋各頁 `/Annots` 中 `Subtype = /Widget` 的欄位 | 刪除 `/AcroForm` 參照；移除對應 Widget annotation |
| 附件 | 文件目錄 `/Names/EmbeddedFiles` 名稱樹 | 清空該名稱樹或移除個別項目 |
| Action/JavaScript | 文件目錄 `/OpenAction`／`/AA`；`/Names/JavaScript` 名稱樹 | 刪除對應參照（見下方待裁示，偵測能力視 library 支援程度而定） |

以上六類在 PDF 規格裡本來就是各自獨立的物件／字典／陣列項目，**移除其中一類不需要
連帶動到其他類別**——跟 JPEG 把 EXIF 與 XMP 綁在同一段二進位 blob 裡（移除必須整段
拿掉）是完全不同的資料結構。因此本題**不需要**像 Day15 那樣把「勾選」降級為
「分類展示與確認清單」，PRD 字面規格可以照實作。

（Link Annotation 與 Comment/Annotation 在 PDF 規格裡同屬 `/Annots` 陣列、只是
`Subtype` 不同，屬於實作時依 Subtype 過濾的技術細節，不是需要裁示的規格衝突。）

## 要改什麼

### 使用者流程

1. 上傳單一 PDF（拖放或選取）→ 過 `checkPdfFileSize()` 閘門（契約第 5 節）。
2. 「掃描」：讀取上傳 PDF 的物件結構，逐類列出偵測結果（見下方各類別掃描邏輯），
   每類顯示數量與清單（Metadata 顯示欄位值本身；Annotation/Form/附件顯示筆數與
   摘要，如連結網址、附件檔名；Action 類別依「待裁示 1」處理）。
3. 沒有任何可清理項目時，整頁顯示「掃描完成，未偵測到需要清理的項目」，不顯示空的
   勾選清單（對應 PRD 驗收條件「沒有可清理項目時顯示明確結果」）。
4. 使用者逐類勾選要清除的項目（類別層級勾選，例如「清除全部 Metadata」，不做單一
   欄位或單一 Annotation 逐項勾選——PRD 用詞是「逐類」不是「逐項」，此解讀不需要
   裁示）。
5. 點擊「清理」才真正執行移除，只動使用者勾選的類別，其餘類別的物件原樣保留
   （對應驗收條件「只選 Metadata 時不順便移除其他物件」）。
6. 清理完成後，重新掃描一次輸出 PDF（呼叫步驟 2 同一套掃描邏輯），並排顯示
   「清理前 vs 清理後」每類別的數量對照，已勾選清除的類別清理後數量應為 0
   （對應驗收條件「輸出後重新掃描，已選清除項目應消失」）。
7. 下載：輸出檔名固定為 `clean-for-delivery.pdf`（PRD 明文規定的檔名）。

### Level 1 共通 UI 基線（`CONTRACT.md` 第 6 節，必要任務非額外功能）

- 複製結果到剪貼簿：`shared/io-clipboard.js`（複製掃描摘要文字）。
- 下載結果檔案：`shared/io-download.js`。
- 下載本工具離線版：自行實作 `buildCleanHtmlCopy()`，清空已上傳 PDF、掃描結果、
  勾選狀態、清理前後對照表、`#__shared_toast` 元素，移除 `.nav-back` 與站內連結。

### 明確不做（PRD「不做」章節 + 本提案補充邊界）

- 不保證清除所有 PDF 物件（掃描邏輯只涵蓋 PRD 列出的六類，PDF 規格裡還有其他物件
  類型如 Digital Signature、Optional Content Group 等不在掃描範圍）。
- 不移除第三方版權保護（DRM／加密不在本題範圍，那是 Day23 `pdf-password-manager`
  的職責）。
- 不做 Rasterize/Flatten（那是 Day24 `pdf-secure-redactor` 的職責，本題只做物件級
  移除，不改動頁面視覺內容）。

## 影響範圍

### 新增檔案
- `VibeCoding/Day25_pdf-delivery-cleaner/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day25_pdf-delivery-cleaner/src/bundle.json`
- `VibeCoding/Day25_pdf-delivery-cleaner/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day25_pdf-delivery-cleaner/bundle_manifest.json`（build 產物）
- `VibeCoding/Day25_pdf-delivery-cleaner/PRD.md`（複製 PRD 23 段落內容）
- `sdd/pdf-delivery-cleaner/proposal.md`（本檔）
- `sdd/pdf-delivery-cleaner/tasks.md`

### 依賴、不在本題範圍內建立
- `shared/pdf-build.js`（提供底層 `@cantoo/pdf-lib` 存取，本題直接用其 `PDFDocument`
  物件做物件級操作）、`shared/pdf-file-size.js`：由 `sdd/pdf-infra/` 前置工程建立。
- 六類掃描/清除邏輯本身：**本題自己的範圍**，不進前置工程（契約第 2 節已明文排除）。

## ASCII Wireframe

```
+--------------------------------------------------+
|  PDF 送件清理器                         [返回列表] |
+--------------------------------------------------+
|  [拖放或選取 PDF 檔案]                             |
+--------------------------------------------------+
|  掃描結果（清理前）                                |
|  ☐ Metadata（3 個欄位：Author/Producer/Title）      |
|     Author: 王小明   Producer: Word   Title: 報告   |
|  ☐ 連結 Annotation（2 個）                          |
|     - https://internal.example.com/doc/123        |
|     - mailto:someone@example.com                  |
|  ☐ 註解/Comment（1 個）                             |
|     - "這段要再確認" (p.3)                          |
|  ☐ 表單欄位（0 個）— 未偵測到                        |
|  ☐ 附件（1 個）                                     |
|     - 原始資料.xlsx                                |
|  ☐ Action/JavaScript（待裁示：偵測能力視情況顯示）    |
|                                                    |
|  [全選]  [清理已勾選項目]                           |
+--------------------------------------------------+
|  清理前 vs 清理後對照                               |
|  類別          清理前   清理後                     |
|  Metadata        3        0                       |
|  連結 Annotation  2        2  (未勾選，保留)         |
|  ...                                              |
+--------------------------------------------------+
|  [下載 clean-for-delivery.pdf]  [複製摘要]          |
|  [下載本工具離線版]                                 |
+--------------------------------------------------+
```

## 待裁示

以下規格未定義之處，交由指揮官裁示，本提案不自行定案：

### 1. Action/JavaScript 類別偵測不到時的 UI 呈現

PRD 寫「Library 支援時列出 Document/JavaScript Actions」，暗示這是有條件的功能——
`@cantoo/pdf-lib`（`pdf-build.js` 底層）對 `/OpenAction`／`/AA`／`/Names/JavaScript`
的讀取支援程度需要在實作時實測才能確定（不是提案階段能查證的細節，屬於實作任務）。
需要裁示：若實測後發現這個 library 讀不到（或只能讀到部分）Action 相關物件，UI 上
要怎麼呈現？
- (a) 直接不顯示這個分類（假裝它不存在）
- (b) 顯示分類但註明「本工具無法完整偵測此類物件，建議另用專業工具確認送出前無殘留
  Action」（誠實揭露限制，不做過度承諾）

本提案傾向 (b)，理由是 PDF 送件清理器的定位是資安/隱私工具，隱瞞已知的偵測盲區
比誠實揭露風險更高（比照 CSV/Level 1c 一貫的誠實原則），但技術上能偵測到什麼程度
要等實作階段實測後才知道，此刻無法確定要呈現哪個版本，故待裁示。

**裁示：見 `LEVEL1D_RULINGS.md` 第 16 條**——採選項 (b)，顯示分類但誠實註明
「本工具無法完整偵測此類物件，建議另用專業工具確認送出前無殘留 Action」。

### 2. 附件掃描的顯示深度

PRD 只寫「列出附件」，沒說要顯示到什麼程度。需要裁示：
- (a) 只顯示附件檔名與大小（不解析附件內容）
- (b) 額外顯示附件的 MIME type／內嵌時間等 metadata（若 `@cantoo/pdf-lib` 讀得到）
- (c) 提供下載/預覽附件內容的功能

本提案傾向 (a)（最小化範圍，附件本身的內容清理不是這題的 MVP，只是要讓使用者知道
「這份 PDF 裡藏了一個檔案」），但 (a) vs (b) 差異不大，待裁示確認範圍。是否要做
(c)（下載/預覽）與 PRD「列出附件」的字面範圍有明顯落差，傾向不做，但一併列出讓
指揮官確認。

**裁示：見 `LEVEL1D_RULINGS.md` 第 17 條**——採選項 (a)，只顯示附件檔名與大小，
不做 (b) 額外 metadata，也不做 (c) 下載／預覽。
