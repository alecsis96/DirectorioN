from pathlib import Path
path = Path('pages/admin/applications.tsx')
text = path.read_text(encoding='utf-8')
needle = "  const [message, setMessage] = useState<string>('');\n"
if needle not in text:
    raise SystemExit('needle not found')
text = text.replace(needle, needle + "  const [refreshing, setRefreshing] = useState(false);\n")
path.write_text(text, encoding='utf-8')
