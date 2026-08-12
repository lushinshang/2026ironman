# 提案：Day8 文章草稿撰寫

## 為什麼做

`Day8/` 目錄下程式碼已完成並經三輪驗收（初版 12 條、雜訊過濾 11 條、門檻調整與空白規則各 8 條，全數通過），但文章連初稿都還沒開始。依 `CHECKLIST.md` 固定六段式結構撰寫，跟 Day6/Day7/Day9 一致的風格與品質要求。

## 要改什麼

新增 `VibeCoding/Day8/article_draft.md`，六段式結構：情境 → 解題思路 → 資源 → Vibe 過程 → 產品 → 心得與反思。

內容規劃：

1. **情境**：承辦人員拿 Day7 輸出的差異報告，逐條篩選雜訊比不用工具省不了多少力氣的痛點（承接 Day6→Day7→Day8 的敘事線）
2. **解題思路**：為什麼選擇「Day8 加過濾規則」而非「回頭修 Day7 演算法」的取捨；四項雜訊判斷規則的設計脈絡；1 張 Mermaid 圖（解析＋雜訊判斷流程）
3. **資源**：Day7 差異報告格式作為輸入介面、Playwright 測試、fresh agent 獨立驗收機制
4. **Vibe 過程**：三輪真實文件測試的反覆修正過程（初版雜訊過濾→門檻2→1調整→空白錯位規則），呈現「合成測試案例過關 ≠ 真實資料乾淨」的反覆驗證精神；1 張 Mermaid 圖（三輪迭代時序或規則演進）
5. **產品**：功能清單、Playwright 實測截圖（桌面+手機，比照 Day7 雙欄呈現）、已知限制、GitHub Pages 連結（已用 `curl -sI` 驗證 200）、原始碼連結
6. **心得與反思**：從真實資料反覆驗證中學到的教訓，呼應 Day6/Day7/Day9 一貫強調的「驗收全過≠真的能用」主題但不重複，聚焦本工具特有的「過濾規則本質上是武斷估計值，沒有完美解」的取捨心得

## 影響範圍

- 新增檔案：`VibeCoding/Day8/article_draft.md`、`VibeCoding/Day8/screenshot_desktop.png`、`VibeCoding/Day8/screenshot_mobile.png`（Playwright 截圖）
- 修改既有檔案：`VibeCoding/README.md`、`VibeCoding/index.html`（Day8 列的撰文狀態從「待撰文」改為完成）、`Day8/README.md`（勾選項目更新）
- 不動 `Day8/index.html` 程式碼、不動 Day6/Day7/Day9
