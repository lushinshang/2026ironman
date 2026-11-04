# Day04 — 繁簡與台灣在地化轉換器（`zh-tw-localizer`）

- PRD 對應：`../2026-ironman-vibecoding-30-prd.md` PRD 04
- SDD：`../../sdd/zh-tw-localizer/`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- 互動模式：**按鈕觸發**（`shared/CONTRACT.md` 第 5 節）

## MVP 實作範圍

- 四階段鏈式轉換：簡繁 → 異體字 → TW 用語 → 使用者自訂詞庫
- 轉換前後並排、高亮替換位置並標示來源階段
- 候選逐項接受／取消（切換為純本地重組，不重新掃描）
- 可編輯的 TW 用語詞庫（新增／修改／刪除列）
- 自訂詞庫 JSON 匯入／匯出（物件鍵值對；JSON 陣列視為錯誤格式）
- 下載 TXT / MD、複製結果、下載本工具離線版

## 核心架構：掃描與套用分離

v1（`old/Day3`）踩過的坑是「把文字拆成 chunk、每個 chunk 各自比對」，跨 chunk 邊界的詞（「軟」「件」被拆進不同 chunk）永遠比對不到「軟件」。

v2 保留 v1 的修正結論——**每個 stage 都在完整、未被前一 stage 切碎的文字上重新掃描**——並把「掃描」與「套用」拆成兩階段：

1. `runStage()` 先 `composeUnits()` 還原完整文字再逐字元找最長比對，比對結果不直接覆寫，而是把覆蓋到的 unit 包成巢狀的 op node（`{id, stage, before, after, accepted, children}`）
2. 勾選切換只改 `accepted` 布林值，重新 `composeUnits()` 組出文字，不重新掃描、不需處理位置位移

有效文字規則：`accepted && composeUnits(children) === before` 才取 `after`，否則取 children 組出的文字。因此取消內層的簡繁候選時，外層 TW 用語候選會自動失效退回原字，行為可預期。

## 內嵌 Library / 資料來源

| 項目 | 內容 |
|---|---|
| 套件 | `opencc-python-reimplemented` **0.1.7**（pip） |
| 授權 | **Apache License 2.0** |
| 來源 | https://github.com/BYVoid/OpenCC |
| 使用的詞典檔 | `STPhrases.txt`、`STCharacters.txt`、`TWVariants.txt`、`TWPhrases.txt` |
| 轉製腳本 | `build_dicts.py`（本目錄），輸出到 `src/*.json` |

### 產出的三份 ASSET

| 資源名 | 來源 | 筆數 | escape_mode |
|---|---|---|---|
| `stMerged` | STPhrases(49,051) + STCharacters(3,980) 合併 | 53,031 | `json_string` |
| `twVariants` | TWVariants | 39 | `json_string` |
| `twPhrases` | TWPhrases | 509 | `json_string` |

合併規則（依 proposal）：同鍵衝突時**詞組優先於單字**（實測目前兩者鍵集合零重疊）；一對多（空白分隔多候選）**一律取第一候選**。

資源名使用 camelCase，因為 `bundle.py` 的 `json_string` 模式會產出 `var <資源名> = "...";`，資源名必須是合法 JS 變數名。

授權標示由 `<!--{{LICENSES}}-->` placeholder 渲染成頁尾可見的 `.bundled-licenses` 區塊，另有一段 `.license-note` 標明版本與來源連結。

## 不做

AI 改寫、整句重寫、語氣潤飾；v1 的「網路流行語僅提示不替換」分信心層級（理由見 proposal）。

## 建置

```
python3 build_dicts.py                                   # 產出 src/*.json
python3 ../scripts/bundle.py src .                       # 產出 index.html + bundle_manifest.json
```

## 驗證

`file://` 直開 build 產物，Playwright 實測 43 條全數通過（含鏈式轉換、逐項切換、邊界情況、格式錯誤匯入、離線版清空、無對外請求）。
