from pathlib import Path

path = Path('pages/negocios/index.tsx')
text = path.read_text(encoding='utf-8')
old_options = [
    "  useEffect(() => onAuthStateChanged(auth, setUser), []);\r\n  const router = useRouter();\r\n  const [geoError, setGeoError] = useState<string>(\"\");\r\n  const [locating, setLocating] = useState(false);\r\n\r\n",
    "  useEffect(() => onAuthStateChanged(auth, setUser), []);\n  const router = useRouter();\n  const [geoError, setGeoError] = useState<string>(\"\");\n  const [locating, setLocating] = useState(false);\n\n"
]
for old in old_options:
    if old in text:
        text = text.replace(old, "  useEffect(() => onAuthStateChanged(auth, setUser), []);\n\n")
        break
else:
    raise SystemExit('pattern not found')

path.write_text(text, encoding='utf-8')
