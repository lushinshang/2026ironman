# 任務：VibeCoding 作品集入口頁重製

- [x] 1. 備份舊版：複製到 `sdd/portfolio-index-redesign/backup/index.html`，記 sha256，並與 `git show HEAD:VibeCoding/index.html` 做 `cmp`
- [x] 2. 建立量測工具與基準：確認 Lighthouse／axe 可否取得；寫 `check.py`（本機 Python playwright）量 28 條 href、外部請求、console error、水平捲軸、對比度、鍵盤焦點，並對**舊版**跑一次存基準
- [x] 3. 設計方向與資訊架構：用 frontend-design skill 定美學方向、字型堆疊、亮暗 token、動態語彙、Level 分群；寫成 `design.md` 給使用者過目
- [x] 4. 版面與內容結構：Hero、分群作品區、方法論／進度區、頁尾；28 張卡片 href 與順序不變；無 JS 即完整可用
- [x] 5. 視覺系統：token、排版、亮暗主題與手動切換
- [x] 6. 動態與互動：進場揭露、hover／focus、Level 篩選與搜尋；`prefers-reduced-motion` 全面降級
- [x] 7. 無障礙與 SEO：skip link、`:focus-visible`、地標、meta／OG／favicon；校正 Day29 與導言兩處事實錯誤
- [x] 8. 響應式與效能：320／768／1280／1920 四個寬度截圖檢視；單檔大小預算與零外部請求
- [x] 9. 自我檢查迴圈：依下方評分表自評 → 列出低於 4 分的項目 → 修 → 重跑 `check.py`，最多 3 輪，每輪結果與截圖留存於 `sdd/portfolio-index-redesign/rounds/`
- [x] 10. 驗收：派 fresh agent 獨立驗收（不給它我的自評）；通過後回報，push 與否另行請示

## 自評評分表（每項 1–5，任務 9 使用；自評，不代表獎項評審結果）

| 維度 | 判準 |
|---|---|
| 視覺識別 | 有辨識度的配色與排版語彙，不是通用樣板 |
| 版面與節奏 | 資訊層級清楚，留白與密度有節奏 |
| 動態品質 | 動態有目的、流暢、可關閉 |
| 互動回饋 | hover／focus／篩選搜尋回饋即時明確 |
| 無障礙 | 鍵盤可達、對比達標、語意正確 |
| 效能與穩健 | 輕量、離線、無 JS 降級 |

## 驗收條件

- 情境：當打開備份檔，就能確認 sha256 為 `f09d99760601fd47d45544c0c857197510da6a32a41f136aae583df6054801a1`，且與 `git show HEAD:VibeCoding/index.html` 逐位元組相同。
- 情境：當用 `file://` 與 `http://localhost` 各開新版一次，就看不到任何 console error，且網路請求中**沒有任何外部網域**。
- 情境：當用腳本抽出新版的 28 條卡片 href，就與備份版的 href 清單**順序與內容完全相同**，且每個目標檔案都存在。
- 情境：當視窗寬度為 320／768／1280／1920，就沒有水平捲軸，文字不被截斷。
- 情境：當系統偏好為深色，就切換為深色主題，且所有文字對比 ≥ 4.5:1（大字 ≥ 3:1）；淺色同樣達標。
- 情境：當系統偏好為「減少動態」，就沒有任何持續動畫或位移進場。
- 情境：當只用鍵盤，就能 Tab 到 skip link 與全部 28 張卡片，每個焦點都有可見外框，篩選與搜尋可操作。
- 情境：當停用 JavaScript，就仍看得到並點得到全部 28 張卡片。
- 情境：當量檔案大小，就 ≤ 80 KB（現況 11.9 KB；上限為暫定值，使用者可調）。
- 情境：當 Lighthouse 可用，就 Accessibility／Best Practices／SEO ≥ 95、Performance ≥ 90；若取不到 Lighthouse，就改用自寫檢查並在報告明寫「Lighthouse 未驗證」。
- 情境：當自評評分表跑完，就六個維度皆 ≥ 4；任一項低於 4 且 3 輪後仍未改善，如實回報而不調分。
- 情境：當看 `git diff --stat`，就只有 `VibeCoding/index.html` 與 `sdd/` 底下的檔案有變動。
- 情境：當 fresh agent 驗收，就不採用我的自評，只依本節條件與截圖判定。
- 前提：上述「就」後面的指令與斷言，在任務 2 先對舊版實跑一次證明有鑑別力（舊版應該在深色、skip link、focus、Day29 文案等項目上被判不通過）。
