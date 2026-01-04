# 💎 TokenVesting - Complete Technical Guide

**Contract:** `contracts/TokenVesting.sol`  
**Purpose:** Advanced token vesting and claim system  
**Supported Vesting Types:** LINEAR, STEP

---

## 📖 Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Function Reference](#function-reference)
- [Access Control](#access-control)
- [Vesting Types](#vesting-types)
- [Events](#events)
- [Usage Examples](#usage-examples)

---

## 🎯 Overview

TokenVesting is a **flexible, production-ready vesting contract** that allows:

- **Flexible Schedules:** LINEAR (continuous) or STEP (interval-based) unlocking
- **Cliff Periods:** No tokens available until cliff date
- **Batch Operations:** Create/revoke multiple schedules efficiently
- **Revocable Schedules:** Admin can cancel vesting and reclaim tokens
- **Automatic Calculations:** Compute vested amounts based on schedule
- **Double-Claim Prevention:** Beneficiaries cannot claim twice
- **Integration Ready:** Works with any ERC20 token (CAPX, ANGEL, etc.)

### Key Features

✅ **Two Vesting Types:** LINEAR and STEP  
✅ **Cliff Support:** Delay token availability  
✅ **Batch Operations:** Multi-schedule management  
✅ **Revocable:** Admin can cancel and recover tokens  
✅ **Pausable:** Emergency stop mechanism  
✅ **Event-Rich:** Full transparency and tracking  
✅ **ReentrancyGuard:** Protected against reentrancy attacks  
✅ **SafeERC20:** Safe token interactions  

---

## 🔧 Core Concepts

### 1. Vesting Schedule Structure

```solidity
struct VestingSchedule {
    address beneficiary;      // Who receives tokens
    address token;            // Which token (CAPX, ANGEL, etc)
    uint256 startTime;        // When vesting starts
    uint256 cliffTime;        // When tokens first unlock
    uint256 duration;         // Total vesting duration (seconds)
    uint256 amount;           // Total tokens to vest
    bool revocable;           // Can be cancelled by admin
    VestingType vestingType;  // LINEAR or STEP
    uint256 intervalCount;    // For STEP: number of intervals (if applicable)
    bool revoked;             // Has been revoked
}
```

### 2. Vesting Timeline

```
Timeline (Linear Vesting Example):
┌────────────────────────────────────────────┐
│         VESTING TIMELINE                    │
├────────────────────────────────────────────┤
│                                            │
│  T0: startTime                             │
│  |                                         │
│  |-------- CLIFF PERIOD --------| T1: cliffTime
│  |  (0% available)              |
│  |                              | <-- First tokens unlock
│  |                              |
│  T1: cliffTime                  T2: endTime (startTime + duration)
│  |                              |
│  |===== LINEAR VESTING =========|
│  |     (continuous unlock)      |
│  |  vested % increases linearly |
│  | from 0% to 100%              |
│  |                              |
│  └──────────────────────────────┘
```

### 3. Vesting Types

#### LINEAR Vesting
Continuous, linear token unlock over duration:

```javascript
Vesting 1000 tokens over 365 days with 90-day cliff:

// Day 0-90 (Cliff): 0 tokens available
// Day 90 (Cliff ends): 0 tokens still (at cliff boundary)
// Day 91: ~2.74 tokens available (1000 / 275 days)
// Day 180: ~247.7 tokens (90 days of linear vesting)
// Day 365: ~1000 tokens (fully vested)

Formula:
vestedAmount = (elapsedSinceCliff / remainingDuration) * totalAmount

Graph:
Tokens ▲
  1000 |                           ___╱
       |                      ___╱   (vesting accelerates after cliff)
       |                 ___╱
       |            ___╱
       |       ___╱
       |  ___╱
     0 |___________________________
       0      90            180   365  Days
       └─ No unlock ─┼─ Continuous unlock ─┘
         (Cliff)      (Linear vesting)
```

#### STEP Vesting
Token unlock in discrete intervals:

```javascript
Vesting 1000 tokens in 4 steps (quarterly) over 12 months:

// Each step (quarter) unlocks: 1000 / 4 = 250 tokens
// Q1 (Month 3): 250 tokens unlock
// Q2 (Month 6): 250 tokens unlock
// Q3 (Month 9): 250 tokens unlock
// Q4 (Month 12): 250 tokens unlock

Timeline:
Tokens ▲
  1000 |                      ___
       |                  ___║
       |              ___║
       |          ___║
       |      ___║
     0 |___|╱___|╱___|╱___|╱___
       0    3    6    9   12  Months
       └─ Step intervals ─┘
         (250 tokens each)
```

### 4. Cliff Mechanics

```javascript
Cliff Examples:

// Example 1: 12-month vesting with 3-month cliff
startTime: Day 0
cliffTime: Day 90
duration: 365 days
endTime: Day 365

Day 0-89:     vestedAmount = 0 (cliff not reached)
Day 90+:      vestedAmount > 0 (cliff passed, vesting begins)

// Example 2: Vesting with no cliff
startTime: Day 0
cliffTime: Day 0 (cliff = start)
duration: 365 days

Day 0+:       vestedAmount > 0 (immediate vesting)
```

### 5. Revocation Mechanics

```javascript
Revocation Example:

Schedule:
├─ Created: 1000 CAPX vesting
├─ Revocable: YES
├─ Day 180: User claims 400 CAPX (vested amount)
├─ Day 200: Admin revokes schedule
└─ Day 300: Remaining 600 CAPX returned to admin

Process:
1. Admin calls revokeVesting()
2. Schedule marked as revoked
3. Unclaimed vested tokens sent to beneficiary
4. Unvested tokens returned to creator
5. No more claims possible
```

---

## 📚 Function Reference

### Read-Only Functions

#### `getVestingSchedule(id)` → VestingSchedule
Retrieve complete vesting schedule by ID.

```solidity
function getVestingSchedule(uint256 scheduleId) 
    external view returns (VestingSchedule memory)
```

**Parameters:**
- `scheduleId` (uint256): Schedule ID

**Returns:** Full `VestingSchedule` struct

**Example:**
```javascript
const schedule = await vesting.getVestingSchedule(scheduleId);
console.log(`
    Beneficiary: ${schedule.beneficiary}
    Token: ${schedule.token}
    Amount: ${ethers.formatEther(schedule.amount)} tokens
    Type: ${schedule.vestingType === 0 ? 'LINEAR' : 'STEP'}
    Revocable: ${schedule.revocable}
`);
```

#### `getVestingScheduleCount()` → uint256
Get total number of vesting schedules created.

```solidity
function getVestingScheduleCount() external view returns (uint256)
```

**Returns:** Total schedules

**Use Case:** Pagination, overview

#### `computeVestedAmount(id)` → uint256
Calculate currently vested tokens for a schedule.

```solidity
function computeVestedAmount(uint256 scheduleId) 
    external view returns (uint256)
```

**Returns:** Amount of tokens that have vested (can be claimed)

**Calculation:**
```
If current time < cliffTime:
  vestedAmount = 0

If schedule revoked:
  vestedAmount = 0

For LINEAR:
  vestedAmount = (elapsedSinceCliff / totalDuration) * totalAmount

For STEP:
  vestedAmount = (completedSteps / totalSteps) * totalAmount
```

**Example:**
```javascript
const vested = await vesting.computeVestedAmount(scheduleId);
console.log(`Vested: ${ethers.formatEther(vested)} tokens available`);

// Check against total
const schedule = await vesting.getVestingSchedule(scheduleId);
const percentage = (Number(vested) / Number(schedule.amount)) * 100;
console.log(`Progress: ${percentage.toFixed(2)}%`);
```

#### `getVestingSchedulesForBeneficiary(beneficiary)` → uint256[]
Get all schedule IDs for a beneficiary.

```solidity
function getVestingSchedulesForBeneficiary(address beneficiary) 
    external view returns (uint256[] memory)
```

**Parameters:**
- `beneficiary` (address): User address

**Returns:** Array of schedule IDs

**Use Case:** User dashboard, multiple vesting schedules

**Example:**
```javascript
const scheduleIds = await vesting.getVestingSchedulesForBeneficiary(userAddress);
console.log(`User has ${scheduleIds.length} vesting schedules`);

// Get details for each
for (const scheduleId of scheduleIds) {
    const schedule = await vesting.getVestingSchedule(scheduleId);
    const vested = await vesting.computeVestedAmount(scheduleId);
    const claimed = schedule.claimed || 0;
    const remaining = BigInt(schedule.amount) - claimed;
    
    console.log(`
        Schedule ${scheduleId}:
        Token: ${schedule.token}
        Vested: ${ethers.formatEther(vested)}
        Remaining: ${ethers.formatEther(remaining)}
    `);
}
```

#### `getClaimedAmount(beneficiary, token, scheduleId)` → uint256
Get amount already claimed for a schedule.

```solidity
function getClaimedAmount(address beneficiary, address token, uint256 scheduleId) 
    external view returns (uint256)
```

**Returns:** Tokens already claimed

**Example:**
```javascript
const claimed = await vesting.getClaimedAmount(userAddress, tokenAddress, scheduleId);
const vested = await vesting.computeVestedAmount(scheduleId);
const available = vested - claimed;

console.log(`
    Vested: ${ethers.formatEther(vested)}
    Claimed: ${ethers.formatEther(claimed)}
    Available: ${ethers.formatEther(available)}
`);
```

---

### State-Modifying Functions

#### `createVestingSchedule(params)` → uint256
Create a new vesting schedule.

```solidity
function createVestingSchedule(
    address token,
    address beneficiary,
    uint256 startTime,
    uint256 cliffTime,
    uint256 duration,
    uint256 amount,
    bool revocable,
    VestingType vestingType
) external onlyRole(VESTING_ADMIN_ROLE) returns (uint256)
```

**Parameters:**
- `token` (address): ERC20 token to vest (CAPX, ANGEL, etc.)
- `beneficiary` (address): Who receives vested tokens
- `startTime` (uint256): Vesting start timestamp
- `cliffTime` (uint256): When tokens first unlock
- `duration` (uint256): Total vesting duration in seconds
- `amount` (uint256): Total tokens to vest
- `revocable` (bool): Can admin cancel this vesting?
- `vestingType` (enum): `0` for LINEAR, `1` for STEP

**Requirements:**
- Caller has `VESTING_ADMIN_ROLE`
- `beneficiary` is not zero address
- `amount > 0`
- `cliffTime >= startTime`
- `duration > 0`
- Admin has approved enough tokens for transfer
- Contract is not paused

**Returns:** New schedule ID

**Gas Cost:** ~200,000 gas (includes token transfer)

**Example - LINEAR Vesting:**
```javascript
// Create 12-month LINEAR vesting with 3-month cliff
// Vesting 100k CAPX starting now

const now = Math.floor(Date.now() / 1000);
const startTime = now;
const cliffTime = now + (90 * 24 * 60 * 60);  // 90 days
const duration = 365 * 24 * 60 * 60;           // 365 days

const tx = await vesting.createVestingSchedule(
    capxAddress,                                // token
    beneficiaryAddress,                         // beneficiary
    startTime,                                  // startTime
    cliffTime,                                  // cliffTime
    duration,                                   // duration (365 days)
    ethers.parseEther("100000"),               // amount (100k CAPX)
    true,                                       // revocable
    0                                           // LINEAR
);

const receipt = await tx.wait();
const scheduleId = /* parsed from receipt */;
console.log(`✅ Created vesting schedule #${scheduleId}`);
```

**Example - STEP Vesting:**
```javascript
// Create quarterly STEP vesting
// 4 steps over 12 months, 25k ANGEL per quarter

const now = Math.floor(Date.now() / 1000);
const quarterDuration = 90 * 24 * 60 * 60;      // 90 days per quarter

const tx = await vesting.createVestingSchedule(
    angelAddress,                               // token
    beneficiaryAddress,                         // beneficiary
    now,                                        // startTime (immediate)
    now,                                        // cliffTime (no cliff)
    4 * quarterDuration,                       // duration (4 quarters)
    ethers.parseEther("100000"),               // amount (100k ANGEL)
    false,                                      // non-revocable
    1                                           // STEP
);
```

#### `claim(beneficiary, token, scheduleId)` → uint256
Claim vested tokens from a vesting schedule.

```solidity
function claim(address beneficiary, address token, uint256 scheduleId) 
    external nonReentrant returns (uint256)
```

**Parameters:**
- `beneficiary` (address): Who is claiming (usually msg.sender)
- `token` (address): Token being vested
- `scheduleId` (uint256): Schedule ID

**Returns:** Amount of tokens transferred to beneficiary

**Requirements:**
- Schedule must exist
- Schedule must not be revoked
- Caller must be beneficiary or authorized
- Vesting cliff must be reached
- Amount vested > amount already claimed
- Contract has sufficient token balance
- Contract is not paused

**Reverts If:**
- Already claimed all vested tokens
- Cliff not yet reached
- No tokens available to claim

**Gas Cost:** ~150,000 gas

**Example:**
```javascript
const tx = await vesting.claim(
    beneficiaryAddress,
    capxAddress,
    scheduleId
);

const receipt = await tx.wait();

// Check amount transferred
const schedule = await vesting.getVestingSchedule(scheduleId);
const claimed = await vesting.getClaimedAmount(beneficiaryAddress, capxAddress, scheduleId);
console.log(`✅ Claimed ${ethers.formatEther(claimed)} tokens`);
```

#### `batchCreateVestingSchedules(params[])` → uint256[]
Create multiple vesting schedules in one transaction.

```solidity
function batchCreateVestingSchedules(CreateVestingParams[] calldata params) 
    external onlyRole(VESTING_ADMIN_ROLE) returns (uint256[] memory)
```

**Parameters:**
- `params` (array): Array of schedule creation parameters

**Returns:** Array of created schedule IDs

**Advantages:**
- ✅ Lower gas than individual calls
- ✅ Atomic (all succeed or all fail)
- ✅ Efficient for bulk distributions

**Example:**
```javascript
const schedules = [
    {
        token: capxAddress,
        beneficiary: user1,
        startTime: now,
        cliffTime: now + (90 * day),
        duration: 365 * day,
        amount: ethers.parseEther("100000"),
        revocable: true,
        vestingType: 0  // LINEAR
    },
    {
        token: capxAddress,
        beneficiary: user2,
        startTime: now,
        cliffTime: now + (90 * day),
        duration: 365 * day,
        amount: ethers.parseEther("50000"),
        revocable: true,
        vestingType: 0
    },
    // ... more schedules
];

const tx = await vesting.batchCreateVestingSchedules(schedules);
const receipt = await tx.wait();

console.log(`✅ Created ${schedules.length} vesting schedules`);
```

#### `batchClaim(beneficiary, token, scheduleIds[])` → uint256
Claim from multiple vesting schedules in one transaction.

```solidity
function batchClaim(
    address beneficiary,
    address token,
    uint256[] calldata scheduleIds
) external nonReentrant returns (uint256)
```

**Parameters:**
- `beneficiary` (address): Who is claiming
- `token` (address): Token being vested
- `scheduleIds` (uint256[]): Array of schedule IDs

**Returns:** Total tokens transferred

**Advantages:**
- ✅ Claim from multiple schedules at once
- ✅ Single transaction (lower gas)
- ✅ Atomic operation

**Example:**
```javascript
// User has 3 vesting schedules for CAPX
// Claim all in one transaction

const scheduleIds = [1, 5, 12];

const tx = await vesting.batchClaim(
    userAddress,
    capxAddress,
    scheduleIds
);

const receipt = await tx.wait();
console.log(`✅ Claimed from ${scheduleIds.length} schedules`);
```

#### `revokeVesting(scheduleId)` → void
Revoke a vesting schedule (admin only, if revocable).

```solidity
function revokeVesting(uint256 scheduleId) 
    external onlyRole(VESTING_ADMIN_ROLE)
```

**Parameters:**
- `scheduleId` (uint256): Schedule to revoke

**Requirements:**
- Caller has `VESTING_ADMIN_ROLE`
- Schedule must be revocable
- Schedule must not already be revoked
- Contract is not paused

**Effect:**
1. Mark schedule as revoked
2. Transfer vested (but unclaimed) tokens to beneficiary
3. Return unvested tokens to admin
4. Schedule becomes non-claimable

**Example:**
```javascript
// Day 200: Admin decides to cancel vesting
// Beneficiary has 500 vested, unclaimed tokens

const tx = await vesting.revokeVesting(scheduleId);
await tx.wait();

// Result:
// - Beneficiary gets: 500 vested CAPX
// - Admin gets: 500 unvested CAPX back
// - Schedule cannot be claimed again
```

#### `pauseVesting()` → void
Pause all vesting operations (emergency stop).

```solidity
function pauseVesting() external onlyRole(PAUSER_ROLE)
```

**Effect:**
- All claims blocked
- All new schedules blocked
- Schedule data still readable

#### `unpauseVesting()` → void
Resume vesting operations.

```solidity
function unpauseVesting() external onlyRole(PAUSER_ROLE)
```

---

## 🔐 Access Control

### Role-Based Permissions

| Role | Permissions | Use |
|------|-------------|-----|
| `DEFAULT_ADMIN_ROLE` | Manage all roles | Gnosis Safe |
| `VESTING_ADMIN_ROLE` | Create/revoke schedules | Treasury/Team |
| `PAUSER_ROLE` | Pause/unpause | Emergency multisig |

### Setup Example

```javascript
const VESTING_ADMIN = ethers.keccak256(ethers.toUtf8Bytes("VESTING_ADMIN_ROLE"));
const PAUSER = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

// Grant roles
await vesting.grantRole(VESTING_ADMIN, vestingManagerAddress);
await vesting.grantRole(PAUSER, emergencyMultisigAddress);
```

---

## 📊 Events

### VestingScheduleCreated
```solidity
event VestingScheduleCreated(
    uint256 indexed scheduleId,
    address indexed beneficiary,
    address indexed token,
    uint256 amount,
    uint256 startTime,
    uint256 cliffTime,
    uint256 duration,
    VestingType vestingType
)
```

### TokensClaimed
```solidity
event TokensClaimed(
    uint256 indexed scheduleId,
    address indexed beneficiary,
    address indexed token,
    uint256 amount
)
```

### VestingScheduleRevoked
```solidity
event VestingScheduleRevoked(
    uint256 indexed scheduleId,
    address indexed beneficiary,
    uint256 vestedAmount,
    uint256 reclaimedAmount
)
```

---

## 🚀 Usage Examples

### Example 1: Employee Equity Vesting

```javascript
// 4-year employee grant with 1-year cliff
// 100k CAPX vesting

const now = Math.floor(Date.now() / 1000);
const oneDay = 24 * 60 * 60;

const tx = await vesting.createVestingSchedule(
    capxAddress,
    employeeAddress,
    now,                          // starts now
    now + (365 * oneDay),         // 1-year cliff
    4 * 365 * oneDay,             // 4 years total
    ethers.parseEther("100000"),  // 100k CAPX
    false,                        // non-revocable (once cliff, protected)
    0                             // LINEAR
);
```

### Example 2: Quarterly Distribution Program

```javascript
// Distribute 400k ANGEL tokens quarterly
// 100k per quarter, immediate distribution

const quarterDuration = 90 * 24 * 60 * 60;
const now = Math.floor(Date.now() / 1000);

const schedules = partners.map(partner => ({
    token: angelAddress,
    beneficiary: partner.address,
    startTime: now,
    cliffTime: now,               // no cliff
    duration: 4 * quarterDuration,// 4 quarters
    amount: ethers.parseEther("100000"),  // 100k per person
    revocable: false,
    vestingType: 1                // STEP (quarterly)
}));

const tx = await vesting.batchCreateVestingSchedules(schedules);
```

### Example 3: Beneficiary Claims Workflow

```javascript
// Beneficiary checks and claims vested tokens

// 1. Get all schedules
const scheduleIds = await vesting.getVestingSchedulesForBeneficiary(userAddress);

// 2. Check vested amounts
for (const scheduleId of scheduleIds) {
    const vested = await vesting.computeVestedAmount(scheduleId);
    const claimed = await vesting.getClaimedAmount(userAddress, tokenAddress, scheduleId);
    const available = vested - claimed;
    
    if (available > 0n) {
        console.log(`Schedule ${scheduleId}: ${ethers.formatEther(available)} available`);
    }
}

// 3. Claim from all
const tx = await vesting.batchClaim(userAddress, tokenAddress, scheduleIds);
await tx.wait();

console.log("✅ Claimed all available tokens");
```

---

## ⚠️ Important Notes

### 1. CAPX Fee Exemption is Critical

TokenVesting MUST be fee exempt on CAPX:

```javascript
// After deploying TokenVesting
const VESTING_ADDRESS = "0x...";
await capx.setExemption(VESTING_ADDRESS, true);

// Otherwise:
// - Claim 100 CAPX → User gets only 98 CAPX
// - 2 CAPX lost to fees
```

### 2. Cliff Must Be After Start

```javascript
// Valid:
startTime: Day 0
cliffTime: Day 90  ✅

// Invalid:
startTime: Day 100
cliffTime: Day 50  ❌ // Reverts: cliff before start
```

### 3. Cannot Claim Before Cliff

```javascript
// Until cliffTime is reached
computeVestedAmount() === 0

// At or after cliffTime
computeVestedAmount() > 0
```

### 4. Revocation Returns Unvested Tokens

```javascript
// Schedule: 1000 tokens over 12 months
// Day 180: 500 vested, beneficiary claimed 300
// Admin revokes:
// - Beneficiary gets: 500 - 300 = 200 vested tokens
// - Admin gets back: 1000 - 500 = 500 unvested tokens
```

---

**Last Updated:** January 4, 2026  
**Version:** 1.0.0  
**Audience:** Developers, Team Lead, Auditors
