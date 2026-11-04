#!/bin/zsh
# csv-infra 自動續作迴圈。無進度就停，不空轉。
cd /Users/<USER>/projects/2_Practice/tools/2026ironman || exit 1
TASKS=sdd/csv-infra/tasks.md
PROMPT='⚠️ 先重新讀取 sdd/csv-infra/tasks.md 與 VibeCoding/shared/CSV_CONTRACT.md 的「目前檔案內容」，不要依賴先前 session 的記憶——這兩個檔在你上次讀過之後已被修改多次（最新 commit 8f80986）。任務 7 的驗收測資原本與 0.9 門檻矛盾，現已改為：10 筆中 9 筆可解析（正好 0.9）應判 number、8 筆可解析（0.8）應判 text，兩條都要測。toNumber() 對非數字回傳 NaN（契約 4.0b）。繼續 sdd/csv-infra/：挑下一條未打勾的任務做完，自我檢查後打勾，做完這一條就停。不要動 Day08。若再遇到規格不明，先確認你讀的是檔案最新內容再判斷；確認後仍不明就停下並明說卡在「第幾條的哪一句」與「你讀到的原文」。提醒：量 exit code 不要接 pipe；控制字元掃描用 perl；每寫一條「無輸出 = 通過」的檢查都要配一次反證。'

prev=-1
while true; do
  cur=$(grep -c '^- \[x\]' "$TASKS")
  if [ "$cur" -ge 10 ]; then
    echo "✅ 全部完成 $cur/10"
    break
  fi
  if [ "$cur" -eq "$prev" ]; then
    echo "⚠️ 這輪沒有進度，停在 $cur/10 —— 可能需要裁示，看上面 codex 的最後一段輸出"
    break
  fi
  prev=$cur
  echo "===== 目前 $cur/10，繼續 ====="
  codex exec resume --last \
    -c sandbox_mode=workspace-write \
    -c sandbox_workspace_write.network_access=true \
    "$PROMPT" || { echo "codex 回傳非 0，停止"; break; }
done
echo "===== 結束：$(grep -c '^- \[x\]' "$TASKS")/10 ====="
