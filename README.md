# CAPShield Smart Contracts

Gas-optimized BEP-20 tokens for the CAPShield ecosystem on BNB Smart Chain, built with a hybrid Solady + OpenZeppelin architecture.

## Token Details

### CAPY Token (Shield Token)

- **Name**: CAPShield Token
- **Symbol**: CAPY
- **Decimals**: 18
- **Hard Cap**: 100,000,000 (Immutable)
- **Type**: Utility Token with Transfer Fees

**Features:**

- Role-based minting (Team, Treasury, DAO)
- Revenue-based minting formula
- 1% burn + 1% treasury fee on transfers
- Fee exemptions for Treasury and DAO
- Pause/unpause functionality
- Multisig-only admin

### SEED Token (Community Token)

- **Name**: CAPShield Community Token
- **Symbol**: SEED
- **Decimals**: 18
- **Hard Cap**: 10,000,000,000 (Immutable)
- **Type**: Reward Token

**Features:**

- Reward minting role
- No transfer fees
- Pause/unpause functionality
- Multisig-only admin

## Architecture

Built with a hybrid approach for maximum security and gas efficiency on BNB Smart Chain:

- **Solady**: Gas-optimized ERC20/BEP-20 and OwnableRoles (bitmap-based)
- **OpenZeppelin**: Battle-tested Pausable contract
- **Solidity 0.8.30**: Latest features (custom errors, named mappings)

**Gas Savings (BSC):**

- CAPY deployment: 1,886,089 gas (6.3% of block limit)
- SEED deployment: 1,278,504 gas (4.3% of block limit)
- ~30-40% savings vs pure OpenZeppelin implementation
- Lower transaction costs on BSC vs Ethereum

## Security Features

1. **Multisig Enforcement**: Admin MUST be a contract (multisig), not an EOA

   - Enforced at deployment
   - Enforced on ownership transfer
   - Ownership cannot be renounced

2. **Hard Cap Protection**: Immutable supply cap with burn tracking

   - Burning tokens doesn't free mint capacity
   - `totalMinted` tracker prevents bypass

3. **Role-Based Access Control**: Bitmap-optimized roles for gas efficiency

   - CAPY: TEAM_MINTER, TREASURY_MINTER, DAO_MINTER
   - SEED: REWARD_MINTER

4. **Emergency Pause**: Admin can pause all transfers and minting

## Installation

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/lovekush-pitchmatter/capshield-smart-contract.git
   cd capshield-smart-contract
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Compile contracts:

   ```bash
   npm run compile
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Testing

Comprehensive test suite with 77 tests covering all functionality:

```bash
npm test
```

**Test Coverage:**

- ✅ CAPY Token: 46 tests
- ✅ SEED Token: 31 tests
- ✅ All edge cases and security scenarios

**Test Categories:**

1. Deployment & Initial State
2. Access Control
3. Hard Cap Enforcement
4. Role-Based Minting
5. Revenue-Based Minting (CAPY)
6. Transfer Hooks & Fees (CAPY)
7. Fee Exemptions (CAPY)
8. Pause & Emergency Stop
9. Burn Logic
10. Admin Functions
11. Ownership Security
12. Event Logging

## Deployment

### BSC Deployment

**Target Network:** BNB Smart Chain (BSC)

- Mainnet: Chain ID 56
- Testnet: Chain ID 97

### Prepare Multisig

Before deploying, ensure you have a multisig wallet contract deployed on BSC (e.g., Gnosis Safe).

**Important:** The admin address MUST be a contract, not an EOA. The deployment will revert if you attempt to use an EOA as admin.

### Configure Hardhat for BSC

Add BSC network to `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [process.env.PRIVATE_KEY],
    },
    bscMainnet: {
      url: "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY,
  },
};
```

### Deploy Script Example

```javascript
const { ethers } = require("hardhat");

