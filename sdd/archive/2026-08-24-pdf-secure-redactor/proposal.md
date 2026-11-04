# PDF 安全遮蔽 / Flatten（pdf-secure-redactor）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 21`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/pdf-secure-redactor/`
- 產品目錄：`VibeCoding/Day24_pdf-secure-redactor/`
- 資料層依據：`VibeCoding/shared/PDF_CONTRACT.md`（全文，特別是第 3 節 `pdf-decode.js`
  的 `renderPageToCanvas()`／`extractPageText()`、第 4 節 `pdf-build.js` 的頁面組裝與
  圖片嵌入）；三個模組由 `sdd/pdf-infra/` 前置工程建立，本提案假設其已就緒，不重複建立
- 互動模式：按鈕／滑鼠操作觸發（框選、套用遮蔽、輸出皆為離散動作）

## 為什麼做

在 PDF 上畫黑框（不論是疊 Annotation 還是用其他 PDF 編輯軟體的「遮蔽」工具）不代表底層
文字物件真的消失——很多常見做法只是在頁面上疊一層視覺元素，PDF 內部的文字流仍然完整
保留，收件人只要移除 Annotation、或用文字擷取工具（甚至瀏覽器的「另存文字」）就能拿到
原始內容。本題要解決的是「遮蔽必須讓底層資料真的不存在」，跟 Level 1c 的
`screenshot-sanitizer`（Day16，`sdd/screenshot-sanitizer/`）是同一類問題的不同載體：
Day16 是「螢幕截圖的遮蔽必須燒進像素，不能只是疊圖層」，本題是「PDF 頁面的遮蔽必須讓
文字物件消失，不能只是疊 Annotation」。技術手段不同（Day16 用 Canvas ImageData 覆寫，
本題用整頁 Rasterize 成圖片再重新嵌入 PDF），但驗收精神完全一樣：**遮蔽後底層資料真的
不存在，不是視覺上看不到而已**。

## 要改什麼

### 核心設計：只 Rasterize 有框選的頁面，其餘頁面原樣保留

PRD 驗收條件「未指定遮蔽的頁面依設定保持原狀」意味著輸出 PDF 是**混合結構**：
- 沒有任何框選區域的頁面：直接從原始 PDF 複製頁面物件（`@cantoo/pdf-lib` 的
  `copyPages()`），文字層與向量內容完全保留，不做任何轉換。
- 有至少一個框選區域的頁面：整頁 Rasterize——呼叫 `renderPageToCanvas()` 取得該頁畫面，
  在 canvas 上對每個框選區域 `fillRect()` 填滿遮蔽色，再用 `canvasToBlob()` 輸出成
  PNG，透過 `pdf-lib` 的 `embedPng()` 嵌入一個與原頁面同尺寸的新頁面，取代原本的向量頁面。

這個設計直接滿足三條 PRD 驗收條件：
- 「遮蔽結果不能藉由移除 Annotation 恢復」：整個實作**完全不使用 PDF Annotation**，
  遮蔽是燒進 Rasterize 後的圖片像素，沒有 Annotation 物件可移除。
- 「被 Rasterize 的敏感文字不得仍可直接複製」：頁面被整頁換成一張圖片，該頁沒有文字
  物件，`extractPageText()` 對該頁回傳空字串（見下方驗收方法）。
- 「未指定遮蔽的頁面依設定保持原狀」：沒被框選的頁面走 `copyPages()`，文字層原樣保留。

### 驗收方法：哨兵測試——用程式化文字擷取驗證「真的擷取不到」，不是「看起來蓋住」

比照 Day16 建立的「驗證不能只看視覺」原則，本題的核心驗收不能只靠肉眼看輸出 PDF 是否
出現黑色色塊，必須用 `pdf-decode.js` 的 `extractPageText()` 對輸出 PDF 的被遮蔽頁重新
擷取文字，確認**該頁擷取結果不含被遮蔽前的原始敏感文字**（理想情況下該頁擷取結果為
空字串，因為整頁已經是圖片，沒有文字層）。測試素材使用一份含有明確可辨識敏感格式假資料
（例如身分證字號格式的合成測試資料，非真實個資）的真實 PDF，遮蔽前先用
`extractPageText()` 確認這筆假資料**擷取得到**（證明測試素材本身有文字層，不是空殼
測試），遮蔽後再擷取一次確認**擷取不到**——這是正向哨兵＋負向哨兵的雙重驗證。

