import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { ThemeToggle } from '@/components/shell/ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <MapPin className="size-5 text-brand" />
          <span>CommuteWise</span>
        </Link>

        {/* Desktop nav — hidden on mobile, shown md+ */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Dashboard
          </Link>
          <ThemeToggle />
        </nav>

        {/* Mobile: only theme toggle (nav handled by BottomNav) */}
        <div className="flex items-center md:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
