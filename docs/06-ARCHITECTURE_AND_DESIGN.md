# 🏗️ Architecture & System Design

Comprehensive overview of CAPShield smart contract architecture, design patterns, and interactions.

---

## 📖 Table of Contents

- [System Overview](#system-overview)
- [Contract Architecture](#contract-architecture)
- [Design Patterns](#design-patterns)
- [Token Flow](#token-flow)
- [Integration Points](#integration-points)
- [Data Flow](#data-flow)
- [Scalability](#scalability)

---

## 🎯 System Overview

CAPShield is a **modular, role-based token ecosystem** consisting of:

```
┌─────────────────────────────────────────────────────────────┐
│                   CAPShield Ecosystem                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐ │
│  │    CAPX      │      │    ANGEL     │      │TokenVesting│ │
│  │   (Shield)   │      │  (Reward)    │      │ (Unlock)   │ │
│  └──────┬───────┘      └──────┬───────┘      └─────┬──────┘ │
│         │                     │                    │         │
│         ├─────────────────────┴────────────────────┤         │
│         │                                          │         │
│         ▼                                          ▼         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Multisig Admin (Gnosis Safe)              │   │
│  │    ┌─ Role-Based Access Control (RBAC)         │   │
│  │    ├─ DEFAULT_ADMIN_ROLE (full control)        │   │
│  │    ├─ TEAM_MINTER_ROLE (team allocation)       │   │
│  │    ├─ TREASURY_MINTER_ROLE (treasury ops)      │   │
│  │    ├─ DAO_MINTER_ROLE (DAO governance)         │   │
│  │    ├─ REWARD_MINTER_ROLE (community rewards)   │   │
│  │    ├─ VESTING_ADMIN_ROLE (vesting schedules)   │   │
│  │    └─ PAUSER_ROLE (emergency stop)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Key Features:                                                │
│  ✅ Irreversible hard caps                                   │
│  ✅ Deflationary mechanics (CAPX)                            │
│  ✅ Fee exemptions (for vesting)                             │
│  ✅ Emergency controls                                       │
│  ✅ Transparent audit trails                                 │
│  ✅ Efficient batch operations                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏛️ Contract Architecture

### 1. CAPX Token Contract

**Purpose:** Protocol Shield Token with deflationary mechanics

**Dependencies:**
- OpenZeppelin ERC20
- OpenZeppelin AccessControl
- OpenZeppelin Pausable

**Key State:**
```solidity
uint256 public totalMinted;           // Hard cap enforcement
uint256 public constant MAX_SUPPLY;   // 100 Million (immutable)
mapping public isExemptFromFees;      // Fee bypass list
address public treasuryAddress;       // Receives fees
address public daoAddress;            // Exempt from fees
```

**Critical Functions:**
```solidity
// Minting (role-based)
teamMint()         → TEAM_MINTER_ROLE
treasuryMint()     → TREASURY_MINTER_ROLE
daoMint()          → DAO_MINTER_ROLE
revenueMint()      → TREASURY_MINTER_ROLE (with formula)

// Transfers (with 2% fee)
transfer()         → applies fees unless exempt
transferFrom()     → applies fees unless exempt

// Admin
setExemption()     → DEFAULT_ADMIN_ROLE
updateTreasuryAddress() → DEFAULT_ADMIN_ROLE
updateDAOAddress() → DEFAULT_ADMIN_ROLE

// Emergency
pause()            → PAUSER_ROLE
unpause()          → PAUSER_ROLE
```

### 2. ANGEL Token Contract

**Purpose:** Community Reward Token with transparent distributions

**Dependencies:**
- OpenZeppelin ERC20
- OpenZeppelin AccessControl
- OpenZeppelin Pausable
- OpenZeppelin ERC20Burnable

**Key State:**
```solidity
uint256 public totalMinted;           // Hard cap enforcement
uint256 public constant MAX_SUPPLY;   // 10 Billion (immutable)
```

**Critical Functions:**
```solidity
// Minting (with mandatory reason)
rewardMint()       → REWARD_MINTER_ROLE + reason
batchRewardMint()  → REWARD_MINTER_ROLE + reason

// Transfers (no fees)
transfer()         → direct transfer, 100% to recipient
transferFrom()     → direct transfer, 100% to recipient

// Emergency
pause()            → PAUSER_ROLE
unpause()          → PAUSER_ROLE
```

### 3. TokenVesting Contract

**Purpose:** Advanced token vesting with LINEAR/STEP schedules

**Dependencies:**
- OpenZeppelin AccessControl
- OpenZeppelin Pausable
- OpenZeppelin ReentrancyGuard
- OpenZeppelin SafeERC20

**Key State:**
```solidity
struct VestingSchedule {
    address beneficiary;
    address token;           // Can be any ERC20
    uint256 startTime;
    uint256 cliffTime;
    uint256 duration;
    uint256 amount;
    bool revocable;
    VestingType vestingType; // LINEAR or STEP
    bool revoked;
}

VestingSchedule[] public vestingSchedules;
mapping public claimedAmounts;
```

**Critical Functions:**
```solidity
// Creation
createVestingSchedule()     → VESTING_ADMIN_ROLE
batchCreateVestingSchedules() → VESTING_ADMIN_ROLE

// Claiming
claim()                     → Any account
batchClaim()                → Any account

// Admin
revokeVesting()             → VESTING_ADMIN_ROLE
pauseVesting()              → PAUSER_ROLE
unpauseVesting()            → PAUSER_ROLE
```

### 4. MockAdmin Contract (Testing Only)

**Purpose:** Simulates multisig wallet for testing

**Usage:**
- ✅ Testnet deployments
- ✅ Local development
- ❌ NEVER mainnet with real funds

**Functions:**
- Proxy calls to admin functions
- Manages role assignments
- Tests multisig scenarios

---

## 🎨 Design Patterns

### 1. Role-Based Access Control (RBAC)

```solidity
// Instead of:
require(msg.sender == owner, "Only owner");

// Use role-based:
require(hasRole(ADMIN_ROLE, msg.sender), "Requires admin");

// Benefits:
// ✅ Multiple administrators
// ✅ Granular permissions
// ✅ Easy delegation
// ✅ No single point of failure
```

### 2. Hard Cap via Counter (Not Callback)

```solidity
// Problem with burns:
// ├─ Mint 100M → supply = 100M
// └─ Burn 50M → supply = 50M
//    Can now mint 50M more! (bypasses hard cap)

// Solution - Irreversible counter:
uint256 public totalMinted;  // Tracks all mints
// ├─ Mint 100M → totalMinted = 100M
// └─ Burn 50M → totalMinted stays 100M
//    Cannot mint more (cap enforced)

// Check: totalMinted + newAmount <= MAX_SUPPLY
```

### 3. Fee Exemption System

```solidity
// Instead of hardcoding addresses:
if (from == treasury || from == dao) {
    // apply no fee
}

// Use mappings:
mapping(address => bool) public isExemptFromFees;

// Benefits:
// ✅ Dynamic exemption list
// ✅ Can add vesting contracts
// ✅ Can add exchanges/bridges
// ✅ No redeployment needed
```

### 4. Hooks for Complex Logic

```solidity
// ERC20 transfer hooks:
_beforeTokenTransfer(from, to, amount) {
    // Calculate and apply fees
    // Validate pause state
    // Check exemptions
}

_afterTokenTransfer(from, to, amount) {
    // Emit events
    // Update accounting
}
```

### 5. Batch Operations for Efficiency

```solidity
// Instead of:
for (let i = 0; i < 100; i++) {
    await mint(recipients[i], amounts[i]);  // 100 txs, 100x gas
}

// Use batch:
await batchMint(recipients, amounts);  // 1 tx, 1x gas
// - Atomic (all or nothing)
// - 50-70% gas savings
// - Safer (no partial states)
```

---

## 💱 Token Flow Diagrams

### Flow 1: CAPX Transfer with Fees

```
Alice Transfer 100 CAPX to Bob
│
├─ (Alice NOT exempt)
│
├─→ Calculate Fees:
│   ├─ Burn: 1 CAPX (1%)
│   └─ Treasury: 1 CAPX (1%)
│
├─→ Execute Transfer:
│   ├─ Burn(1) → totalSupply -= 1
│   ├─ Transfer(1) → treasury
│   └─ Transfer(98) → Bob
│
└─→ Result:
    ├─ Alice: -100
    ├─ Bob: +98
    ├─ Treasury: +1
    ├─ Burned: 1
    └─ totalSupply: -1

(If Alice is exempt, Bob gets 100, no fees)
```

### Flow 2: ANGEL Distribution

```
Admin Batch Distribute 100k SEED to 10 users
│
├─→ Check totalMinted + 100k <= MAX_SUPPLY
│
├─→ For each recipient:
│   ├─ Mint tokens
│   ├─ Record in mapping
│   └─ Emit event with reason
│
└─→ Result:
    ├─ totalSupply: +100k
    ├─ totalMinted: +100k
    ├─ 10 users each get their allocation
    └─ Audit trail: "Q4 Campaign - 100k SEED to 10 users"
```

### Flow 3: TokenVesting Lifecycle

```
Create Vesting Schedule
│
├─→ Input:
│   ├─ Beneficiary: 0xuser
│   ├─ Token: CAPX
│   ├─ Amount: 100k
│   ├─ Duration: 365 days
│   ├─ Cliff: 90 days
│   └─ Type: LINEAR
│
├─→ On Creation:
│   ├─ Transfer 100k CAPX from admin to vesting contract
│   ├─ Store schedule parameters
│   └─ Start clock
│
├─→ Days 1-89 (Cliff):
│   └─ Vested amount: 0 tokens
│       (Cannot claim yet)
│
├─→ Days 90-365 (Linear Unlock):
│   ├─ Day 90:   0 tokens vested
│   ├─ Day 180:  ~36% vested (~36k)
│   ├─ Day 270:  ~73% vested (~73k)
│   └─ Day 365:  100% vested (100k)
│
├─→ User Claiming:
│   ├─ Day 100: Can claim 2.7k (vested since cliff)
│   ├─ Day 200: Can claim additional 33.3k
│   └─ Day 365: Can claim final 63.7k
│
└─→ End:
    ├─ All 100k claimed and transferred to user
    ├─ Schedule marked as complete
    └─ Cannot claim again (double-claim prevention)
```

---

## 🔗 Integration Points

### External Integrations

```
┌─────────────────────────────────────────────────┐
│         CAPShield Smart Contracts               │
├─────────────────────────────────────────────────┤
│                                                  │
│  ▼                    ▼                    ▼     │
│  └─ DEX Integration   └─ Bridge           └─ DAO│
│     (Uniswap, etc)       (Portal)            (Governance)
│
├─────────────────────────────────────────────────┤
│                                                  │
│  Can integrate with:                            │
│  ✅ Any ERC20-compatible DEX                    │
│  ✅ Cross-chain bridges                         │
│  ✅ Lending protocols                           │
│  ✅ NFT marketplaces                            │
│  ✅ DAO governance                              │
│                                                  │
└─────────────────────────────────────────────────┘
```

### API Hooks

```javascript
// External actors can:
call transfer()        // Move tokens
call approve()         // Enable spending
call claim()           // Claim vested tokens
listen to events       // Track activities

// Contract emits:
Transfer              // Standard ERC20
Approval              // Standard ERC20
RewardMint            // Custom (reason tracking)
VestingScheduleCreated // Custom
TokensClaimed         // Custom
```

---

## 📊 Data Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│              USER/EXTERNAL INTERACTION                │
├──────────────────────────────────────────────────────┤
│                                                       │
│  1. CAPX Transfer                                    │
│     User → transfer(recipient, 100) ──→ Contract   │
│     Contract: Apply 2% fee logic                    │
│     Blockchain: Update balances                     │
│     Event: Emit Transfer(user, recipient, 98)      │
│                                                     │
│  2. ANGEL Distribution                             │
│     Admin → batchRewardMint([users], [amounts], "reason")
│     Contract: Mint tokens, track reason            │
│     Blockchain: Update balances, log events        │
│     Event: Emit RewardMint for each user           │
│                                                     │
│  3. Vesting Claim                                  │
│     User → claim(beneficiary, token, scheduleId)  │
│     Contract: Calculate vested amount              │
│     Check: Not already claimed, cliff reached      │
│     Blockchain: Transfer tokens to user            │
│     Event: Emit TokensClaimed                      │
│                                                     │
└──────────────────────────────────────────────────────┘
```

---

## 🚀 Scalability Considerations

### Current Limitations

1. **Batch Size:** Limited by gas (typically 50-100 recipients per batch)
2. **Schedule Count:** No hard limit, but querying gets slow after 1000+
3. **Storage:** On-chain storage costs scale with data volume

### Optimization Strategies

```javascript
// Batch Operations
batchMint(recipients, amounts)  // 1 tx instead of N
batchClaim(scheduleIds)         // 1 tx instead of N

// Off-Chain Computation
// Calculate before submitting (vesting amounts, etc)

// Pagination
getSchedulesByBeneficiary(start, limit)  // Avoid loading all

// Event Querying
// Use events for history instead of looping storage
```

### Future Scalability

To scale beyond current limits:

1. **L2 Deployment:** Deploy on Arbitrum, Optimism (cheaper)
2. **Batch Processor:** Off-chain service for distributions
3. **Graph Indexing:** Use The Graph for querying
4. **Merkle Trees:** For large airdrops (if needed)

---

## 🔒 Security Architecture

### Multi-Layer Protection

```
Layer 1: Access Control
├─ Role-based permissions
├─ Multisig admin
└─ No single owner

Layer 2: Contract Logic
├─ Pausable emergency stop
├─ ReentrancyGuard on claims
├─ SafeERC20 interactions
└─ Input validation

Layer 3: Blockchain
├─ Immutable on-chain record
├─ Gas cost for attacks
└─ Public transparency
```

---

**Last Updated:** January 4, 2026  
**Version:** 1.0.0  
**Audience:** Architects, Senior Developers, Auditors
