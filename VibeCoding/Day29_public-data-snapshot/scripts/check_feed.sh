#!/usr/bin/env bash
# Day29 公開資訊變更雷達 — RSS + 首頁 HTML 雙來源抓取 + State 比對 + 異動紀錄
#
# 雙來源理由（2026-08-30 實測發現）：RSS（https://www.ithome.com.tw/rss.xml）
# 每次只回傳最新 10 篇，一旦排程觸發延遲超過 10 篇的發布量（GitHub Actions
# schedule 已實測延遲數小時到 15 小時以上），舊文章會被擠出 RSS 視窗、永遠
# 抓不到。改抓官網首頁 HTML 可多拿到 20 篇以上作為安全窗口，兩來源合併去重
# 後再跟 seen.json 比對，任一來源抓到就算數。
#
# 邏輯見 sdd/public-data-snapshot/proposal.md v3、tasks.md T1-T3。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/../data"
FEED_URL="https://www.ithome.com.tw/rss.xml"
HOME_URL="https://www.ithome.com.tw/"
SEEN_FILE="${DATA_DIR}/seen.json"
HISTORY_FILE="${DATA_DIR}/history.jsonl"
PENDING_ISSUE_FILE="${DATA_DIR}/pending-issue.md"
UA="Mozilla/5.0 (compatible; Day29-public-data-snapshot/1.0; +https://github.com/)"

RAW_FEED="$(mktemp)"
RAW_HTML="$(mktemp)"
RSS_TSV="$(mktemp)"
HTML_TSV="$(mktemp)"
ITEMS_TSV="$(mktemp)"
ITEMS_JSON="$(mktemp)"
NEW_ITEMS_JSON="$(mktemp)"
cleanup() {
  rm -f "${RAW_FEED}" "${RAW_HTML}" "${RSS_TSV}" "${HTML_TSV}" \
    "${ITEMS_TSV}" "${ITEMS_JSON}" "${NEW_ITEMS_JSON}" "${ITEMS_TSV}.bak"
}
trap cleanup EXIT

mkdir -p "${DATA_DIR}"
rm -f "${PENDING_ISSUE_FILE}"

# ---------- 來源一：RSS ----------
echo "[FETCH] ${FEED_URL}"
RSS_HTTP_CODE="$(curl -s --max-time 30 -o "${RAW_FEED}" -w "%{http_code}" -A "${UA}" "${FEED_URL}" || echo "000")"

RSS_OK=0
if [[ "${RSS_HTTP_CODE}" == "200" ]] \
  && head -c 200 "${RAW_FEED}" | grep -q '<?xml' \
  && grep -q '<rss' "${RAW_FEED}"; then
  RSS_OK=1
  # 逐行狀態機解析：iThome RSS 一個標籤一行（縮排 1 個空白），一行輸出一篇文章
  # guid<TAB>title<TAB>link<TAB>pubDate
  awk '
  /^<item>$/ { in_item=1; guid=""; title=""; link=""; pubdate=""; next }
  /^<\/item>$/ {
    if (in_item) {
      gsub(/\t/, " ", title)
      print guid "\t" title "\t" link "\t" pubdate
    }
    in_item=0
    next
  }
  in_item && /^ <title>/ {
    line=$0
    sub(/^ <title>/, "", line); sub(/<\/title>$/, "", line)
    title=line; next
  }
  in_item && /^ <link>/ {
    line=$0
    sub(/^ <link>/, "", line); sub(/<\/link>$/, "", line)
    link=line; next
  }
  in_item && /^ <pubDate>/ {
    line=$0
    sub(/^ <pubDate>/, "", line); sub(/<\/pubDate>$/, "", line)
    pubdate=line; next
  }
  in_item && /^ <guid/ {
    line=$0
    sub(/^ <guid[^>]*>/, "", line); sub(/<\/guid>$/, "", line)
    guid=line; next
  }
  ' "${RAW_FEED}" > "${RSS_TSV}"
else
  echo "::warning::RSS 抓取失敗或格式異常（HTTP ${RSS_HTTP_CODE}），本次只用首頁 HTML 來源"
  : > "${RSS_TSV}"
fi
RSS_COUNT="$(wc -l < "${RSS_TSV}" | tr -d ' ')"
echo "[PARSE] RSS 解析出 ${RSS_COUNT} 篇文章"

# ---------- 來源二：首頁 HTML ----------
echo "[FETCH] ${HOME_URL}"
HTML_HTTP_CODE="$(curl -s --max-time 30 -o "${RAW_HTML}" -w "%{http_code}" -A "${UA}" "${HOME_URL}" || echo "000")"

