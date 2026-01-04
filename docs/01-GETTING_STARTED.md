# 🚀 Getting Started with CAPShield

Welcome to CAPShield Smart Contracts! This guide will help you understand the ecosystem and get started with development.

## 📚 Documentation Structure

This documentation is organized for different purposes:

### 🎯 Quick Navigation
- **[Getting Started](01-GETTING_STARTED.md)** ← You are here
- **[CAPX Token Guide](02-CAPX_TOKEN_GUIDE.md)** - Detailed CAPX token features and functions
- **[ANGEL Token Guide](03-ANGEL_TOKEN_GUIDE.md)** - Community reward token guide
- **[TokenVesting Guide](04-TOKEN_VESTING_GUIDE.md)** - Token vesting and claim system
- **[Deployment Guide](05-DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions
- **[Architecture & Design](06-ARCHITECTURE_AND_DESIGN.md)** - System design and patterns
- **[Security & Best Practices](07-SECURITY_AND_BEST_PRACTICES.md)** - Security considerations
- **[API Reference](08-API_REFERENCE.md)** - Complete function reference
- **[Troubleshooting](09-TROUBLESHOOTING.md)** - Common issues and solutions

---

## 🎯 What is CAPShield?

CAPShield is a smart contract ecosystem providing:

1. **CAPX Token** - Shield token with deflationary mechanics
2. **ANGEL Token** - Community reward token with transparent distribution
3. **TokenVesting** - Advanced token vesting system with cliff and linear/step unlocking
4. **MockAdmin** - Testing multisig simulator (testnet only)

### Key Statistics

| Aspect | CAPX | ANGEL |
|--------|------|-------|
| Max Supply | 100 Million | 10 Billion |
| Decimals | 18 | 18 |
| Initial Supply | 0 | 0 |
| Fee Mechanism | 2% (1% burn + 1% treasury) | None |
| Transfer Fees | Yes | No |
| Minting Model | Role-based | Role-based with reason |

---

## ⚡ Quick Start (5 minutes)

### 1. Install & Setup

```bash
# Clone repository
git clone <repo-url>
cd capshield-smart-contract

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

### 2. Compile Contracts

```bash
npm run compile
```

### 3. Run Tests

```bash
npm run test
```

### 4. Check Coverage

```bash
npm run coverage
```

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js** v16+ (check: `node --version`)
- **npm** v7+ (check: `npm --version`)
- **Git** (check: `git --version`)
- **Wallet** with testnet funds (for deployment)

### Environment Configuration

Create `.env` file in root directory:

```bash
# Required: Private key for deployment
PRIVATE_KEY=0x...

# Required: Token addresses
TREASURY_ADDRESS=0x...
DAO_ADDRESS=0x...
ADMIN_ADDRESS=0x...  # Must be a contract!

# Optional: RPC endpoints (defaults provided)
POLYGON_RPC_URL=...
BSC_RPC_URL=...

# Optional: API keys for verification
POLYGONSCAN_API_KEY=...
BSCSCAN_API_KEY=...

# Options
VERIFY=true           # Auto-verify after deployment
REPORT_GAS=true       # Show gas usage
```

### Generate New Wallet

```bash
npm run generate:wallet
```

Output:
```
New Wallet Generated!
Address: 0x123abc...
Private Key: 0xdef456...
Mnemonic: word1 word2 word3 ...
```

---

## 📦 Smart Contracts Overview

### 1. CAPX Token (`contracts/CAPX.sol`)

**The Protocol Shield Token**

- Max Supply: 100,000,000 tokens
- Deflationary: 2% transfer fee (1% burn + 1% treasury)
- Role-based minting (team, treasury, DAO)
- Hard cap enforcement
- Pausable emergency stop

**Key Features:**
- Revenue-based minting formula
- Fee exemptions for treasury/DAO
- Multiple minting functions for different purposes
- Burn operations reduce supply but not mint capacity

**Common Use Case:**
```javascript
// Mint team allocation
await capx.teamMint(teamAddress, ethers.parseEther("1000000"));

// Transfer triggers 2% fee automatically
await capx.transfer(recipient, ethers.parseEther("100"));
// Recipient gets 98 CAPX, 1 burned, 1 to treasury
```

### 2. ANGEL Token (`contracts/ANGEL.sol`)

**The Community Reward Token**

- Max Supply: 10,000,000,000 tokens
- No transfer fees (clean transfers)
- Reward minting with mandatory reason string
- Batch minting support
- Comprehensive audit trail

**Key Features:**
- Every mint requires a reason string
- Batch operations for efficient distribution
- No deflationary mechanics
- Transparent distribution tracking

**Common Use Case:**
```javascript
// Single reward
await angel.rewardMint(
  userAddress,
  ethers.parseEther("1000"),
  "Q4 2025 Community Campaign"
);

// Batch rewards
await angel.batchRewardMint(
  [addr1, addr2, addr3],
  [ethers.parseEther("500"), ...],
  "Bug Bounty Program"
);
```

### 3. TokenVesting (`contracts/TokenVesting.sol`)

**Advanced Vesting System**

- Linear and step-based vesting schedules
- Cliff period support
- Revocable vesting (admin can cancel)
- Batch operations
- Claim functionality

**Key Features:**
- Flexible vesting: LINEAR or STEP type
- Cliff enforcement (no tokens before cliff date)
- Automatic calculations
- Integration with any ERC20 token
- Double-claim prevention

**Common Use Case:**
```javascript
// Create vesting schedule
await vesting.createVestingSchedule(
  tokenAddress,
  beneficiary,
  startTime,
  cliffTime,
  duration,
  amount,
  revocable,
  vestingType  // LINEAR or STEP
);

// Claim vested tokens
await vesting.claim(beneficiary, tokenAddress, scheduleId);
```

### 4. MockAdmin (`contracts/MockAdmin.sol`)

**Testing Admin Proxy** (testnet only)

- Simulates multisig wallet
- Proxy calls to admin functions
- Used for testing and development

⚠️ **NEVER use on mainnet!**

---

## 🔗 Network Support

### Mainnets (Production)

| Network | Chain ID | Use Case |
|---------|----------|----------|
| **Polygon** | 137 | Primary deployment |
| **BSC** | 56 | Alternative deployment |

### Testnets (Development)

| Network | Chain ID | Faucet |
|---------|----------|--------|
| **Polygon Amoy** | 80002 | [Faucet](https://faucet.polygon.technology/) |
| **BSC Testnet** | 97 | [Faucet](https://testnet.bnbchain.org/faucet-smart) |

### Local Development

| Network | Chain ID | Usage |
|---------|----------|--------|
| **Hardhat Local** | 31337 | `npm run node:local` |

---

## 🎮 Common Commands Reference

### Development

```bash
npm run compile              # Compile contracts
npm run clean                # Clean build artifacts
npm run test                 # Run all tests
npm run test:capx            # Test CAPX only
npm run test:angel           # Test ANGEL only
npm run test:vesting         # Test TokenVesting only
npm run coverage             # Generate coverage report
npm run gas:report           # Show gas usage
```

### Local Node

```bash
npm run node:local           # Start local Hardhat node (Terminal 1)
npm run deploy:local         # Deploy to local (Terminal 2)
```

### Testnet (Polygon Amoy)

```bash
npm run deploy:mockadmin:polygon:testnet
npm run deploy:tokens:polygon:testnet
npm run deploy:vesting:polygon:testnet
npm run configure:exemption:polygon:testnet
npm run verify:polygon:testnet
```

### Mainnet (Production)

```bash
npm run deploy:tokens:polygon
npm run deploy:vesting:polygon
npm run configure:exemption:polygon
```

---

## 📖 Next Steps

### For Developers

1. **Understand Architecture** → Read [Architecture & Design](06-ARCHITECTURE_AND_DESIGN.md)
2. **Learn Contract Functions** → Read [API Reference](08-API_REFERENCE.md)
3. **Write Tests** → Add tests in `test/` directory
4. **Deploy Locally** → Follow [Deployment Guide](05-DEPLOYMENT_GUIDE.md)

### For Auditors

1. **Review Architecture** → [Architecture & Design](06-ARCHITECTURE_AND_DESIGN.md)
2. **Security Assessment** → [Security & Best Practices](07-SECURITY_AND_BEST_PRACTICES.md)
3. **Function Reference** → [API Reference](08-API_REFERENCE.md)
4. **Test Coverage** → Run `npm run coverage`

### For Operations

1. **Deployment Steps** → [Deployment Guide](05-DEPLOYMENT_GUIDE.md)
2. **Mainnet Setup** → [Security & Best Practices](07-SECURITY_AND_BEST_PRACTICES.md)
3. **Troubleshooting** → [Troubleshooting](09-TROUBLESHOOTING.md)

---

## 💡 Key Concepts

### Hard Cap Enforcement

```solidity
// Irreversible hard cap tracking
totalMinted -> tracks all minted tokens (even if burned)
MAX_SUPPLY -> hard limit
totalSupply -> current supply (can go down from burning)
```

**Why?** Prevents bypass of hard cap if tokens are burned.

### Role-Based Access Control

```solidity
// Example roles
DEFAULT_ADMIN_ROLE     -> Full control, grant/revoke roles
TEAM_MINTER_ROLE       -> Can execute teamMint()
TREASURY_MINTER_ROLE   -> Can execute treasuryMint(), revenueMint()
DAO_MINTER_ROLE        -> Can execute daoMint()
REWARD_MINTER_ROLE     -> Can execute rewardMint(), batchRewardMint()
PAUSER_ROLE            -> Can pause/unpause
```

**Why?** Granular control, no single point of failure.

### Transfer Fees (CAPX only)

```javascript
Transfer 100 CAPX
├─ 1% Burn (1 CAPX) → Permanently destroyed, totalSupply ↓
├─ 1% Treasury (1 CAPX) → Goes to treasury wallet
└─ 98% Recipient (98 CAPX) → Destination gets this

// Fee exempt addresses (no fee applied):
├─ Treasury address (automatic)
├─ DAO address (automatic)
└─ TokenVesting contract (after configuration)
```

---

## 🆘 Immediate Help

### Can't deploy?

1. Check `.env` file exists and has `PRIVATE_KEY`
2. Verify wallet has testnet funds
3. Run `npm run check:balance`
4. See [Troubleshooting](09-TROUBLESHOOTING.md)

### Tests failing?

1. Run `npm run compile` first
2. Check Node.js version: `node --version` (need v16+)
3. Clear cache: `npm run clean`
4. Reinstall: `rm -rf node_modules && npm install`

### Questions?

Check [Troubleshooting](09-TROUBLESHOOTING.md) or create an issue with:
- Error message
- Command you ran
- Environment info
- Steps to reproduce

---

## 📊 File Structure

```
capshield-smart-contract/
├── contracts/              # Solidity smart contracts
│   ├── CAPX.sol
│   ├── ANGEL.sol
│   ├── TokenVesting.sol
│   └── MockAdmin.sol
├── scripts/                # Deployment and utility scripts
│   ├── deploy.js
│   ├── deploy-vesting.js
│   ├── configure-exemption.js
│   └── ...
├── test/                   # Test files
│   ├── CAPX.test.js
│   ├── ANGEL.test.js
│   └── TokenVesting.test.js
├── docs/                   # Documentation (THIS FOLDER)
│   ├── 01-GETTING_STARTED.md
│   ├── 02-CAPX_TOKEN_GUIDE.md
│   ├── 03-ANGEL_TOKEN_GUIDE.md
│   ├── 04-TOKEN_VESTING_GUIDE.md
│   ├── 05-DEPLOYMENT_GUIDE.md
│   ├── 06-ARCHITECTURE_AND_DESIGN.md
│   ├── 07-SECURITY_AND_BEST_PRACTICES.md
│   ├── 08-API_REFERENCE.md
│   └── 09-TROUBLESHOOTING.md
├── artifacts/              # Compiled contracts
├── coverage/               # Test coverage reports
├── README.md               # Main readme (technical overview)
├── hardhat.config.js       # Hardhat configuration
├── package.json            # Dependencies
├── .env.example            # Environment template
└── .gitignore              # Git ignore rules
```

---

## 🎓 Learning Path

**Beginner:** Getting Started → CAPX/ANGEL Guides → Deployment  
**Developer:** API Reference → Architecture → Write Tests  
**Auditor:** Architecture → API Reference → Security → Tests  
**Operations:** Deployment → Security Best Practices → Troubleshooting  

---

## ✅ Checklist for First-Time Users

- [ ] Clone repository
- [ ] Install dependencies: `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Generate wallet: `npm run generate:wallet`
- [ ] Get testnet funds
- [ ] Run tests: `npm run test`
- [ ] Read [CAPX Guide](02-CAPX_TOKEN_GUIDE.md)
- [ ] Read [ANGEL Guide](03-ANGEL_TOKEN_GUIDE.md)
- [ ] Read [Deployment Guide](05-DEPLOYMENT_GUIDE.md)

---

**Last Updated:** January 4, 2026  
**Version:** 1.0.0  
**Audience:** All (developers, auditors, operations)
