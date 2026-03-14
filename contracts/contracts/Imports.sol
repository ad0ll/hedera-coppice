// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

// T-REX core contracts
import "@tokenysolutions/t-rex/contracts/token/Token.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/IdentityRegistry.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/IdentityRegistryStorage.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/ClaimTopicsRegistry.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/TrustedIssuersRegistry.sol";
import "@tokenysolutions/t-rex/contracts/compliance/modular/ModularCompliance.sol";

// T-REX proxy contracts
import "@tokenysolutions/t-rex/contracts/proxy/TokenProxy.sol";
import "@tokenysolutions/t-rex/contracts/proxy/ClaimTopicsRegistryProxy.sol";
import "@tokenysolutions/t-rex/contracts/proxy/IdentityRegistryProxy.sol";
import "@tokenysolutions/t-rex/contracts/proxy/IdentityRegistryStorageProxy.sol";
import "@tokenysolutions/t-rex/contracts/proxy/TrustedIssuersRegistryProxy.sol";
import "@tokenysolutions/t-rex/contracts/proxy/ModularComplianceProxy.sol";

// T-REX factory and authority
import "@tokenysolutions/t-rex/contracts/factory/TREXFactory.sol";
import "@tokenysolutions/t-rex/contracts/proxy/authority/TREXImplementationAuthority.sol";

// Compliance modules
import "@tokenysolutions/t-rex/contracts/compliance/modular/modules/CountryRestrictModule.sol";
import "@tokenysolutions/t-rex/contracts/compliance/modular/modules/MaxBalanceModule.sol";
import "@tokenysolutions/t-rex/contracts/compliance/modular/modules/SupplyLimitModule.sol";

// OnchainID
import "@onchain-id/solidity/contracts/ClaimIssuer.sol";
