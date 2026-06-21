import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { ThemeToggle } from '@/components/shell/ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <MapPin className="size-5 text-brand" />
          <span>Rain-N-Route</span>
        </Link>

        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
