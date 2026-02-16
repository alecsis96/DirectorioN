import AdminSidebar from '@/components/admin/shared/AdminSidebar';
import AdminFab from '@/components/admin/shared/AdminFab';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Fixed on desktop, drawer on mobile */}
      <AdminSidebar />
      
      {/* Main Content */}
      <main className="flex-1 w-full lg:ml-64">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      
      {/* Contextual FAB - Solo acciones específicas por ruta */}
      <AdminFab />
    </div>
  );
}
