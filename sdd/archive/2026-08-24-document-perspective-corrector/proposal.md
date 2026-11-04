# 文件照片透視校正器（document-perspective-corrector）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 17`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/document-perspective-corrector/`
- 產品目錄：`VibeCoding/Day17_document-perspective-corrector/`
- 資料層依據：`VibeCoding/shared/IMG_CONTRACT.md`（全文，特別是第 6 節 `img-perspective.js`）。
  `solveHomography()`／`warpImageData()` 由 `sdd/img-infra/` 前置工程建立並實測過數學正確性
  （4 組對應點誤差 <0.001px）與效能（4032×3024 完整反向映射 192ms），本提案假設其已就緒，
  **不重新設計、不質疑這個底層演算法**。
- 互動模式：**混合**——拖曳四角點是連續互動（不是按鈕觸發的一次性運算），但「套用校正」
  「輸出」是明確的按鈕觸發動作。理由見下方「核心設計：預覽與輸出的解析度分工」。

## 為什麼做

手機斜拍公文、白板、表格、發票、證書時，透視變形會降低閱讀與後續 OCR 品質。契約第 6 節
已經把「這題能不能做」的數學問題解決了（homography 求解與反向映射都實測過）；本題真正
要解決的是**互動問題**：使用者要即時看到拖曳角點的效果，但完整解析度的透視運算是
192ms 級的重量級運算，若拖曳過程中每次 `pointermove` 都跑一次完整運算，UI 會卡頓到
無法使用。本提案的核心就是把「即時互動回饋」與「最終輸出品質」拆成不同解析度分工。

## 核心設計：預覽與輸出的解析度分工（契約第 6 節明文要求，不可省略）

拖曳互動分三個層級，**成本遞增、觸發頻率遞減**：

### Tier 1：拖曳進行中（每個 `pointermove`）——CSS `matrix3d` 近似預覽
- 不跑任何 canvas 像素運算。每次角點移動時用 `solveHomography()` 算出 3×3 homography
  （這一步是代數運算，不是像素運算，成本可忽略），把 3×3 homography 轉換成 CSS 的
  4×4 `matrix3d(...)`（3×3 矩陣嵌入 4×4 齊次矩陣，`z` 相關項填單位值），套用在承載原圖的
  `<div>`／`<canvas>` 的 `transform` 屬性上。CSS 合成層由瀏覽器 GPU 處理，每秒可跑數十次
  不掉幀，缺點是這是**視覺近似**（CSS 3D transform 的裁切與取樣行為與真正的
  `warpImageData()` 雙線性重採樣不完全一致，邊緣可能有鋸齒或裁切差異），只用於拖曳當下
  的即時回饋，不是最終結果。
- 目的：讓使用者在拖曳當下就看到「大概會變成這樣」，不等待。

### Tier 2：拖曳停止後（debounce ~150ms，接 `shared/ui-debounce.js`）——縮小尺寸精確預覽
- 拖曳停止 150ms 後，用**縮小尺寸**的來源 canvas（長邊 800px，用
  `resizeCanvas({ maxLongEdge: 800 })` 產生，只需做一次，之後拖曳角點重複使用同一份
  縮小 canvas）跑一次真正的 `warpImageData()`。800px 長邊的像素量遠低於 4032×3024，
  單次運算預期在個位數至十幾毫秒量級（契約僅實測滿解析度 192ms，縮小版效能待實作時
  用瀏覽器實測記錄下來，不是本提案臆測的數字）。這一步取代 Tier 1 的 CSS 近似，顯示
  「真正校正後」的精確 Before/After 預覽。
- 目的：使用者放開拖曳後，看到的是接近最終結果的精確預覽，而不是 CSS 近似的視覺誤差。

### Tier 3：使用者點擊「套用／輸出」——原始解析度完整運算（僅此一次）
- 只有在使用者明確按下套用／輸出按鈕時，才對**原始解析度**的來源 canvas 跑一次完整的
  `warpImageData()`（契約實測 192ms 級，使用者點擊後等待這個時間可接受）。四個角點的
  正規化座標（0–1 比例，不是像素座標）在 Tier 1/2/3 之間共用同一份資料，只是套用到
  不同尺寸的來源 canvas 上，換算成該尺寸的實際像素座標後再解 homography。
