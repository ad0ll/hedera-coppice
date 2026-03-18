import { abbreviateAddress } from "@/lib/format";
import { ExternalLinkIcon } from "@/components/ui/icons";

interface TxLinkProps {
  hash: string;
  prefixLen?: number;
}

export function TxLink({ hash, prefixLen = 10 }: TxLinkProps) {
  return (
    <a
      href={`https://hashscan.io/testnet/transaction/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-bond-green hover:text-bond-green/80 transition-colors"
      title={hash}
    >
      {abbreviateAddress(hash, prefixLen, 0)}
      <ExternalLinkIcon />
    </a>
  );
}

interface AddressLinkProps {
  address: string;
  type?: "account" | "contract";
  prefixLen?: number;
  suffixLen?: number;
}

export function AddressLink({ address, type = "account", prefixLen = 6, suffixLen = 4 }: AddressLinkProps) {
  return (
    <a
      href={`https://hashscan.io/testnet/${type}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-bond-green hover:text-bond-green/80 transition-colors"
      title={address}
    >
      {abbreviateAddress(address, prefixLen, suffixLen)}
    </a>
  );
}
