'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Plan', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-sm md:hidden">
      <ul className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-4 py-2 text-xs transition-colors',
                  active ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('size-5', active && 'stroke-[2.5]')} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
