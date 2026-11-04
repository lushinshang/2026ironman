# 📄 iT 邦幫忙（iThome 鐵人賽）編輯器功能 ＆ Markdown 發文全指南

> **官方來源**：[iT 邦幫忙 Markdown 說明頁面](https://ithelp.ithome.com.tw/markdown)  
> **技術底層**：編輯器為 [SimpleMDE](https://github.com/NextStepWebs/simplemde-markdown-editor)（CodeMirror 核心），程式碼高亮為 [Highlight.js v11.9.0](https://highlightjs.org/)（`railscasts` 配色主題）  
> **適用場景**：iThome 鐵人賽文章撰寫、技術問答發文、技術文章排版。

---

## 📑 目錄

**Part A — Markdown 語法規範**
1. [標題 (Headings)](#1-標題-headings)
2. [文字樣式 (Styling Text)](#2-文字樣式-styling-text)
3. [引用文字 (Blockquotes)](#3-引用文字-blockquotes)
4. [清單列表 (Lists)](#4-清單列表-lists)
5. [程式碼區塊與語法高亮 (Code Formatting)](#5-程式碼區塊與語法高亮-code-formatting)
6. [超連結與自動連結 (Links)](#6-超連結與自動連結-links)
7. [表格 (Tables)](#7-表格-tables)
8. [圖片插入 (Images)](#8-圖片插入-images)
9. [支援的語法高亮程式語言完整清單](#9-支援的語法高亮程式語言完整清單)

**Part B — 編輯器工具列與進階嵌入**
10. [SimpleMDE 編輯器工具列全功能對照表](#10-simplemde-編輯器工具列全功能對照表)
11. [平台專屬進階嵌入語法](#11-平台專屬進階嵌入語法)

**Part C — 限制與避坑**
12. [鐵人賽發文限制與防斷賽機制](#12-鐵人賽發文限制與防斷賽機制)
13. [平台不支援功能與避坑指南](#13-平台不支援功能與避坑指南)

---

# Part A — Markdown 語法規範

---

## 1. 標題 (Headings)

將 `#` 符號置於標題文字前面便能將文字顯示為標題大小（`#` 的數量決定標題層級）：

```markdown
# 這是 H1 標題
## 這是 H2 標題
### 這是 H3 標題
#### 這是 H4 標題
##### 這是 H5 標題
###### 這是 H6 標題
```

> 💡 **注意事項**：`#` 與後方的文字之間建議**保留一個半形空格**。

---

## 2. 文字樣式 (Styling Text)

| 樣式效果 | Markdown 語法範例 | 渲染結果 |
| :--- | :--- | :--- |
| **粗體 (Bold)** | `**粗體文字**` | **粗體文字** |
| *斜體 (Italic)* | `*斜體文字*` | *斜體文字* |
| ~~刪除線 (Strikethrough)~~ | `~~被刪除的文字~~` | ~~被刪除的文字~~ |
| 行內程式碼 / 強調 | `` `code` `` | `code` |

---

## 3. 引用文字 (Blockquotes)

利用 `>` 符號顯示引言或重點提醒：

```markdown
> 一分耕耘，一分收獲。
> 可以多行引用，適合用來放小叮嚀或名言。
```

---

## 4. 清單列表 (Lists)

### (1) 無序清單 (Unordered List)
使用 `*` 或 `-`，符號與後面的文字之間**必須空一格**：

```markdown
* 星星
* 月亮
* 太陽

- 蘋果
- 香蕉
- 橘子
```

### (2) 有序清單 (Ordered List)
使用數字加上英文句點 `1.`、`2.`，數字與文字之間**必須空一格**：

```markdown
1. 第一步：取得截圖
2. 第二步：資料清洗
3. 第三步：產出筆記
```

### (3) 巢狀清單 (Nested List)
次層清單在行首使用 **3 個半形空白** 進行縮排：

```markdown
1. 項目 1
   1. 項目 1 的子項目 A
   2. 項目 1 的子項目 B
2. 項目 2
   * 子無序項目（需縮排 3~4 格）
   * 另一個子項目
```

---

## 5. 程式碼區塊與語法高亮 (Code Formatting)

### (1) 行內程式碼 (Inline Code)
使用單個反引號（鍵盤 `1` 左側的「`` ` ``」）包夾文字：

```markdown
執行 `npm run dev` 啟動本地開發伺服器。
```

### (2) 多行程式碼區塊 (Code Block)
使用 3 個反引號「```` ``` ````」在上下方包夾：

````markdown
```
x = 0
x = 2 + 2
what is x
```
````

或在每行程式碼開頭**空 4 個半形空格**。

### (3) 語法高亮 (Syntax Highlighting)
在開頭的三個反引號後方指定**語言名稱代碼**（若未指定，預設採 HTML 高亮）：

````markdown
```javascript
const message = "Hello iThome Ironman!";
console.log(message);
```
````

````markdown
```sql
CREATE TABLE "topic" (
    "id" serial NOT NULL PRIMARY KEY,
    "forum_id" integer NOT NULL,
    "subject" varchar(255) NOT NULL
);
```
````

---

## 6. 超連結與自動連結 (Links)

### (1) 標準超連結
使用 `[連結文字](網址)` 格式（所有括號必須為半形）：

```markdown
[iT 邦幫忙官方首頁](https://ithelp.ithome.com.tw)
```

### (2) 自動加上連結 (URL Auto-linking)
若希望直接貼網址並自動轉為超連結，可在網址前後加上半形小括號 `(URL)`：

```markdown
歡迎前往 (https://ithelp.ithome.com.tw) 參與討論。
```

---

## 7. 表格 (Tables)

利用直線符號 `|` 與橫線符號 `-` 建立表格：

```markdown
姓名 | 住址 | 備註
------------- | ------------- | -------------
李大華 | 桃園 | 前端工程師
張小明 | 高雄 | 資安工程師
```

> ⚠️ **行動端排版提醒**：表格在手機窄螢幕上容易觸發橫向滾動，鐵人賽發文時若內容過長，建議改採**卡片式清單（Card Layout）**。

---

## 8. 圖片插入 (Images)

使用標準 Markdown 圖片語法，推薦先將圖片上傳至 iThome 後台取得官方圖床網址：

```markdown
![圖片替代文字](https://ithelp.ithome.com.tw/upload/images/20260902/20171720ShKyblMSyO.jpg)
```

---

## 9. 支援的語法高亮程式語言完整清單

iT 邦幫忙使用 **Highlight.js v11.9.0**（`railscasts` 配色主題），支援的語言標籤如下（於 ```` ```language ```` 後指定）：

| 領域分類 | 支援之語言代碼 (Language Tag) |
| :--- | :--- |
| **通用 / 腳本** | `bash`, `shell`, `dos`, `powershell`, `plaintext`, `diff`, `profile` |
| **主流後端** | `python`, `java`, `cpp`, `cs` (C#), `go`, `rust`, `ruby`, `php`, `kotlin`, `swift`, `scala` |
| **前端 / Web** | `javascript`, `typescript`, `html`, `css`, `scss`, `less`, `json`, `yaml`, `xml`, `twig`, `markdown` |
| **資料庫** | `sql`, `pgsql` (PostgreSQL) |
| **系統 / 網路** | `apache`, `nginx`, `http`, `dns`, `dockerfile`, `accesslog`, `ini`, `makefile` |
| **函數式 / 特殊** | `clojure`, `clojure-repl`, `elixir`, `erlang`, `erlang-repl`, `haskell`, `lisp`, `ocaml`, `fsharp` |
| **科學 / 數值** | `r`, `matlab`, `julia`, `julia-repl`, `fortran`, `sas`, `excel` |
| **底層 / 硬體** | `armasm`, `arduino`, `llvm`, `lua`, `perl`, `tcl`, `verilog`, `vhdl`, `vim` |
| **其它** | `brainfuck`, `basic`, `crystal`, `coffeescript`, `cmake`, `django`, `delphi`, `dart`, `glsl`, `haml`, `groovy`, `gradle`, `livescript`, `puppet`, `properties`, `prolog`, `smalltalk`, `vbscript`, `vbnet`, `xquery` |

---

# Part B — 編輯器工具列與進階嵌入

---

## 10. SimpleMDE 編輯器工具列全功能對照表

iT 邦幫忙的文章編輯器基於 **SimpleMDE**（CodeMirror 核心），工具列按鈕**從左到右**依序如下：

| 順序 | 圖示 | 按鈕名稱 | 點擊後的動作 / 插入語法 |
| :---: | :--- | :--- | :--- |
| 1 | **B** | 粗體 (Bold) | 選取文字前後包夾 `**粗體**` |
| 2 | *I* | 斜體 (Italic) | 選取文字前後包夾 `*斜體*` |
| 3 | 🔗 | 插入連結 (Link) | 插入 `[連結文字](URL)` |
| 4 | ❝ | 引用 (Quote) | 行首插入 `>` |
| 5 | `</>` | 新增程式碼 (Code) | 插入 ```` ``` ```` 多行程式碼區塊 |
| 6 | 🖼️ | 插入圖片語法 (Image) | 插入 `![](http://)` 基本圖片 Markdown |
| — | | **分隔線** | |
| 7 | ⬆️ | **上傳圖片** ⭐ | 跳出彈窗：支援**拖曳上傳（Drag & Drop）**或按鈕選檔上傳，完成後自動轉為 `![URL](URL)` 語法 |
| 8 | 📊 | **加入數學公式** ⭐ | 跳出彈窗輸入 **LaTeX 語法**，透過 Google Chart API 產生公式圖片 |
| 9 | 1. | 編號清單 (Ordered List) | 插入 `1. 項目` |
| 10 | • | 項目符號清單 (Unordered List) | 插入 `- 項目` |
| 11 | — | 插入水平線 (Horizontal Rule) | 插入 `---` |
| 12 | ▶️ | **加入 YouTube 影片** ⭐ | 輸入 YouTube 網址，自動轉為可點擊的影片縮圖連結 |
| — | | **分隔線** | |
| 13 | ↩️ | 復原 (Undo) | 編輯歷史上一步 |
| 14 | ↪️ | 取消復原 (Redo) | 編輯歷史下一步 |
| 15 | 😊 | **熊俠貼圖** ⭐ | 彈窗選擇 82 款 iThome 官方「熊俠」GIF 動態貼圖 |
| — | | **分隔線** | |
| 16 | 👁️ | 即時預覽 (Preview) | 切換 Markdown 預覽模式（透過 `POST /api/preview` 後端渲染） |

> 💡 **備註**：標記 ⭐ 的按鈕為 iT 邦幫忙**自訂擴充功能**（非 SimpleMDE 原生）。

---

## 11. 平台專屬進階嵌入語法

### 🎬 (1) YouTube 影片嵌入

點擊工具列的 YouTube 按鈕（或直接在 Markdown 中手寫），編輯器會自動將 YouTube 網址轉為**可點擊的影片縮圖連結**：

```markdown
[![Yes](https://img.youtube.com/vi/影片ID/0.jpg)](https://www.youtube.com/watch?v=影片ID)
```

**使用方式**：
1. 點擊工具列的 ▶️ YouTube 按鈕。
2. 在彈窗中貼入 YouTube 影片網址（如 `https://www.youtube.com/watch?v=jl5oj2VLEws`）。
3. 編輯器自動擷取影片 ID，產生帶有影片封面縮圖的可點擊連結。

> ⚠️ **注意**：這不是真正的嵌入式播放器（`<iframe>`），而是一張**縮圖加超連結**，點擊後會跳轉至 YouTube 觀看。

---

### 🧮 (2) LaTeX 數學公式

點擊工具列的 📊 數學公式按鈕，輸入 LaTeX 語法，編輯器透過 **Google Chart API** 產生公式圖片：

```markdown
![公式](https://chart.googleapis.com/chart?cht=tx&chl=x%3D%5Cfrac%7B-b%5Cpm%5Csqrt%7Bb%5E2-4ac%7D%7D%7B2a%7D)
```

**使用方式**：
1. 點擊工具列的 📊 公式按鈕。
2. 在彈窗中輸入 LaTeX 語法（如 `x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`）。
3. 編輯器自動將 LaTeX 編碼為 URL，產生圖片語法。

---

### 🐻 (3) 熊俠動態貼圖

iT 邦幫忙內建 **82 款「熊俠」官方 GIF 動態貼圖**，可在文章中插入：

**使用方式**：
1. 點擊工具列的 😊 熊俠貼圖按鈕。
2. 在彈窗中瀏覽並點選喜歡的貼圖。
3. 編輯器自動插入圖片語法。

**手動語法（貼圖路徑範例）**：
```markdown
![熊俠](/images/emoticon/emoticon01.gif)
```

貼圖編號範圍：`emoticon01.gif` ~ `emoticon59.gif`、`emoticon61.gif` ~ `emoticon82.gif`（第 60 張不存在）。

---

### 👤 (4) 標記使用者（@提及）

在文章中標記其他 iT 邦幫忙使用者（原始碼中雖有此功能定義，但目前工具列上**已被註解關閉**，不會顯示按鈕）：

**手動語法**：
```markdown
[使用者暱稱](/users/使用者ID)
```

---

# Part C — 限制與避坑

---

## 12. 鐵人賽發文限制與防斷賽機制

### 📤 (1) 圖片上傳限制

| 項目 | 規格 |
| :--- | :--- |
| **單檔大小上限** | **5 MB**（超過會直接報錯：「檔案大小超過限制」） |
| **上傳方式** | 按鈕選檔 或 **拖曳上傳（Drag & Drop）** |
| **上傳 API 端點** | `https://ithelp.ithome.com.tw/api/upload` |
| **圖床網址格式** | `https://ithelp.ithome.com.tw/upload/images/日期/使用者ID隨機碼.jpg` |

### ⏱️ (2) 系統標準時間與截止警告

- 編輯器下方會即時顯示 **UTC+0800 Asia/Taipei 系統標準時間**（每秒更新，透過 `/api/now` API 校正）。
- **晚上 23:30 後**：時間文字自動**變紅色警告**，提醒參賽者當天截止時間將至。
- 點擊時間旁的 🔄 重新整理按鈕可重新同步系統標準時間。

### ✍️ (3) 即時字數統計

- 編輯器右下方會即時顯示「**已輸入 X 字**」計數器（監聽鍵盤輸入與貼上事件）。

### 📝 (4) 發文操作按鈕

| 按鈕 | 功能 |
| :--- | :--- |
| **儲存草稿** | 儲存目前內容為草稿，不公開發布 |
| **發表文章** | 正式發布（隱藏在儲存草稿的下拉選單中） |
| **刪除草稿** | 永久刪除此草稿（隱藏在儲存草稿的下拉選單中） |

### 🏷️ (5) Tag 標籤

- 鐵人賽文章會自動帶上 `18th鐵人賽` 預設標籤。
- 可自行新增其他技術 Tag（使用 Select2 多選元件）。

### 🔒 (6) 預覽渲染機制

- 點擊「預覽」按鈕時，Markdown 內容會透過 **AJAX `POST /api/preview`** 送至後端解析為 HTML 後回傳顯示。
- 預覽時程式碼區塊會經過 Highlight.js 高亮渲染。
- 這代表**前端預覽 ≈ 最終發布效果**，可作為排版檢查的可靠依據。

### 🛡️ (7) 安全機制

- 側邊欄明確標示：**「本站編輯器採 Markdown 語法，請勿使用 HTML Code，以避免內容濾掉無法呈現」**。
- 使用 Cloudflare Turnstile 驗證（反機器人）。
- 所有表單提交皆攜帶 CSRF Token（`X-CSRF-TOKEN`）。

---

## 13. 平台不支援功能與避坑指南

為確保發布於 iThome 鐵人賽時版面 100% 正常，請特別注意以下**平台不支援項目**：

### ❌ 1. 不支援原生 Mermaid 圖表
- **問題**：若在 iThome 貼上 ```` ```mermaid ```` 代碼塊，平台**無法渲染出圖形**，會顯示一整塊原始代碼。
- **正解**：改用純文字 **Unicode / ASCII 框線流程圖（` ```text `）**，或將流程圖截圖上傳。

### ❌ 2. 不支援 HackMD 專屬 Callout 方塊
- **問題**：HackMD 的 `:::info`、`:::warning`、`:::tip` 在 iThome **會直接顯示為純文字**。
- **正解**：改用標準引用語法加上 Emoji：
  ```markdown
  > 💡 **小提示**：所有鑑別檢查一律需在後端驗證。
  ```

### ❌ 3. 不支援 HTML 標籤
- **問題**：官方明確表示「**請勿使用 HTML Code，以避免內容濾掉無法呈現**」。
- **正解**：所有排版一律使用純 Markdown 語法。包含 `<br>`、`<details>`、`<summary>` 等常見標籤都可能被過濾。

### ❌ 4. 不支援本機檔案絕對路徑圖片
- **問題**：本機路徑如 `![截圖](/Users/.../photo.jpg)` 讀者無法讀取。
- **正解**：於 iThome 編輯器點選「上傳圖片」，使用產出的官方圖床網址（`https://ithelp.ithome.com.tw/upload/images/...`）。

### ⚠️ 5. 寬表格在手機端體驗不佳
- **問題**：超過 3~4 欄的寬表格在手機 App 或行動瀏覽器上會被擠壓或必須左右滑動。
- **正解**：大量資料改採「標題 ＋ 列點卡片式（`### 01. 名稱` ＋ 列點）」排版。

### ⚠️ 6. YouTube 嵌入為縮圖連結而非嵌入式播放器
- **問題**：iThome 不支援 `<iframe>` 嵌入，YouTube 影片不會直接在頁面上播放。
- **正解**：使用編輯器的 YouTube 按鈕產生的**縮圖 + 超連結**格式即可，讀者點擊後跳轉至 YouTube。

### ❌ 7. 不支援 ==text== 螢光筆標註語法
- **問題**：`==text==` 為 HackMD / Markdown Extended 專屬語法，iThome SimpleMDE **無法解析**，會直接在頁面裸露成 `==text==` 純文字等號。
- **正解**：在 iThome 上欲加強文字視覺焦點，改用標準 Markdown **行內程式碼反白（`` `text` ``）** 或 **粗體（`**text**`）**。
