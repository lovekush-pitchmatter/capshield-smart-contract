# 🌟 ANGEL Token - Complete Technical Guide

**Contract:** `contracts/ANGEL.sol`  
**Symbol:** SEED  
**Decimals:** 18  
**Max Supply:** 10,000,000,000 tokens (irreversible hard cap)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Core Design](#core-design)
- [Function Reference](#function-reference)
- [Access Control](#access-control)
- [Minting System](#minting-system)
- [Audit Trail](#audit-trail)
- [Events](#events)
- [Usage Examples](#usage-examples)

---

## 🎯 Overview

ANGEL is the **Community Reward Token** for the CAPShield ecosystem. It's designed for transparent, auditable reward distribution with:

- **Irreversible Hard Cap:** 10 Billion tokens maximum via `totalMinted` counter
- **No Transfer Fees:** Clean transfers, no deflationary mechanics
- **Mandatory Reason Tracking:** Every mint requires a reason string for auditability
- **Batch Operations:** Efficient multi-recipient distributions
- **Transparent Audit Trail:** Immutable record of all distributions

### Key Statistics

```
Symbol:          SEED
Name:            AngleSeed Token
Decimals:        18
Max Supply:      10,000,000,000 SEED
Initial Supply:  0 (mint-on-demand)
Transfer Fee:    NONE (clean transfers)
Audit Trail:     YES (reason required on mint)
```

---

## 🔧 Core Design

### 1. Hard Cap Enforcement (Identical to CAPX)

ANGEL uses the same irreversible minting counter:

```solidity
uint256 public totalMinted;    // Total tokens ever minted (never decreases)
uint256 public constant MAX_SUPPLY = 10_000_000_000e18;

// On every mint:
totalMinted += amount;         // Counter increases
require(totalMinted + amount <= MAX_SUPPLY, "Exceeds MAX_SUPPLY");

// When tokens are burned:
totalSupply -= amount;         // Supply decreases
totalMinted stays same         // Counter unchanged
```

**Why?** Ensures hard cap cannot be bypassed through burn-and-remint cycles.

### 2. Clean Transfer Mechanism

Unlike CAPX, ANGEL has **NO transfer fees**:

```javascript
Transfer Example:
┌─────────────────────────────────────────┐
│ transfer(recipient, 1000 SEED)          │
├─────────────────────────────────────────┤
│                                         │
│ ✅ Direct Transfer (No Fees)           │
│ ├─ Sender: -1000 SEED                  │
│ ├─ Recipient: +1000 SEED               │
│ └─ No burn, no treasury fee            │
│                                         │
└─────────────────────────────────────────┘
```

**Advantage:** Maximizes value to community members

### 3. Mandatory Reason Tracking

Every mint operation requires a **reason string** for transparency:

```solidity
event RewardMint(
    address indexed to,
    uint256 amount,
    string reason  // Immutable on-chain record
);
```

**Example Reasons:**
- "Q4 2025 Community Engagement Campaign"
- "Bug Bounty Program - December 2025"
- "Early Adopter Airdrop - Phase 1"
- "Developer Grant - Smart Contract Audit"
- "Partner Integration Reward"

**On-Chain Audit Trail:**
```
Block 12345678:  50,000 SEED → user1.eth | "Early Adopter Bonus"
Block 12345679:  100,000 SEED → user2.eth | "Bug Bounty Winner"
Block 12345680:  75,000 SEED → user3.eth | "Community Moderator"

→ Immutable, transparent, traceable
→ Useful for taxes, compliance, governance
```

---

## 📚 Function Reference

### Read-Only Functions (View/Pure)

#### `name()` → string
Returns the token name.
```solidity
function name() public view override returns (string memory)
```
**Returns:** `"AngleSeed Token"`

#### `symbol()` → string
Returns the token symbol.
```solidity
function symbol() public view override returns (string memory)
```
**Returns:** `"SEED"`

#### `decimals()` → uint8
Returns the number of decimal places.
```solidity
function decimals() public view override returns (uint8)
```
**Returns:** `18`

#### `totalSupply()` → uint256
Returns current circulating supply (decreases if tokens are burned).
```solidity
function totalSupply() public view override returns (uint256)
```
**Example:**
```javascript
const supply = await angel.totalSupply();
console.log(ethers.formatEther(supply)); // "5000000000.0"
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
const balance = await angel.balanceOf(userAddress);
console.log(ethers.formatEther(balance)); // "1000000.5"
```

#### `allowance(owner, spender)` → uint256
Returns amount spender is allowed to transfer on behalf of owner.
```solidity
function allowance(address owner, address spender) 
    public view override returns (uint256)
```
**Parameters:**
- `owner` (address): Token holder
- `spender` (address): Can spend up to this amount

#### `totalMinted` → uint256
Returns total tokens ever minted (never decreases).
```solidity
function totalMinted() public view returns (uint256)
```
**Use Case:** Check remaining mintable supply
```javascript
const minted = await angel.totalMinted();
const maxSupply = await angel.MAX_SUPPLY();
const remaining = maxSupply - minted;
```

#### `MAX_SUPPLY` → uint256
Returns the immutable hard cap (10 Billion tokens).
```solidity
function MAX_SUPPLY() public view returns (uint256)
```
**Returns:** `10000000000000000000000000000` (10B * 10^18)

#### `remainingMintableSupply()` → uint256
Get how many more tokens can be minted before hitting hard cap.
```solidity
function remainingMintableSupply() public view returns (uint256)
```
**Returns:** `MAX_SUPPLY - totalMinted`

**Example:**
```javascript
const remaining = await angel.remainingMintableSupply();
console.log(ethers.formatEther(remaining)); // "5000000000.0"
```

#### `canMint(amount)` → bool
Check if a specific amount can be minted without exceeding cap.
```solidity
function canMint(uint256 amount) public view returns (bool)
```
**Parameters:**
- `amount` (uint256): Amount to check in wei

**Example:**
```javascript
const canMint = await angel.canMint(ethers.parseEther("1000000"));
if (canMint) {
    console.log("Can mint 1M tokens");
} else {
    console.log("Cannot mint 1M tokens - would exceed cap");
}
```

---

### State-Modifying Functions

#### `transfer(recipient, amount)` → bool
Transfer tokens to recipient (NO FEES).

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

**Gas Cost:** ~50,000 gas (no fee calculations)

**Example:**
```javascript
// Transfer 1M SEED to recipient
const tx = await angel.transfer(
    recipientAddress,
    ethers.parseEther("1000000")
);
await tx.wait();

// Recipient receives full amount (no fees)
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
1. Check caller is approved for at least `amount` by sender
2. Decrease allowance
3. Execute transfer
4. Return true

**Example:**
```javascript
// Step 1: Token owner approves spender
await angel.approve(spenderAddress, ethers.parseEther("1000000"));

// Step 2: Spender transfers on behalf of owner
await angel.transferFrom(
    ownerAddress,
    recipientAddress,
    ethers.parseEther("1000000")
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

**Example:**
```javascript
// Approve DEX to swap 1M SEED
await angel.approve(
    dexAddress,
    ethers.parseEther("1000000")
);

// DEX can now call transferFrom up to 1M SEED
```

#### `increaseAllowance(spender, addedValue)` → bool
Safely increase allowance (recommended over `approve`).

```solidity
function increaseAllowance(address spender, uint256 addedValue) 
    public override returns (bool)
```

**Advantages:**
- Prevents race condition
- Adds to existing allowance instead of replacing

**Example:**
```javascript
// Add 500k more to existing approval
await angel.increaseAllowance(spenderAddress, ethers.parseEther("500000"));
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

### Burning Functions

#### `burn(amount)` → bool
Burn tokens from caller's balance (permanently removes from supply).

```solidity
function burn(uint256 amount) public returns (bool)
```

**Effect:**
```
├─ totalSupply -= amount    (decreases)
├─ totalMinted stays same   (unchanged)
└─ Token is destroyed
```

**Example:**
```javascript
// Burn 100k SEED from own balance
const tx = await angel.burn(ethers.parseEther("100000"));
await tx.wait();

// Tokens are permanently destroyed
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

---

### Minting Functions (Role-Based)

#### `rewardMint(to, amount, reason)` → bool
Mint tokens for community rewards with mandatory reason.

```solidity
function rewardMint(
    address to,
    uint256 amount,
    string calldata reason
) external onlyRole(REWARD_MINTER_ROLE) returns (bool)
```

**Parameters:**
- `to` (address): Recipient of minted tokens
- `amount` (uint256): Amount in wei
- `reason` (string): Reason for this mint (immutable audit record)

**Requirements:**
- Caller must have `REWARD_MINTER_ROLE`
- Recipient cannot be zero address
- Amount must be > 0
- Reason string cannot be empty
- `totalMinted + amount` must not exceed `MAX_SUPPLY`

**Emits:** 
- `RewardMint(to, amount, reason)`
- `Transfer(0x0, to, amount)`

**Gas Cost:** ~80,000-100,000 gas (depends on reason string length)

**Example - Single Reward:**
```javascript
// Grant REWARD_MINTER_ROLE first
const REWARD_MINTER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("REWARD_MINTER_ROLE")
);
await angel.grantRole(REWARD_MINTER_ROLE, minterAddress);

// Then mint with reason
const tx = await angel.rewardMint(
    userAddress,
    ethers.parseEther("10000"),  // 10k SEED
    "Early Adopter Bonus - January 2026"
);
await tx.wait();

// Tokens minted, reason recorded on-chain
```

#### `batchRewardMint(recipients, amounts, reason)` → bool
Efficiently mint tokens to multiple recipients with single reason.

```solidity
function batchRewardMint(
    address[] calldata recipients,
    uint256[] calldata amounts,
    string calldata reason
) external onlyRole(REWARD_MINTER_ROLE) returns (bool)
```

**Parameters:**
- `recipients` (address[]): Array of recipient addresses
- `amounts` (uint256[]): Array of amounts (must match recipients length)
- `reason` (string): Shared reason for all mints

**Requirements:**
- Caller must have `REWARD_MINTER_ROLE`
- `recipients.length == amounts.length` (same size arrays)
- All recipients cannot be zero
- All amounts must be > 0
- Reason string cannot be empty
- Total amount + `totalMinted` must not exceed `MAX_SUPPLY`

**Emits:** 
- `RewardMint(recipient, amount, reason)` for each recipient
- `Transfer(0x0, recipient, amount)` for each mint

**Gas Cost:** ~150,000-300,000 gas (scales with number of recipients)

**Example - Batch Distribution:**
```javascript
// Distribute rewards to 10 users in one transaction
const recipients = [
    "0xaddress1",
    "0xaddress2",
    "0xaddress3",
    // ... 7 more addresses
];

const amounts = [
    ethers.parseEther("1000"),   // user1 gets 1k
    ethers.parseEther("2000"),   // user2 gets 2k
    ethers.parseEther("1500"),   // user3 gets 1.5k
    // ... corresponding amounts
];

const tx = await angel.batchRewardMint(
    recipients,
    amounts,
    "Bug Bounty Program - December 2025"
);

// Batch minting complete with single reason recorded
```

**Advantages of Batch:**
- ✅ Single transaction (lower gas than 10 separate txs)
- ✅ Single reason for related distributions
- ✅ Atomic (all succeed or all fail, no partial minting)

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
- Burning is allowed
- Supply can still decrease

**When to Use:**
- Security vulnerability
- Smart contract exploit
- Regulatory requirement
- Emergency maintenance

#### `unpause()` → void
Resume normal operations after pause.

```solidity
function unpause() external onlyRole(PAUSER_ROLE)
```

---

## 🔐 Access Control

### Role-Based Permissions

| Role | Keccak256 Hash | Permissions | Use |
|------|---------------|------------|-----|
| `DEFAULT_ADMIN_ROLE` | `0x00...00` | Manage all roles | Gnosis Safe |
| `REWARD_MINTER_ROLE` | `keccak256("REWARD_MINTER_ROLE")` | `rewardMint()`, `batchRewardMint()` | Distribution |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | `pause()`, `unpause()` | Emergency |

### Role Management

```solidity
// Grant role to address
grantRole(role, account)

// Revoke role from address
revokeRole(role, account)

// Check if has role
hasRole(role, account) -> bool
```

**Example - Setup:**
```javascript
const REWARD_MINTER = ethers.keccak256(
    ethers.toUtf8Bytes("REWARD_MINTER_ROLE")
);
const PAUSER = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

// Grant roles (from admin)
await angel.grantRole(REWARD_MINTER, rewardsDistributorAddress);
await angel.grantRole(PAUSER, emergencyMultisigAddress);
```

---

## 📋 Minting System

### Single vs. Batch Minting

#### Single Minting Use Cases

Use `rewardMint()` when:
- Awarding individual prizes
- One-off distributions
- Immediate needs
- Small rewards

```javascript
await angel.rewardMint(
    winnerAddress,
    ethers.parseEther("5000"),
    "Hackathon Prize Winner"
);
```

#### Batch Minting Use Cases

Use `batchRewardMint()` when:
- Periodic distributions (monthly, quarterly)
- Airdrop campaigns
- Reward distribution events
- Multiple recipients with same reason
- Gas efficiency needed

```javascript
await angel.batchRewardMint(
    [user1, user2, user3, user4, user5],
    [1000, 2000, 1500, 3000, 2500].map(x => ethers.parseEther(x.toString())),
    "Q4 Community Engagement Rewards"
);
```

### Reason String Examples

```javascript
// Event-based
"Mainnet Launch Celebration"
"First 100 Users Bonus"

// Campaign-based
"August 2026 Airdrop - Early Supporters"
"Bug Bounty Program Q4 2025"

// Role-based
"Community Moderator Monthly Stipend"
"Developer Grant - Smart Contract Audit"
"Ambassador Onboarding Bonus"

// Partner-based
"Chainlink Integration Reward"
"Uniswap LP Incentive - December 2025"
"Strategic Partner Distribution"
```

---

## 📊 Audit Trail & Compliance

### On-Chain Record Keeping

Every mint operation creates an immutable on-chain record:

```solidity
event RewardMint(
    address indexed to,
    uint256 amount,
    string reason  // Stored on-chain
);
```

### Querying Mint History

```javascript
// Get all RewardMint events
const filter = angel.filters.RewardMint();
const events = await angel.queryFilter(filter);

// Analyze
events.forEach(event => {
    console.log(`
        Recipient: ${event.args.to}
        Amount: ${ethers.formatEther(event.args.amount)} SEED
        Reason: ${event.args.reason}
        Block: ${event.blockNumber}
        Tx: ${event.transactionHash}
    `);
});
```

### Compliance Benefits

- ✅ **Tax Reporting:** Immutable distribution records
- ✅ **Governance:** Transparent reward history
- ✅ **Audits:** Complete distribution trail
- ✅ **Disputes:** Provable on-chain records
- ✅ **Fairness:** No hidden distributions

---

## 🚀 Usage Examples

### Example 1: Setup After Deployment

```javascript
const angel = new ethers.Contract(ANGEL_ADDRESS, ANGEL_ABI, admin);

// Define role
const REWARD_MINTER = ethers.keccak256(
    ethers.toUtf8Bytes("REWARD_MINTER_ROLE")
);

// Grant minter role
await angel.grantRole(REWARD_MINTER, REWARDS_DISTRIBUTOR_ADDRESS);

console.log("✅ ANGEL setup complete");
```

### Example 2: Single Reward Distribution

```javascript
const angel = new ethers.Contract(ANGEL_ADDRESS, ANGEL_ABI, rewardMinter);

// Award single user
const tx = await angel.rewardMint(
    userAddress,
    ethers.parseEther("10000"),
    "Community Contribution - February 2026"
);

await tx.wait();
console.log("✅ Reward minted successfully");
```

### Example 3: Batch Airdrop Campaign

```javascript
// Define recipients and amounts (from CSV/database)
const winners = [
    { address: "0x123...", amount: "5000", reason: "Q4 Campaign" },
    { address: "0x456...", amount: "3000", reason: "Q4 Campaign" },
    { address: "0x789...", amount: "7000", reason: "Q4 Campaign" },
    // ... 97 more entries
];

// Prepare arrays
const recipients = winners.map(w => w.address);
const amounts = winners.map(w => ethers.parseEther(w.amount));
const reason = "Q4 2025 Community Engagement Campaign";

// Execute batch mint
const tx = await angel.batchRewardMint(recipients, amounts, reason);
await tx.wait();

const totalMinted = amounts.reduce((a, b) => a + b, 0n);
console.log(`✅ Minted ${ethers.formatEther(totalMinted)} SEED to ${recipients.length} users`);
```

### Example 4: Check Remaining Supply

```javascript
const remaining = await angel.remainingMintableSupply();
const currentSupply = await angel.totalSupply();
const maxSupply = await angel.MAX_SUPPLY();

console.log(`
    Current Supply: ${ethers.formatEther(currentSupply)} SEED
    Max Supply: ${ethers.formatEther(maxSupply)} SEED
    Remaining: ${ethers.formatEther(remaining)} SEED
    Utilization: ${(100 * (1 - Number(remaining) / Number(maxSupply))).toFixed(2)}%
`);
```

### Example 5: Verify Mint Capacity

```javascript
// Check if 1 million tokens can be minted
const canMint = await angel.canMint(ethers.parseEther("1000000"));

if (canMint) {
    const tx = await angel.rewardMint(
        addressList[0],
        ethers.parseEther("1000000"),
        "Large Distribution"
    );
} else {
    console.log("Cannot mint 1M - would exceed cap");
}
```

---

## 📊 State Variables Summary

```solidity
// Token metadata
string public name                    // "AngleSeed Token"
string public symbol                  // "SEED"
uint8 public decimals                 // 18
uint256 public constant MAX_SUPPLY    // 10,000,000,000e18

// Supply tracking
uint256 public totalSupply            // Current circulating
uint256 public totalMinted            // Total ever minted

// Balances & allowances
mapping(address => uint256) public balanceOf
mapping(address => mapping(address => uint256)) public allowance

// Pause status
bool public paused
```

---

## ⚠️ Important Notes

### 1. Reason String is Permanent

```javascript
// This is RECORDED ON-CHAIN and IMMUTABLE
await angel.rewardMint(
    user,
    ethers.parseEther("10000"),
    "Q4 2025 Community Campaign"  // ← This is forever
);

// Cannot be deleted or changed
// It's part of the immutable transaction history
```

### 2. Batch Minting is Atomic

```javascript
// Either ALL mints succeed or ALL fail
// No partial batch minting possible

// If adding 6th address exceeds hard cap:
// ALL 6 mints are rejected (not just the 6th)
```

### 3. Hard Cap Cannot Be Increased

```javascript
// MAX_SUPPLY is immutable
// Cannot be modified, not even by admin

// Once 10B minted, no more can ever be minted
// Plan carefully for supply needs
```

### 4. Batch Requires Matching Arrays

```javascript
// MUST have same length
recipients.length === amounts.length  // Required

// This will revert:
await batchRewardMint([addr1, addr2, addr3], [100, 200], "reason");
// recipients.length = 3, amounts.length = 2 → ERROR
```

---

## 💡 Best Practices

### For Distributions

1. **Group Related Rewards:** Use batch minting for campaigns
2. **Descriptive Reasons:** Include date and purpose
3. **Audit Trail:** Review events regularly
4. **Capacity Planning:** Monitor remaining supply
5. **Documentation:** Keep external records of decisions

### For Security

1. **Restricted Roles:** Only trusted entities as `REWARD_MINTER_ROLE`
2. **Multisig Admin:** Use Gnosis Safe for `DEFAULT_ADMIN_ROLE`
3. **Emergency Pause:** Set up `PAUSER_ROLE` on multisig
4. **Monitoring:** Alert on large mints or reason changes
5. **Testing:** Test batch minting with max array sizes

---

**Last Updated:** January 4, 2026  
**Version:** 1.0.0  
**Audience:** Developers, Community Managers, Auditors, Operations
