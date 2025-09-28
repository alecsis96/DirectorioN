from pathlib import Path
import re
path = Path('pages/admin/applications.tsx')
text = path.read_text(encoding='utf-8')
pattern = r"  async function fetchApplications\(token: string\) {([\s\S]*?)  }\n\n"
match = re.search(pattern, text)
if not match:
    raise SystemExit('fetchApplications block not found')
body = match.group(1)
replacement = "  const fetchApplications = useCallback(async (token: string) => {" + body + "  }, []);\n\n"
text = text[:match.start()] + replacement + text[match.end():]
path.write_text(text, encoding='utf-8')
