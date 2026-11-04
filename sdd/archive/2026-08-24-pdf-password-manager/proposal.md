# PDF 密碼管理器（pdf-password-manager）

- PRD 對應：`VibeCoding/2026-ironman-vibecoding-30-prd.md` `## PRD 22`
- 部署型態：單一 HTML / GitHub Pages，可離線
- AI：否
- SDD：`sdd/pdf-password-manager/`
- 產品目錄：`VibeCoding/Day23_pdf-password-manager/`
- 資料層依據：`VibeCoding/shared/PDF_CONTRACT.md`（全文，`pdf-build.js` 的
  `encryptPdf()`／`decryptPdf()` 由 `sdd/pdf-infra/` 前置工程建立並驗收，本提案假設其
  已就緒，不重複實作加解密機制）
- 互動模式：**按鈕觸發**（批次處理成本高、耗時，且需要使用者先確認密碼與模式設定
  才開始跑，不能每改一個欄位就重新處理整批）

## 為什麼做

**這題原本用官方 `pdf-lib`（`hopding/pdf-lib`）完全做不到**——官方版遇到加密 PDF
直接丟 `EncryptedPDFError`，也沒有任何 API 可以對輸出設定密碼，這代表 PRD 22 的
MVP（開啟已知密碼的 PDF、設定新密碼、更換密碼）字面上全部無法實作。這不是本題自己
發現的問題，是 `sdd/pdf-infra/` 前置工程在提案階段查證後改用 `@cantoo/pdf-lib`
（官方 pdf-lib 的維護中 fork，MIT 授權）才解決的阻塞——該 fork 支援
`PDFDocument.load(bytes, {password})` 讀取加密檔與 `pdfDoc.encrypt({userPassword,
ownerPassword, permissions})` 寫入加密檔。**這題能不能做完全建立在前置工程換 fork
這個決定上**，往後若有人想把 vendor 換回官方 pdf-lib，這題會直接失效，需要在
`PDF_CONTRACT.md` 第 1.2 節找回這段脈絡。

PDF 在合併、整理、送審流程中常需要先用已知密碼解鎖才能處理，交付前又常需要重新
上鎖或換一組密碼給收件方。本題把 `pdf-infra` 已驗證的加解密機制包成一個批次工作台。

## 要改什麼

- 上傳區：多檔 PDF 匯入（`setupDropZone()`／`setupFilePicker()`，`opts.multiple: true`），
  接 `checkPdfBatchSize()` 做整批閘門，逐檔另呼叫 `checkPdfFileSize()`。
- 模式選擇（三選一，互斥）：
  1. **解鎖**：輸入已知密碼，對整批呼叫 `decryptPdf(bytes, password)`，成功者產生
     未加密副本。
  2. **設定新密碼**：對整批未加密的 PDF 呼叫 `encryptPdf(pdfDoc, {userPassword: 新密碼})`。
  3. **更換密碼**：先用舊密碼呼叫 `decryptPdf()`，成功後再用新密碼呼叫 `encryptPdf()`，
     兩步串接。
- 密碼輸入：明碼/遮罩切換（`type="password"` + 顯示切換按鈕），不記憶密碼到任何儲存
  （不用 localStorage，關頁即消失，比照契約「不覆寫原始檔」精神延伸為「不留存密碼」）。
- 批次結果列表：逐檔顯示成功／失敗，失敗原因需可辨識（密碼錯誤 vs 檔案格式不支援
  vs 檔案損毀），**繼續處理批次中其餘檔案，不因單一檔案失敗而整批中止**（見下方
  待裁示 1，這是本提案的暫定方向，非契約規定）。
- 輸出：單檔下載（逐列）／全部成功的打包 ZIP 下載（`createZipBlob()`），失敗的檔案
  不進入 ZIP。
- Level 1 共通 UI 基線：`buildCleanHtmlCopy()` 清空已上傳佇列、密碼輸入欄位、處理結果、
  `#__shared_toast`，移除 `.nav-back` 與站內連結。

## 待裁示（本提案不自行定案，需使用者裁決）

1. **批次中部分檔案密碼錯誤時，UI 行為是否整批中止還是繼續處理其餘檔案？**
   PRD 22 只說「顯示成功／失敗檔案」，沒說失敗時的批次控制流程。本提案暫定「繼續
   處理其餘檔案，逐檔獨立顯示成功／失敗」（同一批裡有的檔案密碼對、有的密碼錯，
   是很自然的真實情境，中止整批對使用者不友善），但這是本題自訂的 UX 決定，需要
   使用者確認是否接受。
   **裁示：見 `LEVEL1D_RULINGS.md` 第 10 條——採暫定，不中止，逐檔獨立顯示成功／
   失敗，繼續處理其餘檔案。**

2. **加密演算法／金鑰長度是否要讓使用者選？** `@cantoo/pdf-lib` 的 `encrypt()` 實際
   預設用什麼加密演算法版本（RC4 或 AES、128-bit 或 256-bit），**待 `sdd/pdf-infra/`
   任務 8 的實測結果確認**，本提案不假設任何版本號。若前置工程驗證結果顯示只支援
   單一演算法，本題自然沒有「讓使用者選」的空間，這條待裁示屆時可能自動失效；若
   支援多種，需要使用者裁示是否要曝露這個選項給終端使用者（多一個選項＝多一分
   認知負擔，多數使用者不需要知道演算法細節）。
   **裁示：見 `LEVEL1D_RULINGS.md` 第 11 條——決定不曝露。不管 `pdf-infra` 任務 8
   實測出的演算法版本是單一還是多種，UI 一律不做選項；實際演算法版本號仍要記錄在
   `pdf-infra` 驗收報告與 `PDF_CONTRACT.md` 供查閱，但不影響本題 UI。這是明確定案，
   不需要等實測結果才能開工。**

3. **PDF 權限（`SecurityOptions.permissions`，例如列印／複製／編輯權限）要不要做成
   本題的功能？** PRD 22 完全沒提到「權限」，只提到「密碼」。本提案傾向**不做**，
   只用密碼保護（`userPassword`／`ownerPassword`），不曝露細部權限勾選 UI，避免
   PRD 沒要求的範圍蔓延；但契約第 4 節 `encryptPdf()` 的 `opts` 本來就留了
   `permissions` 欄位（因為 `@cantoo/pdf-lib` 的 API 本身就有），若使用者認為這是
   合理的加值功能，之後加也不難，這裡先問清楚要不要現在就做。
   **裁示：見 `LEVEL1D_RULINGS.md` 第 12 條——採暫定，不做。`opts.permissions` 欄位
   在契約層級保留，本題不建立對應 UI。**

## 影響範圍

**新增檔案**：
`VibeCoding/Day23_pdf-password-manager/src/index.html`、
`VibeCoding/Day23_pdf-password-manager/src/bundle.json`、
`VibeCoding/Day23_pdf-password-manager/index.html`（build 產物）、
`VibeCoding/Day23_pdf-password-manager/bundle_manifest.json`（build 產物）、
`VibeCoding/Day23_pdf-password-manager/PRD.md`、
`sdd/pdf-password-manager/proposal.md`（本檔）、
`sdd/pdf-password-manager/tasks.md`。

**不修改**任何既有 `shared/` 模組（純呼叫 `pdf-infra` 已建立的介面）、不影響 Level
1a／1b／1c 任何既有產品。
