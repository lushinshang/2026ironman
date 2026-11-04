# Day30 OOXML 隱私 Metadata 清除契約

> 建立：2026-08-27，三格式（DOCX/XLSX/PPTX）三階段全部完成後補建。角色比照
> `shared/PDF_CONTRACT.md` 之於 Level 1d——差別是本案只有 **一題**（Day30
> `ooxml-privacy-cleaner`）吃三種格式，不是多題共用一種輸入，所以不是「多題對齊判定」，
> 而是記錄「一題內部三個子模組怎麼分工、什麼可以互相呼叫、什麼不行」。

## 0. 範圍

`Day30_ooxml-privacy-cleaner/src/` 底下四個檔案：

| 檔案 | 負責格式 | 說明 |
|---|---|---|
| `docx-meta.js` | DOCX；同時是三格式共用的 docProps 層 | 見第 1 節 |
| `xlsx-meta.js` | XLSX 專屬 | pivot cache／隱藏工作表／外部連結／大小閘門 |
| `pptx-meta.js` | PPTX 專屬 | 裁切圖片／講者備忘稿／隱藏投影片／大小閘門 |
| `index.html` | UI | 三格式共用同一個上傳/清單/清除/下載流程，依 `format` 分支 |

## 1. 架構決定：docProps 共用層留在 `docx-meta.js`，不搬進 `shared/`

DOCX/XLSX/PPTX 的 `docProps/core.xml`／`app.xml`／`custom.xml`／`thumbnail.jpeg` 走
完全同一套 OPC（Open Packaging Conventions）機制——這幾個 part 的路徑、XML schema、
`_rels/.rels` 與 `[Content_Types].xml` 的同步刪除規則，三格式毫無差異。`docx-meta.js`
匯出的 `readDocxCoreProps`／`readDocxAppProps`／`cleanDocxCoreProps`／`cleanDocxAppProps`／
`hasCustomProps`／`hasThumbnail`／`_findThumbnailPath`／`removeZipEntryAndRelationship`／
`isLikelyEncryptedOfficeFile`／`checkDocxFileSize` 本來就只操作 package-level 的部分，
不含任何 `word/` 專屬邏輯，是格式無關的實作——`xlsx-meta.js`／`pptx-meta.js`／
`index.html` 直接呼叫這些函式處理 XLSX/PPTX 的 docProps，**沒有重寫第二份**。

原提案「第三格式加入後抽 `shared/ooxml-meta.js`」的規劃，實作到 Phase 3 時改判斷為
**不搬**，理由：

- `shared/` 的既定角色是「跨題共用」（例如 `img-exif.js` 被 Day14/15/16 三題共用）。
  這幾個函式目前只有 Day30 自己的三個格式模組在用，是**同一題內部**的重用，不是
  跨題重用，搬進 `shared/` 沒有對應到任何「多題共用」的實際情境。
- 三個 `*-meta.js` 檔案在 bundle 時都會被內嵌進同一份 `index.html`（透過
  `<!--{{ASSET:...}}-->`），物理上已經是同一個部署單位，`docx-meta.js` 的函式
  對 `xlsx-meta.js`／`pptx-meta.js` 而言就是「同目錄的另一個檔案」，跟真正的
  `shared/` 檔案（供其他日期的題目 `<!--{{SHARED:...}}-->` 引用）在依賴關係上
  是不同性質的東西。
- 若未來真的出現第二個題目要處理 OOXML docProps（目前沒有具體案例），屆時再把
  這幾個函式搬到 `shared/ooxml-meta.js`，比現在預先搬動、卻沒有第二個呼叫方能驗證
  介面設計是否恰當更保守——比照 `shared/PDF_CONTRACT.md` 記錄的「先留在題目本身，
  第二／第三次真的重複才抽」的一貫判準（見 `docx-meta.js` 檔案開頭註解、Phase 1
  任務清單任務 11）。

