# Day11 csv-pivot-dashboard — Phase A 效能實測（task 5 / D3）

## 測試方式

- 測資：程式產生 50,000 列 × 6 欄 CSV（`單位`／`部門`／`日期`／`金額`／`備註`／`編號`，`單位` 20 個
  unique 值、`部門` 4 個 unique 值、`日期` 隨機 2020–2026 年、`金額` 約 3% 為 `N/A`）。
- 量測方式：不使用手動操作 DevTools Performance 面板錄影，改用等效但可重跑驗證的
  `performance.now()` 埋點（`window.__pivotPerfHook`，src/index.html 內建）：
  在觸發 `change` 事件的**同一個巨集任務**前後量測，並在兩個 `requestAnimationFrame` 之後
  （確保已完成一次 paint）才停表，語意等同 DevTools「change 到最後一次 paint」。
- 操作：Group By ② 從（無）改為第二個 Dimension（`部門`），觸發 `dispatchEvent(new Event('change'))`。
- 工具：本機 `python3` + `playwright`（非 Playwright MCP，避免共享實例分頁被搶）。

## 結果（4 次獨立執行，各自重新載入頁面與檔案）

| 次數 | 耗時 (ms) |
|---|---|
| 1 | 18.40 |
| 2 | 7.30 |
| 3 | 13.10 |
| 4 | 17.70 |

**通過門檻（< 500 ms）**：全部 4 次皆遠低於 500 ms 上限（最慢 18.40 ms，約為門檻的 3.7%）。

切換後渲染群組數：80 組（20 個單位 × 4 個部門），符合預期。

## 驗證腳本

`/private/tmp/.../scratchpad/day11/test_perf.py`（暫存目錄，非版控範圍）。
