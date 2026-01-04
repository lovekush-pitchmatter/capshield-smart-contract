# 📖 Complete API Reference

Quick reference for all contract functions with signatures, parameters, and returns.

---

## 🎯 CAPX Token (contracts/CAPX.sol)

### Standard ERC20 Functions

| Function | Signature | Returns | Notes |
|----------|-----------|---------|-------|
| `name()` | `function name() public view returns (string memory)` | "CAPShield Token" | Read-only |
| `symbol()` | `function symbol() public view returns (string memory)` | "CAPY" | Read-only |
| `decimals()` | `function decimals() public view returns (uint8)` | 18 | Read-only |
| `totalSupply()` | `function totalSupply() public view returns (uint256)` | uint256 | Current supply |
| `balanceOf(account)` | `function balanceOf(address account) public view returns (uint256)` | uint256 | User balance |
| `allowance(owner, spender)` | `function allowance(address owner, address spender) public view returns (uint256)` | uint256 | Approved amount |
| `approve(spender, amount)` | `function approve(address spender, uint256 amount) public returns (bool)` | bool | Success |
| `transfer(recipient, amount)` | `function transfer(address recipient, uint256 amount) public returns (bool)` | bool | With 2% fee |
| `transferFrom(sender, recipient, amount)` | `function transferFrom(address sender, address recipient, uint256 amount) public returns (bool)` | bool | Requires approval |
| `increaseAllowance(spender, addedValue)` | `function increaseAllowance(address spender, uint256 addedValue) public returns (bool)` | bool | Safer approve |
| `decreaseAllowance(spender, subtractedValue)` | `function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool)` | bool | Reduces allowance |

### CAPX-Specific Functions

| Function | Signature | Requirements |
|----------|-----------|--------------|
| `totalMinted()` | `function totalMinted() public view returns (uint256)` | Read-only, shows total minted |
| `MAX_SUPPLY()` | `function MAX_SUPPLY() public view returns (uint256)` | Immutable: 100M tokens |
| `isExemptFromFees(account)` | `function isExemptFromFees(address account) public view returns (bool)` | Read-only, check exemption |

### Minting Functions

| Function | Role Required | Parameters | Notes |
|----------|---------------|-----------|-------|
| `teamMint(to, amount)` | TEAM_MINTER_ROLE | address, uint256 | Mint for team |
| `treasuryMint(to, amount)` | TREASURY_MINTER_ROLE | address, uint256 | Mint for treasury |
| `daoMint(to, amount)` | DAO_MINTER_ROLE | address, uint256 | Mint for DAO |
| `revenueMint(to, revenue, marketValue)` | TREASURY_MINTER_ROLE | address, uint256, uint256 | Formula: (revenue * 1e18) / marketValue |

### Burning Functions

| Function | Parameters | Notes |
|----------|-----------|-------|
| `burn(amount)` | uint256 | Burn own tokens |
| `burnFrom(account, amount)` | address, uint256 | Burn with approval |

### Administrative Functions

| Function | Role Required | Parameters | Notes |
|----------|---------------|-----------|-------|
| `updateTreasuryAddress(newTreasury)` | DEFAULT_ADMIN_ROLE | address | Update fee recipient |
| `updateDAOAddress(newDAO)` | DEFAULT_ADMIN_ROLE | address | Update DAO address |
| `setExemption(account, exempt)` | DEFAULT_ADMIN_ROLE | address, bool | Add/remove fee exemption |
| `pause()` | PAUSER_ROLE | - | Emergency stop |
| `unpause()` | PAUSER_ROLE | - | Resume operations |

### Role Management

| Function | Role Required | Parameters | Notes |
|----------|---------------|-----------|-------|
| `grantRole(role, account)` | DEFAULT_ADMIN_ROLE | bytes32, address | Grant role |
| `revokeRole(role, account)` | DEFAULT_ADMIN_ROLE | bytes32, address | Revoke role |
| `hasRole(role, account)` | - | bytes32, address | Check role (read-only) |
| `getRoleAdmin(role)` | - | bytes32 | Get admin of role (read-only) |

---

## 🎯 ANGEL Token (contracts/ANGEL.sol)

### Standard ERC20 Functions

