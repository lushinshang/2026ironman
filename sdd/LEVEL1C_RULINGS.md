# Level 1c 裁示（2026-08-24）

> Level 1c（Day14–18 五題 + 前置工程 `img-infra`）由 Antigravity 實作交付、
> 宣稱「全數 PASS」，經六個不知情的獨立驗收 agent 逐一重新查證，
> **五個單位需要修正，只有 Day16 通過**。本檔記錄使用者對其中兩項「待裁示」
> 規格衝突的裁決，優先於各提案內既有的敘述。修正時以本檔為準。

## 背景：為什麼需要這份文件

`ANTIGRAVITY_HANDOFF.md` 第 2 節第 6 條明文規定：「規格不明時停下，不要自己猜著定案」，
且各提案的「待裁示」段落明講「本提案不自行定案」。實際交付結果顯示這條規則**沒有被遵守**——
Day14、Day15、Day18 都把提案裡的建議當定案直接寫進 `tasks.md` 並全部打勾結案，
全庫找不到任何裁示紀錄。本檔補回這個缺失的步驟。

---

## 裁示 1：`exif-privacy-cleaner`（Day15）核心規格衝突

**衝突**：PRD 14 MVP 明文「使用者勾選清除項目」，字面上暗示欄位級選擇（例如「只清除
GPS，保留拍攝日期」）。但 `IMG_CONTRACT.md` 第 5 節 `stripMetadataSegments()` 的移除
策略是整段拿掉 APP1 segment，技術上做不到欄位級選擇性清除。

**裁示：接受**（使用者 2026-08-24 確認，「1.ok」）。

`sdd/exif-privacy-cleaner/proposal.md`「待裁示 1」提出的折衷方案定案：
勾選項目是**分類展示與確認清單**，使用者勾選代表「我知道這張圖含 GPS／裝置資訊／XMP，
要清除」，按下「開始清除」後永遠整段移除該圖的所有 Metadata，不是只移除勾選的類別。
若使用者只想保留某類 Metadata，唯一選項是「此張不處理」（整張跳過）。

實作現況（Day15 目前的 UI）已經符合這個裁示——四個核取方塊 `checked: true, disabled: true`，
文案誠實揭露「清除時將直接抹除 APP1 Metadata 區段，徹底銷毀以下資訊」，沒有誤導使用者
以為可以做欄位級保留。**這部分不需要改動**，需要改的是本次驗收抓到的另外兩項功能缺陷
（`loadImageFile()` 零呼叫、清除後未重新驗證），見裁示 3。

---

## 裁示 2：`photo-evidence-sheet`（Day18）任務 3「拖曳排序」

**衝突**：PRD 16 與 `tasks.md` 任務 3 明文「拖曳排序」，實作用的是「上移／下移按鈕」，
`logs/log_day18.md` 第 4 點作者自己承認做的是按鈕排序，卻仍在 `tasks.md` 把任務 3
打勾為完成。

**裁示：接受按鈕方案，回頭修改任務書措辭**（使用者 2026-08-24 確認，
「2.接受按鈕方案並回頭改任務書措辭」）。

不需要補做真正的拖曳互動。修正範圍是**文件而非程式碼**：
- `sdd/photo-evidence-sheet/tasks.md` 任務 3 標題與驗收情境，把「拖曳排序」改為
  「上移／下移排序」，驗收情境改成「點擊『上移』／『下移』使照片與圖說一起移動到
  新位置」，不再要求「拖到第 1 張前面」這種拖曳手勢描述。
- `sdd/photo-evidence-sheet/proposal.md` 若有提到「拖曳」的描述一併更正。
- PRD 16 本身不用改（PRD 是需求來源，不因實作方式調整而回頭改），但 `PRD.md`
  複製檔若有「拖曳排序」字樣，比照 `tasks.md` 的更正方式加註說明。

驗收方式：資料綁定邏輯（照片＋圖說整個物件一起移動，非平行陣列）本次驗收**已經用
上移／下移按鈕驗證過通過**，不需要重新測試這部分；只需要文件措辭跟上實際行為。

**追記（2026-08-24）**：裁示當下只回填了 `tasks.md`／`proposal.md`，漏了
`VibeCoding/Day18_photo-evidence-sheet/article_draft.md`——文章標題「非破壞性拖曳
排版」、開場「拖曳即時重排」、Mermaid 流程圖節點「排序調整 (上移/下移/拖曳)」三處
仍寫「拖曳」，與本裁示矛盾（心得段落原本就正確寫「上移下移重排」，僅前述三處未同步）。
於後續一次「檢查 Level 1c 有無撰文」的複查中發現並已修正，三處改為「上移／下移」，
不再提拖曳。教訓：裁示涉及措辭更正時，需求文件（`tasks.md`/`proposal.md`）與對外文
（`article_draft.md`）都要列入回填範圍，不能只改前者。

---

## 裁示 3（追認）：`image-batch-optimizer`（Day14）三項待裁示

`sdd/image-batch-optimizer/proposal.md` 的三項待裁示（目標容量與長邊限制的整合順序、
PNG 轉檔詢問的 UI 型態、批次同名檔案下載命名規則），技術風險低、提案已有合理暫定方案，
指揮官提議直接採用並詢問使用者，使用者未表示反對（2026-08-24，僅針對裁示 1、2 明確
回覆，未對此項提出異議，依 `ops/JUDGMENT.md` 的默認同意判準視為接受）。

**裁示：接受提案暫定方案，追認為定案，回填紀錄**：
1. 先套用使用者設定的長邊限制 `resizeCanvas()` 一次，再對結果跑 `compressToTargetSize()`
2. PNG 轉檔詢問：批次層級問一次，不逐檔詢問
3. 同名檔案下載：`baseName + '_opt' + ext`，衝突時加序號後綴（`_1`、`_2`…）

實作現況（`src/index.html` 637–651、266–270、713–714 行）已經是這樣做的，**這部分不需要
改動程式碼**，只需要在 `proposal.md`「待裁示」段落補上這則裁示紀錄，讓文件與實際行為
一致、且有可追溯的裁決來源——這正是本次驗收抓到的問題（有做但沒紀錄）。

---

## 尚未涉及裁示、純技術缺陷的修正（不需要使用者裁決，直接修）

- `img-infra`：EXIF Orientation 雙重轉正（`img-decode.js`）、`stripMetadataSegments()`
  清不掉內嵌第二層 JPEG 的 XMP（`img-exif.js`）
- Day14：`setupDropZone()`／`setupFilePicker()` 零呼叫，改為真正串接
- Day15：`loadImageFile()` 零呼叫（縮圖需求未實現）；清除後未重新呼叫 `readExifTags()`
  驗證 `cleanedBuffer`
- Day17：`performPerspectiveWarp()` 把角點用 `{x,y}` 物件傳給要求 `[x,y]` 陣列索引的
  `solveHomography()`，導致 100% 輸出全黑；Tier 1／2 即時預覽完全未實作；角點控制點
  被 `overflow:hidden` 裁掉一半可點擊區域
- Day18：`setupDropZone()` 被呼叫但傳空函式 `onData`，實際邏輯繞道自寫的 `change`／
  `drop` 監聽器；`resizeCanvas()` 長邊上限 1200px 未經真實照片實測（proposal.md 暫定
  1600px，兩者不一致且無紀錄說明）
