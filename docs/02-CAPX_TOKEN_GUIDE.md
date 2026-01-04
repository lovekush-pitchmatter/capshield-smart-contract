# 🛡️ CAPX Token - Complete Technical Guide

**Contract:** `contracts/CAPX.sol`  
**Symbol:** CAPY  
**Decimals:** 18  
**Max Supply:** 100,000,000 tokens (irreversible hard cap)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Core Mechanisms](#core-mechanisms)
- [Function Reference](#function-reference)
- [Access Control](#access-control)
- [Fee System](#fee-system)
- [Minting Operations](#minting-operations)
- [Advanced Features](#advanced-features)
- [Events](#events)
- [Usage Examples](#usage-examples)

---

## 🎯 Overview

CAPX is the **Protocol Shield Token** for CAPShield ecosystem. It features:

- **Irreversible Hard Cap:** 100 Million tokens maximum, enforced via `totalMinted` counter
- **Deflationary Transfer Mechanism:** 2% fee (1% burn + 1% treasury) on transfers
- **Role-Based Minting:** Different roles for different minting purposes
- **Emergency Controls:** Pausable to halt all transfers and minting
- **Fee Exemptions:** Treasury, DAO, and configurable addresses skip fees

### Key Statistics

```
Symbol:          CAPY
Name:            CAPShield Token
Decimals:        18
Max Supply:      100,000,000 CAPY
Initial Supply:  0 (mint-on-demand)
Transfer Fee:    2% (1% burn + 1% treasury)
```

---

## 🔧 Core Mechanisms

### 1. Hard Cap Enforcement

CAPX uses an **irreversible minting counter** to enforce the hard cap:

```solidity
// Variable tracking
uint256 public totalMinted;    // Total tokens ever minted (never decreases)
uint256 public constant MAX_SUPPLY = 100_000_000e18;

// When tokens are minted:
totalMinted += amount;         // Counter increases

// When tokens are burned:
totalSupply -= amount;         // Supply decreases
totalMinted stays same         // Counter does NOT decrease

// Validation on every mint:
require(totalMinted + amount <= MAX_SUPPLY, "Exceeds MAX_SUPPLY");
```

**Why this design?**
- Prevents bypassing hard cap through burn-and-remint
- Ensures supply integrity
- Makes cap truly irreversible

### 2. Deflationary Transfer Mechanism

Every transfer applies a 2% fee unless sender or receiver is exempt:

```javascript
Transfer Flow Example:
┌─────────────────────────────────────────────────────────────┐
│ transfer(recipient, 100 CAPY)                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Step 1: Calculate Fee (if not exempt)                       │
│ ├─ burnFee = 100 * 1% = 1 CAPY                              │
│ └─ treasuryFee = 100 * 1% = 1 CAPY                          │
│                                                               │
│ Step 2: Burn 1 CAPY                                         │
│ ├─ totalSupply -= 1                                         │
│ └─ emit Transfer(sender, 0x0, 1)                            │
│                                                               │
│ Step 3: Send 1 CAPY to Treasury                             │
│ ├─ balances[treasury] += 1                                  │
│ └─ emit TreasuryFee(sender, treasury, 1)                    │
│                                                               │
│ Step 4: Transfer Remaining to Recipient                     │
│ ├─ balances[recipient] += 98                                │
│ └─ emit Transfer(sender, recipient, 98)                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Result:
├─ Sender:    -100 CAPY
├─ Recipient: +98 CAPY
├─ Treasury:  +1 CAPY
├─ Burned:    1 CAPY (destroyed)
└─ totalSupply: -1 (only burn reduces supply)
```

### 3. Fee Exemption System

Certain addresses are exempt from transfer fees:

```solidity
mapping(address => bool) public isExemptFromFees;

// Always exempt (in constructor):
isExemptFromFees[treasury] = true;
isExemptFromFees[dao] = true;

// Can be added by admin:
setExemption(tokenAddress, newExempt, true);

// When transferring from exempt address:
// No fees applied, 100% of tokens reach recipient
transfer from exempt to anyone:  recipient gets 100
transfer from anyone to exempt:  recipient gets 100 (still 2% fee for sender)
```

---

## 📚 Function Reference

### Read-Only Functions (View/Pure)

#### `name()` → string
Returns the token name.
```solidity
function name() public view override returns (string memory)
```
**Returns:** `"CAPShield Token"`

#### `symbol()` → string
Returns the token symbol.
```solidity
function symbol() public view override returns (string memory)
```
**Returns:** `"CAPY"`

#### `decimals()` → uint8
Returns the number of decimal places.
```solidity
function decimals() public view override returns (uint8)
```
**Returns:** `18`

#### `totalSupply()` → uint256
Returns the current circulating supply (can decrease if tokens are burned).
```solidity
function totalSupply() public view override returns (uint256)
```
**Example:**
```javascript
const supply = await capx.totalSupply();
console.log(ethers.formatEther(supply)); // "50000000.0"
```

#### `balanceOf(account)` → uint256
Returns token balance of an account.
```solidity
function balanceOf(address account) public view override returns (uint256)
```
**Parameters:**
- `account` (address): The account to check

**Example:**
```javascript
const balance = await capx.balanceOf(userAddress);
console.log(ethers.formatEther(balance));
```

#### `allowance(owner, spender)` → uint256
Returns the amount spender can transfer on behalf of owner.
```solidity
function allowance(address owner, address spender) 
    public view override returns (uint256)
```
**Parameters:**
- `owner` (address): Token holder
- `spender` (address): Can spend up to this amount

#### `totalMinted` → uint256
Returns total tokens ever minted (never decreases, even if burned).
```solidity
function totalMinted() public view returns (uint256)
```
**Use Case:** Check if we're approaching MAX_SUPPLY
```javascript
const minted = await capx.totalMinted();
const maxSupply = await capx.MAX_SUPPLY();
const remaining = maxSupply - minted;
```

#### `MAX_SUPPLY` → uint256
Returns the immutable hard cap (100 Million tokens).
```solidity
function MAX_SUPPLY() public view returns (uint256)
```
**Returns:** `100000000000000000000000000` (100M * 10^18)

#### `isExemptFromFees(account)` → bool
Check if an address is exempt from transfer fees.
```solidity
function isExemptFromFees(address account) public view returns (bool)
```
**Example:**
```javascript
const isExempt = await capx.isExemptFromFees(vestingAddress);
if (!isExempt) console.log("NOT exempt - will pay 2% fee");
```

---

### State-Modifying Functions

#### `transfer(recipient, amount)` → bool
Transfer tokens to recipient, applying 2% fee if not exempt.

```solidity
function transfer(address recipient, uint256 amount) 
    public override returns (bool)
```

**Parameters:**
- `recipient` (address): Destination address
- `amount` (uint256): Amount in wei (e.g., `ethers.parseEther("100")`)

**Returns:** `true` if successful

**Reverts If:**
- Recipient is zero address
- Sender has insufficient balance
- Contract is paused
- Amount is 0

**Gas Cost:** ~60,000 gas (transfer + fee calculations)

**Example:**
```javascript
// Transfer 100 CAPY to recipient
const tx = await capx.transfer(
    recipientAddress,
    ethers.parseEther("100")
);
await tx.wait();

// Recipient receives 98 CAPY
// 1 CAPY burned
// 1 CAPY to treasury
```

**Fee Breakdown:**
```
If sender is NOT exempt:
├─ Sender loses: 100 CAPY
├─ Recipient gets: 98 CAPY
├─ Treasury gets: 1 CAPY
├─ Burned: 1 CAPY
└─ totalSupply: -1

If sender IS exempt:
├─ Sender loses: 100 CAPY
├─ Recipient gets: 100 CAPY
├─ No fees applied
└─ totalSupply: unchanged
```

#### `transferFrom(sender, recipient, amount)` → bool
Transfer tokens from one address to another (requires approval).

```solidity
function transferFrom(address sender, address recipient, uint256 amount) 
    public override returns (bool)
```

**Parameters:**
- `sender` (address): Source address
- `recipient` (address): Destination address
- `amount` (uint256): Amount in wei

**Process:**
1. Check sender has approved at least `amount` to caller
2. Decrease allowance
3. Execute transfer (with fees)
4. Return true

**Reverts If:**
- Caller is not approved for amount
- Sender insufficient balance
- Contract is paused

**Example:**
```javascript
// Step 1: Token owner approves spender
await capx.approve(spenderAddress, ethers.parseEther("100"));

// Step 2: Spender transfers on behalf of owner
await capx.transferFrom(
    ownerAddress,
    recipientAddress,
    ethers.parseEther("100")
);
```

#### `approve(spender, amount)` → bool
Allow spender to transfer up to `amount` on behalf of msg.sender.

```solidity
function approve(address spender, uint256 amount) 
    public override returns (bool)
```

**Parameters:**
- `spender` (address): Address that can spend tokens
- `amount` (uint256): Maximum amount they can spend

**Important:** 
- Setting `amount = 0` first before increasing (security best practice)
- No limit on how many times approval can be updated

**Example:**
```javascript
// Approve DEX to swap 1000 CAPY
await capx.approve(
    dexAddress,
    ethers.parseEther("1000")
);

// DEX can now call transferFrom up to 1000 CAPY
```

#### `increaseAllowance(spender, addedValue)` → bool
Safely increase allowance (recommended over `approve`).

```solidity
function increaseAllowance(address spender, uint256 addedValue) 
    public override returns (bool)
```

**Advantages:**
- Prevents race condition in approve/transferFrom
- Adds to existing allowance instead of replacing

**Example:**
```javascript
// Instead of: approve(spender, 1000)
// Use: increaseAllowance(spender, 1000)

// If already approved 500, this makes it 1500
await capx.increaseAllowance(spenderAddress, ethers.parseEther("500"));
```

#### `decreaseAllowance(spender, subtractedValue)` → bool
Safely decrease allowance.

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) 
    public override returns (bool)
```

**Reverts If:**
- Current allowance < subtractedValue (underflow protection)

---

### Minting Functions (Role-Based)

#### `teamMint(to, amount)` → bool
Mint tokens for team allocation.

```solidity
function teamMint(address to, uint256 amount) 
    external onlyRole(TEAM_MINTER_ROLE) returns (bool)
```

**Requirements:**
- Caller must have `TEAM_MINTER_ROLE`
- Recipient address cannot be zero
- `totalMinted + amount` must not exceed `MAX_SUPPLY`

**Emits:** `TeamMint(msg.sender, to, amount)` and `Transfer(0x0, to, amount)`

**Use Case:** Allocate tokens to team members

**Example:**
```javascript
// Grant TEAM_MINTER_ROLE first
const TEAM_MINTER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("TEAM_MINTER_ROLE")
);
await capx.grantRole(TEAM_MINTER_ROLE, minterAddress);

// Then mint
const tx = await capx.teamMint(
    teamMemberAddress,
    ethers.parseEther("100000") // 100k CAPX
);
```

#### `treasuryMint(to, amount)` → bool
Mint tokens for treasury operations.

```solidity
function treasuryMint(address to, uint256 amount) 
    external onlyRole(TREASURY_MINTER_ROLE) returns (bool)
```

**Requirements:**
- Caller must have `TREASURY_MINTER_ROLE`
- Recipient cannot be zero
- Hard cap enforcement

**Emits:** `TreasuryMint(msg.sender, to, amount)` and `Transfer(0x0, to, amount)`

**Use Case:** Treasury operations, reserves, market making

**Example:**
```javascript
// Mint for treasury reserves
const tx = await capx.treasuryMint(
    treasuryAddress,
    ethers.parseEther("5000000") // 5M CAPX
);
```

#### `daoMint(to, amount)` → bool
Mint tokens for DAO governance.

```solidity
function daoMint(address to, uint256 amount) 
    external onlyRole(DAO_MINTER_ROLE) returns (bool)
```

**Requirements:**
- Caller must have `DAO_MINTER_ROLE`
- Recipient cannot be zero
- Hard cap enforcement

**Emits:** `DAOMint(msg.sender, to, amount)` and `Transfer(0x0, to, amount)`

**Use Case:** DAO treasury, governance rewards

**Example:**
```javascript
// Mint for DAO governance pool
const tx = await capx.daoMint(
    daoAddress,
    ethers.parseEther("2000000") // 2M CAPX
);
```

#### `revenueMint(to, revenue, marketValue)` → bool
Mint tokens based on protocol revenue at market price.

```solidity
function revenueMint(address to, uint256 revenue, uint256 marketValue) 
    external onlyRole(TREASURY_MINTER_ROLE) returns (bool)
```

**Formula:**
```
mintAmount = (revenue * 10^18) / marketValue
```

**Parameters:**
- `to` (address): Recipient of minted tokens
- `revenue` (uint256): Protocol revenue in USD (scaled to wei if needed)
- `marketValue` (uint256): Current CAPX market price in USD (scaled to wei)

**Emits:** `RevenueMint(to, amount, revenue, marketValue)`

**Use Case:** Revenue-based token minting (deflationary flywheel)

**Example:**
```javascript
// Protocol earned 1000 USD, CAPX price = $0.50
// Should mint: (1000 * 1e18) / 0.50 = 2000 tokens

const tx = await capx.revenueMint(
    treasuryAddress,
    ethers.parseEther("1000"),      // 1000 USD revenue
    ethers.parseEther("0.5")        // $0.50 per CAPX
);

// Result: 2000 CAPX minted to treasury
```

**Gas Cost:** ~70,000 gas

---

### Burning Functions

#### `burn(amount)` → bool
Burn tokens from caller's balance (permanently removes from supply).

```solidity
function burn(uint256 amount) public returns (bool)
```

**Effect:**
```
├─ totalSupply -= amount    (decreases)
├─ totalMinted stays same   (does NOT decrease)
└─ Token is destroyed
```

**Example:**
```javascript
// Burn 100 CAPX from own balance
const tx = await capx.burn(ethers.parseEther("100"));

// Equivalent to: transfer(0x0, 100) but explicit
```

#### `burnFrom(account, amount)` → bool
Burn tokens from another account (requires approval).

```solidity
function burnFrom(address account, uint256 amount) public returns (bool)
```

**Parameters:**
- `account` (address): Address whose tokens to burn
- `amount` (uint256): Amount to burn

**Requirements:**
- Caller must be approved for at least `amount` by `account`
- `account` must have at least `amount` balance

**Example:**
```javascript
// Approve caller to burn tokens
await capx.approve(burnerAddress, ethers.parseEther("100"));

// Burn those tokens
const tx = await burnerAddress.burnFrom(
    callerAddress,
    ethers.parseEther("100")
);
```

---

### Administrative Functions

#### `updateTreasuryAddress(newTreasury)` → void
Update the treasury wallet address (receives transfer fees).

```solidity
function updateTreasuryAddress(address newTreasury) 
    external onlyRole(DEFAULT_ADMIN_ROLE)
```

**Requirements:**
- Caller must have `DEFAULT_ADMIN_ROLE`
- New address cannot be zero
- New address cannot be current treasury

**Emits:** `TreasuryAddressUpdated(oldAddress, newAddress)`

**Example:**
```javascript
// Update treasury to new wallet
const tx = await capx.updateTreasuryAddress(newTreasuryAddress);

// Future transfers will send 1% fee to new address
```

#### `updateDAOAddress(newDAO)` → void
Update the DAO address (exempt from fees).

```solidity
function updateDAOAddress(address newDAO) 
    external onlyRole(DEFAULT_ADMIN_ROLE)
```

**Requirements:**
- Caller must have `DEFAULT_ADMIN_ROLE`
- New address cannot be zero
- New address cannot be current DAO

**Emits:** `DAOAddressUpdated(oldAddress, newAddress)`

#### `setExemption(account, exempt)` → void
Add or remove an address from fee exemption list.

```solidity
function setExemption(address account, bool exempt) 
    external onlyRole(DEFAULT_ADMIN_ROLE)
```

**Parameters:**
- `account` (address): Address to exempt/un-exempt
- `exempt` (bool): `true` to exempt, `false` to remove exemption

**Emits:** `ExemptionUpdated(account, exempt)`

**Critical Use Case:** Adding TokenVesting contract to exemptions
```javascript
// MUST DO THIS after TokenVesting deployment!
const VESTING_ADDRESS = "0x..."; // From deployment

const tx = await capx.setExemption(VESTING_ADDRESS, true);
await tx.wait();

// Verify
const isExempt = await capx.isExemptFromFees(VESTING_ADDRESS);
console.log(isExempt); // true
```

---

### Emergency Controls

#### `pause()` → void
Pause all transfers and minting (emergency stop).

```solidity
function pause() external onlyRole(PAUSER_ROLE)
```

**Effect:**
- All transfers are blocked
- All minting is blocked
- Burning is allowed (to reduce emergency impact)
- Supply can still decrease

**When to Use:**
- Security vulnerability detected
- Smart contract exploit happening
- Regulatory requirement
- Emergency maintenance

**Example:**
```javascript
// Grant PAUSER_ROLE to emergency multisig
await capx.grantRole(PAUSER_ROLE, emergencyMultisigAddress);

// If emergency, pause:
const tx = await emergencyMultisig.pause(capxAddress);
```

#### `unpause()` → void
Resume normal operations after pause.

```solidity
function unpause() external onlyRole(PAUSER_ROLE)
```

**Requirements:**
- Caller must have `PAUSER_ROLE`
- Contract must be currently paused

---

## 🔐 Access Control

### Role-Based Permissions

| Role | Keccak256 Hash | Permissions | Use |
|------|---------------|------------|-----|
| `DEFAULT_ADMIN_ROLE` | `0x00...00` | Manage all roles, update treasury/DAO | Gnosis Safe |
| `TEAM_MINTER_ROLE` | `keccak256("TEAM_MINTER_ROLE")` | `teamMint()` | Team allocation |
| `TREASURY_MINTER_ROLE` | `keccak256("TREASURY_MINTER_ROLE")` | `treasuryMint()`, `revenueMint()` | Treasury ops |
| `DAO_MINTER_ROLE` | `keccak256("DAO_MINTER_ROLE")` | `daoMint()` | DAO governance |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | `pause()`, `unpause()` | Emergency |

### Role Management Functions

```solidity
// Grant role to address
grantRole(role, account)

// Revoke role from address
revokeRole(role, account)

// Check if has role
hasRole(role, account) -> bool
```

**Example - Setting Up Roles:**
```javascript
// Setup from deployer (has DEFAULT_ADMIN_ROLE)
const TEAM_MINTER = ethers.keccak256(ethers.toUtf8Bytes("TEAM_MINTER_ROLE"));
const TREASURY_MINTER = ethers.keccak256(ethers.toUtf8Bytes("TREASURY_MINTER_ROLE"));
const DAO_MINTER = ethers.keccak256(ethers.toUtf8Bytes("DAO_MINTER_ROLE"));
const PAUSER = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

// Grant via multisig
await capx.grantRole(TEAM_MINTER, teamWallet);
await capx.grantRole(TREASURY_MINTER, treasuryWallet);
await capx.grantRole(DAO_MINTER, daoWallet);
await capx.grantRole(PAUSER, emergencyMultisig);
```

---

## 💰 Fee System

### Transfer Fee Breakdown

```
Every Transfer (unless exempt):
┌─ Input: 100 CAPX ─────────────────────┐
│                                        │
├─ 1% Burn: 1 CAPX ───┐                 │
│                      ├─ 2% Total Fee  │
├─ 1% Treasury: 1 CAPX ┘                │
│                                        │
└─ Recipient: 98 CAPX (net transfer)   │
```

### Fee Exemption Rules

```javascript
// Always exempt (automatic):
├─ Treasury address
└─ DAO address

// Can be configured:
├─ TokenVesting contract (CRITICAL!)
├─ Exchange addresses
├─ Bridge contracts
└─ Any custom address
```

### Calculating Fees

```javascript
// If NOT exempt:
const amount = 100;
const burnFee = amount * 0.01;        // 1 CAPX
const treasuryFee = amount * 0.01;    // 1 CAPX
const recipient = amount * 0.98;      // 98 CAPX

// If IS exempt:
const recipient = amount;               // 100 CAPX (no fees)
```

---

## 🚀 Usage Examples

### Example 1: Setup After Deployment

```javascript
const capx = new ethers.Contract(CAPX_ADDRESS, CAPX_ABI, admin);

// Define roles
const TEAM_MINTER = ethers.keccak256(ethers.toUtf8Bytes("TEAM_MINTER_ROLE"));
const TREASURY_MINTER = ethers.keccak256(ethers.toUtf8Bytes("TREASURY_MINTER_ROLE"));
const DAO_MINTER = ethers.keccak256(ethers.toUtf8Bytes("DAO_MINTER_ROLE"));

// Grant roles
await capx.grantRole(TEAM_MINTER, TEAM_ADDRESS);
await capx.grantRole(TREASURY_MINTER, TREASURY_ADDRESS);
await capx.grantRole(DAO_MINTER, DAO_ADDRESS);

// Add TokenVesting to fee exemptions
await capx.setExemption(VESTING_ADDRESS, true);

console.log("✅ Setup complete");
```

### Example 2: Initial Token Distribution

```javascript
// Mint team allocation (1M tokens)
await capx.teamMint(TEAM_ADDRESS, ethers.parseEther("1000000"));

// Mint treasury allocation (5M tokens)
await capx.treasuryMint(TREASURY_ADDRESS, ethers.parseEther("5000000"));

// Mint DAO allocation (2M tokens)
await capx.daoMint(DAO_ADDRESS, ethers.parseEther("2000000"));

const supply = await capx.totalSupply();
console.log(`Total Supply: ${ethers.formatEther(supply)} CAPX`);
```

### Example 3: Revenue-Based Minting

```javascript
// Protocol earned $10,000 revenue
// CAPX currently trading at $1.00
const revenue = ethers.parseEther("10000");  // $10k
const price = ethers.parseEther("1.0");      // $1 per CAPX

// Mint 10,000 CAPX proportional to revenue
const tx = await capx.revenueMint(TREASURY_ADDRESS, revenue, price);

console.log("Minted 10,000 CAPX from $10,000 revenue");
```

### Example 4: Transfer with Fee Calculation

```javascript
const amount = ethers.parseEther("100");

// Transfer from non-exempt address
const tx = await capx.connect(sender).transfer(recipient, amount);
await tx.wait();

// Check balances
const recipientBalance = await capx.balanceOf(recipient);
console.log(`Recipient received: ${ethers.formatEther(recipientBalance)}`); 
// Output: 98.0 CAPX (2 CAPX in fees)
```

### Example 5: Emergency Pause

```javascript
// Grant pauser role to emergency multisig
const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
await capx.grantRole(PAUSER_ROLE, EMERGENCY_MULTISIG);

// If emergency situation occurs:
const pauseTx = await capx.connect(emergencyMultisig).pause();
await pauseTx.wait();

console.log("✅ Contract paused - all transfers blocked");

// Later, resume:
const unpauseTx = await capx.connect(emergencyMultisig).unpause();
await unpauseTx.wait();

console.log("✅ Contract resumed");
```

---

## 📊 State Variables Summary

```solidity
// Token metadata
string public name                    // "CAPShield Token"
string public symbol                  // "CAPY"
uint8 public decimals                 // 18
uint256 public constant MAX_SUPPLY    // 100,000,000e18

// Supply tracking
uint256 public totalSupply            // Current circulating (can decrease)
uint256 public totalMinted            // Total ever minted (never decreases)

// Balances & allowances
mapping(address => uint256) public balanceOf
mapping(address => mapping(address => uint256)) public allowance

// Fee exempt list
mapping(address => bool) public isExemptFromFees

// Admin addresses
address public treasuryAddress
address public daoAddress

// Pause status
bool public paused
```

---

## ⚠️ Important Notes

### 1. Hard Cap is Irreversible

Once 100M tokens are minted, no more can ever be minted (even if burned).

```javascript
// Example:
// Mint 100M → totalMinted = 100M
// Burn 50M → totalSupply = 50M, but totalMinted still = 100M
// Try to mint 1 more → REVERTED (exceeds MAX_SUPPLY)
```

### 2. TokenVesting MUST Be Fee Exempt

Without this, beneficiaries lose 2% on every claim:

```javascript
// CRITICAL: Do this immediately after TokenVesting deployment
await capx.setExemption(VESTING_ADDRESS, true);

// Verify
const isExempt = await capx.isExemptFromFees(VESTING_ADDRESS);
require(isExempt, "TokenVesting must be fee exempt!");
```

### 3. Transfer Fees Apply to Both Transfers and TransferFrom

```javascript
// transfer() → fees applied if not exempt
// transferFrom() → fees applied if not exempt

// Both trigger fee logic, so:
// - Monitor transfer volume for treasury/burn tracking
// - Account for fees in exchange integrations
```

### 4. Emergency Pause Blocks Everything

When paused:
- ❌ Cannot transfer
- ❌ Cannot mint
- ✅ Can still burn (if OpenZeppelin allows)

---

**Last Updated:** January 4, 2026  
**Version:** 1.0.0  
**Audience:** Developers, Auditors, Operations
