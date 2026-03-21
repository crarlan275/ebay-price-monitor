// ============================================================
// app/layout.tsx — Layout raíz de la aplicación
// ============================================================
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

/* PENDIENTE DISEÑO: tipografía — reemplazar Inter por la fuente elegida */
export const metadata: Metadata = {
  title: 'eBay Price Monitor',
  description: 'Monitoreo automático de precios en eBay con alertas por WhatsApp',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'eBay Monitor',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        /* PENDIENTE DISEÑO: color de fondo principal y tipografía base */
        className="bg-gray-50 text-gray-900 font-sans antialiased"
      >
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
