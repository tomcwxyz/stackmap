'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppConfig } from '@/hooks/useAppConfig';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { config } = useAppConfig();

  return (
    <header className="bg-surface-50 border-b border-surface-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Name */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-primary-800 hover:text-primary-600 transition-colors"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="2" y="18" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.3" />
              <rect x="10" y="10" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.6" />
              <rect x="18" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
            </svg>
            <span className="text-xl font-bold font-display tracking-tight">Stackmap</span>
          </Link>

          {/* Desktop — CTA + optional risk link */}
          <nav className="hidden md:flex items-center gap-4" aria-label="Main navigation">
            <Link
              href="/view/systems"
              className="text-sm font-medium text-primary-700 hover:text-primary-900 transition-colors"
            >
              Your systems
            </Link>
            {config.techFreedomAvailable && (
              <Link
                href="/view/techfreedom"
                className="text-sm font-medium text-primary-700 hover:text-primary-900 transition-colors"
              >
                Risk Assessment
              </Link>
            )}
            <Link
              href="/wizard"
              className="btn-primary text-sm px-5 py-2 inline-flex items-center gap-1.5"
            >
              Start mapping
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-primary-700 hover:bg-surface-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 border-t border-surface-200 pt-3" aria-label="Mobile navigation">
            <Link
              href="/"
              className="block px-3 py-2 rounded-md text-sm font-medium text-primary-700 hover:bg-surface-100 hover:text-primary-900 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/wizard"
              className="block px-3 py-2 rounded-md text-sm font-medium text-primary-700 hover:bg-surface-100 hover:text-primary-900 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Start mapping
            </Link>
            <Link
              href="/view/systems"
              className="block px-3 py-2 rounded-md text-sm font-medium text-primary-700 hover:bg-surface-100 hover:text-primary-900 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Your systems
            </Link>
            <Link
              href="/view/diagram"
              className="block px-3 py-2 rounded-md text-sm font-medium text-primary-700 hover:bg-surface-100 hover:text-primary-900 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Diagram
            </Link>
            {config.techFreedomAvailable && (
              <Link
                href="/view/techfreedom"
                className="block px-3 py-2 rounded-md text-sm font-medium text-primary-700 hover:bg-surface-100 hover:text-primary-900 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Risk Assessment
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
