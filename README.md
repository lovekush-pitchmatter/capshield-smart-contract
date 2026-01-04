# 🛡️ CAPShield Smart Contract Suite

## Production-Grade Multi-Token Ecosystem with Vesting

Comprehensive smart contract suite for the CAPShield token ecosystem, featuring Shield (CAPX) and Community (ANGEL) tokens with advanced vesting capabilities.

**Network Support:** Polygon, BSC, Ethereum  
**Solidity Version:** ^0.8.19  
**Framework:** Hardhat + ethers.js v6  
**Security:** OpenZeppelin Audited Contracts + Custom Security Patterns

---

## 📋 Quick Navigation

### 🚀 Getting Started
- **New to the project?** Start with [**Getting Started Guide**](docs/01-GETTING_STARTED.md)
- **Quick setup in 5 minutes:** See [Installation & Quick Start](docs/01-GETTING_STARTED.md#quick-start)
- **Need to deploy?** Check [Step-by-Step Deployment](docs/05-DEPLOYMENT_GUIDE.md)

### 📚 Technical Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [01-GETTING_STARTED.md](docs/01-GETTING_STARTED.md) | Setup, environment, quick commands | Everyone |
| [02-CAPX_TOKEN_GUIDE.md](docs/02-CAPX_TOKEN_GUIDE.md) | Shield token specifications & functions | Developers, Auditors |
| [03-ANGEL_TOKEN_GUIDE.md](docs/03-ANGEL_TOKEN_GUIDE.md) | Community token specifications & functions | Developers, Auditors |
| [04-TOKEN_VESTING_GUIDE.md](docs/04-TOKEN_VESTING_GUIDE.md) | Vesting system design & functions | Developers, Treasury |
| [05-DEPLOYMENT_GUIDE.md](docs/05-DEPLOYMENT_GUIDE.md) | Complete deployment workflow | DevOps, Smart Contract Team |
| [06-ARCHITECTURE_AND_DESIGN.md](docs/06-ARCHITECTURE_AND_DESIGN.md) | System design & patterns | Architects, Advanced Devs |
| [07-SECURITY_AND_BEST_PRACTICES.md](docs/07-SECURITY_AND_BEST_PRACTICES.md) | Security analysis & procedures | Security, Operations |
| [08-API_REFERENCE.md](docs/08-API_REFERENCE.md) | Complete function reference | Developers, Integrators |
| [09-TROUBLESHOOTING.md](docs/09-TROUBLESHOOTING.md) | Common issues & solutions | Everyone |

---

## 📋 Table of Contents

- [Quick Navigation](#quick-navigation)
- [System Architecture](#system-architecture)
- [Smart Contracts](#smart-contracts)
- [Deployment Workflow](#deployment-workflow)
- [Access Control](#access-control--roles)
- [Testing & Coverage](#testing--coverage)
- [Project Setup](#project-setup)
- [Security](#security-considerations)
- [Common Tasks](#common-tasks)
- [Documentation Index](#documentation-index)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Networks](#networks)
- [Support](#support--resources)

---

## 🎯 Overview

This repository contains **three** smart contracts that power the CAPShield token ecosystem:

### Core Tokens

1. **CAPX (CAPY)** - Protocol Shield Token
   - **Max Supply:** 100,000,000 tokens
   - **Initial Supply:** 0 (mint-on-demand)
   - **Features:** Deflationary transfers, revenue-based minting, role-based access
   - **Use Case:** Core protocol value and utility token

2. **ANGEL (SEED)** - Community Reward Token
   - **Max Supply:** 10,000,000,000 tokens
   - **Initial Supply:** 0 (mint-on-demand)
   - **Features:** Transparent reward distribution with mandatory reasons
   - **Use Case:** Community incentives, grants, bounties, ecosystem rewards

### Auxiliary Contracts

3. **MockAdmin** - Testing Multisig Simulator
   - **Purpose:** Satisfies contract deployment requirements during testing
   - **Usage:** Testnet only (⚠️ **NEVER use on mainnet**)
   - **Features:** Simulates multisig admin operations for all token functions

### Key Characteristics

✅ **OpenZeppelin v4.9.6** - Battle-tested, audited base contracts  
✅ **Solidity 0.8.19** - Latest stable compiler with built-in overflow protection  
✅ **AccessControl** - Granular role-based permissions  
✅ **Pausable** - Emergency stop mechanism  
✅ **Hard Cap Enforcement** - Irreversible supply limits via `totalMinted` tracking  
✅ **Multisig Ready** - Designed for Gnosis Safe or equivalent governance  
✅ **Comprehensive Tests** - 2400+ lines of test coverage  
✅ **Production Scripts** - Automated deployment, verification, and utilities  

---

## 🏗️ Architecture

### Token Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CAPShield Ecosystem                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   CAPX       │         │    ANGEL     │                  │
│  │   (CAPY)     │         │    (SEED)    │                  │
│  │  Shield Token│         │ Reward Token │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                           │
│         │    ┌──────────────────┐│                          │
│         └────┤  Multisig Admin  ├┘                          │
│              │  (Gnosis Safe)   │                           │
│              └────────┬─────────┘                           │
│                       │                                      │
│              ┌────────▼─────────┐                           │
│              │  Role Management │                           │
│              │  - TEAM_MINTER   │                           │
│              │  - TREASURY_MINT │                           │
│              │  - DAO_MINTER    │                           │
│              │  - REWARD_MINTER │                           │
│              │  - PAUSER        │                           │
│              └──────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Zero Initial Supply**: Both tokens start with 0 supply, preventing pre-mine concerns
2. **Irreversible Caps**: `totalMinted` counter ensures caps cannot be bypassed via burn
3. **Role Segregation**: Different minting functions for different purposes
4. **Event Transparency**: All critical operations emit detailed events
5. **Fail-Safe Design**: Multiple validation layers and safety checks

---

## 🪙 CAPX Token – Shield Token

**Contract:** `contracts/CAPX.sol`  
**Symbol:** CAPY  
**Decimals:** 18  
**Max Supply:** 100,000,000 CAPY (irreversible)

### Core Features

#### 1. Supply Management

```solidity
MAX_SUPPLY = 100,000,000 * 10^18  // Immutable hard cap
totalMinted                        // Irreversible counter
totalSupply                        // Current circulating supply
```

- **Initial Supply:** 0
- **Minting:** Role-based, capped by `totalMinted`
- **Burning:** Reduces `totalSupply` but NOT `totalMinted`
- **Cap Enforcement:** `totalMinted + amount <= MAX_SUPPLY`

#### 2. Deflationary Transfer Mechanism

Every transfer between non-exempt addresses applies:

```
Transfer 100 CAPY
├─ 1% burn (1 CAPY) → Permanently destroyed
├─ 1% treasury fee (1 CAPY) → Treasury wallet
└─ 98% recipient (98 CAPY) → Destination address
```

**Fee Exemptions:**

- Treasury address (automatic)
- DAO address (automatic)
- Additional exemptions (admin-controlled via `setExemption`)

#### 3. Minting Functions

##### Standard Minting (Role-Based)

```solidity
// Team allocation minting
function teamMint(address to, uint256 amount) 
    external onlyRole(TEAM_MINTER_ROLE)

// Treasury operations minting
function treasuryMint(address to, uint256 amount) 
    external onlyRole(TREASURY_MINTER_ROLE)

// DAO governance minting
function daoMint(address to, uint256 amount) 
    external onlyRole(DAO_MINTER_ROLE)
```

##### Revenue-Based Minting (Advanced)

```solidity
function revenueMint(
    address to,
    uint256 revenue,
    uint256 marketValue
) external onlyRole(TREASURY_MINTER_ROLE)
```

**Formula:**
```
mintAmount = (revenue * 10^18) / marketValue
```

**Use Case:** Mint tokens proportional to protocol revenue  
**Example:** If protocol earns 1000 USD and CAPY = $0.50, mint 2000 CAPY

#### 4. Access Control Roles

| Role | Keccak256 Hash | Permissions |
|------|---------------|-------------|
| `DEFAULT_ADMIN_ROLE` | `0x00...00` | Grant/revoke all roles, update treasury/DAO addresses |
| `TEAM_MINTER_ROLE` | `keccak256("TEAM_MINTER_ROLE")` | Execute `teamMint()` |
| `TREASURY_MINTER_ROLE` | `keccak256("TREASURY_MINTER_ROLE")` | Execute `treasuryMint()`, `revenueMint()` |
| `DAO_MINTER_ROLE` | `keccak256("DAO_MINTER_ROLE")` | Execute `daoMint()` |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | Execute `pause()`, `unpause()` |

#### 5. Administrative Functions

```solidity
// Update treasury address (requires DEFAULT_ADMIN_ROLE)
function updateTreasuryAddress(address newTreasury) external

// Update DAO address (requires DEFAULT_ADMIN_ROLE)
function updateDAOAddress(address newDAO) external

// Set fee exemption (requires DEFAULT_ADMIN_ROLE)
function setExemption(address account, bool exempt) external

// Emergency pause (requires PAUSER_ROLE)
function pause() external
function unpause() external
```

#### 6. Safety Mechanisms

- ✅ Constructor validates all addresses (non-zero, admin must be contract)
- ✅ All minting operations check hard cap before execution
- ✅ Transfer hooks automatically apply fees unless exempt
- ✅ Pause blocks all transfers and minting
- ✅ Burning permanently reduces supply but not mint capacity

#### 7. Events

```solidity
event RevenueMint(address indexed to, uint256 amount, uint256 revenue, uint256 marketValue)
event TeamMint(address indexed minter, address indexed to, uint256 amount)
event TreasuryMint(address indexed minter, address indexed to, uint256 amount)
event DAOMint(address indexed minter, address indexed to, uint256 amount)
event TreasuryFee(address indexed from, address indexed to, uint256 amount)
event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress)
event DAOAddressUpdated(address indexed oldAddress, address indexed newAddress)
event ExemptionUpdated(address indexed account, bool isExempt)
event Burn(address indexed account, uint256 amount)
event BurnFrom(address indexed operator, address indexed account, uint256 amount)
```

---

## 🌟 ANGEL Token – Community Reward Token

**Contract:** `contracts/ANGEL.sol`  
**Symbol:** SEED  
**Decimals:** 18  
**Max Supply:** 10,000,000,000 SEED (irreversible)

### Core Features

#### 1. Supply Management

```solidity
MAX_SUPPLY = 10,000,000,000 * 10^18  // Immutable hard cap
totalMinted                           // Irreversible counter
totalSupply                           // Current circulating supply
```

- **Initial Supply:** 0
- **Minting:** Requires mandatory reason string for auditability
- **Burning:** Standard ERC20Burnable (reduces `totalSupply` only)
- **No Transfer Fees:** Clean transfers, no deflationary mechanics

#### 2. Reward Minting System

##### Single Reward Mint

```solidity
function rewardMint(
    address to,
    uint256 amount,
    string calldata reason
) external onlyRole(REWARD_MINTER_ROLE)
```

**Requirements:**
- `to` address cannot be zero
- `amount` must be > 0
- `reason` string cannot be empty
- Must not exceed `MAX_SUPPLY`

**Example:**
```javascript
await angel.rewardMint(
    userAddress,
    ethers.parseEther("1000"),
    "Q4 2025 Community Engagement Campaign"
);
```

##### Batch Reward Mint

```solidity
function batchRewardMint(
    address[] calldata recipients,
    uint256[] calldata amounts,
    string calldata reason
) external onlyRole(REWARD_MINTER_ROLE)
```

**Use Case:** Efficient distribution to multiple recipients in a single transaction

**Example:**
```javascript
await angel.batchRewardMint(
    [addr1, addr2, addr3],
    [ethers.parseEther("500"), ethers.parseEther("300"), ethers.parseEther("200")],
    "Bug Bounty Program - December 2025"
);
```

#### 3. Access Control Roles

| Role | Permissions |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Grant/revoke roles, full admin control |
| `REWARD_MINTER_ROLE` | Execute `rewardMint()` and `batchRewardMint()` |
| `PAUSER_ROLE` | Execute `pause()` and `unpause()` |

#### 4. Utility Functions

```solidity
// Get remaining mintable supply
function remainingMintableSupply() external view returns (uint256)

// Check if specific amount can be minted
function canMint(uint256 amount) external view returns (bool)
```

#### 5. Events

```solidity
event RewardMint(address indexed to, uint256 amount, string reason)
event Burn(address indexed account, uint256 amount)
event BurnFrom(address indexed operator, address indexed account, uint256 amount)
```

#### 6. Auditability

Every mint operation includes:
- Recipient address
- Amount minted
- Timestamp (block)
- Reason string (e.g., "Community Airdrop Q1 2026")

This creates a transparent, immutable audit trail for compliance and governance.

---

## 🧪 MockAdmin Contract

**Contract:** `contracts/MockAdmin.sol`  
**Purpose:** Testing & development only  
**⚠️ WARNING:** Never deploy to mainnet - use Gnosis Safe instead

### What It Does

MockAdmin simulates a multisig wallet by providing proxy functions to call admin-restricted operations on CAPX and ANGEL tokens. It satisfies the `code.length > 0` requirement enforced by both token constructors.

### Key Functions

```solidity
// Role management
function grantRole(address target, bytes32 role, address account) external
function revokeRole(address target, bytes32 role, address account) external

// CAPX-specific
function updateTreasuryAddress(address target, address newTreasury) external
function updateDAOAddress(address target, address newDAO) external
function setExemption(address target, address account, bool exempt) external
function teamMint(address target, address to, uint256 amount) external
function treasuryMint(address target, address to, uint256 amount) external
function daoMint(address target, address to, uint256 amount) external
function revenueMint(address target, address to, uint256 revenue, uint256 marketValue) external

// ANGEL-specific
function rewardMint(address target, address to, uint256 amount, string calldata reason) external
function batchRewardMint(address target, address[] calldata recipients, uint256[] calldata amounts, string calldata reason) external

// Emergency controls
function pause(address target) external
function unpause(address target) external
```

### Usage in Tests

```javascript
// Deploy MockAdmin
const MockAdmin = await ethers.getContractFactory("MockAdmin");
const mockAdmin = await MockAdmin.deploy();

// Deploy tokens with MockAdmin as admin
const capx = await CAPX.deploy(treasury.address, dao.address, mockAdmin.address);

// Grant roles via MockAdmin
await mockAdmin.grantRole(capx.address, TEAM_MINTER_ROLE, minter.address);

// Execute admin operations
await mockAdmin.teamMint(capx.address, recipient.address, amount);
```

---

## 🚀 Deployment Guide

### Prerequisites

1. **Node.js** v16+ and npm
2. **Private Key** with sufficient balance
3. **API Keys** (PolygonScan, BSCScan) for verification
4. **Multisig Wallet** (Gnosis Safe for mainnet)

### Quick Start

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
# Wallet
PRIVATE_KEY=your_private_key_here

# Addresses (ADMIN_ADDRESS must be a contract!)
TREASURY_ADDRESS=0x...
DAO_ADDRESS=0x...
ADMIN_ADDRESS=0x...  # Must be deployed contract (Gnosis Safe or MockAdmin)

# RPC Endpoints (optional - defaults provided)
POLYGON_RPC_URL=https://polygon-bor-rpc.publicnode.com
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# API Keys for verification
POLYGONSCAN_API_KEY=your_api_key
BSCSCAN_API_KEY=your_api_key

# Options
VERIFY=true
REPORT_GAS=true
```

#### 3. Generate Wallet (Optional)

```bash
npm run generate:wallet
```

This generates a new wallet and displays the private key, address, and mnemonic.

#### 4. Check Balance

```bash
npm run check:balance
```

Checks your wallet balance across all supported networks.

### Testnet Deployment (Polygon Amoy)

#### Step 1: Deploy MockAdmin

```bash
npm run deploy:mockadmin:polygon:testnet
```

Output:
```
✅ MockAdmin deployed to: 0xABC123...
```

#### Step 2: Update .env

```bash
ADMIN_ADDRESS=0xABC123...  # Use MockAdmin address from Step 1
```

#### Step 3: Deploy Tokens

```bash
npm run deploy:polygon:testnet
```

Output:
```
✅ CAPX deployed to: 0xDEF456...
✅ ANGEL deployed to: 0xGHI789...
💾 Deployment info saved to deployment-info.json
```

#### Step 4: Verify Contracts (Automatic if VERIFY=true)

```bash
npm run verify:polygon:testnet
```

### Mainnet Deployment

⚠️ **CRITICAL:** Use a real multisig (Gnosis Safe), NOT MockAdmin!

#### Step 1: Deploy Gnosis Safe

Visit https://app.safe.global/ and create a Safe with 2-3+ signers.

#### Step 2: Update .env

```bash
ADMIN_ADDRESS=0x...  # Your Gnosis Safe address
TREASURY_ADDRESS=0x...
DAO_ADDRESS=0x...
VERIFY=true
```

#### Step 3: Deploy to Polygon Mainnet

```bash
npm run deploy:polygon
```

#### Step 4: Deploy to BSC Mainnet

```bash
npm run deploy:bsc
```

### Deployment Output

The deployment script creates `deployment-info.json`:

```json
{
  "network": "polygonAmoy",
  "chainId": 80002,
  "deployer": "0x...",
  "contracts": {
    "CAPX": {
      "address": "0x...",
      "name": "CAPShield Token",
      "symbol": "CAPY",
      "decimals": 18,
      "totalSupply": "0",
      "maxSupply": "100000000000000000000000000",
      "transactionHash": "0x...",
      "constructorArgs": ["0x...", "0x...", "0x..."]
    },
    "ANGEL": {
      "address": "0x...",
      "name": "AngleSeed Token",
      "symbol": "SEED",
      "decimals": 18,
      "totalSupply": "0",
      "maxSupply": "10000000000000000000000000000",
      "transactionHash": "0x...",
      "constructorArgs": ["0x..."]
    }
  },
  "configuration": {
    "treasuryAddress": "0x...",
    "daoAddress": "0x...",
    "adminAddress": "0x..."
  },
  "timestamp": "2025-12-29T..."
}
```

---

## 🛠️ Development

### Project Structure

```
capshield-smart-contract/
├── contracts/
│   ├── CAPX.sol              # Shield token implementation
│   ├── ANGEL.sol             # Community reward token
│   └── MockAdmin.sol         # Testing multisig simulator
├── scripts/
│   ├── deploy.js             # Main deployment script
│   ├── deploy-mockadmin.js   # MockAdmin deployment
│   ├── verify.js             # Contract verification
│   ├── check-balance.js      # Balance checker utility
│   └── generate-wallet.js    # Wallet generator
├── test/
│   ├── CAPX.test.js          # CAPX comprehensive tests (1354 lines)
│   └── ANGEL.test.js         # ANGEL comprehensive tests (1050 lines)
├── artifacts/                # Compiled contracts
├── cache/                    # Hardhat cache
├── coverage/                 # Coverage reports
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Dependencies and scripts
├── .env.example              # Environment template
├── deployment-info.json      # Latest deployment details
├── DEPLOYMENT_GUIDE.md       # Detailed deployment documentation
└── README.md                 # This file
```

### Available Scripts

#### Compilation

```bash
npm run compile              # Compile all contracts
npm run clean                # Clean artifacts and cache
```

#### Testing

```bash
npm run test                 # Run all tests
npm run test:capx            # Test CAPX only
npm run test:angel           # Test ANGEL only
npm run test:gas             # Run tests with gas reporting
npm run coverage             # Generate coverage report
```

#### Deployment

```bash
# Local
npm run node:local           # Start local Hardhat node
npm run deploy:local         # Deploy to local network

# Polygon
npm run deploy:polygon:testnet  # Deploy to Polygon Amoy
npm run deploy:polygon          # Deploy to Polygon mainnet

# BSC
npm run deploy:bsc:testnet   # Deploy to BSC testnet
npm run deploy:bsc           # Deploy to BSC mainnet
```

#### MockAdmin Deployment

```bash
npm run deploy:mockadmin:local
npm run deploy:mockadmin:polygon:testnet
npm run deploy:mockadmin:polygon
npm run deploy:mockadmin:bsc:testnet
npm run deploy:mockadmin:bsc
```

#### Verification

```bash
npm run verify:polygon:testnet
npm run verify:polygon
npm run verify:bsc:testnet
npm run verify:bsc
```

#### Utilities

```bash
npm run check:balance        # Check wallet balance on all networks
npm run generate:wallet      # Generate new deployment wallet
npm run gas:report           # Run tests with detailed gas report
```

---

## 🧪 Testing

### Test Coverage

The project includes comprehensive test suites:

**CAPX Tests** (`test/CAPX.test.js`) - 1354 lines
- ✅ Deployment & initial state (15 tests)
- ✅ Access control & role management (12 tests)
- ✅ Minting operations (teamMint, treasuryMint, daoMint, revenueMint) (25 tests)
- ✅ Transfer fee mechanics (burn + treasury) (18 tests)
- ✅ Fee exemptions (10 tests)
- ✅ Hard cap enforcement (8 tests)
- ✅ Pause functionality (6 tests)
- ✅ Administrative functions (12 tests)
- ✅ Burning operations (8 tests)
- ✅ Edge cases & security (15 tests)

**ANGEL Tests** (`test/ANGEL.test.js`) - 1050 lines
- ✅ Deployment & initial state (8 tests)
- ✅ Access control (10 tests)
- ✅ Reward minting (single & batch) (20 tests)
- ✅ Hard cap enforcement (6 tests)
- ✅ Pause functionality (5 tests)
- ✅ Burning operations (6 tests)
- ✅ Utility functions (4 tests)
- ✅ Edge cases & security (12 tests)

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test:capx
npm run test:angel

# Run with gas reporting
REPORT_GAS=true npm run test

# Generate coverage report
npm run coverage
```

### Test Output Example

```
CAPX Token - Shield Token
  ✓ Should have correct name, symbol, and decimals
  ✓ Should start with zero totalSupply
  ✓ Should enforce MAX_SUPPLY cap
  ✓ Should apply 1% burn + 1% treasury fee on transfers
  ✓ Should exempt treasury and DAO from fees
  ...
  
  109 passing (3.2s)
```

### Coverage Report

```bash
npm run coverage
```

Generates:
- Terminal summary
- HTML report in `coverage/index.html`
- LCOV report in `coverage/lcov.info`

---

## 🔒 Security

### Audit Status

⚠️ **NOT YET AUDITED** - These contracts have not undergone professional security auditing.

**Recommendations before mainnet:**
1. Conduct professional smart contract audit (CertiK, OpenZeppelin, Trail of Bits)
2. Bug bounty program on ImmuneFi or Code4rena
3. Formal verification of critical functions
4. Multi-day testnet deployment with real usage

### Security Features

✅ **OpenZeppelin Base Contracts** - Battle-tested, widely audited  
✅ **Solidity 0.8.19** - Built-in overflow/underflow protection  
✅ **AccessControl** - Granular permissions, no single point of failure  
✅ **Pausable** - Emergency stop for critical issues  
✅ **Constructor Validation** - Admin must be contract (prevents EOA admin)  
✅ **Hard Cap Enforcement** - Irreversible via `totalMinted` counter  
✅ **Comprehensive Events** - Full transparency and off-chain monitoring  
✅ **No Proxy Pattern** - Immutable logic (cannot be upgraded maliciously)  
✅ **No Selfdestruct** - Contracts cannot be destroyed  
✅ **Reentrancy Safe** - No external calls in sensitive functions  

### Known Limitations

1. **Admin Centralization**: DEFAULT_ADMIN_ROLE has significant power
   - **Mitigation**: Use multisig (Gnosis Safe) with timelocks
   
2. **Transfer Fees**: Users may not expect 2% fee on CAPX transfers
   - **Mitigation**: Clear documentation and UI warnings
   
3. **Irreversible Cap**: Burned tokens cannot be reminted
   - **Mitigation**: Intentional design for supply integrity

### Best Practices

#### For Mainnet Deployment

1. **Use Gnosis Safe** (3-5 signers, 2-3 threshold)
2. **Timelock Critical Operations** (48-hour delay for admin actions)
3. **Monitor Events** (Set up alerts for mint/burn/pause operations)
4. **Regular Security Reviews** (Quarterly code audits)
5. **Insurance** (Consider Nexus Mutual or InsurAce coverage)

#### For Multisig Signers

1. **Hardware Wallets** (Ledger, Trezor)
2. **Geographic Distribution** (Different locations/timezones)
3. **Key Backup** (Secure, offline storage)
4. **Rotation Policy** (Replace signers periodically)

---

## 🌐 Network Support

### Supported Networks

| Network | Chain ID | RPC URL | Explorer |
| --- | --- | --- | --- |
| **Polygon Mainnet** | 137 | https://polygon-bor-rpc.publicnode.com | https://polygonscan.com |
| **Polygon Amoy Testnet** | 80002 | https://rpc-amoy.polygon.technology | https://amoy.polygonscan.com |
| **BSC Mainnet** | 56 | https://bsc-dataseed.binance.org | https://bscscan.com |
| **BSC Testnet** | 97 | https://data-seed-prebsc-1-s1.binance.org:8545 | https://testnet.bscscan.com |
| **Hardhat Local** | 31337 | http://localhost:8545 | - |

### Gas Considerations

**Polygon (MATIC):**
- Average deployment: ~0.01-0.05 MATIC
- Transaction costs: <$0.01 typically
- Confirmation time: ~2 seconds

**BSC (BNB):**
- Average deployment: ~0.005-0.02 BNB
- Transaction costs: ~$0.10-0.50
- Confirmation time: ~3 seconds

### Testnet Faucets

**Polygon Amoy:**
- https://faucet.polygon.technology/
- https://www.alchemy.com/faucets/polygon-amoy

**BSC Testnet:**
- https://testnet.bnbchain.org/faucet-smart

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Setup
npm install
cp .env.example .env
npm run generate:wallet

# Development
npm run compile
npm run test
npm run coverage

# Testnet Deployment
npm run deploy:mockadmin:polygon:testnet
npm run deploy:polygon:testnet

# Mainnet Deployment  
npm run deploy:polygon
npm run deploy:bsc
```
