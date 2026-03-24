# Architecture Diagram (Mermaid)

Render this in any Mermaid-compatible tool (GitHub README, Mermaid Live Editor, etc.)

```mermaid
graph TD
    subgraph Frontend["Next.js 16 Frontend"]
        IP["Investor Portal"]
        CP["Coupons Page"]
        IMP["Impact Page"]
        ID["Issuer Dashboard"]
        CM["Compliance Monitor"]
        ATS["AtsContext<br/><small>ethers v6 + MetaMask</small>"]
        API["API Routes<br/><small>purchase | allocate | distribute-coupon<br/>onboard | faucet | grant-agent-role<br/>guardian/data | guardian/ipfs</small>"]
    end

    subgraph SC["Smart Contracts<br/><i>Hedera EVM</i>"]
        Bond["ATS Bond (Diamond Proxy)<br/><small>CPC — 0xcFbB4b74...</small>"]
        LCCF["LifeCycleCashFlow<br/><small>Coupon Distribution — 0xC36cd7a8...</small>"]
        Facets["ATS Facets<br/><small>ERC20 | ERC1594 | KYC | Bond<br/>AccessControl | ControlList</small>"]
    end

    subgraph Guardian["Hedera Guardian<br/><i>guardian.coppice.cc</i>"]
        Policy["CPC Green Bond MRV Policy"]
        VCs["Verifiable Credentials<br/><small>Bond Framework | Project Registration<br/>Fund Allocation | MRV Report<br/>Verification Statement</small>"]
    end

    subgraph HCS["Hedera Consensus Service"]
        Audit["Audit Topic<br/><small>0.0.8214934</small>"]
        GuardianHCS["Guardian Topics<br/><small>VC anchoring</small>"]
    end

    subgraph HTS["Hedera Token Service"]
        eUSD["eUSD Stablecoin<br/><small>0.0.8214937</small>"]
    end

    MN["Mirror Node REST API<br/><small>Contract logs | HTS balances<br/>Account lookup | Tx verify</small>"]

    IP & CP & IMP & ID & CM --> ATS
    ATS -->|"JSON-RPC<br/>Chain 296"| SC
    API -->|"issue() + transferFrom()"| SC
    API -->|"executeDistribution()"| LCCF
    API -->|"REST API (VCs)"| Guardian
    CM & IP & ID --> MN
    IMP -->|"/api/guardian/data"| API

    Guardian -->|"VC anchoring"| GuardianHCS
    Guardian -->|"IPFS storage"| VCs

    MN -.->|"read contract logs"| SC
    MN -.->|"read balances"| HTS
    MN -.->|"read messages"| HCS

    Bond --> Facets

    style Frontend fill:#ecfdf5,stroke:#059669,stroke-width:2px
    style SC fill:#f0fdf4,stroke:#047857,stroke-width:2px
    style Guardian fill:#eff6ff,stroke:#3b82f6,stroke-width:2px
    style HCS fill:#ecfdf5,stroke:#059669,stroke-width:2px
    style HTS fill:#ecfdf5,stroke:#059669,stroke-width:2px
    style MN fill:#f1f5f9,stroke:#64748b,stroke-width:2px
```

## 5 Hedera Services

1. **Smart Contracts (EVM)** -- ATS Bond (diamond proxy with ERC20, ERC1594, KYC, Bond, AccessControl, ControlList facets) + LifeCycleCashFlow (coupon distribution via mass payout)
2. **Hedera Consensus Service** -- Guardian VC anchoring topics (immutable provenance chain for MRV data)
3. **Hedera Token Service** -- eUSD stablecoin (FungibleCommon, 2 decimals) for bond settlement
4. **Mirror Node API** -- Contract event logs (primary frontend data source), HTS balance queries, account ID mapping, transaction verification
5. **Guardian** -- Verifiable Credential workflow for anti-greenwashing: bond framework, project registration, fund allocation, MRV monitoring, verification statements

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Contracts | Solidity 0.8.17 + 0.8.22, ATS (ERC-3643 diamond proxy), LifeCycleCashFlow, OpenZeppelin v4.9.6 |
| Frontend | Next.js 16, React 19, ethers v6, custom AtsContext, Tailwind CSS v4 |
| Backend | Next.js API routes (purchase, allocate, distribute-coupon, onboard, faucet, guardian proxy) |
| Guardian | Hedera Guardian v3.5.0, 5 VC schemas (ICMA-aligned), HAProxy TLS |
| Services | Next.js API routes (purchase, allocate, distribute-coupon, onboard, faucet, guardian proxy) |
| Testing | Hardhat (contracts), vitest (unit), Playwright (E2E) |
| Build | Turborepo monorepo, TypeScript throughout |