`bundle.json`／`<!--{{ASSET:...}}-->` 載入順序固定為
`docx-meta.js` → `xlsx-meta.js` → `pptx-meta.js`，`xlsx-meta.js`／`pptx-meta.js`
不得在自己檔案內重新定義任何 `docx-meta.js` 已匯出的同名函式（避免瀏覽器全域作用域
下的靜默覆蓋）。

## 2. 三格式各自的「清 metadata vs 只警示」判準（一致的判斷邏輯，套用到不同格式）

貫穿三格式的共同原則：**metadata（作者/公司/時間戳/縮圖/註解一類的附加資訊）才自動清除，
會改變文件實際可見內容的一律只偵測警示，不自動修改**。

| 情境 | 格式 | 處理方式 |
|---|---|---|
| docProps 作者/公司/描述/自訂屬性/縮圖 | 三格式共用 | 清除 |
| 註解（comments） | DOCX | 清除（附加資訊） |
| 追蹤修訂（`w:ins`/`w:del`） | DOCX | 只警示（文件內容） |
| 本機路徑超連結（relationship） | DOCX | 清除連結，不改顯示文字 |
| 本機路徑超連結（`<w:t>` 顯示文字） | DOCX | 只警示（文件內容） |
| 樞紐分析表快取（pivotCache） | XLSX | 清除（**例外**：技術上是附加資料而非顯示內容，
  但清除會讓對應樞紐表失效，UI 需明確警示這個副作用） |
| 隱藏工作表 | XLSX | 只警示（改變分頁結構＝內容） |
| 外部連結（externalLinks part） | XLSX | 清除 part，儲存格公式殘留字串不處理（內容） |
| 裁切圖片原圖殘留 | PPTX | **清除（燒進像素）**——見第 3 節，這是三格式裡
  唯一「清除」但需要真的改寫二進位內容（不是只刪 XML 節點）的情境 |
| 講者備忘稿 | PPTX | 清除（附加資訊，跟 DOCX comments 同一判準） |
| 隱藏投影片 | PPTX | 只警示（改變投影片結構＝內容） |
| 加密偵測（CFB magic bytes） | 三格式共用 | 一律誠實提示「有密碼保護」，不嘗試處理 |

## 3. PPTX 圖片裁切清除：唯一需要 Canvas 像素處理的情境

`<a:srcRect l/t/r/b>`（單位：萬分之一，`100000` = 100%）只是顯示層裁切標記，
`ppt/media/` 底下的圖片檔案本體永遠是裁切前的完整原圖（研究結論，見
`pptx_structure_notes.md` 第 1 節）。這跟 Day16 `screenshot-sanitizer`
「遮蔽必須燒進像素，不能只是視覺疊加層」是同一類風險——只刪 `<a:srcRect>` 節點
（讓圖片變回「未裁切狀態顯示」）完全沒有意義，必須真的重繪像素、產生裁切後的
圖片位元組取代原檔案，才是真正的清除。

實作（`pptx-meta.js` 的 `cleanPptxCroppedImages`）：`Blob` → `URL.createObjectURL`
→ `Image` 解碼 → 依裁切比例算出可見矩形 → `canvas.drawImage()` 只取可見範圍
重繪 → `canvas.toBlob()` 輸出裁切後的位元組，取代 `ppt/media/imageN.*`，
並移除 slide XML 裡對應的 `<a:srcRect>`（裁切已經燒進像素，標記留著會造成
「已裁切的圖再被裁一次」）。

**邊界情況（刻意不自動處理，只警示）**：同一張媒體檔被多個投影片／多個位置以
**不同**裁切規格引用時，不知道該用哪一種裁切結果覆蓋原檔案，強行處理會破壞其中
一處的合法顯示——`cleanPptxCroppedImages` 偵測到裁切規格不一致（或裁切比例超出
`[0, 100000]` 合理範圍、或圖片格式不是常見點陣圖）時，該媒體檔會被列進
`skippedMedia`，UI 顯示風險提示但不動這個檔案。

