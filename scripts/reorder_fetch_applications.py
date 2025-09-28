from pathlib import Path
import re

path = Path('pages/admin/applications.tsx')
text = path.read_text(encoding='utf-8')
pattern = r"  const fetchApplications = useCallback\(async \(token: string\) => {[\s\S]*?  }, \[\]\);\n\n"
match = re.search(pattern, text)
if not match:
    raise SystemExit('fetchApplications block not found')
block = match.group(0)
text = text[:match.start()] + text[match.end():]
insert_marker = "  useEffect(() => onAuthStateChanged(auth, (next) => setUser(next)), []);\n\n"
if insert_marker not in text:
    raise SystemExit('insert marker not found')
text = text.replace(insert_marker, insert_marker + block, 1)
path.write_text(text, encoding='utf-8')
