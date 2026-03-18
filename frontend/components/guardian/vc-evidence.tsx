import type { VCEvidence } from "@/lib/guardian-types";

function abbreviateDid(did: string): string {
  const parts = did.split("_");
  const accountId = parts.length > 1 ? parts[parts.length - 1] : "";
  return accountId ? `did:hedera:...${accountId}` : did.slice(0, 20) + "...";
}

function hashScanUrl(topicId: string, messageId: string): string {
  return `https://hashscan.io/testnet/topic/${topicId}/message/${messageId}`;
}

function ipfsUrl(hash: string): string {
  return `https://ipfs.io/ipfs/${hash}`;
}

interface VCEvidenceRowProps {
  label: string;
  evidence: VCEvidence;
  children?: React.ReactNode;
}

export function VCEvidenceRow({ label, evidence, children }: VCEvidenceRowProps) {
  return (
    <div className="py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-white uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-text-muted font-mono">{evidence.proofType}</p>
      </div>
      <div className="space-y-1 text-xs text-text-muted">
        <p>
          <span className="text-text-muted/60">Signed by </span>
          <span className="font-mono text-white/70">{abbreviateDid(evidence.issuer)}</span>
        </p>
        <p>
          <span className="text-text-muted/60">Date: </span>
          {new Date(evidence.issuanceDate).toLocaleDateString()}
        </p>
        {children}
      </div>
      <div className="flex gap-3 mt-2">
        <a href={ipfsUrl(evidence.hash)} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">
          View on IPFS
        </a>
        <a href={hashScanUrl(evidence.topicId, evidence.messageId)} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">
          View on HashScan
        </a>
      </div>
    </div>
  );
}