| Function | Signature | Returns |
|----------|-----------|---------|
| `name()` | `function name() public view returns (string memory)` | "AngleSeed Token" |
| `symbol()` | `function symbol() public view returns (string memory)` | "SEED" |
| `decimals()` | `function decimals() public view returns (uint8)` | 18 |
| `totalSupply()` | `function totalSupply() public view returns (uint256)` | Current supply |
| `balanceOf(account)` | `function balanceOf(address account) public view returns (uint256)` | User balance |
| `transfer(recipient, amount)` | `function transfer(address recipient, uint256 amount) public returns (bool)` | Success (no fees) |
| `transferFrom(sender, recipient, amount)` | `function transferFrom(address sender, address recipient, uint256 amount) public returns (bool)` | Success (requires approval) |
| `approve(spender, amount)` | `function approve(address spender, uint256 amount) public returns (bool)` | Success |

### ANGEL-Specific Functions

| Function | Signature | Returns |
|----------|-----------|---------|
| `totalMinted()` | `function totalMinted() public view returns (uint256)` | Total minted (never decreases) |
| `MAX_SUPPLY()` | `function MAX_SUPPLY() public view returns (uint256)` | Immutable: 10B tokens |
| `remainingMintableSupply()` | `function remainingMintableSupply() public view returns (uint256)` | MAX_SUPPLY - totalMinted |
| `canMint(amount)` | `function canMint(uint256 amount) public view returns (bool)` | Can mint without exceeding cap |

### Minting Functions

| Function | Role Required | Parameters | Notes |
|----------|---------------|-----------|-------|
| `rewardMint(to, amount, reason)` | REWARD_MINTER_ROLE | address, uint256, string | Single mint with reason |
| `batchRewardMint(recipients, amounts, reason)` | REWARD_MINTER_ROLE | address[], uint256[], string | Batch mint (atomic) |

### Burning Functions

| Function | Parameters | Notes |
|----------|-----------|-------|
| `burn(amount)` | uint256 | Burn own tokens |
| `burnFrom(account, amount)` | address, uint256 | Burn with approval |

### Administrative Functions

| Function | Role Required | Parameters |
|----------|---------------|-----------|
| `pause()` | PAUSER_ROLE | - |
| `unpause()` | PAUSER_ROLE | - |

### Role Management

| Function | Role Required | Parameters |
|----------|---------------|-----------|
| `grantRole(role, account)` | DEFAULT_ADMIN_ROLE | bytes32, address |
| `revokeRole(role, account)` | DEFAULT_ADMIN_ROLE | bytes32, address |
| `hasRole(role, account)` | - | bytes32, address |

---

## 🎯 TokenVesting (contracts/TokenVesting.sol)

### Schedule Management

| Function | Signature | Returns |
|----------|-----------|---------|
| `getVestingSchedule(scheduleId)` | `function getVestingSchedule(uint256 scheduleId) external view returns (VestingSchedule memory)` | Complete schedule struct |
| `getVestingScheduleCount()` | `function getVestingScheduleCount() external view returns (uint256)` | Total schedules |
| `getVestingSchedulesForBeneficiary(beneficiary)` | `function getVestingSchedulesForBeneficiary(address beneficiary) external view returns (uint256[] memory)` | Schedule IDs array |
| `computeVestedAmount(scheduleId)` | `function computeVestedAmount(uint256 scheduleId) external view returns (uint256)` | Currently vested amount |
| `getClaimedAmount(beneficiary, token, scheduleId)` | `function getClaimedAmount(address beneficiary, address token, uint256 scheduleId) external view returns (uint256)` | Already claimed |

### Schedule Creation

| Function | Role Required | Parameters | Returns |
|----------|---------------|-----------|---------|
| `createVestingSchedule(token, beneficiary, startTime, cliffTime, duration, amount, revocable, vestingType)` | VESTING_ADMIN_ROLE | Complex | Schedule ID |
| `batchCreateVestingSchedules(params[])` | VESTING_ADMIN_ROLE | Array of params | Array of schedule IDs |

### Claiming

| Function | Parameters | Returns | Notes |
|----------|-----------|---------|-------|
| `claim(beneficiary, token, scheduleId)` | address, address, uint256 | Amount claimed | Can only be called once per schedule |
| `batchClaim(beneficiary, token, scheduleIds[])` | address, address, uint256[] | Total claimed | Atomic operation |

### Administrative

| Function | Role Required | Parameters |
|----------|---------------|-----------|
| `revokeVesting(scheduleId)` | VESTING_ADMIN_ROLE | uint256 |
| `pauseVesting()` | PAUSER_ROLE | - |
| `unpauseVesting()` | PAUSER_ROLE | - |

### Role Management