**驗證方式**：這是本案唯一一個「掃描結果自己重新掃一次過不了」的清除邏輯——
`scanPptxCroppedImages` 事後重新掃描只看 `<a:srcRect>` 是否還在，這驗證得了
XML 節點確實被移除，但驗證不了圖片位元組是否真的被裁切。Phase 3 任務清單裡
額外用**獨立 Python `PIL`** 直接讀取清除後的 `ppt/media/imageN.png` 位元組，
確認圖片尺寸從裁切前的 `400×300` 變成裁切後的 `400×150`、且原本會被裁掉的
座標範圍（模擬紅色區塊）在輸出圖片裡已經完全不存在（只剩藍色），這是不能只靠
頁面內建重新掃描替代的驗證步驟。

## 4. 大小閘門：三格式各自獨立的數字，不共用

`unzipSync()` 是同步全量解壓，會卡住瀏覽器 UI thread，三格式各自的正常檔案大小
分佈差異很大，門檻不能互相套用（依據見各自的 `*_structure_notes.md` 第 5 節）：

| 格式 | 警告 | 拒絕 | 理由摘要 |
|---|---|---|---|
| DOCX | 15MB | 50MB | 正常分佈幾百 KB～個位數 MB，30MB+ 已是離群值 |
| XLSX | 25MB | 80MB | 常態內含大量數值資料，30 萬列報表實測約 9.67MB |
| PPTX | 20MB | 100MB | 唯一常態內嵌大型媒體（尤其影片）的格式 |

## 5. 加密偵測：三格式共用同一份實作，格式無關

`isLikelyEncryptedOfficeFile()`（`docx-meta.js`）只比對檔案開頭 8 bytes 是否為
CFB/OLE magic bytes（`D0 CF 11 E0 A1 B1 1A E1`）。用 `msoffcrypto-tool` 對
DOCX/XLSX/PPTX 三種格式各自產生加密檔案，三次獨立實測結果完全一致：magic bytes
相同、`fflate.unzipSync()` 對三種格式都拋出同一句 `"invalid zip data"`。三格式
共用同一份函式，`xlsx-meta.js`／`pptx-meta.js` 都沒有重寫。

## 6. 已知限制與未涵蓋範圍

- `ppt/slideLayouts/`／`ppt/slideMasters/` 底下可能殘留的設計階段文字/範例內容，
  未偵測（研究階段用內建範本測資，沒有踩到具體案例，見 `pptx_structure_notes.md`
  附錄）
- `docProps/app.xml` 的 `TitlesOfParts`／`HiddenSlides`／`Slides` 等統計欄位，
  python-docx/openpyxl/python-pptx 產生的測資都不會動態計算這些值（第三方函式庫
  限制，非真實 Office 桌面版行為），本案不依賴這些欄位做判斷，一律以 part 本身
  的內容/屬性為準（例如隱藏工作表看 `xl/workbook.xml` 的 `state` 屬性，不看
  `app.xml`）
- XLSX 儲存格公式殘留的外部參照字串（`=[來源.xlsx]工作表1!A1`）、DOCX 顯示文字裡
  的本機路徑字串——這些屬於文件實際內容，只偵測警示，不自動改寫
- 加密檔案：偵測後直接拒絕處理，不支援「輸入密碼後解密清除」

## 7. 相關文件

- 各格式研究筆記：`integrations/openspec/specs/_archived/20260827_003406_78c4e53c/`
  底下的 `docx_structure_notes.md`／`xlsx_structure_notes.md`／
  `pptx_structure_notes.md`（本機限定，非 git 追蹤目錄）
- 完整提案與三階段任務追蹤：同目錄 `proposal.md`
- 前案技術風格參照：`shared/PDF_CONTRACT.md`、`shared/IMG_CONTRACT.md`
