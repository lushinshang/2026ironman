# Screenshot Privacy Sanitizer（screenshot-sanitizer）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 15`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/screenshot-sanitizer/`
- 產品目錄：`VibeCoding/Day16_screenshot-sanitizer/`
- 資料層依據：`VibeCoding/shared/IMG_CONTRACT.md`（全文，特別是第 5 節 `img-exif.js` 與第 9 節
  `pasteImageFromClipboard()`）；`img-decode.js`／`img-canvas.js`／`img-exif.js`／
  `img-file-size.js`／`io-clipboard.js` 擴充由 `sdd/img-infra/` 前置工程建立，本提案假設其已
  就緒，不重複建立
- 互動模式：按鈕／滑鼠操作觸發（框選、套用遮蔽、Undo/Redo、匯出皆為離散動作，非即時 debounce
  可套用的場景）

## 為什麼做

截圖寄給外部前，姓名、帳號、Email、IP、QR Code 等敏感資訊容易漏掉；就算使用者記得手動打馬賽克，
常見做法（在截圖軟體疊一層色塊、或用簡報軟體畫矩形蓋住再存檔）很多情況下沒有真的把底下的原始
像素銷毀——只要原圖被保留或工具只是疊圖層，資訊仍可能被還原。本題要解決的是「遮蔽必須真的
不可逆」，不是「畫面上看起來蓋住了」。

## 要改什麼

### 核心設計：遮蔽要燒進像素，同時要能 Undo/Redo

PRD 15 驗收條件明文：「遮蔽必須寫入最終像素，不只是 UI Overlay」，且「下載後重新開啟仍保持
遮蔽」。這兩條合起來代表遮蔽動作不能用一層可以被移除的 DOM/CSS 元素疊在圖片上——那種做法
`view-source` 或 DevTools 就能拿掉，重新開啟下載的圖片時如果遮蔽只是「疊圖層」而不是「圖片
本身的像素」，就不成立。

同時 PRD 也要求 Undo/Redo，如果遮蔽一畫上去就直接毀掉底層像素、無法復原，Undo 就做不到。
兩個需求（「燒進像素」與「可撤銷」）表面上互斥，解法是**操作紀錄 + 每次從乾淨底圖重繪**：

- **`cleanCanvas`**：`loadImageFile()` 回傳、已依 EXIF Orientation 轉正、**從未被遮蔽動作
  碰過**的 canvas，全程唯讀，只在使用者上傳/貼上新圖片時整個換掉，其餘任何操作都不修改它。
- **`maskOps: Array<{ type, x, y, w, h }>`**：已套用的遮蔽操作陣列，依套用順序排列。
  `type` 為 `'box'`（黑箱）／`'pixelate'`（馬賽克）／`'blur'`（模糊）三選一，`x/y/w/h` 是
  框選區域在原圖座標系（非畫面顯示縮放後座標）的位置與尺寸。
- **`redoStack: Array<...>`**：與 `maskOps` 同型別，存放被 Undo 移除、尚可 Redo 回來的操作。
- **`workCanvas`**：畫面實際顯示與最終輸出用的 canvas。**每次 `maskOps` 有異動（新增操作／
  Undo／Redo）就整個重繪一次**：先把 `cleanCanvas` 完整 `drawImage()` 複製到 `workCanvas`
  （蓋掉上一輪殘留的遮蔽像素），再依序把 `maskOps` 陣列裡的每個操作，對 `workCanvas` 的對應
  區域**直接改寫像素**（黑箱：`fillRect`；馬賽克／模糊：見下方演算法），依序疊加。

這個設計下：
- **新增操作**：把新操作 push 進 `maskOps`，`redoStack` 清空（標準 Undo/Redo 慣例，
  Undo 後若做了新操作，原本能 Redo 的分支就作廢），重繪。
- **Undo**：`maskOps.pop()` 移到 `redoStack`，重繪（回到少一個操作的乾淨重繪結果，不是
  「把最後一個操作的像素改回去」，因為那樣做不到——馬賽克/模糊是破壞性運算，無法逆運算
  還原原始像素，只能整個重來）。
