#!/usr/bin/env python3
import os
import sys
import argparse

def get_template_content(topic_name, day_num):
    return f"""> [!IMPORTANT]
> 🤖 **給協作 AI 的寫作與開發規範：**
> 本檔案及本專案之寫作與 Debug 歷程，皆受根目錄 [README](../../readme.md) 之 AI 協作規範與「隱私安全防護（嚴禁留下真實姓名、Email、IP 與真實使用者路徑）」約束。請勿刪除已有的開發日誌，並請在使用者提及 `log` 時主動執行 `generate_log.py`。

# 2026 iThome 鐵人賽 - {topic_name} 系列 (Day {day_num})

## 📝 1. 當日主題
* **本日文章主題**： （請填寫本日主題名稱）
* **核心技術概念**： （列出今天涉及的核心技術或觀念）

---

## 📈 2. 開發與寫作進度
* [ ] 本日程式碼實作與除錯已完成
* [ ] 本日文章草稿已潤飾完畢
* [ ] 執行並更新本 Session 的 `log` 歷程以備存

---

## 🧠 3. AI 思考與自言自語紀錄 ({topic_name} 日誌)
> [!NOTE]
> *此區塊保留給協作 AI。當天跟 AI 共同探索、踩坑、或 Debug 的思維歷程可記錄於此，作為技術文章最重要的靈魂內容。*

### 本日 Debug 與架構思考歷程：
1. **遇到的問題**：
   * （列出今天開發時遇到的問題）
2. **AI 的思考與解決路徑**：
   * （描述 AI 提議的解決思路與探討過程）
3. **最終解法與結論**：
   * （寫下最後是如何成功解決的）

---

## 💻 4. 本日程式實作片段
```python
# 請在此貼上本日的核心程式碼片段
```
"""

def main():
    parser = argparse.ArgumentParser(description="2026 iThome Ironman generic topic folder initializer.")
    parser.add_argument("-t", "--topic", required=True, help="Name of the topic/category directory to initialize")
    args = parser.parse_args()
    
    topic_name = args.topic
    print(f"🔄 開始初始化主題 [{topic_name}] 資料夾與模板結構...")
    
    # 建立主目錄
    try:
        os.makedirs(topic_name, exist_ok=True)
        print(f"  - 已確認/建立主目錄: {topic_name}")
    except Exception as e:
        print(f"❌ 建立主目錄失敗: {e}", file=sys.stderr)
        sys.exit(1)
        
    # 迴圈建立 Day1 到 Day30 目錄與檔案
    created_dirs = 0
    created_templates = 0
    
    for i in range(1, 31):
        day_dir = os.path.join(topic_name, f"Day{i}")
        
        # 建立目錄
        try:
            os.makedirs(day_dir, exist_ok=True)
            created_dirs += 1
        except Exception as e:
            print(f"❌ 建立 {day_dir} 失敗: {e}", file=sys.stderr)
            continue
            
        # 建立 README.md 模板檔 (若已存在，直接覆寫為最新模板)
        readme_path = os.path.join(day_dir, "README.md")
        try:
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(get_template_content(topic_name, i))
            created_templates += 1
        except Exception as e:
            print(f"❌ 寫入模板 {readme_path} 失敗: {e}", file=sys.stderr)
            
    print(f"✅ 完成！")
    print(f"  - 成功確認 {created_dirs} 個每日資料夾。")
    print(f"  - 成功生成/更新 {created_templates} 個文章草稿範本 README.md。")

if __name__ == "__main__":
    main()
