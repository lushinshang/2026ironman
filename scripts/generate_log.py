#!/usr/bin/env python3
import os
import sys
import json
import re
import argparse
from datetime import datetime

# ==========================================
# Task 3: Privacy Filter (去隱私化過濾器)
# ==========================================
def deidentify_text(text):
    if not isinstance(text, str):
        return text

    # 1. 替換真實的使用者資料夾路徑 (例如 /Users/lanss -> /Users/<USER>)
    # 尋找 /Users/ 開頭的硬編碼路徑
    text = re.sub(r'/Users/([a-zA-Z0-9_\-\.]+)', r'/Users/<USER>', text)

    # 2. 替換 Email 資訊
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', r'[EMAIL]', text)

    # 3. 替換 IPv4 位址
    text = re.sub(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', r'[IP]', text)

    # 4. 替換可能的 API key/CSRF token 等敏感金鑰
    # 例如：csrf-token content="nkbLMhKyOo..."
    text = re.sub(r'(?:csrf-token|token|api_key|key|password|secret)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_\-]{8,})["\']?', r'\1: [PROTECTED]', text, flags=re.IGNORECASE)
    # 直接過濾 JSON 中的 csrf-token 欄位值
    text = re.sub(r'"csrf-token"\s*:\s*"[a-zA-Z0-9_\-]{8,}"', r'"csrf-token": "[PROTECTED]"', text, flags=re.IGNORECASE)

    # 5. 替換特定的 GitHub 使用者帳號以防隱私洩漏
    text = re.sub(r'\blushinshang\b', r'<GITHUB_USER>', text, flags=re.IGNORECASE)

    return text

# ==========================================
# Task 2: JSONL Parser (JSONL 解析邏輯)
# ==========================================
def parse_transcript(lines):
    timeline = []
    
    for idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        try:
            data = json.loads(line)
        except Exception as e:
            print(f"Warning: Failed to parse line {idx+1}: {e}", file=sys.stderr)
            continue
            
        step_type = data.get("type")
        source = data.get("source")
        content = data.get("content", "")
        created_at = data.get("created_at", "")
        
        # 轉換 ISO 時間字串為本地易讀格式
        time_str = ""
        if created_at:
            try:
                # 處理像 2026-08-07T08:19:49Z 的 ISO 時間
                dt = datetime.strptime(created_at.replace("Z", "+0000"), "%Y-%m-%dT%H:%M:%S%z")
                time_str = dt.astimezone().strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                time_str = created_at
        
        # 忽略系統歷史紀錄或 Checkpoint，只保留實質對話
        if step_type in ["CONVERSATION_HISTORY", "CHECKPOINT"] or source == "SYSTEM":
            continue
            
        # 根據不同的行為分類，將其加入時間軸中
        if step_type == "USER_INPUT" and source == "USER_EXPLICIT":
            # 使用者輸入
            # 清理 USER_REQUEST 標記以利閱讀，但保留原始內容
            clean_content = re.sub(r'</?USER_REQUEST>', '', content).strip()
            # 移去 ADDITIONAL_METADATA 和 USER_SETTINGS_CHANGE 以保持日誌乾淨
            clean_content = re.sub(r'<ADDITIONAL_METADATA>[\s\S]*?</ADDITIONAL_METADATA>', '', clean_content)
            clean_content = re.sub(r'<USER_SETTINGS_CHANGE>[\s\S]*?</USER_SETTINGS_CHANGE>', '', clean_content).strip()
            
            timeline.append({
                "type": "USER",
                "time": time_str,
                "content": deidentify_text(clean_content)
            })
            
        elif source == "MODEL":
            # AI 的決策行為 (Thought, Tool calls) 或最終回覆
            thinking = data.get("thinking", "")
            tool_calls = data.get("tool_calls", [])
            
            # 1. 記錄思考過程 (自言自語)
            if thinking:
                timeline.append({
                    "type": "THOUGHT",
                    "time": time_str,
                    "content": deidentify_text(thinking.strip())
                })
                
            # 2. 記錄工具呼叫
            if tool_calls:
                for tool in tool_calls:
                    tool_name = tool.get("name")
                    tool_args = tool.get("args", {})
                    # 簡化 args 顯示以避免太冗長，但保留關鍵內容
                    args_str = json.dumps(tool_args, ensure_ascii=False)
                    timeline.append({
                        "type": "TOOL_CALL",
                        "time": time_str,
                        "content": f"呼叫工具 `{tool_name}`，參數: `{deidentify_text(args_str)}`"
                    })
            
            # 3. 記錄 AI 的最終回覆
            if step_type == "PLANNER_RESPONSE" and content:
                timeline.append({
                    "type": "MODEL",
                    "time": time_str,
                    "content": deidentify_text(content.strip())
                })
                
        elif source == "MODEL_TOOL" or (source != "MODEL" and source != "USER_EXPLICIT" and step_type != "USER_INPUT"):
            # 工具的執行結果回應
            timeline.append({
                "type": "TOOL_RESPONSE",
                "time": time_str,
                "content": f"工具 `[{step_type}]` 回傳結果:\n```\n{deidentify_text(content.strip())[:2000]}\n```" # 限制回傳結果長度，避免太大
            })
            
    return timeline

# ==========================================
# Task 4: Markdown Formatter (Markdown 格式化與寫入)
# ==========================================
def generate_markdown(timeline, session_id):
    date_str = datetime.now().strftime("%Y-%m-%d")
    short_id = session_id[:8]
    
    # 建立 logs 目錄
    os.makedirs("logs", exist_ok=True)
    log_filename = f"logs/session_log_{date_str}_{short_id}.md"
    
    # 建立日誌檔頭
    header = f"""# Session 對話與思考日誌 ({date_str})

* **Session ID**: `{session_id}`
* **記錄時間**: `{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}`
* **安全保護**: 已自動執行隱私防護去識別化過濾。

---

"""
    
    body = ""
    for event in timeline:
        ev_type = event["type"]
        time = event["time"]
        content = event["content"]
        
        if ev_type == "USER":
            body += f"### 👤 使用者輸入 ({time})\n\n{content}\n\n"
        elif ev_type == "THOUGHT":
            body += f"> [!NOTE]\n> **🧠 AI 思考與自言自語** ({time})\n>\n"
            # 將 Thought 加上引言符號
            for line in content.split("\n"):
                body += f"> {line}\n"
            body += "\n"
        elif ev_type == "TOOL_CALL":
            body += f"🛠️ **工具呼叫** ({time}): {content}\n\n"
        elif ev_type == "TOOL_RESPONSE":
            body += f"📥 **工具執行結果** ({time}):\n{content}\n\n"
        elif ev_type == "MODEL":
            body += f"🤖 **AI 最終回覆** ({time})\n\n{content}\n\n"
            body += "---\n\n"
            
    # 如果檔案已存在，則寫入新的更新，否則新創
    mode = "w"  # 這裡使用覆寫即可，因為 transcript_full 隨對話增長包含完整歷程，每次重新執行會得到最新最完整的 session 歷程
    
    with open(log_filename, mode, encoding="utf-8") as f:
        f.write(header + body)
        
    print(f"Success: Log written to {log_filename}")
    return log_filename

# ==========================================
# Main CLI Entry Point
# ==========================================
def main():
    parser = argparse.ArgumentParser(description="2026 iThome Ironman session log generator.")
    parser.add_argument("-s", "--session-id", required=True, help="Current session/conversation ID")
    parser.add_argument("-d", "--app-data-dir", default=os.path.expanduser("~/.gemini/antigravity-cli"), help="Path to antigravity-cli data directory")
    args = parser.parse_args()

    session_id = args.session_id
    app_data_dir = args.app_data_dir

    # Resolve full path to transcript_full.jsonl
    transcript_path = os.path.join(app_data_dir, "brain", session_id, ".system_generated", "logs", "transcript_full.jsonl")
    
    if not os.path.exists(transcript_path):
        print(f"Error: Transcript file not found at {transcript_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)

    timeline = parse_transcript(lines)
    generate_markdown(timeline, session_id)

if __name__ == "__main__":
    main()