- **Redo**：`redoStack.pop()` 移回 `maskOps` 尾端，重繪。
- **最終輸出**：使用者按下「匯出」時，直接對當前的 `workCanvas` 呼叫 `canvasToBlob()`——
  此時 `workCanvas` 已經是把全部 `maskOps` 依序畫上去的結果，`toBlob()` 產出的圖片資料
  裡遮蔽區域就是新的像素值，不含任何可還原原圖的資訊，滿足「燒進像素」與「下載後重新開啟
  仍保持遮蔽」兩條驗收條件。

這個結構的關鍵好處：**Undo/Redo 永遠是「换一份操作陣列 + 重繪」，而不是「嘗試撤銷某種破壞性
運算」**——馬賽克、模糊都是有損運算（原始像素資訊已經被平均掉/降採樣掉，無法逆運算精確還原），
唯一能保證正確復原的方式就是「回到乾淨底圖，重新照著操作陣列的紀錄畫一次」，不是「反向運算
最後一步」。

### 三種遮蔽演算法（黑箱／Pixelate／Blur，PRD 要求至少兩種，本題三種都做）

對 `workCanvas` 的 `ctx.getImageData(x, y, w, h)` 取出遮蔽區域，運算後 `putImageData()` 寫回：

- **黑箱**：`ctx.fillRect(x, y, w, h)`，純色填滿（純黑或使用者可選色），最簡單也最徹底
  （完全捨棄原始像素資訊）。
- **Pixelate（馬賽克）**：把 `w × h` 區域切成 `N × N` 的格子（`N` 為使用者可調的區塊大小，
  預設如 10px），每格內所有像素的 RGB 平均後填成單一色塊。實作上用 `getImageData` 取值、
  逐格算平均、逐格填色寫回同一個 `ImageData`，再 `putImageData()`；不使用「先縮小畫布再放大」
  的取巧做法（那種做法在某些瀏覽器的縮放演算法下區塊邊界會模糊，不是乾淨的色塊馬賽克）。
- **Blur（模糊）**：對區域套用簡單 box blur（每個像素取以自己為中心 `k × k` 鄰域的平均值，
  `k` 可調），純 JS 手寫（不依賴 CSS `filter: blur()`——CSS filter 是渲染層效果，套用在
  `<canvas>` 元素本身會被畫面顯示效果混淆，且無法保證 `toBlob()` 匯出時真的把模糊結果
  燒進去；本題需要的是「改變 `ImageData` 的實際像素值」，必須手動運算後 `putImageData()`）。

### 剪貼簿貼圖與清除 Metadata：直接呼叫 img-infra，不重寫

- **剪貼簿貼圖**：呼叫契約第 9 節的 `pasteImageFromClipboard()`，取得 `Blob|null`；`null`
  時提示「剪貼簿沒有圖片內容」，不重寫 `navigator.clipboard.read()` 邏輯。取得 Blob 後走
  跟檔案上傳同一條處理路徑（`loadImageFile()` → 建立新的 `cleanCanvas`，`maskOps`／
  `redoStack` 清空）。
- **清除 Metadata**：PRD 15 只要求「清除」，不要求「顯示」EXIF 資訊（跟 Day15
  `exif-privacy-cleaner` 不同），所以本題**不呼叫 `readExifTags()`**，只在最終輸出前呼叫
  `stripMetadataSegments(arrayBuffer)`：`workCanvas.toBlob()` 產出的 Blob 讀成
  `ArrayBuffer`，跑 `stripMetadataSegments()` 移除 APP1 segment 後，用回傳的 `ArrayBuffer`
  組成最終要下載的 Blob。（`canvas.toBlob()` 重新編碼時本來就大機率不會保留原始 EXIF，
  但 PRD 明文要求「清除 Metadata」是驗收條件之一，本題明確走一次 `stripMetadataSegments()`
  是為了保證這件事「一定發生」，不是賭 canvas 重編碼的副作用。）

### Before/After

畫面提供切換／並排顯示 `cleanCanvas`（Before，原圖未遮蔽）與 `workCanvas`（After，套用全部
`maskOps` 後的當前結果）。Before 顯示僅供比對用途，**不提供「下載 Before 原圖」的功能**——
避免使用者不小心把未遮蔽的原圖傳出去，跟本題「防止敏感資訊外洩」的產品目的矛盾。

