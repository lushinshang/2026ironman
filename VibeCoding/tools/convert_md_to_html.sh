#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
readonly SCRIPT_DIR

readonly -a TARGETS=(
  "ITHELP_MARKDOWN.md"
  "PERSONA.md"
  "readme.md"
  "story.md"
  "參考資料.md"
)

usage() {
  printf 'Usage: %s [--force] [MARKDOWN_FILE]\n' "$(basename -- "$0")" >&2
  printf 'Without MARKDOWN_FILE, all five managed Markdown files are processed.\n' >&2
}

force=0
if [[ "${1:-}" == "--force" ]]; then
  force=1
  shift
fi

if (( $# > 1 )); then
  usage
  exit 2
fi

is_target() {
  local candidate=$1 target
  for target in "${TARGETS[@]}"; do
    [[ "$candidate" == "$target" ]] && return 0
  done
  return 1
}

if (( $# == 1 )); then
  requested=${1#./}
  if [[ "$requested" == "$SCRIPT_DIR/"* ]]; then
    requested=${requested#"$SCRIPT_DIR/"}
  fi
  if [[ "$requested" == */* ]] || ! is_target "$requested"; then
    printf 'Error: unmanaged Markdown file: %s\n' "$1" >&2
    usage
    exit 2
  fi
  files=("$requested")
else
  files=("${TARGETS[@]}")
fi

if ! python3 -c 'import markdown' >/dev/null 2>&1; then
  printf 'Error: Python package "markdown" is required. Install it with: python3 -m pip install markdown\n' >&2
  exit 1
fi

converted=0
skipped=0

for md_name in "${files[@]}"; do
  md_path="$SCRIPT_DIR/$md_name"
  html_path="${md_path%.md}.html"

  if [[ ! -f "$md_path" ]]; then
    printf 'Error: source file not found: %s\n' "$md_path" >&2
    exit 1
  fi

  if (( ! force )) && [[ -f "$html_path" && ! "$md_path" -nt "$html_path" ]]; then
    printf 'Up to date: %s\n' "$(basename -- "$html_path")"
    ((skipped += 1))
    continue
  fi

  python3 - "$md_path" "$html_path" <<'PY'
import html
import os
import re
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path

import markdown


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def document_title(source: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+?)\s*#*\s*$", source, flags=re.MULTILINE)
    if not match:
        return fallback
    rendered = markdown.markdown(match.group(1))
    parser = _TextExtractor()
    parser.feed(rendered)
    title = "".join(parser.parts).strip()
    return title or fallback


source_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])
source = source_path.read_text(encoding="utf-8")
title = document_title(source, source_path.stem)
body = markdown.markdown(
    source,
    extensions=["tables", "fenced_code", "toc"],
    extension_configs={"toc": {"permalink": False}},
    output_format="html5",
)

page = f'''<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)}</title>
  <style>
    :root {{
      color-scheme: light dark;
      --bg: #ffffff;
      --fg: #1f2328;
      --muted: #59636e;
      --border: #d0d7de;
      --soft: #f6f8fa;
      --link: #0969da;
      --quote: #656d76;
    }}
    * {{ box-sizing: border-box; }}
    html {{ -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC",
        "PingFang TC", "Microsoft JhengHei", sans-serif;
      font-size: 16px;
      line-height: 1.7;
      overflow-wrap: break-word;
    }}
    main {{ width: min(100% - 40px, 880px); margin: 0 auto; padding: 48px 0 80px; }}
    h1, h2, h3, h4, h5, h6 {{
      margin: 1.5em 0 0.65em;
      line-height: 1.3;
      font-weight: 650;
      text-wrap: balance;
    }}
    h1 {{ margin-top: 0; padding-bottom: 0.3em; border-bottom: 1px solid var(--border); font-size: 2em; }}
    h2 {{ padding-bottom: 0.3em; border-bottom: 1px solid var(--border); font-size: 1.5em; }}
    h3 {{ font-size: 1.25em; }}
    p, ul, ol, blockquote, pre, table {{ margin: 0 0 1em; }}
    ul, ol {{ padding-left: 2em; }}
    li + li {{ margin-top: 0.25em; }}
    a {{ color: var(--link); text-decoration-thickness: 1px; text-underline-offset: 0.18em; }}
    a:hover {{ text-decoration-thickness: 2px; }}
    img {{ max-width: 100%; height: auto; border-radius: 6px; }}
    code {{
      padding: 0.15em 0.35em;
      border-radius: 5px;
      background: var(--soft);
      font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
      font-size: 0.88em;
    }}
    pre {{
      max-width: 100%;
      padding: 16px;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--soft);
      line-height: 1.5;
    }}
    pre code {{ padding: 0; border-radius: 0; background: transparent; font-size: 0.875em; }}
    blockquote {{
      margin-left: 0;
      padding: 0.15em 1em;
      border-left: 4px solid var(--border);
      color: var(--quote);
    }}
    blockquote > :last-child {{ margin-bottom: 0; }}
    .table-wrap {{ max-width: 100%; overflow-x: auto; margin-bottom: 1em; }}
    table {{ width: 100%; border-spacing: 0; border-collapse: collapse; }}
    th, td {{ padding: 8px 12px; border: 1px solid var(--border); text-align: left; vertical-align: top; }}
    th {{ background: var(--soft); font-weight: 650; }}
    tr:nth-child(even) td {{ background: color-mix(in srgb, var(--soft) 55%, transparent); }}
    hr {{ height: 1px; margin: 2em 0; border: 0; background: var(--border); }}
    @media (max-width: 640px) {{
      main {{ width: min(100% - 28px, 880px); padding: 28px 0 56px; }}
      body {{ font-size: 15.5px; line-height: 1.68; }}
      h1 {{ font-size: 1.75em; }}
      h2 {{ font-size: 1.35em; }}
      ul, ol {{ padding-left: 1.5em; }}
      pre {{ padding: 12px; }}
      th, td {{ min-width: 9rem; padding: 7px 10px; }}
    }}
    @media (prefers-color-scheme: dark) {{
      :root {{
        --bg: #0d1117;
        --fg: #e6edf3;
        --muted: #8d96a0;
        --border: #30363d;
        --soft: #161b22;
        --link: #58a6ff;
        --quote: #8b949e;
      }}
    }}
  </style>
</head>
<body>
  <main>
{body}
  </main>
  <script>
    document.querySelectorAll("table").forEach(function (table) {{
      var wrapper = document.createElement("div");
      wrapper.className = "table-wrap";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }});
  </script>
</body>
</html>
'''

output_path.parent.mkdir(parents=True, exist_ok=True)
fd, temporary_name = tempfile.mkstemp(
    prefix=f".{output_path.name}.", suffix=".tmp", dir=output_path.parent
)
try:
    with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(page)
    os.replace(temporary_name, output_path)
except BaseException:
    try:
        os.unlink(temporary_name)
    except FileNotFoundError:
        pass
    raise
PY

  printf 'Converted: %s -> %s\n' "$md_name" "$(basename -- "$html_path")"
  ((converted += 1))
done

printf 'Done: %d converted, %d up to date.\n' "$converted" "$skipped"
