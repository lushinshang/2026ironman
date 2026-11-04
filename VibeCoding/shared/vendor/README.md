# 第三方 CSV 資源

| 檔案 | 版本／授權 | 來源 URL | SHA-256 |
|---|---|---|---|
| `papaparse-5.6.0.min.js` | Papa Parse 5.6.0 / MIT | `https://unpkg.com/papaparse@5.6.0/papaparse.min.js` | `7a3550ac537992d0b83445028386e6aca956392e1a352ee985371795b78772d4` |
| `fflate.umd.js` | fflate 0.8.3 / MIT | `https://unpkg.com/fflate@0.8.3/umd/index.js` | `462ef8041fc970e3615a20a9dd2b2e3047a073b2da729ef4f02b634bba8b7b83` |

下載日：2026-08-23。兩個檔案皆為 UMD，可用 `ASSET` 的 `raw_js` 模式內嵌；不可改用 CDN。

# 第三方 PDF 資源

| 檔案 | 版本／授權 | 來源 URL | SHA-256 | 大小 |
|---|---|---|---|---|
| `pdf.min.js` | pdfjs-dist 3.11.174 / Apache-2.0 | `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js` | `5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946` | 320,004 bytes |
| `pdf.worker.min.js` | pdfjs-dist 3.11.174 worker / Apache-2.0 | `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js` | `51a1f19443eb332078c0dbb6872109b53cc40cdec4146e500ad2ed274e4ad423` | 1,087,299 bytes |
| `cantoo-pdf-lib.min.js` | @cantoo/pdf-lib 2.9.1 / MIT | `https://unpkg.com/@cantoo/pdf-lib@2.9.1/dist/pdf-lib.min.js` | `5458a18eb5adfc387b2f005f7c7d56d3f379ae7d1a4b98ca37329cdb942930f3` | 634,148 bytes |
| `fontkit.umd.min.js` | @pdf-lib/fontkit 1.1.1 / MIT | `https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js` | `669e8d33acde2ae8489bd334f287cb70bae59417e68400309f26e0f78fb9e103` | 758,767 bytes |
| `NotoSansTC-Regular.otf` | Noto Sans TC Regular / OFL-1.1 | `https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetOTF/TC/NotoSansTC-Regular.otf` | `5bab0cb3c1cf89dde07c4a95a4054b195afbcfe784d69d75c340780712237537` | 5,683,368 bytes |
| `NotoSansTC-base64.js` | Noto Sans TC Base64 / OFL-1.1 | 本地由 `NotoSansTC-Regular.otf` 轉封裝 | `0975825f495b6d3fcf2671f8c1df995ec5517255df750dd28f9a5345f80c72b6` | 7,577,898 bytes |

下載日：2026-08-24。JS 檔案皆為 UMD，可用 `ASSET` 的 `raw_js` 模式內嵌；字型檔於 Day22 依裁示 1 採用。不可改用 CDN。