async function main() {
  // MUST be a multisig contract address on BSC
  const MULTISIG_ADDRESS = "0x..."; // Your Gnosis Safe or multisig on BSC
  const TREASURY_ADDRESS = "0x...";
  const DAO_ADDRESS = "0x...";

  console.log("Deploying to BSC...");

  // Deploy CAPY Token
  const CAPY = await ethers.getContractFactory("CAPY");
  const capy = await CAPY.deploy(
    MULTISIG_ADDRESS,
    TREASURY_ADDRESS,
    DAO_ADDRESS
  );
  await capy.waitForDeployment();
  console.log("CAPY (BEP-20) deployed to:", capy.target);

  // Deploy SEED Token
  const SEED = await ethers.getContractFactory("SEED");
  const seed = await SEED.deploy(MULTISIG_ADDRESS);
  await seed.waitForDeployment();
  console.log("SEED (BEP-20) deployed to:", seed.target);

  console.log("\nVerify on BscScan:");
  console.log(
    `npx hardhat verify --network bscMainnet ${capy.target} ${MULTISIG_ADDRESS} ${TREASURY_ADDRESS} ${DAO_ADDRESS}`
  );
  console.log(
    `npx hardhat verify --network bscMainnet ${seed.target} ${MULTISIG_ADDRESS}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Deploy Commands

**BSC Testnet:**

```bash
npx hardhat run scripts/deploy.js --network bscTestnet
```

**BSC Mainnet:**

```bash
npx hardhat run scripts/deploy.js --network bscMainnet
```

## Contract Addresses

| Contract      | Network     | Address |
| ------------- | ----------- | ------- |
| CAPY (BEP-20) | BSC Mainnet | TBD     |
| SEED (BEP-20) | BSC Mainnet | TBD     |
| CAPY (BEP-20) | BSC Testnet | TBD     |
| SEED (BEP-20) | BSC Testnet | TBD     |

## Key Improvements

This implementation includes significant improvements over previous versions:

- ✅ **32% lower deployment gas** (SEED vs previous implementations)
- ✅ **Multisig enforcement** at deployment and ownership transfer
- ✅ **Hard cap with burn tracking** (immutable, no bypass)
- ✅ **Custom errors** for gas efficiency
- ✅ **Named mappings** for better code readability
- ✅ **Comprehensive test coverage** (77 tests)
- ✅ **Full NatSpec documentation**
- ✅ **Hybrid Solady + OpenZeppelin** architecture

See [CHANGELOG.md](CHANGELOG.md) for detailed comparison with previous implementations.

## Contract Structure

```
contracts/
├── CAPY.sol              # Shield Token (main contract)
├── SEED.sol              # Community Token (main contract)
├── interfaces/
│   ├── ICAPY.sol         # CAPY interface
│   └── ISEED.sol         # SEED interface
└── test/
    └── MockMultisig.sol  # Mock multisig for testing
```

## Usage Examples

### CAPY Token - Team Mint

```solidity
// Through multisig
multisig.execute(
  capyAddress,
  abi.encodeWithSignature(
    "teamMint(address,uint256)",
    recipientAddress,
    amount
  )
);
```

### CAPY Token - Revenue Mint

```solidity
// Calculate tokens: revenue / marketValue
// Example: $100,000 revenue, $1 market value = 100,000 tokens
multisig.execute(
  capyAddress,
  abi.encodeWithSignature(
    "revenueMint(uint256,uint256)",
    ethers.parseUnits("100000", 18), // revenue
    ethers.parseUnits("1", 18)       // market value
  )
);
```

### SEED Token - Reward Mint

```solidity
// Through multisig or authorized reward minter
multisig.execute(
  seedAddress,
  abi.encodeWithSignature(
    "rewardMint(address,uint256)",
    userAddress,
    rewardAmount
  )
);
```

### Grant Roles

```solidity
// Grant REWARD_MINTER_ROLE to reward distribution contract
const REWARD_MINTER_ROLE = 1n; // _ROLE_0

multisig.execute(
  seedAddress,
  abi.encodeWithSignature(
    "grantRoles(address,uint256)",
    rewardDistributorAddress,
    REWARD_MINTER_ROLE
  )
);
```

## License

MIT License

## Audit Status

⚠️ **Not yet audited.** It is strongly recommended to conduct a professional security audit before deploying to mainnet.

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting a PR:

```bash
npm test
```

## Support

For questions or issues, please open an issue on the GitHub repository.
