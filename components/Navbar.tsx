'use client';
// ============================================================
// components/Navbar.tsx — Barra de navegación principal
// ============================================================
// PENDIENTE DISEÑO: color de fondo del nav, color de links activos,
//                   logo, tipografía y hover states
// ============================================================
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard',  icon: '📊' },
  { href: '/products',  label: 'Productos',  icon: '📦' },
  { href: '/history',   label: 'Historial',  icon: '📈' },
  { href: '/settings',  label: 'Ajustes',    icon: '⚙️' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    /* PENDIENTE DISEÑO: color de fondo del navbar y sombra */
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          {/* PENDIENTE DISEÑO: logo, tipografía de marca y color */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <span className="text-2xl">🛍️</span>
            <span className="hidden sm:block">eBay Price Monitor</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  /* PENDIENTE DISEÑO: color de link activo e inactivo */
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-700'      // PENDIENTE DISEÑO: activo
                      : 'text-gray-600 hover:bg-gray-100'     // PENDIENTE DISEÑO: inactivo/hover
                  )}
                >
                  <span className="text-base">{link.icon}</span>
                  <span className="hidden sm:block">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
