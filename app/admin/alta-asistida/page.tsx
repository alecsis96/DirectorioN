import { Metadata } from 'next';
import AltaAsistidaForm from '@/components/admin/AltaAsistidaForm';

export const metadata: Metadata = {
  title: 'Alta Asistida | Admin Panel',
  description: 'Crear nuevo negocio con asistencia del equipo admin',
};

export default function AdminAltaAsistidaPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Alta Asistida</h1>
        <p className="text-gray-600">
          Crea un nuevo negocio desde el panel admin. El negocio se enviará a "Listas para publicar" para revisión final.
        </p>
      </div>

      {/* Formulario */}
      <AltaAsistidaForm />
    </div>
  );
}
