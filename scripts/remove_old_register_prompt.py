from pathlib import Path
import re

path = Path('pages/negocios/index.tsx')
text = path.read_text(encoding='utf-8')
pattern = r"\n\s*<p className=\"text-sm text-gray-500 \">Tienes un negocio\? <Link href=\"/para-negocios\" className=\"text\[#38761D\] underline border-green-600 text-green-600 hover:bg-green-50\">Registralo aqui</Link></p>\s*"
new_text = re.sub(pattern, '\n', text)
path.write_text(new_text, encoding='utf-8')
