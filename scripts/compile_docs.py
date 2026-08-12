#!/usr/bin/env python3
import os
import re
import sys
import subprocess

# ==========================================
# Notion 風格 HTML Standalone 模板
# ==========================================
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - 2026 iThome 鐵人賽</title>
    <style>
        /* CSS Reset & Variables */
        :root {{
            --bg-color: #f9f7f4;
            --text-color: #1a1a1a;
            --primary-color: #0f56d9;
            --border-color: #e3e1de;
            --code-bg: #f1efec;
            --quote-bg: #f4f1ec;
            
            /* Alert Colors */
            --alert-note-bg: #ebf5ff;
            --alert-note-border: #1e70e3;
            --alert-important-bg: #fdf2f2;
            --alert-important-border: #e02424;
            --alert-tip-bg: #f0fdf4;
            --alert-tip-border: #16a34a;
            --alert-warning-bg: #fffbeb;
            --alert-warning-border: #d97706;
        }}
        
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        
        body {{
            background: var(--bg-color);
            color: var(--text-color);
            font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
            line-height: 1.68;
            font-size: 16px;
            padding: 40px 20px;
            -webkit-font-smoothing: antialiased;
        }}
        
        /* Notion-like Layout */
        .container {{
            max-width: 1120px;
            margin: 0 auto;
        }}
        
        article {{
            max-width: 760px;
            margin: 0 auto;
        }}
        
        /* Typography */
        h1, h2, h3, h4, h5, h6 {{
            color: #111111;
            font-weight: 700;
            line-height: 1.25;
            margin-top: 2rem;
            margin-bottom: 1rem;
            text-wrap: balance;
        }}
        
        h1 {{ font-size: 2.2rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; margin-top: 1rem; }}
        h2 {{ font-size: 1.6rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3rem; }}
        h3 {{ font-size: 1.25rem; }}
        
        p {{
            margin-bottom: 1.2rem;
        }}
        
        a {{
            color: var(--primary-color);
            text-decoration: none;
            border-bottom: 1px solid rgba(15, 86, 217, 0.2);
            transition: all 0.2s ease;
        }}
        
        a:hover {{
            border-bottom-color: var(--primary-color);
            background: rgba(15, 86, 217, 0.05);
        }}
        
        /* Lists */
        ul, ol {{
            margin-bottom: 1.2rem;
            padding-left: 24px;
        }}
        
        li {{
            margin-bottom: 0.4rem;
        }}
        
        /* Table Styling (Notion Round Corner Table) */
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 2rem 0;
            font-size: 0.95rem;
            display: block;
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }}
        
        th, td {{
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }}
        
        th {{
            background-color: var(--code-bg);
            font-weight: bold;
            color: #222222;
        }}
        
        tr:last-child td {{
            border-bottom: none;
        }}
        
        /* Blockquotes & GitHub Style Alerts */
        blockquote {{
            background: var(--quote-bg);
            border-left: 4px solid #c2beb9;
            padding: 12px 18px;
            margin: 1.5rem 0;
            border-radius: 0 6px 6px 0;
        }}
        
        blockquote p:last-child {{
            margin-bottom: 0;
        }}
        
        .alert {{
            padding: 16px;
            margin: 1.5rem 0;
            border-left: 4px solid transparent;
            border-radius: 0 8px 8px 0;
        }}
        
        .alert-title {{
            font-weight: 700;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        
        .alert-note {{ background-color: var(--alert-note-bg); border-left-color: var(--alert-note-border); }}
        .alert-note .alert-title {{ color: var(--alert-note-border); }}
        
        .alert-important {{ background-color: var(--alert-important-bg); border-left-color: var(--alert-important-border); }}
        .alert-important .alert-title {{ color: var(--alert-important-border); }}
        
        .alert-tip {{ background-color: var(--alert-tip-bg); border-left-color: var(--alert-tip-border); }}
        .alert-tip .alert-title {{ color: var(--alert-tip-border); }}
        
        .alert-warning {{ background-color: var(--alert-warning-bg); border-left-color: var(--alert-warning-border); }}
        .alert-warning .alert-title {{ color: var(--alert-warning-border); }}

        /* Code & Pre */
        code {{
            background: var(--code-bg);
            padding: 2px 5px;
            border-radius: 4px;
            font-family: Consolas, Monaco, "Andale Mono", monospace;
            font-size: 0.9em;
        }}
        
        pre {{
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1.5rem 0;
        }}
        
        pre code {{
            background: none;
            padding: 0;
            color: inherit;
            font-size: 0.95em;
        }}
        
        /* Utilities */
        hr {{
            border: 0;
            border-top: 1px solid var(--border-color);
            margin: 2rem 0;
        }}
        
        .nav-back {{
            margin-bottom: 2rem;
            font-size: 0.9rem;
        }}
        
        /* Responsive */
        @media (max-width: 768px) {{
            body {{
                padding: 20px 12px;
            }}
            h1 {{ font-size: 1.8rem; }}
            h2 {{ font-size: 1.4rem; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        {nav_back}
        <article>
            {content}
        </article>
    </div>
</body>
</html>
"""

# ==========================================
# GitHub Alerts 轉換邏輯 (用 Regex 加工 HTML)
# ==========================================
def parse_alerts(html_content):
    alert_types = {
        "NOTE": ("ℹ️ NOTE", "alert-note"),
        "IMPORTANT": ("⚠️ IMPORTANT", "alert-important"),
        "TIP": ("💡 TIP", "alert-tip"),
        "WARNING": ("🔔 WARNING", "alert-warning"),
        "CAUTION": ("🔥 CAUTION", "alert-warning")
    }
    
    pattern = re.compile(r'<blockquote>\s*<p>\[!(NOTE|IMPORTANT|TIP|WARNING|CAUTION)\](.*?)</p>\s*(.*?)\s*</blockquote>', re.DOTALL | re.IGNORECASE)
    
    def replacer(match):
        type_name = match.group(1).upper()
        main_content = match.group(2).strip()
        additional_content = match.group(3).strip()
        
        title, css_class = alert_types.get(type_name, ("INFO", "alert-note"))
        
        full_content = f"<p>{main_content}</p>" if main_content else ""
        if additional_content:
            full_content += f"\n{additional_content}"
            
        alert_html = f"""<div class="alert {css_class}">
    <div class="alert-title">{title}</div>
    {full_content}
</div>"""
        return alert_html

    return pattern.sub(replacer, html_content)

# ==========================================
# 連結重定向轉換邏輯 (README.md -> index.html)
# ==========================================
def fix_links(html_content):
    # 將所有指向 README.md / readme.md 的 href 屬性自動替換為 index.html
    # 支援相對路徑與 file:/// 等絕對路徑
    pattern = re.compile(r'href="([^"]*?)(readme|README)\.md"', re.IGNORECASE)
    return pattern.sub(r'href="\1index.html"', html_content)

# ==========================================
# 單檔編譯主邏輯
# ==========================================
def compile_markdown_to_html(md_path, html_path):
    print(f"📖 讀取 Markdown: {md_path}")
    
    if not os.path.exists(md_path):
        print(f"❌ 錯誤: 檔案不存在 {md_path}", file=sys.stderr)
        return False
        
    # 呼叫本機安裝的 pandoc 取得 HTML body
    try:
        result = subprocess.run(
            ["pandoc", md_path, "-f", "markdown", "-t", "html"],
            capture_output=True,
            text=True,
            check=True
        )
        body_content = result.stdout
    except Exception as e:
        print(f"❌ 呼叫 Pandoc 失敗: {e}", file=sys.stderr)
        return False
        
    # 進行 GitHub Alerts 美化轉換
    processed_content = parse_alerts(body_content)
    
    # 進行超連結重定向轉換，確保網頁版互通良好
    processed_content = fix_links(processed_content)
    
    # 提取第一行 h1 作為網頁標題
    title = "主題大綱"
    try:
        with open(md_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith("# "):
                    title = line.replace("# ", "").strip()
                    break
    except Exception:
        pass
        
    # 判斷是否為根目錄，如果是則隱藏返回導航
    is_root = os.path.basename(md_path).lower() == "readme.md" and os.path.dirname(md_path) == ""
    
    if is_root:
        nav_back = ""
    else:
        # 子目錄網頁的返回導航，指向編譯後的根目錄首頁 index.html
        nav_back = '<div class="nav-back"><a href="../index.html">🏠 返回首頁</a></div>'
        
    # 嵌入 Standalone 模板中
    full_html = HTML_TEMPLATE.format(title=title, nav_back=nav_back, content=processed_content)
    
    # 寫入目標 HTML 檔案
    try:
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(full_html)
        print(f"✅ 成功編譯 HTML: {html_path}")
        return True
    except Exception as e:
        print(f"❌ 寫入 HTML 失敗: {e}", file=sys.stderr)
        return False

# ==========================================
# 批次編譯入口
# ==========================================
def main():
    targets = [
        ("readme.md", "index.html"),
        ("VibeCoding/README.md", "VibeCoding/index.html"),
        ("Security/README.md", "Security/index.html")
    ]
    
    success = True
    for md, html in targets:
        if os.path.exists(md):
            if not compile_markdown_to_html(md, html):
                success = False
        else:
            print(f"⚠️ 跳過: {md} (檔案不存在)")
            
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
