"""Inline src/core.js and demo/ui.js into demo/template.html to produce demo/index.html."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
t = (root / 'demo/template.html').read_text()
html = t.replace('/*CORE*/', (root / 'src/core.js').read_text()).replace('/*UI*/', (root / 'demo/ui.js').read_text())
(root / 'demo/index.html').write_text(html)
print('wrote demo/index.html', len(html), 'bytes')