- 目的：確保拖曳互動的流暢度不犧牲最終輸出品質——最終輸出永遠是原始解析度的精確運算，
  不是縮小版預覽直接放大充數。

**三層之間的資料流**：四角點永遠以「相對於圖片寬高的正規化座標（0–1）」儲存為唯一真相，
Tier 1/2/3 各自换算成當下畫布尺寸的像素座標使用，不會有「預覽用一套座標、輸出用另一套
座標」導致結果不一致的風險。

## 四個角點的初始位置

**決定：初始位置為圖片的四個實際角落**（左上/右上/右下/左下，對應圖片 `(0,0)`／
`(w,0)`／`(w,h)`／`(0,h)`），也就是初始 homography 為單位矩陣（不校正、視覺上與原圖
完全相同）。使用者從這個「什麼都沒做」的起點，把四個角點拖到照片中文件的實際四個角，
校正效果隨拖曳即時顯示。

**不做自動邊緣偵測**：PRD 17 的 MVP 只寫「四個可拖曳角點」，沒有要求自動抓文件邊緣。
自動邊緣偵測是遠超 MVP 範圍的電腦視覺工作（邊緣偵測、輪廓逼近、四邊形擬合，涉及大量
參數調校與失敗情境處理），本題不做，MVP 就是使用者手動拖四個點。若之後要加自動偵測，
應該是獨立提案，不在本次範圍內夾帶。

## 處理順序：旋轉 → 透視校正 → （可選）裁切 → 濾鏡

PRD 17 MVP 列了「旋轉、裁切」與「基本亮度、對比、灰階文件模式」兩組操作，需要定義順序：

1. **旋轉（90° 倍數，可選）**：發生在角點選取**之前**。手機拍攝的文件偶爾整張是躺著的
   （非 EXIF Orientation 能處理的情況，例如使用者刻意橫放拍攝），若不先轉正，四個角點
   會對著一張橫躺的圖去拖，體驗很差。旋轉一經套用，四個角點重置回新畫布的四個角落
   （因為舊的正規化座標對應的是舊方向的畫布，直接沿用會對錯位置）。
2. **透視校正（Tier 3 完整運算）**：對旋轉後的來源 canvas 執行，輸出一張「正面矩形」的
   校正結果，尺寸即為使用者拖曳範圍所定義的目標矩形（`dstQuad`，依契約第 6 節簽名，實作
   時目標矩形尺寸取來源四邊長的較大值，維持文件比例不失真）。
3. **裁切（可選）**：透視校正的目標矩形本身已經是「裁切到文件範圍」的結果（四角點定義的
   來源範圍就是裁切範圍），額外的裁切功能是給使用者在校正完成後，再微調掉例如裝訂孔、
   邊框陰影等校正後仍殘留在矩形邊緣的雜訊——這是對校正**結果**的二次裁切，不是對原圖裁切。
4. **濾鏡（亮度／對比／灰階文件模式，可選）**：**在校正（與裁切）之後套用**，理由：
   - 濾鏡是全域逐像素色彩調整（亮度加減、對比縮放、灰階轉換），在數學上與幾何變形彼此
     獨立、順序對最終結果沒有影響（不論先套用濾鏡再校正，或先校正再套濾鏡，理論上像素值
     结果相同，因為兩者都是各自獨立作用在像素上，不interfere）。
   - 但**效能上有差**：濾鏡是輕量的單次全圖掃描（遠比 `warpImageData()` 的雙線性重採樣
     便宜），若濾鏡放在校正之前，使用者每次調整亮度/對比滑桿都要重新觸發一次「校正後
     再套用」的完整流程；放在校正之後，使用者調整濾鏡參數時**只需要重跑濾鏡這個便宜的
     pass**，不必重跑角點相關的 homography／warp。滑桿即時拖動時的反應速度因此有明顯差異。
   - 因此決定：**濾鏡是校正完成後的最後一步獨立處理**，濾鏡參數調整不觸發 Tier 2/3 的
     warp 重算，只重繪已校正 canvas 的濾鏡結果。

