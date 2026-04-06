'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartBar,
  Package,
  ClockCounterClockwise,
  Gear,
  ShoppingCart,
} from '@phosphor-icons/react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  Icon: ChartBar },
  { href: '/products',  label: 'Productos',  Icon: Package },
  { href: '/history',   label: 'Historial',  Icon: ClockCounterClockwise },
  { href: '/settings',  label: 'Ajustes',    Icon: Gear },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-[var(--surface)] border-r border-[var(--border)] z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--border)]">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <ShoppingCart size={17} weight="bold" className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-1)] tracking-tight leading-none">eBay Monitor</p>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Price tracker</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-spring',
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-[var(--text-2)] hover:bg-zinc-100 hover:text-[var(--text-1)]',
                ].join(' ')}
              >
                <Icon
                  size={18}
                  weight={active ? 'fill' : 'regular'}
                  className={active ? 'text-emerald-600' : 'text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-spring'}
                />
                {label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-3)]">v0.1.0 · Spark plan</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] h-14 flex items-center px-4 gap-4">
        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
          <ShoppingCart size={14} weight="bold" className="text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight">eBay Monitor</span>
        <nav className="ml-auto flex items-center gap-0.5">
          {NAV.map(({ href, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center justify-center w-9 h-9 rounded-lg transition-spring',
                  active ? 'bg-emerald-50 text-emerald-600' : 'text-[var(--text-3)] hover:bg-zinc-100',
                ].join(' ')}
              >
                <Icon size={18} weight={active ? 'fill' : 'regular'} />
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile spacer */}
      <div className="md:hidden h-14" />
    </>
  );
}
