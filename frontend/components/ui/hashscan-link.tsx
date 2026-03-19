import { abbreviateAddress } from "@/lib/format";
import { ExternalLinkIcon } from "@/components/ui/icons";

export function hashScanTxUrl(hash: string): string {
  return `https://hashscan.io/testnet/transaction/${hash}`;
}

interface TxLinkProps {
  hash: string;
  label?: string;
  prefixLen?: number;
  className?: string;
}

export function TxLink({ hash, label, prefixLen = 10, className }: TxLinkProps) {
  return (
    <a
      href={`https://hashscan.io/testnet/transaction/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "inline-flex items-center gap-1 font-mono text-bond-green hover:text-bond-green/80 transition-colors"}
      title={hash}
    >
      {label ?? abbreviateAddress(hash, prefixLen, 0)}
      <ExternalLinkIcon />
    </a>
  );
}

interface AddressLinkProps {
  address: string;
  label?: string;
  type?: "account" | "contract";
  prefixLen?: number;
  suffixLen?: number;
  className?: string;
}

export function AddressLink({ address, label, type = "account", prefixLen = 6, suffixLen = 4, className }: AddressLinkProps) {
  return (
    <a
      href={`https://hashscan.io/testnet/${type}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "inline-flex items-center gap-1 font-mono text-bond-green hover:text-bond-green/80 transition-colors"}
      title={address}
    >
      {label ?? abbreviateAddress(address, prefixLen, suffixLen)}
      <ExternalLinkIcon />
    </a>
  );
}