## Before/After

依 PRD 驗收條件「四角調整後可把斜拍矩形校正成近似正面」，需要能對照原圖與校正後結果。
採用切換式（Before/After 兩個按鈕或 tab 切換同一個顯示區），不做並排雙欄（並排在窄螢幕
版面會太擠，且契約與既有題目沒有既定的並排 Before/After 元件可沿用，切換式最簡單可靠）。

## 原圖不被改動（PRD 驗收條件）

所有處理（旋轉、warp、裁切、濾鏡）都在讀入的來源 canvas 的**複本**上進行，使用者上傳
的原始 `File`／`ArrayBuffer` 不被寫入、不被修改，任何時候點擊「還原」都能回到 Tier 1
初始狀態（四角點回到圖片四角、濾鏡歸零、旋轉歸零）。

## 輸出：JPG／PNG（確定）＋ 可選單頁 PDF（**待裁示**，見下方）

JPG／PNG 走 `img-canvas.js` 的 `canvasToBlob()` 對最終合成（Tier 3 完整校正 + 裁切 +
濾鏡）後的 canvas 輸出，經 `shared/io-download.js` 觸發下載，檔名不與原檔同名。

## Level 1 共通 UI 基線（`CONTRACT.md` 第 6 節，必要任務非額外功能）

- 複製結果到剪貼簿：`shared/io-clipboard.js`（本題無適合複製的純文字內容，複製功能可退化
  為複製「處理狀態摘要」文字，例如已套用的旋轉角度／濾鏡參數，不強行湊一個沒意義的複製）。
- 下載結果檔案：`shared/io-download.js`。
- 下載本工具離線版：`buildCleanHtmlCopy()`，清空已上傳圖片、四角點狀態、旋轉／濾鏡參數、
  Before/After 顯示狀態、`#__shared_toast` 元素，移除 `.nav-back` 與站內連結。

## 大檔案門檻（`IMG_CONTRACT.md` 第 8 節，直接套用不自訂）

單檔 <=30MB 直接處理；30–80MB 顯示「處理可能需要數秒」提示後繼續；>80MB 拒絕並說明上限。
`gate` 在 `loadImageFile()` 讀檔之前執行（沿用 `img-decode.js` 介面精神，讀檔前先過
`checkImageFileSize(file.size)`）。

## 影響範圍

### 新增檔案
- `VibeCoding/Day17_document-perspective-corrector/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day17_document-perspective-corrector/src/bundle.json`
- `VibeCoding/Day17_document-perspective-corrector/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day17_document-perspective-corrector/bundle_manifest.json`（build 產物）
- `VibeCoding/Day17_document-perspective-corrector/PRD.md`（複製 PRD 17 段落內容）
- `sdd/document-perspective-corrector/proposal.md`（本檔）
- `sdd/document-perspective-corrector/tasks.md`

### 依賴、不在本題範圍內建立
- `shared/img-decode.js`／`img-canvas.js`／`img-perspective.js`／`img-file-size.js`：
  由 `sdd/img-infra/` 前置工程建立，本題直接引用其契約簽名，**不重寫透視校正的數學**。
- `shared/io-download.js`／`io-clipboard.js`／`ui-debounce.js`：既有共用模組，直接引用。

### 不修改
- `VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/IMG_CONTRACT.md`（沿用既有定案）
- `VibeCoding/README.md`、`VibeCoding/index.html`（進度表更新留待收尾階段）

### Library / API
無外部 library、無 API 呼叫，全程 browser-side。若「待裁示」的 PDF 輸出方案裁示為引入
jsPDF，才會新增一項 vendor 資產與授權記錄，屬於本待裁示項目的連帶影響，見下方。

## 待裁示

### 1. 單頁 PDF 輸出的實作方案（**必須裁示，本提案不自行決定**）

PRD 17 MVP 明列「可選單頁 PDF」，但系列目前為止**沒有任何一題產生過 PDF**，這是新的
輸出形式，有兩個方案：

