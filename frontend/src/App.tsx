import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { WalletProvider, useWallet } from "./providers/WalletProvider";
import { InvestorPortal } from "./pages/InvestorPortal";
import { IssuerDashboard } from "./pages/IssuerDashboard";
import { ComplianceMonitor } from "./pages/ComplianceMonitor";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useState } from "react";

function WalletButton() {
  const { account, walletLabel, connect, disconnect, isConnecting } = useWallet();

  if (account) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 bg-surface-3/80 border border-border rounded-lg px-2.5 py-1.5 sm:px-3">
          <span className="w-2 h-2 rounded-full bg-bond-green animate-pulse-dot" />
          <span className="text-sm font-medium text-white">{walletLabel}</span>
          <span className="text-xs font-mono text-text-muted hidden sm:inline">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="text-xs text-text-muted hover:text-bond-red transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green rounded"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="bg-bond-green text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-bond-green/90 transition-all disabled:opacity-50 shadow-[0_0_12px_rgba(34,197,94,0.2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="sm:hidden border-t border-border bg-surface-2/95 backdrop-blur-md">
      <div className="px-4 py-3 flex gap-2">
        <NavLink
          to="/" end
          onClick={onClose}
          className={({ isActive }) =>
            `flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-bond-green/10 text-bond-green" : "text-text-muted hover:text-white hover:bg-surface-3/50"
            }`
          }
        >
          Invest
        </NavLink>
        <NavLink
          to="/issue"
          onClick={onClose}
          className={({ isActive }) =>
            `flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-bond-green/10 text-bond-green" : "text-text-muted hover:text-white hover:bg-surface-3/50"
            }`
          }
        >
          Issuer
        </NavLink>
        <NavLink
          to="/monitor"
          onClick={onClose}
          className={({ isActive }) =>
            `flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-bond-green/10 text-bond-green" : "text-text-muted hover:text-white hover:bg-surface-3/50"
            }`
          }
        >
          Compliance
        </NavLink>
      </div>
    </div>
  );
}

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green ${
      isActive
        ? "bg-bond-green/10 text-bond-green"
        : "text-text-muted hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-surface text-text flex flex-col">
      <nav className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4 sm:gap-8">
              <NavLink to="/" className="flex items-center gap-2 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green rounded-lg">
                <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
                  <rect width="32" height="32" rx="6" fill="currentColor" className="text-surface-3" />
                  <path d="M16 6C11 11 9 16 11 21C12 24 14 26 16 27C18 26 20 24 21 21C23 16 21 11 16 6Z" fill="#22c55e" opacity="0.9"/>
                </svg>
                <span className="text-lg font-semibold tracking-tight text-white">
                  Coppice
                </span>
              </NavLink>
              {/* Desktop nav links */}
              <div className="hidden sm:flex gap-1">
                <NavLink to="/" end className={navLink}>Invest</NavLink>
                <NavLink to="/issue" className={navLink}>Issuer</NavLink>
                <NavLink to="/monitor" className={navLink}>Compliance</NavLink>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile hamburger */}
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
        <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full" role="main">
        <Routes>
          <Route path="/" element={<InvestorPortal />} />
          <Route path="/issue" element={<IssuerDashboard />} />
          <Route path="/monitor" element={<ComplianceMonitor />} />
        </Routes>
      </main>
      <footer className="border-t border-border/50 py-4" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-text-muted">
          <a href="https://erc3643.info/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            ERC-3643 Compliant Green Bonds on Hedera
          </a>
          <a href="https://hashscan.io/testnet" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            Hedera Testnet (Chain 296)
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <ErrorBoundary>
          <Layout />
        </ErrorBoundary>
      </WalletProvider>
    </BrowserRouter>
  );
}
