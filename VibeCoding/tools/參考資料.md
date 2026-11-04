# 2026 iThome 鐵人賽 Vibe Coding：30 個產品 PRD

> 版本：v2.0  
> 日期：2026-08-23  
> 狀態：PRD 草案，尚未授權實作  
> 核心規矩：**動手寫程式之前，先把要做什麼寫清楚。**

## 共通開發規則

1. PRD／提案完成後先由使用者確認；未收到「開始實作」不得寫程式。
2. 實作時一次只完成一個 task，每完成一小步就回報。
3. 不自行增加未要求功能，不過度設計。
4. 規格不明或做到一半發現方向有誤時，停止實作並回報。
5. 原始檔預設不得覆寫；產生新檔供下載。
6. 能在瀏覽器本機完成就不把資料上傳。
7. 涉及 AI 時，介面必須明確告知資料會送往 Cloudflare AI 服務。
8. 每一題真正進入開發前，再建立 `sdd/<短名稱>/proposal.md` 與 `tasks.md`。
9. `tasks.md` 每條任務需小到原則上 1 小時內可完成，整份不超過 10 條。
10. 提案完成後停下來等使用者確認，不要直接進入實作。

### 三階段
- **提案**：建立 `proposal.md`、`tasks.md`、驗收條件，回報後停止。
- **實作**：由上到下，一次完成一條 task；完成後自我檢查再打勾。
- **歸檔**：全部完成且驗收通過後，移至 `sdd/archive/YYYY-MM-DD-<短名稱>/`。

---

# 第一階段：單一 HTML on GitHub Pages，可下載單獨使用

> GitHub Pages 只作為發布通路；完整功能必須可在下載 HTML 後離線使用。若用第三方 JavaScript library，正式版需固定版本並打包／內嵌，避免依賴 CDN。

## PRD 01 — Document Tools 重製版
- **英文短名稱**：`document-tools`
- **類型**：重構
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/document-tools/`

### 為什麼做
Office 使用者常在圖片、PDF、Markdown 等不同網站間切換。既有 Document Tools 重新建立，重點是整合常用文件加工，而不是無限制堆功能。

### MVP
- 首頁分成圖片、PDF、Markdown 三區。
- 圖片：JPG/PNG/WebP 互轉、Resize、基本壓縮。
- PDF：合併、拆分、PDF→圖片。
- Markdown：編輯、即時預覽、輸出 HTML。
- 每個工具都有清除目前資料。
- 檔案以 Browser-side Processing 為原則。
- GitHub Pages 可用；HTML 下載後斷網仍可用核心功能。

### 不做
AI、登入、雲端儲存、多人協作。

### 驗收條件
- 情境：下載 HTML 並斷網後，三大分類核心功能仍可運作。
- 情境：每類至少完成一次「輸入→處理→下載」。
- 情境：錯誤檔案格式不造成整頁崩潰。

---

## PRD 02 — PDF_TO_JPG 重製版
- **英文短名稱**：`pdf-to-jpg`
- **類型**：重構
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/pdf-to-jpg/`

### 為什麼做
PDF 頁面常需要放進 Word、PowerPoint、Email 或只接受圖片的系統。這題只專心把「PDF 每頁轉 JPG」做到極簡。

### MVP
- 拖曳或選擇 PDF。
- 顯示頁數與縮圖。
- 每頁轉 JPG。
- 可設定基本品質。
- 單頁下載。
- 全部頁面 ZIP。
- 顯示處理進度。
- 全程瀏覽器處理。

### 不做
OCR、PDF 編輯、AI、語意分析。

### 驗收條件
- 情境：10 頁 PDF 產生 10 張 JPG。
- 情境：可只下載指定頁。
- 情境：全部下載時得到含所有頁面的 ZIP。
- 情境：離線 HTML 仍可轉換。

---

## PRD 03 — 文字健檢工作台
- **英文短名稱**：`text-health-check`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/text-health-check/`

### 為什麼做
公文、投稿、公告、報告有字數與格式要求，人工檢查很容易漏。

### 輸入
貼上文字、TXT、MD。

### MVP
- 中文字數、英文字數、總字元數。
- 行數、段落數、中英文比例。
- 標點與空白統計。
- 連續空白、重複標點、多餘空白行。
- 過長段落提示。
- 問題位置標示。
- 複製健檢摘要。

### 不做
AI 改寫、文法重寫、自動修改原文。

### 驗收條件
- 情境：文字變更時統計即時更新。
- 情境：連續空白或重複標點能指出位置。
- 情境：健檢不會偷偷改動原文。

---

## PRD 04 — 繁簡與台灣在地化轉換器
- **英文短名稱**：`zh-tw-localizer`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/zh-tw-localizer/`

### 為什麼做
AI 產文與外部資料常混入簡體字或非台灣慣用詞，需要人工逐詞修正。

