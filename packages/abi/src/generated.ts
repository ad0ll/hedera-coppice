//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ClaimIssuer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A)
 */
export const claimIssuerAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'initialManagementKey',
        internalType: 'address',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'executionId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'Approved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'claimId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'topic',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'scheme',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'issuer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'signature',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
      { name: 'data', internalType: 'bytes', type: 'bytes', indexed: false },
      { name: 'uri', internalType: 'string', type: 'string', indexed: false },
    ],
    name: 'ClaimAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'claimId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'topic',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'scheme',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'issuer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'signature',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
      { name: 'data', internalType: 'bytes', type: 'bytes', indexed: false },
      { name: 'uri', internalType: 'string', type: 'string', indexed: false },
    ],
    name: 'ClaimChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'claimId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'topic',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'scheme',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'issuer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'signature',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
      { name: 'data', internalType: 'bytes', type: 'bytes', indexed: false },
      { name: 'uri', internalType: 'string', type: 'string', indexed: false },
    ],
    name: 'ClaimRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'signature',
        internalType: 'bytes',
        type: 'bytes',
        indexed: true,
      },
    ],
    name: 'ClaimRevoked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'executionId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'data', internalType: 'bytes', type: 'bytes', indexed: false },
    ],
    name: 'Executed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'executionId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'data', internalType: 'bytes', type: 'bytes', indexed: false },
    ],
    name: 'ExecutionFailed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'executionId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'data', internalType: 'bytes', type: 'bytes', indexed: false },
    ],
    name: 'ExecutionRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'key', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'purpose',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'keyType',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'KeyAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'key', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'purpose',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'keyType',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'KeyRemoved',
  },
  {
    type: 'function',
    inputs: [
      { name: '_topic', internalType: 'uint256', type: 'uint256' },
      { name: '_scheme', internalType: 'uint256', type: 'uint256' },
      { name: '_issuer', internalType: 'address', type: 'address' },
      { name: '_signature', internalType: 'bytes', type: 'bytes' },
      { name: '_data', internalType: 'bytes', type: 'bytes' },
      { name: '_uri', internalType: 'string', type: 'string' },
    ],
    name: 'addClaim',
    outputs: [
      { name: 'claimRequestId', internalType: 'bytes32', type: 'bytes32' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_key', internalType: 'bytes32', type: 'bytes32' },
      { name: '_purpose', internalType: 'uint256', type: 'uint256' },
      { name: '_type', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'addKey',
    outputs: [{ name: 'success', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_id', internalType: 'uint256', type: 'uint256' },
      { name: '_approve', internalType: 'bool', type: 'bool' },
    ],
    name: 'approve',
    outputs: [{ name: 'success', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
      { name: '_data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [
      { name: 'executionId', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: '_claimId', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getClaim',
    outputs: [
      { name: 'topic', internalType: 'uint256', type: 'uint256' },
      { name: 'scheme', internalType: 'uint256', type: 'uint256' },
      { name: 'issuer', internalType: 'address', type: 'address' },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
      { name: 'uri', internalType: 'string', type: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_topic', internalType: 'uint256', type: 'uint256' }],
    name: 'getClaimIdsByTopic',
    outputs: [
      { name: 'claimIds', internalType: 'bytes32[]', type: 'bytes32[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_key', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getKey',
    outputs: [
      { name: 'purposes', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'keyType', internalType: 'uint256', type: 'uint256' },
      { name: 'key', internalType: 'bytes32', type: 'bytes32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_key', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getKeyPurposes',
    outputs: [
      { name: '_purposes', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_purpose', internalType: 'uint256', type: 'uint256' }],
    name: 'getKeysByPurpose',
    outputs: [{ name: 'keys', internalType: 'bytes32[]', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'sig', internalType: 'bytes', type: 'bytes' },
      { name: 'dataHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'getRecoveredAddress',
    outputs: [{ name: 'addr', internalType: 'address', type: 'address' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'initialManagementKey',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_sig', internalType: 'bytes', type: 'bytes' }],
    name: 'isClaimRevoked',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_identity',
        internalType: 'contract IIdentity',
        type: 'address',
      },
      { name: 'claimTopic', internalType: 'uint256', type: 'uint256' },
      { name: 'sig', internalType: 'bytes', type: 'bytes' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'isClaimValid',
    outputs: [{ name: 'claimValid', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_key', internalType: 'bytes32', type: 'bytes32' },
      { name: '_purpose', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'keyHasPurpose',
    outputs: [{ name: 'result', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_claimId', internalType: 'bytes32', type: 'bytes32' }],
    name: 'removeClaim',
    outputs: [{ name: 'success', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_key', internalType: 'bytes32', type: 'bytes32' },
      { name: '_purpose', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'removeKey',
    outputs: [{ name: 'success', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_claimId', internalType: 'bytes32', type: 'bytes32' },
      { name: '_identity', internalType: 'address', type: 'address' },
    ],
    name: 'revokeClaim',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'signature', internalType: 'bytes', type: 'bytes' }],
    name: 'revokeClaimBySignature',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes', type: 'bytes' }],
    name: 'revokedClaims',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
] as const

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A)
 */
export const claimIssuerAddress = {
  296: '0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A',
} as const

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A)
 */
export const claimIssuerConfig = {
  address: claimIssuerAddress,
  abi: claimIssuerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ClaimTopicsRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const claimTopicsRegistryAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'claimTopic',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'ClaimTopicAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'claimTopic',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'ClaimTopicRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'version', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'function',
    inputs: [{ name: '_claimTopic', internalType: 'uint256', type: 'uint256' }],
    name: 'addClaimTopic',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getClaimTopics',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'init',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_claimTopic', internalType: 'uint256', type: 'uint256' }],
    name: 'removeClaimTopic',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CountryRestrictModule
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const countryRestrictModuleAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_country',
        internalType: 'uint16',
        type: 'uint16',
        indexed: false,
      },
    ],
    name: 'AddedRestrictedCountry',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousAdmin',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'newAdmin',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AdminChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'beacon',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'BeaconUpgraded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ComplianceBound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ComplianceUnbound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'version', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_country',
        internalType: 'uint16',
        type: 'uint16',
        indexed: false,
      },
    ],
    name: 'RemovedRestrictedCountry',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'implementation',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Upgraded',
  },
  {
    type: 'function',
    inputs: [{ name: '_country', internalType: 'uint16', type: 'uint16' }],
    name: 'addCountryRestriction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_countries', internalType: 'uint16[]', type: 'uint16[]' },
    ],
    name: 'batchRestrictCountries',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_countries', internalType: 'uint16[]', type: 'uint16[]' },
    ],
    name: 'batchUnrestrictCountries',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'bindCompliance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'canComplianceBind',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'isComplianceBound',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_compliance', internalType: 'address', type: 'address' },
      { name: '_country', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'isCountryRestricted',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'isPlugAndPlay',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'moduleBurnAction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '_compliance', internalType: 'address', type: 'address' },
    ],
    name: 'moduleCheck',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'moduleMintAction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'moduleTransferAction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '_name', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_country', internalType: 'uint16', type: 'uint16' }],
    name: 'removeCountryRestriction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'unbindCompliance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newImplementation', internalType: 'address', type: 'address' },
    ],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newImplementation', internalType: 'address', type: 'address' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IIdentityRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iIdentityRegistryAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'claimTopicsRegistry',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ClaimTopicsRegistrySet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investorAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'country',
        internalType: 'uint16',
        type: 'uint16',
        indexed: true,
      },
    ],
    name: 'CountryUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investorAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'identity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investorAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'identity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'identityStorage',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityStorageSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldIdentity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newIdentity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'trustedIssuersRegistry',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'TrustedIssuersRegistrySet',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      {
        name: '_identities',
        internalType: 'contract IIdentity[]',
        type: 'address[]',
      },
      { name: '_countries', internalType: 'uint16[]', type: 'uint16[]' },
    ],
    name: 'batchRegisterIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'contains',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'deleteIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'identity',
    outputs: [
      { name: '', internalType: 'contract IIdentity', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'identityStorage',
    outputs: [
      {
        name: '',
        internalType: 'contract IIdentityRegistryStorage',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'investorCountry',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'isVerified',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'issuersRegistry',
    outputs: [
      {
        name: '',
        internalType: 'contract ITrustedIssuersRegistry',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      {
        name: '_identity',
        internalType: 'contract IIdentity',
        type: 'address',
      },
      { name: '_country', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'registerIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_claimTopicsRegistry',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'setClaimTopicsRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_identityRegistryStorage',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'setIdentityRegistryStorage',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_trustedIssuersRegistry',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'setTrustedIssuersRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'topicsRegistry',
    outputs: [
      {
        name: '',
        internalType: 'contract IClaimTopicsRegistry',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_country', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'updateCountry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      {
        name: '_identity',
        internalType: 'contract IIdentity',
        type: 'address',
      },
    ],
    name: 'updateIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IModularCompliance
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iModularComplianceAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_module',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ModuleAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'target',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'selector',
        internalType: 'bytes4',
        type: 'bytes4',
        indexed: false,
      },
    ],
    name: 'ModuleInteraction',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_module',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ModuleRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_token',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'TokenBound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_token',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'TokenUnbound',
  },
  {
    type: 'function',
    inputs: [{ name: '_module', internalType: 'address', type: 'address' }],
    name: 'addModule',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_token', internalType: 'address', type: 'address' }],
    name: 'bindToken',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'callData', internalType: 'bytes', type: 'bytes' },
      { name: '_module', internalType: 'address', type: 'address' },
    ],
    name: 'callModuleFunction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'canTransfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'created',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'destroyed',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getModules',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTokenBound',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_module', internalType: 'address', type: 'address' }],
    name: 'isModuleBound',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_module', internalType: 'address', type: 'address' }],
    name: 'removeModule',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferred',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_token', internalType: 'address', type: 'address' }],
    name: 'unbindToken',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IToken
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iTokenAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: '_isFrozen', internalType: 'bool', type: 'bool', indexed: true },
      {
        name: '_owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AddressFrozen',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ComplianceAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_identityRegistry',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityRegistryAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_lostWallet',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_newWallet',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_investorOnchainID',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RecoverySuccess',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TokensFrozen',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TokensUnfrozen',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_newName',
        internalType: 'string',
        type: 'string',
        indexed: true,
      },
      {
        name: '_newSymbol',
        internalType: 'string',
        type: 'string',
        indexed: true,
      },
      {
        name: '_newDecimals',
        internalType: 'uint8',
        type: 'uint8',
        indexed: false,
      },
      {
        name: '_newVersion',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: '_newOnchainID',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'UpdatedTokenInformation',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'spender', internalType: 'address', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchBurn',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_fromList', internalType: 'address[]', type: 'address[]' },
      { name: '_toList', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchForcedTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchFreezePartialTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_toList', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchMint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      { name: '_freeze', internalType: 'bool[]', type: 'bool[]' },
    ],
    name: 'batchSetAddressFrozen',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_toList', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchUnfreezePartialTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'compliance',
    outputs: [
      {
        name: '',
        internalType: 'contract IModularCompliance',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'forcedTransfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'freezePartialTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'getFrozenTokens',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'identityRegistry',
    outputs: [
      { name: '', internalType: 'contract IIdentityRegistry', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'isFrozen',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'onchainID',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_lostWallet', internalType: 'address', type: 'address' },
      { name: '_newWallet', internalType: 'address', type: 'address' },
      { name: '_investorOnchainID', internalType: 'address', type: 'address' },
    ],
    name: 'recoveryAddress',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_freeze', internalType: 'bool', type: 'bool' },
    ],
    name: 'setAddressFrozen',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'setCompliance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_identityRegistry', internalType: 'address', type: 'address' },
    ],
    name: 'setIdentityRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_name', internalType: 'string', type: 'string' }],
    name: 'setName',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_onchainID', internalType: 'address', type: 'address' }],
    name: 'setOnchainID',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_symbol', internalType: 'string', type: 'string' }],
    name: 'setSymbol',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'unfreezePartialTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IdentityRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0x03ecdB8673d65b81752AC14dAaCa797D846c1B31)
 */
export const identityRegistryAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_agent',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AgentAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_agent',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AgentRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'claimTopicsRegistry',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ClaimTopicsRegistrySet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investorAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'country',
        internalType: 'uint16',
        type: 'uint16',
        indexed: true,
      },
    ],
    name: 'CountryUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investorAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'identity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investorAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'identity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'identityStorage',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityStorageSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldIdentity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newIdentity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'version', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'trustedIssuersRegistry',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'TrustedIssuersRegistrySet',
  },
  {
    type: 'function',
    inputs: [{ name: '_agent', internalType: 'address', type: 'address' }],
    name: 'addAgent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      {
        name: '_identities',
        internalType: 'contract IIdentity[]',
        type: 'address[]',
      },
      { name: '_countries', internalType: 'uint16[]', type: 'uint16[]' },
    ],
    name: 'batchRegisterIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'contains',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'deleteIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'identity',
    outputs: [
      { name: '', internalType: 'contract IIdentity', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'identityStorage',
    outputs: [
      {
        name: '',
        internalType: 'contract IIdentityRegistryStorage',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_trustedIssuersRegistry',
        internalType: 'address',
        type: 'address',
      },
      {
        name: '_claimTopicsRegistry',
        internalType: 'address',
        type: 'address',
      },
      { name: '_identityStorage', internalType: 'address', type: 'address' },
    ],
    name: 'init',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'investorCountry',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_agent', internalType: 'address', type: 'address' }],
    name: 'isAgent',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'isVerified',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'issuersRegistry',
    outputs: [
      {
        name: '',
        internalType: 'contract ITrustedIssuersRegistry',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      {
        name: '_identity',
        internalType: 'contract IIdentity',
        type: 'address',
      },
      { name: '_country', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'registerIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_agent', internalType: 'address', type: 'address' }],
    name: 'removeAgent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_claimTopicsRegistry',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'setClaimTopicsRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_identityRegistryStorage',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'setIdentityRegistryStorage',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_trustedIssuersRegistry',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'setTrustedIssuersRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'topicsRegistry',
    outputs: [
      {
        name: '',
        internalType: 'contract IClaimTopicsRegistry',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_country', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'updateCountry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      {
        name: '_identity',
        internalType: 'contract IIdentity',
        type: 'address',
      },
    ],
    name: 'updateIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0x03ecdB8673d65b81752AC14dAaCa797D846c1B31)
 */
export const identityRegistryAddress = {
  296: '0x03ecdB8673d65b81752AC14dAaCa797D846c1B31',
} as const

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0x03ecdB8673d65b81752AC14dAaCa797D846c1B31)
 */
export const identityRegistryConfig = {
  address: identityRegistryAddress,
  abi: identityRegistryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IdentityRegistryStorage
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const identityRegistryStorageAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_agent',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AgentAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_agent',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AgentRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investorAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'country',
        internalType: 'uint16',
        type: 'uint16',
        indexed: true,
      },
    ],
    name: 'CountryModified',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldIdentity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newIdentity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityModified',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'identityRegistry',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityRegistryBound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'identityRegistry',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityRegistryUnbound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investorAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'identity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityStored',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investorAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'identity',
        internalType: 'contract IIdentity',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityUnstored',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'version', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'function',
    inputs: [{ name: '_agent', internalType: 'address', type: 'address' }],
    name: 'addAgent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      {
        name: '_identity',
        internalType: 'contract IIdentity',
        type: 'address',
      },
      { name: '_country', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'addIdentityToStorage',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_identityRegistry', internalType: 'address', type: 'address' },
    ],
    name: 'bindIdentityRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'init',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_agent', internalType: 'address', type: 'address' }],
    name: 'isAgent',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'linkedIdentityRegistries',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      {
        name: '_identity',
        internalType: 'contract IIdentity',
        type: 'address',
      },
    ],
    name: 'modifyStoredIdentity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_country', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'modifyStoredInvestorCountry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_agent', internalType: 'address', type: 'address' }],
    name: 'removeAgent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'removeIdentityFromStorage',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'storedIdentity',
    outputs: [
      { name: '', internalType: 'contract IIdentity', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'storedInvestorCountry',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_identityRegistry', internalType: 'address', type: 'address' },
    ],
    name: 'unbindIdentityRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MaxBalanceModule
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const maxBalanceModuleAbi = [
  {
    type: 'error',
    inputs: [
      { name: '_compliance', internalType: 'address', type: 'address' },
      { name: '_id', internalType: 'address[]', type: 'address[]' },
      { name: '_balance', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'InvalidPresetValues',
  },
  {
    type: 'error',
    inputs: [
      { name: '_compliance', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'MaxBalanceExceeded',
  },
  {
    type: 'error',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'OnlyComplianceOwnerCanCall',
  },
  {
    type: 'error',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'TokenAlreadyBound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousAdmin',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'newAdmin',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AdminChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'beacon',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'BeaconUpgraded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ComplianceBound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ComplianceUnbound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: '_id', internalType: 'address', type: 'address', indexed: true },
      {
        name: '_balance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'IDBalancePreSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'version', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_maxBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'MaxBalanceSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'PresetCompleted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'implementation',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Upgraded',
  },
  {
    type: 'function',
    inputs: [
      { name: '_compliance', internalType: 'address', type: 'address' },
      { name: '_id', internalType: 'address[]', type: 'address[]' },
      { name: '_balance', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchPreSetModuleState',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'bindCompliance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'canComplianceBind',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_compliance', internalType: 'address', type: 'address' },
      { name: '_identity', internalType: 'address', type: 'address' },
    ],
    name: 'getIDBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'isComplianceBound',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'isPlugAndPlay',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'moduleBurnAction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
      { name: '_compliance', internalType: 'address', type: 'address' },
    ],
    name: 'moduleCheck',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'moduleMintAction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'moduleTransferAction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '_name', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_compliance', internalType: 'address', type: 'address' },
      { name: '_id', internalType: 'address', type: 'address' },
      { name: '_balance', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'preSetModuleState',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'presetCompleted',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_max', internalType: 'uint256', type: 'uint256' }],
    name: 'setMaxBalance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'unbindCompliance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newImplementation', internalType: 'address', type: 'address' },
    ],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newImplementation', internalType: 'address', type: 'address' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ModularCompliance
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf)
 */
export const modularComplianceAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'version', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_module',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ModuleAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'target',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'selector',
        internalType: 'bytes4',
        type: 'bytes4',
        indexed: false,
      },
    ],
    name: 'ModuleInteraction',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_module',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ModuleRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_token',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'TokenBound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_token',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'TokenUnbound',
  },
  {
    type: 'function',
    inputs: [{ name: '_module', internalType: 'address', type: 'address' }],
    name: 'addModule',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_token', internalType: 'address', type: 'address' }],
    name: 'bindToken',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'callData', internalType: 'bytes', type: 'bytes' },
      { name: '_module', internalType: 'address', type: 'address' },
    ],
    name: 'callModuleFunction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'canTransfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'created',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'destroyed',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getModules',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTokenBound',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'init',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_module', internalType: 'address', type: 'address' }],
    name: 'isModuleBound',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_module', internalType: 'address', type: 'address' }],
    name: 'removeModule',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferred',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_token', internalType: 'address', type: 'address' }],
    name: 'unbindToken',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf)
 */
export const modularComplianceAddress = {
  296: '0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf',
} as const

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf)
 */
export const modularComplianceConfig = {
  address: modularComplianceAddress,
  abi: modularComplianceAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SupplyLimitModule
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const supplyLimitModuleAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousAdmin',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'newAdmin',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AdminChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'beacon',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'BeaconUpgraded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ComplianceBound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ComplianceUnbound',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'version', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: '_limit',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'SupplyLimitSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'implementation',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Upgraded',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'bindCompliance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'canComplianceBind',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'getSupplyLimit',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'isComplianceBound',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'isPlugAndPlay',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'moduleBurnAction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
      { name: '_compliance', internalType: 'address', type: 'address' },
    ],
    name: 'moduleCheck',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'moduleMintAction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'moduleTransferAction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '_name', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_limit', internalType: 'uint256', type: 'uint256' }],
    name: 'setSupplyLimit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'unbindCompliance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newImplementation', internalType: 'address', type: 'address' },
    ],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newImplementation', internalType: 'address', type: 'address' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TREXFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const trexFactoryAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'implementationAuthority_',
        internalType: 'address',
        type: 'address',
      },
      { name: 'idFactory_', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_addr',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Deployed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_idFactory',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'IdFactorySet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_implementationAuthority',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'ImplementationAuthoritySet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: '_ir', internalType: 'address', type: 'address', indexed: false },
      {
        name: '_irs',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: '_tir',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: '_ctr',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: '_mc', internalType: 'address', type: 'address', indexed: false },
      { name: '_salt', internalType: 'string', type: 'string', indexed: true },
    ],
    name: 'TREXSuiteDeployed',
  },
  {
    type: 'function',
    inputs: [
      { name: '_salt', internalType: 'string', type: 'string' },
      {
        name: '_tokenDetails',
        internalType: 'struct ITREXFactory.TokenDetails',
        type: 'tuple',
        components: [
          { name: 'owner', internalType: 'address', type: 'address' },
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'symbol', internalType: 'string', type: 'string' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'irs', internalType: 'address', type: 'address' },
          { name: 'ONCHAINID', internalType: 'address', type: 'address' },
          { name: 'irAgents', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenAgents', internalType: 'address[]', type: 'address[]' },
          {
            name: 'complianceModules',
            internalType: 'address[]',
            type: 'address[]',
          },
          {
            name: 'complianceSettings',
            internalType: 'bytes[]',
            type: 'bytes[]',
          },
        ],
      },
      {
        name: '_claimDetails',
        internalType: 'struct ITREXFactory.ClaimDetails',
        type: 'tuple',
        components: [
          { name: 'claimTopics', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'issuers', internalType: 'address[]', type: 'address[]' },
          {
            name: 'issuerClaims',
            internalType: 'uint256[][]',
            type: 'uint256[][]',
          },
        ],
      },
    ],
    name: 'deployTREXSuite',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getIdFactory',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getImplementationAuthority',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_salt', internalType: 'string', type: 'string' }],
    name: 'getToken',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_contract', internalType: 'address', type: 'address' },
      { name: '_newOwner', internalType: 'address', type: 'address' },
    ],
    name: 'recoverContractOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'idFactory_', internalType: 'address', type: 'address' }],
    name: 'setIdFactory',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'implementationAuthority_',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'setImplementationAuthority',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'string', type: 'string' }],
    name: 'tokenDeployed',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Token
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0x17e19B53981370a904d0003Ba2D336837a43cbf0)
 */