HTML_OK=0
if [[ "${HTML_HTTP_CODE}" == "200" ]] && grep -qi '<html' "${RAW_HTML}"; then
  HTML_OK=1
  # 首頁列表項目：<a href="/news/178528">標題</a>，同一篇文章通常有兩個 <a>
  # （一個包圖片無文字、一個包標題文字），只取有文字內容的那個，同 guid 只留第一次出現。
  grep -oE '<a href="/news/[0-9]+"[^>]*>[^<]+</a>' "${RAW_HTML}" \
    | sed -E 's#<a href="/news/([0-9]+)"[^>]*>([^<]+)</a>#\1\t\2#' \
    | sed -E 's/^([0-9]+)\t[[:space:]]+/\1\t/; s/[[:space:]]+$//' \
    | awk -F'\t' '!seen[$1]++ { print $1 " at https://www.ithome.com.tw\t" $2 "\thttps://www.ithome.com.tw/news/" $1 "\t" }' \
    > "${HTML_TSV}"
else
  echo "::warning::首頁 HTML 抓取失敗或格式異常（HTTP ${HTML_HTTP_CODE}），本次只用 RSS 來源"
  : > "${HTML_TSV}"
fi
HTML_COUNT="$(wc -l < "${HTML_TSV}" | tr -d ' ')"
echo "[PARSE] 首頁 HTML 解析出 ${HTML_COUNT} 篇文章"

if [[ "${RSS_OK}" -eq 0 && "${HTML_OK}" -eq 0 ]]; then
  echo "::warning::RSS 與首頁 HTML 兩個來源都抓取失敗，本次不更新 seen.json"
  exit 0
fi

# RSS 排在前面：合併去重時同一 guid 優先保留 RSS 版本（有 pubDate）
cat "${RSS_TSV}" "${HTML_TSV}" | awk -F'\t' '!seen[$1]++' > "${ITEMS_TSV}"

# HTML 實體解碼（僅處理標題會用到的基本幾種，不引入外部套件）
sed -i.bak -e 's/&amp;/\&/g; s/&lt;/</g; s/&gt;/>/g; s/&quot;/"/g; s/&#39;/'"'"'/g' "${ITEMS_TSV}"

ITEM_COUNT="$(wc -l < "${ITEMS_TSV}" | tr -d ' ')"
echo "[PARSE] 雙來源合併去重後共 ${ITEM_COUNT} 篇文章"

if [[ "${ITEM_COUNT}" -eq 0 ]]; then
  echo "::warning::雙來源合併後解析出 0 篇文章，本次不更新 seen.json"
  exit 0
fi

jq -R -s '
  split("\n") | map(select(length > 0)) |
  map(split("\t") | {guid: .[0], title: .[1], link: .[2], pubDate: .[3]})
' "${ITEMS_TSV}" > "${ITEMS_JSON}"

if [[ ! -f "${SEEN_FILE}" ]]; then
  echo "[INIT] seen.json 不存在，視為首次執行，只建立 baseline，不通知"
  jq '[.[] | .guid]' "${ITEMS_JSON}" > "${SEEN_FILE}"
  echo "[DONE] baseline 已建立，共 $(jq 'length' "${SEEN_FILE}") 筆 guid"
  exit 0
fi

jq --slurpfile seen "${SEEN_FILE}" '
  ($seen[0]) as $seen_list |
  map(select(.guid as $g | ($seen_list | index($g)) == null))
' "${ITEMS_JSON}" > "${NEW_ITEMS_JSON}"

NEW_COUNT="$(jq 'length' "${NEW_ITEMS_JSON}")"

if [[ "${NEW_COUNT}" -eq 0 ]]; then
  echo "[DIFF] 沒有新文章，不建立 Issue、不 commit"
  exit 0
fi

echo "[DIFF] 偵測到 ${NEW_COUNT} 篇新文章"

CHECKED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

{
  echo "# iThome 新文章通知（${CHECKED_AT} UTC）"
  echo
  echo "本次偵測到 ${NEW_COUNT} 篇新文章："
  echo
  jq -r '.[] | "- [" + .title + "](" + .link + ")　" + .pubDate' "${NEW_ITEMS_JSON}"
} > "${PENDING_ISSUE_FILE}"

jq -c --arg checked_at "${CHECKED_AT}" --argjson new_count "${NEW_COUNT}" '
  {checked_at: $checked_at, new_count: $new_count, items: map({title, link, pubDate})}
' "${NEW_ITEMS_JSON}" >> "${HISTORY_FILE}"

jq --slurpfile items "${ITEMS_JSON}" '
  (. + [$items[0][] | .guid]) | unique
' "${SEEN_FILE}" > "${SEEN_FILE}.tmp"
mv "${SEEN_FILE}.tmp" "${SEEN_FILE}"

echo "[DONE] seen.json 與 history.jsonl 已更新，pending-issue.md 已產生"
