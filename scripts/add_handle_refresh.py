from pathlib import Path
path = Path('pages/admin/applications.tsx')
text = path.read_text(encoding='utf-8')
marker = "  return (\n"
handle_refresh = "  const handleRefresh = useCallback(async () => {\n    if (!user) return;\n    try {\n      setRefreshing(true);\n      const token = await user.getIdToken(true);\n      await fetchApplications(token);\n      setMessage('Solicitudes actualizadas.');\n    } catch (err) {\n      console.error('admin applications refresh error', err);\n      setError('No pudimos actualizar la lista.');\n    } finally {\n      setRefreshing(false);\n    }\n  }, [user, fetchApplications]);\n\n"
if marker not in text:
    raise SystemExit('return marker not found')
text = text.replace(marker, handle_refresh + marker, 1)
path.write_text(text, encoding='utf-8')
