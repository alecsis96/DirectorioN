import type { ReactNode } from 'react';
import '../styles/globals.css';

export const metadata = {
  title: 'Directorio Yajalón',
  description: 'Conecta con negocios locales sin gastar datos.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}
