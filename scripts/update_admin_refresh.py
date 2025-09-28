from pathlib import Path
import re

path = Path('pages/admin/applications.tsx')
text = path.read_text(encoding='utf-8')

# Replace fetchApplications function with useCallback version
pattern = r"  async function fetchApplications\(token: string\) {([\s\S]*?)  }\n\n"
replacement = "  const fetchApplications = React.useCallback(async (token: string) => {\\1  }, []);\n\n"
new_text, count = re.subn(pattern, replacement, text)
if count != 1:
    raise SystemExit('Failed to replace fetchApplications block')
text = new_text

# Insert refreshing state after message state
insertion_point = "  const [message, setMessage] = useState<string>('');\n"
if insertion_point not in text:
    raise SystemExit('message state line not found')
text = text.replace(insertion_point, insertion_point + "  const [refreshing, setRefreshing] = useState(false);\n")

# Add handleRefresh function before return
marker = "  return (\n"
handle_refresh = "  const handleRefresh = useCallback(async () => {\n    if (!user) return;\n    try {\n      setRefreshing(true);\n      const token = await user.getIdToken(true);\n      await fetchApplications(token);\n      setMessage('Solicitudes actualizadas.');\n    } catch (err) {\n      console.error('admin applications refresh error', err);\n      setError('No pudimos actualizar la lista.');\n    } finally {\n      setRefreshing(false);\n    }\n  }, [user, fetchApplications]);\n\n"
if marker not in text:
    raise SystemExit('return marker not found')
text = text.replace(marker, handle_refresh + marker, 1)

# Update header buttons to include refresh
header_pattern = r"(\{user \? \([\s\S]*?Cerrar sesión[\s\S]*?\)</button>\n              </>\n            )"

replacement_header = "{user ? (\n            <>\n              <span className=\"text-xs text-gray-500\">{user.email}</span>\n              <div className=\"flex items-center gap-2\">\n                <button\n                  onClick={handleRefresh}\n                  disabled={refreshing || loading}\n                  className=\"rounded border border-[#38761D] px-3 py-1 text-xs font-semibold text-[#38761D] hover:bg-[#38761D]/10 disabled:opacity-50\"\n                >\n                  {refreshing ? 'Actualizando...' : 'Actualizar'}\n                </button>\n                <button\n                  onClick={() => signOut(auth)}\n                  className=\"rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100\"\n                >\n                  Cerrar sesión\n                </button>\n              </div>\n            </>\n          )"

new_text, count = re.subn(header_pattern, replacement_header, text, count=1)
if count != 1:
    raise SystemExit('Failed to update header block')
text = new_text

path.write_text(text, encoding='utf-8')