### MVP
- 簡體→繁體。
- 可編輯中國大陸用語→台灣慣用語詞庫。
- 轉換前後並排。
- 高亮替換位置。
- 可逐項接受／取消替換。
- 自訂詞庫 JSON 匯入／匯出。
- 下載 TXT/MD。

### 不做
AI 改寫、整句重寫、語氣潤飾。

### 驗收條件
- 情境：「視頻」「鼠標」「默認」能依詞庫轉成台灣慣用詞。
- 情境：使用者知道哪些詞被改過。
- 情境：自訂詞庫可重複載入使用。

---

## PRD 05 — 可逆式文字去識別化
- **英文短名稱**：`reversible-deidentifier`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/reversible-deidentifier/`

### 為什麼做
文件交給外部人員或 AI 前，常要移除姓名、電話、Email 等資訊；工作完成後又可能要在本機還原。

### MVP
- 規則辨識 Email、電話。
- 使用者手動指定姓名／敏感詞。
- Token 化，如 `[PERSON_001]`。
- 產生 mapping。
- mapping 匯出 JSON/CSV。
- 以 mapping 還原。
- 原文／結果並排。
- 全程 Browser-side。

### 不做
宣稱 100% 找出所有個資、雲端保存 mapping、自動送 AI。

### 驗收條件
- 情境：同一 Email 多次出現時使用同一 Token。
- 情境：正確 mapping 可還原。
- 情境：mapping 遺失時不得宣稱仍可自動還原。

---

## PRD 06 — AI 回答 → Office 文字清理器
- **英文短名稱**：`ai-text-cleaner`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否；只處理 AI 產出的文字
- **SDD**：`sdd/ai-text-cleaner/`

### 為什麼做
AI 回答常含 Markdown、emoji、分隔線與不適合 Word/Email 的格式。

### MVP
- 移除 Markdown heading 符號。
- 移除粗體／斜體標記但保留文字。
- 清理 code fence。
- 統一 bullet 與編號。
- 選擇是否移除 emoji。
- 整理多餘空白行。
- Word-friendly、Email-friendly、純文字模式。
- 即時預覽與一鍵複製。

### 不做
內容改寫、事實修改、AI 語氣判斷。

### 驗收條件
- 情境：含 `##`、`**`、emoji 的內容能輸出乾淨文字。
- 情境：實質句子內容不應因格式清理而遺失。
- 情境：三種輸出模式有明確差異。

---

## PRD 07 — Office Content Publisher
- **英文短名稱**：`office-content-publisher`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/office-content-publisher/`

### 為什麼做
Markdown、TXT、CSV 要放到 HackMD、GitHub 或正式網頁時，常需要重新轉格式。

### MVP
- Markdown/TXT 即時預覽。
- Markdown→單一 HTML。
- CSV→Markdown Table。
- CSV→HTML Table。
- CSV 欄位選擇、排序。
- 至少一種乾淨列印模板。
- Copy Markdown / Copy HTML。
- 下載單一 HTML。

### 不做
CMS、登入、雲端發布帳號、AI 內容生成。

### 驗收條件
- 情境：Markdown 可輸出離線 HTML。
- 情境：CSV 可選部分欄位生成 Markdown Table。
- 情境：輸出 HTML 不需重新上傳原始檔。

---

## PRD 08 — CSV Doctor & Cleaner
- **英文短名稱**：`csv-doctor`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/csv-doctor/`

### 為什麼做
CSV 常見問題不是不能開，而是空值、重複、日期與型別問題藏在資料內。

### Doctor
- 空值、空白列、空白欄、欄名重複。
- 數值欄混入文字、日期格式異常。
- 前後空白、全半形差異。
- 整列完全重複。
- 指定一或多欄 Group By 找重複。
- 顯示重複次數與原始列號。

### Cleaner
- Trim、移除空白列。
- 日期基本正規化、全半形正規化。
- 整列去重。
- 依指定 Key 去重。
- 保留第一筆／最後一筆／只標記。
- 匯出問題資料與清理後 CSV。

### 不做
模糊比對後自動合併不同人、AI 猜正確值。

### 驗收條件
- 情境：指定「姓名+Email」能列出重複群組。
- 情境：真正刪除前要先預覽受影響筆數。
- 情境：匯出不覆寫原始 CSV。

---

## PRD 09 — 兩期清冊異動報告
- **英文短名稱**：`csv-period-diff`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/csv-period-diff/`

### 為什麼做
人員、資產、設備、會員清冊常要比對前期與本期，人工 VLOOKUP 很耗時。

### MVP
- 上傳前期／本期 CSV。
- 指定 Primary Key。
- 新增、移除、欄位變更。
- Before/After 對照。
- 異動欄位 Highlight。
- 匯出新增、移除、異動 CSV。
- 匯出 HTML 摘要報告。

### 不做
自動猜沒有 Key 的兩筆資料是否為同一人、AI 語意判定。

### 驗收條件
- 情境：前期無、本期有的 Key 列為新增。
- 情境：同 Key 但欄位不同列為異動。
- 情境：兩份相同 CSV 顯示無異動。

---

## PRD 10 — CSV Pivot Dashboard
- **英文短名稱**：`csv-pivot-dashboard`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/csv-pivot-dashboard/`

