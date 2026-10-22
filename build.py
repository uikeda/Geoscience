"""src/ch*.md の問題表を JSON にして src/template.html に埋め込み、index.html を生成する。

使い方: python3 build.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"

chapters = []
for i in (1, 2, 3):
    rows = []
    for line in (SRC / f"ch{i}.md").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        parts = [x.strip() for x in line.strip("|").split(" | ")]
        if len(parts) != 2:
            raise ValueError(f"ch{i}.md: 列数が2ではない行: {line}")
        q, a = parts
        rows.append([q, a.split("<br>")])
    chapters.append(rows)
    print(f"第{i}章: {len(rows)}問")

data = json.dumps(chapters, ensure_ascii=False, separators=(",", ":"))
html = (SRC / "template.html").read_text(encoding="utf-8").replace("__DATA__", data)
(ROOT / "index.html").write_text(html, encoding="utf-8")
print("index.html を生成しました")
