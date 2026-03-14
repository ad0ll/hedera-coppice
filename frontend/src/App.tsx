import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { WalletProvider, useWallet } from "./providers/WalletProvider";
import { InvestorPortal } from "./pages/InvestorPortal";
import { IssuerDashboard } from "./pages/IssuerDashboard";
import { ComplianceMonitor } from "./pages/ComplianceMonitor";

function WalletButton() {
  const { account, walletLabel, connect, disconnect, isConnecting } = useWallet();

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-3/80 border border-border rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-bond-green animate-pulse-dot" />
          <span className="text-sm font-medium text-white">{walletLabel}</span>
          <span className="text-xs font-mono text-text-muted">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="text-xs text-text-muted hover:text-bond-red transition-colors"
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
      className="bg-bond-green text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-bond-green/90 transition-all disabled:opacity-50 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

function Layout() {
  const navLink = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-bond-green/10 text-bond-green"
        : "text-text-muted hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-surface text-text flex flex-col">
      <nav className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <NavLink to="/" className="flex items-center gap-2 group">
                <svg viewBox="0 0 32 32" className="w-7 h-7">
                  <rect width="32" height="32" rx="6" fill="currentColor" className="text-surface-3" />
                  <path d="M16 6C11 11 9 16 11 21C12 24 14 26 16 27C18 26 20 24 21 21C23 16 21 11 16 6Z" fill="#22c55e" opacity="0.9"/>
                </svg>
                <span className="text-lg font-semibold tracking-tight text-white">
                  Coppice
                </span>
              </NavLink>
              <div className="flex gap-1">
                <NavLink to="/" end className={navLink}>Invest</NavLink>
                <NavLink to="/issue" className={navLink}>Issuer</NavLink>
                <NavLink to="/monitor" className={navLink}>Compliance</NavLink>
              </div>
            </div>
            <WalletButton />
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <Routes>
          <Route path="/" element={<InvestorPortal />} />
          <Route path="/issue" element={<IssuerDashboard />} />
          <Route path="/monitor" element={<ComplianceMonitor />} />
        </Routes>
      </main>
      <footer className="border-t border-border/50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-text-muted">
          <span>ERC-3643 Compliant Green Bonds on Hedera</span>
          <span>Hedera Testnet (Chain 296)</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <Layout />
      </WalletProvider>
    </BrowserRouter>
  );
}
