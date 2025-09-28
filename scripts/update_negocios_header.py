from pathlib import Path

path = Path('pages/negocios/index.tsx')
text = path.read_text(encoding='utf-8')
markers = [
    "            <p className=\"text-base md:text-lg text-gray-600\">{headingDescription}</p>\r\n",
    "            <p className=\"text-base md:text-lg text-gray-600\">{headingDescription}</p>\n"
]

for marker in markers:
    if marker in text:
        break
else:
    raise SystemExit('Marker not found')

addition = marker + "            <div className=\"mt-3 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between\">\n              <span>\n                Tienes un negocio? <Link href=\"/para-negocios\" className=\"text-[#38761D] underline\">Registralo aqui</Link>\n              </span>\n              {user ? (\n                <div className=\"flex items-center gap-2\">\n                  <span className=\"text-xs text-gray-500\">{user.email}</span>\n                  <button\n                    onClick={handleSignOut}\n                    className=\"rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100\"\n                  >\n                    Cerrar sesion\n                  </button>\n                </div>\n              ) : (\n                <button\n                  onClick={handleSignIn}\n                  className=\"rounded bg-[#38761D] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2f5a1a]\"\n                >\n                  Iniciar sesion\n                </button>\n              )}\n            </div>\n"

text = text.replace(marker, addition)
path.write_text(text, encoding='utf-8')
