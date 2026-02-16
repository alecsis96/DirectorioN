import { Metadata } from 'next';
import AdminBusinessPanel from '../../../../components/AdminBusinessPanel';

export const metadata: Metadata = {
  title: 'Solicitudes de Negocios | Admin',
  description: 'Gestiona solicitudes de publicación de negocios con el nuevo sistema de estados',
  robots: 'noindex, nofollow',
};

export default function AdminSolicitudesPage() {
  return <AdminBusinessPanel />;
}
