#!/usr/bin/env python3
"""bundle.py — 把 src/index.html 的 placeholder 換成實際內容，產出單檔 HTML 與 manifest。

用法：
    python3 bundle.py <src_dir> <out_dir>

<src_dir> 底下必須有：
    index.html   — 含 <!--{{SHARED:模組名}}--> 與 <!--{{ASSET:資源名}}--> placeholder 的模板
    bundle.json  — 選填，定義 ASSET 資源（每個資源需含 path/version/license/escape_mode）

<out_dir> 會產出：
    index.html            — 已內嵌所有 SHARED/ASSET 內容
    bundle_manifest.json  — 每個資源的 source/version/license/sha256

範圍邊界（依 CONTRACT.md 第 4 節）：不做 minify、不做 CDN fallback、不自動抓取套件版本。
"""

import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SHARED_DIR = SCRIPT_DIR.parent / "shared"
VENDOR_DIR = SHARED_DIR / "vendor"

SHARED_VERSION = "internal"
SHARED_LICENSE = "project-internal"

PLACEHOLDER_RE = re.compile(r"<!--\{\{(SHARED|ASSET):([^}]+)\}\}-->")


def sha256_of(content_bytes):
    return hashlib.sha256(content_bytes).hexdigest()


SCRIPT_CLOSE_RE = re.compile(r"</\s*script", re.IGNORECASE)
JS_IDENT_RE = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")
LICENSES_PLACEHOLDER = "<!--{{LICENSES}}-->"