### 為什麼做
使用者想快速回答每單位幾件、多少錢、趨勢如何，但未必會 Excel 樞紐分析。

### MVP
- 欄位型態基本辨識。
- Dimension / Measure。
- COUNT / SUM / AVG / MIN / MAX。
- 單欄、多欄 Group By。
- Filter、Sort。
- Top N / Bottom N。
- 日期依年／季／月分組。
- KPI Card、Pivot Table、Bar、Line、Pie。
- 匯出分析後 CSV 與單一 Dashboard HTML。

### 不做
完整複製 Excel Pivot 全部功能、AI 分析。

### 驗收條件
- 情境：「單位 + 金額 SUM」能得到每單位總額。
- 情境：Group By 或 Aggregate 改變時圖表同步更新。
- 情境：匯出的 Dashboard HTML 離線仍能觀看。

---
## PRD 11 — CSV 一頁式管理報告
- **英文短名稱**：`csv-one-page-report`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/csv-one-page-report/`

### 為什麼做
資料分析完成後，主管通常不是要操作樞紐表，而是要快速看懂 KPI、排名與趨勢。

### MVP
- 選擇核心數值欄與分類欄。
- KPI Cards。
- Top 5 / Bottom 5。
- 分類占比。
- 日期資料趨勢。
- 自訂報告標題、期間、註記。
- A4 / 列印友善排版。
- 匯出單一 HTML。
- Browser Print 產生 PDF。

### 不做
AI 文字結論、多頁 BI 平台。

### 驗收條件
- 情境：一份 CSV 能產生一頁式管理摘要。
- 情境：列印時主要區塊保持可讀。
- 情境：輸出 HTML 不需重新上傳 CSV。

---

## PRD 12 — 總表 → 分單位批次拆檔
- **英文短名稱**：`csv-batch-splitter`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/csv-batch-splitter/`

### 為什麼做
一份總表每月依單位、部門、地區或承辦人拆成多份檔案，是常見又重複的 Office 工作。

### MVP
- 上傳 CSV。
- 選拆分欄位。
- 列出 Unique Values 與筆數。
- 可勾選要輸出的群組。
- 自動產生合法檔名。
- 保留 Header。
- 可排除指定欄位。
- 單檔下載。
- 全部 ZIP。

### 驗收條件
- 情境：四個單位能拆成四份 CSV。
- 情境：群組值含非法檔名字元時仍可安全輸出。
- 情境：未排除群組時拆分後總筆數等於原表。

---

## PRD 13 — 圖片批次最佳化工作台
- **英文短名稱**：`image-batch-optimizer`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/image-batch-optimizer/`

### 為什麼做
Email、LINE、上傳系統常限制圖片容量；使用者真正想要的是「壓到 1MB 以下」，不是研究 quality slider。

### MVP
- JPG/PNG/WebP 批次匯入。
- 格式轉換。
- 長邊／寬高限制。
- 保持比例。
- 目標容量：1MB、2MB、自訂。
- 自動逐步調整品質，必要時降低尺寸。
- 顯示原始／輸出容量。
- 個別下載／ZIP。
- 預設不放大小圖。

### 驗收條件
- 情境：目標 1MB 時盡力產出 <=1MB；無法達成時明確提示。
- 情境：批次輸出保持原檔對應關係。
- 情境：預設不拉伸圖片比例。

---

## PRD 14 — EXIF 隱私檢查與清除
- **英文短名稱**：`exif-privacy-cleaner`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/exif-privacy-cleaner/`

### 為什麼做
照片可能帶有拍攝時間、裝置型號、GPS 等 Metadata，對外分享前常被忽略。

### MVP
- 讀取可支援的 EXIF/XMP。
- 顯示拍攝日期、裝置、GPS 等資訊。
- 敏感 Metadata 風險提示。
- 使用者勾選清除項目。
- 重新輸出圖片。
- 批次處理。
- 顯示清除前後差異。

### 驗收條件
- 情境：含 GPS 的圖片能提示風險。
- 情境：清除後重新讀取時已選欄位不再存在。
- 情境：沒有 EXIF 的圖片不應報錯。

---

## PRD 15 — Screenshot Privacy Sanitizer
- **英文短名稱**：`screenshot-sanitizer`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/screenshot-sanitizer/`

### 為什麼做
截圖寄給外部前，姓名、帳號、Email、IP、QR Code 等敏感資訊容易漏掉。

### MVP
- JPG/PNG/WebP 上傳。
- 剪貼簿貼圖。
- 框選多個遮蔽區域。
- 黑箱、Pixelate、Blur 至少支援兩種。
- Undo / Redo。
- 最終輸出 Rasterized 圖片。
- 清除 Metadata。
- Before / After。

### 驗收條件
- 情境：遮蔽必須寫入最終像素，不只是 UI Overlay。
- 情境：下載後重新開啟仍保持遮蔽。
- 情境：Undo 可取消上一個操作。

---

## PRD 16 — 照片 → 工作成果附件
- **英文短名稱**：`photo-evidence-sheet`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/photo-evidence-sheet/`

