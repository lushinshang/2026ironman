# zipthenencry

單一 html 檔案的打包＋密碼加解密工具，純前端、離線可用，不需安裝、不需伺服器。

## 使用方式

雙擊 `index.html` 用瀏覽器開啟即可。

### 加密

1. 選檔案（可多選）或選整個資料夾（會保留資料夾結構）
2. 輸入密碼
3. 選加密等級：
   - **標準**：PBKDF2 30 萬次迭代
   - **高**：PBKDF2 100 萬次迭代（較慢，更抗暴力破解）
4. 按「加密並下載」，會下載一個 `.enc` 檔

### 解密

1. 選剛才下載的 `.enc` 檔
2. 輸入同一組密碼
3. 按「解密並下載」，會下載一個還原後的 `.zip`
4. 自行解壓縮該 `.zip`，即可拿回原始檔案與資料夾結構

## 技術細節

- 打包：內嵌 [JSZip](https://stuk.github.io/jszip/) v3.10.1（無 CDN 相依，離線可用）
- 加密：AES-256-GCM，金鑰由密碼經 PBKDF2(SHA-256) 導出，每次加密使用隨機 salt（16 bytes）與 IV（12 bytes）
- 加密檔容器格式：`MAGIC(4 bytes "ZTE1") + 迭代次數(4 bytes) + salt(16 bytes) + iv(12 bytes) + 密文`
- 密碼錯誤或檔案被竄改時，AES-GCM 的驗證會失敗並直接報錯，不會產生內容錯誤的檔案
- `.enc` 不是標準 zip 格式，只能用本工具（同一份 `index.html`）搭配正確密碼解密，Mac／Windows 系統內建解壓縮無法辨識

## 已知限制

- `crypto.subtle`（Web Crypto API）需要瀏覽器將目前頁面視為安全情境；實測桌面版 Chrome 對 `file://` 開啟的頁面視為安全情境，可正常運作。若你的瀏覽器出現「crypto.subtle 無法使用」的錯誤訊息，可改用本機伺服器開啟：
  ```
  cd 這個資料夾
  python3 -m http.server 8000
  ```
  再用瀏覽器開 `http://localhost:8000/index.html`
- 大量或超大檔案（數百 MB 以上）因整包在瀏覽器記憶體中處理，可能變慢或吃記憶體
