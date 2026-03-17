"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./wallet-button";

export function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  function navLinkClass(href: string) {
    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green ${
      isActive
        ? "bg-bond-green/10 text-bond-green"
        : "text-text-muted hover:text-white"
    }`;
  }

  return (
    <nav className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center gap-2 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green rounded-lg">
              <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
                <rect width="32" height="32" rx="6" fill="currentColor" className="text-surface-3" />
                <path d="M16 6C11 11 9 16 11 21C12 24 14 26 16 27C18 26 20 24 21 21C23 16 21 11 16 6Z" fill="#10b981" opacity="0.9"/>
              </svg>
              <span className="text-lg font-semibold tracking-tight text-white">
                Coppice
              </span>
            </Link>
            <div className="hidden sm:flex gap-1">
              <Link href="/" className={navLinkClass("/")}>Invest</Link>
              <Link href="/coupons" className={navLinkClass("/coupons")}>Coupons</Link>
              <Link href="/impact" className={navLinkClass("/impact")}>Impact</Link>
              <Link href="/issue" className={navLinkClass("/issue")}>Issuer</Link>
              <Link href="/monitor" className={navLinkClass("/monitor")}>Compliance</Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg text-text-muted hover:text-white hover:bg-surface-3/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <WalletButton />
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-border bg-surface-2/95 backdrop-blur-md">
          <div className="px-4 py-3 flex gap-2">
            {[
              { href: "/", label: "Invest" },
              { href: "/coupons", label: "Coupons" },
              { href: "/impact", label: "Impact" },
              { href: "/issue", label: "Issuer" },
              { href: "/monitor", label: "Compliance" },
            ].map(({ href, label }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-bond-green/10 text-bond-green"
                      : "text-text-muted hover:text-white hover:bg-surface-3/50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