### 為什麼做
活動、施工、教育訓練與設備安裝後，整理大量照片成正式成果附件很耗時。

### MVP
- 多照片匯入。
- 拖曳排序。
- 圖說。
- 每頁 2/4/6 張。
- 自動編號。
- 標題、日期、地點欄。
- A4 預覽。
- 匯出列印版 HTML / PDF。
- 不覆寫原始照片。

### 驗收條件
- 情境：20 張照片可套固定版型。
- 情境：重新排序後圖說仍與照片綁定。
- 情境：列印時照片不超出版面。

---

## PRD 17 — 文件照片透視校正器
- **英文短名稱**：`document-perspective-corrector`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/document-perspective-corrector/`

### 為什麼做
手機斜拍公文、白板、表格、發票、證書時，透視變形會降低閱讀與後續 OCR 品質。

### MVP
- JPG/PNG/WebP 上傳。
- 四個可拖曳角點。
- Perspective Transform。
- 旋轉、裁切。
- 基本亮度、對比、灰階文件模式。
- Before / After。
- JPG / PNG 輸出。
- 可選單頁 PDF。

### 驗收條件
- 情境：四角調整後可把斜拍矩形校正成近似正面。
- 情境：原始圖片不被改動。
- 情境：校正結果可獨立下載。

---

## PRD 18 — PDF 拆分 / 合併 / 重排工作台
- **英文短名稱**：`pdf-organizer`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/pdf-organizer/`

### 為什麼做
送件與彙整附件時，PDF 順序錯亂、來源不同、要刪頁或旋轉是常見需求。

### MVP
- 多 PDF 匯入。
- 每頁 Thumbnail。
- 跨文件拖曳重排。
- 刪除頁面。
- 旋轉頁面。
- 指定頁碼範圍拆分。
- 合併後下載新 PDF。
- 顯示總頁數。
- 不覆寫來源。

### 驗收條件
- 情境：可將不同 PDF 指定頁重新組成新 PDF。
- 情境：刪除與旋轉結果正確反映在輸出。
- 情境：來源檔案保持不變。

---

## PRD 19 — PDF 文字擷取與全文搜尋
- **英文短名稱**：`pdf-text-search`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/pdf-text-search/`

### 為什麼做
有文字層 PDF 雖能閱讀，但整理成可搜尋資料或搬到筆記系統仍不方便。

### MVP
- 偵測是否有可擷取文字。
- 逐頁顯示文字。
- 全文關鍵字搜尋。
- 顯示命中頁碼與片段。
- 點結果定位頁面。
- TXT 匯出。
- Markdown 匯出。
- Copy All。

### 不做
掃描 PDF OCR、AI 摘要。

### 驗收條件
- 情境：有文字層 PDF 可搜尋並列出頁碼。
- 情境：掃描 PDF 無文字層時明確提示限制。
- 情境：匯出文字與可擷取內容一致。

---

## PRD 20 — PDF 頁碼 / 浮水印 / 送審章
- **英文短名稱**：`pdf-review-stamper`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/pdf-review-stamper/`

### 為什麼做
草稿、密件、僅供參考、未核定等標記與頁碼，是送審文件高度重複的加工。

### MVP
- 頁碼 X 或 X/Y。
- 頁首／頁尾位置。
- 自訂文字浮水印。
- 透明度、角度、位置。
- 常用預設：草稿、密件、僅供參考、未核定。
- 全頁或指定頁碼範圍。
- 預覽。
- 輸出新 PDF。

### 驗收條件
- 情境：指定第2–5頁時其他頁不加標記。
- 情境：X/Y 的 Y 為輸出總頁數。
- 情境：使用者可先預覽再下載。

---
## PRD 21 — PDF 安全遮蔽 / Flatten
- **英文短名稱**：`pdf-secure-redactor`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/pdf-secure-redactor/`

### 為什麼做
在 PDF 上畫黑框不代表底層文字真的消失。敏感資料對外分享前，需要把遮蔽結果真正寫進輸出。

### MVP
- PDF 頁面預覽。
- 框選多個敏感區域。
- 黑色或指定遮蔽色。
- 將指定頁 Rasterize / Flatten。
- 重新組成 PDF。
- 顯示哪些頁被 Rasterize。
- 輸出後重新檢查該區域不應仍可直接選取底層文字。

### 不做
AI 自動找個資、宣稱符合所有法規場景。

### 驗收條件
- 情境：遮蔽結果不能藉由移除 Annotation 恢復。
- 情境：被 Rasterize 的敏感文字不得仍可直接複製。
- 情境：未指定遮蔽的頁面依設定保持原狀。

---

## PRD 22 — PDF 密碼管理器
- **英文短名稱**：`pdf-password-manager`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/pdf-password-manager/`

