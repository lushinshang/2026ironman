#!/usr/bin/env python3
"""build_dicts.py — 把本機 OpenCC 詞典 txt 轉製成 bundle.py json_string 模式用的 JSON。

用法：
    python3 build_dicts.py            # 輸出到同目錄的 src/

規則（依 sdd/zh-tw-localizer/proposal.md）：
  1. STPhrases + STCharacters 合併為一份簡繁詞庫；同鍵衝突時「詞組（STPhrases）優先於單字（STCharacters）」
  2. 一對多（值以空白分隔）一律取第一個候選，捨棄其餘
  3. 產出三份：simplified-to-traditional / tw-variants / tw-phrases
"""

import json
import os
import sys

import opencc

DICT_DIR = os.path.join(os.path.dirname(opencc.__file__), "dictionary")
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")


def load_txt(name):
    """讀 OpenCC 詞典 txt，回傳 {鍵: 第一候選}。"""
    path = os.path.join(DICT_DIR, name + ".txt")
    result = {}
    multi = 0
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n").rstrip("\r")
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            key = parts[0].strip()
            values = parts[1].strip().split(" ")
            if len(values) > 1:
                multi += 1
            value = values[0].strip()
            if not key or not value:
                continue
            result[key] = value
    print("  {}: {} 行 → {} 筆（一對多 {} 筆，取第一候選）".format(name, sum(1 for _ in open(path, encoding="utf-8")), len(result), multi))
    return result


def write_json(name, data):
    path = os.path.join(OUT_DIR, name + ".json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, sort_keys=True)
    print("  寫入 {} （{} 筆，{} bytes）".format(path, len(data), os.path.getsize(path)))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print("OpenCC 詞典目錄：{}".format(DICT_DIR))

    st_chars = load_txt("STCharacters")
    st_phrases = load_txt("STPhrases")

    overlap = set(st_chars) & set(st_phrases)
    print("  STPhrases / STCharacters 鍵重疊：{} 筆（衝突時詞組優先）".format(len(overlap)))

    merged = dict(st_chars)
    merged.update(st_phrases)  # 詞組後寫入 → 詞組優先

    write_json("simplified-to-traditional", merged)
    write_json("tw-variants", load_txt("TWVariants"))
    write_json("tw-phrases", load_txt("TWPhrases"))


if __name__ == "__main__":
    sys.exit(main())
