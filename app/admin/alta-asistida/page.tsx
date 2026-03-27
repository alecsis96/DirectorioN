import type { Metadata } from 'next';

import AltaAsistidaForm from '@/components/admin/AltaAsistidaForm';

export const metadata: Metadata = {
  title: 'Alta Asistida | Admin Panel',
  description: 'Crear nuevo negocio con un flujo guiado desde el panel admin',
};

export default function AdminAltaAsistidaPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Operacion</p>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Alta asistida</h1>
        <p className="text-sm text-gray-600">Flujo guiado para crear un negocio sin cargar todo el formulario desde el inicio.</p>
      </div>

      <AltaAsistidaForm />
    </div>
  );
}