### 為什麼做
PDF 在合併或整理前可能需要使用已知密碼解鎖；交付前又可能需要重新設定密碼。

### MVP
- 使用已知正確密碼開啟 PDF。
- 產生未加密副本。
- 設定新開啟密碼。
- 更換密碼。
- 批次處理。
- 顯示成功／失敗檔案。
- 單檔與 ZIP。
- 永不覆寫原始檔。

### 不做
猜密碼、暴力破解未知密碼。

### 驗收條件
- 情境：正確密碼可解鎖支援格式的 PDF。
- 情境：錯誤密碼不能產生假成功結果。
- 情境：重新加密後，開啟輸出檔需要新密碼。

---

## PRD 23 — PDF 送件清理器
- **英文短名稱**：`pdf-delivery-cleaner`
- **類型**：新功能
- **部署型態**：單一 HTML / GitHub Pages，可離線
- **AI**：否
- **SDD**：`sdd/pdf-delivery-cleaner/`

### 為什麼做
PDF 送出前可能還含 Metadata、註解、表單、附件、外部連結與互動 Action，這些不一定能從畫面直接看到。

### MVP
- 先掃描、再清理。
- 列出可偵測 Metadata。
- 列出 URL / mailto Link Annotation。
- 列出 Comment / Annotation。
- 列出 Form。
- 列出附件。
- Library 支援時列出 Document/JavaScript Actions。
- 使用者逐類勾選清除。
- 清理前後比較。
- 輸出 `clean-for-delivery.pdf`。

### 不做
保證清除所有 PDF 物件、任意移除第三方版權保護、未確認就 Flatten 全文件。

### 驗收條件
- 情境：沒有可清理項目時顯示明確結果。
- 情境：只選 Metadata 時不順便移除其他物件。
- 情境：輸出後重新掃描，已選清除項目應消失。

---

# 第二階段：HTML on GitHub Pages，不可只下載 HTML 單獨使用

> 完整產品依賴 **GitHub Repository + GitHub Actions + GitHub Pages**。HTML 即使可下載，也缺少排程、Workflow、Repo History 等核心能力，因此不能把單一 HTML 視為完整產品。

## PRD 24 — 每日自動更新工作 Dashboard
- **英文短名稱**：`scheduled-work-dashboard`
- **類型**：新功能
- **部署型態**：GitHub Pages + GitHub Actions
- **AI**：否
- **SDD**：`sdd/scheduled-work-dashboard/`

### 為什麼做
固定報表每天／每週由人手動更新，容易耗時、忘記或產生版本不一致。以內政部警政署
「165打詐儀錶板」的公開每日類別統計（電信網路詐欺／非電信網路詐欺／其他，各含案件
數與損失金額）為實例資料來源，練習「Repo 即資料庫 + Actions 排程」這套組合。

### 資料來源（已實測驗證）
- 端點：`GET https://165dashboard.tw/CIB_DWS_API/api/Dashboard/GetDailyCategoryStatistics?date=<ISO8601>&sort=case`，公開、免登入、免 API Key。
- 日期參數語意：查台北時間 D 日的資料，傳 `date=(D減1日)T16:00:00Z`（UTC+8 換算）。
- 回傳三類別的 `Cases`（件）與 `Losses`（**單位：萬元**，非元）。
- 已實測 2025-12-31 仍正常回傳，代表 2026-07-01（115/7/1）起的歷史資料可一次性回補，
  不必乾等 Actions 每天累積才有完整資料。
- 非官方公告的開放資料集，沒有正式 ToS；僅供技術練習展示，每日僅排程抓取一次，
  頁面上需標註資料來源與非官方轉載聲明。

### MVP
- 一次性回補腳本：抓 2026-07-01 起至今的每日類別統計，寫入 `data/daily-stats.csv`
  （欄位：`date,category,cases,losses`）。
- GitHub Actions 排程（每日一次）呼叫同一支腳本，抓「前一天」資料 append 進 CSV。
- Workflow 讀取 CSV，以**月為單位**彙總三類別的案件數與損失金額。
- Pages 顯示：月度 KPI 卡片、月度趨勢圖、月度明細表（月份 × 類別 × 案件數/損失金額）。
- 顯示 Last Updated。
- Workflow 失敗可從 Actions log 查原因。
- 支援手動 `workflow_dispatch`。
- 自動部署 Pages。

### 不做
即時秒級資料流、私密資料直接放 public repo、AI 分析、逐日明細呈現（只做月彙總）、
除三大類別外的其他維度（如各縣市／各詐騙手法排行，那是原站其他分頁的範圍）。

### 驗收條件
- 情境：排程執行後 Pages 顯示更新資料，且該月的月度彙總數字隨新一天資料入帳而更新。
- 情境：手動觸發 Workflow 可完成相同流程。
- 情境：只下載 HTML 不應被描述成完整產品，因自動更新能力依賴 Actions。
- 情境：`data/daily-stats.csv` 中 2026-07-01 起每一天都有三類別各一筆紀錄，無缺漏。

