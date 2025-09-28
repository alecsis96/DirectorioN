const fs = require('fs');
const path = 'pages/negocios/index.tsx';
let content = fs.readFileSync(path, 'utf8');
const marker = '            <p className="text-base md:text-lg text-gray-600">{headingDescription}</p>\n';
if (!content.includes(marker)) {
  console.error('Marker not found');
  process.exit(1);
}
const block = `${marker}            <div className="mt-3 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">\n              <span>\n                Tienes un negocio? <Link href="/para-negocios" className="text-[#38761D] underline">Registralo aqui</Link>\n              </span>\n              \${user ? (\n                <div className="flex items-center gap-2">\n                  <span className="text-xs text-gray-500">\${user.email}</span>\n                  <button\n                    onClick={handleSignOut}\n                    className="rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"\n                  >\n                    Cerrar sesion\n                  </button>\n                </div>\n              ) : (\n                <button\n                  onClick={handleSignIn}\n                  className="rounded bg-[#38761D] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2f5a1a]"\n                >\n                  Iniciar sesion\n                </button>\n              )}\n            </div>\n`;
content = content.replace(marker, block);
fs.writeFileSync(path, content, 'utf8');

