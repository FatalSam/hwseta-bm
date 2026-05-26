'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/ultis/cn';

type ThemeToggleProps = {
  className?: string;
  /** Compact icon-only control for dense headers (e.g. dashboard). */
  variant?: 'default' | 'compact';
};

export default function ThemeToggle({ className, variant = 'default' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const baseClass =
    variant === 'compact'
      ? 'rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-hwseta-green'
      : 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-hwseta-green/40 hover:bg-hwseta-green-muted hover:text-hwseta-green focus:outline-none focus:ring-2 focus:ring-hwseta-green/40 focus:ring-offset-2';

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(baseClass, className)}
        aria-label="Toggle color theme"
        disabled
      >
        <Sun className="h-5 w-5 opacity-40" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(baseClass, className)}
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}
