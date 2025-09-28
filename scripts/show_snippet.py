from pathlib import Path
text = Path('pages/negocios/index.tsx').read_text(encoding='utf-8')
needle = '          <p className="text-sm text-gray-500 '
idx = text.find(needle)
if idx == -1:
    raise SystemExit('Not found')
print(text[idx:idx+200])