---

## PRD 25 — 公開資料定期快照站
- **英文短名稱**：`public-data-snapshot`
- **類型**：新功能
- **部署型態**：GitHub Pages + GitHub Actions + Git History
- **AI**：否
- **SDD**：`sdd/public-data-snapshot/`

### 為什麼做
公開 CSV/JSON 會更新，但來源網站未必提供方便的歷史版本；Git Repository 天然適合保留每次 Snapshot。

### MVP
- 設定一個公開 CSV/JSON URL。
- Actions 定期下載。
- 依日期／時間保存 Snapshot。
- 與上一版做基本差異比較。
- 內容相同時避免產生無意義重複版本，或明確標示無異動。
- Pages 顯示 Snapshot 時間軸。
- 可下載歷史版本。
- 顯示最後一次抓取狀態。

### 不做
繞過登入、付費牆或存取控制；大規模爬蟲；AI 解讀。

### 驗收條件
- 情境：來源更新時 Repository 留下可追溯 Snapshot。
- 情境：Pages 至少能查看最新與上一版。
- 情境：抓取失敗時不得覆蓋最後一份正常 Snapshot。

---

# 第三階段：HTML on Cloudflare，不使用 AI

> 前端仍以 HTML 為主要介面，但完整產品需要 Cloudflare Workers / Browser Rendering 等 Serverless 能力，不能只靠下載 HTML 離線執行。

## PRD 26 — 網址 → 網頁存證包
- **英文短名稱**：`web-evidence-packager`
- **類型**：新功能
- **部署型態**：Cloudflare Workers + Browser Rendering + HTML
- **AI**：否
- **SDD**：`sdd/web-evidence-packager/`

### 為什麼做
公告、法規、價格、廠商頁面與新聞內容可能日後修改，Office 工作常需要保留「當時看到什麼」。

### 輸入
公開 HTTP/HTTPS URL。

### MVP
- 驗證 URL。
- 透過 Browser Rendering 開啟目標頁。
- 擷取 Screenshot。
- 取得支援的 PDF / HTML / Markdown 中至少兩種留存格式；實作前依 Cloudflare 當期 API 確認。
- 記錄原始 URL。
- 記錄擷取時間與 Page Title。
- 建立 manifest。
- 打包成可下載存證包。
- 顯示抓取失敗原因。

### 安全
- 防 SSRF：拒絕 localhost、Private IP、Metadata endpoint。
- 限制 URL scheme。
- Timeout。
- 單次資源量限制。
- 不宣稱產物具法律公證效力。

### 驗收條件
- 情境：公開網頁可下載含 URL、時間、頁面留存內容的包。
- 情境：localhost / 私有網段 URL 被拒絕。
- 情境：目標頁無法開啟時不可產生看似成功的空包。

---

# 第四階段：HTML on Cloudflare，使用 AI

> AI 輸出一律視為候選結果。涉及數字、日期、責任、檔名與表格內容時，必須保留人工確認。

## PRD 27 — AI 會議紀錄整理器
- **英文短名稱**：`ai-meeting-minutes`
- **類型**：新功能
- **部署型態**：Cloudflare Workers + Workers AI + HTML
- **AI**：是
- **SDD**：`sdd/ai-meeting-minutes/`

### 為什麼做
真正耗時的常不是開會，而是把逐字稿整理成可執行的會議紀錄。

### 輸入
貼上逐字稿、TXT、MD。

### MVP
- 將文字送到 Workers AI。
- 固定輸出：摘要、關鍵討論、決議、待辦、負責角色、期限、待確認事項。
- 原文沒有期限時不得捏造日期。
- 各欄位可人工修改。
- 複製 Markdown。
- 下載 Markdown。
- 顯示 AI 結果需人工確認。

### 不做
語音轉文字作為 MVP、自動寄信、自動創造不存在的責任人。

### 驗收條件
- 情境：逐字稿明確有 Action Item 時能整理出來。
- 情境：原文沒有期限時標示未指定／待確認。
- 情境：使用者修改 AI 結果後再匯出。

---

## PRD 28 — Office SOP 語意搜尋 / RAG 問答
- **英文短名稱**：`office-sop-rag`
- **類型**：新功能
- **部署型態**：Cloudflare AI Search / Vectorize + Workers AI + Workers + HTML
- **AI**：是
- **SDD**：`sdd/office-sop-rag/`

### 為什麼做
同仁常知道規定存在，但不知道是哪份 SOP、哪一段；傳統關鍵字搜尋難以處理自然語言問題。

### MVP
- 匯入一小組 SOP / FAQ。
- 文件 Chunking。
- 建立索引。
- 自然語言提問。
- Retrieval 找相關片段。
- LLM 只依 Retrieved Context 回答。
- 顯示來源文件名稱。
- 顯示引用片段與可用頁碼／章節。
- 找不到足夠證據時回答資料不足。
- 支援重新索引。