**方案 A：`window.print()` + `@media print` CSS（零依賴）**
- 做法：比照 Level 1b `csv-one-page-report`（Day13）的列印做法（`sdd/archive/2026-08-24-csv-pivot-dashboard`
  下篇已驗證過 `@page { size: A4; margin: ... }`、`print-color-adjust: exact`、
  `break-inside: avoid` 這套列印 CSS 手法），把校正後的圖片放進一個專用列印版面，
  使用者點擊「下載 PDF」時觸發 `window.print()`，由使用者的瀏覽器列印對話框選擇
  「另存為 PDF」完成輸出。
- 優點：零依賴、零 vendor 資產、與既有 Level 1b 先例一致的技術路線、離線版一樣可用
  （`window.print()` 是瀏覽器原生 API，不需要打包額外程式碼）。
- 缺點：**不是真正一鍵下載**——使用者要在系統列印對話框裡手動選「另存為 PDF」再按
  儲存，多一到兩個手動步驟，且不同作業系統／瀏覽器的列印對話框操作方式不同，體驗
  不如「點擊就直接下載一個 .pdf 檔案」直覺；且對話框文案是瀏覽器原生介面，中文使用者
  介面表現依賴使用者瀏覽器語系設定，本工具無法控制。

**方案 B：引入 PDF 產生函式庫（例如 jsPDF）**
- 做法：把最終合成的圖片 canvas 嵌入 jsPDF 產生的單頁 PDF（`doc.addImage()`），提供
  真正的「點擊即下載 .pdf 檔案」體驗，不經過系統列印對話框。
- 優點：一鍵下載、體驗一致（不受使用者瀏覽器/系統列印介面影響）、輸出檔案的頁面尺寸與
  邊界完全由程式控制。
- 缺點：**打破本系列目前「零依賴」的一貫立場**（`IMG_CONTRACT.md`／`CSV_CONTRACT.md`
  多處強調手寫優於引入函式庫），需要新增 vendor 資產（jsPDF minified，約 300KB 上下）、
  記錄授權（MIT），且離線版 `buildCleanHtmlCopy()` 打包體積會明顯增加；jsPDF 是本系列
  第一個「為了單一功能新增外部函式庫」的先例，一旦開這個口子，後續其他題目引入其他
  函式庫的門檻也會跟著鬆動，需要指揮官評估這個先例是否可接受。

**本提案的立場**：不預設裁示結果，`tasks.md` 的 PDF 輸出任務先建立「使用者按下 PDF
輸出鍵」的觸發點與流程骨架，實作細節依裁示結果套用對應方案；若裁示選方案 A，可直接
沿用 Day13 的列印 CSS 手法降低重工。

### 2. 是否要拆成上下兩篇

已評估：本提案控制在 10 條任務內完成（透視校正的數學已由 `img-infra` 前置解決，本題
不需要再處理額外的大型獨立子系統，跟 `csv-pivot-dashboard` 需要「樞紐引擎」+「手寫 SVG
圖表」兩個量級相當的獨立子系統不同），**不需要拆篇**。若實作過程中發現 Tier 1/2/3
分工比預期複雜（例如 CSS matrix3d 近似的視覺誤差太大導致要多花時間調校、或縮小版
`warpImageData()` 效能不如預期需要額外優化任務），屆時再評估是否追加任務或拆篇，
不在提案階段預先假設會發生。

### 3. Tier 1 的 CSS matrix3d 近似精確度

契約只點出「用 CSS matrix3d 或縮小尺寸做近似即時預覽」是可行方向，但沒有實測 CSS
matrix3d 對真實照片四角拖曳的視覺近似程度（例如 `transform-origin`、`perspective`
屬性設定不當時常見的「近似變形跟真正 homography 對不太準」問題）。這部分待實作時
用真實照片實測記錄，若近似效果太差，可能要把 Tier 1 直接降級成「只顯示四個角點的
連線框，不做即時圖片變形」，Tier 2 的縮小版精確預覽仍然保留（只是要縮短 debounce
時間，例如從 150ms 降到更短），不影響本提案的整體分層設計。
