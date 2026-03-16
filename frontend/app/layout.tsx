import type { Metadata } from "next";
import {
  Instrument_Serif,
  Bricolage_Grotesque,
  Geist_Mono,
} from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { getConfig } from "@/lib/wagmi";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coppice — Green Bond Tokenization",
  description: "ERC-3643 compliant green bond tokenization on Hedera",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialState = cookieToInitialState(
    getConfig(),
    (await headers()).get("cookie"),
  );

  return (
    <html lang="en" className={`${instrumentSerif.variable} ${bricolageGrotesque.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-surface text-text flex flex-col">
        <Providers initialState={initialState}>
          <Nav />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full" role="main">
            {children}
          </main>
          <footer className="border-t border-border/50 py-4" role="contentinfo">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-sm text-text-muted">
              <a href="https://erc3643.info/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                ERC-3643 Compliant Green Bonds on Hedera
              </a>
              <a href="https://hashscan.io/testnet" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bond-green opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-bond-green" />
                </span>
                Hedera Testnet
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
