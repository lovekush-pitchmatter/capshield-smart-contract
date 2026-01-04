# 🆘 Troubleshooting Guide

Solutions for common issues and error messages.

---

## 📖 Table of Contents

- [Installation Issues](#installation-issues)
- [Compilation Issues](#compilation-issues)
- [Test Failures](#test-failures)
- [Deployment Issues](#deployment-issues)
- [Runtime Errors](#runtime-errors)
- [Configuration Issues](#configuration-issues)
- [Gas & Performance](#gas--performance)

---

## 🔧 Installation Issues

### "npm ERR! code ERESOLVE"

**Problem:** Dependency conflict during `npm install`

**Solution:**
```bash
# Use legacy peer deps flag
npm install --legacy-peer-deps

# Or use npm 7+
npm --version  # Should be 7+
npm install
```

### "Cannot find module 'hardhat'"

**Problem:** Hardhat not installed

**Solution:**
```bash
# Reinstall all dependencies
rm -rf node_modules
npm install

# Verify
npx hardhat --version
```

### "Node version incompatible"

**Problem:** Node.js version too old

**Check:**
```bash
node --version  # Should be v16+
npm --version   # Should be v7+
```

**Update:**
```bash
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from: https://nodejs.org/
```

---

## 📝 Compilation Issues

### "SyntaxError: Unexpected token"

**Problem:** Solidity syntax error in contract

**Solution:**
```bash
# Check compiler version
npm run compile

# Look for line numbers in error
# Fix syntax in that file
# Try again
npm run compile
```

### "TypeError: Cannot find Solidity version"

**Problem:** Solidity version not installed

**Solution:**
```bash
# Clean cache
npm run clean

# Reinstall dependencies
npm install

# Try compilation again
npm run compile
```

### "Source file imports not found"

**Problem:** Import path is incorrect

**Solution:**
```solidity
// Check import paths are correct
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";  // ✅
import "@openzeppelin/contracts/ERC20.sol";             // ❌

// Verify openzeppelin is installed
ls node_modules/@openzeppelin/contracts/
```

---

## 🧪 Test Failures

### "Error: Account does not have ROLE"

**Problem:** Test account doesn't have required role

**Solution:**
```javascript
// Grant role first
const TEAM_MINTER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("TEAM_MINTER_ROLE")
);

await capx.grantRole(TEAM_MINTER_ROLE, signer.address);

// Then call function
await capx.teamMint(recipient, amount);
```

### "AssertionError: expected 100 to equal 98"

**Problem:** Transfer fee not applied as expected

**Debugging:**
```javascript
// Check if account is exempt
const isExempt = await capx.isExemptFromFees(senderAddress);

// Check if amount calculation is correct
// 100 * 0.98 = 98 ✅
const recipient = await capx.balanceOf(recipientAddress);
console.log("Received:", ethers.formatEther(recipient));  // Should be 98
```

### "Revert: Exceeds MAX_SUPPLY"

**Problem:** Minting would exceed hard cap

**Solution:**
```javascript
// Check remaining supply
const remaining = await capx.remainingMintableSupply();
console.log("Can mint:", ethers.formatEther(remaining));

// Mint less
const maxAmount = remaining - ethers.parseEther("1");  // Leave 1 token buffer
await capx.teamMint(recipient, maxAmount);
```

### "Timeout waiting for transaction"

**Problem:** Test takes too long or hangs

**Solution:**
```bash
# Increase timeout in test
mocha.setTimeout(30000);  // 30 seconds

# Or run individual test
npx hardhat test --grep "test name"
```

---

## 🚀 Deployment Issues

### "Error: ENOENT: no such file or directory, open '.env'"

**Problem:** `.env` file not found

**Solution:**
```bash
# Create .env from template
cp .env.example .env

# Edit with your values
nano .env

# Check file exists
ls -la .env
```

### "Missing required environment variable: PRIVATE_KEY"

**Problem:** `.env` doesn't have `PRIVATE_KEY`

**Solution:**
```bash
# Edit .env
nano .env

# Add line:
PRIVATE_KEY=0x...

# Verify
grep PRIVATE_KEY .env
```

### "Error: Insufficient balance for deployment"

**Problem:** Wallet doesn't have enough gas

**Solution:**
```bash
# Check balance
npm run check:balance

# Fund wallet with testnet tokens
# For Polygon Amoy: https://faucet.polygon.technology/
# For BSC Testnet: https://testnet.bnbchain.org/faucet-smart

# Wait for confirmation (5-15 minutes)

# Check balance again
npm run check:balance

# Try deployment
npm run deploy:tokens:polygon:testnet
```

### "Error: ADMIN_ADDRESS is not a contract"

**Problem:** Admin address is an EOA (regular wallet), not a contract

**Solution:**

For testnet:
```bash
# Deploy MockAdmin first
npm run deploy:mockadmin:polygon:testnet

# Update .env with MockAdmin address
ADMIN_ADDRESS=0xMockAdminAddressFromOutput

# Try deployment again
npm run deploy:tokens:polygon:testnet
```

For mainnet:
```bash
# Create Gnosis Safe
# Go to: https://app.safe.global/
# Select network, add signers, create Safe
# Get Safe address: 0xYourSafe...

# Update .env
ADMIN_ADDRESS=0xYourSafe...

# Deploy
npm run deploy:tokens:polygon
```

### "Error: Mainnet deployment not allowed"

**Problem:** Trying to use restricted script on mainnet

**Explanation:**
This is intentional - certain scripts are testnet-only.

**Solution:**
```bash
# Use proper deployment script
npm run deploy:tokens:polygon          # For mainnet

# Separate scripts for different purposes:
npm run deploy:tokens:polygon:testnet  # For testnet
npm run deploy:vesting:polygon         # For mainnet
npm run deploy:vesting:polygon:testnet # For testnet
```

### "Contract already verified"

**Problem:** Contract was already verified on explorer

**Solution:**
```
✅ This is fine - contract is verified
✅ You can proceed with deployment
✅ Future deployments of same contract will reuse verification
```

---

## ⚙️ Runtime Errors

### "Revert: Contract is paused"

**Problem:** Contract is in paused state

**Solution:**
```javascript
// Check if paused
const isPaused = await capx.paused();

// Unpause if needed (requires PAUSER_ROLE)
if (isPaused) {
    const tx = await capx.unpause();
    await tx.wait();
}

// Try operation again
await capx.transfer(recipient, amount);
```

### "Revert: Insufficient allowance"

**Problem:** Caller not approved for transferFrom

**Solution:**
```javascript
// Approve first
const approveTx = await capx.approve(
    spenderAddress,
    ethers.parseEther("1000")
);
await approveTx.wait();

// Then transfer
const transferTx = await capx.transferFrom(
    ownerAddress,
    recipientAddress,
    ethers.parseEther("100")
);
```

### "Revert: Cliff not reached"

**Problem:** Trying to claim before cliff time in vesting

**Solution:**
```javascript
// Check current time
const currentTime = Math.floor(Date.now() / 1000);

// Get schedule
const schedule = await vesting.getVestingSchedule(scheduleId);

// Wait until after cliff time
if (currentTime < schedule.cliffTime) {
    const waitSeconds = schedule.cliffTime - currentTime;
    const waitDays = waitSeconds / (24 * 60 * 60);
    console.log(`Wait ${waitDays.toFixed(1)} more days`);
} else {
    // Can claim now
    await vesting.claim(beneficiary, token, scheduleId);
}
```

### "Revert: Schedule already revoked"

**Problem:** Trying to claim from revoked vesting schedule

**Solution:**
```javascript
// Check if revoked
const schedule = await vesting.getVestingSchedule(scheduleId);

if (schedule.revoked) {
    console.log("Schedule was revoked - cannot claim");
    // Check if beneficiary received vested amount
} else {
    // Safe to claim
    await vesting.claim(beneficiary, token, scheduleId);
}
```

---

## ⚙️ Configuration Issues

### "Cannot find network 'polygon'"

**Problem:** Network not configured in `hardhat.config.js`

**Solution:**
```bash
# Check networks are defined
grep -A 5 "networks:" hardhat.config.js

# Verify your network:
npm run deploy:tokens:polygon:testnet  # Uses polygonAmoy

# Available networks:
# - localhost
# - polygonAmoy (testnet)
# - polygon (mainnet)
# - bscTestnet (testnet)
# - bsc (mainnet)
```

### "Invalid RPC URL"

**Problem:** RPC endpoint is incorrect or down

**Solution:**
```bash
# Check RPC URL in .env or hardhat.config.js
grep RPC .env

# Test RPC connectivity
curl https://rpc-amoy.polygon.technology

# If down, use alternative:
# Polygon Amoy: 
#   - https://rpc-amoy.polygon.technology/
#   - https://polygon-amoy-bor-rpc.publicnode.com/

# Update .env if needed and retry
```

### "API key invalid"

**Problem:** Block explorer API key is wrong

**Solution:**
```bash
# Verify API key format
grep POLYGONSCAN_API_KEY .env

# Get new API key:
# 1. Go to: https://polygonscan.com/apis
# 2. Login/register
# 3. Create new API key
# 4. Copy full key
# 5. Update .env

# Test verification
npm run verify:polygon:testnet
```

---

## ⚡ Gas & Performance

### "Out of gas"

**Problem:** Function call used more gas than estimated

**Solution:**
```javascript
// Increase gas limit
const tx = await contract.functionCall(params, {
    gasLimit: 300000  // Increase from default
});

// For batch operations
const tx = await contract.batchOperation(largeBatch, {
    gasLimit: 5000000  // Very large limit
});
```

### "Batch operations too large"

**Problem:** Too many recipients in batch

**Solution:**
```javascript
// Split into smaller batches
const batchSize = 50;  // Process 50 at a time

for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const amounts = allAmounts.slice(i, i + batchSize);
    
    const tx = await contract.batchMint(batch, amounts, reason);
    await tx.wait();
    
    console.log(`Processed batch ${Math.ceil(i / batchSize)}`);
}
```

### "Transaction mempool full"

**Problem:** Network congested, transaction not processing

**Solution:**
```javascript
// Increase gas price
const gasPrice = await ethers.provider.getGasPrice();
const tx = await contract.functionCall(params, {
    gasPrice: gasPrice.mul(2)  // 2x normal gas price
});

// Or wait for network congestion to pass
// Check: https://polygonscan.com/gastracker
```

---

## 📞 Still Having Issues?

### Debug Checklist

```
□ Check error message carefully
□ Search error in this troubleshooting guide
□ Check .env file has all required variables
□ Verify Node.js and npm versions
□ Run npm run compile to check syntax
□ Run npm run test to verify setup
□ Check block explorer for transaction details
□ Review contract code at error line
□ Check role permissions
□ Verify network is correct
```

### Getting Help

**1. Check Documentation:**
   - [Getting Started](01-GETTING_STARTED.md)
   - [API Reference](08-API_REFERENCE.md)
   - [Deployment Guide](05-DEPLOYMENT_GUIDE.md)

**2. Review Contract Code:**
   - Check exact error location
   - Look at require statements
   - Verify parameters match function signature

**3. Test on Testnet First:**
   - Never deploy to mainnet without testing
   - Use small amounts to debug
   - Verify behavior on testnet

**4. Reach Out:**
   - Create GitHub issue with:
     - Error message
     - Steps to reproduce
     - Environment info
     - Network details
