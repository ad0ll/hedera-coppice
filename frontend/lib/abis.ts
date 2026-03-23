/** Consolidated ABI fragments used by multiple hooks and API routes. */

export const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function isPaused() view returns (bool)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function isFrozen(address) view returns (bool)",
  "function mint(address to, uint256 amount)",
  "function pause()",
  "function unpause()",
  "function setAddressFrozen(address addr, bool freeze)",
  "function transfer(address to, uint256 amount)",
] as const;

export const BOND_ABI = [
  "function getCouponCount() view returns (uint256)",
  "function getCoupon(uint256 couponID) view returns (tuple(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) coupon, uint256 snapshotId))",
  "function takeSnapshot() returns (uint256)",
  "function setCoupon(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) _newCoupon) returns (uint256)",
] as const;

export const LCCF_ABI = [
  "function executeDistribution(address asset, uint256 distributionID, uint256 pageIndex, uint256 pageLength) returns (address[], address[], uint256[], bool)",
] as const;

export const ACCESS_CONTROL_ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
] as const;

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
] as const;

export const SECURITY_MINT_ABI = [
  "function issue(address to, uint256 value, bytes data) external",
] as const;

/** ATS KYC facet — grant KYC and check status. */
export const ATS_KYC_ABI = [
  "function grantKyc(address _account, string _vcId, uint256 _validFrom, uint256 _validTo, address _issuer) returns (bool)",
  "function getKycStatusFor(address _account) view returns (uint256)",
] as const;

/** ATS ControlList facet — whitelist management. */
export const ATS_CONTROL_LIST_ABI = [
  "function addToControlList(address _account) returns (bool)",
  "function isInControlList(address _account) view returns (bool)",
] as const;

/** ATS SSI Management facet — issuer registration (required before grantKyc). */
export const ATS_SSI_ABI = [
  "function addIssuer(address _issuer) returns (bool)",
  "function isIssuer(address _issuer) view returns (bool)",
] as const;

/** ATS role hashes shared between hooks and API routes. */
export const ROLES = {
  DEFAULT_ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000",
  AGENT: "0xc4aed0454da9bde6defa5baf93bb49d4690626fc243d138104e12d1def783ea6",
} as const;

/** eUSD uses 2 decimal places on HTS. */
export const EUSD_DECIMALS = 2;
