from pathlib import Path
path = Path('pages/admin/applications.tsx')
text = path.read_text(encoding='utf-8')
text = text.replace('  }, [user?.uid]);\n\n', '  }, [user?.uid, fetchApplications]);\n\n')
path.write_text(text, encoding='utf-8')
