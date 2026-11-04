#!/usr/bin/env python3
import os
import sys

def get_template_content(day_num):
    return f"""> [!IMPORTANT]
> 🤖 **給協作 AI 的寫作與開發規範：**
> 本檔案及本專案之寫作與 Debug 歷程，皆受根目錄 [README](../../readme.md) 之 AI 協作規範與「隱私安全防護（嚴禁留下真實姓名、Email、IP 與真實使用者路徑）」約束。請勿刪除已有的開發日誌，並請在使用者提及 `log` 時主動執行 `generate_log.py`。

# 2026 iThome 鐵人賽 - Vibe Coding 系列 (Day {day_num})

## 📝 1. 當日主題
* **本日文章主題**： （請填寫本日主題名稱，例如：手刻 Claude Code 核心原理）
* **核心技術概念**： （列出今天涉及的核心技術或觀念）

---

## 📈 2. 開發與寫作進度
* [ ] 本日程式碼實作與除錯已完成
* [ ] 本日文章草稿已潤飾完畢
* [ ] 執行並更新本 Session 的 `log` 歷程以備存

---

## 🧠 3. AI 思考與自言自語紀錄 (Vibe Coding 日誌)
> [!NOTE]
> *此區塊保留給協作 AI。當天跟 AI 共同探索、踩坑、或 Debug 的思維歷程可記錄於此，作為技術文章最重要的靈魂內容。*

### 本日 Debug 與架構思考歷程：
1. **遇到的問題**：
   * （例如：Docling MPS 記憶體溢位錯誤）
2. **AI 的思考與解決路徑**：
   * （例如：AI 發現是 M 系列 Mac 的 MPS 加速 Bug，提議改用 CLI `pdftotext` 來解析二進位，降低系統負荷）
3. **最終解法與結論**：
   * （寫下最後是如何成功解決的）

---

## 💻 4. 本日程式實作片段
```python
# 請在此貼上本日的核心程式碼片段
```
"""

def main():
    base_dir = "VibeCoding"
    print(f"🔄 開始更新 Vibe Coding 資料夾與含有 AI 規範之文章模板...")
    
    # 建立主目錄
    try:
        os.makedirs(base_dir, exist_ok=True)
        print(f"  - 已確認主目錄: {base_dir}")
    except Exception as e:
        print(f"❌ 建立主目錄失敗: {e}", file=sys.stderr)
        sys.exit(1)
        
    # 迴圈建立/覆寫 Day1 到 Day30 目錄與檔案
    created_dirs = 0
    updated_templates = 0
    
    for i in range(1, 31):
        day_dir = os.path.join(base_dir, f"Day{i}")
        
        # 建立目錄
        try:
            os.makedirs(day_dir, exist_ok=True)
            created_dirs += 1
        except Exception as e:
            print(f"❌ 建立 {day_dir} 失敗: {e}", file=sys.stderr)
            continue
            
        # 建立/覆寫 README.md 模板檔
        readme_path = os.path.join(day_dir, "README.md")
        try:
            # 移去 os.path.exists 判斷，直接覆寫為最新模板內容
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(get_template_content(i))
            updated_templates += 1
        except Exception as e:
            print(f"❌ 更新模板 {readme_path} 失敗: {e}", file=sys.stderr)
            
    print(f"✅ 完成！")
    print(f"  - 成功確認 {created_dirs} 個每日資料夾。")
    print(f"  - 成功更新並覆寫 {updated_templates} 個文章草稿範本 README.md。")

if __name__ == "__main__":
    main()