export const tokenAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: '_isFrozen', internalType: 'bool', type: 'bool', indexed: true },
      {
        name: '_owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AddressFrozen',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_agent',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AgentAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_agent',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AgentRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_compliance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ComplianceAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_identityRegistry',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IdentityRegistryAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'version', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_lostWallet',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_newWallet',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_investorOnchainID',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RecoverySuccess',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TokensFrozen',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: '_amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TokensUnfrozen',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_userAddress',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_newName',
        internalType: 'string',
        type: 'string',
        indexed: true,
      },
      {
        name: '_newSymbol',
        internalType: 'string',
        type: 'string',
        indexed: true,
      },
      {
        name: '_newDecimals',
        internalType: 'uint8',
        type: 'uint8',
        indexed: false,
      },
      {
        name: '_newVersion',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: '_newOnchainID',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'UpdatedTokenInformation',
  },
  {
    type: 'function',
    inputs: [{ name: '_agent', internalType: 'address', type: 'address' }],
    name: 'addAgent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_owner', internalType: 'address', type: 'address' },
      { name: '_spender', internalType: 'address', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_spender', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchBurn',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_fromList', internalType: 'address[]', type: 'address[]' },
      { name: '_toList', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchForcedTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchFreezePartialTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_toList', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchMint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      { name: '_freeze', internalType: 'bool[]', type: 'bool[]' },
    ],
    name: 'batchSetAddressFrozen',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_toList', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddresses', internalType: 'address[]', type: 'address[]' },
      { name: '_amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'batchUnfreezePartialTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'compliance',
    outputs: [
      {
        name: '',
        internalType: 'contract IModularCompliance',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_spender', internalType: 'address', type: 'address' },
      { name: '_subtractedValue', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'decreaseAllowance',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'forcedTransfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'freezePartialTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'getFrozenTokens',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'identityRegistry',
    outputs: [
      { name: '', internalType: 'contract IIdentityRegistry', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_spender', internalType: 'address', type: 'address' },
      { name: '_addedValue', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'increaseAllowance',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_identityRegistry', internalType: 'address', type: 'address' },
      { name: '_compliance', internalType: 'address', type: 'address' },
      { name: '_name', internalType: 'string', type: 'string' },
      { name: '_symbol', internalType: 'string', type: 'string' },
      { name: '_decimals', internalType: 'uint8', type: 'uint8' },
      { name: '_onchainID', internalType: 'address', type: 'address' },
    ],
    name: 'init',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_agent', internalType: 'address', type: 'address' }],
    name: 'isAgent',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
    ],
    name: 'isFrozen',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'onchainID',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_lostWallet', internalType: 'address', type: 'address' },
      { name: '_newWallet', internalType: 'address', type: 'address' },
      { name: '_investorOnchainID', internalType: 'address', type: 'address' },
    ],
    name: 'recoveryAddress',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_agent', internalType: 'address', type: 'address' }],
    name: 'removeAgent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_freeze', internalType: 'bool', type: 'bool' },
    ],
    name: 'setAddressFrozen',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_compliance', internalType: 'address', type: 'address' }],
    name: 'setCompliance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_identityRegistry', internalType: 'address', type: 'address' },
    ],
    name: 'setIdentityRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_name', internalType: 'string', type: 'string' }],
    name: 'setName',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_onchainID', internalType: 'address', type: 'address' }],
    name: 'setOnchainID',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_symbol', internalType: 'string', type: 'string' }],
    name: 'setSymbol',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_from', internalType: 'address', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_userAddress', internalType: 'address', type: 'address' },
      { name: '_amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'unfreezePartialTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'version',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
] as const

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0x17e19B53981370a904d0003Ba2D336837a43cbf0)
 */
