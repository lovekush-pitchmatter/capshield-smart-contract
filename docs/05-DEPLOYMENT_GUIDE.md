# 🚀 Step-by-Step Deployment Guide

Complete guide for deploying CAPShield contracts from zero to production.

---

## 📖 Table of Contents

- [Quick Reference](#quick-reference)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Testnet Deployment](#testnet-deployment)
- [Mainnet Deployment](#mainnet-deployment)
- [Post-Deployment Setup](#post-deployment-setup)
- [Verification](#verification)
- [Monitoring](#monitoring)

---

## ⚡ Quick Reference

### Deployment Scripts Overview

| Script | Command | Purpose | Networks |
|--------|---------|---------|----------|
| **deploy.js** | `deploy:tokens` | Deploy CAPX & ANGEL | All |
| **deploy-vesting.js** | `deploy:vesting` | Deploy TokenVesting | All |
| **deploy-mockadmin.js** | `deploy:mockadmin` | Deploy MockAdmin (test only) | All |
| **configure-exemption.js** | `configure:exemption` | Add TokenVesting to CAPX fees | All |
| **verify.js** | `verify` | Verify contracts on explorer | All |

### Command Matrix

```
Test/Dev:
npm run deploy:mockadmin:polygon:testnet        # Step 1: Admin
npm run deploy:tokens:polygon:testnet           # Step 2: Tokens
npm run deploy:vesting:polygon:testnet          # Step 3: Vesting
npm run configure:exemption:polygon:testnet     # Step 4: Fee exempt

Production:
npm run deploy:tokens:polygon                   # Step 1: Tokens (needs Gnosis Safe)
npm run deploy:vesting:polygon                  # Step 2: Vesting
npm run configure:exemption:polygon             # Step 3: Fee exempt
```

---

## 📋 Prerequisites

### Required

- ✅ Node.js v16+ (check: `node --version`)
- ✅ npm v7+ (check: `npm --version`)
- ✅ Private key with testnet/mainnet funds
- ✅ `.env` file with configuration
- ✅ Git repository initialized

### For Mainnet

- ✅ Gnosis Safe multisig wallet (2-3+ signers)
- ✅ API keys for contract verification
- ✅ Sufficient funds for deployment + gas
- ✅ Professional security audit (recommended)

### Optional

- 📊 API keys for block explorers (faster verification)
- 💾 Backup of private keys (offline, secure storage)
- 📱 Hardware wallet (Ledger, Trezor for production)

---

## 🔧 Environment Setup

### Step 1: Install Dependencies

```bash
# Navigate to project
cd capshield-smart-contract

# Install all dependencies
npm install

# Verify installation
npm list | head -20
```

**Expected Output:**
```
capshield-smart-contracts@1.0.0
├─ @nomicfoundation/hardhat-toolbox@6.1.0
├─ @openzeppelin/contracts@4.9.6
├─ ethers@6.16.0
├─ hardhat@2.19.0
└─ ... (other packages)
```

### Step 2: Create Environment File

```bash
# Copy template
cp .env.example .env

# Edit configuration
nano .env  # or your favorite editor
```

**Configure `.env`:**

```bash
# ============================================================================
# REQUIRED
# ============================================================================

# Private key of deployment account (with testnet/mainnet funds)
PRIVATE_KEY=0x...
# Get from: import wallet in MetaMask, export private key

# Treasury wallet address (receives transfer fees)
TREASURY_ADDRESS=0x...
# Usually: Multi-sig or team wallet

# DAO wallet address (exempt from fees)
DAO_ADDRESS=0x...
# Usually: DAO governance contract or wallet

# Admin address (must be a contract!)
ADMIN_ADDRESS=0x...
# Testnet: Use MockAdmin address (deployed first)
# Mainnet: Use Gnosis Safe address

# ============================================================================
# OPTIONAL (defaults provided)
# ============================================================================

# RPC endpoints
POLYGON_RPC_URL=https://polygon-bor-rpc.publicnode.com
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# API keys for verification
POLYGONSCAN_API_KEY=...  # Get from: https://polygonscan.com/apis
BSCSCAN_API_KEY=...      # Get from: https://bscscan.com/apis

# ============================================================================
# FEATURES
# ============================================================================

VERIFY=true           # Automatically verify contracts
REPORT_GAS=true       # Show gas usage in tests
```

### Step 3: Verify Setup

```bash
# Check Node.js version
node --version  # Should be v16 or higher

# Check npm version
npm --version   # Should be v7 or higher

# Verify hardhat
npx hardhat --version

# Test compilation
npm run compile

# Check balance
npm run check:balance
```

**You should see:**
```
✅ Solidity 0.8.19 compiler ready
✅ Artifacts ready
✅ All contracts compile successfully
✅ Balance check shows your wallet balance
```

---

## 🧪 Testnet Deployment

### Complete Testnet Workflow (Polygon Amoy)

#### Step 1: Generate Test Wallet (Optional)

```bash
npm run generate:wallet
```

Output:
```
✅ New Wallet Generated!
Address: 0x123...
Private Key: 0xabc...
Mnemonic: word1 word2 word3 ...
```

Copy the address and fund it with testnet MATIC:
```
1. Go to: https://faucet.polygon.technology/
2. Paste wallet address
3. Claim test MATIC (1-2 MATIC should be enough)
4. Wait ~5 minutes for confirmation
```

#### Step 2: Deploy MockAdmin

```bash
echo "Step 1: Deploy MockAdmin..."
npm run deploy:mockadmin:polygon:testnet
```

**Expected Output:**
```
📋 DEPLOYMENT CONFIGURATION
   Network:    polygonAmoy (Chain ID: 80002)
   Deployer:   0x...
   Balance:    2.45 MATIC

📄 Deploying MockAdmin...
✅ MockAdmin deployed to: 0xABC123...

💾 Deployment info saved to deployment-mockadmin-info.json
```

**Copy the deployed address:** `0xABC123...`

#### Step 3: Update .env with MockAdmin Address

```bash
# Edit .env
nano .env

# Change this line:
ADMIN_ADDRESS=0xABC123...  # (from Step 2 output)
```

Verify:
```bash
grep ADMIN_ADDRESS .env
# Should show: ADMIN_ADDRESS=0xABC123...
```

#### Step 4: Deploy CAPX & ANGEL Tokens

```bash
echo "Step 2: Deploy Tokens..."
npm run deploy:tokens:polygon:testnet
```

**Expected Output:**
```
📋 DEPLOYMENT CONFIGURATION
   Network:    polygonAmoy (Chain ID: 80002)
   Deployer:   0x...
   Treasury:   0x...
   DAO:        0x...
   Admin:      0xABC123...

📄 Deploying CAPX...
✅ CAPX deployed to: 0xDEF456...

📄 Deploying ANGEL...
✅ ANGEL deployed to: 0xGHI789...

💾 Deployment info saved to deployment-info.json
```

**Save these addresses:**
```
CAPX:  0xDEF456...
ANGEL: 0xGHI789...
```

#### Step 5: Deploy TokenVesting

```bash
echo "Step 3: Deploy TokenVesting..."
npm run deploy:vesting:polygon:testnet
```

**Expected Output:**
```
📋 DEPLOYMENT CONFIGURATION
   Network:    polygonAmoy (Chain ID: 80002)
   Admin:      0xABC123...

📄 Deploying TokenVesting...
✅ TokenVesting deployed to: 0xJKL012...

💾 Deployment info saved to vesting-deployment.json
```

**Save this address:**
```
TokenVesting: 0xJKL012...
```

#### Step 6: Configure CAPX Fee Exemption (CRITICAL!)

```bash
echo "Step 4: Configure Fee Exemption..."
npm run configure:exemption:polygon:testnet
```

**Expected Output:**
```
🔧 CAPX Fee Exemption Configuration

📄 Setting TokenVesting (0xJKL012...) as exempt...
✅ TokenVesting is now fee exempt

Verification:
✅ VERIFIED - TokenVesting will NOT pay 2% transfer fees
```

**⚠️ CRITICAL:** Without this step, beneficiaries lose 2% on every claim!

#### Step 7: Verify Deployment (Optional)

```bash
npm run verify:polygon:testnet
```

**If VERIFY=true in .env**, this runs automatically. Otherwise:

```bash
# Manual verification
npx hardhat verify --network polygonAmoy 0xDEF456... "0x..." "0x..." "0xABC123..."
npx hardhat verify --network polygonAmoy 0xGHI789... "0xABC123..."
npx hardhat verify --network polygonAmoy 0xJKL012... "0xABC123..."
```

### Verification Check

```bash
# Verify on explorer
curl https://api-amoy.polygonscan.com/api \
  ?module=contract \
  &action=getsourcecode \
  &address=0xDEF456... \
  &apikey=YOUR_API_KEY
```

### Testing Deployment

```bash
# Run tests
npm run test

# Run with gas report
npm run test:gas

# Generate coverage
npm run coverage
```

---

## 🌐 Mainnet Deployment

### Pre-Mainnet Checklist

- [ ] Contracts fully tested on testnet
- [ ] Professional security audit completed
- [ ] Gnosis Safe multisig created (2-3+ signers)
- [ ] All team members have access to Safe
- [ ] API keys obtained for verification
- [ ] Sufficient funds in wallet (~2-5 USD worth of gas)
- [ ] Deployment plan documented
- [ ] Rollback procedure planned

### Mainnet Deployment (Polygon)

#### Step 1: Create Gnosis Safe

Go to: https://app.safe.global

```
1. Click "Create new Safe"
2. Select Network: Polygon
3. Choose signers (2-3 team members)
4. Set threshold (e.g., 2 of 3)
5. Complete setup
6. Note the Safe address: 0xYourSafe...
```

#### Step 2: Update .env for Mainnet

```bash
# Update .env
PRIVATE_KEY=0x...              # Deployer (has funds)
TREASURY_ADDRESS=0xTreasury... # Treasury wallet
DAO_ADDRESS=0xDAO...           # DAO wallet
ADMIN_ADDRESS=0xYourSafe...    # Gnosis Safe address
POLYGONSCAN_API_KEY=...        # For verification
VERIFY=true                    # Auto-verify
```

#### Step 3: Deploy Tokens (Mainnet)

```bash
echo "⚠️  MAINNET DEPLOYMENT STARTING..."

npm run deploy:tokens:polygon
```

**This will prompt:**
```
🚨 MAINNET DEPLOYMENT DETECTED! 🚨
Network: polygon (Chain ID: 137)

Type 'yes' to confirm mainnet deployment: yes
```

**Output:**
```
✅ CAPX deployed to: 0xProdCAPX...
✅ ANGEL deployed to: 0xProdANGEL...
```

#### Step 4: Deploy TokenVesting (Mainnet)

```bash
npm run deploy:vesting:polygon
```

**Output:**
```
✅ TokenVesting deployed to: 0xProdVesting...
```

#### Step 5: Configure Fee Exemption (Mainnet)

```bash
npm run configure:exemption:polygon
```

**Output:**
```
✅ TokenVesting is now fee exempt on CAPX
```

#### Step 6: Verify Contracts

```bash
npm run verify:polygon
```

Or manually:
```bash
npx hardhat verify --network polygon \
  0xProdCAPX \
  "0xTreasury" "0xDAO" "0xYourSafe"
```

### Post-Mainnet Deployment

```bash
# 1. Check explorer
# https://polygonscan.com/address/0xProdCAPX

# 2. Test transactions
# Send small amounts between accounts
# Verify fee calculations

# 3. Document addresses
cat > MAINNET_ADDRESSES.json << EOF
{
  "network": "polygon",
  "chainId": 137,
  "contracts": {
    "CAPX": "0xProdCAPX...",
    "ANGEL": "0xProdANGEL...",
    "TokenVesting": "0xProdVesting..."
  },
  "deployment_date": "2026-01-04",
  "deployer": "0x...",
  "admin": "0xYourSafe..."
}
EOF

# 4. Backup deployment info
cp deployment-info.json MAINNET_BACKUP_$(date +%s).json
```

---

## 🔧 Post-Deployment Setup

### Step 1: Grant Roles

```javascript
// grants.js
const hre = require("hardhat");

async function main() {
    const capxAddress = "0x...";
    const angelAddress = "0x...";
    
    const capx = await hre.ethers.getContractAt("CAPX", capxAddress);
    const angel = await hre.ethers.getContractAt("ANGEL", angelAddress);
    
    // Define roles
    const TEAM_MINTER = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes("TEAM_MINTER_ROLE")
    );
    const TREASURY_MINTER = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes("TREASURY_MINTER_ROLE")
    );
    const DAO_MINTER = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes("DAO_MINTER_ROLE")
    );
    const REWARD_MINTER = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes("REWARD_MINTER_ROLE")
    );
    
    // Grant CAPX roles
    await capx.grantRole(TEAM_MINTER, "0xTeamAddress");
    await capx.grantRole(TREASURY_MINTER, "0xTreasuryAddress");
    await capx.grantRole(DAO_MINTER, "0xDAOAddress");
    
    // Grant ANGEL roles
    await angel.grantRole(REWARD_MINTER, "0xRewardAddress");
    
    console.log("✅ All roles granted");
}

main().catch(console.error);
```

Run:
```bash
npx hardhat run scripts/grants.js --network polygon
```

### Step 2: Initial Distributions

```javascript
// distribute.js
const hre = require("hardhat");

async function main() {
    const capxAddress = "0x...";
    const capx = await hre.ethers.getContractAt("CAPX", capxAddress);
    
    const TEAM_MINTER = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes("TEAM_MINTER_ROLE")
    );
    
    // Mint initial allocations
    const tx1 = await capx.teamMint("0xTeamWallet", hre.ethers.parseEther("1000000"));
    console.log("✅ Team mint:", tx1.hash);
    
    const tx2 = await capx.treasuryMint("0xTreasuryWallet", hre.ethers.parseEther("5000000"));
    console.log("✅ Treasury mint:", tx2.hash);
    
    const tx3 = await capx.daoMint("0xDAOWallet", hre.ethers.parseEther("2000000"));
    console.log("✅ DAO mint:", tx3.hash);
}

main().catch(console.error);
```

### Step 3: Setup Monitoring

```bash
# Create alerts for large transfers
# Monitor fee collection
# Track total minted vs. cap
```

---

## ✅ Verification Checklist

### Deployment Verification

- [ ] All contracts compiled without errors
- [ ] All contracts deployed successfully
- [ ] Addresses saved in deployment-info.json
- [ ] Gas estimates within budget
- [ ] No balance errors during deployment

### On-Chain Verification

- [ ] Contracts verified on block explorer
- [ ] Correct constructor arguments
- [ ] Source code matches artifacts
- [ ] Contract source is readable on explorer

### Functional Verification

- [ ] TokenVesting is fee exempt on CAPX ✅ CRITICAL!
- [ ] Can mint tokens (test with small amount)
- [ ] Can transfer tokens (verify 2% fee for CAPX)
- [ ] Can burn tokens
- [ ] Can create vesting schedules
- [ ] Can claim vested tokens

### Role Verification

- [ ] Roles properly granted
- [ ] Only authorized addresses can mint
- [ ] Pause functionality works
- [ ] Emergency pause can be executed

---

## 📊 Deployment Output Files

### deployment-info.json

```json
{
  "network": "polygonAmoy",
  "chainId": 80002,
  "deployer": "0x...",
  "contracts": {
    "CAPX": {
      "address": "0xDEF456...",
      "name": "CAPShield Token",
      "symbol": "CAPY",
      "decimals": 18,
      "maxSupply": "100000000000000000000000000",
      "transactionHash": "0x..."
    },
    "ANGEL": {
      "address": "0xGHI789...",
      "name": "AngleSeed Token",
      "symbol": "SEED",
      "decimals": 18,
      "maxSupply": "10000000000000000000000000000",
      "transactionHash": "0x..."
    }
  },
  "configuration": {
    "treasuryAddress": "0x...",
    "daoAddress": "0x...",
    "adminAddress": "0xABC123..."
  },
  "timestamp": "2026-01-04T..."
}
```

### vesting-deployment.json

```json
{
  "network": "polygonAmoy",
  "chainId": 80002,
  "deployer": "0x...",
  "contract": {
    "address": "0xJKL012...",
    "adminAddress": "0xABC123...",
    "transactionHash": "0x...",
    "roles": {
      "DEFAULT_ADMIN_ROLE": true,
      "VESTING_ADMIN_ROLE": true,
      "PAUSER_ROLE": true
    }
  },
  "timestamp": "2026-01-04T..."
}
```

---

## 🆘 Troubleshooting

### Deployment Issues

**"Insufficient balance for deployment"**
```bash
npm run check:balance
# Get testnet funds from faucet
```

**"ADMIN_ADDRESS is not a contract"**
```bash
# Deploy MockAdmin first (testnet)
npm run deploy:mockadmin:polygon:testnet
# Then update ADMIN_ADDRESS in .env
```

**"Missing environment variable"**
```bash
# Check .env file exists
ls -la .env

# Verify all required vars are set
grep -E "PRIVATE_KEY|ADMIN_ADDRESS|TREASURY|DAO" .env
```

### Verification Issues

**"Already Verified"**
```bash
# Contract already verified
# This is fine, you can proceed
```

**"Invalid constructor arguments"**
```bash
# Make sure to pass in correct format:
npx hardhat verify --network polygon \
  0xAddress \
  "arg1" "arg2" "arg3"
```

---

## 📞 Support

For issues:
1. Check [Troubleshooting](09-TROUBLESHOOTING.md)
2. Review [Security & Best Practices](07-SECURITY_AND_BEST_PRACTICES.md)
3. Check contract events on explorer
4. Review transaction details on block explorer
