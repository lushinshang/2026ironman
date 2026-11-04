# 第三方 CSV 資源

| 檔案 | 版本／授權 | 來源 URL | SHA-256 |
|---|---|---|---|
| `papaparse-5.6.0.min.js` | Papa Parse 5.6.0 / MIT | `https://unpkg.com/papaparse@5.6.0/papaparse.min.js` | `7a3550ac537992d0b83445028386e6aca956392e1a352ee985371795b78772d4` |
| `fflate.umd.js` | fflate 0.8.3 / MIT | `https://unpkg.com/fflate@0.8.3/umd/index.js` | `462ef8041fc970e3615a20a9dd2b2e3047a073b2da729ef4f02b634bba8b7b83` |

下載日：2026-08-23。兩個檔案皆為 UMD，可用 `ASSET` 的 `raw_js` 模式內嵌；不可改用 CDN。

# 第三方 PDF 資源

| 檔案 | 版本／授權 | 來源 URL | SHA-256 | 大小 |
|---|---|---|---|---|
| `pdf.min.js` | pdfjs-dist 4.10.38 legacy / Apache-2.0（**本地轉換**，見下方） | `https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-4.10.38.tgz` 內 `legacy/build/pdf.min.mjs` | `10f8fafb7ab341dd354c892e8d62a0ec52ae6b0bb8703f583d0dbc67e3937c1f` | 397,247 bytes |
| `pdf.worker.min.js` | pdfjs-dist 4.10.38 legacy worker / Apache-2.0（**本地轉換**，見下方） | 同上 tgz 內 `legacy/build/pdf.worker.min.mjs` | `160c887f624b15af8f57ae7f8377303e5e4b9bf6698e80b78aa370d115a0efc9` | 1,417,551 bytes |
| `cantoo-pdf-lib.min.js` | @cantoo/pdf-lib 2.9.1 / MIT | `https://unpkg.com/@cantoo/pdf-lib@2.9.1/dist/pdf-lib.min.js` | `5458a18eb5adfc387b2f005f7c7d56d3f379ae7d1a4b98ca37329cdb942930f3` | 634,148 bytes |
| `fontkit.umd.min.js` | @pdf-lib/fontkit 1.1.1 / MIT | `https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js` | `669e8d33acde2ae8489bd334f287cb70bae59417e68400309f26e0f78fb9e103` | 758,767 bytes |
| `NotoSansTC-Regular.otf` | Noto Sans TC Regular / OFL-1.1 | `https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetOTF/TC/NotoSansTC-Regular.otf` | `5bab0cb3c1cf89dde07c4a95a4054b195afbcfe784d69d75c340780712237537` | 5,683,368 bytes |
| `NotoSansTC-base64.js` | Noto Sans TC Base64 / OFL-1.1 | 本地由 `NotoSansTC-Regular.otf` 轉封裝 | `0975825f495b6d3fcf2671f8c1df995ec5517255df750dd28f9a5345f80c72b6` | 7,577,898 bytes |

下載日：2026-08-24。JS 檔案皆為 UMD，可用 `ASSET` 的 `raw_js` 模式內嵌；字型檔於 Day22 依裁示 1 採用。不可改用 CDN。

**pdf.js 4.10.38 的本地轉換（2026-11-04，修 CVE-2024-4367）**：pdf.js 自 4.x 起只發行 ESM（`.mjs`），無 UMD。為維持 classic `<script>` 與 Blob Worker 的內嵌架構，對 `legacy/build/` 的兩個檔案各做以下處理，其餘位元組不動：
- `pdf.min.mjs`：移除檔尾 `export{...}`（`globalThis.pdfjsLib` 在檔內已設定）；兩處 `import.meta.url` 替換為 `""`（皆位於 Node.js 專用分支，瀏覽器不會執行）。
- `pdf.worker.min.mjs`：僅移除檔尾 `export{uo as WorkerMessageHandler};`。
- 原始下載檔 SHA-256 未記錄；要驗證請自行下載 tgz 後重做上述轉換並比對本表雜湊。
- 選 `legacy/` 是為了含 `Promise.withResolvers` 等 polyfill，較舊瀏覽器也能跑。
