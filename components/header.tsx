'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

const hubTitleClass =
  'font-bold uppercase tracking-wide text-hwseta-green text-center text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[1.65rem] leading-tight';

function HubTitleBlock() {
  return (
    <div className="flex flex-col items-center min-w-0 px-1">
      <p className={hubTitleClass}>HWSETA BENEFICIARY HUB</p>
      <p className="mt-1 text-center text-[0.8125rem] sm:text-sm md:text-sm lg:text-[0.9375rem] leading-snug max-w-[22rem]">
        <span className="italic font-light text-slate-500 tracking-wide">Empowering </span>
        <span className="font-semibold text-hwseta-green not-italic tracking-tight">Your Growth.</span>
      </p>
    </div>
  );
}

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isBeneficiary } = useAuthStore();

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  const navLinkClass =
    'text-hwseta-red hover:text-hwseta-red-dark px-3 py-2 text-base font-semibold transition-colors';
  const mobileNavLinkClass =
    'block px-4 py-3 rounded-xl text-lg font-medium text-slate-700 hover:text-hwseta-green hover:bg-hwseta-green-muted transition-colors';

  const dashboardHref = '/dashboard/beneficiary';

  const authLinks = (
    <>
      {isAuthenticated && isBeneficiary() ? (
        <Link
          href={dashboardHref}
          className="rounded-xl bg-hwseta-green px-5 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-hwseta-green-dark"
        >
          Dashboard
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-400 px-6 py-2.5 text-base font-semibold text-slate-500 transition-all hover:border-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-hwseta-green px-5 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-hwseta-green-dark"
          >
            Register
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="fixed w-full z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="h-1 w-full bg-hwseta-green" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile: logo row + centered hub title */}
        <div className="md:hidden flex flex-col gap-2 min-h-[5.75rem] sm:min-h-[6.5rem] justify-center py-2 sm:py-3">
          <div className="flex justify-between items-center gap-3">
            <Link href="/" className="flex min-w-0 items-center shrink">
              <Image
                src="/images/hwseta-logo.png"
                alt="HWSETA — Health and Welfare Sector Education and Training Authority"
                width={1680}
                height={504}
                sizes="(max-width: 640px) min(92vw, 640px), (max-width: 1024px) 50vw, 680px"
                quality={100}
                priority
                className="h-16 sm:h-20 w-auto max-w-[min(85vw,520px)] object-contain object-left"
              />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex shrink-0 items-center justify-center p-2.5 rounded-xl text-slate-500 hover:text-hwseta-green hover:bg-hwseta-green-muted focus:outline-none focus:ring-2 focus:ring-hwseta-green/40 focus:ring-offset-2"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <HubTitleBlock />
        </div>

        {/* Desktop: logo | centered title | nav */}
        <div className="hidden md:grid md:grid-cols-3 md:items-center md:gap-4 lg:gap-6 min-h-[7.25rem] lg:min-h-[8rem] py-2 sm:py-3">
          <div className="justify-self-start min-w-0">
            <Link href="/" className="inline-flex min-w-0 items-center">
              <Image
                src="/images/hwseta-logo.png"
                alt="HWSETA — Health and Welfare Sector Education and Training Authority"
                width={1680}
                height={504}
                sizes="(max-width: 1024px) 280px, 360px"
                quality={100}
                priority
                className="h-[5.5rem] lg:h-24 xl:h-[6.5rem] w-auto max-w-[min(100%,320px)] lg:max-w-[min(100%,400px)] object-contain object-left"
              />
            </Link>
          </div>
          <div className="justify-self-center min-w-0 px-2 self-center">
            <HubTitleBlock />
          </div>
          <div className="justify-self-end flex flex-wrap items-center justify-end gap-1 lg:gap-2 shrink-0">
            <nav className="flex items-center gap-0.5">
              <Link href="/" className={navLinkClass}>
                Home
              </Link>
            </nav>
            {authLinks}
          </div>
        </div>

        <div
          className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-slate-100`}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
        >
          <div className="py-4 px-2 space-y-0.5">
            <Link href="/" className={mobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </Link>
          </div>
          <div className="pt-3 pb-4 px-2 border-t border-slate-100">
            <div className="flex gap-2">
              {isAuthenticated && isBeneficiary() ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 text-center py-3 rounded-xl bg-hwseta-green text-white hover:bg-hwseta-green-dark text-lg font-semibold transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 rounded-xl border border-slate-400 py-3 text-center text-lg font-semibold text-slate-500 transition-all hover:border-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 text-center py-3 rounded-xl bg-hwseta-green text-white hover:bg-hwseta-green-dark text-lg font-semibold transition-colors"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