### 安全／品質
- 不把模型內建知識當 SOP 依據。
- 做基本 Prompt Injection 防護。
- 正式版的文件權限範圍需另立規格。

### 驗收條件
- 情境：答案可以追溯到來源文件。
- 情境：超出文件範圍的問題不產生假權威答案。
- 情境：文件更新後可重新建立索引。

---

## PRD 29 — PDF / 圖片表格救援器
- **英文短名稱**：`ai-table-rescue`
- **類型**：新功能
- **部署型態**：Cloudflare Workers + Vision-capable AI + HTML
- **AI**：是
- **SDD**：`sdd/ai-table-rescue/`

### 為什麼做
表格可能只存在 PDF、掃描件、JPG、PNG、WebP 或截圖裡，使用者看得到卻不能排序、計算或分析。

### 輸入
PDF、JPG、PNG、WebP、剪貼簿 Screenshot。

### MVP
- PDF 選頁並前端轉圖片。
- 圖片 Crop，只保留表格範圍。
- 送到支援 Vision 的模型。
- 模型輸出結構化 Row/Column。
- 原圖與候選表格並排。
- Cell 可人工編輯。
- 可新增／刪除列欄。
- CSV 匯出。
- Markdown Table 匯出。
- HTML Table / TSV 作為後續延伸，不列入首版必做。

### 品質原則
- 不宣稱 OCR 100% 正確。
- 金額、日期、編號等高風險欄位需人工確認。
- 模型格式錯誤時不得直接產生假 CSV。

### 驗收條件
- 情境：清晰簡單表格能產生可編輯列欄。
- 情境：AI 失敗時保留原圖並提示人工處理。
- 情境：使用者修改 Cell 後，CSV 使用修改後的值。

---

## PRD 30 — AI 智慧檔名整理器
- **英文短名稱**：`ai-file-renamer`
- **類型**：新功能
- **部署型態**：Cloudflare Workers + Workers AI / Vision-capable AI + HTML
- **AI**：是
- **SDD**：`sdd/ai-file-renamer/`

### 為什麼做
掃描器、手機與下載系統常產生 `scan001.pdf`、`IMG_8823.jpg`、`document-final-v2.pdf` 等無意義檔名。當這些檔案後續還要合併、歸檔或搜尋時，管理成本更高。

### 輸入
TXT、MD、JPG、PNG、WebP、PDF；支援單檔與批次。

### MVP
- TXT/MD 擷取前段文字。
- PDF 擷取第一頁；掃描 PDF 第一頁轉圖片。
- JPG/PNG/WebP 送 Vision。
- AI 判斷日期、文件類型、標題、主題。
- 命名模板：`{title}`、`{date}_{title}`、`{type}_{title}`、`{date}_{type}_{title}`。
- 顯示「原檔名 → 建議檔名」。
- 使用者逐檔修改／確認。
- 清理非法檔名字元。
- 處理重複檔名。
- 保留原副檔名。
- 單檔下載。
- 批次 ZIP。

### 品質／安全
- AI 只建議，不直接覆寫原始檔。
- 日期無法判斷時不得編造。
- 低信心結果標示待確認。
- 處理前明確告知內容會送往 AI。

### 驗收條件
- 情境：第一頁明確寫「資訊安全工作會議紀錄」時，能提出相關候選檔名。
- 情境：沒有日期時不得因模板需要日期就自行生成日期。
- 情境：兩份檔案產生相同候選名時，自動避免檔名衝突。
- 情境：批次下載只改檔名，不改檔案內容。

---

# 30 題最終開發順序總覽