export const tokenAddress = {
  296: '0x17e19B53981370a904d0003Ba2D336837a43cbf0',
} as const

/**
 * [__View Contract on Hedera Testnet Hashscan__](https://hashscan.io/testnet/address/0x17e19B53981370a904d0003Ba2D336837a43cbf0)
 */
export const tokenConfig = { address: tokenAddress, abi: tokenAbi } as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TrustedIssuersRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const trustedIssuersRegistryAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'trustedIssuer',
        internalType: 'contract IClaimIssuer',
        type: 'address',
        indexed: true,
      },
      {
        name: 'claimTopics',
        internalType: 'uint256[]',
        type: 'uint256[]',
        indexed: false,
      },
    ],
    name: 'ClaimTopicsUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'version', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'trustedIssuer',
        internalType: 'contract IClaimIssuer',
        type: 'address',
        indexed: true,
      },
      {
        name: 'claimTopics',
        internalType: 'uint256[]',
        type: 'uint256[]',
        indexed: false,
      },
    ],
    name: 'TrustedIssuerAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'trustedIssuer',
        internalType: 'contract IClaimIssuer',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'TrustedIssuerRemoved',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_trustedIssuer',
        internalType: 'contract IClaimIssuer',
        type: 'address',
      },
      { name: '_claimTopics', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'addTrustedIssuer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_trustedIssuer',
        internalType: 'contract IClaimIssuer',
        type: 'address',
      },
    ],
    name: 'getTrustedIssuerClaimTopics',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTrustedIssuers',
    outputs: [
      { name: '', internalType: 'contract IClaimIssuer[]', type: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'claimTopic', internalType: 'uint256', type: 'uint256' }],
    name: 'getTrustedIssuersForClaimTopic',
    outputs: [
      { name: '', internalType: 'contract IClaimIssuer[]', type: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_issuer', internalType: 'address', type: 'address' },
      { name: '_claimTopic', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'hasClaimTopic',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'init',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_issuer', internalType: 'address', type: 'address' }],
    name: 'isTrustedIssuer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_trustedIssuer',
        internalType: 'contract IClaimIssuer',
        type: 'address',
      },
    ],
    name: 'removeTrustedIssuer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_trustedIssuer',
        internalType: 'contract IClaimIssuer',
        type: 'address',
      },
      { name: '_claimTopics', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'updateIssuerClaimTopics',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const
