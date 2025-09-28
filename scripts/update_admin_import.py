from pathlib import Path
path = Path('pages/admin/applications.tsx')
text = path.read_text(encoding='utf-8')
old = "import React, { useEffect, useMemo, useState } from 'react';\n"
new = "import React, { useCallback, useEffect, useMemo, useState } from 'react';\n"
if old not in text:
    raise SystemExit('import line not found')
text = text.replace(old, new)
path.write_text(text, encoding='utf-8')
