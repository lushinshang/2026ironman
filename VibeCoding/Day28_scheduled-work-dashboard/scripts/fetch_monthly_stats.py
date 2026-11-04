#!/usr/bin/env python3
"""
Day28 每日自動更新工作 Dashboard - 資料收集腳本（v2）

資料來源：聯合信用卡中心「發卡機構通報詐欺交易型態之金額及筆數」公開 CSV
（data.gov.tw nid=62943，nccc.com.tw 提供下載），非官方開放資料集，無需登入、
無 API Key，僅供個人技術練習展示。

核心邏輯（見 sdd/scheduled-work-dashboard/proposal.md v2 已實測證據）：
  - 單一 CSV 端點，一次下載整份歷史（無分頁、無逐日 API），每次執行整份覆蓋本地檔案
  - 編碼是 utf-8-sig（BOM UTF-8），不是舊版 165dashboard.tw 慣用的 Big5
  - 只保留「信用卡產業別」== "全部" 的列（實測目前只有這一種值，但明確篩選，
    不依賴「資料源永遠只有一種值」這個假設）
  - 詐欺金額欄位單位是「元」，不是「萬元」（跟舊版 165dashboard.tw 不同，換資料源
    時特別注意這個單位差異）
  - 完整性檢查：每個出現過的 year_month 底下應恰好有 8 種「信用卡詐欺型態」各一筆，
    缺筆/多筆寫入 validation-log.csv 並印 ::warning::，不中斷腳本（資料收集優先於
    完美驗證）

用法：
    python3 fetch_monthly_stats.py
"""

from __future__ import annotations

import csv
import io
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests

SOURCE_URL = "https://www.nccc.com.tw/dataDownload/Fraud/BANK_FRAUD_TWN_ALL.CSV"

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CSV_PATH = DATA_DIR / "monthly-stats.csv"
VALIDATION_LOG_PATH = DATA_DIR / "validation-log.csv"

CSV_FIELDS = ["year_month", "category", "cases", "losses"]
VALIDATION_FIELDS = ["year_month", "expected_types", "actual_types", "missing", "extra"]

INDUSTRY_FILTER = "全部"
EXPECTED_FRAUD_TYPES = {
    "遺失卡", "被竊卡", "未達卡", "冒用申請卡", "偽卡", "MOTO / EC", "其他", "多刷帳單之詐欺",
}

REQUEST_TIMEOUT = 30


def download_source_csv() -> str:
    """下載來源 CSV 原始文字（以 utf-8-sig 解碼，去除 BOM）。"""
    resp = requests.get(SOURCE_URL, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.content.decode("utf-8-sig")


def parse_source_rows(raw_text: str) -> list[dict]:
    """
    解析來源 CSV，只保留信用卡產業別=="全部" 的列。
    回傳每筆 {year_month, category(信用卡詐欺型態), cases, losses}。
    """
    reader = csv.DictReader(io.StringIO(raw_text))
    rows = []
    for r in reader:
        if r.get("信用卡產業別") != INDUSTRY_FILTER:
            continue
        rows.append(
            {
                "year_month": r["年月"],
                "category": r["信用卡詐欺型態"],
                "cases": int(r["詐欺筆數"]),
                "losses": int(r["詐欺金額[新臺幣]"]),
            }
        )
    return rows


def write_monthly_csv(csv_path: Path, rows: list[dict]) -> None:
    """整份覆蓋寫入 monthly-stats.csv（依 year_month, category 排序）。"""
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    sorted_rows = sorted(rows, key=lambda r: (r["year_month"], r["category"]))
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for r in sorted_rows:
            writer.writerow(r)


def check_completeness(rows: list[dict]) -> list[dict]:
    """
    檢查每個出現過的 year_month 底下是否恰好有 8 種信用卡詐欺型態各一筆。
    回傳異常紀錄清單（缺筆/多筆），並印 ::warning::，不中斷腳本。
    """
    by_month: dict[str, Counter] = {}
    for r in rows:
        by_month.setdefault(r["year_month"], Counter())[r["category"]] += 1

    anomalies = []
    for year_month in sorted(by_month):
        counts = by_month[year_month]
        actual_types = set(counts)
        missing = EXPECTED_FRAUD_TYPES - actual_types
        extra = actual_types - EXPECTED_FRAUD_TYPES
        duplicated = {t for t, n in counts.items() if n > 1}

        if missing or extra or duplicated:
            print(
                f"::warning::{year_month} 資料完整性異常 - "
                f"缺筆：{sorted(missing) or '無'}；多出型態：{sorted(extra) or '無'}；"
                f"重複型態：{sorted(duplicated) or '無'}"
            )
            anomalies.append(
                {
                    "year_month": year_month,
                    "expected_types": len(EXPECTED_FRAUD_TYPES),
                    "actual_types": len(actual_types),
                    "missing": ";".join(sorted(missing)),
                    "extra": ";".join(sorted(extra | duplicated)),
                }
            )
    return anomalies


def write_validation_log(anomalies: list[dict]) -> None:
    """把完整性異常紀錄整份覆蓋寫入 validation-log.csv（無異常則寫空檔案，只留表頭）。"""
    VALIDATION_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with VALIDATION_LOG_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=VALIDATION_FIELDS)
        writer.writeheader()
        for a in anomalies:
            writer.writerow(a)


def main() -> int:
    print(f"[FETCH] 下載 {SOURCE_URL}")
    raw_text = download_source_csv()

    rows = parse_source_rows(raw_text)
    print(f"[PARSE] 篩選出「信用卡產業別=全部」的列共 {len(rows)} 筆")

    if not rows:
        print("::error::下載到的資料經篩選後為 0 筆，不覆蓋本地檔案", file=sys.stderr)
        return 1

    write_monthly_csv(CSV_PATH, rows)
    months = sorted({r["year_month"] for r in rows})
    print(
        f"[WRITE] 寫入 {CSV_PATH}，共 {len(rows)} 列，涵蓋月份 {months[0]} ~ {months[-1]}"
        f"（{len(months)} 個月）"
    )

    print("[VALIDATE] 檢查每月是否恰有 8 種信用卡詐欺型態")
    anomalies = check_completeness(rows)
    write_validation_log(anomalies)
    if anomalies:
        print(f"[VALIDATE] 發現 {len(anomalies)} 個月份資料異常，已記錄到 {VALIDATION_LOG_PATH}")
    else:
        print("[VALIDATE] 全部月份完整性檢查通過")

    print(f"[DONE] 執行時間（UTC）：{datetime.now(timezone.utc).isoformat()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
