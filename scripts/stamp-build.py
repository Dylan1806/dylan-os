#!/usr/bin/env python3
"""Stamp the deploy SHA into HTML, module imports, and the service worker cache name."""

import pathlib
import re
import sys

sha = sys.argv[1]
root = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else ".")

index = (root / "index.html").read_text()
index = index.replace('src="js/app.js"', f'src="js/app.js?v={sha}"')
index = index.replace('href="styles.css"', f'href="styles.css?v={sha}"')
index = index.replace('href="manifest.webmanifest"', f'href="manifest.webmanifest?v={sha}"')
(root / "index.html").write_text(index)

pattern = re.compile(r'(from\s+["\']\./[^"\']+\.js)(["\'])')
for path in (root / "js").glob("*.js"):
    text = path.read_text()
    path.write_text(pattern.sub(rf"\1?v={sha}\2", text))

sw = root / "sw.js"
sw.write_text(sw.read_text().replace("__BUILD_ID__", sha))
print(f"stamped {sha}")