def escape_for_inline_script(js_string_literal):
    """把 JSON 字串常數修成可安全塞進 <script> 的形式。

    1. </script>：json.dumps 不跳脫它，但 HTML 解析器在 <script> 內看到
       </script 就關閉標籤，導致資料被截斷、殘餘內容洩漏成頁面可見文字。
       <\\/ 在 JS 字串裡等值於 </，對資料內容無影響。
    2. U+2028 / U+2029：ES2019 之前它們是 JS 字串裡的非法字元。改用
       \\u 逃脫，成本近乎零，省得踩舊引擎的雷。
    """
    return (
        js_string_literal
        .replace("</", "<\\/")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def build_script_tag(inner_text):
    return "<script>\n" + inner_text + "\n</script>"


def resolve_shared(name):
    path = SHARED_DIR / (name + ".js")
    if not path.exists():
        print("ERROR: 找不到 SHARED 模組: {} (預期路徑 {})".format(name, path), file=sys.stderr)
        sys.exit(1)
    text = path.read_text(encoding="utf-8")
    content_bytes = path.read_bytes()
    return {
        "name": name,
        "source": str(path.relative_to(SCRIPT_DIR.parent)),
        "version": SHARED_VERSION,
        "license": SHARED_LICENSE,
        "sha256": sha256_of(content_bytes),
        "html": build_script_tag(text),
        "kind": "shared",
    }


def resolve_asset(name, assets_config, src_dir):
    if name not in assets_config:
        print("ERROR: bundle.json 未定義 ASSET: {}".format(name), file=sys.stderr)
        sys.exit(1)

    entry = assets_config[name]
    license_str = entry.get("license", "")
    if not license_str:
        print("ERROR: ASSET '{}' 缺少 license 字串，中止".format(name), file=sys.stderr)
        sys.exit(1)

    rel_path = entry.get("path")
    if not rel_path:
        print("ERROR: ASSET '{}' 缺少 path".format(name), file=sys.stderr)
        sys.exit(1)

    asset_path = (src_dir / rel_path).resolve()
    # 資源只能留在題目的 src_dir 或共用 vendor 目錄。兩處都以 resolve 後的實際
    # 路徑檢查，避免 ../../ 或 symlink 讓任意外部檔案被內嵌進產物。
    allowed_roots = (src_dir, VENDOR_DIR.resolve())
    if not any(_is_within(asset_path, root) for root in allowed_roots):
        print(
            "ERROR: ASSET '{}' 的 path 必須留在 src_dir 或 shared/vendor/: {}".format(name, rel_path),
            file=sys.stderr,
        )
        sys.exit(1)
    if not asset_path.exists():
        print("ERROR: ASSET '{}' 的檔案不存在: {}".format(name, asset_path), file=sys.stderr)
        sys.exit(1)

    # escape_mode 必填：預設 raw_js 對資料檔是危險預設（資料會被當程式碼直接貼進 <script>）。
    escape_mode = entry.get("escape_mode")
    if not escape_mode:
        print(
            "ERROR: ASSET '{}' 缺少 escape_mode（raw_js 或 json_string），中止".format(name),
            file=sys.stderr,
        )
        sys.exit(1)
    version = entry.get("version", "")

    text = asset_path.read_text(encoding="utf-8")
    content_bytes = asset_path.read_bytes()

    if escape_mode == "raw_js":
        # raw_js 無法安全自動修補：資料若含 </script 會提早關閉外層 script 標籤，
        # 但插跳脫字元會改變 JS 語意。只能中止，由資源提供者處理。
        if SCRIPT_CLOSE_RE.search(text):
            print(
                "ERROR: ASSET '{}' 的內容含 </script，raw_js 模式無法安全內嵌，中止".format(name),
                file=sys.stderr,
            )
            sys.exit(1)
        html = build_script_tag(text)
    elif escape_mode == "json_string":
        # 資源名會直接變成 JS 全域變數名。my-dict 之類的名字會產出 `var my-dict = ...`，
        # 語法錯誤但 exit 0，要到瀏覽器才炸，所以在這裡先擋掉。
        if not JS_IDENT_RE.match(name):
            print(
                "ERROR: ASSET '{}' 的名稱不是合法 JS 變數名（json_string 模式會用它當全域變數名），中止".format(name),
                file=sys.stderr,
            )
            sys.exit(1)
        # ensure_ascii=False：產物是 UTF-8 HTML，CJK 不需要逃脫成 \uXXXX。
        # 中文詞庫用 True 會讓體積約翻倍（Day04 實測 2.56MB vs 1.3MB）。
        js_string_literal = escape_for_inline_script(json.dumps(text, ensure_ascii=False))
        html = build_script_tag("var " + name + " = " + js_string_literal + ";")
    else:
        print("ERROR: ASSET '{}' 的 escape_mode 不支援: {}".format(name, escape_mode), file=sys.stderr)
        sys.exit(1)

    return {
        "name": name,
        "source": str(rel_path),
        "version": version,
        "license": license_str,
        "sha256": sha256_of(content_bytes),
        "html": html,
        "kind": "asset",
    }


def _is_within(path, root):
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def main():
    if len(sys.argv) != 3:
        print("用法: python3 bundle.py <src_dir> <out_dir>", file=sys.stderr)
        sys.exit(1)

    src_dir = Path(sys.argv[1]).resolve()
    out_dir = Path(sys.argv[2]).resolve()

    index_path = src_dir / "index.html"
    if not index_path.exists():
        print("ERROR: 找不到 {}".format(index_path), file=sys.stderr)
        sys.exit(1)

    template = index_path.read_text(encoding="utf-8")

    bundle_json_path = src_dir / "bundle.json"
    assets_config = {}
    if bundle_json_path.exists():
        bundle_config = json.loads(bundle_json_path.read_text(encoding="utf-8"))
        assets_config = bundle_config.get("assets", {})

    resolved = []

    def replace_placeholder(match):
        kind = match.group(1)
        name = match.group(2)
        if kind == "SHARED":
            resource = resolve_shared(name)
        else:
            resource = resolve_asset(name, assets_config, src_dir)
        resolved.append(resource)
        return resource["html"]

    body_html = PLACEHOLDER_RE.sub(replace_placeholder, template)

    # 授權標示要渲染到頁面可見處（CONTRACT.md 第 4 節），不能只寫進 HTML 註解與
    # manifest——那些終端使用者看不到，無法稽核。
    asset_licenses = [r for r in resolved if r["kind"] == "asset"]
    if LICENSES_PLACEHOLDER in body_html:
        if asset_licenses:
            items = "".join(
                "<li>{name} {version} — {license}</li>".format(
                    name=r["name"], version=r["version"], license=r["license"]
                )
                for r in asset_licenses
            )
            block = '<div class="bundled-licenses"><p>內嵌資源與授權：</p><ul>' + items + "</ul></div>"
        else:
            block = ""
        body_html = body_html.replace(LICENSES_PLACEHOLDER, block)
    elif asset_licenses:
        print(
            "ERROR: 有 {} 個外部 ASSET，但模板沒有 {} placeholder，授權無法渲染到頁面可見處，中止".format(
                len(asset_licenses), LICENSES_PLACEHOLDER
            ),
            file=sys.stderr,
        )
        sys.exit(1)

    build_date = date.today().isoformat()
    comment_lines = []
    for resource in resolved:
        comment_lines.append(
            "<!-- BUNDLED: {name}@{version} ({license}) sha256:{sha16} built {date} -->".format(
                name=resource["name"],
                version=resource["version"],
                license=resource["license"],
                sha16=resource["sha256"][:16],
                date=build_date,
            )
        )

    output_parts = []
    output_parts.extend(comment_lines)
    if comment_lines:
        output_parts.append("")
    output_parts.append(body_html)
    final_html = "\n".join(output_parts)

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(final_html, encoding="utf-8")

    manifest = {}
    for resource in resolved:
        manifest[resource["name"]] = {
            "source": resource["source"],
            "version": resource["version"],
            "license": resource["license"],
            "sha256": resource["sha256"],
        }
    (out_dir / "bundle_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("OK: 產出 {} 與 {}，共 {} 個資源".format(
        out_dir / "index.html", out_dir / "bundle_manifest.json", len(resolved)
    ))


if __name__ == "__main__":
    main()
