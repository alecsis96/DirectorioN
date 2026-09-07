import Link from 'next/link';

export default function UnauthorizedPage() {
  return <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16">
    <section className="w-full space-y-4 rounded-2xl border bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Acceso no autorizado</h1>
      <p className="text-gray-600">Tu cuenta está autenticada, pero no tiene permisos para abrir el panel de administración.</p>
      <div className="flex justify-center gap-3">
        <Link href="/" className="rounded-lg border px-4 py-2 font-semibold text-gray-700">Ir al inicio</Link>
        <Link href="/entrar?next=/admin" className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">Usar otra cuenta</Link>
      </div>
    </section>
  </main>;
}
