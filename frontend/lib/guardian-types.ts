// TypeScript types for Guardian VC data
// Field names match Guardian credentialSubject keys (PascalCase, no spaces)

export interface Indicator {
  name: string;
  value: number;
  unit: string;
}

// Raw credentialSubject shapes as returned by Guardian API

export interface BondFrameworkCS {
  BondName: string;
  BondSymbol: string;
  ISIN: string;
  Issuer: string;
  Currency: string;
  TotalIssuanceAmount: number;
  CouponRate: string;
  MaturityDate: string;
  CouponStepUpBps: number;
  SustainabilityPerformanceTarget: string;
  EligibleICMACategories: string;
  ReportingStandard: string;
  RegulatoryFrameworks?: string;
  EUTaxonomyAlignmentPercent?: number;
  BondContractAddress: string;
  LCCFContractAddress: string;
  ExternalReviewProvider?: string;
}

export interface ProjectRegistrationCS {
  ProjectName: string;
  ICMACategory: string;
  SubCategory: string;
  Country: string;
  Location: string;
  Capacity: number;
  CapacityUnit: string;
  ProjectLifetimeYears: number;
  AnnualTargetCO2e: number;
  EUTaxonomyActivityID?: string;
  NACECode?: string;
  EnvironmentalObjective?: string;
  TaxonomyAlignmentStatus?: string;
}

export interface FundAllocationCS {
  ProjectName: string;
  SignedAmountEUSD: number;
  AllocatedAmountEUSD: number;
  ShareofFinancingPercent: number;
  AllocationDate: string;
  Purpose: string;
  HederaTransactionID: string;
}

export interface MRVReportCS {
  ProjectName: string;
  ICMACategory: string;
  ReportingPeriodStart: string;
  ReportingPeriodEnd: string;
  AnnualGHGReduced: number;
  Methodology: string;
  ReportingStandard: string;
  CoreIndicatorsJSON: string;
  AdditionalIndicatorsJSON?: string;
}

export interface VerificationStatementCS {
  ProjectName: string;
  ReportingPeriod: string;
  VerifiedGHGReduced: number;
  Opinion: string;
  VerifiedCoreIndicatorsJSON?: string;
  VerifierNotes?: string;
}

// Guardian VC document wrapper (as returned by viewer block API)
export interface GuardianVCDocument<T = Record<string, unknown>> {
  createDate: string;
  updateDate: string;
  hash: string;
  hederaStatus: string;
  type: string;
  policyId: string;
  tag: string;
  schema: string;
  option: { status: string };
  owner: string;
  topicId: string;
  messageId: string;
  messageHash: string;
  document: {
    id: string;
    type: string[];
    issuer: string;
    issuanceDate: string;
    credentialSubject: T[];
    proof: {
      type: string;
      created: string;
      verificationMethod: string;
      proofPurpose: string;
      jws: string;
    };
  };
  _id: string;
  id: string;
}

// Viewer block response
export interface ViewerBlockResponse<T = Record<string, unknown>> {
  data: GuardianVCDocument<T>[];
}

// Provenance metadata extracted from VC document wrapper
export interface VCEvidence {
  hash: string;           // IPFS CID (base58)
  topicId: string;        // HCS topic ID
  messageId: string;      // HCS message timestamp
  issuer: string;         // DID of signer
  issuanceDate: string;   // ISO timestamp
  proofType: string;      // e.g. "Ed25519Signature2018"
}

// Aggregated data for frontend consumption
export interface GuardianProject {
  registration: ProjectRegistrationCS;
  registrationEvidence?: VCEvidence;
  registrationDocument?: Record<string, unknown>;
  allocation?: FundAllocationCS;
  allocationEvidence?: VCEvidence;
  allocationDocument?: Record<string, unknown>;
  mrvReport?: MRVReportCS;
  mrvEvidence?: VCEvidence;
  mrvDocument?: Record<string, unknown>;
  verification?: VerificationStatementCS;
  verificationEvidence?: VCEvidence;
  verificationDocument?: Record<string, unknown>;
  isVerified: boolean;
  verifiedCO2e: number;
  createDate: string;
}

export interface GuardianData {
  bondFramework: BondFrameworkCS | null;
  projects: GuardianProject[];
  totalAllocatedEUSD: number;
  totalIssuanceEUSD: number;
  allocationPercent: number;
  totalVerifiedCO2e: number;
  sptTarget: number;
  sptMet: boolean;
}
