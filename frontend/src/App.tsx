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
        <span className="text-sm text-text-muted">
          {walletLabel}
        </span>
        <span className="text-xs font-mono text-text-muted bg-surface-3 px-2 py-1 rounded">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="text-sm text-bond-red hover:text-red-300 transition-colors"
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
      className="bg-bond-green/20 text-bond-green border border-bond-green/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-bond-green/30 transition-colors disabled:opacity-50"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-surface text-text">
      <nav className="border-b border-border bg-surface-2/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-lg font-semibold tracking-tight">
                <span className="text-bond-green">Coppice</span>
              </span>
              <div className="flex gap-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-surface-3 text-white"
                        : "text-text-muted hover:text-white hover:bg-surface-3/50"
                    }`
                  }
                >
                  Invest
                </NavLink>
                <NavLink
                  to="/issue"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-surface-3 text-white"
                        : "text-text-muted hover:text-white hover:bg-surface-3/50"
                    }`
                  }
                >
                  Issuer
                </NavLink>
                <NavLink
                  to="/monitor"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-surface-3 text-white"
                        : "text-text-muted hover:text-white hover:bg-surface-3/50"
                    }`
                  }
                >
                  Compliance
                </NavLink>
              </div>
            </div>
            <WalletButton />
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<InvestorPortal />} />
          <Route path="/issue" element={<IssuerDashboard />} />
          <Route path="/monitor" element={<ComplianceMonitor />} />
        </Routes>
      </main>
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
