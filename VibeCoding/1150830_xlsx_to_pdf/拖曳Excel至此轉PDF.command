#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
import glob
import subprocess

print("========================================================")
print("  Excel 轉 PDF 工具 (macOS 原生微型腳本)")
print("  100% 完整保留圖表 (Charts)、流程圖 (SmartArt) 與版面")
print("========================================================")
print()

# 切換工作目錄到腳本所在資料夾
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# 取得輸入檔案清單
args = sys.argv[1:]
target_files = []

if args:
    for arg in args:
        arg_clean = arg.strip().strip("\"").strip("\'")
        if os.path.exists(arg_clean):
            target_files.append(os.path.abspath(arg_clean))
        elif os.path.exists(os.path.join(script_dir, arg_clean)):
            target_files.append(os.path.abspath(os.path.join(script_dir, arg_clean)))
else:
    # 搜尋當前目錄下的 Excel 檔案
    for f in os.listdir(script_dir):
        if (f.endswith(".xlsx") or f.endswith(".xls")) and not f.startswith("~$"):
            target_files.append(os.path.abspath(os.path.join(script_dir, f)))

if not target_files:
    print("[提示] 當前目錄沒有找到 Excel 檔案，開啟選擇視窗...")
    # 用 Finder 原生「選擇檔案」對話框讓使用者挑檔（支援多選）。
    # 用換行字元當分隔符號回傳，避免路徑本身若含逗號、空白時被誤切。
    choose_script = (
        'set theFiles to choose file of type {"xlsx", "xls"} '
        'with prompt "選擇 Excel 檔案" multiple selections allowed true\n'
        'set posixPaths to {}\n'
        'repeat with aFile in theFiles\n'
        '    set end of posixPaths to POSIX path of aFile\n'
        'end repeat\n'
        "set AppleScript's text item delimiters to linefeed\n"
        'return posixPaths as text'
    )
    res = subprocess.run(["osascript", "-e", choose_script], capture_output=True, text=True)
    if res.returncode == 0 and res.stdout.strip():
        for line in res.stdout.strip().split("\n"):
            line = line.strip()
            if line and os.path.exists(line):
                target_files.append(os.path.abspath(line))
    # 回傳非 0（例如使用者按「取消」）時不加入任何檔案，維持下方「未選擇任何檔案」流程

if not target_files:
    print("未選擇任何檔案，程式結束。")
    sys.exit(0)

print(f"找到 {len(target_files)} 個待處理檔案：")
for tf in target_files:
    print(f"  - {os.path.basename(tf)}")
print()

def asquote(path):
    """跳脫路徑中的反斜線與雙引號，避免拼進 AppleScript 字串時跳脫邊界（指令注入）。"""
    return path.replace("\\", "\\\\").replace('"', '\\"')

for tf in target_files:
    dir_name = os.path.dirname(tf)
    base_name = os.path.basename(tf)
    file_stem, _ = os.path.splitext(base_name)
    pdf_path = os.path.join(dir_name, f"{file_stem}.pdf")

    print(f"--------------------------------------------------------")
    print(f"正在處理: {base_name}")
    print(f"輸出目標: {file_stem}.pdf")

    # 組合 AppleScript 指令
    ascript = f"""
    tell application "Microsoft Excel"
        set display alerts to false
        activate
        try
            set targetWb to open workbook workbook file name (POSIX file "{asquote(tf)}" as text)
            save workbook as targetWb filename (POSIX file "{asquote(pdf_path)}" as text) file format PDF file format
            close targetWb saving no
            return "SUCCESS"
        on error errMsg
            return "ERROR: " & errMsg
        end try
    end tell
    """

    res = subprocess.run(["osascript", "-e", ascript], capture_output=True, text=True)
    out_msg = res.stdout.strip()

    if os.path.exists(pdf_path):
        size_kb = os.path.getsize(pdf_path) / 1024
        print(f"✅ 轉換成功！檔案已輸出至: {pdf_path} ({size_kb:.1f} KB)")
    else:
        print(f"⚠️ AppleScript 回傳: {out_msg}")
        if res.stderr.strip():
            print(f"   系統訊息: {res.stderr.strip()}")
        print(f"💡 提示：若首次執行，請在跳出的系統對話框中點選「允許控制 Microsoft Excel」。")

print()
print("========================================================")
input("處理完成！按 Enter 鍵關閉本視窗...")
