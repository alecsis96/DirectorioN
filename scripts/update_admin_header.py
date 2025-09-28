from pathlib import Path
import re
path = Path('pages/admin/applications.tsx')
text = path.read_text(encoding='utf-8')
pattern = r"          \{user \? \(\n            <>\n              <span className=\"text-xs text-gray-500\">\{user.email\}</span>\n              <button\n                onClick=\{\(\) => signOut\(auth\)\}\n                className=\"rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100\"\n              >\n                Cerrar sesi\u00f3n\n              </button>\n            </>\n          \) : \("
replacement = "          {user ? (\n            <div className=\"flex items-center gap-3\">\n              <span className=\"text-xs text-gray-500\">{user.email}</span>\n              <button\n                onClick={handleRefresh}\n                disabled={refreshing || loading}\n                className=\"rounded border border-[#38761D] px-3 py-1 text-xs font-semibold text-[#38761D] hover:bg-[#38761D]/10 disabled:opacity-50\"\n              >\n                {(refreshing || loading) ? 'Actualizando...' : 'Actualizar'}\n              </button>\n              <button\n                onClick={() => signOut(auth)}\n                className=\"rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100\"\n              >\n                Cerrar sesión\n              </button>\n            </div>\n          ) : ("
new_text, count = re.subn(pattern, replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not update header block')
path.write_text(new_text, encoding='utf-8')