> ⚠️ **下表是「PRD 編號」，不是實際開發順序。**
> 實際開發順序依技術棧分群重排，並補回 v1 的兩題，見 [`README.md`](README.md#-開發順序與進度)。
> 主要調整：PRD 01 `document-tools` 是 PRD 02/07/13/18 的聯集，移到 Level 1 壓軸（Day25）。
>
> <!-- MODIFIED: 首欄原標題為「順序」，已於 2026-08-23 改為「PRD 編號」。原因：實測有 subagent 把此欄當成開發日次，導致 Day10/11/12 的產品對應弄反。開發日次一律以 README.md 為準。BY Claude Opus 5 AT 2026-08-23 -->
> ⚠️ **首欄是 PRD 編號，不是開發日次。** 例如 PRD 10 `csv-pivot-dashboard` 的開發日是 **Day11**，PRD 12 `csv-batch-splitter` 的開發日是 **Day10**。

| PRD 編號 | 短名稱 | 產品 | 執行環境 | AI |
|---:|---|---|---|:---:|
| 01 | `document-tools` | Document Tools 重製版 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 02 | `pdf-to-jpg` | PDF_TO_JPG 重製版 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 03 | `text-health-check` | 文字健檢工作台 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 04 | `zh-tw-localizer` | 繁簡與台灣在地化轉換器 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 05 | `reversible-deidentifier` | 可逆式文字去識別化 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 06 | `ai-text-cleaner` | AI 回答 → Office 文字清理器 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 07 | `office-content-publisher` | Office Content Publisher | 單一 HTML / GitHub Pages，可下載 | 否 |
| 08 | `csv-doctor` | CSV Doctor & Cleaner | 單一 HTML / GitHub Pages，可下載 | 否 |
| 09 | `csv-period-diff` | 兩期清冊異動報告 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 10 | `csv-pivot-dashboard` | CSV Pivot Dashboard | 單一 HTML / GitHub Pages，可下載 | 否 |
| 11 | `csv-one-page-report` | CSV 一頁式管理報告 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 12 | `csv-batch-splitter` | 總表 → 分單位批次拆檔 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 13 | `image-batch-optimizer` | 圖片批次最佳化工作台 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 14 | `exif-privacy-cleaner` | EXIF 隱私檢查與清除 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 15 | `screenshot-sanitizer` | Screenshot Privacy Sanitizer | 單一 HTML / GitHub Pages，可下載 | 否 |
| 16 | `photo-evidence-sheet` | 照片 → 工作成果附件 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 17 | `document-perspective-corrector` | 文件照片透視校正器 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 18 | `pdf-organizer` | PDF 拆分 / 合併 / 重排工作台 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 19 | `pdf-text-search` | PDF 文字擷取與全文搜尋 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 20 | `pdf-review-stamper` | PDF 頁碼 / 浮水印 / 送審章 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 21 | `pdf-secure-redactor` | PDF 安全遮蔽 / Flatten | 單一 HTML / GitHub Pages，可下載 | 否 |
| 22 | `pdf-password-manager` | PDF 密碼管理器 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 23 | `pdf-delivery-cleaner` | PDF 送件清理器 | 單一 HTML / GitHub Pages，可下載 | 否 |
| 24 | `scheduled-work-dashboard` | 每日自動更新工作 Dashboard | GitHub Pages + Actions，不可單 HTML | 否 |
| 25 | `public-data-snapshot` | 公開資料定期快照站 | GitHub Pages + Actions，不可單 HTML | 否 |
| 26 | `web-evidence-packager` | 網址 → 網頁存證包 | Cloudflare | 否 |
| 27 | `ai-meeting-minutes` | AI 會議紀錄整理器 | Cloudflare | 是 |
| 28 | `office-sop-rag` | Office SOP 語意搜尋 / RAG | Cloudflare | 是 |
| 29 | `ai-table-rescue` | PDF / 圖片表格救援器 | Cloudflare | 是 |
| 30 | `ai-file-renamer` | AI 智慧檔名整理器 | Cloudflare | 是 |

# 技術學習曲線

```text
Level 1：單一 HTML，可離線
PRD 01–23
        ↓
Level 2：GitHub Repo + Actions + Pages
PRD 24–25
        ↓
Level 3：Cloudflare Workers / Browser Rendering
PRD 26
        ↓
Level 4：Cloudflare Workers AI / Vision / RAG
PRD 27–30
```

核心原則：

1. **Browser 能解決 → Browser 解決。**
2. **需要排程／Git History → GitHub Actions。**
3. **需要 Server-side → Cloudflare Workers。**
4. **沒有模型就很難完成內容理解 → Cloudflare AI。**

# 每一題進入實作前的固定提案模板

當使用者說「提案 PRD XX」時，才建立：

```text
sdd/<short-name>/
├── proposal.md
└── tasks.md
```

`proposal.md` 至少包含：

```markdown
# <產品名稱>

## 為什麼做
這個需求想解決什麼問題。

## 要改什麼
- 行為 1
- 行為 2
- 行為 3

## 影響範圍
- 新增檔案
- 修改檔案
- Library / API
```

`tasks.md` 至少包含：

```markdown
# Tasks

- [ ] 任務 1
- [ ] 任務 2
- [ ] 任務 3

## 驗收條件
- 情境：……
- 情境：……
```

規則：
- 每個 task 原則上 1 小時內完成。
- 全份不超過 10 條。
- 超過 10 條先拆需求。
- 提案完成後停止，直到使用者說「開始實作」。

# 官方技術依據（2026-08-23 核對）

- GitHub Pages — Using custom workflows with GitHub Pages  
  https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- GitHub Pages — Configuring a publishing source  
  https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Cloudflare Workers  
  https://developers.cloudflare.com/workers/
- Cloudflare Workers AI  
  https://developers.cloudflare.com/workers-ai/
- Cloudflare AI  
  https://developers.cloudflare.com/ai/

# 文件使用方式

這份檔案是 **30 個產品的需求基線，不是實作授權**。

建議每次只做：

```text
提案 PRD 01
→ proposal.md / tasks.md
→ 使用者確認
→ 開始實作
→ 一次完成一條 task
→ 驗收
→ 歸檔
→ 下一個 PRD
```

避免把 30 個產品塞進同一個 Coding Session。