### 座標系換算

框選在畫面上的滑鼠座標是「顯示尺寸」（`workCanvas` 可能被 CSS 縮放顯示，例如大圖縮小塞進
版面），需要換算成 canvas 實際像素座標（`canvas.width / canvas.height` 對 CSS 顯示尺寸的
比例）後才能存進 `maskOps`，否則遮蔽區域跟使用者框選的位置對不上、或在高解析度圖片上遮蔽
區域太小蓋不住敏感資訊。

## 影響範圍

### 新增檔案
- `VibeCoding/Day16_screenshot-sanitizer/src/index.html`（模板，含 placeholder）
- `VibeCoding/Day16_screenshot-sanitizer/src/bundle.json`
- `VibeCoding/Day16_screenshot-sanitizer/index.html`（build 產物，版控追蹤）
- `VibeCoding/Day16_screenshot-sanitizer/bundle_manifest.json`（build 產物）
- `VibeCoding/Day16_screenshot-sanitizer/PRD.md`（複製 PRD 15 段落內容）
- `sdd/screenshot-sanitizer/proposal.md`（本檔）
- `sdd/screenshot-sanitizer/tasks.md`

### 依賴、不在本題範圍內建立
- `shared/img-decode.js`／`img-canvas.js`／`img-exif.js`／`img-file-size.js`：由
  `sdd/img-infra/` 前置工程建立，本題只呼叫 `loadImageFile()`／`canvasToBlob()`／
  `stripMetadataSegments()`／`checkImageFileSize()`，不重寫底層邏輯。
- `shared/io-clipboard.js` 的 `pasteImageFromClipboard()`：同上，由 `img-infra` 擴充建立。

### 不修改
- `VibeCoding/shared/CONTRACT.md`、`VibeCoding/shared/IMG_CONTRACT.md`（沿用既有定案）
- Level 1a/1b/1c 其他既有題目

### Library / API
無外部 library、無 API 呼叫，全程 browser-side；圖片解碼／EXIF 清除／剪貼簿讀取皆走
`img-infra` 既有模組。Pixelate／Blur 演算法純手寫（同契約精神：機械性圖片運算不需要
外部函式庫）。

## 待裁示

1. **馬賽克區塊大小、模糊半徑是否需要 UI 可調，或固定預設值即可**：PRD 沒有明文要求
   使用者可調整強度。本提案傾向先做「固定合理預設值（馬賽克 10px 格、模糊半徑 8px），
   不做強度調整 UI」，理由是 PRD 的 MVP 清單沒有列這項，屬於「額外功能」；若要加，
   是簡單的滑桿+ 重繪，不影響上方核心資料結構設計，可以晚點再加。**待使用者確認是否要
   現在就做。**
2. **框選遮蔽區域的形狀是否僅限矩形**：PRD 只說「框選多個遮蔽區域」，未提及是否需要
   支援不規則形狀（例如自由繪製、圓形）。本提案假設**僅矩形**（`x/y/w/h`），因為矩形
   框選是最常見的截圖遮蔽情境（截住一整行文字/一個 UI 元件），且是資料結構最簡單、
   最可靠的作法。若需要支援其他形狀，`maskOps` 的 `type` 需要擴充座標描述方式（例如
   圓形改用 `cx/cy/r`），屬於加法擴充，不影響本提案的核心「操作紀錄 + 重繪」設計。
3. **任務條數（見 `tasks.md`）**：本題把「操作紀錄的資料結構設計＋重繪管線」獨立成一條
   任務、三種遮蔽演算法各自獨立成一條任務，加上 UI 骨架、剪貼簿/上傳整合、Undo/Redo
   互動、Before/After、最終輸出（含 Metadata 清除）、整合驗收，總計剛好 10 條，壓在
   上限沒有超過，因此**沒有**採用 `csv-pivot-dashboard` 上下兩篇的拆法。若使用者認為
   10 條裡有任一條的驗收範圍實際跑起來超過 1 小時（例如馬賽克演算法的邊界情況比預期
   多），再回頭裁示是否拆篇。