| Function | Role Required | Parameters |
|----------|---------------|-----------|
| `grantRole(role, account)` | DEFAULT_ADMIN_ROLE | bytes32, address |
| `revokeRole(role, account)` | DEFAULT_ADMIN_ROLE | bytes32, address |
| `hasRole(role, account)` | - | bytes32, address |

---

## 🎯 Role Definitions

### Role Identifiers

```javascript
// Core Roles (all contracts)
DEFAULT_ADMIN_ROLE = 0x00...00
PAUSER_ROLE = keccak256(toUtf8Bytes("PAUSER_ROLE"))

// CAPX-Specific
TEAM_MINTER_ROLE = keccak256(toUtf8Bytes("TEAM_MINTER_ROLE"))
TREASURY_MINTER_ROLE = keccak256(toUtf8Bytes("TREASURY_MINTER_ROLE"))
DAO_MINTER_ROLE = keccak256(toUtf8Bytes("DAO_MINTER_ROLE"))

// ANGEL-Specific
REWARD_MINTER_ROLE = keccak256(toUtf8Bytes("REWARD_MINTER_ROLE"))

// TokenVesting-Specific
VESTING_ADMIN_ROLE = keccak256(toUtf8Bytes("VESTING_ADMIN_ROLE"))
```

### Role Computation (JavaScript)

```javascript
const ethers = require("ethers");

const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

const PAUSER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("PAUSER_ROLE")
);

const TEAM_MINTER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("TEAM_MINTER_ROLE")
);

// Use in calls:
await contract.grantRole(TEAM_MINTER_ROLE, addressToGrant);
```

---

## 🎯 Events

### CAPX Events

```solidity
event Transfer(address indexed from, address indexed to, uint256 value)
event Approval(address indexed owner, address indexed spender, uint256 value)
event TeamMint(address indexed minter, address indexed to, uint256 amount)
event TreasuryMint(address indexed minter, address indexed to, uint256 amount)
event DAOMint(address indexed minter, address indexed to, uint256 amount)
event RevenueMint(address indexed to, uint256 amount, uint256 revenue, uint256 marketValue)
event TreasuryFee(address indexed from, address indexed to, uint256 amount)
event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress)
event DAOAddressUpdated(address indexed oldAddress, address indexed newAddress)
event ExemptionUpdated(address indexed account, bool isExempt)
event Burn(address indexed account, uint256 amount)
event BurnFrom(address indexed operator, address indexed account, uint256 amount)
event Paused(address indexed account)
event Unpaused(address indexed account)
```

### ANGEL Events

```solidity
event Transfer(address indexed from, address indexed to, uint256 value)
event Approval(address indexed owner, address indexed spender, uint256 value)
event RewardMint(address indexed to, uint256 amount, string reason)
event Burn(address indexed account, uint256 amount)
event BurnFrom(address indexed operator, address indexed account, uint256 amount)
event Paused(address indexed account)
event Unpaused(address indexed account)
```

### TokenVesting Events

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
event TokensClaimed(
    uint256 indexed scheduleId,
    address indexed beneficiary,
    address indexed token,
    uint256 amount
)
event VestingScheduleRevoked(
    uint256 indexed scheduleId,
    address indexed beneficiary,
    uint256 vestedAmount,
    uint256 reclaimedAmount
)
```

---

## 📊 Common Usage Patterns

### Pattern 1: Check Before Mint

```javascript
const maxSupply = await contract.MAX_SUPPLY();
const totalMinted = await contract.totalMinted();
const remaining = maxSupply - totalMinted;

if (amountToMint <= remaining) {
    await contract.teamMint(recipient, amountToMint);
} else {
    console.log("Would exceed cap");
}
```

### Pattern 2: Calculate Vested Amount

```javascript
const scheduleId = 0;
const vested = await vesting.computeVestedAmount(scheduleId);
const claimed = await vesting.getClaimedAmount(beneficiary, token, scheduleId);
const available = vested - claimed;
```

### Pattern 3: Batch Distribution

```javascript
const recipients = [addr1, addr2, addr3];
const amounts = [amt1, amt2, amt3].map(x => ethers.parseEther(x.toString()));

const tx = await angel.batchRewardMint(
    recipients,
    amounts,
    "Q4 Campaign"
);
await tx.wait();
```

### Pattern 4: Check Role

```javascript
const ADMIN_ROLE = ethers.ZeroHash;
const hasAdmin = await contract.hasRole(ADMIN_ROLE, address);

if (hasAdmin) {
    // Has admin permissions
}
```

---

**Last Updated:** January 4, 2026  
**Version:** 1.0.0  
**Audience:** Developers, Integrators