### 遮蔽色與多區域

`fillRect()` 支援任意顏色（PRD「黑色或指定遮蔽色」），預設黑色；同一頁可框選多個矩形
區域，`redactBoxes: Array<{pageIndex, x, y, w, h, color}>`（座標系採頁面實際像素座標，
比照 Day16 的座標換算慣例，畫面框選的顯示座標需換算成 `renderPageToCanvas()` 輸出的
canvas 實際像素座標）。

### UI：顯示哪些頁被 Rasterize

PRD 明文要求「顯示哪些頁被 Rasterize」，畫面上針對每一頁顯示標籤（例如「第 3 頁：
已轉換為圖片（不可還原文字）」vs「第 5 頁：原樣保留」），讓使用者在下載前就清楚知道
輸出檔案的頁面組成，不是下載後才發現。

## 影響範圍

### 新增檔案
- `VibeCoding/Day24_pdf-secure-redactor/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day24_pdf-secure-redactor/src/bundle.json`
- `VibeCoding/Day24_pdf-secure-redactor/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day24_pdf-secure-redactor/bundle_manifest.json`（build 產物）
- `VibeCoding/Day24_pdf-secure-redactor/PRD.md`（複製 PRD 21 段落內容）
- `sdd/pdf-secure-redactor/proposal.md`（本檔）
- `sdd/pdf-secure-redactor/tasks.md`

### 依賴、不在本題範圍內建立
- `shared/pdf-decode.js`（`loadPdfFile()`／`renderPageToCanvas()`／`extractPageText()`）、
  `shared/pdf-build.js`（`copyPages()`／`embedPng()`／頁面組裝）、
  `shared/pdf-file-size.js`：由 `sdd/pdf-infra/` 前置工程建立，本題只呼叫既有介面，不
  重寫底層邏輯。**本題不需要 `embedCjkFont()`**（不在頁面上畫文字，只是嵌入圖片）。

### 不修改
- `VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/PDF_CONTRACT.md`（沿用既有定案）
- Level 1a/1b/1c 其他既有題目

### Library / API
無新增外部 library，沿用 `pdf-infra` 前置工程已引入的 `pdf.js`／`@cantoo/pdf-lib`。

## 待裁示

1. **Rasterize 輸出畫質（DPI／`renderPageToCanvas()` 的 `scale` 參數）**：畫質越高，
   遮蔽區域邊緣越乾淨，但輸出 PDF 檔案也越大（每個被 Rasterize 的頁面從向量內容變成
   點陣圖片，檔案通常會顯著變大）。本提案暫定 `scale: 2`（比照契約預設的
   `renderPageToCanvas()` 用途「高解析度輸出」），但沒有實測依據，**待使用者確認這個
   畫質／檔案大小的取捨是否可接受**，或是否要做成 UI 可選項（例如「標準／高畫質」
   兩檔）。
   **裁示：見 `LEVEL1D_RULINGS.md` 第 13 條**——固定 `scale: 2`，不做 UI 可選項，
   畫質與檔案大小的取捨已在裁示時知情接受。
2. **框選區域形狀是否僅限矩形**：PRD 只說「框選多個敏感區域」，未提及形狀限制。本提案
   沿用 Day16 的既有裁示結果（矩形，最常見情境、資料結構最簡單），**待使用者確認是否
   比照沿用**，不重新開一次形狀選型的討論。
   **裁示：見 `LEVEL1D_RULINGS.md` 第 14 條**——採暫定，矩形限定，沿用 Day16。
3. **是否提供「還原」機制（移除某個已加入的框選區域，尚未輸出前）**：PRD MVP 清單未
   明文要求，本提案傾向做（框選是使用者互動流程中很自然會後悔的操作，不提供會體驗
   很差），**待使用者確認**，若不做則可省一條任務。
   **裁示：見 `LEVEL1D_RULINGS.md` 第 15 條**——採暫定，要做，對應 `tasks.md` 任務 3
   （已存在，非新增）。
