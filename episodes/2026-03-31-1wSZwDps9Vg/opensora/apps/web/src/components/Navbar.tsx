'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#090909]/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2 group">
            {/* Film reel icon mark */}
            <div className="h-7 w-7 rounded-md bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
              <svg
                className="h-3.5 w-3.5 text-brand-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="9" />
                <line x1="12" y1="15" x2="12" y2="22" />
                <line x1="2" y1="12" x2="9" y2="12" />
                <line x1="15" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span className="font-display text-base font-bold tracking-tight">
              <span className="text-brand-400">Open</span>
              <span className="text-white">Sora</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-xs font-semibold tracking-[0.15em] uppercase text-white/40 hover:text-white/80 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-xs font-semibold tracking-[0.15em] uppercase text-white/40 hover:text-white/80 transition-colors"
            >
              How it works
            </Link>
            <Link href="#waitlist" className="btn-primary py-2 text-[10px]">
              Join Waitlist
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-white/40 hover:text-white/80 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#090909]/98 px-4 py-4 space-y-1">
          <Link
            href="#features"
            className="block text-xs font-semibold tracking-[0.15em] uppercase text-white/40 hover:text-white/80 py-3 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="block text-xs font-semibold tracking-[0.15em] uppercase text-white/40 hover:text-white/80 py-3 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            How it works
          </Link>
          <div className="pt-2">
            <Link
              href="#waitlist"
              className="btn-primary w-full justify-center text-[10px]"
              onClick={() => setMobileOpen(false)}
            >
              Join Waitlist
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
