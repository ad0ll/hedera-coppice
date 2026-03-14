import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./constants";

// Minimal ABIs — only the functions/events the frontend uses
export const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function pause()",
  "function unpause()",
  "function paused() view returns (bool)",
  "function setAddressFrozen(address addr, bool freeze)",
  "function isFrozen(address addr) view returns (bool)",
  "function isAgent(address addr) view returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event AddressFrozen(address indexed addr, bool indexed isFrozen, address indexed owner)",
];

export const IDENTITY_REGISTRY_ABI = [
  "function isVerified(address addr) view returns (bool)",
  "function identity(address addr) view returns (address)",
  "function investorCountry(address addr) view returns (uint16)",
  "function contains(address addr) view returns (bool)",
];

export const COMPLIANCE_ABI = [
  "function canTransfer(address from, address to, uint256 amount) view returns (bool)",
];

export function getTokenContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(CONTRACT_ADDRESSES.token, TOKEN_ABI, signerOrProvider);
}

export function getIdentityRegistryContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(CONTRACT_ADDRESSES.identityRegistry, IDENTITY_REGISTRY_ABI, signerOrProvider);
}

export function getComplianceContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(CONTRACT_ADDRESSES.compliance, COMPLIANCE_ABI, signerOrProvider);
}
